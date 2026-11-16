/**
 * Pure domain rules for BizApps Community:
 *  1. Visibility Band Ceiling (`Shared` vs. `Team` vs. `PrivateForum`)
 *  2. Anonymous / Public Edge Read Redaction (`None`, `Teaser Only`, `Full Read`)
 *  3. Ideation Campaign Allocation Math (`Point Allocation` & `Quadratic` where Cost = Votes^2),
 *     including refund-on-revote for a single idea's allocation change
 *  4. Living Thread Synthesis Watermark Trigger
 *  5. Post Placement Validation (`Root Only`, `Reply Only`, `Both` + MaxReplyDepth)
 *  6. Q&A Single Accepted Answer Invariant
 *  7. Poll/Form Single- vs. Multi-Choice Response Validation
 *  8. Interactive Component Attempt Limits & Per-ScoringMode Leaderboard Resolution
 */

export type CommunityVisibilityBand = 'Shared' | 'Team';
export type ForumVisibilityBand = 'Shared' | 'Team' | 'PrivateForum';
export type AnonymousReadMode = 'None' | 'Teaser Only' | 'Full Read';
export type IdeationAllocationMode = 'Point Allocation' | 'Quadratic';
export type PostPlacementRule = 'Root Only' | 'Reply Only' | 'Both';
export type EpistemicAnswerStatus =
  | 'Canon Verified'
  | 'Novel Insight'
  | 'Partially Outdated'
  | 'Conflicts With Canon';

export interface ForumAccessInput {
  spaceAccess: {
    canReadSpace: boolean;
    canSeeTeamBand: boolean;
    isSpaceOpenForWrites: boolean;
  };
  forum: {
    visibilityBand: ForumVisibilityBand;
    inheritsSpaceMembers: boolean;
    postingPolicy: 'Open' | 'Moderated' | 'ReadOnly';
    status: 'Active' | 'Archived' | 'Locked';
  };
  forumMembership?: {
    status: 'Active' | 'Invited' | 'Muted' | 'Removed';
    canConfigureForum: boolean;
    canModerateQueue: boolean;
    canCreateRootPost: boolean;
    canReply: boolean;
  } | null;
}

export interface ForumAccessDecision {
  canReadForum: boolean;
  canSeeTeamPosts: boolean;
  canCreateRootPost: boolean;
  canReply: boolean;
  canModerateQueue: boolean;
  requiresModerationQueue: boolean;
}

export interface IdeaAllocationEntry {
  ideaPostId: string;
  pointsAllocated: number;
}

export interface IdeaAllocationValidationResult {
  valid: boolean;
  totalPointsUsed: number;
  remainingBudgetPoints: number;
  effectiveVotesByIdea: Record<string, number>;
  errorMessage?: string;
}

export interface ExistingIdeaAllocation {
  ideaPostId: string;
  pointsAllocated: number;
}

export interface AnswerAcceptanceDecision {
  allowed: boolean;
  reason?: string;
}

export interface PollResponseDecision {
  allowed: boolean;
  reason?: string;
}

export type InteractiveScoringMode = 'Best Score' | 'Fastest Time' | 'Streak' | 'Completion' | 'None';

export interface InteractiveSessionSummary {
  attemptNumber: number;
  score: number | null;
  durationSeconds: number | null;
  completed: boolean;
}

export interface InteractiveAttemptDecision {
  allowed: boolean;
  nextAttemptNumber: number;
  reason?: string;
}

export interface PostPlacementInput {
  placementRule: PostPlacementRule;
  allowsNestedReplies: boolean;
  maxReplyDepth: number;
  isRootPost: boolean;
  parentReplyDepth: number;
}

export interface PostPlacementDecision {
  allowed: boolean;
  computedReplyDepth: number;
  reason?: string;
}

/**
 * Pure domain rule engine for BizApps Community.
 * Keeps zero database or network dependencies so rules execute identically in
 * server entity drivers, GraphQL resolvers, and Angular client components.
 */
export class CommunityRules {
  /**
   * Computes a member's effective access to a Forum inside a Collaboration Space.
   * Outside members (`canSeeTeamBand === false`) are strictly blocked from `Team` forums and `Team` posts.
   */
  public static EvaluateForumAccess(input: ForumAccessInput): ForumAccessDecision {
    const { spaceAccess, forum, forumMembership } = input;
    const denied: ForumAccessDecision = {
      canReadForum: false,
      canSeeTeamPosts: false,
      canCreateRootPost: false,
      canReply: false,
      canModerateQueue: false,
      requiresModerationQueue: false,
    };

    if (!spaceAccess.canReadSpace) {
      return denied;
    }

    if (forumMembership && forumMembership.status === 'Removed') {
      return denied;
    }

    let canReadForum = false;
    if (forum.inheritsSpaceMembers) {
      if (forum.visibilityBand === 'Shared') {
        canReadForum = true;
      } else if (forum.visibilityBand === 'Team' && spaceAccess.canSeeTeamBand) {
        canReadForum = true;
      }
    }

    if (!canReadForum && forumMembership?.status === 'Active') {
      if (forum.visibilityBand !== 'Team' || spaceAccess.canSeeTeamBand) {
        canReadForum = true;
      }
    }

    if (!canReadForum) {
      return denied;
    }

    const canSeeTeamPosts = spaceAccess.canSeeTeamBand;
    const isWritableState = spaceAccess.isSpaceOpenForWrites && forum.status === 'Active';
    const isMuted = forumMembership?.status === 'Muted';

    const canConfigure = Boolean(forumMembership?.canConfigureForum);
    const canModerateQueue = Boolean(forumMembership?.canModerateQueue || canConfigure);

    if (!isWritableState || isMuted) {
      return {
        canReadForum: true,
        canSeeTeamPosts,
        canCreateRootPost: false,
        canReply: false,
        canModerateQueue,
        requiresModerationQueue: false,
      };
    }

    if (forum.postingPolicy === 'ReadOnly' && !canConfigure && !canModerateQueue) {
      return {
        canReadForum: true,
        canSeeTeamPosts,
        canCreateRootPost: false,
        canReply: false,
        canModerateQueue,
        requiresModerationQueue: false,
      };
    }

    const roleAllowsRoot = forumMembership ? forumMembership.canCreateRootPost : true;
    const roleAllowsReply = forumMembership ? forumMembership.canReply : true;

    return {
      canReadForum: true,
      canSeeTeamPosts,
      canCreateRootPost: roleAllowsRoot,
      canReply: roleAllowsReply,
      canModerateQueue,
      requiresModerationQueue: forum.postingPolicy === 'Moderated' && !canModerateQueue,
    };
  }

  /**
   * Enforces the Collaboration band ceiling on a post inside a forum:
   *  - A post inside a `Team` forum is promoted to `Team`.
   *  - An outside member (`canSeeTeamBand = false`) can never author a `Team` post.
   */
  public static ResolvePostVisibilityBand(params: {
    forumVisibilityBand: ForumVisibilityBand;
    requestedBand: CommunityVisibilityBand;
    authorCanSeeTeamBand: boolean;
  }): CommunityVisibilityBand {
    if (params.forumVisibilityBand === 'Team') {
      if (!params.authorCanSeeTeamBand) {
        throw new Error('Outside members cannot post in a Team-band forum.');
      }
      return 'Team';
    }
    if (params.requestedBand === 'Team' && !params.authorCanSeeTeamBand) {
      throw new Error('Outside members cannot create Team-band posts.');
    }
    return params.requestedBand;
  }

  /**
   * Validates a member's point wallet allocations across ideas in an `Ideation Campaign` forum
   * and computes effective votes under either `Point Allocation` or `Quadratic` (Votes = sqrt(Points)).
   */
  public static ValidateIdeaAllocations(params: {
    mode: IdeationAllocationMode;
    budgetPoints: number;
    maxPointsPerIdea?: number | null;
    voteWeightMultiplier?: number;
    allocations: ReadonlyArray<IdeaAllocationEntry>;
  }): IdeaAllocationValidationResult {
    const multiplier = params.voteWeightMultiplier ?? 1;
    let totalPointsUsed = 0;
    const effectiveVotesByIdea: Record<string, number> = {};

    for (const item of params.allocations) {
      if (!Number.isInteger(item.pointsAllocated) || item.pointsAllocated <= 0) {
        return {
          valid: false,
          totalPointsUsed,
          remainingBudgetPoints: params.budgetPoints - totalPointsUsed,
          effectiveVotesByIdea: {},
          errorMessage: `Points allocated to idea ${item.ideaPostId} must be a positive integer.`,
        };
      }

      if (params.maxPointsPerIdea != null && item.pointsAllocated > params.maxPointsPerIdea) {
        return {
          valid: false,
          totalPointsUsed,
          remainingBudgetPoints: params.budgetPoints - totalPointsUsed,
          effectiveVotesByIdea: {},
          errorMessage: `Allocation of ${item.pointsAllocated} points exceeds MaxPointsPerIdea (${params.maxPointsPerIdea}).`,
        };
      }

      totalPointsUsed += item.pointsAllocated;
      const rawVotes =
        params.mode === 'Quadratic' ? Math.sqrt(item.pointsAllocated) : item.pointsAllocated;
      effectiveVotesByIdea[item.ideaPostId] = Number((rawVotes * multiplier).toFixed(2));
    }

    if (totalPointsUsed > params.budgetPoints) {
      return {
        valid: false,
        totalPointsUsed,
        remainingBudgetPoints: params.budgetPoints - totalPointsUsed,
        effectiveVotesByIdea: {},
        errorMessage: `Total allocated points (${totalPointsUsed}) exceed campaign wallet budget (${params.budgetPoints}).`,
      };
    }

    return {
      valid: true,
      totalPointsUsed,
      remainingBudgetPoints: params.budgetPoints - totalPointsUsed,
      effectiveVotesByIdea,
    };
  }

  /**
   * Validates a single member's change to one idea's allocation (vote, revise, or fully remove) inside
   * an Ideation Campaign, refunding the member's prior spend on that SAME idea before re-checking the
   * wallet budget — so revising an allocation is never double-counted against the 100-Point Wallet.
   * `newPointsAllocated = 0` removes the allocation (a full refund).
   */
  public static ValidateIdeaAllocationChange(params: {
    mode: IdeationAllocationMode;
    budgetPoints: number;
    maxPointsPerIdea?: number | null;
    voteWeightMultiplier?: number;
    existingAllocations: ReadonlyArray<ExistingIdeaAllocation>;
    changedIdeaPostId: string;
    newPointsAllocated: number;
  }): IdeaAllocationValidationResult {
    if (!Number.isInteger(params.newPointsAllocated) || params.newPointsAllocated < 0) {
      return {
        valid: false,
        totalPointsUsed: 0,
        remainingBudgetPoints: params.budgetPoints,
        effectiveVotesByIdea: {},
        errorMessage: 'newPointsAllocated must be a non-negative integer (0 removes the allocation).',
      };
    }

    const otherAllocations = params.existingAllocations.filter(
      (a) => a.ideaPostId !== params.changedIdeaPostId,
    );
    const nextAllocations: IdeaAllocationEntry[] =
      params.newPointsAllocated > 0
        ? [...otherAllocations, { ideaPostId: params.changedIdeaPostId, pointsAllocated: params.newPointsAllocated }]
        : otherAllocations;

    return CommunityRules.ValidateIdeaAllocations({
      mode: params.mode,
      budgetPoints: params.budgetPoints,
      maxPointsPerIdea: params.maxPointsPerIdea,
      voteWeightMultiplier: params.voteWeightMultiplier,
      allocations: nextAllocations,
    });
  }

  /**
   * Enforces the Q&A single-accepted-answer invariant: only the question's author may accept or
   * unaccept an answer, and accepting one answer while a DIFFERENT answer is already accepted is
   * rejected (the caller must unaccept it first).
   */
  public static ValidateAcceptedAnswerChange(params: {
    answerPostId: string;
    settingAccepted: boolean;
    currentlyAcceptedAnswerPostId: string | null;
    isQuestionAuthor: boolean;
  }): AnswerAcceptanceDecision {
    if (!params.isQuestionAuthor) {
      return { allowed: false, reason: 'Only the question author can accept or unaccept an answer.' };
    }

    if (params.settingAccepted) {
      if (
        params.currentlyAcceptedAnswerPostId &&
        params.currentlyAcceptedAnswerPostId !== params.answerPostId
      ) {
        return {
          allowed: false,
          reason: 'Another answer is already accepted for this question; unaccept it first.',
        };
      }
      return { allowed: true };
    }

    if (params.currentlyAcceptedAnswerPostId !== params.answerPostId) {
      return { allowed: false, reason: 'This answer is not the currently accepted answer.' };
    }
    return { allowed: true };
  }

  /**
   * Enforces single- vs. multi-choice selection on a Poll/Form post response: rejects an empty or
   * duplicate selection, a multi-selection on a single-choice poll, and any option not in the poll's
   * own option set.
   */
  public static ValidatePollResponse(params: {
    allowMultipleSelections: boolean;
    availableOptionIds: ReadonlyArray<string>;
    selectedOptionIds: ReadonlyArray<string>;
  }): PollResponseDecision {
    if (params.selectedOptionIds.length === 0) {
      return { allowed: false, reason: 'At least one option must be selected.' };
    }

    const uniqueSelections = new Set(params.selectedOptionIds);
    if (uniqueSelections.size !== params.selectedOptionIds.length) {
      return { allowed: false, reason: 'Duplicate option selections are not allowed.' };
    }

    if (!params.allowMultipleSelections && uniqueSelections.size > 1) {
      return { allowed: false, reason: 'This poll allows only a single selection.' };
    }

    const availableSet = new Set(params.availableOptionIds);
    for (const id of uniqueSelections) {
      if (!availableSet.has(id)) {
        return { allowed: false, reason: `Option "${id}" is not a valid choice for this poll.` };
      }
    }

    return { allowed: true };
  }

  /**
   * Enforces an Interactive Component post's `MaxAttemptsPerMember` ceiling before a new
   * `ForumInteractiveSession` attempt is recorded.
   */
  public static ValidateInteractiveAttempt(params: {
    maxAttemptsPerMember?: number | null;
    existingSessions: ReadonlyArray<Pick<InteractiveSessionSummary, 'attemptNumber'>>;
  }): InteractiveAttemptDecision {
    const attemptCount = params.existingSessions.length;
    const nextAttemptNumber = attemptCount + 1;
    if (params.maxAttemptsPerMember != null && attemptCount >= params.maxAttemptsPerMember) {
      return {
        allowed: false,
        nextAttemptNumber,
        reason: `Maximum of ${params.maxAttemptsPerMember} attempt(s) already used.`,
      };
    }
    return { allowed: true, nextAttemptNumber };
  }

  /**
   * Resolves a member's leaderboard-worthy session for an Interactive Component post, per its
   * `ScoringMode`: highest `Score` (`Best Score`), fastest completed `DurationSeconds`
   * (`Fastest Time`), the session ending the longest unbroken run of completed attempts from
   * attempt 1 (`Streak`), the first completed attempt (`Completion`), or the most recent attempt
   * (`None`). Returns `null` when there are no sessions (or, for `Fastest Time`, none completed).
   */
  public static ResolveBestInteractiveSession(params: {
    scoringMode: InteractiveScoringMode;
    sessions: ReadonlyArray<InteractiveSessionSummary>;
  }): InteractiveSessionSummary | null {
    const { sessions } = params;
    if (sessions.length === 0) {
      return null;
    }

    switch (params.scoringMode) {
      case 'Best Score':
        return sessions.reduce((best, s) => ((s.score ?? -Infinity) > (best.score ?? -Infinity) ? s : best));

      case 'Fastest Time':
        return sessions
          .filter((s) => s.completed && s.durationSeconds != null)
          .reduce<InteractiveSessionSummary | null>(
            (best, s) => (!best || s.durationSeconds! < best.durationSeconds! ? s : best),
            null,
          );

      case 'Streak': {
        const sorted = [...sessions].sort((a, b) => a.attemptNumber - b.attemptNumber);
        let streakEnd: InteractiveSessionSummary | null = null;
        let expectedAttempt = 1;
        for (const s of sorted) {
          if (s.completed && s.attemptNumber === expectedAttempt) {
            streakEnd = s;
            expectedAttempt += 1;
          } else if (s.attemptNumber >= expectedAttempt) {
            break;
          }
        }
        return streakEnd;
      }

      case 'Completion':
        return sessions.find((s) => s.completed) ?? null;

      case 'None':
      default:
        return [...sessions].sort((a, b) => b.attemptNumber - a.attemptNumber)[0] ?? null;
    }
  }

  /**
   * Determines whether a root post's Living Thread Synthesis (`SummaryMarkdown`) should be regenerated.
   */
  public static ShouldRefreshThreadSynthesis(params: {
    replyCount: number;
    summaryReplyWatermark: number;
    initialThreshold?: number;
    deltaStep?: number;
  }): boolean {
    const threshold = params.initialThreshold ?? 4;
    const deltaStep = params.deltaStep ?? 3;
    if (params.replyCount < threshold) {
      return false;
    }
    if (params.summaryReplyWatermark === 0) {
      return true;
    }
    return params.replyCount - params.summaryReplyWatermark >= deltaStep;
  }

  /**
   * Validates whether a post of a given PostType can be placed at the requested depth in a thread.
   */
  public static ValidatePostPlacement(input: PostPlacementInput): PostPlacementDecision {
    if (input.isRootPost) {
      if (input.placementRule === 'Reply Only') {
        return {
          allowed: false,
          computedReplyDepth: 0,
          reason: 'This post type can only be used as a reply inside an existing thread.',
        };
      }
      return { allowed: true, computedReplyDepth: 0 };
    }

    if (input.placementRule === 'Root Only') {
      return {
        allowed: false,
        computedReplyDepth: 0,
        reason: 'This post type can only be created as a top-level root post.',
      };
    }

    const nextDepth = input.parentReplyDepth + 1;
    if (nextDepth > 1 && !input.allowsNestedReplies) {
      return {
        allowed: false,
        computedReplyDepth: nextDepth,
        reason: 'This post type does not allow nested replies beyond depth 1.',
      };
    }

    if (nextDepth > input.maxReplyDepth) {
      return {
        allowed: false,
        computedReplyDepth: nextDepth,
        reason: `Reply depth (${nextDepth}) exceeds the forum maximum depth (${input.maxReplyDepth}).`,
      };
    }

    return { allowed: true, computedReplyDepth: nextDepth };
  }

  /**
   * Redacts a post body for unauthenticated visitors when `AnonymousReadMode` is `'Teaser Only'` or `'None'`.
   */
  public static RedactForAnonymousEdge(params: {
    spaceVisibility: 'Private' | 'Listed' | 'Open';
    spaceAnonymousReadMode: AnonymousReadMode;
    forumAnonymousReadMode?: AnonymousReadMode | null;
    forumVisibilityBand: ForumVisibilityBand;
    postVisibilityBand: CommunityVisibilityBand;
    bodyMarkdown: string;
    teaserMaxChars?: number;
  }): { visible: boolean; isTeaser: boolean; contentMarkdown: string } {
    if (
      params.spaceVisibility !== 'Open' ||
      params.forumVisibilityBand !== 'Shared' ||
      params.postVisibilityBand !== 'Shared'
    ) {
      return { visible: false, isTeaser: false, contentMarkdown: '' };
    }

    const effectiveMode = params.forumAnonymousReadMode ?? params.spaceAnonymousReadMode;
    if (effectiveMode === 'None') {
      return { visible: false, isTeaser: false, contentMarkdown: '' };
    }

    if (effectiveMode === 'Full Read') {
      return { visible: true, isTeaser: false, contentMarkdown: params.bodyMarkdown };
    }

    const maxChars = params.teaserMaxChars ?? 280;
    const trimmed = params.bodyMarkdown.trim();
    const contentMarkdown =
      trimmed.length <= maxChars ? trimmed : `${trimmed.slice(0, maxChars).trimEnd()}…`;
    return {
      visible: true,
      isTeaser: true,
      contentMarkdown,
    };
  }
}

export const evaluateForumAccess = CommunityRules.EvaluateForumAccess;
export const resolvePostVisibilityBand = CommunityRules.ResolvePostVisibilityBand;
export const validateIdeaAllocations = CommunityRules.ValidateIdeaAllocations;
export const validateIdeaAllocationChange = CommunityRules.ValidateIdeaAllocationChange;
export const validateAcceptedAnswerChange = CommunityRules.ValidateAcceptedAnswerChange;
export const validatePollResponse = CommunityRules.ValidatePollResponse;
export const validateInteractiveAttempt = CommunityRules.ValidateInteractiveAttempt;
export const resolveBestInteractiveSession = CommunityRules.ResolveBestInteractiveSession;
export const shouldRefreshThreadSynthesis = CommunityRules.ShouldRefreshThreadSynthesis;
export const validatePostPlacement = CommunityRules.ValidatePostPlacement;
export const redactForAnonymousEdge = CommunityRules.RedactForAnonymousEdge;
