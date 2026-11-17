import {
  CompositeKey,
  Metadata,
  RunView,
  type TransactionGroupBase,
  type UserInfo,
} from '@memberjunction/core';
import { UUIDsEqual } from '@memberjunction/global';
import { AssertValidUUID } from '@mj-biz-apps/community-core';
import {
  COMMUNITY_ENTITY_NAMES,
  type mjBizAppsCommunityForumIdeaAllocationEntity,
  type mjBizAppsCommunityForumIdeaPostEntity,
} from '@mj-biz-apps/community-entities';

export interface IdeaAllocationAggregateRow {
  ID: string;
  IdeaPostID: string;
  PointsAllocated: number;
  QuadraticVotes: number;
}

export interface ComputedIdeaAggregate {
  totalPointsAllocated: number;
  effectiveQuadraticVotes: number;
  uniqueBackerCount: number;
}

export interface PaginatedLoadResult<TRow> {
  success: boolean;
  rows: TRow[];
  errorMessage?: string;
}

export interface AtomicAllocationResult {
  success: boolean;
  rolledBack: boolean;
  aggregate?: ComputedIdeaAggregate;
  errorMessage?: string;
}

const DEFAULT_PAGE_SIZE = 500;
const inFlightIdeaSaves = new Map<string, Promise<AtomicAllocationResult>>();

/** Computes exact idea totals from a full set of allocation rows, excluding withdrawn (`<= 0`) rows from backer count. */
export function ComputeIdeaAggregateFromAllocations(
  allocations: ReadonlyArray<Pick<IdeaAllocationAggregateRow, 'PointsAllocated' | 'QuadraticVotes'>>,
): ComputedIdeaAggregate {
  const backing = allocations.filter((a) => a.PointsAllocated > 0);
  return {
    totalPointsAllocated: backing.reduce((sum, a) => sum + a.PointsAllocated, 0),
    effectiveQuadraticVotes: backing.reduce((sum, a) => sum + a.QuadraticVotes, 0),
    uniqueBackerCount: backing.length,
  };
}

/** Computes a member's total spent points across all OTHER ideas belonging to the SAME campaign
 * (never summing allocations from unrelated campaigns and never bounded by UI page limits). */
export function ComputeCampaignWalletSpentOnOthers(params: {
  campaignIdeaIds: ReadonlySet<string>;
  userAllocations: ReadonlyArray<Pick<IdeaAllocationAggregateRow, 'IdeaPostID' | 'PointsAllocated'>>;
  excludeIdeaId: string | null;
}): number {
  let total = 0;
  for (const alloc of params.userAllocations) {
    if (params.excludeIdeaId && UUIDsEqual(alloc.IdeaPostID, params.excludeIdeaId)) {
      continue;
    }
    const inCampaign = Array.from(params.campaignIdeaIds).some((cid) => UUIDsEqual(cid, alloc.IdeaPostID));
    if (inCampaign && alloc.PointsAllocated > 0) {
      total += alloc.PointsAllocated;
    }
  }
  return total;
}

/** Paginates `RunView` in chunks of `pageSize` (default 500) so large ideas/wallets never silently truncate
 * at `MaxRows: 1000`. Fails CLOSED (`success: false`) on any failed page rather than returning partial `[]`. */
export async function LoadAllPaginatedRows<TRow>(params: {
  runView: RunView;
  entityName: string;
  extraFilter: string;
  fields: string[];
  user: UserInfo;
  pageSize?: number;
}): Promise<PaginatedLoadResult<TRow>> {
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const rows: TRow[] = [];
  let startRow = 0;

  while (true) {
    const res = await params.runView.RunView<TRow>(
      {
        EntityName: params.entityName,
        ExtraFilter: params.extraFilter,
        Fields: params.fields,
        ResultType: 'simple',
        StartRow: startRow,
        MaxRows: pageSize,
      },
      params.user,
    );
    if (!res?.Success) {
      return {
        success: false,
        rows: [],
        errorMessage: res?.ErrorMessage || `Failed loading ${params.entityName} (StartRow=${startRow}).`,
      };
    }
    const batch = res.Results ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) {
      break;
    }
    startRow += batch.length;
  }

  return { success: true, rows };
}

/** Serializes, fails closed on aggregate read errors, and rolls back the allocation row if either
 * loading authoritative allocations or persisting the `ForumIdeaPost` aggregate fails (`CR-21`). */
export function PersistIdeaAllocationAtomic(params: {
  ideaPostId: string;
  user: UserInfo;
  pointsAllocated: number;
  effectiveVotes: number;
}): Promise<AtomicAllocationResult> {
  const lockKey = `${params.ideaPostId.trim().toLowerCase()}:${params.user.ID.trim().toLowerCase()}`;
  const prior = inFlightIdeaSaves.get(lockKey);
  const next = (prior ? prior.catch(() => undefined) : Promise.resolve()).then(() =>
    executePersistIdeaAllocationAtomic(params),
  );
  inFlightIdeaSaves.set(lockKey, next);
  return next.finally(() => {
    if (inFlightIdeaSaves.get(lockKey) === next) {
      inFlightIdeaSaves.delete(lockKey);
    }
  });
}

async function tryCreateTransactionGroup(md: Metadata): Promise<TransactionGroupBase | null> {
  if (typeof md.CreateTransactionGroup !== 'function') {
    return null;
  }
  const provider = Metadata.Provider;
  if (!provider || typeof provider.CreateTransactionGroup !== 'function') {
    return null;
  }
  try {
    return await md.CreateTransactionGroup();
  } catch {
    return null;
  }
}

async function executePersistIdeaAllocationAtomic(params: {
  ideaPostId: string;
  user: UserInfo;
  pointsAllocated: number;
  effectiveVotes: number;
}): Promise<AtomicAllocationResult> {
  AssertValidUUID(params.ideaPostId, 'ideaPostId');
  AssertValidUUID(params.user.ID, 'user.ID');

  const md = new Metadata();
  const rv = new RunView();

  // 1. Read existing user allocation so we know exact prior values for rollback if needed
  const existingResult = await rv.RunView<IdeaAllocationAggregateRow>(
    {
      EntityName: COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations,
      ExtraFilter: `IdeaPostID = '${params.ideaPostId}' AND UserID = '${params.user.ID}'`,
      Fields: ['ID', 'IdeaPostID', 'PointsAllocated', 'QuadraticVotes'],
      ResultType: 'simple',
      MaxRows: 1,
    },
    params.user,
  );
  if (!existingResult?.Success) {
    return {
      success: false,
      rolledBack: false,
      errorMessage: existingResult?.ErrorMessage || 'Could not inspect existing allocation before saving.',
    };
  }

  const existingRow = existingResult.Results?.[0] ?? null;
  const isWithdrawal = params.pointsAllocated <= 0;

  if (isWithdrawal && !existingRow) {
    const otherRowsResult = await LoadAllPaginatedRows<IdeaAllocationAggregateRow>({
      runView: rv,
      entityName: COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations,
      extraFilter: `IdeaPostID = '${params.ideaPostId}'`,
      fields: ['ID', 'IdeaPostID', 'PointsAllocated', 'QuadraticVotes'],
      user: params.user,
    });
    if (!otherRowsResult.success) {
      return { success: false, rolledBack: false, errorMessage: otherRowsResult.errorMessage };
    }
    return {
      success: true,
      rolledBack: false,
      aggregate: ComputeIdeaAggregateFromAllocations(otherRowsResult.rows),
    };
  }

  const allocation = existingRow
    ? await md.GetEntityObject<mjBizAppsCommunityForumIdeaAllocationEntity>(
        COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations,
        CompositeKey.FromID(existingRow.ID),
        params.user,
      )
    : await md.GetEntityObject<mjBizAppsCommunityForumIdeaAllocationEntity>(
        COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations,
        params.user,
      );
  if (!allocation) {
    return {
      success: false,
      rolledBack: false,
      errorMessage: `Could not load Forum Idea Allocation entity for idea ${params.ideaPostId}.`,
    };
  }

  if (!isWithdrawal) {
    if (!existingRow) {
      allocation.IdeaPostID = params.ideaPostId;
      allocation.UserID = params.user.ID;
    }
    allocation.PointsAllocated = params.pointsAllocated;
    allocation.QuadraticVotes = params.effectiveVotes;
  }

  const txGroup = await tryCreateTransactionGroup(md);
  if (txGroup) {
    const otherRowsResult = await LoadAllPaginatedRows<IdeaAllocationAggregateRow>({
      runView: rv,
      entityName: COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations,
      extraFilter: `IdeaPostID = '${params.ideaPostId}'`,
      fields: ['ID', 'IdeaPostID', 'PointsAllocated', 'QuadraticVotes'],
      user: params.user,
    });
    if (!otherRowsResult.success) {
      return { success: false, rolledBack: false, errorMessage: otherRowsResult.errorMessage };
    }

    const mergedRows = otherRowsResult.rows.filter((r) => !UUIDsEqual(r.ID, allocation.ID));
    if (!isWithdrawal) {
      mergedRows.push({
        ID: allocation.ID,
        IdeaPostID: params.ideaPostId,
        PointsAllocated: params.pointsAllocated,
        QuadraticVotes: params.effectiveVotes,
      });
    }
    const aggregate = ComputeIdeaAggregateFromAllocations(mergedRows);

    const ideaPost = await md.GetEntityObject<mjBizAppsCommunityForumIdeaPostEntity>(
      COMMUNITY_ENTITY_NAMES.ForumIdeaPosts,
      CompositeKey.FromID(params.ideaPostId),
      params.user,
    );
    if (!ideaPost) {
      return {
        success: false,
        rolledBack: false,
        errorMessage: `Forum Idea Post ${params.ideaPostId} not found.`,
      };
    }
    ideaPost.TotalPointsAllocated = aggregate.totalPointsAllocated;
    ideaPost.EffectiveQuadraticVotes = aggregate.effectiveQuadraticVotes;
    ideaPost.UniqueBackerCount = aggregate.uniqueBackerCount;

    allocation.TransactionGroup = txGroup;
    ideaPost.TransactionGroup = txGroup;
    const allocQueued = isWithdrawal ? await allocation.Delete() : await allocation.Save();
    const postQueued = allocQueued ? await ideaPost.Save() : false;
    const committed = allocQueued && postQueued ? await txGroup.Submit() : false;
    if (!committed) {
      return {
        success: false,
        rolledBack: true,
        errorMessage: 'Transactional allocation + aggregate commit failed.',
      };
    }
    return { success: true, rolledBack: false, aggregate };
  }

  // Non-transactional fallback: mutate or delete allocation, compute fail-closed paginated
  // aggregate, and explicitly revert/re-create on any subsequent failure (never saving PointsAllocated = 0).
  const allocMutated = isWithdrawal ? await allocation.Delete() : await allocation.Save();
  if (!allocMutated) {
    return {
      success: false,
      rolledBack: false,
      errorMessage: isWithdrawal ? 'Failed deleting withdrawn Forum Idea Allocation.' : 'Failed saving Forum Idea Allocation.',
    };
  }

  const revertAllocation = async (): Promise<void> => {
    try {
      if (isWithdrawal && existingRow) {
        const restored = await md.GetEntityObject<mjBizAppsCommunityForumIdeaAllocationEntity>(
          COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations,
          params.user,
        );
        if (restored) {
          restored.ID = existingRow.ID;
          restored.IdeaPostID = params.ideaPostId;
          restored.UserID = params.user.ID;
          restored.PointsAllocated = existingRow.PointsAllocated;
          restored.QuadraticVotes = existingRow.QuadraticVotes;
          await restored.Save();
        }
      } else if (existingRow) {
        allocation.PointsAllocated = existingRow.PointsAllocated;
        allocation.QuadraticVotes = existingRow.QuadraticVotes;
        await allocation.Save();
      } else if (typeof allocation.Delete === 'function') {
        await allocation.Delete();
      }
    } catch {
      // Best-effort rollback when provider has no TransactionGroup
    }
  };

  const allRowsResult = await LoadAllPaginatedRows<IdeaAllocationAggregateRow>({
    runView: rv,
    entityName: COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations,
    extraFilter: `IdeaPostID = '${params.ideaPostId}'`,
    fields: ['ID', 'IdeaPostID', 'PointsAllocated', 'QuadraticVotes'],
    user: params.user,
  });
  if (!allRowsResult.success) {
    await revertAllocation();
    return {
      success: false,
      rolledBack: true,
      errorMessage: allRowsResult.errorMessage ?? 'Aggregate read failed — allocation reverted.',
    };
  }

  const aggregate = ComputeIdeaAggregateFromAllocations(allRowsResult.rows);
  const ideaPost = await md.GetEntityObject<mjBizAppsCommunityForumIdeaPostEntity>(
    COMMUNITY_ENTITY_NAMES.ForumIdeaPosts,
    CompositeKey.FromID(params.ideaPostId),
    params.user,
  );
  if (!ideaPost) {
    await revertAllocation();
    return {
      success: false,
      rolledBack: true,
      errorMessage: `Forum Idea Post ${params.ideaPostId} not found — allocation reverted.`,
    };
  }
  ideaPost.TotalPointsAllocated = aggregate.totalPointsAllocated;
  ideaPost.EffectiveQuadraticVotes = aggregate.effectiveQuadraticVotes;
  ideaPost.UniqueBackerCount = aggregate.uniqueBackerCount;

  const postSaved = await ideaPost.Save();
  if (!postSaved) {
    await revertAllocation();
    return {
      success: false,
      rolledBack: true,
      errorMessage: 'Failed saving Forum Idea Post aggregate — allocation reverted.',
    };
  }

  return { success: true, rolledBack: false, aggregate };
}
