import { BaseEntity, CompositeKey, type RunView, type UserInfo } from '@memberjunction/core';
import { UUIDsEqual } from '@memberjunction/global';
import {
  AssertValidUUID,
  COMMUNITY_ATTACHMENT_MAX_AGGREGATE_BYTES_PER_POST,
  COMMUNITY_ATTACHMENT_MAX_CAPTION_LENGTH,
  COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST,
  COMMUNITY_ATTACHMENT_MAX_FILE_BYTES,
  ClassifyAttachmentKind,
  CommunityRules,
  EscapeSqlLiteral,
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
  type ForumVisibilityBand,
} from '@mj-biz-apps/community-core';
import {
  COMMUNITY_ENTITY_NAMES,
  type mjBizAppsCommunityForumEntity,
  type mjBizAppsCommunityForumMemberEntity,
  type mjBizAppsCommunityForumPostAttachmentEntity,
  type mjBizAppsCommunityForumPostEntity,
  type mjBizAppsCommunityForumRoleTypeEntity,
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
  artifactId?: string | null;
  artifactVersionId?: string | null;
  existingSpaceItemId?: string | null;
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

export interface MJArtifactEntityLike {
  ID: string;
  Name: string;
  Description: string | null;
  TypeID: string;
  UserID: string;
  Visibility: 'Always' | 'System Only';
  LatestResult?: EntitySaveResultLike | null;
  Save(): Promise<boolean>;
  Delete?(): Promise<boolean>;
}

export interface MJArtifactVersionEntityLike {
  ID: string;
  ArtifactID: string;
  VersionNumber: number;
  Name: string | null;
  UserID: string;
  ContentMode: 'File' | 'Text';
  Content: string | null;
  FileID: string | null;
  FileName: string | null;
  MimeType: string | null;
  ContentSizeBytes: number | null;
  LatestResult?: EntitySaveResultLike | null;
  Save(): Promise<boolean>;
  Delete?(): Promise<boolean>;
}

export interface ClientPostAttachmentAuthorizationResult {
  authorized: boolean;
  spaceId: string;
  band: CommunityVisibilityBand;
  errorMessage: string | null;
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
  createArtifactEntity?: (() => Promise<MJArtifactEntityLike | null>) | null;
  createArtifactVersionEntity?: (() => Promise<MJArtifactVersionEntityLike | null>) | null;
  resolveArtifactTypeId?: ((kind: 'image' | 'video' | 'audio' | 'file', mimeType: string) => Promise<string | null>) | null;
  authorizePostWrite?: ((params: {
    postId: string;
    spaceId: string;
    userId: string;
    drafts: ReadonlyArray<DraftCommunityAttachment>;
  }) => Promise<ClientPostAttachmentAuthorizationResult>) | null;
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
  artifactId?: string | null;
  artifactVersionId?: string | null;
  existingSpaceItemId?: string | null;
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
      artifactId: params.artifactId ?? null,
      artifactVersionId: params.artifactVersionId ?? null,
      existingSpaceItemId: params.existingSpaceItemId ?? null,
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
      artifactId: draft.artifactId ?? null,
      artifactVersionId: draft.artifactVersionId ?? null,
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

interface ClientAuthPostRow {
  ID: string;
  ForumID: string;
  ParentPostID: string | null;
  AuthorUserID: string | null;
  VisibilityBand: CommunityVisibilityBand;
  IsLocked: boolean;
}

interface ClientAuthForumRow {
  ID: string;
  SpaceID: string;
  Name: string;
  VisibilityBand: ForumVisibilityBand;
  InheritsSpaceMembers: boolean;
  PostingPolicy: mjBizAppsCommunityForumEntity['PostingPolicy'];
  Status: mjBizAppsCommunityForumEntity['Status'];
}

interface ClientAuthSpaceRow {
  ID: string;
  OwnerID?: string | null;
}

interface ClientAuthSpaceMemberRow {
  ID: string;
  SpaceID: string;
  UserID: string;
  Band?: 'Shared' | 'Team' | null;
  Status: 'Active' | 'Invited' | 'Removed';
}

interface ClientAuthForumMemberRow {
  ID: string;
  ForumID: string;
  UserID: string;
  ForumRoleTypeID: string;
  Status: mjBizAppsCommunityForumMemberEntity['Status'];
}

type ClientAuthRoleCapabilitiesRow = Pick<
  mjBizAppsCommunityForumRoleTypeEntity,
  'ID' | 'CanConfigureForum' | 'CanModerateQueue' | 'CanCreateRootPost' | 'CanReply'
>;

interface ClientArtifactTypeRow {
  ID: string;
  Name: string;
  ContentType: string | null;
  IsEnabled?: boolean | null;
}

/**
 * Authorizes a client attachment write against the authoritative `ForumPost`, `Forum`,
 * `Space`, `SpaceMember`, `ForumMember`, existing post attachment limits, and target
 * `MJ: Artifacts` / `MJ: Artifact Versions` / `MJ: Files` access under `user`.
 * Derives the authoritative `spaceId` and `band` (`Shared` vs `Team`) so `Team` posts
 * are never silently indexed into the `Shared` band.
 */
export async function AuthorizeClientPostAttachmentWrite(params: {
  rv: Pick<RunView, 'RunView'>;
  postId: string;
  spaceId?: string | null;
  user: UserInfo;
  incomingDrafts: ReadonlyArray<DraftCommunityAttachment>;
}): Promise<ClientPostAttachmentAuthorizationResult> {
  const deny = (errorMessage: string): ClientPostAttachmentAuthorizationResult => ({
    authorized: false,
    spaceId: params.spaceId ?? '',
    band: 'Shared',
    errorMessage,
  });

  let validPostId: string;
  let validUserId: string;
  try {
    validPostId = AssertValidUUID(params.postId, 'postId');
    validUserId = AssertValidUUID(params.user?.ID ?? '', 'user.ID');
  } catch (err) {
    return deny(err instanceof Error ? err.message : 'Valid post and user identifiers are required.');
  }

  const postRes = await params.rv.RunView<ClientAuthPostRow>(
    {
      EntityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
      ExtraFilter: `ID = '${validPostId}'`,
      Fields: ['ID', 'ForumID', 'ParentPostID', 'AuthorUserID', 'VisibilityBand', 'IsLocked'],
      ResultType: 'simple',
      MaxRows: 1,
    },
    params.user,
  );
  if (!postRes?.Success || !postRes.Results?.[0]) {
    return deny(`ForumPost ${validPostId} was not found or access is denied.`);
  }
  const post = postRes.Results[0];

  let validForumId: string;
  try {
    validForumId = AssertValidUUID(post.ForumID, 'post.ForumID');
  } catch {
    return deny('Source post has an invalid ForumID.');
  }

  const forumRes = await params.rv.RunView<ClientAuthForumRow>(
    {
      EntityName: COMMUNITY_ENTITY_NAMES.Forums,
      ExtraFilter: `ID = '${validForumId}'`,
      Fields: ['ID', 'SpaceID', 'Name', 'VisibilityBand', 'InheritsSpaceMembers', 'PostingPolicy', 'Status'],
      ResultType: 'simple',
      MaxRows: 1,
    },
    params.user,
  );
  if (!forumRes?.Success || !forumRes.Results?.[0]) {
    return deny(`Forum ${validForumId} was not found or access is denied.`);
  }
  const forum = forumRes.Results[0];

  let authoritativeSpaceId: string;
  try {
    authoritativeSpaceId = AssertValidUUID(forum.SpaceID, 'forum.SpaceID');
  } catch {
    return deny(`Forum ${forum.ID} has an invalid SpaceID.`);
  }

  if (params.spaceId && params.spaceId.trim() && !UUIDsEqual(authoritativeSpaceId, params.spaceId.trim())) {
    return deny(`Requested Space ${params.spaceId} does not match source Forum Space ${authoritativeSpaceId}.`);
  }

  if (forum.Status !== 'Active') {
    return deny(`Forum "${forum.Name}" has status "${forum.Status}" and does not accept attachment writes.`);
  }

  const [spaceRes, spaceMemberRes, forumMemberRes] = await Promise.all([
    params.rv.RunView<ClientAuthSpaceRow>(
      {
        EntityName: 'MJ_BizApps_Collaboration: Spaces',
        ExtraFilter: `ID = '${authoritativeSpaceId}'`,
        Fields: ['ID', 'OwnerID'],
        ResultType: 'simple',
        MaxRows: 1,
      },
      params.user,
    ),
    params.rv.RunView<ClientAuthSpaceMemberRow>(
      {
        EntityName: 'MJ_BizApps_Collaboration: Space Members',
        ExtraFilter: `SpaceID = '${authoritativeSpaceId}' AND UserID = '${validUserId}' AND Status = 'Active'`,
        Fields: ['ID', 'SpaceID', 'UserID', 'Band', 'Status'],
        ResultType: 'simple',
        MaxRows: 1,
      },
      params.user,
    ),
    params.rv.RunView<ClientAuthForumMemberRow>(
      {
        EntityName: COMMUNITY_ENTITY_NAMES.ForumMembers,
        ExtraFilter: `ForumID = '${validForumId}' AND UserID = '${validUserId}'`,
        Fields: ['ID', 'ForumID', 'UserID', 'ForumRoleTypeID', 'Status'],
        ResultType: 'simple',
        MaxRows: 1,
      },
      params.user,
    ),
  ]);

  if (!spaceRes?.Success || !spaceRes.Results?.[0]) {
    return deny(`Collaboration Space ${authoritativeSpaceId} was not found or access is denied.`);
  }
  if (!spaceMemberRes?.Success || !forumMemberRes?.Success) {
    return deny('Unable to verify Space or Forum membership for attachment write.');
  }

  const space = spaceRes.Results[0];
  const spaceMember = spaceMemberRes.Results?.[0] ?? null;
  const isSpaceOwner = Boolean(space.OwnerID && UUIDsEqual(space.OwnerID, validUserId));
  if (!isSpaceOwner && !spaceMember) {
    return deny(`Caller is not authorized to access Collaboration Space ${authoritativeSpaceId}.`);
  }
  const canSeeTeamBand = isSpaceOwner || spaceMember?.Band === 'Team';

  const forumMember = forumMemberRes.Results?.[0] ?? null;
  let roleType: ClientAuthRoleCapabilitiesRow | null = null;
  if (forumMember) {
    const validRoleId = AssertValidUUID(forumMember.ForumRoleTypeID, 'ForumRoleTypeID');
    const roleRes = await params.rv.RunView<ClientAuthRoleCapabilitiesRow>(
      {
        EntityName: COMMUNITY_ENTITY_NAMES.ForumRoleTypes,
        ExtraFilter: `ID = '${validRoleId}'`,
        Fields: ['ID', 'CanConfigureForum', 'CanModerateQueue', 'CanCreateRootPost', 'CanReply'],
        ResultType: 'simple',
        MaxRows: 1,
      },
      params.user,
    );
    if (!roleRes?.Success || !roleRes.Results?.[0]) {
      return deny(`Unable to resolve ForumRoleType ${validRoleId} for Forum ${validForumId}.`);
    }
    roleType = roleRes.Results[0];
  }

  const decision = CommunityRules.EvaluateForumAccess({
    spaceAccess: {
      canReadSpace: true,
      canSeeTeamBand,
      isSpaceOpenForWrites: true,
    },
    forum: {
      visibilityBand: forum.VisibilityBand,
      inheritsSpaceMembers: Boolean(forum.InheritsSpaceMembers),
      postingPolicy: forum.PostingPolicy,
      status: forum.Status,
    },
    forumMembership:
      forumMember && roleType
        ? {
            status: forumMember.Status,
            canConfigureForum: Boolean(roleType.CanConfigureForum),
            canModerateQueue: Boolean(roleType.CanModerateQueue),
            canCreateRootPost: Boolean(roleType.CanCreateRootPost),
            canReply: Boolean(roleType.CanReply),
          }
        : null,
  });

  if (!decision.canReadForum) {
    return deny(`Caller is not authorized to access Forum ${forum.ID}.`);
  }
  if (post.VisibilityBand === 'Team' && !decision.canSeeTeamPosts) {
    return deny(`Caller is not authorized to access Team-band post ${post.ID}.`);
  }

  const isModerator = decision.canModerateQueue;
  if (post.IsLocked && !isModerator) {
    return deny(`Post ${post.ID} is locked; attachments cannot be modified.`);
  }
  const isAuthor = post.AuthorUserID !== null && UUIDsEqual(post.AuthorUserID, validUserId);
  if (!isAuthor && !isModerator) {
    return deny('Only the post author or a forum moderator may modify attachments on this post.');
  }
  const isReply = post.ParentPostID !== null;
  if (isAuthor && !isModerator) {
    if (!isReply && !decision.canCreateRootPost) {
      return deny('Caller does not hold permission to attach media to root posts in this forum.');
    }
    if (isReply && !decision.canReply) {
      return deny('Caller does not hold permission to attach media to replies in this forum.');
    }
  }

  const resolvedBand = CommunityRules.ResolvePostVisibilityBand({
    forumVisibilityBand: forum.VisibilityBand,
    requestedBand: post.VisibilityBand,
    authorCanSeeTeamBand: canSeeTeamBand,
  });

  // Enforce combined attachment count and aggregate byte ceilings across existing + incoming drafts
  const existingAttRes = await params.rv.RunView<{ ID: string; SpaceItemID: string }>(
    {
      EntityName: COMMUNITY_ENTITY_NAMES.ForumPostAttachments,
      ExtraFilter: `PostID = '${validPostId}'`,
      Fields: ['ID', 'SpaceItemID'],
      ResultType: 'simple',
      MaxRows: COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST + 5,
    },
    params.user,
  );
  if (!existingAttRes?.Success) {
    return deny(`Unable to inspect existing attachments on Post ${validPostId}.`);
  }
  const existingAtts = existingAttRes.Results ?? [];
  const existingSizeEntries: Array<{ sizeBytes?: number | null }> = [];
  if (existingAtts.length > 0) {
    const siIds = Array.from(new Set(existingAtts.map((a) => `'${AssertValidUUID(a.SpaceItemID, 'SpaceItemID')}'`)));
    const siRes = await params.rv.RunView<{ ID: string; ArtifactVersionID: string | null }>(
      {
        EntityName: 'MJ_BizApps_Collaboration: Space Items',
        ExtraFilter: `ID IN (${siIds.join(',')})`,
        Fields: ['ID', 'ArtifactVersionID'],
        ResultType: 'simple',
        MaxRows: COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST + 5,
      },
      params.user,
    );
    const verIds = Array.from(
      new Set((siRes?.Success ? siRes.Results ?? [] : []).map((s) => s.ArtifactVersionID).filter((v): v is string => Boolean(v))),
    );
    const sizeByVer = new Map<string, number | null>();
    if (verIds.length > 0) {
      const verRes = await params.rv.RunView<{ ID: string; ContentSizeBytes: number | null }>(
        {
          EntityName: 'MJ: Artifact Versions',
          ExtraFilter: `ID IN (${verIds.map((id) => `'${AssertValidUUID(id, 'ArtifactVersionID')}'`).join(',')})`,
          Fields: ['ID', 'ContentSizeBytes'],
          ResultType: 'simple',
          MaxRows: COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST + 5,
        },
        params.user,
      );
      for (const v of verRes?.Success ? verRes.Results ?? [] : []) {
        sizeByVer.set(v.ID.toLowerCase(), v.ContentSizeBytes);
      }
    }
    const sizeBySi = new Map<string, number | null>();
    for (const si of siRes?.Success ? siRes.Results ?? [] : []) {
      sizeBySi.set(si.ID.toLowerCase(), si.ArtifactVersionID ? sizeByVer.get(si.ArtifactVersionID.toLowerCase()) ?? null : null);
    }
    for (const att of existingAtts) {
      existingSizeEntries.push({ sizeBytes: sizeBySi.get(att.SpaceItemID.toLowerCase()) ?? null });
    }
  }

  const incomingSizeEntries = params.incomingDrafts.map((d) => ({
    sizeBytes: d.kind === 'artifact' ? null : d.sizeBytes,
  }));
  const batchLimits = ValidateAttachmentBatchLimits([...existingSizeEntries, ...incomingSizeEntries], {
    maxFileBytes: COMMUNITY_ATTACHMENT_MAX_FILE_BYTES,
    maxCountPerPost: COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST,
    maxAggregateBytesPerPost: COMMUNITY_ATTACHMENT_MAX_AGGREGATE_BYTES_PER_POST,
  });
  if (!batchLimits.valid) {
    return deny(batchLimits.errors.join(' '));
  }

  // Verify target artifact / version / file accessibility under user
  for (const draft of params.incomingDrafts) {
    if (draft.kind === 'artifact') {
      const validArtifactId = AssertValidUUID(draft.artifactId, 'artifactId');
      const artRes = await params.rv.RunView<{ ID: string }>(
        {
          EntityName: 'MJ: Artifacts',
          ExtraFilter: `ID = '${validArtifactId}'`,
          Fields: ['ID'],
          ResultType: 'simple',
          MaxRows: 1,
        },
        params.user,
      );
      if (!artRes?.Success || !artRes.Results?.[0]) {
        return deny(`Artifact ${validArtifactId} was not found or caller lacks read access.`);
      }
      const targetVersionId = draft.pinnedVersionId ?? draft.latestVersionId ?? null;
      if (targetVersionId) {
        const validVerId = AssertValidUUID(targetVersionId, 'artifactVersionId');
        const verRes = await params.rv.RunView<{ ID: string }>(
          {
            EntityName: 'MJ: Artifact Versions',
            ExtraFilter: `ID = '${validVerId}' AND ArtifactID = '${validArtifactId}'`,
            Fields: ['ID'],
            ResultType: 'simple',
            MaxRows: 1,
          },
          params.user,
        );
        if (!verRes?.Success || !verRes.Results?.[0]) {
          return deny(`Artifact Version ${validVerId} for Artifact ${validArtifactId} was not found or access is denied.`);
        }
      }
    } else {
      if (draft.fileId) {
        const validFileId = AssertValidUUID(draft.fileId, 'fileId');
        const fileRes = await params.rv.RunView<{ ID: string }>(
          {
            EntityName: 'MJ: Files',
            ExtraFilter: `ID = '${validFileId}'`,
            Fields: ['ID'],
            ResultType: 'simple',
            MaxRows: 1,
          },
          params.user,
        );
        if (!fileRes?.Success || !fileRes.Results?.[0]) {
          return deny(`File ${validFileId} was not found or caller lacks read access.`);
        }
      }
      if (draft.artifactVersionId) {
        const validVerId = AssertValidUUID(draft.artifactVersionId, 'artifactVersionId');
        const verRes = await params.rv.RunView<{
          ID: string;
          ArtifactID: string;
          ContentMode: string | null;
          FileID: string | null;
          MimeType: string | null;
          ContentSizeBytes: number | null;
          Content: string | null;
        }>(
          {
            EntityName: 'MJ: Artifact Versions',
            ExtraFilter: `ID = '${validVerId}'`,
            Fields: ['ID', 'ArtifactID', 'ContentMode', 'FileID', 'MimeType', 'ContentSizeBytes', 'Content'],
            ResultType: 'simple',
            MaxRows: 1,
          },
          params.user,
        );
        if (!verRes?.Success || !verRes.Results?.[0]) {
          return deny(`Artifact Version ${validVerId} was not found or access is denied.`);
        }
        const ver = verRes.Results[0];
        if (ver.ContentMode !== 'File') {
          return deny(`Artifact Version ${validVerId} has ContentMode "${ver.ContentMode ?? 'null'}", expected "File".`);
        }
        if (draft.fileId && ver.FileID && !UUIDsEqual(ver.FileID, draft.fileId)) {
          return deny(`Artifact Version ${validVerId} belongs to a different File than ${draft.fileId}.`);
        }
        if (ver.MimeType && !IsAllowedAttachmentMimeType(NormalizeAttachmentMimeType(ver.MimeType))) {
          return deny(`Artifact Version ${validVerId} MIME type "${ver.MimeType}" is not permitted.`);
        }
        if (ver.Content && !SanitizeCommunityAttachmentUrl(ver.Content, draft.kind)) {
          return deny(`Artifact Version ${validVerId} content URL uses an unsafe or unsupported scheme.`);
        }
      }
    }
  }

  return {
    authorized: true,
    spaceId: authoritativeSpaceId,
    band: resolvedBand,
    errorMessage: null,
  };
}

/**
 * Resolves an enabled `MJ: Artifact Types` ID suitable for storing an uploaded Community file/media attachment.
 */
export async function ResolveClientArtifactTypeId(
  rv: Pick<RunView, 'RunView'>,
  kind: 'image' | 'video' | 'audio' | 'file',
  mimeType: string,
  user: UserInfo,
): Promise<string | null> {
  const res = await rv.RunView<ClientArtifactTypeRow>(
    {
      EntityName: 'MJ: Artifact Types',
      ExtraFilter: 'IsEnabled = 1',
      Fields: ['ID', 'Name', 'ContentType', 'IsEnabled'],
      ResultType: 'simple',
      MaxRows: 100,
    },
    user,
  );
  const rows = res?.Success ? res.Results ?? [] : [];
  if (rows.length === 0) {
    return null;
  }

  const normalizedMime = NormalizeAttachmentMimeType(mimeType);
  const exactMime = rows.find(
    (r) => r.ContentType && NormalizeAttachmentMimeType(r.ContentType) === normalizedMime,
  );
  if (exactMime) return exactMime.ID;

  const preferredNamesByKind: Record<'image' | 'video' | 'audio' | 'file', string[]> = {
    image: ['image'],
    video: ['video', 'video production'],
    audio: ['audio'],
    file: ['generic binary', 'file', 'document'],
  };
  for (const targetName of preferredNamesByKind[kind]) {
    const match = rows.find((r) => r.Name.trim().toLowerCase() === targetName);
    if (match) return match.ID;
  }

  const wildcardMime = rows.find(
    (r) => r.ContentType && r.ContentType.trim().toLowerCase() === `${kind}/*`,
  );
  if (wildcardMime) return wildcardMime.ID;

  const genericBinary = rows.find((r) => r.Name.trim().toLowerCase() === 'generic binary');
  return genericBinary?.ID ?? rows[0].ID;
}

/**
 * Persists composer attachment drafts onto a saved `ForumPost` or reply by creating
 * `MJ: Artifacts` + `MJ: Artifact Versions` (for newly uploaded files), `SpaceItem`, and
 * `ForumPostAttachment` records via MJ `Metadata.GetEntityObject` in live mode, or returning
 * clean in-memory `CommunityAttachmentItem[]` in offline demo mode (`!Metadata.Provider`).
 *
 * Fails closed with compensating rollback of created records (and explicit reporting of any
 * rollback Delete() failures) if authorization, validation, or entity persistence fails.
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

  let effectiveSpaceId = validSpaceId;
  let band: CommunityVisibilityBand = params.band === 'Team' ? 'Team' : 'Shared';

  if (params.authorizePostWrite) {
    const authResult = await params.authorizePostWrite({
      postId: validPostId,
      spaceId: validSpaceId,
      userId: validUserId,
      drafts: orderedDrafts,
    });
    if (!authResult.authorized) {
      return {
        success: false,
        offlineFallback: false,
        errorMessage: authResult.errorMessage ?? 'Not authorized to attach media to this post.',
        persistedAttachments: [],
      };
    }
    if (authResult.spaceId) {
      effectiveSpaceId = AssertValidUUID(authResult.spaceId, 'authorized spaceId');
    }
    band = authResult.band;
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
  const hasNewUploadsNeedingArtifact = orderedDrafts.some(
    (d) => d.kind !== 'artifact' && !d.fileId && !d.artifactVersionId,
  );

  const artifactsEntityId =
    hasArtifacts || hasNewUploadsNeedingArtifact
      ? await params.resolveEntityId('MJ: Artifacts')
      : null;
  const filesEntityId = hasFiles ? await params.resolveEntityId('MJ: Files') : null;

  if ((hasArtifacts || hasNewUploadsNeedingArtifact) && !artifactsEntityId) {
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

  if (
    hasNewUploadsNeedingArtifact &&
    (!params.createArtifactEntity || !params.createArtifactVersionEntity || !params.resolveArtifactTypeId)
  ) {
    return {
      success: false,
      offlineFallback: false,
      errorMessage:
        'Metadata entity provider for "MJ: Artifacts" / "MJ: Artifact Versions" is unavailable — cannot durably persist uploaded files.',
      persistedAttachments: [],
    };
  }

  const createdForRollback: Array<{
    label: string;
    entity: { LatestResult?: EntitySaveResultLike | null; Delete?: () => Promise<boolean> };
  }> = [];
  const persistedAttachments: CommunityAttachmentItem[] = [];

  try {
    for (const draft of orderedDrafts) {
      let targetEntityId = '';
      let targetRecordId = '';
      let resolvedArtifactId: string | null = null;
      let resolvedArtifactVersionId: string | null = null;

      if (draft.kind === 'artifact') {
        targetEntityId = artifactsEntityId!;
        targetRecordId = AssertValidUUID(draft.artifactId, 'artifactId');
        resolvedArtifactId = targetRecordId;
        resolvedArtifactVersionId = draft.pinnedVersionId ?? draft.latestVersionId ?? null;
      } else if (!draft.fileId && !draft.artifactVersionId) {
        const artifactTypeId = await params.resolveArtifactTypeId!(draft.kind, draft.mimeType);
        if (!artifactTypeId) {
          throw new Error(
            `No enabled MJ: Artifact Types record was found to store uploaded file "${draft.fileName}".`,
          );
        }

        const artifact = await params.createArtifactEntity!();
        if (!artifact) {
          throw new Error(`Could not instantiate MJ: Artifacts entity for "${draft.fileName}".`);
        }
        artifact.Name = draft.fileName.slice(0, 255);
        artifact.Description = draft.caption.trim() ? draft.caption.trim().slice(0, 500) : null;
        artifact.TypeID = artifactTypeId;
        artifact.UserID = validUserId;
        artifact.Visibility = 'System Only';
        const artSaved = await artifact.Save();
        if (!artSaved || !artifact.ID) {
          throw new Error(
            extractSaveFailureMessage(artifact, `Failed to persist MJ: Artifacts record for "${draft.fileName}".`),
          );
        }
        createdForRollback.push({ label: `MJ: Artifacts ${artifact.ID}`, entity: artifact });

        const artifactVersion = await params.createArtifactVersionEntity!();
        if (!artifactVersion) {
          throw new Error(`Could not instantiate MJ: Artifact Versions entity for "${draft.fileName}".`);
        }
        artifactVersion.ArtifactID = artifact.ID;
        artifactVersion.VersionNumber = 1;
        artifactVersion.Name = draft.fileName.slice(0, 255);
        artifactVersion.UserID = validUserId;
        artifactVersion.ContentMode = 'File';
        artifactVersion.Content = draft.url;
        artifactVersion.FileID = null;
        artifactVersion.FileName = draft.fileName.slice(0, 500);
        artifactVersion.MimeType = draft.mimeType.slice(0, 200);
        artifactVersion.ContentSizeBytes = draft.sizeBytes;
        const verSaved = await artifactVersion.Save();
        if (!verSaved || !artifactVersion.ID) {
          throw new Error(
            extractSaveFailureMessage(
              artifactVersion,
              `Failed to persist MJ: Artifact Versions record for "${draft.fileName}".`,
            ),
          );
        }
        createdForRollback.push({
          label: `MJ: Artifact Versions ${artifactVersion.ID}`,
          entity: artifactVersion,
        });

        resolvedArtifactId = artifact.ID;
        resolvedArtifactVersionId = artifactVersion.ID;
        targetEntityId = artifactsEntityId!;
        targetRecordId = artifact.ID;
      } else if (draft.fileId) {
        const validFileId = AssertValidUUID(draft.fileId, 'fileId');
        targetEntityId = filesEntityId!;
        targetRecordId = validFileId;
        resolvedArtifactId = draft.artifactId ?? null;
        resolvedArtifactVersionId = draft.artifactVersionId ?? null;
      } else {
        const validVerId = AssertValidUUID(draft.artifactVersionId ?? '', 'artifactVersionId');
        const validArtId = AssertValidUUID(draft.artifactId ?? '', 'artifactId');
        const resolvedArtsEntityId = artifactsEntityId ?? (await params.resolveEntityId('MJ: Artifacts'));
        if (!resolvedArtsEntityId) {
          throw new Error('Could not resolve entity metadata for "MJ: Artifacts".');
        }
        targetEntityId = resolvedArtsEntityId;
        targetRecordId = validArtId;
        resolvedArtifactId = validArtId;
        resolvedArtifactVersionId = validVerId;
      }

      const spaceItem = await params.createSpaceItemEntity();
      if (!spaceItem) {
        throw new Error('Could not instantiate SpaceItem entity for attachment.');
      }

      const folder = ResolveAttachmentSpaceItemFolder(draft.featureInLibrary);
      spaceItem.SpaceID = effectiveSpaceId;
      spaceItem.EntityID = targetEntityId;
      spaceItem.RecordID = `ID|${targetRecordId}`;
      spaceItem.Band = band;
      spaceItem.PromotedAt = band === 'Shared' ? new Date() : null;
      spaceItem.PromotedByUserID = band === 'Shared' ? validUserId : null;
      spaceItem.Folder = folder;
      spaceItem.ArtifactVersionID = resolvedArtifactVersionId;

      const spaceItemSaved = await spaceItem.Save();
      if (!spaceItemSaved || !spaceItem.ID) {
        throw new Error(
          extractSaveFailureMessage(spaceItem, 'Failed to persist SpaceItem record for attachment.'),
        );
      }
      createdForRollback.push({ label: `SpaceItem ${spaceItem.ID}`, entity: spaceItem });

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
      createdForRollback.push({
        label: `ForumPostAttachment ${postAttachment.ID}`,
        entity: postAttachment,
      });

      const converted = ConvertDraftsToCommunityAttachments({
        drafts: [draft],
        spaceId: effectiveSpaceId,
        postId: validPostId,
        authorUserId: validUserId,
        authorName: params.authorName,
        band,
      })[0];

      if (converted.kind === 'artifact') {
        persistedAttachments.push({
          ...converted,
          id: postAttachment.ID,
          spaceItemId: spaceItem.ID,
          forumPostAttachmentId: postAttachment.ID,
          sequence: draft.sequence,
        });
      } else {
        persistedAttachments.push({
          ...converted,
          id: postAttachment.ID,
          spaceItemId: spaceItem.ID,
          forumPostAttachmentId: postAttachment.ID,
          artifactId: resolvedArtifactId,
          artifactVersionId: resolvedArtifactVersionId,
          sequence: draft.sequence,
        });
      }
    }

    return {
      success: true,
      offlineFallback: false,
      errorMessage: null,
      persistedAttachments,
    };
  } catch (err) {
    const rollbackFailures: string[] = [];
    for (const created of createdForRollback.reverse()) {
      if (typeof created.entity.Delete === 'function') {
        try {
          const deleted = await created.entity.Delete();
          if (!deleted) {
            rollbackFailures.push(
              `${created.label}: ${extractSaveFailureMessage(created.entity, 'Delete() returned false')}`,
            );
          }
        } catch (deleteErr) {
          rollbackFailures.push(
            `${created.label}: ${deleteErr instanceof Error ? deleteErr.message : 'Delete() threw an error'}`,
          );
        }
      }
    }
    const baseMessage = err instanceof Error ? err.message : 'Failed to persist post attachments.';
    const errorMessage =
      rollbackFailures.length > 0
        ? `${baseMessage} (Rollback cleanup failed: ${rollbackFailures.join('; ')})`
        : baseMessage;
    return {
      success: false,
      offlineFallback: false,
      errorMessage,
      persistedAttachments: [],
    };
  }
}

interface LiveArtifactCatalogRow {
  ID: string;
  Name: string;
  Type?: string | null;
  Visibility?: 'Always' | 'System Only' | null;
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
 * Excludes `'System Only'` backing artifacts created for raw file attachments.
 */
export async function LoadAccessibleArtifactsCatalog(
  rv: Pick<RunView, 'RunView'>,
  user: UserInfo,
): Promise<AccessibleArtifactCatalogItem[]> {
  const artRes = await rv.RunView<LiveArtifactCatalogRow>(
    {
      EntityName: 'MJ: Artifacts',
      Fields: ['ID', 'Name', 'Type', 'Visibility'],
      OrderBy: 'Name ASC',
      ResultType: 'simple',
      MaxRows: 100,
    },
    user,
  );
  if (!artRes?.Success || !artRes.Results?.length) {
    return [];
  }

  const artifacts = artRes.Results.filter((a) => a.Visibility !== 'System Only');
  if (artifacts.length === 0) {
    return [];
  }
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
 * Reads a browser `File` into a durable `data:` URL when `<= 1.5 MiB` (falling back to a
 * `blob:` URL for oversized media files) so uploaded files survive persistence and cold reload.
 */
export async function ReadBrowserFilePreviewUrl(
  file: File,
  kind: CommunityAttachmentKind,
  resolvedMimeType?: string,
): Promise<string> {
  if (
    kind !== 'artifact' &&
    file.size <= 1_500_000 &&
    typeof FileReader !== 'undefined'
  ) {
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string' && reader.result.startsWith('data:')) {
          let dataUrl = reader.result;
          const targetMime = NormalizeAttachmentMimeType(resolvedMimeType || file.type);
          if (targetMime) {
            const commaIdx = dataUrl.indexOf(',');
            if (commaIdx > 5) {
              const header = dataUrl.slice(5, commaIdx);
              const payload = dataUrl.slice(commaIdx + 1);
              const currentMime = header.split(';')[0].trim().toLowerCase();
              if (!currentMime || currentMime === 'application/octet-stream') {
                dataUrl = `data:${targetMime};base64,${payload}`;
              }
            }
          }
          if (SanitizeCommunityAttachmentUrl(dataUrl, kind)) {
            resolve(dataUrl);
            return;
          }
        }
        if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
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
