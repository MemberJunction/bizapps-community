import {
  type RunViewParams,
  type RunViewResult,
  type UserInfo,
} from '@memberjunction/core';
import { IsValidUUID, UUIDsEqual } from '@memberjunction/global';
import { AssertValidUUID } from '@mj-biz-apps/community-core';
import type {
  mjBizAppsCommunityForumArtifactPostEntity,
  mjBizAppsCommunityForumInteractivePostEntity,
} from '@mj-biz-apps/community-entities';
import { StripMarkdownToPlainText } from './community-markdown.ts';
import type { CommunityHubPreferences } from './community-hub-preferences.ts';

export type CommunityArtifactPostKind = 'artifact-post' | 'interactive-post' | 'embedded-artifact';

export type CommunityArtifactViewerMode = 'inline' | 'drawer';

export type CommunityArtifactViewerState = 'closed' | 'loading' | 'ready' | 'missing' | 'error';

export type CommunityArtifactFallbackReason =
  | 'missing-artifact-id'
  | 'artifact-not-found'
  | 'pinned-version-not-found'
  | 'load-error';

export type CommunityArtifactPanelViewMode = 'edit' | 'suggest' | 'diff' | 'present';

/**
 * Input describing a `ForumArtifactPost`, `ForumInteractivePost`, or embedded artifact
 * to render inside `CommunityArtifactViewerComponent`.
 */
export interface CommunityArtifactViewerRequest {
  postId: string;
  postTitle: string;
  postKind: CommunityArtifactPostKind;
  artifactId: string | null;
  pinnedArtifactVersionId?: string | null;
  pinnedVersionNumber?: number | null;
  artifactModality?: mjBizAppsCommunityForumArtifactPostEntity['ArtifactModality'] | null;
  collaborationMode?: mjBizAppsCommunityForumArtifactPostEntity['CollaborationMode'] | null;
  experienceKind?: mjBizAppsCommunityForumInteractivePostEntity['ExperienceKind'] | null;
  fallbackSummaryMarkdown?: string | null;
  spaceLabel?: string | null;
  authorName?: string | null;
}

/**
 * Strongly-typed tabular projection of `MJ: Artifacts` returned by batched `RunView` queries.
 */
export interface BatchedArtifactMetadataRow {
  ID: string;
  Name: string;
  Type: string | null;
  Description?: string | null;
}

/**
 * Strongly-typed tabular projection of `MJ: Artifact Versions` returned by batched `RunView` queries.
 */
export interface BatchedArtifactVersionRow {
  ID: string;
  ArtifactID: string;
  VersionNumber: number;
  Name: string | null;
  ContentMode?: string | null;
  MimeType?: string | null;
  Content?: string | null;
}

/**
 * Resolved artifact + pinned version metadata ready for `<mj-artifact-viewer-panel>` binding.
 */
export interface ResolvedCommunityArtifactMetadata {
  artifactId: string;
  artifactName: string;
  artifactTypeName: string;
  description: string | null;
  pinnedVersionId: string | null;
  pinnedVersionNumber: number | null;
  pinnedVersionName: string | null;
  pinnedVersionMissing: boolean;
  previewPlainExcerpt: string;
  contentMode: string | null;
}

/**
 * Graceful fallback presentation model when an artifact or pinned version is unavailable.
 * All text fields are stripped of raw Markdown syntax (`###`, `**bold**`, fenced code).
 */
export interface CommunityArtifactFallbackModel {
  reason: CommunityArtifactFallbackReason;
  headline: string;
  explanation: string;
  plainSummary: string;
  artifactIdLabel: string | null;
  pinnedVersionIdLabel: string | null;
}

/**
 * Immutable snapshot of `CommunityArtifactViewerController` state.
 */
export interface CommunityArtifactViewerSnapshot {
  state: CommunityArtifactViewerState;
  requestToken: number;
  request: CommunityArtifactViewerRequest | null;
  resolved: ResolvedCommunityArtifactMetadata | null;
  effectiveVersionNumber: number | undefined;
  fallback: CommunityArtifactFallbackModel | null;
  errorMessage: string | null;
}

/**
 * Structural contract matching `RunView` so both live MJ `RunView` instances and unit-test
 * fakes can execute batched tabular queries with zero `any` or `unknown`.
 */
export interface CommunityArtifactRunViewLike {
  RunView<T>(params: RunViewParams, contextUser?: UserInfo): Promise<RunViewResult<T>>;
  RunViews?<T>(params: RunViewParams[], contextUser?: UserInfo): Promise<RunViewResult<T>[]>;
}

/**
 * Result of a batched `MJ: Artifacts` + `MJ: Artifact Versions` lookup.
 */
export interface BatchedArtifactsLoadResult {
  success: boolean;
  artifactsById: Map<string, BatchedArtifactMetadataRow>;
  versionsById: Map<string, BatchedArtifactVersionRow>;
  invalidArtifactIds: string[];
  invalidVersionIds: string[];
  queryCount: number;
  errorMessage?: string;
}

export interface ValidatedUuidInFilterResult {
  filter: string | null;
  validIds: string[];
  invalidIds: string[];
}

export const DEFAULT_ARTIFACT_BATCH_CHUNK_SIZE = 50;

export const ARTIFACT_METADATA_FIELDS: ReadonlyArray<string> = [
  'ID',
  'Name',
  'Type',
  'Description',
];

export const ARTIFACT_VERSION_FIELDS: ReadonlyArray<string> = [
  'ID',
  'ArtifactID',
  'VersionNumber',
  'Name',
  'ContentMode',
  'MimeType',
];

/**
 * Deduplicates and validates UUIDs before constructing a safe SQL `IN (...)` filter.
 * Short-circuits to `filter: null` when zero valid UUIDs remain so callers never emit
 * invalid `ID IN ()` SQL or execute wasted `RunView` calls.
 */
export function BuildValidatedUuidInFilter(
  columnName: string,
  ids: ReadonlyArray<string | null | undefined>,
  label: string,
): ValidatedUuidInFilterResult {
  const seen = new Set<string>();
  const validIds: string[] = [];
  const invalidIds: string[] = [];

  for (const raw of ids) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);

    if (IsValidUUID(trimmed)) {
      validIds.push(AssertValidUUID(trimmed, label));
    } else {
      invalidIds.push(trimmed);
    }
  }

  if (validIds.length === 0) {
    return { filter: null, validIds, invalidIds };
  }

  const inList = validIds.map((id) => `'${id}'`).join(',');
  return {
    filter: `${columnName} IN (${inList})`,
    validIds,
    invalidIds,
  };
}

/**
 * Splits an array into bounded chunks so `ID IN (...)` clauses never exceed query limits.
 */
export function ChunkArtifactIds<T>(
  items: ReadonlyArray<T>,
  chunkSize: number = DEFAULT_ARTIFACT_BATCH_CHUNK_SIZE,
): T[][] {
  const safeSize = Number.isFinite(chunkSize) && chunkSize > 0 ? Math.floor(chunkSize) : DEFAULT_ARTIFACT_BATCH_CHUNK_SIZE;
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += safeSize) {
    chunks.push(items.slice(i, i + safeSize));
  }
  return chunks;
}

/**
 * Maps `ForumArtifactPost.CollaborationMode` to the `<mj-artifact-viewer-panel>` `ViewMode` input.
 */
export function MapCollaborationModeToViewerMode(
  mode: mjBizAppsCommunityForumArtifactPostEntity['CollaborationMode'] | null | undefined,
): CommunityArtifactPanelViewMode | undefined {
  switch (mode) {
    case 'Edit':
      return 'edit';
    case 'Suggest':
      return 'suggest';
    case 'Comment Only':
    default:
      return undefined;
  }
}

/**
 * Maps `ForumArtifactPost.ArtifactModality` to the Community Hub `LivingDocItemInput.postTypeCode`.
 */
export function MapArtifactModalityToPostTypeCode(
  modality: mjBizAppsCommunityForumArtifactPostEntity['ArtifactModality'] | null | undefined,
): 'collaborative-doc' | 'collaborative-sheet' | 'collaborative-deck' {
  switch (modality) {
    case 'Presentation':
      return 'collaborative-deck';
    case 'Spreadsheet':
      return 'collaborative-sheet';
    case 'Document':
    default:
      return 'collaborative-doc';
  }
}

/**
 * Batch-loads `MJ: Artifacts` and pinned `MJ: Artifact Versions` metadata in bounded chunks
 * using `ResultType: 'simple'` and `ExtraFilter: "ID IN (...)"`.
 *
 * Collapses concurrent artifact + version reads into a single `RunViews([...])` batch when
 * available, falling back cleanly to `RunView(...)` for single-query batches or simple mocks.
 */
export async function LoadBatchedArtifactsMetadata(params: {
  runView: CommunityArtifactRunViewLike;
  artifactIds: ReadonlyArray<string | null | undefined>;
  pinnedVersionIds?: ReadonlyArray<string | null | undefined>;
  user?: UserInfo;
  chunkSize?: number;
}): Promise<BatchedArtifactsLoadResult> {
  const artifactValidation = BuildValidatedUuidInFilter('ID', params.artifactIds, 'artifactId');
  const versionValidation = BuildValidatedUuidInFilter(
    'ID',
    params.pinnedVersionIds ?? [],
    'pinnedArtifactVersionId',
  );

  const artifactsById = new Map<string, BatchedArtifactMetadataRow>();
  const versionsById = new Map<string, BatchedArtifactVersionRow>();

  if (artifactValidation.validIds.length === 0 && versionValidation.validIds.length === 0) {
    return {
      success: true,
      artifactsById,
      versionsById,
      invalidArtifactIds: artifactValidation.invalidIds,
      invalidVersionIds: versionValidation.invalidIds,
      queryCount: 0,
    };
  }

  const chunkSize = params.chunkSize ?? DEFAULT_ARTIFACT_BATCH_CHUNK_SIZE;
  const artifactChunks = ChunkArtifactIds(artifactValidation.validIds, chunkSize);
  const versionChunks = ChunkArtifactIds(versionValidation.validIds, chunkSize);

  const queries: RunViewParams[] = [];
  const queryKinds: Array<'artifact' | 'version'> = [];

  for (const chunk of artifactChunks) {
    const built = BuildValidatedUuidInFilter('ID', chunk, 'artifactId');
    if (!built.filter) continue;
    queries.push({
      EntityName: 'MJ: Artifacts',
      ExtraFilter: built.filter,
      Fields: [...ARTIFACT_METADATA_FIELDS],
      ResultType: 'simple',
      MaxRows: chunk.length,
    });
    queryKinds.push('artifact');
  }

  for (const chunk of versionChunks) {
    const built = BuildValidatedUuidInFilter('ID', chunk, 'pinnedArtifactVersionId');
    if (!built.filter) continue;
    queries.push({
      EntityName: 'MJ: Artifact Versions',
      ExtraFilter: built.filter,
      Fields: [...ARTIFACT_VERSION_FIELDS],
      ResultType: 'simple',
      MaxRows: chunk.length,
    });
    queryKinds.push('version');
  }

  if (queries.length === 0) {
    return {
      success: true,
      artifactsById,
      versionsById,
      invalidArtifactIds: artifactValidation.invalidIds,
      invalidVersionIds: versionValidation.invalidIds,
      queryCount: 0,
    };
  }

  type CombinedBatchRow = BatchedArtifactMetadataRow | BatchedArtifactVersionRow;
  let results: RunViewResult<CombinedBatchRow>[];

  try {
    if (queries.length > 1 && typeof params.runView.RunViews === 'function') {
      results = await params.runView.RunViews<CombinedBatchRow>(queries, params.user);
    } else {
      results = [];
      for (const query of queries) {
        const res = await params.runView.RunView<CombinedBatchRow>(query, params.user);
        results.push(res);
      }
    }
  } catch (err) {
    return {
      success: false,
      artifactsById,
      versionsById,
      invalidArtifactIds: artifactValidation.invalidIds,
      invalidVersionIds: versionValidation.invalidIds,
      queryCount: queries.length,
      errorMessage: err instanceof Error ? err.message : 'Failed loading artifact metadata.',
    };
  }

  let firstError: string | undefined;
  for (let i = 0; i < queryKinds.length; i += 1) {
    const res = results?.[i];
    if (!res?.Success) {
      firstError = firstError ?? (res?.ErrorMessage || `Failed loading ${queries[i].EntityName}.`);
      continue;
    }
    const rows = res.Results ?? [];
    if (queryKinds[i] === 'artifact') {
      for (const row of rows as BatchedArtifactMetadataRow[]) {
        if (row.ID) {
          artifactsById.set(row.ID.toLowerCase(), row);
        }
      }
    } else {
      for (const row of rows as BatchedArtifactVersionRow[]) {
        if (row.ID) {
          versionsById.set(row.ID.toLowerCase(), row);
        }
      }
    }
  }

  return {
    success: firstError === undefined,
    artifactsById,
    versionsById,
    invalidArtifactIds: artifactValidation.invalidIds,
    invalidVersionIds: versionValidation.invalidIds,
    queryCount: queries.length,
    ...(firstError ? { errorMessage: firstError } : {}),
  };
}

/**
 * Builds a clean, Markdown-free fallback presentation model when an artifact or pinned version
 * is missing, revoked, invalid, or fails to load.
 */
export function BuildArtifactFallbackModel(params: {
  reason: CommunityArtifactFallbackReason;
  request: CommunityArtifactViewerRequest;
  errorMessage?: string | null;
}): CommunityArtifactFallbackModel {
  const plainSummary = StripMarkdownToPlainText(params.request.fallbackSummaryMarkdown);
  const artifactIdLabel = params.request.artifactId?.trim() || null;
  const pinnedVersionIdLabel = params.request.pinnedArtifactVersionId?.trim() || null;

  switch (params.reason) {
    case 'missing-artifact-id':
      return {
        reason: params.reason,
        headline: 'Artifact link unavailable',
        explanation:
          'This post does not reference a valid MJ Artifact identifier. Relational replies and post context remain accessible below.',
        plainSummary,
        artifactIdLabel,
        pinnedVersionIdLabel,
      };
    case 'pinned-version-not-found':
      return {
        reason: params.reason,
        headline: 'Pinned artifact version unavailable',
        explanation:
          'The pinned artifact version referenced by this post could not be found or is no longer accessible with your current permissions.',
        plainSummary,
        artifactIdLabel,
        pinnedVersionIdLabel,
      };
    case 'load-error':
      return {
        reason: params.reason,
        headline: 'Unable to load artifact',
        explanation:
          params.errorMessage?.trim() ||
          'An error occurred while loading this MJ Artifact. Try reopening the viewer or checking permissions.',
        plainSummary,
        artifactIdLabel,
        pinnedVersionIdLabel,
      };
    case 'artifact-not-found':
    default:
      return {
        reason: 'artifact-not-found',
        headline: 'Artifact unavailable or revoked',
        explanation:
          'This MJ Artifact may have been removed or your current role does not have read permission. Community discussion replies remain intact.',
        plainSummary,
        artifactIdLabel,
        pinnedVersionIdLabel,
      };
  }
}

/**
 * Deterministically resolves viewer state, pinned `VersionNumber` pass-through, and fallback
 * model from a request and batched lookup maps.
 */
export function ResolveArtifactViewerState(params: {
  request: CommunityArtifactViewerRequest;
  artifactsById: ReadonlyMap<string, BatchedArtifactMetadataRow>;
  versionsById: ReadonlyMap<string, BatchedArtifactVersionRow>;
  loadError?: string | null;
}): Omit<CommunityArtifactViewerSnapshot, 'requestToken' | 'request'> {
  const rawArtifactId = params.request.artifactId?.trim() ?? '';
  if (!rawArtifactId || !IsValidUUID(rawArtifactId)) {
    return {
      state: 'missing',
      resolved: null,
      effectiveVersionNumber: undefined,
      fallback: BuildArtifactFallbackModel({
        reason: 'missing-artifact-id',
        request: params.request,
      }),
      errorMessage: null,
    };
  }

  if (params.loadError) {
    return {
      state: 'error',
      resolved: null,
      effectiveVersionNumber: undefined,
      fallback: BuildArtifactFallbackModel({
        reason: 'load-error',
        request: params.request,
        errorMessage: params.loadError,
      }),
      errorMessage: params.loadError,
    };
  }

  const artifactRow = params.artifactsById.get(rawArtifactId.toLowerCase()) ?? null;
  if (!artifactRow) {
    return {
      state: 'missing',
      resolved: null,
      effectiveVersionNumber: undefined,
      fallback: BuildArtifactFallbackModel({
        reason: 'artifact-not-found',
        request: params.request,
      }),
      errorMessage: null,
    };
  }

  const rawPinnedVersionId = params.request.pinnedArtifactVersionId?.trim() ?? '';
  let pinnedVersionNumber: number | null =
    typeof params.request.pinnedVersionNumber === 'number' &&
    Number.isFinite(params.request.pinnedVersionNumber) &&
    params.request.pinnedVersionNumber > 0
      ? params.request.pinnedVersionNumber
      : null;
  let pinnedVersionName: string | null = null;
  let contentMode: string | null = null;

  if (rawPinnedVersionId) {
    if (!IsValidUUID(rawPinnedVersionId)) {
      return {
        state: 'missing',
        resolved: null,
        effectiveVersionNumber: undefined,
        fallback: BuildArtifactFallbackModel({
          reason: 'pinned-version-not-found',
          request: params.request,
        }),
        errorMessage: null,
      };
    }

    const versionRow = params.versionsById.get(rawPinnedVersionId.toLowerCase()) ?? null;
    if (!versionRow || !UUIDsEqual(versionRow.ArtifactID, artifactRow.ID)) {
      return {
        state: 'missing',
        resolved: null,
        effectiveVersionNumber: undefined,
        fallback: BuildArtifactFallbackModel({
          reason: 'pinned-version-not-found',
          request: params.request,
        }),
        errorMessage: null,
      };
    }

    pinnedVersionNumber = versionRow.VersionNumber;
    pinnedVersionName = versionRow.Name ?? null;
    contentMode = versionRow.ContentMode ?? null;
  }

  const plainExcerpt = StripMarkdownToPlainText(
    artifactRow.Description || params.request.fallbackSummaryMarkdown,
  );

  const resolved: ResolvedCommunityArtifactMetadata = {
    artifactId: artifactRow.ID,
    artifactName: artifactRow.Name || params.request.postTitle,
    artifactTypeName: artifactRow.Type?.trim() || 'Document',
    description: artifactRow.Description ? StripMarkdownToPlainText(artifactRow.Description) : null,
    pinnedVersionId: rawPinnedVersionId || null,
    pinnedVersionNumber,
    pinnedVersionName,
    pinnedVersionMissing: false,
    previewPlainExcerpt: plainExcerpt,
    contentMode,
  };

  return {
    state: 'ready',
    resolved,
    effectiveVersionNumber: pinnedVersionNumber ?? undefined,
    fallback: null,
    errorMessage: null,
  };
}

/**
 * Builds `ResolvedCommunityArtifactMetadata` directly from a batched lookup result for a
 * single post's `ArtifactID` / `PinnedArtifactVersionID`, returning `null` if the artifact
 * is missing or its pinned version does not exist / belongs to a different artifact.
 */
export function ExtractResolvedMetadataFromBatch(params: {
  postTitle: string;
  artifactId: string | null | undefined;
  pinnedArtifactVersionId?: string | null;
  fallbackSummaryMarkdown?: string | null;
  batch: BatchedArtifactsLoadResult;
}): ResolvedCommunityArtifactMetadata | null {
  const resolution = ResolveArtifactViewerState({
    request: {
      postId: 'batch-lookup',
      postTitle: params.postTitle,
      postKind: 'artifact-post',
      artifactId: params.artifactId ?? null,
      pinnedArtifactVersionId: params.pinnedArtifactVersionId ?? null,
      fallbackSummaryMarkdown: params.fallbackSummaryMarkdown ?? null,
    },
    artifactsById: params.batch.artifactsById,
    versionsById: params.batch.versionsById,
    loadError: params.batch.success ? null : (params.batch.errorMessage ?? 'Batch load failed.'),
  });
  return resolution.state === 'ready' ? resolution.resolved : null;
}

export type ArtifactMetadataLoaderFn = (
  request: CommunityArtifactViewerRequest,
) => Promise<BatchedArtifactsLoadResult>;

/**
 * Pure, deterministic state controller for `CommunityArtifactViewerComponent`.
 *
 * Guarantees:
 * - Monotonic request tokens discard stale async `RunView` responses when users switch
 *   rapidly between `ForumArtifactPost` / `ForumInteractivePost` cards or press Escape mid-load.
 * - Maximized drawer preference persists through `CommunityHubPreferences` (`UserInfoEngine.Instance`,
 *   never browser storage).
 */
export class CommunityArtifactViewerController {
  private requestToken = 0;
  private maximized = false;
  private currentSnapshot: CommunityArtifactViewerSnapshot = {
    state: 'closed',
    requestToken: 0,
    request: null,
    resolved: null,
    effectiveVersionNumber: undefined,
    fallback: null,
    errorMessage: null,
  };

  private readonly preferences?: CommunityHubPreferences;

  constructor(preferences?: CommunityHubPreferences) {
    this.preferences = preferences;
    if (preferences) {
      this.maximized = preferences.GetArtifactViewerMaximized(false);
    }
  }

  public get snapshot(): CommunityArtifactViewerSnapshot {
    return this.currentSnapshot;
  }

  public get isMaximized(): boolean {
    return this.maximized;
  }

  public async open(
    request: CommunityArtifactViewerRequest,
    options?: {
      preloaded?: ResolvedCommunityArtifactMetadata | null;
      loader?: ArtifactMetadataLoaderFn | null;
    },
  ): Promise<CommunityArtifactViewerSnapshot> {
    const token = ++this.requestToken;
    const rawArtifactId = request.artifactId?.trim() ?? '';

    if (!rawArtifactId || !IsValidUUID(rawArtifactId)) {
      this.currentSnapshot = {
        state: 'missing',
        requestToken: token,
        request,
        resolved: null,
        effectiveVersionNumber: undefined,
        fallback: BuildArtifactFallbackModel({
          reason: 'missing-artifact-id',
          request,
        }),
        errorMessage: null,
      };
      return this.currentSnapshot;
    }

    const preloaded = options?.preloaded ?? null;
    if (
      preloaded &&
      UUIDsEqual(preloaded.artifactId, rawArtifactId) &&
      (!request.pinnedArtifactVersionId ||
        (preloaded.pinnedVersionId &&
          UUIDsEqual(preloaded.pinnedVersionId, request.pinnedArtifactVersionId) &&
          !preloaded.pinnedVersionMissing))
    ) {
      this.currentSnapshot = {
        state: 'ready',
        requestToken: token,
        request,
        resolved: preloaded,
        effectiveVersionNumber:
          preloaded.pinnedVersionNumber ?? request.pinnedVersionNumber ?? undefined,
        fallback: null,
        errorMessage: null,
      };
      return this.currentSnapshot;
    }

    const loader = options?.loader ?? null;
    if (!loader) {
      // Offline/demo mode without a live RunView provider: synthesize clean metadata from the request
      // without exposing any raw markdown tokens.
      const plainSummary = StripMarkdownToPlainText(request.fallbackSummaryMarkdown);
      const effectiveVersionNumber =
        typeof request.pinnedVersionNumber === 'number' &&
        Number.isFinite(request.pinnedVersionNumber) &&
        request.pinnedVersionNumber > 0
          ? request.pinnedVersionNumber
          : undefined;
      this.currentSnapshot = {
        state: 'ready',
        requestToken: token,
        request,
        resolved: {
          artifactId: rawArtifactId,
          artifactName: request.postTitle,
          artifactTypeName: request.artifactModality || request.experienceKind || 'Document',
          description: plainSummary || null,
          pinnedVersionId: request.pinnedArtifactVersionId?.trim() || null,
          pinnedVersionNumber: effectiveVersionNumber ?? null,
          pinnedVersionName: effectiveVersionNumber ? `Version ${effectiveVersionNumber}` : null,
          pinnedVersionMissing: false,
          previewPlainExcerpt: plainSummary,
          contentMode: 'Text',
        },
        effectiveVersionNumber,
        fallback: null,
        errorMessage: null,
      };
      return this.currentSnapshot;
    }

    this.currentSnapshot = {
      state: 'loading',
      requestToken: token,
      request,
      resolved: null,
      effectiveVersionNumber: undefined,
      fallback: null,
      errorMessage: null,
    };

    try {
      const batch = await loader(request);
      if (token !== this.requestToken) {
        return this.currentSnapshot;
      }
      const resolvedState = ResolveArtifactViewerState({
        request,
        artifactsById: batch.artifactsById,
        versionsById: batch.versionsById,
        loadError: batch.success ? null : (batch.errorMessage ?? 'Failed to load artifact metadata.'),
      });
      this.currentSnapshot = {
        ...resolvedState,
        requestToken: token,
        request,
      };
    } catch (err) {
      if (token !== this.requestToken) {
        return this.currentSnapshot;
      }
      const message = err instanceof Error ? err.message : 'Failed to load artifact metadata.';
      this.currentSnapshot = {
        state: 'error',
        requestToken: token,
        request,
        resolved: null,
        effectiveVersionNumber: undefined,
        fallback: BuildArtifactFallbackModel({
          reason: 'load-error',
          request,
          errorMessage: message,
        }),
        errorMessage: message,
      };
    }

    return this.currentSnapshot;
  }

  public close(): CommunityArtifactViewerSnapshot {
    const token = ++this.requestToken;
    this.currentSnapshot = {
      state: 'closed',
      requestToken: token,
      request: null,
      resolved: null,
      effectiveVersionNumber: undefined,
      fallback: null,
      errorMessage: null,
    };
    return this.currentSnapshot;
  }

  /**
   * Handles keyboard events for drawer dismissal (`Escape`). Returns `true` when Escape closed
   * an open viewer so callers can stop propagation and restore trigger focus.
   */
  public handleKeydown(key: string): boolean {
    if (key === 'Escape' && this.currentSnapshot.state !== 'closed') {
      this.close();
      return true;
    }
    return false;
  }

  public async toggleMaximized(): Promise<boolean> {
    this.maximized = !this.maximized;
    if (this.preferences) {
      await this.preferences.SetArtifactViewerMaximized(this.maximized);
    }
    return this.maximized;
  }
}
