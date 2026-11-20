import { RunView, type UserInfo } from '@memberjunction/core';
import { ActionParam, ActionResultSimple, RunActionParams } from '@memberjunction/actions-base';
import { BaseAction } from '@memberjunction/actions';
import { CommunicationEngine, ProcessedMessageServer } from '@memberjunction/communication-engine';
import { BaseCommunicationProvider, Message } from '@memberjunction/communication-types';
import { MJGlobal, RegisterClass } from '@memberjunction/global';
import {
  CommunityEmbeddingPersonalizationService,
  type CommunityMemberInteraction,
  type EpistemicAnswerStatus,
  type PersonalizationCandidatePost,
} from '@mj-biz-apps/community-core';
import { COMMUNITY_ENTITY_NAMES } from '@mj-biz-apps/community-entities';
import { ParseAllowedForumIDsParam, ParseOptionalUUIDParam } from './action-id-params.ts';
import {
  COMMUNITY_TEST_EMAIL_DRIVER_NAME,
  CommunityTestCommunicationProvider,
} from './CommunityTestCommunicationProvider.ts';
import {
  BuildReplyToEmailAddress,
  RenderPersonalizedDigestEmail,
  SignDigestReplyToken,
  type DigestRenderItem,
} from './digest-reply-loop.ts';

interface ForumRow {
  ID: string;
  SpaceID: string;
  Name: string;
  Slug: string;
  Status: string;
}

interface DigestCandidateRow {
  ID: string;
  ForumID: string;
  Title: string | null;
  BodyMarkdown: string;
  SummaryMarkdown: string | null;
  AuthorUserID: string | null;
  ReplyCount: number;
  ReactionScore: number;
  LastActivityAt: Date | string;
  __mj_CreatedAt?: Date | string;
}

interface PostTagJoinRow {
  ForumPostID: string;
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
  UserID: string;
  ExpertiseTagsJSON: string | null;
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
  ForumPostID: string;
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
 * {@link CommunityEmbeddingPersonalizationService}, signs per-thread HMAC-SHA256 `Reply-To` tokens,
 * renders responsive HTML + plaintext digest emails, and dispatches every message through
 * MemberJunction's `CommunicationEngine` (with seamless `UseTestDriver` / `DryRun` support).
 */
@RegisterClass(BaseAction, 'Community.SendPersonalizedDigest')
export class SendPersonalizedCommunityDigestAction extends BaseAction {
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
    const signingSecret = paramValue(params, 'ReplySigningSecret') ?? undefined;
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
    const targetForumIds = allowedForumIds.length > 0 ? allowedForumIds : forums.map((f) => f.ID);
    const forumNameById = new Map<string, string>(forums.map((f) => [f.ID, f.Name]));

    const candidates =
      targetForumIds.length === 0
        ? []
        : await this.loadCandidatePosts(targetForumIds, maxCandidatePosts, forumNameById, user);

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

    const personalization = CommunityEmbeddingPersonalizationService.Instance;
    const deliveries: DigestDeliverySummary[] = [];

    for (const recipient of recipients) {
      const { interactions, explicitTags } = await this.loadMemberSignals(recipient.ID, targetForumIds, user);
      const { ranked } = await personalization.RankPostsForMember({
        userId: recipient.ID,
        interactions,
        explicitTopicTags: explicitTags,
        candidates,
        options: {
          maxItems: maxItemsPerDigest,
          maxCandidateScan: maxCandidatePosts,
        },
      });

      const renderItems: DigestRenderItem[] = ranked.map((r) => {
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

      const msg = new Message();
      msg.From = fromEmail;
      msg.FromName = fromName;
      msg.To = recipient.Email;
      msg.Subject = rendered.subject;
      msg.Body = rendered.textBody;
      msg.HTMLBody = rendered.htmlBody;
      msg.DryRun = dryRun;
      if (renderItems.length > 0) {
        msg.Headers = { 'Reply-To': rendered.primaryReplyToAddress };
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
        replyToAddress: renderItems[0]?.replyToAddress ?? null,
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
        Message: `All ${failedCount} personalized digest deliveries failed.`,
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
          Fields: ['ID', 'SpaceID', 'Name', 'Slug', 'Status'],
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
    forumNameById: Map<string, string>,
    user: UserInfo,
  ): Promise<PersonalizationCandidatePost[]> {
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

      return postsRes.Results.map((row) => ({
        postId: row.ID,
        forumId: row.ForumID,
        forumName: forumNameById.get(row.ForumID),
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
      }));
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
          ExtraFilter: `ForumPostID IN (${idList})`,
          Fields: ['ForumPostID', 'TopicTagID'],
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
        const list = out.get(join.ForumPostID) ?? [];
        if (!list.includes(tagName)) list.push(tagName);
        out.set(join.ForumPostID, list);
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
    forumIds: string[],
    user: UserInfo,
  ): Promise<{ interactions: CommunityMemberInteraction[]; explicitTags: string[] }> {
    const interactions: CommunityMemberInteraction[] = [];
    const explicitTags: string[] = [];

    try {
      const profileRes = await new RunView().RunView<MemberProfileRow>(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.CommunityMemberProfiles,
          ExtraFilter: `UserID = '${memberUserId}'`,
          Fields: ['UserID', 'ExpertiseTagsJSON'],
          ResultType: 'simple',
          MaxRows: 5,
        },
        user,
      );
      if (profileRes?.Success && profileRes.Results) {
        for (const row of profileRes.Results) {
          explicitTags.push(...parseExpertiseTags(row.ExpertiseTagsJSON));
        }
      }

      const forumClause =
        forumIds.length > 0 ? ` AND ForumID IN (${forumIds.map((id) => `'${id}'`).join(',')})` : '';
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
          Fields: ['ForumPostID', 'UserID', '__mj_CreatedAt'],
          OrderBy: '__mj_CreatedAt DESC',
          ResultType: 'simple',
          MaxRows: 20,
        },
        user,
      );
      const reactionRows = reactionRes?.Success && reactionRes.Results ? reactionRes.Results : [];
      if (reactionRows.length > 0) {
        const reactedPostIds = Array.from(new Set(reactionRows.map((r) => r.ForumPostID)));
        const reactedRes = await new RunView().RunView<MemberAuthoredRow>(
          {
            EntityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
            ExtraFilter: `ID IN (${reactedPostIds.map((id) => `'${id}'`).join(',')})`,
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
          const post = reactedById.get(r.ForumPostID);
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

    return { interactions, explicitTags };
  }
}

function fail(resultCode: string, message: string): ActionResultSimple {
  return { Success: false, ResultCode: resultCode, Message: message };
}
