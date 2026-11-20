import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, mock } from 'node:test';
import {
  ARCH_ALL_FORUM_TYPE_CODES,
  ARCH_ALL_POST_TYPE_CODES,
  ARCH_COMMUNITY_SPACES,
  ARCH_FORUMS,
  ARCH_IDEA_ALLOCATIONS,
  ARCH_IDEA_POSTS,
  ARCH_MEMBERS,
  ARCH_POST_TAGS,
  ARCH_POSTS,
  ARCH_TOPIC_TAGS,
  GetArchWorldSeedSummary,
} from './arch-world-data.mjs';
import {
  BuildArchitectAssociationWorldSql,
  CountArchWorldStoreRecords,
  CreateArchWorldRuntimeBridge,
  CreatePersistedArchWorldProvider,
  GetSharedArchWorldStore,
  LoadArchitectAssociationWorld,
  MakeArchUserInfo,
  ResetSharedArchWorldStore,
  TeardownArchitectAssociationWorld,
} from './arch-world-loader.mjs';
import { EvaluateCommunityForumCanPost } from '../fn-community-forum-access-shadow.mjs';
import * as CommunityCore from '../../packages/Core/dist/index.js';
import * as CommunityActions from '../../packages/Actions/dist/index.js';
import * as CommunityEntities from '../../packages/Entities/dist/index.js';
import * as CommunityCoreEntitiesServer from '../../packages/CoreEntitiesServer/dist/index.js';

const requireFromActions = createRequire(new URL('../../packages/Actions/package.json', import.meta.url));
const { CompositeKey, Metadata, RunView, TransactionGroupBase, UserInfo } = await import(
  requireFromActions.resolve('@memberjunction/core')
);
const { RunActionParams } = await import(requireFromActions.resolve('@memberjunction/actions-base'));
const { CommunicationEngine } = await import(requireFromActions.resolve('@memberjunction/communication-engine'));
const { CommunicationEngineBase } = await import(requireFromActions.resolve('@memberjunction/communication-types'));

// @memberjunction/server validates DB_* env vars at module load time; set harmless placeholders
// only if unset and restore immediately after loading CommunityServer (mirrors slice3-graduation.test.ts).
const CommunityServer = await (async () => {
  const prevDb = process.env.DB_DATABASE;
  const prevUser = process.env.DB_USERNAME;
  const prevPass = process.env.DB_PASSWORD;
  if (!process.env.DB_DATABASE) process.env.DB_DATABASE = 'mj_arch_world_integration';
  if (!process.env.DB_USERNAME) process.env.DB_USERNAME = 'mj_arch_world_integration';
  if (!process.env.DB_PASSWORD) process.env.DB_PASSWORD = 'mj_arch_world_integration_placeholder';
  try {
    return await import('../../packages/Server/dist/index.js');
  } finally {
    if (prevDb === undefined) delete process.env.DB_DATABASE;
    else process.env.DB_DATABASE = prevDb;
    if (prevUser === undefined) delete process.env.DB_USERNAME;
    else process.env.DB_USERNAME = prevUser;
    if (prevPass === undefined) delete process.env.DB_PASSWORD;
    else process.env.DB_PASSWORD = prevPass;
  }
})();

const { COMMUNITY_ENTITY_NAMES } = CommunityEntities;
const {
  ForumIdeaAllocationServerEntity,
  ForumPostTagServerEntity,
} = CommunityCoreEntitiesServer;
const { CommunityEmbeddingPersonalizationService, CommunityRules } = CommunityCore;
const {
  AskFirstDeflectionAction,
  BuildReplyToEmailAddress,
  COMMUNITY_TEST_EMAIL_DRIVER_NAME,
  ClearDigestReplyTokenRegistry,
  CommunityTestCommunicationProvider,
  LivingThreadSynthesisAction,
  LoadBizAppsCommunityActions,
  ProcessInboundDigestReplyAction,
  RFC_5321_MAX_ADDRESS_OCTETS,
  RFC_5321_MAX_LOCAL_PART_OCTETS,
  SendPersonalizedCommunityDigestAction,
  SignDigestReplyToken,
} = CommunityActions;
const { BuildDeterministicGraduationUUID, ThreadGraduationService } = CommunityServer;

class InMemoryArchTxGroup extends TransactionGroupBase {
  constructor() {
    super();
    this.submitCalls = 0;
  }

  async Submit(allowRetryOfFailedTransaction) {
    this.submitCalls += 1;
    return super.Submit(allowRetryOfFailedTransaction);
  }

  async HandleSubmit() {
    return [];
  }
}

function paramOf(result, name) {
  return result.Params?.find((p) => p.Name.toLowerCase() === name.toLowerCase())?.Value;
}

function assertRfc5321Compliant(address) {
  const atIdx = address.indexOf('@');
  assert.ok(atIdx > 0, `Address missing @: ${address}`);
  const localPart = address.slice(0, atIdx);
  assert.ok(
    Buffer.byteLength(localPart, 'utf8') <= RFC_5321_MAX_LOCAL_PART_OCTETS,
    `Local-part ${localPart} exceeds RFC 5321 64 octets`,
  );
  assert.ok(
    Buffer.byteLength(address, 'utf8') <= RFC_5321_MAX_ADDRESS_OCTETS,
    `Address ${address} exceeds RFC 5321 254 octets`,
  );
}

const KENJI_ID = 'A7C40400-4E12-4B8F-9A10-000000000001';
const ELEANOR_ID = 'A7C40400-4E12-4B8F-9A10-000000000002';
const MAYA_ID = 'A7C40400-4E12-4B8F-9A10-000000000005';
const PRIYA_ID = 'A7C40400-4E12-4B8F-9A10-000000000011';
const RACHEL_ID = 'A7C40400-4E12-4B8F-9A10-000000000022';
const SAMUEL_ID = 'A7C40400-4E12-4B8F-9A10-000000000023';
const JORDAN_ID = 'A7C40400-4E12-4B8F-9A10-000000000025';
const VICTOR_ID = 'A7C40400-4E12-4B8F-9A10-000000000026';

const MASS_TIMBER_DEBATE_POST_ID = 'A7C40600-4E12-4B8F-9A10-000000000001';
const LOCKED_CHARTER_POST_ID = 'A7C40600-4E12-4B8F-9A10-000000000066';
const TIMBER_FORUM_ID = 'A7C40200-4E12-4B8F-9A10-000000000005';
const TOWN_SQUARE_FORUM_ID = 'A7C40200-4E12-4B8F-9A10-000000000001';
const CODE_QA_FORUM_ID = 'A7C40200-4E12-4B8F-9A10-000000000002';
const PASSIVE_QA_FORUM_ID = 'A7C40200-4E12-4B8F-9A10-000000000006';
const COUNSEL_QA_FORUM_ID = 'A7C40200-4E12-4B8F-9A10-000000000011';

const ARCH_SIGNING_SECRET = 'arch-world-hmac-signing-secret-2026';

function setupRuntimeMocks(store, txGroup, options = {}) {
  const bridge = CreateArchWorldRuntimeBridge(store, options);
  Metadata.Provider = bridge.provider;
  RunView.Provider = bridge.provider;
  mock.method(RunView.prototype, 'RunView', bridge.handleRunView);
  mock.method(Metadata.prototype, 'GetEntityObject', bridge.handleGetEntityObject);
  mock.method(Metadata.prototype, 'CreateTransactionGroup', async () => txGroup);
  mock.getter(CommunicationEngine.prototype, 'Loaded', () => true);
  mock.getter(CommunicationEngine.prototype, 'Providers', () => [
    {
      ID: 'arch-test-email-provider',
      Name: COMMUNITY_TEST_EMAIL_DRIVER_NAME,
      MessageTypes: [
        {
          ID: 'arch-pmt-standard-email',
          Name: 'Standard Email',
          CommunicationProviderID: 'arch-test-email-provider',
        },
      ],
    },
  ]);
  mock.method(CommunicationEngineBase.prototype, 'StartLog', async () => ({
    Status: 'Pending',
    ErrorMessage: '',
    Save: async () => true,
  }));
  return bridge;
}

/**
 * Runs one full end-to-end verification pass against the retained `ARCH-WORLD` store.
 */
export async function RunArchitectAssociationIntegrationCycle(options = {}) {
  const persistenceFilePath = options.persistenceFilePath;
  const store = options.store ?? GetSharedArchWorldStore({ persistenceFilePath });
  const isRepeatCycle = Boolean(options.isRepeatCycle);
  const txGroup = new InMemoryArchTxGroup();

  LoadBizAppsCommunityActions();
  CommunityEmbeddingPersonalizationService.Instance.ResetToDefaultProvider();
  CommunityTestCommunicationProvider.ClearSentMessages();

  const prevSecret = process.env.COMMUNITY_DIGEST_REPLY_SECRET;
  const prevMetadataProvider = Metadata.Provider;
  const prevRunViewProvider = RunView.Provider;
  process.env.COMMUNITY_DIGEST_REPLY_SECRET = ARCH_SIGNING_SECRET;

  try {
    // 1. Authoritative Entity-Backed Idempotent Double-Load (via Metadata.GetEntityObject + ValidateAsync + Save)
    const load1 = await LoadArchitectAssociationWorld({ store, persistenceFilePath });
    const load2 = await LoadArchitectAssociationWorld({ store, persistenceFilePath });
    assert.equal(load2.createdCount, 0, 'second load must create 0 records');
    assert.equal(load2.updatedCount, 0, 'second load must update 0 records');
    assert.equal(load2.idempotent, true, 'second load must be strictly idempotent');
    assert.deepEqual(load2.counts, load1.counts);
    if (!isRepeatCycle) {
      assert.ok(load1.validatedEntityCount > 300, 'initial load must validate all seeded records via BaseEntity.ValidateAsync()');
    }

    setupRuntimeMocks(store, txGroup, { persistenceFilePath });

    // 2. Personalized Embedding Email Digest + MJ CommunicationEngine Test Driver
    const kenjiUser = MakeArchUserInfo({ ID: KENJI_ID, Email: 'kenji.takahashi@agpa-guild.org', Name: 'Dr. Kenji Takahashi, FAIA' });
    const eleanorUser = MakeArchUserInfo({ ID: ELEANOR_ID, Email: 'eleanor.vance@agpa-guild.org', Name: 'Eleanor Vance, FAIA' });

    const sendAction = new SendPersonalizedCommunityDigestAction();
    const allForumIds = ARCH_FORUMS.map((f) => f.ID).join(',');
    const sendParams = new RunActionParams();
    sendParams.ContextUser = rachelContextUser();
    sendParams.Filters = [];
    sendParams.Params = [
      { Name: 'AllowedForumIDs', Value: allForumIds, Type: 'Input' },
      { Name: 'RecipientUserIDs', Value: `${KENJI_ID},${ELEANOR_ID},${MAYA_ID},${JORDAN_ID},${VICTOR_ID}`, Type: 'Input' },
      { Name: 'UseTestDriver', Value: 'true', Type: 'Input' },
      { Name: 'CommunityName', Value: 'American Guild of Practicing Architects (AGPA)', Type: 'Input' },
      { Name: 'FromEmail', Value: 'digest@agpa-guild.org', Type: 'Input' },
      { Name: 'ReplyDomain', Value: 'reply.agpa-guild.org', Type: 'Input' },
      { Name: 'MaxItemsPerDigest', Value: '5', Type: 'Input' },
    ];

    const digestResult = await sendAction.Run(sendParams);
    assert.equal(digestResult.Success, true, digestResult.Message);
    assert.equal(digestResult.ResultCode, 'SUCCESS');

    const outbox = CommunityTestCommunicationProvider.GetSentMessages();
    // Victor Kroll (Muted/Removed) must NEVER receive an email; the 4 active members must!
    assert.equal(outbox.length, 4, 'expected 4 digest emails (Kenji, Eleanor, Maya, Jordan) and 0 for Victor');
    assert.equal(outbox.find((m) => m.to === 'victor.kroll@agpa-guild.org'), undefined);

    const kenjiEmail = outbox.find((m) => m.to === 'kenji.takahashi@agpa-guild.org');
    const eleanorEmail = outbox.find((m) => m.to === 'eleanor.vance@agpa-guild.org');
    const mayaEmail = outbox.find((m) => m.to === 'maya.lincarter@agpa-guild.org');
    const jordanEmail = outbox.find((m) => m.to === 'jordan.patel@agpa-guild.org');
    assert.ok(kenjiEmail && eleanorEmail && mayaEmail && jordanEmail);

    for (const msg of [kenjiEmail, eleanorEmail, mayaEmail, jordanEmail]) {
      assert.ok(msg.replyTo, `Expected Reply-To on digest for ${msg.to}`);
      assertRfc5321Compliant(msg.replyTo);
    }

    // Distinct personas receive genuinely different ranked digests + Team-band isolation holds
    assert.notEqual(kenjiEmail.subject, eleanorEmail.subject, 'Mass Timber specialist vs AIA Contracts Principal must receive different top digest subjects');
    assert.match(eleanorEmail.htmlBody, /AIA B101|AIA A201/i, 'Principal Eleanor must receive Space 4 Team-band AIA Contracts threads');
    assert.doesNotMatch(mayaEmail.htmlBody, /AIA B101 AI-Assisted Deliverable Indemnification/i, 'Outside member Maya must NOT receive Space 4 Team-band threads');
    assert.doesNotMatch(jordanEmail.htmlBody, /AIA B101 AI-Assisted Deliverable Indemnification/i, 'New member Jordan must NOT receive Space 4 Team-band threads');
    assert.match(jordanEmail.htmlBody, /Popular in|Trending|Canon Verified/i, 'Cold-start member Jordan must receive cold-start popularity explanation');

    // Obtain a dedicated Reply-To token for Kenji's Mass Timber debate thread for deterministic Reply-by-Email testing
    CommunityTestCommunicationProvider.ClearSentMessages();
    const kenjiTimberParams = new RunActionParams();
    kenjiTimberParams.ContextUser = kenjiUser;
    kenjiTimberParams.Filters = [];
    kenjiTimberParams.Params = [
      { Name: 'AllowedForumIDs', Value: TIMBER_FORUM_ID, Type: 'Input' },
      { Name: 'RecipientUserIDs', Value: KENJI_ID, Type: 'Input' },
      { Name: 'UseTestDriver', Value: 'true', Type: 'Input' },
      { Name: 'ReplyDomain', Value: 'reply.agpa-guild.org', Type: 'Input' },
      { Name: 'MaxItemsPerDigest', Value: '1', Type: 'Input' },
    ];
    const kenjiTimberSend = await sendAction.Run(kenjiTimberParams);
    assert.equal(kenjiTimberSend.Success, true);
    const kenjiTimberEmail = CommunityTestCommunicationProvider.GetSentMessages()[0];
    assert.ok(kenjiTimberEmail?.replyTo);
    assertRfc5321Compliant(kenjiTimberEmail.replyTo);

    // 3. Reply-by-Email Inbound Loop (valid reply + fail-closed checks)
    const replyAction = new ProcessInboundDigestReplyAction();
    const postCountBeforeReply = store.posts.size;
    const messageId = isRepeatCycle ? 'agpa-inbound-cycle-2' : 'agpa-inbound-cycle-1';

    const validReplyParams = new RunActionParams();
    validReplyParams.ContextUser = kenjiUser;
    validReplyParams.Filters = [];
    validReplyParams.Params = [
      { Name: 'ReplyToAddress', Value: kenjiTimberEmail.replyTo, Type: 'Input' },
      { Name: 'SenderEmail', Value: 'kenji.takahashi@agpa-guild.org', Type: 'Input' },
      {
        Name: 'RawBodyText',
        Value: [
          `Concur with the 38mm spline protection detail [${messageId}]. We will attach our Seattle permit set diagram to the Working Group.`,
          '',
          'On Thu, Nov 19, 2026 at 6:00 PM AGPA Digest <digest@agpa-guild.org> wrote:',
          '> IBC 2027 Type IV-A/IV-B Exposed Mass Timber Ceiling Allowance',
          '',
          '-- ',
          'Dr. Kenji Takahashi, FAIA',
        ].join('\n'),
        Type: 'Input',
      },
    ];
    const replyRes = await replyAction.Run(validReplyParams);
    assert.equal(replyRes.Success, true, replyRes.Message);
    assert.equal(replyRes.ResultCode, 'SUCCESS');
    assert.equal(store.posts.size, postCountBeforeReply + 1);
    const persistedReplyId = String(paramOf(replyRes, 'PostID'));
    const persistedReply = store.posts.get(persistedReplyId.toLowerCase());
    assert.ok(persistedReply);
    assert.equal(persistedReply.RootPostID, MASS_TIMBER_DEBATE_POST_ID);
    assert.doesNotMatch(persistedReply.BodyMarkdown, /On Thu, Nov 19, 2026/);
    assert.doesNotMatch(persistedReply.BodyMarkdown, /Dr\. Kenji Takahashi/);

    // Fail-closed security checks (tampered, expired, wrong sender, locked thread -> 0 new writes)
    const countAfterValidReply = store.posts.size;
    const [localPart, domainPart] = kenjiTimberEmail.replyTo.split('@');
    const tamperedAddress = `${localPart.slice(0, -1)}${localPart.endsWith('A') ? 'B' : 'A'}@${domainPart}`;
    const tamperedRes = await replyAction.Run(buildReplyActionParams(kenjiUser, tamperedAddress, 'kenji.takahashi@agpa-guild.org', 'Tampered attempt'));
    assert.equal(tamperedRes.Success, false);
    assert.equal(tamperedRes.ResultCode, 'INVALID_SIGNATURE');

    const expiredToken = SignDigestReplyToken({
      memberUserId: KENJI_ID,
      forumId: TIMBER_FORUM_ID,
      rootPostId: MASS_TIMBER_DEBATE_POST_ID,
      recipientEmail: 'kenji.takahashi@agpa-guild.org',
      signingSecret: ARCH_SIGNING_SECRET,
      now: new Date(Date.now() - 7200 * 1000),
      ttlSeconds: 60,
    });
    const expiredRes = await replyAction.Run(buildReplyActionParams(kenjiUser, expiredToken, 'kenji.takahashi@agpa-guild.org', 'Expired attempt'));
    assert.equal(expiredRes.Success, false);
    assert.equal(expiredRes.ResultCode, 'TOKEN_EXPIRED');

    const wrongSenderRes = await replyAction.Run(buildReplyActionParams(kenjiUser, kenjiTimberEmail.replyTo, 'impostor@other-firm.com', 'Wrong sender attempt'));
    assert.equal(wrongSenderRes.Success, false);
    assert.equal(wrongSenderRes.ResultCode, 'SENDER_MISMATCH');

    const lockedToken = SignDigestReplyToken({
      memberUserId: RACHEL_ID,
      forumId: TOWN_SQUARE_FORUM_ID,
      rootPostId: LOCKED_CHARTER_POST_ID,
      recipientEmail: 'rachel.goldstein@agpa-guild.org',
      signingSecret: ARCH_SIGNING_SECRET,
    });
    const lockedRes = await replyAction.Run(buildReplyActionParams(rachelContextUser(), lockedToken, 'rachel.goldstein@agpa-guild.org', 'Reply to locked charter'));
    assert.equal(lockedRes.Success, false);
    assert.equal(lockedRes.ResultCode, 'THREAD_LOCKED');
    assert.equal(store.posts.size, countAfterValidReply, 'fail-closed checks must produce zero writes');

    // 4. Hybrid Semantic Ask-First Deflection
    const askFirstAction = new AskFirstDeflectionAction();
    const askIbcParams = new RunActionParams();
    askIbcParams.ContextUser = kenjiUser;
    askIbcParams.Filters = [];
    askIbcParams.Params = [
      { Name: 'QueryText', Value: 'What char rate calculation and PRG 320 adhesive rules apply to exposed CLT floors in Type IV-B?', Type: 'Input' },
      { Name: 'AllowedForumIDs', Value: `${CODE_QA_FORUM_ID},${PASSIVE_QA_FORUM_ID}`, Type: 'Input' },
      { Name: 'MinConfidence', Value: '0.35', Type: 'Input' },
    ];
    const askIbcRes = await askFirstAction.Run(askIbcParams);
    assert.equal(askIbcRes.Success, true);
    assert.equal(askIbcRes.ResultCode, 'DEFLECTED');
    assert.equal(paramOf(askIbcRes, 'Deflected'), true);
    assert.ok(Number(paramOf(askIbcRes, 'ConfidenceScore')) >= 0.55, 'IBC 2027 match must have strong confidence >= 0.55');
    const ibcCitations = JSON.parse(String(paramOf(askIbcRes, 'Citations')));
    assert.equal(ibcCitations[0]?.postId, 'A7C40600-4E12-4B8F-9A10-000000000008');
    assert.equal(ibcCitations[0]?.isVerified, true);

    const askPassiveParams = new RunActionParams();
    askPassiveParams.ContextUser = kenjiUser;
    askPassiveParams.Filters = [];
    askPassiveParams.Params = [
      { Name: 'QueryText', Value: 'How do we avoid thermal bridges on cantilevered balconies in Passive House buildings?', Type: 'Input' },
      { Name: 'AllowedForumIDs', Value: `${CODE_QA_FORUM_ID},${PASSIVE_QA_FORUM_ID}`, Type: 'Input' },
      { Name: 'MinConfidence', Value: '0.50', Type: 'Input' },
    ];
    const askPassiveRes = await askFirstAction.Run(askPassiveParams);
    assert.equal(askPassiveRes.ResultCode, 'DEFLECTED');
    const passiveCitations = JSON.parse(String(paramOf(askPassiveRes, 'Citations')));
    assert.equal(passiveCitations[0]?.postId, 'A7C40600-4E12-4B8F-9A10-000000000012');

    const askAiaParams = new RunActionParams();
    askAiaParams.ContextUser = eleanorUser;
    askAiaParams.Filters = [];
    askAiaParams.Params = [
      { Name: 'QueryText', Value: 'Does an AIA A201 construction RFI response shift contractor shoring means and methods liability?', Type: 'Input' },
      { Name: 'AllowedForumIDs', Value: `${COUNSEL_QA_FORUM_ID},${CODE_QA_FORUM_ID}`, Type: 'Input' },
      { Name: 'MinConfidence', Value: '0.50', Type: 'Input' },
    ];
    const askAiaRes = await askFirstAction.Run(askAiaParams);
    assert.equal(askAiaRes.ResultCode, 'DEFLECTED');
    const aiaCitations = JSON.parse(String(paramOf(askAiaRes, 'Citations')));
    assert.equal(aiaCitations[0]?.postId, 'A7C40600-4E12-4B8F-9A10-000000000016');

    const askUnrelatedParams = new RunActionParams();
    askUnrelatedParams.ContextUser = kenjiUser;
    askUnrelatedParams.Filters = [];
    askUnrelatedParams.Params = [
      { Name: 'QueryText', Value: 'Classical violin bow rosin technique', Type: 'Input' },
      { Name: 'AllowedForumIDs', Value: `${CODE_QA_FORUM_ID},${PASSIVE_QA_FORUM_ID}`, Type: 'Input' },
      { Name: 'MinConfidence', Value: '0.35', Type: 'Input' },
    ];
    const askUnrelatedRes = await askFirstAction.Run(askUnrelatedParams);
    assert.equal(askUnrelatedRes.ResultCode, 'NOT_DEFLECTED');
    assert.equal(paramOf(askUnrelatedRes, 'Deflected'), false);

    // 5. Living Thread Synthesis on multi-turn Mass Timber debate
    const synthesisAction = new LivingThreadSynthesisAction();
    const synthParams = new RunActionParams();
    synthParams.ContextUser = rachelContextUser();
    synthParams.Filters = [];
    synthParams.Params = [{ Name: 'RootPostID', Value: MASS_TIMBER_DEBATE_POST_ID, Type: 'Input' }];
    const synthRes = await synthesisAction.Run(synthParams);
    assert.equal(synthRes.Success, true, synthRes.Message);
    assert.equal(synthRes.ResultCode, 'SUCCESS');
    const takeaways = JSON.parse(String(paramOf(synthRes, 'KeyTakeaways')));
    const openQuestions = JSON.parse(String(paramOf(synthRes, 'OpenQuestions')));
    const citations = JSON.parse(String(paramOf(synthRes, 'ContributorCitations')));
    assert.ok(takeaways.length >= 3, 'synthesis must extract >= 3 key takeaways');
    assert.ok(openQuestions.length >= 1, 'synthesis must extract open questions');
    assert.ok(citations.length >= 5, 'synthesis must cite >= 5 contributors');
    const updatedDebateRoot = store.posts.get(MASS_TIMBER_DEBATE_POST_ID.toLowerCase());
    assert.ok(updatedDebateRoot?.SummaryMarkdown?.includes('**Key Takeaways:**'));

    // 6. Quadratic Ideation Wallet — Authoritative ForumIdeaAllocationServerEntity persistence,
    //    fail-closed over-budget rejection, refund-on-revote mutation, and RunView read-back verification
    const md = new Metadata();
    const rv = new RunView();
    const IDEA_P32_ID = 'A7C40600-4E12-4B8F-9A10-000000000032';
    const IDEA_P33_ID = 'A7C40600-4E12-4B8F-9A10-000000000033';

    const kenjiBeforeRes = await rv.RunView(
      {
        EntityName: COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations,
        ExtraFilter: `UserID = '${KENJI_ID}'`,
        ResultType: 'simple',
      },
      kenjiUser,
    );
    assert.equal(kenjiBeforeRes.Success, true);
    const kenjiBeforeRows = kenjiBeforeRes.Results ?? [];
    assert.equal(kenjiBeforeRows.length, 2, 'Kenji starts with exactly 2 idea allocations (P32 + P35)');
    const kenjiExisting = kenjiBeforeRows.map((a) => ({
      ideaPostId: a.IdeaPostID,
      pointsAllocated: a.PointsAllocated,
    }));

    const overIdeaCap = CommunityRules.ValidateIdeaAllocations({
      mode: 'Quadratic',
      budgetPoints: 100,
      maxPointsPerIdea: 49,
      allocations: [{ ideaPostId: IDEA_P32_ID, pointsAllocated: 64 }],
    });
    assert.equal(overIdeaCap.valid, false, 'allocation > MaxPointsPerIdea (49) must fail');

    // Over-budget mutation via ForumIdeaAllocationServerEntity must fail ValidateAsync() / Save() with 0 writes
    const overBudgetEntity = await md.GetEntityObject(
      COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations,
      kenjiUser,
    );
    assert.ok(overBudgetEntity instanceof ForumIdeaAllocationServerEntity);
    overBudgetEntity.IdeaPostID = IDEA_P33_ID;
    overBudgetEntity.UserID = KENJI_ID;
    overBudgetEntity.PointsAllocated = 49;
    const overBudgetValidation = await overBudgetEntity.ValidateAsync();
    assert.equal(overBudgetValidation.Success, false, 'over-budget allocation (>100 pts) must fail ValidateAsync()');
    const overBudgetSaved = await overBudgetEntity.Save();
    assert.equal(overBudgetSaved, false, 'over-budget allocation must fail Save()');

    const afterRejectedRes = await rv.RunView(
      {
        EntityName: COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations,
        ExtraFilter: `UserID = '${KENJI_ID}'`,
        ResultType: 'simple',
      },
      kenjiUser,
    );
    assert.equal(afterRejectedRes.Results.length, 2, 'failed over-budget Save() must produce zero writes');
    assert.equal(
      afterRejectedRes.Results.some((a) => a.IdeaPostID.toLowerCase() === IDEA_P33_ID.toLowerCase()),
      false,
      'rejected P33 allocation must not be persisted',
    );

    // Pure refund-on-revote check + authoritative ForumIdeaAllocationServerEntity update (6 votes / 36 pts -> 7 votes / 49 pts)
    const revoteValid = CommunityRules.ValidateIdeaAllocationChange({
      mode: 'Quadratic',
      budgetPoints: 100,
      maxPointsPerIdea: 49,
      existingAllocations: kenjiExisting,
      changedIdeaPostId: IDEA_P32_ID,
      newPointsAllocated: 49,
    });
    assert.equal(revoteValid.valid, true, revoteValid.errorMessage);
    assert.equal(revoteValid.effectiveVotesByIdea[IDEA_P32_ID], 7);
    assert.equal(revoteValid.totalPointsUsed, 65);

    const kenjiP32Existing = kenjiBeforeRows.find(
      (a) => a.IdeaPostID.toLowerCase() === IDEA_P32_ID.toLowerCase(),
    );
    assert.ok(kenjiP32Existing, 'Kenji P32 allocation must exist');
    const allocEntity = await md.GetEntityObject(
      COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations,
      CompositeKey.FromID(kenjiP32Existing.ID),
      kenjiUser,
    );
    assert.ok(allocEntity instanceof ForumIdeaAllocationServerEntity);
    allocEntity.PointsAllocated = 49;
    const revoteValidation = await allocEntity.ValidateAsync();
    assert.equal(revoteValidation.Success, true, revoteValidation.Errors.map((e) => e.Message).join('; '));
    const revoteSaved = await allocEntity.Save();
    assert.equal(revoteSaved, true, allocEntity.LatestResult?.CompleteMessage);

    // Read back persisted allocation rows & recomputed ForumIdeaPost aggregates via RunView
    const kenjiAfterRes = await rv.RunView(
      {
        EntityName: COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations,
        ExtraFilter: `UserID = '${KENJI_ID}'`,
        ResultType: 'simple',
      },
      kenjiUser,
    );
    assert.equal(kenjiAfterRes.Success, true);
    const kenjiAfterRows = kenjiAfterRes.Results ?? [];
    assert.equal(kenjiAfterRows.length, 2, 'refund-on-revote must update single row without duplicates');
    const persistedP32Alloc = kenjiAfterRows.find(
      (a) => a.IdeaPostID.toLowerCase() === IDEA_P32_ID.toLowerCase(),
    );
    assert.equal(persistedP32Alloc?.PointsAllocated, 49);
    assert.equal(persistedP32Alloc?.QuadraticVotes, 7);
    const kenjiTotalSpend = kenjiAfterRows.reduce((sum, a) => sum + Number(a.PointsAllocated), 0);
    assert.equal(kenjiTotalSpend, 65, 'total campaign spend must equal 65 (49 + 16), leaving 35 credits');
    assert.equal(100 - kenjiTotalSpend, 35, 'remaining wallet budget must equal 35 credits');

    const p32IdeaRes = await rv.RunView(
      {
        EntityName: COMMUNITY_ENTITY_NAMES.ForumIdeaPosts,
        ExtraFilter: `ID = '${IDEA_P32_ID}'`,
        ResultType: 'simple',
      },
      kenjiUser,
    );
    assert.equal(p32IdeaRes.Success, true);
    const p32Idea = p32IdeaRes.Results?.[0];
    assert.equal(p32Idea?.TotalPointsAllocated, 275, 'ForumIdeaPost TotalPointsAllocated must update from 262 to 275');
    assert.equal(p32Idea?.EffectiveQuadraticVotes, 51, 'ForumIdeaPost EffectiveQuadraticVotes must update from 50 to 51');
    assert.equal(p32Idea?.UniqueBackerCount, 10, 'UniqueBackerCount must remain 10 (no duplicate backer row)');

    // CR-03 Authoritative ForumPostTagServerEntity cross-space rejection check
    const invalidCrossSpaceTag = await md.GetEntityObject(
      COMMUNITY_ENTITY_NAMES.ForumPostTags,
      kenjiUser,
    );
    assert.ok(invalidCrossSpaceTag instanceof ForumPostTagServerEntity);
    invalidCrossSpaceTag.PostID = MASS_TIMBER_DEBATE_POST_ID; // Space 2
    invalidCrossSpaceTag.TopicTagID = 'A7C40300-4E12-4B8F-9A10-000000000002'; // Space 1 (ibc-2027)
    const crossSpaceValidation = await invalidCrossSpaceTag.ValidateAsync();
    assert.equal(crossSpaceValidation.Success, false, 'ForumPostTagServerEntity must reject cross-space tag assignment');
    assert.match(
      crossSpaceValidation.Errors.map((e) => e.Message).join('; '),
      /does not match post Forum SpaceID/i,
    );
    assert.equal(await invalidCrossSpaceTag.Save(), false, 'cross-space ForumPostTag Save() must fail');

    // 7. Idempotent 1-Click Graduation to a Working Space
    const graduationService = new ThreadGraduationService();
    const samuelUser = new UserInfo(undefined, {
      ID: SAMUEL_ID,
      Email: 'samuel.okafor@agpa-guild.org',
      Name: 'Samuel Okafor, AIA',
    });
    const priyaUser = new UserInfo(undefined, {
      ID: PRIYA_ID,
      Email: 'priya.nair@agpa-guild.org',
      Name: 'Priya Nair, AIA',
    });
    const gradRequest = {
      rootPostId: MASS_TIMBER_DEBATE_POST_ID,
      targetSpaceTypeCode: 'working-group',
      targetSpaceName: 'IBC 2027 Mass Timber Code Amendment Working Group',
      seedInitialTaskTitle: 'Draft Type IV-B Acoustic Topping & Podium Firestop Brief',
      includeParticipantUserIds: [KENJI_ID, SAMUEL_ID, 'A7C40400-4E12-4B8F-9A10-000000000006'],
    };

    // Unauthorized contributor without CanPromoteToSpace must be rejected
    await assert.rejects(
      () => graduationService.GraduateThreadToSpace({ request: gradRequest, contextUser: priyaUser }),
      /CanPromoteToSpace/,
    );

    const [gradFirst, gradSecond] = await Promise.all([
      graduationService.GraduateThreadToSpace({ request: gradRequest, contextUser: samuelUser }),
      graduationService.GraduateThreadToSpace({ request: gradRequest, contextUser: samuelUser }),
    ]);

    const expectedSpaceId = BuildDeterministicGraduationUUID('space', MASS_TIMBER_DEBATE_POST_ID);
    const expectedTaskId = BuildDeterministicGraduationUUID('task', MASS_TIMBER_DEBATE_POST_ID);
    assert.equal(gradFirst.promotedToSpaceId, expectedSpaceId);
    assert.equal(gradSecond.promotedToSpaceId, expectedSpaceId);
    assert.equal(gradSecond.alreadyGraduated, true);

    if (!isRepeatCycle) {
      assert.equal(gradFirst.alreadyGraduated, false);
      assert.equal(gradFirst.seededTaskId, expectedTaskId);
      assert.equal(gradFirst.invitedParticipantCount, 3);
    } else {
      assert.equal(gradFirst.alreadyGraduated, true, 'repeat cycle against retained world must detect existing graduation idempotently');
    }

    const graduatedSpace = store.spaces.get(expectedSpaceId.toLowerCase());
    const seededTask = store.tasks.get(expectedTaskId.toLowerCase());
    assert.ok(graduatedSpace, 'graduated working-group space must exist in store');
    assert.ok(seededTask, 'seeded starter task must exist in store');
    assert.match(graduatedSpace.Description, /\*\*Key Takeaways:\*\*/);
    assert.equal(seededTask.Description, graduatedSpace.Description);

    // 8. No-op Teardown preserves everything in store and durable backing file
    const teardownRes = TeardownArchitectAssociationWorld({ store, persistenceFilePath });
    assert.equal(teardownRes.preserved, true);
    assert.ok(store.spaces.has(expectedSpaceId.toLowerCase()), 'no-op teardown must preserve graduated space');
    assert.ok(store.posts.has(persistedReplyId.toLowerCase()), 'no-op teardown must preserve inbound reply');

    // Verify independent fresh provider read from disk sees all retained records without re-seeding
    if (persistenceFilePath !== null) {
      const freshProvider = CreatePersistedArchWorldProvider({ persistenceFilePath });
      const freshRv = new RunView(freshProvider);
      const freshAllocRes = await freshRv.RunView(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations,
          ExtraFilter: `UserID = '${KENJI_ID}'`,
          ResultType: 'simple',
        },
        kenjiUser,
      );
      assert.equal(freshAllocRes.Results.length, 2);
      const freshP32 = freshAllocRes.Results.find(
        (a) => a.IdeaPostID.toLowerCase() === IDEA_P32_ID.toLowerCase(),
      );
      assert.equal(freshP32?.PointsAllocated, 49, 'fresh persisted reader must see updated 49-pt allocation');
      const freshSpaceRes = await freshRv.RunView(
        {
          EntityName: 'MJ_BizApps_Collaboration: Spaces',
          ExtraFilter: `ID = '${expectedSpaceId}'`,
          ResultType: 'simple',
        },
        kenjiUser,
      );
      assert.equal(freshSpaceRes.Results.length, 1, 'fresh persisted reader must see graduated Working Space');
    }

    return {
      store,
      counts: CountArchWorldStoreRecords(store),
      graduatedSpaceId: expectedSpaceId,
      persistedReplyId,
    };
  } finally {
    if (prevSecret === undefined) delete process.env.COMMUNITY_DIGEST_REPLY_SECRET;
    else process.env.COMMUNITY_DIGEST_REPLY_SECRET = prevSecret;
    Metadata.Provider = prevMetadataProvider;
    RunView.Provider = prevRunViewProvider;
    ClearDigestReplyTokenRegistry();
    CommunityTestCommunicationProvider.ClearSentMessages();
    mock.restoreAll();
  }
}

function rachelContextUser() {
  return MakeArchUserInfo({
    ID: RACHEL_ID,
    Email: 'rachel.goldstein@agpa-guild.org',
    Name: 'Rachel Goldstein, FAIA',
  });
}

function buildReplyActionParams(user, replyTarget, senderEmail, rawBody) {
  const params = new RunActionParams();
  params.ContextUser = user;
  params.Filters = [];
  params.Params = [
    { Name: 'ReplyToAddress', Value: replyTarget, Type: 'Input' },
    { Name: 'SenderEmail', Value: senderEmail, Type: 'Input' },
    { Name: 'RawBodyText', Value: rawBody, Type: 'Input' },
  ];
  return params;
}

const SUITE_SYMBOL = Symbol.for('agpa.archWorldIntegrationRegistered');

export function RegisterArchWorldIntegrationTests() {
  if (globalThis[SUITE_SYMBOL]) return;
  globalThis[SUITE_SYMBOL] = true;

  describe('ARCH-WORLD — American Guild of Practicing Architects (AGPA) Persistent World & Integration Suite', () => {
    it('satisfies scale & coverage targets (>=24 members, 4 spaces, >=10 forums across all 6 ForumTypes, >=20 tags, >=60 posts across all 13 PostTypes)', () => {
      const summary = GetArchWorldSeedSummary();
      assert.ok(ARCH_MEMBERS.length >= 24, `expected >= 24 members, got ${ARCH_MEMBERS.length}`);
      assert.equal(ARCH_COMMUNITY_SPACES.length, 4, 'expected 4 distinct AGPA Community Spaces');
      assert.ok(ARCH_FORUMS.length >= 10, `expected >= 10 forums, got ${ARCH_FORUMS.length}`);
      assert.ok(ARCH_TOPIC_TAGS.length >= 20, `expected >= 20 topic tags, got ${ARCH_TOPIC_TAGS.length}`);
      assert.ok(ARCH_POSTS.length >= 60, `expected >= 60 posts, got ${ARCH_POSTS.length}`);

      const coveredForumTypes = new Set(ARCH_FORUMS.map((f) => f.ForumTypeCode));
      for (const code of ARCH_ALL_FORUM_TYPE_CODES) {
        assert.ok(coveredForumTypes.has(code), `missing ForumType ${code}`);
      }

      const coveredPostTypes = new Set(ARCH_POSTS.map((p) => p.PostTypeCode));
      for (const code of ARCH_ALL_POST_TYPE_CODES) {
        assert.ok(coveredPostTypes.has(code), `missing PostType ${code}`);
      }

      assert.ok(summary.totalRecords >= 150, `expected rich ARCH-WORLD dataset, got ${summary.totalRecords}`);
    });

    it('enforces referential integrity, cross-space fnCommunityForumAccess isolation, and Quadratic Ideation math invariants', () => {
      const spaceIds = new Set(ARCH_COMMUNITY_SPACES.map((s) => s.ID));
      const forumIds = new Set(ARCH_FORUMS.map((f) => f.ID));
      const forumsBySpace = new Map();

      for (const forum of ARCH_FORUMS) {
        assert.ok(spaceIds.has(forum.SpaceID), `Forum ${forum.ID} references unknown Space ${forum.SpaceID}`);
        const list = forumsBySpace.get(forum.SpaceID) ?? [];
        list.push(forum.ID);
        forumsBySpace.set(forum.SpaceID, list);
      }
      assert.equal(forumsBySpace.size, 4, 'all 4 Spaces must own isolated Forums');

      for (const post of ARCH_POSTS) {
        assert.ok(forumIds.has(post.ForumID), `Post ${post.ID} references unknown Forum ${post.ForumID}`);
      }

      // CR-03 Referential integrity: every ForumPostTag MUST belong to the exact same Space as its Post's Forum
      const forumSpaceById = new Map(ARCH_FORUMS.map((f) => [f.ID.toLowerCase(), f.SpaceID.toLowerCase()]));
      const postForumById = new Map(ARCH_POSTS.map((p) => [p.ID.toLowerCase(), p.ForumID.toLowerCase()]));
      const tagSpaceById = new Map(ARCH_TOPIC_TAGS.map((t) => [t.ID.toLowerCase(), t.SpaceID.toLowerCase()]));
      for (const pt of ARCH_POST_TAGS) {
        const forumId = postForumById.get(pt.PostID.toLowerCase());
        const postSpaceId = forumId ? forumSpaceById.get(forumId) : undefined;
        const tagSpaceId = tagSpaceById.get(pt.TopicTagID.toLowerCase());
        assert.ok(postSpaceId, `PostTag ${pt.ID} references Post ${pt.PostID} with missing Forum/Space`);
        assert.ok(tagSpaceId, `PostTag ${pt.ID} references unknown TopicTag ${pt.TopicTagID}`);
        assert.equal(
          postSpaceId,
          tagSpaceId,
          `PostTag ${pt.ID} violates Space boundary: Post ${pt.PostID} is in Space ${postSpaceId} but TopicTag ${pt.TopicTagID} is in Space ${tagSpaceId}`,
        );
      }

      // Cross-space & Team-band isolation via both fnCommunityForumAccess shadow and CommunityRules
      assert.equal(
        EvaluateCommunityForumCanPost({
          forumStatus: 'Active',
          spaceReadOnly: false,
          canContribute: true,
          forumMemberStatus: 'Muted',
          canCreateRootPost: true,
          canReply: true,
          postingPolicy: 'Open',
          canConfigureForum: false,
        }),
        false,
        'Muted member (Victor Kroll) must be denied CanPost',
      );
      const outsideTeamDecision = CommunityRules.EvaluateForumAccess({
        spaceAccess: { canReadSpace: true, canSeeTeamBand: false, isSpaceOpenForWrites: true },
        forum: { visibilityBand: 'Team', inheritsSpaceMembers: true, postingPolicy: 'Open', status: 'Active' },
        forumMembership: null,
      });
      assert.equal(outsideTeamDecision.canReadForum, false, 'Outside member must be blocked from Team-band Space 4 forums');

      // Quadratic Ideation math across >= 20 backers
      const uniqueBackers = new Set(ARCH_IDEA_ALLOCATIONS.map((a) => a.UserID));
      assert.ok(uniqueBackers.size >= 20, `expected >= 20 unique ideation backers, got ${uniqueBackers.size}`);
      const spendByMember = new Map();
      for (const alloc of ARCH_IDEA_ALLOCATIONS) {
        assert.equal(alloc.QuadraticVotes, Math.sqrt(alloc.PointsAllocated));
        assert.ok(alloc.PointsAllocated <= 49, `allocation ${alloc.ID} exceeds MaxPointsPerIdea=49`);
        spendByMember.set(alloc.UserID, (spendByMember.get(alloc.UserID) ?? 0) + alloc.PointsAllocated);
      }
      for (const [uid, totalSpend] of spendByMember.entries()) {
        assert.ok(totalSpend <= 100, `Member ${uid} total spend ${totalSpend} exceeds 100-pt wallet`);
      }
      for (const idea of ARCH_IDEA_POSTS) {
        const rows = ARCH_IDEA_ALLOCATIONS.filter((a) => a.IdeaPostID === idea.ID);
        assert.equal(idea.TotalPointsAllocated, rows.reduce((s, r) => s + r.PointsAllocated, 0));
        assert.equal(idea.EffectiveQuadraticVotes, rows.reduce((s, r) => s + r.QuadraticVotes, 0));
        assert.equal(idea.UniqueBackerCount, rows.length);
      }
    });

    it('executes full end-to-end integration cycle across 2 consecutive runs on the retained world (with no-op teardown & cross-process persistence)', async () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'arch-world-persist-'));
      const tempStateFile = join(tempDir, 'arch-world-state.json');
      try {
        const retainedStore = ResetSharedArchWorldStore({
          persistenceFilePath: tempStateFile,
          clearPersistence: true,
        });
        const firstRun = await RunArchitectAssociationIntegrationCycle({
          store: retainedStore,
          persistenceFilePath: tempStateFile,
          isRepeatCycle: false,
        });
        assert.ok(firstRun.counts.totalRecords > 150);
        assert.equal(existsSync(tempStateFile), true, 'durable backing store must exist on disk after run 1');

        // Run #2 against the EXACT same retained store (after no-op TeardownArchitectAssociationWorld)
        // proving repeat-run invariance without destructive cleanup or duplicate Working Spaces/Tasks/Allocations.
        const secondRun = await RunArchitectAssociationIntegrationCycle({
          store: retainedStore,
          persistenceFilePath: tempStateFile,
          isRepeatCycle: true,
        });
        assert.equal(secondRun.graduatedSpaceId, firstRun.graduatedSpaceId);
        assert.equal(secondRun.store.tasks.size, 1, 'repeat run must not create duplicate starter Tasks');

        // Independent child process read (zero shared memory) sees retained state without re-seeding
        const verifyOutput = execFileSync(
          process.execPath,
          ['scripts/world/arch-world-loader.mjs', '--verify'],
          {
            env: { ...process.env, ARCH_WORLD_STATE_FILE: tempStateFile },
            encoding: 'utf8',
          },
        );
        assert.match(verifyOutput, /Spaces=5, CommunitySpaces=4, Forums=13, Posts=70, TopicTags=22, IdeaAllocations=25/);

        // Deterministic SQL Server & PostgreSQL script generation matches world dataset
        const sqlScripts = BuildArchitectAssociationWorldSql();
        assert.match(sqlScripts.sqlServer, /\[__mj_BizAppsCommunity\]\.\[ForumPostTag\]/);
        assert.match(sqlScripts.postgres, /INSERT INTO "ForumPostTag"/);
        assert.match(sqlScripts.sqlServer, /UPDATE \[__mj_BizAppsCommunity\]\.\[ForumIdeaPost\]/);
        assert.match(sqlScripts.postgres, /UPDATE "ForumIdeaPost" AS ip/);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
}

RegisterArchWorldIntegrationTests();
