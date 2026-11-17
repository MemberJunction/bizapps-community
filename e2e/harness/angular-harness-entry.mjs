import '@angular/compiler';
import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { Metadata, RunView, UserInfo } from '@memberjunction/core';
import { GraphQLActionClient } from '@memberjunction/graphql-dataprovider';
import { MJGlobal } from '@memberjunction/global';
import { BaseResourceComponent } from '@memberjunction/ng-shared';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';
import {
  BaseSpaceOverviewCard,
  BaseSpaceTab,
  BaseSpaceTypeUIDriver,
  UIDriverRegistry,
  assembleSpaceContributions,
} from '@mj-biz-apps/collaboration-ng-widgets';
import { COMMUNITY_ACTION_IDS } from '@mj-biz-apps/community-core';
import { COMMUNITY_ENTITY_NAMES } from '@mj-biz-apps/community-entities';
import {
  CommunityHubResource,
  CommunityCollaborationSpaceUIDriver,
  CommunityForumsSpaceTabComponent,
  CommunityQaCanonSpaceTabComponent,
  CommunityIdeationSpaceTabComponent,
  CommunityPlaybooksSpaceTabComponent,
  CommunityOverviewHighlightsCardComponent,
  LoadBizAppsCommunityClient,
  GeneratedFormsModule,
} from '../../packages/Angular/dist/public-api.js';

// Trigger registration across CommunityHubResource, Collaboration Space extensions, and all 25 entity form components.
LoadBizAppsCommunityClient();
window.__generatedFormsModule = GeneratedFormsModule;
window.__communityCollaborationExtensions = [
  CommunityCollaborationSpaceUIDriver,
  CommunityForumsSpaceTabComponent,
  CommunityQaCanonSpaceTabComponent,
  CommunityIdeationSpaceTabComponent,
  CommunityPlaybooksSpaceTabComponent,
  CommunityOverviewHighlightsCardComponent,
];

const GENERATED_FORM_ENTITY_NAMES = [
  'MJ_BizApps_Community: Community Member Profiles',
  'MJ_BizApps_Community: Community Spaces',
  'MJ_BizApps_Community: Forum AMA Posts',
  'MJ_BizApps_Community: Forum Answer Posts',
  'MJ_BizApps_Community: Forum Artifact Posts',
  'MJ_BizApps_Community: Forum Case Posts',
  'MJ_BizApps_Community: Forum Form Posts',
  'MJ_BizApps_Community: Forum Idea Allocations',
  'MJ_BizApps_Community: Forum Idea Campaigns',
  'MJ_BizApps_Community: Forum Idea Posts',
  'MJ_BizApps_Community: Forum Interactive Posts',
  'MJ_BizApps_Community: Forum Interactive Sessions',
  'MJ_BizApps_Community: Forum Members',
  'MJ_BizApps_Community: Forum Post Attachments',
  'MJ_BizApps_Community: Forum Post Flags',
  'MJ_BizApps_Community: Forum Post Reactions',
  'MJ_BizApps_Community: Forum Post Tags',
  'MJ_BizApps_Community: Forum Posts',
  'MJ_BizApps_Community: Forum Question Posts',
  'MJ_BizApps_Community: Forum Role Types',
  'MJ_BizApps_Community: Forum Subscriptions',
  'MJ_BizApps_Community: Forum Topic Tags',
  'MJ_BizApps_Community: Forum Types',
  'MJ_BizApps_Community: Forums',
  'MJ_BizApps_Community: Post Types',
];

const cf = MJGlobal.Instance.ClassFactory;
const hubRegistration = cf.GetRegistration(BaseResourceComponent, 'CommunityHubResource');
const formRegistrations = {};
for (const entityName of GENERATED_FORM_ENTITY_NAMES) {
  const reg = cf.GetRegistration(BaseFormComponent, entityName);
  formRegistrations[entityName] = Boolean(reg);
}

const spaceDriverInstance = UIDriverRegistry.Instance.ResolveDriver('CommunitySpaceUIDriver');
const contributedTabs = assembleSpaceContributions(BaseSpaceTab, 'community', [], (reg, meta) => ({
  key: meta.contributionKey,
  label: meta.label ?? meta.contributionKey,
  icon: meta.icon,
  sortKey: meta.sortKey,
  component: reg.SubClass,
}));
const contributedCards = assembleSpaceContributions(BaseSpaceOverviewCard, 'community', [], (reg, meta) => ({
  key: meta.contributionKey,
  title: meta.title ?? meta.contributionKey,
  sortKey: meta.sortKey,
  side: meta.side,
  component: reg.SubClass,
}));

window.__runtimeRegistrations = {
  CommunityHubResource: Boolean(hubRegistration),
  formRegistrations,
  totalVerified: (hubRegistration ? 1 : 0) + Object.values(formRegistrations).filter(Boolean).length,
  collaboration: {
    driverClassName: spaceDriverInstance.constructor.name,
    isBaseSpaceTypeUIDriver: spaceDriverInstance instanceof BaseSpaceTypeUIDriver,
    assembledTabKeys: contributedTabs.map((t) => t.key),
    assembledCardKeys: contributedCards.map((c) => c.key),
  },
};

const HARNESS_USER = new UserInfo(undefined, {
  ID: '11111111-1111-4111-8111-111111111111',
  Name: 'E2E Harness Member',
  Email: 'member@bizapps-community.local',
  UserRoles: [],
});

const FORUM_1 = '22222222-2222-4222-8222-000000000001';
const FORUM_2 = '22222222-2222-4222-8222-000000000002';
const FORUM_GENERAL = '22222222-2222-4222-8222-000000000003';
const FORUM_OTHER_SPACE = '22222222-2222-4222-8222-000000000099';
const SPACE_1 = '33333333-3333-4333-8333-000000000001';
const SPACE_2 = '33333333-3333-4333-8333-000000000002';

const POST_FEED_1 = '44444444-4444-4444-8444-000000000001';
const POST_FEED_2 = '44444444-4444-4444-8444-000000000002';
const POST_FEED_OTHER_SPACE = '44444444-4444-4444-8444-000000000099';
const Q_1 = '55555555-5555-4555-8555-000000000001';
const Q_2 = '55555555-5555-4555-8555-000000000002';
const Q_OTHER_SPACE = '55555555-5555-4555-8555-000000000099';
const ANS_1 = '66666666-6666-4666-8666-000000000001';
const ANS_2 = '66666666-6666-4666-8666-000000000002';
const ANS_OTHER_SPACE = '66666666-6666-4666-8666-000000000099';
const IDEA_1 = '77777777-7777-4777-8777-000000000001';
const IDEA_2 = '77777777-7777-4777-8777-000000000002';
const IDEA_3 = '77777777-7777-4777-8777-000000000003';
const IDEA_OTHER_SPACE = '77777777-7777-4777-8777-000000000099';
const DOC_1 = '88888888-8888-4888-8888-000000000001';
const FORM_1 = '88888888-8888-4888-8888-000000000002';
const INTERACTIVE_1 = '88888888-8888-4888-8888-000000000003';
const DOC_OTHER_SPACE = '88888888-8888-4888-8888-000000000099';

const state = {
  spaces: [
    { ID: SPACE_1, Name: 'Customer Success Community' },
    { ID: SPACE_2, Name: 'Internal Security Guild' },
  ],
  forums: [
    { ID: FORUM_1, SpaceID: SPACE_1, Name: 'Product Roadmap Q1' },
    { ID: FORUM_2, SpaceID: SPACE_1, Name: 'Enterprise Scale Q2' },
    { ID: FORUM_GENERAL, SpaceID: SPACE_1, Name: 'Knowledge & Q&A' },
    { ID: FORUM_OTHER_SPACE, SpaceID: SPACE_2, Name: 'Isolated Security Forum' },
  ],
  postTypes: [
    { ID: '99999999-9999-4999-8999-000000000001', Code: 'question', Name: 'Question' },
    { ID: '99999999-9999-4999-8999-000000000002', Code: 'answer', Name: 'Answer' },
    { ID: '99999999-9999-4999-8999-000000000003', Code: 'idea', Name: 'Idea' },
    { ID: '99999999-9999-4999-8999-000000000004', Code: 'discussion', Name: 'Discussion' },
    { ID: '99999999-9999-4999-8999-000000000005', Code: 'collaborative-doc', Name: 'Collaborative Doc' },
  ],
  campaigns: [
    { ID: FORUM_1, AllocationMode: 'Quadratic', DefaultBudgetPoints: 100, MaxPointsPerIdea: null },
    { ID: FORUM_2, AllocationMode: 'Quadratic', DefaultBudgetPoints: 100, MaxPointsPerIdea: 40 },
    { ID: FORUM_OTHER_SPACE, AllocationMode: 'Point Allocation', DefaultBudgetPoints: 50, MaxPointsPerIdea: 25 },
  ],
  posts: [
    {
      ID: POST_FEED_1,
      ForumID: FORUM_GENERAL,
      Title: 'Zero-Downtime API Key Rotation Playbook',
      BodyMarkdown: 'Provision a secondary key, roll worker secrets across regions, then revoke legacy keys cleanly.',
      Status: 'Published',
    },
    {
      ID: POST_FEED_2,
      ForumID: FORUM_GENERAL,
      Title: 'Multi-Region GraphQL Read Replica Architecture',
      BodyMarkdown: 'Summary of latency benchmarks and failover SLAs from our Q4 architecture review.',
      Status: 'Published',
    },
    {
      ID: POST_FEED_OTHER_SPACE,
      ForumID: FORUM_OTHER_SPACE,
      Title: 'Space 2 Isolated Internal Thread',
      BodyMarkdown: 'Must only appear inside Space 2, never when embedded inside Space 1.',
      Status: 'Published',
    },
    {
      ID: Q_1,
      ForumID: FORUM_GENERAL,
      Title: 'How do I rotate my API key without downtime?',
      BodyMarkdown: 'Looking for the recommended dual-key rollover procedure in production tenants.',
      Status: 'Published',
    },
    {
      ID: Q_2,
      ForumID: FORUM_GENERAL,
      Title: 'How do webhook delivery retries handle 429 rate limits?',
      BodyMarkdown: 'Does the outbound webhook dispatcher honor Retry-After headers?',
      Status: 'Published',
    },
    {
      ID: ANS_1,
      ForumID: FORUM_GENERAL,
      Title: 'How do I rotate my API key without downtime?',
      BodyMarkdown: 'Create a second active key in Admin -> Credentials, deploy it, wait one lease window, then revoke the old key.',
      Status: 'Published',
    },
    {
      ID: ANS_2,
      ForumID: FORUM_GENERAL,
      Title: 'How do webhook delivery retries handle 429 rate limits?',
      BodyMarkdown: 'Yes — exponential jitter backoff respects Retry-After up to 15 minutes before dead-letter queueing.',
      Status: 'Published',
    },
    {
      ID: IDEA_1,
      ForumID: FORUM_1,
      Title: 'Add webhook signing secrets rotation API',
      BodyMarkdown: 'Support dual-active HMAC signing secrets via REST, GraphQL, and CLI.',
      Status: 'Published',
    },
    {
      ID: IDEA_2,
      ForumID: FORUM_1,
      Title: 'Automated tenant schema parity checker CLI',
      BodyMarkdown: 'First-class CLI check comparing SQL Server and PostgreSQL OpenApp migrations.',
      Status: 'Published',
    },
    {
      ID: IDEA_3,
      ForumID: FORUM_2,
      Title: 'Cross-region read-replica routing policies',
      BodyMarkdown: 'Allow pinning analytics workloads to read-only replicas with bounded staleness.',
      Status: 'Published',
    },
    {
      ID: DOC_1,
      ForumID: FORUM_GENERAL,
      Title: 'OAuth2 Partner Onboarding Playbook',
      BodyMarkdown: '## OAuth2 Partner Playbook\n- Configure PKCE callback URLs\n- Enable token rotation alerts',
      Status: 'Published',
    },
    {
      ID: DOC_OTHER_SPACE,
      ForumID: FORUM_OTHER_SPACE,
      Title: 'Space 2 Secret Playbook',
      BodyMarkdown: '## Space 2 Secret Playbook\n- Security enclave rotation steps',
      Status: 'Published',
    },
    {
      ID: Q_OTHER_SPACE,
      ForumID: FORUM_OTHER_SPACE,
      Title: 'Space 2 Secret Q&A Entry',
      BodyMarkdown: 'How does Space 2 isolate hardware security module keys?',
      Status: 'Published',
    },
    {
      ID: ANS_OTHER_SPACE,
      ForumID: FORUM_OTHER_SPACE,
      Title: 'Space 2 Secret Q&A Entry',
      BodyMarkdown: 'Hardware keys stay pinned per Space enclave partition.',
      Status: 'Published',
    },
    {
      ID: IDEA_OTHER_SPACE,
      ForumID: FORUM_OTHER_SPACE,
      Title: 'Space 2 Secret Roadmap Idea',
      BodyMarkdown: 'Federated attestation across isolated security guilds.',
      Status: 'Published',
    },
    {
      ID: FORM_1,
      ForumID: FORUM_GENERAL,
      Title: 'Partner Readiness Check-In Form',
      BodyMarkdown: 'Inline member readiness check-in form.',
      Status: 'Published',
    },
    {
      ID: INTERACTIVE_1,
      ForumID: FORUM_GENERAL,
      Title: 'Platform Trivia: Test Your Onboarding Knowledge',
      BodyMarkdown: 'Interactive knowledge check running inside an isolated sandbox.',
      Status: 'Published',
    },
  ],
  answers: [
    {
      ID: ANS_1,
      QuestionPostID: Q_1,
      Title: 'How do I rotate my API key without downtime?',
      AIEpistemicStatus: 'Canon Verified',
      AIConfidenceScore: 0.94,
      IsAcceptedByAuthor: true,
    },
    {
      ID: ANS_2,
      QuestionPostID: Q_2,
      Title: 'How do webhook delivery retries handle 429 rate limits?',
      AIEpistemicStatus: 'Partially Outdated',
      AIConfidenceScore: 0.78,
      IsAcceptedByAuthor: false,
    },
    {
      ID: ANS_OTHER_SPACE,
      QuestionPostID: Q_OTHER_SPACE,
      Title: 'Space 2 Secret Q&A Entry',
      AIEpistemicStatus: 'Canon Verified',
      AIConfidenceScore: 0.99,
      IsAcceptedByAuthor: true,
    },
  ],
  ideas: [
    { ID: IDEA_1, TotalPointsAllocated: 0, EffectiveQuadraticVotes: 0 },
    { ID: IDEA_2, TotalPointsAllocated: 0, EffectiveQuadraticVotes: 0 },
    { ID: IDEA_3, TotalPointsAllocated: 0, EffectiveQuadraticVotes: 0 },
    { ID: IDEA_OTHER_SPACE, TotalPointsAllocated: 0, EffectiveQuadraticVotes: 0 },
  ],
  allocations: [],
  artifacts: [{ ID: DOC_1 }, { ID: DOC_OTHER_SPACE }],
  forms: [{ ID: FORM_1 }],
  interactivePosts: [{ ID: INTERACTIVE_1, ExperienceKind: 'Trivia' }],
  questions: [
    { ID: Q_1, AcceptedAnswerPostID: ANS_1, AICanonAnswerPostID: ANS_1 },
    { ID: Q_2, AcceptedAnswerPostID: null, AICanonAnswerPostID: null },
    { ID: Q_OTHER_SPACE, AcceptedAnswerPostID: ANS_OTHER_SPACE, AICanonAnswerPostID: ANS_OTHER_SPACE },
  ],
};

const OTHER_SPACE_POST_ID_SET = new Set(
  [POST_FEED_OTHER_SPACE, Q_OTHER_SPACE, ANS_OTHER_SPACE, IDEA_OTHER_SPACE, DOC_OTHER_SPACE].map((id) => id.toLowerCase()),
);

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

function queryRowsForView(params) {
  const entityName = params?.EntityName ?? '';
  const extraFilter = params?.ExtraFilter ?? '';

  switch (entityName) {
    case 'MJ_BizApps_Community: Forums': {
      const spaceMatch = typeof extraFilter === 'string' ? extraFilter.match(/SpaceID\s*=\s*'([^']+)'/i) : null;
      if (spaceMatch) {
        return state.forums.filter((f) => f.SpaceID.toLowerCase() === spaceMatch[1].toLowerCase());
      }
      return state.forums.filter((f) => f.SpaceID === SPACE_1);
    }
    case 'MJ_BizApps_Collaboration: Spaces': {
      const idMatch = typeof extraFilter === 'string' ? extraFilter.match(/(?:^|[^A-Za-z_])ID\s*=\s*'([^']+)'/i) : null;
      if (idMatch) {
        return state.spaces.filter((s) => s.ID.toLowerCase() === idMatch[1].toLowerCase());
      }
      return [state.spaces[0]];
    }
    case COMMUNITY_ENTITY_NAMES.PostTypes:
      return state.postTypes;
    case COMMUNITY_ENTITY_NAMES.ForumAnswerPosts: {
      const ids = parseInIds(extraFilter, 'ID');
      return ids
        ? state.answers.filter((a) => ids.has(a.ID.toLowerCase()))
        : state.answers.filter((a) => !OTHER_SPACE_POST_ID_SET.has(a.ID.toLowerCase()));
    }
    case COMMUNITY_ENTITY_NAMES.ForumIdeaCampaigns: {
      const campaignIds = parseInIds(extraFilter, 'ID');
      return campaignIds
        ? state.campaigns.filter((c) => campaignIds.has(c.ID.toLowerCase()))
        : state.campaigns.filter((c) => c.ID !== FORUM_OTHER_SPACE);
    }
    case COMMUNITY_ENTITY_NAMES.ForumIdeaPosts: {
      const ids = parseInIds(extraFilter, 'ID');
      return ids
        ? state.ideas.filter((i) => ids.has(i.ID.toLowerCase()))
        : state.ideas.filter((i) => !OTHER_SPACE_POST_ID_SET.has(i.ID.toLowerCase()));
    }
    case COMMUNITY_ENTITY_NAMES.ForumArtifactPosts: {
      const ids = parseInIds(extraFilter, 'ID');
      return ids
        ? state.artifacts.filter((a) => ids.has(a.ID.toLowerCase()))
        : state.artifacts.filter((a) => !OTHER_SPACE_POST_ID_SET.has(a.ID.toLowerCase()));
    }
    case COMMUNITY_ENTITY_NAMES.ForumFormPosts: {
      const ids = parseInIds(extraFilter, 'ID');
      return ids
        ? state.forms.filter((f) => ids.has(f.ID.toLowerCase()))
        : state.forms.filter((f) => !OTHER_SPACE_POST_ID_SET.has(f.ID.toLowerCase()));
    }
    case COMMUNITY_ENTITY_NAMES.ForumInteractivePosts: {
      const ids = parseInIds(extraFilter, 'ID');
      return ids
        ? state.interactivePosts.filter((p) => ids.has(p.ID.toLowerCase()))
        : state.interactivePosts.filter((p) => !OTHER_SPACE_POST_ID_SET.has(p.ID.toLowerCase()));
    }
    case COMMUNITY_ENTITY_NAMES.ForumQuestionPosts: {
      const ids = parseInIds(extraFilter, 'ID');
      return ids
        ? state.questions.filter((q) => ids.has(q.ID.toLowerCase()))
        : state.questions.filter((q) => !OTHER_SPACE_POST_ID_SET.has(q.ID.toLowerCase()));
    }
    case COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations: {
      const ideaMatch = typeof extraFilter === 'string' ? extraFilter.match(/IdeaPostID\s*=\s*'([^']+)'/i) : null;
      if (ideaMatch) {
        return state.allocations.filter((a) => a.IdeaPostID.toLowerCase() === ideaMatch[1].toLowerCase());
      }
      return state.allocations;
    }
    case COMMUNITY_ENTITY_NAMES.ForumPosts: {
      let rows = state.posts;
      const forumIds = parseInIds(extraFilter, 'ForumID');
      const ids = parseInIds(extraFilter, 'ID');
      if (forumIds) {
        rows = rows.filter((p) => forumIds.has(String(p.ForumID).toLowerCase()));
      } else if (!ids) {
        rows = rows.filter((p) => !OTHER_SPACE_POST_ID_SET.has(p.ID.toLowerCase()));
      }
      if (ids) {
        return rows.filter((p) => ids.has(p.ID.toLowerCase()));
      }
      if (extraFilter.includes('RootPostID IS NULL')) {
        return rows.filter((p) => p.ID === POST_FEED_1 || p.ID === POST_FEED_2 || p.ID === POST_FEED_OTHER_SPACE);
      }
      return rows;
    }
    default:
      return [];
  }
}

function createEntityWrapper(entityName, existingRow) {
  const record = existingRow ? { ...existingRow } : { ID: crypto.randomUUID() };
  let activeTxGroup = null;
  let pendingDelete = false;

  const commitWrite = () => {
    if (pendingDelete) {
      if (entityName === COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations) {
        state.allocations = state.allocations.filter((a) => a.ID !== record.ID);
      }
      return true;
    }
    if (entityName === COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations) {
      if (record.PointsAllocated <= 0) {
        throw new Error('DB CHECK violation: PointsAllocated must be > 0');
      }
      const idx = state.allocations.findIndex((a) => a.ID === record.ID || (a.IdeaPostID === record.IdeaPostID && a.UserID === record.UserID));
      if (idx >= 0) state.allocations[idx] = { ...record };
      else state.allocations.push({ ...record });
    } else if (entityName === COMMUNITY_ENTITY_NAMES.ForumIdeaPosts) {
      const idx = state.ideas.findIndex((i) => i.ID === record.ID);
      if (idx >= 0) state.ideas[idx] = { ...record };
      else state.ideas.push({ ...record });
    } else if (entityName === COMMUNITY_ENTITY_NAMES.ForumPosts) {
      const idx = state.posts.findIndex((p) => p.ID === record.ID);
      if (idx >= 0) state.posts[idx] = { ...record };
      else state.posts.push({ ...record });
    } else if (entityName === COMMUNITY_ENTITY_NAMES.ForumAnswerPosts) {
      const idx = state.answers.findIndex((a) => a.ID === record.ID);
      if (idx >= 0) state.answers[idx] = { ...record };
      else state.answers.push({ ...record });
    } else if (entityName === COMMUNITY_ENTITY_NAMES.ForumQuestionPosts) {
      const idx = state.questions.findIndex((q) => q.ID === record.ID);
      if (idx >= 0) state.questions[idx] = { ...record };
      else state.questions.push({ ...record });
    }
    return true;
  };

  const entityObj = {
    NewRecord() {
      record.ID = crypto.randomUUID();
    },
    get TransactionGroup() {
      return activeTxGroup;
    },
    set TransactionGroup(tg) {
      activeTxGroup = tg;
    },
    async Save() {
      pendingDelete = false;
      if (activeTxGroup) {
        activeTxGroup.AddTransaction(commitWrite);
        return true;
      }
      return commitWrite();
    },
    async Delete() {
      pendingDelete = true;
      if (activeTxGroup) {
        activeTxGroup.AddTransaction(commitWrite);
        return true;
      }
      return commitWrite();
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

const mockProvider = {
  CurrentUser: HARNESS_USER,
  async RunView(params) {
    const results = queryRowsForView(params);
    return { Success: true, Results: results, TotalRowCount: results.length };
  },
  async RunViews(paramsArray) {
    return Promise.all(paramsArray.map((p) => this.RunView(p)));
  },
  async GetEntityObject(entityName, compositeKeyOrUser) {
    let existing = null;
    const keyId = compositeKeyOrUser?.KeyValuePairs?.[0]?.Value ?? compositeKeyOrUser?.ID;
    if (keyId) {
      const all = queryRowsForView({ EntityName: entityName });
      existing = all.find((r) => String(r.ID).toLowerCase() === String(keyId).toLowerCase()) ?? null;
      if (!existing) return null;
    }
    return createEntityWrapper(entityName, existing);
  },
  async CreateTransactionGroup() {
    const ops = [];
    return {
      AddTransaction(fn) {
        ops.push(fn);
      },
      async Submit() {
        for (const op of ops) {
          op();
        }
        return true;
      },
    };
  },
};

Metadata.Provider = mockProvider;
RunView.Provider = mockProvider;

function buildSamplePdfBase64(spaceName) {
  const safeName = String(spaceName || 'Community').replace(/[()\\]/g, '');
  const stream = `BT /F1 12 Tf 50 720 Td (${safeName} Weekly Community Digest) Tj ET`;
  const pdf = [
    '%PDF-1.4',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj',
    `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
    'trailer << /Root 1 0 R >>',
    '%%EOF',
  ].join('\n');
  return btoa(pdf);
}

GraphQLActionClient.prototype.RunAction = async function (actionName, params) {
  window.__executedActions = window.__executedActions || [];
  window.__executedActions.push({ actionName, params });

  const getParam = (name) => params?.find((p) => p.Name === name)?.Value ?? '';

  if (actionName === COMMUNITY_ACTION_IDS.AskFirstDeflection) {
    const query = getParam('QueryText');
    return {
      Success: true,
      ResultCode: 'DEFLECTED',
      Message: `Deflected "${query}" with verified Canon answer: "How do I rotate my API key without downtime?" (94% confidence).`,
      Params: [],
    };
  }
  if (actionName === COMMUNITY_ACTION_IDS.ExportDigestPDF) {
    const spaceName = getParam('SpaceName');
    return {
      Success: true,
      ResultCode: 'SUCCESS',
      Message: 'Digest PDF generated.',
      Params: [{ Name: 'PDFBase64', Value: buildSamplePdfBase64(spaceName), Type: 'Output' }],
    };
  }
  if (actionName === COMMUNITY_ACTION_IDS.LivingThreadSynthesis) {
    return {
      Success: true,
      ResultCode: 'SUCCESS',
      Message: 'Synthesized 3 key engineering takeaways and 2 follow-up action items.',
      Params: [],
    };
  }
  if (actionName === COMMUNITY_ACTION_IDS.EpistemicAnswerGrading) {
    return {
      Success: true,
      ResultCode: 'SUCCESS',
      Message: 'Epistemic grading complete: Canon Verified (0.95 confidence).',
      Params: [
        { Name: 'EpistemicStatus', Value: 'Canon Verified', Type: 'Output' },
        { Name: 'ConfidenceScore', Value: 0.95, Type: 'Output' },
        { Name: 'VerificationStatus', Value: 'AI_Verified', Type: 'Output' },
      ],
    };
  }
  return { Success: true, ResultCode: 'SUCCESS', Message: `Action ${actionName} executed.`, Params: [] };
};

const harnessMode = new URLSearchParams(window.location.search).get('mode');

if (harnessMode === 'collaboration') {
  const ctx = {
    space: null,
    type: null,
    spaceTypeCode: 'community',
    viewer: HARNESS_USER,
    rules: {
      Extensions: {
        community: {
          AskFirstEnabled: true,
          DefaultDigestCadence: 'Daily Digest',
        },
      },
    },
  };
  const builtinDefaults = [
    { key: 'Overview', label: 'Overview', icon: 'fa-solid fa-gauge-high', sortKey: 10 },
    { key: 'Library', label: 'Documents', icon: 'fa-solid fa-folder-open', sortKey: 20 },
    { key: 'Chat', label: 'Chat', icon: 'fa-solid fa-comments', sortKey: 40 },
  ];
  const resolvedTabs = spaceDriverInstance.GetTabs(
    ctx,
    assembleSpaceContributions(BaseSpaceTab, 'community', builtinDefaults, (reg, meta) => ({
      key: meta.contributionKey,
      label: meta.label ?? meta.contributionKey,
      icon: meta.icon,
      sortKey: meta.sortKey,
      component: reg.SubClass,
    })),
  );
  const resolvedCards = spaceDriverInstance.GetOverviewCards(
    ctx,
    assembleSpaceContributions(BaseSpaceOverviewCard, 'community', [], (reg, meta) => ({
      key: meta.contributionKey,
      title: meta.title ?? meta.contributionKey,
      sortKey: meta.sortKey,
      side: meta.side,
      component: reg.SubClass,
    })),
  );
  const resolvedChips = spaceDriverInstance.GetHeaderChips(ctx, []);

  @Component({
    standalone: true,
    selector: 'mjc-collab-embedded-harness',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
      <main class="mjc-collab-host" style="padding:16px;background:var(--mj-bg-page);min-height:100vh;">
        <header style="background:var(--mj-bg-surface);border:1px solid var(--mj-border-default);border-radius:8px;padding:12px 16px;margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
            <div>
              <h1 style="margin:0;font-size:1.15rem;color:var(--mj-text-primary);">Collaboration Space · Customer Success Community</h1>
              <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">
                @for (chip of chips; track chip.key) {
                  <span class="mjc-collab-chip" style="padding:2px 8px;border-radius:999px;background:var(--mj-status-info-bg);color:var(--mj-status-info-text);font-size:0.75rem;font-weight:600;">
                    <i [class]="chip.icon" aria-hidden="true"></i> {{ chip.label }}
                  </span>
                }
              </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <button
                type="button"
                id="mjc-collab-switch-space1-btn"
                (click)="activeSpaceId = space1Id"
                style="padding:6px 10px;border-radius:6px;border:1px solid var(--mj-border-default);background:var(--mj-bg-surface);color:var(--mj-text-primary);cursor:pointer;font-size:0.8rem;font-weight:600;"
              >
                Space 1
              </button>
              <button
                type="button"
                id="mjc-collab-switch-space2-btn"
                (click)="activeSpaceId = space2Id"
                style="padding:6px 10px;border-radius:6px;border:1px solid var(--mj-border-default);background:var(--mj-bg-surface);color:var(--mj-text-primary);cursor:pointer;font-size:0.8rem;font-weight:600;"
              >
                Space 2
              </button>
            </div>
          </div>
          <nav role="tablist" aria-label="Collaboration Space Tabs" style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
            @for (tab of tabs; track tab.key) {
              <button
                type="button"
                role="tab"
                [id]="'mjc-collab-tab-' + tab.key"
                [attr.aria-selected]="activeTabKey === tab.key"
                (click)="activeTabKey = tab.key"
                style="padding:6px 12px;border-radius:6px;border:1px solid var(--mj-border-default);cursor:pointer;"
                [style.background]="activeTabKey === tab.key ? 'var(--mj-brand-primary)' : 'var(--mj-bg-surface)'"
                [style.color]="activeTabKey === tab.key ? 'var(--mj-brand-on-primary)' : 'var(--mj-text-primary)'"
              >
                <i [class]="tab.icon" aria-hidden="true"></i>
                {{ tab.label }}
              </button>
            }
          </nav>
        </header>

        <section id="mjc-collab-overview-cards" style="margin-bottom:12px;">
          @for (card of cards; track card.key) {
            @if (card.component) {
              <ng-container *ngComponentOutlet="card.component; inputs: { SpaceId: activeSpaceId, Sequence: card.sortKey ?? 0 }" />
            }
          }
        </section>

        <section id="mjc-collab-tab-body" role="tabpanel">
          @if (activeTabComponent; as tabCmp) {
            <ng-container *ngComponentOutlet="tabCmp; inputs: { SpaceId: activeSpaceId, SpaceTypeCode: 'community' }" />
          }
        </section>
      </main>
    `,
  })
  class CollaborationEmbeddedHarnessComponent {
    space1Id = SPACE_1;
    space2Id = SPACE_2;
    activeSpaceId = SPACE_1;
    tabs = resolvedTabs.filter((t) => Boolean(t.component));
    cards = resolvedCards;
    chips = resolvedChips;
    activeTabKey = 'forums';

    get activeTabComponent() {
      return this.tabs.find((t) => t.key === this.activeTabKey)?.component ?? null;
    }
  }

  const existingHost = document.querySelector('mjc-community-hub-resource');
  if (existingHost) {
    const embeddedHost = document.createElement('mjc-collab-embedded-harness');
    existingHost.replaceWith(embeddedHost);
  }

  await bootstrapApplication(CollaborationEmbeddedHarnessComponent, {
    providers: [provideZonelessChangeDetection()],
  });
} else {
  await bootstrapApplication(CommunityHubResource, {
    providers: [provideZonelessChangeDetection()],
  });
}

await new Promise((resolve) => setTimeout(resolve, 60));
window.__harnessReady = true;
