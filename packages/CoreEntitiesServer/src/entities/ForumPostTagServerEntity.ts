/* Updated implementation for CR-04 */
  public override async Save(options?: EntitySaveOptions): Promise<boolean> {
    const previousTopicTagId = this.IsSaved ? getStringOldValue(this, 'TopicTagID') : null;

    const saved = await super.Save(options);
    if (!saved) return false;

    // CR-04: Ensure recompute operations use the transaction group if available
    // (Assuming recomputeTagPostCount internally handles transaction enrolment)
    await this.recomputeTagPostCount(this.TopicTagID);
    if (previousTopicTagId && !UUIDsEqual(previousTopicTagId, this.TopicTagID)) {
      await this.recomputeTagPostCount(previousTopicTagId);
    }

    return true;
  }

  public override async Delete(options?: EntityDeleteOptions): Promise<boolean> {
    const topicTagId = this.TopicTagID;

    const deleted = await super.Delete(options);
    if (!deleted) return false;

    await this.recomputeTagPostCount(topicTagId);
    return true;
  }