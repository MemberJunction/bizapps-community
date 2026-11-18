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
}

export function LoadForumPostReactionServerEntity(): void {
  void ForumPostReactionServerEntity;
}