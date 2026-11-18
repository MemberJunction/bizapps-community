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
  isModeratorRole,
} from './server-entity-helpers.ts';

interface PostForumRow {
  ID: string;
  ForumID: string;
}

interface ReactionWeightRow {
  ID: string;
  Weight: number;
}

@RegisterClass(BaseEntity, COMMUNITY_ENTITY_NAMES.ForumPostReactions)
export class ForumPostReactionServerEntity extends mjBizAppsCommunityForumPostReactionEntity {
  public override async ValidateAsync(): Promise<ValidationResult> {
    const result = await super.ValidateAsync();
    const contextUser = this.ContextCurrentUser;
    if (!contextUser) return failValidation(result, 'UserID', 'ContextCurrentUser is required.');

    const validPostId = validUuidOrNull(this.PostID);
    const validUserId = validUuidOrNull(this.UserID);

    if (!validPostId || !validUserId) return failValidation(result, 'ID', 'Invalid UUIDs.');

    // CR-01: Ownership
    const postRes = await loadSingleRow<PostForumRow>(this, COMMUNITY_ENTITY_NAMES.ForumPosts, `ID = '${validPostId}'`, ['ID', 'ForumID']);
    if (!postRes.success || !postRes.row) return failValidation(result, 'PostID', 'ForumPost not found.');

    const forum = await resolveForumRow(this, postRes.row.ForumID);
    if (!forum) return failValidation(result, 'PostID', 'Forum not found.');

    const memberRole = await resolveForumMemberAndRole(this, forum.ID, contextUser.ID);
    const isModerator = isModeratorRole(memberRole.roleType);

    if (!isModerator && !UUIDsEqual(validUserId, contextUser.ID)) {
      return failValidation(result, 'UserID', 'Ownership mismatch.');
    }
    
    // Existing logic for validation remains...
    return result;
  }

  // ... rest of implementation
  public override async Save(options?: EntitySaveOptions): Promise<boolean> {
    if (this.Weight == null || !Number.isFinite(this.Weight)) {
      this.Weight = 1;
    }

    const saved = await super.Save(options);
    if (!saved) return false;

    await this.recomputeParentReactionScore(this.PostID, options?.TransactionGroup);
    return true;
  }

  public override async Delete(options?: EntityDeleteOptions): Promise<boolean> {
    const postId = this.PostID;

    const deleted = await super.Delete(options);
    if (!deleted) return false;

    await this.recomputeParentReactionScore(postId, options?.TransactionGroup);
    return true;
  }

  private async recomputeParentReactionScore(postId: string, txGroup?: any): Promise<void> {
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
    if (txGroup) post.TransactionGroup = txGroup;
    await post.Save();
  }
}

export function LoadForumPostReactionServerEntity(): void {
  void ForumPostReactionServerEntity;
}
