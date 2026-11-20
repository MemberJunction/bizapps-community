import { Metadata, RunView, type UserInfo } from '@memberjunction/core';
import { GetGlobalObjectStore, IsValidUUID } from '@memberjunction/global';
import {
  COMMUNITY_ACTION_DRIVER_CLASSES,
  COMMUNITY_ACTION_IDS,
  CommunityEmbeddingPersonalizationService,
  CosineSimilarity,
  EscapeSqlLiteral,
  ResolveCommunityActionID,
  type ActionCatalogEntryLike,
  type CommunityActionKey,
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

export type ActionParamValue = string | number | boolean | null | object | undefined;

export interface ActionParamLike {
  Name: string;
  Value?: ActionParamValue;
  Type?: string;
}

export interface GraphQLActionResultLike {
  Success?: boolean;
  ResultCode?: string | null;
  Message?: string | null;
  Result?: ActionParamLike[] | Record<string, ActionParamLike | ActionParamValue> | string | object | null;
  Params?: ActionParamLike[];
}

interface ActionEngineSingletonLike {
  Loaded?: boolean;
  Actions?: ReadonlyArray<ActionCatalogEntryLike>;
  Config?: (forceRefresh?: boolean, contextUser?: UserInfo) => Promise<boolean>;
}

interface DeliveryJsonRow {
  userId?: string;
  email?: string;
  itemCount?: number;
  replyToAddress?: string | null;
  providerName?: string;
  success?: boolean;
}

const ACTION_ENGINE_GLOBAL_KEY = '___SINGLETON__ActionEngineBase';
const resolvedActionIdCache = new Map<CommunityActionKey, string>();

/** Clears the cached runtime action ID map (for isolated unit tests). */
export function ClearResolvedActionIdCache(): void {
  resolvedActionIdCache.clear();
}

function getActionEngineSingleton(): ActionEngineSingletonLike | null {
  const store = GetGlobalObjectStore();
  if (!store) return null;
  const candidate = store[ACTION_ENGINE_GLOBAL_KEY];
  if (candidate && typeof candidate === 'object') {
    return candidate as ActionEngineSingletonLike;
  }
  return null;
}

/**
 * Synchronously resolves a Community action's UUID from `ActionEngineBase.Instance.Actions`
 * (or explicit `actions` override) by `DriverClass` / `Name`, falling back to the canonical
 * UUID in {@link COMMUNITY_ACTION_IDS}. Never returns a non-UUID driver class string.
 */
export function ResolveCommunityActionRuntimeID(
  key: CommunityActionKey,
  actions?: ReadonlyArray<ActionCatalogEntryLike> | null,
): string {
  if (actions && actions.length > 0) {
    return ResolveCommunityActionID(key, actions);
  }
  const engine = getActionEngineSingleton();
  if (engine?.Actions && engine.Actions.length > 0) {
    return ResolveCommunityActionID(key, engine.Actions);
  }
  return COMMUNITY_ACTION_IDS[key];
}

/**
 * Resolves a Community action's UUID asynchronously: checks `ActionEngineBase.Instance.Actions`
 * (configuring it if available), then optionally queries `MJ: Actions` by `DriverClass` when a
 * live provider is active, falling back deterministically to {@link COMMUNITY_ACTION_IDS}.
 */
export async function ResolveCommunityActionIDWithRunView(
  key: CommunityActionKey,
  options?: {
    actions?: ReadonlyArray<ActionCatalogEntryLike> | null;
    user?: UserInfo | null;
    runView?: {
      RunView: (params: {
        EntityName: string;
        ExtraFilter?: string;
        Fields?: string[];
        ResultType?: string;
        MaxRows?: number;
      }, user?: UserInfo) => Promise<{ Success: boolean; Results?: ActionCatalogEntryLike[] }>;
    } | null;
  },
): Promise<string> {
  if (options?.actions && options.actions.length > 0) {
    return ResolveCommunityActionID(key, options.actions);
  }

  const engine = getActionEngineSingleton();
  if (engine) {
    if (!engine.Loaded && typeof engine.Config === 'function') {
      try {
        await engine.Config(false, options?.user ?? Metadata.Provider?.CurrentUser);
      } catch {
        // Fall through to RunView / canonical constant fallback.
      }
    }
    if (engine.Actions && engine.Actions.length > 0) {
      const fromEngine = ResolveCommunityActionID(key, engine.Actions);
      resolvedActionIdCache.set(key, fromEngine);
      return fromEngine;
    }
  }

  const cached = resolvedActionIdCache.get(key);
  if (cached && IsValidUUID(cached)) {
    return cached;
  }

  const activeUser = options?.user ?? Metadata.Provider?.CurrentUser;
  const rv = options?.runView ?? (Metadata.Provider && activeUser ? new RunView() : null);
  if (rv && activeUser) {
    try {
      const driverClass = EscapeSqlLiteral(COMMUNITY_ACTION_DRIVER_CLASSES[key]);
      const res = await rv.RunView(
        {
          EntityName: 'MJ: Actions',
          ExtraFilter: `DriverClass = '${driverClass}' AND Status = 'Active'`,
          Fields: ['ID', 'DriverClass', 'Name', 'Status'],
          ResultType: 'simple',
          MaxRows: 1,
        },
        activeUser,
      );
      if (res?.Success && res.Results && res.Results.length > 0) {
        const resolved = ResolveCommunityActionID(key, res.Results);
        resolvedActionIdCache.set(key, resolved);
        return resolved;
      }
    } catch {
      // Fall back to deterministic canonical UUID constant.
    }
  }

  return COMMUNITY_ACTION_IDS[key];
}

function isActionParamObject(entry: object): entry is ActionParamLike {
  return 'Name' in entry && typeof (entry as { Name?: ActionParamValue }).Name === 'string';
}

/**
 * Extracts normalized output parameters from a `GraphQLActionClient.RunAction` result (which stores
 * parsed `ResultData` on `res.Result` and echoes input params on `res.Params`) as well as direct
 * server/test `ActionResultSimple` payloads where output params live on `res.Params`.
 */
export function ExtractActionOutputParams(result: GraphQLActionResultLike | null | undefined): ActionParamLike[] {
  if (!result) return [];
  const collected: ActionParamLike[] = [];
  const seenNames = new Set<string>();

  const pushEntry = (name: string, value: ActionParamValue, type?: string): void => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (type && type.trim().toLowerCase() === 'input') return;
    const key = trimmed.toLowerCase();
    if (seenNames.has(key)) return;
    seenNames.add(key);
    collected.push({ Name: trimmed, Value: value ?? null, Type: type });
  };

  let rawResult = result.Result;
  if (typeof rawResult === 'string' && rawResult.trim()) {
    try {
      rawResult = JSON.parse(rawResult) as GraphQLActionResultLike['Result'];
    } catch {
      rawResult = null;
    }
  }

  if (Array.isArray(rawResult)) {
    for (const item of rawResult) {
      if (item && typeof item === 'object' && isActionParamObject(item)) {
        pushEntry(item.Name, item.Value, item.Type);
      }
    }
  } else if (rawResult && typeof rawResult === 'object') {
    for (const [k, v] of Object.entries(rawResult)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && isActionParamObject(v)) {
        pushEntry(v.Name, v.Value, v.Type);
      } else {
        pushEntry(k, v as ActionParamValue);
      }
    }
  }

  if (Array.isArray(result.Params)) {
    for (const param of result.Params) {
      if (param && typeof param.Name === 'string') {
        pushEntry(param.Name, param.Value, param.Type);
      }
    }
  }

  return collected;
}

/** Case-insensitive lookup for an output parameter value across `res.Result` and `res.Params`. */
export function GetActionOutputValue(
  result: GraphQLActionResultLike | null | undefined,
  paramName: string,
): ActionParamValue | undefined {
  const outputs = ExtractActionOutputParams(result);
  const target = paramName.trim().toLowerCase();
  return outputs.find((p) => p.Name.toLowerCase() === target)?.Value;
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
      : Math.round(
          Math.min(0.99, Math.max(0.35, entry.semanticSimilarity > 0 ? entry.semanticSimilarity : entry.score)) *
            100,
        );

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

function parseJsonStringArray(raw: ActionParamValue | undefined): string[] {
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

function parseCitationsArray(raw: ActionParamValue | undefined): LivingThreadSynthesisCitation[] {
  let list: Array<{
    citationIndex?: number;
    authorDisplayName?: string;
    postId?: string | null;
    roleLabel?: string;
  }> = [];

  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as typeof list;
      if (Array.isArray(parsed)) {
        list = parsed;
      }
    } catch {
      return [];
    }
  } else {
    return [];
  }

  return list.map((entry, idx) => ({
    citationIndex: typeof entry.citationIndex === 'number' ? entry.citationIndex : idx + 1,
    authorDisplayName: entry.authorDisplayName?.trim() || 'Community Member',
    postId: entry.postId ?? null,
    roleLabel: entry.roleLabel?.trim() || 'Contributor',
  }));
}

/**
 * Decodes structured Living Thread Synthesis details from `GraphQLActionClient` (`Result` /
 * `ResultData`) and `Params` output parameters. Fails closed (returns `null`) on `Success: false`
 * or when `allowClientFallback === false` and no server synthesis payload was returned.
 */
export function ParseLivingSynthesisPayload(params: {
  rootPostId: string;
  title: string;
  bodyMarkdown: string;
  replies: ReadonlyArray<CommunityCommonsReply>;
  actionMessage?: string | null;
  actionParams?: ReadonlyArray<ActionParamLike>;
  actionResult?: GraphQLActionResultLike | null;
  allowClientFallback?: boolean;
}): LivingThreadSynthesisView | null {
  if (params.actionResult && params.actionResult.Success !== true) {
    return null;
  }

  const effectiveResult: GraphQLActionResultLike = params.actionResult ?? {
    Success: true,
    Message: params.actionMessage,
    Params: params.actionParams ? [...params.actionParams] : [],
  };

  const execRaw = GetActionOutputValue(effectiveResult, 'AIExecutiveSummary');
  const takeaways = parseJsonStringArray(GetActionOutputValue(effectiveResult, 'KeyTakeaways'));
  const openQuestions = parseJsonStringArray(GetActionOutputValue(effectiveResult, 'OpenQuestions'));
  const citations = parseCitationsArray(GetActionOutputValue(effectiveResult, 'ContributorCitations'));
  const countRaw = GetActionOutputValue(effectiveResult, 'ConsideredReplyCount');
  const atRaw = GetActionOutputValue(effectiveResult, 'AISynthesizedAt');

  const parsedCount =
    typeof countRaw === 'number' && Number.isFinite(countRaw)
      ? countRaw
      : typeof countRaw === 'string' && countRaw.trim() && Number.isFinite(Number(countRaw))
        ? Number(countRaw)
        : params.replies.length;

  const effectiveMessage = params.actionResult?.Message ?? params.actionMessage;

  if (takeaways.length > 0 || citations.length > 0 || typeof execRaw === 'string') {
    return {
      rootPostId: params.rootPostId,
      executiveSummary:
        typeof execRaw === 'string' && execRaw.trim()
          ? execRaw.trim()
          : effectiveMessage?.trim() || `Living synthesis for "${params.title}".`,
      consideredReplyCount: parsedCount,
      keyTakeaways: takeaways,
      openQuestions,
      contributorCitations: citations,
      synthesizedAtIso: typeof atRaw === 'string' && atRaw.trim() ? atRaw : null,
    };
  }

  if (params.allowClientFallback === false) {
    return null;
  }

  return BuildClientLivingSynthesis(params);
}

/** Deterministic client-side Living Thread Synthesis fallback for offline/demo threads ONLY. */
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

/**
 * Parses `Community.SendPersonalizedDigest` outputs from BOTH `res.Result` (`GraphQLActionClient`
 * parsed `ResultData`) and `res.Params`, never fabricating default delivery counts on failure or
 * missing output parameters.
 */
export function ParseSendDigestActionResult(params: {
  success: boolean;
  message?: string | null;
  actionParams?: ReadonlyArray<ActionParamLike>;
  actionResult?: GraphQLActionResultLike | null;
}): SendDigestSummaryView {
  const isSuccess = params.actionResult ? params.actionResult.Success === true : params.success === true;
  const effectiveResult: GraphQLActionResultLike = params.actionResult ?? {
    Success: isSuccess,
    Message: params.message,
    Params: params.actionParams ? [...params.actionParams] : [],
  };
  const effectiveMessage = params.actionResult?.Message ?? params.message;

  if (!isSuccess) {
    return {
      sentCount: 0,
      failedCount: 0,
      providerName: '',
      dryRun: false,
      topReplyToAddress: null,
      message: effectiveMessage?.trim() || 'Personalized digest dispatch failed.',
    };
  }

  const sentRaw = GetActionOutputValue(effectiveResult, 'SentCount');
  const failedRaw = GetActionOutputValue(effectiveResult, 'FailedCount');
  const providerRaw = GetActionOutputValue(effectiveResult, 'ProviderName');
  const dryRunRaw = GetActionOutputValue(effectiveResult, 'DryRun');
  const deliveriesRaw = GetActionOutputValue(effectiveResult, 'DeliveriesJSON');

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
  } else if (Array.isArray(deliveriesRaw)) {
    const list = deliveriesRaw as DeliveryJsonRow[];
    topReplyToAddress = list.find((d) => typeof d.replyToAddress === 'string')?.replyToAddress ?? null;
  }

  const sentCount =
    typeof sentRaw === 'number' && Number.isFinite(sentRaw)
      ? sentRaw
      : typeof sentRaw === 'string' && sentRaw.trim() && Number.isFinite(Number(sentRaw))
        ? Number(sentRaw)
        : 0;

  const failedCount =
    typeof failedRaw === 'number' && Number.isFinite(failedRaw)
      ? failedRaw
      : typeof failedRaw === 'string' && failedRaw.trim() && Number.isFinite(Number(failedRaw))
        ? Number(failedRaw)
        : 0;

  return {
    sentCount,
    failedCount,
    providerName: typeof providerRaw === 'string' && providerRaw.trim() ? providerRaw.trim() : '',
    dryRun: dryRunRaw === true || dryRunRaw === 'true',
    topReplyToAddress,
    message: effectiveMessage?.trim() || 'Personalized digest dispatched.',
  };
}
