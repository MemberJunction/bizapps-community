import type { EpistemicAnswerStatus } from '@mj-biz-apps/community-core';
import type { AskFirstCitation, AskFirstDeflectionResult } from '../index.ts';

/**
 * A pre-submission search candidate: a solved Q&A answer or a Living Document, already filtered by
 * the caller to forums the requesting member can read (this module performs no permission checks).
 */
export interface AskFirstCandidate {
  postId: string;
  forumSlug: string;
  title: string;
  authorDisplayName: string;
  bodyMarkdown: string;
  epistemicStatus: EpistemicAnswerStatus | null;
}

export interface AskFirstDeflectionOptions {
  /** Below this confidence, deflection is declined and the member is sent on to post a new thread. Default 0.35. */
  minConfidence?: number;
  /** Maximum number of citations returned. Default 3. */
  maxCitations?: number;
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'to', 'of', 'in', 'on', 'for', 'and', 'or',
  'how', 'do', 'does', 'did', 'what', 'why', 'can', 'we', 'i', 'it', 'this', 'that', 'with', 'at',
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t)),
  );
}

/** Jaccard overlap between the query's tokens and a candidate's title+body tokens. */
function overlapScore(queryTokens: Set<string>, candidateTokens: Set<string>): number {
  if (queryTokens.size === 0 || candidateTokens.size === 0) {
    return 0;
  }
  let intersection = 0;
  for (const t of queryTokens) {
    if (candidateTokens.has(t)) intersection += 1;
  }
  const union = new Set([...queryTokens, ...candidateTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

const EPISTEMIC_BOOST: Record<EpistemicAnswerStatus, number> = {
  'Canon Verified': 1.25,
  'Novel Insight': 1.0,
  'Partially Outdated': 0.6,
  'Conflicts With Canon': 0.3,
};

/**
 * Deterministic keyword-overlap deflection search: no vector index or LLM call required, so it is
 * itself the graceful fallback a live vector/AI search service would otherwise extend. Scores every
 * candidate by Jaccard token overlap with `queryText`, boosted (or penalized) by `epistemicStatus`,
 * and declines to deflect (`deflected: false`, no citations) when the best match falls below
 * `minConfidence` — correctly answering "nothing good enough was found" rather than guessing.
 */
export function ComputeAskFirstDeflection(
  queryText: string,
  candidates: ReadonlyArray<AskFirstCandidate>,
  options?: AskFirstDeflectionOptions,
): AskFirstDeflectionResult {
  const minConfidence = options?.minConfidence ?? 0.35;
  const maxCitations = options?.maxCitations ?? 3;
  const queryTokens = tokenize(queryText);

  const scored = candidates
    .map((candidate) => {
      const candidateTokens = tokenize(`${candidate.title} ${candidate.bodyMarkdown}`);
      const base = overlapScore(queryTokens, candidateTokens);
      const boost = candidate.epistemicStatus ? EPISTEMIC_BOOST[candidate.epistemicStatus] : 1.0;
      return { candidate, confidenceScore: Math.min(1, base * boost) };
    })
    .filter((s) => s.confidenceScore > 0)
    .sort((a, b) => b.confidenceScore - a.confidenceScore);

  const best = scored[0];
  if (!best || best.confidenceScore < minConfidence) {
    return {
      deflected: false,
      confidenceScore: best?.confidenceScore ?? 0,
      synthesizedAnswerMarkdown: null,
      citations: [],
      suggestedPostTypeCode: 'question',
      suggestedTitle: queryText.trim().slice(0, 300),
      suggestedTagSlugs: [],
    };
  }

  const citations: AskFirstCitation[] = scored.slice(0, maxCitations).map((s) => ({
    postId: s.candidate.postId,
    forumSlug: s.candidate.forumSlug,
    title: s.candidate.title,
    authorDisplayName: s.candidate.authorDisplayName,
    epistemicStatus: s.candidate.epistemicStatus,
    confidenceScore: Number(s.confidenceScore.toFixed(3)),
  }));

  return {
    deflected: true,
    confidenceScore: Number(best.confidenceScore.toFixed(3)),
    synthesizedAnswerMarkdown: best.candidate.bodyMarkdown,
    citations,
    suggestedPostTypeCode: 'question',
    suggestedTitle: queryText.trim().slice(0, 300),
    suggestedTagSlugs: [],
  };
}
