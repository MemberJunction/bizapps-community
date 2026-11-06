/**
 * Pure domain rules for BizApps Community:
 * 1. Low-signal acknowledgment reply detection (auto-collapse into reaction strips).
 * 2. Living Thread Synthesis trigger threshold evaluation.
 * 3. Per-member personalized digest relevance scoring.
 */

export interface PostSignalInput {
  plainText: string;
  attachmentCount: number;
}

const LOW_SIGNAL_PATTERNS: readonly RegExp[] = [
  /^\s*\+\d+\s*[!.]*\s*$/i,
  /^\s*(following|follow|subscribed|subscribing|bump)\s*[!.]*\s*$/i,
  /^\s*(thanks|thank you|thx|ty|much appreciated|great post|agreed|same here|this)\s*[!.,]*\s*$/i,
];

/**
 * Returns true when a reply is a short acknowledgment (e.g. "+1", "Following", "Thanks!")
 * with no attachments and should be collapsed into the thread's reaction strip by default.
 */
export function isLowSignalReply(input: PostSignalInput): boolean {
  if (input.attachmentCount > 0) {
    return false;
  }
  const trimmed = input.plainText.trim();
  if (!trimmed || trimmed.length > 48) {
    return false;
  }
  return LOW_SIGNAL_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export interface ThreadSynthesisTriggerInput {
  highSignalReplyCount: number;
  autoCollapseThreshold: number;
  hasAcceptedAnswer: boolean;
}

/**
 * Determines whether a thread should generate or refresh its Living Thread Synthesis (`AISummary`).
 */
export function shouldSynthesizeThread(input: ThreadSynthesisTriggerInput): boolean {
  const threshold = Math.max(2, input.autoCollapseThreshold);
  return input.hasAcceptedAnswer || input.highSignalReplyCount >= threshold;
}

export interface DigestScoreInput {
  /** Cosine similarity in [0, 1] between member interest tags and thread tags. */
  tagSimilarity: number;
  /** Peer/space affinity score in [0, 1]. */
  peerAffinity: number;
  /** Normalized recent activity velocity in [0, 1]. */
  velocity: number;
  /** Unanswered question match to member's expertise in [0, 1]. */
  unansweredExpertiseMatch: number;
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));

/**
 * Computes the personalized digest relevance score in [0, 1] for a member and a candidate thread.
 */
export function computeDigestRelevanceScore(input: DigestScoreInput): number {
  const score =
    0.4 * clamp01(input.tagSimilarity) +
    0.25 * clamp01(input.peerAffinity) +
    0.2 * clamp01(input.velocity) +
    0.15 * clamp01(input.unansweredExpertiseMatch);
  return Math.round(score * 10000) / 10000;
}
