import { UUIDsEqual } from '@memberjunction/global';
import { AssertValidUUID } from '@mj-biz-apps/community-core';
import { type CommunityGraphQLExecutor, InvokeToggleCommunityPostReactionMutation } from './community-hub-mutations.ts';
import type {
  mjBizAppsCommunityForumAnswerPostEntity,
  mjBizAppsCommunityForumInteractivePostEntity,
  mjBizAppsCommunityForumPostEntity,
  mjBizAppsCommunityForumPostReactionEntity,
  mjBizAppsCommunityForumPostTagEntity,
  mjBizAppsCommunityForumQuestionPostEntity,
} from '@mj-biz-apps/community-entities';
import type { CommunityHubTabKey } from './community-hub-preferences.ts';

export type CommunitySpaceFilterId =
  | 'all'
  | 'architecture-standards'
  | 'product-ideation'
  | 'operations-playbooks'
  | 'governance-rfcs'
  | (string & {});

export type CommunityStreamTypeFilter =
  | 'all'
  | 'post'
  | 'verified-qa'
  | 'ideation'
  | 'living-guide';

export type CommunityCommonsEntryType = 'post' | 'verified-qa' | 'ideation' | 'living-guide';

export type AskShareEntryType = 'Question' | 'Discussion Post' | 'Playbook Note';

export type CommunityBadgeTone = 'success' | 'warning' | 'danger' | 'brand' | 'neutral';

export interface CommunitySpaceDirectoryItem {
  id: CommunitySpaceFilterId;
  name: string;
  category: string;
  description: string;
  badge?: string;
}

export interface CommunityStreamTypeOption {
  key: CommunityStreamTypeFilter;
  label: string;
  icon: string;
}

export interface CommunityCommonsReply {
  id: string;
  authorName: string;
  authorRole: string;
  authorInitials: string;
  timestampLabel: string;
  bodyMarkdown: string;
  isAccepted: boolean;
  upvotes: number;
}

export interface CommunityCommonsItem {
  id: string;
  title: string;
  excerpt: string;
  bodyMarkdown: string;
  spaceId: CommunitySpaceFilterId;
  spaceLabel: string;
  streamType: CommunityCommonsEntryType;
  entryTypeLabel: string;
  statusBadge: string;
  statusTone: CommunityBadgeTone;
  epistemicStatus: string | null;
  confidenceScore: number | null;
  authorName: string;
  authorRole: string;
  authorInitials: string;
  timestampLabel: string;
  tags: string[];
  upvoteCount: number;
  upvotedByMe: boolean;
  replyCount: number;
  replies: CommunityCommonsReply[];
  graduatedToDeliverable: boolean;
  promotedToSpaceId?: string | null;
  deliverableTitle: string | null;
  sourceTab: CommunityHubTabKey;
  sourcePostId: string;
  forumId?: string | null;
}

export interface CommunityFeaturedHighlight {
  id: string;
  kind: 'canon-motion' | 'living-playbook' | 'active-graduation';
  badgeText: string;
  badgeTone: CommunityBadgeTone;
  metaText: string;
  title: string;
  summary: string;
  footerMeta: string;
  ctaLabel: string;
  targetTab: CommunityHubTabKey;
  targetItemId: string;
}

export interface CommunitySessionItem {
  id: string;
  title: string;
  scheduleLabel: string;
  groupLabel: string;
  rsvped: boolean;
}

export interface MatchedCanonQuestion {
  id: string;
  questionPostId: string | null;
  title: string;
  answerSummary: string;
  epistemicStatus: string;
  confidenceScore: number | null;
  isAccepted: boolean;
  sourceItemId: string;
}

export interface AskShareDraft {
  entryType: AskShareEntryType;
  title: string;
  spaceId: CommunitySpaceFilterId;
  body: string;
  tagsInput: string;
}

export interface AskShareValidationErrors {
  title?: string;
  body?: string;
}

export interface AskShareValidationResult {
  valid: boolean;
  errors: AskShareValidationErrors;
}

export interface AuthorizedForumOption {
  id: string;
  name: string;
  spaceId: CommunitySpaceFilterId;
  dbSpaceId?: string | null;
  forumTypeCode?: string | null;
  status?: string | null;
  postingPolicy?: string | null;
}

export interface LiveSpaceDirectoryRow {
  ID: string;
  Slug?: string | null;
  CommunityKind?: string | null;
  Name?: string | null;
  Description?: string | null;
}

export interface LiveForumDirectoryRow {
  ID: string;
  Name: string;
  SpaceID?: string | null;
  Description?: string | null;
}

export interface LiveForumTopicTagRow {
  ID: string;
  SpaceID?: string | null;
  Slug?: string | null;
  Name: string;
  PostCount?: number | null;
}

export interface EntitySaveResultLike {
  CompleteMessage?: string | null;
  Message?: string | null;
}

export interface AskSharePostEntityLike {
  ID: mjBizAppsCommunityForumPostEntity['ID'];
  ForumID: mjBizAppsCommunityForumPostEntity['ForumID'];
  AuthorUserID: mjBizAppsCommunityForumPostEntity['AuthorUserID'];
  PostTypeID: mjBizAppsCommunityForumPostEntity['PostTypeID'];
  Title: mjBizAppsCommunityForumPostEntity['Title'];
  BodyMarkdown: mjBizAppsCommunityForumPostEntity['BodyMarkdown'];
  Status: mjBizAppsCommunityForumPostEntity['Status'];
  LatestResult?: EntitySaveResultLike | null;
  Save(): Promise<boolean>;
  Delete?(): Promise<boolean>;
}

export interface AskShareQuestionPostEntityLike {
  ID: mjBizAppsCommunityForumQuestionPostEntity['ID'];
  LatestResult?: EntitySaveResultLike | null;
  Save(): Promise<boolean>;
  Delete?(): Promise<boolean>;
}

export interface AskSharePostTagEntityLike {
  ID?: mjBizAppsCommunityForumPostTagEntity['ID'];
  PostID: mjBizAppsCommunityForumPostTagEntity['PostID'];
  TopicTagID: mjBizAppsCommunityForumPostTagEntity['TopicTagID'];
  AssignedByAI: mjBizAppsCommunityForumPostTagEntity['AssignedByAI'];
  LatestResult?: EntitySaveResultLike | null;
  Save(): Promise<boolean>;
}

export interface PersistAskShareParams {
  draft: AskShareDraft;
  isOfflineDemoMode: boolean;
  targetForumId: string | null | undefined;
  allowedForumIDs: ReadonlyArray<string>;
  authorizedForums?: ReadonlyArray<AuthorizedForumOption>;
  postTypeIdByCode: ReadonlyMap<string, string>;
  currentUserId: string | null | undefined;
  authorName: string;
  selectedTopicTagIds?: ReadonlyArray<string>;
  topicTags?: ReadonlyArray<LiveForumTopicTagRow>;
  createForumPostEntity: (() => Promise<AskSharePostEntityLike | null>) | null;
  createQuestionPostEntity?: (() => Promise<AskShareQuestionPostEntityLike | null>) | null;
  createPostTagEntity?: (() => Promise<AskSharePostTagEntityLike | null>) | null;
}

export interface PersistAskShareResult {
  success: boolean;
  validationErrors: AskShareValidationErrors;
  errorMessage: string | null;
  persistedPostId: string | null;
  resolvedForumId: string | null;
  createdItem: CommunityCommonsItem | null;
}

export interface CommonsFilterCriteria {
  spaceFilter: CommunitySpaceFilterId;
  topicFilter: string | null;
  streamTypeFilter: CommunityStreamTypeFilter;
  searchQuery: string;
}

export interface CommonsQAInput {
  id: string;
  questionPostId: string | null;
  forumId?: string | null;
  spaceId?: CommunitySpaceFilterId | null;
  title: string;
  bodyMarkdown: string;
  epistemicStatus: mjBizAppsCommunityForumAnswerPostEntity['AIEpistemicStatus'];
  confidenceScore: number | null;
  isAccepted: boolean;
  authorName?: string | null;
  authorRole?: string | null;
  timestampLabel?: string | null;
  upvoteCount?: number | null;
  upvotedByMe?: boolean;
  replyCount?: number | null;
  replies?: ReadonlyArray<CommunityCommonsReply>;
  tags?: ReadonlyArray<string>;
  promotedToSpaceId?: string | null;
}

export interface CommonsIdeaInput {
  id: string;
  campaignId: string;
  spaceId?: CommunitySpaceFilterId | null;
  title: string;
  summary: string;
  totalPointsAllocated: number;
  effectiveQuadraticVotes: number;
  authorName?: string | null;
  authorRole?: string | null;
  timestampLabel?: string | null;
  upvoteCount?: number | null;
  upvotedByMe?: boolean;
  replyCount?: number | null;
  replies?: ReadonlyArray<CommunityCommonsReply>;
  tags?: ReadonlyArray<string>;
  promotedToSpaceId?: string | null;
}

export interface CommonsLivingDocInput {
  id: string;
  forumId?: string | null;
  spaceId?: CommunitySpaceFilterId | null;
  title: string;
  bodyMarkdown: string;
  postTypeCode: 'collaborative-doc' | 'collaborative-sheet' | 'collaborative-deck' | 'interactive-experience';
  experienceKind?: mjBizAppsCommunityForumInteractivePostEntity['ExperienceKind'] | null;
  authorName?: string | null;
  authorRole?: string | null;
  timestampLabel?: string | null;
  upvoteCount?: number | null;
  upvotedByMe?: boolean;
  replyCount?: number | null;
  replies?: ReadonlyArray<CommunityCommonsReply>;
  tags?: ReadonlyArray<string>;
  promotedToSpaceId?: string | null;
}

export interface CommonsFeedPostInput {
  id: string;
  forumId?: string | null;
  title: string;
  bodyMarkdown: string;
  status: mjBizAppsCommunityForumPostEntity['Status'];
  authorName?: string | null;
  authorRole?: string | null;
  timestampLabel?: string | null;
  upvoteCount?: number | null;
  upvotedByMe?: boolean;
  replyCount?: number | null;
  replies?: ReadonlyArray<CommunityCommonsReply>;
  tags?: ReadonlyArray<string>;
  promotedToSpaceId?: string | null;
  spaceId?: CommunitySpaceFilterId | null;
}

export const COMMUNITY_SPACES_DIRECTORY: ReadonlyArray<CommunitySpaceDirectoryItem> = [
  {
    id: 'all',
    name: 'All Spaces',
    category: 'Commons',
    description: 'Every architecture circle, operational playbook, verified Q&A canon, and governance RFC.',
  },
  {
    id: 'architecture-standards',
    name: 'Architecture & Standards',
    category: 'Technical Space',
    description: 'Schema parity, multi-region GraphQL patterns, and MemberJunction platform standards.',
  },
  {
    id: 'product-ideation',
    name: 'Product Ideation',
    category: 'Ideation Space',
    description: 'Quadratic priority proposals, capability requests, and member roadmap motions.',
    badge: 'Active',
  },
  {
    id: 'operations-playbooks',
    name: 'Operations & Playbooks',
    category: 'Runbook Space',
    description: 'Zero-downtime rotation runbooks, OAuth2 onboarding guides, and telemetry checklists.',
  },
  {
    id: 'governance-rfcs',
    name: 'Governance & RFCs',
    category: 'Governance Space',
    description: 'Open community motions, working group deliverables, and standards ratifications.',
    badge: 'Ballot',
  },
];

export const COMMUNITY_TOPIC_TAGS: ReadonlyArray<string> = [
  'API Security',
  'Multi-Region',
  'Schema Parity',
  'Observability',
  'Governance',
  'Working Groups',
];

export const STREAM_TYPE_FILTER_OPTIONS: ReadonlyArray<CommunityStreamTypeOption> = [
  { key: 'all', label: 'All', icon: 'fa-solid fa-layer-group' },
  { key: 'post', label: 'Posts', icon: 'fa-solid fa-comments' },
  { key: 'verified-qa', label: 'Q&A', icon: 'fa-solid fa-circle-question' },
  { key: 'ideation', label: 'Ideas', icon: 'fa-solid fa-lightbulb' },
  { key: 'living-guide', label: 'Playbooks', icon: 'fa-solid fa-book-open' },
];

export const SEEDED_COMMUNITY_SESSIONS: ReadonlyArray<CommunitySessionItem> = [
  {
    id: 'session-rfc-review',
    title: 'Architecture Standards · RFC-2026-08 Parity Review',
    scheduleLabel: 'Thu · 2:00 PM UTC',
    groupLabel: 'Governance & RFCs',
    rsvped: true,
  },
  {
    id: 'session-wg-telemetry',
    title: 'Webhook Retry & Dead-Letter Telemetry Working Group',
    scheduleLabel: 'Fri · 4:00 PM UTC',
    groupLabel: 'Operations & Playbooks',
    rsvped: true,
  },
  {
    id: 'session-canon-calibration',
    title: 'Epistemic Q&A Canon Calibration Sync',
    scheduleLabel: 'Tue · 5:30 PM UTC',
    groupLabel: 'Architecture & Standards',
    rsvped: false,
  },
];

export const SEEDED_SUPPLEMENTAL_COMMONS_ITEMS: ReadonlyArray<CommunityCommonsItem> = [
  {
    id: 'commons-rfc-2026-08',
    title: 'RFC-2026-08: Dual-Dialect SQL Server & PostgreSQL Schema Parity Standard',
    excerpt:
      'Ratifies automated parity verification across all community entity migrations, base views, and stored procedure signatures prior to release.',
    bodyMarkdown:
      'Following 12 weeks of cross-dialect verification across partner deployments, RFC-2026-08 establishes automated SQL Server and PostgreSQL migration parity checks as a mandatory gate.\n\nKey guarantees:\n- Identical table, column, and constraint semantics across dialects\n- Deterministic CodeGen marker spacing and entity registration\n- Zero manual cast workarounds in server entity subclasses.',
    spaceId: 'governance-rfcs',
    spaceLabel: 'Governance & RFCs',
    streamType: 'post',
    entryTypeLabel: 'Governance Motion',
    statusBadge: 'Active Motion · Open',
    statusTone: 'danger',
    epistemicStatus: 'Committee Review',
    confidenceScore: 0.96,
    authorName: 'Claire Vance',
    authorRole: 'Chair, Architecture Governance · MemberJunction',
    authorInitials: 'CV',
    timestampLabel: 'Closes Friday 5:00 PM UTC',
    tags: ['Governance', 'Schema Parity', 'Standards'],
    upvoteCount: 34,
    upvotedByMe: false,
    replyCount: 2,
    replies: [
      {
        id: 'reply-rfc-1',
        authorName: 'Mateo Lindqvist',
        authorRole: 'Staff Platform Engineer',
        authorInitials: 'ML',
        timestampLabel: 'Yesterday',
        bodyMarkdown:
          'Confirmed our multi-tenant PostgreSQL staging cluster passed all 25 entity parity checks with zero manual adjustments.',
        isAccepted: true,
        upvotes: 12,
      },
      {
        id: 'reply-rfc-2',
        authorName: 'Soraia Moreau',
        authorRole: 'Database Reliability Lead',
        authorInitials: 'SM',
        timestampLabel: '6 hours ago',
        bodyMarkdown:
          'Endorsing this RFC. Enforcing strict boolean and UUID alignment prevents silent runtime drift.',
        isAccepted: false,
        upvotes: 7,
      },
    ],
    graduatedToDeliverable: false,
    deliverableTitle: null,
    sourceTab: 'knowledge-stream',
    sourcePostId: 'commons-rfc-2026-08',
  },
  {
    id: 'commons-wg-webhook-telemetry',
    title: 'Working Group: Webhook Delivery Retry & Dead-Letter Telemetry Blueprint',
    excerpt:
      'Graduated from an Architecture Q&A thread into a cross-team working group delivering standardized Retry-After and dead-letter observability metrics.',
    bodyMarkdown:
      'This working group spun out of community Q&A discussions around outbound 429 rate-limit handling. Five member engineering teams are co-authoring the reference telemetry dashboard and alerting thresholds.\n\nMilestones:\n1. Standardize exponential jitter backoff headers\n2. Publish OpenTelemetry span attributes for dead-letter queues\n3. Submit reference alert pack to Operations & Playbooks.',
    spaceId: 'operations-playbooks',
    spaceLabel: 'Operations & Playbooks',
    streamType: 'living-guide',
    entryTypeLabel: 'Working Group',
    statusBadge: 'Working Group · 2/3 Milestones',
    statusTone: 'success',
    epistemicStatus: 'Active Deliverable',
    confidenceScore: 0.91,
    authorName: 'Aisha Bell',
    authorRole: 'Working Group Lead · Platform Operations',
    authorInitials: 'AB',
    timestampLabel: 'Updated 3 hours ago',
    tags: ['Working Groups', 'Observability', 'API Security'],
    upvoteCount: 24,
    upvotedByMe: false,
    replyCount: 1,
    replies: [
      {
        id: 'reply-wg-1',
        authorName: 'Chidi Okonkwo',
        authorRole: 'Solutions Architect',
        authorInitials: 'CO',
        timestampLabel: '2 hours ago',
        bodyMarkdown:
          'Added our Prometheus alert rule snippets for dead-letter queue growth thresholds to Milestone 2.',
        isAccepted: true,
        upvotes: 9,
      },
    ],
    graduatedToDeliverable: true,
    deliverableTitle: 'Webhook Telemetry Reference Blueprint v1.0',
    sourceTab: 'living-co-authoring',
    sourcePostId: 'commons-wg-webhook-telemetry',
  },
];

function computeInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'MJ';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getSpaceLabel(spaceId: CommunitySpaceFilterId): string {
  return COMMUNITY_SPACES_DIRECTORY.find((s) => s.id === spaceId)?.name ?? 'Architecture & Standards';
}

function inferSpaceAndTags(title: string, body: string, defaultSpace: CommunitySpaceFilterId): {
  spaceId: CommunitySpaceFilterId;
  tags: string[];
} {
  const hay = `${title} ${body}`.toLowerCase();
  const tags: string[] = [];
  if (hay.includes('api') || hay.includes('key') || hay.includes('oauth') || hay.includes('secret') || hay.includes('auth')) {
    tags.push('API Security');
  }
  if (hay.includes('region') || hay.includes('replica') || hay.includes('latency') || hay.includes('failover')) {
    tags.push('Multi-Region');
  }
  if (hay.includes('schema') || hay.includes('migration') || hay.includes('sql') || hay.includes('parity')) {
    tags.push('Schema Parity');
  }
  if (hay.includes('webhook') || hay.includes('telemetry') || hay.includes('retry') || hay.includes('429')) {
    tags.push('Observability');
  }
  if (hay.includes('rfc') || hay.includes('motion') || hay.includes('governance') || hay.includes('policy')) {
    tags.push('Governance');
  }
  if (hay.includes('working group') || hay.includes('onboarding') || hay.includes('playbook')) {
    tags.push('Working Groups');
  }

  let spaceId = defaultSpace;
  if (tags.includes('Governance')) spaceId = 'governance-rfcs';
  else if (tags.includes('API Security') || tags.includes('Observability')) spaceId = 'operations-playbooks';
  else if (tags.includes('Multi-Region') || tags.includes('Schema Parity')) spaceId = 'architecture-standards';

  return {
    spaceId,
    tags: tags.length > 0 ? tags : ['Architecture & Standards'],
  };
}

function resolveItemSpaceInfo(params: {
  explicitSpaceId?: CommunitySpaceFilterId | null;
  forumId?: string | null;
  inferredSpaceId: CommunitySpaceFilterId;
  forumSpaceIdByForumId?: ReadonlyMap<string, string>;
  spaceNameById?: ReadonlyMap<string, string>;
}): { spaceId: CommunitySpaceFilterId; spaceLabel: string } {
  const mappedForumSpace =
    params.forumId && params.forumSpaceIdByForumId
      ? params.forumSpaceIdByForumId.get(params.forumId.trim().toLowerCase())
      : undefined;
  const resolvedSpaceId =
    params.explicitSpaceId && params.explicitSpaceId !== 'all'
      ? params.explicitSpaceId
      : mappedForumSpace ?? params.inferredSpaceId;
  const resolvedLabel =
    params.spaceNameById?.get(resolvedSpaceId.trim().toLowerCase()) ??
    getSpaceLabel(resolvedSpaceId);
  return {
    spaceId: resolvedSpaceId,
    spaceLabel: resolvedLabel,
  };
}

export function BuildCommonsStreamItems(params: {
  feedPosts: ReadonlyArray<CommonsFeedPostInput>;
  qaCanonItems: ReadonlyArray<CommonsQAInput>;
  ideationItems: ReadonlyArray<CommonsIdeaInput>;
  livingDocItems: ReadonlyArray<CommonsLivingDocInput>;
  includeDemoFixtures?: boolean;
  spaceNameById?: ReadonlyMap<string, string>;
  forumSpaceIdByForumId?: ReadonlyMap<string, string>;
}): CommunityCommonsItem[] {
  const items: CommunityCommonsItem[] = [];
  const includeDemo = params.includeDemoFixtures === true;

  for (const post of params.feedPosts) {
    const inferred = inferSpaceAndTags(post.title, post.bodyMarkdown, 'operations-playbooks');
    const resolvedSpace = resolveItemSpaceInfo({
      explicitSpaceId: post.spaceId,
      forumId: post.forumId,
      inferredSpaceId: inferred.spaceId,
      forumSpaceIdByForumId: params.forumSpaceIdByForumId,
      spaceNameById: params.spaceNameById,
    });
    const authorName = post.authorName?.trim() || 'Community Member';
    const authorRole = post.authorRole?.trim() || 'Member';
    const replies = post.replies ? post.replies.map((r) => ({ ...r })) : [];
    const replyCount =
      typeof post.replyCount === 'number' && Number.isFinite(post.replyCount)
        ? Math.max(replies.length, post.replyCount)
        : replies.length;
    const upvoteCount =
      typeof post.upvoteCount === 'number' && Number.isFinite(post.upvoteCount) ? post.upvoteCount : 0;
    const promotedToSpaceId = post.promotedToSpaceId?.trim() || null;
    const graduated = Boolean(promotedToSpaceId);

    items.push({
      id: `post-${post.id}`,
      title: post.title,
      excerpt: post.bodyMarkdown.slice(0, 180) + (post.bodyMarkdown.length > 180 ? '...' : ''),
      bodyMarkdown: post.bodyMarkdown,
      spaceId: resolvedSpace.spaceId,
      spaceLabel: resolvedSpace.spaceLabel,
      streamType: 'post',
      entryTypeLabel: 'Discussion Post',
      statusBadge: graduated ? 'Graduated · Working Group' : post.status || 'Published',
      statusTone: graduated ? 'success' : 'brand',
      epistemicStatus: graduated ? 'Graduated Deliverable' : 'Community Thread',
      confidenceScore: null,
      authorName,
      authorRole,
      authorInitials: computeInitials(authorName),
      timestampLabel: post.timestampLabel?.trim() || post.status || 'Published',
      tags: post.tags !== undefined ? [...post.tags] : inferred.tags,
      upvoteCount,
      upvotedByMe: Boolean(post.upvotedByMe),
      replyCount,
      replies,
      graduatedToDeliverable: graduated,
      promotedToSpaceId,
      deliverableTitle: graduated ? `${post.title.slice(0, 64)} — Working Group Deliverable` : null,
      sourceTab: 'knowledge-stream',
      sourcePostId: post.id,
      forumId: post.forumId ?? null,
    });
  }

  for (const qa of params.qaCanonItems) {
    const inferred = inferSpaceAndTags(qa.title, qa.bodyMarkdown, 'architecture-standards');
    const resolvedSpace = resolveItemSpaceInfo({
      explicitSpaceId: qa.spaceId,
      forumId: qa.forumId,
      inferredSpaceId: inferred.spaceId,
      forumSpaceIdByForumId: params.forumSpaceIdByForumId,
      spaceNameById: params.spaceNameById,
    });
    const isVerified = qa.isAccepted || qa.epistemicStatus === 'Canon Verified';
    const authorName = qa.authorName?.trim() || 'Community Member';
    const authorRole = qa.authorRole?.trim() || 'Member';
    const replies = qa.replies ? qa.replies.map((r) => ({ ...r })) : [];
    const replyCount =
      typeof qa.replyCount === 'number' && Number.isFinite(qa.replyCount)
        ? Math.max(replies.length, qa.replyCount)
        : replies.length;
    const upvoteCount = typeof qa.upvoteCount === 'number' && Number.isFinite(qa.upvoteCount) ? qa.upvoteCount : 0;
    const promotedToSpaceId = qa.promotedToSpaceId?.trim() || null;
    const graduated = Boolean(promotedToSpaceId);

    items.push({
      id: `qa-${qa.id}`,
      title: qa.title,
      excerpt: qa.bodyMarkdown.slice(0, 180) + (qa.bodyMarkdown.length > 180 ? '...' : ''),
      bodyMarkdown: qa.bodyMarkdown,
      spaceId: resolvedSpace.spaceId,
      spaceLabel: resolvedSpace.spaceLabel,
      streamType: 'verified-qa',
      entryTypeLabel: 'Verified Q&A',
      statusBadge: graduated
        ? 'Graduated · Working Group'
        : qa.epistemicStatus || (isVerified ? 'Canon Verified' : 'Needs Answer'),
      statusTone: graduated || isVerified ? 'success' : 'warning',
      epistemicStatus: graduated ? 'Graduated Deliverable' : qa.epistemicStatus ?? (isVerified ? 'Canon Verified' : 'Under Review'),
      confidenceScore: qa.confidenceScore,
      authorName,
      authorRole,
      authorInitials: computeInitials(authorName),
      timestampLabel: qa.timestampLabel?.trim() || (isVerified ? 'Verified Canon' : 'Under Review'),
      tags: qa.tags !== undefined ? [...qa.tags] : inferred.tags,
      upvoteCount,
      upvotedByMe: Boolean(qa.upvotedByMe),
      replyCount,
      replies,
      graduatedToDeliverable: graduated,
      promotedToSpaceId,
      deliverableTitle: graduated ? `${qa.title.slice(0, 64)} — Working Group Deliverable` : null,
      sourceTab: 'qa-canon-workbench',
      sourcePostId: qa.id,
      forumId: qa.forumId ?? null,
    });
  }

  for (const idea of params.ideationItems) {
    const inferred = inferSpaceAndTags(idea.title, idea.summary, 'product-ideation');
    const resolvedSpace = resolveItemSpaceInfo({
      explicitSpaceId: idea.spaceId,
      forumId: idea.campaignId,
      inferredSpaceId: 'product-ideation',
      forumSpaceIdByForumId: params.forumSpaceIdByForumId,
      spaceNameById: params.spaceNameById,
    });
    const authorName = idea.authorName?.trim() || 'Community Member';
    const authorRole = idea.authorRole?.trim() || 'Proposal Author';
    const replies = idea.replies ? idea.replies.map((r) => ({ ...r })) : [];
    const replyCount =
      typeof idea.replyCount === 'number' && Number.isFinite(idea.replyCount)
        ? Math.max(replies.length, idea.replyCount)
        : replies.length;
    const promotedToSpaceId = idea.promotedToSpaceId?.trim() || null;
    const graduated = Boolean(promotedToSpaceId);

    items.push({
      id: `idea-${idea.id}`,
      title: idea.title,
      excerpt: idea.summary,
      bodyMarkdown: idea.summary,
      spaceId: resolvedSpace.spaceId,
      spaceLabel: resolvedSpace.spaceLabel,
      streamType: 'ideation',
      entryTypeLabel: 'Ideation Proposal',
      statusBadge: graduated ? 'Graduated · Working Group' : `${idea.effectiveQuadraticVotes} Quadratic Votes`,
      statusTone: graduated ? 'success' : 'brand',
      epistemicStatus: graduated ? 'Graduated Deliverable' : `${idea.totalPointsAllocated} Voice Credits Allocated`,
      confidenceScore: null,
      authorName,
      authorRole,
      authorInitials: computeInitials(authorName),
      timestampLabel: idea.timestampLabel?.trim() || 'Open Campaign',
      tags: idea.tags !== undefined ? [...idea.tags] : Array.from(new Set([...inferred.tags, 'Ideation'])),
      upvoteCount:
        typeof idea.upvoteCount === 'number' && Number.isFinite(idea.upvoteCount)
          ? idea.upvoteCount
          : typeof idea.totalPointsAllocated === 'number'
            ? idea.totalPointsAllocated
            : 0,
      upvotedByMe: Boolean(idea.upvotedByMe),
      replyCount,
      replies,
      graduatedToDeliverable: graduated,
      promotedToSpaceId,
      deliverableTitle: graduated ? `${idea.title.slice(0, 64)} — Working Group Deliverable` : null,
      sourceTab: 'quadratic-ideation-wallet',
      sourcePostId: idea.id,
      forumId: idea.campaignId || null,
    });
  }

  for (const doc of params.livingDocItems) {
    const inferred = inferSpaceAndTags(doc.title, doc.bodyMarkdown, 'operations-playbooks');
    const resolvedSpace = resolveItemSpaceInfo({
      explicitSpaceId: doc.spaceId,
      forumId: doc.forumId,
      inferredSpaceId: inferred.spaceId,
      forumSpaceIdByForumId: params.forumSpaceIdByForumId,
      spaceNameById: params.spaceNameById,
    });
    const isInteractive = doc.postTypeCode === 'interactive-experience';
    const authorName = doc.authorName?.trim() || 'Community Member';
    const authorRole = doc.authorRole?.trim() || 'Co-Author';
    const replies = doc.replies ? doc.replies.map((r) => ({ ...r })) : [];
    const replyCount =
      typeof doc.replyCount === 'number' && Number.isFinite(doc.replyCount)
        ? Math.max(replies.length, doc.replyCount)
        : replies.length;
    const upvoteCount = typeof doc.upvoteCount === 'number' && Number.isFinite(doc.upvoteCount) ? doc.upvoteCount : 0;
    const promotedToSpaceId = doc.promotedToSpaceId?.trim() || null;
    const graduated = Boolean(promotedToSpaceId);

    items.push({
      id: `doc-${doc.id}`,
      title: doc.title,
      excerpt: doc.bodyMarkdown.slice(0, 180) + (doc.bodyMarkdown.length > 180 ? '...' : ''),
      bodyMarkdown: doc.bodyMarkdown,
      spaceId: resolvedSpace.spaceId,
      spaceLabel: resolvedSpace.spaceLabel,
      streamType: 'living-guide',
      entryTypeLabel: isInteractive ? 'Interactive Mini-App' : 'Living Guide',
      statusBadge: graduated
        ? 'Graduated · Working Group'
        : isInteractive
          ? `Sandbox · ${doc.experienceKind ?? 'Interactive'}`
          : 'Living Playbook',
      statusTone: 'success',
      epistemicStatus: graduated ? 'Graduated Deliverable' : 'Co-Authored Standard',
      confidenceScore: null,
      authorName,
      authorRole,
      authorInitials: computeInitials(authorName),
      timestampLabel: doc.timestampLabel?.trim() || 'Living revision',
      tags: doc.tags !== undefined ? [...doc.tags] : Array.from(new Set([...inferred.tags, 'Working Groups'])),
      upvoteCount,
      upvotedByMe: Boolean(doc.upvotedByMe),
      replyCount,
      replies,
      graduatedToDeliverable: graduated,
      promotedToSpaceId,
      deliverableTitle: graduated ? `${doc.title.slice(0, 64)} — Working Group Deliverable` : null,
      sourceTab: 'living-co-authoring',
      sourcePostId: doc.id,
      forumId: doc.forumId ?? null,
    });
  }

  if (includeDemo) {
    for (const supplemental of SEEDED_SUPPLEMENTAL_COMMONS_ITEMS) {
      if (!items.some((existing) => existing.id === supplemental.id)) {
        items.push({
          ...supplemental,
          tags: [...supplemental.tags],
          replies: supplemental.replies.map((r) => ({ ...r })),
        });
      }
    }
  }

  return items;
}

export function FilterCommonsStream(
  items: ReadonlyArray<CommunityCommonsItem>,
  criteria: CommonsFilterCriteria,
): CommunityCommonsItem[] {
  const normalizedQuery = criteria.searchQuery.trim().toLowerCase();
  const normalizedTopic = criteria.topicFilter?.trim().toLowerCase() ?? null;

  return items.filter((item) => {
    if (criteria.spaceFilter !== 'all' && item.spaceId !== criteria.spaceFilter) {
      return false;
    }
    if (criteria.streamTypeFilter !== 'all' && item.streamType !== criteria.streamTypeFilter) {
      return false;
    }
    if (normalizedTopic) {
      const matchesTopic = item.tags.some((t) => t.toLowerCase() === normalizedTopic);
      if (!matchesTopic) {
        return false;
      }
    }
    if (normalizedQuery) {
      const haystack = `${item.title} ${item.excerpt} ${item.bodyMarkdown} ${item.spaceLabel} ${item.tags.join(' ')} ${item.authorName}`.toLowerCase();
      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }
    return true;
  });
}

export function FindMatchedCanonQuestion(
  query: string,
  qaCanonItems: ReadonlyArray<CommonsQAInput>,
  commonsItems: ReadonlyArray<CommunityCommonsItem>,
): MatchedCanonQuestion | null {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < 2) {
    return null;
  }

  const tokens = normalized.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length === 0) {
    return null;
  }

  let bestQa: CommonsQAInput | null = null;
  let bestScore = 0;

  for (const qa of qaCanonItems) {
    const hay = `${qa.title} ${qa.bodyMarkdown}`.toLowerCase();
    let score = 0;
    if (hay.includes(normalized)) {
      score += 10;
    }
    for (const token of tokens) {
      if (hay.includes(token)) {
        score += 2;
      }
    }
    if (score > 0 && (qa.isAccepted || qa.epistemicStatus === 'Canon Verified')) {
      score += 3;
    }
    if (score > bestScore) {
      bestScore = score;
      bestQa = qa;
    }
  }

  if (!bestQa || bestScore === 0) {
    return null;
  }

  const matchingCommons = commonsItems.find(
    (item) => item.sourcePostId === bestQa!.id || item.title === bestQa!.title,
  );

  return {
    id: bestQa.id,
    questionPostId: bestQa.questionPostId,
    title: bestQa.title,
    answerSummary: bestQa.bodyMarkdown || 'Verified canonical answer available in Q&A Canon Workbench.',
    epistemicStatus: bestQa.epistemicStatus || (bestQa.isAccepted ? 'Canon Verified' : 'Novel Insight'),
    confidenceScore: bestQa.confidenceScore,
    isAccepted: bestQa.isAccepted,
    sourceItemId: matchingCommons?.id ?? `qa-${bestQa.id}`,
  };
}

export function ValidateAskShareDraft(draft: AskShareDraft): AskShareValidationResult {
  const errors: AskShareValidationErrors = {};
  if (!draft.title.trim()) {
    errors.title = 'Please enter a concise headline or question.';
  }
  if (!draft.body.trim()) {
    errors.body = 'Please provide details, context, or steps before publishing.';
  }
  return {
    valid: !errors.title && !errors.body,
    errors,
  };
}

export function CreateAskShareStreamItem(
  draft: AskShareDraft,
  authorName = 'Community Member',
  authorRole = 'Enterprise Member · MemberJunction',
): CommunityCommonsItem {
  const title = draft.title.trim();
  const body = draft.body.trim();
  const parsedTags = draft.tagsInput
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const tags = parsedTags.length > 0 ? parsedTags : [getSpaceLabel(draft.spaceId)];

  const isQuestion = draft.entryType === 'Question';
  const isPlaybook = draft.entryType === 'Playbook Note';

  const streamType: CommunityCommonsEntryType = isQuestion
    ? 'verified-qa'
    : isPlaybook
      ? 'living-guide'
      : 'post';

  const statusBadge = isQuestion
    ? 'Open Question'
    : isPlaybook
      ? 'Living Playbook · v1.0'
      : 'Community Discussion';

  const statusTone: CommunityBadgeTone = isQuestion ? 'warning' : isPlaybook ? 'success' : 'brand';
  const id = `askshare-${crypto.randomUUID()}`;

  return {
    id,
    title,
    excerpt: body.slice(0, 180) + (body.length > 180 ? '...' : ''),
    bodyMarkdown: body,
    spaceId: draft.spaceId,
    spaceLabel: getSpaceLabel(draft.spaceId),
    streamType,
    entryTypeLabel: draft.entryType,
    statusBadge,
    statusTone,
    epistemicStatus: isQuestion ? 'Novel Insight' : isPlaybook ? 'Co-Authored Note' : 'Published',
    confidenceScore: null,
    authorName,
    authorRole,
    authorInitials: computeInitials(authorName),
    timestampLabel: 'Just now',
    tags,
    upvoteCount: 0,
    upvotedByMe: false,
    replyCount: 0,
    replies: [],
    graduatedToDeliverable: false,
    deliverableTitle: null,
    sourceTab: isQuestion ? 'qa-canon-workbench' : isPlaybook ? 'living-co-authoring' : 'knowledge-stream',
    sourcePostId: id,
  };
}

export function ToggleStreamItemUpvote(
  items: ReadonlyArray<CommunityCommonsItem>,
  itemId: string,
): CommunityCommonsItem[] {
  return items.map((item) => {
    if (item.id !== itemId) return item;
    const nextUpvoted = !item.upvotedByMe;
    return {
      ...item,
      upvotedByMe: nextUpvoted,
      upvoteCount: Math.max(0, item.upvoteCount + (nextUpvoted ? 1 : -1)),
    };
  });
}

export function AddStreamItemReply(
  items: ReadonlyArray<CommunityCommonsItem>,
  itemId: string,
  body: string,
  authorName = 'Community Member',
  authorRole = 'Enterprise Member · MemberJunction',
): CommunityCommonsItem[] {
  const trimmed = body.trim();
  if (!trimmed) return [...items];

  return items.map((item) => {
    if (item.id !== itemId) return item;
    const newReply: CommunityCommonsReply = {
      id: `reply-${crypto.randomUUID()}`,
      authorName,
      authorRole,
      authorInitials: computeInitials(authorName),
      timestampLabel: 'Just now',
      bodyMarkdown: trimmed,
      isAccepted: false,
      upvotes: 1,
    };
    const nextReplies = [...item.replies, newReply];
    return {
      ...item,
      replies: nextReplies,
      replyCount: nextReplies.length,
    };
  });
}

export function GraduateStreamItem(
  items: ReadonlyArray<CommunityCommonsItem>,
  itemId: string,
  promotedToSpaceId?: string | null,
): CommunityCommonsItem[] {
  return items.map((item) => {
    if (item.id !== itemId) return item;
    return {
      ...item,
      graduatedToDeliverable: true,
      promotedToSpaceId: promotedToSpaceId ?? item.promotedToSpaceId ?? null,
      deliverableTitle: `${item.title.slice(0, 64)} — Working Group Deliverable`,
      statusBadge: 'Graduated · Working Group',
      statusTone: 'success',
      epistemicStatus: 'Graduated Deliverable',
    };
  });
}

export function BuildEditorialPorchHighlights(params: {
  commonsItems: ReadonlyArray<CommunityCommonsItem>;
  qaCanonItems: ReadonlyArray<CommonsQAInput>;
  livingDocItems: ReadonlyArray<CommonsLivingDocInput>;
}): ReadonlyArray<CommunityFeaturedHighlight> {
  const motionItem =
    params.commonsItems.find((i) => i.id === 'commons-rfc-2026-08') ??
    params.commonsItems.find((i) => i.streamType === 'verified-qa') ??
    params.commonsItems[0];

  const playbookItem =
    params.commonsItems.find((i) => i.streamType === 'living-guide' && i.id !== 'commons-wg-webhook-telemetry') ??
    params.commonsItems.find((i) => i.sourceTab === 'living-co-authoring') ??
    params.commonsItems[0];

  const graduationItem =
    params.commonsItems.find((i) => i.id === 'commons-wg-webhook-telemetry') ??
    params.commonsItems.find((i) => i.graduatedToDeliverable) ??
    params.commonsItems.find((i) => i.id !== motionItem?.id && i.id !== playbookItem?.id) ??
    params.commonsItems[params.commonsItems.length - 1];

  const firstQa = params.qaCanonItems[0];
  const firstInteractive = params.livingDocItems.find((d) => d.postTypeCode === 'interactive-experience') ?? params.livingDocItems[0];

  return [
    {
      id: 'highlight-canon-motion',
      kind: 'canon-motion',
      badgeText: 'Open Canon · Motion Spotlight',
      badgeTone: 'danger',
      metaText: firstQa?.epistemicStatus ? `${firstQa.epistemicStatus} · Open RFC` : 'Canon Verified · Active Motion',
      title: motionItem?.title ?? 'Verified Canon Entry',
      summary:
        motionItem?.excerpt ??
        'Review verified community canon answers and active engineering guidance.',
      footerMeta: firstQa && typeof firstQa.confidenceScore === 'number'
        ? `Canon Confidence: ${Math.round(firstQa.confidenceScore * 100)}%`
        : 'Open for Inspection',
      ctaLabel: 'Inspect Motion & Canon',
      targetTab: 'qa-canon-workbench',
      targetItemId: motionItem?.id ?? firstQa?.id ?? '',
    },
    {
      id: 'highlight-living-playbook',
      kind: 'living-playbook',
      badgeText: 'Living Playbook · Interactive Preview',
      badgeTone: 'brand',
      metaText: firstInteractive ? `${firstInteractive.postTypeCode} · Sandboxed` : 'Co-Authored Standard',
      title: playbookItem?.title ?? 'Living Playbook Workspace',
      summary:
        playbookItem?.excerpt ??
        'Collaborative runbook paired with an isolated sandboxed mini-app check.',
      footerMeta: `${params.livingDocItems.length} Living Artifacts`,
      ctaLabel: 'Open Playbook Preview',
      targetTab: 'living-co-authoring',
      targetItemId: playbookItem?.id ?? firstInteractive?.id ?? '',
    },
    {
      id: 'highlight-active-graduation',
      kind: 'active-graduation',
      badgeText: 'Active Graduation · Working Group',
      badgeTone: 'success',
      metaText: graduationItem?.graduatedToDeliverable ? 'Graduated Deliverable' : 'Active Community Thread',
      title: graduationItem?.title ?? 'Active Community Deliverable',
      summary:
        graduationItem?.excerpt ??
        'Community knowledge thread curated for peer review and deliverable graduation.',
      footerMeta: `${graduationItem?.upvoteCount ?? 0} Endorsements`,
      ctaLabel: 'Review Deliverable',
      targetTab: graduationItem?.sourceTab ?? 'knowledge-stream',
      targetItemId: graduationItem?.id ?? '',
    },
  ];
}

export function MapForumNameToSpaceId(forumName: string): CommunitySpaceFilterId {
  const hay = forumName.trim().toLowerCase();
  if (hay.includes('ideation') || hay.includes('roadmap') || hay.includes('product')) {
    return 'product-ideation';
  }
  if (hay.includes('governance') || hay.includes('rfc') || hay.includes('policy')) {
    return 'governance-rfcs';
  }
  if (hay.includes('operation') || hay.includes('playbook') || hay.includes('runbook')) {
    return 'operations-playbooks';
  }
  return 'architecture-standards';
}

export function ResolveAskSharePostTypeCode(entryType: AskShareEntryType): string {
  if (entryType === 'Question') return 'question';
  if (entryType === 'Playbook Note') return 'collaborative-doc';
  return 'discussion';
}

/**
 * Checks whether an authorized Forum accepts root posts for the chosen Ask/Share entry type,
 * matching the authoritative server ForumType drivers (`QAForumServerDriver`,
 * `PlaybooksForumServerDriver`, `CaseRoundsForumServerDriver`, `IdeaCampaignForumServerDriver`,
 * `LiveEventsForumServerDriver`).
 */
export function IsForumCompatibleWithAskShareEntryType(
  forum: AuthorizedForumOption,
  entryType: AskShareEntryType,
): boolean {
  if (forum.status && forum.status !== 'Active') {
    return false;
  }
  if (forum.postingPolicy === 'ReadOnly') {
    return false;
  }
  const forumTypeCode = forum.forumTypeCode?.trim().toLowerCase() ?? '';
  if (!forumTypeCode) {
    return true;
  }

  const postTypeCode = ResolveAskSharePostTypeCode(entryType);
  switch (forumTypeCode) {
    case 'qa-knowledge-base':
      return postTypeCode === 'question';
    case 'live-events-and-amas':
      return postTypeCode === 'question' || postTypeCode === 'live-ama';
    case 'playbooks-and-docs':
      return (
        postTypeCode === 'collaborative-doc' ||
        postTypeCode === 'collaborative-sheet' ||
        postTypeCode === 'collaborative-deck'
      );
    case 'peer-case-rounds':
      return postTypeCode === 'case-review';
    case 'ideation-campaign':
      return postTypeCode === 'idea-proposal' || postTypeCode === 'poll-or-form';
    default:
      return true;
  }
}

function getForumTypeRankForEntryType(forumTypeCode: string | null | undefined, entryType: AskShareEntryType): number {
  const code = forumTypeCode?.trim().toLowerCase() ?? '';
  if (entryType === 'Question') {
    if (code === 'qa-knowledge-base') return 0;
    if (code === 'live-events-and-amas') return 1;
    if (code === 'general-discussion' || !code) return 2;
    return 3;
  }
  if (entryType === 'Playbook Note') {
    if (code === 'playbooks-and-docs') return 0;
    if (code === 'general-discussion' || !code) return 1;
    return 2;
  }
  if (code === 'general-discussion' || !code) return 0;
  return 1;
}

/**
 * Filters and ranks authorized forums so the Publication Forum dropdown only shows forums that
 * accept the selected `entryType`, prioritizing the active Space (if any) and best-fit ForumType.
 */
export function FilterForumsForAskShareEntryType(
  forums: ReadonlyArray<AuthorizedForumOption>,
  entryType: AskShareEntryType,
  preferredSpaceId?: CommunitySpaceFilterId | null,
): AuthorizedForumOption[] {
  const normalizedSpace =
    preferredSpaceId && preferredSpaceId !== 'all' ? preferredSpaceId.trim().toLowerCase() : null;

  return forums
    .filter((forum) => IsForumCompatibleWithAskShareEntryType(forum, entryType))
    .sort((a, b) => {
      if (normalizedSpace) {
        const aInSpace =
          a.spaceId.trim().toLowerCase() === normalizedSpace ||
          (a.dbSpaceId?.trim().toLowerCase() ?? '') === normalizedSpace;
        const bInSpace =
          b.spaceId.trim().toLowerCase() === normalizedSpace ||
          (b.dbSpaceId?.trim().toLowerCase() ?? '') === normalizedSpace;
        if (aInSpace !== bInSpace) {
          return aInSpace ? -1 : 1;
        }
      }
      const rankDelta =
        getForumTypeRankForEntryType(a.forumTypeCode, entryType) -
        getForumTypeRankForEntryType(b.forumTypeCode, entryType);
      if (rankDelta !== 0) {
        return rankDelta;
      }
      return a.name.localeCompare(b.name);
    });
}

/**
 * Filters Space-scoped topic tags for the Ask/Share tag typeahead autocomplete.
 * Returns an empty array when the active query token is blank so the dialog never dumps an
 * overwhelming wall of tag buttons; matches on name or slug, excludes already-selected tags,
 * deduplicates by display name, ranks prefix matches & popular tags first, and caps results.
 */
export function FilterAskShareTopicTagSuggestions(params: {
  availableTags: ReadonlyArray<LiveForumTopicTagRow>;
  query: string;
  selectedTagIds: ReadonlyArray<string>;
  maxResults?: number;
}): LiveForumTopicTagRow[] {
  const lastCommaIdx = params.query.lastIndexOf(',');
  const activeToken = (lastCommaIdx >= 0 ? params.query.slice(lastCommaIdx + 1) : params.query)
    .trim()
    .replace(/^#+/, '')
    .trim()
    .toLowerCase();
  if (!activeToken) {
    return [];
  }

  const maxResults = params.maxResults ?? 8;
  const seenNames = new Set<string>();
  const matched: LiveForumTopicTagRow[] = [];

  for (const tag of params.availableTags) {
    const trimmedName = tag.Name.trim();
    if (!trimmedName) continue;
    if (params.selectedTagIds.some((id) => UUIDsEqual(id, tag.ID))) continue;
    const lowerName = trimmedName.toLowerCase();
    const lowerSlug = (tag.Slug ?? '').trim().toLowerCase();
    if (!lowerName.includes(activeToken) && !lowerSlug.includes(activeToken)) {
      continue;
    }
    if (seenNames.has(lowerName)) continue;
    seenNames.add(lowerName);
    matched.push(tag);
  }

  matched.sort((a, b) => {
    const aStarts = a.Name.trim().toLowerCase().startsWith(activeToken);
    const bStarts = b.Name.trim().toLowerCase().startsWith(activeToken);
    if (aStarts !== bStarts) {
      return aStarts ? -1 : 1;
    }
    const countDelta = (b.PostCount ?? 0) - (a.PostCount ?? 0);
    if (countDelta !== 0) {
      return countDelta;
    }
    return a.Name.localeCompare(b.Name);
  });

  return matched.slice(0, maxResults);
}

function extractEntitySaveError(entity: { LatestResult?: EntitySaveResultLike | null } | null | undefined): string | null {
  const msg = entity?.LatestResult?.CompleteMessage?.trim() || entity?.LatestResult?.Message?.trim() || '';
  return msg.length > 0 ? msg : null;
}

export function ResolveAuthorizedForumTarget(
  targetForumId: string | null | undefined,
  allowedForumIDs: ReadonlyArray<string>,
): string | null {
  const normalizedTarget = (targetForumId ?? '').trim().toLowerCase();
  if (!normalizedTarget) {
    return null;
  }
  for (const allowedId of allowedForumIDs) {
    if (allowedId.trim().toLowerCase() === normalizedTarget) {
      return allowedId;
    }
  }
  return null;
}

function resolveMatchedTopicTagsForPost(params: {
  tagsInput: string;
  selectedTopicTagIds?: ReadonlyArray<string>;
  topicTags?: ReadonlyArray<LiveForumTopicTagRow>;
  forumSpaceId: string | null;
}): Array<{ id: string; name: string }> {
  const catalog = params.topicTags ?? [];
  const candidates = params.forumSpaceId
    ? catalog.filter((t) => !t.SpaceID || UUIDsEqual(t.SpaceID, params.forumSpaceId!))
    : catalog;
  const resolved = new Map<string, { id: string; name: string }>();

  for (const selectedId of params.selectedTopicTagIds ?? []) {
    const trimmed = selectedId.trim();
    if (!trimmed) continue;
    const match = candidates.find((t) => UUIDsEqual(t.ID, trimmed));
    if (match) {
      resolved.set(match.ID.toLowerCase(), { id: match.ID, name: match.Name });
    }
  }

  const parsedTokens = params.tagsInput
    .split(',')
    .map((t) => t.trim().replace(/^#+/, '').trim())
    .filter(Boolean);
  for (const token of parsedTokens) {
    const lower = token.toLowerCase();
    const normalizedSlug = lower.replace(/\s+/g, '-');
    const match = candidates.find(
      (t) =>
        t.Name.trim().toLowerCase() === lower ||
        (t.Slug?.trim().toLowerCase() ?? '') === lower ||
        (t.Slug?.trim().toLowerCase() ?? '') === normalizedSlug,
    );
    if (match) {
      resolved.set(match.ID.toLowerCase(), { id: match.ID, name: match.Name });
    }
  }

  return Array.from(resolved.values());
}

export async function PersistAskSharePost(params: PersistAskShareParams): Promise<PersistAskShareResult> {
  const validation = ValidateAskShareDraft(params.draft);
  if (!validation.valid) {
    return {
      success: false,
      validationErrors: validation.errors,
      errorMessage: null,
      persistedPostId: null,
      resolvedForumId: null,
      createdItem: null,
    };
  }

  const matchedForum = params.authorizedForums?.find(
    (f) => f.id.trim().toLowerCase() === (params.targetForumId ?? '').trim().toLowerCase(),
  );
  const resolvedDraft: AskShareDraft = matchedForum
    ? { ...params.draft, spaceId: matchedForum.dbSpaceId ?? matchedForum.spaceId }
    : params.draft;

  if (params.isOfflineDemoMode) {
    const demoItem = CreateAskShareStreamItem(
      resolvedDraft,
      params.authorName || 'Community Member',
      'Demo Member',
    );
    return {
      success: true,
      validationErrors: {},
      errorMessage: null,
      persistedPostId: null,
      resolvedForumId: null,
      createdItem: demoItem,
    };
  }

  const targetTrimmed = (params.targetForumId ?? '').trim();
  if (!targetTrimmed) {
    return {
      success: false,
      validationErrors: {},
      errorMessage: 'No authorized publication forum is selected — cannot publish post.',
      persistedPostId: null,
      resolvedForumId: null,
      createdItem: null,
    };
  }

  const authorizedForumId = ResolveAuthorizedForumTarget(targetTrimmed, params.allowedForumIDs);
  if (!authorizedForumId) {
    return {
      success: false,
      validationErrors: {},
      errorMessage: 'Selected publication destination is not an authorized forum for this workspace.',
      persistedPostId: null,
      resolvedForumId: null,
      createdItem: null,
    };
  }

  if (matchedForum && !IsForumCompatibleWithAskShareEntryType(matchedForum, params.draft.entryType)) {
    return {
      success: false,
      validationErrors: {},
      errorMessage: `Forum "${matchedForum.name}" does not accept "${params.draft.entryType}" entries. Choose a compatible publication forum.`,
      persistedPostId: null,
      resolvedForumId: authorizedForumId,
      createdItem: null,
    };
  }

  const typeCode = ResolveAskSharePostTypeCode(params.draft.entryType);
  const postTypeId = params.postTypeIdByCode.get(typeCode.toLowerCase()) ?? null;
  if (!postTypeId) {
    return {
      success: false,
      validationErrors: {},
      errorMessage: `PostType "${typeCode}" is not configured — cannot publish entry.`,
      persistedPostId: null,
      resolvedForumId: authorizedForumId,
      createdItem: null,
    };
  }

  if (!params.currentUserId || !params.createForumPostEntity) {
    return {
      success: false,
      validationErrors: {},
      errorMessage: 'Active session user or metadata provider is unavailable — cannot publish post.',
      persistedPostId: null,
      resolvedForumId: authorizedForumId,
      createdItem: null,
    };
  }

  if (params.draft.entryType === 'Question' && !params.createQuestionPostEntity) {
    return {
      success: false,
      validationErrors: {},
      errorMessage: 'Question subtype provider is unavailable — cannot publish question.',
      persistedPostId: null,
      resolvedForumId: authorizedForumId,
      createdItem: null,
    };
  }

  const matchedTopicTags = resolveMatchedTopicTagsForPost({
    tagsInput: params.draft.tagsInput,
    selectedTopicTagIds: params.selectedTopicTagIds,
    topicTags: params.topicTags,
    forumSpaceId: matchedForum?.dbSpaceId?.trim() || null,
  });

  let savedPostId: string | null = null;
  let savedPostEntity: AskSharePostEntityLike | null = null;
  let savedQuestionEntity: AskShareQuestionPostEntityLike | null = null;
  try {
    const post = await params.createForumPostEntity();
    if (!post) {
      return {
        success: false,
        validationErrors: {},
        errorMessage: 'Could not instantiate Forum Post entity — draft was preserved.',
        persistedPostId: null,
        resolvedForumId: authorizedForumId,
        createdItem: null,
      };
    }

    post.ForumID = authorizedForumId;
    post.AuthorUserID = params.currentUserId;
    post.PostTypeID = postTypeId;
    post.Title = params.draft.title.trim();
    post.BodyMarkdown = params.draft.body.trim();
    post.Status = 'Published';

    const saved = await post.Save();
    if (!saved) {
      const serverReason = extractEntitySaveError(post);
      return {
        success: false,
        validationErrors: {},
        errorMessage: serverReason
          ? `Failed to save Forum Post: ${serverReason}`
          : 'Failed to save Forum Post on server — draft was preserved so nothing was lost.',
        persistedPostId: null,
        resolvedForumId: authorizedForumId,
        createdItem: null,
      };
    }
    savedPostEntity = post;
    savedPostId = post.ID;

    if (params.draft.entryType === 'Question' && params.createQuestionPostEntity) {
      const qPost = await params.createQuestionPostEntity();
      if (!qPost) {
        await savedPostEntity.Delete?.().catch(() => false);
        return {
          success: false,
          validationErrors: {},
          errorMessage: 'Could not instantiate Question subtype entity — rolled back base post.',
          persistedPostId: null,
          resolvedForumId: authorizedForumId,
          createdItem: null,
        };
      }
      qPost.ID = savedPostId;
      const qSaved = await qPost.Save();
      if (!qSaved) {
        const qReason = extractEntitySaveError(qPost);
        await savedPostEntity.Delete?.().catch(() => false);
        return {
          success: false,
          validationErrors: {},
          errorMessage: qReason
            ? `Failed to save Question subtype: ${qReason} — rolled back base post.`
            : 'Failed to save Question subtype entity — rolled back base post.',
          persistedPostId: null,
          resolvedForumId: authorizedForumId,
          createdItem: null,
        };
      }
      savedQuestionEntity = qPost;
    }

    if (matchedTopicTags.length > 0 && params.createPostTagEntity) {
      for (const topicTag of matchedTopicTags) {
        const postTag = await params.createPostTagEntity();
        if (!postTag) {
          await savedQuestionEntity?.Delete?.().catch(() => false);
          await savedPostEntity.Delete?.().catch(() => false);
          return {
            success: false,
            validationErrors: {},
            errorMessage: `Could not attach topic tag "${topicTag.name}" — rolled back post.`,
            persistedPostId: null,
            resolvedForumId: authorizedForumId,
            createdItem: null,
          };
        }
        postTag.PostID = savedPostId;
        postTag.TopicTagID = topicTag.id;
        postTag.AssignedByAI = false;
        const tagSaved = await postTag.Save();
        if (!tagSaved) {
          const tagReason = extractEntitySaveError(postTag);
          await savedQuestionEntity?.Delete?.().catch(() => false);
          await savedPostEntity.Delete?.().catch(() => false);
          return {
            success: false,
            validationErrors: {},
            errorMessage: tagReason
              ? `Failed saving topic tag "${topicTag.name}": ${tagReason} — rolled back post.`
              : `Failed saving topic tag "${topicTag.name}" — rolled back post.`,
            persistedPostId: null,
            resolvedForumId: authorizedForumId,
            createdItem: null,
          };
        }
      }
    }
  } catch (err) {
    if (savedQuestionEntity) {
      await savedQuestionEntity.Delete?.().catch(() => false);
    }
    if (savedPostEntity) {
      await savedPostEntity.Delete?.().catch(() => false);
    }
    return {
      success: false,
      validationErrors: {},
      errorMessage: err instanceof Error ? err.message : 'Server error while publishing post — draft was preserved.',
      persistedPostId: null,
      resolvedForumId: authorizedForumId,
      createdItem: null,
    };
  }

  const combinedTagsInput =
    matchedTopicTags.length > 0
      ? Array.from(
          new Set([
            ...matchedTopicTags.map((t) => t.name),
            ...resolvedDraft.tagsInput
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
          ]),
        ).join(', ')
      : resolvedDraft.tagsInput;

  const createdItem = CreateAskShareStreamItem(
    { ...resolvedDraft, tagsInput: combinedTagsInput },
    params.authorName || 'Community Member',
    'Member',
  );
  if (matchedForum) {
    createdItem.spaceLabel = matchedForum.name;
    createdItem.spaceId = matchedForum.dbSpaceId ?? matchedForum.spaceId;
  }
  if (savedPostId) {
    createdItem.sourcePostId = savedPostId;
  }
  createdItem.forumId = authorizedForumId;
  createdItem.promotedToSpaceId = null;

  return {
    success: true,
    validationErrors: {},
    errorMessage: null,
    persistedPostId: savedPostId,
    resolvedForumId: authorizedForumId,
    createdItem,
  };
}

export function ComputeNextTrapFocusTarget<T>(
  focusables: ReadonlyArray<T>,
  activeElement: T | null,
  shiftKey: boolean,
): T | null {
  if (focusables.length === 0) {
    return null;
  }
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const currentIndex = activeElement ? focusables.indexOf(activeElement) : -1;

  if (shiftKey) {
    if (currentIndex <= 0) {
      return last;
    }
    return focusables[currentIndex - 1];
  }

  if (currentIndex < 0 || currentIndex >= focusables.length - 1) {
    return first;
  }
  return focusables[currentIndex + 1];
}

/**
 * Builds the Knowledge Stream left-rail Space directory strictly from database `CommunitySpace` /
 * `Space` / `Forum` records in live sessions. Returns `COMMUNITY_SPACES_DIRECTORY` ONLY when
 * `isOfflineDemoMode` is true (`!Metadata.Provider`).
 */
export function BuildDynamicSpaceDirectory(params: {
  isOfflineDemoMode: boolean;
  spaces?: ReadonlyArray<LiveSpaceDirectoryRow>;
  forums?: ReadonlyArray<LiveForumDirectoryRow>;
}): CommunitySpaceDirectoryItem[] {
  if (params.isOfflineDemoMode) {
    return COMMUNITY_SPACES_DIRECTORY.map((s) => ({ ...s }));
  }

  const directory: CommunitySpaceDirectoryItem[] = [
    {
      id: 'all',
      name: 'All Spaces',
      category: 'Commons',
      description: 'Every authorized community space and forum in this workspace.',
    },
  ];

  const seenIds = new Set<string>(['all']);

  for (const space of params.spaces ?? []) {
    const id = space.ID?.trim();
    if (!id) continue;
    const key = id.toLowerCase();
    if (seenIds.has(key)) continue;
    seenIds.add(key);
    directory.push({
      id,
      name: space.Name?.trim() || space.Slug?.trim() || 'Community Space',
      category: space.CommunityKind?.trim() || 'Community Space',
      description: space.Description?.trim() || 'Authorized community space.',
    });
  }

  for (const forum of params.forums ?? []) {
    const candidateId = forum.SpaceID?.trim() || forum.ID?.trim();
    if (!candidateId) continue;
    const key = candidateId.toLowerCase();
    if (seenIds.has(key)) continue;
    seenIds.add(key);
    directory.push({
      id: candidateId,
      name: forum.Name?.trim() || 'Community Forum',
      category: forum.SpaceID ? 'Community Space' : 'Forum',
      description: forum.Description?.trim() || 'Authorized community discussion forum.',
    });
  }

  return directory;
}

/**
 * Builds Knowledge Stream topic filter pills strictly from database `ForumTopicTag` rows in live
 * sessions. Returns `COMMUNITY_TOPIC_TAGS` ONLY when `isOfflineDemoMode` is true.
 */
export function BuildDynamicTopicTags(params: {
  isOfflineDemoMode: boolean;
  topicTags?: ReadonlyArray<LiveForumTopicTagRow>;
}): string[] {
  if (params.isOfflineDemoMode) {
    return [...COMMUNITY_TOPIC_TAGS];
  }

  const seen = new Set<string>();
  const sorted = [...(params.topicTags ?? [])].sort((a, b) => {
    const countDiff = (b.PostCount ?? 0) - (a.PostCount ?? 0);
    if (countDiff !== 0) return countDiff;
    return a.Name.localeCompare(b.Name);
  });

  const tags: string[] = [];
  for (const row of sorted) {
    const name = row.Name?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(name);
  }
  return tags;
}

export interface ReplyForumPostEntityLike {
  ID: mjBizAppsCommunityForumPostEntity['ID'];
  ForumID: mjBizAppsCommunityForumPostEntity['ForumID'];
  PostTypeID: mjBizAppsCommunityForumPostEntity['PostTypeID'];
  RootPostID: mjBizAppsCommunityForumPostEntity['RootPostID'];
  ParentPostID: mjBizAppsCommunityForumPostEntity['ParentPostID'];
  ReplyDepth: mjBizAppsCommunityForumPostEntity['ReplyDepth'];
  AuthorUserID: mjBizAppsCommunityForumPostEntity['AuthorUserID'];
  BodyMarkdown: mjBizAppsCommunityForumPostEntity['BodyMarkdown'];
  Status: mjBizAppsCommunityForumPostEntity['Status'];
  Save(): Promise<boolean>;
  LatestResult?: { CompleteMessage?: string | null } | null;
}

export interface PersistDetailReplyParams {
  item: CommunityCommonsItem;
  replyBody: string;
  authorName: string;
  authorRole?: string;
  isOfflineDemoMode: boolean;
  postTypeIdByCode: ReadonlyMap<string, string>;
  currentUserId: string | null | undefined;
  createForumPostEntity: (() => Promise<ReplyForumPostEntityLike | null>) | null;
  reloadThreadReplies: ((rootPostId: string) => Promise<ReadonlyArray<CommunityCommonsReply>>) | null;
}

export interface PersistDetailReplyResult {
  success: boolean;
  offlineFallback: boolean;
  errorMessage: string | null;
  statusMessage: string | null;
  replies: ReadonlyArray<CommunityCommonsReply>;
  replyCount: number;
}

/**
 * Persists a child `ForumPost` reply (`PostType = 'reply'`, `RootPostID`, `ParentPostID`,
 * `ReplyDepth`, `Status = 'Published'`) in live mode and reloads replies from the database.
 * Uses local offline fallback ONLY when `isOfflineDemoMode` is true (`!Metadata.Provider`).
 */
export async function PersistDetailReply(params: PersistDetailReplyParams): Promise<PersistDetailReplyResult> {
  const trimmed = params.replyBody.trim();
  if (!trimmed) {
    return {
      success: false,
      offlineFallback: params.isOfflineDemoMode,
      errorMessage: 'Please enter a reply before posting.',
      statusMessage: null,
      replies: params.item.replies,
      replyCount: params.item.replyCount,
    };
  }

  if (params.isOfflineDemoMode) {
    const newReply: CommunityCommonsReply = {
      id: `reply-${crypto.randomUUID()}`,
      authorName: params.authorName || 'Community Member',
      authorRole: params.authorRole || 'Enterprise Member · MemberJunction',
      authorInitials: computeInitials(params.authorName || 'Community Member'),
      timestampLabel: 'Just now',
      bodyMarkdown: trimmed,
      isAccepted: false,
      upvotes: 1,
    };
    const nextReplies = [...params.item.replies, newReply];
    return {
      success: true,
      offlineFallback: true,
      errorMessage: null,
      statusMessage: 'Reply added to thread.',
      replies: nextReplies,
      replyCount: nextReplies.length,
    };
  }

  const replyPostTypeId = params.postTypeIdByCode.get('reply') ?? null;
  if (!replyPostTypeId) {
    return {
      success: false,
      offlineFallback: false,
      errorMessage: 'PostType "reply" is not configured — cannot save reply.',
      statusMessage: null,
      replies: params.item.replies,
      replyCount: params.item.replyCount,
    };
  }

  if (!params.createForumPostEntity) {
    return {
      success: false,
      offlineFallback: false,
      errorMessage: 'Metadata provider is unavailable — cannot save reply.',
      statusMessage: null,
      replies: params.item.replies,
      replyCount: params.item.replyCount,
    };
  }

  let validRootPostId: string;
  let validForumId: string;
  let validUserId: string;
  try {
    validRootPostId = AssertValidUUID(params.item.sourcePostId, 'rootPostId');
    validForumId = AssertValidUUID(params.item.forumId ?? '', 'forumId');
    validUserId = AssertValidUUID(params.currentUserId ?? '', 'currentUserId');
  } catch (err) {
    return {
      success: false,
      offlineFallback: false,
      errorMessage: err instanceof Error ? err.message : 'Invalid thread or user identifier — cannot save reply.',
      statusMessage: null,
      replies: params.item.replies,
      replyCount: params.item.replyCount,
    };
  }

  try {
    const replyEntity = await params.createForumPostEntity();
    if (!replyEntity) {
      return {
        success: false,
        offlineFallback: false,
        errorMessage: 'Could not instantiate Forum Post reply entity.',
        statusMessage: null,
        replies: params.item.replies,
        replyCount: params.item.replyCount,
      };
    }

    replyEntity.ForumID = validForumId;
    replyEntity.PostTypeID = replyPostTypeId;
    replyEntity.RootPostID = validRootPostId;
    replyEntity.ParentPostID = validRootPostId;
    replyEntity.ReplyDepth = 1;
    replyEntity.AuthorUserID = validUserId;
    replyEntity.BodyMarkdown = trimmed;
    replyEntity.Status = 'Published';

    const saved = await replyEntity.Save();
    if (!saved) {
      return {
        success: false,
        offlineFallback: false,
        errorMessage: replyEntity.LatestResult?.CompleteMessage?.trim() || 'Failed to save reply on server.',
        statusMessage: null,
        replies: params.item.replies,
        replyCount: params.item.replyCount,
      };
    }

    const reloaded = params.reloadThreadReplies
      ? await params.reloadThreadReplies(validRootPostId)
      : params.item.replies;

    const savedStatus: mjBizAppsCommunityForumPostEntity['Status'] = replyEntity.Status;
    const statusMessage =
      savedStatus === ('PendingModeration' as mjBizAppsCommunityForumPostEntity['Status'])
        ? 'Reply submitted and queued for moderator approval.'
        : 'Reply saved to thread.';

    return {
      success: true,
      offlineFallback: false,
      errorMessage: null,
      statusMessage,
      replies: [...reloaded],
      replyCount: reloaded.length,
    };
  } catch (err) {
    return {
      success: false,
      offlineFallback: false,
      errorMessage: err instanceof Error ? err.message : 'Server error while saving reply.',
      statusMessage: null,
      replies: params.item.replies,
      replyCount: params.item.replyCount,
    };
  }
}

export interface ForumPostReactionEntityLike {
  ID: mjBizAppsCommunityForumPostReactionEntity['ID'];
  PostID: mjBizAppsCommunityForumPostReactionEntity['PostID'];
  UserID: mjBizAppsCommunityForumPostReactionEntity['UserID'];
  ReactionKind: mjBizAppsCommunityForumPostReactionEntity['ReactionKind'];
  Weight: mjBizAppsCommunityForumPostReactionEntity['Weight'];
  Save(): Promise<boolean>;
  Delete(): Promise<boolean>;
  LatestResult?: { CompleteMessage?: string | null } | null;
}

export interface ToggleReactionParams {
  item: CommunityCommonsItem;
  isOfflineDemoMode: boolean;
  currentUserId: string | null | undefined;
  reactionKind?: mjBizAppsCommunityForumPostReactionEntity['ReactionKind'];
  executor?: CommunityGraphQLExecutor | null; // Add this
  findExistingReactionId:
    | ((
        postId: string,
        userId: string,
        kind: mjBizAppsCommunityForumPostReactionEntity['ReactionKind'],
      ) => Promise<string | null>)
    | null;
  loadReactionEntityById: ((reactionId: string) => Promise<ForumPostReactionEntityLike | null>) | null;
  createReactionEntity: (() => Promise<ForumPostReactionEntityLike | null>) | null;
  refreshPostReactionScore: ((postId: string) => Promise<number | null>) | null;
}

export interface ToggleReactionResult {
  success: boolean;
  offlineFallback: boolean;
  upvotedByMe: boolean;
  upvoteCount: number;
  errorMessage: string | null;
}

/**
 * Toggles a persisted `ForumPostReaction` (`ReactionKind = 'Upvote'`) row in live mode and
 * refreshes the authoritative `ForumPost.ReactionScore` from the server. Falls back to local-only
 * toggling ONLY when `isOfflineDemoMode` is true (`!Metadata.Provider`).
 */
export async function ToggleReactionViaProvider(params: ToggleReactionParams): Promise<ToggleReactionResult> {
  if (params.isOfflineDemoMode) {
    const nextUpvoted = !params.item.upvotedByMe;
    const nextCount = Math.max(0, params.item.upvoteCount + (nextUpvoted ? 1 : -1));
    return {
      success: true,
      offlineFallback: true,
      upvotedByMe: nextUpvoted,
      upvoteCount: nextCount,
      errorMessage: null,
    };
  }

  if (params.executor) {
    try {
      const payload = await InvokeToggleCommunityPostReactionMutation(params.executor, {
        PostID: params.item.sourcePostId,
        ReactionType: params.reactionKind ?? 'Upvote',
      });
      if (payload.Success) {
        return {
          success: true,
          offlineFallback: false,
          upvotedByMe: !!payload.Reacted,
          upvoteCount: payload.ReactionScore ?? 0,
          errorMessage: null,
        };
      }
      return {
        success: false,
        offlineFallback: false,
        upvotedByMe: params.item.upvotedByMe,
        upvoteCount: params.item.upvoteCount,
        errorMessage: payload.ErrorMessage ?? 'Failed to toggle reaction.',
      };
    } catch (err) {
      return {
        success: false,
        offlineFallback: false,
        upvotedByMe: params.item.upvotedByMe,
        upvoteCount: params.item.upvoteCount,
        errorMessage: err instanceof Error ? err.message : 'Server error while toggling reaction.',
      };
    }
  }

  const reactionKind: mjBizAppsCommunityForumPostReactionEntity['ReactionKind'] = params.reactionKind ?? 'Upvote';

  if (
    !params.findExistingReactionId ||
    !params.loadReactionEntityById ||
    !params.createReactionEntity ||
    !params.refreshPostReactionScore
  ) {
    return {
      success: false,
      offlineFallback: false,
      upvotedByMe: params.item.upvotedByMe,
      upvoteCount: params.item.upvoteCount,
      errorMessage: 'Reaction persistence provider is unavailable.',
    };
  }

  let validPostId: string;
  let validUserId: string;
  try {
    validPostId = AssertValidUUID(params.item.sourcePostId, 'postId');
    validUserId = AssertValidUUID(params.currentUserId ?? '', 'userId');
  } catch (err) {
    return {
      success: false,
      offlineFallback: false,
      upvotedByMe: params.item.upvotedByMe,
      upvoteCount: params.item.upvoteCount,
      errorMessage: err instanceof Error ? err.message : 'Invalid post or user identifier for reaction.',
    };
  }

  try {
    const existingId = await params.findExistingReactionId(validPostId, validUserId, reactionKind);
    let nextUpvoted = false;

    if (existingId) {
      const validReactionId = AssertValidUUID(existingId, 'reactionId');
      const existingEntity = await params.loadReactionEntityById(validReactionId);
      if (!existingEntity) {
        return {
          success: false,
          offlineFallback: false,
          upvotedByMe: params.item.upvotedByMe,
          upvoteCount: params.item.upvoteCount,
          errorMessage: 'Existing reaction record could not be loaded for removal.',
        };
      }
      const deleted = await existingEntity.Delete();
      if (!deleted) {
        return {
          success: false,
          offlineFallback: false,
          upvotedByMe: params.item.upvotedByMe,
          upvoteCount: params.item.upvoteCount,
          errorMessage: existingEntity.LatestResult?.CompleteMessage?.trim() || 'Failed to remove upvote on server.',
        };
      }
      nextUpvoted = false;
    } else {
      const createdEntity = await params.createReactionEntity();
      if (!createdEntity) {
        return {
          success: false,
          offlineFallback: false,
          upvotedByMe: params.item.upvotedByMe,
          upvoteCount: params.item.upvoteCount,
          errorMessage: 'Could not instantiate reaction entity.',
        };
      }
      createdEntity.PostID = validPostId;
      createdEntity.UserID = validUserId;
      createdEntity.ReactionKind = reactionKind;
      createdEntity.Weight = 1;
      const saved = await createdEntity.Save();
      if (!saved) {
        return {
          success: false,
          offlineFallback: false,
          upvotedByMe: params.item.upvotedByMe,
          upvoteCount: params.item.upvoteCount,
          errorMessage: createdEntity.LatestResult?.CompleteMessage?.trim() || 'Failed to save upvote on server.',
        };
      }
      nextUpvoted = true;
    }

    const refreshedScore = await params.refreshPostReactionScore(validPostId);
    const nextCount =
      typeof refreshedScore === 'number' && Number.isFinite(refreshedScore)
        ? refreshedScore
        : Math.max(0, params.item.upvoteCount + (nextUpvoted ? 1 : -1));

    return {
      success: true,
      offlineFallback: false,
      upvotedByMe: nextUpvoted,
      upvoteCount: nextCount,
      errorMessage: null,
    };
  } catch (err) {
    return {
      success: false,
      offlineFallback: false,
      upvotedByMe: params.item.upvotedByMe,
      upvoteCount: params.item.upvoteCount,
      errorMessage: err instanceof Error ? err.message : 'Server error while updating reaction.',
    };
  }
}
