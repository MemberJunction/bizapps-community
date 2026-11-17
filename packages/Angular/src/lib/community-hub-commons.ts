import type {
  mjBizAppsCommunityForumAnswerPostEntity,
  mjBizAppsCommunityForumInteractivePostEntity,
  mjBizAppsCommunityForumPostEntity,
  mjBizAppsCommunityForumQuestionPostEntity,
} from '@mj-biz-apps/community-entities';
import type { CommunityHubTabKey } from './community-hub-preferences.ts';

export type CommunitySpaceFilterId =
  | 'all'
  | 'architecture-standards'
  | 'product-ideation'
  | 'operations-playbooks'
  | 'governance-rfcs';

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
  deliverableTitle: string | null;
  sourceTab: CommunityHubTabKey;
  sourcePostId: string;
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
}

export interface AskSharePostEntityLike {
  ID: mjBizAppsCommunityForumPostEntity['ID'];
  ForumID: mjBizAppsCommunityForumPostEntity['ForumID'];
  AuthorUserID: mjBizAppsCommunityForumPostEntity['AuthorUserID'];
  PostTypeID: mjBizAppsCommunityForumPostEntity['PostTypeID'];
  Title: mjBizAppsCommunityForumPostEntity['Title'];
  BodyMarkdown: mjBizAppsCommunityForumPostEntity['BodyMarkdown'];
  Status: mjBizAppsCommunityForumPostEntity['Status'];
  Save(): Promise<boolean>;
  Delete?(): Promise<boolean>;
}

export interface AskShareQuestionPostEntityLike {
  ID: mjBizAppsCommunityForumQuestionPostEntity['ID'];
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
  createForumPostEntity: (() => Promise<AskSharePostEntityLike | null>) | null;
  createQuestionPostEntity?: (() => Promise<AskShareQuestionPostEntityLike | null>) | null;
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
  title: string;
  bodyMarkdown: string;
  epistemicStatus: mjBizAppsCommunityForumAnswerPostEntity['AIEpistemicStatus'];
  confidenceScore: number | null;
  isAccepted: boolean;
  authorName?: string | null;
  authorRole?: string | null;
  timestampLabel?: string | null;
  upvoteCount?: number | null;
  replies?: ReadonlyArray<CommunityCommonsReply>;
}

export interface CommonsIdeaInput {
  id: string;
  campaignId: string;
  title: string;
  summary: string;
  totalPointsAllocated: number;
  effectiveQuadraticVotes: number;
  authorName?: string | null;
  authorRole?: string | null;
  timestampLabel?: string | null;
  replies?: ReadonlyArray<CommunityCommonsReply>;
}

export interface CommonsLivingDocInput {
  id: string;
  title: string;
  bodyMarkdown: string;
  postTypeCode: 'collaborative-doc' | 'collaborative-sheet' | 'collaborative-deck' | 'interactive-experience';
  experienceKind?: mjBizAppsCommunityForumInteractivePostEntity['ExperienceKind'] | null;
  authorName?: string | null;
  authorRole?: string | null;
  timestampLabel?: string | null;
  upvoteCount?: number | null;
  replies?: ReadonlyArray<CommunityCommonsReply>;
}

export interface CommonsFeedPostInput {
  id: string;
  title: string;
  bodyMarkdown: string;
  status: mjBizAppsCommunityForumPostEntity['Status'];
  authorName?: string | null;
  authorRole?: string | null;
  timestampLabel?: string | null;
  upvoteCount?: number | null;
  upvotedByMe?: boolean;
  replies?: ReadonlyArray<CommunityCommonsReply>;
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
  { key: 'all', label: 'All Activity', icon: 'fa-solid fa-layer-group' },
  { key: 'post', label: 'Posts', icon: 'fa-solid fa-comments' },
  { key: 'verified-qa', label: 'Verified Q&A', icon: 'fa-solid fa-check-double' },
  { key: 'ideation', label: 'Ideation', icon: 'fa-solid fa-lightbulb' },
  { key: 'living-guide', label: 'Living Guides', icon: 'fa-solid fa-book-open' },
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

export function BuildCommonsStreamItems(params: {
  feedPosts: ReadonlyArray<CommonsFeedPostInput>;
  qaCanonItems: ReadonlyArray<CommonsQAInput>;
  ideationItems: ReadonlyArray<CommonsIdeaInput>;
  livingDocItems: ReadonlyArray<CommonsLivingDocInput>;
  includeDemoFixtures?: boolean;
}): CommunityCommonsItem[] {
  const items: CommunityCommonsItem[] = [];
  const includeDemo = params.includeDemoFixtures === true;

  for (const post of params.feedPosts) {
    const inferred = inferSpaceAndTags(post.title, post.bodyMarkdown, 'operations-playbooks');
    const resolvedSpaceId = post.spaceId && post.spaceId !== 'all' ? post.spaceId : inferred.spaceId;
    const authorName = post.authorName?.trim() || 'Community Member';
    const authorRole = post.authorRole?.trim() || 'Member';
    const replies = post.replies ? post.replies.map((r) => ({ ...r })) : [];
    const upvoteCount =
      typeof post.upvoteCount === 'number' && Number.isFinite(post.upvoteCount) ? post.upvoteCount : 0;

    items.push({
      id: `post-${post.id}`,
      title: post.title,
      excerpt: post.bodyMarkdown.slice(0, 180) + (post.bodyMarkdown.length > 180 ? '...' : ''),
      bodyMarkdown: post.bodyMarkdown,
      spaceId: resolvedSpaceId,
      spaceLabel: getSpaceLabel(resolvedSpaceId),
      streamType: 'post',
      entryTypeLabel: 'Discussion Post',
      statusBadge: post.status || 'Published',
      statusTone: 'brand',
      epistemicStatus: 'Community Thread',
      confidenceScore: null,
      authorName,
      authorRole,
      authorInitials: computeInitials(authorName),
      timestampLabel: post.timestampLabel?.trim() || post.status || 'Published',
      tags: inferred.tags,
      upvoteCount,
      upvotedByMe: Boolean(post.upvotedByMe),
      replyCount: replies.length,
      replies,
      graduatedToDeliverable: false,
      deliverableTitle: null,
      sourceTab: 'knowledge-stream',
      sourcePostId: post.id,
    });
  }

  for (const qa of params.qaCanonItems) {
    const inferred = inferSpaceAndTags(qa.title, qa.bodyMarkdown, 'architecture-standards');
    const isVerified = qa.isAccepted || qa.epistemicStatus === 'Canon Verified';
    const authorName = qa.authorName?.trim() || 'Community Member';
    const authorRole = qa.authorRole?.trim() || 'Member';
    const replies = qa.replies ? qa.replies.map((r) => ({ ...r })) : [];
    const upvoteCount = typeof qa.upvoteCount === 'number' && Number.isFinite(qa.upvoteCount) ? qa.upvoteCount : 0;

    items.push({
      id: `qa-${qa.id}`,
      title: qa.title,
      excerpt: qa.bodyMarkdown.slice(0, 180) + (qa.bodyMarkdown.length > 180 ? '...' : ''),
      bodyMarkdown: qa.bodyMarkdown,
      spaceId: inferred.spaceId,
      spaceLabel: getSpaceLabel(inferred.spaceId),
      streamType: 'verified-qa',
      entryTypeLabel: 'Verified Q&A',
      statusBadge: qa.epistemicStatus || (isVerified ? 'Canon Verified' : 'Needs Answer'),
      statusTone: isVerified ? 'success' : 'warning',
      epistemicStatus: qa.epistemicStatus ?? (isVerified ? 'Canon Verified' : 'Under Review'),
      confidenceScore: qa.confidenceScore,
      authorName,
      authorRole,
      authorInitials: computeInitials(authorName),
      timestampLabel: qa.timestampLabel?.trim() || (isVerified ? 'Verified Canon' : 'Under Review'),
      tags: inferred.tags,
      upvoteCount,
      upvotedByMe: false,
      replyCount: replies.length,
      replies,
      graduatedToDeliverable: false,
      deliverableTitle: null,
      sourceTab: 'qa-canon-workbench',
      sourcePostId: qa.id,
    });
  }

  for (const idea of params.ideationItems) {
    const inferred = inferSpaceAndTags(idea.title, idea.summary, 'product-ideation');
    const authorName = idea.authorName?.trim() || 'Community Member';
    const authorRole = idea.authorRole?.trim() || 'Proposal Author';
    const replies = idea.replies ? idea.replies.map((r) => ({ ...r })) : [];

    items.push({
      id: `idea-${idea.id}`,
      title: idea.title,
      excerpt: idea.summary,
      bodyMarkdown: idea.summary,
      spaceId: 'product-ideation',
      spaceLabel: getSpaceLabel('product-ideation'),
      streamType: 'ideation',
      entryTypeLabel: 'Ideation Proposal',
      statusBadge: `${idea.effectiveQuadraticVotes} Quadratic Votes`,
      statusTone: 'brand',
      epistemicStatus: `${idea.totalPointsAllocated} Voice Credits Allocated`,
      confidenceScore: null,
      authorName,
      authorRole,
      authorInitials: computeInitials(authorName),
      timestampLabel: idea.timestampLabel?.trim() || 'Open Campaign',
      tags: Array.from(new Set([...inferred.tags, 'Ideation'])),
      upvoteCount: typeof idea.totalPointsAllocated === 'number' ? idea.totalPointsAllocated : 0,
      upvotedByMe: false,
      replyCount: replies.length,
      replies,
      graduatedToDeliverable: false,
      deliverableTitle: null,
      sourceTab: 'quadratic-ideation-wallet',
      sourcePostId: idea.id,
    });
  }

  for (const doc of params.livingDocItems) {
    const inferred = inferSpaceAndTags(doc.title, doc.bodyMarkdown, 'operations-playbooks');
    const isInteractive = doc.postTypeCode === 'interactive-experience';
    const authorName = doc.authorName?.trim() || 'Community Member';
    const authorRole = doc.authorRole?.trim() || 'Co-Author';
    const replies = doc.replies ? doc.replies.map((r) => ({ ...r })) : [];
    const upvoteCount = typeof doc.upvoteCount === 'number' && Number.isFinite(doc.upvoteCount) ? doc.upvoteCount : 0;

    items.push({
      id: `doc-${doc.id}`,
      title: doc.title,
      excerpt: doc.bodyMarkdown.slice(0, 180) + (doc.bodyMarkdown.length > 180 ? '...' : ''),
      bodyMarkdown: doc.bodyMarkdown,
      spaceId: inferred.spaceId,
      spaceLabel: getSpaceLabel(inferred.spaceId),
      streamType: 'living-guide',
      entryTypeLabel: isInteractive ? 'Interactive Mini-App' : 'Living Guide',
      statusBadge: isInteractive ? `Sandbox · ${doc.experienceKind ?? 'Interactive'}` : 'Living Playbook',
      statusTone: 'success',
      epistemicStatus: 'Co-Authored Standard',
      confidenceScore: null,
      authorName,
      authorRole,
      authorInitials: computeInitials(authorName),
      timestampLabel: doc.timestampLabel?.trim() || 'Living revision',
      tags: Array.from(new Set([...inferred.tags, 'Working Groups'])),
      upvoteCount,
      upvotedByMe: false,
      replyCount: replies.length,
      replies,
      graduatedToDeliverable: false,
      deliverableTitle: null,
      sourceTab: 'living-co-authoring',
      sourcePostId: doc.id,
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
): CommunityCommonsItem[] {
  return items.map((item) => {
    if (item.id !== itemId) return item;
    return {
      ...item,
      graduatedToDeliverable: true,
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
    ? { ...params.draft, spaceId: matchedForum.spaceId }
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

  let savedPostId: string | null = null;
  let savedPostEntity: AskSharePostEntityLike | null = null;
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
      return {
        success: false,
        validationErrors: {},
        errorMessage: 'Failed to save Forum Post on server — draft was preserved so nothing was lost.',
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
        await savedPostEntity.Delete?.().catch(() => false);
        return {
          success: false,
          validationErrors: {},
          errorMessage: 'Failed to save Question subtype entity — rolled back base post.',
          persistedPostId: null,
          resolvedForumId: authorizedForumId,
          createdItem: null,
        };
      }
    }
  } catch (err) {
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

  const createdItem = CreateAskShareStreamItem(
    resolvedDraft,
    params.authorName || 'Community Member',
    'Member',
  );
  if (matchedForum) {
    createdItem.spaceLabel = matchedForum.name;
  }
  if (savedPostId) {
    createdItem.sourcePostId = savedPostId;
  }

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
