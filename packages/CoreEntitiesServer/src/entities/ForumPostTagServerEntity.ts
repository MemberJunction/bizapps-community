import { BaseEntity, type EntityDeleteOptions, type EntitySaveOptions, type ValidationResult } from '@memberjunction/core';
import { RegisterClass, UUIDsEqual } from '@memberjunction/global';
import {
  COMMUNITY_ENTITY_NAMES,
  mjBizAppsCommunityForumPostTagEntity,
  type mjBizAppsCommunityForumTopicTagEntity,
} from '@mj-biz-apps/community-entities';
import {
  failValidation,
  getStringOldValue,
  loadEntityById,
  loadRows,
  loadSingleRow,
  resolveForumRow,
  validUuidOrNull,
} from './server-entity-helpers.ts';

interface PostForumRow {
  ID: string;
  ForumID: string;
}

interface TopicTagSpaceRow {
  ID: string;
  SpaceID: string;
}

interface IdRow {
  ID: string;
}

/**
 * Authoritative server BaseEntity subclass for `MJ_BizApps_Community: Forum Post Tags`.
 * Validates that `ForumTopicTag.SpaceID` matches the post's `Forum.SpaceID` and maintains
 * `ForumTopicTag.PostCount` on Save and Delete.
 */
@RegisterClass(BaseEntity, COMMUNITY_ENTITY_NAMES.ForumPostTags)
export class ForumPostTagServerEntity extends mjBizAppsCommunityForumPostTagEntity {
  public override get DefaultSkipAsyncValidation(): boolean {
    return false;
  }

  public override async ValidateAsync(): Promise<ValidationResult> {
    const result = await super.ValidateAsync();

    const validPostId = validUuidOrNull(this.PostID);
    if (!validPostId) {
      return failValidation(result, 'PostID', 'PostID must be a valid UUID.');
    }

    const validTopicTagId = validUuidOrNull(this.TopicTagID);
    if (!validTopicTagId) {
      return failValidation(result, 'TopicTagID', 'TopicTagID must be a valid UUID.');
    }

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

    const tagRes = await loadSingleRow<TopicTagSpaceRow>(
      this,
      COMMUNITY_ENTITY_NAMES.ForumTopicTags,
      `ID = '${validTopicTagId}'`,
      ['ID', 'SpaceID'],
    );
    if (!tagRes.success || !tagRes.row) {
      return failValidation(result, 'TopicTagID', `ForumTopicTag ${validTopicTagId} was not found.`);
    }

    if (!UUIDsEqual(tagRes.row.SpaceID, forum.SpaceID)) {
      return failValidation(
        result,
        'TopicTagID',
        `ForumTopicTag SpaceID (${tagRes.row.SpaceID}) does not match post Forum SpaceID (${forum.SpaceID}).`,
      );
    }

    return result;
  }

  public override async Save(options?: EntitySaveOptions): Promise<boolean> {
    // CR-04: Transaction Propagation
    const txGroup = options?.TransactionGroup ?? null;
    if (txGroup) this.TransactionGroup = txGroup;

    const previousTopicTagId = this.IsSaved ? getStringOldValue(this, 'TopicTagID') : null;

    const saved = await super.Save(options);
    if (!saved) return false;

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

  private async recomputeTagPostCount(topicTagId: string): Promise<void> {
    const validTopicTagId = validUuidOrNull(topicTagId);
    if (!validTopicTagId) return;

    const tagLinksRes = await loadRows<IdRow>(
      this,
      COMMUNITY_ENTITY_NAMES.ForumPostTags,
      `TopicTagID = '${validTopicTagId}'`,
      ['ID'],
      5000,
    );
    if (!tagLinksRes.success) return;

    const topicTag = await loadEntityById<mjBizAppsCommunityForumTopicTagEntity>(
      COMMUNITY_ENTITY_NAMES.ForumTopicTags,
      validTopicTagId,
      this.ContextCurrentUser,
    );
    if (!topicTag) return;

    topicTag.PostCount = tagLinksRes.rows.length;
    await topicTag.Save();
  }
}

export function LoadForumPostTagServerEntity(): void {
  void ForumPostTagServerEntity;
}
