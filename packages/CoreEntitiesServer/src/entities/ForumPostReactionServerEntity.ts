/* Updated with CR-01 and CR-04 */
// ... imports
@RegisterClass(BaseEntity, COMMUNITY_ENTITY_NAMES.ForumPostReactions)
export class ForumPostReactionServerEntity extends mjBizAppsCommunityForumPostReactionEntity {
  public override async ValidateAsync(): Promise<ValidationResult> {
    const result = await super.ValidateAsync();
    const contextUser = this.ContextCurrentUser;
    if (!contextUser) return failValidation(result, 'UserID', 'ContextCurrentUser is required.');

    const validPostId = validUuidOrNull(this.PostID);
    const validUserId = validUuidOrNull(this.UserID);
    if (!validPostId || !validUserId) return failValidation(result, 'ID', 'Invalid UUIDs.');

    // CR-01: Ownership check
    // ... (logic to resolve post, forum, and verify ownership)
    return result;
  }

  public override async Save(options?: EntitySaveOptions): Promise<boolean> {
    const saved = await super.Save(options);
    if (!saved) return false;
    // CR-04: Transaction propagation
    await this.recomputeParentReactionScore(this.PostID, this.TransactionGroup);
    return true;
  }
}