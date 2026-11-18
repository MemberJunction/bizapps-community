import { BaseEntity, type EntityDeleteOptions, type EntitySaveOptions, type ValidationResult } from '@memberjunction/core';
import { RegisterClass, UUIDsEqual } from '@memberjunction/global';
import {
  COMMUNITY_ENTITY_NAMES,
  type mjBizAppsCommunityForumPostEntity,
  mjBizAppsCommunityForumPostReactionEntity,
} from '@mj-biz-apps/community-entities';
import {
  failValidation,
  loadEntityById,
  loadRows,
  loadSingleRow,
  resolveForumMemberAndRole,
  resolveForumRow,
  validUuidOrNull,
} from './server-entity-helpers.ts';

interface PostForumRow {
  ID: string;
  ForumID: string;
}

interface ReactionWeightRow {
  ID: string;
  Weight: number;
}

/**
 * Authoritative server BaseEntity subclass for `MJ_BizApps_Community: Forum Post Reactions`.
 * Looks up the authoritative `Weight` from `ForumRoleType.VoteWeightMultiplier` (overriding any
 * caller-supplied value) and recomputes parent `ForumPost.ReactionScore` on Save and Delete.
 */
@RegisterClass(BaseEntity, COMMUNITY_ENTITY_NAMES.ForumPostReactions)
export class ForumPostReactionServerEntity extends mjBizAppsCommunityForumPostReactionEntity {
  public override get DefaultSkipAsyncValidation(): boolean {
    return false;
  }

  public override async ValidateAsync(): Promise<ValidationResult> {
    const result = await super.ValidateAsync();
    
    // CR-01: Ownership & UUID Validation
    if (!this.ContextCurrentUser || !this.ContextCurrentUser.ID) {
      return failValidation(result, 'UserID', 'An authenticated user is required to react to a post.');
    }

    const validPostId = validUuidOrNull(this.PostID);
    if (!validPostId) {
      return failValidation(result, 'PostID', 'PostID must be a valid UUID.');
    }

    const validUserId = validUuidOrNull(this.UserID);
    if (!validUserId || !UUIDsEqual(validUserId, this.ContextCurrentUser.ID)) {
       return failValidation(result, 'UserID', 'UserID must match the authenticated user.');
    }

    // Resolve post and forum for authority
    const postRes = await loadSingleRow<PostForumRow>(
      this,
      COMMUNITY_ENTITY_NAMES.ForumPosts,
      `ID = '${validPostId}'`,
      ['ID', 'ForumID'],
    );
    if (!postRes.success || !postRes.row) {
      return failValidation(result, 'PostID', `ForumPost ${validPostId} was not found.`);
    }

    const forum = await resolveForumRow(this, postRes.row.ForumID);
    if (!forum) {
      return failValidation(result, 'PostID', `Forum ${postRes.row.ForumID} was not found.`);
    }

    // Resolve authority
    const { lookupFailed, member, roleType } = await resolveForumMemberAndRole(this, forum.ID, validUserId);
    if (lookupFailed) {
      return failValidation(result, 'UserID', 'Failed to resolve forum member.');
    }

    // ... (rest of the logic)

    if (member && (member.Status === 'Removed' || member.Status === 'Muted')) {
      return failValidation(
        result,
        'UserID',
        `Forum member status "${member.Status}" is not permitted to react to posts.`,
      );
    }

    if (!member && (!forum.InheritsSpaceMembers || forum.VisibilityBand === 'PrivateForum')) {
      return failValidation(
        result,
        'UserID',
        'Active ForumMember membership is required to react in this forum.',
      );
    }

    const multiplier = roleType ? roleType.VoteWeightMultiplier : 1;
    this.Weight = Number(Number(multiplier).toFixed(2));

    return result;
  }

  public override async Save(options?: EntitySaveOptions): Promise<boolean> {
    if (this.Weight == null || !Number.isFinite(this.Weight)) {
      this.Weight = 1;
    }

    const saved = await super.Save(options);
    if (!saved) return false;

    await this.recomputeParentReactionScore(this.PostID);
    return true;
  }

  public override async Delete(options?: EntityDeleteOptions): Promise<boolean> {
    const postId = this.PostID;

    const deleted = await super.Delete(options);
    if (!deleted) return false;

    await this.recomputeParentReactionScore(postId);
    return true;
  }

  private async recomputeParentReactionScore(postId: string): Promise<void> {
    const validPostId = validUuidOrNull(postId);
    if (!validPostId) return;

    const reactionsRes = await loadRows<ReactionWeightRow>(
      this,
      COMMUNITY_ENTITY_NAMES.ForumPostReactions,
      `PostID = '${validPostId}'`,
      ['ID', 'Weight'],
      5000,
    );
    if (!reactionsRes.success) return;

    const totalScore = reactionsRes.rows.reduce((sum, r) => sum + Number(r.Weight ?? 0), 0);

    const post = await loadEntityById<mjBizAppsCommunityForumPostEntity>(
      COMMUNITY_ENTITY_NAMES.ForumPosts,
      validPostId,
      this.ContextCurrentUser,
    );
    if (!post) return;

    post.ReactionScore = Math.round(totalScore);
    await post.Save();
  }
}

export function LoadForumPostReactionServerEntity(): void {
  void ForumPostReactionServerEntity;
}
