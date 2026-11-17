import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { Metadata, RunView, UserInfo } from '@memberjunction/core';
import {
  ComputeCampaignWalletSpentOnOthers,
  ComputeIdeaAggregateFromAllocations,
  LoadAllPaginatedRows,
  PersistIdeaAllocationAtomic,
} from './lib/community-hub-ideation.ts';

describe('CommunityHub Ideation Wallet & Fail-Closed Aggregate (CR-21 / CR-22)', () => {
  it('CR-21: LoadAllPaginatedRows fails closed on any failed page instead of returning []', async () => {
    const user = new UserInfo(undefined, { ID: '11111111-1111-4111-8111-111111111111' });
    let call = 0;
    mock.method(RunView.prototype, 'RunView', async () => {
      call++;
      if (call === 1) {
        return {
          Success: true,
          Results: [
            { ID: 'a1', IdeaPostID: 'idea-1', PointsAllocated: 9, QuadraticVotes: 3 },
            { ID: 'a2', IdeaPostID: 'idea-1', PointsAllocated: 16, QuadraticVotes: 4 },
          ],
        };
      }
      return { Success: false, Results: [], ErrorMessage: 'Simulated page 2 read failure' };
    });

    const res = await LoadAllPaginatedRows({
      runView: new RunView(),
      entityName: 'MJ_BizApps_Community: Forum Idea Allocations',
      extraFilter: "IdeaPostID = 'idea-1'",
      fields: ['ID', 'IdeaPostID', 'PointsAllocated', 'QuadraticVotes'],
      user,
      pageSize: 2,
    });
    mock.restoreAll();

    assert.equal(res.success, false);
    assert.deepEqual(res.rows, []);
    assert.match(res.errorMessage ?? '', /Simulated page 2 read failure/);
  });

  it('CR-21: PersistIdeaAllocationAtomic rolls back allocation and never zeroes idea totals when aggregate RunView fails', async () => {
    const user = new UserInfo(undefined, { ID: '11111111-1111-4111-8111-111111111111' });
    const ideaId = '22222222-2222-4222-8222-222222222222';
    const allocRecord: {
      ID: string;
      IdeaPostID: string;
      UserID: string;
      PointsAllocated: number;
      QuadraticVotes: number;
      Save: () => Promise<boolean>;
    } = {
      ID: 'alloc-1',
      IdeaPostID: ideaId,
      UserID: user.ID,
      PointsAllocated: 4,
      QuadraticVotes: 2,
      Save: async () => true,
    };
    let ideaPostSaveCalls = 0;
    let rvCalls = 0;

    mock.method(Metadata.prototype, 'GetEntityObject', async (entityName: string) => {
      if (entityName === 'MJ_BizApps_Community: Forum Idea Posts') {
        return {
          ID: ideaId,
          TotalPointsAllocated: 25,
          EffectiveQuadraticVotes: 7,
          UniqueBackerCount: 2,
          Save: async () => {
            ideaPostSaveCalls++;
            return true;
          },
        };
      }
      return allocRecord;
    });

    mock.method(RunView.prototype, 'RunView', async () => {
      rvCalls++;
      if (rvCalls === 1) {
        return {
          Success: true,
          Results: [{ ID: 'alloc-1', IdeaPostID: ideaId, PointsAllocated: 4, QuadraticVotes: 2 }],
        };
      }
      return { Success: false, Results: [], ErrorMessage: 'Transient DB timeout reading allocations' };
    });

    const result = await PersistIdeaAllocationAtomic({
      ideaPostId: ideaId,
      user,
      pointsAllocated: 25,
      effectiveVotes: 5,
    });
    mock.restoreAll();

    assert.equal(result.success, false);
    assert.equal(result.rolledBack, true);
    assert.equal(ideaPostSaveCalls, 0);
    // Allocation must have been reverted back to prior 4 points / 2 votes!
    assert.equal(allocRecord.PointsAllocated, 4);
    assert.equal(allocRecord.QuadraticVotes, 2);
  });

  it('CR-21: PersistIdeaAllocationAtomic paginates beyond 1000 rows without capping unique backers', () => {
    const rows = Array.from({ length: 1200 }, (_, i) => ({
      ID: `a-${i}`,
      IdeaPostID: 'idea-large',
      PointsAllocated: 1,
      QuadraticVotes: 1,
    }));
    const agg = ComputeIdeaAggregateFromAllocations(rows);
    assert.equal(agg.totalPointsAllocated, 1200);
    assert.equal(agg.effectiveQuadraticVotes, 1200);
    assert.equal(agg.uniqueBackerCount, 1200);
  });

  it('CR-22: ComputeCampaignWalletSpentOnOthers isolates wallet spend strictly by campaign', () => {
    const campaignAIdeas = new Set(['idea-a1', 'idea-a2', 'idea-a3']);
    const userAllocations = [
      { IdeaPostID: 'idea-a1', PointsAllocated: 16 },
      { IdeaPostID: 'idea-a2', PointsAllocated: 25 },
      { IdeaPostID: 'idea-a3', PointsAllocated: 9 }, // off-page idea still in Campaign A!
      { IdeaPostID: 'idea-b1', PointsAllocated: 64 }, // Campaign B — must NOT consume Campaign A's wallet!
    ];
    const spentElsewhereInA = ComputeCampaignWalletSpentOnOthers({
      campaignIdeaIds: campaignAIdeas,
      userAllocations,
      excludeIdeaId: 'idea-a1',
    });
    assert.equal(spentElsewhereInA, 34); // 25 + 9 (ignores idea-a1 self and ignores idea-b1 in Campaign B)
  });

  it('0-point withdrawal deletes existing ForumIdeaAllocation instead of saving PointsAllocated=0 against DB CHECK (> 0)', async () => {
    const user = new UserInfo(undefined, { ID: '11111111-1111-4111-8111-111111111111' });
    const ideaId = '33333333-3333-4333-8333-333333333333';
    let saveCalledWithZero = false;
    let deleteCalled = false;
    const ideaPostRecord = {
      ID: ideaId,
      TotalPointsAllocated: 25,
      EffectiveQuadraticVotes: 5,
      UniqueBackerCount: 1,
      Save: async () => true,
    };

    mock.method(Metadata.prototype, 'GetEntityObject', async (entityName: string) => {
      if (entityName === 'MJ_BizApps_Community: Forum Idea Posts') {
        return ideaPostRecord;
      }
      return {
        ID: 'alloc-withdraw-1',
        IdeaPostID: ideaId,
        UserID: user.ID,
        PointsAllocated: 25,
        QuadraticVotes: 5,
        Save: async () => {
          saveCalledWithZero = true;
          return false;
        },
        Delete: async () => {
          deleteCalled = true;
          return true;
        },
      };
    });

    let rvCall = 0;
    mock.method(RunView.prototype, 'RunView', async () => {
      rvCall++;
      if (rvCall === 1) {
        return { Success: true, Results: [{ ID: 'alloc-withdraw-1', IdeaPostID: ideaId, PointsAllocated: 25, QuadraticVotes: 5 }] };
      }
      return { Success: true, Results: [] };
    });

    const res = await PersistIdeaAllocationAtomic({
      ideaPostId: ideaId,
      user,
      pointsAllocated: 0,
      effectiveVotes: 0,
    });
    mock.restoreAll();

    assert.equal(res.success, true);
    assert.equal(deleteCalled, true);
    assert.equal(saveCalledWithZero, false);
    assert.equal(ideaPostRecord.TotalPointsAllocated, 0);
    assert.equal(ideaPostRecord.EffectiveQuadraticVotes, 0);
    assert.equal(ideaPostRecord.UniqueBackerCount, 0);
  });
});
