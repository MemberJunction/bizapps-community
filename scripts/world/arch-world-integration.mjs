import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it, mock } from 'node:test';
import {
  ARCH_ALL_FORUM_TYPE_CODES,
  ARCH_ALL_POST_TYPE_CODES,
  ARCH_COMMUNITY_SPACES,
  ARCH_FORUMS,
  ARCH_IDEA_ALLOCATIONS,
  ARCH_IDEA_POSTS,
  ARCH_MEMBERS,
  ARCH_POSTS,
  ARCH_TOPIC_TAGS,
  GetArchWorldSeedSummary,
} from './arch-world-data.mjs';
import {
  CountArchWorldStoreRecords,
  CreateArchWorldRuntimeBridge,
  GetSharedArchWorldStore,
  LoadArchitectAssociationWorld,
  ResetSharedArchWorldStore,
  TeardownArchitectAssociationWorld,
} from './arch-world-loader.mjs';
import { EvaluateCommunityForumCanPost } from '../fn-community-forum-access-shadow.mjs';
import * as CommunityCore from '../../packages/Core/dist/index.js';
import * as CommunityActions from '../../packages/Actions/dist/index.js';

const requireFromActions = createRequire(new URL('../../packages/Actions/package.json', import.meta.url));
const { Metadata, RunView, TransactionGroupBase, UserInfo } = await import(
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

function setupRuntimeMocks(store, txGroup) {
  const bridge = CreateArchWorldRuntimeBridge(store);
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
}

/**
 * Runs one full end-to-end verification pass against the retained `ARCH-WORLD` store.
 */
export async function RunArchitectAssociationIntegrationCycle(options = {}) {
  const store = options.store ?? GetSharedArchWorldStore();
  const isRepeatCycle = Boolean(options.isRepeatCycle);
  const txGroup = new InMemoryArchTxGroup();

  LoadBizAppsCommunityActions();
  CommunityEmbeddingPersonalizationService.Instance.ResetToDefaultProvider();
  CommunityTestCommunicationProvider.ClearSentMessages();

  const prevSecret = process.env.COMMUNITY_DIGEST_REPLY_SECRET;
  process.env.COMMUNITY_DIGEST_REPLY_SECRET = ARCH_SIGNING_SECRET;

  try {
    setupRuntimeMocks(store, txGroup);

    // 1. Idempotent Load + No-op Teardown
    const load1 = LoadArchitectAssociationWorld({ store });
    const load2 = LoadArchitectAssociationWorld({ store });
    assert.equal(load2.createdCount, 0, 'second load must create 0 records');
    assert.equal(load2.updatedCount, 0, 'second load must update 0 records');
    assert.equal(load2.idempotent, true, 'second load must be strictly idempotent');
    assert.deepEqual(load2.counts, load1.counts);

    // 2. Personalized Embedding Email Digest + MJ CommunicationEngine Test Driver
    const kenjiUser = new UserInfo(undefined, { ID: KENJI_ID, Email: 'kenji.takahashi@agpa-guild.org', Name: 'Dr. Kenji Takahashi, FAIA' });
    const eleanorUser = new UserInfo(undefined, { ID: ELEANOR_ID, Email: 'eleanor.vance@agpa-guild.org', Name: 'Eleanor Vance, FAIA' });

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

    // 6. Quadratic Ideation Wallet (budget cap, cost = votes^2, refund-on-revote)
    const kenjiExisting = Array.from(store.ideaAllocations.values())
      .filter((a) => a.UserID.toLowerCase() === KENJI_ID.toLowerCase())
      .map((a) => ({ ideaPostId: a.IdeaPostID, pointsAllocated: a.PointsAllocated }));
    const overBudget = CommunityRules.ValidateIdeaAllocations({
      mode: 'Quadratic',
      budgetPoints: 100,
      maxPointsPerIdea: 49,
      allocations: [
        ...kenjiExisting,
        { ideaPostId: 'A7C40600-4E12-4B8F-9A10-000000000033', pointsAllocated: 49 },
        { ideaPostId: 'A7C40600-4E12-4B8F-9A10-000000000034', pointsAllocated: 25 },
      ],
    });
    assert.equal(overBudget.valid, false, 'allocations > 100 points must fail');

    const overIdeaCap = CommunityRules.ValidateIdeaAllocations({
      mode: 'Quadratic',
      budgetPoints: 100,
      maxPointsPerIdea: 49,
      allocations: [{ ideaPostId: 'A7C40600-4E12-4B8F-9A10-000000000032', pointsAllocated: 64 }],
    });
    assert.equal(overIdeaCap.valid, false, 'allocation > MaxPointsPerIdea (49) must fail');

    // Refund-on-revote must allow Kenji to revise his existing 36-pt allocation up to 49 without double-counting
    const revoteValid = CommunityRules.ValidateIdeaAllocationChange({
      mode: 'Quadratic',
      budgetPoints: 100,
      maxPointsPerIdea: 49,
      existingAllocations: kenjiExisting,
      changedIdeaPostId: 'A7C40600-4E12-4B8F-9A10-000000000032',
      newPointsAllocated: 49,
    });
    assert.equal(revoteValid.valid, true, revoteValid.errorMessage);
    assert.equal(revoteValid.effectiveVotesByIdea['A7C40600-4E12-4B8F-9A10-000000000032'], 7);
    assert.equal(revoteValid.totalPointsUsed, 65);

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

    // 8. No-op Teardown preserves everything
    const teardownRes = TeardownArchitectAssociationWorld({ store });
    assert.equal(teardownRes.preserved, true);
    assert.ok(store.spaces.has(expectedSpaceId.toLowerCase()), 'no-op teardown must preserve graduated space');
    assert.ok(store.posts.has(persistedReplyId.toLowerCase()), 'no-op teardown must preserve inbound reply');

    return {
      store,
      counts: CountArchWorldStoreRecords(store),
      graduatedSpaceId: expectedSpaceId,
      persistedReplyId,
    };
  } finally {
    if (prevSecret === undefined) delete process.env.COMMUNITY_DIGEST_REPLY_SECRET;
    else process.env.COMMUNITY_DIGEST_REPLY_SECRET = prevSecret;
    ClearDigestReplyTokenRegistry();
    CommunityTestCommunicationProvider.ClearSentMessages();
    mock.restoreAll();
  }
}

function rachelContextUser() {
  return new UserInfo(undefined, {
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

    it('executes full end-to-end integration cycle across 2 consecutive runs on the retained world (with no-op teardown)', async () => {
      const retainedStore = ResetSharedArchWorldStore();
      const firstRun = await RunArchitectAssociationIntegrationCycle({ store: retainedStore, isRepeatCycle: false });
      assert.ok(firstRun.counts.totalRecords > 150);

      // Run #2 against the EXACT same retained store (after no-op TeardownArchitectAssociationWorld)
      // proving repeat-run invariance without destructive cleanup or duplicate Working Spaces/Tasks.
      const secondRun = await RunArchitectAssociationIntegrationCycle({ store: retainedStore, isRepeatCycle: true });
      assert.equal(secondRun.graduatedSpaceId, firstRun.graduatedSpaceId);
      assert.equal(secondRun.store.tasks.size, 1, 'repeat run must not create duplicate starter Tasks');
    });
  });
}

RegisterArchWorldIntegrationTests();
