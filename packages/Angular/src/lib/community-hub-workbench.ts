import type { CommunityAttachmentItem, IdeationAllocationMode } from '@mj-biz-apps/community-core';
import type {
  mjBizAppsCommunityForumAnswerPostEntity,
  mjBizAppsCommunityForumInteractivePostEntity,
} from '@mj-biz-apps/community-entities';
import type { CommunityBadgeTone } from './community-hub-commons.ts';

export type QaCanonFilterKey = 'all' | 'canon-verified' | 'novel-insight' | 'needs-review';
export type LivingDocFilterKey = 'all' | 'playbooks' | 'forms' | 'mini-apps';

export interface QaCanonItemInput {
  id: string;
  questionPostId: string | null;
  title: string;
  bodyMarkdown: string;
  epistemicStatus: mjBizAppsCommunityForumAnswerPostEntity['AIEpistemicStatus'];
  confidenceScore: number | null;
  isAccepted: boolean;
  attachments?: CommunityAttachmentItem[];
}

export interface QaCanonStats {
  total: number;
  canonVerifiedCount: number;
  acceptedCount: number;
  averageConfidencePct: number;
}

export interface IdeationIdeaInput {
  id: string;
  campaignId: string;
  title: string;
  summary: string;
  totalPointsAllocated: number;
  effectiveQuadraticVotes: number;
  myPointsAllocated: number;
  myEffectiveVotes: number;
  attachments?: CommunityAttachmentItem[];
}

export interface IdeationWalletSummary {
  budgetPoints: number;
  spentPoints: number;
  remainingPoints: number;
  utilizationPct: number;
  backedIdeasCount: number;
}

export interface LivingDocItemInput {
  id: string;
  title: string;
  bodyMarkdown: string;
  postTypeCode: 'collaborative-doc' | 'collaborative-sheet' | 'collaborative-deck' | 'interactive-experience';
  experienceKind?: mjBizAppsCommunityForumInteractivePostEntity['ExperienceKind'] | null;
  attachments?: CommunityAttachmentItem[];
}

export interface LivingDocTypeMeta {
  label: string;
  badgeText: string;
  tone: CommunityBadgeTone;
  icon: string;
}

export interface SlaCapacityInput {
  targetRps: number;
  maxP95LatencyMs: number;
  topologyProfile: 'single-region' | 'multi-region-active' | 'regulated-isolated';
}

export interface SlaCapacityResult {
  recommendedReplicas: number;
  retryWindowMinutes: number;
  burstQueueCapacity: number;
  summaryLine: string;
  headlineSpec: string;
}

export interface SavedCapacityPreset {
  id: string;
  label: string;
  detail: string;
}

export const DEFAULT_CAMPAIGN_BUDGET_POINTS = 100;

export function NormalizeCampaignBudget(
  budgetPoints: number | null | undefined,
  fallback: number = DEFAULT_CAMPAIGN_BUDGET_POINTS,
): number {
  if (typeof budgetPoints === 'number' && Number.isFinite(budgetPoints) && budgetPoints > 0) {
    return Math.round(budgetPoints);
  }
  return fallback;
}

export function IsCanonVerifiedQa(item: Pick<QaCanonItemInput, 'epistemicStatus' | 'isAccepted'>): boolean {
  return item.isAccepted || item.epistemicStatus === 'Canon Verified';
}

export function GetEpistemicBadgeTone(
  status: mjBizAppsCommunityForumAnswerPostEntity['AIEpistemicStatus'],
  isAccepted: boolean,
): CommunityBadgeTone {
  switch (status) {
    case 'Conflicts With Canon':
      return 'danger';
    case 'Partially Outdated':
    case 'Novel Insight':
      return 'warning';
    case 'Canon Verified':
      return 'success';
    default:
      return isAccepted ? 'success' : 'brand';
  }
}

export function MatchesQaCanonFilter(item: QaCanonItemInput, filterKey: QaCanonFilterKey): boolean {
  switch (filterKey) {
    case 'all':
      return true;
    case 'canon-verified':
      return IsCanonVerifiedQa(item);
    case 'novel-insight':
      return item.epistemicStatus === 'Novel Insight';
    case 'needs-review':
      return (
        item.epistemicStatus === 'Partially Outdated' ||
        item.epistemicStatus === 'Conflicts With Canon' ||
        item.epistemicStatus == null
      );
    default:
      return true;
  }
}

export function FilterQaCanonItems<T extends QaCanonItemInput>(
  items: ReadonlyArray<T>,
  filterKey: QaCanonFilterKey,
  searchQuery: string,
): T[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  return items.filter((item) => {
    if (!MatchesQaCanonFilter(item, filterKey)) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }
    const hay = `${item.title} ${item.bodyMarkdown} ${item.epistemicStatus ?? ''}`.toLowerCase();
    return hay.includes(normalizedQuery);
  });
}

export function ComputeQaCanonStats(items: ReadonlyArray<QaCanonItemInput>): QaCanonStats {
  const total = items.length;
  let canonVerifiedCount = 0;
  let acceptedCount = 0;
  let confidenceSum = 0;
  let confidenceCount = 0;

  for (const item of items) {
    if (IsCanonVerifiedQa(item)) {
      canonVerifiedCount += 1;
    }
    if (item.isAccepted) {
      acceptedCount += 1;
    }
    if (typeof item.confidenceScore === 'number' && Number.isFinite(item.confidenceScore)) {
      confidenceSum += item.confidenceScore;
      confidenceCount += 1;
    }
  }

  return {
    total,
    canonVerifiedCount,
    acceptedCount,
    averageConfidencePct: confidenceCount > 0 ? Math.round((confidenceSum / confidenceCount) * 100) : 0,
  };
}

export function ComputeIdeationWalletSummary(
  items: ReadonlyArray<IdeationIdeaInput>,
  budgetPoints: number | null | undefined,
): IdeationWalletSummary {
  const normalizedBudget = NormalizeCampaignBudget(budgetPoints);
  const spentPoints = items.reduce((sum, item) => sum + Math.max(0, item.myPointsAllocated), 0);
  const remainingPoints = Math.max(0, normalizedBudget - spentPoints);
  const utilizationPct = normalizedBudget > 0 ? Math.min(100, Math.round((spentPoints / normalizedBudget) * 100)) : 0;
  const backedIdeasCount = items.filter((item) => item.myPointsAllocated > 0).length;

  return {
    budgetPoints: normalizedBudget,
    spentPoints,
    remainingPoints,
    utilizationPct,
    backedIdeasCount,
  };
}

export function ComputeQuadraticEffectiveVotes(pointsAllocated: number, mode: IdeationAllocationMode): number {
  const safePoints = Math.max(0, pointsAllocated);
  return mode === 'Quadratic' ? Math.sqrt(safePoints) : safePoints;
}

export function ComputeIdeaPointPresets(params: {
  mode: IdeationAllocationMode;
  currentPoints: number;
  remainingBudget: number;
  maxPointsPerIdea: number | null;
  budgetPoints: number;
}): number[] {
  const maxAllowedByWallet = params.currentPoints + Math.max(0, params.remainingBudget);
  const cap =
    params.maxPointsPerIdea !== null && params.maxPointsPerIdea > 0
      ? Math.min(params.maxPointsPerIdea, maxAllowedByWallet, params.budgetPoints)
      : Math.min(maxAllowedByWallet, params.budgetPoints);

  const candidates =
    params.mode === 'Quadratic' ? [0, 4, 9, 16, 25, 36, 49, 64, 100] : [0, 5, 10, 20, 25, 50, 100];
  return candidates.filter((pts) => pts <= cap);
}

export function GetLivingDocTypeMeta(item: LivingDocItemInput): LivingDocTypeMeta {
  switch (item.postTypeCode) {
    case 'collaborative-doc':
      return {
        label: 'Living Playbook',
        badgeText: 'Living Playbook',
        tone: 'brand',
        icon: 'fa-solid fa-book-open',
      };
    case 'collaborative-sheet':
      return {
        label: 'Inline Form',
        badgeText: 'Inline Member Form',
        tone: 'success',
        icon: 'fa-solid fa-clipboard-check',
      };
    case 'collaborative-deck':
      return {
        label: 'Presentation Deck',
        badgeText: 'Co-Authored Deck',
        tone: 'neutral',
        icon: 'fa-solid fa-display',
      };
    case 'interactive-experience':
      return {
        label: 'Interactive Mini-App',
        badgeText: item.experienceKind ? `Sandbox · ${item.experienceKind}` : 'Sandboxed Mini-App',
        tone: 'warning',
        icon: 'fa-solid fa-cubes',
      };
  }
}

export function FilterLivingDocItems<T extends LivingDocItemInput>(
  items: ReadonlyArray<T>,
  filterKey: LivingDocFilterKey,
  searchQuery: string,
): T[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  return items.filter((item) => {
    const matchesCategory =
      filterKey === 'all' ||
      (filterKey === 'playbooks' && (item.postTypeCode === 'collaborative-doc' || item.postTypeCode === 'collaborative-deck')) ||
      (filterKey === 'forms' && item.postTypeCode === 'collaborative-sheet') ||
      (filterKey === 'mini-apps' && item.postTypeCode === 'interactive-experience');

    if (!matchesCategory) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }
    const hay = `${item.title} ${item.bodyMarkdown} ${item.postTypeCode} ${item.experienceKind ?? ''}`.toLowerCase();
    return hay.includes(normalizedQuery);
  });
}

export function CalculateSlaCapacitySpec(input: SlaCapacityInput): SlaCapacityResult {
  const rps = Math.max(10, Math.min(50000, Number.isFinite(input.targetRps) ? input.targetRps : 500));
  const latency = Math.max(20, Math.min(5000, Number.isFinite(input.maxP95LatencyMs) ? input.maxP95LatencyMs : 120));

  const profileFactor =
    input.topologyProfile === 'multi-region-active'
      ? 1.5
      : input.topologyProfile === 'regulated-isolated'
        ? 1.25
        : 1.0;

  const recommendedReplicas = Math.max(2, Math.ceil((rps / 250) * (150 / latency) * profileFactor));
  const retryWindowMinutes = input.topologyProfile === 'regulated-isolated' ? 30 : 15;
  const burstQueueCapacity = Math.round(rps * 12 * profileFactor);

  return {
    recommendedReplicas,
    retryWindowMinutes,
    burstQueueCapacity,
    headlineSpec: `${recommendedReplicas} replicas · ${burstQueueCapacity.toLocaleString()} burst msgs`,
    summaryLine: `Jitter retry window ${retryWindowMinutes} min · Target p95 <= ${latency} ms`,
  };
}

export function ResolveVisibleQaItem<T extends QaCanonItemInput>(
  items: ReadonlyArray<T>,
  selectedQaId: string | null,
  filterKey: QaCanonFilterKey,
  searchQuery: string,
): T | null {
  const visible = FilterQaCanonItems(items, filterKey, searchQuery);
  if (visible.length === 0) {
    return null;
  }
  return visible.find((q) => q.id === selectedQaId) ?? visible[0];
}

export function SyncQaSelection<T extends QaCanonItemInput>(state: {
  items: ReadonlyArray<T>;
  selectedQaId: string | null;
  filterKey: QaCanonFilterKey;
  searchQuery: string;
}): { selectedQaId: string | null; changed: boolean } {
  const active = ResolveVisibleQaItem(state.items, state.selectedQaId, state.filterKey, state.searchQuery);
  if (!active) {
    return { selectedQaId: state.selectedQaId, changed: false };
  }
  if (active.id !== state.selectedQaId) {
    return { selectedQaId: active.id, changed: true };
  }
  return { selectedQaId: state.selectedQaId, changed: false };
}

export function ResolveVisibleLivingDoc<T extends LivingDocItemInput>(
  items: ReadonlyArray<T>,
  selectedDocId: string | null,
  filterKey: LivingDocFilterKey,
  searchQuery: string,
): T | null {
  const visible = FilterLivingDocItems(items, filterKey, searchQuery);
  if (visible.length === 0) {
    return null;
  }
  return visible.find((d) => d.id === selectedDocId) ?? visible[0];
}

export function SyncLivingDocSelection<T extends LivingDocItemInput>(state: {
  items: ReadonlyArray<T>;
  selectedDocId: string | null;
  editingDocMarkdown: string;
  filterKey: LivingDocFilterKey;
  searchQuery: string;
}): { selectedDocId: string | null; editingDocMarkdown: string; changed: boolean } {
  const active = ResolveVisibleLivingDoc(state.items, state.selectedDocId, state.filterKey, state.searchQuery);
  if (!active) {
    return {
      selectedDocId: state.selectedDocId,
      editingDocMarkdown: state.editingDocMarkdown,
      changed: false,
    };
  }
  if (active.id !== state.selectedDocId) {
    return {
      selectedDocId: active.id,
      editingDocMarkdown: active.bodyMarkdown,
      changed: true,
    };
  }
  return {
    selectedDocId: state.selectedDocId,
    editingDocMarkdown: state.editingDocMarkdown,
    changed: false,
  };
}
