#!/usr/bin/env node
/**
 * Architect Association World Model (`ARCH-WORLD`) — American Guild of Practicing Architects (AGPA)
 *
 * Rich, deterministic reference dataset for BizApps Community:
 *  - 26 distinct Architect Association members across 9 roles/personas
 *  - 4 distinct Community Spaces (Open/Full Read, Open/Teaser Only, Private/None)
 *  - 13 Forums spanning ALL 6 ForumType codes
 *  - 22 Topic Tags across building codes, mass timber, sustainability, BIM, contracts, and licensure
 *  - 68 Posts & multi-turn threaded conversations covering ALL 13 PostType codes
 *  - 25 Quadratic Ideation allocations across 21 distinct architect members (cost = votes^2)
 *  - Interactive sessions, reactions, member reputation profiles, subscriptions, and moderation flags
 *
 * Usage:
 *   node scripts/world/arch-world-data.mjs
 */

import { ALL_POST_TYPE_CODES } from '../seed-world.mjs';

export const ARCH_WORLD_META = {
  worldCode: 'ARCH-WORLD',
  organizationName: 'American Guild of Practicing Architects (AGPA)',
  domain: 'architecture-association',
  version: '1.0.0',
};

export const ARCH_ALL_FORUM_TYPE_CODES = [
  'general-discussion',
  'qa-knowledge-base',
  'ideation-campaign',
  'playbooks-and-docs',
  'peer-case-rounds',
  'live-events-and-amas',
];

export const ARCH_ALL_POST_TYPE_CODES = [...ALL_POST_TYPE_CODES];

/** Canonical ForumType catalog matching metadata/forum-types/.forum-types.json. */
export const ARCH_FORUM_TYPES = [
  { ID: 'C8A17100-4E12-4B8F-9A10-100000000001', Code: 'general-discussion', Name: 'General Discussion', ServerDriverClass: null },
  { ID: 'C8A17100-4E12-4B8F-9A10-100000000002', Code: 'qa-knowledge-base', Name: 'Q&A Knowledge Base', ServerDriverClass: 'QAForumServerDriver' },
  { ID: 'C8A17100-4E12-4B8F-9A10-100000000003', Code: 'ideation-campaign', Name: 'Ideation Campaign', ServerDriverClass: 'IdeaCampaignForumServerDriver' },
  { ID: 'C8A17100-4E12-4B8F-9A10-100000000004', Code: 'playbooks-and-docs', Name: 'Playbooks & Collaborative Docs', ServerDriverClass: 'PlaybooksForumServerDriver' },
  { ID: 'C8A17100-4E12-4B8F-9A10-100000000005', Code: 'peer-case-rounds', Name: 'Peer Case Rounds', ServerDriverClass: 'CaseRoundsForumServerDriver' },
  { ID: 'C8A17100-4E12-4B8F-9A10-100000000006', Code: 'live-events-and-amas', Name: 'Live Events & AMAs', ServerDriverClass: 'LiveEventsForumServerDriver' },
];

/** Canonical PostType catalog matching metadata/post-types/.post-types.json. */
export const ARCH_POST_TYPES = [
  { ID: 'C8A17200-4E12-4B8F-9A10-100000000001', Code: 'discussion', Name: 'Discussion', PlacementRule: 'Root Only', AllowsNestedReplies: true, ServerDriverClass: null, Sequence: 10 },
  { ID: 'C8A17200-4E12-4B8F-9A10-100000000002', Code: 'reply', Name: 'Reply', PlacementRule: 'Reply Only', AllowsNestedReplies: true, ServerDriverClass: null, Sequence: 20 },
  { ID: 'C8A17200-4E12-4B8F-9A10-100000000003', Code: 'comment', Name: 'Comment', PlacementRule: 'Reply Only', AllowsNestedReplies: false, ServerDriverClass: null, Sequence: 30 },
  { ID: 'C8A17200-4E12-4B8F-9A10-100000000004', Code: 'question', Name: 'Question', PlacementRule: 'Root Only', AllowsNestedReplies: true, ServerDriverClass: 'QuestionPostServerDriver', Sequence: 40 },
  { ID: 'C8A17200-4E12-4B8F-9A10-100000000005', Code: 'answer', Name: 'Answer', PlacementRule: 'Reply Only', AllowsNestedReplies: true, ServerDriverClass: 'AnswerPostServerDriver', Sequence: 50 },
  { ID: 'C8A17200-4E12-4B8F-9A10-100000000006', Code: 'idea-proposal', Name: 'Idea Proposal', PlacementRule: 'Root Only', AllowsNestedReplies: true, ServerDriverClass: 'IdeaPostServerDriver', Sequence: 60 },
  { ID: 'C8A17200-4E12-4B8F-9A10-100000000007', Code: 'poll-or-form', Name: 'Poll or Form', PlacementRule: 'Both', AllowsNestedReplies: true, ServerDriverClass: 'FormPostServerDriver', Sequence: 70 },
  { ID: 'C8A17200-4E12-4B8F-9A10-100000000008', Code: 'collaborative-doc', Name: 'Collaborative Document', PlacementRule: 'Both', AllowsNestedReplies: true, ServerDriverClass: 'ArtifactPostServerDriver', Sequence: 80 },
  { ID: 'C8A17200-4E12-4B8F-9A10-100000000009', Code: 'collaborative-sheet', Name: 'Collaborative Spreadsheet', PlacementRule: 'Both', AllowsNestedReplies: true, ServerDriverClass: 'ArtifactPostServerDriver', Sequence: 90 },
  { ID: 'C8A17200-4E12-4B8F-9A10-100000000010', Code: 'collaborative-deck', Name: 'Collaborative Presentation', PlacementRule: 'Both', AllowsNestedReplies: true, ServerDriverClass: 'ArtifactPostServerDriver', Sequence: 100 },
  { ID: 'C8A17200-4E12-4B8F-9A10-100000000011', Code: 'case-review', Name: 'Peer Case Review', PlacementRule: 'Root Only', AllowsNestedReplies: true, ServerDriverClass: 'CasePostServerDriver', Sequence: 110 },
  { ID: 'C8A17200-4E12-4B8F-9A10-100000000012', Code: 'live-ama', Name: 'Live AMA / Town Hall', PlacementRule: 'Root Only', AllowsNestedReplies: true, ServerDriverClass: 'AMAPostServerDriver', Sequence: 120 },
  { ID: 'C8A17200-4E12-4B8F-9A10-100000000013', Code: 'interactive-experience', Name: 'Interactive Experience / Mini-App', PlacementRule: 'Both', AllowsNestedReplies: true, ServerDriverClass: 'InteractivePostServerDriver', Sequence: 130 },
];

/** Canonical ForumRoleType catalog matching metadata/forum-role-types/.forum-role-types.json. */
export const ARCH_FORUM_ROLE_TYPES = [
  {
    ID: 'C8A17300-4E12-4B8F-9A10-100000000001',
    Code: 'forum-admin',
    Name: 'Forum Admin',
    Description: 'Full control over forum settings, moderation queue, canon verification, and thread-to-space promotion.',
    Level: 1000,
    CanConfigureForum: true,
    CanModerateQueue: true,
    CanPinOrLock: true,
    CanAcceptAnswers: true,
    CanVerifyCanon: true,
    CanPromoteToSpace: true,
    CanCreateRootPost: true,
    CanReply: true,
    CanCoEditDocs: true,
    VoteWeightMultiplier: 1,
    Sequence: 10,
    IsActive: true,
  },
  {
    ID: 'C8A17300-4E12-4B8F-9A10-100000000002',
    Code: 'moderator',
    Name: 'Moderator',
    Description: 'Reviews flagged posts, pins/locks threads, verifies canon answers, and graduates threads to child spaces.',
    Level: 800,
    CanConfigureForum: false,
    CanModerateQueue: true,
    CanPinOrLock: true,
    CanAcceptAnswers: true,
    CanVerifyCanon: true,
    CanPromoteToSpace: true,
    CanCreateRootPost: true,
    CanReply: true,
    CanCoEditDocs: true,
    VoteWeightMultiplier: 1,
    Sequence: 20,
    IsActive: true,
  },
  {
    ID: 'C8A17300-4E12-4B8F-9A10-100000000003',
    Code: 'topic-host',
    Name: 'Topic Host',
    Description: 'Subject-matter host who can pin threads, accept answers, and co-edit living documents.',
    Level: 600,
    CanConfigureForum: false,
    CanModerateQueue: false,
    CanPinOrLock: true,
    CanAcceptAnswers: true,
    CanVerifyCanon: false,
    CanPromoteToSpace: true,
    CanCreateRootPost: true,
    CanReply: true,
    CanCoEditDocs: true,
    VoteWeightMultiplier: 1,
    Sequence: 30,
    IsActive: true,
  },
  {
    ID: 'C8A17300-4E12-4B8F-9A10-100000000004',
    Code: 'expert-reviewer',
    Name: 'Expert Reviewer',
    Description: 'Subject-matter expert authorized to verify AI/Human canon answers and co-edit playbooks.',
    Level: 500,
    CanConfigureForum: false,
    CanModerateQueue: false,
    CanPinOrLock: false,
    CanAcceptAnswers: true,
    CanVerifyCanon: true,
    CanPromoteToSpace: false,
    CanCreateRootPost: true,
    CanReply: true,
    CanCoEditDocs: true,
    VoteWeightMultiplier: 1.25,
    Sequence: 40,
    IsActive: true,
  },
  {
    ID: 'C8A17300-4E12-4B8F-9A10-100000000005',
    Code: 'contributor',
    Name: 'Contributor',
    Description: 'Standard active member who can start threads, reply, vote, and suggest edits on collaborative documents.',
    Level: 200,
    CanConfigureForum: false,
    CanModerateQueue: false,
    CanPinOrLock: false,
    CanAcceptAnswers: false,
    CanVerifyCanon: false,
    CanPromoteToSpace: false,
    CanCreateRootPost: true,
    CanReply: true,
    CanCoEditDocs: false,
    VoteWeightMultiplier: 1,
    Sequence: 50,
    IsActive: true,
  },
  {
    ID: 'C8A17300-4E12-4B8F-9A10-100000000006',
    Code: 'observer',
    Name: 'Observer',
    Description: 'Read-only participant who can browse and subscribe to digests without posting.',
    Level: 100,
    CanConfigureForum: false,
    CanModerateQueue: false,
    CanPinOrLock: false,
    CanAcceptAnswers: false,
    CanVerifyCanon: false,
    CanPromoteToSpace: false,
    CanCreateRootPost: false,
    CanReply: false,
    CanCoEditDocs: false,
    VoteWeightMultiplier: 0,
    Sequence: 60,
    IsActive: true,
  },
  {
    ID: 'C8A17300-4E12-4B8F-9A10-100000000007',
    Code: 'muted',
    Name: 'Muted',
    Description: 'Temporarily restricted from creating posts, replies, or reactions in the forum.',
    Level: 0,
    CanConfigureForum: false,
    CanModerateQueue: false,
    CanPinOrLock: false,
    CanAcceptAnswers: false,
    CanVerifyCanon: false,
    CanPromoteToSpace: false,
    CanCreateRootPost: false,
    CanReply: false,
    CanCoEditDocs: false,
    VoteWeightMultiplier: 0,
    Sequence: 70,
    IsActive: true,
  },
];

export const ARCH_SPACE_TYPES = [
  {
    ID: '2B2C14A8-CCD6-4835-A1BD-969C54236D57',
    Code: 'community',
    Name: 'Community',
    Description: 'Member-driven online community space for forums, Q&A, ideation, and collaborative playbooks.',
    Vocabulary: 'community',
    Discoverability: 'Listed',
    JoinMode: 'SelfServe',
    MessagingPanel: true,
    LibraryPanel: true,
    WorkPanel: true,
    DefaultAgentRetrieval: 'Included',
    DefaultBand: 'Shared',
    InviteApproval: 'Approve',
    DisplayRank: 10,
    IsActive: true,
    DefaultAllowParentAssignees: true,
    Configuration: JSON.stringify({
      Children: { AllowedTypeCodes: ['working-group', 'cohort', 'project', 'event', 'community'] },
    }),
  },
  {
    ID: '2B2C14A8-CCD6-4835-A1BD-969C54236D58',
    Code: 'working-group',
    Name: 'Working Group',
    Description: 'Focused working group space graduated from community discussions for action execution.',
    Vocabulary: 'working-group',
    Discoverability: 'Listed',
    JoinMode: 'RequestToJoin',
    MessagingPanel: true,
    LibraryPanel: true,
    WorkPanel: true,
    DefaultAgentRetrieval: 'Included',
    DefaultBand: 'Shared',
    InviteApproval: 'Approve',
    DisplayRank: 20,
    IsActive: true,
    DefaultAllowParentAssignees: true,
    Configuration: JSON.stringify({ Children: { AllowedTypeCodes: ['project'] } }),
  },
];

export const ARCH_SPACE_ROLE_TYPES = [
  {
    ID: '69090145-C214-4C16-83C5-9D0F1F3B6DE4',
    Code: 'owner',
    Name: 'Owner',
    Description: 'Space owner with full governance, membership, and band promotion privileges.',
    Level: 1000,
    MaxGrantableLevel: 1000,
    CanInvite: true,
    CanPromoteBand: true,
    CanSeeTeamBand: true,
    IsOwnerRole: true,
    CanContribute: true,
    DisplayRank: 10,
    IsActive: true,
  },
  {
    ID: '03AD14E2-341A-4AC6-BA9D-E7AA5B31647B',
    Code: 'team-member',
    Name: 'Team Member',
    Description: 'Internal team member with Team-band visibility and contribution privileges.',
    Level: 500,
    MaxGrantableLevel: 200,
    CanInvite: true,
    CanPromoteBand: false,
    CanSeeTeamBand: true,
    IsOwnerRole: false,
    CanContribute: true,
    DisplayRank: 20,
    IsActive: true,
  },
  {
    ID: 'A7C40010-4E12-4B8F-9A10-000000000003',
    Code: 'contributor',
    Name: 'Contributor',
    Description: 'Standard Shared-band community contributor.',
    Level: 200,
    MaxGrantableLevel: 0,
    CanInvite: false,
    CanPromoteBand: false,
    CanSeeTeamBand: false,
    IsOwnerRole: false,
    CanContribute: true,
    DisplayRank: 30,
    IsActive: true,
  },
  {
    ID: 'A7C40010-4E12-4B8F-9A10-000000000004',
    Code: 'guest-reader',
    Name: 'Guest Reader',
    Description: 'Read-only Shared-band observer.',
    Level: 100,
    MaxGrantableLevel: 0,
    CanInvite: false,
    CanPromoteBand: false,
    CanSeeTeamBand: false,
    IsOwnerRole: false,
    CanContribute: false,
    DisplayRank: 40,
    IsActive: true,
  },
];

export const ARCH_TASK_TYPE_ID = 'A7C40020-4E12-4B8F-9A10-000000000001';

/** Deterministic 16-dim normalized topic-affinity signature for quick fixture inspection. */
function deterministicTopicVector(seedNumber, weights) {
  const raw = new Array(16).fill(0);
  for (let i = 0; i < 16; i += 1) {
    const base = weights[i % weights.length] ?? 0.25;
    raw[i] = Number((base + ((seedNumber * (i + 3)) % 7) * 0.05).toFixed(4));
  }
  const norm = Math.sqrt(raw.reduce((sum, v) => sum + v * v, 0)) || 1;
  return raw.map((v) => Number((v / norm).toFixed(6)));
}

/** 4 Distinct AGPA Community Spaces. */
export const ARCH_COMMUNITY_SPACES = [
  {
    ID: 'A7C40100-4E12-4B8F-9A10-000000000001',
    SpaceTypeID: '2B2C14A8-CCD6-4835-A1BD-969C54236D57',
    ParentID: null,
    Slug: 'national-practice-commons',
    Name: 'National Practice Commons',
    Description: 'Guild-wide forum for architectural practice, building code canon Q&A, standards ideation, and national town halls.',
    CommunityKind: 'Association Wide',
    Visibility: 'Open',
    AnonymousReadMode: 'Full Read',
    AskFirstEnabled: true,
    DefaultDigestCadence: 'Daily Digest',
    InheritsMembership: false,
    ClosedAt: null,
  },
  {
    ID: 'A7C40100-4E12-4B8F-9A10-000000000002',
    SpaceTypeID: '2B2C14A8-CCD6-4835-A1BD-969C54236D57',
    ParentID: null,
    Slug: 'mass-timber-sustainable-guild',
    Name: 'Mass Timber & Sustainable Design Guild',
    Description: 'Technical guild for CLT/glulam engineering, Passive House envelopes, embodied carbon LCA, and field case rounds.',
    CommunityKind: 'Special Interest Group',
    Visibility: 'Open',
    AnonymousReadMode: 'Teaser Only',
    AskFirstEnabled: true,
    DefaultDigestCadence: 'Weekly Digest',
    InheritsMembership: false,
    ClosedAt: null,
  },
  {
    ID: 'A7C40100-4E12-4B8F-9A10-000000000003',
    SpaceTypeID: '2B2C14A8-CCD6-4835-A1BD-969C54236D57',
    ParentID: null,
    Slug: 'licensure-emerging-professionals',
    Name: 'Licensure & Emerging Professionals Network',
    Description: 'Mentorship, NCARB AXP/ARE 5.0 study Q&A, and computational BIM studio practice for emerging architects.',
    CommunityKind: 'Special Interest Group',
    Visibility: 'Open',
    AnonymousReadMode: 'Full Read',
    AskFirstEnabled: true,
    DefaultDigestCadence: 'Daily Digest',
    InheritsMembership: false,
    ClosedAt: null,
  },
  {
    ID: 'A7C40100-4E12-4B8F-9A10-000000000004',
    SpaceTypeID: '2B2C14A8-CCD6-4835-A1BD-969C54236D57',
    ParentID: null,
    Slug: 'firm-principals-risk-council',
    Name: 'Firm Principals & Risk Council',
    Description: 'Restricted peer council for managing principals covering AIA contract risk allocation, claims defense, and succession.',
    CommunityKind: 'Working Group',
    Visibility: 'Private',
    AnonymousReadMode: 'None',
    AskFirstEnabled: true,
    DefaultDigestCadence: 'Highlights Only',
    InheritsMembership: false,
    ClosedAt: null,
  },
];

/** 13 Forums spanning all 4 Community Spaces and all 6 ForumType codes. */
export const ARCH_FORUMS = [
  {
    ID: 'A7C40200-4E12-4B8F-9A10-000000000001',
    SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000001',
    ForumTypeID: 'C8A17100-4E12-4B8F-9A10-100000000001',
    ForumTypeCode: 'general-discussion',
    Slug: 'agpa-town-square',
    Name: 'AGPA Town Square',
    Description: 'Open practice discussions across chapters, zoning reform, adaptive reuse, and design leadership.',
    VisibilityBand: 'Shared',
    PostingPolicy: 'Open',
    InheritsSpaceMembers: true,
    Status: 'Active',
    Sequence: 10,
  },
  {
    ID: 'A7C40200-4E12-4B8F-9A10-000000000002',
    SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000001',
    ForumTypeID: 'C8A17100-4E12-4B8F-9A10-100000000002',
    ForumTypeCode: 'qa-knowledge-base',
    Slug: 'building-codes-qa-canon',
    Name: 'Building Codes & IBC Q&A Canon',
    Description: 'Moderator-verified code interpretations for IBC 2027, fire-life-safety, egress, and seismic compliance.',
    VisibilityBand: 'Shared',
    PostingPolicy: 'Open',
    InheritsSpaceMembers: true,
    Status: 'Active',
    Sequence: 20,
  },
  {
    ID: 'A7C40200-4E12-4B8F-9A10-000000000003',
    SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000001',
    ForumTypeID: 'C8A17100-4E12-4B8F-9A10-100000000003',
    ForumTypeCode: 'ideation-campaign',
    Slug: 'agpa-standards-ideation',
    Name: '2027 Guild Standards & Tooling Ideation',
    Description: 'Quadratic voting campaign allocating 100 voice credits per member across guild technical standards and member initiatives.',
    VisibilityBand: 'Shared',
    PostingPolicy: 'Open',
    InheritsSpaceMembers: true,
    Status: 'Active',
    Sequence: 30,
  },
  {
    ID: 'A7C40200-4E12-4B8F-9A10-000000000004',
    SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000001',
    ForumTypeID: 'C8A17100-4E12-4B8F-9A10-100000000006',
    ForumTypeCode: 'live-events-and-amas',
    Slug: 'practice-town-halls-amas',
    Name: 'National Town Halls & Code AMAs',
    Description: 'Scheduled live AMAs with IBC code committee chairs, guild fellows, and practice economists.',
    VisibilityBand: 'Shared',
    PostingPolicy: 'Open',
    InheritsSpaceMembers: true,
    Status: 'Active',
    Sequence: 40,
  },
  {
    ID: 'A7C40200-4E12-4B8F-9A10-000000000005',
    SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000002',
    ForumTypeID: 'C8A17100-4E12-4B8F-9A10-100000000001',
    ForumTypeCode: 'general-discussion',
    Slug: 'mass-timber-engineering-forum',
    Name: 'Mass Timber & Tall Wood Forum',
    Description: 'Cross-laminated timber connections, exposed Type IV ceilings, acoustic toppings, and seismic diaphragms.',
    VisibilityBand: 'Shared',
    PostingPolicy: 'Open',
    InheritsSpaceMembers: true,
    Status: 'Active',
    Sequence: 10,
  },
  {
    ID: 'A7C40200-4E12-4B8F-9A10-000000000006',
    SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000002',
    ForumTypeID: 'C8A17100-4E12-4B8F-9A10-100000000002',
    ForumTypeCode: 'qa-knowledge-base',
    Slug: 'passive-house-envelope-qa',
    Name: 'Passive House & Envelope Q&A',
    Description: 'Verified answers on airtightness, thermal bridging, vapor control, and net-zero retrofit assemblies.',
    VisibilityBand: 'Shared',
    PostingPolicy: 'Open',
    InheritsSpaceMembers: true,
    Status: 'Active',
    Sequence: 20,
  },
  {
    ID: 'A7C40200-4E12-4B8F-9A10-000000000007',
    SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000002',
    ForumTypeID: 'C8A17100-4E12-4B8F-9A10-100000000004',
    ForumTypeCode: 'playbooks-and-docs',
    Slug: 'timber-retrofit-playbooks',
    Name: 'Timber & Retrofit Living Playbooks',
    Description: 'Co-authored construction moisture playbooks, embodied carbon cost matrices, and zoning variance slide decks.',
    VisibilityBand: 'Shared',
    PostingPolicy: 'Open',
    InheritsSpaceMembers: true,
    Status: 'Active',
    Sequence: 30,
  },
  {
    ID: 'A7C40200-4E12-4B8F-9A10-000000000008',
    SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000002',
    ForumTypeID: 'C8A17100-4E12-4B8F-9A10-100000000005',
    ForumTypeCode: 'peer-case-rounds',
    Slug: 'timber-char-and-water-case-rounds',
    Name: 'Envelope & Timber Field Case Rounds',
    Description: 'Structured Situation / Action / Outcome field remediation rounds from construction administration.',
    VisibilityBand: 'Shared',
    PostingPolicy: 'Moderated',
    InheritsSpaceMembers: true,
    Status: 'Active',
    Sequence: 40,
  },
  {
    ID: 'A7C40200-4E12-4B8F-9A10-000000000009',
    SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000003',
    ForumTypeID: 'C8A17100-4E12-4B8F-9A10-100000000002',
    ForumTypeCode: 'qa-knowledge-base',
    Slug: 'are-exam-and-axp-qa',
    Name: 'ARE 5.0 & AXP Licensure Q&A',
    Description: 'Verified study guidance, vignette walkthroughs, and NCARB experience hour tracking advice.',
    VisibilityBand: 'Shared',
    PostingPolicy: 'Open',
    InheritsSpaceMembers: true,
    Status: 'Active',
    Sequence: 10,
  },
  {
    ID: 'A7C40200-4E12-4B8F-9A10-000000000010',
    SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000003',
    ForumTypeID: 'C8A17100-4E12-4B8F-9A10-100000000001',
    ForumTypeCode: 'general-discussion',
    Slug: 'emerging-practice-studio',
    Name: 'Emerging Practice, BIM & AI Studio',
    Description: 'Revit/IFC interoperability, AI rendering ethics, and construction observation mentorship.',
    VisibilityBand: 'Shared',
    PostingPolicy: 'Open',
    InheritsSpaceMembers: true,
    Status: 'Active',
    Sequence: 20,
  },
  {
    ID: 'A7C40200-4E12-4B8F-9A10-000000000011',
    SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000004',
    ForumTypeID: 'C8A17100-4E12-4B8F-9A10-100000000002',
    ForumTypeCode: 'qa-knowledge-base',
    Slug: 'aia-contracts-risk-counsel',
    Name: 'AIA Contracts & Risk Counsel (Team)',
    Description: 'Confidential principal counsel Q&A on AIA B101/A201 indemnification, standard of care, and fiduciary risk.',
    VisibilityBand: 'Team',
    PostingPolicy: 'Open',
    InheritsSpaceMembers: true,
    Status: 'Active',
    Sequence: 10,
  },
  {
    ID: 'A7C40200-4E12-4B8F-9A10-000000000012',
    SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000004',
    ForumTypeID: 'C8A17100-4E12-4B8F-9A10-100000000005',
    ForumTypeCode: 'peer-case-rounds',
    Slug: 'principals-confidential-case-rounds',
    Name: 'Principals Confidential Claims & Succession Rounds',
    Description: 'Anonymized claims defense, owner value-engineering disputes, and firm ownership transition rounds.',
    VisibilityBand: 'Team',
    PostingPolicy: 'Moderated',
    InheritsSpaceMembers: true,
    Status: 'Active',
    Sequence: 20,
  },
  {
    ID: 'A7C40200-4E12-4B8F-9A10-000000000013',
    SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000004',
    ForumTypeID: 'C8A17100-4E12-4B8F-9A10-100000000001',
    ForumTypeCode: 'general-discussion',
    Slug: 'principals-governance-and-succession',
    Name: 'Principals Governance & Succession Forum (Team)',
    Description: 'Confidential Team-band discussions on AIA B101 deliverables, AI risk governance, and firm ownership transitions.',
    VisibilityBand: 'Team',
    PostingPolicy: 'Open',
    InheritsSpaceMembers: true,
    Status: 'Active',
    Sequence: 30,
  },
];

/** 22 Topic Tags across the 4 Spaces. */
export const ARCH_TOPIC_TAGS = [
  { ID: 'A7C40300-4E12-4B8F-9A10-000000000001', SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000002', Slug: 'mass-timber', Name: 'Mass Timber', IsOfficial: true },
  { ID: 'A7C40300-4E12-4B8F-9A10-000000000002', SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000001', Slug: 'ibc-2027', Name: 'IBC 2027', IsOfficial: true },
  { ID: 'A7C40300-4E12-4B8F-9A10-000000000003', SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000003', Slug: 'bim-revit', Name: 'BIM/Revit', IsOfficial: true },
  { ID: 'A7C40300-4E12-4B8F-9A10-000000000004', SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000002', Slug: 'passive-house', Name: 'Passive House', IsOfficial: true },
  { ID: 'A7C40300-4E12-4B8F-9A10-000000000005', SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000002', Slug: 'net-zero-retrofit', Name: 'Net-Zero Retrofit', IsOfficial: true },
  { ID: 'A7C40300-4E12-4B8F-9A10-000000000006', SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000004', Slug: 'aia-contracts', Name: 'AIA Contracts', IsOfficial: true },
  { ID: 'A7C40300-4E12-4B8F-9A10-000000000007', SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000003', Slug: 'are-licensure', Name: 'ARE Licensure', IsOfficial: true },
  { ID: 'A7C40300-4E12-4B8F-9A10-000000000008', SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000003', Slug: 'ai-rendering', Name: 'AI Rendering', IsOfficial: true },
  { ID: 'A7C40300-4E12-4B8F-9A10-000000000009', SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000001', Slug: 'adaptive-reuse', Name: 'Adaptive Reuse', IsOfficial: true },
  { ID: 'A7C40300-4E12-4B8F-9A10-000000000010', SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000002', Slug: 'seismic', Name: 'Seismic', IsOfficial: true },
  { ID: 'A7C40300-4E12-4B8F-9A10-000000000011', SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000001', Slug: 'zoning-variance', Name: 'Zoning Variance', IsOfficial: true },
  { ID: 'A7C40300-4E12-4B8F-9A10-000000000012', SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000004', Slug: 'firm-succession', Name: 'Firm Succession', IsOfficial: true },
  { ID: 'A7C40300-4E12-4B8F-9A10-000000000013', SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000002', Slug: 'acoustics', Name: 'Acoustics', IsOfficial: true },
  { ID: 'A7C40300-4E12-4B8F-9A10-000000000014', SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000002', Slug: 'facade-envelopes', Name: 'Facade Envelopes', IsOfficial: true },
  { ID: 'A7C40300-4E12-4B8F-9A10-000000000015', SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000001', Slug: 'historic-preservation', Name: 'Historic Preservation', IsOfficial: true },
  { ID: 'A7C40300-4E12-4B8F-9A10-000000000016', SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000002', Slug: 'embodied-carbon', Name: 'Embodied Carbon', IsOfficial: true },
  { ID: 'A7C40300-4E12-4B8F-9A10-000000000017', SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000003', Slug: 'mep-coordination', Name: 'MEP Coordination', IsOfficial: true },
  { ID: 'A7C40300-4E12-4B8F-9A10-000000000018', SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000004', Slug: 'design-build', Name: 'Design-Build', IsOfficial: true },
  { ID: 'A7C40300-4E12-4B8F-9A10-000000000019', SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000003', Slug: 'construction-admin', Name: 'Construction Admin', IsOfficial: true },
  { ID: 'A7C40300-4E12-4B8F-9A10-000000000020', SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000004', Slug: 'public-procurement', Name: 'Public Procurement', IsOfficial: true },
  { ID: 'A7C40300-4E12-4B8F-9A10-000000000021', SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000001', Slug: 'fire-life-safety', Name: 'Fire & Life Safety', IsOfficial: true },
  { ID: 'A7C40300-4E12-4B8F-9A10-000000000022', SpaceID: 'A7C40100-4E12-4B8F-9A10-000000000002', Slug: 'thermal-bridging', Name: 'Thermal Bridging', IsOfficial: true },
];

/** 26 Distinct Architect Association Members across 9 realistic personas. */
export const ARCH_MEMBERS = [
  {
    ID: 'A7C40400-4E12-4B8F-9A10-000000000001',
    Name: 'Dr. Kenji Takahashi, FAIA',
    Email: 'kenji.takahashi@agpa-guild.org',
    Persona: 'Principal',
    Title: 'Senior Principal, Tall Timber Practice',
    Firm: 'Cascade Timber Studio',
    Chapter: 'Seattle Northwest Chapter',
    LicenseNumber: 'WA-ARC-09412',
    Bio: 'Leads Type IV-A/IV-B mass timber civic towers and seismic diaphragm research across the Pacific Northwest.',
    Specialties: ['Mass Timber', 'IBC 2027', 'Seismic', 'Fire & Life Safety'],
    DigestCadence: 'Daily Digest',
    DeterministicEmbedding: deterministicTopicVector(1, [0.9, 0.8, 0.2, 0.1]),
    ReputationScore: 940,
  },
  {
    ID: 'A7C40400-4E12-4B8F-9A10-000000000002',
    Name: 'Eleanor Vance, FAIA',
    Email: 'eleanor.vance@agpa-guild.org',
    Persona: 'Principal',
    Title: 'Managing Principal & General Counsel Liaison',
    Firm: 'Vance & Holt Architects',
    Chapter: 'Chicago Great Lakes Chapter',
    LicenseNumber: 'IL-001-018421',
    Bio: 'Advises multi-office architecture practices on AIA B101/A201 contract risk, fiduciary governance, and equity succession.',
    Specialties: ['AIA Contracts', 'Firm Succession', 'Design-Build', 'Public Procurement'],
    DigestCadence: 'Daily Digest',
    DeterministicEmbedding: deterministicTopicVector(2, [0.1, 0.2, 0.9, 0.85]),
    ReputationScore: 890,
  },
  {
    ID: 'A7C40400-4E12-4B8F-9A10-000000000003',
    Name: 'Marcus Sterling, AIA',
    Email: 'marcus.sterling@agpa-guild.org',
    Persona: 'Principal',
    Title: 'Civic Principal',
    Firm: 'Sterling Civic Partners',
    Chapter: 'New York Metro Chapter',
    LicenseNumber: 'NY-RA-034190',
    Bio: 'Directs municipal library and transit procurements under design-build delivery models.',
    Specialties: ['Public Procurement', 'Design-Build', 'AIA Contracts', 'Zoning Variance'],
    DigestCadence: 'Weekly Digest',
    DeterministicEmbedding: deterministicTopicVector(3, [0.2, 0.15, 0.85, 0.8]),
    ReputationScore: 710,
  },
  {
    ID: 'A7C40400-4E12-4B8F-9A10-000000000004',
    Name: 'Nadia Al-Mansoor, AIA',
    Email: 'nadia.almansoor@agpa-guild.org',
    Persona: 'Principal',
    Title: 'Adaptive Reuse Principal',
    Firm: 'Sunbelt Adaptive Partners',
    Chapter: 'Phoenix Desert Chapter',
    LicenseNumber: 'AZ-ARC-51209',
    Bio: 'Specializes in office-to-residential adaptive reuse, historic masonry preservation, and desert envelope retrofits.',
    Specialties: ['Adaptive Reuse', 'Historic Preservation', 'Net-Zero Retrofit', 'Zoning Variance'],
    DigestCadence: 'Daily Digest',
    DeterministicEmbedding: deterministicTopicVector(4, [0.55, 0.65, 0.35, 0.25]),
    ReputationScore: 680,
  },
  {
    ID: 'A7C40400-4E12-4B8F-9A10-000000000005',
    Name: 'Maya Lin-Carter, CPHC',
    Email: 'maya.lincarter@agpa-guild.org',
    Persona: 'Sustainability/Passive House Specialist',
    Title: 'Director of Building Science & Passive House',
    Firm: 'Nordic Envelope Collective',
    Chapter: 'Boston New England Chapter',
    LicenseNumber: 'MA-ARC-95401',
    Bio: 'Certified Passive House Consultant focused on thermal-bridge-free balcony connections, airtightness, and net-zero retrofits.',
    Specialties: ['Passive House', 'Thermal Bridging', 'Net-Zero Retrofit', 'Facade Envelopes'],
    DigestCadence: 'Daily Digest',
    DeterministicEmbedding: deterministicTopicVector(5, [0.85, 0.9, 0.1, 0.1]),
    ReputationScore: 815,
  },
  {
    ID: 'A7C40400-4E12-4B8F-9A10-000000000006',
    Name: 'Henrik Lindholm, PE, SE',
    Email: 'henrik.lindholm@agpa-guild.org',
    Persona: 'Structural/BIM Lead',
    Title: 'Principal Structural Timber Engineer',
    Firm: 'Fjord Structural Consultants',
    Chapter: 'Portland Cascadia Chapter',
    LicenseNumber: 'OR-SE-88214',
    Bio: 'Designs post-tensioned CLT shear walls, char-rate fire protection, and glulam-to-steel seismic knife plates.',
    Specialties: ['Mass Timber', 'Seismic', 'IBC 2027', 'Fire & Life Safety'],
    DigestCadence: 'Weekly Digest',
    DeterministicEmbedding: deterministicTopicVector(6, [0.92, 0.75, 0.15, 0.1]),
    ReputationScore: 760,
  },
  {
    ID: 'A7C40400-4E12-4B8F-9A10-000000000007',
    Name: 'Sofia Kowalski, AIA',
    Email: 'sofia.kowalski@agpa-guild.org',
    Persona: 'Structural/BIM Lead',
    Title: 'Director of Digital Practice & BIM',
    Firm: 'Kowalski Integrated Design',
    Chapter: 'Chicago Great Lakes Chapter',
    LicenseNumber: 'IL-001-024910',
    Bio: 'Leads IFC 4.3 openBIM coordination, Revit clash tolerance standards, and MEP fabrication handoffs.',
    Specialties: ['BIM/Revit', 'MEP Coordination', 'Construction Admin'],
    DigestCadence: 'Daily Digest',
    DeterministicEmbedding: deterministicTopicVector(7, [0.35, 0.4, 0.3, 0.7]),
    ReputationScore: 640,
  },
  {
    ID: 'A7C40400-4E12-4B8F-9A10-000000000008',
    Name: 'Owen Pritchard, AIA',
    Email: 'owen.pritchard@agpa-guild.org',
    Persona: 'Structural/BIM Lead',
    Title: 'Computational Design & AI Visualization Lead',
    Firm: 'Studio Vector West',
    Chapter: 'San Francisco Bay Chapter',
    LicenseNumber: 'CA-C39104',
    Bio: 'Builds Grasshopper-to-Revit daylighting pipelines and ethical AI rendering governance standards.',
    Specialties: ['AI Rendering', 'BIM/Revit', 'Facade Envelopes'],
    DigestCadence: 'Weekly Digest',
    DeterministicEmbedding: deterministicTopicVector(8, [0.4, 0.35, 0.4, 0.75]),
    ReputationScore: 520,
  },
  {
    ID: 'A7C40400-4E12-4B8F-9A10-000000000009',
    Name: 'Claire Beaumont, AIA',
    Email: 'claire.beaumont@agpa-guild.org',
    Persona: 'Project Architect',
    Title: 'Senior Envelope Project Architect',
    Firm: 'Atelier North',
    Chapter: 'Minneapolis North Star Chapter',
    LicenseNumber: 'MN-ARC-44102',
    Bio: 'Details curtain-wall thermal breaks, triple-glazed unitized facades, and cold-climate vapor control layers.',
    Specialties: ['Facade Envelopes', 'Passive House', 'Thermal Bridging'],
    DigestCadence: 'Daily Digest',
    DeterministicEmbedding: deterministicTopicVector(9, [0.75, 0.85, 0.15, 0.2]),
    ReputationScore: 590,
  },
  {
    ID: 'A7C40400-4E12-4B8F-9A10-000000000010',
    Name: 'David Morales, AIA',
    Email: 'david.morales@agpa-guild.org',
    Persona: 'Project Architect',
    Title: 'Construction Administration Lead',
    Firm: 'Morales & Vega Architecture',
    Chapter: 'Austin Central Texas Chapter',
    LicenseNumber: 'TX-ARC-27319',
    Bio: 'Oversees RFI turnaround SLAs, submittal review logs, and field mockups for civic healthcare campuses.',
    Specialties: ['Construction Admin', 'MEP Coordination', 'AIA Contracts'],
    DigestCadence: 'Daily Digest',
    DeterministicEmbedding: deterministicTopicVector(10, [0.25, 0.3, 0.7, 0.5]),
    ReputationScore: 560,
  },
  {
    ID: 'A7C40400-4E12-4B8F-9A10-000000000011',
    Name: 'Priya Nair, AIA',
    Email: 'priya.nair@agpa-guild.org',
    Persona: 'Project Architect',
    Title: 'Mass Timber Project Architect',
    Firm: 'Cascade Timber Studio',
    Chapter: 'Seattle Northwest Chapter',
    LicenseNumber: 'WA-ARC-11805',
    Bio: 'Coordinates CNC CLT shop drawings, acoustic floor toppings, and whole-building LCA embodied carbon targets.',
    Specialties: ['Mass Timber', 'Embodied Carbon', 'Acoustics'],
    DigestCadence: 'Daily Digest',
    DeterministicEmbedding: deterministicTopicVector(11, [0.88, 0.78, 0.15, 0.15]),
    ReputationScore: 610,
  },
  {
    ID: 'A7C40400-4E12-4B8F-9A10-000000000012',
    Name: 'Thomas Lindqvist, AIA',
    Email: 'thomas.lindqvist@agpa-guild.org',
    Persona: 'Project Architect',
    Title: 'Cultural & Acoustic Project Architect',
    Firm: 'Sound & Form Studio',
    Chapter: 'Denver Mountain Chapter',
    LicenseNumber: 'CO-ARC-402911',
    Bio: 'Designs timber concert halls and municipal libraries balancing STC/IIC acoustic assemblies with exposed wood.',
    Specialties: ['Acoustics', 'Mass Timber', 'Adaptive Reuse'],
    DigestCadence: 'Weekly Digest',
    DeterministicEmbedding: deterministicTopicVector(12, [0.72, 0.68, 0.2, 0.2]),
    ReputationScore: 495,
  },
  {
    ID: 'A7C40400-4E12-4B8F-9A10-000000000013',
    Name: 'Jonas Lindner, LEED Fellow',
    Email: 'jonas.lindner@agpa-guild.org',
    Persona: 'Sustainability/Passive House Specialist',
    Title: 'Director of Embodied Carbon & LCA',
    Firm: 'CarbonZero Practice Group',
    Chapter: 'San Francisco Bay Chapter',
    LicenseNumber: 'CA-C31880',
    Bio: 'Authors EPD procurement specifications and whole-building embodied carbon benchmarks for public owners.',
    Specialties: ['Embodied Carbon', 'Net-Zero Retrofit', 'Mass Timber'],
    DigestCadence: 'Weekly Digest',
    DeterministicEmbedding: deterministicTopicVector(13, [0.82, 0.8, 0.2, 0.15]),
    ReputationScore: 675,
  },
  {
    ID: 'A7C40400-4E12-4B8F-9A10-000000000014',
    Name: 'Hannah Osei, AIA, WELL AP',
    Email: 'hannah.osei@agpa-guild.org',
    Persona: 'Sustainability/Passive House Specialist',
    Title: 'Deep Energy Retrofit Lead',
    Firm: 'Mid-Atlantic Regenerative',
    Chapter: 'Washington DC Potomac Chapter',
    LicenseNumber: 'DC-ARC-104218',
    Bio: 'Converts 1960s federal precast office towers into net-zero overclad Passive House campuses.',
    Specialties: ['Net-Zero Retrofit', 'Facade Envelopes', 'Adaptive Reuse'],
    DigestCadence: 'Daily Digest',
    DeterministicEmbedding: deterministicTopicVector(14, [0.7, 0.85, 0.2, 0.2]),
    ReputationScore: 540,
  },
  {
    ID: 'A7C40400-4E12-4B8F-9A10-000000000015',
    Name: 'Mateo Rivera, Assoc. AIA',
    Email: 'mateo.rivera@agpa-guild.org',
    Persona: 'Emerging Associate',
    Title: 'Architectural Designer (ARE Candidate)',
    Firm: 'Sunbelt Adaptive Partners',
    Chapter: 'Phoenix Desert Chapter',
    LicenseNumber: 'AXP-CAND-77410',
    Bio: 'Completing final PPD and PDD ARE 5.0 divisions while building Revit adaptive reuse templates.',
    Specialties: ['ARE Licensure', 'BIM/Revit', 'AI Rendering'],
    DigestCadence: 'Daily Digest',
    DeterministicEmbedding: deterministicTopicVector(15, [0.3, 0.25, 0.35, 0.85]),
    ReputationScore: 310,
  },
  {
    ID: 'A7C40400-4E12-4B8F-9A10-000000000016',
    Name: 'Chloe Park, Assoc. AIA',
    Email: 'chloe.park@agpa-guild.org',
    Persona: 'Emerging Associate',
    Title: 'Job Captain & AXP Coordinator',
    Firm: 'Atelier North',
    Chapter: 'Minneapolis North Star Chapter',
    LicenseNumber: 'AXP-CAND-81904',
    Bio: 'Organizes chapter ARE study cohorts and documents historic warehouse adaptive reuse zoning variances.',
    Specialties: ['ARE Licensure', 'Adaptive Reuse', 'Historic Preservation'],
    DigestCadence: 'Daily Digest',
    DeterministicEmbedding: deterministicTopicVector(16, [0.35, 0.3, 0.3, 0.8]),
    ReputationScore: 285,
  },
  {
    ID: 'A7C40400-4E12-4B8F-9A10-000000000017',
    Name: "Liam O'Connor, Assoc. AIA",
    Email: 'liam.oconnor@agpa-guild.org',
    Persona: 'Emerging Associate',
    Title: 'Field Observation Associate',
    Firm: 'Morales & Vega Architecture',
    Chapter: 'Austin Central Texas Chapter',
    LicenseNumber: 'AXP-CAND-90211',
    Bio: 'Assists construction administration field walks, punchlists, and MEP clash verification.',
    Specialties: ['Construction Admin', 'ARE Licensure', 'MEP Coordination'],
    DigestCadence: 'Weekly Digest',
    DeterministicEmbedding: deterministicTopicVector(17, [0.25, 0.2, 0.4, 0.78]),
    ReputationScore: 240,
  },
  {
    ID: 'A7C40400-4E12-4B8F-9A10-000000000018',
    Name: 'Arthur Pendelton, CBO',
    Email: 'arthur.pendelton@agpa-guild.org',
    Persona: 'Code Official',
    Title: 'Chief Building Official & IBC Code Committee Member',
    Firm: 'City of Seattle Dept. of Construction',
    Chapter: 'Seattle Northwest Chapter',
    LicenseNumber: 'ICC-CBO-33910',
    Bio: 'Serves on the ICC Type IV tall wood code committee and advises architects on alternate means & methods.',
    Specialties: ['IBC 2027', 'Fire & Life Safety', 'Mass Timber', 'Zoning Variance'],
    DigestCadence: 'Daily Digest',
    DeterministicEmbedding: deterministicTopicVector(18, [0.85, 0.7, 0.45, 0.1]),
    ReputationScore: 870,
  },
  {
    ID: 'A7C40400-4E12-4B8F-9A10-000000000019',
    Name: 'Denise Washington, PE, CBO',
    Email: 'denise.washington@agpa-guild.org',
    Persona: 'Code Official',
    Title: 'Deputy Fire & Seismic Plans Examiner',
    Firm: 'Metro Bay Building Authority',
    Chapter: 'San Francisco Bay Chapter',
    LicenseNumber: 'CA-CBO-55210',
    Bio: 'Reviews seismic drift compatibility, exit stair pressurization, and adaptive reuse change-of-occupancy appeals.',
    Specialties: ['Seismic', 'IBC 2027', 'Fire & Life Safety', 'Adaptive Reuse'],
    DigestCadence: 'Weekly Digest',
    DeterministicEmbedding: deterministicTopicVector(19, [0.8, 0.65, 0.4, 0.15]),
    ReputationScore: 730,
  },
  {
    ID: 'A7C40400-4E12-4B8F-9A10-000000000020',
    Name: 'Gregory Vance-Miller, FAIA',
    Email: 'gregory.vancemiller@agpa-guild.org',
    Persona: 'Chapter President',
    Title: 'Northeast Regional Chapter President',
    Firm: 'Miller Civic & Academic',
    Chapter: 'Boston New England Chapter',
    LicenseNumber: 'MA-ARC-41200',
    Bio: 'Chairs regional practice economics roundtables, firm leadership succession planning, and public fee advocacy.',
    Specialties: ['Firm Succession', 'AIA Contracts', 'Public Procurement'],
    DigestCadence: 'Weekly Digest',
    DeterministicEmbedding: deterministicTopicVector(20, [0.15, 0.2, 0.88, 0.75]),
    ReputationScore: 695,
  },
  {
    ID: 'A7C40400-4E12-4B8F-9A10-000000000021',
    Name: 'Carmen Delgado, AIA',
    Email: 'carmen.delgado@agpa-guild.org',
    Persona: 'Chapter President',
    Title: 'Southwest Chapter President',
    Firm: 'Delgado Urban Studio',
    Chapter: 'Austin Central Texas Chapter',
    LicenseNumber: 'TX-ARC-19844',
    Bio: 'Advocates for missing-middle zoning variance reform and equitable municipal design-build procurement.',
    Specialties: ['Zoning Variance', 'Public Procurement', 'Design-Build'],
    DigestCadence: 'Daily Digest',
    DeterministicEmbedding: deterministicTopicVector(21, [0.3, 0.25, 0.75, 0.6]),
    ReputationScore: 650,
  },
  {
    ID: 'A7C40400-4E12-4B8F-9A10-000000000022',
    Name: 'Rachel Goldstein, FAIA',
    Email: 'rachel.goldstein@agpa-guild.org',
    Persona: 'Moderator',
    Title: 'Chief Canon Steward & National Moderator',
    Firm: 'Goldstein Architecture PLLC',
    Chapter: 'New York Metro Chapter',
    LicenseNumber: 'NY-RA-028102',
    Bio: 'Moderates AGPA national code Q&A canon, verifies epistemic accuracy, and stewards working-group graduations.',
    Specialties: ['IBC 2027', 'AIA Contracts', 'Mass Timber', 'Historic Preservation'],
    DigestCadence: 'Daily Digest',
    DeterministicEmbedding: deterministicTopicVector(22, [0.6, 0.55, 0.7, 0.4]),
    ReputationScore: 980,
  },
  {
    ID: 'A7C40400-4E12-4B8F-9A10-000000000023',
    Name: 'Samuel Okafor, AIA',
    Email: 'samuel.okafor@agpa-guild.org',
    Persona: 'Moderator',
    Title: 'Sustainability Guild Moderator',
    Firm: 'Okafor High-Performance Design',
    Chapter: 'Washington DC Potomac Chapter',
    LicenseNumber: 'DC-ARC-091422',
    Bio: 'Curates Passive House and mass timber field case rounds and facilitates weekly guild synthesis.',
    Specialties: ['Passive House', 'Mass Timber', 'Embodied Carbon', 'Acoustics'],
    DigestCadence: 'Daily Digest',
    DeterministicEmbedding: deterministicTopicVector(23, [0.85, 0.82, 0.2, 0.2]),
    ReputationScore: 840,
  },
  {
    ID: 'A7C40400-4E12-4B8F-9A10-000000000024',
    Name: 'Evelyn Cho, AIA',
    Email: 'evelyn.cho@agpa-guild.org',
    Persona: 'Moderator',
    Title: 'Licensure & Digital Practice Moderator',
    Firm: 'Cho + Partners',
    Chapter: 'San Francisco Bay Chapter',
    LicenseNumber: 'CA-C36781',
    Bio: 'Mentors ARE candidates, moderates BIM/AI studio threads, and oversees emerging professional grants.',
    Specialties: ['ARE Licensure', 'BIM/Revit', 'AI Rendering'],
    DigestCadence: 'Daily Digest',
    DeterministicEmbedding: deterministicTopicVector(24, [0.35, 0.3, 0.35, 0.85]),
    ReputationScore: 775,
  },
  {
    ID: 'A7C40400-4E12-4B8F-9A10-000000000025',
    Name: 'Jordan Patel, Assoc. AIA',
    Email: 'jordan.patel@agpa-guild.org',
    Persona: 'New Member',
    Title: 'Newly Joined Architectural Designer (Cold-Start)',
    Firm: 'Riverfront Design Collective',
    Chapter: 'Denver Mountain Chapter',
    LicenseNumber: 'AXP-CAND-99104',
    Bio: 'Joined AGPA this week to explore building codes, timber detailing, and licensure resources.',
    Specialties: [],
    DigestCadence: 'Daily Digest',
    DeterministicEmbedding: deterministicTopicVector(25, [0.25, 0.25, 0.25, 0.25]),
    ReputationScore: 10,
  },
  {
    ID: 'A7C40400-4E12-4B8F-9A10-000000000026',
    Name: 'Victor Kroll',
    Email: 'victor.kroll@agpa-guild.org',
    Persona: 'Revoked / Muted Member',
    Title: 'Suspended Commercial Vendor Representative',
    Firm: 'Kroll Cladding Sales',
    Chapter: 'New York Metro Chapter',
    LicenseNumber: 'ASSOC-NONLIC-009',
    Bio: 'Account muted/revoked due to repeated unapproved promotional solicitation.',
    Specialties: [],
    DigestCadence: 'Muted',
    DeterministicEmbedding: deterministicTopicVector(26, [0.1, 0.1, 0.1, 0.1]),
    ReputationScore: 0,
  },
];

/** Space memberships per member (authoritative Collaboration Space isolation). */
export const ARCH_SPACE_MEMBERS = (() => {
  const rows = [];
  let seq = 1;
  const add = (spaceId, userId, roleId, status = 'Active') => {
    rows.push({
      ID: `A7C40450-4E12-4B8F-9A10-${String(seq).padStart(12, '0')}`,
      SpaceID: spaceId,
      UserID: userId,
      SpaceRoleTypeID: roleId,
      Band: roleId === '69090145-C214-4C16-83C5-9D0F1F3B6DE4' || roleId === '03AD14E2-341A-4AC6-BA9D-E7AA5B31647B' ? 'Team' : 'Shared',
      Status: status,
    });
    seq += 1;
  };

  const S1 = 'A7C40100-4E12-4B8F-9A10-000000000001';
  const S2 = 'A7C40100-4E12-4B8F-9A10-000000000002';
  const S3 = 'A7C40100-4E12-4B8F-9A10-000000000003';
  const S4 = 'A7C40100-4E12-4B8F-9A10-000000000004';
  const OWNER = '69090145-C214-4C16-83C5-9D0F1F3B6DE4';
  const TEAM = '03AD14E2-341A-4AC6-BA9D-E7AA5B31647B';
  const OUTSIDE = 'A7C40010-4E12-4B8F-9A10-000000000003';

  for (const m of ARCH_MEMBERS) {
    if (m.ID.endsWith('000000000026')) {
      add(S1, m.ID, OUTSIDE, 'Removed');
      continue;
    }
    if (m.ID.endsWith('000000000025')) {
      add(S1, m.ID, OUTSIDE, 'Active');
      continue;
    }

    const isModeratorOrLead = ['Moderator', 'Code Official'].includes(m.Persona);
    const isPrincipalOrPres = ['Principal', 'Chapter President'].includes(m.Persona);

    // Every active member belongs to National Practice Commons (S1)
    add(S1, m.ID, m.ID.endsWith('000000000022') ? OWNER : isModeratorOrLead ? TEAM : OUTSIDE, 'Active');

    // Timber / Sustainability / Structural / Code / Mod members join Space 2 (Mass Timber Guild)
    if (
      ['Sustainability/Passive House Specialist', 'Project Architect', 'Structural/BIM Lead', 'Code Official', 'Moderator'].includes(m.Persona) ||
      m.Specialties.includes('Mass Timber') ||
      m.Specialties.includes('Adaptive Reuse')
    ) {
      add(S2, m.ID, m.ID.endsWith('000000000001') ? OWNER : isModeratorOrLead ? TEAM : OUTSIDE, 'Active');
    }

    // Emerging Associates, BIM Leads, Mentors join Space 3 (Licensure & Emerging Professionals)
    if (
      ['Emerging Associate', 'Structural/BIM Lead', 'Moderator', 'Project Architect'].includes(m.Persona) ||
      m.Specialties.includes('ARE Licensure')
    ) {
      add(S3, m.ID, m.ID.endsWith('000000000024') ? OWNER : OUTSIDE, 'Active');
    }

    // ONLY Principals, Chapter Presidents, Dr. Kenji Takahashi, and Chief Moderator Rachel Goldstein join Space 4 (Team-band Council)
    if (isPrincipalOrPres || m.ID.endsWith('000000000022')) {
      add(S4, m.ID, m.ID.endsWith('000000000002') ? OWNER : TEAM, 'Active');
    }
  }

  return rows;
})();

/** Authoritative ForumMembers for moderators, hosts, muted test member, and active council contributors. */
export const ARCH_FORUM_MEMBERS = [
  { ID: 'A7C40480-4E12-4B8F-9A10-000000000001', ForumID: 'A7C40200-4E12-4B8F-9A10-000000000001', UserID: 'A7C40400-4E12-4B8F-9A10-000000000022', ForumRoleTypeID: 'C8A17300-4E12-4B8F-9A10-100000000001', Status: 'Active' },
  { ID: 'A7C40480-4E12-4B8F-9A10-000000000002', ForumID: 'A7C40200-4E12-4B8F-9A10-000000000002', UserID: 'A7C40400-4E12-4B8F-9A10-000000000022', ForumRoleTypeID: 'C8A17300-4E12-4B8F-9A10-100000000002', Status: 'Active' },
  { ID: 'A7C40480-4E12-4B8F-9A10-000000000003', ForumID: 'A7C40200-4E12-4B8F-9A10-000000000002', UserID: 'A7C40400-4E12-4B8F-9A10-000000000018', ForumRoleTypeID: 'C8A17300-4E12-4B8F-9A10-100000000004', Status: 'Active' },
  { ID: 'A7C40480-4E12-4B8F-9A10-000000000004', ForumID: 'A7C40200-4E12-4B8F-9A10-000000000005', UserID: 'A7C40400-4E12-4B8F-9A10-000000000001', ForumRoleTypeID: 'C8A17300-4E12-4B8F-9A10-100000000003', Status: 'Active' },
  { ID: 'A7C40480-4E12-4B8F-9A10-000000000005', ForumID: 'A7C40200-4E12-4B8F-9A10-000000000005', UserID: 'A7C40400-4E12-4B8F-9A10-000000000023', ForumRoleTypeID: 'C8A17300-4E12-4B8F-9A10-100000000002', Status: 'Active' },
  { ID: 'A7C40480-4E12-4B8F-9A10-000000000006', ForumID: 'A7C40200-4E12-4B8F-9A10-000000000006', UserID: 'A7C40400-4E12-4B8F-9A10-000000000005', ForumRoleTypeID: 'C8A17300-4E12-4B8F-9A10-100000000004', Status: 'Active' },
  { ID: 'A7C40480-4E12-4B8F-9A10-000000000007', ForumID: 'A7C40200-4E12-4B8F-9A10-000000000009', UserID: 'A7C40400-4E12-4B8F-9A10-000000000024', ForumRoleTypeID: 'C8A17300-4E12-4B8F-9A10-100000000002', Status: 'Active' },
  { ID: 'A7C40480-4E12-4B8F-9A10-000000000008', ForumID: 'A7C40200-4E12-4B8F-9A10-000000000011', UserID: 'A7C40400-4E12-4B8F-9A10-000000000002', ForumRoleTypeID: 'C8A17300-4E12-4B8F-9A10-100000000001', Status: 'Active' },
  { ID: 'A7C40480-4E12-4B8F-9A10-000000000009', ForumID: 'A7C40200-4E12-4B8F-9A10-000000000011', UserID: 'A7C40400-4E12-4B8F-9A10-000000000001', ForumRoleTypeID: 'C8A17300-4E12-4B8F-9A10-100000000005', Status: 'Active' },
  { ID: 'A7C40480-4E12-4B8F-9A10-000000000010', ForumID: 'A7C40200-4E12-4B8F-9A10-000000000001', UserID: 'A7C40400-4E12-4B8F-9A10-000000000026', ForumRoleTypeID: 'C8A17300-4E12-4B8F-9A10-100000000007', Status: 'Muted' },
  { ID: 'A7C40480-4E12-4B8F-9A10-000000000011', ForumID: 'A7C40200-4E12-4B8F-9A10-000000000006', UserID: 'A7C40400-4E12-4B8F-9A10-000000000023', ForumRoleTypeID: 'C8A17300-4E12-4B8F-9A10-100000000002', Status: 'Active' },
  { ID: 'A7C40480-4E12-4B8F-9A10-000000000012', ForumID: 'A7C40200-4E12-4B8F-9A10-000000000008', UserID: 'A7C40400-4E12-4B8F-9A10-000000000023', ForumRoleTypeID: 'C8A17300-4E12-4B8F-9A10-100000000002', Status: 'Active' },
  { ID: 'A7C40480-4E12-4B8F-9A10-000000000013', ForumID: 'A7C40200-4E12-4B8F-9A10-000000000010', UserID: 'A7C40400-4E12-4B8F-9A10-000000000024', ForumRoleTypeID: 'C8A17300-4E12-4B8F-9A10-100000000002', Status: 'Active' },
  { ID: 'A7C40480-4E12-4B8F-9A10-000000000014', ForumID: 'A7C40200-4E12-4B8F-9A10-000000000012', UserID: 'A7C40400-4E12-4B8F-9A10-000000000002', ForumRoleTypeID: 'C8A17300-4E12-4B8F-9A10-100000000001', Status: 'Active' },
];

/** Member profiles per primary Space carrying ExpertiseTagsJSON and DigestCadence. */
export const ARCH_MEMBER_PROFILES = ARCH_MEMBERS.map((m, idx) => ({
  ID: `A7C40500-4E12-4B8F-9A10-${String(idx + 1).padStart(12, '0')}`,
  SpaceID:
    m.Persona === 'Sustainability/Passive House Specialist'
      ? 'A7C40100-4E12-4B8F-9A10-000000000002'
      : m.Persona === 'Emerging Associate'
        ? 'A7C40100-4E12-4B8F-9A10-000000000003'
        : m.ID.endsWith('000000000002')
          ? 'A7C40100-4E12-4B8F-9A10-000000000004'
          : 'A7C40100-4E12-4B8F-9A10-000000000001',
  UserID: m.ID,
  BioMarkdown: m.Bio,
  ExpertiseTagsJSON: JSON.stringify(m.Specialties),
  DigestCadence: m.DigestCadence,
  HelpfulAnswerCount: Math.floor(m.ReputationScore / 45),
  AcceptedAnswerCount: Math.floor(m.ReputationScore / 150),
  ReputationScore: m.ReputationScore,
  OpenToPeerMentoring: m.Persona === 'Moderator' || m.Persona === 'Principal',
}));

/** Forum subscriptions across AGPA members (DeliveryLevel matches CK_ForumSubscription_DeliveryLevel). */
export const ARCH_FORUM_SUBSCRIPTIONS = [
  { ID: 'A7C40550-4E12-4B8F-9A10-000000000001', ForumID: 'A7C40200-4E12-4B8F-9A10-000000000005', UserID: 'A7C40400-4E12-4B8F-9A10-000000000001', DeliveryLevel: 'Every Post' },
  { ID: 'A7C40550-4E12-4B8F-9A10-000000000002', ForumID: 'A7C40200-4E12-4B8F-9A10-000000000002', UserID: 'A7C40400-4E12-4B8F-9A10-000000000001', DeliveryLevel: 'Digest Only' },
  { ID: 'A7C40550-4E12-4B8F-9A10-000000000003', ForumID: 'A7C40200-4E12-4B8F-9A10-000000000011', UserID: 'A7C40400-4E12-4B8F-9A10-000000000002', DeliveryLevel: 'Every Post' },
  { ID: 'A7C40550-4E12-4B8F-9A10-000000000004', ForumID: 'A7C40200-4E12-4B8F-9A10-000000000012', UserID: 'A7C40400-4E12-4B8F-9A10-000000000002', DeliveryLevel: 'Digest Only' },
  { ID: 'A7C40550-4E12-4B8F-9A10-000000000005', ForumID: 'A7C40200-4E12-4B8F-9A10-000000000006', UserID: 'A7C40400-4E12-4B8F-9A10-000000000005', DeliveryLevel: 'Every Post' },
  { ID: 'A7C40550-4E12-4B8F-9A10-000000000006', ForumID: 'A7C40200-4E12-4B8F-9A10-000000000007', UserID: 'A7C40400-4E12-4B8F-9A10-000000000005', DeliveryLevel: 'Digest Only' },
  { ID: 'A7C40550-4E12-4B8F-9A10-000000000007', ForumID: 'A7C40200-4E12-4B8F-9A10-000000000009', UserID: 'A7C40400-4E12-4B8F-9A10-000000000015', DeliveryLevel: 'Digest Only' },
  { ID: 'A7C40550-4E12-4B8F-9A10-000000000008', ForumID: 'A7C40200-4E12-4B8F-9A10-000000000010', UserID: 'A7C40400-4E12-4B8F-9A10-000000000015', DeliveryLevel: 'First Post Only' },
  { ID: 'A7C40550-4E12-4B8F-9A10-000000000009', ForumID: 'A7C40200-4E12-4B8F-9A10-000000000003', UserID: 'A7C40400-4E12-4B8F-9A10-000000000022', DeliveryLevel: 'Digest Only' },
  { ID: 'A7C40550-4E12-4B8F-9A10-000000000010', ForumID: 'A7C40200-4E12-4B8F-9A10-000000000001', UserID: 'A7C40400-4E12-4B8F-9A10-000000000025', DeliveryLevel: 'Digest Only' },
];

const POST_TYPE_ID_BY_CODE = Object.fromEntries(ARCH_POST_TYPES.map((p) => [p.Code, p.ID]));

function makePost(num, fields) {
  const id = `A7C40600-4E12-4B8F-9A10-${String(num).padStart(12, '0')}`;
  return {
    ID: id,
    ForumID: fields.ForumID,
    PostTypeID: POST_TYPE_ID_BY_CODE[fields.PostTypeCode],
    PostTypeCode: fields.PostTypeCode,
    RootPostID: fields.RootPostID ?? null,
    ParentPostID: fields.ParentPostID ?? null,
    ReplyDepth: fields.ReplyDepth ?? 0,
    AuthorUserID: fields.AuthorUserID,
    Title: fields.Title ?? null,
    Slug: fields.Slug ?? null,
    BodyMarkdown: fields.BodyMarkdown,
    SummaryMarkdown: fields.SummaryMarkdown ?? null,
    SummaryGeneratedAt: fields.SummaryGeneratedAt ?? null,
    SummaryReplyWatermark: fields.SummaryReplyWatermark ?? 0,
    VisibilityBand: fields.VisibilityBand ?? 'Shared',
    Status: fields.Status ?? 'Published',
    IsPinned: Boolean(fields.IsPinned),
    IsLocked: Boolean(fields.IsLocked),
    IsFeatured: Boolean(fields.IsFeatured),
    ReplyCount: fields.ReplyCount ?? 0,
    ParticipantCount: fields.ParticipantCount ?? 1,
    ReactionScore: fields.ReactionScore ?? 0,
    ViewCount: fields.ViewCount ?? 45,
    LastActivityAt: fields.LastActivityAt ?? '2026-11-19T16:00:00.000Z',
    CreatedAt: fields.CreatedAt ?? '2026-11-18T10:00:00.000Z',
    PromotedToSpaceID: null,
    LinkedTaskID: null,
  };
}

const F1_TOWN_SQUARE = 'A7C40200-4E12-4B8F-9A10-000000000001';
const F2_CODE_QA = 'A7C40200-4E12-4B8F-9A10-000000000002';
const F3_IDEATION = 'A7C40200-4E12-4B8F-9A10-000000000003';
const F4_AMAS = 'A7C40200-4E12-4B8F-9A10-000000000004';
const F5_TIMBER = 'A7C40200-4E12-4B8F-9A10-000000000005';
const F6_PASSIVE_QA = 'A7C40200-4E12-4B8F-9A10-000000000006';
const F7_PLAYBOOKS = 'A7C40200-4E12-4B8F-9A10-000000000007';
const F8_TIMBER_CASE = 'A7C40200-4E12-4B8F-9A10-000000000008';
const F9_ARE_QA = 'A7C40200-4E12-4B8F-9A10-000000000009';
const F10_EMERGING = 'A7C40200-4E12-4B8F-9A10-000000000010';
const F11_COUNSEL_QA = 'A7C40200-4E12-4B8F-9A10-000000000011';
const F12_COUNSEL_CASE = 'A7C40200-4E12-4B8F-9A10-000000000012';
const F13_COUNSEL_GENERAL = 'A7C40200-4E12-4B8F-9A10-000000000013';

const U = (n) => `A7C40400-4E12-4B8F-9A10-${String(n).padStart(12, '0')}`;
const P = (n) => `A7C40600-4E12-4B8F-9A10-${String(n).padStart(12, '0')}`;

/** 68 Posts & multi-turn threaded conversations covering ALL 13 PostType codes. */
export const ARCH_POSTS = [
  // --- Thread 1 (Posts 1..6): Hot 5-turn Mass Timber IBC 2027 Code Debate (for Synthesis + 1-Click Graduation) ---
  makePost(1, {
    ForumID: F5_TIMBER,
    PostTypeCode: 'discussion',
    AuthorUserID: U(1),
    Title: 'IBC 2027 Type IV-A/IV-B Exposed Mass Timber Ceiling Allowance & Acoustic Topping Debate',
    Slug: 'ibc-2027-type-iv-exposed-mass-timber-ceiling-debate',
    BodyMarkdown:
      'As the ICC cycle wraps on IBC 2027 Type IV-A and Type IV-B provisions, our Pacific Northwest studios are seeing diverging AHJ interpretations on the 20% to 40% exposed CLT ceiling allowance when paired with 2-inch gypsum concrete acoustic toppings. Should AGPA publish an engineering brief and convene a code-amendment working group?',
    ReplyCount: 5,
    ParticipantCount: 5,
    ReactionScore: 28,
    ViewCount: 412,
    IsPinned: true,
    IsFeatured: true,
    LastActivityAt: '2026-11-19T18:30:00.000Z',
  }),
  makePost(2, {
    ForumID: F5_TIMBER,
    PostTypeCode: 'reply',
    RootPostID: P(1),
    ParentPostID: P(1),
    ReplyDepth: 1,
    AuthorUserID: U(18),
    BodyMarkdown:
      'From the building official bench: ICC committee test data supports up to 40% exposed CLT ceiling area in Type IV-B when perimeter fire-stopping and sprinkler response times meet NFPA 13 quick-response spacing. Acoustic mat adhesive flame-spread ratings remain a critical submittal check.',
    LastActivityAt: '2026-11-19T15:10:00.000Z',
  }),
  makePost(3, {
    ForumID: F5_TIMBER,
    PostTypeCode: 'reply',
    RootPostID: P(1),
    ParentPostID: P(2),
    ReplyDepth: 2,
    AuthorUserID: U(6),
    BodyMarkdown:
      'Confirmed on structural diaphragm testing: 5-ply CLT panels with 1.5mm/min char rate maintain 2-hour load capacity without gypsum encapsulation on the bottom lamination, provided spline screws stay inside the 38mm char-protected core. Should we standardize the spline edge detail across seismic SDC D/E zones?',
    LastActivityAt: '2026-11-19T16:00:00.000Z',
  }),
  makePost(4, {
    ForumID: F5_TIMBER,
    PostTypeCode: 'reply',
    RootPostID: P(1),
    ParentPostID: P(3),
    ReplyDepth: 3,
    AuthorUserID: U(11),
    BodyMarkdown:
      'We measured IIC 58 and STC 56 using an 8mm recycled rubber acoustic mat beneath 50mm gypcrete over exposed 5-ply spruce-pine-fir CLT. Adding MEP hanger penetration collars early in Revit avoided all field firestop RFIs.',
    LastActivityAt: '2026-11-19T17:15:00.000Z',
  }),
  makePost(5, {
    ForumID: F5_TIMBER,
    PostTypeCode: 'reply',
    RootPostID: P(1),
    ParentPostID: P(4),
    ReplyDepth: 4,
    AuthorUserID: U(23),
    BodyMarkdown:
      'What remains unclear for mid-rise mixed-use podiums: how do state fire marshals treat exposed glulam transfer girders at the Type I-A to Type IV-B podium interface? We should include a podium transition checklist in the working group deliverables.',
    LastActivityAt: '2026-11-19T18:00:00.000Z',
  }),
  makePost(6, {
    ForumID: F5_TIMBER,
    PostTypeCode: 'comment',
    RootPostID: P(1),
    ParentPostID: P(1),
    ReplyDepth: 1,
    AuthorUserID: U(12),
    BodyMarkdown:
      'Strong vote to graduate this thread into a dedicated Mass Timber Code Amendment Working Group — acoustic assembly test reports from our Denver library project are ready to contribute.',
    LastActivityAt: '2026-11-19T18:30:00.000Z',
  }),

  // --- Thread 2 (Posts 7..10): Q&A Canon #1 — Mass Timber Char Rate & Fire Resistance ---
  makePost(7, {
    ForumID: F2_CODE_QA,
    PostTypeCode: 'question',
    AuthorUserID: U(11),
    Title: 'What fire-resistance rating and char-rate calculation governs exposed CLT floors under IBC 2027 Type IV-B?',
    Slug: 'fire-resistance-char-rate-exposed-clt-ibc-2027',
    BodyMarkdown:
      'Designing an 11-story mass timber residential tower under Type IV-B. Which AWC NDS Chapter 16 char-rate formula and lamination adhesive qualification governs exposed 5-ply CLT floor slabs?',
    Status: 'Answered',
    ReplyCount: 3,
    ParticipantCount: 3,
    ReactionScore: 21,
    LastActivityAt: '2026-11-19T14:00:00.000Z',
  }),
  makePost(8, {
    ForumID: F2_CODE_QA,
    PostTypeCode: 'answer',
    RootPostID: P(7),
    ParentPostID: P(7),
    ReplyDepth: 1,
    AuthorUserID: U(1),
    BodyMarkdown:
      'Under IBC 2027 Section 602.4.2 (Type IV-B), exposed 5-ply CLT floor assemblies require a 2-hour fire-resistance rating calculated per AWC NDS Chapter 16 using a nominal char rate of beta_n = 1.5 in/hr (effective char depth a_char = 1.2 * beta_n * t + 0.25 in zero-strength layer) AND ANSI/APA PRG 320 heat-delamination-resistant adhesives (2018 or later). Exposed ceiling area is capped at 40% of floor area per fire compartment when beams and columns remain protected or separated.',
    SummaryMarkdown: 'Type IV-B 2-hr CLT floors use NDS Ch.16 char rate 1.5 in/hr + PRG 320 heat-resistant adhesives.',
    ReactionScore: 19,
  }),
  makePost(9, {
    ForumID: F2_CODE_QA,
    PostTypeCode: 'answer',
    RootPostID: P(7),
    ParentPostID: P(7),
    ReplyDepth: 1,
    AuthorUserID: U(17),
    BodyMarkdown:
      'Older projects sometimes used 3-ply CLT with intumescent paint, though verify with your local plans examiner before specifying.',
    ReactionScore: 1,
  }),
  makePost(10, {
    ForumID: F2_CODE_QA,
    PostTypeCode: 'comment',
    RootPostID: P(7),
    ParentPostID: P(7),
    ReplyDepth: 1,
    AuthorUserID: U(18),
    BodyMarkdown:
      'Verified by ICC code bench: always attach the PRG 320 third-party flame-delamination certificate in the permit set.',
  }),

  // --- Thread 3 (Posts 11..14): Q&A Canon #2 — Passive House Thermal Bridging ---
  makePost(11, {
    ForumID: F6_PASSIVE_QA,
    PostTypeCode: 'question',
    AuthorUserID: U(9),
    Title: 'How do we eliminate thermal bridging at cantilevered steel balconies on Passive House CLT facades?',
    Slug: 'eliminate-thermal-bridging-cantilevered-balconies-passive-house',
    BodyMarkdown:
      'Our 6-story Passive House project uses CLT floor plates with exterior cantilevered steel balconies. Standard continuous steel outriggers fail our PHPP psi-value threshold. What structural thermal break assembly meets PHIUS/PHI certification?',
    Status: 'Answered',
    ReplyCount: 3,
    ParticipantCount: 3,
    ReactionScore: 17,
  }),
  makePost(12, {
    ForumID: F6_PASSIVE_QA,
    PostTypeCode: 'answer',
    RootPostID: P(11),
    ParentPostID: P(11),
    ReplyDepth: 1,
    AuthorUserID: U(5),
    BodyMarkdown:
      'Use a structural thermal break connector module (e.g., high-density structural XPS/aerogel compression pad with stainless tension/shear rods) aligned precisely with the continuous exterior mineral wool insulation plane, OR decouple balconies onto independent exterior steel frames with isolated lateral tie-backs. Maintain linear transmittance psi <= 0.01 W/(m*K) and verify interior surface temperature factor f_Rsi >= 0.75 in THERM.',
    ReactionScore: 16,
  }),
  makePost(13, {
    ForumID: F6_PASSIVE_QA,
    PostTypeCode: 'answer',
    RootPostID: P(11),
    ParentPostID: P(11),
    ReplyDepth: 1,
    AuthorUserID: U(14),
    BodyMarkdown:
      'Some teams wrap cantilevered steel I-beams in 1-inch neoprene sheets, though newer PHIUS guidance considers that insufficient for cold climates.',
    ReactionScore: 0,
  }),
  makePost(14, {
    ForumID: F6_PASSIVE_QA,
    PostTypeCode: 'comment',
    RootPostID: P(11),
    ParentPostID: P(11),
    ReplyDepth: 1,
    AuthorUserID: U(23),
    BodyMarkdown:
      'Also tape the airtight membrane collar around stainless tension rods prior to exterior mineral wool installation.',
  }),

  // --- Thread 4 (Posts 15..17): Q&A Canon #3 — AIA Contracts & Risk (Team-Band Space 4!) ---
  makePost(15, {
    ForumID: F11_COUNSEL_QA,
    PostTypeCode: 'question',
    AuthorUserID: U(3),
    Title: 'Under AIA A201 Article 4, when does an Architect RFI review shift liability for means and methods?',
    Slug: 'aia-a201-rfi-review-liability-means-and-methods',
    BodyMarkdown:
      'During construction administration on a municipal design-bid-build library, the contractor submitted an RFI asking us to prescribe shoring sequence and temporary bracing loads. How should our response preserve AIA B101/A201 standard-of-care boundaries?',
    VisibilityBand: 'Team',
    Status: 'Answered',
    ReplyCount: 2,
    ParticipantCount: 3,
    ReactionScore: 24,
    LastActivityAt: '2026-11-19T17:45:00.000Z',
  }),
  makePost(16, {
    ForumID: F11_COUNSEL_QA,
    PostTypeCode: 'answer',
    RootPostID: P(15),
    ParentPostID: P(15),
    ReplyDepth: 1,
    AuthorUserID: U(2),
    BodyMarkdown:
      'Under AIA A201 Section 3.3.1 and Section 4.2.2, construction means, methods, techniques, sequences, and safety programs remain solely the Contractor responsibility. Never prescribe shoring geometry or temporary bracing member sizes in an RFI response. Reply citing design intent loads and direct the Contractor to engage a delegated licensed temporary-works engineer (PE/SE) for sealed shoring submittals.',
    VisibilityBand: 'Team',
    ReactionScore: 22,
  }),
  makePost(17, {
    ForumID: F11_COUNSEL_QA,
    PostTypeCode: 'comment',
    RootPostID: P(15),
    ParentPostID: P(15),
    ReplyDepth: 1,
    AuthorUserID: U(20),
    BodyMarkdown:
      'Agreed — our firm keeps a standard boilerplate disclaimer header on every CA RFI stamp referencing A201 3.3.1 and B101 3.6.2.1.',
    VisibilityBand: 'Team',
  }),

  // --- Thread 5 (Posts 18..20): Q&A Canon #4 — ARE 5.0 Licensure ---
  makePost(18, {
    ForumID: F9_ARE_QA,
    PostTypeCode: 'question',
    AuthorUserID: U(15),
    Title: 'How should emerging associates sequence PPD and PDD exams under updated NCARB ARE 5.0 objectives?',
    Slug: 'sequence-ppd-and-pdd-ncarb-are-5-0',
    BodyMarkdown:
      'I finished PcM, PjM, and PA. Should I take Project Planning & Design (PPD) and Project Development & Documentation (PDD) back-to-back within 3 weeks due to overlapping structural, MEP, and detailing content?',
    Status: 'Answered',
    ReplyCount: 2,
    ParticipantCount: 3,
    ReactionScore: 15,
  }),
  makePost(19, {
    ForumID: F9_ARE_QA,
    PostTypeCode: 'answer',
    RootPostID: P(18),
    ParentPostID: P(18),
    ReplyDepth: 1,
    AuthorUserID: U(24),
    BodyMarkdown:
      'Yes — scheduling PPD and PDD 14 to 21 days apart maximizes retention because roughly 60% of the building systems, IBC egress/fire ratings, and envelope assembly fundamentals overlap. Focus PPD on schematic code/system selection and dedicate the gap weeks to PDD CSI MasterFormat specs, detail redlines, and structural sizing.',
    ReactionScore: 14,
  }),
  makePost(20, {
    ForumID: F9_ARE_QA,
    PostTypeCode: 'comment',
    RootPostID: P(18),
    ParentPostID: P(18),
    ReplyDepth: 1,
    AuthorUserID: U(16),
    BodyMarkdown:
      'Confirming this worked for our Minneapolis study cohort — 4 out of 5 candidates passed both on the first attempt with a 2-week gap.',
  }),

  // --- Thread 6 (Posts 21..23): Q&A Canon #5 — BIM/Revit & MEP Coordination ---
  makePost(21, {
    ForumID: F10_EMERGING,
    PostTypeCode: 'question',
    AuthorUserID: U(17),
    Title: 'Best practice for IFC 4.3 clash detection tolerances between structural glulam beams and MEP ductwork?',
    Slug: 'ifc-43-clash-detection-tolerances-glulam-mep',
    BodyMarkdown:
      'Setting up Navisworks/Solibri clash rules for a mass timber civic campus. What clearance tolerances prevent false positives without missing real sleeve conflicts in pre-drilled glulam beams?',
    Status: 'Answered',
    ReplyCount: 2,
    ParticipantCount: 2,
    ReactionScore: 11,
  }),
  makePost(22, {
    ForumID: F10_EMERGING,
    PostTypeCode: 'answer',
    RootPostID: P(21),
    ParentPostID: P(21),
    ReplyDepth: 1,
    AuthorUserID: U(7),
    BodyMarkdown:
      'Run two tiered clash sets in IFC 4.3: (1) Hard clash at 0mm tolerance for glulam structural zones vs duct/pipe outer insulation shells, and (2) Soft clearance clash at 50mm (2 inches) around beam daps and knife-plate zones so CNC timber fabricators can pre-cut factory penetrations with structural engineer sign-off.',
    ReactionScore: 12,
  }),
  makePost(23, {
    ForumID: F10_EMERGING,
    PostTypeCode: 'comment',
    RootPostID: P(21),
    ParentPostID: P(21),
    ReplyDepth: 1,
    AuthorUserID: U(10),
    BodyMarkdown:
      'Also lock MEP penetration freeze milestones 6 weeks prior to CLT/glulam CNC mill release.',
  }),

  // --- Thread 7 (Posts 24..28): Deep 4-turn Adaptive Reuse & Zoning Discussion (Town Square) ---
  makePost(24, {
    ForumID: F1_TOWN_SQUARE,
    PostTypeCode: 'discussion',
    AuthorUserID: U(4),
    Title: 'Office-to-Residential Adaptive Reuse: Deep Floorplate Daylight Wells & Energy Code Triggers',
    Slug: 'office-to-residential-adaptive-reuse-daylight-wells',
    BodyMarkdown:
      'Converting 1980s 42,000 sq ft floorplates into housing requires carving interior lightwells or single-loaded atriums. How are chapters navigating state energy code envelope triggers when >50% of curtain wall is retained?',
    ReplyCount: 4,
    ParticipantCount: 5,
    ReactionScore: 19,
  }),
  makePost(25, {
    ForumID: F1_TOWN_SQUARE,
    PostTypeCode: 'reply',
    RootPostID: P(24),
    ParentPostID: P(24),
    ReplyDepth: 1,
    AuthorUserID: U(21),
    BodyMarkdown:
      'Austin recently adopted an adaptive-reuse zoning overlay waiving minimum parking ratios and allowing interior lightwells to count toward open-space credit without triggering full setback variances.',
  }),
  makePost(26, {
    ForumID: F1_TOWN_SQUARE,
    PostTypeCode: 'reply',
    RootPostID: P(24),
    ParentPostID: P(25),
    ReplyDepth: 2,
    AuthorUserID: U(14),
    BodyMarkdown:
      'On the envelope side, interior secondary storm glazing coupled with decentralized ERVs keeps existing travertine/precast facades intact while slashing heating load by 58%.',
  }),
  makePost(27, {
    ForumID: F1_TOWN_SQUARE,
    PostTypeCode: 'reply',
    RootPostID: P(24),
    ParentPostID: P(26),
    ReplyDepth: 3,
    AuthorUserID: U(19),
    BodyMarkdown:
      'Watch change-of-occupancy seismic triggers under IEBC Chapter 10 — carving a central atrium can reduce diaphragm continuity unless you add drag struts around the new opening.',
  }),
  makePost(28, {
    ForumID: F1_TOWN_SQUARE,
    PostTypeCode: 'comment',
    RootPostID: P(24),
    ParentPostID: P(24),
    ReplyDepth: 1,
    AuthorUserID: U(16),
    BodyMarkdown:
      'Great breakdown — saving these IEBC diaphragm notes for our Minneapolis warehouse conversion.',
  }),

  // --- Thread 8 (Posts 29..31): Team-Band Principal Governance & Succession Discussion (Space 4) ---
  makePost(29, {
    ForumID: F13_COUNSEL_GENERAL,
    PostTypeCode: 'discussion',
    AuthorUserID: U(2),
    Title: 'AIA B101 AI-Assisted Deliverable Indemnification & Firm Ownership Succession Benchmarks 2027',
    Slug: 'aia-b101-ai-deliverable-indemnification-succession-2027',
    BodyMarkdown:
      'Confidential counsel benchmark for managing principals: two recent RFP riders demanded uncapped IP warranty over AI-assisted conceptual renderings, plus we are calibrating 10-year internal equity buyout multiples for next-gen principals.',
    VisibilityBand: 'Team',
    ReplyCount: 2,
    ParticipantCount: 3,
    ReactionScore: 18,
    LastActivityAt: '2026-11-19T17:50:00.000Z',
  }),
  makePost(30, {
    ForumID: F13_COUNSEL_GENERAL,
    PostTypeCode: 'reply',
    RootPostID: P(29),
    ParentPostID: P(29),
    ReplyDepth: 1,
    AuthorUserID: U(3),
    BodyMarkdown:
      'Strike any "warrants and guarantees" language on AI visualizations immediately — professional liability carriers exclude express warranties beyond standard of care. Restrict early AI massing studies to non-contractual conceptual exhibits.',
    VisibilityBand: 'Team',
  }),
  makePost(31, {
    ForumID: F13_COUNSEL_GENERAL,
    PostTypeCode: 'reply',
    RootPostID: P(29),
    ParentPostID: P(30),
    ReplyDepth: 2,
    AuthorUserID: U(20),
    BodyMarkdown:
      'For firm succession, our Northeast council survey shows 0.65x to 0.85x net operating revenue valuation with 7-year seller-financed notes keeps associate buy-in viable.',
    VisibilityBand: 'Team',
  }),

  // --- Ideation Campaign (Posts 32..36): 5 Idea Proposals + 6 Discussion Replies (Posts 37..42) ---
  makePost(32, {
    ForumID: F3_IDEATION,
    PostTypeCode: 'idea-proposal',
    AuthorUserID: U(1),
    Title: 'Publish Open-Source Mass Timber Connection & Acoustic Assembly Detail Library',
    Slug: 'open-source-mass-timber-connection-acoustic-library',
    BodyMarkdown:
      'Curate peer-reviewed Revit, IFC, and CAD detail sheets for Type IV-A/IV-B exposed CLT ceiling acoustic toppings, concealed knife plates, and fire-rated spline joints.',
    ReplyCount: 2,
    ParticipantCount: 3,
    ReactionScore: 34,
  }),
  makePost(33, {
    ForumID: F3_IDEATION,
    PostTypeCode: 'idea-proposal',
    AuthorUserID: U(2),
    Title: 'Standardize AIA AI-Rendering & Generative Model Disclosure Rider (B101 Exhibit)',
    Slug: 'standardize-aia-ai-rendering-disclosure-rider',
    BodyMarkdown:
      'Draft an AGPA model contract exhibit clarifying copyright ownership, standard-of-care boundaries, and client disclosure for generative AI visualization tools.',
    ReplyCount: 1,
    ParticipantCount: 2,
    ReactionScore: 27,
  }),
  makePost(34, {
    ForumID: F3_IDEATION,
    PostTypeCode: 'idea-proposal',
    AuthorUserID: U(5),
    Title: 'Launch Multi-State Reciprocal Fast-Track Compact for Passive House Certifiers',
    Slug: 'reciprocal-fast-track-passive-house-compact',
    BodyMarkdown:
      'Partner with municipal building departments to establish expedited permit queues for PHIUS/PHI pre-certified net-zero retrofit submissions.',
    ReplyCount: 1,
    ParticipantCount: 2,
    ReactionScore: 22,
  }),
  makePost(35, {
    ForumID: F3_IDEATION,
    PostTypeCode: 'idea-proposal',
    AuthorUserID: U(13),
    Title: 'Create National Embodied Carbon EPD Benchmark Database for Structural Concrete & CLT',
    Slug: 'national-embodied-carbon-epd-benchmark-database',
    BodyMarkdown:
      'Aggregate anonymized regional Type III Environmental Product Declarations so project architects can benchmark structural embodied carbon in schematic design.',
    ReplyCount: 1,
    ParticipantCount: 2,
    ReactionScore: 19,
  }),
  makePost(36, {
    ForumID: F3_IDEATION,
    PostTypeCode: 'idea-proposal',
    AuthorUserID: U(24),
    Title: 'Subsidize ARE 5.0 Exam Prep Grants for First-Generation Emerging Associates',
    Slug: 'subsidize-are-exam-prep-grants-emerging-associates',
    BodyMarkdown:
      'Fund 150 annual NCARB exam seat reimbursements and mentor-led PPD/PDD bootcamps for underrepresented emerging professionals.',
    ReplyCount: 1,
    ParticipantCount: 2,
    ReactionScore: 25,
  }),
  makePost(37, { ForumID: F3_IDEATION, PostTypeCode: 'reply', RootPostID: P(32), ParentPostID: P(32), ReplyDepth: 1, AuthorUserID: U(6), BodyMarkdown: 'We can contribute 14 tested shear-wall hold-down families for the initial Revit 2026 release.' }),
  makePost(38, { ForumID: F3_IDEATION, PostTypeCode: 'reply', RootPostID: P(32), ParentPostID: P(37), ReplyDepth: 2, AuthorUserID: U(23), BodyMarkdown: 'Let us also include STC/IIC lab test certificates next to each floor assembly detail.' }),
  makePost(39, { ForumID: F3_IDEATION, PostTypeCode: 'reply', RootPostID: P(33), ParentPostID: P(33), ReplyDepth: 1, AuthorUserID: U(8), BodyMarkdown: 'Strongly support separating conceptual AI moodboards from stamped construction documents in the rider.' }),
  makePost(40, { ForumID: F3_IDEATION, PostTypeCode: 'reply', RootPostID: P(34), ParentPostID: P(34), ReplyDepth: 1, AuthorUserID: U(9), BodyMarkdown: 'Boston and Seattle already cut review time by 4 weeks for pre-verified airtightness packages.' }),
  makePost(41, { ForumID: F3_IDEATION, PostTypeCode: 'reply', RootPostID: P(35), ParentPostID: P(35), ReplyDepth: 1, AuthorUserID: U(11), BodyMarkdown: 'Regional EPD variance for Northwest glulam vs Midwest concrete will save huge spec research hours.' }),
  makePost(42, { ForumID: F3_IDEATION, PostTypeCode: 'reply', RootPostID: P(36), ParentPostID: P(36), ReplyDepth: 1, AuthorUserID: U(15), BodyMarkdown: 'Exam fee reimbursement is the #1 barrier our emerging associates cite at chapter town halls.' }),

  // --- Poll / Form (Posts 43..44) ---
  makePost(43, {
    ForumID: F3_IDEATION,
    PostTypeCode: 'poll-or-form',
    AuthorUserID: U(22),
    Title: '2027 AGPA Annual Practice Symposium: Select Priority Technical Track',
    Slug: '2027-agpa-symposium-priority-technical-track',
    BodyMarkdown:
      'Vote for the flagship workshop track at the 2027 AGPA Symposium: (A) Tall Mass Timber & IBC 2027, (B) Deep Net-Zero & Passive House Retrofits, (C) AI Computational BIM & Delivery, or (D) AIA Risk & Firm Succession.',
    ReplyCount: 1,
    ReactionScore: 14,
  }),
  makePost(44, {
    ForumID: F3_IDEATION,
    PostTypeCode: 'reply',
    RootPostID: P(43),
    ParentPostID: P(43),
    ReplyDepth: 1,
    AuthorUserID: U(4),
    BodyMarkdown: 'Voted for Deep Net-Zero & Adaptive Reuse — especially case studies combining IEBC seismic upgrades with Passive House retrofits.',
  }),

  // --- Living Playbooks & Collaborative Docs (Posts 45..50): doc, sheet, deck + reviews ---
  makePost(45, {
    ForumID: F7_PLAYBOOKS,
    PostTypeCode: 'collaborative-doc',
    AuthorUserID: U(23),
    Title: 'AGPA Mass Timber Moisture Management & Site Protection Playbook v2.4',
    Slug: 'agpa-mass-timber-moisture-management-playbook',
    BodyMarkdown:
      'Living co-authored field protocol covering end-grain wax sealers, temporary roof membranes, pin-meter moisture logging (<16% MC before enclosure), and rain-event drying fans.',
    ReplyCount: 3,
    ParticipantCount: 4,
    ReactionScore: 26,
  }),
  makePost(46, { ForumID: F7_PLAYBOOKS, PostTypeCode: 'comment', RootPostID: P(45), ParentPostID: P(45), ReplyDepth: 1, AuthorUserID: U(6), BodyMarkdown: 'Added Section 4.2 specifying breathable vapor-open protective wraps over spline joints prior to topping pour.' }),
  makePost(47, { ForumID: F7_PLAYBOOKS, PostTypeCode: 'reply', RootPostID: P(45), ParentPostID: P(45), ReplyDepth: 1, AuthorUserID: U(10), BodyMarkdown: 'Included sample CA moisture-log spreadsheet template for weekly OAC meeting minutes.' }),
  makePost(48, { ForumID: F7_PLAYBOOKS, PostTypeCode: 'comment', RootPostID: P(45), ParentPostID: P(45), ReplyDepth: 1, AuthorUserID: U(1), BodyMarkdown: 'Approved for v2.4 release — ready for Pacific Northwest winter erection schedules.' }),

  makePost(49, {
    ForumID: F7_PLAYBOOKS,
    PostTypeCode: 'collaborative-sheet',
    AuthorUserID: U(13),
    Title: '2026-2027 Regional Embodied Carbon & CLT Cost per SqFt Benchmark Matrix',
    Slug: 'regional-embodied-carbon-clt-cost-matrix',
    BodyMarkdown:
      'Co-edited workbook comparing kgCO2e/m2 (A1-A3) and installed $/sf across 5-ply CLT, post-tensioned concrete, and composite steel bays across 6 US regions.',
    ReactionScore: 21,
  }),
  makePost(50, {
    ForumID: F7_PLAYBOOKS,
    PostTypeCode: 'collaborative-deck',
    AuthorUserID: U(21),
    Title: 'Municipal Zoning Variance & Adaptive Reuse Planning Board Briefing Deck',
    Slug: 'municipal-zoning-variance-adaptive-reuse-deck',
    BodyMarkdown:
      'Editable slide deck for architects presenting missing-middle height/FAR variance requests and adaptive reuse daylight exceptions to municipal planning commissions.',
    ReactionScore: 16,
  }),

  // --- Peer Case Rounds (Posts 51..56): 2 case-review threads across Space 2 & Space 4 ---
  makePost(51, {
    ForumID: F8_TIMBER_CASE,
    PostTypeCode: 'case-review',
    AuthorUserID: U(11),
    Title: 'Case Review: Delamination Remediation on Exposed 5-Ply Douglas Fir CLT Roof Deck After Rain Event',
    Slug: 'case-review-clt-roof-delamination-remediation',
    BodyMarkdown:
      'Situation: Unexpected 72-hour coastal storm penetrated temporary roof seams before enclosure, elevating surface MC to 24%. Action: Tenting, desiccant dehumidification, core moisture probes, and pull-off shear verification. Outcome: Zero structural replacement required; preserved exposed soffit finish.',
    ReplyCount: 3,
    ParticipantCount: 4,
    ReactionScore: 23,
  }),
  makePost(52, { ForumID: F8_TIMBER_CASE, PostTypeCode: 'reply', RootPostID: P(51), ParentPostID: P(51), ReplyDepth: 1, AuthorUserID: U(6), BodyMarkdown: 'Pull-off tensile testing per ASTM D4541 gave the EOR hard proof that PRG 320 bondlines remained intact.' }),
  makePost(53, { ForumID: F8_TIMBER_CASE, PostTypeCode: 'reply', RootPostID: P(51), ParentPostID: P(52), ReplyDepth: 2, AuthorUserID: U(5), BodyMarkdown: 'Did you allow 14 days of open ventilation before applying the vapor-open ceiling finish?' }),
  makePost(54, { ForumID: F8_TIMBER_CASE, PostTypeCode: 'comment', RootPostID: P(51), ParentPostID: P(51), ReplyDepth: 1, AuthorUserID: U(11), BodyMarkdown: 'Yes — held finish application until core resistance pins read <= 13% across all bays.' }),

  makePost(55, {
    ForumID: F12_COUNSEL_CASE,
    PostTypeCode: 'case-review',
    AuthorUserID: U(2),
    Title: 'Case Review (Anonymized): Owner-Directed Value Engineering Substitution & Acoustic Claim',
    Slug: 'case-review-owner-ve-substitution-acoustic-claim',
    BodyMarkdown:
      'Situation: Owner directed elimination of acoustic isolation clips during VE over written architect objection. Action: Recorded signed VE risk acceptance memo under B101. Outcome: Post-occupancy STC claim resolved without architect indemnity exposure.',
    VisibilityBand: 'Team',
    ReplyCount: 1,
    ReactionScore: 19,
  }),
  makePost(56, {
    ForumID: F12_COUNSEL_CASE,
    PostTypeCode: 'reply',
    RootPostID: P(55),
    ParentPostID: P(55),
    ReplyDepth: 1,
    AuthorUserID: U(3),
    BodyMarkdown: 'Written VE rejection logs with owner counter-signature are worth their weight in gold.',
    VisibilityBand: 'Team',
  }),

  // --- Live Events & AMAs (Posts 57..63): 2 live-ama threads + pre-submitted Q&A ---
  makePost(57, {
    ForumID: F4_AMAS,
    PostTypeCode: 'live-ama',
    AuthorUserID: U(18),
    Title: 'Live AMA: Inside IBC 2027 Mass Timber, Egress & Seismic Diaphragm Code Updates',
    Slug: 'ama-ibc-2027-mass-timber-egress-seismic',
    BodyMarkdown:
      'Ask the ICC Type IV code committee chair and structural timber leads anything about IBC 2027 tall wood provisions, stair pressurization, and mixed-use podium separations.',
    ReplyCount: 4,
    ParticipantCount: 5,
    ReactionScore: 31,
  }),
  makePost(58, { ForumID: F4_AMAS, PostTypeCode: 'reply', RootPostID: P(57), ParentPostID: P(57), ReplyDepth: 1, AuthorUserID: U(12), Title: 'Will IBC 2027 allow exposed CLT stair shafts in Type IV-C?', BodyMarkdown: 'Clarifying whether exit enclosure shaft walls still require 2-hr noncombustible gypsum encapsulation.' }),
  makePost(59, { ForumID: F4_AMAS, PostTypeCode: 'reply', RootPostID: P(57), ParentPostID: P(58), ReplyDepth: 2, AuthorUserID: U(18), BodyMarkdown: 'Exit stair enclosures remain encapsulated with Type X gypsum; exposed allowances apply to primary floor soffits and select framing.' }),
  makePost(60, { ForumID: F4_AMAS, PostTypeCode: 'reply', RootPostID: P(57), ParentPostID: P(57), ReplyDepth: 1, AuthorUserID: U(19), BodyMarkdown: 'Seismic drift compatibility checks for perimeter curtain wall anchors on tall timber cores are also clarified in Ch. 16.' }),
  makePost(61, { ForumID: F4_AMAS, PostTypeCode: 'comment', RootPostID: P(57), ParentPostID: P(57), ReplyDepth: 1, AuthorUserID: U(22), BodyMarkdown: 'Transcript and key code section citations pinned for post-AMA digest.' }),

  makePost(62, {
    ForumID: F4_AMAS,
    PostTypeCode: 'live-ama',
    AuthorUserID: U(20),
    Title: 'Town Hall: Architect Practice Economics, Public Procurement & Fee Resilience in 2027',
    Slug: 'town-hall-practice-economics-procurement-2027',
    BodyMarkdown:
      'Quarterly guild town hall reviewing municipal QBS procurement reform, AI studio billing models, and sustainable staffing utilization.',
    ReplyCount: 1,
    ReactionScore: 17,
  }),
  makePost(63, { ForumID: F4_AMAS, PostTypeCode: 'reply', RootPostID: P(62), ParentPostID: P(62), ReplyDepth: 1, AuthorUserID: U(21), BodyMarkdown: 'Southwest chapter QBS legislative toolkit is ready for member download.' }),

  // --- Interactive Experience (Posts 64..65) ---
  makePost(64, {
    ForumID: F1_TOWN_SQUARE,
    PostTypeCode: 'interactive-experience',
    AuthorUserID: U(22),
    Title: 'IBC 2027 Type IV-A/B/C Fire & Structural Detailing Readiness Challenge',
    Slug: 'ibc-2027-type-iv-readiness-challenge',
    BodyMarkdown:
      'Interactive 8-scenario guild challenge testing your mastery of exposed CLT ceilings, char depths, PRG 320 adhesives, and seismic diaphragm ties.',
    ReplyCount: 1,
    ReactionScore: 20,
  }),
  makePost(65, {
    ForumID: F1_TOWN_SQUARE,
    PostTypeCode: 'comment',
    RootPostID: P(64),
    ParentPostID: P(64),
    ReplyDepth: 1,
    AuthorUserID: U(15),
    BodyMarkdown: 'Scored 95 on my second run — great prep for PPD/PDD structural code questions!',
  }),

  // --- Locked Historical Policy Thread (Post 66) + Additional Architectural Threads (Posts 67..68) ---
  makePost(66, {
    ForumID: F1_TOWN_SQUARE,
    PostTypeCode: 'discussion',
    AuthorUserID: U(22),
    Title: 'Archived Policy: 2025 Guild Ethics & AI Attribution Charter (Locked)',
    Slug: 'archived-2025-guild-ethics-ai-charter-locked',
    BodyMarkdown:
      'Ratified 2025 charter retained as historical reference. Direct replies are locked; please post 2027 amendment proposals in the Ideation forum.',
    IsLocked: true,
    Status: 'Published',
    ReactionScore: 12,
  }),
  makePost(67, {
    ForumID: F1_TOWN_SQUARE,
    PostTypeCode: 'discussion',
    AuthorUserID: U(12),
    Title: 'Historic Masonry Preservation Meets Net-Zero Interior Storm Windows in Civic Libraries',
    Slug: 'historic-masonry-preservation-net-zero-civic-libraries',
    BodyMarkdown:
      'Sharing hygrothermal WUFI modeling results for 1920s brick Carnegie libraries retrofitted with interior low-e acoustic storm panels without freeze-thaw spalling.',
    ReactionScore: 16,
  }),
  makePost(68, {
    ForumID: F10_EMERGING,
    PostTypeCode: 'discussion',
    AuthorUserID: U(8),
    Title: 'AI Rendering Provenance & Client Attribution Guidelines for Concept Design Studio Reviews',
    Slug: 'ai-rendering-provenance-guidelines-concept-studio',
    BodyMarkdown:
      'How emerging designers document prompt provenance, material accuracy disclaimers, and daylighting simulation caveats during municipal design review boards.',
    ReactionScore: 14,
  }),
];

/** Subtype records for Questions (ForumQuestionPost). */
export const ARCH_QUESTION_POSTS = [
  { ID: P(7), AcceptedAnswerPostID: P(8), AICanonAnswerPostID: P(8), BountyPoints: 50, ResolvedAt: '2026-11-18T18:00:00.000Z' },
  { ID: P(11), AcceptedAnswerPostID: P(12), AICanonAnswerPostID: P(12), BountyPoints: 25, ResolvedAt: '2026-11-18T19:00:00.000Z' },
  { ID: P(15), AcceptedAnswerPostID: P(16), AICanonAnswerPostID: P(16), BountyPoints: 0, ResolvedAt: '2026-11-19T12:00:00.000Z' },
  { ID: P(18), AcceptedAnswerPostID: P(19), AICanonAnswerPostID: P(19), BountyPoints: 15, ResolvedAt: '2026-11-18T20:00:00.000Z' },
  { ID: P(21), AcceptedAnswerPostID: P(22), AICanonAnswerPostID: P(22), BountyPoints: 20, ResolvedAt: '2026-11-19T09:00:00.000Z' },
];

/** Subtype records for Answers (ForumAnswerPost). */
export const ARCH_ANSWER_POSTS = [
  { ID: P(8), QuestionPostID: P(7), IsAcceptedByAuthor: true, IsVerifiedByModerator: true, VerifiedByUserID: U(22), AIEpistemicStatus: 'Canon Verified', AIConfidenceScore: 0.96 },
  { ID: P(9), QuestionPostID: P(7), IsAcceptedByAuthor: false, IsVerifiedByModerator: false, VerifiedByUserID: null, AIEpistemicStatus: 'Partially Outdated', AIConfidenceScore: 0.42 },
  { ID: P(12), QuestionPostID: P(11), IsAcceptedByAuthor: true, IsVerifiedByModerator: true, VerifiedByUserID: U(23), AIEpistemicStatus: 'Canon Verified', AIConfidenceScore: 0.94 },
  { ID: P(13), QuestionPostID: P(11), IsAcceptedByAuthor: false, IsVerifiedByModerator: false, VerifiedByUserID: null, AIEpistemicStatus: 'Partially Outdated', AIConfidenceScore: 0.35 },
  { ID: P(16), QuestionPostID: P(15), IsAcceptedByAuthor: true, IsVerifiedByModerator: true, VerifiedByUserID: U(2), AIEpistemicStatus: 'Canon Verified', AIConfidenceScore: 0.97 },
  { ID: P(19), QuestionPostID: P(18), IsAcceptedByAuthor: true, IsVerifiedByModerator: true, VerifiedByUserID: U(24), AIEpistemicStatus: 'Canon Verified', AIConfidenceScore: 0.93 },
  { ID: P(22), QuestionPostID: P(21), IsAcceptedByAuthor: true, IsVerifiedByModerator: true, VerifiedByUserID: U(24), AIEpistemicStatus: 'Canon Verified', AIConfidenceScore: 0.91 },
];

/** Quadratic Ideation Campaign configuration. */
export const ARCH_IDEA_CAMPAIGNS = [
  {
    ID: F3_IDEATION,
    DefaultBudgetPoints: 100,
    AllocationMode: 'Quadratic',
    MaxPointsPerIdea: 49,
  },
];

/** 25 Quadratic Ideation allocations across 21 distinct AGPA members (all <= 100 budget, <= 49 per idea). */
export const ARCH_IDEA_ALLOCATIONS = [
  // Idea P(32) — Mass Timber Detail Library (10 backers)
  { ID: 'A7C40700-4E12-4B8F-9A10-000000000001', IdeaPostID: P(32), UserID: U(1), PointsAllocated: 36, QuadraticVotes: 6 },
  { ID: 'A7C40700-4E12-4B8F-9A10-000000000002', IdeaPostID: P(32), UserID: U(6), PointsAllocated: 49, QuadraticVotes: 7 },
  { ID: 'A7C40700-4E12-4B8F-9A10-000000000003', IdeaPostID: P(32), UserID: U(11), PointsAllocated: 36, QuadraticVotes: 6 },
  { ID: 'A7C40700-4E12-4B8F-9A10-000000000004', IdeaPostID: P(32), UserID: U(12), PointsAllocated: 25, QuadraticVotes: 5 },
  { ID: 'A7C40700-4E12-4B8F-9A10-000000000005', IdeaPostID: P(32), UserID: U(18), PointsAllocated: 25, QuadraticVotes: 5 },
  { ID: 'A7C40700-4E12-4B8F-9A10-000000000006', IdeaPostID: P(32), UserID: U(19), PointsAllocated: 16, QuadraticVotes: 4 },
  { ID: 'A7C40700-4E12-4B8F-9A10-000000000007', IdeaPostID: P(32), UserID: U(23), PointsAllocated: 25, QuadraticVotes: 5 },
  { ID: 'A7C40700-4E12-4B8F-9A10-000000000008', IdeaPostID: P(32), UserID: U(7), PointsAllocated: 16, QuadraticVotes: 4 },
  { ID: 'A7C40700-4E12-4B8F-9A10-000000000009', IdeaPostID: P(32), UserID: U(10), PointsAllocated: 9, QuadraticVotes: 3 },
  { ID: 'A7C40700-4E12-4B8F-9A10-000000000010', IdeaPostID: P(32), UserID: U(22), PointsAllocated: 25, QuadraticVotes: 5 },
  // Idea P(33) — AIA AI-Rendering Disclosure Rider (5 backers)
  { ID: 'A7C40700-4E12-4B8F-9A10-000000000011', IdeaPostID: P(33), UserID: U(2), PointsAllocated: 49, QuadraticVotes: 7 },
  { ID: 'A7C40700-4E12-4B8F-9A10-000000000012', IdeaPostID: P(33), UserID: U(3), PointsAllocated: 36, QuadraticVotes: 6 },
  { ID: 'A7C40700-4E12-4B8F-9A10-000000000013', IdeaPostID: P(33), UserID: U(8), PointsAllocated: 25, QuadraticVotes: 5 },
  { ID: 'A7C40700-4E12-4B8F-9A10-000000000014', IdeaPostID: P(33), UserID: U(20), PointsAllocated: 36, QuadraticVotes: 6 },
  { ID: 'A7C40700-4E12-4B8F-9A10-000000000015', IdeaPostID: P(33), UserID: U(22), PointsAllocated: 16, QuadraticVotes: 4 },
  // Idea P(34) — Passive House Fast-Track Compact (4 backers)
  { ID: 'A7C40700-4E12-4B8F-9A10-000000000016', IdeaPostID: P(34), UserID: U(5), PointsAllocated: 49, QuadraticVotes: 7 },
  { ID: 'A7C40700-4E12-4B8F-9A10-000000000017', IdeaPostID: P(34), UserID: U(9), PointsAllocated: 36, QuadraticVotes: 6 },
  { ID: 'A7C40700-4E12-4B8F-9A10-000000000018', IdeaPostID: P(34), UserID: U(14), PointsAllocated: 25, QuadraticVotes: 5 },
  { ID: 'A7C40700-4E12-4B8F-9A10-000000000019', IdeaPostID: P(34), UserID: U(21), PointsAllocated: 16, QuadraticVotes: 4 },
  // Idea P(35) — Embodied Carbon EPD Database (3 backers)
  { ID: 'A7C40700-4E12-4B8F-9A10-000000000020', IdeaPostID: P(35), UserID: U(13), PointsAllocated: 49, QuadraticVotes: 7 },
  { ID: 'A7C40700-4E12-4B8F-9A10-000000000021', IdeaPostID: P(35), UserID: U(4), PointsAllocated: 25, QuadraticVotes: 5 },
  { ID: 'A7C40700-4E12-4B8F-9A10-000000000022', IdeaPostID: P(35), UserID: U(1), PointsAllocated: 16, QuadraticVotes: 4 },
  // Idea P(36) — ARE 5.0 Exam Prep Grants (3 backers)
  { ID: 'A7C40700-4E12-4B8F-9A10-000000000023', IdeaPostID: P(36), UserID: U(15), PointsAllocated: 36, QuadraticVotes: 6 },
  { ID: 'A7C40700-4E12-4B8F-9A10-000000000024', IdeaPostID: P(36), UserID: U(16), PointsAllocated: 25, QuadraticVotes: 5 },
  { ID: 'A7C40700-4E12-4B8F-9A10-000000000025', IdeaPostID: P(36), UserID: U(24), PointsAllocated: 36, QuadraticVotes: 6 },
];

function summarizeIdea(ideaPostId, status, targetQuarter) {
  const rows = ARCH_IDEA_ALLOCATIONS.filter((a) => a.IdeaPostID === ideaPostId);
  return {
    ID: ideaPostId,
    IdeaStatus: status,
    TotalPointsAllocated: rows.reduce((sum, r) => sum + r.PointsAllocated, 0),
    EffectiveQuadraticVotes: rows.reduce((sum, r) => sum + r.QuadraticVotes, 0),
    UniqueBackerCount: rows.length,
    TargetReleaseOrQuarter: targetQuarter,
  };
}

export const ARCH_IDEA_POSTS = [
  summarizeIdea(P(32), 'Planned', '2027-Q1'),
  summarizeIdea(P(33), 'In Progress', '2027-Q1'),
  summarizeIdea(P(34), 'Under Consideration', '2027-Q2'),
  summarizeIdea(P(35), 'Under Consideration', '2027-Q2'),
  summarizeIdea(P(36), 'Planned', '2027-Q1'),
];

export const ARCH_CASE_POSTS = [
  {
    ID: P(51),
    SituationMarkdown: 'Unexpected 72-hour coastal storm penetrated temporary roof seams before enclosure, elevating CLT surface moisture content to 24%.',
    ActionTakenMarkdown: 'Erected localized tenting, deployed desiccant dehumidification, logged core moisture probes, and ran ASTM D4541 pull-off shear tests.',
    OutcomeMarkdown: 'Zero panel replacement needed; preserved exposed Douglas Fir soffit after moisture dropped below 13%.',
    IsAnonymized: false,
    AnonymizedAuthorAlias: null,
  },
  {
    ID: P(55),
    SituationMarkdown: 'Owner directed elimination of ceiling acoustic isolation clips during Value Engineering over written architect objection.',
    ActionTakenMarkdown: 'Issued formal AIA B101 risk notice and obtained signed owner VE risk acceptance memo prior to submittal approval.',
    OutcomeMarkdown: 'Post-occupancy STC claim resolved cleanly with zero architect indemnity liability.',
    IsAnonymized: true,
    AnonymizedAuthorAlias: 'Northeast Civic Principal #14',
  },
];

export const ARCH_AMA_POSTS = [
  {
    ID: P(57),
    HostUserID: U(18),
    ScheduledStartAt: '2026-11-18T17:00:00.000Z',
    ScheduledEndAt: '2026-11-18T18:30:00.000Z',
    QuestionsOpenAt: '2026-11-15T09:00:00.000Z',
    IsLiveNow: false,
    RecapMarkdown: 'Covered Type IV-B 40% exposed ceiling limits, encapsulated exit stairs, and Ch. 16 seismic curtain-wall drift checks.',
  },
  {
    ID: P(62),
    HostUserID: U(20),
    ScheduledStartAt: '2026-11-22T18:00:00.000Z',
    ScheduledEndAt: '2026-11-22T19:00:00.000Z',
    QuestionsOpenAt: '2026-11-16T09:00:00.000Z',
    IsLiveNow: false,
    RecapMarkdown: null,
  },
];

export const ARCH_INTERACTIVE_POSTS = [
  {
    ID: P(64),
    ExperienceKind: 'Quiz',
    ScoringMode: 'Best Score',
    ShowLeaderboard: true,
    MaxAttemptsPerMember: 3,
    PlayCount: 6,
  },
];

export const ARCH_INTERACTIVE_SESSIONS = [
  { ID: 'A7C40750-4E12-4B8F-9A10-000000000001', InteractivePostID: P(64), UserID: U(15), AttemptNumber: 1, Score: 75, DurationSeconds: 185, Completed: true },
  { ID: 'A7C40750-4E12-4B8F-9A10-000000000002', InteractivePostID: P(64), UserID: U(15), AttemptNumber: 2, Score: 95, DurationSeconds: 142, Completed: true },
  { ID: 'A7C40750-4E12-4B8F-9A10-000000000003', InteractivePostID: P(64), UserID: U(16), AttemptNumber: 1, Score: 88, DurationSeconds: 160, Completed: true },
  { ID: 'A7C40750-4E12-4B8F-9A10-000000000004', InteractivePostID: P(64), UserID: U(11), AttemptNumber: 1, Score: 100, DurationSeconds: 118, Completed: true },
  { ID: 'A7C40750-4E12-4B8F-9A10-000000000005', InteractivePostID: P(64), UserID: U(17), AttemptNumber: 1, Score: 68, DurationSeconds: 210, Completed: true },
  { ID: 'A7C40750-4E12-4B8F-9A10-000000000006', InteractivePostID: P(64), UserID: U(7), AttemptNumber: 1, Score: 92, DurationSeconds: 130, Completed: true },
];

const T = (n) => `A7C40300-4E12-4B8F-9A10-${String(n).padStart(12, '0')}`;

/** Post-to-TopicTag assignments powering semantic & tag-aware personalization (strictly space-scoped). */
export const ARCH_POST_TAGS = [
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000001', PostID: P(1), TopicTagID: T(1) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000002', PostID: P(1), TopicTagID: T(10) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000003', PostID: P(1), TopicTagID: T(13) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000004', PostID: P(64), TopicTagID: T(2) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000005', PostID: P(7), TopicTagID: T(2) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000006', PostID: P(7), TopicTagID: T(21) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000007', PostID: P(8), TopicTagID: T(21) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000008', PostID: P(8), TopicTagID: T(2) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000009', PostID: P(11), TopicTagID: T(4) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000010', PostID: P(11), TopicTagID: T(22) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000011', PostID: P(12), TopicTagID: T(4) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000012', PostID: P(12), TopicTagID: T(14) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000013', PostID: P(15), TopicTagID: T(6) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000014', PostID: P(15), TopicTagID: T(20) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000015', PostID: P(16), TopicTagID: T(6) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000016', PostID: P(18), TopicTagID: T(7) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000017', PostID: P(19), TopicTagID: T(7) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000018', PostID: P(21), TopicTagID: T(3) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000019', PostID: P(21), TopicTagID: T(17) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000020', PostID: P(24), TopicTagID: T(9) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000021', PostID: P(24), TopicTagID: T(11) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000022', PostID: P(29), TopicTagID: T(6) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000023', PostID: P(29), TopicTagID: T(12) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000024', PostID: P(32), TopicTagID: T(2) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000025', PostID: P(32), TopicTagID: T(21) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000026', PostID: P(34), TopicTagID: T(11) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000027', PostID: P(64), TopicTagID: T(21) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000028', PostID: P(45), TopicTagID: T(1) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000029', PostID: P(49), TopicTagID: T(16) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000030', PostID: P(50), TopicTagID: T(5) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000031', PostID: P(51), TopicTagID: T(1) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000032', PostID: P(55), TopicTagID: T(6) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000033', PostID: P(57), TopicTagID: T(2) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000034', PostID: P(57), TopicTagID: T(21) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000035', PostID: P(67), TopicTagID: T(15) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000036', PostID: P(67), TopicTagID: T(9) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000037', PostID: P(68), TopicTagID: T(8) },
  { ID: 'A7C40800-4E12-4B8F-9A10-000000000038', PostID: P(68), TopicTagID: T(3) },
];

export const ARCH_POST_REACTIONS = [
  { ID: 'A7C40850-4E12-4B8F-9A10-000000000001', PostID: P(1), UserID: U(6), ReactionKind: 'Insightful' },
  { ID: 'A7C40850-4E12-4B8F-9A10-000000000002', PostID: P(1), UserID: U(11), ReactionKind: 'Upvote' },
  { ID: 'A7C40850-4E12-4B8F-9A10-000000000003', PostID: P(8), UserID: U(11), ReactionKind: 'Helpful' },
  { ID: 'A7C40850-4E12-4B8F-9A10-000000000004', PostID: P(12), UserID: U(9), ReactionKind: 'Helpful' },
  { ID: 'A7C40850-4E12-4B8F-9A10-000000000005', PostID: P(16), UserID: U(3), ReactionKind: 'Helpful' },
  { ID: 'A7C40850-4E12-4B8F-9A10-000000000006', PostID: P(29), UserID: U(20), ReactionKind: 'Insightful' },
  { ID: 'A7C40850-4E12-4B8F-9A10-000000000007', PostID: P(45), UserID: U(1), ReactionKind: 'Upvote' },
  { ID: 'A7C40850-4E12-4B8F-9A10-000000000008', PostID: P(51), UserID: U(5), ReactionKind: 'Helpful' },
  { ID: 'A7C40850-4E12-4B8F-9A10-000000000009', PostID: P(57), UserID: U(1), ReactionKind: 'Upvote' },
  { ID: 'A7C40850-4E12-4B8F-9A10-000000000010', PostID: P(67), UserID: U(5), ReactionKind: 'Insightful' },
];

export const ARCH_POST_FLAGS = [
  {
    ID: 'A7C40900-4E12-4B8F-9A10-000000000001',
    PostID: P(9),
    ReportedByUserID: U(18),
    ReasonCategory: 'Outdated Advice',
    Status: 'ActionTaken',
    ReasonDetails: 'Flagged 3-ply unrated CLT suggestion for epistemic review; superseded by Canon Verified PRG 320 answer.',
  },
  {
    ID: 'A7C40900-4E12-4B8F-9A10-000000000002',
    PostID: P(13),
    ReportedByUserID: U(5),
    ReasonCategory: 'Other',
    Status: 'Open',
    ReasonDetails: 'Needs PHIUS psi-value thermal bridge disclaimer before practitioners apply in Climate Zone 5+.',
  },
];

const ARCH_RECORD_GROUPS = {
  Members: ARCH_MEMBERS,
  Spaces: ARCH_COMMUNITY_SPACES,
  SpaceMembers: ARCH_SPACE_MEMBERS,
  Forums: ARCH_FORUMS,
  ForumMembers: ARCH_FORUM_MEMBERS,
  MemberProfiles: ARCH_MEMBER_PROFILES,
  ForumSubscriptions: ARCH_FORUM_SUBSCRIPTIONS,
  TopicTags: ARCH_TOPIC_TAGS,
  Posts: ARCH_POSTS,
  QuestionPosts: ARCH_QUESTION_POSTS,
  AnswerPosts: ARCH_ANSWER_POSTS,
  IdeaCampaigns: ARCH_IDEA_CAMPAIGNS,
  IdeaPosts: ARCH_IDEA_POSTS,
  IdeaAllocations: ARCH_IDEA_ALLOCATIONS,
  CasePosts: ARCH_CASE_POSTS,
  AMAPosts: ARCH_AMA_POSTS,
  InteractivePosts: ARCH_INTERACTIVE_POSTS,
  InteractiveSessions: ARCH_INTERACTIVE_SESSIONS,
  PostTags: ARCH_POST_TAGS,
  PostReactions: ARCH_POST_REACTIONS,
  PostFlags: ARCH_POST_FLAGS,
};

export function GetArchWorldDataset() {
  return {
    meta: ARCH_WORLD_META,
    spaceTypes: ARCH_SPACE_TYPES,
    spaceRoleTypes: ARCH_SPACE_ROLE_TYPES,
    forumTypes: ARCH_FORUM_TYPES,
    postTypes: ARCH_POST_TYPES,
    forumRoleTypes: ARCH_FORUM_ROLE_TYPES,
    ...ARCH_RECORD_GROUPS,
  };
}

export function GetArchWorldSeedSummary() {
  const counts = Object.fromEntries(Object.entries(ARCH_RECORD_GROUPS).map(([key, rows]) => [key, rows.length]));
  const totalRecords = Object.values(counts).reduce((sum, n) => sum + n, 0);
  return {
    worldCode: ARCH_WORLD_META.worldCode,
    organizationName: ARCH_WORLD_META.organizationName,
    counts,
    totalRecords,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { counts, totalRecords, organizationName } = GetArchWorldSeedSummary();
  console.log(`[ARCH-WORLD] ${organizationName}`);
  for (const [key, count] of Object.entries(counts)) {
    console.log(`[ARCH-WORLD] ${key}: ${count}`);
  }
  console.log(`[ARCH-WORLD] Total records defined: ${totalRecords}`);
}
