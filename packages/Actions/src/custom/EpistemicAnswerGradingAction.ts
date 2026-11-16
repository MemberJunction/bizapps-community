import { ActionParam, ActionResultSimple, RunActionParams } from '@memberjunction/actions-base';
import { BaseAction } from '@memberjunction/actions';
import { RegisterClass } from '@memberjunction/global';
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

    const result = GradeEpistemicAnswer({
      questionBodyMarkdown,
      answerBodyMarkdown,
      priorCanonAnswerMarkdown: paramValue(params, 'PriorCanonAnswerMarkdown'),
    });

    return success(result);
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
