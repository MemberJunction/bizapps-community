import { BaseEntity, CompositeKey, type RunView, type UserInfo } from '@memberjunction/core';
import { UUIDsEqual } from '@memberjunction/global';
import {
  AssertValidUUID,
  COMMUNITY_ATTACHMENT_MAX_AGGREGATE_BYTES_PER_POST,
  COMMUNITY_ATTACHMENT_MAX_CAPTION_LENGTH,
  COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST,
  COMMUNITY_ATTACHMENT_MAX_FILE_BYTES,
  ClassifyAttachmentKind,
  IsAllowedAttachmentMimeType,
  NormalizeAttachmentMimeType,
  ResolveAttachmentSpaceItemFolder,
  ResolveDefaultFeatureInLibrary,
  SanitizeCommunityAttachmentUrl,
  ValidateAttachmentBatchLimits,
  ValidateCommunityAttachmentInput,
  type CommunityArtifactAttachmentItem,
  type CommunityAttachmentEntryType,
  type CommunityAttachmentItem,
  type CommunityAttachmentKind,
  type CommunityFileAttachmentItem,
  type CommunitySpaceItemFolder,
  type CommunityVisibilityBand,
} from '@mj-biz-apps/community-core';
import {
  COMMUNITY_ENTITY_NAMES,
  type mjBizAppsCommunityForumPostAttachmentEntity,
} from '@mj-biz-apps/community-entities';
import { FormatAttachmentBytes, ResolveArtifactIconClass, ResolveFileAttachmentMeta } from './community-attachment-gallery.ts';
import type { AskShareEntryType, EntitySaveResultLike } from './community-hub-commons.ts';

/**
 * Available version entry for an accessible `MJ: Artifacts` record shown in the Artifact Picker.
 */
export interface ArtifactVersionOption {
  versionId: string;
  versionNumber: number;
  name: string | null;
  contentType: string | null;
  previewContent: string | null;
}

/**
 * Accessible `MJ: Artifacts` catalog entry rendered inside the Embed MJ Artifact popover.
 */
export interface AccessibleArtifactCatalogItem {
  artifactId: string;
  name: string;
  typeName: string;
  iconClass: string;
  latestVersionId: string | null;
  latestVersionNumber: number | null;
  contentType: string | null;
  previewContent: string | null;
  versions: ReadonlyArray<ArtifactVersionOption>;
}

/**
 * Draft file or media attachment held in a post or reply composer prior to persistence.
 */
export interface DraftFileAttachment {
  draftId: string;
  kind: 'image' | 'video' | 'audio' | 'file';
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  previewUrl: string | null;
  durationSeconds?: number | null;
  fileId?: string | null;
  caption: string;
  sequence: number;
  featureInLibrary: boolean;
  featureInLibraryOverridden: boolean;
  folder: CommunitySpaceItemFolder;
  formattedSize: string;
  iconClass: string;
  typeLabel: string;
}

/**
 * Draft embedded MJ Artifact held in a post or reply composer prior to persistence.
 */
export interface DraftArtifactAttachment {
  draftId: string;
  kind: 'artifact';
  artifactId: string;
  artifactName: string;
  artifactTypeName: string;
  iconClass: string;
  latestVersionId: string | null;
  latestVersionNumber: number | null;
  pinnedVersionId: string | null;
  pinnedVersionNumber: number | null;
  availableVersions: ReadonlyArray<ArtifactVersionOption>;
  previewContent: string | null;
  contentType: string | null;
  caption: string;
  sequence: number;
  featureInLibrary: boolean;
  featureInLibraryOverridden: boolean;
  folder: CommunitySpaceItemFolder;
}

/**
 * Unified discriminated union for composer attachment drafts.
 */
export type DraftCommunityAttachment = DraftFileAttachment | DraftArtifactAttachment;

export interface SpaceItemEntityLike {
  ID: string;
  SpaceID: string;
  EntityID: string;
  RecordID: string;
  Band: 'Shared' | 'Team';
  PromotedAt: Date | null;
  PromotedByUserID: string | null;
  Folder: string | null;
  ArtifactVersionID: string | null;
  LatestResult?: EntitySaveResultLike | null;
  Save(): Promise<boolean>;
  Delete?(): Promise<boolean>;
}

/**
 * Strongly-typed `BaseEntity` view of `MJ_BizApps_Collaboration: Space Items` for `Metadata.GetEntityObject`.
 */
export interface CollaborationSpaceItemEntityView extends BaseEntity {
  ID: string;
  SpaceID: string;
  EntityID: string;
  RecordID: string;
  Band: 'Shared' | 'Team';
  PromotedAt: Date | null;
  PromotedByUserID: string | null;
  Folder: string | null;
  ArtifactVersionID: string | null;
}

export interface ForumPostAttachmentEntityLike {
  ID: mjBizAppsCommunityForumPostAttachmentEntity['ID'];
  PostID: mjBizAppsCommunityForumPostAttachmentEntity['PostID'];
  SpaceItemID: mjBizAppsCommunityForumPostAttachmentEntity['SpaceItemID'];
  Caption: mjBizAppsCommunityForumPostAttachmentEntity['Caption'];
  Sequence: mjBizAppsCommunityForumPostAttachmentEntity['Sequence'];
  LatestResult?: EntitySaveResultLike | null;
  Save(): Promise<boolean>;
  Delete?(): Promise<boolean>;
}

export interface PersistPostAttachmentsFromClientParams {
  postId: string;
  spaceId: string;
  drafts: ReadonlyArray<DraftCommunityAttachment>;
  isOfflineDemoMode: boolean;
  currentUserId: string | null | undefined;
  authorName?: string | null;
  band?: CommunityVisibilityBand;
  resolveEntityId: ((entityName: string) => Promise<string | null>) | null;
  createSpaceItemEntity: (() => Promise<SpaceItemEntityLike | null>) | null;
  createForumPostAttachmentEntity: (() => Promise<ForumPostAttachmentEntityLike | null>) | null;
}

export interface PersistPostAttachmentsFromClientResult {
  success: boolean;
  offlineFallback: boolean;
  errorMessage: string | null;
  persistedAttachments: CommunityAttachmentItem[];
}

export const PICKER_HELPER_LIBRARY_COPY =
  'All attachments are automatically browsable in Library -> Media & Files. Enable "Feature in Space Library" to highlight key artifacts and playbooks in the curated Space Library.';

export const PICKER_ACCEPTED_FILE_EXTENSIONS =
  'image/*,video/*,audio/*,.pdf,.txt,.md,.csv,.json,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip';

const EXTENSION_MIME_MAP: Readonly<Record<string, string>> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  ogv: 'video/ogg',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
  pdf: 'application/pdf',
  txt: 'text/plain',
  csv: 'text/csv',
  md: 'text/markdown',
  json: 'application/json',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
};

/**
 * Built-in demo catalog of accessible `MJ: Artifacts` used in offline demo mode (`!Metadata.Provider`).
 */
export const DEMO_ACCESSIBLE_ARTIFACTS: ReadonlyArray<AccessibleArtifactCatalogItem> = [
  {
    artifactId: 'aaaa0000-0000-4000-8000-000000000001',
    name: 'Multi-Region Rollover Latency Report',
    typeName: 'HTML',
    iconClass: ResolveArtifactIconClass('HTML', 'Document'),
    latestVersionId: 'aaaa0000-0000-4000-8000-000000000101',
    latestVersionNumber: 2,
    contentType: 'text/html',
    previewContent: '<div><strong>Zero-Downtime Cutover Telemetry</strong><p>p95 US-East 42ms · EU-West 51ms</p></div>',
    versions: [
      {
        versionId: 'aaaa0000-0000-4000-8000-000000000101',
        versionNumber: 2,
        name: 'v2 Regional Cutover',
        contentType: 'text/html',
        previewContent: '<div><strong>Zero-Downtime Cutover Telemetry</strong><p>p95 US-East 42ms · EU-West 51ms</p></div>',
      },
      {
        versionId: 'aaaa0000-0000-4000-8000-000000000100',
        versionNumber: 1,
        name: 'v1 Baseline',
        contentType: 'text/html',
        previewContent: '<div><strong>Baseline Latency</strong><p>p95 US-East 58ms</p></div>',
      },
    ],
  },
  {
    artifactId: 'aaaa0000-0000-4000-8000-000000000002',
    name: 'Dual-Dialect Schema Parity Pipeline Diagram',
    typeName: 'SVG',
    iconClass: ResolveArtifactIconClass('SVG', 'Presentation'),
    latestVersionId: 'aaaa0000-0000-4000-8000-000000000102',
    latestVersionNumber: 3,
    contentType: 'image/svg+xml',
    previewContent: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60"><rect width="240" height="60" rx="8" fill="none" stroke="currentColor"/><text x="120" y="34" text-anchor="middle" font-size="12">Parity Gate</text></svg>',
    versions: [
      {
        versionId: 'aaaa0000-0000-4000-8000-000000000102',
        versionNumber: 3,
        name: 'v3 SQL Server + PostgreSQL Gate',
        contentType: 'image/svg+xml',
        previewContent: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60"><rect width="240" height="60" rx="8" fill="none" stroke="currentColor"/><text x="120" y="34" text-anchor="middle" font-size="12">Parity Gate</text></svg>',
      },
    ],
  },
  {
    artifactId: 'aaaa0000-0000-4000-8000-000000000003',
    name: 'OpenTelemetry Webhook Retry Span Schema',
    typeName: 'JSON',
    iconClass: ResolveArtifactIconClass('JSON', 'Document'),
    latestVersionId: 'aaaa0000-0000-4000-8000-000000000103',
    latestVersionNumber: 1,
    contentType: 'application/json',
    previewContent: '{"schemaVersion":"1.0.0","spanName":"community.webhook.delivery"}',
    versions: [
      {
        versionId: 'aaaa0000-0000-4000-8000-000000000103',
        versionNumber: 1,
        name: 'v1 Span Schema',
        contentType: 'application/json',
        previewContent: '{"schemaVersion":"1.0.0","spanName":"community.webhook.delivery"}',
      },
    ],
  },
  {
    artifactId: 'aaaa0000-0000-4000-8000-000000000004',
    name: 'Verified Key Rotation Cutover Checklist',
    typeName: 'Markdown',
    iconClass: ResolveArtifactIconClass('Markdown', 'Document'),
    latestVersionId: 'aaaa0000-0000-4000-8000-000000000104',
    latestVersionNumber: 4,
    contentType: 'text/markdown',
    previewContent: '### Verified Cutover Sequence\n- Mint secondary key with `Active` lease\n- Revoke legacy key cleanly',
    versions: [
      {
        versionId: 'aaaa0000-0000-4000-8000-000000000104',
        versionNumber: 4,
        name: 'v4 Production Verified',
        contentType: 'text/markdown',
        previewContent: '### Verified Cutover Sequence\n- Mint secondary key with `Active` lease\n- Revoke legacy key cleanly',
      },
      {
        versionId: 'aaaa0000-0000-4000-8000-000000000109',
        versionNumber: 3,
        name: 'v3 Staging Draft',
        contentType: 'text/markdown',
        previewContent: '### Staging Checklist\n- Mint secondary key',
      },
    ],
  },
  {
    artifactId: 'aaaa0000-0000-4000-8000-000000000005',
    name: 'PKCE Partner Integration Readiness Guide',
    typeName: 'Markdown',
    iconClass: ResolveArtifactIconClass('Markdown', 'Document'),
    latestVersionId: 'aaaa0000-0000-4000-8000-000000000105',
    latestVersionNumber: 2,
    contentType: 'text/markdown',
    previewContent: '### OAuth2 PKCE Verification\n- Register exact redirect URIs per tenant\n- Enforce `S256`',
    versions: [
      {
        versionId: 'aaaa0000-0000-4000-8000-000000000105',
        versionNumber: 2,
        name: 'v2 Partner Standard',
        contentType: 'text/markdown',
        previewContent: '### OAuth2 PKCE Verification\n- Register exact redirect URIs per tenant\n- Enforce `S256`',
      },
    ],
  },
];

/**
 * Maps a composer surface and Ask/Share entry type into the semantic `CommunityAttachmentEntryType`
 * consumed by `ResolveDefaultFeatureInLibrary(kind, entryType)`.
 */
export function ResolveComposerAttachmentEntryType(
  surface: 'post' | 'reply',
  askShareEntryType?: AskShareEntryType | null,
): CommunityAttachmentEntryType {
  if (surface === 'reply') {
    return 'reply';
  }
  if (askShareEntryType === 'Playbook Note') {
    return 'playbook';
  }
  return 'post';
}

/**
 * Resolves a normalized MIME type from a browser file's declared `mimeType` or file extension fallback.
 */
export function InferAttachmentMimeType(mimeType: string | null | undefined, fileName: string): string {
  const normalized = NormalizeAttachmentMimeType(mimeType);
  if (normalized) {
    return normalized;
  }
  const lower = fileName.trim().toLowerCase();
  const dotIdx = lower.lastIndexOf('.');
  if (dotIdx >= 0 && dotIdx < lower.length - 1) {
    const ext = lower.slice(dotIdx + 1);
    return EXTENSION_MIME_MAP[ext] ?? '';
  }
  return '';
}

/**
 * Normalizes `sequence` values sequentially (`1, 2, ..., N`) after reordering or deletion.
 */
export function ReindexDraftAttachments(
  drafts: ReadonlyArray<DraftCommunityAttachment>,
): DraftCommunityAttachment[] {
  return drafts.map((draft, index) => ({
    ...draft,
    sequence: index + 1,
  }));
}

/**
 * Creates a validated `DraftFileAttachment` from file metadata and preview URL.
 */
export function CreateDraftFileAttachment(params: {
  fileName: string;
  mimeType: string | null | undefined;
  sizeBytes: number;
  url: string;
  entryType?: CommunityAttachmentEntryType | null;
  sequence: number;
  durationSeconds?: number | null;
  fileId?: string | null;
  caption?: string;
}): { draft?: DraftFileAttachment; error?: string } {
  const trimmedName = params.fileName.trim();
  if (!trimmedName) {
    return { error: 'Attachment file name cannot be empty.' };
  }

  const resolvedMime = InferAttachmentMimeType(params.mimeType, trimmedName);
  if (!IsAllowedAttachmentMimeType(resolvedMime)) {
    return {
      error: `File "${trimmedName}" (${resolvedMime || 'unknown type'}) is not an allowed image, video, audio, or document type.`,
    };
  }

  const kind = ClassifyAttachmentKind(resolvedMime, false);
  if (kind === 'artifact') {
    return { error: `File "${trimmedName}" cannot be classified as a regular file attachment.` };
  }

  const validation = ValidateCommunityAttachmentInput({
    kind,
    fileName: trimmedName,
    mimeType: resolvedMime,
    sizeBytes: params.sizeBytes,
    url: params.url,
    caption: params.caption ?? null,
  });
  if (!validation.valid) {
    return { error: `${trimmedName}: ${validation.errors.join(' ')}` };
  }

  const safeUrl = SanitizeCommunityAttachmentUrl(params.url, kind);
  if (!safeUrl) {
    return { error: `${trimmedName}: Attachment preview URL uses an unsafe or unsupported scheme.` };
  }

  const featureInLibrary = ResolveDefaultFeatureInLibrary(kind, params.entryType ?? 'post');
  const folder = ResolveAttachmentSpaceItemFolder(featureInLibrary);
  const meta = ResolveFileAttachmentMeta(resolvedMime, trimmedName);

  return {
    draft: {
      draftId: `draft-file-${crypto.randomUUID()}`,
      kind,
      fileName: trimmedName,
      mimeType: validation.normalizedMimeType ?? resolvedMime,
      sizeBytes: params.sizeBytes,
      url: safeUrl,
      previewUrl: kind === 'image' ? safeUrl : null,
      durationSeconds: params.durationSeconds ?? null,
      fileId: params.fileId ?? null,
      caption: params.caption?.trim() ?? '',
      sequence: params.sequence,
      featureInLibrary,
      featureInLibraryOverridden: false,
      folder,
      formattedSize: FormatAttachmentBytes(params.sizeBytes),
      iconClass: kind === 'image' ? 'fa-solid fa-image' : kind === 'video' ? 'fa-solid fa-film' : kind === 'audio' ? 'fa-solid fa-headphones' : meta.iconClass,
      typeLabel: kind === 'image' ? 'Image' : kind === 'video' ? 'Video' : kind === 'audio' ? 'Audio' : meta.typeLabel,
    },
  };
}

/**
 * Creates a validated `DraftArtifactAttachment` from an accessible `MJ: Artifacts` catalog entry.
 */
export function CreateDraftArtifactAttachment(params: {
  artifact: AccessibleArtifactCatalogItem;
  pinnedVersionId?: string | null;
  entryType?: CommunityAttachmentEntryType | null;
  sequence: number;
  caption?: string;
}): { draft?: DraftArtifactAttachment; error?: string } {
  const validation = ValidateCommunityAttachmentInput({
    kind: 'artifact',
    artifactId: params.artifact.artifactId,
    artifactName: params.artifact.name,
    caption: params.caption ?? null,
  });
  if (!validation.valid) {
    return { error: validation.errors.join(' ') };
  }

  const matchedPinned = params.pinnedVersionId
    ? params.artifact.versions.find((v) => UUIDsEqual(v.versionId, params.pinnedVersionId!)) ?? null
    : null;

  const featureInLibrary = ResolveDefaultFeatureInLibrary('artifact', params.entryType ?? 'post');
  const folder = ResolveAttachmentSpaceItemFolder(featureInLibrary);

  return {
    draft: {
      draftId: `draft-art-${crypto.randomUUID()}`,
      kind: 'artifact',
      artifactId: params.artifact.artifactId,
      artifactName: params.artifact.name,
      artifactTypeName: params.artifact.typeName || 'Artifact',
      iconClass: params.artifact.iconClass || ResolveArtifactIconClass(params.artifact.typeName),
      latestVersionId: params.artifact.latestVersionId,
      latestVersionNumber: params.artifact.latestVersionNumber,
      pinnedVersionId: matchedPinned ? matchedPinned.versionId : null,
      pinnedVersionNumber: matchedPinned ? matchedPinned.versionNumber : null,
      availableVersions: [...params.artifact.versions],
      previewContent: matchedPinned ? matchedPinned.previewContent : params.artifact.previewContent,
      contentType: matchedPinned ? matchedPinned.contentType : params.artifact.contentType,
      caption: params.caption?.trim() ?? '',
      sequence: params.sequence,
      featureInLibrary,
      featureInLibraryOverridden: false,
      folder,
    },
  };
}

/**
 * Validates adding incoming draft attachments against per-post count and aggregate byte ceilings.
 */
export function ValidateDraftAttachmentBatch(
  existing: ReadonlyArray<DraftCommunityAttachment>,
  incoming: ReadonlyArray<DraftCommunityAttachment>,
): { valid: boolean; errors: string[] } {
  const combined = [...existing, ...incoming];
  const entries = combined.map((item) => ({
    sizeBytes: item.kind === 'artifact' ? null : item.sizeBytes,
  }));
  const res = ValidateAttachmentBatchLimits(entries, {
    maxFileBytes: COMMUNITY_ATTACHMENT_MAX_FILE_BYTES,
    maxCountPerPost: COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST,
    maxAggregateBytesPerPost: COMMUNITY_ATTACHMENT_MAX_AGGREGATE_BYTES_PER_POST,
  });
  return { valid: res.valid, errors: res.errors };
}

/**
 * Moves a draft attachment up or down by one slot and normalizes `sequence` (`1..N`).
 */
export function MoveDraftAttachment(
  drafts: ReadonlyArray<DraftCommunityAttachment>,
  draftId: string,
  direction: 'up' | 'down',
): DraftCommunityAttachment[] {
  const idx = drafts.findIndex((d) => d.draftId === draftId);
  if (idx < 0) {
    return [...drafts];
  }
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= drafts.length) {
    return [...drafts];
  }
  const next = [...drafts];
  const [moved] = next.splice(idx, 1);
  next.splice(targetIdx, 0, moved);
  return ReindexDraftAttachments(next);
}

/**
 * Removes a draft attachment by `draftId` and normalizes remaining `sequence` numbers.
 */
export function RemoveDraftAttachment(
  drafts: ReadonlyArray<DraftCommunityAttachment>,
  draftId: string,
): DraftCommunityAttachment[] {
  const filtered = drafts.filter((d) => d.draftId !== draftId);
  return ReindexDraftAttachments(filtered);
}

/**
 * Updates a draft attachment's editable caption and returns any caption-length validation error.
 */
export function UpdateDraftAttachmentCaption(
  drafts: ReadonlyArray<DraftCommunityAttachment>,
  draftId: string,
  caption: string,
): { drafts: DraftCommunityAttachment[]; error: string | null } {
  const error =
    caption.length > COMMUNITY_ATTACHMENT_MAX_CAPTION_LENGTH
      ? `Caption exceeds maximum length of ${COMMUNITY_ATTACHMENT_MAX_CAPTION_LENGTH} characters.`
      : null;
  const updated = drafts.map((d) => (d.draftId === draftId ? { ...d, caption } : d));
  return { drafts: updated, error };
}

/**
 * Toggles or sets `featureInLibrary` on a draft attachment and updates its target `SpaceItem.Folder`.
 */
export function ToggleDraftAttachmentFeatureInLibrary(
  drafts: ReadonlyArray<DraftCommunityAttachment>,
  draftId: string,
  nextValue?: boolean,
): DraftCommunityAttachment[] {
  return drafts.map((d) => {
    if (d.draftId !== draftId) return d;
    const nextFeature = nextValue !== undefined ? nextValue : !d.featureInLibrary;
    return {
      ...d,
      featureInLibrary: nextFeature,
      featureInLibraryOverridden: true,
      folder: ResolveAttachmentSpaceItemFolder(nextFeature),
    };
  });
}

/**
 * Re-applies `ResolveDefaultFeatureInLibrary(kind, entryType)` to attachments whose toggle
 * has not been manually overridden by the author (e.g., switching post type to `Playbook Note`).
 */
export function SyncDraftsForEntryTypeChange(
  drafts: ReadonlyArray<DraftCommunityAttachment>,
  entryType: CommunityAttachmentEntryType,
): DraftCommunityAttachment[] {
  return drafts.map((d) => {
    if (d.featureInLibraryOverridden) {
      return d;
    }
    const nextFeature = ResolveDefaultFeatureInLibrary(d.kind, entryType);
    return {
      ...d,
      featureInLibrary: nextFeature,
      folder: ResolveAttachmentSpaceItemFolder(nextFeature),
    };
  });
}

/**
 * Updates an attached MJ Artifact's optional pinned version (`null` reverts to latest version).
 */
export function UpdateDraftArtifactPinnedVersion(
  drafts: ReadonlyArray<DraftCommunityAttachment>,
  draftId: string,
  pinnedVersionId: string | null,
): DraftCommunityAttachment[] {
  return drafts.map((d) => {
    if (d.draftId !== draftId || d.kind !== 'artifact') {
      return d;
    }
    const matched = pinnedVersionId
      ? d.availableVersions.find((v) => UUIDsEqual(v.versionId, pinnedVersionId)) ?? null
      : null;
    const latest = d.availableVersions[0] ?? null;
    return {
      ...d,
      pinnedVersionId: matched ? matched.versionId : null,
      pinnedVersionNumber: matched ? matched.versionNumber : null,
      previewContent: matched ? matched.previewContent : latest?.previewContent ?? d.previewContent,
      contentType: matched ? matched.contentType : latest?.contentType ?? d.contentType,
    };
  });
}

/**
 * Filters accessible `MJ: Artifacts` by name or type name for the searchable Artifact Picker popover.
 */
export function FilterAccessibleArtifacts(
  catalog: ReadonlyArray<AccessibleArtifactCatalogItem>,
  query: string,
): AccessibleArtifactCatalogItem[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [...catalog];
  }
  return catalog.filter((item) => {
    const hay = `${item.name} ${item.typeName}`.toLowerCase();
    return hay.includes(q);
  });
}

/**
 * Validates every draft attachment prior to post/reply submission so invalid drafts fail visibly.
 */
export function ValidateDraftAttachmentsForSubmit(
  drafts: ReadonlyArray<DraftCommunityAttachment>,
): { valid: boolean; errors: string[] } {
  if (drafts.length === 0) {
    return { valid: true, errors: [] };
  }

  const batchResult = ValidateDraftAttachmentBatch([], drafts);
  const errors: string[] = [...batchResult.errors];

  for (let i = 0; i < drafts.length; i += 1) {
    const draft = drafts[i];
    if (draft.kind === 'artifact') {
      const res = ValidateCommunityAttachmentInput({
        kind: 'artifact',
        artifactId: draft.artifactId,
        artifactName: draft.artifactName,
        caption: draft.caption || null,
      });
      if (!res.valid) {
        errors.push(...res.errors.map((e) => `${draft.artifactName}: ${e}`));
      }
    } else {
      const res = ValidateCommunityAttachmentInput({
        kind: draft.kind,
        fileName: draft.fileName,
        mimeType: draft.mimeType,
        sizeBytes: draft.sizeBytes,
        url: draft.url,
        caption: draft.caption || null,
      });
      if (!res.valid) {
        errors.push(...res.errors.map((e) => `${draft.fileName}: ${e}`));
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Converts draft attachments into renderable `CommunityAttachmentItem[]` for immediate UI state
 * and offline demo mode persistence.
 */
export function ConvertDraftsToCommunityAttachments(params: {
  drafts: ReadonlyArray<DraftCommunityAttachment>;
  spaceId: string;
  postId: string;
  authorUserId?: string | null;
  authorName?: string | null;
  band?: CommunityVisibilityBand;
}): CommunityAttachmentItem[] {
  const band = params.band ?? 'Shared';
  return ReindexDraftAttachments(params.drafts).map((draft): CommunityAttachmentItem => {
    const caption = draft.caption.trim() ? draft.caption.trim() : null;
    if (draft.kind === 'artifact') {
      const effectiveVersionNumber = draft.pinnedVersionNumber ?? draft.latestVersionNumber;
      const effectiveVersionId = draft.pinnedVersionId ?? draft.latestVersionId;
      const artifactItem: CommunityArtifactAttachmentItem = {
        id: draft.draftId,
        kind: 'artifact',
        spaceId: params.spaceId,
        postId: params.postId,
        artifactId: draft.artifactId,
        artifactVersionId: effectiveVersionId,
        artifactTypeName: draft.artifactTypeName,
        artifactName: draft.artifactName,
        previewContent: draft.previewContent,
        contentType: draft.contentType,
        versionNumber: effectiveVersionNumber,
        modality: 'Document',
        collaborationMode: 'Suggest',
        showInlinePreview: true,
        caption,
        sequence: draft.sequence,
        featureInLibrary: draft.featureInLibrary,
        folder: ResolveAttachmentSpaceItemFolder(draft.featureInLibrary),
        band,
        authorUserId: params.authorUserId ?? null,
        authorName: params.authorName ?? null,
      };
      return artifactItem;
    }

    const fileItem: CommunityFileAttachmentItem = {
      id: draft.draftId,
      kind: draft.kind,
      spaceId: params.spaceId,
      postId: params.postId,
      fileId: draft.fileId ?? null,
      fileName: draft.fileName,
      mimeType: draft.mimeType,
      sizeBytes: draft.sizeBytes,
      url: draft.url,
      durationSeconds: draft.durationSeconds ?? null,
      caption,
      sequence: draft.sequence,
      featureInLibrary: draft.featureInLibrary,
      folder: ResolveAttachmentSpaceItemFolder(draft.featureInLibrary),
      band,
      authorUserId: params.authorUserId ?? null,
      authorName: params.authorName ?? null,
    };
    return fileItem;
  });
}

function extractSaveFailureMessage(
  entity: { LatestResult?: EntitySaveResultLike | null } | null | undefined,
  fallback: string,
): string {
  const msg = entity?.LatestResult?.CompleteMessage?.trim() || entity?.LatestResult?.Message?.trim();
  return msg || fallback;
}

/**
 * Persists composer attachment drafts onto a saved `ForumPost` or reply by creating
 * `SpaceItem` + `ForumPostAttachment` records via MJ `Metadata.GetEntityObject` in live mode,
 * or returning clean in-memory `CommunityAttachmentItem[]` in offline demo mode (`!Metadata.Provider`).
 *
 * Fails closed with compensating rollback of created records if validation or entity persistence fails.
 */
export async function PersistPostAttachmentsFromClient(
  params: PersistPostAttachmentsFromClientParams,
): Promise<PersistPostAttachmentsFromClientResult> {
  if (params.drafts.length === 0) {
    return {
      success: true,
      offlineFallback: params.isOfflineDemoMode,
      errorMessage: null,
      persistedAttachments: [],
    };
  }

  const validation = ValidateDraftAttachmentsForSubmit(params.drafts);
  if (!validation.valid) {
    return {
      success: false,
      offlineFallback: params.isOfflineDemoMode,
      errorMessage: validation.errors.join(' '),
      persistedAttachments: [],
    };
  }

  const orderedDrafts = ReindexDraftAttachments(params.drafts);

  if (params.isOfflineDemoMode) {
    return {
      success: true,
      offlineFallback: true,
      errorMessage: null,
      persistedAttachments: ConvertDraftsToCommunityAttachments({
        drafts: orderedDrafts,
        spaceId: params.spaceId,
        postId: params.postId,
        authorUserId: params.currentUserId,
        authorName: params.authorName,
        band: params.band,
      }),
    };
  }

  let validPostId: string;
  let validSpaceId: string;
  let validUserId: string;
  try {
    validPostId = AssertValidUUID(params.postId, 'postId');
    validSpaceId = AssertValidUUID(params.spaceId, 'spaceId');
    validUserId = AssertValidUUID(params.currentUserId ?? '', 'currentUserId');
  } catch (err) {
    return {
      success: false,
      offlineFallback: false,
      errorMessage:
        err instanceof Error
          ? err.message
          : 'Valid post, space, and user identifiers are required to persist attachments.',
      persistedAttachments: [],
    };
  }

  if (
    !params.resolveEntityId ||
    !params.createSpaceItemEntity ||
    !params.createForumPostAttachmentEntity
  ) {
    return {
      success: false,
      offlineFallback: false,
      errorMessage: 'Metadata entity provider is unavailable — cannot persist attachments.',
      persistedAttachments: [],
    };
  }

  const hasArtifacts = orderedDrafts.some((d) => d.kind === 'artifact');
  const hasFiles = orderedDrafts.some((d) => d.kind !== 'artifact');
  const artifactsEntityId = hasArtifacts ? await params.resolveEntityId('MJ: Artifacts') : null;
  const filesEntityId = hasFiles ? await params.resolveEntityId('MJ: Files') : null;

  if (hasArtifacts && !artifactsEntityId) {
    return {
      success: false,
      offlineFallback: false,
      errorMessage: 'Could not resolve entity metadata for "MJ: Artifacts" — attachments were not saved.',
      persistedAttachments: [],
    };
  }
  if (hasFiles && !filesEntityId) {
    return {
      success: false,
      offlineFallback: false,
      errorMessage: 'Could not resolve entity metadata for "MJ: Files" — attachments were not saved.',
      persistedAttachments: [],
    };
  }

  const band: 'Shared' | 'Team' = params.band === 'Team' ? 'Team' : 'Shared';
  const createdForRollback: Array<{ Delete?: () => Promise<boolean> }> = [];
  const persistedAttachments: CommunityAttachmentItem[] = [];

  try {
    for (const draft of orderedDrafts) {
      const spaceItem = await params.createSpaceItemEntity();
      if (!spaceItem) {
        throw new Error('Could not instantiate SpaceItem entity for attachment.');
      }

      const folder = ResolveAttachmentSpaceItemFolder(draft.featureInLibrary);
      spaceItem.SpaceID = validSpaceId;
      spaceItem.Band = band;
      spaceItem.PromotedAt = band === 'Shared' ? new Date() : null;
      spaceItem.PromotedByUserID = band === 'Shared' ? validUserId : null;
      spaceItem.Folder = folder;

      if (draft.kind === 'artifact') {
        spaceItem.EntityID = artifactsEntityId!;
        spaceItem.RecordID = `ID|${AssertValidUUID(draft.artifactId, 'artifactId')}`;
        spaceItem.ArtifactVersionID = draft.pinnedVersionId ?? draft.latestVersionId ?? null;
      } else {
        spaceItem.EntityID = filesEntityId!;
        const targetFileRecordId = draft.fileId ? AssertValidUUID(draft.fileId, 'fileId') : validPostId;
        spaceItem.RecordID = `ID|${targetFileRecordId}`;
        spaceItem.ArtifactVersionID = null;
      }

      const spaceItemSaved = await spaceItem.Save();
      if (!spaceItemSaved || !spaceItem.ID) {
        throw new Error(
          extractSaveFailureMessage(spaceItem, 'Failed to persist SpaceItem record for attachment.'),
        );
      }
      createdForRollback.push(spaceItem);

      const postAttachment = await params.createForumPostAttachmentEntity();
      if (!postAttachment) {
        throw new Error('Could not instantiate ForumPostAttachment entity.');
      }
      postAttachment.PostID = validPostId;
      postAttachment.SpaceItemID = spaceItem.ID;
      postAttachment.Caption = draft.caption.trim() ? draft.caption.trim() : null;
      postAttachment.Sequence = draft.sequence;

      const attSaved = await postAttachment.Save();
      if (!attSaved || !postAttachment.ID) {
        throw new Error(
          extractSaveFailureMessage(postAttachment, 'Failed to persist ForumPostAttachment record.'),
        );
      }
      createdForRollback.push(postAttachment);

      const converted = ConvertDraftsToCommunityAttachments({
        drafts: [draft],
        spaceId: validSpaceId,
        postId: validPostId,
        authorUserId: validUserId,
        authorName: params.authorName,
        band,
      })[0];

      persistedAttachments.push({
        ...converted,
        id: postAttachment.ID,
        spaceItemId: spaceItem.ID,
        forumPostAttachmentId: postAttachment.ID,
        sequence: draft.sequence,
      });
    }

    return {
      success: true,
      offlineFallback: false,
      errorMessage: null,
      persistedAttachments,
    };
  } catch (err) {
    for (const created of createdForRollback.reverse()) {
      if (typeof created.Delete === 'function') {
        try {
          await created.Delete();
        } catch {
          // Best-effort compensating rollback to avoid orphaned SpaceItem / ForumPostAttachment records.
        }
      }
    }
    return {
      success: false,
      offlineFallback: false,
      errorMessage: err instanceof Error ? err.message : 'Failed to persist post attachments.',
      persistedAttachments: [],
    };
  }
}

interface LiveArtifactCatalogRow {
  ID: string;
  Name: string;
  Type?: string | null;
}

interface LiveArtifactVersionCatalogRow {
  ID: string;
  ArtifactID: string;
  VersionNumber: number;
  Name: string | null;
  Content: string | null;
  MimeType: string | null;
}

/**
 * Loads accessible `MJ: Artifacts` and their `MJ: Artifact Versions` for the live Artifact Picker.
 */
export async function LoadAccessibleArtifactsCatalog(
  rv: Pick<RunView, 'RunView'>,
  user: UserInfo,
): Promise<AccessibleArtifactCatalogItem[]> {
  const artRes = await rv.RunView<LiveArtifactCatalogRow>(
    {
      EntityName: 'MJ: Artifacts',
      Fields: ['ID', 'Name', 'Type'],
      OrderBy: 'Name ASC',
      ResultType: 'simple',
      MaxRows: 100,
    },
    user,
  );
  if (!artRes?.Success || !artRes.Results?.length) {
    return [];
  }

  const artifacts = artRes.Results;
  const validIds: string[] = [];
  for (const row of artifacts) {
    try {
      validIds.push(`'${AssertValidUUID(row.ID, 'artifactId')}'`);
    } catch {
      // Skip malformed IDs.
    }
  }

  const versionsByArtifact = new Map<string, ArtifactVersionOption[]>();
  if (validIds.length > 0) {
    const verRes = await rv.RunView<LiveArtifactVersionCatalogRow>(
      {
        EntityName: 'MJ: Artifact Versions',
        ExtraFilter: `ArtifactID IN (${validIds.join(',')})`,
        Fields: ['ID', 'ArtifactID', 'VersionNumber', 'Name', 'Content', 'MimeType'],
        OrderBy: 'VersionNumber DESC',
        ResultType: 'simple',
        MaxRows: 250,
      },
      user,
    );
    if (verRes?.Success && verRes.Results) {
      for (const ver of verRes.Results) {
        const key = ver.ArtifactID.toLowerCase();
        const list = versionsByArtifact.get(key) ?? [];
        list.push({
          versionId: ver.ID,
          versionNumber: ver.VersionNumber,
          name: ver.Name,
          contentType: ver.MimeType,
          previewContent: ver.Content,
        });
        versionsByArtifact.set(key, list);
      }
    }
  }

  return artifacts.map((art): AccessibleArtifactCatalogItem => {
    const versions = versionsByArtifact.get(art.ID.toLowerCase()) ?? [];
    const latest = versions[0] ?? null;
    const typeName = art.Type?.trim() || 'Artifact';
    return {
      artifactId: art.ID,
      name: art.Name,
      typeName,
      iconClass: ResolveArtifactIconClass(typeName),
      latestVersionId: latest?.versionId ?? null,
      latestVersionNumber: latest?.versionNumber ?? null,
      contentType: latest?.contentType ?? null,
      previewContent: latest?.previewContent ?? null,
      versions,
    };
  });
}

/**
 * Helper to look up `CompositeKey.FromID` safely for SpaceItem resolution if needed.
 */
export function BuildSpaceItemCompositeKey(spaceItemId: string): CompositeKey {
  return CompositeKey.FromID(AssertValidUUID(spaceItemId, 'spaceItemId'));
}

/**
 * Reads a browser `File` into a data URL (or object URL fallback for large video/audio/files)
 * so preview chips work cleanly without exceeding `COMMUNITY_ATTACHMENT_MAX_DATA_URL_BYTES`.
 */
export async function ReadBrowserFilePreviewUrl(
  file: File,
  kind: CommunityAttachmentKind,
): Promise<string> {
  if (
    kind === 'image' &&
    file.size <= 1_500_000 &&
    typeof FileReader !== 'undefined'
  ) {
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string' && reader.result.startsWith('data:image/')) {
          resolve(reader.result);
        } else if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
          resolve(URL.createObjectURL(file));
        } else {
          resolve('');
        }
      };
      reader.onerror = () => {
        if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
          resolve(URL.createObjectURL(file));
        } else {
          resolve('');
        }
      };
      reader.readAsDataURL(file);
    });
  }
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const objectUrl = URL.createObjectURL(file);
    if (objectUrl.startsWith('blob:https://') || objectUrl.startsWith('blob:http://')) {
      return objectUrl;
    }
  }
  return `https://attachments.local/${encodeURIComponent(file.name)}`;
}
