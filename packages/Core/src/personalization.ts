import { BaseSingleton } from '@memberjunction/global';
import type { EpistemicAnswerStatus } from './rules.ts';

/**
 * Pluggable embedding provider contract for BizApps Community personalization and search.
 * Runtime hosts can plug in MJ AI embedding models (e.g., via AIEngine), while offline/CI/test
 * environments use {@link DeterministicSemanticEmbeddingProvider} with zero external API keys.
 */
export interface ICommunityEmbeddingProvider {
  readonly Name: string;
  readonly Dimensions: number;
  EmbedText(text: string): Promise<number[]>;
  EmbedBatch(texts: ReadonlyArray<string>): Promise<number[][]>;
}

/**
 * Wraps an arbitrary async embedding callback (such as MJ `AIEngine` embedding model execution)
 * into a normalized {@link ICommunityEmbeddingProvider}.
 */
export class CallbackCommunityEmbeddingProvider implements ICommunityEmbeddingProvider {
  public readonly Name: string;
  public readonly Dimensions: number;
  private readonly _embedFn: (text: string) => Promise<number[]>;

  public constructor(name: string, dimensions: number, embedFn: (text: string) => Promise<number[]>) {
    if (!name.trim()) {
      throw new Error('Embedding provider name is required.');
    }
    if (!Number.isFinite(dimensions) || dimensions <= 0) {
      throw new Error('Embedding provider dimensions must be a positive number.');
    }
    this.Name = name.trim();
    this.Dimensions = Math.floor(dimensions);
    this._embedFn = embedFn;
  }

  public async EmbedText(text: string): Promise<number[]> {
    const raw = await this._embedFn(text);
    return NormalizeVector(raw);
  }

  public async EmbedBatch(texts: ReadonlyArray<string>): Promise<number[][]> {
    const out: number[][] = [];
    for (const text of texts) {
      out.push(await this.EmbedText(text));
    }
    return out;
  }
}

const STOP_WORDS = new Set<string>([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'being', 'by', 'can', 'could', 'did',
  'do', 'does', 'for', 'from', 'had', 'has', 'have', 'he', 'her', 'here', 'hers', 'him',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'just', 'may', 'me', 'might',
  'more', 'most', 'my', 'no', 'not', 'now', 'of', 'on', 'one', 'or', 'our', 'out', 'over',
  'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'them', 'then',
  'there', 'these', 'they', 'this', 'those', 'to', 'too', 'up', 'us', 'very', 'was', 'we',
  'were', 'what', 'when', 'where', 'which', 'who', 'why', 'will', 'with', 'would', 'you',
  'your',
]);

/**
 * Shared semantic concept clusters for the zero-key deterministic embedding provider.
 * Each cluster maps topically related vocabulary onto shared concept axes so synonyms and
 * domain-adjacent terms exhibit genuine semantic cosine similarity even without a live LLM.
 */
const SEMANTIC_CONCEPT_CLUSTERS: ReadonlyArray<ReadonlyArray<string>> = [
  ['tax', 'taxes', 'taxation', 'nexus', 'wayfair', 'filing', 'compliance', 'audit', 'irs', 'jurisdiction', 'deduction', 'exemption', 'statute', 'vat', 'payroll', 'state'],
  ['graphql', 'api', 'apis', 'endpoint', 'endpoints', 'schema', 'resolver', 'resolvers', 'mutation', 'mutations', 'query', 'queries', 'webhook', 'webhooks', 'rest', 'sdk', 'json'],
  ['governance', 'board', 'bylaw', 'bylaws', 'charter', 'license', 'licensing', 'policy', 'policies', 'ethics', 'regulation', 'regulatory', 'fiduciary', 'committee', 'quorum'],
  ['security', 'auth', 'authentication', 'authorization', 'oauth', 'oidc', 'sso', 'saml', 'rbac', 'token', 'tokens', 'hmac', 'encryption', 'credential', 'credentials', 'mfa'],
  ['analytics', 'metric', 'metrics', 'kpi', 'kpis', 'dashboard', 'dashboards', 'report', 'reporting', 'telemetry', 'benchmark', 'cohort', 'retention', 'forecast'],
  ['member', 'members', 'membership', 'onboarding', 'engagement', 'chapter', 'chapters', 'renewal', 'dues', 'directory', 'community', 'digest', 'newsletter'],
  ['ai', 'llm', 'embedding', 'embeddings', 'vector', 'vectors', 'semantic', 'cosine', 'synthesis', 'epistemic', 'agent', 'agents', 'rag', 'citation', 'citations'],
  ['finance', 'budget', 'revenue', 'invoice', 'invoices', 'billing', 'payment', 'payments', 'pricing', 'treasury', 'ledger', 'expense', 'expenses'],
  ['cloud', 'infrastructure', 'deployment', 'ci', 'pipeline', 'docker', 'kubernetes', 'latency', 'caching', 'database', 'sql', 'migration', 'postgres'],
  ['product', 'roadmap', 'ideation', 'feature', 'features', 'release', 'workflow', 'workflows', 'ux', 'design', 'accessibility', 'wcag', 'feedback'],
];

const CONCEPT_AXIS_COUNT = SEMANTIC_CONCEPT_CLUSTERS.length; // 10 axes (2 dims each = 20 dims)
const HASH_AXIS_OFFSET = 24;
const DEFAULT_EMBEDDING_DIMENSIONS = 128;

const CONCEPT_TERM_INDEX: ReadonlyMap<string, ReadonlyArray<number>> = (() => {
  const index = new Map<string, number[]>();
  SEMANTIC_CONCEPT_CLUSTERS.forEach((terms, clusterIdx) => {
    for (const term of terms) {
      const existing = index.get(term) ?? [];
      existing.push(clusterIdx);
      index.set(term, existing);
    }
  });
  return index;
})();

function fnv1aHash(value: string, seed: number): number {
  let hash = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

function tokenizeForEmbedding(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function stemToken(token: string): string {
  if (token.length > 5 && token.endsWith('ing')) return token.slice(0, -3);
  if (token.length > 4 && token.endsWith('ied')) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && token.endsWith('ed')) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith('es')) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

/**
 * Deterministic, fast, zero-API-key semantic embedding provider.
 * Combines curated concept cluster projections, stemmed token hashing, and character trigram
 * hashing into an L2-normalized vector so topically related posts cluster together cleanly in
 * unit tests, CI, and offline environments.
 */
export class DeterministicSemanticEmbeddingProvider implements ICommunityEmbeddingProvider {
  public readonly Name = 'DeterministicSemanticEmbeddingProvider';
  public readonly Dimensions: number;

  public constructor(dimensions: number = DEFAULT_EMBEDDING_DIMENSIONS) {
    if (!Number.isFinite(dimensions) || dimensions < 32) {
      throw new Error('DeterministicSemanticEmbeddingProvider dimensions must be at least 32.');
    }
    this.Dimensions = Math.floor(dimensions);
  }

  public async EmbedText(text: string): Promise<number[]> {
    const vector = new Array<number>(this.Dimensions).fill(0);
    const tokens = tokenizeForEmbedding(text);
    if (tokens.length === 0) {
      return vector;
    }

    const hashSpan = this.Dimensions - HASH_AXIS_OFFSET;
    const termFreq = new Map<string, number>();
    for (const token of tokens) {
      termFreq.set(token, (termFreq.get(token) ?? 0) + 1);
    }

    for (const [token, count] of termFreq.entries()) {
      const tfWeight = 1 + Math.log(count);
      const stemmed = stemToken(token);

      // 1. Concept cluster axes (high semantic signal across synonyms)
      const directClusters = CONCEPT_TERM_INDEX.get(token);
      const stemmedClusters = directClusters ?? CONCEPT_TERM_INDEX.get(stemmed);
      if (stemmedClusters && stemmedClusters.length > 0) {
        for (const clusterIdx of stemmedClusters) {
          const baseIdx = clusterIdx * 2;
          if (baseIdx + 1 < HASH_AXIS_OFFSET) {
            vector[baseIdx] += 2.6 * tfWeight;
            vector[baseIdx + 1] += 1.3 * tfWeight;
          }
        }
      }

      // 2. Signed feature hashing for exact + stemmed tokens
      const tokenDim = HASH_AXIS_OFFSET + (fnv1aHash(stemmed, 17) % hashSpan);
      const tokenSign = (fnv1aHash(stemmed, 31) & 1) === 0 ? 1 : -1;
      vector[tokenDim] += tokenSign * 1.4 * tfWeight;

      const secondaryDim = HASH_AXIS_OFFSET + (fnv1aHash(token, 53) % hashSpan);
      vector[secondaryDim] += 0.9 * tfWeight;

      // 3. Character trigrams for morphological robustness
      if (stemmed.length >= 3) {
        const padded = `^${stemmed}$`;
        for (let i = 0; i <= padded.length - 3; i += 1) {
          const trigram = padded.slice(i, i + 3);
          const triDim = HASH_AXIS_OFFSET + (fnv1aHash(trigram, 97) % hashSpan);
          const triSign = (fnv1aHash(trigram, 131) & 1) === 0 ? 1 : -1;
          vector[triDim] += triSign * 0.35 * tfWeight;
        }
      }
    }

    // Also ensure concept axis count is respected cleanly
    void CONCEPT_AXIS_COUNT;
    return NormalizeVector(vector);
  }

  public async EmbedBatch(texts: ReadonlyArray<string>): Promise<number[][]> {
    const vectors: number[][] = [];
    for (const text of texts) {
      vectors.push(await this.EmbedText(text));
    }
    return vectors;
  }
}

/** Normalizes a numeric vector to unit L2 length (returns zero vector if magnitude is 0). */
export function NormalizeVector(vector: ReadonlyArray<number>): number[] {
  let sumSq = 0;
  for (let i = 0; i < vector.length; i += 1) {
    const v = vector[i];
    if (Number.isFinite(v)) {
      sumSq += v * v;
    }
  }
  if (sumSq <= 0) {
    return vector.map(() => 0);
  }
  const norm = Math.sqrt(sumSq);
  return vector.map((v) => (Number.isFinite(v) ? v / norm : 0));
}

/** Computes cosine similarity in [-1, 1] between two equal-length vectors. */
export function CosineSimilarity(a: ReadonlyArray<number>, b: ReadonlyArray<number>): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i += 1) {
    const va = Number.isFinite(a[i]) ? a[i] : 0;
    const vb = Number.isFinite(b[i]) ? b[i] : 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  if (normA <= 0 || normB <= 0) return 0;
  const raw = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(-1, Math.min(1, raw));
}

/** Combines weighted embedding vectors into a single L2-normalized centroid vector. */
export function CombineWeightedVectors(
  entries: ReadonlyArray<{ vector: ReadonlyArray<number>; weight: number }>,
): number[] {
  if (entries.length === 0) return [];
  const dims = entries[0].vector.length;
  if (dims === 0) return [];

  const sum = new Array<number>(dims).fill(0);
  for (const entry of entries) {
    if (!Number.isFinite(entry.weight) || entry.weight === 0) continue;
    const len = Math.min(dims, entry.vector.length);
    for (let i = 0; i < len; i += 1) {
      const val = entry.vector[i];
      if (Number.isFinite(val)) {
        sum[i] += val * entry.weight;
      }
    }
  }
  return NormalizeVector(sum);
}

export type CommunityMemberInteractionType =
  | 'authored'
  | 'replied'
  | 'reacted'
  | 'followed'
  | 'tagged_interest';

export interface CommunityMemberInteraction {
  postId?: string;
  forumId?: string;
  title?: string | null;
  bodyText: string;
  topicTags?: ReadonlyArray<string>;
  interactionType: CommunityMemberInteractionType;
  occurredAt: Date | string;
  weight?: number;
}

export interface PersonalizationCandidatePost {
  postId: string;
  forumId: string;
  forumName?: string;
  title: string;
  bodyMarkdown: string;
  summaryMarkdown?: string | null;
  authorDisplayName?: string | null;
  topicTags?: ReadonlyArray<string>;
  epistemicStatus?: EpistemicAnswerStatus | null;
  replyCount?: number;
  reactionScore?: number;
  createdAt?: Date | string;
  lastActivityAt?: Date | string;
  isAlreadyAuthoredByMember?: boolean;
  precomputedEmbedding?: ReadonlyArray<number> | null;
}

export interface MemberInterestProfile {
  userId: string;
  interestVector: number[];
  topTopicTags: string[];
  interactionCount: number;
  isColdStart: boolean;
}

export interface PersonalizedPostScore {
  post: PersonalizationCandidatePost;
  score: number;
  semanticSimilarity: number;
  recencyDecay: number;
  epistemicBoost: number;
  diversityPenalty: number;
  explanation: string;
  matchedTags: string[];
  isColdStartFallback: boolean;
}

export interface PersonalizationRankOptions {
  /** Maximum ranked posts returned. Default 10, clamped to [1, 50]. */
  maxItems?: number;
  /** Maximum candidate posts evaluated to bound compute/embedding cost. Default 200. */
  maxCandidateScan?: number;
  /** Recency decay half-life in days. Default 14. */
  recencyHalfLifeDays?: number;
  /** Per-repeat multiplicative penalty for posts from the same forum/topic. Default 0.18. */
  diversityPenaltyPerRepeat?: number;
  /** Reference timestamp for deterministic decay calculations. */
  now?: Date;
}

const INTERACTION_TYPE_WEIGHT: Record<CommunityMemberInteractionType, number> = {
  authored: 1.0,
  replied: 0.9,
  followed: 0.85,
  tagged_interest: 0.95,
  reacted: 0.7,
};

const EPISTEMIC_BOOST_MAP: Record<EpistemicAnswerStatus, number> = {
  'Canon Verified': 1.25,
  'Novel Insight': 1.05,
  'Partially Outdated': 0.75,
  'Conflicts With Canon': 0.45,
};

const MAX_EMBEDDING_CACHE_SIZE = 2000;
const DEFAULT_MAX_CANDIDATE_SCAN = 200;
const DEFAULT_MAX_ITEMS = 10;
const DEFAULT_HALF_LIFE_DAYS = 14;
const DEFAULT_DIVERSITY_PENALTY = 0.18;

function toValidDate(value: Date | string | undefined, fallback: Date): Date {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) return parsed;
  }
  return fallback;
}

function computeRecencyDecay(occurredAt: Date | string | undefined, now: Date, halfLifeDays: number): number {
  const date = toValidDate(occurredAt, now);
  const ageMs = Math.max(0, now.getTime() - date.getTime());
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const safeHalfLife = Math.max(1, halfLifeDays);
  const decay = Math.exp((-Math.LN2 * ageDays) / safeHalfLife);
  return Math.max(0.15, Math.min(1.0, decay));
}

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

function buildPostEmbeddingInput(
  post: Pick<PersonalizationCandidatePost, 'title' | 'bodyMarkdown' | 'summaryMarkdown' | 'topicTags' | 'forumName'>,
): string {
  const parts: string[] = [];
  if (post.title) parts.push(post.title, post.title);
  if (post.topicTags && post.topicTags.length > 0) {
    parts.push(post.topicTags.join(' '), post.topicTags.join(' '));
  }
  if (post.forumName) parts.push(post.forumName);
  if (post.summaryMarkdown) parts.push(post.summaryMarkdown);
  if (post.bodyMarkdown) parts.push(post.bodyMarkdown.slice(0, 2000));
  return parts.join('\n').trim();
}

function formatTagDisplay(tags: ReadonlyArray<string>): string {
  if (tags.length === 1) return tags[0];
  if (tags.length === 2) return `${tags[0]} & ${tags[1]}`;
  return `${tags[0]}, ${tags[1]} & ${tags[2]}`;
}

/**
 * Singleton embedding-based personalization engine for BizApps Community digests and thread ranking.
 * Computes semantic post embeddings, aggregates each member's recency-weighted interest vector,
 * and scores/re-ranks candidate threads with topic diversity and human-readable explanations.
 */
export class CommunityEmbeddingPersonalizationService extends BaseSingleton<CommunityEmbeddingPersonalizationService> {
  private _provider: ICommunityEmbeddingProvider = new DeterministicSemanticEmbeddingProvider();
  private _embeddingCache: Map<string, number[]> = new Map();

  protected constructor() {
    super();
  }

  public static get Instance(): CommunityEmbeddingPersonalizationService {
    return super.getInstance<CommunityEmbeddingPersonalizationService>();
  }

  /** Replaces the active embedding provider (e.g., wiring an MJ AI embedding model at runtime). */
  public SetEmbeddingProvider(provider: ICommunityEmbeddingProvider): void {
    if (!provider) {
      throw new Error('Embedding provider cannot be null.');
    }
    this._provider = provider;
    this._embeddingCache.clear();
  }

  /** Returns the currently configured embedding provider. */
  public GetEmbeddingProvider(): ICommunityEmbeddingProvider {
    return this._provider;
  }

  /** Restores the default zero-key deterministic semantic embedding provider and clears cached vectors. */
  public ResetToDefaultProvider(): void {
    this._provider = new DeterministicSemanticEmbeddingProvider();
    this._embeddingCache.clear();
  }

  /** Clears the bounded in-memory embedding cache. */
  public ClearCache(): void {
    this._embeddingCache.clear();
  }

  /** Computes and normalizes a semantic embedding vector for a community post/thread. */
  public async ComputePostEmbedding(
    post: Pick<
      PersonalizationCandidatePost,
      'postId' | 'title' | 'bodyMarkdown' | 'summaryMarkdown' | 'topicTags' | 'forumName'
    >,
  ): Promise<number[]> {
    const input = buildPostEmbeddingInput(post);
    const cacheKey = `${this._provider.Name}:${post.postId}:${input.length}:${fnv1aHash(input, 7)}`;
    const cached = this._embeddingCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const vector = NormalizeVector(await this._provider.EmbedText(input));
    if (this._embeddingCache.size >= MAX_EMBEDDING_CACHE_SIZE) {
      const oldestKey = this._embeddingCache.keys().next().value;
      if (oldestKey !== undefined) {
        this._embeddingCache.delete(oldestKey);
      }
    }
    this._embeddingCache.set(cacheKey, vector);
    return vector;
  }

  /**
   * Builds a member's personalized interest vector from authored posts, replies, reactions,
   * followed threads, and explicit topic tags using interaction weights and recency decay.
   */
  public async BuildMemberInterestProfile(
    userId: string,
    interactions: ReadonlyArray<CommunityMemberInteraction>,
    explicitTopicTags: ReadonlyArray<string> = [],
    now: Date = new Date(),
    recencyHalfLifeDays: number = DEFAULT_HALF_LIFE_DAYS,
  ): Promise<MemberInterestProfile> {
    const weightedVectors: Array<{ vector: ReadonlyArray<number>; weight: number }> = [];
    const tagWeights = new Map<string, { display: string; weight: number }>();

    const recordTagWeight = (rawTag: string, weight: number): void => {
      const trimmed = rawTag.trim();
      if (!trimmed) return;
      const key = normalizeTag(trimmed);
      const existing = tagWeights.get(key);
      if (existing) {
        existing.weight += weight;
      } else {
        tagWeights.set(key, { display: trimmed, weight });
      }
    };

    for (const tag of explicitTopicTags) {
      const trimmed = tag.trim();
      if (!trimmed) continue;
      const vec = NormalizeVector(await this._provider.EmbedText(trimmed));
      weightedVectors.push({ vector: vec, weight: INTERACTION_TYPE_WEIGHT.tagged_interest * 1.1 });
      recordTagWeight(trimmed, 1.5);
    }

    for (const interaction of interactions) {
      const typeWeight = INTERACTION_TYPE_WEIGHT[interaction.interactionType] ?? 0.7;
      const customWeight =
        interaction.weight !== undefined && Number.isFinite(interaction.weight) && interaction.weight > 0
          ? interaction.weight
          : 1.0;
      const decay = computeRecencyDecay(interaction.occurredAt, now, recencyHalfLifeDays);
      const totalWeight = typeWeight * customWeight * decay;

      const textParts: string[] = [];
      if (interaction.title) textParts.push(interaction.title);
      if (interaction.topicTags && interaction.topicTags.length > 0) {
        textParts.push(interaction.topicTags.join(' '));
      }
      if (interaction.bodyText) textParts.push(interaction.bodyText.slice(0, 1500));

      const combinedText = textParts.join('\n').trim();
      if (combinedText) {
        const vec = NormalizeVector(await this._provider.EmbedText(combinedText));
        weightedVectors.push({ vector: vec, weight: totalWeight });
      }

      if (interaction.topicTags) {
        for (const tag of interaction.topicTags) {
          recordTagWeight(tag, totalWeight);
        }
      }
    }

    const topTopicTags = Array.from(tagWeights.values())
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 8)
      .map((entry) => entry.display);

    if (weightedVectors.length === 0) {
      return {
        userId,
        interestVector: [],
        topTopicTags: [],
        interactionCount: 0,
        isColdStart: true,
      };
    }

    const interestVector = CombineWeightedVectors(weightedVectors);
    const hasSignal = interestVector.some((v) => Math.abs(v) > 1e-9);

    return {
      userId,
      interestVector,
      topTopicTags,
      interactionCount: interactions.length + explicitTopicTags.length,
      isColdStart: !hasSignal,
    };
  }

  /**
   * Scores and ranks candidate posts for a specific member:
   * `score = semanticCosineSimilarity * recencyDecay * epistemicBoost`,
   * followed by diversity-aware greedy re-ranking so one noisy thread or forum doesn't dominate.
   */
  public async RankPostsForMember(params: {
    userId: string;
    interactions: ReadonlyArray<CommunityMemberInteraction>;
    explicitTopicTags?: ReadonlyArray<string>;
    candidates: ReadonlyArray<PersonalizationCandidatePost>;
    options?: PersonalizationRankOptions;
  }): Promise<{ profile: MemberInterestProfile; ranked: PersonalizedPostScore[] }> {
    const now = params.options?.now ?? new Date();
    const halfLifeDays = params.options?.recencyHalfLifeDays ?? DEFAULT_HALF_LIFE_DAYS;
    const maxItems = Math.max(1, Math.min(50, Math.floor(params.options?.maxItems ?? DEFAULT_MAX_ITEMS)));
    const maxScan = Math.max(
      maxItems,
      Math.min(500, Math.floor(params.options?.maxCandidateScan ?? DEFAULT_MAX_CANDIDATE_SCAN)),
    );
    const diversityPenaltyPerRepeat = Math.max(
      0,
      Math.min(0.6, params.options?.diversityPenaltyPerRepeat ?? DEFAULT_DIVERSITY_PENALTY),
    );

    const profile = await this.BuildMemberInterestProfile(
      params.userId,
      params.interactions,
      params.explicitTopicTags ?? [],
      now,
      halfLifeDays,
    );

    const memberTagMap = new Map<string, string>();
    for (const tag of profile.topTopicTags) {
      memberTagMap.set(normalizeTag(tag), tag);
    }

    const boundedCandidates = params.candidates
      .filter((c) => !c.isAlreadyAuthoredByMember)
      .slice(0, maxScan);

    const preliminary: Array<PersonalizedPostScore & { baseScore: number }> = [];

    for (const candidate of boundedCandidates) {
      const recencyDecay = computeRecencyDecay(candidate.lastActivityAt ?? candidate.createdAt, now, halfLifeDays);
      const epistemicBoost = candidate.epistemicStatus
        ? (EPISTEMIC_BOOST_MAP[candidate.epistemicStatus] ?? 1.0)
        : 1.0;

      const candidateTags = candidate.topicTags ?? [];
      const matchedTags: string[] = [];
      for (const rawTag of candidateTags) {
        const display = memberTagMap.get(normalizeTag(rawTag));
        if (display && !matchedTags.includes(display)) {
          matchedTags.push(display);
        } else if (memberTagMap.has(normalizeTag(rawTag)) && !matchedTags.includes(rawTag)) {
          matchedTags.push(rawTag);
        }
      }

      if (profile.isColdStart) {
        const engagement = Math.max(0, (candidate.replyCount ?? 0) + (candidate.reactionScore ?? 0));
        const engagementSignal = 0.45 + 0.12 * Math.log1p(engagement);
        const baseScore = Number((engagementSignal * recencyDecay * epistemicBoost).toFixed(6));
        const explanation = candidate.forumName
          ? `Popular in ${candidate.forumName} for new members`
          : candidate.epistemicStatus === 'Canon Verified'
            ? 'Canon Verified thread trending in the community'
            : 'Trending discussion across the community';
        preliminary.push({
          post: candidate,
          baseScore,
          score: baseScore,
          semanticSimilarity: 0,
          recencyDecay: Number(recencyDecay.toFixed(4)),
          epistemicBoost,
          diversityPenalty: 1,
          explanation,
          matchedTags: [],
          isColdStartFallback: true,
        });
        continue;
      }

      const postVector =
        candidate.precomputedEmbedding && candidate.precomputedEmbedding.length > 0
          ? NormalizeVector(candidate.precomputedEmbedding)
          : await this.ComputePostEmbedding(candidate);

      const rawCosine = CosineSimilarity(profile.interestVector, postVector);
      // Clamp negative cosine to 0 so unrelated topics do not invert epistemic/recency boosts.
      const semanticSimilarity = Math.max(0, rawCosine);
      const baseScore = Number((semanticSimilarity * recencyDecay * epistemicBoost).toFixed(6));

      let explanation: string;
      if (matchedTags.length > 0) {
        explanation = `Matches your recent activity in ${formatTagDisplay(matchedTags)}`;
      } else if (candidate.epistemicStatus === 'Canon Verified' && semanticSimilarity >= 0.25) {
        explanation = candidate.forumName
          ? `Canon Verified answer relevant to your interests in ${candidate.forumName}`
          : 'Canon Verified answer aligned with your recent topics';
      } else if (candidate.forumName) {
        explanation = `Relevant to your recent discussions in ${candidate.forumName}`;
      } else {
        explanation = 'Aligned with your recent community topics and interactions';
      }

      preliminary.push({
        post: candidate,
        baseScore,
        score: baseScore,
        semanticSimilarity: Number(semanticSimilarity.toFixed(4)),
        recencyDecay: Number(recencyDecay.toFixed(4)),
        epistemicBoost,
        diversityPenalty: 1,
        explanation,
        matchedTags,
        isColdStartFallback: false,
      });
    }

    // Diversity-aware greedy selection so a single noisy forum or topic tag does not monopolize the digest.
    const remaining = [...preliminary];
    const selected: PersonalizedPostScore[] = [];
    const forumCounts = new Map<string, number>();
    const tagCounts = new Map<string, number>();

    while (selected.length < maxItems && remaining.length > 0) {
      let bestIdx = 0;
      let bestAdjustedScore = -1;
      let bestPenalty = 1;

      for (let i = 0; i < remaining.length; i += 1) {
        const item = remaining[i];
        const forumRepeats = forumCounts.get(item.post.forumId) ?? 0;
        const primaryTag = item.post.topicTags?.[0] ? normalizeTag(item.post.topicTags[0]) : null;
        const tagRepeats = primaryTag ? (tagCounts.get(primaryTag) ?? 0) : 0;
        const repeatCount = forumRepeats + tagRepeats;
        const penalty = Math.max(0.4, Math.pow(1 - diversityPenaltyPerRepeat, repeatCount));
        const adjusted = item.baseScore * penalty;
        if (adjusted > bestAdjustedScore) {
          bestAdjustedScore = adjusted;
          bestIdx = i;
          bestPenalty = penalty;
        }
      }

      const [chosen] = remaining.splice(bestIdx, 1);
      chosen.diversityPenalty = Number(bestPenalty.toFixed(4));
      chosen.score = Number((chosen.baseScore * bestPenalty).toFixed(6));
      selected.push({
        post: chosen.post,
        score: chosen.score,
        semanticSimilarity: chosen.semanticSimilarity,
        recencyDecay: chosen.recencyDecay,
        epistemicBoost: chosen.epistemicBoost,
        diversityPenalty: chosen.diversityPenalty,
        explanation: chosen.explanation,
        matchedTags: chosen.matchedTags,
        isColdStartFallback: chosen.isColdStartFallback,
      });

      forumCounts.set(chosen.post.forumId, (forumCounts.get(chosen.post.forumId) ?? 0) + 1);
      const primaryTag = chosen.post.topicTags?.[0] ? normalizeTag(chosen.post.topicTags[0]) : null;
      if (primaryTag) {
        tagCounts.set(primaryTag, (tagCounts.get(primaryTag) ?? 0) + 1);
      }
    }

    return { profile, ranked: selected };
  }
}
