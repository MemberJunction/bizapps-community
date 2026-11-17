import { RegisterClass } from '@memberjunction/global';
import {
  CommunityRules,
  type AnswerAcceptanceDecision,
  type IdeaAllocationValidationResult,
  type InteractiveAttemptDecision,
  type InteractiveSessionSummary,
  type PollResponseDecision,
} from '@mj-biz-apps/community-core';
import type {
  IForumIdeaAllocationSummary,
  IForumIdeaCampaignSummary,
  IForumIdeaPostSummary,
  IForumInteractivePostSummary,
  IForumInteractiveSessionRecord,
} from '@mj-biz-apps/community-entities';
import { CommunityEngine } from '../CommunityEngine.ts';
import {
  BaseForumServerDriver,
  ForumDriverRegistry,
  type ForumAgentContextContribution,
  type ForumPostValidationContext,
  type ForumValidationResult,
} from '../base-forum-server-driver.ts';
import {
  BasePostServerDriver,
  PostDriverRegistry,
  type PostDriverContext,
  type PostSearchChunk,
} from '../base-post-server-driver.ts';

/**
 * Server driver for the `qa-knowledge-base` ForumType.
 * Restricts root posts to `question` and replies to `answer` or `comment`.
 */
@RegisterClass(BaseForumServerDriver, 'QAForumServerDriver')
export class QAForumServerDriver extends BaseForumServerDriver {
  public override async ValidatePostInForum(
    ctx: ForumPostValidationContext,
  ): Promise<ForumValidationResult> {
    const isRoot = ctx.post.RootPostID === null;
    if (isRoot && ctx.postTypeCode !== 'question') {
      return {
        allowed: false,
        reason: 'Root posts in a Q&A Knowledge Base forum must use the Question post type.',
      };
    }
    if (!isRoot && ctx.postTypeCode !== 'answer' && ctx.postTypeCode !== 'comment') {
      return {
        allowed: false,
        reason: 'Replies in a Q&A Knowledge Base forum must be an Answer or Comment.',
      };
    }
    return { allowed: true };
  }
}

/**
 * Server driver for the `ideation-campaign` ForumType.
 */
@RegisterClass(BaseForumServerDriver, 'IdeaCampaignForumServerDriver')
export class IdeaCampaignForumServerDriver extends BaseForumServerDriver {
  public override async ValidatePostInForum(
    ctx: ForumPostValidationContext,
  ): Promise<ForumValidationResult> {
    const isRoot = ctx.post.RootPostID === null;
    if (isRoot && ctx.postTypeCode !== 'idea-proposal' && ctx.postTypeCode !== 'poll-or-form') {
      return {
        allowed: false,
        reason: 'Root posts in an Ideation Campaign forum must be an Idea Proposal or Poll/Form.',
      };
    }
    return { allowed: true };
  }
}

/**
 * Server driver for the `playbooks-and-docs` ForumType.
 * Restricts root/reply posts to the collaborative Artifact subtypes (doc/sheet/deck) and replies.
 */
@RegisterClass(BaseForumServerDriver, 'PlaybooksForumServerDriver')
export class PlaybooksForumServerDriver extends BaseForumServerDriver {
  public override async ValidatePostInForum(
    ctx: ForumPostValidationContext,
  ): Promise<ForumValidationResult> {
    const isRoot = ctx.post.RootPostID === null;
    const rootTypes = new Set(['collaborative-doc', 'collaborative-sheet', 'collaborative-deck']);
    if (isRoot && !rootTypes.has(ctx.postTypeCode)) {
      return {
        allowed: false,
        reason: 'Root posts in a Playbooks & Collaborative Docs forum must be a Document, Spreadsheet, or Presentation.',
      };
    }
    return { allowed: true };
  }
}

/**
 * Server driver for the `peer-case-rounds` ForumType.
 * Restricts root posts to Peer Case Review.
 */
@RegisterClass(BaseForumServerDriver, 'CaseRoundsForumServerDriver')
export class CaseRoundsForumServerDriver extends BaseForumServerDriver {
  public override async ValidatePostInForum(
    ctx: ForumPostValidationContext,
  ): Promise<ForumValidationResult> {
    const isRoot = ctx.post.RootPostID === null;
    if (isRoot && ctx.postTypeCode !== 'case-review') {
      return {
        allowed: false,
        reason: 'Root posts in a Peer Case Rounds forum must use the Peer Case Review post type.',
      };
    }
    return { allowed: true };
  }
}

/**
 * Server driver for the `live-events-and-amas` ForumType.
 * Restricts root posts to Live AMA / Town Hall or Question.
 */
@RegisterClass(BaseForumServerDriver, 'LiveEventsForumServerDriver')
export class LiveEventsForumServerDriver extends BaseForumServerDriver {
  public override async ValidatePostInForum(
    ctx: ForumPostValidationContext,
  ): Promise<ForumValidationResult> {
    const isRoot = ctx.post.RootPostID === null;
    if (isRoot && ctx.postTypeCode !== 'live-ama' && ctx.postTypeCode !== 'question') {
      return {
        allowed: false,
        reason: 'Root posts in a Live Events & AMAs forum must be a Live AMA/Town Hall or Question.',
      };
    }
    return { allowed: true };
  }
}

/**
 * Server driver for `question` PostType.
 */
@RegisterClass(BasePostServerDriver, 'QuestionPostServerDriver')
export class QuestionPostServerDriver extends BasePostServerDriver {
  public override async ValidatePostChange(
    ctx: PostDriverContext,
  ): Promise<ForumValidationResult> {
    const placement = CommunityRules.ValidatePostPlacement({
      placementRule: ctx.postType.PlacementRule,
      allowsNestedReplies: ctx.postType.AllowsNestedReplies,
      maxReplyDepth: CommunityEngine.Instance.ResolveForumConfiguration(ctx.forum).Posts.MaxReplyDepth,
      isRootPost: ctx.post.RootPostID === null,
      parentReplyDepth: Math.max(0, ctx.post.ReplyDepth - 1),
    });
    return { allowed: placement.allowed, reason: placement.reason };
  }
}

/**
 * Server driver for `answer` PostType. Boosts verified answers in search/RAG chunks and enforces the
 * Q&A single-accepted-answer invariant.
 */
@RegisterClass(BasePostServerDriver, 'AnswerPostServerDriver')
export class AnswerPostServerDriver extends BasePostServerDriver {
  public override async BuildSearchChunks(ctx: PostDriverContext): Promise<PostSearchChunk[]> {
    return [
      {
        postId: ctx.post.ID,
        title: ctx.post.Title ?? 'Community Answer',
        markdown: ctx.post.BodyMarkdown,
        epistemicWeight: 1.5,
      },
    ];
  }

  /**
   * Validates accepting or unaccepting this answer against the question's single-accepted-answer
   * invariant. Only the question's author may change acceptance, and accepting an answer while a
   * DIFFERENT answer is already accepted is rejected until that one is unaccepted first.
   */
  public ValidateAcceptedAnswerChange(params: {
    answerPostId: string;
    settingAccepted: boolean;
    currentlyAcceptedAnswerPostId: string | null;
    isQuestionAuthor: boolean;
  }): AnswerAcceptanceDecision {
    return CommunityRules.ValidateAcceptedAnswerChange(params);
  }
}

/**
 * Server driver for `idea-proposal` PostType. Enforces the Ideation Campaign's 100-Point Wallet /
 * Quadratic Voting math (`PointsSpent = EffectiveVotes^2`) on every allocation change.
 */
@RegisterClass(BasePostServerDriver, 'IdeaPostServerDriver')
export class IdeaPostServerDriver extends BasePostServerDriver {
  /**
   * Validates a single member's allocation change to this idea, refunding their prior spend on this
   * SAME idea before re-checking the campaign's wallet budget. `newPointsAllocated = 0` removes the
   * allocation entirely (a full refund).
   */
  public ValidateAllocationChange(params: {
    campaign: Pick<IForumIdeaCampaignSummary, 'AllocationMode' | 'DefaultBudgetPoints' | 'MaxPointsPerIdea'>;
    existingAllocations: ReadonlyArray<Pick<IForumIdeaAllocationSummary, 'IdeaPostID' | 'PointsAllocated'>>;
    ideaPost: Pick<IForumIdeaPostSummary, 'ID'>;
    newPointsAllocated: number;
  }): IdeaAllocationValidationResult {
    return CommunityRules.ValidateIdeaAllocationChange({
      mode: params.campaign.AllocationMode,
      budgetPoints: params.campaign.DefaultBudgetPoints,
      maxPointsPerIdea: params.campaign.MaxPointsPerIdea,
      existingAllocations: params.existingAllocations.map((a) => ({
        ideaPostId: a.IdeaPostID,
        pointsAllocated: a.PointsAllocated,
      })),
      changedIdeaPostId: params.ideaPost.ID,
      newPointsAllocated: params.newPointsAllocated,
    });
  }
}

/**
 * Server driver for `collaborative-doc`, `collaborative-sheet`, and `collaborative-deck` PostTypes.
 */
@RegisterClass(BasePostServerDriver, 'ArtifactPostServerDriver')
export class ArtifactPostServerDriver extends BasePostServerDriver {}

/**
 * Server driver for `interactive-experience` PostType (Sandboxed MJ Component Artifacts). Enforces
 * `MaxAttemptsPerMember` and resolves each member's leaderboard-worthy `ForumInteractiveSession` per
 * the post's `ScoringMode`.
 */
@RegisterClass(BasePostServerDriver, 'InteractivePostServerDriver')
export class InteractivePostServerDriver extends BasePostServerDriver {
  public ValidateAttempt(params: {
    interactivePost: Pick<IForumInteractivePostSummary, 'MaxAttemptsPerMember'>;
    existingSessions: ReadonlyArray<Pick<IForumInteractiveSessionRecord, 'AttemptNumber'>>;
  }): InteractiveAttemptDecision {
    return CommunityRules.ValidateInteractiveAttempt({
      maxAttemptsPerMember: params.interactivePost.MaxAttemptsPerMember,
      existingSessions: params.existingSessions.map((s) => ({ attemptNumber: s.AttemptNumber })),
    });
  }

  public ResolveLeaderboardSession(params: {
    interactivePost: Pick<IForumInteractivePostSummary, 'ScoringMode'>;
    sessions: ReadonlyArray<
      Pick<IForumInteractiveSessionRecord, 'AttemptNumber' | 'Score' | 'DurationSeconds' | 'Completed'>
    >;
  }): InteractiveSessionSummary | null {
    return CommunityRules.ResolveBestInteractiveSession({
      scoringMode: params.interactivePost.ScoringMode,
      sessions: params.sessions.map((s) => ({
        attemptNumber: s.AttemptNumber,
        score: s.Score,
        durationSeconds: s.DurationSeconds,
        completed: s.Completed,
      })),
    });
  }
}

/**
 * Server driver for `poll-or-form` PostType (`BizApps Forms` integration). Enforces single- vs.
 * multi-choice selection on each response.
 */
@RegisterClass(BasePostServerDriver, 'FormPostServerDriver')
export class FormPostServerDriver extends BasePostServerDriver {
  public ValidatePollResponse(params: {
    allowMultipleSelections: boolean;
    availableOptionIds: ReadonlyArray<string>;
    selectedOptionIds: ReadonlyArray<string>;
  }): PollResponseDecision {
    return CommunityRules.ValidatePollResponse(params);
  }
}

/**
 * Server driver for `case-review` PostType (Peer Case Rounds — Structured Situation / Action /
 * Outcome review).
 */
@RegisterClass(BasePostServerDriver, 'CasePostServerDriver')
export class CasePostServerDriver extends BasePostServerDriver {}

/**
 * Server driver for `live-ama` PostType (Live AMA / Town Hall).
 */
@RegisterClass(BasePostServerDriver, 'AMAPostServerDriver')
export class AMAPostServerDriver extends BasePostServerDriver {}

/**
 * Server driver for the Collaboration `community` SpaceType (`CommunitySpaceServerDriver`).
 * Enforces slug formatting, creates default forums on Community Space creation, and contributes
 * forum/thread summaries to Collaboration's Space Agent context.
 */
export class CommunitySpaceServerDriver {
  public ValidateCommunitySlug(slug: string): ForumValidationResult {
    const normalized = slug.trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
      return {
        allowed: false,
        reason: 'Community Space slug must contain only lowercase letters, numbers, and hyphens.',
      };
    }
    return { allowed: true };
  }

  public BuildCommunityAgentContext(params: {
    spaceName: string;
    slug: string;
    activeForumCount: number;
    canonAnswerCount: number;
  }): ForumAgentContextContribution {
    return {
      summary: `Community "${params.spaceName}" (${params.slug}): ${params.activeForumCount} active forum(s), ${params.canonAnswerCount} verified canon answer(s).`,
      data: {
        slug: params.slug,
        activeForumCount: params.activeForumCount,
        canonAnswerCount: params.canonAnswerCount,
      },
    };
  }
}

export function RegisterBuiltInCommunityServerDrivers(): void {
  ForumDriverRegistry.Instance.Register('QAForumServerDriver', new QAForumServerDriver());
  ForumDriverRegistry.Instance.Register('qa-knowledge-base', new QAForumServerDriver());
  ForumDriverRegistry.Instance.Register(
    'IdeaCampaignForumServerDriver',
    new IdeaCampaignForumServerDriver(),
  );
  ForumDriverRegistry.Instance.Register(
    'ideation-campaign',
    new IdeaCampaignForumServerDriver(),
  );
  ForumDriverRegistry.Instance.Register('PlaybooksForumServerDriver', new PlaybooksForumServerDriver());
  ForumDriverRegistry.Instance.Register('playbooks-and-docs', new PlaybooksForumServerDriver());
  ForumDriverRegistry.Instance.Register('CaseRoundsForumServerDriver', new CaseRoundsForumServerDriver());
  ForumDriverRegistry.Instance.Register('peer-case-rounds', new CaseRoundsForumServerDriver());
  ForumDriverRegistry.Instance.Register('LiveEventsForumServerDriver', new LiveEventsForumServerDriver());
  ForumDriverRegistry.Instance.Register('live-events-and-amas', new LiveEventsForumServerDriver());

  PostDriverRegistry.Instance.Register('QuestionPostServerDriver', new QuestionPostServerDriver());
  PostDriverRegistry.Instance.Register('question', new QuestionPostServerDriver());
  PostDriverRegistry.Instance.Register('AnswerPostServerDriver', new AnswerPostServerDriver());
  PostDriverRegistry.Instance.Register('answer', new AnswerPostServerDriver());
  PostDriverRegistry.Instance.Register('IdeaPostServerDriver', new IdeaPostServerDriver());
  PostDriverRegistry.Instance.Register('idea-proposal', new IdeaPostServerDriver());
  PostDriverRegistry.Instance.Register('ArtifactPostServerDriver', new ArtifactPostServerDriver());
  PostDriverRegistry.Instance.Register(
    'InteractivePostServerDriver',
    new InteractivePostServerDriver(),
  );
  PostDriverRegistry.Instance.Register('interactive-experience', new InteractivePostServerDriver());
  PostDriverRegistry.Instance.Register('FormPostServerDriver', new FormPostServerDriver());
  PostDriverRegistry.Instance.Register('poll-or-form', new FormPostServerDriver());
  PostDriverRegistry.Instance.Register('CasePostServerDriver', new CasePostServerDriver());
  PostDriverRegistry.Instance.Register('case-review', new CasePostServerDriver());
  PostDriverRegistry.Instance.Register('AMAPostServerDriver', new AMAPostServerDriver());
  PostDriverRegistry.Instance.Register('live-ama', new AMAPostServerDriver());
}
