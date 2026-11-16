import { RunView, type UserInfo } from '@memberjunction/core';
import { ActionParam, ActionResultSimple, RunActionParams } from '@memberjunction/actions-base';
import { BaseAction } from '@memberjunction/actions';
import { RegisterClass } from '@memberjunction/global';
import type { EpistemicAnswerStatus } from '@mj-biz-apps/community-core';
import { AskFirstCandidate, ComputeAskFirstDeflection } from './ask-first-deflection.ts';
import type { AskFirstDeflectionResult } from '../index.ts';

interface AnswerCandidateRow {
  ID: string;
  ForumID: string;
  Title: string | null;
  BodyMarkdown: string;
  AIEpistemicStatus: EpistemicAnswerStatus | null;
  AuthorUserID: string | null;
}

function paramValue(params: RunActionParams, name: string): string | null {
  const value = params.Params.find((p) => p.Name.toLowerCase() === name.toLowerCase())?.Value;
  return typeof value === 'string' && value.trim() ? value : null;
}

/**
 * Action: Community.AskFirstDeflection
 *
 * Pre-submission search deflection: before a member posts a new Question, searches already-solved
 * Q&A answers (`MJ_BizApps_Community: Forum Answer Posts`) across the forums they may read
 * (`AllowedForumIDs`, supplied by the caller — this action performs no permission computation of its
 * own), and deterministically scores the best match (see `ComputeAskFirstDeflection`). If the vector
 * store or an AI synthesis step is layered on in the future, it extends this result; absent one, the
 * deterministic keyword-overlap match IS the graceful fallback.
 */
@RegisterClass(BaseAction, 'Community.AskFirstDeflection')
export class AskFirstDeflectionAction extends BaseAction {
  protected async InternalRunAction(params: RunActionParams): Promise<ActionResultSimple> {
    const user = params.ContextUser;
    if (!user) return fail('ERROR', 'ContextUser is required');

    const queryText = paramValue(params, 'QueryText');
    if (!queryText) return fail('MISSING_QUERY', 'QueryText is required');

    const allowedForumIDsRaw = paramValue(params, 'AllowedForumIDs');
    const allowedForumIDs = (allowedForumIDsRaw ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
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

    const result = ComputeAskFirstDeflection(queryText, candidates, {
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
      const result = await new RunView().RunView<AnswerCandidateRow>(
        {
          EntityName: 'MJ_BizApps_Community: Forum Answer Posts',
          ExtraFilter: `ForumID IN (${forumFilter})`,
          Fields: ['ID', 'ForumID', 'Title', 'BodyMarkdown', 'AIEpistemicStatus', 'AuthorUserID'],
          ResultType: 'simple',
          MaxRows: 200,
        },
        user,
      );
      if (!result?.Success || !result.Results) {
        return [];
      }
      return result.Results.map((row) => ({
        postId: row.ID,
        forumSlug: row.ForumID,
        title: row.Title ?? 'Community Answer',
        authorDisplayName: row.AuthorUserID ?? 'Community Member',
        bodyMarkdown: row.BodyMarkdown,
        epistemicStatus: row.AIEpistemicStatus,
      }));
    } catch {
      // The vector/AI-assisted path is not wired yet; a RunView failure (unavailable service,
      // network error) degrades to "nothing found" rather than failing the member's post attempt.
      return [];
    }
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
