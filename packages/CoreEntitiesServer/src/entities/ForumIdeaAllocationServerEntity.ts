import { BaseEntity, type EntityDeleteOptions, type EntitySaveOptions, type ValidationResult } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import { CommunityRules } from '@mj-biz-apps/community-core';
import {
  COMMUNITY_ENTITY_NAMES,
  mjBizAppsCommunityForumIdeaAllocationEntity,
  type mjBizAppsCommunityForumIdeaCampaignEntity,
  type mjBizAppsCommunityForumIdeaPostEntity,
} from '@mj-biz-apps/community-entities';
import {
  failValidation,
  loadEntityById,
  loadRows,
  loadSingleRow,
  validUuidOrNull,
} from './server-entity-helpers.ts';

type AllocationModeValue = mjBizAppsCommunityForumIdeaCampaignEntity['AllocationMode'];

interface IdeaPostForumRow {
  ID: string;
  ForumID: string;
}

interface IdeaCampaignRow {
  ID: string;
  DefaultBudgetPoints: number;
  AllocationMode: AllocationModeValue;
  MaxPointsPerIdea: number | null;
  VotingClosesAt: Date | string | null;
}

interface IdRow {
  ID: string;
}

interface ExistingAllocationRow {
  ID: string;
  IdeaPostID: string;
  UserID: string;
  PointsAllocated: number;
  QuadraticVotes: number;
}

function computeQuadraticVotes(pointsAllocated: number): number {
  return Number(Math.sqrt(pointsAllocated).toFixed(2));
}

/**
 * Authoritative server BaseEntity subclass for `MJ_BizApps_Community: Forum Idea Allocations`.
 * Validates `VotingClosesAt`, `MaxPointsPerIdea`, and campaign `DefaultBudgetPoints`, sets
 * `QuadraticVotes = Math.sqrt(PointsAllocated)`, and recomputes parent `ForumIdeaPost` totals
 * (`TotalPointsAllocated`, `EffectiveQuadraticVotes`, `UniqueBackerCount`) on Save and Delete.
 */
@RegisterClass(BaseEntity, COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations)
export class ForumIdeaAllocationServerEntity extends mjBizAppsCommunityForumIdeaAllocationEntity {
  public override get DefaultSkipAsyncValidation(): boolean {
    return false;
  }

  public override async ValidateAsync(): Promise<ValidationResult> {
    const result = await super.ValidateAsync();

    const validIdeaPostId = validUuidOrNull(this.IdeaPostID);
    if (!validIdeaPostId) {
      return failValidation(result, 'IdeaPostID', 'IdeaPostID must be a valid UUID.');
    }

    const validUserId = validUuidOrNull(this.UserID);
    if (!validUserId) {
      return failValidation(result, 'UserID', 'UserID must be a valid UUID.');
    }

    if (!Number.isInteger(this.PointsAllocated) || this.PointsAllocated <= 0) {
      return failValidation(result, 'PointsAllocated', 'PointsAllocated must be a positive integer.');
    }

    const postRes = await loadSingleRow<IdeaPostForumRow>(
      this,
      COMMUNITY_ENTITY_NAMES.ForumPosts,
      `ID = '${validIdeaPostId}'`,
      ['ID', 'ForumID'],
    );
    if (!postRes.success || !postRes.row) {
      return failValidation(result, 'IdeaPostID', `Idea post ${validIdeaPostId} was not found.`);
    }

    const validForumId = validUuidOrNull(postRes.row.ForumID);
    if (!validForumId) {
      return failValidation(result, 'IdeaPostID', 'Idea post is missing a valid ForumID.');
    }

    const campaignRes = await loadSingleRow<IdeaCampaignRow>(
      this,
      COMMUNITY_ENTITY_NAMES.ForumIdeaCampaigns,
      `ID = '${validForumId}'`,
      ['ID', 'DefaultBudgetPoints', 'AllocationMode', 'MaxPointsPerIdea', 'VotingClosesAt'],
    );
    if (!campaignRes.success || !campaignRes.row) {
      return failValidation(
        result,
        'IdeaPostID',
        `Forum ${validForumId} is not configured as a Forum Idea Campaign.`,
      );
    }
    const campaign = campaignRes.row;

    if (campaign.VotingClosesAt != null) {
      const closesAt = new Date(campaign.VotingClosesAt);
      if (!Number.isNaN(closesAt.getTime()) && Date.now() > closesAt.getTime()) {
        return failValidation(
          result,
          'IdeaPostID',
          `Voting for this ideation campaign closed at ${closesAt.toISOString()}.`,
        );
      }
    }

    const campaignPostsRes = await loadRows<IdRow>(
      this,
      COMMUNITY_ENTITY_NAMES.ForumPosts,
      `ForumID = '${validForumId}'`,
      ['ID'],
      2000,
    );
    if (!campaignPostsRes.success) {
      return failValidation(result, 'IdeaPostID', 'Could not load campaign idea posts.');
    }

    const campaignPostIds = campaignPostsRes.rows
      .map((p) => validUuidOrNull(p.ID))
      .filter((id): id is string => id !== null);

    let existingAllocations: ExistingAllocationRow[] = [];
    if (campaignPostIds.length > 0) {
      const ideaInList = campaignPostIds.map((id) => `'${id}'`).join(', ');
      const allocRes = await loadRows<ExistingAllocationRow>(
        this,
        COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations,
        `UserID = '${validUserId}' AND IdeaPostID IN (${ideaInList})`,
        ['ID', 'IdeaPostID', 'UserID', 'PointsAllocated', 'QuadraticVotes'],
        2000,
      );
      if (!allocRes.success) {
        return failValidation(result, 'PointsAllocated', 'Could not load existing campaign allocations.');
      }
      existingAllocations = allocRes.rows;
    }

    const budgetCheck = CommunityRules.ValidateIdeaAllocationChange({
      mode: campaign.AllocationMode,
      budgetPoints: campaign.DefaultBudgetPoints,
      maxPointsPerIdea: campaign.MaxPointsPerIdea,
      existingAllocations: existingAllocations.map((a) => ({
        ideaPostId: a.IdeaPostID,
        pointsAllocated: a.PointsAllocated,
      })),
      changedIdeaPostId: validIdeaPostId,
      newPointsAllocated: this.PointsAllocated,
    });

    if (!budgetCheck.valid) {
      return failValidation(
        result,
        'PointsAllocated',
        budgetCheck.errorMessage ?? 'Allocation exceeds ideation campaign constraints.',
      );
    }

    this.QuadraticVotes = computeQuadraticVotes(this.PointsAllocated);
    return result;
  }

  public override async Save(options?: EntitySaveOptions): Promise<boolean> {
    if (typeof this.PointsAllocated === 'number' && Number.isFinite(this.PointsAllocated) && this.PointsAllocated > 0) {
      this.QuadraticVotes = computeQuadraticVotes(this.PointsAllocated);
    }

    const saved = await super.Save(options);
    if (!saved) return false;

    await this.recomputeParentIdeaTotals(this.IdeaPostID);
    return true;
  }

  public override async Delete(options?: EntityDeleteOptions): Promise<boolean> {
    const ideaPostId = this.IdeaPostID;

    const deleted = await super.Delete(options);
    if (!deleted) return false;

    await this.recomputeParentIdeaTotals(ideaPostId);
    return true;
  }

  private async recomputeParentIdeaTotals(ideaPostId: string): Promise<void> {
    const validIdeaPostId = validUuidOrNull(ideaPostId);
    if (!validIdeaPostId) return;

    const allocRes = await loadRows<ExistingAllocationRow>(
      this,
      COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations,
      `IdeaPostID = '${validIdeaPostId}'`,
      ['ID', 'IdeaPostID', 'UserID', 'PointsAllocated', 'QuadraticVotes'],
      5000,
    );
    if (!allocRes.success) return;

    let totalPoints = 0;
    let totalQuadraticVotes = 0;
    const uniqueBackers = new Set<string>();

    for (const row of allocRes.rows) {
      const pts = Number(row.PointsAllocated ?? 0);
      totalPoints += pts;
      const qv =
        typeof row.QuadraticVotes === 'number' && Number.isFinite(row.QuadraticVotes)
          ? row.QuadraticVotes
          : computeQuadraticVotes(pts);
      totalQuadraticVotes += qv;
      if (row.UserID) {
        uniqueBackers.add(row.UserID.trim().toLowerCase());
      }
    }

    const ideaPost = await loadEntityById<mjBizAppsCommunityForumIdeaPostEntity>(
      COMMUNITY_ENTITY_NAMES.ForumIdeaPosts,
      validIdeaPostId,
      this.ContextCurrentUser,
    );
    if (!ideaPost) return;

    ideaPost.TotalPointsAllocated = totalPoints;
    ideaPost.EffectiveQuadraticVotes = Number(totalQuadraticVotes.toFixed(2));
    ideaPost.UniqueBackerCount = uniqueBackers.size;
    await ideaPost.Save();
  }
}

export function LoadForumIdeaAllocationServerEntity(): void {
  void ForumIdeaAllocationServerEntity;
}
