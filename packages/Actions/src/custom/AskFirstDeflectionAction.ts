import { RunView, type UserInfo } from '@memberjunction/core';
import { ActionParam, ActionResultSimple, RunActionParams } from '@memberjunction/actions-base';
import { BaseAction } from '@memberjunction/actions';
import { RegisterClass } from '@memberjunction/global';
import type { EpistemicAnswerStatus } from '@mj-biz-apps/community-core';
import { COMMUNITY_ENTITY_NAMES } from '@mj-biz-apps/community-entities';
import { ParseAllowedForumIDsParam } from './action-id-params.ts';
import { AskFirstCandidate, ComputeSemanticAskFirstDeflection } from './ask-first-deflection.ts';
import type { AskFirstDeflectionResult } from '../index.ts';

interface ForumRow {
  ID: string;
  Slug: string;
}

interface ForumPostCandidateRow {
  ID: string;
  ForumID: string;
  RootPostID: string | null;
  ParentPostID: string | null;
  Title: string | null;
  BodyMarkdown: string;
  SummaryMarkdown: string | null;
  AuthorUserID: string | null;
  AuthorUser?: string | null;
}

interface AnswerMetadataRow {
  ID: string;
  QuestionPostID: string;
  IsAcceptedByAuthor: boolean;
  IsVerifiedByModerator: boolean;
  AIEpistemicStatus: EpistemicAnswerStatus | null;
}

interface QuestionLookupRow {
  ID: string;
  AcceptedAnswerPostID: string | null;
  AICanonAnswerPostID: string | null;
}

interface PostTagJoinRow {
  PostID: string;
  TopicTagID: string;
}

interface TopicTagRow {
  ID: string;
  Name: string;
}

function paramValue(params: RunActionParams, name: string): string | null {
  const value = params.Params.find((p) => p.Name.toLowerCase() === name.toLowerCase())?.Value;
  if (typeof value === 'number') return String(value);
  return typeof value === 'string' && value.trim() ? value : null;
}

/**
 * Action: Community.AskFirstDeflection
 *
 * Pre-submission search deflection: before a member posts a new Question, searches already-solved
 * Q&A answers (`MJ_BizApps_Community: Forum Answer Posts` joined with `Forum Posts`) and Living
 * Documents across the forums they may read (`AllowedForumIDs`, supplied by the caller — this
 * action performs no permission computation of its own). Fuses semantic embedding cosine similarity
 * from `CommunityEmbeddingPersonalizationService` with lexical/tag overlap and epistemic canon
 * boosts (`Verified > Accepted > Unverified`), declining to deflect below `MinConfidence`.
 */
@RegisterClass(BaseAction, 'Community.AskFirstDeflection')
export class AskFirstDeflectionAction extends BaseAction {
  protected async InternalRunAction(params: RunActionParams): Promise<ActionResultSimple> {
    const user = params.ContextUser;
    if (!user) return fail('ERROR', 'ContextUser is required');

    const queryText = paramValue(params, 'QueryText');
    if (!queryText) return fail('MISSING_QUERY', 'QueryText is required');

    let allowedForumIDs: string[];
    try {
      allowedForumIDs = ParseAllowedForumIDsParam(paramValue(params, 'AllowedForumIDs'));
    } catch (err) {
      return fail('INVALID_FORUM_ID', err instanceof Error ? err.message : 'AllowedForumIDs is malformed');
    }
    if (allowedForumIDs.length === 0) {
      return success({
        deflected: false,
        confidenceScore: 0,
        synthesizedAnswerMarkdown: null,
        citations: [],
        suggestedPostTypeCode: 'question',
        suggestedTitle: queryText.trim().slice(0, 300),
        suggestedTagSlugs: [],
      });
    }

    const candidates = await this.loadCandidates(allowedForumIDs, user);
    const maxCitations = Number(paramValue(params, 'MaxCitations') ?? '3');
    const minConfidence = Number(paramValue(params, 'MinConfidence') ?? '0.35');

    const result = await ComputeSemanticAskFirstDeflection(queryText, candidates, {
      maxCitations: Number.isFinite(maxCitations) ? maxCitations : 3,
      minConfidence: Number.isFinite(minConfidence) ? minConfidence : 0.35,
    });

    return success(result);
  }

  private async loadCandidates(
    allowedForumIDs: string[],
    user: UserInfo,
  ): Promise<AskFirstCandidate[]> {
    const forumFilter = allowedForumIDs.map((id) => `'${id}'`).join(',');
    try {
      const [forumsRes, postsRes] = await Promise.all([
        new RunView().RunView<ForumRow>(
          {
            EntityName: COMMUNITY_ENTITY_NAMES.Forums,
            ExtraFilter: `ID IN (${forumFilter})`,
            Fields: ['ID', 'Slug'],
            ResultType: 'simple',
            MaxRows: 200,
          },
          user,
        ),
        new RunView().RunView<ForumPostCandidateRow>(
          {
            EntityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
            ExtraFilter: `ForumID IN (${forumFilter}) AND Status IN ('Published', 'Answered', 'Resolved')`,
            Fields: [
              'ID',
              'ForumID',
              'RootPostID',
              'ParentPostID',
              'Title',
              'BodyMarkdown',
              'SummaryMarkdown',
              'AuthorUserID',
              'AuthorUser',
            ],
            OrderBy: 'LastActivityAt DESC',
            ResultType: 'simple',
            MaxRows: 200,
          },
          user,
        ),
      ]);

      const forumSlugById = new Map<string, string>(
        (forumsRes?.Success && forumsRes.Results ? forumsRes.Results : []).map((f) => [f.ID.toLowerCase(), f.Slug]),
      );

      const posts = postsRes?.Success && postsRes.Results ? postsRes.Results : [];
      if (posts.length === 0) {
        return [];
      }

      const postById = new Map<string, ForumPostCandidateRow>(posts.map((p) => [p.ID.toLowerCase(), p]));
      const postIds = posts.map((p) => p.ID);
      const idFilter = postIds.map((id) => `'${id}'`).join(',');

      const [answersRes, questionsRes, tagsByPostId] = await Promise.all([
        new RunView().RunView<AnswerMetadataRow>(
          {
            EntityName: COMMUNITY_ENTITY_NAMES.ForumAnswerPosts,
            ExtraFilter: `ID IN (${idFilter})`,
            Fields: ['ID', 'QuestionPostID', 'IsAcceptedByAuthor', 'IsVerifiedByModerator', 'AIEpistemicStatus'],
            ResultType: 'simple',
            MaxRows: 200,
          },
          user,
        ),
        new RunView().RunView<QuestionLookupRow>(
          {
            EntityName: COMMUNITY_ENTITY_NAMES.ForumQuestionPosts,
            ExtraFilter: `ID IN (${idFilter})`,
            Fields: ['ID', 'AcceptedAnswerPostID', 'AICanonAnswerPostID'],
            ResultType: 'simple',
            MaxRows: 200,
          },
          user,
        ),
        this.loadPostTags(postIds, user),
      ]);

      const answerMetaById = new Map<string, AnswerMetadataRow>(
        (answersRes?.Success && answersRes.Results ? answersRes.Results : []).map((a) => [a.ID.toLowerCase(), a]),
      );
      const canonAnswerIds = new Set<string>();
      const acceptedAnswerIds = new Set<string>();
      for (const q of questionsRes?.Success && questionsRes.Results ? questionsRes.Results : []) {
        if (q.AICanonAnswerPostID) canonAnswerIds.add(q.AICanonAnswerPostID.toLowerCase());
        if (q.AcceptedAnswerPostID) acceptedAnswerIds.add(q.AcceptedAnswerPostID.toLowerCase());
      }

      const candidates: AskFirstCandidate[] = [];
      for (const post of posts) {
        const key = post.ID.toLowerCase();
        const answerMeta = answerMetaById.get(key);
        const isRootSummary = post.RootPostID === null && Boolean(post.SummaryMarkdown?.trim());

        if (!answerMeta && !isRootSummary) {
          continue;
        }

        const questionKey = answerMeta?.QuestionPostID?.toLowerCase() ?? post.RootPostID?.toLowerCase() ?? '';
        const questionPost = questionKey ? postById.get(questionKey) : undefined;
        const resolvedTitle = post.Title?.trim() || questionPost?.Title?.trim() || 'Community Answer';
        const postTags = tagsByPostId.get(key) ?? (questionKey ? tagsByPostId.get(questionKey) : undefined) ?? [];

        const isCanon = canonAnswerIds.has(key);
        const isAccepted = Boolean(answerMeta?.IsAcceptedByAuthor) || acceptedAnswerIds.has(key);
        const isVerified = Boolean(answerMeta?.IsVerifiedByModerator) || isCanon;
        const epistemicStatus: EpistemicAnswerStatus | null =
          answerMeta?.AIEpistemicStatus ?? (isCanon ? 'Canon Verified' : null);

        candidates.push({
          postId: post.ID,
          forumSlug: forumSlugById.get(post.ForumID.toLowerCase()) ?? post.ForumID,
          title: resolvedTitle,
          authorDisplayName: post.AuthorUser?.trim() || post.AuthorUserID || 'Community Member',
          bodyMarkdown: post.BodyMarkdown || post.SummaryMarkdown || '',
          epistemicStatus,
          topicTags: postTags,
          isAcceptedByAuthor: isAccepted,
          isVerifiedByModerator: isVerified,
        });
      }

      return candidates;
    } catch {
      // A RunView failure (unavailable service, network error) degrades cleanly to "nothing found"
      // rather than blocking the member from submitting their question.
      return [];
    }
  }

  private async loadPostTags(postIds: string[], user: UserInfo): Promise<Map<string, string[]>> {
    const out = new Map<string, string[]>();
    if (postIds.length === 0) return out;
    const idList = postIds.map((id) => `'${id}'`).join(',');
    try {
      const joinRes = await new RunView().RunView<PostTagJoinRow>(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.ForumPostTags,
          ExtraFilter: `PostID IN (${idList})`,
          Fields: ['PostID', 'TopicTagID'],
          ResultType: 'simple',
          MaxRows: 500,
        },
        user,
      );
      const joins = joinRes?.Success && joinRes.Results ? joinRes.Results : [];
      if (joins.length === 0) return out;

      const tagIds = Array.from(new Set(joins.map((j) => j.TopicTagID)));
      const tagRes = await new RunView().RunView<TopicTagRow>(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.ForumTopicTags,
          ExtraFilter: `ID IN (${tagIds.map((id) => `'${id}'`).join(',')})`,
          Fields: ['ID', 'Name'],
          ResultType: 'simple',
          MaxRows: 200,
        },
        user,
      );
      const tagNames = new Map<string, string>(
        (tagRes?.Success && tagRes.Results ? tagRes.Results : []).map((t) => [t.ID.toLowerCase(), t.Name]),
      );

      for (const join of joins) {
        const tagName = tagNames.get(join.TopicTagID.toLowerCase());
        if (!tagName) continue;
        const key = join.PostID.toLowerCase();
        const list = out.get(key) ?? [];
        if (!list.includes(tagName)) list.push(tagName);
        out.set(key, list);
      }
    } catch {
      // Optional tag enrichment.
    }
    return out;
  }
}

function success(result: AskFirstDeflectionResult): ActionResultSimple {
  const outputParams: ActionParam[] = [
    { Name: 'Deflected', Value: result.deflected, Type: 'Output' },
    { Name: 'ConfidenceScore', Value: result.confidenceScore, Type: 'Output' },
    { Name: 'SynthesizedAnswerMarkdown', Value: result.synthesizedAnswerMarkdown, Type: 'Output' },
    { Name: 'Citations', Value: JSON.stringify(result.citations), Type: 'Output' },
    { Name: 'SuggestedPostTypeCode', Value: result.suggestedPostTypeCode, Type: 'Output' },
    { Name: 'SuggestedTitle', Value: result.suggestedTitle, Type: 'Output' },
    { Name: 'SuggestedTagSlugs', Value: JSON.stringify(result.suggestedTagSlugs), Type: 'Output' },
  ];
  return {
    Success: true,
    ResultCode: result.deflected ? 'DEFLECTED' : 'NOT_DEFLECTED',
    Message: result.deflected
      ? `Deflected with confidence ${result.confidenceScore}`
      : 'No sufficiently confident match found',
    Params: outputParams,
  };
}

function fail(resultCode: string, message: string): ActionResultSimple {
  return { Success: false, ResultCode: resultCode, Message: message };
}
