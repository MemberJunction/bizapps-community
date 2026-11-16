import { CompositeKey, Metadata, type UserInfo } from '@memberjunction/core';
import { ActionParam, ActionResultSimple, RunActionParams } from '@memberjunction/actions-base';
import { BaseAction } from '@memberjunction/actions';
import { RegisterClass } from '@memberjunction/global';
import { COMMUNITY_ENTITY_NAMES, type mjBizAppsCommunityForumAnswerPostEntity } from '@mj-biz-apps/community-entities';
import { ParseOptionalUUIDParam } from './action-id-params.ts';
import { EpistemicGradingResult, GradeEpistemicAnswer } from './epistemic-answer-grading.ts';

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

    const questionBodyMarkdown = paramValue(params, 'QuestionBodyMarkdown');
    const answerBodyMarkdown = paramValue(params, 'AnswerBodyMarkdown');
    if (!questionBodyMarkdown || !answerBodyMarkdown) {
      return fail('MISSING_CONTENT', 'QuestionBodyMarkdown and AnswerBodyMarkdown are required');
    }

    let answerPostId: string | null;
    try {
      answerPostId = ParseOptionalUUIDParam(paramValue(params, 'AnswerPostID'), 'AnswerPostID');
    } catch (err) {
      return fail('INVALID_ANSWER_ID', err instanceof Error ? err.message : 'AnswerPostID is malformed');
    }

    const result = GradeEpistemicAnswer({
      questionBodyMarkdown,
      answerBodyMarkdown,
      priorCanonAnswerMarkdown: paramValue(params, 'PriorCanonAnswerMarkdown'),
    });

    if (answerPostId) {
      await this.persistGrading(answerPostId, result, user);
    }

    return success(result);
  }

  /** Persists the deterministic grading onto the Forum Answer Post so future reads see it without re-grading. */
  private async persistGrading(answerPostId: string, result: EpistemicGradingResult, user: UserInfo): Promise<void> {
    const answer = await new Metadata().GetEntityObject<mjBizAppsCommunityForumAnswerPostEntity>(
      COMMUNITY_ENTITY_NAMES.ForumAnswerPosts,
      CompositeKey.FromID(answerPostId),
      user,
    );
    answer.AIEpistemicStatus = result.epistemicStatus;
    answer.AIConfidenceScore = result.confidenceScore;
    answer.AIRationaleMarkdown = result.rationaleMarkdown;
    await answer.Save();
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
