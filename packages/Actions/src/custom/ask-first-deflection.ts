import {
  CommunityEmbeddingPersonalizationService,
  CosineSimilarity,
  NormalizeVector,
  type EpistemicAnswerStatus,
} from '@mj-biz-apps/community-core';
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
  topicTags?: ReadonlyArray<string>;
  isAcceptedByAuthor?: boolean;
  isVerifiedByModerator?: boolean;
  precomputedEmbedding?: ReadonlyArray<number> | null;
}

export interface AskFirstDeflectionOptions {
  /** Below this confidence, deflection is declined and the member is sent on to post a new thread. Default 0.35. */
  minConfidence?: number;
  /** Maximum number of citations returned. Default 3. */
  maxCitations?: number;
  /** Maximum candidate posts scanned to bound embedding compute cost. Default 200. */
  maxCandidateScan?: number;
  /** Weight given to semantic embedding cosine similarity in hybrid fusion. Default 0.65. */
  semanticWeight?: number;
  /** Weight given to lexical/tag overlap in hybrid fusion. Default 0.35. */
  lexicalWeight?: number;
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'to', 'of', 'in', 'on', 'for', 'and', 'or',
  'how', 'do', 'does', 'did', 'what', 'why', 'can', 'we', 'i', 'it', 'this', 'that', 'with', 'at',
  'my', 'our', 'your', 'from', 'by', 'should', 'would', 'could',
]);

function stemToken(token: string): string {
  if (token.length > 5 && token.endsWith('ing')) return token.slice(0, -3);
  if (token.length > 4 && token.endsWith('ied')) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && token.endsWith('ed')) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith('es')) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

function tokenize(text: string): Set<string> {
  const tokens = new Set<string>();
  for (const raw of text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)) {
    if (raw.length > 1 && !STOP_WORDS.has(raw)) {
      tokens.add(raw);
      tokens.add(stemToken(raw));
    }
  }
  return tokens;
}

/** Hybrid lexical + tag overlap between query tokens and candidate title/body/tags. */
function computeLexicalAndTagScore(
  queryTokens: Set<string>,
  candidate: Pick<AskFirstCandidate, 'title' | 'bodyMarkdown' | 'topicTags'>,
): number {
  if (queryTokens.size === 0) {
    return 0;
  }
  const tagText = (candidate.topicTags ?? []).join(' ');
  const candidateTokens = tokenize(`${candidate.title} ${candidate.bodyMarkdown} ${tagText}`);
  if (candidateTokens.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of queryTokens) {
    if (candidateTokens.has(token)) {
      intersection += 1;
    }
  }
  if (intersection === 0) {
    return 0;
  }

  const unionSize = new Set([...queryTokens, ...candidateTokens]).size;
  const jaccard = unionSize === 0 ? 0 : intersection / unionSize;
  const queryContainment = intersection / queryTokens.size;

  const tagTokens = tokenize(tagText);
  let tagMatches = 0;
  for (const token of tagTokens) {
    if (queryTokens.has(token)) {
      tagMatches += 1;
    }
  }
  const tagBonus = tagTokens.size > 0 ? (tagMatches / tagTokens.size) * 0.2 : 0;

  return Math.min(1, 0.55 * jaccard + 0.45 * queryContainment + tagBonus);
}

/**
 * Epistemic canon boost strictly ordering Verified > Accepted > Unverified:
 * - Moderator-verified or `Canon Verified` (+ accepted): 1.35 / 1.30
 * - Author-accepted (`isAcceptedByAuthor`): 1.15
 * - `Novel Insight`: 1.05
 * - Unverified (`null`): 1.00
 * - `Partially Outdated`: 0.65
 * - `Conflicts With Canon`: 0.30
 */
export function ComputeEpistemicCanonBoost(
  candidate: Pick<AskFirstCandidate, 'epistemicStatus' | 'isAcceptedByAuthor' | 'isVerifiedByModerator'>,
): number {
  const isCanonVerified = candidate.isVerifiedByModerator === true || candidate.epistemicStatus === 'Canon Verified';
  if (isCanonVerified) {
    return candidate.isAcceptedByAuthor ? 1.35 : 1.3;
  }
  if (candidate.isAcceptedByAuthor) {
    return 1.15;
  }
  switch (candidate.epistemicStatus) {
    case 'Novel Insight':
      return 1.05;
    case 'Partially Outdated':
      return 0.65;
    case 'Conflicts With Canon':
      return 0.3;
    default:
      return 1.0;
  }
}

interface ScoredAskFirstCandidate {
  candidate: AskFirstCandidate;
  confidenceScore: number;
  semanticSimilarity: number;
  lexicalOverlap: number;
  canonBoost: number;
}

function buildDeflectionResult(
  queryText: string,
  scored: ScoredAskFirstCandidate[],
  minConfidence: number,
  maxCitations: number,
): AskFirstDeflectionResult {
  const best = scored[0];
  if (!best || best.confidenceScore < minConfidence) {
    return {
      deflected: false,
      confidenceScore: Number((best?.confidenceScore ?? 0).toFixed(3)),
      synthesizedAnswerMarkdown: null,
      citations: [],
      suggestedPostTypeCode: 'question',
      suggestedTitle: queryText.trim().slice(0, 300),
      suggestedTagSlugs: [],
    };
  }

  const topMatches = scored.slice(0, maxCitations);
  const citations: AskFirstCitation[] = topMatches.map((s) => ({
    postId: s.candidate.postId,
    forumSlug: s.candidate.forumSlug,
    title: s.candidate.title,
    authorDisplayName: s.candidate.authorDisplayName,
    epistemicStatus: s.candidate.epistemicStatus,
    confidenceScore: Number(s.confidenceScore.toFixed(3)),
    semanticSimilarity: Number(s.semanticSimilarity.toFixed(3)),
    lexicalOverlap: Number(s.lexicalOverlap.toFixed(3)),
    isAccepted: Boolean(s.candidate.isAcceptedByAuthor),
    isVerified: Boolean(s.candidate.isVerifiedByModerator || s.candidate.epistemicStatus === 'Canon Verified'),
  }));

  const suggestedTagSlugs: string[] = [];
  for (const match of topMatches) {
    for (const tag of match.candidate.topicTags ?? []) {
      const slug = tag
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      if (slug && !suggestedTagSlugs.includes(slug) && suggestedTagSlugs.length < 5) {
        suggestedTagSlugs.push(slug);
      }
    }
  }

  return {
    deflected: true,
    confidenceScore: Number(best.confidenceScore.toFixed(3)),
    synthesizedAnswerMarkdown: best.candidate.bodyMarkdown,
    citations,
    suggestedPostTypeCode: 'question',
    suggestedTitle: queryText.trim().slice(0, 300),
    suggestedTagSlugs,
  };
}

/**
 * Synchronous deterministic keyword/tag-overlap deflection search with epistemic canon boosts.
 * Serves as a zero-async fallback for synchronous callers and unit checks.
 */
export function ComputeAskFirstDeflection(
  queryText: string,
  candidates: ReadonlyArray<AskFirstCandidate>,
  options?: AskFirstDeflectionOptions,
): AskFirstDeflectionResult {
  const minConfidence = options?.minConfidence ?? 0.35;
  const maxCitations = Math.max(1, options?.maxCitations ?? 3);
  const maxScan = Math.max(1, Math.min(500, Math.floor(options?.maxCandidateScan ?? 200)));
  const queryTokens = tokenize(queryText);

  const scored: ScoredAskFirstCandidate[] = candidates
    .slice(0, maxScan)
    .map((candidate) => {
      const lexicalOverlap = computeLexicalAndTagScore(queryTokens, candidate);
      const canonBoost = ComputeEpistemicCanonBoost(candidate);
      const confidenceScore = Math.min(1, lexicalOverlap * canonBoost);
      return {
        candidate,
        confidenceScore,
        semanticSimilarity: 0,
        lexicalOverlap,
        canonBoost,
      };
    })
    .filter((s) => s.confidenceScore > 0)
    .sort((a, b) => b.confidenceScore - a.confidenceScore || b.canonBoost - a.canonBoost);

  return buildDeflectionResult(queryText, scored, minConfidence, maxCitations);
}

/**
 * Hybrid semantic + lexical Ask-First deflection search powered by
 * {@link CommunityEmbeddingPersonalizationService}. Fuses embedding cosine similarity with
 * lexical/tag overlap and applies epistemic canon boosts (`Verified > Accepted > Unverified`)
 * so paraphrased questions deflect accurately to cited canonical answers.
 */
export async function ComputeSemanticAskFirstDeflection(
  queryText: string,
  candidates: ReadonlyArray<AskFirstCandidate>,
  options?: AskFirstDeflectionOptions,
): Promise<AskFirstDeflectionResult> {
  const trimmedQuery = queryText.trim();
  if (!trimmedQuery || candidates.length === 0) {
    return buildDeflectionResult(queryText, [], options?.minConfidence ?? 0.35, options?.maxCitations ?? 3);
  }

  const minConfidence = options?.minConfidence ?? 0.35;
  const maxCitations = Math.max(1, options?.maxCitations ?? 3);
  const maxScan = Math.max(1, Math.min(500, Math.floor(options?.maxCandidateScan ?? 200)));
  const rawSemWeight = options?.semanticWeight ?? 0.65;
  const rawLexWeight = options?.lexicalWeight ?? 0.35;
  const weightSum = rawSemWeight + rawLexWeight;
  const semanticWeight = weightSum > 0 ? rawSemWeight / weightSum : 0.65;
  const lexicalWeight = weightSum > 0 ? rawLexWeight / weightSum : 0.35;

  const personalization = CommunityEmbeddingPersonalizationService.Instance;
  const queryTokens = tokenize(trimmedQuery);
  const rawQueryVector = await personalization.GetEmbeddingProvider().EmbedText(trimmedQuery);
  const queryVector = NormalizeVector(rawQueryVector);
  const hasQueryVectorSignal = queryVector.some((v) => Math.abs(v) > 1e-9);

  const scored: ScoredAskFirstCandidate[] = [];
  for (const candidate of candidates.slice(0, maxScan)) {
    const lexicalOverlap = computeLexicalAndTagScore(queryTokens, candidate);
    let semanticSimilarity = 0;
    if (hasQueryVectorSignal) {
      const candidateVector =
        candidate.precomputedEmbedding && candidate.precomputedEmbedding.length > 0
          ? NormalizeVector(candidate.precomputedEmbedding)
          : await personalization.ComputePostEmbedding({
              postId: candidate.postId,
              title: candidate.title,
              bodyMarkdown: candidate.bodyMarkdown,
              topicTags: candidate.topicTags,
              forumName: candidate.forumSlug,
            });
      semanticSimilarity = Math.max(0, CosineSimilarity(queryVector, candidateVector));
    }

    const fusedBase =
      hasQueryVectorSignal && semanticSimilarity > 0
        ? semanticWeight * semanticSimilarity + lexicalWeight * lexicalOverlap
        : lexicalOverlap;
    const canonBoost = ComputeEpistemicCanonBoost(candidate);
    const confidenceScore = Math.min(1, fusedBase * canonBoost);

    if (confidenceScore > 0) {
      scored.push({
        candidate,
        confidenceScore,
        semanticSimilarity,
        lexicalOverlap,
        canonBoost,
      });
    }
  }

  scored.sort((a, b) => b.confidenceScore - a.confidenceScore || b.canonBoost - a.canonBoost);
  return buildDeflectionResult(trimmedQuery, scored, minConfidence, maxCitations);
}
