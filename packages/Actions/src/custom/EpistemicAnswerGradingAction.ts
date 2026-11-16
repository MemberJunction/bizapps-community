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

interface QuestionCanonLinkRow {
  ID: string;
  AICanonAnswerPostID: string | null;
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

    let questionBodyMarkdown: string | null;
    let answerBodyMarkdown: string | null;
    let priorCanonAnswerMarkdown: string | null;

    if (answerPostId) {
      // Persistence mode: the authoritative DB content is the ONLY source of truth. A failed or
      // incomplete load fails CLOSED — it never silently falls back to caller-supplied markdown
      // (which could be used to make the persisted grading diverge from what is actually in the
      // database) and never reaches persistGrading.
      const authoritative = await this.loadAuthoritativeContent(answerPostId, user);
      if (!authoritative) {
        return fail('AUTHORITATIVE_LOAD_FAILED', `Could not load the authoritative Question/Answer content for AnswerPostID ${answerPostId}.`);
      }
      questionBodyMarkdown = authoritative.questionBodyMarkdown;
      answerBodyMarkdown = authoritative.answerBodyMarkdown;
      // The question's own existing canon answer (AICanonAnswerPostID), not a caller-supplied
      // value, is the authoritative prior-canon comparison once persistence is in play.
      priorCanonAnswerMarkdown = authoritative.priorCanonAnswerMarkdown;
    } else {
      questionBodyMarkdown = paramValue(params, 'QuestionBodyMarkdown');
      answerBodyMarkdown = paramValue(params, 'AnswerBodyMarkdown');
      priorCanonAnswerMarkdown = paramValue(params, 'PriorCanonAnswerMarkdown');
      if (!questionBodyMarkdown || !answerBodyMarkdown) {
        return fail('MISSING_CONTENT', 'QuestionBodyMarkdown and AnswerBodyMarkdown are required when AnswerPostID is not supplied.');
      }
    }

    const result = GradeEpistemicAnswer({ questionBodyMarkdown, answerBodyMarkdown, priorCanonAnswerMarkdown });

    if (answerPostId) {
      const saveFailure = await this.persistGrading(answerPostId, result, user);
      if (saveFailure) return saveFailure;
    }

    return success(result);
  }

  /** Loads the authoritative Question/Answer body markdown (and the question's existing canon
   * answer, if any) from the database, or null if any required record could not be loaded. */
  private async loadAuthoritativeContent(
    answerPostId: string,
    user: UserInfo,
  ): Promise<{ questionBodyMarkdown: string; answerBodyMarkdown: string; priorCanonAnswerMarkdown: string | null } | null> {
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

    const [postsResult, questionCanonResult] = await Promise.all([
      new RunView().RunView<PostBodyRow>(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
          ExtraFilter: `ID IN ('${answerPostId}', '${link.QuestionPostID}')`,
          Fields: ['ID', 'BodyMarkdown'],
          ResultType: 'simple',
          MaxRows: 2,
        },
        user,
      ),
      new RunView().RunView<QuestionCanonLinkRow>(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.ForumQuestionPosts,
          ExtraFilter: `ID = '${link.QuestionPostID}'`,
          Fields: ['ID', 'AICanonAnswerPostID'],
          ResultType: 'simple',
          MaxRows: 1,
        },
        user,
      ),
    ]);
    if (!postsResult?.Success || !postsResult.Results) return null;

    const content = ExtractAuthoritativeContent(answerPostId, link.QuestionPostID, postsResult.Results);
    if (!content) return null;

    const canonAnswerPostId = questionCanonResult?.Success ? questionCanonResult.Results?.[0]?.AICanonAnswerPostID : null;
    let priorCanonAnswerMarkdown: string | null = null;
    if (canonAnswerPostId) {
      const canonResult = await new RunView().RunView<PostBodyRow>(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
          ExtraFilter: `ID = '${canonAnswerPostId}'`,
          Fields: ['ID', 'BodyMarkdown'],
          ResultType: 'simple',
          MaxRows: 1,
        },
        user,
      );
      priorCanonAnswerMarkdown = canonResult?.Success ? canonResult.Results?.[0]?.BodyMarkdown ?? null : null;
    }

    return { ...content, priorCanonAnswerMarkdown };
  }

  /** Persists the deterministic AI grading onto the Forum Answer Post. Returns a SAVE_FAILED action
   * result if Save() fails, else null. Only AI-owned fields are written — IsVerifiedByModerator is
   * a HUMAN moderator's field (set via moderation review, not AI grading) and is never touched here. */
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
