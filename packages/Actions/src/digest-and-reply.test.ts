import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Metadata, RunView, UserInfo } from '@memberjunction/core';
import { RunActionParams } from '@memberjunction/actions-base';
import { BaseCommunicationProvider, CommunicationEngineBase, Message } from '@memberjunction/communication-types';
import { CommunicationEngine } from '@memberjunction/communication-engine';
import { IsValidUUID, MJGlobal } from '@memberjunction/global';
import { CommunityEmbeddingPersonalizationService } from '@mj-biz-apps/community-core';
import { COMMUNITY_ENTITY_NAMES } from '@mj-biz-apps/community-entities';
import {
  BuildReplyToEmailAddress,
  ClearDigestReplyTokenRegistry,
  ParseAndVerifyInboundEmailReply,
  RenderPersonalizedDigestEmail,
  RFC_5321_MAX_ADDRESS_OCTETS,
  RFC_5321_MAX_LOCAL_PART_OCTETS,
  SignDigestReplyToken,
  StripQuotedEmailReply,
  VerifyDigestReplyToken,
} from './custom/digest-reply-loop.ts';

const SPACE_1_ID = '99999999-9999-4999-8999-999999999999';
const FORUM_TAX_ID = '11111111-1111-4111-8111-111111111111';
const FORUM_API_ID = '22222222-2222-4222-8222-222222222222';
const FORUM_PRIVATE_ID = '33333333-3333-4333-8333-333333333333';
const POST_TAX_ID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const POST_API_ID = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const POST_PRIVATE_ID = 'aaaaaaaa-3333-4333-8333-aaaaaaaaaaaa';
const POST_TEAM_ID = 'bbbbbbbb-4444-4444-8444-bbbbbbbbbbbb';
const MEMBER_A_ID = 'cccccccc-3333-4333-8333-cccccccccccc';
const MEMBER_B_ID = 'dddddddd-4444-4444-8444-dddddddddddd';
const MEMBER_REVOKED_ID = 'eeeeeeee-6666-4666-8666-eeeeeeeeeeee';
const REPLY_TYPE_ID = 'C8A17200-4E12-4B8F-9A10-100000000002';
const ROLE_MEMBER_ID = 'eeeeeeee-5555-4555-8555-eeeeeeeeeeee';
const ROLE_READONLY_ID = 'eeeeeeee-7777-4777-8777-eeeeeeeeeeee';
const SPACE_ROLE_TEAM_ID = 'ffffffff-1111-4111-8111-ffffffffffff';
const SPACE_ROLE_OUTSIDE_ID = 'ffffffff-2222-4222-8222-ffffffffffff';
const TEST_SIGNING_SECRET = 'slice2-unit-test-hmac-secret-key-2026';

interface CapturedForumPostRecord {
  ID: string;
  ForumID: string;
  PostTypeID: string;
  RootPostID: string | null;
  ParentPostID: string | null;
  ReplyDepth: number;
  AuthorUserID: string | null;
  BodyMarkdown: string;
  VisibilityBand: 'Shared' | 'Team';
  Status: string;
  Save: () => Promise<boolean>;
}

function assertRfc5321CompliantAddress(address: string): void {
  const atIdx = address.indexOf('@');
  assert.ok(atIdx > 0, `Address must contain @: ${address}`);
  const localPart = address.slice(0, atIdx);
  assert.ok(
    Buffer.byteLength(localPart, 'utf8') <= RFC_5321_MAX_LOCAL_PART_OCTETS,
    `Local-part "${localPart}" (${Buffer.byteLength(localPart, 'utf8')} octets) exceeds RFC 5321 64-octet limit`,
  );
  assert.ok(
    Buffer.byteLength(address, 'utf8') <= RFC_5321_MAX_ADDRESS_OCTETS,
    `Address (${Buffer.byteLength(address, 'utf8')} octets) exceeds RFC 5321 254-octet limit`,
  );
}

describe('Digest Reply Loop — Compact RFC 5321 HMAC-SHA256 tokens & email quote stripping', () => {
  it('signs compact <= 64-octet local-part reply+<id>.<hmac>@domain tokens and verifies them', () => {
    const now = new Date('2026-11-19T12:00:00.000Z');
    const token = SignDigestReplyToken({
      memberUserId: MEMBER_A_ID,
      forumId: FORUM_TAX_ID,
      rootPostId: POST_TAX_ID,
      recipientEmail: 'Alice@Example.org',
      signingSecret: TEST_SIGNING_SECRET,
      now,
      ttlSeconds: 3600,
    });
    const address = BuildReplyToEmailAddress(token, 'reply.bizapps.local');
    assertRfc5321CompliantAddress(address);
    assert.match(address, /^reply\+[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+@reply\.bizapps\.local$/);

    const verified = VerifyDigestReplyToken(`"Community Digest" <${address}>`, {
      signingSecret: TEST_SIGNING_SECRET,
      expectedSenderEmail: 'alice@example.org',
      now: new Date('2026-11-19T12:30:00.000Z'),
    });
    assert.equal(verified.valid, true);
    if (verified.valid) {
      assert.equal(verified.payload.u, MEMBER_A_ID);
      assert.equal(verified.payload.f, FORUM_TAX_ID);
      assert.equal(verified.payload.r, POST_TAX_ID);
      assert.equal(verified.payload.p, POST_TAX_ID);
      assert.equal(verified.payload.e, 'alice@example.org');
    }

    // BuildReplyToEmailAddress must fail closed if caller attempts an oversized local-part > 64 octets
    assert.throws(
      () => BuildReplyToEmailAddress('x'.repeat(60), 'reply.bizapps.local'),
      /exceeds RFC 5321 limit of 64 octets/,
    );
  });

  it('fails closed on tampered signature, unknown handle, expired, or sender-mismatched tokens', () => {
    const now = new Date('2026-11-19T12:00:00.000Z');
    const token = SignDigestReplyToken({
      memberUserId: MEMBER_A_ID,
      forumId: FORUM_TAX_ID,
      rootPostId: POST_TAX_ID,
      recipientEmail: 'alice@example.org',
      signingSecret: TEST_SIGNING_SECRET,
      now,
      ttlSeconds: 600,
    });

    const [handle, sig] = token.split('.');

    // Tamper 1 character in signature
    const tamperedSig = `${handle}.${sig.slice(0, -1)}${sig.endsWith('A') ? 'B' : 'A'}`;
    const tamperedSigRes = VerifyDigestReplyToken(tamperedSig, {
      signingSecret: TEST_SIGNING_SECRET,
      expectedSenderEmail: 'alice@example.org',
      now,
    });
    assert.equal(tamperedSigRes.valid, false);
    if (!tamperedSigRes.valid) {
      assert.equal(tamperedSigRes.errorCode, 'INVALID_SIGNATURE');
    }

    // Unknown / tampered handle
    const unknownHandle = `${handle.slice(0, -1)}${handle.endsWith('A') ? 'B' : 'A'}.${sig}`;
    const unknownRes = VerifyDigestReplyToken(unknownHandle, {
      signingSecret: TEST_SIGNING_SECRET,
      expectedSenderEmail: 'alice@example.org',
      now,
    });
    assert.equal(unknownRes.valid, false);
    if (!unknownRes.valid) {
      assert.equal(unknownRes.errorCode, 'UNKNOWN_TOKEN_HANDLE');
    }

    // Expired token
    const expiredRes = VerifyDigestReplyToken(token, {
      signingSecret: TEST_SIGNING_SECRET,
      expectedSenderEmail: 'alice@example.org',
      now: new Date('2026-11-19T12:20:00.000Z'),
    });
    assert.equal(expiredRes.valid, false);
    if (!expiredRes.valid) {
      assert.equal(expiredRes.errorCode, 'TOKEN_EXPIRED');
    }

    // Sender mismatch
    const senderMismatchRes = VerifyDigestReplyToken(token, {
      signingSecret: TEST_SIGNING_SECRET,
      expectedSenderEmail: 'mallory@example.org',
      now,
    });
    assert.equal(senderMismatchRes.valid, false);
    if (!senderMismatchRes.valid) {
      assert.equal(senderMismatchRes.errorCode, 'SENDER_MISMATCH');
    }
  });

  it('strips Gmail/Apple Mail/Outlook quoted history and signatures cleanly', () => {
    const raw = [
      'Great summary — we also updated our Illinois nexus threshold tracker.',
      '',
      'Let me know if you need the Q4 table.',
      '',
      'On Thu, Nov 19, 2026 at 10:15 AM BizApps Digest <digest@bizapps.local> wrote:',
      '> 50-State Economic Nexus Threshold Changes',
      '> Reply directly to contribute',
      '',
      '-- ',
      'Alice Smith | Tax Counsel',
      'Sent from my iPhone',
    ].join('\n');

    const cleaned = StripQuotedEmailReply(raw);
    assert.equal(
      cleaned,
      'Great summary — we also updated our Illinois nexus threshold tracker.\n\nLet me know if you need the Q4 table.',
    );

    const outlookRaw = [
      'Confirmed on our side as well.',
      '-----Original Message-----',
      'From: BizApps Community',
      'Sent: Thursday, November 19, 2026',
      '> Old thread body',
    ].join('\n');
    assert.equal(StripQuotedEmailReply(outlookRaw), 'Confirmed on our side as well.');
  });

  it('renders responsive HTML and plaintext digest email with relevance explanation and mailto reply links', async () => {
    const svc = CommunityEmbeddingPersonalizationService.Instance;
    svc.ResetToDefaultProvider();
    const { ranked } = await svc.RankPostsForMember({
      userId: MEMBER_A_ID,
      interactions: [
        {
          title: 'Tax Compliance',
          bodyText: 'Sales tax nexus and compliance filings',
          topicTags: ['Tax'],
          interactionType: 'authored',
          occurredAt: new Date(),
        },
      ],
      candidates: [
        {
          postId: POST_TAX_ID,
          forumId: FORUM_TAX_ID,
          forumName: 'Tax & Regulatory',
          title: '50-State Nexus Guide',
          bodyMarkdown: 'Economic nexus thresholds across all states.',
          topicTags: ['Tax'],
          epistemicStatus: 'Canon Verified',
        },
      ],
    });

    const token = SignDigestReplyToken({
      memberUserId: MEMBER_A_ID,
      forumId: FORUM_TAX_ID,
      rootPostId: POST_TAX_ID,
      recipientEmail: 'alice@example.org',
      signingSecret: TEST_SIGNING_SECRET,
    });
    const replyToAddress = BuildReplyToEmailAddress(token, 'reply.bizapps.local');
    assertRfc5321CompliantAddress(replyToAddress);

    const email = RenderPersonalizedDigestEmail({
      recipientName: 'Alice',
      communityName: 'Association Tax & Tech Community',
      items: [{ ranked: ranked[0], replyToken: token, replyToAddress }],
    });

    assert.match(email.subject, /Association Tax & Tech Community Digest/);
    assert.match(email.htmlBody, /50-State Nexus Guide/);
    assert.match(email.htmlBody, /Canon Verified/);
    assert.match(email.htmlBody, /mailto:reply%2B/);
    assert.match(email.textBody, new RegExp(replyToAddress.replace(/[.+]/g, '\\$&')));
    assert.equal(email.primaryReplyToAddress, replyToAddress);
  });
});

describe('MJ CommunicationEngine + CommunityTestCommunicationProvider + Personalized Digest & Reply Loop', () => {
  it('routes messages through MJ CommunicationEngine.Instance.SendSingleMessage into CommunityTestCommunicationProvider outbox (including DryRun)', async () => {
    const {
      COMMUNITY_TEST_EMAIL_DRIVER_NAME,
      CommunityTestCommunicationProvider,
      LoadBizAppsCommunityActions,
    } = await import('../dist/index.js');

    LoadBizAppsCommunityActions();
    CommunityTestCommunicationProvider.ClearSentMessages();

    const registered = MJGlobal.Instance.ClassFactory.CreateInstance<BaseCommunicationProvider>(
      BaseCommunicationProvider,
      COMMUNITY_TEST_EMAIL_DRIVER_NAME,
    );
    assert.ok(registered, 'CommunityTestCommunicationProvider must be registered in MJ ClassFactory');

    const fakeLog = {
      Status: 'Pending',
      ErrorMessage: '',
      Save: async () => true,
    };

    try {
      mock.getter(CommunicationEngine.prototype, 'Loaded', () => true);
      mock.getter(CommunicationEngine.prototype, 'Providers', () => [
        {
          ID: 'prov-test-1',
          Name: COMMUNITY_TEST_EMAIL_DRIVER_NAME,
          MessageTypes: [
            {
              ID: 'pmt-test-1',
              Name: 'Standard Email',
              CommunicationProviderID: 'prov-test-1',
            },
          ],
        },
      ]);
      mock.method(CommunicationEngineBase.prototype, 'StartLog', async () => fakeLog);

      const user = new UserInfo(undefined, { ID: MEMBER_A_ID, Email: 'alice@example.org', Name: 'Alice' });
      const msg = new Message();
      msg.From = 'digest@bizapps.local';
      msg.To = 'alice@example.org';
      msg.Subject = 'Direct MJ Comms Test';
      msg.Body = 'Plaintext body';
      msg.HTMLBody = '<p>HTML body</p>';
      msg.Headers = { 'Reply-To': 'reply+testtoken@reply.bizapps.local' };
      msg.DryRun = true;

      const result = await CommunicationEngine.Instance.SendSingleMessage(
        COMMUNITY_TEST_EMAIL_DRIVER_NAME,
        'Standard Email',
        msg,
        undefined,
        false,
        undefined,
        user,
      );

      assert.equal(result.Success, true);
      assert.equal(result.DryRun, true);
      const outbox = CommunityTestCommunicationProvider.GetSentMessages();
      assert.equal(outbox.length, 1);
      assert.equal(outbox[0].to, 'alice@example.org');
      assert.equal(outbox[0].replyTo, 'reply+testtoken@reply.bizapps.local');
      assert.equal(outbox[0].dryRun, true);
      assert.equal(outbox[0].htmlBody, '<p>HTML body</p>');
    } finally {
      CommunityTestCommunicationProvider.ClearSentMessages();
      mock.restoreAll();
    }
  });

  it('delivers distinct embedding-personalized digests, isolates PrivateForum/Team-band posts per recipient, and enforces CR-01/CR-05/CR-06 fail-closed security', async () => {
    const {
      COMMUNITY_TEST_EMAIL_DRIVER_NAME,
      CommunityTestCommunicationProvider,
      LoadBizAppsCommunityActions,
      ProcessInboundDigestReplyAction,
      SendPersonalizedCommunityDigestAction,
    } = await import('../dist/index.js');

    LoadBizAppsCommunityActions();
    CommunityTestCommunicationProvider.ClearSentMessages();
    ClearDigestReplyTokenRegistry();
    CommunityEmbeddingPersonalizationService.Instance.ResetToDefaultProvider();

    const prevEnvSecret = process.env.COMMUNITY_DIGEST_REPLY_SECRET;
    process.env.COMMUNITY_DIGEST_REPLY_SECRET = TEST_SIGNING_SECRET;

    const fakeLog = { Status: 'Pending', ErrorMessage: '', Save: async () => true };
    const savedReplies: CapturedForumPostRecord[] = [];
    let memberAForumStatus: 'Active' | 'Invited' | 'Muted' | 'Removed' = 'Active';
    let memberASpaceStatus: 'Active' | 'Invited' | 'Removed' = 'Active';
    let memberARoleId = ROLE_MEMBER_ID;
    let roleLookupFails = false;
    let threadLocked = false;
    let forumPolicy: 'Open' | 'Moderated' | 'ReadOnly' = 'Open';

    try {
      mock.getter(CommunicationEngine.prototype, 'Loaded', () => true);
      mock.getter(CommunicationEngine.prototype, 'Providers', () => [
        {
          ID: 'prov-test-1',
          Name: COMMUNITY_TEST_EMAIL_DRIVER_NAME,
          MessageTypes: [
            {
              ID: 'pmt-test-1',
              Name: 'Standard Email',
              CommunicationProviderID: 'prov-test-1',
            },
          ],
        },
      ]);
      mock.method(CommunicationEngineBase.prototype, 'StartLog', async () => fakeLog);

      mock.method(
        RunView.prototype,
        'RunView',
        async (params: { EntityName: string; ExtraFilter?: string; Fields?: string[] }) => {
          const filter = params.ExtraFilter ?? '';

          // CR-06 Schema fidelity check: reject nonexistent ForumPostID field queries
          if (params.Fields?.includes('ForumPostID') || filter.includes('ForumPostID')) {
            throw new Error(`Invalid field reference ForumPostID on ${params.EntityName}; must use PostID.`);
          }

          if (params.EntityName === 'MJ_BizApps_Collaboration: Spaces') {
            return {
              Success: true,
              Results: [{ ID: SPACE_1_ID, ParentID: null, InheritsMembership: false, ClosedAt: null }],
            };
          }

          if (params.EntityName === 'MJ_BizApps_Collaboration: Space Role Types') {
            return {
              Success: true,
              Results: [
                { ID: SPACE_ROLE_TEAM_ID, CanSeeTeamBand: true, CanContribute: true, IsActive: true },
                { ID: SPACE_ROLE_OUTSIDE_ID, CanSeeTeamBand: false, CanContribute: true, IsActive: true },
              ],
            };
          }

          if (params.EntityName === 'MJ_BizApps_Collaboration: Space Members') {
            if (filter.includes(MEMBER_A_ID)) {
              return {
                Success: true,
                Results: [
                  {
                    ID: 'sm-a-1',
                    SpaceID: SPACE_1_ID,
                    UserID: MEMBER_A_ID,
                    SpaceRoleTypeID: SPACE_ROLE_TEAM_ID,
                    Status: memberASpaceStatus,
                  },
                ],
              };
            }
            if (filter.includes(MEMBER_B_ID)) {
              return {
                Success: true,
                Results: [
                  {
                    ID: 'sm-b-1',
                    SpaceID: SPACE_1_ID,
                    UserID: MEMBER_B_ID,
                    SpaceRoleTypeID: SPACE_ROLE_OUTSIDE_ID,
                    Status: 'Active',
                  },
                ],
              };
            }
            // MEMBER_REVOKED_ID has Removed space membership
            if (filter.includes(MEMBER_REVOKED_ID)) {
              return {
                Success: true,
                Results: [
                  {
                    ID: 'sm-r-1',
                    SpaceID: SPACE_1_ID,
                    UserID: MEMBER_REVOKED_ID,
                    SpaceRoleTypeID: SPACE_ROLE_OUTSIDE_ID,
                    Status: 'Removed',
                  },
                ],
              };
            }
            return { Success: true, Results: [] };
          }

          if (params.EntityName === COMMUNITY_ENTITY_NAMES.Forums) {
            const allForums = [
              {
                ID: FORUM_TAX_ID,
                SpaceID: SPACE_1_ID,
                Name: 'Tax & Regulatory',
                Slug: 'tax-regulatory',
                Status: 'Active',
                PostingPolicy: forumPolicy,
                VisibilityBand: 'Shared',
                InheritsSpaceMembers: true,
              },
              {
                ID: FORUM_API_ID,
                SpaceID: SPACE_1_ID,
                Name: 'API & GraphQL',
                Slug: 'api-graphql',
                Status: 'Active',
                PostingPolicy: 'Open',
                VisibilityBand: 'Shared',
                InheritsSpaceMembers: true,
              },
              {
                ID: FORUM_PRIVATE_ID,
                SpaceID: SPACE_1_ID,
                Name: 'Executive Private Forum',
                Slug: 'exec-private',
                Status: 'Active',
                PostingPolicy: 'Open',
                VisibilityBand: 'PrivateForum',
                InheritsSpaceMembers: false,
              },
            ];
            if (filter.includes(`ID = '${FORUM_API_ID}'`)) {
              return { Success: true, Results: [allForums[1]] };
            }
            if (filter.includes(`ID = '${FORUM_TAX_ID}'`)) {
              return { Success: true, Results: [allForums[0]] };
            }
            if (filter.includes(`ID = '${FORUM_PRIVATE_ID}'`)) {
              return { Success: true, Results: [allForums[2]] };
            }
            return { Success: true, Results: allForums };
          }

          if (params.EntityName === COMMUNITY_ENTITY_NAMES.ForumPosts) {
            if (filter.includes(`ID = '${POST_TAX_ID}'`)) {
              return {
                Success: true,
                Results: [
                  {
                    ID: POST_TAX_ID,
                    ForumID: FORUM_TAX_ID,
                    RootPostID: null,
                    ReplyDepth: 0,
                    VisibilityBand: 'Shared',
                    Status: 'Published',
                    IsLocked: threadLocked,
                  },
                ],
              };
            }
            if (filter.includes(`AuthorUserID = '${MEMBER_A_ID}'`)) {
              return {
                Success: true,
                Results: [
                  {
                    ID: 'hist-a-1',
                    ForumID: FORUM_TAX_ID,
                    Title: 'Wayfair Economic Nexus Compliance',
                    BodyMarkdown: 'Sales tax nexus thresholds, state filing deadlines, and tax audit prep.',
                    AuthorUserID: MEMBER_A_ID,
                    __mj_CreatedAt: '2026-11-18T12:00:00.000Z',
                  },
                ],
              };
            }
            if (filter.includes(`AuthorUserID = '${MEMBER_B_ID}'`)) {
              return {
                Success: true,
                Results: [
                  {
                    ID: 'hist-b-1',
                    ForumID: FORUM_API_ID,
                    Title: 'GraphQL Mutation Resolvers',
                    BodyMarkdown: 'Designing GraphQL schema resolvers, webhook API payloads, and REST endpoints.',
                    AuthorUserID: MEMBER_B_ID,
                    __mj_CreatedAt: '2026-11-18T12:00:00.000Z',
                  },
                ],
              };
            }
            // Shared candidate pool includes Shared posts, a Team-band post, and a PrivateForum post!
            return {
              Success: true,
              Results: [
                {
                  ID: POST_TAX_ID,
                  ForumID: FORUM_TAX_ID,
                  Title: '2027 State Sales Tax Nexus & Audit Compliance Guide',
                  BodyMarkdown:
                    'Updated multi-state economic nexus thresholds, sales tax compliance filings, and audit readiness.',
                  SummaryMarkdown: 'Key state tax nexus updates and audit filing rules.',
                  AuthorUserID: 'ffffffff-0000-4000-8000-000000000001',
                  VisibilityBand: 'Shared',
                  ReplyCount: 8,
                  ReactionScore: 15,
                  LastActivityAt: '2026-11-18T12:00:00.000Z',
                  __mj_CreatedAt: '2026-11-18T10:00:00.000Z',
                },
                {
                  ID: POST_API_ID,
                  ForumID: FORUM_API_ID,
                  Title: 'GraphQL Resolver Batching & Webhook API Security',
                  BodyMarkdown:
                    'How to optimize GraphQL schema resolvers, JSON query batching, and API webhook endpoints.',
                  SummaryMarkdown: 'Performance and security patterns for GraphQL resolvers and APIs.',
                  AuthorUserID: 'ffffffff-0000-4000-8000-000000000002',
                  VisibilityBand: 'Shared',
                  ReplyCount: 8,
                  ReactionScore: 15,
                  LastActivityAt: '2026-11-18T12:00:00.000Z',
                  __mj_CreatedAt: '2026-11-18T10:00:00.000Z',
                },
                {
                  ID: POST_PRIVATE_ID,
                  ForumID: FORUM_PRIVATE_ID,
                  Title: 'RESTRICTED_PRIVATE_BOARD_M&A_MEMO',
                  BodyMarkdown: 'Confidential M&A committee terms strictly for private forum members.',
                  SummaryMarkdown: 'Confidential private forum summary.',
                  AuthorUserID: 'ffffffff-0000-4000-8000-000000000003',
                  VisibilityBand: 'Shared',
                  ReplyCount: 12,
                  ReactionScore: 30,
                  LastActivityAt: '2026-11-19T12:00:00.000Z',
                  __mj_CreatedAt: '2026-11-19T10:00:00.000Z',
                },
                {
                  ID: POST_TEAM_ID,
                  ForumID: FORUM_API_ID,
                  Title: 'RESTRICTED_INTERNAL_TEAM_INCIDENT_POSTMORTEM',
                  BodyMarkdown: 'Internal-only GraphQL resolver memory leak postmortem for staff Team band.',
                  SummaryMarkdown: 'Internal team incident notes.',
                  AuthorUserID: 'ffffffff-0000-4000-8000-000000000004',
                  VisibilityBand: 'Team',
                  ReplyCount: 12,
                  ReactionScore: 30,
                  LastActivityAt: '2026-11-19T12:00:00.000Z',
                  __mj_CreatedAt: '2026-11-19T10:00:00.000Z',
                },
              ],
            };
          }

          if (params.EntityName === COMMUNITY_ENTITY_NAMES.ForumPostTags) {
            assert.ok(params.Fields?.includes('PostID'), 'ForumPostTags must select PostID');
            return {
              Success: true,
              Results: [{ PostID: POST_TAX_ID, TopicTagID: '11111111-9999-4999-8999-111111111111' }],
            };
          }

          if (params.EntityName === COMMUNITY_ENTITY_NAMES.ForumTopicTags) {
            return {
              Success: true,
              Results: [{ ID: '11111111-9999-4999-8999-111111111111', Name: 'Tax' }],
            };
          }

          if (params.EntityName === COMMUNITY_ENTITY_NAMES.ForumPostReactions) {
            assert.ok(params.Fields?.includes('PostID'), 'ForumPostReactions must select PostID');
            return { Success: true, Results: [] };
          }

          if (params.EntityName === 'MJ: Users') {
            return {
              Success: true,
              Results: [
                { ID: MEMBER_A_ID, Name: 'Alice Tax Counsel', Email: 'alice@example.org' },
                { ID: MEMBER_B_ID, Name: 'Bob API Architect', Email: 'bob@example.org' },
                { ID: MEMBER_REVOKED_ID, Name: 'Eve Revoked', Email: 'eve@example.org' },
              ],
            };
          }

          if (params.EntityName === COMMUNITY_ENTITY_NAMES.ForumMembers) {
            if (filter.includes(MEMBER_A_ID)) {
              return {
                Success: true,
                Results: [
                  {
                    ID: 'fm-a-1',
                    ForumID: FORUM_TAX_ID,
                    UserID: MEMBER_A_ID,
                    ForumRoleTypeID: memberARoleId,
                    Status: memberAForumStatus,
                  },
                  {
                    ID: 'fm-a-priv',
                    ForumID: FORUM_PRIVATE_ID,
                    UserID: MEMBER_A_ID,
                    ForumRoleTypeID: ROLE_MEMBER_ID,
                    Status: 'Active',
                  },
                ],
              };
            }
            return { Success: true, Results: [] };
          }

          if (params.EntityName === COMMUNITY_ENTITY_NAMES.ForumRoleTypes) {
            if (roleLookupFails) {
              return { Success: false, Results: [], ErrorMessage: 'Simulated ForumRoleTypes lookup failure' };
            }
            const allRoles = [
              {
                ID: ROLE_MEMBER_ID,
                Name: 'Member',
                CanConfigureForum: false,
                CanModerateQueue: false,
                CanCreateRootPost: true,
                CanReply: true,
                IsActive: true,
              },
              {
                ID: ROLE_READONLY_ID,
                Name: 'Observer',
                CanConfigureForum: false,
                CanModerateQueue: false,
                CanCreateRootPost: false,
                CanReply: false,
                IsActive: true,
              },
            ];
            const missingRoleMatch = filter.match(/ID = '([^']+)'/);
            if (missingRoleMatch) {
              return {
                Success: true,
                Results: allRoles.filter((r) => r.ID.toLowerCase() === missingRoleMatch[1].toLowerCase()),
              };
            }
            return { Success: true, Results: allRoles };
          }

          if (params.EntityName === COMMUNITY_ENTITY_NAMES.PostTypes) {
            return { Success: true, Results: [{ ID: REPLY_TYPE_ID, Code: 'reply' }] };
          }

          return { Success: true, Results: [] };
        },
      );

      mock.method(Metadata.prototype, 'GetEntityObject', async () => {
        const record: CapturedForumPostRecord = {
          ID: '99999999-aaaa-4aaa-8aaa-999999999999',
          ForumID: '',
          PostTypeID: '',
          RootPostID: null,
          ParentPostID: null,
          ReplyDepth: 0,
          AuthorUserID: null,
          BodyMarkdown: '',
          VisibilityBand: 'Shared',
          Status: 'Published',
          Save: async () => {
            savedReplies.push(record);
            return true;
          },
        };
        return record;
      });

      // Step 1: Dispatch personalized digests for Member A (Team + PrivateForum), Member B (Outside/Shared only), and Revoked user
      const memberAUser = new UserInfo(undefined, { ID: MEMBER_A_ID, Email: 'alice@example.org', Name: 'Alice' });
      const sendAction = new SendPersonalizedCommunityDigestAction();
      const sendParams = new RunActionParams();
      sendParams.ContextUser = memberAUser;
      sendParams.Filters = [];
      sendParams.Params = [
        { Name: 'AllowedForumIDs', Value: `${FORUM_TAX_ID},${FORUM_API_ID},${FORUM_PRIVATE_ID}`, Type: 'Input' },
        { Name: 'RecipientUserIDs', Value: `${MEMBER_A_ID},${MEMBER_B_ID},${MEMBER_REVOKED_ID}`, Type: 'Input' },
        { Name: 'UseTestDriver', Value: 'true', Type: 'Input' },
        { Name: 'MaxItemsPerDigest', Value: '10', Type: 'Input' },
      ];

      const sendResult = await sendAction.Run(sendParams);
      assert.equal(sendResult.Success, true, sendResult.Message);
      assert.equal(sendResult.ResultCode, 'SUCCESS');

      const outbox = CommunityTestCommunicationProvider.GetSentMessages();
      // Revoked member MUST NOT receive any email or reply token!
      assert.equal(outbox.length, 2);

      const aliceEmail = outbox.find((m) => m.to === 'alice@example.org');
      const bobEmail = outbox.find((m) => m.to === 'bob@example.org');
      const revokedEmail = outbox.find((m) => m.to === 'eve@example.org');
      assert.ok(aliceEmail, 'Alice digest must be captured in outbox');
      assert.ok(bobEmail, 'Bob digest must be captured in outbox');
      assert.equal(revokedEmail, undefined, 'Revoked recipient must receive zero outbox messages');

      // RFC 5321 compliance on every generated Reply-To address
      assert.ok(aliceEmail.replyTo);
      assert.ok(bobEmail.replyTo);
      assertRfc5321CompliantAddress(aliceEmail.replyTo);
      assertRfc5321CompliantAddress(bobEmail.replyTo);

      // CR-02 Authorization Isolation:
      // Alice CAN see PrivateForum + Team posts; Bob MUST NOT see PrivateForum or Team posts!
      assert.match(aliceEmail.htmlBody, /RESTRICTED_PRIVATE_BOARD_M&amp;A_MEMO/);
      assert.match(aliceEmail.htmlBody, /RESTRICTED_INTERNAL_TEAM_INCIDENT_POSTMORTEM/);
      assert.doesNotMatch(bobEmail.htmlBody, /RESTRICTED_PRIVATE_BOARD/);
      assert.doesNotMatch(bobEmail.htmlBody, /RESTRICTED_INTERNAL_TEAM_INCIDENT_POSTMORTEM/);
      assert.doesNotMatch(bobEmail.body, /RESTRICTED_PRIVATE_BOARD/);
      assert.doesNotMatch(bobEmail.body, /RESTRICTED_INTERNAL_TEAM_INCIDENT_POSTMORTEM/);
      assert.match(bobEmail.subject, /GraphQL Resolver/);

      // Extract Alice's tax thread reply-to address from her email text body for reply-by-email verification
      const taxReplyMatch = aliceEmail.body.match(/reply\+[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+@reply\.bizapps\.local/);
      assert.ok(taxReplyMatch);
      // Use a fresh Tax-scoped send to obtain Alice's Tax thread Reply-To address directly
      CommunityTestCommunicationProvider.ClearSentMessages();
      const taxOnlySendParams = new RunActionParams();
      taxOnlySendParams.ContextUser = memberAUser;
      taxOnlySendParams.Filters = [];
      taxOnlySendParams.Params = [
        { Name: 'AllowedForumIDs', Value: FORUM_TAX_ID, Type: 'Input' },
        { Name: 'RecipientUserIDs', Value: MEMBER_A_ID, Type: 'Input' },
        { Name: 'UseTestDriver', Value: 'true', Type: 'Input' },
        { Name: 'MaxItemsPerDigest', Value: '1', Type: 'Input' },
      ];
      const taxSendRes = await sendAction.Run(taxOnlySendParams);
      assert.equal(taxSendRes.Success, true);
      const aliceTaxEmail = CommunityTestCommunicationProvider.GetSentMessages()[0];
      assert.ok(aliceTaxEmail?.replyTo);
      assertRfc5321CompliantAddress(aliceTaxEmail.replyTo);

      // Step 2: Member A replies via email using her captured Reply-To token (NO ReplySigningSecret in Params!)
      const replyAction = new ProcessInboundDigestReplyAction();
      const validReplyParams = new RunActionParams();
      validReplyParams.ContextUser = memberAUser;
      validReplyParams.Filters = [];
      validReplyParams.Params = [
        { Name: 'ReplyToAddress', Value: aliceTaxEmail.replyTo, Type: 'Input' },
        { Name: 'SenderEmail', Value: 'alice@example.org', Type: 'Input' },
        {
          Name: 'RawBodyText',
          Value: 'Thanks! We confirmed the new Illinois nexus threshold takes effect Jan 1.\n\nOn Thu, Nov 19, 2026 wrote:\n> Digest preview',
          Type: 'Input',
        },
      ];

      const replyResult = await replyAction.Run(validReplyParams);
      assert.equal(replyResult.Success, true, replyResult.Message);
      assert.equal(replyResult.ResultCode, 'SUCCESS');
      assert.equal(savedReplies.length, 1);
      assert.equal(savedReplies[0].ForumID, FORUM_TAX_ID);
      assert.equal(savedReplies[0].RootPostID, POST_TAX_ID);
      assert.equal(savedReplies[0].ParentPostID, POST_TAX_ID);
      assert.equal(savedReplies[0].ReplyDepth, 1);
      assert.equal(savedReplies[0].AuthorUserID, MEMBER_A_ID);
      assert.equal(savedReplies[0].PostTypeID, REPLY_TYPE_ID);
      assert.equal(
        savedReplies[0].BodyMarkdown,
        'Thanks! We confirmed the new Illinois nexus threshold takes effect Jan 1.',
      );

      // Step 3: CR-01 Security checks — caller-supplied ReplySigningSecret and SkipSenderBindingCheck CANNOT bypass!
      const attackerSecret = 'attacker-controlled-secret-999';
      const forgedToken = SignDigestReplyToken({
        memberUserId: MEMBER_A_ID,
        forumId: FORUM_TAX_ID,
        rootPostId: POST_TAX_ID,
        recipientEmail: 'alice@example.org',
        signingSecret: attackerSecret,
      });
      const forgedParams = new RunActionParams();
      forgedParams.ContextUser = memberAUser;
      forgedParams.Filters = [];
      forgedParams.Params = [
        { Name: 'ReplyToAddress', Value: BuildReplyToEmailAddress(forgedToken, 'reply.bizapps.local'), Type: 'Input' },
        { Name: 'SenderEmail', Value: 'alice@example.org', Type: 'Input' },
        { Name: 'ReplySigningSecret', Value: attackerSecret, Type: 'Input' },
        { Name: 'RawBodyText', Value: 'Forged reply with attacker secret', Type: 'Input' },
      ];
      const forgedRes = await replyAction.Run(forgedParams);
      assert.equal(forgedRes.Success, false);
      assert.equal(forgedRes.ResultCode, 'INVALID_SIGNATURE');
      assert.equal(savedReplies.length, 1);

      const skipCheckBypassParams = new RunActionParams();
      skipCheckBypassParams.ContextUser = memberAUser;
      skipCheckBypassParams.Filters = [];
      skipCheckBypassParams.Params = [
        { Name: 'ReplyToAddress', Value: aliceTaxEmail.replyTo, Type: 'Input' },
        { Name: 'SenderEmail', Value: 'mallory@example.org', Type: 'Input' },
        { Name: 'SkipSenderBindingCheck', Value: 'true', Type: 'Input' },
        { Name: 'RawBodyText', Value: 'Sender spoofing attempt', Type: 'Input' },
      ];
      const skipBypassRes = await replyAction.Run(skipCheckBypassParams);
      assert.equal(skipBypassRes.Success, false);
      assert.equal(skipBypassRes.ResultCode, 'SENDER_MISMATCH');
      assert.equal(savedReplies.length, 1);

      // Step 4: CR-04 & CR-05 Fail-closed checks (ZERO additional persisted replies)
      // 4a. Tampered signature
      const [localReply, domainReply] = aliceTaxEmail.replyTo.split('@');
      const tamperedReplyTo = `${localReply.slice(0, -1)}${localReply.endsWith('A') ? 'B' : 'A'}@${domainReply}`;
      const tamperedParams = new RunActionParams();
      tamperedParams.ContextUser = memberAUser;
      tamperedParams.Filters = [];
      tamperedParams.Params = [
        { Name: 'ReplyToAddress', Value: tamperedReplyTo, Type: 'Input' },
        { Name: 'SenderEmail', Value: 'alice@example.org', Type: 'Input' },
        { Name: 'RawBodyText', Value: 'Should not persist', Type: 'Input' },
      ];
      const tamperedRes = await replyAction.Run(tamperedParams);
      assert.equal(tamperedRes.Success, false);
      assert.equal(tamperedRes.ResultCode, 'INVALID_SIGNATURE');
      assert.equal(savedReplies.length, 1);

      // 4b. Unknown handle
      const unknownParams = new RunActionParams();
      unknownParams.ContextUser = memberAUser;
      unknownParams.Filters = [];
      unknownParams.Params = [
        { Name: 'ReplyToAddress', Value: 'reply+unknownhandle1234.fakesig12345678901234567890@reply.bizapps.local', Type: 'Input' },
        { Name: 'SenderEmail', Value: 'alice@example.org', Type: 'Input' },
        { Name: 'RawBodyText', Value: 'Unknown handle should not persist', Type: 'Input' },
      ];
      const unknownRes = await replyAction.Run(unknownParams);
      assert.equal(unknownRes.Success, false);
      assert.equal(unknownRes.ResultCode, 'UNKNOWN_TOKEN_HANDLE');
      assert.equal(savedReplies.length, 1);

      // 4c. Expired token
      const expiredToken = SignDigestReplyToken({
        memberUserId: MEMBER_A_ID,
        forumId: FORUM_TAX_ID,
        rootPostId: POST_TAX_ID,
        recipientEmail: 'alice@example.org',
        signingSecret: TEST_SIGNING_SECRET,
        now: new Date(Date.now() - 3600 * 1000),
        ttlSeconds: 60,
      });
      const expiredParams = new RunActionParams();
      expiredParams.ContextUser = memberAUser;
      expiredParams.Filters = [];
      expiredParams.Params = [
        { Name: 'ReplyToken', Value: expiredToken, Type: 'Input' },
        { Name: 'SenderEmail', Value: 'alice@example.org', Type: 'Input' },
        { Name: 'RawBodyText', Value: 'Expired reply should not persist', Type: 'Input' },
      ];
      const expiredRes = await replyAction.Run(expiredParams);
      assert.equal(expiredRes.Success, false);
      assert.equal(expiredRes.ResultCode, 'TOKEN_EXPIRED');
      assert.equal(savedReplies.length, 1);

      // 4d. Mismatched ContextUser
      const memberBUser = new UserInfo(undefined, { ID: MEMBER_B_ID, Email: 'bob@example.org', Name: 'Bob' });
      const mismatchUserParams = new RunActionParams();
      mismatchUserParams.ContextUser = memberBUser;
      mismatchUserParams.Filters = [];
      mismatchUserParams.Params = [
        { Name: 'ReplyToAddress', Value: aliceTaxEmail.replyTo, Type: 'Input' },
        { Name: 'SenderEmail', Value: 'alice@example.org', Type: 'Input' },
        { Name: 'RawBodyText', Value: 'Impersonation attempt', Type: 'Input' },
      ];
      const mismatchRes = await replyAction.Run(mismatchUserParams);
      assert.equal(mismatchRes.Success, false);
      assert.equal(mismatchRes.ResultCode, 'MEMBER_MISMATCH');
      assert.equal(savedReplies.length, 1);

      // 4e. CR-05: Invited ForumMember rejected (0 writes)
      memberAForumStatus = 'Invited';
      const invitedForumRes = await replyAction.Run(validReplyParams);
      assert.equal(invitedForumRes.Success, false);
      assert.equal(invitedForumRes.ResultCode, 'ACCESS_REVOKED');
      assert.equal(savedReplies.length, 1);
      memberAForumStatus = 'Active';

      // 4f. CR-05: Invited SpaceMember rejected (0 writes)
      memberASpaceStatus = 'Invited';
      const invitedSpaceRes = await replyAction.Run(validReplyParams);
      assert.equal(invitedSpaceRes.Success, false);
      assert.equal(invitedSpaceRes.ResultCode, 'ACCESS_REVOKED');
      assert.equal(savedReplies.length, 1);
      memberASpaceStatus = 'Active';

      // 4g. CR-05: Muted ForumMember rejected (0 writes)
      memberAForumStatus = 'Muted';
      const mutedRes = await replyAction.Run(validReplyParams);
      assert.equal(mutedRes.Success, false);
      assert.equal(mutedRes.ResultCode, 'ACCESS_REVOKED');
      assert.equal(savedReplies.length, 1);
      memberAForumStatus = 'Active';

      // 4h. CR-05: Missing ForumRoleType rejected (0 writes)
      memberARoleId = '00000000-0000-4000-8000-000000000999';
      const missingRoleRes = await replyAction.Run(validReplyParams);
      assert.equal(missingRoleRes.Success, false);
      assert.equal(missingRoleRes.ResultCode, 'ACCESS_REVOKED');
      assert.equal(savedReplies.length, 1);
      memberARoleId = ROLE_MEMBER_ID;

      // 4i. CR-05: Failed ForumRoleTypes lookup rejected (0 writes)
      roleLookupFails = true;
      const failedRoleRes = await replyAction.Run(validReplyParams);
      assert.equal(failedRoleRes.Success, false);
      assert.equal(failedRoleRes.ResultCode, 'AUTHORITATIVE_LOAD_FAILED');
      assert.equal(savedReplies.length, 1);
      roleLookupFails = false;

      // 4j. CR-05: Role with CanReply === false rejected (0 writes)
      memberARoleId = ROLE_READONLY_ID;
      const noReplyRoleRes = await replyAction.Run(validReplyParams);
      assert.equal(noReplyRoleRes.Success, false);
      assert.equal(noReplyRoleRes.ResultCode, 'ACCESS_REVOKED');
      assert.equal(savedReplies.length, 1);
      memberARoleId = ROLE_MEMBER_ID;

      // 4k. Locked thread
      threadLocked = true;
      const lockedRes = await replyAction.Run(validReplyParams);
      assert.equal(lockedRes.Success, false);
      assert.equal(lockedRes.ResultCode, 'THREAD_LOCKED');
      assert.equal(savedReplies.length, 1);
      threadLocked = false;

      // 4l. ReadOnly forum policy
      forumPolicy = 'ReadOnly';
      const readOnlyRes = await replyAction.Run(validReplyParams);
      assert.equal(readOnlyRes.Success, false);
      assert.equal(readOnlyRes.ResultCode, 'FORUM_READ_ONLY');
      assert.equal(savedReplies.length, 1);
      forumPolicy = 'Open';

      // 4m. Empty body after stripping quoted reply chrome
      const emptyQuoteParams = new RunActionParams();
      emptyQuoteParams.ContextUser = memberAUser;
      emptyQuoteParams.Filters = [];
      emptyQuoteParams.Params = [
        { Name: 'ReplyToAddress', Value: aliceTaxEmail.replyTo, Type: 'Input' },
        { Name: 'SenderEmail', Value: 'alice@example.org', Type: 'Input' },
        { Name: 'RawBodyText', Value: '> Only quoted text\n\n--\nSignature', Type: 'Input' },
      ];
      const emptyRes = await replyAction.Run(emptyQuoteParams);
      assert.equal(emptyRes.Success, false);
      assert.equal(emptyRes.ResultCode, 'EMPTY_REPLY_BODY');
      assert.equal(savedReplies.length, 1);

      // 4n. Mismatched thread/forum binding
      const crossForumToken = SignDigestReplyToken({
        memberUserId: MEMBER_A_ID,
        forumId: FORUM_API_ID,
        rootPostId: POST_TAX_ID,
        recipientEmail: 'alice@example.org',
        signingSecret: TEST_SIGNING_SECRET,
      });
      const parsedCross = ParseAndVerifyInboundEmailReply({
        replyToAddressOrToken: crossForumToken,
        rawBodyText: 'Cross-forum check',
        senderEmail: 'alice@example.org',
        signingSecret: TEST_SIGNING_SECRET,
      });
      assert.equal(parsedCross.token.valid, true);
      const crossForumParams = new RunActionParams();
      crossForumParams.ContextUser = memberAUser;
      crossForumParams.Filters = [];
      crossForumParams.Params = [
        { Name: 'ReplyToken', Value: crossForumToken, Type: 'Input' },
        { Name: 'SenderEmail', Value: 'alice@example.org', Type: 'Input' },
        { Name: 'RawBodyText', Value: 'Cross-forum check', Type: 'Input' },
      ];
      const crossRes = await replyAction.Run(crossForumParams);
      assert.equal(crossRes.Success, false);
      assert.equal(crossRes.ResultCode, 'THREAD_FORUM_MISMATCH');
      assert.equal(savedReplies.length, 1);

      // Verify all action IDs in COMMUNITY_ACTION_IDS are valid UUIDs
      const { COMMUNITY_ACTION_IDS } = await import('@mj-biz-apps/community-core');
      for (const id of Object.values(COMMUNITY_ACTION_IDS)) {
        assert.equal(IsValidUUID(id), true, `Action ID ${id} must be a valid UUID`);
      }
    } finally {
      if (prevEnvSecret === undefined) {
        delete process.env.COMMUNITY_DIGEST_REPLY_SECRET;
      } else {
        process.env.COMMUNITY_DIGEST_REPLY_SECRET = prevEnvSecret;
      }
      ClearDigestReplyTokenRegistry();
      CommunityTestCommunicationProvider.ClearSentMessages();
      mock.restoreAll();
    }
  });
});
