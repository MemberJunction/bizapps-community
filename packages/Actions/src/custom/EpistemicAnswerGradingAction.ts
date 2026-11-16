import { CompositeKey, Metadata, RunView, type UserInfo } from '@memberjunction/core';
import { ActionParam, ActionResultSimple, RunActionParams } from '@memberjunction/actions-base';
import { BaseAction } from '@memberjunction/actions';
import { RegisterClass } from '@memberjunction/global';
import { COMMUNITY_ENTITY_NAMES, type mjBizAppsCommunityForumAnswerPostEntity } from '@mj-biz-apps/community-entities';
import { ParseOptionalUUIDParam } from './action-id-params.ts';
import { SaveOrFail } from './save-or-fail.ts';
import { EpistemicGradingResult, ExtractAuthoritativeContent, GradeEpistemicAnswer, type PostBodyRow } from './epistemic-answer-grading.ts';

interface AnswerQuestionLinkRow {
  ID: string;
  QuestionPostID: string;
}

function paramValue(params: RunActionParams, name: string): string | null {
  const value = params.Params.find((p) => p.Name.toLowerCase() === name.toLowerCase())?.Value;
  return typeof value === 'string' && value.trim() ? value : null;
}

/**
 * Action: Community.EpistemicAnswerGrading
 *
 * Grades a Q&A answer against its question (and, when supplied, the forum's existing canon answer)
 * using the deterministic rubric in {@link GradeEpistemicAnswer} — no LLM call required. Writes
 * `AIEpistemicStatus`, `AIConfidenceScore`, and `AIRationaleMarkdown` on `ForumAnswerPost`, and sets
 * `VerificationStatus` to `'AI_Verified'` only at or above 0.85 confidence.
 */
@RegisterClass(BaseAction, 'Community.EpistemicAnswerGrading')
export class EpistemicAnswerGradingAction extends BaseAction {
  protected async InternalRunAction(params: RunActionParams): Promise<ActionResultSimple> {
    const user = params.ContextUser;
    if (!user) return fail('ERROR', 'ContextUser is required');

    let answerPostId: string | null;
    try {
      answerPostId = ParseOptionalUUIDParam(paramValue(params, 'AnswerPostID'), 'AnswerPostID');
    } catch (err) {
      return fail('INVALID_ANSWER_ID', err instanceof Error ? err.message : 'AnswerPostID is malformed');
    }

    // When AnswerPostID is supplied, the authoritative DB content wins; the inline markdown
    // params become optional overrides, used only when no DB record could be loaded for them.
    const authoritative = answerPostId ? await this.loadAuthoritativeContent(answerPostId, user) : null;
    const questionBodyMarkdown = authoritative?.questionBodyMarkdown ?? paramValue(params, 'QuestionBodyMarkdown');
    const answerBodyMarkdown = authoritative?.answerBodyMarkdown ?? paramValue(params, 'AnswerBodyMarkdown');
    if (!questionBodyMarkdown || !answerBodyMarkdown) {
      return fail('MISSING_CONTENT', 'QuestionBodyMarkdown and AnswerBodyMarkdown are required (directly, or loadable via AnswerPostID)');
    }

    const result = GradeEpistemicAnswer({
      questionBodyMarkdown,
      answerBodyMarkdown,
      priorCanonAnswerMarkdown: paramValue(params, 'PriorCanonAnswerMarkdown'),
    });

    if (answerPostId) {
      const saveFailure = await this.persistGrading(answerPostId, result, user);
      if (saveFailure) return saveFailure;
    }

    return success(result);
  }

  /** Loads the authoritative Question/Answer body markdown from the database, or null if no record is found. */
  private async loadAuthoritativeContent(
    answerPostId: string,
    user: UserInfo,
  ): Promise<{ questionBodyMarkdown: string; answerBodyMarkdown: string } | null> {
    const linkResult = await new RunView().RunView<AnswerQuestionLinkRow>(
      {
        EntityName: COMMUNITY_ENTITY_NAMES.ForumAnswerPosts,
        ExtraFilter: `ID = '${answerPostId}'`,
        Fields: ['ID', 'QuestionPostID'],
        ResultType: 'simple',
        MaxRows: 1,
      },
      user,
    );
    const link = linkResult?.Success ? linkResult.Results?.[0] : null;
    if (!link) return null;

    const postsResult = await new RunView().RunView<PostBodyRow>(
      {
        EntityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
        ExtraFilter: `ID IN ('${answerPostId}', '${link.QuestionPostID}')`,
        Fields: ['ID', 'BodyMarkdown'],
        ResultType: 'simple',
        MaxRows: 2,
      },
      user,
    );
    if (!postsResult?.Success || !postsResult.Results) return null;

    return ExtractAuthoritativeContent(answerPostId, link.QuestionPostID, postsResult.Results);
  }

  /** Persists the deterministic grading onto the Forum Answer Post. Returns a SAVE_FAILED action result if Save() fails, else null. */
  private async persistGrading(
    answerPostId: string,
    result: EpistemicGradingResult,
    user: UserInfo,
  ): Promise<ActionResultSimple | null> {
    const answer = await new Metadata().GetEntityObject<mjBizAppsCommunityForumAnswerPostEntity>(
      COMMUNITY_ENTITY_NAMES.ForumAnswerPosts,
      CompositeKey.FromID(answerPostId),
      user,
    );
    answer.AIEpistemicStatus = result.epistemicStatus;
    answer.AIConfidenceScore = result.confidenceScore;
    answer.AIRationaleMarkdown = result.rationaleMarkdown;
    // This schema has no dedicated VerificationStatus column; IsVerifiedByModerator is the real,
    // already-shipped field closest to "verified" — set alongside AIEpistemicStatus='Canon Verified'
    // (mirrors ApplyCanonPromotion's canon-marking convention in packages/Server/src/resolvers.ts).
    if (result.verificationStatus === 'AI_Verified') {
      answer.IsVerifiedByModerator = true;
    }
    return SaveOrFail(answer, 'SAVE_FAILED', `Failed to persist the grading onto Forum Answer Post ${answerPostId}.`);
  }
}

function success(result: EpistemicGradingResult): ActionResultSimple {
  const outputParams: ActionParam[] = [
    { Name: 'ConfidenceScore', Value: result.confidenceScore, Type: 'Output' },
    { Name: 'EpistemicStatus', Value: result.epistemicStatus, Type: 'Output' },
    { Name: 'VerificationStatus', Value: result.verificationStatus, Type: 'Output' },
    { Name: 'CitationReferences', Value: JSON.stringify(result.citationReferences), Type: 'Output' },
    { Name: 'RationaleMarkdown', Value: result.rationaleMarkdown, Type: 'Output' },
  ];
  return {
    Success: true,
    ResultCode: 'SUCCESS',
    Message: `Graded with confidence ${result.confidenceScore} (${result.verificationStatus})`,
    Params: outputParams,
  };
}

function fail(resultCode: string, message: string): ActionResultSimple {
  return { Success: false, ResultCode: resultCode, Message: message };
}
