import { RunView, type UserInfo } from '@memberjunction/core';
import { ActionParam, ActionResultSimple, RunActionParams } from '@memberjunction/actions-base';
import { BaseAction } from '@memberjunction/actions';
import { RegisterClass } from '@memberjunction/global';
import { ParseAllowedForumIDsParam } from './action-id-params.ts';
import {
  BuildCommunityDigestPDF,
  COMMUNITY_DIGEST_PDF_MAX_ITEMS,
  CommunityDigestItem,
} from './export-community-digest-pdf.ts';

interface DigestPostRow {
  ID: string;
  ForumID: string;
  Title: string | null;
  SummaryMarkdown: string | null;
  BodyMarkdown: string;
  AuthorUserID: string | null;
}

function paramValue(params: RunActionParams, name: string): string | null {
  const value = params.Params.find((p) => p.Name.toLowerCase() === name.toLowerCase())?.Value;
  return typeof value === 'string' && value.trim() ? value : null;
}

/**
 * Action: Community.ExportDigestPDF
 *
 * Renders a member's Community Digest as a real server-side PDF (`pdfkit`, never `window.print()`),
 * scoped to the forums supplied in `AllowedForumIDs` (the caller's own permission computation — this
 * action performs none of its own), hard-capped at {@link COMMUNITY_DIGEST_PDF_MAX_ITEMS} items.
 * Returns the PDF as a base64 string output parameter.
 */
@RegisterClass(BaseAction, 'Community.ExportDigestPDF')
export class ExportCommunityDigestPDFAction extends BaseAction {
  protected async InternalRunAction(params: RunActionParams): Promise<ActionResultSimple> {
    const user = params.ContextUser;
    if (!user) return fail('ERROR', 'ContextUser is required');

    const spaceName = paramValue(params, 'SpaceName');
    if (!spaceName) return fail('MISSING_SPACE_NAME', 'SpaceName is required');

    let allowedForumIDs: string[];
    try {
      allowedForumIDs = ParseAllowedForumIDsParam(paramValue(params, 'AllowedForumIDs'));
    } catch (err) {
      return fail('INVALID_FORUM_ID', err instanceof Error ? err.message : 'AllowedForumIDs is malformed');
    }

    const maxItemsRaw = paramValue(params, 'MaxItems');
    const maxItems = maxItemsRaw ? Number(maxItemsRaw) : COMMUNITY_DIGEST_PDF_MAX_ITEMS;

    const items = allowedForumIDs.length === 0 ? [] : await this.loadDigestItems(allowedForumIDs, user);

    const pdfBuffer = await BuildCommunityDigestPDF(items, {
      spaceName,
      maxItems: Number.isFinite(maxItems) ? maxItems : COMMUNITY_DIGEST_PDF_MAX_ITEMS,
    });

    const outputParams: ActionParam[] = [
      { Name: 'PDFBase64', Value: pdfBuffer.toString('base64'), Type: 'Output' },
      { Name: 'ItemCount', Value: Math.min(items.length, COMMUNITY_DIGEST_PDF_MAX_ITEMS), Type: 'Output' },
      { Name: 'ByteLength', Value: pdfBuffer.byteLength, Type: 'Output' },
    ];
    return {
      Success: true,
      ResultCode: 'SUCCESS',
      Message: `Generated a ${pdfBuffer.byteLength}-byte PDF digest covering ${Math.min(items.length, COMMUNITY_DIGEST_PDF_MAX_ITEMS)} item(s)`,
      Params: outputParams,
    };
  }

  private async loadDigestItems(
    allowedForumIDs: string[],
    user: UserInfo,
  ): Promise<CommunityDigestItem[]> {
    const forumFilter = allowedForumIDs.map((id) => `'${id}'`).join(',');
    const result = await new RunView().RunView<DigestPostRow>(
      {
        EntityName: 'MJ_BizApps_Community: Forum Posts',
        ExtraFilter: `ForumID IN (${forumFilter}) AND RootPostID IS NULL AND Status = 'Published'`,
        Fields: ['ID', 'ForumID', 'Title', 'SummaryMarkdown', 'BodyMarkdown', 'AuthorUserID'],
        OrderBy: 'LastActivityAt DESC',
        ResultType: 'simple',
        MaxRows: COMMUNITY_DIGEST_PDF_MAX_ITEMS,
      },
      user,
    );
    if (!result?.Success || !result.Results) return [];
    return result.Results.map((row) => ({
      forumSlug: row.ForumID,
      title: row.Title ?? 'Untitled Thread',
      authorDisplayName: row.AuthorUserID ?? 'Community Member',
      summary: row.SummaryMarkdown ?? row.BodyMarkdown,
    }));
  }
}

function fail(resultCode: string, message: string): ActionResultSimple {
  return { Success: false, ResultCode: resultCode, Message: message };
}
