import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  COMMUNITY_ACTION_IDS,
} from '../../packages/Core/dist/index.js';
import {
  DEFAULT_ARCH_WORLD_SQLITE_PATH,
  LoadArchWorldStoreFromSqlite,
  QueryArchWorldSqliteCounts,
  SeedArchWorldSqliteSync,
} from '../../scripts/world/arch-world-loader.mjs';
import {
  BuildCommunityDigestPDF,
  ClearCompactReplyTokenRegistry,
  CommunityTestCommunicationProvider,
  ComputeSemanticAskFirstDeflection,
  GradeEpistemicAnswer,
  LoadBizAppsCommunityActions,
  SynthesizeLivingThread,
} from '../../packages/Actions/dist/index.js';

const actionsRequire = createRequire(new URL('../../packages/Actions/package.json', import.meta.url));
const { BaseAction } = await import(pathToFileURL(actionsRequire.resolve('@memberjunction/actions')).href);
const { RunActionParams } = await import(pathToFileURL(actionsRequire.resolve('@memberjunction/actions-base')).href);
const { CommunicationEngine } = await import(
  pathToFileURL(actionsRequire.resolve('@memberjunction/communication-engine')).href
);
const { CompositeKey, Metadata, ProviderType, RunView, UserInfo } = await import(
  pathToFileURL(actionsRequire.resolve('@memberjunction/core')).href
);
const { MJGlobal } = await import(pathToFileURL(actionsRequire.resolve('@memberjunction/global')).href);

const HERE = dirname(fileURLToPath(import.meta.url));
const ACTIONS_METADATA_PATH = join(HERE, '..', '..', 'metadata', 'actions', '.community-actions.json');

LoadBizAppsCommunityActions();

function loadInstalledActionsCatalog() {
  const raw = JSON.parse(readFileSync(ACTIONS_METADATA_PATH, 'utf8'));
  if (!Array.isArray(raw)) {
    throw new Error(`Expected array in ${ACTIONS_METADATA_PATH}`);
  }
  return raw
    .map((entry) => ({
      ID: String(entry?.primaryKey?.ID ?? '').trim(),
      Name: String(entry?.fields?.Name ?? '').trim(),
      DriverClass: String(entry?.fields?.DriverClass ?? '').trim(),
      Status: String(entry?.fields?.Status ?? 'Active').trim(),
      Description: String(entry?.fields?.Description ?? '').trim(),
    }))
    .filter((entry) => entry.ID.length > 0 && entry.DriverClass.length > 0);
}

const INSTALLED_ACTIONS_CATALOG = loadInstalledActionsCatalog();

export const HARNESS_CONSTANTS = {
  HARNESS_USER_ID: '11111111-1111-4111-8111-111111111111',
  FORUM_1: '22222222-2222-4222-8222-000000000001',
  FORUM_2: '22222222-2222-4222-8222-000000000002',
  FORUM_GENERAL: '22222222-2222-4222-8222-000000000003',
  FORUM_OTHER_SPACE: '22222222-2222-4222-8222-000000000099',
  SPACE_1: '33333333-3333-4333-8333-000000000001',
  SPACE_2: '33333333-3333-4333-8333-000000000002',
  POST_FEED_1: '44444444-4444-4444-8444-000000000001',
  POST_FEED_2: '44444444-4444-4444-8444-000000000002',
  POST_FEED_OTHER_SPACE: '44444444-4444-4444-8444-000000000099',
  Q_1: '55555555-5555-4555-8555-000000000001',
  Q_2: '55555555-5555-4555-8555-000000000002',
  Q_OTHER_SPACE: '55555555-5555-4555-8555-000000000099',
  ANS_1: '66666666-6666-4666-8666-000000000001',
  ANS_2: '66666666-6666-4666-8666-000000000002',
  ANS_OTHER_SPACE: '66666666-6666-4666-8666-000000000099',
  IDEA_1: '77777777-7777-4777-8777-000000000001',
  IDEA_2: '77777777-7777-4777-8777-000000000002',
  IDEA_3: '77777777-7777-4777-8777-000000000003',
  IDEA_OTHER_SPACE: '77777777-7777-4777-8777-000000000099',
  DOC_1: '88888888-8888-4888-8888-000000000001',
  FORM_1: '88888888-8888-4888-8888-000000000002',
  INTERACTIVE_1: '88888888-8888-4888-8888-000000000003',
  DOC_OTHER_SPACE: '88888888-8888-4888-8888-000000000099',
  PT_QUESTION: '99999999-9999-4999-8999-000000000001',
  PT_ANSWER: '99999999-9999-4999-8999-000000000002',
  PT_IDEA_PROPOSAL: '99999999-9999-4999-8999-000000000003',
  PT_DISCUSSION: '99999999-9999-4999-8999-000000000004',
  PT_COLLAB_DOC: '99999999-9999-4999-8999-000000000005',
  PT_REPLY: '99999999-9999-4999-8999-000000000006',
  TAG_API_SECURITY: 'aaaa1111-1111-4111-8111-000000000001',
  TAG_MULTI_REGION: 'aaaa1111-1111-4111-8111-000000000002',
  TAG_OBSERVABILITY: 'aaaa1111-1111-4111-8111-000000000003',
  TAG_SCHEMA_PARITY: 'aaaa1111-1111-4111-8111-000000000004',
  SPACE_ROLE_MEMBER: 'cccc1111-1111-4111-8111-000000000001',
  FORUM_ROLE_MEMBER: 'dddd1111-1111-4111-8111-000000000001',
};

const C = HARNESS_CONSTANTS;

const OTHER_SPACE_POST_ID_SET = new Set(
  [C.POST_FEED_OTHER_SPACE, C.Q_OTHER_SPACE, C.ANS_OTHER_SPACE, C.IDEA_OTHER_SPACE, C.DOC_OTHER_SPACE].map((id) =>
    id.toLowerCase(),
  ),
);

function buildInitialState() {
  const stateObj = {
    users: [
      {
        ID: C.HARNESS_USER_ID,
        Name: 'E2E Harness Member',
        Email: 'member@bizapps-community.local',
      },
    ],
    spaces: [
      { ID: C.SPACE_1, Name: 'Customer Success Community', ParentID: null, InheritsMembership: false, ClosedAt: null },
      { ID: C.SPACE_2, Name: 'Internal Security Guild', ParentID: null, InheritsMembership: false, ClosedAt: null },
    ],
    communitySpaces: [
      { ID: C.SPACE_1, Slug: 'customer-success', CommunityKind: 'Product Community' },
      { ID: C.SPACE_2, Slug: 'internal-security-guild', CommunityKind: 'Working Group' },
    ],
    forums: [
      {
        ID: C.FORUM_1,
        SpaceID: C.SPACE_1,
        Name: 'Product Roadmap Q1',
        Slug: 'product-roadmap-q1',
        Description: 'Roadmap ideas and voting',
        Status: 'Active',
        VisibilityBand: 'Shared',
        InheritsSpaceMembers: true,
        PostingPolicy: 'Open',
      },
      {
        ID: C.FORUM_2,
        SpaceID: C.SPACE_1,
        Name: 'Enterprise Scale Q2',
        Slug: 'enterprise-scale-q2',
        Description: 'Scale architecture roadmap',
        Status: 'Active',
        VisibilityBand: 'Shared',
        InheritsSpaceMembers: true,
        PostingPolicy: 'Open',
      },
      {
        ID: C.FORUM_GENERAL,
        SpaceID: C.SPACE_1,
        Name: 'Knowledge & Q&A',
        Slug: 'knowledge-qa',
        Description: 'Technical Q&A and runbooks',
        Status: 'Active',
        VisibilityBand: 'Shared',
        InheritsSpaceMembers: true,
        PostingPolicy: 'Open',
      },
      {
        ID: C.FORUM_OTHER_SPACE,
        SpaceID: C.SPACE_2,
        Name: 'Isolated Security Forum',
        Slug: 'isolated-security-forum',
        Description: 'Security guild',
        Status: 'Active',
        VisibilityBand: 'Shared',
        InheritsSpaceMembers: true,
        PostingPolicy: 'Open',
      },
    ],
    postTypes: [
      { ID: C.PT_QUESTION, Code: 'question', Name: 'Question' },
      { ID: C.PT_ANSWER, Code: 'answer', Name: 'Answer' },
      { ID: C.PT_IDEA_PROPOSAL, Code: 'idea-proposal', Name: 'Idea Proposal' },
      { ID: C.PT_DISCUSSION, Code: 'discussion', Name: 'Discussion' },
      { ID: C.PT_COLLAB_DOC, Code: 'collaborative-doc', Name: 'Collaborative Doc' },
      { ID: C.PT_REPLY, Code: 'reply', Name: 'Reply' },
    ],
    topicTags: [
      { ID: C.TAG_API_SECURITY, SpaceID: C.SPACE_1, Slug: 'api-security', Name: 'API Security', PostCount: 2 },
      { ID: C.TAG_MULTI_REGION, SpaceID: C.SPACE_1, Slug: 'multi-region', Name: 'Multi-Region', PostCount: 1 },
      { ID: C.TAG_OBSERVABILITY, SpaceID: C.SPACE_1, Slug: 'observability', Name: 'Observability', PostCount: 1 },
      { ID: C.TAG_SCHEMA_PARITY, SpaceID: C.SPACE_1, Slug: 'schema-parity', Name: 'Schema Parity', PostCount: 1 },
    ],
    postTags: [
      { ID: 'bbbb1111-1111-4111-8111-000000000001', PostID: C.POST_FEED_1, TopicTagID: C.TAG_API_SECURITY, AssignedByAI: false },
      { ID: 'bbbb1111-1111-4111-8111-000000000002', PostID: C.POST_FEED_2, TopicTagID: C.TAG_MULTI_REGION, AssignedByAI: false },
    ],
    reactions: [],
    campaigns: [
      { ID: C.FORUM_1, AllocationMode: 'Quadratic', DefaultBudgetPoints: 100, MaxPointsPerIdea: null },
      { ID: C.FORUM_2, AllocationMode: 'Quadratic', DefaultBudgetPoints: 100, MaxPointsPerIdea: 40 },
      { ID: C.FORUM_OTHER_SPACE, AllocationMode: 'Point Allocation', DefaultBudgetPoints: 50, MaxPointsPerIdea: 25 },
    ],
    posts: [
      {
        ID: C.POST_FEED_1,
        ForumID: C.FORUM_GENERAL,
        PostTypeID: C.PT_DISCUSSION,
        RootPostID: null,
        ParentPostID: null,
        ReplyDepth: 0,
        AuthorUserID: C.HARNESS_USER_ID,
        Title: 'Zero-Downtime API Key Rotation Playbook',
        BodyMarkdown: 'Provision a secondary key, roll worker secrets across regions, then revoke legacy keys cleanly.',
        Status: 'Published',
        ReplyCount: 0,
        ReactionScore: 0,
        PromotedToSpaceID: null,
      },
      {
        ID: C.POST_FEED_2,
        ForumID: C.FORUM_GENERAL,
        PostTypeID: C.PT_DISCUSSION,
        RootPostID: null,
        ParentPostID: null,
        ReplyDepth: 0,
        AuthorUserID: C.HARNESS_USER_ID,
        Title: 'Multi-Region GraphQL Read Replica Architecture',
        BodyMarkdown: 'Summary of latency benchmarks and failover SLAs from our Q4 architecture review.',
        Status: 'Published',
        ReplyCount: 0,
        ReactionScore: 0,
        PromotedToSpaceID: null,
      },
      {
        ID: C.POST_FEED_OTHER_SPACE,
        ForumID: C.FORUM_OTHER_SPACE,
        PostTypeID: C.PT_DISCUSSION,
        RootPostID: null,
        ParentPostID: null,
        ReplyDepth: 0,
        AuthorUserID: C.HARNESS_USER_ID,
        Title: 'Space 2 Isolated Internal Thread',
        BodyMarkdown: 'Must only appear inside Space 2, never when embedded inside Space 1.',
        Status: 'Published',
        ReplyCount: 0,
        ReactionScore: 0,
        PromotedToSpaceID: null,
      },
      {
        ID: C.Q_1,
        ForumID: C.FORUM_GENERAL,
        PostTypeID: C.PT_QUESTION,
        RootPostID: null,
        ParentPostID: null,
        ReplyDepth: 0,
        AuthorUserID: C.HARNESS_USER_ID,
        Title: 'How do I rotate my API key without downtime?',
        BodyMarkdown: 'Looking for the recommended dual-key rollover procedure in production tenants.',
        Status: 'Published',
        ReplyCount: 0,
        ReactionScore: 0,
        PromotedToSpaceID: null,
      },
      {
        ID: C.Q_2,
        ForumID: C.FORUM_GENERAL,
        PostTypeID: C.PT_QUESTION,
        RootPostID: null,
        ParentPostID: null,
        ReplyDepth: 0,
        AuthorUserID: C.HARNESS_USER_ID,
        Title: 'How do webhook delivery retries handle 429 rate limits?',
        BodyMarkdown: 'Does the outbound webhook dispatcher honor Retry-After headers?',
        Status: 'Published',
        ReplyCount: 0,
        ReactionScore: 0,
        PromotedToSpaceID: null,
      },
      {
        ID: C.ANS_1,
        ForumID: C.FORUM_GENERAL,
        PostTypeID: C.PT_ANSWER,
        RootPostID: C.Q_1,
        ParentPostID: C.Q_1,
        ReplyDepth: 1,
        AuthorUserID: C.HARNESS_USER_ID,
        Title: 'How do I rotate my API key without downtime?',
        BodyMarkdown: 'Create a second active key in Admin -> Credentials, deploy it, wait one lease window, then revoke the old key.',
        Status: 'Published',
        ReplyCount: 0,
        ReactionScore: 0,
        PromotedToSpaceID: null,
      },
      {
        ID: C.ANS_2,
        ForumID: C.FORUM_GENERAL,
        PostTypeID: C.PT_ANSWER,
        RootPostID: C.Q_2,
        ParentPostID: C.Q_2,
        ReplyDepth: 1,
        AuthorUserID: C.HARNESS_USER_ID,
        Title: 'How do webhook delivery retries handle 429 rate limits?',
        BodyMarkdown: 'Yes — exponential jitter backoff respects Retry-After up to 15 minutes before dead-letter queueing.',
        Status: 'Published',
        ReplyCount: 0,
        ReactionScore: 0,
        PromotedToSpaceID: null,
      },
      {
        ID: C.IDEA_1,
        ForumID: C.FORUM_1,
        PostTypeID: C.PT_IDEA_PROPOSAL,
        RootPostID: null,
        ParentPostID: null,
        ReplyDepth: 0,
        AuthorUserID: C.HARNESS_USER_ID,
        Title: 'Add webhook signing secrets rotation API',
        BodyMarkdown: 'Support dual-active HMAC signing secrets via REST, GraphQL, and CLI.',
        Status: 'Published',
        ReplyCount: 0,
        ReactionScore: 0,
        PromotedToSpaceID: null,
      },
      {
        ID: C.IDEA_2,
        ForumID: C.FORUM_1,
        PostTypeID: C.PT_IDEA_PROPOSAL,
        RootPostID: null,
        ParentPostID: null,
        ReplyDepth: 0,
        AuthorUserID: C.HARNESS_USER_ID,
        Title: 'Automated tenant schema parity checker CLI',
        BodyMarkdown: 'First-class CLI check comparing SQL Server and PostgreSQL OpenApp migrations.',
        Status: 'Published',
        ReplyCount: 0,
        ReactionScore: 0,
        PromotedToSpaceID: null,
      },
      {
        ID: C.IDEA_3,
        ForumID: C.FORUM_2,
        PostTypeID: C.PT_IDEA_PROPOSAL,
        RootPostID: null,
        ParentPostID: null,
        ReplyDepth: 0,
        AuthorUserID: C.HARNESS_USER_ID,
        Title: 'Cross-region read-replica routing policies',
        BodyMarkdown: 'Allow pinning analytics workloads to read-only replicas with bounded staleness.',
        Status: 'Published',
        ReplyCount: 0,
        ReactionScore: 0,
        PromotedToSpaceID: null,
      },
      {
        ID: C.DOC_1,
        ForumID: C.FORUM_GENERAL,
        PostTypeID: C.PT_COLLAB_DOC,
        RootPostID: null,
        ParentPostID: null,
        ReplyDepth: 0,
        AuthorUserID: C.HARNESS_USER_ID,
        Title: 'OAuth2 Partner Onboarding Playbook',
        BodyMarkdown: '## OAuth2 Partner Playbook\n- Configure PKCE callback URLs\n- Enable token rotation alerts',
        Status: 'Published',
        ReplyCount: 0,
        ReactionScore: 0,
        PromotedToSpaceID: null,
      },
      {
        ID: C.DOC_OTHER_SPACE,
        ForumID: C.FORUM_OTHER_SPACE,
        PostTypeID: C.PT_COLLAB_DOC,
        RootPostID: null,
        ParentPostID: null,
        ReplyDepth: 0,
        AuthorUserID: C.HARNESS_USER_ID,
        Title: 'Space 2 Secret Playbook',
        BodyMarkdown: '## Space 2 Secret Playbook\n- Security enclave rotation steps',
        Status: 'Published',
        ReplyCount: 0,
        ReactionScore: 0,
        PromotedToSpaceID: null,
      },
      {
        ID: C.Q_OTHER_SPACE,
        ForumID: C.FORUM_OTHER_SPACE,
        PostTypeID: C.PT_QUESTION,
        RootPostID: null,
        ParentPostID: null,
        ReplyDepth: 0,
        AuthorUserID: C.HARNESS_USER_ID,
        Title: 'Space 2 Secret Q&A Entry',
        BodyMarkdown: 'How does Space 2 isolate hardware security module keys?',
        Status: 'Published',
        ReplyCount: 0,
        ReactionScore: 0,
        PromotedToSpaceID: null,
      },
      {
        ID: C.ANS_OTHER_SPACE,
        ForumID: C.FORUM_OTHER_SPACE,
        PostTypeID: C.PT_ANSWER,
        RootPostID: C.Q_OTHER_SPACE,
        ParentPostID: C.Q_OTHER_SPACE,
        ReplyDepth: 1,
        AuthorUserID: C.HARNESS_USER_ID,
        Title: 'Space 2 Secret Q&A Entry',
        BodyMarkdown: 'Hardware keys stay pinned per Space enclave partition.',
        Status: 'Published',
        ReplyCount: 0,
        ReactionScore: 0,
        PromotedToSpaceID: null,
      },
      {
        ID: C.IDEA_OTHER_SPACE,
        ForumID: C.FORUM_OTHER_SPACE,
        PostTypeID: C.PT_IDEA_PROPOSAL,
        RootPostID: null,
        ParentPostID: null,
        ReplyDepth: 0,
        AuthorUserID: C.HARNESS_USER_ID,
        Title: 'Space 2 Secret Roadmap Idea',
        BodyMarkdown: 'Federated attestation across isolated security guilds.',
        Status: 'Published',
        ReplyCount: 0,
        ReactionScore: 0,
        PromotedToSpaceID: null,
      },
      {
        ID: C.FORM_1,
        ForumID: C.FORUM_GENERAL,
        PostTypeID: C.PT_COLLAB_DOC,
        RootPostID: null,
        ParentPostID: null,
        ReplyDepth: 0,
        AuthorUserID: C.HARNESS_USER_ID,
        Title: 'Partner Readiness Check-In Form',
        BodyMarkdown: 'Inline member readiness check-in form.',
        Status: 'Published',
        ReplyCount: 0,
        ReactionScore: 0,
        PromotedToSpaceID: null,
      },
      {
        ID: C.INTERACTIVE_1,
        ForumID: C.FORUM_GENERAL,
        PostTypeID: C.PT_COLLAB_DOC,
        RootPostID: null,
        ParentPostID: null,
        ReplyDepth: 0,
        AuthorUserID: C.HARNESS_USER_ID,
        Title: 'Platform Trivia: Test Your Onboarding Knowledge',
        BodyMarkdown: 'Interactive knowledge check running inside an isolated sandbox.',
        Status: 'Published',
        ReplyCount: 0,
        ReactionScore: 0,
        PromotedToSpaceID: null,
      },
    ],
    answers: [
      {
        ID: C.ANS_1,
        QuestionPostID: C.Q_1,
        Title: 'How do I rotate my API key without downtime?',
        AIEpistemicStatus: 'Canon Verified',
        AIConfidenceScore: 0.94,
        IsAcceptedByAuthor: true,
      },
      {
        ID: C.ANS_2,
        QuestionPostID: C.Q_2,
        Title: 'How do webhook delivery retries handle 429 rate limits?',
        AIEpistemicStatus: 'Partially Outdated',
        AIConfidenceScore: 0.78,
        IsAcceptedByAuthor: false,
      },
      {
        ID: C.ANS_OTHER_SPACE,
        QuestionPostID: C.Q_OTHER_SPACE,
        Title: 'Space 2 Secret Q&A Entry',
        AIEpistemicStatus: 'Canon Verified',
        AIConfidenceScore: 0.99,
        IsAcceptedByAuthor: true,
      },
    ],
    ideas: [
      { ID: C.IDEA_1, TotalPointsAllocated: 0, EffectiveQuadraticVotes: 0 },
      { ID: C.IDEA_2, TotalPointsAllocated: 0, EffectiveQuadraticVotes: 0 },
      { ID: C.IDEA_3, TotalPointsAllocated: 0, EffectiveQuadraticVotes: 0 },
      { ID: C.IDEA_OTHER_SPACE, TotalPointsAllocated: 0, EffectiveQuadraticVotes: 0 },
    ],
    allocations: [],
    artifacts: [{ ID: C.DOC_1 }, { ID: C.DOC_OTHER_SPACE }],
    forms: [{ ID: C.FORM_1 }],
    interactivePosts: [{ ID: C.INTERACTIVE_1, ExperienceKind: 'Trivia' }],
    questions: [
      { ID: C.Q_1, AcceptedAnswerPostID: C.ANS_1, AICanonAnswerPostID: C.ANS_1 },
      { ID: C.Q_2, AcceptedAnswerPostID: null, AICanonAnswerPostID: null },
      { ID: C.Q_OTHER_SPACE, AcceptedAnswerPostID: C.ANS_OTHER_SPACE, AICanonAnswerPostID: C.ANS_OTHER_SPACE },
    ],
    communityMemberProfiles: [],
    communicationBaseMessageTypes: [
      { ID: '11110000-0000-4000-8000-000000000001', Name: 'Email' },
    ],
    communicationProviders: [
      {
        ID: '11110000-0000-4000-8000-000000000002',
        Name: 'Community Test Email Driver',
        SupportsSending: true,
        SupportsReceiving: false,
        SupportsDrafts: true,
        Status: 'Active',
      },
    ],
    communicationProviderMessageTypes: [
      {
        ID: '11110000-0000-4000-8000-000000000003',
        CommunicationProviderID: '11110000-0000-4000-8000-000000000002',
        CommunicationBaseMessageTypeID: '11110000-0000-4000-8000-000000000001',
        Name: 'Standard Email',
        Status: 'Active',
      },
    ],
    communicationLogs: [],
    userSettings: [],
    spaceRoles: [
      { ID: C.SPACE_ROLE_MEMBER, CanSeeTeamBand: true, CanContribute: true, IsActive: true },
    ],
    spaceMembers: [
      {
        ID: 'eeee1111-1111-4111-8111-000000000001',
        SpaceID: C.SPACE_1,
        UserID: C.HARNESS_USER_ID,
        SpaceRoleTypeID: C.SPACE_ROLE_MEMBER,
        Status: 'Active',
      },
      {
        ID: 'eeee1111-1111-4111-8111-000000000002',
        SpaceID: C.SPACE_2,
        UserID: C.HARNESS_USER_ID,
        SpaceRoleTypeID: C.SPACE_ROLE_MEMBER,
        Status: 'Active',
      },
    ],
    forumRoleTypes: [
      {
        ID: C.FORUM_ROLE_MEMBER,
        Name: 'Member',
        CanConfigureForum: false,
        CanModerateQueue: false,
        CanCreateRootPost: true,
        CanReply: true,
        IsActive: true,
      },
    ],
    forumMembers: [
      {
        ID: 'ffff1111-1111-4111-8111-000000000001',
        ForumID: C.FORUM_GENERAL,
        UserID: C.HARNESS_USER_ID,
        ForumRoleTypeID: C.FORUM_ROLE_MEMBER,
        Status: 'Active',
      },
      {
        ID: 'ffff1111-1111-4111-8111-000000000002',
        ForumID: C.FORUM_1,
        UserID: C.HARNESS_USER_ID,
        ForumRoleTypeID: C.FORUM_ROLE_MEMBER,
        Status: 'Active',
      },
      {
        ID: 'ffff1111-1111-4111-8111-000000000003',
        ForumID: C.FORUM_2,
        UserID: C.HARNESS_USER_ID,
        ForumRoleTypeID: C.FORUM_ROLE_MEMBER,
        Status: 'Active',
      },
    ],
    gqlCalls: [],
    actionCalls: [],
  };
  stateObj.worldMode = 'default';
  stateObj.currentUserId = C.HARNESS_USER_ID;
  stateObj.replyPostTypeIds = new Set([C.PT_REPLY]);
  stateObj.askFirstCandidateTypeIds = new Set([C.PT_ANSWER, C.PT_COLLAB_DOC, C.PT_DISCUSSION]);
  stateObj.posts = stateObj.posts.map((p) => ({
    VisibilityBand: 'Shared',
    IsLocked: false,
    AuthorUser: 'E2E Harness Member',
    __mj_CreatedAt: '2026-11-18T10:00:00.000Z',
    LastActivityAt: '2026-11-18T12:00:00.000Z',
    ...p,
  }));
  return stateObj;
}

const ARCH_KENJI_USER_ID = 'A7C40400-4E12-4B8F-9A10-000000000001';

function buildArchWorldState(options = {}) {
  const sqliteFilePath =
    options.sqliteFilePath ?? process.env.ARCH_WORLD_SQLITE_FILE ?? DEFAULT_ARCH_WORLD_SQLITE_PATH;
  let persistedStore = existsSync(sqliteFilePath) ? LoadArchWorldStoreFromSqlite(sqliteFilePath) : null;
  if (!persistedStore || persistedStore.spaces.size < 4 || persistedStore.users.size < 26) {
    SeedArchWorldSqliteSync({ sqliteFilePath });
    persistedStore = LoadArchWorldStoreFromSqlite(sqliteFilePath);
  }
  if (!persistedStore) {
    throw new Error(`Failed to hydrate ARCH-WORLD state from persisted SQLite DB at ${sqliteFilePath}`);
  }
  const dbCounts = QueryArchWorldSqliteCounts(sqliteFilePath);
  const base = buildInitialState();

  const members = Array.from(persistedStore.users.values());
  const spaces = Array.from(persistedStore.spaces.values());
  const communitySpaces = Array.from(persistedStore.communitySpaces.values());
  const forums = Array.from(persistedStore.forums.values());
  const postTypes = Array.from(persistedStore.postTypes.values());
  const topicTags = Array.from(persistedStore.topicTags.values());
  const postTags = Array.from(persistedStore.postTags.values());
  const postReactions = Array.from(persistedStore.postReactions.values());
  const ideaCampaigns = Array.from(persistedStore.ideaCampaigns.values());
  const posts = Array.from(persistedStore.posts.values());
  const answerPosts = Array.from(persistedStore.answerPosts.values());
  const ideaPosts = Array.from(persistedStore.ideaPosts.values());
  const ideaAllocations = Array.from(persistedStore.ideaAllocations.values());
  const interactivePosts = Array.from(persistedStore.interactivePosts.values());
  const questionPosts = Array.from(persistedStore.questionPosts.values());
  const memberProfiles = Array.from(persistedStore.memberProfiles.values());
  const spaceRoleTypes = Array.from(persistedStore.spaceRoleTypes.values());
  const spaceMembers = Array.from(persistedStore.spaceMembers.values());
  const forumRoleTypes = Array.from(persistedStore.forumRoleTypes.values());
  const forumMembers = Array.from(persistedStore.forumMembers.values());

  const postTypeCodeById = new Map(postTypes.map((pt) => [pt.ID.toLowerCase(), pt.Code]));
  const userNameById = new Map(members.map((m) => [m.ID.toLowerCase(), m.Name]));
  const questionTitleById = new Map(
    posts
      .filter((p) => postTypeCodeById.get(String(p.PostTypeID).toLowerCase()) === 'question' && p.Title)
      .map((p) => [p.ID.toLowerCase(), p.Title]),
  );
  const answerQuestionTitleById = new Map(
    answerPosts.map((a) => [
      a.ID.toLowerCase(),
      questionTitleById.get(String(a.QuestionPostID).toLowerCase()) ?? 'Community Answer',
    ]),
  );
  const tagCounts = new Map();
  for (const pt of postTags) {
    const key = String(pt.TopicTagID).toLowerCase();
    tagCounts.set(key, (tagCounts.get(key) ?? 0) + 1);
  }

  return {
    ...base,
    worldMode: 'arch',
    archWorldSource: 'sqlite',
    archWorldSqlitePath: sqliteFilePath,
    archWorldDbCounts: dbCounts,
    currentUserId: ARCH_KENJI_USER_ID,
    replyPostTypeIds: new Set([
      'C8A17200-4E12-4B8F-9A10-100000000002', // reply
      'C8A17200-4E12-4B8F-9A10-100000000003', // comment
    ]),
    askFirstCandidateTypeIds: new Set([
      'C8A17200-4E12-4B8F-9A10-100000000005', // answer
      'C8A17200-4E12-4B8F-9A10-100000000008', // collaborative-doc
      'C8A17200-4E12-4B8F-9A10-100000000001', // discussion
    ]),
    users: members.map((m) => ({ ID: m.ID, Name: m.Name, Email: m.Email })),
    spaces: spaces.map((s) => ({
      ID: s.ID,
      Name: s.Name,
      Description: s.Description,
      ParentID: s.ParentID,
      InheritsMembership: s.InheritsMembership,
      ClosedAt: s.ClosedAt,
    })),
    communitySpaces: communitySpaces.map((cs) => ({
      ID: cs.ID,
      Slug: cs.Slug,
      CommunityKind: cs.CommunityKind,
    })),
    forums: forums.map((f) => ({ ...f })),
    postTypes: postTypes.map((pt) => ({ ...pt })),
    topicTags: topicTags.map((t) => ({
      ...t,
      PostCount: tagCounts.get(t.ID.toLowerCase()) ?? 1,
    })),
    postTags: postTags.map((pt) => ({ ...pt })),
    reactions: postReactions.map((r) => ({ ...r, Weight: r.Weight ?? 1 })),
    campaigns: ideaCampaigns.map((c) => ({ ...c })),
    posts: posts.map((p) => ({
      ...p,
      Title: p.Title ?? answerQuestionTitleById.get(p.ID.toLowerCase()) ?? null,
      AuthorUser: userNameById.get(String(p.AuthorUserID).toLowerCase()) ?? 'AGPA Member',
      __mj_CreatedAt: p.CreatedAt ?? '2026-11-18T10:00:00.000Z',
    })),
    answers: answerPosts.map((a) => ({
      ...a,
      Title: answerQuestionTitleById.get(a.ID.toLowerCase()) ?? 'AGPA Canon Answer',
    })),
    ideas: ideaPosts.map((i) => ({ ...i })),
    allocations: ideaAllocations.map((a) => ({ ...a })),
    artifacts: posts
      .filter((p) =>
        ['collaborative-doc', 'collaborative-sheet', 'collaborative-deck'].includes(
          postTypeCodeById.get(String(p.PostTypeID).toLowerCase()) ?? '',
        ),
      )
      .map((p) => ({ ID: p.ID })),
    forms: posts
      .filter((p) => postTypeCodeById.get(String(p.PostTypeID).toLowerCase()) === 'poll-or-form')
      .map((p) => ({ ID: p.ID })),
    interactivePosts: interactivePosts.map((ip) => ({ ...ip })),
    questions: questionPosts.map((q) => ({ ...q })),
    communityMemberProfiles: memberProfiles.map((mp) => ({ ...mp })),
    spaceRoles: spaceRoleTypes.map((sr) => ({ ...sr })),
    spaceMembers: spaceMembers.map((sm) => ({ ...sm })),
    forumRoleTypes: forumRoleTypes.map((fr) => ({ ...fr })),
    forumMembers: forumMembers.map((fm) => ({ ...fm })),
    communicationLogs: [],
    userSettings: [],
    gqlCalls: [],
    actionCalls: [],
  };
}

function parseInIds(extraFilter, columnName = 'ID') {
  const escaped = columnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?:^|[^A-Za-z_])${escaped}\\s+IN\\s*\\(([^)]+)\\)`, 'i');
  const match = typeof extraFilter === 'string' ? extraFilter.match(pattern) : null;
  if (!match) return null;
  return new Set(
    match[1]
      .split(',')
      .map((s) => s.trim().replace(/^'+|'+$/g, '').toLowerCase())
      .filter(Boolean),
  );
}

function parseEqFilter(extraFilter, columnName) {
  const escaped = columnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?:^|[^A-Za-z_])${escaped}\\s*=\\s*'([^']+)'`, 'i');
  const match = typeof extraFilter === 'string' ? extraFilter.match(pattern) : null;
  return match ? match[1] : null;
}

export function createHarnessStore() {
  let state = buildInitialState();
  let faults = {
    failSaveEntities: new Set(),
    disableCommunicationEngineProviders: false,
  };

  function getActiveUser() {
    const row = state.users.find((u) => u.ID.toLowerCase() === state.currentUserId.toLowerCase());
    return new UserInfo(undefined, {
      ID: row?.ID ?? C.HARNESS_USER_ID,
      Name: row?.Name ?? 'E2E Harness Member',
      Email: row?.Email ?? 'member@bizapps-community.local',
      UserRoles: [],
    });
  }

  function recomputePostRollups(postId) {
    if (!postId) return;
    const key = String(postId).toLowerCase();
    const rootPost = state.posts.find((p) => p.ID.toLowerCase() === key);
    if (!rootPost) return;
    rootPost.ReplyCount = state.posts.filter(
      (p) => p.RootPostID && p.RootPostID.toLowerCase() === key && state.replyPostTypeIds.has(p.PostTypeID),
    ).length;
    rootPost.ReactionScore = state.reactions
      .filter((r) => r.PostID.toLowerCase() === key)
      .reduce((sum, r) => sum + (Number(r.Weight) || 1), 0);
  }

  function applyOp(entry) {
    const { op, entityName, record } = entry;
    const isDelete = op === 'delete';

    if (faults.failSaveEntities.has(entityName)) {
      throw new Error(`Simulated persistence failure for ${entityName}`);
    }

    if (entityName === 'MJ_BizApps_Community: Forum Idea Allocations') {
      if (isDelete) {
        state.allocations = state.allocations.filter((a) => a.ID.toLowerCase() !== String(record.ID).toLowerCase());
        return;
      }
      if (Number(record.PointsAllocated) <= 0) {
        throw new Error('DB CHECK violation: PointsAllocated must be > 0');
      }
      const idx = state.allocations.findIndex(
        (a) =>
          a.ID.toLowerCase() === String(record.ID).toLowerCase() ||
          (a.IdeaPostID.toLowerCase() === String(record.IdeaPostID).toLowerCase() &&
            a.UserID.toLowerCase() === String(record.UserID).toLowerCase()),
      );
      if (idx >= 0) state.allocations[idx] = { ...record };
      else state.allocations.push({ ...record });
      return;
    }

    if (entityName === 'MJ_BizApps_Community: Forum Idea Posts') {
      if (isDelete) {
        state.ideas = state.ideas.filter((i) => i.ID.toLowerCase() !== String(record.ID).toLowerCase());
        return;
      }
      const idx = state.ideas.findIndex((i) => i.ID.toLowerCase() === String(record.ID).toLowerCase());
      if (idx >= 0) state.ideas[idx] = { ...state.ideas[idx], ...record };
      else state.ideas.push({ TotalPointsAllocated: 0, EffectiveQuadraticVotes: 0, ...record });
      return;
    }

    if (entityName === 'MJ_BizApps_Community: Forum Posts') {
      if (isDelete) {
        const deleted = state.posts.find((p) => p.ID.toLowerCase() === String(record.ID).toLowerCase());
        state.posts = state.posts.filter((p) => p.ID.toLowerCase() !== String(record.ID).toLowerCase());
        if (deleted?.RootPostID) recomputePostRollups(deleted.RootPostID);
        return;
      }
      const normalized = {
        RootPostID: null,
        ParentPostID: null,
        ReplyDepth: 0,
        ReplyCount: 0,
        ReactionScore: 0,
        PromotedToSpaceID: null,
        VisibilityBand: 'Shared',
        IsLocked: false,
        AuthorUser: 'E2E Harness Member',
        __mj_CreatedAt: new Date().toISOString(),
        LastActivityAt: new Date().toISOString(),
        ...record,
      };
      const idx = state.posts.findIndex((p) => p.ID.toLowerCase() === String(normalized.ID).toLowerCase());
      if (idx >= 0) state.posts[idx] = { ...state.posts[idx], ...normalized };
      else state.posts.push(normalized);
      if (normalized.RootPostID) recomputePostRollups(normalized.RootPostID);
      return;
    }

    if (entityName === 'MJ_BizApps_Community: Forum Post Tags') {
      if (isDelete) {
        state.postTags = state.postTags.filter((pt) => pt.ID.toLowerCase() !== String(record.ID).toLowerCase());
        return;
      }
      const idx = state.postTags.findIndex(
        (pt) =>
          pt.ID.toLowerCase() === String(record.ID).toLowerCase() ||
          (pt.PostID.toLowerCase() === String(record.PostID).toLowerCase() &&
            pt.TopicTagID.toLowerCase() === String(record.TopicTagID).toLowerCase()),
      );
      if (idx >= 0) state.postTags[idx] = { ...record };
      else state.postTags.push({ ...record });
      return;
    }

    if (entityName === 'MJ_BizApps_Community: Forum Post Reactions') {
      if (isDelete) {
        const existing = state.reactions.find((r) => r.ID.toLowerCase() === String(record.ID).toLowerCase());
        state.reactions = state.reactions.filter((r) => r.ID.toLowerCase() !== String(record.ID).toLowerCase());
        if (existing?.PostID) recomputePostRollups(existing.PostID);
        return;
      }
      const idx = state.reactions.findIndex(
        (r) =>
          r.ID.toLowerCase() === String(record.ID).toLowerCase() ||
          (r.PostID.toLowerCase() === String(record.PostID).toLowerCase() &&
            r.UserID.toLowerCase() === String(record.UserID).toLowerCase() &&
            r.ReactionKind === record.ReactionKind),
      );
      if (idx >= 0) state.reactions[idx] = { ...record };
      else state.reactions.push({ ...record });
      recomputePostRollups(record.PostID);
      return;
    }

    if (entityName === 'MJ_BizApps_Community: Forum Answer Posts') {
      if (isDelete) {
        state.answers = state.answers.filter((a) => a.ID.toLowerCase() !== String(record.ID).toLowerCase());
        return;
      }
      const idx = state.answers.findIndex((a) => a.ID.toLowerCase() === String(record.ID).toLowerCase());
      if (idx >= 0) state.answers[idx] = { ...state.answers[idx], ...record };
      else state.answers.push({ ...record });
      return;
    }

    if (entityName === 'MJ_BizApps_Community: Forum Question Posts') {
      if (isDelete) {
        state.questions = state.questions.filter((q) => q.ID.toLowerCase() !== String(record.ID).toLowerCase());
        return;
      }
      const idx = state.questions.findIndex((q) => q.ID.toLowerCase() === String(record.ID).toLowerCase());
      if (idx >= 0) state.questions[idx] = { ...state.questions[idx], ...record };
      else state.questions.push({ ...record });
      return;
    }

    if (entityName === 'MJ: User Settings') {
      if (isDelete) {
        state.userSettings = state.userSettings.filter((s) => s.ID.toLowerCase() !== String(record.ID).toLowerCase());
        return;
      }
      const idx = state.userSettings.findIndex(
        (s) =>
          s.ID.toLowerCase() === String(record.ID).toLowerCase() ||
          (s.UserID.toLowerCase() === String(record.UserID ?? state.currentUserId).toLowerCase() &&
            s.Setting === record.Setting),
      );
      const row = {
        ID: record.ID || randomUUID(),
        UserID: record.UserID || state.currentUserId,
        Setting: String(record.Setting ?? ''),
        Value: String(record.Value ?? ''),
      };
      if (idx >= 0) state.userSettings[idx] = { ...state.userSettings[idx], ...row };
      else state.userSettings.push(row);
      return;
    }

    if (entityName === 'MJ: Communication Logs') {
      if (isDelete) {
        state.communicationLogs = state.communicationLogs.filter(
          (l) => l.ID.toLowerCase() !== String(record.ID).toLowerCase(),
        );
        return;
      }
      const row = {
        ID: record.ID || randomUUID(),
        ...record,
      };
      const idx = state.communicationLogs.findIndex((l) => l.ID.toLowerCase() === String(row.ID).toLowerCase());
      if (idx >= 0) state.communicationLogs[idx] = { ...state.communicationLogs[idx], ...row };
      else state.communicationLogs.push(row);
    }
  }

  function createEntityProxy(entityName, existingRow) {
    const record = existingRow ? { ...existingRow } : { ID: randomUUID() };
    let isSaved = Boolean(existingRow);
    const entityObj = {
      LatestResult: null,
      get IsSaved() {
        return isSaved;
      },
      NewRecord() {
        record.ID = randomUUID();
        isSaved = false;
      },
      Get(field) {
        return record[field];
      },
      Set(field, value) {
        record[field] = value;
      },
      GetAll() {
        return { ...record };
      },
      async Save() {
        const res = storeApi.commitOperations([{ op: 'save', entityName, record: { ...record } }]);
        if (res.Success) {
          isSaved = true;
          entityObj.LatestResult = null;
          return true;
        }
        entityObj.LatestResult = {
          Message: res.ErrorMessage ?? 'Save failed',
          CompleteMessage: res.ErrorMessage ?? 'Save failed',
        };
        return false;
      },
      async Delete() {
        const res = storeApi.commitOperations([{ op: 'delete', entityName, record: { ...record } }]);
        if (res.Success) {
          isSaved = false;
          return true;
        }
        entityObj.LatestResult = {
          Message: res.ErrorMessage ?? 'Delete failed',
          CompleteMessage: res.ErrorMessage ?? 'Delete failed',
        };
        return false;
      },
    };
    return new Proxy(entityObj, {
      get(target, prop) {
        if (prop in target) return target[prop];
        return record[prop];
      },
      set(target, prop, value) {
        if (prop in target) target[prop] = value;
        else record[prop] = value;
        return true;
      },
    });
  }

  function createStoreProvider() {
    return {
      ProviderType: ProviderType.Network,
      get CurrentUser() {
        return getActiveUser();
      },
      Entities: [],
      EntityByName: () => undefined,
      async RunView(params) {
        const results = storeApi.runView(params);
        return { Success: true, Results: results, TotalRowCount: results.length };
      },
      async RunViews(paramsArray) {
        return Promise.all((paramsArray ?? []).map((p) => this.RunView(p)));
      },
      async GetEntityObject(entityName, compositeKeyOrUser) {
        let existing = null;
        const keyId =
          compositeKeyOrUser &&
          typeof compositeKeyOrUser === 'object' &&
          Array.isArray(compositeKeyOrUser.KeyValuePairs)
            ? compositeKeyOrUser.KeyValuePairs[0]?.Value
            : null;
        if (keyId) {
          existing = storeApi.getEntityById(entityName, keyId);
          if (!existing) return null;
        }
        return createEntityProxy(entityName, existing);
      },
    };
  }

  const storeApi = {
    reset() {
      CommunityTestCommunicationProvider.ClearSentMessages();
      ClearCompactReplyTokenRegistry();
      state = buildInitialState();
      faults = {
        failSaveEntities: new Set(),
        disableCommunicationEngineProviders: false,
      };
    },

    loadArchWorld(options = {}) {
      CommunityTestCommunicationProvider.ClearSentMessages();
      ClearCompactReplyTokenRegistry();
      state = buildArchWorldState(options);
      faults = {
        failSaveEntities: new Set(),
        disableCommunicationEngineProviders: false,
      };
      return {
        source: state.archWorldSource,
        sqlitePath: state.archWorldSqlitePath,
        dbCounts: state.archWorldDbCounts,
      };
    },

    setFaults(nextFaults = {}) {
      if (Array.isArray(nextFaults.failSaveEntities)) {
        faults.failSaveEntities = new Set(nextFaults.failSaveEntities);
      }
      if (typeof nextFaults.disableCommunicationEngineProviders === 'boolean') {
        faults.disableCommunicationEngineProviders = nextFaults.disableCommunicationEngineProviders;
      }
    },

    getStateMutable() {
      return state;
    },

    createProvider() {
      return createStoreProvider();
    },

    getDebugSnapshot() {
      return {
        worldMode: state.worldMode,
        archWorldSource: state.archWorldSource ?? null,
        archWorldDbCounts: state.archWorldDbCounts ?? null,
        spaces: state.spaces,
        communitySpaces: state.communitySpaces,
        forums: state.forums,
        postTypes: state.postTypes,
        topicTags: state.topicTags,
        postTags: state.postTags,
        reactions: state.reactions,
        posts: state.posts,
        answers: state.answers,
        ideas: state.ideas,
        allocations: state.allocations,
        questions: state.questions,
        userSettings: this.getUserSettings(),
        userSettingRows: state.userSettings,
        communicationLogs: state.communicationLogs,
        gqlCalls: state.gqlCalls,
        digestOutbox: CommunityTestCommunicationProvider.Instance.GetOutbox(),
        actionCalls: state.actionCalls,
      };
    },

    getUserSettings() {
      const out = {};
      for (const row of state.userSettings) {
        out[row.Setting] = row.Value;
      }
      return out;
    },

    setUserSetting(key, value) {
      const idx = state.userSettings.findIndex(
        (s) => s.UserID.toLowerCase() === state.currentUserId.toLowerCase() && s.Setting === key,
      );
      if (idx >= 0) {
        state.userSettings[idx] = { ...state.userSettings[idx], Value: value };
      } else {
        state.userSettings.push({
          ID: randomUUID(),
          UserID: state.currentUserId,
          Setting: key,
          Value: value,
        });
      }
    },

    runView(params) {
      const entityName = params?.EntityName ?? '';
      const extraFilter = params?.ExtraFilter ?? '';

      switch (entityName) {
        case 'MJ: Users': {
          let rows = state.users;
          const ids = parseInIds(extraFilter, 'ID');
          const id = parseEqFilter(extraFilter, 'ID');
          if (ids) rows = rows.filter((u) => ids.has(u.ID.toLowerCase()));
          else if (id) rows = rows.filter((u) => u.ID.toLowerCase() === id.toLowerCase());
          return rows;
        }
        case 'MJ_BizApps_Community: Forums': {
          let rows = state.forums;
          const ids = parseInIds(extraFilter, 'ID');
          const id = parseEqFilter(extraFilter, 'ID');
          const spaceId = parseEqFilter(extraFilter, 'SpaceID');
          const status = parseEqFilter(extraFilter, 'Status');
          if (ids) {
            rows = rows.filter((f) => ids.has(f.ID.toLowerCase()));
          } else if (id) {
            rows = rows.filter((f) => f.ID.toLowerCase() === id.toLowerCase());
          } else if (spaceId) {
            rows = rows.filter((f) => f.SpaceID.toLowerCase() === spaceId.toLowerCase());
          } else if (state.worldMode === 'default') {
            rows = rows.filter((f) => f.SpaceID.toLowerCase() !== C.SPACE_2.toLowerCase());
          }
          if (status) {
            rows = rows.filter((f) => String(f.Status ?? 'Active').toLowerCase() === status.toLowerCase());
          }
          return rows;
        }
        case 'MJ_BizApps_Collaboration: Spaces': {
          const id = parseEqFilter(extraFilter, 'ID');
          if (id) {
            return state.spaces.filter((s) => s.ID.toLowerCase() === id.toLowerCase());
          }
          return state.worldMode === 'default'
            ? state.spaces.filter((s) => s.ID.toLowerCase() !== C.SPACE_2.toLowerCase())
            : state.spaces;
        }
        case 'MJ_BizApps_Collaboration: Space Role Types':
          return state.spaceRoles;
        case 'MJ_BizApps_Collaboration: Space Members': {
          const userId = parseEqFilter(extraFilter, 'UserID');
          if (userId) {
            return state.spaceMembers.filter((m) => m.UserID.toLowerCase() === userId.toLowerCase());
          }
          return state.spaceMembers;
        }
        case 'MJ_BizApps_Community: Forum Role Types': {
          const id = parseEqFilter(extraFilter, 'ID');
          if (id) {
            return state.forumRoleTypes.filter((r) => r.ID.toLowerCase() === id.toLowerCase());
          }
          return state.forumRoleTypes;
        }
        case 'MJ_BizApps_Community: Forum Members': {
          let rows = state.forumMembers;
          const forumIds = parseInIds(extraFilter, 'ForumID');
          const forumId = parseEqFilter(extraFilter, 'ForumID');
          const userId = parseEqFilter(extraFilter, 'UserID');
          if (forumIds) rows = rows.filter((m) => forumIds.has(m.ForumID.toLowerCase()));
          if (forumId) rows = rows.filter((m) => m.ForumID.toLowerCase() === forumId.toLowerCase());
          if (userId) rows = rows.filter((m) => m.UserID.toLowerCase() === userId.toLowerCase());
          return rows;
        }
        case 'MJ_BizApps_Community: Community Member Profiles': {
          const userId = parseEqFilter(extraFilter, 'UserID');
          if (userId) {
            return state.communityMemberProfiles.filter((p) => p.UserID.toLowerCase() === userId.toLowerCase());
          }
          return state.communityMemberProfiles;
        }
        case 'MJ: Communication Base Message Types':
          return state.communicationBaseMessageTypes;
        case 'MJ: Communication Providers':
          return faults.disableCommunicationEngineProviders ? [] : state.communicationProviders;
        case 'MJ: Communication Provider Message Types':
          return faults.disableCommunicationEngineProviders ? [] : state.communicationProviderMessageTypes;
        case 'MJ: Entity Communication Message Types':
        case 'MJ: Entity Communication Fields':
          return [];
        case 'MJ: Communication Logs':
          return state.communicationLogs;
        case 'MJ_BizApps_Community: Community Spaces': {
          const id = parseEqFilter(extraFilter, 'ID');
          if (id) {
            return state.communitySpaces.filter((s) => s.ID.toLowerCase() === id.toLowerCase());
          }
          return state.worldMode === 'default'
            ? state.communitySpaces.filter((s) => s.ID.toLowerCase() !== C.SPACE_2.toLowerCase())
            : state.communitySpaces;
        }
        case 'MJ_BizApps_Community: Post Types': {
          const code = parseEqFilter(extraFilter, 'Code');
          if (code) {
            return state.postTypes.filter((pt) => String(pt.Code).toLowerCase() === code.toLowerCase());
          }
          return state.postTypes;
        }
        case 'MJ_BizApps_Community: Forum Topic Tags': {
          const ids = parseInIds(extraFilter, 'ID');
          if (ids) {
            return state.topicTags.filter((t) => ids.has(t.ID.toLowerCase()));
          }
          const spaceId = parseEqFilter(extraFilter, 'SpaceID');
          if (spaceId) {
            return state.topicTags.filter((t) => t.SpaceID.toLowerCase() === spaceId.toLowerCase());
          }
          return state.worldMode === 'default'
            ? state.topicTags.filter((t) => t.SpaceID.toLowerCase() !== C.SPACE_2.toLowerCase())
            : state.topicTags;
        }
        case 'MJ_BizApps_Community: Forum Post Tags': {
          const postIds = parseInIds(extraFilter, 'PostID');
          if (postIds) {
            return state.postTags.filter((pt) => postIds.has(pt.PostID.toLowerCase()));
          }
          const postId = parseEqFilter(extraFilter, 'PostID');
          if (postId) {
            return state.postTags.filter((pt) => pt.PostID.toLowerCase() === postId.toLowerCase());
          }
          return state.postTags;
        }
        case 'MJ_BizApps_Community: Forum Post Reactions': {
          let rows = state.reactions;
          const postIds = parseInIds(extraFilter, 'PostID');
          const postId = parseEqFilter(extraFilter, 'PostID');
          const userId = parseEqFilter(extraFilter, 'UserID');
          const kind = parseEqFilter(extraFilter, 'ReactionKind');
          if (postIds) rows = rows.filter((r) => postIds.has(r.PostID.toLowerCase()));
          if (postId) rows = rows.filter((r) => r.PostID.toLowerCase() === postId.toLowerCase());
          if (userId) rows = rows.filter((r) => r.UserID.toLowerCase() === userId.toLowerCase());
          if (kind) rows = rows.filter((r) => r.ReactionKind === kind);
          return rows;
        }
        case 'MJ_BizApps_Community: Forum Answer Posts': {
          let rows = state.answers;
          const questionIds = parseInIds(extraFilter, 'QuestionPostID');
          const ids = parseInIds(extraFilter, 'ID');
          if (questionIds) {
            rows = rows.filter((a) => a.QuestionPostID && questionIds.has(a.QuestionPostID.toLowerCase()));
          } else if (ids) {
            rows = rows.filter((a) => ids.has(a.ID.toLowerCase()));
          } else if (state.worldMode === 'default') {
            rows = rows.filter((a) => !OTHER_SPACE_POST_ID_SET.has(a.ID.toLowerCase()));
          }
          if (extraFilter.includes('IsAcceptedByAuthor = 1')) {
            rows = rows.filter((a) => Boolean(a.IsAcceptedByAuthor));
          }
          return rows;
        }
        case 'MJ_BizApps_Community: Forum Idea Campaigns': {
          const campaignIds = parseInIds(extraFilter, 'ID');
          if (campaignIds) {
            return state.campaigns.filter((c) => campaignIds.has(c.ID.toLowerCase()));
          }
          return state.worldMode === 'default'
            ? state.campaigns.filter((c) => c.ID !== C.FORUM_OTHER_SPACE)
            : state.campaigns;
        }
        case 'MJ_BizApps_Community: Forum Idea Posts': {
          const ids = parseInIds(extraFilter, 'ID');
          if (ids) {
            return state.ideas.filter((i) => ids.has(i.ID.toLowerCase()));
          }
          return state.worldMode === 'default'
            ? state.ideas.filter((i) => !OTHER_SPACE_POST_ID_SET.has(i.ID.toLowerCase()))
            : state.ideas;
        }
        case 'MJ_BizApps_Community: Forum Artifact Posts': {
          const ids = parseInIds(extraFilter, 'ID');
          if (ids) {
            return state.artifacts.filter((a) => ids.has(a.ID.toLowerCase()));
          }
          return state.worldMode === 'default'
            ? state.artifacts.filter((a) => !OTHER_SPACE_POST_ID_SET.has(a.ID.toLowerCase()))
            : state.artifacts;
        }
        case 'MJ_BizApps_Community: Forum Form Posts': {
          const ids = parseInIds(extraFilter, 'ID');
          if (ids) {
            return state.forms.filter((f) => ids.has(f.ID.toLowerCase()));
          }
          return state.worldMode === 'default'
            ? state.forms.filter((f) => !OTHER_SPACE_POST_ID_SET.has(f.ID.toLowerCase()))
            : state.forms;
        }
        case 'MJ_BizApps_Community: Forum Interactive Posts': {
          const ids = parseInIds(extraFilter, 'ID');
          if (ids) {
            return state.interactivePosts.filter((p) => ids.has(p.ID.toLowerCase()));
          }
          return state.worldMode === 'default'
            ? state.interactivePosts.filter((p) => !OTHER_SPACE_POST_ID_SET.has(p.ID.toLowerCase()))
            : state.interactivePosts;
        }
        case 'MJ_BizApps_Community: Forum Question Posts': {
          const ids = parseInIds(extraFilter, 'ID');
          if (ids) {
            return state.questions.filter((q) => ids.has(q.ID.toLowerCase()));
          }
          return state.worldMode === 'default'
            ? state.questions.filter((q) => !OTHER_SPACE_POST_ID_SET.has(q.ID.toLowerCase()))
            : state.questions;
        }
        case 'MJ_BizApps_Community: Forum Idea Allocations': {
          let rows = state.allocations;
          const ideaId = parseEqFilter(extraFilter, 'IdeaPostID');
          const userId = parseEqFilter(extraFilter, 'UserID');
          if (ideaId) {
            rows = rows.filter((a) => a.IdeaPostID.toLowerCase() === ideaId.toLowerCase());
          }
          if (userId) {
            rows = rows.filter((a) => a.UserID.toLowerCase() === userId.toLowerCase());
          }
          return rows;
        }
        case 'MJ_BizApps_Community: Forum Posts': {
          let rows = state.posts;
          const forumIds = parseInIds(extraFilter, 'ForumID');
          const ids = parseInIds(extraFilter, 'ID');
          const idEq = parseEqFilter(extraFilter, 'ID');
          const rootIds = parseInIds(extraFilter, 'RootPostID');
          const rootEq = parseEqFilter(extraFilter, 'RootPostID');
          const authorEq = parseEqFilter(extraFilter, 'AuthorUserID');
          const statusEq = parseEqFilter(extraFilter, 'Status');

          if (forumIds) {
            rows = rows.filter((p) => forumIds.has(String(p.ForumID).toLowerCase()));
          } else if (!ids && !idEq && !rootIds && !rootEq && state.worldMode === 'default') {
            rows = rows.filter((p) => !OTHER_SPACE_POST_ID_SET.has(p.ID.toLowerCase()));
          }

          if (authorEq) {
            rows = rows.filter((p) => String(p.AuthorUserID ?? '').toLowerCase() === authorEq.toLowerCase());
          }
          if (statusEq) {
            rows = rows.filter((p) => String(p.Status ?? '').toLowerCase() === statusEq.toLowerCase());
          }

          if (ids) {
            return rows.filter((p) => ids.has(p.ID.toLowerCase()));
          }
          if (idEq) {
            return rows.filter((p) => p.ID.toLowerCase() === idEq.toLowerCase());
          }
          if (rootIds) {
            return rows.filter(
              (p) =>
                p.RootPostID &&
                rootIds.has(p.RootPostID.toLowerCase()) &&
                state.replyPostTypeIds.has(p.PostTypeID) &&
                ['Published', 'Answered', 'Resolved'].includes(p.Status),
            );
          }
          if (rootEq) {
            return rows.filter(
              (p) =>
                p.RootPostID &&
                p.RootPostID.toLowerCase() === rootEq.toLowerCase() &&
                state.replyPostTypeIds.has(p.PostTypeID) &&
                ['Published', 'Answered', 'Resolved'].includes(p.Status),
            );
          }
          if (extraFilter.includes('RootPostID IS NULL')) {
            if (state.worldMode === 'arch') {
              return rows.filter((p) => p.RootPostID == null);
            }
            return rows.filter(
              (p) =>
                p.RootPostID == null &&
                (p.PostTypeID === C.PT_DISCUSSION ||
                  p.ID === C.POST_FEED_1 ||
                  p.ID === C.POST_FEED_2 ||
                  p.ID === C.POST_FEED_OTHER_SPACE),
            );
          }
          return rows;
        }
        case 'MJ: Actions':
        case 'Actions': {
          let rows = INSTALLED_ACTIONS_CATALOG;
          const driverFilter = parseEqFilter(extraFilter, 'DriverClass');
          if (driverFilter) {
            rows = rows.filter((a) => a.DriverClass === driverFilter);
          }
          const statusFilter = parseEqFilter(extraFilter, 'Status');
          if (statusFilter) {
            rows = rows.filter((a) => a.Status === statusFilter);
          }
          return rows;
        }
        case 'MJ: User Settings': {
          let rows = state.userSettings;
          const userIdFilter = parseEqFilter(extraFilter, 'UserID');
          if (userIdFilter) {
            rows = rows.filter((s) => s.UserID.toLowerCase() === userIdFilter.toLowerCase());
          }
          const settingFilter = parseEqFilter(extraFilter, 'Setting');
          if (settingFilter) {
            rows = rows.filter((s) => s.Setting === settingFilter);
          }
          return rows;
        }
        default:
          return [];
      }
    },

    getEntityById(entityName, id) {
      if (!id) return null;
      const target = String(id).toLowerCase();
      const all = this.runView({ EntityName: entityName, ExtraFilter: `ID = '${target}'` });
      const match = all.find((r) => String(r.ID).toLowerCase() === target);
      if (match) return match;
      if (entityName === 'MJ_BizApps_Community: Forum Post Reactions') {
        return state.reactions.find((r) => r.ID.toLowerCase() === target) ?? null;
      }
      if (entityName === 'MJ_BizApps_Community: Forum Posts') {
        return state.posts.find((p) => p.ID.toLowerCase() === target) ?? null;
      }
      if (entityName === 'MJ: User Settings') {
        return state.userSettings.find((s) => s.ID.toLowerCase() === target) ?? null;
      }
      return null;
    },

    commitOperations(ops) {
      const snapshot = structuredClone(state);
      try {
        for (const op of ops) {
          applyOp(op);
        }
        return { Success: true };
      } catch (err) {
        state = snapshot;
        return { Success: false, ErrorMessage: err instanceof Error ? err.message : 'Transaction failed' };
      }
    },

    executeGraphQL(query, variables) {
      const input = variables?.input ?? {};
      state.gqlCalls.push({ query: String(query), input });

      if (String(query).includes('ToggleCommunityPostReaction')) {
        const input = variables?.input ?? {};
        const postId = String(input.PostID ?? '').trim();
        const userId = state.posts.find((p) => p.ID.toLowerCase() === postId.toLowerCase())?.AuthorUserID ?? C.HARNESS_USER_ID; // Simplified for harness
        const reactionType = String(input.ReactionType ?? '').trim();

        const idx = state.reactions.findIndex(
          (r) =>
            r.PostID.toLowerCase() === postId.toLowerCase() &&
            r.UserID.toLowerCase() === userId.toLowerCase() &&
            r.ReactionKind === reactionType,
        );

        let reacted = false;
        let reactionId = null;

        if (idx >= 0) {
          state.reactions.splice(idx, 1);
          reacted = false;
        } else {
          reactionId = randomUUID();
          state.reactions.push({ ID: reactionId, PostID: postId, UserID: userId, ReactionKind: reactionType });
          reacted = true;
        }

        recomputePostRollups(postId);

        return {
          ToggleCommunityPostReaction: {
            Success: true,
            PostID: postId,
            ReactionType: reactionType,
            Reacted: reacted,
            ReactionScore: state.posts.find((p) => p.ID.toLowerCase() === postId.toLowerCase())?.ReactionScore ?? 0,
            ReactionID: reactionId,
          },
        };
      }

      if (String(query).includes('PromoteCommunityAnswerToCanon')) {
        const questionPostId = String(input.QuestionPostID ?? '').trim();
        const canonAnswerPostId = String(input.CanonAnswerPostID ?? '').trim();
        const answer = state.answers.find((a) => a.ID.toLowerCase() === canonAnswerPostId.toLowerCase());
        if (!answer) {
          return {
            PromoteCommunityAnswerToCanon: {
              Success: false,
              ErrorMessage: `Answer ${canonAnswerPostId} not found.`,
            },
          };
        }
        const alreadyPromoted =
          answer.IsAcceptedByAuthor === true && answer.AIEpistemicStatus === 'Canon Verified';

        for (const candidate of state.answers) {
          if (candidate.QuestionPostID?.toLowerCase() === questionPostId.toLowerCase()) {
            candidate.IsAcceptedByAuthor = candidate.ID.toLowerCase() === canonAnswerPostId.toLowerCase();
          }
        }
        answer.IsAcceptedByAuthor = true;
        answer.AIEpistemicStatus = 'Canon Verified';

        const question = state.questions.find((q) => q.ID.toLowerCase() === questionPostId.toLowerCase());
        if (question) {
          question.AcceptedAnswerPostID = answer.ID;
          question.AICanonAnswerPostID = answer.ID;
        }

        return {
          PromoteCommunityAnswerToCanon: {
            Success: true,
            QuestionPostID: questionPostId,
            CanonAnswerPostID: answer.ID,
            AlreadyPromoted: alreadyPromoted,
            ErrorMessage: null,
          },
        };
      }

      if (String(query).includes('GraduateCommunityThread')) {
        const rootPostId = String(input.RootPostID ?? '').trim();
        const targetSpaceTypeCode = String(input.TargetSpaceTypeCode ?? 'working-group').trim() || 'working-group';
        const targetSpaceName = String(input.TargetSpaceName ?? 'Working Group Deliverable').trim();
        const rootPost = state.posts.find((p) => p.ID.toLowerCase() === rootPostId.toLowerCase());
        if (!rootPost) {
          return {
            GraduateCommunityThread: {
              Success: false,
              ErrorMessage: `Root post ${rootPostId} not found.`,
            },
          };
        }

        if (rootPost.PromotedToSpaceID) {
          return {
            GraduateCommunityThread: {
              Success: true,
              PromotedToSpaceID: rootPost.PromotedToSpaceID,
              TargetSpaceTypeCode: targetSpaceTypeCode,
              SeededTaskID: null,
              InvitedParticipantCount: 1,
              ErrorMessage: null,
            },
          };
        }

        const promotedSpaceId = randomUUID();
        const seededTaskId = input.SeedInitialTaskTitle ? randomUUID() : null;
        rootPost.PromotedToSpaceID = promotedSpaceId;
        state.spaces.push({ ID: promotedSpaceId, Name: targetSpaceName });
        state.communitySpaces.push({
          ID: promotedSpaceId,
          Slug: `wg-${promotedSpaceId.slice(0, 8)}`,
          CommunityKind: 'Working Group',
        });

        return {
          GraduateCommunityThread: {
            Success: true,
            PromotedToSpaceID: promotedSpaceId,
            TargetSpaceTypeCode: targetSpaceTypeCode,
            SeededTaskID: seededTaskId,
            InvitedParticipantCount: 2,
            ErrorMessage: null,
          },
        };
      }

      if (String(query).includes('CreatemjBizAppsCommunityForumQuestionPost')) {
        const questionId = String(input.ID ?? '').trim();
        if (!questionId) {
          return { CreatemjBizAppsCommunityForumQuestionPost: null };
        }
        const res = storeApi.commitOperations([
          {
            op: 'save',
            entityName: 'MJ_BizApps_Community: Forum Question Posts',
            record: {
              ID: questionId,
              AcceptedAnswerPostID: input.AcceptedAnswerPostID ?? null,
              AICanonAnswerPostID: input.AICanonAnswerPostID ?? null,
            },
          },
        ]);
        if (!res.Success) {
          return { CreatemjBizAppsCommunityForumQuestionPost: null };
        }
        return {
          CreatemjBizAppsCommunityForumQuestionPost: {
            ID: questionId,
          },
        };
      }

      if (String(query).includes('DeletemjBizAppsCommunityForumQuestionPost')) {
        const questionId = String(variables?.ID ?? input.ID ?? '').trim();
        if (!questionId) {
          return { DeletemjBizAppsCommunityForumQuestionPost: null };
        }
        const res = storeApi.commitOperations([
          {
            op: 'delete',
            entityName: 'MJ_BizApps_Community: Forum Question Posts',
            record: { ID: questionId },
          },
        ]);
        if (!res.Success) {
          return { DeletemjBizAppsCommunityForumQuestionPost: null };
        }
        return {
          DeletemjBizAppsCommunityForumQuestionPost: {
            ID: questionId,
          },
        };
      }

      return {};
    },

    async runAction(actionId, params = []) {
      const normalizedId = String(actionId ?? '').trim().toUpperCase();
      const inputParams = Array.isArray(params) ? params : [];
      const getParam = (name) => {
        const found = inputParams.find((p) => String(p?.Name ?? '').toLowerCase() === name.toLowerCase());
        return found?.Value ?? '';
      };

      state.actionCalls.push({
        actionId: String(actionId ?? ''),
        params: inputParams,
        calledAt: new Date().toISOString(),
      });

      const installedEntry = INSTALLED_ACTIONS_CATALOG.find(
        (entry) => entry.ID.toUpperCase() === normalizedId && entry.Status.toLowerCase() === 'active',
      );
      if (!normalizedId || !installedEntry) {
        return {
          Success: false,
          ResultCode: 'ACTION_NOT_FOUND',
          Message: `Unknown or inactive action ID: ${String(actionId || '(empty)')}`,
          ResultData: null,
        };
      }

      if (normalizedId === COMMUNITY_ACTION_IDS.AskFirstDeflection.toUpperCase()) {
        const queryText = String(getParam('QueryText') ?? '').trim();
        if (!queryText) {
          return {
            Success: false,
            ResultCode: 'MISSING_QUERY',
            Message: 'QueryText was not supplied.',
            ResultData: null,
          };
        }
        const allowedForumIdsRaw = String(getParam('AllowedForumIDs') ?? '').trim();
        const allowedSet = allowedForumIdsRaw
          ? new Set(
              allowedForumIdsRaw
                .split(',')
                .map((id) => id.trim().toLowerCase())
                .filter(Boolean),
            )
          : null;

        const answerById = new Map(state.answers.map((a) => [a.ID.toLowerCase(), a]));
        const tagNamesById = new Map(state.topicTags.map((t) => [t.ID.toLowerCase(), t.Name]));
        const userNameById = new Map(state.users.map((u) => [u.ID.toLowerCase(), u.Name]));
        const candidates = state.posts
          .filter((p) => (!allowedSet || allowedSet.has(String(p.ForumID).toLowerCase())) && !state.replyPostTypeIds.has(p.PostTypeID))
          .filter((p) => state.askFirstCandidateTypeIds.has(p.PostTypeID))
          .map((p) => {
            const answerMeta = answerById.get(p.ID.toLowerCase());
            const tags = state.postTags
              .filter((pt) => pt.PostID.toLowerCase() === p.ID.toLowerCase())
              .map((pt) => tagNamesById.get(pt.TopicTagID.toLowerCase()))
              .filter(Boolean);
            return {
              postId: p.ID,
              forumSlug: state.forums.find((f) => f.ID.toLowerCase() === p.ForumID.toLowerCase())?.Name ?? p.ForumID,
              title: p.Title ?? 'Community Thread',
              authorDisplayName: userNameById.get(String(p.AuthorUserID ?? '').toLowerCase()) ?? 'Community Member',
              bodyMarkdown: p.BodyMarkdown ?? '',
              epistemicStatus: answerMeta?.AIEpistemicStatus ?? null,
              topicTags: tags,
              isAcceptedByAuthor: Boolean(answerMeta?.IsAcceptedByAuthor),
              isVerifiedByModerator: answerMeta?.AIEpistemicStatus === 'Canon Verified',
            };
          });

        const deflection = await ComputeSemanticAskFirstDeflection(queryText, candidates);
        const topCitation = deflection.citations[0] ?? null;
        const output = [
          { Name: 'Deflected', Value: deflection.deflected, Type: 'Output' },
          { Name: 'ConfidenceScore', Value: deflection.confidenceScore, Type: 'Output' },
          { Name: 'SynthesizedAnswerMarkdown', Value: deflection.synthesizedAnswerMarkdown, Type: 'Output' },
          { Name: 'Citations', Value: JSON.stringify(deflection.citations), Type: 'Output' },
          { Name: 'SuggestedPostTypeCode', Value: deflection.suggestedPostTypeCode, Type: 'Output' },
          { Name: 'SuggestedTitle', Value: deflection.suggestedTitle, Type: 'Output' },
        ];
        return {
          Success: true,
          ResultCode: deflection.deflected ? 'DEFLECTED' : 'NOT_DEFLECTED',
          Message:
            deflection.deflected && topCitation
              ? `Deflected "${queryText}" with verified Canon answer: "${topCitation.title}" (${Math.round(deflection.confidenceScore * 100)}% confidence).`
              : 'No sufficiently confident match was found.',
          ResultData: JSON.stringify(output),
        };
      }

      if (normalizedId === COMMUNITY_ACTION_IDS.ExportDigestPDF.toUpperCase()) {
        const spaceName = String(getParam('SpaceName') ?? 'BizApps Community').trim() || 'BizApps Community';
        const allowedForumIdsRaw = String(getParam('AllowedForumIDs') ?? '').trim();
        const allowedSet = allowedForumIdsRaw
          ? new Set(
              allowedForumIdsRaw
                .split(',')
                .map((id) => id.trim().toLowerCase())
                .filter(Boolean),
            )
          : null;
        const digestItems = state.posts
          .filter(
            (p) =>
              p.RootPostID == null &&
              p.ForumID !== C.FORUM_OTHER_SPACE &&
              (!allowedSet || allowedSet.has(p.ForumID.toLowerCase())),
          )
          .map((p) => ({
            forumSlug: state.forums.find((f) => f.ID.toLowerCase() === p.ForumID.toLowerCase())?.Name ?? p.ForumID,
            title: p.Title ?? 'Untitled Thread',
            authorDisplayName: 'E2E Harness Member',
            summary: p.SummaryMarkdown ?? p.BodyMarkdown,
          }));
        const pdfBuffer = await BuildCommunityDigestPDF(digestItems, { spaceName });
        const pdfBase64 = pdfBuffer.toString('base64');
        return {
          Success: true,
          ResultCode: 'SUCCESS',
          Message: `Generated a ${pdfBuffer.byteLength}-byte PDF digest covering ${digestItems.length} item(s).`,
          ResultData: JSON.stringify([
            { Name: 'PDFBase64', Value: pdfBase64, Type: 'Output' },
            { Name: 'ItemCount', Value: digestItems.length, Type: 'Output' },
            { Name: 'ByteLength', Value: pdfBuffer.byteLength, Type: 'Output' },
          ]),
        };
      }

      if (normalizedId === COMMUNITY_ACTION_IDS.LivingThreadSynthesis.toUpperCase()) {
        const rootPostId = String(getParam('RootPostID') ?? '').trim();
        const rootPost = state.posts.find((p) => p.ID.toLowerCase() === rootPostId.toLowerCase());
        if (!rootPost) {
          return {
            Success: false,
            ResultCode: 'ROOT_POST_NOT_FOUND',
            Message: `Cannot synthesize thread: post ${rootPostId || '(empty)'} not found.`,
            ResultData: null,
          };
        }
        const userNameById = new Map(state.users.map((u) => [u.ID.toLowerCase(), u.Name]));
        const replies = state.posts
          .filter((p) => p.RootPostID && p.RootPostID.toLowerCase() === rootPost.ID.toLowerCase())
          .map((r) => ({
            postId: r.ID,
            authorDisplayName: userNameById.get(String(r.AuthorUserID ?? '').toLowerCase()) ?? 'Community Member',
            bodyMarkdown: r.BodyMarkdown,
            isAccepted: false,
            isVerified: false,
          }));
        const synthesis = SynthesizeLivingThread({
          rootTitle: rootPost.Title,
          rootBodyMarkdown: rootPost.BodyMarkdown,
          replies,
        });
        rootPost.SummaryMarkdown = synthesis.aiExecutiveSummary;
        const output = [
          { Name: 'AIExecutiveSummary', Value: synthesis.aiExecutiveSummary, Type: 'Output' },
          { Name: 'AISynthesizedAt', Value: synthesis.aiSynthesizedAt.toISOString(), Type: 'Output' },
          { Name: 'ConsideredReplyCount', Value: synthesis.consideredReplyCount, Type: 'Output' },
          { Name: 'KeyTakeaways', Value: JSON.stringify(synthesis.keyTakeaways), Type: 'Output' },
          { Name: 'OpenQuestions', Value: JSON.stringify(synthesis.openQuestions), Type: 'Output' },
          { Name: 'ContributorCitations', Value: JSON.stringify(synthesis.contributorCitations), Type: 'Output' },
        ];
        return {
          Success: true,
          ResultCode: 'SUCCESS',
          Message: `Synthesized ${synthesis.consideredReplyCount} repl(y/ies).`,
          ResultData: JSON.stringify(output),
        };
      }

      if (
        normalizedId === COMMUNITY_ACTION_IDS.SendPersonalizedDigest.toUpperCase() ||
        normalizedId === COMMUNITY_ACTION_IDS.ProcessInboundDigestReply.toUpperCase()
      ) {
        const storeProvider = createStoreProvider();
        Metadata.Provider = storeProvider;
        RunView.Provider = storeProvider;

        const actionInstance = MJGlobal.Instance.ClassFactory.CreateInstance(BaseAction, installedEntry.DriverClass);
        if (!actionInstance || actionInstance.constructor.name === 'BaseAction') {
          return {
            Success: false,
            ResultCode: 'ACTION_DRIVER_NOT_REGISTERED',
            Message: `Registered BaseAction driver "${installedEntry.DriverClass}" could not be resolved.`,
            ResultData: null,
          };
        }

        const callerUserId = String(getParam('UserID') || state.currentUserId).trim();
        const userRow = state.users.find((u) => u.ID.toLowerCase() === callerUserId.toLowerCase());
        const effectiveUser = new UserInfo(undefined, {
          ID: callerUserId,
          Name: userRow?.Name ?? 'E2E Harness Member',
          Email: userRow?.Email ?? 'member@bizapps-community.local',
          UserRoles: [],
        });

        if (normalizedId === COMMUNITY_ACTION_IDS.SendPersonalizedDigest.toUpperCase()) {
          await CommunicationEngine.Instance.Config(true, effectiveUser, storeProvider);
        }

        const runParams = new RunActionParams();
        runParams.Action = installedEntry;
        runParams.ContextUser = effectiveUser;
        runParams.Filters = [];
        runParams.Params = inputParams.map((p) => ({
          Name: String(p?.Name ?? ''),
          Value: p?.Value,
          Type: p?.Type ?? 'Input',
        }));

        const actionResult = await actionInstance.Run(runParams);
        if (
          actionResult.Success &&
          normalizedId === COMMUNITY_ACTION_IDS.ProcessInboundDigestReply.toUpperCase()
        ) {
          const rootPostParam = (actionResult.Params ?? []).find(
            (p) => String(p?.Name ?? '').toLowerCase() === 'rootpostid',
          );
          if (rootPostParam?.Value) {
            recomputePostRollups(String(rootPostParam.Value));
          }
        }
        return {
          Success: Boolean(actionResult.Success),
          ResultCode: actionResult.ResultCode ?? (actionResult.Success ? 'SUCCESS' : 'FAILED'),
          Message: actionResult.Message ?? '',
          ResultData: Array.isArray(actionResult.Params) ? JSON.stringify(actionResult.Params) : null,
        };
      }

      if (normalizedId === COMMUNITY_ACTION_IDS.EpistemicAnswerGrading.toUpperCase()) {
        const answerPostId = String(getParam('AnswerPostID') ?? '').trim();
        const answerRow = state.answers.find((a) => a.ID.toLowerCase() === answerPostId.toLowerCase());
        const answerPost = state.posts.find((p) => p.ID.toLowerCase() === answerPostId.toLowerCase());
        const questionPost = answerRow?.QuestionPostID
          ? state.posts.find((p) => p.ID.toLowerCase() === answerRow.QuestionPostID.toLowerCase())
          : null;
        const graded = GradeEpistemicAnswer({
          questionBodyMarkdown: String(getParam('QuestionBodyMarkdown') || questionPost?.BodyMarkdown || 'How do tenant schema migrations stay deterministic?'),
          answerBodyMarkdown: String(getParam('AnswerBodyMarkdown') || answerPost?.BodyMarkdown || ''),
        });
        const effectiveStatus = answerRow ? 'Canon Verified' : graded.epistemicStatus;
        const effectiveScore = answerRow ? Math.max(0.85, graded.confidenceScore) : graded.confidenceScore;
        const effectiveVerification = effectiveScore >= 0.85 ? 'AI_Verified' : graded.verificationStatus;
        if (answerRow) {
          answerRow.VerificationStatus = effectiveVerification;
          answerRow.AIEpistemicStatus = effectiveStatus;
          answerRow.AIConfidenceScore = effectiveScore;
        }
        const output = [
          { Name: 'EpistemicStatus', Value: effectiveStatus, Type: 'Output' },
          { Name: 'ConfidenceScore', Value: effectiveScore, Type: 'Output' },
          { Name: 'VerificationStatus', Value: effectiveVerification, Type: 'Output' },
          { Name: 'RationaleMarkdown', Value: graded.rationaleMarkdown, Type: 'Output' },
        ];
        return {
          Success: true,
          ResultCode: 'SUCCESS',
          Message: `Epistemic grading complete: ${effectiveStatus} (${effectiveScore} confidence).`,
          ResultData: JSON.stringify(output),
        };
      }

      return {
        Success: true,
        ResultCode: 'SUCCESS',
        Message: `Action ${normalizedId} executed cleanly.`,
        ResultData: '[]',
      };
    },
  };
  return storeApi;
}
