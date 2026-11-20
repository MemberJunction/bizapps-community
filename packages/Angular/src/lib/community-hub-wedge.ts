import {
  CommunityEmbeddingPersonalizationService,
  CosineSimilarity,
  type CommunityMemberInteraction,
  type EpistemicAnswerStatus,
  type PersonalizationCandidatePost,
} from '@mj-biz-apps/community-core';
import type { CommunityCommonsItem, CommunityCommonsReply } from './community-hub-commons.ts';

export interface PersonalizedDigestPreviewItem {
  postId: string;
  sourceItemId: string;
  title: string;
  excerpt: string;
  spaceLabel: string;
  epistemicStatus: string | null;
  matchScorePct: number;
  compositeScore: number;
  semanticSimilarity: number;
  reason: string;
  matchedTags: string[];
  replyByEmailHint: string;
  isColdStartFallback: boolean;
}

export interface PersonalizedDigestProfileSummary {
  topTopicTags: string[];
  interactionCount: number;
  isColdStart: boolean;
  providerName: string;
}

export interface PersonalizedDigestPreviewResult {
  profile: PersonalizedDigestProfileSummary;
  items: PersonalizedDigestPreviewItem[];
}

export interface AskFirstLiveMatch {
  id: string;
  sourcePostId: string;
  title: string;
  answerSnippet: string;
  epistemicStatus: string | null;
  matchPct: number;
  isSemanticMatch: boolean;
}

export interface LivingThreadSynthesisCitation {
  citationIndex: number;
  authorDisplayName: string;
  postId: string | null;
  roleLabel: string;
}

export interface LivingThreadSynthesisView {
  rootPostId: string;
  executiveSummary: string;
  consideredReplyCount: number;
  keyTakeaways: string[];
  openQuestions: string[];
  contributorCitations: LivingThreadSynthesisCitation[];
  synthesizedAtIso: string | null;
}

export interface SendDigestSummaryView {
  sentCount: number;
  failedCount: number;
  providerName: string;
  dryRun: boolean;
  topReplyToAddress: string | null;
  message: string;
}

interface ActionParamLike {
  Name: string;
  Value?: string | number | boolean | null | object;
}

interface DeliveryJsonRow {
  userId?: string;
  email?: string;
  itemCount?: number;
  replyToAddress?: string | null;
  providerName?: string;
  success?: boolean;
}

function mapEpistemicStatus(raw: string | null | undefined): EpistemicAnswerStatus | null {
  switch (raw?.trim()) {
    case 'Canon Verified':
      return 'Canon Verified';
    case 'Novel Insight':
      return 'Novel Insight';
    case 'Partially Outdated':
      return 'Partially Outdated';
    case 'Conflicts With Canon':
      return 'Conflicts With Canon';
    default:
      return null;
  }
}

function formatReplyToHint(postId: string): string {
  const compact = postId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'thread';
  return `reply+hmac_${compact}@reply.bizapps.local`;
}

function extractInteractionsFromCommons(
  userName: string,
  commonsItems: ReadonlyArray<CommunityCommonsItem>,
): CommunityMemberInteraction[] {
  const interactions: CommunityMemberInteraction[] = [];
  const normalizedUser = userName.trim().toLowerCase();

  for (const item of commonsItems) {
    if (item.upvotedByMe) {
      interactions.push({
        postId: item.sourcePostId,
        forumId: item.forumId ?? item.spaceId,
        title: item.title,
        bodyText: item.bodyMarkdown,
        topicTags: item.tags,
        interactionType: 'reacted',
        occurredAt: new Date(),
      });
    } else if (normalizedUser && item.authorName.trim().toLowerCase() === normalizedUser) {
      interactions.push({
        postId: item.sourcePostId,
        forumId: item.forumId ?? item.spaceId,
        title: item.title,
        bodyText: item.bodyMarkdown,
        topicTags: item.tags,
        interactionType: 'authored',
        occurredAt: new Date(),
      });
    }
  }
  return interactions;
}

/**
 * Builds the member's live Personalized Digest preview using
 * {@link CommunityEmbeddingPersonalizationService.Instance} cosine similarity, recency decay,
 * epistemic boosts, and diversity-aware re-ranking.
 */
export async function BuildPersonalizedDigestPreview(params: {
  userId: string;
  userName: string;
  commonsItems: ReadonlyArray<CommunityCommonsItem>;
  explicitTopicTags?: ReadonlyArray<string>;
  maxItems?: number;
}): Promise<PersonalizedDigestPreviewResult> {
  const service = CommunityEmbeddingPersonalizationService.Instance;
  const maxItems = Math.max(1, Math.min(10, params.maxItems ?? 5));

  const interactions = extractInteractionsFromCommons(params.userName, params.commonsItems);
  const effectiveTags =
    params.explicitTopicTags && params.explicitTopicTags.length > 0
      ? params.explicitTopicTags
      : params.commonsItems
          .flatMap((item) => item.tags)
          .filter((tag, idx, all) => tag.trim().length > 0 && all.indexOf(tag) === idx)
          .slice(0, 3);

  const candidates: PersonalizationCandidatePost[] = params.commonsItems.map((item) => ({
    postId: item.sourcePostId,
    forumId: item.forumId ?? item.spaceId,
    forumName: item.spaceLabel,
    title: item.title,
    bodyMarkdown: item.bodyMarkdown,
    summaryMarkdown: item.excerpt,
    authorDisplayName: item.authorName,
    topicTags: item.tags,
    epistemicStatus: mapEpistemicStatus(item.epistemicStatus),
    replyCount: item.replyCount,
    reactionScore: item.upvoteCount,
    createdAt: new Date(),
    lastActivityAt: new Date(),
    isAlreadyAuthoredByMember: false,
  }));

  const { profile, ranked } = await service.RankPostsForMember({
    userId: params.userId,
    interactions,
    explicitTopicTags: effectiveTags,
    candidates,
    options: { maxItems },
  });

  const itemBySourcePostId = new Map<string, CommunityCommonsItem>();
  for (const item of params.commonsItems) {
    if (!itemBySourcePostId.has(item.sourcePostId)) {
      itemBySourcePostId.set(item.sourcePostId, item);
    }
  }

  const digestItems: PersonalizedDigestPreviewItem[] = ranked.map((entry) => {
    const source = itemBySourcePostId.get(entry.post.postId);
    const rawPct = entry.isColdStartFallback
      ? Math.round(Math.min(0.95, Math.max(0.45, entry.score)) * 100)
      : Math.round(Math.min(0.99, Math.max(0.35, entry.semanticSimilarity > 0 ? entry.semanticSimilarity : entry.score)) * 100);

    return {
      postId: entry.post.postId,
      sourceItemId: source?.id ?? entry.post.postId,
      title: entry.post.title,
      excerpt: source?.excerpt ?? entry.post.bodyMarkdown.slice(0, 160),
      spaceLabel: entry.post.forumName ?? source?.spaceLabel ?? 'Community Commons',
      epistemicStatus: entry.post.epistemicStatus ?? source?.epistemicStatus ?? null,
      matchScorePct: rawPct,
      compositeScore: entry.score,
      semanticSimilarity: entry.semanticSimilarity,
      reason: entry.explanation,
      matchedTags: entry.matchedTags,
      replyByEmailHint: formatReplyToHint(entry.post.postId),
      isColdStartFallback: entry.isColdStartFallback,
    };
  });

  return {
    profile: {
      topTopicTags: profile.topTopicTags,
      interactionCount: profile.interactionCount,
      isColdStart: profile.isColdStart,
      providerName: service.GetEmbeddingProvider().Name,
    },
    items: digestItems,
  };
}

function tokenizeQuery(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2);
}

/**
 * Computes live hybrid semantic embedding + lexical Ask-First deflection matches as a member types
 * a question, fusing `CommunityEmbeddingPersonalizationService` cosine similarity with token
 * overlap and epistemic Canon verification boosts.
 */
export async function ComputeLiveAskFirstMatches(params: {
  queryText: string;
  candidates: ReadonlyArray<{
    id: string;
    sourcePostId: string;
    title: string;
    bodyMarkdown: string;
    epistemicStatus: string | null;
    tags?: ReadonlyArray<string>;
  }>;
  maxMatches?: number;
  minScore?: number;
}): Promise<AskFirstLiveMatch[]> {
  const query = params.queryText.trim();
  if (query.length < 4 || params.candidates.length === 0) {
    return [];
  }

  const service = CommunityEmbeddingPersonalizationService.Instance;
  const queryEmbedding = await service.ComputePostEmbedding({
    postId: '__live_query__',
    title: query,
    bodyMarkdown: query,
  });
  const queryTokens = tokenizeQuery(query);
  const maxMatches = Math.max(1, Math.min(5, params.maxMatches ?? 3));
  const minScore = params.minScore ?? 0.24;

  const scored: Array<{ match: AskFirstLiveMatch; score: number }> = [];

  for (const candidate of params.candidates.slice(0, 50)) {
    const candidateVec = await service.ComputePostEmbedding({
      postId: candidate.sourcePostId,
      title: candidate.title,
      bodyMarkdown: candidate.bodyMarkdown,
      topicTags: candidate.tags,
    });
    const cosine = Math.max(0, CosineSimilarity(queryEmbedding, candidateVec));

    const hay = `${candidate.title} ${candidate.bodyMarkdown} ${(candidate.tags ?? []).join(' ')}`.toLowerCase();
    const matchedTokens = queryTokens.filter((t) => hay.includes(t)).length;
    const lexical = queryTokens.length > 0 ? matchedTokens / queryTokens.length : 0;

    const canonBoost =
      candidate.epistemicStatus === 'Canon Verified'
        ? 1.25
        : candidate.epistemicStatus === 'Partially Outdated'
          ? 0.75
          : 1.0;

    const fused = Math.min(0.99, (0.65 * cosine + 0.35 * lexical) * canonBoost);
    if (fused < minScore) {
      continue;
    }

    scored.push({
      score: fused,
      match: {
        id: candidate.id,
        sourcePostId: candidate.sourcePostId,
        title: candidate.title,
        answerSnippet: candidate.bodyMarkdown.slice(0, 140) + (candidate.bodyMarkdown.length > 140 ? '…' : ''),
        epistemicStatus: candidate.epistemicStatus,
        matchPct: Math.round(fused * 100),
        isSemanticMatch: cosine >= 0.2,
      },
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxMatches).map((s) => s.match);
}

function parseJsonStringArray(raw: string | number | boolean | null | object | undefined): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

function parseCitationsArray(
  raw: string | number | boolean | null | object | undefined,
): LivingThreadSynthesisCitation[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as Array<{
      citationIndex?: number;
      authorDisplayName?: string;
      postId?: string | null;
      roleLabel?: string;
    }>;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry, idx) => ({
      citationIndex: typeof entry.citationIndex === 'number' ? entry.citationIndex : idx + 1,
      authorDisplayName: entry.authorDisplayName?.trim() || 'Community Member',
      postId: entry.postId ?? null,
      roleLabel: entry.roleLabel?.trim() || 'Contributor',
    }));
  } catch {
    return [];
  }
}

/**
 * Builds structured Living Thread Synthesis details from action output parameters, falling back
 * cleanly to client-side reply attribution when optional parameters are omitted.
 */
export function ParseLivingSynthesisPayload(params: {
  rootPostId: string;
  title: string;
  bodyMarkdown: string;
  replies: ReadonlyArray<CommunityCommonsReply>;
  actionMessage?: string | null;
  actionParams?: ReadonlyArray<ActionParamLike>;
}): LivingThreadSynthesisView {
  const getParam = (name: string): string | number | boolean | null | object | undefined =>
    params.actionParams?.find((p) => p.Name.toLowerCase() === name.toLowerCase())?.Value;

  const execRaw = getParam('AIExecutiveSummary');
  const takeaways = parseJsonStringArray(getParam('KeyTakeaways'));
  const openQuestions = parseJsonStringArray(getParam('OpenQuestions'));
  const citations = parseCitationsArray(getParam('ContributorCitations'));
  const countRaw = getParam('ConsideredReplyCount');
  const atRaw = getParam('AISynthesizedAt');

  if (takeaways.length > 0 || citations.length > 0 || typeof execRaw === 'string') {
    return {
      rootPostId: params.rootPostId,
      executiveSummary:
        typeof execRaw === 'string' && execRaw.trim()
          ? execRaw.trim()
          : params.actionMessage?.trim() || `Living synthesis for "${params.title}".`,
      consideredReplyCount:
        typeof countRaw === 'number' && Number.isFinite(countRaw) ? countRaw : params.replies.length,
      keyTakeaways:
        takeaways.length > 0
          ? takeaways
          : [params.bodyMarkdown.slice(0, 140) + (params.bodyMarkdown.length > 140 ? '…' : '')],
      openQuestions,
      contributorCitations: citations,
      synthesizedAtIso: typeof atRaw === 'string' && atRaw.trim() ? atRaw : null,
    };
  }

  return BuildClientLivingSynthesis(params);
}

/** Deterministic client-side Living Thread Synthesis fallback for offline/demo threads. */
export function BuildClientLivingSynthesis(params: {
  rootPostId: string;
  title: string;
  bodyMarkdown: string;
  replies: ReadonlyArray<CommunityCommonsReply>;
  actionMessage?: string | null;
}): LivingThreadSynthesisView {
  const ordered = [
    ...params.replies.filter((r) => r.isAccepted),
    ...params.replies.filter((r) => !r.isAccepted),
  ];

  const contributorCitations: LivingThreadSynthesisCitation[] = ordered.map((reply, idx) => ({
    citationIndex: idx + 1,
    authorDisplayName: reply.authorName,
    postId: reply.id,
    roleLabel: reply.isAccepted ? 'Accepted Answer' : reply.authorRole || 'Contributor',
  }));

  const keyTakeaways =
    ordered.length > 0
      ? ordered.slice(0, 4).map((reply, idx) => {
          const clean = reply.bodyMarkdown.replace(/\s+/g, ' ').trim();
          const snippet = clean.length > 140 ? `${clean.slice(0, 140).trimEnd()}…` : clean;
          return `${snippet} [${idx + 1}]`;
        })
      : [
          params.bodyMarkdown.length > 140
            ? `${params.bodyMarkdown.slice(0, 140).trimEnd()}…`
            : params.bodyMarkdown,
        ];

  const openQuestions = ordered
    .filter((r) => r.bodyMarkdown.includes('?'))
    .map((r, idx) => `Follow-up raised by ${r.authorName} [${idx + 1}]`)
    .slice(0, 3);

  return {
    rootPostId: params.rootPostId,
    executiveSummary:
      params.actionMessage?.trim() ||
      `Synthesized ${ordered.length} repl(y/ies) for "${params.title}".`,
    consideredReplyCount: ordered.length,
    keyTakeaways,
    openQuestions,
    contributorCitations,
    synthesizedAtIso: new Date().toISOString(),
  };
}

/** Parses `Community.SendPersonalizedDigest` action output into a clean UI summary. */
export function ParseSendDigestActionResult(params: {
  success: boolean;
  message?: string | null;
  actionParams?: ReadonlyArray<ActionParamLike>;
}): SendDigestSummaryView {
  const getParam = (name: string): string | number | boolean | null | object | undefined =>
    params.actionParams?.find((p) => p.Name.toLowerCase() === name.toLowerCase())?.Value;

  const sentRaw = getParam('SentCount');
  const failedRaw = getParam('FailedCount');
  const providerRaw = getParam('ProviderName');
  const dryRunRaw = getParam('DryRun');
  const deliveriesRaw = getParam('DeliveriesJSON');

  let topReplyToAddress: string | null = null;
  if (typeof deliveriesRaw === 'string' && deliveriesRaw.trim()) {
    try {
      const parsed = JSON.parse(deliveriesRaw) as DeliveryJsonRow[];
      if (Array.isArray(parsed)) {
        topReplyToAddress = parsed.find((d) => typeof d.replyToAddress === 'string')?.replyToAddress ?? null;
      }
    } catch {
      topReplyToAddress = null;
    }
  }

  return {
    sentCount: typeof sentRaw === 'number' ? sentRaw : Number(sentRaw ?? (params.success ? 1 : 0)) || 0,
    failedCount: typeof failedRaw === 'number' ? failedRaw : Number(failedRaw ?? 0) || 0,
    providerName:
      typeof providerRaw === 'string' && providerRaw.trim()
        ? providerRaw.trim()
        : 'Community Test Email Driver',
    dryRun: dryRunRaw === true || dryRunRaw === 'true',
    topReplyToAddress,
    message: params.message?.trim() || 'Personalized test digest dispatched.',
  };
}
