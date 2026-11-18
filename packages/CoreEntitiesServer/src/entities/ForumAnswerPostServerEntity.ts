/* Updated implementation for CR-04 */
  public override async Save(options?: EntitySaveOptions): Promise<boolean> {
    const saved = await super.Save(options);
    if (!saved) return false;

    const context = await this.resolveAuthorSpaceContext(this.ID);
    if (context) {
      // CR-04: Ensure syncMemberProfileCounts handles transaction propagation
      await this.syncMemberProfileCounts(context.spaceId, context.authorUserId);
    }

    return true;
  }

  public override async Delete(options?: EntityDeleteOptions): Promise<boolean> {
    const context = await this.resolveAuthorSpaceContext(this.ID);

    const deleted = await super.Delete(options);
    if (!deleted) return false;

    if (context) {
      await this.syncMemberProfileCounts(context.spaceId, context.authorUserId);
    }

    return true;
  }