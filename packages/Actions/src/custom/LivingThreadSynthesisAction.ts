import { CompositeKey, Metadata, RunView, type UserInfo } from '@memberjunction/core';
import { ActionParam, ActionResultSimple, RunActionParams } from '@memberjunction/actions-base';
import { BaseAction } from '@memberjunction/actions';
import { RegisterClass, UUIDsEqual } from '@memberjunction/global';
import { COMMUNITY_ENTITY_NAMES, type mjBizAppsCommunityForumPostEntity } from '@mj-biz-apps/community-entities';
import { ParseOptionalUUIDParam, ParseRequiredUUIDParam } from './action-id-params.ts';
import { SynthesizeLivingThread, ThreadPostForSynthesis } from './living-thread-synthesis.ts';

interface ReplyRow {
  ID: string;
  BodyMarkdown: string;
  AuthorUserID: string | null;
}

interface RootPostRow {
  ID: string;
  Title: string | null;
  BodyMarkdown: string;
}

function paramValue(params: RunActionParams, name: string): string | null {
  const value = params.Params.find((p) => p.Name.toLowerCase() === name.toLowerCase())?.Value;
  return typeof value === 'string' && value.trim() ? value : null;
}

/**
 * Action: Community.LivingThreadSynthesis
 *
 * Regenerates a root post's `SummaryMarkdown` (`AIExecutiveSummary`) and `SummaryGeneratedAt`
 * (`AISynthesizedAt`) via the deterministic, bounded-input synthesis in
 * {@link SynthesizeLivingThread} — no LLM call required.
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

    await this.persistSummary(rootPostId, result.aiExecutiveSummary, result.aiSynthesizedAt, replies.length, user);

    const outputParams: ActionParam[] = [
      { Name: 'AIExecutiveSummary', Value: result.aiExecutiveSummary, Type: 'Output' },
      { Name: 'AISynthesizedAt', Value: result.aiSynthesizedAt.toISOString(), Type: 'Output' },
      { Name: 'ConsideredReplyCount', Value: result.consideredReplyCount, Type: 'Output' },
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
  ): Promise<void> {
    const post = await new Metadata().GetEntityObject<mjBizAppsCommunityForumPostEntity>(
      COMMUNITY_ENTITY_NAMES.ForumPosts,
      CompositeKey.FromID(rootPostId),
      user,
    );
    post.SummaryMarkdown = summaryMarkdown;
    post.SummaryGeneratedAt = synthesizedAt;
    post.SummaryReplyWatermark = replyWatermark;
    await post.Save();
  }

  private async loadRootPost(rootPostId: string, user: UserInfo): Promise<RootPostRow | null> {
    const result = await new RunView().RunView<RootPostRow>(
      {
        EntityName: 'MJ_BizApps_Community: Forum Posts',
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
        EntityName: 'MJ_BizApps_Community: Forum Posts',
        ExtraFilter: `RootPostID = '${rootPostId}'`,
        Fields: ['ID', 'BodyMarkdown', 'AuthorUserID'],
        OrderBy: '__mj_CreatedAt ASC',
        ResultType: 'simple',
        MaxRows: 500,
      },
      user,
    );
    if (!result?.Success || !result.Results) return [];
    return result.Results.map((row) => ({
      authorDisplayName: row.AuthorUserID ?? 'Community Member',
      bodyMarkdown: row.BodyMarkdown,
      isAccepted: acceptedAnswerPostId != null && UUIDsEqual(row.ID, acceptedAnswerPostId),
    }));
  }
}

function fail(resultCode: string, message: string): ActionResultSimple {
  return { Success: false, ResultCode: resultCode, Message: message };
}
