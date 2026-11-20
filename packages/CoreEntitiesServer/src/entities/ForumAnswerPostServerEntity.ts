import { BaseEntity, type EntityDeleteOptions, type EntitySaveOptions, type ValidationResult, type TransactionGroupBase } from '@memberjunction/core';
import { RegisterClass, UUIDsEqual } from '@memberjunction/global';
import {
  COMMUNITY_ENTITY_NAMES,
  type mjBizAppsCommunityCommunityMemberProfileEntity,
  mjBizAppsCommunityForumAnswerPostEntity,
} from '@mj-biz-apps/community-entities';
import {
  createNewEntity,
  failValidation,
  loadEntityById,
  loadRows,
  loadSingleRow,
  resolveForumRow,
  resolveForumMemberAndRole,
  isModeratorRole,
  validUuidOrNull,
} from './server-entity-helpers.ts';

type EpistemicStatusValue = mjBizAppsCommunityForumAnswerPostEntity['AIEpistemicStatus'];

interface PostForumAuthorRow {
  ID: string;
  ForumID: string;
  AuthorUserID: string | null;
}

interface IdRow {
  ID: string;
}

interface AnswerCountRow {
  ID: string;
  IsAcceptedByAuthor: boolean;
  IsVerifiedByModerator: boolean;
  AIEpistemicStatus: EpistemicStatusValue;
}

/**
 * Authoritative server BaseEntity subclass for `MJ_BizApps_Community: Forum Answer Posts`.
 * Validates that `QuestionPostID` belongs to the same `Forum` as the answer post and maintains
 * `CommunityMemberProfile.HelpfulAnswerCount` and `CommunityMemberProfile.AcceptedAnswerCount`.
 */
@RegisterClass(BaseEntity, COMMUNITY_ENTITY_NAMES.ForumAnswerPosts)
export class ForumAnswerPostServerEntity extends mjBizAppsCommunityForumAnswerPostEntity {
  public override get DefaultSkipAsyncValidation(): boolean {
    return false;
  }

  public override async ValidateAsync(): Promise<ValidationResult> {
    const result = await super.ValidateAsync();
    const contextUser = this.ContextCurrentUser;
    if (!contextUser) return failValidation(result, 'UserID', 'ContextCurrentUser is required.');

    const validQuestionId = validUuidOrNull(this.QuestionPostID);
    if (!validQuestionId) {
      return failValidation(result, 'QuestionPostID', 'QuestionPostID must be a valid UUID.');
    }

    const validAnswerId = validUuidOrNull(this.ID);
    if (!validAnswerId) {
      return failValidation(result, 'ID', 'Answer post ID must be a valid UUID.');
    }

    if (UUIDsEqual(validAnswerId, validQuestionId)) {
      return failValidation(result, 'QuestionPostID', 'An answer post cannot reference itself as QuestionPostID.');
    }

    const [answerPostRes, questionPostRes] = await Promise.all([
      loadSingleRow<PostForumAuthorRow>(
        this,
        COMMUNITY_ENTITY_NAMES.ForumPosts,
        `ID = '${validAnswerId}'`,
        ['ID', 'ForumID', 'AuthorUserID'],
      ),
      loadSingleRow<PostForumAuthorRow>(
        this,
        COMMUNITY_ENTITY_NAMES.ForumPosts,
        `ID = '${validQuestionId}'`,
        ['ID', 'ForumID', 'AuthorUserID'],
      ),
    ]);

    if (!answerPostRes.success || !answerPostRes.row) {
      return failValidation(result, 'ID', `Parent ForumPost ${validAnswerId} was not found for this answer.`);
    }

    if (!questionPostRes.success || !questionPostRes.row) {
      return failValidation(result, 'QuestionPostID', `Question post ${validQuestionId} was not found.`);
    }

    if (!UUIDsEqual(answerPostRes.row.ForumID, questionPostRes.row.ForumID)) {
      return failValidation(
        result,
        'QuestionPostID',
        `QuestionPostID (${validQuestionId}) belongs to a different Forum than this answer post.`,
      );
    }

    const questionPost = questionPostRes.row;

    const forum = await resolveForumRow(this, questionPost.ForumID);
    if (!forum) {
      return failValidation(result, 'QuestionPostID', `Forum ${questionPost.ForumID} was not found.`);
    }

    // CR-03: Canon Authorization
    const existingAnswer = this.IsSaved
      ? await loadEntityById<mjBizAppsCommunityForumAnswerPostEntity>(
          COMMUNITY_ENTITY_NAMES.ForumAnswerPosts,
          validAnswerId,
          contextUser,
        )
      : null;

    const memberRole = await resolveForumMemberAndRole(this, forum.ID, contextUser.ID);
    const isModerator = isModeratorRole(memberRole.roleType);

    // Check AcceptedByAuthor
    if (
      this.IsAcceptedByAuthor === true ||
      (this.IsSaved && Boolean(existingAnswer?.IsAcceptedByAuthor) !== Boolean(this.IsAcceptedByAuthor))
    ) {
      if (
        !UUIDsEqual(questionPost.AuthorUserID ?? '', contextUser.ID) &&
        !isModerator
      ) {
        return failValidation(result, 'IsAcceptedByAuthor', 'Only question author or moderator can accept/unaccept an answer.');
      }
    }

    // Check VerifiedByModerator or AIEpistemicStatus
    if (
      (this.IsVerifiedByModerator === true) ||
      (this.IsSaved && Boolean(existingAnswer?.IsVerifiedByModerator) !== Boolean(this.IsVerifiedByModerator)) ||
      (this.AIEpistemicStatus as EpistemicStatusValue) === 'Canon Verified' ||
      (this.IsSaved && (existingAnswer?.AIEpistemicStatus as EpistemicStatusValue) !== 'Canon Verified' && (this.AIEpistemicStatus as EpistemicStatusValue) === 'Canon Verified')
    ) {
      if (!isModerator) {
        return failValidation(result, 'AIEpistemicStatus', 'Only a moderator can verify answers or set epistemic status to Canon Verified.');
      }
    }

    return result;
  }

  public override async Save(options?: EntitySaveOptions): Promise<boolean> {
    // CR-04: Transaction Propagation
    const txGroup = (options as EntitySaveOptions & { TransactionGroup?: TransactionGroupBase })?.TransactionGroup ?? null;
    if (txGroup) this.TransactionGroup = txGroup;

    const saved = await super.Save(options);
    if (!saved) return false;

    const context = await this.resolveAuthorSpaceContext(this.ID);
    if (context) {
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

  private async resolveAuthorSpaceContext(
    answerId: string,
  ): Promise<{ spaceId: string; authorUserId: string } | null> {
    const validAnswerId = validUuidOrNull(answerId);
    if (!validAnswerId) return null;

    const postRes = await loadSingleRow<PostForumAuthorRow>(
      this,
      COMMUNITY_ENTITY_NAMES.ForumPosts,
      `ID = '${validAnswerId}'`,
      ['ID', 'ForumID', 'AuthorUserID'],
    );
    const authorUserId = validUuidOrNull(postRes.row?.AuthorUserID);
    const forumId = validUuidOrNull(postRes.row?.ForumID);
    if (!authorUserId || !forumId) return null;

    const forum = await resolveForumRow(this, forumId);
    const spaceId = validUuidOrNull(forum?.SpaceID);
    if (!spaceId) return null;

    return { spaceId, authorUserId };
  }

  private async syncMemberProfileCounts(spaceId: string, userId: string): Promise<void> {
    const validSpaceId = validUuidOrNull(spaceId);
    const validUserId = validUuidOrNull(userId);
    if (!validSpaceId || !validUserId) return;

    const forumsRes = await loadRows<IdRow>(
      this,
      COMMUNITY_ENTITY_NAMES.Forums,
      `SpaceID = '${validSpaceId}'`,
      ['ID'],
      500,
    );
    if (!forumsRes.success) return;

    const validForumIds = forumsRes.rows
      .map((f) => validUuidOrNull(f.ID))
      .filter((id): id is string => id !== null);

    let acceptedCount = 0;
    let helpfulCount = 0;

    if (validForumIds.length > 0) {
      const forumInList = validForumIds.map((id) => `'${id}'`).join(', ');
      const authoredPostsRes = await loadRows<IdRow>(
        this,
        COMMUNITY_ENTITY_NAMES.ForumPosts,
        `AuthorUserID = '${validUserId}' AND ForumID IN (${forumInList})`,
        ['ID'],
        2000,
      );

      if (authoredPostsRes.success && authoredPostsRes.rows.length > 0) {
        const postIds = authoredPostsRes.rows
          .map((p) => validUuidOrNull(p.ID))
          .filter((id): id is string => id !== null);

        if (postIds.length > 0) {
          const postInList = postIds.map((id) => `'${id}'`).join(', ');
          const answersRes = await loadRows<AnswerCountRow>(
            this,
            COMMUNITY_ENTITY_NAMES.ForumAnswerPosts,
            `ID IN (${postInList})`,
            ['ID', 'IsAcceptedByAuthor', 'IsVerifiedByModerator', 'AIEpistemicStatus'],
            2000,
          );

          if (answersRes.success) {
            for (const row of answersRes.rows) {
              const accepted = Boolean(row.IsAcceptedByAuthor);
              const helpful =
                accepted ||
                Boolean(row.IsVerifiedByModerator) ||
                row.AIEpistemicStatus === 'Canon Verified';
              if (accepted) acceptedCount += 1;
              if (helpful) helpfulCount += 1;
            }
          }
        }
      }
    }

    const existingProfileRes = await loadSingleRow<IdRow>(
      this,
      COMMUNITY_ENTITY_NAMES.CommunityMemberProfiles,
      `SpaceID = '${validSpaceId}' AND UserID = '${validUserId}'`,
      ['ID'],
    );
    if (!existingProfileRes.success) return;

    let profile: mjBizAppsCommunityCommunityMemberProfileEntity | null = null;
    if (existingProfileRes.row) {
      profile = await loadEntityById<mjBizAppsCommunityCommunityMemberProfileEntity>(
        COMMUNITY_ENTITY_NAMES.CommunityMemberProfiles,
        existingProfileRes.row.ID,
        this.ContextCurrentUser,
      );
    } else {
      profile = await createNewEntity<mjBizAppsCommunityCommunityMemberProfileEntity>(
        COMMUNITY_ENTITY_NAMES.CommunityMemberProfiles,
        this.ContextCurrentUser,
      );
      if (profile) {
        profile.SpaceID = validSpaceId;
        profile.UserID = validUserId;
      }
    }

    if (!profile) return;

    profile.AcceptedAnswerCount = acceptedCount;
    profile.HelpfulAnswerCount = helpfulCount;
    await profile.Save();
  }
}

export function LoadForumAnswerPostServerEntity(): void {
  void ForumAnswerPostServerEntity;
}
