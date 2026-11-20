import { RunView, type UserInfo } from '@memberjunction/core';
import { ActionParam, ActionResultSimple, RunActionParams } from '@memberjunction/actions-base';
import { BaseAction } from '@memberjunction/actions';
import { CommunicationEngine, ProcessedMessageServer } from '@memberjunction/communication-engine';
import { BaseCommunicationProvider, Message } from '@memberjunction/communication-types';
import { MJGlobal, RegisterClass } from '@memberjunction/global';
import {
  CommunityEmbeddingPersonalizationService,
  CommunityRules,
  type CommunityMemberInteraction,
  type EpistemicAnswerStatus,
  type ForumVisibilityBand,
  type PersonalizationCandidatePost,
} from '@mj-biz-apps/community-core';
import {
  COMMUNITY_ENTITY_NAMES,
  type ForumPostingPolicy,
  type ForumStatus,
} from '@mj-biz-apps/community-entities';
import { CommunityEngineBase } from '@mj-biz-apps/community-engine-base';
import { ParseAllowedForumIDsParam, ParseOptionalUUIDParam } from './action-id-params.ts';
import {
  COMMUNITY_TEST_EMAIL_DRIVER_NAME,
  CommunityTestCommunicationProvider,
} from './CommunityTestCommunicationProvider.ts';
import {
  BuildReplyToEmailAddress,
  RenderPersonalizedDigestEmail,
  ResolveDigestReplySigningSecret,
  SignDigestReplyToken,
  type DigestRenderItem,
} from './digest-reply-loop.ts';

interface ForumRow {
  ID: string;
  SpaceID: string;
  Name: string;
  Slug: string;
  Status: ForumStatus;
  VisibilityBand: ForumVisibilityBand;
  InheritsSpaceMembers: boolean;
  PostingPolicy: ForumPostingPolicy;
}

interface DigestCandidateRow {
  ID: string;
  ForumID: string;
  Title: string | null;
  BodyMarkdown: string;
  SummaryMarkdown: string | null;
  AuthorUserID: string | null;
  VisibilityBand: 'Shared' | 'Team';
  ReplyCount: number;
  ReactionScore: number;
  LastActivityAt: Date | string;
  __mj_CreatedAt?: Date | string;
}

interface AuthorizedCandidateItem {
  candidate: PersonalizationCandidatePost;
  spaceId: string;
  visibilityBand: 'Shared' | 'Team';
}

interface PostTagJoinRow {
  PostID: string;
  TopicTagID: string;
}

interface TopicTagRow {
  ID: string;
  Name: string;
}

interface UserLookupRow {
  ID: string;
  Name: string;
  Email: string;
}

interface MemberProfileRow {
  ID?: string;
  SpaceID?: string | null;
  UserID: string;
  ExpertiseTagsJSON: string | null;
  DigestCadence?: string | null;
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

interface ForumMemberAuthRow {
  ID: string;
  ForumID: string;
  UserID: string;
  ForumRoleTypeID: string;
  Status: 'Active' | 'Invited' | 'Muted' | 'Removed';
}

interface ForumRoleTypeAuthRow {
  ID: string;
  Name?: string;
  CanConfigureForum: boolean;
  CanModerateQueue: boolean;
  CanCreateRootPost?: boolean;
  CanReply: boolean;
  IsActive?: boolean;
}

interface RecipientForumPermission {
  forum: ForumRow;
  canSeeTeamPosts: boolean;
  canReply: boolean;
}

interface MemberAuthoredRow {
  ID: string;
  ForumID: string;
  Title: string | null;
  BodyMarkdown: string;
  AuthorUserID: string | null;
  __mj_CreatedAt?: Date | string;
}

interface MemberReactionRow {
  PostID: string;
  UserID: string;
  __mj_CreatedAt?: Date | string;
}

interface AnswerEpistemicRow {
  QuestionPostID: string;
  AIEpistemicStatus: EpistemicAnswerStatus | null;
}

export interface DigestDeliverySummary {
  userId: string;
  email: string;
  itemCount: number;
  topPostId: string | null;
  replyToAddress: string | null;
  providerName: string;
  usedCommunicationEngine: boolean;
  dryRun: boolean;
  success: boolean;
  error?: string;
}

const DEFAULT_MAX_ITEMS_PER_DIGEST = 5;
const MAX_ITEMS_PER_DIGEST_CEILING = 25;
const DEFAULT_MAX_CANDIDATE_POSTS = 100;
const MAX_CANDIDATE_POSTS_CEILING = 200;
const DEFAULT_MAX_RECIPIENTS = 50;

function paramValue(params: RunActionParams, name: string): string | null {
  const value = params.Params.find((p) => p.Name.toLowerCase() === name.toLowerCase())?.Value;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function parseBoolParam(raw: string | null, defaultValue: boolean): boolean {
  if (!raw) return defaultValue;
  const norm = raw.trim().toLowerCase();
  if (norm === 'true' || norm === '1' || norm === 'yes') return true;
  if (norm === 'false' || norm === '0' || norm === 'no') return false;
  return defaultValue;
}

function parseBoundedInt(raw: string | null, fallback: number, min: number, max: number): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function parseExpertiseTags(rawJson: string | null): string[] {
  if (!rawJson || !rawJson.trim()) return [];
  try {
    const parsed = JSON.parse(rawJson) as Array<string> | Record<string, string>;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Action: Community.SendPersonalizedDigest
 *
 * Ranks recent community threads for each target member using
 * {@link CommunityEmbeddingPersonalizationService}, strictly intersecting candidate threads with
 * each recipient's own active Collaboration Space membership, band (`Shared` vs `Team`),
 * `ForumMember` status, and `CommunityMemberProfile` digest status before ranking, rendering
 * excerpts, or issuing compact HMAC-SHA256 `Reply-To` tokens (`<= 64` octets local-part), and
 * dispatches through MemberJunction's `CommunicationEngine`.
 */
@RegisterClass(BaseAction, 'Community.SendPersonalizedDigest')
export class SendPersonalizedCommunityDigestAction extends BaseAction {
  /**
   * Resolves the trusted HMAC signing secret exclusively from server configuration / environment /
   * process-wide ephemeral store (never from action request parameters). Protected so isolated
   * unit tests may subclass and override safely.
   */
  protected resolveSigningSecret(): string {
    return ResolveDigestReplySigningSecret();
  }

  protected async InternalRunAction(params: RunActionParams): Promise<ActionResultSimple> {
    // Ensure CommunityTestCommunicationProvider is retained against tree-shaking.
    void CommunityTestCommunicationProvider;

    const user = params.ContextUser;
    if (!user) return fail('ERROR', 'ContextUser is required');

    let spaceId: string | null;
    let allowedForumIds: string[];
    let recipientUserIds: string[];
    try {
      spaceId = ParseOptionalUUIDParam(paramValue(params, 'SpaceID'), 'SpaceID');
      allowedForumIds = ParseAllowedForumIDsParam(paramValue(params, 'AllowedForumIDs'));
      recipientUserIds = ParseAllowedForumIDsParam(paramValue(params, 'RecipientUserIDs'));
    } catch (err) {
      return fail('INVALID_UUID', err instanceof Error ? err.message : 'Malformed UUID input parameter.');
    }

    const useTestDriver = parseBoolParam(paramValue(params, 'UseTestDriver'), true);
    const dryRun = parseBoolParam(paramValue(params, 'DryRun'), false);
    const requestedProvider = paramValue(params, 'ProviderName');
    const providerName = requestedProvider ?? (useTestDriver ? COMMUNITY_TEST_EMAIL_DRIVER_NAME : 'SendGrid');
    const messageTypeName = paramValue(params, 'MessageTypeName') ?? 'Standard Email';
    const fromEmail = paramValue(params, 'FromEmail') ?? 'community-digest@bizapps.local';
    const fromName = paramValue(params, 'FromName') ?? 'BizApps Community Digest';
    const communityName = paramValue(params, 'CommunityName') ?? 'BizApps Community';
    const replyDomain = paramValue(params, 'ReplyDomain') ?? 'reply.bizapps.local';
    const signingSecret = this.resolveSigningSecret();
    const tokenTtlRaw = paramValue(params, 'TokenTTLSeconds');
    const tokenTtlSeconds = tokenTtlRaw ? parseBoundedInt(tokenTtlRaw, 14 * 86400, 60, 90 * 86400) : undefined;

    const maxItemsPerDigest = parseBoundedInt(
      paramValue(params, 'MaxItemsPerDigest'),
      DEFAULT_MAX_ITEMS_PER_DIGEST,
      1,
      MAX_ITEMS_PER_DIGEST_CEILING,
    );
    const maxCandidatePosts = parseBoundedInt(
      paramValue(params, 'MaxCandidatePosts'),
      DEFAULT_MAX_CANDIDATE_POSTS,
      1,
      MAX_CANDIDATE_POSTS_CEILING,
    );
    const maxRecipients = parseBoundedInt(
      paramValue(params, 'MaxRecipients'),
      DEFAULT_MAX_RECIPIENTS,
      1,
      DEFAULT_MAX_RECIPIENTS,
    );

    const forums = await this.loadForums(allowedForumIds, spaceId, user);
    const targetForumIds = forums.map((f) => f.ID);
    const forumById = new Map<string, ForumRow>(forums.map((f) => [f.ID.toLowerCase(), f]));

    const allCandidates =
      targetForumIds.length === 0
        ? []
        : await this.loadCandidatePosts(targetForumIds, maxCandidatePosts, forumById, user);

    const targetRecipientIds =
      recipientUserIds.length > 0 ? recipientUserIds.slice(0, maxRecipients) : [user.ID];

    const recipients = await this.loadRecipients(targetRecipientIds, user);
    if (recipients.length === 0) {
      return fail('NO_RECIPIENTS', 'No eligible digest recipients with email addresses were resolved.');
    }

    const commsReady = await this.ensureCommunicationEngineReady(providerName, user);
    if (!commsReady && (!useTestDriver || providerName !== COMMUNITY_TEST_EMAIL_DRIVER_NAME)) {
      return fail(
        'PROVIDER_NOT_CONFIGURED',
        `CommunicationEngine is not configured with provider "${providerName}".`,
      );
    }

    const authCatalog = await this.loadAuthorizationCatalog(user);
    if (!authCatalog.loaded) {
      return fail(
        'AUTHORITATIVE_LOAD_FAILED',
        'Could not load Collaboration Space and Forum Role authorization metadata.',
      );
    }

    const personalization = CommunityEmbeddingPersonalizationService.Instance;
    const deliveries: DigestDeliverySummary[] = [];

    for (const recipient of recipients) {
      const recipientAuth = await this.resolveRecipientAuthorization(
        recipient.ID,
        forums,
        authCatalog,
        user,
      );

      if (!recipientAuth.authorized) {
        deliveries.push({
          userId: recipient.ID,
          email: recipient.Email,
          itemCount: 0,
          topPostId: null,
          replyToAddress: null,
          providerName,
          usedCommunicationEngine: false,
          dryRun,
          success: false,
          error: recipientAuth.reason,
        });
        continue;
      }

      const recipientCandidates: PersonalizationCandidatePost[] = [];
      const authorizedPostIds = new Set<string>();
      for (const entry of allCandidates) {
        const perm = recipientAuth.forumPermissions.get(entry.candidate.forumId.toLowerCase());
        if (!perm) continue;
        if (entry.visibilityBand !== 'Shared' && !perm.canSeeTeamPosts) {
          continue;
        }
        recipientCandidates.push(entry.candidate);
        authorizedPostIds.add(entry.candidate.postId.toLowerCase());
      }

      if (recipientCandidates.length === 0) {
        deliveries.push({
          userId: recipient.ID,
          email: recipient.Email,
          itemCount: 0,
          topPostId: null,
          replyToAddress: null,
          providerName,
          usedCommunicationEngine: false,
          dryRun,
          success: false,
          error: 'No authorized community posts matched this recipient permissions.',
        });
        continue;
      }

      const recipientForumIds = Array.from(recipientAuth.forumPermissions.values()).map((p) => p.forum.ID);
      const { interactions } = await this.loadMemberSignals(
        recipient.ID,
        recipientForumIds,
        authorizedPostIds,
        user,
      );
      const { ranked } = await personalization.RankPostsForMember({
        userId: recipient.ID,
        interactions,
        explicitTopicTags: recipientAuth.explicitTags,
        candidates: recipientCandidates,
        options: {
          maxItems: maxItemsPerDigest,
          maxCandidateScan: maxCandidatePosts,
        },
      });

      const renderItems: DigestRenderItem[] = ranked.map((r) => {
        const perm = recipientAuth.forumPermissions.get(r.post.forumId.toLowerCase());
        if (!perm?.canReply) {
          return { ranked: r, replyToken: '', replyToAddress: '' };
        }
        const replyToken = SignDigestReplyToken({
          memberUserId: recipient.ID,
          forumId: r.post.forumId,
          rootPostId: r.post.postId,
          parentPostId: r.post.postId,
          recipientEmail: recipient.Email,
          signingSecret,
          ttlSeconds: tokenTtlSeconds,
        });
        const replyToAddress = BuildReplyToEmailAddress(replyToken, replyDomain);
        return { ranked: r, replyToken, replyToAddress };
      });

      const rendered = RenderPersonalizedDigestEmail({
        recipientName: recipient.Name,
        communityName,
        items: renderItems,
      });

      const firstReplyItem = renderItems.find((item) => Boolean(item.replyToAddress && item.replyToken));
      const msg = new Message();
      msg.From = fromEmail;
      msg.FromName = fromName;
      msg.To = recipient.Email;
      msg.Subject = rendered.subject;
      msg.Body = rendered.textBody;
      msg.HTMLBody = rendered.htmlBody;
      msg.DryRun = dryRun;
      if (firstReplyItem) {
        msg.Headers = { 'Reply-To': firstReplyItem.replyToAddress };
      }

      const dispatchResult = await this.dispatchMessage(
        providerName,
        messageTypeName,
        msg,
        commsReady,
        useTestDriver,
        user,
      );

      deliveries.push({
        userId: recipient.ID,
        email: recipient.Email,
        itemCount: rendered.itemCount,
        topPostId: renderItems[0]?.ranked.post.postId ?? null,
        replyToAddress: firstReplyItem?.replyToAddress ?? null,
        providerName,
        usedCommunicationEngine: dispatchResult.usedCommunicationEngine,
        dryRun: dispatchResult.dryRun,
        success: dispatchResult.success,
        error: dispatchResult.error,
      });
    }

    const sentCount = deliveries.filter((d) => d.success).length;
    const failedCount = deliveries.length - sentCount;

    const outputParams: ActionParam[] = [
      { Name: 'SentCount', Value: sentCount, Type: 'Output' },
      { Name: 'FailedCount', Value: failedCount, Type: 'Output' },
      { Name: 'DryRun', Value: dryRun, Type: 'Output' },
      { Name: 'ProviderName', Value: providerName, Type: 'Output' },
      { Name: 'DeliveriesJSON', Value: JSON.stringify(deliveries), Type: 'Output' },
    ];

    if (sentCount === 0 && failedCount > 0) {
      return {
        Success: false,
        ResultCode: 'DELIVERY_FAILED',
        Message: `All ${failedCount} personalized digest deliveries failed or were denied by recipient permissions.`,
        Params: outputParams,
      };
    }

    return {
      Success: true,
      ResultCode: 'SUCCESS',
      Message: `Dispatched ${sentCount} personalized digest(s) via ${providerName} (${failedCount} failed).`,
      Params: outputParams,
    };
  }

  private async loadAuthorizationCatalog(user: UserInfo): Promise<{
    loaded: boolean;
    spaceById: Map<string, CollaborationSpaceRow>;
    spaceRoleById: Map<string, CollaborationSpaceRoleTypeRow>;
    forumRoleById: Map<string, ForumRoleTypeAuthRow>;
  }> {
    const [spacesRes, spaceRolesRes, forumRolesRes] = await Promise.all([
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
      new RunView().RunView<ForumRoleTypeAuthRow>(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.ForumRoleTypes,
          ExtraFilter: '1=1',
          Fields: ['ID', 'Name', 'CanConfigureForum', 'CanModerateQueue', 'CanCreateRootPost', 'CanReply', 'IsActive'],
          ResultType: 'simple',
          MaxRows: 200,
        },
        user,
      ),
    ]);

    if (!spacesRes?.Success || !spaceRolesRes?.Success || !forumRolesRes?.Success) {
      return {
        loaded: false,
        spaceById: new Map(),
        spaceRoleById: new Map(),
        forumRoleById: new Map(),
      };
    }

    const spaceById = new Map<string, CollaborationSpaceRow>(
      (spacesRes.Results ?? []).map((s) => [s.ID.toLowerCase(), s]),
    );
    const spaceRoleById = new Map<string, CollaborationSpaceRoleTypeRow>(
      (spaceRolesRes.Results ?? []).map((r) => [r.ID.toLowerCase(), r]),
    );
    const forumRoleById = new Map<string, ForumRoleTypeAuthRow>(
      (forumRolesRes.Results ?? []).map((r) => [r.ID.toLowerCase(), r]),
    );
    for (const cachedRole of CommunityEngineBase.Instance.ForumRoleTypes) {
      if (!forumRoleById.has(cachedRole.ID.toLowerCase())) {
        forumRoleById.set(cachedRole.ID.toLowerCase(), cachedRole);
      }
    }

    return { loaded: true, spaceById, spaceRoleById, forumRoleById };
  }

  private async resolveRecipientAuthorization(
    recipientUserId: string,
    forums: ReadonlyArray<ForumRow>,
    catalog: {
      spaceById: Map<string, CollaborationSpaceRow>;
      spaceRoleById: Map<string, CollaborationSpaceRoleTypeRow>;
      forumRoleById: Map<string, ForumRoleTypeAuthRow>;
    },
    user: UserInfo,
  ): Promise<
    | {
        authorized: true;
        forumPermissions: Map<string, RecipientForumPermission>;
        explicitTags: string[];
      }
    | { authorized: false; reason: string }
  > {
    if (forums.length === 0) {
      return { authorized: false, reason: 'No active forums available for this digest.' };
    }

    const forumInList = forums.map((f) => `'${f.ID}'`).join(',');
    const [profileRes, spaceMemberRes, forumMemberRes] = await Promise.all([
      new RunView().RunView<MemberProfileRow>(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.CommunityMemberProfiles,
          ExtraFilter: `UserID = '${recipientUserId}'`,
          Fields: ['ID', 'SpaceID', 'UserID', 'ExpertiseTagsJSON', 'DigestCadence'],
          ResultType: 'simple',
          MaxRows: 50,
        },
        user,
      ),
      new RunView().RunView<CollaborationSpaceMemberRow>(
        {
          EntityName: 'MJ_BizApps_Collaboration: Space Members',
          ExtraFilter: `UserID = '${recipientUserId}'`,
          Fields: ['ID', 'SpaceID', 'UserID', 'SpaceRoleTypeID', 'Status'],
          ResultType: 'simple',
          MaxRows: 500,
        },
        user,
      ),
      new RunView().RunView<ForumMemberAuthRow>(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.ForumMembers,
          ExtraFilter: `ForumID IN (${forumInList}) AND UserID = '${recipientUserId}'`,
          Fields: ['ID', 'ForumID', 'UserID', 'ForumRoleTypeID', 'Status'],
          ResultType: 'simple',
          MaxRows: 200,
        },
        user,
      ),
    ]);

    if (!profileRes?.Success || !spaceMemberRes?.Success || !forumMemberRes?.Success) {
      return {
        authorized: false,
        reason: 'Authoritative recipient profile or membership check failed.',
      };
    }

    const explicitTags: string[] = [];
    const mutedSpaceIds = new Set<string>();
    let hasGlobalMutedProfile = false;
    for (const row of profileRes.Results ?? []) {
      explicitTags.push(...parseExpertiseTags(row.ExpertiseTagsJSON));
      if (row.DigestCadence === 'Muted') {
        if (row.SpaceID) {
          mutedSpaceIds.add(row.SpaceID.toLowerCase());
        } else {
          hasGlobalMutedProfile = true;
        }
      }
    }

    if (hasGlobalMutedProfile) {
      return { authorized: false, reason: 'Recipient digest preference is Muted.' };
    }

    const spaceMemberBySpaceId = new Map<string, CollaborationSpaceMemberRow>(
      (spaceMemberRes.Results ?? []).map((m) => [m.SpaceID.toLowerCase(), m]),
    );
    const forumMemberByForumId = new Map<string, ForumMemberAuthRow>(
      (forumMemberRes.Results ?? []).map((m) => [m.ForumID.toLowerCase(), m]),
    );

    const forumPermissions = new Map<string, RecipientForumPermission>();

    for (const forum of forums) {
      if (forum.Status !== 'Active') continue;
      const spaceKey = forum.SpaceID.toLowerCase();
      if (mutedSpaceIds.has(spaceKey)) continue;

      const spaceAccess = this.resolveRecipientSpaceAccess(
        forum.SpaceID,
        catalog.spaceById,
        spaceMemberBySpaceId,
        catalog.spaceRoleById,
      );
      if (!spaceAccess.canReadSpace) {
        continue;
      }

      const forumMember = forumMemberByForumId.get(forum.ID.toLowerCase()) ?? null;
      if (forumMember && forumMember.Status !== 'Active') {
        // Reject Invited, Muted, Removed, or any non-Active membership status.
        continue;
      }

      let forumRole: ForumRoleTypeAuthRow | null = null;
      if (forumMember) {
        forumRole = catalog.forumRoleById.get(forumMember.ForumRoleTypeID.toLowerCase()) ?? null;
        if (!forumRole || forumRole.IsActive === false) {
          // Fail closed when member's ForumRoleType cannot be resolved.
          continue;
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
          forumMember && forumRole
            ? {
                status: forumMember.Status,
                canConfigureForum: Boolean(forumRole.CanConfigureForum),
                canModerateQueue: Boolean(forumRole.CanModerateQueue),
                canCreateRootPost: Boolean(forumRole.CanCreateRootPost ?? forumRole.CanReply),
                canReply: Boolean(forumRole.CanReply),
              }
            : null,
      });

      if (!decision.canReadForum) {
        continue;
      }

      forumPermissions.set(forum.ID.toLowerCase(), {
        forum,
        canSeeTeamPosts: decision.canSeeTeamPosts,
        canReply: decision.canReply && spaceAccess.canContribute,
      });
    }

    if (forumPermissions.size === 0) {
      return {
        authorized: false,
        reason: 'Recipient holds no active authorized forums or has muted digests.',
      };
    }

    return {
      authorized: true,
      forumPermissions,
      explicitTags,
    };
  }

  private resolveRecipientSpaceAccess(
    spaceId: string,
    spaceById: Map<string, CollaborationSpaceRow>,
    memberBySpaceId: Map<string, CollaborationSpaceMemberRow>,
    roleById: Map<string, CollaborationSpaceRoleTypeRow>,
  ): {
    canReadSpace: boolean;
    canSeeTeamBand: boolean;
    canContribute: boolean;
    isSpaceOpenForWrites: boolean;
  } {
    const targetSpace = spaceById.get(spaceId.toLowerCase());
    if (!targetSpace) {
      return { canReadSpace: false, canSeeTeamBand: false, canContribute: false, isSpaceOpenForWrites: false };
    }

    let current: CollaborationSpaceRow | undefined = targetSpace;
    let reachedMember: CollaborationSpaceMemberRow | null = null;
    const visited = new Set<string>();

    for (let depth = 0; depth < 32 && current; depth += 1) {
      const key = current.ID.toLowerCase();
      if (visited.has(key)) break;
      visited.add(key);

      const direct = memberBySpaceId.get(key);
      if (direct) {
        if (direct.Status !== 'Active') {
          return { canReadSpace: false, canSeeTeamBand: false, canContribute: false, isSpaceOpenForWrites: false };
        }
        reachedMember = direct;
        break;
      }

      if (!current.InheritsMembership || !current.ParentID) {
        break;
      }
      current = spaceById.get(current.ParentID.toLowerCase());
    }

    if (!reachedMember) {
      return { canReadSpace: false, canSeeTeamBand: false, canContribute: false, isSpaceOpenForWrites: false };
    }

    const role = roleById.get(reachedMember.SpaceRoleTypeID.toLowerCase());
    if (!role || role.IsActive === false) {
      return { canReadSpace: false, canSeeTeamBand: false, canContribute: false, isSpaceOpenForWrites: false };
    }

    return {
      canReadSpace: true,
      canSeeTeamBand: Boolean(role.CanSeeTeamBand),
      canContribute: Boolean(role.CanContribute),
      isSpaceOpenForWrites: targetSpace.ClosedAt == null,
    };
  }

  private async ensureCommunicationEngineReady(providerName: string, user: UserInfo): Promise<boolean> {
    const engine = CommunicationEngine.Instance;
    if (!engine.Loaded) {
      try {
        await engine.Config(false, user);
      } catch {
        return false;
      }
    }
    return engine.Loaded && engine.Providers.some((p) => p.Name === providerName);
  }

  private async dispatchMessage(
    providerName: string,
    messageTypeName: string,
    message: Message,
    commsReady: boolean,
    useTestDriver: boolean,
    user: UserInfo,
  ): Promise<{ success: boolean; dryRun: boolean; usedCommunicationEngine: boolean; error?: string }> {
    try {
      if (commsReady) {
        const result = await CommunicationEngine.Instance.SendSingleMessage(
          providerName,
          messageTypeName,
          message,
          undefined,
          false,
          undefined,
          user,
        );
        return {
          success: result.Success,
          dryRun: Boolean(result.DryRun ?? message.DryRun),
          usedCommunicationEngine: true,
          error: result.Error || undefined,
        };
      }

      if (!useTestDriver || providerName !== COMMUNITY_TEST_EMAIL_DRIVER_NAME) {
        return {
          success: false,
          dryRun: Boolean(message.DryRun),
          usedCommunicationEngine: false,
          error: `CommunicationEngine provider "${providerName}" is not configured.`,
        };
      }

      const provider = MJGlobal.Instance.ClassFactory.CreateInstance<BaseCommunicationProvider>(
        BaseCommunicationProvider,
        COMMUNITY_TEST_EMAIL_DRIVER_NAME,
      );
      if (!provider) {
        return {
          success: false,
          dryRun: Boolean(message.DryRun),
          usedCommunicationEngine: false,
          error: 'Community Test Email Driver is not registered in ClassFactory.',
        };
      }

      const processed = new ProcessedMessageServer(message);
      const processResult = await processed.Process(false, user);
      if (!processResult.Success) {
        return {
          success: false,
          dryRun: Boolean(message.DryRun),
          usedCommunicationEngine: false,
          error: processResult.Message ?? 'Failed to process digest message.',
        };
      }

      const sendResult = await provider.SendSingleMessage(processed);
      return {
        success: sendResult.Success,
        dryRun: Boolean(sendResult.DryRun ?? message.DryRun),
        usedCommunicationEngine: false,
        error: sendResult.Error || undefined,
      };
    } catch (err) {
      return {
        success: false,
        dryRun: Boolean(message.DryRun),
        usedCommunicationEngine: commsReady,
        error: err instanceof Error ? err.message : 'Unexpected dispatch failure.',
      };
    }
  }

  private async loadForums(
    allowedForumIds: string[],
    spaceId: string | null,
    user: UserInfo,
  ): Promise<ForumRow[]> {
    const clauses: string[] = ["Status = 'Active'"];
    if (allowedForumIds.length > 0) {
      clauses.push(`ID IN (${allowedForumIds.map((id) => `'${id}'`).join(',')})`);
    } else if (spaceId) {
      clauses.push(`SpaceID = '${spaceId}'`);
    }

    try {
      const res = await new RunView().RunView<ForumRow>(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.Forums,
          ExtraFilter: clauses.join(' AND '),
          Fields: [
            'ID',
            'SpaceID',
            'Name',
            'Slug',
            'Status',
            'VisibilityBand',
            'InheritsSpaceMembers',
            'PostingPolicy',
          ],
          ResultType: 'simple',
          MaxRows: 200,
        },
        user,
      );
      return res?.Success && res.Results ? res.Results : [];
    } catch {
      return [];
    }
  }

  private async loadCandidatePosts(
    forumIds: string[],
    maxCandidatePosts: number,
    forumById: Map<string, ForumRow>,
    user: UserInfo,
  ): Promise<AuthorizedCandidateItem[]> {
    const forumFilter = forumIds.map((id) => `'${id}'`).join(',');
    try {
      const postsRes = await new RunView().RunView<DigestCandidateRow>(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
          ExtraFilter: `ForumID IN (${forumFilter}) AND RootPostID IS NULL AND Status = 'Published'`,
          Fields: [
            'ID',
            'ForumID',
            'Title',
            'BodyMarkdown',
            'SummaryMarkdown',
            'AuthorUserID',
            'VisibilityBand',
            'ReplyCount',
            'ReactionScore',
            'LastActivityAt',
            '__mj_CreatedAt',
          ],
          OrderBy: 'LastActivityAt DESC',
          ResultType: 'simple',
          MaxRows: maxCandidatePosts,
        },
        user,
      );
      if (!postsRes?.Success || !postsRes.Results || postsRes.Results.length === 0) {
        return [];
      }

      const postIds = postsRes.Results.map((p) => p.ID);
      const [tagsByPostId, epistemicByQuestionId] = await Promise.all([
        this.loadPostTags(postIds, user),
        this.loadEpistemicStatuses(postIds, user),
      ]);

      return postsRes.Results.map((row) => {
        const forum = forumById.get(row.ForumID.toLowerCase());
        const visibilityBand: 'Shared' | 'Team' = row.VisibilityBand === 'Shared' ? 'Shared' : 'Team';
        return {
          spaceId: forum?.SpaceID ?? '',
          visibilityBand,
          candidate: {
            postId: row.ID,
            forumId: row.ForumID,
            forumName: forum?.Name,
            title: row.Title ?? 'Community Thread',
            bodyMarkdown: row.BodyMarkdown,
            summaryMarkdown: row.SummaryMarkdown,
            authorDisplayName: row.AuthorUserID,
            topicTags: tagsByPostId.get(row.ID) ?? [],
            epistemicStatus: epistemicByQuestionId.get(row.ID) ?? null,
            replyCount: row.ReplyCount,
            reactionScore: row.ReactionScore,
            createdAt: row.__mj_CreatedAt,
            lastActivityAt: row.LastActivityAt,
          },
        };
      });
    } catch {
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

      const uniqueTagIds = Array.from(new Set(joins.map((j) => j.TopicTagID)));
      const tagIdList = uniqueTagIds.map((id) => `'${id}'`).join(',');
      const tagRes = await new RunView().RunView<TopicTagRow>(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.ForumTopicTags,
          ExtraFilter: `ID IN (${tagIdList})`,
          Fields: ['ID', 'Name'],
          ResultType: 'simple',
          MaxRows: 200,
        },
        user,
      );
      const tagNames = new Map<string, string>(
        (tagRes?.Success && tagRes.Results ? tagRes.Results : []).map((t) => [t.ID, t.Name]),
      );

      for (const join of joins) {
        const tagName = tagNames.get(join.TopicTagID);
        if (!tagName) continue;
        const list = out.get(join.PostID) ?? [];
        if (!list.includes(tagName)) list.push(tagName);
        out.set(join.PostID, list);
      }
    } catch {
      // Tag enrichment is optional; return empty map on lookup errors.
    }
    return out;
  }

  private async loadEpistemicStatuses(
    questionIds: string[],
    user: UserInfo,
  ): Promise<Map<string, EpistemicAnswerStatus>> {
    const out = new Map<string, EpistemicAnswerStatus>();
    if (questionIds.length === 0) return out;
    const idList = questionIds.map((id) => `'${id}'`).join(',');
    try {
      const res = await new RunView().RunView<AnswerEpistemicRow>(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.ForumAnswerPosts,
          ExtraFilter: `QuestionPostID IN (${idList}) AND IsAcceptedByAuthor = 1`,
          Fields: ['QuestionPostID', 'AIEpistemicStatus'],
          ResultType: 'simple',
          MaxRows: 200,
        },
        user,
      );
      if (res?.Success && res.Results) {
        for (const row of res.Results) {
          if (row.AIEpistemicStatus) {
            out.set(row.QuestionPostID, row.AIEpistemicStatus);
          }
        }
      }
    } catch {
      // Optional enrichment.
    }
    return out;
  }

  private async loadRecipients(userIds: string[], user: UserInfo): Promise<UserLookupRow[]> {
    if (userIds.length === 0) return [];
    const idList = userIds.map((id) => `'${id}'`).join(',');
    try {
      const res = await new RunView().RunView<UserLookupRow>(
        {
          EntityName: 'MJ: Users',
          ExtraFilter: `ID IN (${idList})`,
          Fields: ['ID', 'Name', 'Email'],
          ResultType: 'simple',
          MaxRows: userIds.length,
        },
        user,
      );
      if (res?.Success && res.Results && res.Results.length > 0) {
        return res.Results.filter((r) => typeof r.Email === 'string' && r.Email.includes('@'));
      }
    } catch {
      // Fallback below when ContextUser itself is the target.
    }

    if (user.Email && userIds.includes(user.ID)) {
      return [{ ID: user.ID, Name: user.Name ?? user.Email, Email: user.Email }];
    }
    return [];
  }

  private async loadMemberSignals(
    memberUserId: string,
    authorizedForumIds: string[],
    authorizedPostIds: Set<string>,
    user: UserInfo,
  ): Promise<{ interactions: CommunityMemberInteraction[] }> {
    const interactions: CommunityMemberInteraction[] = [];
    if (authorizedForumIds.length === 0) {
      return { interactions };
    }

    try {
      const forumClause = ` AND ForumID IN (${authorizedForumIds.map((id) => `'${id}'`).join(',')})`;
      const authoredRes = await new RunView().RunView<MemberAuthoredRow>(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
          ExtraFilter: `AuthorUserID = '${memberUserId}'${forumClause}`,
          Fields: ['ID', 'ForumID', 'Title', 'BodyMarkdown', 'AuthorUserID', '__mj_CreatedAt'],
          OrderBy: '__mj_CreatedAt DESC',
          ResultType: 'simple',
          MaxRows: 25,
        },
        user,
      );
      const authoredRows = authoredRes?.Success && authoredRes.Results ? authoredRes.Results : [];
      const authoredTags = await this.loadPostTags(
        authoredRows.map((r) => r.ID),
        user,
      );
      for (const row of authoredRows) {
        interactions.push({
          postId: row.ID,
          forumId: row.ForumID,
          title: row.Title,
          bodyText: row.BodyMarkdown,
          topicTags: authoredTags.get(row.ID) ?? [],
          interactionType: 'authored',
          occurredAt: row.__mj_CreatedAt ?? new Date(),
        });
      }

      const reactionRes = await new RunView().RunView<MemberReactionRow>(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.ForumPostReactions,
          ExtraFilter: `UserID = '${memberUserId}'`,
          Fields: ['PostID', 'UserID', '__mj_CreatedAt'],
          OrderBy: '__mj_CreatedAt DESC',
          ResultType: 'simple',
          MaxRows: 20,
        },
        user,
      );
      const reactionRows = (reactionRes?.Success && reactionRes.Results ? reactionRes.Results : []).filter(
        (r) => authorizedPostIds.has(r.PostID.toLowerCase()),
      );
      if (reactionRows.length > 0) {
        const reactedPostIds = Array.from(new Set(reactionRows.map((r) => r.PostID)));
        const reactedRes = await new RunView().RunView<MemberAuthoredRow>(
          {
            EntityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
            ExtraFilter: `ID IN (${reactedPostIds.map((id) => `'${id}'`).join(',')})${forumClause}`,
            Fields: ['ID', 'ForumID', 'Title', 'BodyMarkdown', '__mj_CreatedAt'],
            ResultType: 'simple',
            MaxRows: 20,
          },
          user,
        );
        const reactedById = new Map(
          (reactedRes?.Success && reactedRes.Results ? reactedRes.Results : []).map((p) => [p.ID, p]),
        );
        const reactedTags = await this.loadPostTags(reactedPostIds, user);
        for (const r of reactionRows) {
          const post = reactedById.get(r.PostID);
          if (!post) continue;
          interactions.push({
            postId: post.ID,
            forumId: post.ForumID,
            title: post.Title,
            bodyText: post.BodyMarkdown,
            topicTags: reactedTags.get(post.ID) ?? [],
            interactionType: 'reacted',
            occurredAt: r.__mj_CreatedAt ?? post.__mj_CreatedAt ?? new Date(),
          });
        }
      }
    } catch {
      // Degrade gracefully to cold-start when optional history lookups fail.
    }

    return { interactions };
  }
}

function fail(resultCode: string, message: string): ActionResultSimple {
  return { Success: false, ResultCode: resultCode, Message: message };
}
