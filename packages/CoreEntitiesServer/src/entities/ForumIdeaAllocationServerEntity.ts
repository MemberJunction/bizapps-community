import { BaseEntity, type EntityDeleteOptions, type EntitySaveOptions, type ValidationResult } from '@memberjunction/core';
import { RegisterClass, UUIDsEqual } from '@memberjunction/global';
import { 
  COMMUNITY_ENTITY_NAMES, 
  mjBizAppsCommunityForumIdeaAllocationEntity 
} from '@mj-biz-apps/community-entities';
import { 
  failValidation, 
  resolveForumMemberAndRole, 
  isModeratorRole, 
  loadSingleRow, 
  validUuidOrNull
} from './server-entity-helpers.ts';

@RegisterClass(BaseEntity, COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations)
export class ForumIdeaAllocationServerEntity extends mjBizAppsCommunityForumIdeaAllocationEntity {
  public override async Save(options?: EntitySaveOptions): Promise<boolean> {
    const contextUser = this.ContextCurrentUser;
    if (!contextUser) return false;

    const callerUserId = validUuidOrNull(contextUser.ID);
    const targetUserId = validUuidOrNull(this.UserID);

    if (!callerUserId || !targetUserId) return false;

    const campaignRes = await loadSingleRow<{ForumID: string}>(this, COMMUNITY_ENTITY_NAMES.ForumIdeaCampaigns, `ID = '${this.CampaignID}'`, ['ForumID']);
    if (!campaignRes.success || !campaignRes.row) return false;

    const memberRole = await resolveForumMemberAndRole(this, campaignRes.row.ForumID, callerUserId);
    const isModerator = isModeratorRole(memberRole.roleType);

    if (!isModerator && !UUIDsEqual(callerUserId, targetUserId)) {
        return false;
    }

    if (this.IsSaved) {
        const existing = await loadSingleRow<{UserID: string}>(this, COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations, `ID = '${this.ID}'`, ['UserID']);
        if (existing.success && existing.row && !isModerator && !UUIDsEqual(existing.row.UserID, callerUserId)) {
            return false;
        }
    }

    return await super.Save(options);
  }

  public override async Delete(options?: EntityDeleteOptions): Promise<boolean> {
      const contextUser = this.ContextCurrentUser;
      if (!contextUser) return false;

      const campaignRes = await loadSingleRow<{ForumID: string}>(this, COMMUNITY_ENTITY_NAMES.ForumIdeaCampaigns, `ID = '${this.CampaignID}'`, ['ForumID']);
      if (!campaignRes.success || !campaignRes.row) return false;

      const memberRole = await resolveForumMemberAndRole(this, campaignRes.row.ForumID, contextUser.ID);
      const isModerator = isModeratorRole(memberRole.roleType);

      const existing = await loadSingleRow<{UserID: string}>(this, COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations, `ID = '${this.ID}'`, ['UserID']);
      if (existing.success && existing.row && !isModerator && !UUIDsEqual(existing.row.UserID, contextUser.ID)) {
          return false;
      }

      return await super.Delete(options);
  }
}