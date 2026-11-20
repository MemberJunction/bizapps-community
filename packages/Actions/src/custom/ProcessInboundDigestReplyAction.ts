import { Metadata, RunView, type UserInfo } from '@memberjunction/core';
import { ActionParam, ActionResultSimple, RunActionParams } from '@memberjunction/actions-base';
import { BaseAction } from '@memberjunction/actions';
import { RegisterClass, UUIDsEqual } from '@memberjunction/global';
import {
  COMMUNITY_ENTITY_NAMES,
  type ForumPostingPolicy,
  type ForumStatus,
  type mjBizAppsCommunityForumPostEntity,
} from '@mj-biz-apps/community-entities';
import { CommunityEngineBase } from '@mj-biz-apps/community-engine-base';
import type { ForumVisibilityBand } from '@mj-biz-apps/community-core';
import { SaveOrFail } from './save-or-fail.ts';
import { ParseAndVerifyInboundEmailReply } from './digest-reply-loop.ts';

const DEFAULT_REPLY_POST_TYPE_ID = 'C8A17200-4E12-4B8F-9A10-100000000002';

interface AuthoritativeForumRow {
  ID: string;
  Name: string;
  Status: ForumStatus;
  PostingPolicy: ForumPostingPolicy;
  VisibilityBand: ForumVisibilityBand;
  InheritsSpaceMembers: boolean;
}

interface AuthoritativePostRow {
  ID: string;
  ForumID: string;
  RootPostID: string | null;
  ReplyDepth: number;
  VisibilityBand: 'Shared' | 'Team';
  Status: string;
  IsLocked: boolean;
}

interface AuthoritativeForumMemberRow {
  ID: string;
  ForumID: string;
  UserID: string;
  ForumRoleTypeID: string;
  Status: 'Active' | 'Invited' | 'Muted' | 'Removed';
}

interface AuthoritativeRoleTypeRow {
  ID: string;
  Name: string;
  CanConfigureForum: boolean;
  CanModerateQueue: boolean;
  CanReply: boolean;
}

interface PostTypeIdRow {
  ID: string;
  Code: string;
}

function paramValue(params: RunActionParams, name: string): string | null {
  const value = params.Params.find((p) => p.Name.toLowerCase() === name.toLowerCase())?.Value;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function parseBoolParam(raw: string | null, defaultValue: boolean): boolean {
  if (!raw) return defaultValue;
  const norm = raw.trim().toLowerCase();
  if (norm === 'true' || norm === '1' || norm === 'yes') return true;
  if (norm === 'false' || norm === '0' || norm === 'no') return false;
  return defaultValue;
}

/**
 * Action: Community.ProcessInboundDigestReply
 *
 * Inbound email reply-by-email loop:
 *  1. Cryptographically verifies the HMAC-SHA256 `Reply-To` token (fails closed on tampered,
 *     malformed, expired, or sender-mismatched tokens).
 *  2. Strips quoted email history and signature chrome via {@link ParseAndVerifyInboundEmailReply}.
 *  3. Enforces authoritative member binding (`ContextUser` == token member), forum status/policy,
 *     thread lock state, and current `ForumMember` / `ForumRoleType` posting permission.
 *  4. Persists the reply as a child `ForumPost` (`PostType = 'reply'`, `RootPostID`, `ParentPostID`,
 *     `ReplyDepth`).
 */
@RegisterClass(BaseAction, 'Community.ProcessInboundDigestReply')
export class ProcessInboundDigestReplyAction extends BaseAction {
  protected async InternalRunAction(params: RunActionParams): Promise<ActionResultSimple> {
    const user = params.ContextUser;
    if (!user) return fail('ERROR', 'ContextUser is required');

    const replyTarget = paramValue(params, 'ReplyToAddress') ?? paramValue(params, 'ReplyToken');
    if (!replyTarget) {
      return fail('MISSING_REPLY_TOKEN', 'ReplyToAddress or ReplyToken is required.');
    }

    const rawBodyText = paramValue(params, 'RawBodyText');
    if (!rawBodyText) {
      return fail('EMPTY_REPLY_BODY', 'RawBodyText is required.');
    }

    const senderEmail = paramValue(params, 'SenderEmail') ?? user.Email ?? null;
    const signingSecret = paramValue(params, 'ReplySigningSecret') ?? undefined;
    const skipSenderBindingCheck = parseBoolParam(paramValue(params, 'SkipSenderBindingCheck'), false);

    const parsed = ParseAndVerifyInboundEmailReply({
      replyToAddressOrToken: replyTarget,
      rawBodyText,
      senderEmail,
      signingSecret,
      skipSenderBindingCheck,
    });

    if (!parsed.token.valid) {
      return fail(parsed.token.errorCode, parsed.token.reason);
    }

    if (!parsed.cleanedBody) {
      return fail('EMPTY_REPLY_BODY', 'Email reply contained no new content after stripping quoted history.');
    }

    const { payload } = parsed.token;

    // Enforce server-side member identity binding: ContextUser must match the member bound in the signed token.
    if (!UUIDsEqual(user.ID, payload.u)) {
      return fail(
        'MEMBER_MISMATCH',
        'ContextUser does not match the member identity bound to this signed reply token.',
      );
    }

    const authCheck = await this.verifyAuthoritativeAccess(
      payload.f,
      payload.r,
      payload.p,
      payload.u,
      user,
    );
    if (!authCheck.allowed) {
      return fail(authCheck.errorCode, authCheck.reason);
    }

    const replyPostTypeId = await this.resolveReplyPostTypeId(user);
    const post = await new Metadata().GetEntityObject<mjBizAppsCommunityForumPostEntity>(
      COMMUNITY_ENTITY_NAMES.ForumPosts,
      user,
    );
    if (!post) {
      return fail('ENTITY_INIT_FAILED', 'Could not instantiate Forum Post entity.');
    }

    const targetStatus: mjBizAppsCommunityForumPostEntity['Status'] =
      authCheck.forum.PostingPolicy === 'Moderated' && !authCheck.isModerator
        ? 'PendingModeration'
        : 'Published';

    post.ForumID = authCheck.forum.ID;
    post.PostTypeID = replyPostTypeId;
    post.RootPostID = authCheck.rootPost.ID;
    post.ParentPostID = authCheck.parentPost.ID;
    post.ReplyDepth = authCheck.parentPost.ReplyDepth + 1;
    post.AuthorUserID = payload.u;
    post.BodyMarkdown = parsed.cleanedBody;
    post.VisibilityBand = authCheck.rootPost.VisibilityBand;
    post.Status = targetStatus;

    const saveFailure = await SaveOrFail(
      post,
      'SAVE_FAILED',
      'Failed to persist inbound email reply as a child Forum Post.',
    );
    if (saveFailure) return saveFailure;

    const outputParams: ActionParam[] = [
      { Name: 'PostID', Value: post.ID, Type: 'Output' },
      { Name: 'ForumID', Value: post.ForumID, Type: 'Output' },
      { Name: 'RootPostID', Value: post.RootPostID, Type: 'Output' },
      { Name: 'ParentPostID', Value: post.ParentPostID, Type: 'Output' },
      { Name: 'AuthorUserID', Value: post.AuthorUserID, Type: 'Output' },
      { Name: 'ReplyDepth', Value: post.ReplyDepth, Type: 'Output' },
      { Name: 'Status', Value: post.Status, Type: 'Output' },
      { Name: 'CleanedBodyMarkdown', Value: parsed.cleanedBody, Type: 'Output' },
    ];

    return {
      Success: true,
      ResultCode: 'SUCCESS',
      Message: `Persisted inbound email reply onto thread ${authCheck.rootPost.ID} (depth ${post.ReplyDepth}).`,
      Params: outputParams,
    };
  }

  private async verifyAuthoritativeAccess(
    forumId: string,
    rootPostId: string,
    parentPostId: string,
    memberUserId: string,
    user: UserInfo,
  ): Promise<
    | {
        allowed: true;
        forum: AuthoritativeForumRow;
        rootPost: AuthoritativePostRow;
        parentPost: AuthoritativePostRow;
        isModerator: boolean;
      }
    | { allowed: false; errorCode: string; reason: string }
  > {
    const [forumRes, rootRes, memberRes] = await Promise.all([
      new RunView().RunView<AuthoritativeForumRow>(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.Forums,
          ExtraFilter: `ID = '${forumId}'`,
          Fields: ['ID', 'Name', 'Status', 'PostingPolicy', 'VisibilityBand', 'InheritsSpaceMembers'],
          ResultType: 'simple',
          MaxRows: 1,
        },
        user,
      ),
      new RunView().RunView<AuthoritativePostRow>(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
          ExtraFilter: `ID = '${rootPostId}'`,
          Fields: ['ID', 'ForumID', 'RootPostID', 'ReplyDepth', 'VisibilityBand', 'Status', 'IsLocked'],
          ResultType: 'simple',
          MaxRows: 1,
        },
        user,
      ),
      new RunView().RunView<AuthoritativeForumMemberRow>(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.ForumMembers,
          ExtraFilter: `ForumID = '${forumId}' AND UserID = '${memberUserId}'`,
          Fields: ['ID', 'ForumID', 'UserID', 'ForumRoleTypeID', 'Status'],
          ResultType: 'simple',
          MaxRows: 1,
        },
        user,
      ),
    ]);

    if (!forumRes?.Success || !forumRes.Results?.[0]) {
      return { allowed: false, errorCode: 'FORUM_NOT_FOUND', reason: `Forum ${forumId} was not found.` };
    }
    const forum = forumRes.Results[0];
    if (forum.Status !== 'Active') {
      return {
        allowed: false,
        errorCode: 'FORUM_NOT_ACTIVE',
        reason: `Forum "${forum.Name}" has status "${forum.Status}" and does not accept replies.`,
      };
    }

    if (!rootRes?.Success || !rootRes.Results?.[0]) {
      return {
        allowed: false,
        errorCode: 'THREAD_NOT_FOUND',
        reason: `Root thread ${rootPostId} was not found.`,
      };
    }
    const rootPost = rootRes.Results[0];
    if (!UUIDsEqual(rootPost.ForumID, forum.ID)) {
      return {
        allowed: false,
        errorCode: 'THREAD_FORUM_MISMATCH',
        reason: 'Target thread does not belong to the Forum bound in the reply token.',
      };
    }
    if (rootPost.IsLocked) {
      return { allowed: false, errorCode: 'THREAD_LOCKED', reason: 'Cannot reply to a locked thread.' };
    }
    if (
      rootPost.Status === 'Draft' ||
      rootPost.Status === 'PendingModeration' ||
      rootPost.Status === 'Archived' ||
      rootPost.Status === 'Redacted'
    ) {
      return {
        allowed: false,
        errorCode: 'THREAD_NOT_ACTIVE',
        reason: `Target thread has status "${rootPost.Status}" and does not accept replies.`,
      };
    }

    let parentPost = rootPost;
    if (!UUIDsEqual(parentPostId, rootPostId)) {
      const parentRes = await new RunView().RunView<AuthoritativePostRow>(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
          ExtraFilter: `ID = '${parentPostId}'`,
          Fields: ['ID', 'ForumID', 'RootPostID', 'ReplyDepth', 'VisibilityBand', 'Status', 'IsLocked'],
          ResultType: 'simple',
          MaxRows: 1,
        },
        user,
      );
      if (!parentRes?.Success || !parentRes.Results?.[0]) {
        return {
          allowed: false,
          errorCode: 'THREAD_NOT_FOUND',
          reason: `Parent post ${parentPostId} was not found.`,
        };
      }
      parentPost = parentRes.Results[0];
      if (!UUIDsEqual(parentPost.ForumID, forum.ID) || !UUIDsEqual(parentPost.RootPostID, rootPost.ID)) {
        return {
          allowed: false,
          errorCode: 'THREAD_FORUM_MISMATCH',
          reason: 'Parent post does not belong to the Forum/RootPost bound in the reply token.',
        };
      }
      if (parentPost.IsLocked) {
        return { allowed: false, errorCode: 'THREAD_LOCKED', reason: 'Cannot reply to a locked post.' };
      }
    }

    if (!memberRes?.Success) {
      return {
        allowed: false,
        errorCode: 'AUTHORITATIVE_LOAD_FAILED',
        reason: 'Could not verify current forum membership status.',
      };
    }
    const member = memberRes.Results?.[0] ?? null;
    if (member && (member.Status === 'Muted' || member.Status === 'Removed')) {
      return {
        allowed: false,
        errorCode: 'ACCESS_REVOKED',
        reason: `Member status "${member.Status}" is not permitted to reply in this forum.`,
      };
    }
    if (!member && (!forum.InheritsSpaceMembers || forum.VisibilityBand === 'PrivateForum')) {
      return {
        allowed: false,
        errorCode: 'ACCESS_REVOKED',
        reason: 'Active ForumMember membership is required to reply in this forum.',
      };
    }

    let isModerator = false;
    if (member) {
      const roleFromEngine = CommunityEngineBase.Instance.GetForumRoleTypeById(member.ForumRoleTypeID);
      if (roleFromEngine) {
        if (!roleFromEngine.CanReply) {
          return {
            allowed: false,
            errorCode: 'ACCESS_REVOKED',
            reason: `Role "${roleFromEngine.Name}" does not permit replying in this forum.`,
          };
        }
        isModerator = Boolean(roleFromEngine.CanModerateQueue || roleFromEngine.CanConfigureForum);
      } else {
        const roleRes = await new RunView().RunView<AuthoritativeRoleTypeRow>(
          {
            EntityName: COMMUNITY_ENTITY_NAMES.ForumRoleTypes,
            ExtraFilter: `ID = '${member.ForumRoleTypeID}'`,
            Fields: ['ID', 'Name', 'CanConfigureForum', 'CanModerateQueue', 'CanReply'],
            ResultType: 'simple',
            MaxRows: 1,
          },
          user,
        );
        const role = roleRes?.Success ? roleRes.Results?.[0] : null;
        if (role) {
          if (!role.CanReply) {
            return {
              allowed: false,
              errorCode: 'ACCESS_REVOKED',
              reason: `Role "${role.Name}" does not permit replying in this forum.`,
            };
          }
          isModerator = Boolean(role.CanModerateQueue || role.CanConfigureForum);
        }
      }
    }

    if (forum.PostingPolicy === 'ReadOnly' && !isModerator) {
      return {
        allowed: false,
        errorCode: 'FORUM_READ_ONLY',
        reason: `Forum "${forum.Name}" has a ReadOnly posting policy.`,
      };
    }

    return { allowed: true, forum, rootPost, parentPost, isModerator };
  }

  private async resolveReplyPostTypeId(user: UserInfo): Promise<string> {
    const cached = CommunityEngineBase.Instance.GetPostTypeByCode('reply');
    if (cached?.ID) return cached.ID;

    try {
      const res = await new RunView().RunView<PostTypeIdRow>(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.PostTypes,
          ExtraFilter: "Code = 'reply'",
          Fields: ['ID', 'Code'],
          ResultType: 'simple',
          MaxRows: 1,
        },
        user,
      );
      const row = res?.Success ? res.Results?.[0] : null;
      if (row?.ID) return row.ID;
    } catch {
      // Fall back to canonical reply PostType ID seeded in metadata/post-types/.post-types.json.
    }
    return DEFAULT_REPLY_POST_TYPE_ID;
  }
}

function fail(resultCode: string, message: string): ActionResultSimple {
  return { Success: false, ResultCode: resultCode, Message: message };
}
