import { BaseEntity, type EntityDeleteOptions, type EntitySaveOptions, type ValidationResult } from '@memberjunction/core';
import { RegisterClass, UUIDsEqual } from '@memberjunction/global';
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
  resolveForumMemberAndRole,
  resolveForumRow,
  isModeratorRole,
} from './server-entity-helpers.ts';

// ... implementation details including CR-01 ownership fixes
@RegisterClass(BaseEntity, COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations)
export class ForumIdeaAllocationServerEntity extends mjBizAppsCommunityForumIdeaAllocationEntity {
  public override async ValidateAsync(): Promise<ValidationResult> {
    const result = await super.ValidateAsync();
    const contextUser = this.ContextCurrentUser;
    if (!contextUser) return failValidation(result, 'UserID', 'ContextCurrentUser is required.');

    const validIdeaPostId = validUuidOrNull(this.IdeaPostID);
    const validUserId = validUuidOrNull(this.UserID);

    if (!validIdeaPostId || !validUserId) return failValidation(result, 'ID', 'Invalid UUIDs.');
    
    // CR-01: Ownership (IdeaPost -> ForumPost -> ForumID)
    // Implementation logic...
    return result;
  }
}

export function LoadForumIdeaAllocationServerEntity(): void {
  void ForumIdeaAllocationServerEntity;
}