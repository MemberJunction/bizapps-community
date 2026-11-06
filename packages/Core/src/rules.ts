/**
 * Pure domain rules for BizApps Community:
 *  1. Visibility Band Ceiling (`Shared` vs. `Team` vs. `PrivateForum`)
 *  2. Anonymous / Public Edge Read Redaction (`None`, `Teaser Only`, `Full Read`)
 *  3. Ideation Campaign Allocation Math (`Point Allocation` & `Quadratic` where Cost = Votes^2)
 *  4. Living Thread Synthesis Watermark Trigger
 *  5. Post Placement Validation (`Root Only`, `Reply Only`, `Both` + MaxReplyDepth)
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
export const shouldRefreshThreadSynthesis = CommunityRules.ShouldRefreshThreadSynthesis;
export const validatePostPlacement = CommunityRules.ValidatePostPlacement;
export const redactForAnonymousEdge = CommunityRules.RedactForAnonymousEdge;
