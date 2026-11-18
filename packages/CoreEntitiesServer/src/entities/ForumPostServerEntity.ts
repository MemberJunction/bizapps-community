import { BaseEntity, type EntityDeleteOptions, type EntitySaveOptions, type ValidationResult } from '@memberjunction/core';
import { MJEventType, MJGlobal, RegisterClass, UUIDsEqual } from '@memberjunction/global';
import { CommunityRules } from '@mj-biz-apps/community-core';
import {
  COMMUNITY_ENTITY_NAMES,
  type IForumPostSummary,
  type IPostTypeDescriptor,
  mjBizAppsCommunityForumPostEntity,
} from '@mj-biz-apps/community-entities';
import { CommunityEngine } from '../CommunityEngine.ts';
import { ForumDriverRegistry } from '../base-forum-server-driver.ts';
import { PostDriverRegistry } from '../base-post-server-driver.ts';
import {
  failValidation,
  getBooleanOldValue,
  getDirtyFieldNames,
  isFieldDirty,
  loadEntityById,
  loadRows,
  loadSingleRow,
  resolveForumMemberAndRole,
  resolveForumRow,
  resolveForumTypeDescriptor,
  resolvePostTypeDescriptor,
  toForumSummary,
  toPostSummary,
  validUuidOrNull,
  type ForumPostStatusValue,
  type ForumRow,
} from './server-entity-helpers.ts';

export const COMMUNITY_SYNTHESIS_REFRESH_EVENT_CODE = 'Community.ThreadSynthesisRefreshNeeded';

export interface SynthesisRefreshCheckResult {
  shouldRefresh: boolean;
  rootPostId: string;
  replyCount: number;
  summaryReplyWatermark: number;
  threshold: number;
}

interface ParentPostRow {
  ID: string;
  ForumID: string;
  RootPostID: string | null;
  ReplyDepth: number;
  IsLocked: boolean;
}

interface ReplyCountRow {
  ID: string;
  Status: ForumPostStatusValue;
}

const ROLLUP_ONLY_FIELDS = new Set<string>([
  'ReplyCount',
  'ParticipantCount',
  'ReactionScore',
  'ViewCount',
  'LastActivityAt',
  'SummaryMarkdown',
  'SummaryGeneratedAt',
  'SummaryReplyWatermark',
]);

const NON_COUNTED_REPLY_STATUSES = new Set<ForumPostStatusValue>([
  'Draft',
  'PendingModeration',
  'Archived',
  'Redacted',
]);

/**
 * Authoritative server BaseEntity subclass for `MJ_BizApps_Community: Forum Posts`.
 * Enforces Forum status, PostingPolicy, ForumRoleType capabilities, thread lock state,
 * PostType placement / MaxReplyDepth rules, Forum/Post server driver hooks, root thread
 * rollups (`ReplyCount`, `LastActivityAt`), and Living Thread Synthesis watermark checks.
 */
@RegisterClass(BaseEntity, COMMUNITY_ENTITY_NAMES.ForumPosts)
export class ForumPostServerEntity extends mjBizAppsCommunityForumPostEntity {
  public LastSynthesisCheck: SynthesisRefreshCheckResult | null = null;

  public override get DefaultSkipAsyncValidation(): boolean {
    return false;
  }

  private isRollupOnlyUpdate(): boolean {
    if (!this.IsSaved) return false;
    const dirty = getDirtyFieldNames(this);
    return dirty.length > 0 && dirty.every((fieldName) => ROLLUP_ONLY_FIELDS.has(fieldName));
  }

  public override async ValidateAsync(): Promise<ValidationResult> {
    const result = await super.ValidateAsync();
    if (this.isRollupOnlyUpdate()) {
      return result;
    }

    const validForumId = validUuidOrNull(this.ForumID);
    if (!validForumId) {
      return failValidation(result, 'ForumID', 'ForumID must be a valid UUID.');
    }

    const validPostTypeId = validUuidOrNull(this.PostTypeID);
    if (!validPostTypeId) {
      return failValidation(result, 'PostTypeID', 'PostTypeID must be a valid UUID.');
    }

    const forum = await resolveForumRow(this, validForumId);
    if (!forum) {
      return failValidation(result, 'ForumID', `Forum ${validForumId} was not found.`);
    }

    if (forum.Status !== 'Active') {
      return failValidation(
        result,
        'ForumID',
        `Forum "${forum.Name}" has status "${forum.Status}" and does not accept post writes.`,
      );
    }

    const postType = await resolvePostTypeDescriptor(this, validPostTypeId);
    if (!postType) {
      return failValidation(result, 'PostTypeID', `PostType ${validPostTypeId} was not found.`);
    }

    const forumType = await resolveForumTypeDescriptor(this, forum.ForumTypeID);

    const callerUserId = validUuidOrNull(this.ContextCurrentUser?.ID) ?? validUuidOrNull(this.AuthorUserID);
    const { member, roleType } = await resolveForumMemberAndRole(this, validForumId, callerUserId);

    if (member && (member.Status === 'Removed' || member.Status === 'Muted')) {
      return failValidation(
        result,
        'AuthorUserID',
        `Forum member status "${member.Status}" is not permitted to create or edit posts.`,
      );
    }

    if (!member && (!forum.InheritsSpaceMembers || forum.VisibilityBand === 'PrivateForum')) {
      return failValidation(
        result,
        'ForumID',
        'Active ForumMember membership is required to post in this forum.',
      );
    }

    const isModerator = Boolean(roleType && (roleType.CanModerateQueue || roleType.CanConfigureForum));

    if (forum.PostingPolicy === 'ReadOnly' && !isModerator) {
      return failValidation(
        result,
        'ForumID',
        `Forum "${forum.Name}" has a ReadOnly posting policy; only moderators or forum admins may write posts.`,
      );
    }

    const isReply = this.ParentPostID != null || this.RootPostID != null;

    if (roleType && !this.IsSaved) {
      if (!isReply && !roleType.CanCreateRootPost) {
        return failValidation(
          result,
          'AuthorUserID',
          `Role "${roleType.Name}" does not allow creating root posts in this forum.`,
        );
      }
      if (isReply && !roleType.CanReply) {
        return failValidation(
          result,
          'AuthorUserID',
          `Role "${roleType.Name}" does not allow replying in this forum.`,
        );
      }
    }

    const pinOrLockChanged =
      (!this.IsSaved && (Boolean(this.IsPinned) || Boolean(this.IsLocked))) ||
      (this.IsSaved && (isFieldDirty(this, 'IsPinned') || isFieldDirty(this, 'IsLocked')));
    if (pinOrLockChanged && roleType && !roleType.CanPinOrLock && !isModerator) {
      return failValidation(
        result,
        'IsLocked',
        `Role "${roleType.Name}" does not allow pinning or locking posts.`,
      );
    }

    if (
      this.IsSaved &&
      getBooleanOldValue(this, 'IsLocked') === true &&
      Boolean(this.IsLocked) &&
      !isModerator &&
      !roleType?.CanPinOrLock
    ) {
      return failValidation(result, 'IsLocked', 'This post is locked and cannot be edited.');
    }

    if (forum.PostingPolicy === 'Moderated' && !isModerator) {
      const submittingNew = !this.IsSaved && this.Status !== 'Draft';
      const publishingDraft = this.IsSaved && isFieldDirty(this, 'Status') && this.Status === 'Published';
      if (submittingNew || publishingDraft) {
        this.Status = 'PendingModeration';
      }
    }

    const forumSummary = toForumSummary(forum);
    const config = CommunityEngine.Instance.ResolveConfiguration({
      forum: forumSummary,
      postType,
    });

    if (isReply) {
      const parentId = validUuidOrNull(this.ParentPostID ?? this.RootPostID);
      if (!parentId) {
        return failValidation(result, 'ParentPostID', 'ParentPostID or RootPostID must be a valid UUID.');
      }

      const parentRes = await loadSingleRow<ParentPostRow>(
        this,
        COMMUNITY_ENTITY_NAMES.ForumPosts,
        `ID = '${parentId}'`,
        ['ID', 'ForumID', 'RootPostID', 'ReplyDepth', 'IsLocked'],
      );
      if (!parentRes.success || !parentRes.row) {
        return failValidation(result, 'ParentPostID', `Parent post ${parentId} was not found.`);
      }
      const parentPost = parentRes.row;

      if (!UUIDsEqual(parentPost.ForumID, validForumId)) {
        return failValidation(result, 'ParentPostID', 'Reply must belong to the same Forum as its parent post.');
      }

      const derivedRootId = validUuidOrNull(this.RootPostID) ?? parentPost.RootPostID ?? parentPost.ID;
      let rootPost: ParentPostRow = parentPost;
      if (!UUIDsEqual(derivedRootId, parentPost.ID)) {
        const rootRes = await loadSingleRow<ParentPostRow>(
          this,
          COMMUNITY_ENTITY_NAMES.ForumPosts,
          `ID = '${derivedRootId}'`,
          ['ID', 'ForumID', 'RootPostID', 'ReplyDepth', 'IsLocked'],
        );
        if (!rootRes.success || !rootRes.row) {
          return failValidation(result, 'RootPostID', `Root post ${derivedRootId} was not found.`);
        }
        rootPost = rootRes.row;
        if (!UUIDsEqual(rootPost.ForumID, validForumId)) {
          return failValidation(result, 'RootPostID', 'Reply must belong to the same Forum as its root post.');
        }
      }

      this.RootPostID = rootPost.ID;

      if (parentPost.IsLocked || rootPost.IsLocked) {
        return failValidation(result, 'RootPostID', 'Cannot reply to a locked thread.');
      }

      const placement = CommunityRules.ValidatePostPlacement({
        placementRule: postType.PlacementRule,
        allowsNestedReplies: postType.AllowsNestedReplies,
        maxReplyDepth: config.Posts.MaxReplyDepth,
        isRootPost: false,
        parentReplyDepth: parentPost.ReplyDepth,
      });
      if (!placement.allowed) {
        return failValidation(result, 'ReplyDepth', placement.reason ?? 'Reply placement is not allowed.');
      }
      this.ReplyDepth = placement.computedReplyDepth;
    } else {
      const placement = CommunityRules.ValidatePostPlacement({
        placementRule: postType.PlacementRule,
        allowsNestedReplies: postType.AllowsNestedReplies,
        maxReplyDepth: config.Posts.MaxReplyDepth,
        isRootPost: true,
        parentReplyDepth: 0,
      });
      if (!placement.allowed) {
        return failValidation(result, 'PostTypeID', placement.reason ?? 'Root post placement is not allowed.');
      }
      this.ReplyDepth = 0;
    }

    const postSummary = toPostSummary(this);
    const actingUserId = callerUserId ?? '';

    if (forumType) {
      const forumDriver = ForumDriverRegistry.Instance.Resolve(forumType);
      if (forumDriver) {
        const forumVerdict = await forumDriver.ValidatePostInForum({
          forum: forumSummary,
          forumType,
          currentUserId: actingUserId,
          post: postSummary,
          postTypeCode: postType.Code,
        });
        if (!forumVerdict.allowed) {
          return failValidation(
            result,
            'PostTypeID',
            forumVerdict.reason ?? 'Forum driver rejected this post.',
          );
        }
      }
    }

    const postDriver = PostDriverRegistry.Instance.Resolve(postType);
    if (postDriver) {
      const postVerdict = await postDriver.ValidatePostChange({
        post: postSummary,
        postType,
        forum: forumSummary,
        currentUserId: actingUserId,
      });
      if (!postVerdict.allowed) {
        return failValidation(
          result,
          'PostTypeID',
          postVerdict.reason ?? 'Post driver rejected this post.',
        );
      }
    }

    return result;
  }

  public override async Save(options?: EntitySaveOptions): Promise<boolean> {
    const wasNew = !this.IsSaved;
    const isRollupOnly = this.isRollupOnlyUpdate();
    this.LastSynthesisCheck = null;

    const saved = await super.Save(options);
    if (!saved) return false;
    if (isRollupOnly) return true;

    const forum = await resolveForumRow(this, this.ForumID);
    const postType = await resolvePostTypeDescriptor(this, this.PostTypeID);
    const actingUserId = validUuidOrNull(this.ContextCurrentUser?.ID) ?? validUuidOrNull(this.AuthorUserID) ?? '';

    if (forum && postType) {
      const forumSummary = toForumSummary(forum);
      const postSummary = toPostSummary(this);
      const postDriver = PostDriverRegistry.Instance.Resolve(postType);
      if (postDriver) {
        await postDriver.OnPostSaved({
          post: postSummary,
          postType,
          forum: forumSummary,
          currentUserId: actingUserId,
        });

        if (wasNew && this.RootPostID) {
          const rootSummary = await this.loadPostSummaryById(this.RootPostID);
          if (rootSummary) {
            await postDriver.OnReplyAdded({
              post: rootSummary,
              postType,
              forum: forumSummary,
              currentUserId: actingUserId,
              reply: postSummary,
            });
          }
        }
      }

      if (this.RootPostID) {
        await this.syncRootPostRollupAndSynthesis(this.RootPostID, forum, postType, true);
      }
    }

    return true;
  }

  public override async Delete(options?: EntityDeleteOptions): Promise<boolean> {
    const rootPostId = this.RootPostID;
    const forumId = this.ForumID;
    const postTypeId = this.PostTypeID;

    const deleted = await super.Delete(options);
    if (!deleted) return false;

    if (rootPostId) {
      const forum = await resolveForumRow(this, forumId);
      const postType = await resolvePostTypeDescriptor(this, postTypeId);
      if (forum && postType) {
        await this.syncRootPostRollupAndSynthesis(rootPostId, forum, postType, false);
      }
    }

    return true;
  }

  private async loadPostSummaryById(postId: string): Promise<IForumPostSummary | null> {
    const validId = validUuidOrNull(postId);
    if (!validId) return null;
    const res = await loadSingleRow<IForumPostSummary>(
      this,
      COMMUNITY_ENTITY_NAMES.ForumPosts,
      `ID = '${validId}'`,
    );
    return res.success ? res.row : null;
  }

  private async syncRootPostRollupAndSynthesis(
    rootPostId: string,
    forum: ForumRow,
    postType: IPostTypeDescriptor,
    bumpLastActivity: boolean,
  ): Promise<void> {
    const validRootId = validUuidOrNull(rootPostId);
    if (!validRootId) return;

    const repliesRes = await loadRows<ReplyCountRow>(
      this,
      COMMUNITY_ENTITY_NAMES.ForumPosts,
      `RootPostID = '${validRootId}'`,
      ['ID', 'Status'],
      5000,
    );
    if (!repliesRes.success) return;

    const activeReplyCount = repliesRes.rows.filter(
      (r) => !NON_COUNTED_REPLY_STATUSES.has(r.Status),
    ).length;

    const rootPost = await loadEntityById<mjBizAppsCommunityForumPostEntity>(
      COMMUNITY_ENTITY_NAMES.ForumPosts,
      validRootId,
      this.ContextCurrentUser,
    );
    if (!rootPost) return;

    rootPost.ReplyCount = activeReplyCount;
    if (bumpLastActivity) {
      rootPost.LastActivityAt = new Date();
    }
    await rootPost.Save();

    const config = CommunityEngine.Instance.ResolveConfiguration({
      forum: toForumSummary(forum),
      postType,
    });
    const threshold = config.Synthesis.AutoSummarizeThreshold;
    const shouldRefresh =
      postType.TriggersThreadSynthesis &&
      CommunityRules.ShouldRefreshThreadSynthesis({
        replyCount: activeReplyCount,
        summaryReplyWatermark: rootPost.SummaryReplyWatermark,
        initialThreshold: threshold,
      });

    this.LastSynthesisCheck = {
      shouldRefresh,
      rootPostId: validRootId,
      replyCount: activeReplyCount,
      summaryReplyWatermark: rootPost.SummaryReplyWatermark,
      threshold,
    };

    if (shouldRefresh) {
      MJGlobal.Instance.RaiseEvent({
        event: MJEventType.ComponentEvent,
        eventCode: COMMUNITY_SYNTHESIS_REFRESH_EVENT_CODE,
        component: this,
        args: this.LastSynthesisCheck,
      });
    }
  }
}

export function LoadForumPostServerEntity(): void {
  void ForumPostServerEntity;
}
