#!/usr/bin/env node
/**
 * BizApps Community — World Data Model Seed Script
 *
 * Canonical in-memory definition of the BizApps Community demo world dataset: >= 25 realistic
 * records across 3 distinct Collaboration Spaces (Customer Community Portal, Partner & ISV
 * Enablement Network, Internal Engineering Guild), covering every ForumType, every PostType
 * subtype, a verified Q&A canon answer, a Quadratic Ideation Campaign with member allocations,
 * a living (collaborative) document, an Interactive Mini-App session, reactions, member
 * reputation profiles, and a moderation report.
 *
 * scripts/seed-world.sql and scripts/seed-world.pg.sql apply the FK-safe subset of this same
 * dataset directly to a database (SQL Server / PostgreSQL); records whose subtype requires a
 * cross-app row this scratch environment doesn't seed (an MJ Artifact, a BizApps Forms Form) are
 * guarded there and skipped gracefully rather than failing the whole script.
 *
 * Usage:
 *   node scripts/seed-world.mjs [--dry-run]
 */

export const WORLD_COMMUNITY_SPACES = [
  {
    ID: 'C8A18000-4E12-4B8F-9A10-100000000001',
    Slug: 'customer-community-portal',
    Name: 'Customer Community Portal',
    CommunityKind: 'Association Wide',
    AnonymousReadMode: 'Full Read',
    AskFirstEnabled: true,
    DefaultDigestCadence: 'Daily Digest',
  },
  {
    ID: 'C8A18000-4E12-4B8F-9A10-100000000002',
    Slug: 'partner-isv-enablement-network',
    Name: 'Partner & ISV Enablement Network',
    CommunityKind: 'Special Interest Group',
    AnonymousReadMode: 'Teaser Only',
    AskFirstEnabled: true,
    DefaultDigestCadence: 'Weekly Digest',
  },
  {
    ID: 'C8A18000-4E12-4B8F-9A10-100000000003',
    Slug: 'internal-engineering-guild',
    Name: 'Internal Engineering Guild',
    CommunityKind: 'Working Group',
    AnonymousReadMode: 'None',
    AskFirstEnabled: true,
    DefaultDigestCadence: 'Highlights Only',
  },
];

export const WORLD_FORUMS = [
  {
    ID: 'C8A18100-4E12-4B8F-9A10-100000000001',
    SpaceID: 'C8A18000-4E12-4B8F-9A10-100000000001',
    ForumTypeCode: 'general-discussion',
    Slug: 'welcome-and-general-discussion',
    Name: 'Welcome & General Discussion',
    VisibilityBand: 'Shared',
  },
  {
    ID: 'C8A18100-4E12-4B8F-9A10-100000000002',
    SpaceID: 'C8A18000-4E12-4B8F-9A10-100000000001',
    ForumTypeCode: 'qa-knowledge-base',
    Slug: 'product-qa',
    Name: 'Product Q&A',
    VisibilityBand: 'Shared',
  },
  {
    ID: 'C8A18100-4E12-4B8F-9A10-100000000003',
    SpaceID: 'C8A18000-4E12-4B8F-9A10-100000000002',
    ForumTypeCode: 'ideation-campaign',
    Slug: 'partner-feature-requests',
    Name: 'Partner Feature Requests',
    VisibilityBand: 'Shared',
  },
  {
    ID: 'C8A18100-4E12-4B8F-9A10-100000000004',
    SpaceID: 'C8A18000-4E12-4B8F-9A10-100000000002',
    ForumTypeCode: 'playbooks-and-docs',
    Slug: 'partner-integration-playbooks',
    Name: 'Partner Integration Playbooks',
    VisibilityBand: 'Shared',
  },
  {
    ID: 'C8A18100-4E12-4B8F-9A10-100000000005',
    SpaceID: 'C8A18000-4E12-4B8F-9A10-100000000003',
    ForumTypeCode: 'peer-case-rounds',
    Slug: 'incident-case-rounds',
    Name: 'Incident Case Rounds',
    VisibilityBand: 'Team',
  },
  {
    ID: 'C8A18100-4E12-4B8F-9A10-100000000006',
    SpaceID: 'C8A18000-4E12-4B8F-9A10-100000000003',
    ForumTypeCode: 'live-events-and-amas',
    Slug: 'engineering-amas',
    Name: 'Engineering AMAs & Town Halls',
    VisibilityBand: 'Shared',
  },
  {
    ID: 'C8A18100-4E12-4B8F-9A10-100000000007',
    SpaceID: 'C8A18000-4E12-4B8F-9A10-100000000003',
    ForumTypeCode: 'qa-knowledge-base',
    Slug: 'internal-engineering-qa',
    Name: 'Internal Engineering Q&A',
    VisibilityBand: 'Team',
  },
];

export const WORLD_TOPIC_TAGS = [
  { ID: 'C8A18200-4E12-4B8F-9A10-100000000001', SpaceID: 'C8A18000-4E12-4B8F-9A10-100000000001', Slug: 'getting-started', Name: 'Getting Started' },
  { ID: 'C8A18200-4E12-4B8F-9A10-100000000002', SpaceID: 'C8A18000-4E12-4B8F-9A10-100000000002', Slug: 'integration-api', Name: 'Integration API' },
  { ID: 'C8A18200-4E12-4B8F-9A10-100000000003', SpaceID: 'C8A18000-4E12-4B8F-9A10-100000000003', Slug: 'incident-response', Name: 'Incident Response' },
];

/** All 13 PostType codes, in the order the physical schema's PostType seed uses. */
export const ALL_POST_TYPE_CODES = [
  'discussion', 'reply', 'comment', 'question', 'answer', 'idea-proposal', 'poll-or-form',
  'collaborative-doc', 'collaborative-sheet', 'collaborative-deck', 'case-review', 'live-ama',
  'interactive-experience',
];

export const WORLD_POSTS = [
  {
    ID: 'C8A18300-4E12-4B8F-9A10-100000000001',
    ForumID: 'C8A18100-4E12-4B8F-9A10-100000000001',
    PostTypeCode: 'discussion',
    Title: 'Welcome to the Customer Community Portal!',
    ReplyDepth: 0,
  },
  {
    ID: 'C8A18300-4E12-4B8F-9A10-100000000002',
    ForumID: 'C8A18100-4E12-4B8F-9A10-100000000001',
    PostTypeCode: 'reply',
    RootPostID: 'C8A18300-4E12-4B8F-9A10-100000000001',
    ReplyDepth: 1,
  },
  {
    ID: 'C8A18300-4E12-4B8F-9A10-100000000003',
    ForumID: 'C8A18100-4E12-4B8F-9A10-100000000001',
    PostTypeCode: 'comment',
    RootPostID: 'C8A18300-4E12-4B8F-9A10-100000000001',
    ReplyDepth: 1,
  },
  {
    ID: 'C8A18300-4E12-4B8F-9A10-100000000004',
    ForumID: 'C8A18100-4E12-4B8F-9A10-100000000002',
    PostTypeCode: 'question',
    Title: 'How do I rotate my API key without downtime?',
    ReplyDepth: 0,
  },
  {
    ID: 'C8A18300-4E12-4B8F-9A10-100000000005',
    ForumID: 'C8A18100-4E12-4B8F-9A10-100000000002',
    PostTypeCode: 'answer',
    RootPostID: 'C8A18300-4E12-4B8F-9A10-100000000004',
    ReplyDepth: 1,
    IsAccepted: true,
    AIEpistemicStatus: 'Canon Verified',
  },
  {
    ID: 'C8A18300-4E12-4B8F-9A10-100000000006',
    ForumID: 'C8A18100-4E12-4B8F-9A10-100000000003',
    PostTypeCode: 'idea-proposal',
    Title: 'Add webhook signing secrets rotation API',
    ReplyDepth: 0,
    TotalPointsAllocated: 61,
    EffectiveQuadraticVotes: 11.0,
    UniqueBackerCount: 2,
  },
  {
    ID: 'C8A18300-4E12-4B8F-9A10-100000000007',
    ForumID: 'C8A18100-4E12-4B8F-9A10-100000000003',
    PostTypeCode: 'poll-or-form',
    Title: 'Which SDK should we prioritize next?',
    ReplyDepth: 0,
  },
  {
    ID: 'C8A18300-4E12-4B8F-9A10-100000000008',
    ForumID: 'C8A18100-4E12-4B8F-9A10-100000000004',
    PostTypeCode: 'collaborative-doc',
    Title: 'OAuth2 Partner Onboarding Playbook',
    ReplyDepth: 0,
  },
  {
    ID: 'C8A18300-4E12-4B8F-9A10-100000000009',
    ForumID: 'C8A18100-4E12-4B8F-9A10-100000000004',
    PostTypeCode: 'collaborative-sheet',
    Title: 'Partner Tier Pricing Matrix',
    ReplyDepth: 0,
  },
  {
    ID: 'C8A18300-4E12-4B8F-9A10-100000000010',
    ForumID: 'C8A18100-4E12-4B8F-9A10-100000000004',
    PostTypeCode: 'collaborative-deck',
    Title: 'ISV Co-Sell Enablement Deck',
    ReplyDepth: 0,
  },
  {
    ID: 'C8A18300-4E12-4B8F-9A10-100000000011',
    ForumID: 'C8A18100-4E12-4B8F-9A10-100000000005',
    PostTypeCode: 'case-review',
    Title: 'Case Review: Regional Failover Delay During Peak Load',
    ReplyDepth: 0,
  },
  {
    ID: 'C8A18300-4E12-4B8F-9A10-100000000012',
    ForumID: 'C8A18100-4E12-4B8F-9A10-100000000006',
    PostTypeCode: 'live-ama',
    Title: 'Town Hall: Q1 Platform Reliability Roadmap',
    ReplyDepth: 0,
  },
  {
    ID: 'C8A18300-4E12-4B8F-9A10-100000000013',
    ForumID: 'C8A18100-4E12-4B8F-9A10-100000000001',
    PostTypeCode: 'interactive-experience',
    Title: 'Platform Trivia: Test Your Onboarding Knowledge',
    ReplyDepth: 0,
  },
  {
    ID: 'C8A18300-4E12-4B8F-9A10-100000000014',
    ForumID: 'C8A18100-4E12-4B8F-9A10-100000000007',
    PostTypeCode: 'question',
    Title: 'What is our deterministic recovery pattern for multi-agent loops?',
    ReplyDepth: 0,
  },
];

/** Quadratic Ideation Campaign allocations: PointsAllocated, QuadraticVotes = sqrt(PointsAllocated). */
export const WORLD_IDEA_ALLOCATIONS = [
  { ID: 'C8A18400-4E12-4B8F-9A10-100000000001', IdeaPostID: 'C8A18300-4E12-4B8F-9A10-100000000006', PointsAllocated: 36, QuadraticVotes: 6.0 },
  { ID: 'C8A18400-4E12-4B8F-9A10-100000000002', IdeaPostID: 'C8A18300-4E12-4B8F-9A10-100000000006', PointsAllocated: 25, QuadraticVotes: 5.0 },
];

export const WORLD_INTERACTIVE_SESSIONS = [
  { ID: 'C8A18500-4E12-4B8F-9A10-100000000001', InteractivePostID: 'C8A18300-4E12-4B8F-9A10-100000000013', AttemptNumber: 1, Score: 70, DurationSeconds: 95, Completed: true },
  { ID: 'C8A18500-4E12-4B8F-9A10-100000000002', InteractivePostID: 'C8A18300-4E12-4B8F-9A10-100000000013', AttemptNumber: 2, Score: 92, DurationSeconds: 61, Completed: true },
];

export const WORLD_POST_REACTIONS = [
  { ID: 'C8A18600-4E12-4B8F-9A10-100000000001', PostID: 'C8A18300-4E12-4B8F-9A10-100000000001', ReactionKind: 'Upvote' },
  { ID: 'C8A18600-4E12-4B8F-9A10-100000000002', PostID: 'C8A18300-4E12-4B8F-9A10-100000000005', ReactionKind: 'Helpful' },
  { ID: 'C8A18600-4E12-4B8F-9A10-100000000003', PostID: 'C8A18300-4E12-4B8F-9A10-100000000006', ReactionKind: 'Insightful' },
];

/** Member reputation state per Space (the closest real schema concept to a "reputation ledger": CommunityMemberProfile). */
export const WORLD_MEMBER_PROFILES = [
  { ID: 'C8A18700-4E12-4B8F-9A10-100000000001', SpaceID: 'C8A18000-4E12-4B8F-9A10-100000000001', HelpfulAnswerCount: 4, AcceptedAnswerCount: 1, ReputationScore: 120 },
  { ID: 'C8A18700-4E12-4B8F-9A10-100000000002', SpaceID: 'C8A18000-4E12-4B8F-9A10-100000000002', HelpfulAnswerCount: 1, AcceptedAnswerCount: 0, ReputationScore: 30 },
  { ID: 'C8A18700-4E12-4B8F-9A10-100000000003', SpaceID: 'C8A18000-4E12-4B8F-9A10-100000000003', HelpfulAnswerCount: 7, AcceptedAnswerCount: 3, ReputationScore: 310 },
];

/** Moderation reports (ForumPostFlag). */
export const WORLD_POST_FLAGS = [
  {
    ID: 'C8A18800-4E12-4B8F-9A10-100000000001',
    PostID: 'C8A18300-4E12-4B8F-9A10-100000000003',
    ReasonCategory: 'Off Topic',
    Status: 'Open',
  },
];

const RECORD_GROUPS = {
  Spaces: WORLD_COMMUNITY_SPACES,
  Forums: WORLD_FORUMS,
  TopicTags: WORLD_TOPIC_TAGS,
  Posts: WORLD_POSTS,
  IdeaAllocations: WORLD_IDEA_ALLOCATIONS,
  InteractiveSessions: WORLD_INTERACTIVE_SESSIONS,
  PostReactions: WORLD_POST_REACTIONS,
  MemberProfiles: WORLD_MEMBER_PROFILES,
  PostFlags: WORLD_POST_FLAGS,
};

export function GetWorldSeedSummary() {
  const counts = Object.fromEntries(Object.entries(RECORD_GROUPS).map(([key, rows]) => [key, rows.length]));
  const totalRecords = Object.values(counts).reduce((sum, n) => sum + n, 0);
  return { counts, totalRecords };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { counts, totalRecords } = GetWorldSeedSummary();
  for (const [key, count] of Object.entries(counts)) {
    console.log(`[seed-world] ${key}: ${count}`);
  }
  console.log(`[seed-world] Total seed domain entities defined: ${totalRecords} records (requirement: >= 25).`);
  console.log(`[seed-world] Collaboration Spaces: ${WORLD_COMMUNITY_SPACES.map((s) => s.Name).join(', ')}`);
}
