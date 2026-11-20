import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Metadata, RunView, UserInfo } from '@memberjunction/core';
import { RunActionParams } from '@memberjunction/actions-base';
import { BaseCommunicationProvider, CommunicationEngineBase, Message } from '@memberjunction/communication-types';
import { CommunicationEngine } from '@memberjunction/communication-engine';
import { MJGlobal } from '@memberjunction/global';
import { CommunityEmbeddingPersonalizationService } from '@mj-biz-apps/community-core';
import {
  BuildReplyToEmailAddress,
  ParseAndVerifyInboundEmailReply,
  RenderPersonalizedDigestEmail,
  SignDigestReplyToken,
  StripQuotedEmailReply,
  VerifyDigestReplyToken,
} from './custom/digest-reply-loop.ts';

const FORUM_TAX_ID = '11111111-1111-4111-8111-111111111111';
const FORUM_API_ID = '22222222-2222-4222-8222-222222222222';
const POST_TAX_ID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const POST_API_ID = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const MEMBER_A_ID = 'cccccccc-3333-4333-8333-cccccccccccc';
const MEMBER_B_ID = 'dddddddd-4444-4444-8444-dddddddddddd';
const REPLY_TYPE_ID = 'C8A17200-4E12-4B8F-9A10-100000000002';
const ROLE_MEMBER_ID = 'eeeeeeee-5555-4555-8555-eeeeeeeeeeee';
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

describe('Digest Reply Loop — HMAC-SHA256 tokens & email quote stripping', () => {
  it('signs and verifies member/thread-bound reply tokens via reply+<token>@domain', () => {
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
  });

  it('fails closed on tampered, expired, or sender-mismatched tokens', () => {
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

    // Tamper 1 character in payload
    const [p, s] = token.split('.');
    const tampered = `${p.slice(0, -1)}${p.endsWith('A') ? 'B' : 'A'}.${s}`;
    const tamperedRes = VerifyDigestReplyToken(tampered, {
      signingSecret: TEST_SIGNING_SECRET,
      expectedSenderEmail: 'alice@example.org',
      now,
    });
    assert.equal(tamperedRes.valid, false);
    if (!tamperedRes.valid) {
      assert.equal(tamperedRes.errorCode, 'INVALID_SIGNATURE');
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

  it('delivers distinct embedding-personalized digests for Member A vs Member B through CommunicationEngine and completes the reply-by-email loop', async () => {
    const {
      COMMUNITY_TEST_EMAIL_DRIVER_NAME,
      CommunityTestCommunicationProvider,
      LoadBizAppsCommunityActions,
      ProcessInboundDigestReplyAction,
      SendPersonalizedCommunityDigestAction,
    } = await import('../dist/index.js');

    LoadBizAppsCommunityActions();
    CommunityTestCommunicationProvider.ClearSentMessages();
    CommunityEmbeddingPersonalizationService.Instance.ResetToDefaultProvider();

    const fakeLog = { Status: 'Pending', ErrorMessage: '', Save: async () => true };
    const savedReplies: CapturedForumPostRecord[] = [];
    let memberAMuted = false;
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

      mock.method(RunView.prototype, 'RunView', async (params: { EntityName: string; ExtraFilter?: string }) => {
        const filter = params.ExtraFilter ?? '';
        if (params.EntityName === 'MJ_BizApps_Community: Forums') {
          const allForums = [
            {
              ID: FORUM_TAX_ID,
              SpaceID: '99999999-9999-4999-8999-999999999999',
              Name: 'Tax & Regulatory',
              Slug: 'tax-regulatory',
              Status: 'Active',
              PostingPolicy: forumPolicy,
              VisibilityBand: 'Shared',
              InheritsSpaceMembers: true,
            },
            {
              ID: FORUM_API_ID,
              SpaceID: '99999999-9999-4999-8999-999999999999',
              Name: 'API & GraphQL',
              Slug: 'api-graphql',
              Status: 'Active',
              PostingPolicy: 'Open',
              VisibilityBand: 'Shared',
              InheritsSpaceMembers: true,
            },
          ];
          if (filter.includes(`ID = '${FORUM_API_ID}'`)) {
            return { Success: true, Results: [allForums[1]] };
          }
          if (filter.includes(`ID = '${FORUM_TAX_ID}'`)) {
            return { Success: true, Results: [allForums[0]] };
          }
          return { Success: true, Results: allForums };
        }

        if (params.EntityName === 'MJ_BizApps_Community: Forum Posts') {
          // Single-ID lookup in ProcessInboundDigestReplyAction
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
          // Member authored history
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
          // Candidate pool (same shared pool for both Member A and Member B)
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
                ReplyCount: 8,
                ReactionScore: 15,
                LastActivityAt: '2026-11-18T12:00:00.000Z',
                __mj_CreatedAt: '2026-11-18T10:00:00.000Z',
              },
            ],
          };
        }

        if (params.EntityName === 'MJ: Users') {
          return {
            Success: true,
            Results: [
              { ID: MEMBER_A_ID, Name: 'Alice Tax Counsel', Email: 'alice@example.org' },
              { ID: MEMBER_B_ID, Name: 'Bob API Architect', Email: 'bob@example.org' },
            ],
          };
        }

        if (params.EntityName === 'MJ_BizApps_Community: Forum Members') {
          if (filter.includes(MEMBER_A_ID)) {
            return {
              Success: true,
              Results: [
                {
                  ID: 'fm-a-1',
                  ForumID: FORUM_TAX_ID,
                  UserID: MEMBER_A_ID,
                  ForumRoleTypeID: ROLE_MEMBER_ID,
                  Status: memberAMuted ? 'Muted' : 'Active',
                },
              ],
            };
          }
          return { Success: true, Results: [] };
        }

        if (params.EntityName === 'MJ_BizApps_Community: Forum Role Types') {
          return {
            Success: true,
            Results: [
              {
                ID: ROLE_MEMBER_ID,
                Name: 'Member',
                CanConfigureForum: false,
                CanModerateQueue: false,
                CanReply: true,
              },
            ],
          };
        }

        if (params.EntityName === 'MJ_BizApps_Community: Post Types') {
          return { Success: true, Results: [{ ID: REPLY_TYPE_ID, Code: 'reply' }] };
        }

        return { Success: true, Results: [] };
      });

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

      // Step 1: Dispatch personalized digests for Member A and Member B
      const memberAUser = new UserInfo(undefined, { ID: MEMBER_A_ID, Email: 'alice@example.org', Name: 'Alice' });
      const sendAction = new SendPersonalizedCommunityDigestAction();
      const sendParams = new RunActionParams();
      sendParams.ContextUser = memberAUser;
      sendParams.Filters = [];
      sendParams.Params = [
        { Name: 'AllowedForumIDs', Value: `${FORUM_TAX_ID},${FORUM_API_ID}`, Type: 'Input' },
        { Name: 'RecipientUserIDs', Value: `${MEMBER_A_ID},${MEMBER_B_ID}`, Type: 'Input' },
        { Name: 'UseTestDriver', Value: 'true', Type: 'Input' },
        { Name: 'ReplySigningSecret', Value: TEST_SIGNING_SECRET, Type: 'Input' },
        { Name: 'MaxItemsPerDigest', Value: '2', Type: 'Input' },
      ];

      const sendResult = await sendAction.Run(sendParams);
      assert.equal(sendResult.Success, true, sendResult.Message);
      assert.equal(sendResult.ResultCode, 'SUCCESS');

      const outbox = CommunityTestCommunicationProvider.GetSentMessages();
      assert.equal(outbox.length, 2);

      const aliceEmail = outbox.find((m) => m.to === 'alice@example.org');
      const bobEmail = outbox.find((m) => m.to === 'bob@example.org');
      assert.ok(aliceEmail, 'Alice digest must be captured in outbox');
      assert.ok(bobEmail, 'Bob digest must be captured in outbox');

      // Member A's top subject must be the Tax guide; Member B's top subject must be the GraphQL post!
      assert.match(aliceEmail.subject, /Sales Tax Nexus/);
      assert.match(bobEmail.subject, /GraphQL Resolver/);
      assert.notEqual(aliceEmail.subject, bobEmail.subject);
      assert.ok(aliceEmail.replyTo?.startsWith('reply+'));
      assert.ok(bobEmail.replyTo?.startsWith('reply+'));

      // Step 2: Member A replies via email using her captured Reply-To token
      const replyAction = new ProcessInboundDigestReplyAction();
      const validReplyParams = new RunActionParams();
      validReplyParams.ContextUser = memberAUser;
      validReplyParams.Filters = [];
      validReplyParams.Params = [
        { Name: 'ReplyToAddress', Value: aliceEmail.replyTo ?? '', Type: 'Input' },
        { Name: 'SenderEmail', Value: 'alice@example.org', Type: 'Input' },
        { Name: 'ReplySigningSecret', Value: TEST_SIGNING_SECRET, Type: 'Input' },
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
      assert.equal(savedReplies[0].BodyMarkdown, 'Thanks! We confirmed the new Illinois nexus threshold takes effect Jan 1.');

      // Step 3: Fail-closed security & access checks (ZERO additional persisted replies)
      // 3a. Tampered token (mutate signature before @domain)
      const [localReply, domainReply] = (aliceEmail.replyTo ?? '').split('@');
      const tamperedReplyTo = `${localReply.slice(0, -1)}${localReply.endsWith('A') ? 'B' : 'A'}@${domainReply}`;
      const tamperedParams = new RunActionParams();
      tamperedParams.ContextUser = memberAUser;
      tamperedParams.Filters = [];
      tamperedParams.Params = [
        { Name: 'ReplyToAddress', Value: tamperedReplyTo, Type: 'Input' },
        { Name: 'SenderEmail', Value: 'alice@example.org', Type: 'Input' },
        { Name: 'ReplySigningSecret', Value: TEST_SIGNING_SECRET, Type: 'Input' },
        { Name: 'RawBodyText', Value: 'Should not persist', Type: 'Input' },
      ];
      const tamperedRes = await replyAction.Run(tamperedParams);
      assert.equal(tamperedRes.Success, false);
      assert.equal(tamperedRes.ResultCode, 'INVALID_SIGNATURE');
      assert.equal(savedReplies.length, 1);

      // 3a-ii. Expired token
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
        { Name: 'ReplySigningSecret', Value: TEST_SIGNING_SECRET, Type: 'Input' },
        { Name: 'RawBodyText', Value: 'Expired reply should not persist', Type: 'Input' },
      ];
      const expiredRes = await replyAction.Run(expiredParams);
      assert.equal(expiredRes.Success, false);
      assert.equal(expiredRes.ResultCode, 'TOKEN_EXPIRED');
      assert.equal(savedReplies.length, 1);

      // 3b. Mismatched ContextUser (Bob attempting to replay Alice's token)
      const memberBUser = new UserInfo(undefined, { ID: MEMBER_B_ID, Email: 'bob@example.org', Name: 'Bob' });
      const mismatchUserParams = new RunActionParams();
      mismatchUserParams.ContextUser = memberBUser;
      mismatchUserParams.Filters = [];
      mismatchUserParams.Params = [
        { Name: 'ReplyToAddress', Value: aliceEmail.replyTo ?? '', Type: 'Input' },
        { Name: 'SenderEmail', Value: 'alice@example.org', Type: 'Input' },
        { Name: 'ReplySigningSecret', Value: TEST_SIGNING_SECRET, Type: 'Input' },
        { Name: 'RawBodyText', Value: 'Impersonation attempt', Type: 'Input' },
      ];
      const mismatchRes = await replyAction.Run(mismatchUserParams);
      assert.equal(mismatchRes.Success, false);
      assert.equal(mismatchRes.ResultCode, 'MEMBER_MISMATCH');
      assert.equal(savedReplies.length, 1);

      // 3c. Revoked forum access (member muted)
      memberAMuted = true;
      const mutedRes = await replyAction.Run(validReplyParams);
      assert.equal(mutedRes.Success, false);
      assert.equal(mutedRes.ResultCode, 'ACCESS_REVOKED');
      assert.equal(savedReplies.length, 1);
      memberAMuted = false;

      // 3d. Locked thread
      threadLocked = true;
      const lockedRes = await replyAction.Run(validReplyParams);
      assert.equal(lockedRes.Success, false);
      assert.equal(lockedRes.ResultCode, 'THREAD_LOCKED');
      assert.equal(savedReplies.length, 1);
      threadLocked = false;

      // 3e. ReadOnly forum policy
      forumPolicy = 'ReadOnly';
      const readOnlyRes = await replyAction.Run(validReplyParams);
      assert.equal(readOnlyRes.Success, false);
      assert.equal(readOnlyRes.ResultCode, 'FORUM_READ_ONLY');
      assert.equal(savedReplies.length, 1);
      forumPolicy = 'Open';

      // 3f. Empty body after stripping quoted reply chrome
      const emptyQuoteParams = new RunActionParams();
      emptyQuoteParams.ContextUser = memberAUser;
      emptyQuoteParams.Filters = [];
      emptyQuoteParams.Params = [
        { Name: 'ReplyToAddress', Value: aliceEmail.replyTo ?? '', Type: 'Input' },
        { Name: 'SenderEmail', Value: 'alice@example.org', Type: 'Input' },
        { Name: 'ReplySigningSecret', Value: TEST_SIGNING_SECRET, Type: 'Input' },
        { Name: 'RawBodyText', Value: '> Only quoted text\n\n--\nSignature', Type: 'Input' },
      ];
      const emptyRes = await replyAction.Run(emptyQuoteParams);
      assert.equal(emptyRes.Success, false);
      assert.equal(emptyRes.ResultCode, 'EMPTY_REPLY_BODY');
      assert.equal(savedReplies.length, 1);

      // 3g. Mismatched thread/forum binding (token signed for FORUM_API_ID + POST_TAX_ID which belongs to FORUM_TAX_ID)
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
        { Name: 'ReplySigningSecret', Value: TEST_SIGNING_SECRET, Type: 'Input' },
        { Name: 'RawBodyText', Value: 'Cross-forum check', Type: 'Input' },
      ];
      const crossRes = await replyAction.Run(crossForumParams);
      assert.equal(crossRes.Success, false);
      assert.equal(crossRes.ResultCode, 'THREAD_FORUM_MISMATCH');
      assert.equal(savedReplies.length, 1);
    } finally {
      CommunityTestCommunicationProvider.ClearSentMessages();
      mock.restoreAll();
    }
  });
});
