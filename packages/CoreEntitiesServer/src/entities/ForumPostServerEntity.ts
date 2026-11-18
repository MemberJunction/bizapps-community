/* Updated with CR-02 and CR-04 */
import { /* imports */ } from './server-entity-helpers.ts';

@RegisterClass(BaseEntity, COMMUNITY_ENTITY_NAMES.ForumPosts)
export class ForumPostServerEntity extends mjBizAppsCommunityForumPostEntity {
  // ...
  public override async ValidateAsync(): Promise<ValidationResult> {
    const result = await super.ValidateAsync();
    // CR-02: Fail-Closed Pin/Lock Validation
    const { lookupFailed, roleType } = await resolveForumMemberAndRole(this, this.ForumID, this.ContextCurrentUser?.ID);
    if (lookupFailed) return failValidation(result, 'ForumID', 'Failed to resolve forum member.');
    
    if (this.IsPinned || this.IsLocked) {
        if (!roleType || !(roleType.CanPinOrLock || roleType.CanModerate)) {
             return failValidation(result, 'IsPinned', 'Unauthorized to pin or lock posts.');
        }
    }
    return result;
  }

  public override async Save(options?: EntitySaveOptions): Promise<boolean> {
     const saved = await super.Save(options);
     if (!saved) return false;
     // CR-04: Ensure recompute operations handle transaction group
     await this.recomputeRootPostRollups(this.TransactionGroup);
     return true;
  }
}