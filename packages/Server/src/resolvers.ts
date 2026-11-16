import { CommunityRules, type AnonymousReadMode } from '@mj-biz-apps/community-core';
import type { ThreadGraduationRequest, ThreadGraduationResult } from '@mj-biz-apps/community-actions';
import type { IForumPostSummary, IForumSummary } from '@mj-biz-apps/community-entities';

export interface PublicCommunityThreadProjection {
  postId: string;
  forumSlug: string;
  title: string;
  isTeaser: boolean;
  contentMarkdown: string;
  replyCount: number;
  reactionScore: number;
}

/**
 * Unauthenticated / Public Edge projection service.
 * Enforces `AnonymousReadMode` (`None`, `Teaser Only`, `Full Read`) and strips `Team`-band posts.
 */
export class CommunityPublicEdgeService {
  public ProjectPublicThreadList(params: {
    spaceVisibility: 'Private' | 'Listed' | 'Open';
    spaceAnonymousReadMode: AnonymousReadMode;
    forum: Pick<IForumSummary, 'Slug' | 'VisibilityBand' | 'AnonymousReadMode'>;
    posts: ReadonlyArray<IForumPostSummary>;
    teaserMaxChars?: number;
  }): PublicCommunityThreadProjection[] {
    const output: PublicCommunityThreadProjection[] = [];
    for (const post of params.posts) {
      if (post.RootPostID !== null || post.Status === 'Draft' || post.Status === 'PendingModeration') {
        continue;
      }
      const redacted = CommunityRules.RedactForAnonymousEdge({
        spaceVisibility: params.spaceVisibility,
        spaceAnonymousReadMode: params.spaceAnonymousReadMode,
        forumAnonymousReadMode: params.forum.AnonymousReadMode,
        forumVisibilityBand: params.forum.VisibilityBand,
        postVisibilityBand: post.VisibilityBand,
        bodyMarkdown: post.SummaryMarkdown ?? post.BodyMarkdown,
        teaserMaxChars: params.teaserMaxChars,
      });

      if (redacted.visible) {
        output.push({
          postId: post.ID,
          forumSlug: params.forum.Slug,
          title: post.Title ?? 'Untitled Thread',
          isTeaser: redacted.isTeaser,
          contentMarkdown: redacted.contentMarkdown,
          replyCount: post.ReplyCount,
          reactionScore: post.ReactionScore,
        });
      }
    }
    return output;
  }
}

export interface CanonPromotionRequest {
  questionPostId: string;
  canonAnswerPostId: string;
}

export interface CanonPromotionResult {
  questionPostId: string;
  canonAnswerPostId: string;
  /** True when this promotion was already in effect (ForumQuestionPost.AICanonAnswerPostID already matched) — a no-op, not an error. */
  alreadyPromoted: boolean;
}

/**
 * Coordinates 1-click graduation of a high-momentum Community thread into a child Collaboration Space
 * of any allowed peer `SpaceType` (such as `working-group`, `cohort`, `project`, or governance spaces),
 * optional Task seeding on that space, and promotion of a Q&A answer into the forum's Knowledge Canon
 * (`ForumQuestionPost.AICanonAnswerPostID`). Every operation is idempotent: calling it again with the
 * thread/question already in its target state returns the existing outcome rather than erroring or
 * creating a duplicate Space/Task.
 */
export class ThreadGraduationService {
  /**
   * Validates and plans Space/Task graduation. `currentPromotedToSpaceId` is the root post's existing
   * `PromotedToSpaceID` (null if never graduated) — when already set, the plan is idempotent and
   * returns the EXISTING space without seeding a second Task or re-inviting participants.
   */
  public ValidateAndBuildGraduationPlan(params: {
    request: ThreadGraduationRequest;
    allowedChildSpaceTypeCodes: ReadonlyArray<string>;
    userCanPromoteToSpace: boolean;
    currentPromotedToSpaceId?: string | null;
  }): ThreadGraduationResult {
    if (!params.userCanPromoteToSpace) {
      throw new Error('Current member does not hold the CanPromoteToSpace capability in this forum.');
    }

    const normalizedType = params.request.targetSpaceTypeCode.trim().toLowerCase();
    const allowedSet = new Set(params.allowedChildSpaceTypeCodes.map((code) => code.toLowerCase()));
    if (!allowedSet.has(normalizedType)) {
      throw new Error(
        `Target space type "${params.request.targetSpaceTypeCode}" is not in AllowedTypeCodes (${params.allowedChildSpaceTypeCodes.join(', ')}).`,
      );
    }

    if (params.currentPromotedToSpaceId) {
      return {
        promotedToSpaceId: params.currentPromotedToSpaceId,
        targetSpaceTypeCode: normalizedType,
        seededTaskId: null,
        invitedParticipantCount: 0,
      };
    }

    const uniqueParticipants = Array.from(new Set(params.request.includeParticipantUserIds));
    return {
      promotedToSpaceId: `graduated-${params.request.rootPostId}`,
      targetSpaceTypeCode: normalizedType,
      seededTaskId: params.request.seedInitialTaskTitle ? `task-${params.request.rootPostId}` : null,
      invitedParticipantCount: uniqueParticipants.length,
    };
  }

  /**
   * Validates and plans promoting a Q&A answer into the forum's Knowledge Canon. Only the question's
   * author or a forum moderator may promote. `currentAICanonAnswerPostId` is the question's existing
   * `AICanonAnswerPostID` (null if none) — when it already equals `request.canonAnswerPostId`, the
   * promotion is idempotent and `alreadyPromoted` is `true`.
   */
  public ValidateAndBuildCanonPromotion(params: {
    request: CanonPromotionRequest;
    isQuestionAuthorOrModerator: boolean;
    currentAICanonAnswerPostId: string | null;
  }): CanonPromotionResult {
    if (!params.isQuestionAuthorOrModerator) {
      throw new Error('Only the question author or a forum moderator may promote an answer to Knowledge Canon.');
    }

    return {
      questionPostId: params.request.questionPostId,
      canonAnswerPostId: params.request.canonAnswerPostId,
      alreadyPromoted: params.currentAICanonAnswerPostId === params.request.canonAnswerPostId,
    };
  }
}
