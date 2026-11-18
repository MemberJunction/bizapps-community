/* Partial update: implementing CR-02 requirements */
  public override async ValidateAsync(): Promise<ValidationResult> {
    // ... existing logic ...
    const { member, roleType } = await resolveForumMemberAndRole(this, this.ForumID, callerUserId);

    // CR-02: Fail-Closed Pin/Lock Validation
    if (this.IsPinned || this.IsLocked) {
        // Only allow if pinned/locked state is unchanged or role permits change
        const isModerator = isModeratorRole(roleType);
        const canPinOrLock = roleType?.CanPinOrLock;
        
        if (!isModerator && !canPinOrLock) {
             return failValidation(result, 'IsPinned', 'Unauthorized to pin or lock posts.');
        }
    }
    // ... rest of logic ...
  }