import { CompositeKey, Metadata, RunView, type UserInfo } from '@memberjunction/core';
import { ActionParam, ActionResultSimple, RunActionParams } from '@memberjunction/actions-base';
import { BaseAction } from '@memberjunction/actions';
import { RegisterClass, UUIDsEqual } from '@memberjunction/global';
import type { EpistemicAnswerStatus } from '@mj-biz-apps/community-core';
import { COMMUNITY_ENTITY_NAMES, type mjBizAppsCommunityForumPostEntity } from '@mj-biz-apps/community-entities';
import { ParseOptionalUUIDParam, ParseRequiredUUIDParam } from './action-id-params.ts';
import { SaveOrFail } from './save-or-fail.ts';
import { SynthesizeLivingThread, ThreadPostForSynthesis } from './living-thread-synthesis.ts';

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

function paramValue(params: RunActionParams, name: string): string | null {
  const value = params.Params.find((p) => p.Name.toLowerCase() === name.toLowerCase())?.Value;
  if (typeof value === 'number') return String(value);
  return typeof value === 'string' && value.trim() ? value : null;
}

/**
 * Action: Community.LivingThreadSynthesis
 *
 * Regenerates a root post's `SummaryMarkdown` (`AIExecutiveSummary`) and `SummaryGeneratedAt`
 * (`AISynthesizedAt`) via the deterministic, bounded-input synthesis in
 * {@link SynthesizeLivingThread} — emitting Key Takeaways, Open Questions, and Contributor
 * Attribution with inline citations, no LLM call required.
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

    const root = await this.loadRootPost(rootPostId, user);
    if (!root) return fail('ROOT_POST_NOT_FOUND', `No post found with ID ${rootPostId}`);

    const replies = await this.loadReplies(rootPostId, acceptedAnswerPostId, user);

    const result = SynthesizeLivingThread({
      rootTitle: root.Title,
      rootBodyMarkdown: root.BodyMarkdown,
      replies,
      maxReplyCount: maxReplyCountRaw ? Number(maxReplyCountRaw) : undefined,
      maxCharsPerPost: maxCharsPerPostRaw ? Number(maxCharsPerPostRaw) : undefined,
    });

    const saveFailure = await this.persistSummary(rootPostId, result.aiExecutiveSummary, result.aiSynthesizedAt, replies.length, user);
    if (saveFailure) return saveFailure;

    const outputParams: ActionParam[] = [
      { Name: 'AIExecutiveSummary', Value: result.aiExecutiveSummary, Type: 'Output' },
      { Name: 'AISynthesizedAt', Value: result.aiSynthesizedAt.toISOString(), Type: 'Output' },
      { Name: 'ConsideredReplyCount', Value: result.consideredReplyCount, Type: 'Output' },
      { Name: 'KeyTakeaways', Value: JSON.stringify(result.keyTakeaways), Type: 'Output' },
      { Name: 'OpenQuestions', Value: JSON.stringify(result.openQuestions), Type: 'Output' },
      { Name: 'ContributorCitations', Value: JSON.stringify(result.contributorCitations), Type: 'Output' },
    ];
    return {
      Success: true,
      ResultCode: 'SUCCESS',
      Message: `Synthesized ${result.consideredReplyCount} repl(y/ies)`,
      Params: outputParams,
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

  private async loadRootPost(rootPostId: string, user: UserInfo): Promise<RootPostRow | null> {
    const result = await new RunView().RunView<RootPostRow>(
      {
        EntityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
        ExtraFilter: `ID = '${rootPostId}'`,
        Fields: ['ID', 'Title', 'BodyMarkdown'],
        ResultType: 'simple',
        MaxRows: 1,
      },
      user,
    );
    return result?.Success ? result.Results?.[0] ?? null : null;
  }

  private async loadReplies(
    rootPostId: string,
    acceptedAnswerPostId: string | null,
    user: UserInfo,
  ): Promise<ThreadPostForSynthesis[]> {
    const result = await new RunView().RunView<ReplyRow>(
      {
        EntityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
        ExtraFilter: `RootPostID = '${rootPostId}'`,
        Fields: ['ID', 'BodyMarkdown', 'AuthorUserID', 'AuthorUser'],
        OrderBy: '__mj_CreatedAt ASC',
        ResultType: 'simple',
        MaxRows: 500,
      },
      user,
    );
    if (!result?.Success || !result.Results || result.Results.length === 0) return [];

    const replyIds = result.Results.map((r) => r.ID);
    const [answerMetaMap, questionRow] = await Promise.all([
      this.loadAnswerMetadata(replyIds, user),
      this.loadQuestionCanonRow(rootPostId, user),
    ]);

    return result.Results.map((row) => {
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
  }

  private async loadAnswerMetadata(
    replyIds: string[],
    user: UserInfo,
  ): Promise<Map<string, ReplyAnswerMetadataRow>> {
    const out = new Map<string, ReplyAnswerMetadataRow>();
    if (replyIds.length === 0) return out;
    try {
      const idFilter = replyIds.map((id) => `'${id}'`).join(',');
      const res = await new RunView().RunView<ReplyAnswerMetadataRow>(
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

  private async loadQuestionCanonRow(rootPostId: string, user: UserInfo): Promise<QuestionCanonRow | null> {
    try {
      const res = await new RunView().RunView<QuestionCanonRow>(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.ForumQuestionPosts,
          ExtraFilter: `ID = '${rootPostId}'`,
          Fields: ['ID', 'AcceptedAnswerPostID', 'AICanonAnswerPostID'],
          ResultType: 'simple',
          MaxRows: 1,
        },
        user,
      );
      return res?.Success ? res.Results?.[0] ?? null : null;
    } catch {
      return null;
    }
  }
}

function fail(resultCode: string, message: string): ActionResultSimple {
  return { Success: false, ResultCode: resultCode, Message: message };
}
