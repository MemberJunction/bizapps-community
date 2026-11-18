import { randomUUID } from 'node:crypto';

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
};

const C = HARNESS_CONSTANTS;

const OTHER_SPACE_POST_ID_SET = new Set(
  [C.POST_FEED_OTHER_SPACE, C.Q_OTHER_SPACE, C.ANS_OTHER_SPACE, C.IDEA_OTHER_SPACE, C.DOC_OTHER_SPACE].map((id) =>
    id.toLowerCase(),
  ),
);

function buildInitialState() {
  return {
    spaces: [
      { ID: C.SPACE_1, Name: 'Customer Success Community' },
      { ID: C.SPACE_2, Name: 'Internal Security Guild' },
    ],
    communitySpaces: [
      { ID: C.SPACE_1, Slug: 'customer-success', CommunityKind: 'Product Community' },
      { ID: C.SPACE_2, Slug: 'internal-security-guild', CommunityKind: 'Working Group' },
    ],
    forums: [
      { ID: C.FORUM_1, SpaceID: C.SPACE_1, Name: 'Product Roadmap Q1', Description: 'Roadmap ideas and voting' },
      { ID: C.FORUM_2, SpaceID: C.SPACE_1, Name: 'Enterprise Scale Q2', Description: 'Scale architecture roadmap' },
      { ID: C.FORUM_GENERAL, SpaceID: C.SPACE_1, Name: 'Knowledge & Q&A', Description: 'Technical Q&A and runbooks' },
      { ID: C.FORUM_OTHER_SPACE, SpaceID: C.SPACE_2, Name: 'Isolated Security Forum', Description: 'Security guild' },
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
    gqlCalls: [],
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

  function recomputePostRollups(postId) {
    if (!postId) return;
    const key = String(postId).toLowerCase();
    const rootPost = state.posts.find((p) => p.ID.toLowerCase() === key);
    if (!rootPost) return;
    rootPost.ReplyCount = state.posts.filter(
      (p) => p.RootPostID && p.RootPostID.toLowerCase() === key && p.PostTypeID === C.PT_REPLY,
    ).length;
    rootPost.ReactionScore = state.reactions
      .filter((r) => r.PostID.toLowerCase() === key)
      .reduce((sum, r) => sum + (Number(r.Weight) || 1), 0);
  }

  function applyOp(entry) {
    const { op, entityName, record } = entry;
    const isDelete = op === 'delete';

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
    }
  }

  return {
    reset() {
      state = buildInitialState();
    },

    getDebugSnapshot() {
      return {
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
        gqlCalls: state.gqlCalls,
      };
    },

    runView(params) {
      const entityName = params?.EntityName ?? '';
      const extraFilter = params?.ExtraFilter ?? '';

      switch (entityName) {
        case 'MJ_BizApps_Community: Forums': {
          const spaceId = parseEqFilter(extraFilter, 'SpaceID');
          if (spaceId) {
            return state.forums.filter((f) => f.SpaceID.toLowerCase() === spaceId.toLowerCase());
          }
          return state.forums.filter((f) => f.SpaceID.toLowerCase() !== C.SPACE_2.toLowerCase());
        }
        case 'MJ_BizApps_Collaboration: Spaces': {
          const id = parseEqFilter(extraFilter, 'ID');
          if (id) {
            return state.spaces.filter((s) => s.ID.toLowerCase() === id.toLowerCase());
          }
          return state.spaces.filter((s) => s.ID.toLowerCase() !== C.SPACE_2.toLowerCase());
        }
        case 'MJ_BizApps_Community: Community Spaces': {
          const id = parseEqFilter(extraFilter, 'ID');
          if (id) {
            return state.communitySpaces.filter((s) => s.ID.toLowerCase() === id.toLowerCase());
          }
          return state.communitySpaces.filter((s) => s.ID.toLowerCase() !== C.SPACE_2.toLowerCase());
        }
        case 'MJ_BizApps_Community: Post Types':
          return state.postTypes;
        case 'MJ_BizApps_Community: Forum Topic Tags': {
          const spaceId = parseEqFilter(extraFilter, 'SpaceID');
          if (spaceId) {
            return state.topicTags.filter((t) => t.SpaceID.toLowerCase() === spaceId.toLowerCase());
          }
          return state.topicTags.filter((t) => t.SpaceID.toLowerCase() !== C.SPACE_2.toLowerCase());
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
          const ids = parseInIds(extraFilter, 'ID');
          return ids
            ? state.answers.filter((a) => ids.has(a.ID.toLowerCase()))
            : state.answers.filter((a) => !OTHER_SPACE_POST_ID_SET.has(a.ID.toLowerCase()));
        }
        case 'MJ_BizApps_Community: Forum Idea Campaigns': {
          const campaignIds = parseInIds(extraFilter, 'ID');
          return campaignIds
            ? state.campaigns.filter((c) => campaignIds.has(c.ID.toLowerCase()))
            : state.campaigns.filter((c) => c.ID !== C.FORUM_OTHER_SPACE);
        }
        case 'MJ_BizApps_Community: Forum Idea Posts': {
          const ids = parseInIds(extraFilter, 'ID');
          return ids
            ? state.ideas.filter((i) => ids.has(i.ID.toLowerCase()))
            : state.ideas.filter((i) => !OTHER_SPACE_POST_ID_SET.has(i.ID.toLowerCase()));
        }
        case 'MJ_BizApps_Community: Forum Artifact Posts': {
          const ids = parseInIds(extraFilter, 'ID');
          return ids
            ? state.artifacts.filter((a) => ids.has(a.ID.toLowerCase()))
            : state.artifacts.filter((a) => !OTHER_SPACE_POST_ID_SET.has(a.ID.toLowerCase()));
        }
        case 'MJ_BizApps_Community: Forum Form Posts': {
          const ids = parseInIds(extraFilter, 'ID');
          return ids
            ? state.forms.filter((f) => ids.has(f.ID.toLowerCase()))
            : state.forms.filter((f) => !OTHER_SPACE_POST_ID_SET.has(f.ID.toLowerCase()));
        }
        case 'MJ_BizApps_Community: Forum Interactive Posts': {
          const ids = parseInIds(extraFilter, 'ID');
          return ids
            ? state.interactivePosts.filter((p) => ids.has(p.ID.toLowerCase()))
            : state.interactivePosts.filter((p) => !OTHER_SPACE_POST_ID_SET.has(p.ID.toLowerCase()));
        }
        case 'MJ_BizApps_Community: Forum Question Posts': {
          const ids = parseInIds(extraFilter, 'ID');
          return ids
            ? state.questions.filter((q) => ids.has(q.ID.toLowerCase()))
            : state.questions.filter((q) => !OTHER_SPACE_POST_ID_SET.has(q.ID.toLowerCase()));
        }
        case 'MJ_BizApps_Community: Forum Idea Allocations': {
          const ideaId = parseEqFilter(extraFilter, 'IdeaPostID');
          if (ideaId) {
            return state.allocations.filter((a) => a.IdeaPostID.toLowerCase() === ideaId.toLowerCase());
          }
          return state.allocations;
        }
        case 'MJ_BizApps_Community: Forum Posts': {
          let rows = state.posts;
          const forumIds = parseInIds(extraFilter, 'ForumID');
          const ids = parseInIds(extraFilter, 'ID');
          const idEq = parseEqFilter(extraFilter, 'ID');
          const rootIds = parseInIds(extraFilter, 'RootPostID');
          const rootEq = parseEqFilter(extraFilter, 'RootPostID');

          if (forumIds) {
            rows = rows.filter((p) => forumIds.has(String(p.ForumID).toLowerCase()));
          } else if (!ids && !idEq && !rootIds && !rootEq) {
            rows = rows.filter((p) => !OTHER_SPACE_POST_ID_SET.has(p.ID.toLowerCase()));
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
                p.PostTypeID === C.PT_REPLY &&
                ['Published', 'Answered', 'Resolved'].includes(p.Status),
            );
          }
          if (rootEq) {
            return rows.filter(
              (p) =>
                p.RootPostID &&
                p.RootPostID.toLowerCase() === rootEq.toLowerCase() &&
                p.PostTypeID === C.PT_REPLY &&
                ['Published', 'Answered', 'Resolved'].includes(p.Status),
            );
          }
          if (extraFilter.includes('RootPostID IS NULL')) {
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

      return {};
    },
  };
}
