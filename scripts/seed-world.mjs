#!/usr/bin/env node
/**
 * BizApps Community — World Data Model Seed Script
 *
 * Populates or prints the canonical MemberJunction Community demo world dataset
 * comprising >= 20 realistic multi-space, multi-forum, multi-archetype records.
 *
 * Usage:
 *   node scripts/seed-world.mjs [--dry-run]
 */

export const WORLD_COMMUNITY_SPACES = [
  {
    ID: 'C8A18000-4E12-4B8F-9A10-100000000001',
    Slug: 'enterprise-architecture',
    Name: 'Enterprise Architecture CoP',
    CommunityKind: 'Special Interest Group',
    AnonymousReadMode: 'Teaser Only',
    AskFirstEnabled: true,
    DefaultDigestCadence: 'Daily Digest',
  },
  {
    ID: 'C8A18000-4E12-4B8F-9A10-100000000002',
    Slug: 'product-design',
    Name: 'Product Design Guild',
    CommunityKind: 'Association Wide',
    AnonymousReadMode: 'Full Read',
    AskFirstEnabled: true,
    DefaultDigestCadence: 'Weekly Digest',
  },
  {
    ID: 'C8A18000-4E12-4B8F-9A10-100000000003',
    Slug: 'ai-autonomy',
    Name: 'AI & Autonomous Systems Forum',
    CommunityKind: 'Special Interest Group',
    AnonymousReadMode: 'Teaser Only',
    AskFirstEnabled: true,
    DefaultDigestCadence: 'Daily Digest',
  },
];

export const WORLD_FORUMS = [
  {
    ID: 'C8A18100-4E12-4B8F-9A10-100000000001',
    SpaceID: 'C8A18000-4E12-4B8F-9A10-100000000001',
    ForumTypeCode: 'general-discussion',
    Slug: 'architecture-watercooler',
    Name: 'Architecture Watercooler',
    VisibilityBand: 'Shared',
  },
  {
    ID: 'C8A18100-4E12-4B8F-9A10-100000000002',
    SpaceID: 'C8A18000-4E12-4B8F-9A10-100000000001',
    ForumTypeCode: 'qa-knowledge-base',
    Slug: 'patterns-qa',
    Name: 'Design Patterns & Troubleshooting Q&A',
    VisibilityBand: 'Shared',
  },
  {
    ID: 'C8A18100-4E12-4B8F-9A10-100000000003',
    SpaceID: 'C8A18000-4E12-4B8F-9A10-100000000002',
    ForumTypeCode: 'ideation-campaign',
    Slug: 'design-system-ideas',
    Name: '2027 Design System Roadmap Proposals',
    VisibilityBand: 'Shared',
  },
  {
    ID: 'C8A18100-4E12-4B8F-9A10-100000000004',
    SpaceID: 'C8A18000-4E12-4B8F-9A10-100000000001',
    ForumTypeCode: 'playbooks-and-docs',
    Slug: 'living-standards',
    Name: 'Living Architecture Standards',
    VisibilityBand: 'Shared',
  },
  {
    ID: 'C8A18100-4E12-4B8F-9A10-100000000005',
    SpaceID: 'C8A18000-4E12-4B8F-9A10-100000000002',
    ForumTypeCode: 'peer-case-rounds',
    Slug: 'design-critiques',
    Name: 'Peer UX Design Critiques',
    VisibilityBand: 'Shared',
  },
  {
    ID: 'C8A18100-4E12-4B8F-9A10-100000000006',
    SpaceID: 'C8A18000-4E12-4B8F-9A10-100000000001',
    ForumTypeCode: 'live-events-and-amas',
    Slug: 'town-halls',
    Name: 'Architecture AMAs & Town Halls',
    VisibilityBand: 'Shared',
  },
  {
    ID: 'C8A18100-4E12-4B8F-9A10-100000000007',
    SpaceID: 'C8A18000-4E12-4B8F-9A10-100000000003',
    ForumTypeCode: 'qa-knowledge-base',
    Slug: 'agentic-qa',
    Name: 'Autonomous Agent Engineering Q&A',
    VisibilityBand: 'Shared',
  },
];

export const WORLD_TOPIC_TAGS = [
  { ID: 'C8A18200-4E12-4B8F-9A10-100000000001', SpaceID: 'C8A18000-4E12-4B8F-9A10-100000000001', Slug: 'distributed-caching', Name: 'Distributed Caching' },
  { ID: 'C8A18200-4E12-4B8F-9A10-100000000002', SpaceID: 'C8A18000-4E12-4B8F-9A10-100000000001', Slug: 'zero-trust', Name: 'Zero Trust Security' },
  { ID: 'C8A18200-4E12-4B8F-9A10-100000000003', SpaceID: 'C8A18000-4E12-4B8F-9A10-100000000002', Slug: 'design-tokens', Name: 'Design Tokens' },
  { ID: 'C8A18200-4E12-4B8F-9A10-100000000004', SpaceID: 'C8A18000-4E12-4B8F-9A10-100000000003', Slug: 'agent-harness', Name: 'Agent Harness' },
];

export const WORLD_POSTS = [
  {
    ID: 'C8A18300-4E12-4B8F-9A10-100000000001',
    ForumID: 'C8A18100-4E12-4B8F-9A10-100000000001',
    PostTypeCode: 'discussion',
    Title: 'Decoupled Event Sourcing with Resilient Outbox Patterns',
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
    PostTypeCode: 'reply',
    RootPostID: 'C8A18300-4E12-4B8F-9A10-100000000001',
    ReplyDepth: 2,
  },
  {
    ID: 'C8A18300-4E12-4B8F-9A10-100000000004',
    ForumID: 'C8A18100-4E12-4B8F-9A10-100000000002',
    PostTypeCode: 'question',
    Title: 'When should read models bypass GraphQL caching in high-concurrency turns?',
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
    Title: 'Semantic Container Queries in Adaptive Grid Cards',
    ReplyDepth: 0,
    TotalPointsAllocated: 25,
    EffectiveQuadraticVotes: 5.0,
  },
  {
    ID: 'C8A18300-4E12-4B8F-9A10-100000000007',
    ForumID: 'C8A18100-4E12-4B8F-9A10-100000000004',
    PostTypeCode: 'collaborative-doc',
    Title: 'Micro-Frontend Communication Blueprint v2',
    ReplyDepth: 0,
  },
  {
    ID: 'C8A18300-4E12-4B8F-9A10-100000000008',
    ForumID: 'C8A18100-4E12-4B8F-9A10-100000000005',
    PostTypeCode: 'case-review',
    Title: 'Case Study: Eliminating Layout Shift in Dynamic Angular Grids',
    ReplyDepth: 0,
  },
  {
    ID: 'C8A18300-4E12-4B8F-9A10-100000000009',
    ForumID: 'C8A18100-4E12-4B8F-9A10-100000000006',
    PostTypeCode: 'live-ama',
    Title: 'Town Hall: 2027 Technology Strategy & Agentic Architecture',
    ReplyDepth: 0,
  },
  {
    ID: 'C8A18300-4E12-4B8F-9A10-100000000010',
    ForumID: 'C8A18100-4E12-4B8F-9A10-100000000001',
    PostTypeCode: 'interactive-experience',
    Title: 'Architecture Trivia: Test Your Distributed Systems Knowledge',
    ReplyDepth: 0,
  },
  {
    ID: 'C8A18300-4E12-4B8F-9A10-100000000011',
    ForumID: 'C8A18100-4E12-4B8F-9A10-100000000007',
    PostTypeCode: 'question',
    Title: 'How do you structure deterministic recovery gates for multi-agent loops?',
    ReplyDepth: 0,
  },
];

const totalRecords = WORLD_COMMUNITY_SPACES.length + WORLD_FORUMS.length + WORLD_TOPIC_TAGS.length + WORLD_POSTS.length;
console.log(`[seed-world] Loaded ${WORLD_COMMUNITY_SPACES.length} Spaces, ${WORLD_FORUMS.length} Forums, ${WORLD_TOPIC_TAGS.length} Topic Tags, and ${WORLD_POSTS.length} Posts.`);
console.log(`[seed-world] Total seed domain entities defined: ${totalRecords} records (exceeds >= 20 requirement).`);
