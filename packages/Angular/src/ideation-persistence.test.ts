import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { Metadata, RunView, UserInfo } from '@memberjunction/core';
import {
  ComputeCampaignWalletSpentOnOthers,
  ComputeIdeaAggregateFromAllocations,
  IDEA_POST_TYPE_CODE,
  LoadAllPaginatedBatches,
  LoadAllPaginatedRows,
  PersistIdeaAllocationAtomic,
  PersistProposedIdea,
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

  it('Slice 2: IDEA_POST_TYPE_CODE is "idea-proposal" and PersistProposedIdea creates ForumPost + ForumIdeaPost subtype', async () => {
    assert.equal(IDEA_POST_TYPE_CODE, 'idea-proposal');
    const user = new UserInfo(undefined, { ID: '11111111-1111-4111-8111-111111111111' });
    const forumId = '44444444-4444-4444-8444-444444444444';
    const postTypeId = 'C8A17200-4E12-4B8F-9A10-100000000006';
    const createdPostId = '55555555-5555-4555-8555-555555555555';

    const forumPostStub = {
      ID: '',
      ForumID: '',
      AuthorUserID: '',
      PostTypeID: '',
      Title: '',
      BodyMarkdown: '',
      Status: '',
      Save: async () => {
        forumPostStub.ID = createdPostId;
        return true;
      },
      Delete: async () => true,
    };
    const ideaPostStub = {
      ID: '',
      IdeaStatus: '',
      TotalPointsAllocated: -1,
      EffectiveQuadraticVotes: -1,
      UniqueBackerCount: -1,
      Save: async () => true,
    };

    mock.method(Metadata.prototype, 'GetEntityObject', async (entityName: string) => {
      if (entityName === 'MJ_BizApps_Community: Forum Posts') return forumPostStub;
      return ideaPostStub;
    });

    const res = await PersistProposedIdea({
      forumId,
      postTypeId,
      title: 'Federated SSO Audit Log',
      summary: 'Expose immutable audit logs for community moderators.',
      user,
    });
    mock.restoreAll();

    assert.equal(res.success, true);
    assert.equal(res.postId, createdPostId);
    assert.equal(forumPostStub.PostTypeID, postTypeId);
    assert.equal(forumPostStub.ForumID, forumId);
    assert.equal(ideaPostStub.ID, createdPostId);
    assert.equal(ideaPostStub.IdeaStatus, 'Under Consideration');
    assert.equal(ideaPostStub.TotalPointsAllocated, 0);
    assert.equal(ideaPostStub.EffectiveQuadraticVotes, 0);
    assert.equal(ideaPostStub.UniqueBackerCount, 0);
  });

  it('Slice 2: PersistProposedIdea rolls back ForumPost if ForumIdeaPost subtype Save fails', async () => {
    const user = new UserInfo(undefined, { ID: '11111111-1111-4111-8111-111111111111' });
    let rolledBack = false;

    mock.method(Metadata.prototype, 'GetEntityObject', async (entityName: string) => {
      if (entityName === 'MJ_BizApps_Community: Forum Posts') {
        return {
          ID: '66666666-6666-4666-8666-666666666666',
          Save: async () => true,
          Delete: async () => {
            rolledBack = true;
            return true;
          },
        };
      }
      return {
        ID: '',
        Save: async () => false,
        LatestResult: { CompleteMessage: 'Subtype constraint failed' },
      };
    });

    const res = await PersistProposedIdea({
      forumId: '44444444-4444-4444-8444-444444444444',
      postTypeId: 'C8A17200-4E12-4B8F-9A10-100000000006',
      title: 'Broken Idea',
      summary: 'Should roll back base post',
      user,
    });
    mock.restoreAll();

    assert.equal(res.success, false);
    assert.equal(rolledBack, true);
    assert.match(res.errorMessage ?? '', /Subtype constraint failed/);
  });

  it('LoadAllPaginatedBatches collapses multiple independent queries into a single RunViews call per page wave and fails closed per query', async () => {
    const user = new UserInfo(undefined, { ID: '11111111-1111-4111-8111-111111111111' });
    const batchCalls: Array<Array<{ EntityName?: string; StartRow?: number }>> = [];
    let singleRunViewCalls = 0;

    mock.method(RunView.prototype, 'RunView', async () => {
      singleRunViewCalls += 1;
      return { Success: false, Results: [], ErrorMessage: 'Should not call single RunView' };
    });

    mock.method(
      RunView.prototype,
      'RunViews',
      async (paramsList: Array<{ EntityName?: string; StartRow?: number }>) => {
        batchCalls.push(paramsList.map((p) => ({ EntityName: p.EntityName, StartRow: p.StartRow })));
        return paramsList.map((p) => {
          if (p.EntityName === 'EntityA') {
            if ((p.StartRow ?? 0) === 0) {
              return { Success: true, Results: [{ ID: 'a1' }, { ID: 'a2' }] };
            }
            return { Success: true, Results: [{ ID: 'a3' }] };
          }
          if (p.EntityName === 'EntityB') {
            return { Success: true, Results: [{ ID: 'b1' }] };
          }
          return { Success: false, Results: [], ErrorMessage: 'EntityC denied' };
        });
      },
    );

    const results = await LoadAllPaginatedBatches<{ ID: string }>({
      runView: new RunView(),
      queries: [
        { entityName: 'EntityA', extraFilter: '1=1', fields: ['ID'], pageSize: 2 },
        { entityName: 'EntityB', extraFilter: '1=1', fields: ['ID'], pageSize: 2 },
        { entityName: 'EntityC', extraFilter: '1=1', fields: ['ID'], pageSize: 2 },
      ],
      user,
    });
    mock.restoreAll();

    assert.equal(singleRunViewCalls, 0, 'Must never fall back to individual RunView calls');
    assert.equal(batchCalls.length, 2, 'Wave 1 batches all 3 queries; Wave 2 only fetches EntityA page 2');
    assert.deepEqual(
      batchCalls[0].map((q) => q.EntityName),
      ['EntityA', 'EntityB', 'EntityC'],
    );
    assert.deepEqual(
      batchCalls[1].map((q) => q.EntityName),
      ['EntityA'],
    );
    assert.equal(results[0].success, true);
    assert.deepEqual(results[0].rows.map((r) => r.ID), ['a1', 'a2', 'a3']);
    assert.equal(results[1].success, true);
    assert.deepEqual(results[1].rows.map((r) => r.ID), ['b1']);
    assert.equal(results[2].success, false);
    assert.deepEqual(results[2].rows, []);
    assert.match(results[2].errorMessage ?? '', /EntityC denied/);
  });
});
