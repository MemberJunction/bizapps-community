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
import { CommunityRules, type ForumVisibilityBand } from '@mj-biz-apps/community-core';
import { SaveOrFail } from './save-or-fail.ts';
import { ParseAndVerifyInboundEmailReply, ResolveDigestReplySigningSecret } from './digest-reply-loop.ts';

const DEFAULT_REPLY_POST_TYPE_ID = 'C8A17200-4E12-4B8F-9A10-100000000002';

interface AuthoritativeForumRow {
  ID: string;
  SpaceID: string;
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
  CanCreateRootPost?: boolean;
  CanReply: boolean;
}

interface CollaborationSpaceRow {
  ID: string;
  ParentID: string | null;
  InheritsMembership: boolean;
  ClosedAt?: Date | string | null;
}

interface CollaborationSpaceMemberRow {
  ID: string;
  SpaceID: string;
  UserID: string;
  SpaceRoleTypeID: string;
  Status: 'Active' | 'Invited' | 'Removed';
}

interface CollaborationSpaceRoleTypeRow {
  ID: string;
  CanSeeTeamBand: boolean;
  CanContribute: boolean;
  IsActive?: boolean;
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

/**
 * Action: Community.ProcessInboundDigestReply
 *
 * Inbound email reply-by-email loop:
 *  1. Cryptographically verifies the HMAC-SHA256 `Reply-To` token using ONLY trusted server
 *     signing key resolution (ignoring any caller-supplied `ReplySigningSecret` or
 *     `SkipSenderBindingCheck` parameters) and always enforces sender binding.
 *  2. Strips quoted email history and signature chrome via {@link ParseAndVerifyInboundEmailReply}.
 *  3. Enforces authoritative member binding (`ContextUser` == token member), active Collaboration
 *     Space membership & band access, active `ForumMember` status (rejecting `'Invited'`,
 *     `'Muted'`, `'Removed'`), affirmative `ForumRoleType` resolution (`CanReply === true`),
 *     forum status/policy, and thread lock state — failing closed before creating any entity.
 *  4. Persists the reply as a child `ForumPost` (`PostType = 'reply'`, `RootPostID`, `ParentPostID`,
 *     `ReplyDepth`).
 */
@RegisterClass(BaseAction, 'Community.ProcessInboundDigestReply')
export class ProcessInboundDigestReplyAction extends BaseAction {
  /**
   * Resolves the trusted HMAC signing secret exclusively from server configuration / environment /
   * process-wide ephemeral store (never from action request parameters). Protected so isolated
   * unit tests may subclass and override safely.
   */
  protected resolveSigningSecret(): string {
    return ResolveDigestReplySigningSecret();
  }

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

    // Security invariant (CR-01): never honor caller-supplied ReplySigningSecret or SkipSenderBindingCheck.
    const parsed = ParseAndVerifyInboundEmailReply({
      replyToAddressOrToken: replyTarget,
      rawBodyText,
      senderEmail,
      signingSecret: this.resolveSigningSecret(),
      skipSenderBindingCheck: false,
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

  private async verifyAuthoritativeSpaceAccess(
    spaceId: string,
    memberUserId: string,
    user: UserInfo,
  ): Promise<
    | { allowed: true; canSeeTeamBand: boolean; isSpaceOpenForWrites: boolean }
    | { allowed: false; errorCode: string; reason: string }
  > {
    const [spacesRes, spaceMembersRes, spaceRolesRes] = await Promise.all([
      new RunView().RunView<CollaborationSpaceRow>(
        {
          EntityName: 'MJ_BizApps_Collaboration: Spaces',
          ExtraFilter: '1=1',
          Fields: ['ID', 'ParentID', 'InheritsMembership', 'ClosedAt'],
          ResultType: 'simple',
          MaxRows: 500,
        },
        user,
      ),
      new RunView().RunView<CollaborationSpaceMemberRow>(
        {
          EntityName: 'MJ_BizApps_Collaboration: Space Members',
          ExtraFilter: `UserID = '${memberUserId}'`,
          Fields: ['ID', 'SpaceID', 'UserID', 'SpaceRoleTypeID', 'Status'],
          ResultType: 'simple',
          MaxRows: 500,
        },
        user,
      ),
      new RunView().RunView<CollaborationSpaceRoleTypeRow>(
        {
          EntityName: 'MJ_BizApps_Collaboration: Space Role Types',
          ExtraFilter: '1=1',
          Fields: ['ID', 'CanSeeTeamBand', 'CanContribute', 'IsActive'],
          ResultType: 'simple',
          MaxRows: 200,
        },
        user,
      ),
    ]);

    if (!spacesRes?.Success || !spaceMembersRes?.Success || !spaceRolesRes?.Success) {
      return {
        allowed: false,
        errorCode: 'AUTHORITATIVE_LOAD_FAILED',
        reason: 'Could not verify authoritative Collaboration Space membership and role.',
      };
    }

    const spaceById = new Map<string, CollaborationSpaceRow>(
      (spacesRes.Results ?? []).map((s) => [s.ID.toLowerCase(), s]),
    );
    const memberBySpaceId = new Map<string, CollaborationSpaceMemberRow>(
      (spaceMembersRes.Results ?? []).map((m) => [m.SpaceID.toLowerCase(), m]),
    );
    const roleById = new Map<string, CollaborationSpaceRoleTypeRow>(
      (spaceRolesRes.Results ?? []).map((r) => [r.ID.toLowerCase(), r]),
    );

    const targetSpace = spaceById.get(spaceId.toLowerCase());
    if (!targetSpace) {
      return {
        allowed: false,
        errorCode: 'ACCESS_REVOKED',
        reason: `Target Collaboration Space ${spaceId} was not found.`,
      };
    }

    const isSpaceOpenForWrites = targetSpace.ClosedAt == null;
    if (!isSpaceOpenForWrites) {
      return {
        allowed: false,
        errorCode: 'SPACE_CLOSED',
        reason: 'Target Collaboration Space is closed and does not accept replies.',
      };
    }

    let currentSpace: CollaborationSpaceRow | undefined = targetSpace;
    let reachedMember: CollaborationSpaceMemberRow | null = null;
    const visited = new Set<string>();

    for (let depth = 0; depth < 32 && currentSpace; depth += 1) {
      const key = currentSpace.ID.toLowerCase();
      if (visited.has(key)) break;
      visited.add(key);

      const direct = memberBySpaceId.get(key);
      if (direct) {
        if (direct.Status !== 'Active') {
          return {
            allowed: false,
            errorCode: 'ACCESS_REVOKED',
            reason: `Space membership status "${direct.Status}" is not active.`,
          };
        }
        reachedMember = direct;
        break;
      }

      if (!currentSpace.InheritsMembership || !currentSpace.ParentID) {
        break;
      }
      currentSpace = spaceById.get(currentSpace.ParentID.toLowerCase());
    }

    if (!reachedMember) {
      return {
        allowed: false,
        errorCode: 'ACCESS_REVOKED',
        reason: 'Active Collaboration Space membership is required to reply in this forum.',
      };
    }

    const spaceRole = roleById.get(reachedMember.SpaceRoleTypeID.toLowerCase());
    if (!spaceRole || spaceRole.IsActive === false) {
      return {
        allowed: false,
        errorCode: 'ACCESS_REVOKED',
        reason: 'Space role could not be resolved; reply access denied.',
      };
    }

    if (spaceRole.CanContribute !== true) {
      return {
        allowed: false,
        errorCode: 'ACCESS_REVOKED',
        reason: 'Space role does not permit contributing replies.',
      };
    }

    return {
      allowed: true,
      canSeeTeamBand: Boolean(spaceRole.CanSeeTeamBand),
      isSpaceOpenForWrites,
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
          Fields: ['ID', 'SpaceID', 'Name', 'Status', 'PostingPolicy', 'VisibilityBand', 'InheritsSpaceMembers'],
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

    const spaceAccess = await this.verifyAuthoritativeSpaceAccess(forum.SpaceID, memberUserId, user);
    if (!spaceAccess.allowed) {
      return spaceAccess;
    }

    if ((forum.VisibilityBand === 'Team' || rootPost.VisibilityBand === 'Team') && !spaceAccess.canSeeTeamBand) {
      return {
        allowed: false,
        errorCode: 'ACCESS_REVOKED',
        reason: 'Member does not have Team-band access to reply to this thread.',
      };
    }

    if (!memberRes?.Success) {
      return {
        allowed: false,
        errorCode: 'AUTHORITATIVE_LOAD_FAILED',
        reason: 'Could not verify current forum membership status.',
      };
    }
    const member = memberRes.Results?.[0] ?? null;

    // Fail closed (CR-05): any non-'Active' ForumMember row ('Invited', 'Muted', 'Removed', etc.) is rejected.
    if (member && member.Status !== 'Active') {
      return {
        allowed: false,
        errorCode: 'ACCESS_REVOKED',
        reason: `Member status "${member.Status}" is not active and cannot reply in this forum.`,
      };
    }

    if (!member && (!forum.InheritsSpaceMembers || forum.VisibilityBand === 'PrivateForum')) {
      return {
        allowed: false,
        errorCode: 'ACCESS_REVOKED',
        reason: 'Active ForumMember membership is required to reply in this forum.',
      };
    }

    let resolvedRole: {
      CanConfigureForum: boolean;
      CanModerateQueue: boolean;
      CanCreateRootPost?: boolean;
      CanReply: boolean;
    } | null = null;

    if (member) {
      const roleFromEngine = CommunityEngineBase.Instance.GetForumRoleTypeById(member.ForumRoleTypeID);
      if (roleFromEngine) {
        resolvedRole = roleFromEngine;
      } else {
        const roleRes = await new RunView().RunView<AuthoritativeRoleTypeRow>(
          {
            EntityName: COMMUNITY_ENTITY_NAMES.ForumRoleTypes,
            ExtraFilter: `ID = '${member.ForumRoleTypeID}'`,
            Fields: ['ID', 'Name', 'CanConfigureForum', 'CanModerateQueue', 'CanCreateRootPost', 'CanReply'],
            ResultType: 'simple',
            MaxRows: 1,
          },
          user,
        );
        if (!roleRes?.Success) {
          return {
            allowed: false,
            errorCode: 'AUTHORITATIVE_LOAD_FAILED',
            reason: 'Could not resolve ForumRoleType for member.',
          };
        }
        resolvedRole = roleRes.Results?.[0] ?? null;
      }

      // Fail closed (CR-05): missing role or CanReply !== true must reject before any write.
      if (!resolvedRole || resolvedRole.CanReply !== true) {
        return {
          allowed: false,
          errorCode: 'ACCESS_REVOKED',
          reason: resolvedRole
            ? 'Member forum role does not permit replying in this forum.'
            : 'Member forum role could not be resolved; reply access denied.',
        };
      }
    }

    const decision = CommunityRules.EvaluateForumAccess({
      spaceAccess: {
        canReadSpace: true,
        canSeeTeamBand: spaceAccess.canSeeTeamBand,
        isSpaceOpenForWrites: spaceAccess.isSpaceOpenForWrites,
      },
      forum: {
        visibilityBand: forum.VisibilityBand,
        inheritsSpaceMembers: Boolean(forum.InheritsSpaceMembers),
        postingPolicy: forum.PostingPolicy,
        status: forum.Status,
      },
      forumMembership:
        member && resolvedRole
          ? {
              status: member.Status,
              canConfigureForum: Boolean(resolvedRole.CanConfigureForum),
              canModerateQueue: Boolean(resolvedRole.CanModerateQueue),
              canCreateRootPost: Boolean(resolvedRole.CanCreateRootPost ?? resolvedRole.CanReply),
              canReply: Boolean(resolvedRole.CanReply),
            }
          : null,
    });

    if (!decision.canReply) {
      if (forum.PostingPolicy === 'ReadOnly' && !decision.canModerateQueue) {
        return {
          allowed: false,
          errorCode: 'FORUM_READ_ONLY',
          reason: `Forum "${forum.Name}" has a ReadOnly posting policy.`,
        };
      }
      return {
        allowed: false,
        errorCode: 'ACCESS_REVOKED',
        reason: 'Member is not authorized to reply in this forum.',
      };
    }

    return {
      allowed: true,
      forum,
      rootPost,
      parentPost,
      isModerator: decision.canModerateQueue,
    };
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
