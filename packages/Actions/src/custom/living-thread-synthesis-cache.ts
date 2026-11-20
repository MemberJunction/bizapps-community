import { createHash } from 'node:crypto';
import type { ThreadContributorCitation, ThreadPostForSynthesis } from './living-thread-synthesis.ts';

export const COMMUNITY_LIVING_SYNTHESIS_PROMPT_NAME = 'Community: Living Thread Synthesis';
export const COMMUNITY_LIVING_SYNTHESIS_PROMPT_CATEGORY = 'Community';

const CACHE_MARKER_PREFIX = '<!-- mjc-synthesis-cache:';
const CACHE_MARKER_SUFFIX = ' -->';

export interface ThreadSynthesisCacheMetadata {
  fingerprint: string;
  keyTakeaways: string[];
  openQuestions: string[];
  contributorCitations: ThreadContributorCitation[];
  consideredReplyCount: number;
  modelUsed: string;
}

export interface LLMLivingThreadSynthesisResponse {
  executiveSummary?: string | null;
  keyTakeaways?: ReadonlyArray<string> | null;
  openQuestions?: ReadonlyArray<string> | null;
}

/**
 * Computes a deterministic content fingerprint across the root post title/body and all ordered
 * replies (including accepted/verified state). Any added, deleted, or edited post or reply
 * changes the fingerprint and cleanly invalidates the cached summary.
 */
export function ComputeThreadContentFingerprint(params: {
  rootTitle: string | null;
  rootBodyMarkdown: string;
  replies: ReadonlyArray<ThreadPostForSynthesis>;
}): string {
  const hash = createHash('sha256');
  hash.update((params.rootTitle ?? '').trim());
  hash.update('\u0000');
  hash.update((params.rootBodyMarkdown ?? '').trim());
  hash.update('\u0000');
  hash.update(String(params.replies.length));
  for (const reply of params.replies) {
    hash.update('\u0001');
    hash.update(reply.postId ?? '');
    hash.update('\u0002');
    hash.update(reply.authorDisplayName.trim());
    hash.update('\u0002');
    hash.update(reply.bodyMarkdown.trim());
    hash.update('\u0002');
    hash.update(reply.isAccepted ? '1' : '0');
    hash.update(reply.isVerified ? '1' : '0');
    hash.update(reply.epistemicStatus ?? '');
  }
  return hash.digest('hex').slice(0, 16);
}

/** Strips any embedded `<!-- mjc-synthesis-cache:... -->` footer from persisted SummaryMarkdown. */
export function StripSynthesisCacheMetadata(summaryMarkdown: string | null | undefined): string {
  if (!summaryMarkdown) return '';
  const idx = summaryMarkdown.indexOf(CACHE_MARKER_PREFIX);
  if (idx < 0) return summaryMarkdown.trim();
  return summaryMarkdown.slice(0, idx).trim();
}

/** Embeds structured cache metadata as a trailing HTML comment on `ForumPost.SummaryMarkdown`. */
export function EmbedSynthesisCacheMetadata(
  summaryMarkdown: string,
  metadata: ThreadSynthesisCacheMetadata,
): string {
  const cleanSummary = StripSynthesisCacheMetadata(summaryMarkdown);
  const safeJson = JSON.stringify(metadata).replace(/-->/g, '--\\u003e');
  return `${cleanSummary}\n\n${CACHE_MARKER_PREFIX}${safeJson}${CACHE_MARKER_SUFFIX}`;
}

function isStringArray(value: ReadonlyArray<string> | null | undefined): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** Extracts cached synthesis metadata from `ForumPost.SummaryMarkdown` if present and well-formed. */
export function ExtractSynthesisCacheMetadata(
  summaryMarkdown: string | null | undefined,
): { cleanSummary: string; metadata: ThreadSynthesisCacheMetadata } | null {
  if (!summaryMarkdown) return null;
  const startIdx = summaryMarkdown.indexOf(CACHE_MARKER_PREFIX);
  if (startIdx < 0) return null;
  const jsonStart = startIdx + CACHE_MARKER_PREFIX.length;
  const endIdx = summaryMarkdown.indexOf(CACHE_MARKER_SUFFIX, jsonStart);
  if (endIdx < 0) return null;

  try {
    const parsed = JSON.parse(summaryMarkdown.slice(jsonStart, endIdx)) as Partial<ThreadSynthesisCacheMetadata> | null;
    if (!parsed || typeof parsed.fingerprint !== 'string' || !parsed.fingerprint.trim()) {
      return null;
    }
    const cleanSummary = summaryMarkdown.slice(0, startIdx).trim();
    if (!cleanSummary) return null;

    const citations: ThreadContributorCitation[] = Array.isArray(parsed.contributorCitations)
      ? parsed.contributorCitations
          .filter(
            (c): c is ThreadContributorCitation =>
              Boolean(c) &&
              typeof c.citationIndex === 'number' &&
              typeof c.authorDisplayName === 'string' &&
              typeof c.roleLabel === 'string',
          )
          .map((c) => ({
            citationIndex: c.citationIndex,
            authorDisplayName: c.authorDisplayName,
            postId: typeof c.postId === 'string' ? c.postId : null,
            roleLabel: c.roleLabel,
          }))
      : [];

    return {
      cleanSummary,
      metadata: {
        fingerprint: parsed.fingerprint.trim(),
        keyTakeaways: isStringArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
        openQuestions: isStringArray(parsed.openQuestions) ? parsed.openQuestions : [],
        contributorCitations: citations,
        consideredReplyCount:
          typeof parsed.consideredReplyCount === 'number' && Number.isFinite(parsed.consideredReplyCount)
            ? parsed.consideredReplyCount
            : citations.length,
        modelUsed: typeof parsed.modelUsed === 'string' && parsed.modelUsed.trim() ? parsed.modelUsed.trim() : 'AI Prompt',
      },
    };
  } catch {
    return null;
  }
}

/**
 * Builds deterministic contributor citations `[1..N]` from the considered replies so LLM prompt
 * outputs always map cleanly to real database PostIDs and verified/accepted author roles.
 */
export function BuildContributorCitationsForPrompt(
  replies: ReadonlyArray<ThreadPostForSynthesis>,
): ThreadContributorCitation[] {
  return replies.map((reply, idx) => {
    const isCanon = Boolean(reply.isVerified || reply.epistemicStatus === 'Canon Verified');
    const roleLabel = reply.isAccepted
      ? isCanon
        ? 'Accepted & Canon Verified'
        : 'Accepted Answer'
      : isCanon
        ? 'Canon Verified'
        : 'Contributor';
    return {
      citationIndex: idx + 1,
      authorDisplayName: reply.authorDisplayName,
      postId: reply.postId ?? null,
      roleLabel,
    };
  });
}

/** Normalizes structured JSON returned by the AI Prompt into clean markdown + arrays. */
export function NormalizeLLMSynthesisOutput(params: {
  raw: LLMLivingThreadSynthesisResponse | null | undefined;
  contributorCitations: ReadonlyArray<ThreadContributorCitation>;
}): {
  executiveSummary: string;
  keyTakeaways: string[];
  openQuestions: string[];
} | null {
  const summaryText = typeof params.raw?.executiveSummary === 'string' ? params.raw.executiveSummary.trim() : '';
  if (!summaryText) return null;

  const keyTakeaways = Array.isArray(params.raw?.keyTakeaways)
    ? params.raw.keyTakeaways
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim())
        .slice(0, 6)
    : [];

  const openQuestions = Array.isArray(params.raw?.openQuestions)
    ? params.raw.openQuestions
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim())
        .slice(0, 5)
    : [];

  return {
    executiveSummary: summaryText,
    keyTakeaways,
    openQuestions,
  };
}
