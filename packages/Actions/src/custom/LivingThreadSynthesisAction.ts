import { CompositeKey, Metadata, RunView, type RunViewResult, type UserInfo } from '@memberjunction/core';
import { ActionParam, ActionResultSimple, RunActionParams } from '@memberjunction/actions-base';
import { BaseAction } from '@memberjunction/actions';
import { AIPromptParams, type MJAIPromptEntityExtended } from '@memberjunction/ai-core-plus';
import { AIPromptRunner } from '@memberjunction/ai-prompts';
import { AIEngine } from '@memberjunction/aiengine';
import { RegisterClass, UUIDsEqual } from '@memberjunction/global';
import type { EpistemicAnswerStatus } from '@mj-biz-apps/community-core';
import { COMMUNITY_ENTITY_NAMES, type mjBizAppsCommunityForumPostEntity } from '@mj-biz-apps/community-entities';
import { ParseOptionalUUIDParam, ParseRequiredUUIDParam } from './action-id-params.ts';
import { SaveOrFail } from './save-or-fail.ts';
import {
  SynthesizeLivingThread,
  type ThreadContributorCitation,
  type ThreadPostForSynthesis,
} from './living-thread-synthesis.ts';
import {
  BuildContributorCitationsForPrompt,
  COMMUNITY_LIVING_SYNTHESIS_PROMPT_CATEGORY,
  COMMUNITY_LIVING_SYNTHESIS_PROMPT_NAME,
  ComputeThreadContentFingerprint,
  EmbedSynthesisCacheMetadata,
  ExtractSynthesisCacheMetadata,
  NormalizeLLMSynthesisOutput,
  type LLMLivingThreadSynthesisResponse,
} from './living-thread-synthesis-cache.ts';

interface ReplyRow {
  ID: string;
  BodyMarkdown: string;
  AuthorUserID: string | null;
  AuthorUser?: string | null;
}

interface RootPostRow {
  ID: string;
  Title: string | null;
  BodyMarkdown: string;
  SummaryMarkdown?: string | null;
  SummaryGeneratedAt?: Date | string | null;
  SummaryReplyWatermark?: number | null;
}

interface ReplyAnswerMetadataRow {
  ID: string;
  IsAcceptedByAuthor: boolean;
  IsVerifiedByModerator: boolean;
  AIEpistemicStatus: EpistemicAnswerStatus | null;
}

interface QuestionCanonRow {
  ID: string;
  AcceptedAnswerPostID: string | null;
  AICanonAnswerPostID: string | null;
}

interface SynthesizedOutcome {
  executiveSummary: string;
  keyTakeaways: string[];
  openQuestions: string[];
  contributorCitations: ThreadContributorCitation[];
  consideredReplyCount: number;
  synthesizedAt: Date;
  modelUsed: string;
}

function paramValue(params: RunActionParams, name: string): string | null {
  const value = params.Params.find((p) => p.Name.toLowerCase() === name.toLowerCase())?.Value;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  return typeof value === 'string' && value.trim() ? value : null;
}

function parseBooleanParam(params: RunActionParams, name: string): boolean {
  const raw = paramValue(params, name);
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function truncateForPrompt(text: string, maxChars: number): string {
  const normalized = text.trim();
  return normalized.length <= maxChars ? normalized : `${normalized.slice(0, maxChars).trimEnd()}…`;
}

function toIsoStringSafe(value: Date | string | null | undefined): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date().toISOString() : value.toISOString();
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value.trim() : parsed.toISOString();
  }
  return new Date().toISOString();
}

/**
 * Action: Community.LivingThreadSynthesis
 *
 * Synthesizes a root post's executive summary (`SummaryMarkdown` / `AIExecutiveSummary`) using the
 * managed MJ AI Prompt `Community: Living Thread Synthesis` (configured for `Gemini 3.5 Flash-Lite`),
 * caching the result on `ForumPost` and regenerating only when the thread content or replies change
 * (or when `ForceRegenerate` is `true`). Falls back to deterministic synthesis in offline/unit-test
 * environments where no AI Prompt or LLM provider is configured.
 */
@RegisterClass(BaseAction, 'Community.LivingThreadSynthesis')
export class LivingThreadSynthesisAction extends BaseAction {
  protected async InternalRunAction(params: RunActionParams): Promise<ActionResultSimple> {
    const user = params.ContextUser;
    if (!user) return fail('ERROR', 'ContextUser is required');

    let rootPostId: string;
    let acceptedAnswerPostId: string | null;
    try {
      rootPostId = ParseRequiredUUIDParam(paramValue(params, 'RootPostID'), 'RootPostID');
      acceptedAnswerPostId = ParseOptionalUUIDParam(paramValue(params, 'AcceptedAnswerPostID'), 'AcceptedAnswerPostID');
    } catch (err) {
      return fail('INVALID_POST_ID', err instanceof Error ? err.message : 'RootPostID or AcceptedAnswerPostID is malformed');
    }

    const maxReplyCountRaw = paramValue(params, 'MaxReplyCount');
    const maxCharsPerPostRaw = paramValue(params, 'MaxCharsPerPost');
    const forceRegenerate = parseBooleanParam(params, 'ForceRegenerate');
    const maxReplyCount = maxReplyCountRaw ? Math.max(0, Number(maxReplyCountRaw)) : 50;
    const maxCharsPerPost = maxCharsPerPostRaw ? Math.max(10, Number(maxCharsPerPostRaw)) : 500;

    const loaded = await this.loadRootAndReplies(rootPostId, acceptedAnswerPostId, user);
    if (!loaded.root) return fail('ROOT_POST_NOT_FOUND', `No post found with ID ${rootPostId}`);
    const root = loaded.root;
    const replies = loaded.replies;
    const fingerprint = ComputeThreadContentFingerprint({
      rootTitle: root.Title,
      rootBodyMarkdown: root.BodyMarkdown,
      replies,
    });

    // 1. Check DB cache on ForumPost — return immediately if thread is unchanged and not forced.
    if (!forceRegenerate && root.SummaryMarkdown && root.SummaryGeneratedAt) {
      const cached = ExtractSynthesisCacheMetadata(root.SummaryMarkdown);
      const watermarkMatches = root.SummaryReplyWatermark === replies.length;
      if (cached && cached.metadata.fingerprint === fingerprint && watermarkMatches) {
        const cachedAtIso = toIsoStringSafe(root.SummaryGeneratedAt);
        return this.buildSuccessResult({
          executiveSummary: cached.cleanSummary,
          synthesizedAtIso: cachedAtIso,
          consideredReplyCount: cached.metadata.consideredReplyCount,
          keyTakeaways: cached.metadata.keyTakeaways,
          openQuestions: cached.metadata.openQuestions,
          contributorCitations: cached.metadata.contributorCitations,
          cacheHit: true,
          modelUsed: cached.metadata.modelUsed,
          message: `Loaded cached AI summary (${cached.metadata.consideredReplyCount} repl(y/ies), unchanged)`,
        });
      }
    }

    // 2. Cache miss or ForceRegenerate: run managed MJ AI Prompt (Gemini 3.5 Flash-Lite), with
    //    deterministic fallback only when AIEngine has no prompt/provider configured (e.g. CI harness).
    const aiOutcome = await this.tryRunAIPromptSynthesis({
      rootTitle: root.Title,
      rootBodyMarkdown: root.BodyMarkdown,
      replies,
      maxReplyCount,
      maxCharsPerPost,
      params,
      user,
    });

    const outcome: SynthesizedOutcome = aiOutcome ?? this.runDeterministicFallback({
      rootTitle: root.Title,
      rootBodyMarkdown: root.BodyMarkdown,
      replies,
      maxReplyCount,
      maxCharsPerPost,
    });

    const persistedMarkdown = EmbedSynthesisCacheMetadata(outcome.executiveSummary, {
      fingerprint,
      keyTakeaways: outcome.keyTakeaways,
      openQuestions: outcome.openQuestions,
      contributorCitations: outcome.contributorCitations,
      consideredReplyCount: outcome.consideredReplyCount,
      modelUsed: outcome.modelUsed,
    });

    const saveFailure = await this.persistSummary(
      rootPostId,
      persistedMarkdown,
      outcome.synthesizedAt,
      replies.length,
      user,
    );
    if (saveFailure) return saveFailure;

    return this.buildSuccessResult({
      executiveSummary: outcome.executiveSummary,
      synthesizedAtIso: outcome.synthesizedAt.toISOString(),
      consideredReplyCount: outcome.consideredReplyCount,
      keyTakeaways: outcome.keyTakeaways,
      openQuestions: outcome.openQuestions,
      contributorCitations: outcome.contributorCitations,
      cacheHit: false,
      modelUsed: outcome.modelUsed,
      message: `Synthesized ${outcome.consideredReplyCount} repl(y/ies) via ${outcome.modelUsed}`,
    });
  }

  private buildSuccessResult(params: {
    executiveSummary: string;
    synthesizedAtIso: string;
    consideredReplyCount: number;
    keyTakeaways: string[];
    openQuestions: string[];
    contributorCitations: ThreadContributorCitation[];
    cacheHit: boolean;
    modelUsed: string;
    message: string;
  }): ActionResultSimple {
    const outputParams: ActionParam[] = [
      { Name: 'AIExecutiveSummary', Value: params.executiveSummary, Type: 'Output' },
      { Name: 'AISynthesizedAt', Value: params.synthesizedAtIso, Type: 'Output' },
      { Name: 'ConsideredReplyCount', Value: params.consideredReplyCount, Type: 'Output' },
      { Name: 'KeyTakeaways', Value: JSON.stringify(params.keyTakeaways), Type: 'Output' },
      { Name: 'OpenQuestions', Value: JSON.stringify(params.openQuestions), Type: 'Output' },
      { Name: 'ContributorCitations', Value: JSON.stringify(params.contributorCitations), Type: 'Output' },
      { Name: 'CacheHit', Value: params.cacheHit ? 'true' : 'false', Type: 'Output' },
      { Name: 'ModelUsed', Value: params.modelUsed, Type: 'Output' },
    ];
    return {
      Success: true,
      ResultCode: 'SUCCESS',
      Message: params.message,
      Params: outputParams,
    };
  }

  protected async findSynthesisPrompt(user: UserInfo): Promise<MJAIPromptEntityExtended | null> {
    try {
      await AIEngine.Instance.Config(false, user);
      const prompts = AIEngine.Instance.Prompts ?? [];
      const exact = prompts.find(
        (p) =>
          p.Name.trim().toLowerCase() === COMMUNITY_LIVING_SYNTHESIS_PROMPT_NAME.toLowerCase() &&
          p.Category?.trim().toLowerCase() === COMMUNITY_LIVING_SYNTHESIS_PROMPT_CATEGORY.toLowerCase(),
      );
      if (exact) return exact;
      return (
        prompts.find((p) => p.Name.trim().toLowerCase() === COMMUNITY_LIVING_SYNTHESIS_PROMPT_NAME.toLowerCase()) ??
        null
      );
    } catch {
      return null;
    }
  }

  protected async executeSynthesisPrompt(
    promptParams: AIPromptParams,
  ): Promise<{ success: boolean; result?: LLMLivingThreadSynthesisResponse | null; modelName?: string | null }> {
    const runner = new AIPromptRunner();
    const res = await runner.ExecutePrompt<LLMLivingThreadSynthesisResponse>(promptParams);
    return {
      success: Boolean(res?.success),
      result: res?.result ?? null,
      modelName: res?.modelSelectionInfo?.modelSelected?.Name ?? null,
    };
  }

  private async tryRunAIPromptSynthesis(input: {
    rootTitle: string | null;
    rootBodyMarkdown: string;
    replies: ReadonlyArray<ThreadPostForSynthesis>;
    maxReplyCount: number;
    maxCharsPerPost: number;
    params: RunActionParams;
    user: UserInfo;
  }): Promise<SynthesizedOutcome | null> {
    const prompt = await this.findSynthesisPrompt(input.user);
    if (!prompt) {
      return null;
    }

    const consideredReplies = input.replies.slice(0, input.maxReplyCount);
    const contributorCitations = BuildContributorCitationsForPrompt(consideredReplies);
    const promptReplies = consideredReplies.map((reply, idx) => ({
      citationIndex: idx + 1,
      authorDisplayName: reply.authorDisplayName,
      roleLabel: contributorCitations[idx]?.roleLabel ?? 'Contributor',
      postId: reply.postId ?? null,
      bodyMarkdown: truncateForPrompt(reply.bodyMarkdown, Math.max(input.maxCharsPerPost, 800)),
    }));

    const promptParams = new AIPromptParams();
    promptParams.prompt = prompt;
    promptParams.data = {
      rootTitle: input.rootTitle ?? 'Untitled Thread',
      rootBodyMarkdown: truncateForPrompt(input.rootBodyMarkdown, Math.max(input.maxCharsPerPost * 3, 2400)),
      replyCount: consideredReplies.length,
      replies: promptReplies,
    };
    promptParams.contextUser = input.user;
    promptParams.CredentialScope = input.params.CredentialScope;
    promptParams.cleanValidationSyntax = true;
    promptParams.attemptJSONRepair = true;

    try {
      const promptResult = await this.executeSynthesisPrompt(promptParams);
      if (!promptResult.success || !promptResult.result) {
        return null;
      }
      const normalized = NormalizeLLMSynthesisOutput({
        raw: promptResult.result,
        contributorCitations,
      });
      if (!normalized) {
        return null;
      }
      return {
        executiveSummary: normalized.executiveSummary,
        keyTakeaways: normalized.keyTakeaways,
        openQuestions: normalized.openQuestions,
        contributorCitations,
        consideredReplyCount: consideredReplies.length,
        synthesizedAt: new Date(),
        modelUsed: promptResult.modelName?.trim() || 'Gemini 3.5 Flash-Lite',
      };
    } catch {
      return null;
    }
  }

  private runDeterministicFallback(input: {
    rootTitle: string | null;
    rootBodyMarkdown: string;
    replies: ReadonlyArray<ThreadPostForSynthesis>;
    maxReplyCount: number;
    maxCharsPerPost: number;
  }): SynthesizedOutcome {
    const fallback = SynthesizeLivingThread({
      rootTitle: input.rootTitle,
      rootBodyMarkdown: input.rootBodyMarkdown,
      replies: input.replies,
      maxReplyCount: input.maxReplyCount,
      maxCharsPerPost: input.maxCharsPerPost,
    });
    return {
      executiveSummary: fallback.aiExecutiveSummary,
      keyTakeaways: fallback.keyTakeaways,
      openQuestions: fallback.openQuestions,
      contributorCitations: fallback.contributorCitations,
      consideredReplyCount: fallback.consideredReplyCount,
      synthesizedAt: fallback.aiSynthesizedAt,
      modelUsed: 'Deterministic',
    };
  }

  /** Persists the regenerated summary onto the root Forum Post so future reads see it without re-synthesizing. */
  private async persistSummary(
    rootPostId: string,
    summaryMarkdown: string,
    synthesizedAt: Date,
    replyWatermark: number,
    user: UserInfo,
  ): Promise<ActionResultSimple | null> {
    const post = await new Metadata().GetEntityObject<mjBizAppsCommunityForumPostEntity>(
      COMMUNITY_ENTITY_NAMES.ForumPosts,
      CompositeKey.FromID(rootPostId),
      user,
    );
    if (!post) {
      return fail('ROOT_POST_NOT_FOUND', `Forum Post ${rootPostId} could not be loaded for summary persistence.`);
    }
    post.SummaryMarkdown = summaryMarkdown;
    post.SummaryGeneratedAt = synthesizedAt;
    post.SummaryReplyWatermark = replyWatermark;
    return SaveOrFail(post, 'SAVE_FAILED', `Failed to persist the synthesized summary onto Forum Post ${rootPostId}.`);
  }

  private async loadRootAndReplies(
    rootPostId: string,
    acceptedAnswerPostId: string | null,
    user: UserInfo,
  ): Promise<{ root: RootPostRow | null; replies: ThreadPostForSynthesis[] }> {
    const rv = new RunView();
    type ThreadWaveRow = RootPostRow | ReplyRow | QuestionCanonRow;
    const waveResults = await rv.RunViews<ThreadWaveRow>(
      [
        {
          EntityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
          ExtraFilter: `ID = '${rootPostId}'`,
          Fields: ['ID', 'Title', 'BodyMarkdown', 'SummaryMarkdown', 'SummaryGeneratedAt', 'SummaryReplyWatermark'],
          ResultType: 'simple',
          MaxRows: 1,
        },
        {
          EntityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
          ExtraFilter: `RootPostID = '${rootPostId}'`,
          Fields: ['ID', 'BodyMarkdown', 'AuthorUserID', 'AuthorUser'],
          OrderBy: '__mj_CreatedAt ASC',
          ResultType: 'simple',
          MaxRows: 500,
        },
        {
          EntityName: COMMUNITY_ENTITY_NAMES.ForumQuestionPosts,
          ExtraFilter: `ID = '${rootPostId}'`,
          Fields: ['ID', 'AcceptedAnswerPostID', 'AICanonAnswerPostID'],
          ResultType: 'simple',
          MaxRows: 1,
        },
      ],
      user,
    );

    const rootRes = waveResults[0] as RunViewResult<RootPostRow> | undefined;
    const root = rootRes?.Success ? rootRes.Results?.[0] ?? null : null;
    if (!root) {
      return { root: null, replies: [] };
    }

    const repliesRes = waveResults[1] as RunViewResult<ReplyRow> | undefined;
    const rawReplies = repliesRes?.Success && repliesRes.Results ? repliesRes.Results : [];
    if (rawReplies.length === 0) {
      return { root, replies: [] };
    }

    const questionRes = waveResults[2] as RunViewResult<QuestionCanonRow> | undefined;
    const questionRow = questionRes?.Success ? questionRes.Results?.[0] ?? null : null;

    const replyIds = rawReplies.map((r) => r.ID);
    const answerMetaMap = await this.loadAnswerMetadata(replyIds, rv, user);

    const replies = rawReplies.map((row) => {
      const answerMeta = answerMetaMap.get(row.ID.toLowerCase());
      const matchesExplicitAccepted = acceptedAnswerPostId != null && UUIDsEqual(row.ID, acceptedAnswerPostId);
      const matchesQuestionAccepted =
        questionRow?.AcceptedAnswerPostID != null && UUIDsEqual(row.ID, questionRow.AcceptedAnswerPostID);
      const matchesQuestionCanon =
        questionRow?.AICanonAnswerPostID != null && UUIDsEqual(row.ID, questionRow.AICanonAnswerPostID);

      return {
        postId: row.ID,
        authorDisplayName: row.AuthorUser?.trim() || row.AuthorUserID || 'Community Member',
        bodyMarkdown: row.BodyMarkdown,
        isAccepted: Boolean(matchesExplicitAccepted || matchesQuestionAccepted || answerMeta?.IsAcceptedByAuthor),
        isVerified: Boolean(matchesQuestionCanon || answerMeta?.IsVerifiedByModerator || answerMeta?.AIEpistemicStatus === 'Canon Verified'),
        epistemicStatus: answerMeta?.AIEpistemicStatus ?? (matchesQuestionCanon ? 'Canon Verified' : null),
      };
    });

    return { root, replies };
  }

  private async loadAnswerMetadata(
    replyIds: string[],
    rv: RunView,
    user: UserInfo,
  ): Promise<Map<string, ReplyAnswerMetadataRow>> {
    const out = new Map<string, ReplyAnswerMetadataRow>();
    if (replyIds.length === 0) return out;
    try {
      const idFilter = replyIds.map((id) => `'${id}'`).join(',');
      const res = await rv.RunView<ReplyAnswerMetadataRow>(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.ForumAnswerPosts,
          ExtraFilter: `ID IN (${idFilter})`,
          Fields: ['ID', 'IsAcceptedByAuthor', 'IsVerifiedByModerator', 'AIEpistemicStatus'],
          ResultType: 'simple',
          MaxRows: 500,
        },
        user,
      );
      if (res?.Success && res.Results) {
        for (const row of res.Results) {
          out.set(row.ID.toLowerCase(), row);
        }
      }
    } catch {
      // Optional answer metadata enrichment.
    }
    return out;
  }
}

function fail(resultCode: string, message: string): ActionResultSimple {
  return { Success: false, ResultCode: resultCode, Message: message };
}
