/**
 * Pure domain rules for BizApps Community:
 *  1. Low-signal noise collapsing ("+1", "Thanks!", etc.)
 *  2. Thread promotion candidate scoring (when to suggest spinning up a Working Space)
 *  3. Two-band (Shared vs Team) & Anonymous Access (None | TeaserOnly | FullRead) enforcement
 *  4. Stack Overflow + AI Epistemic Answer Ranking (Human votes + Expert weight + AI Rubric Grade)
 *  5. Participatory Point Allocation & Quadratic Voting (100-point wallets & sqrt(points) effective votes)
 */

export type CollaborationBand = 'Shared' | 'Team';
export type AnonymousAccessMode = 'None' | 'TeaserOnly' | 'FullRead';
export type CategoryAnonymousOverride = 'Inherit' | AnonymousAccessMode;
export type AICanonStatus =
  | 'Unchecked'
  | 'CanonVerified'
  | 'NovelInsight'
  | 'PartiallyOutdated'
  | 'ConflictsWithCanon';
export type IdeationVotingMechanism = 'PointAllocation' | 'Quadratic' | 'Approval';

const LOW_SIGNAL_PATTERNS: readonly RegExp[] = [
  /^\s*\+1\s*!*$/i,
  /^\s*(thanks|thank you|thx|ty)\s*[!.]*$/i,
  /^\s*(following|subscribed|bump|agreed|me too|same here)\s*[!.]*$/i,
];

/**
 * Determines whether a reply is low-signal conversational noise (e.g., "+1", "Thanks!", "Following")
 * that should be auto-collapsed into a reaction pill in the Collapsed Feed.
 */
export function isLowSignalReply(markdownBody: string): boolean {
  const trimmed = markdownBody.trim();
  if (!trimmed || trimmed.length > 48) {
    return false;
  }
  return LOW_SIGNAL_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export interface ThreadPromotionSignalInput {
  replyCount: number;
  distinctParticipantCount: number;
  attachmentCount: number;
  alreadyPromoted: boolean;
}

/**
 * Determines whether a forum thread has crossed the velocity threshold where the UI
 * and AI facilitator should suggest spinning up a dedicated BizApps Collaboration Working Space.
 */
export function shouldSuggestWorkingSpacePromotion(input: ThreadPromotionSignalInput): boolean {
  if (input.alreadyPromoted) {
    return false;
  }
  return (
    (input.replyCount >= 8 && input.distinctParticipantCount >= 4) ||
    (input.replyCount >= 5 && input.attachmentCount >= 2 && input.distinctParticipantCount >= 3)
  );
}

/**
 * Enforces the BizApps Collaboration two-band visibility boundary (`Shared` vs `Team`)
 * when assembling posts for feed rendering or AI synthesis.
 */
export function canReadCommunityBand(band: CollaborationBand, canSeeTeamBand: boolean): boolean {
  if (band === 'Shared') {
    return true;
  }
  return canSeeTeamBand;
}

/**
 * Resolves the effective anonymous access mode for a ForumCategory given its Space default,
 * category override, and band (`Team` band is NEVER readable anonymously).
 */
export function resolveEffectiveAnonymousAccess(
  spaceMode: AnonymousAccessMode,
  categoryOverride: CategoryAnonymousOverride,
  categoryBand: CollaborationBand,
): AnonymousAccessMode {
  if (categoryBand === 'Team') {
    return 'None';
  }
  return categoryOverride === 'Inherit' ? spaceMode : categoryOverride;
}

export interface AnonymousReadablePost {
  id: string;
  band: CollaborationBand;
  isRootPost?: boolean;
  isAcceptedAnswer?: boolean;
  aiCanonStatus?: AICanonStatus;
}

export interface AnonymousThreadViewResult<T extends AnonymousReadablePost> {
  allowed: boolean;
  effectiveMode: AnonymousAccessMode;
  visiblePosts: T[];
  hiddenPostCount: number;
  requiresLoginForMore: boolean;
}

/**
 * Filters and truncates a thread's posts for an anonymous visitor on the public edge.
 * - `Team` band posts are stripped unconditionally.
 * - `None` returns `allowed: false` and zero posts.
 * - `TeaserOnly` keeps the root post, any Accepted or AI-CanonVerified answer, and up to
 *   `teaserReplyLimit` additional Shared replies, flagging `requiresLoginForMore: true` if truncated.
 * - `FullRead` returns all Shared-band posts.
 */
export function filterPostsForAnonymousReader<T extends AnonymousReadablePost>(
  posts: readonly T[],
  effectiveMode: AnonymousAccessMode,
  teaserReplyLimit = 3,
): AnonymousThreadViewResult<T> {
  if (effectiveMode === 'None') {
    return {
      allowed: false,
      effectiveMode,
      visiblePosts: [],
      hiddenPostCount: posts.length,
      requiresLoginForMore: true,
    };
  }

  const sharedPosts = posts.filter((p) => p.band === 'Shared');

  if (effectiveMode === 'FullRead') {
    return {
      allowed: true,
      effectiveMode,
      visiblePosts: sharedPosts,
      hiddenPostCount: 0,
      requiresLoginForMore: false,
    };
  }

  // TeaserOnly mode: keep root post + accepted/AI-verified answers + up to teaserReplyLimit standard replies
  const visiblePosts: T[] = [];
  let standardRepliesIncluded = 0;

  for (const post of sharedPosts) {
    const isPriorityPost =
      Boolean(post.isRootPost) ||
      Boolean(post.isAcceptedAnswer) ||
      post.aiCanonStatus === 'CanonVerified';

    if (isPriorityPost) {
      visiblePosts.push(post);
    } else if (standardRepliesIncluded < Math.max(0, teaserReplyLimit)) {
      visiblePosts.push(post);
      standardRepliesIncluded += 1;
    }
  }

  const hiddenPostCount = Math.max(0, sharedPosts.length - visiblePosts.length);
  return {
    allowed: true,
    effectiveMode,
    visiblePosts,
    hiddenPostCount,
    requiresLoginForMore: hiddenPostCount > 0,
  };
}

export interface AnswerRankingInput {
  netVoteScore: number;
  expertWeightedScore: number;
  isAcceptedAnswer: boolean;
  aiCanonStatus: AICanonStatus;
  /** 0 to 100 composite quality/completeness grade from AI rubric */
  aiGradeScore: number | null;
  isSuperseded: boolean;
}

/**
 * Computes the composite "Best Now" sort rank for a Q&A answer by combining:
 *  - Asker acceptance bonus
 *  - Human net upvotes/downvotes + verified domain-expert weighted votes
 *  - AI Epistemic Rubric grade & Canon verification status
 *  - Penalty when an older high-vote answer has been flagged as outdated/superseded
 */
export function computeCompositeAnswerRank(input: AnswerRankingInput): number {
  let score = input.netVoteScore * 2 + input.expertWeightedScore * 3;

  if (input.isAcceptedAnswer) {
    score += 40;
  }

  if (input.aiGradeScore !== null) {
    score += (input.aiGradeScore / 100) * 25;
  }

  switch (input.aiCanonStatus) {
    case 'CanonVerified':
      score += 30;
      break;
    case 'NovelInsight':
      score += 15;
      break;
    case 'PartiallyOutdated':
      score -= 25;
      break;
    case 'ConflictsWithCanon':
      score -= 45;
      break;
    case 'Unchecked':
    default:
      break;
  }

  if (input.isSuperseded) {
    score -= 50;
  }

  return Number(score.toFixed(2));
}

/**
 * Computes effective votes from points spent in a `ForumIdeaCampaign`.
 * - In `PointAllocation` mode: 1 point = 1 effective vote.
 * - In `Quadratic` mode: Cost = Votes^2, so EffectiveVotes = sqrt(pointsSpent).
 * - In `Approval` mode: Any positive point allocation = 1 effective vote.
 */
export function computeEffectiveIdeaVotes(
  pointsSpent: number,
  mechanism: IdeationVotingMechanism,
): number {
  if (pointsSpent <= 0) {
    return 0;
  }
  switch (mechanism) {
    case 'Quadratic':
      return Number(Math.sqrt(pointsSpent).toFixed(4));
    case 'Approval':
      return 1;
    case 'PointAllocation':
    default:
      return pointsSpent;
  }
}

export interface IdeaAllocationValidationInput {
  initialBudget: number;
  pointsRefunded: number;
  currentOtherAllocationsTotal: number;
  requestedPointsForIdea: number;
  maxPointsPerIdea?: number | null;
}

export interface IdeaAllocationValidationResult {
  valid: boolean;
  remainingPointsAfter: number;
  errorCode?: 'NON_POSITIVE_POINTS' | 'EXCEEDS_MAX_PER_IDEA' | 'EXCEEDS_WALLET_BUDGET';
}

/**
 * Validates whether a member can allocate `requestedPointsForIdea` from their `ForumIdeaWallet`.
 */
export function validateIdeaPointAllocation(
  input: IdeaAllocationValidationInput,
): IdeaAllocationValidationResult {
  const totalAvailableBudget = input.initialBudget + input.pointsRefunded;

  if (input.requestedPointsForIdea <= 0) {
    return {
      valid: false,
      remainingPointsAfter: totalAvailableBudget - input.currentOtherAllocationsTotal,
      errorCode: 'NON_POSITIVE_POINTS',
    };
  }

  if (
    input.maxPointsPerIdea != null &&
    input.requestedPointsForIdea > input.maxPointsPerIdea
  ) {
    return {
      valid: false,
      remainingPointsAfter: totalAvailableBudget - input.currentOtherAllocationsTotal,
      errorCode: 'EXCEEDS_MAX_PER_IDEA',
    };
  }

  const newTotalAllocated = input.currentOtherAllocationsTotal + input.requestedPointsForIdea;
  const remainingPointsAfter = totalAvailableBudget - newTotalAllocated;

  if (remainingPointsAfter < 0) {
    return {
      valid: false,
      remainingPointsAfter,
      errorCode: 'EXCEEDS_WALLET_BUDGET',
    };
  }

  return {
    valid: true,
    remainingPointsAfter,
  };
}
