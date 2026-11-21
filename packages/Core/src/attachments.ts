import { IsValidUUID } from '@memberjunction/global';
import type { CommunityVisibilityBand } from './rules.ts';

/**
 * Supported attachment categories rendered in Community posts, threads, and the Space Media & Artifacts Library.
 */
export type CommunityAttachmentKind = 'image' | 'video' | 'audio' | 'artifact' | 'file';

/**
 * Semantic entry context used to decide default Space Library visibility for newly attached items.
 */
export type CommunityAttachmentEntryType =
  | 'post'
  | 'reply'
  | 'comment'
  | 'playbook'
  | 'collaborative-doc'
  | 'collaborative-sheet'
  | 'collaborative-deck'
  | 'artifact-post'
  | (string & {});

/**
 * Two-tier SpaceItem.Folder routing labels used to distinguish curated Space Library items
 * from everyday discussion/reply media while keeping every attachment indexed in the Space.
 */
export const COMMUNITY_SPACE_ITEM_FOLDERS = {
  Library: 'Library',
  PostMedia: 'Post Media',
} as const;

export type CommunitySpaceItemFolder =
  (typeof COMMUNITY_SPACE_ITEM_FOLDERS)[keyof typeof COMMUNITY_SPACE_ITEM_FOLDERS];

/**
 * Authoritative size and count limits aligned with BizApps Collaboration (`SPACE_UPLOAD_MAX_BYTES = 10 MiB`).
 */
export const COMMUNITY_ATTACHMENT_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST = 12;
export const COMMUNITY_ATTACHMENT_MAX_AGGREGATE_BYTES_PER_POST = 50 * 1024 * 1024;
export const COMMUNITY_ATTACHMENT_MAX_DATA_URL_BYTES = COMMUNITY_ATTACHMENT_MAX_FILE_BYTES;
export const COMMUNITY_ATTACHMENT_MAX_CAPTION_LENGTH = 300;

export interface CommunityAttachmentLimits {
  maxFileBytes: number;
  maxCountPerPost: number;
  maxAggregateBytesPerPost: number;
  maxDataUrlBytes: number;
}

export const DEFAULT_COMMUNITY_ATTACHMENT_LIMITS: Readonly<CommunityAttachmentLimits> = Object.freeze({
  maxFileBytes: COMMUNITY_ATTACHMENT_MAX_FILE_BYTES,
  maxCountPerPost: COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST,
  maxAggregateBytesPerPost: COMMUNITY_ATTACHMENT_MAX_AGGREGATE_BYTES_PER_POST,
  maxDataUrlBytes: COMMUNITY_ATTACHMENT_MAX_DATA_URL_BYTES,
});

export const COMMUNITY_ALLOWED_IMAGE_MIME_TYPES: ReadonlySet<string> = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/avif',
]);

export const COMMUNITY_ALLOWED_VIDEO_MIME_TYPES: ReadonlySet<string> = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/ogg',
]);

export const COMMUNITY_ALLOWED_AUDIO_MIME_TYPES: ReadonlySet<string> = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/mp4',
  'audio/m4a',
  'audio/aac',
  'audio/webm',
  'audio/flac',
]);

export const COMMUNITY_ALLOWED_FILE_MIME_TYPES: ReadonlySet<string> = new Set([
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
]);

export const COMMUNITY_ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  ...COMMUNITY_ALLOWED_IMAGE_MIME_TYPES,
  ...COMMUNITY_ALLOWED_VIDEO_MIME_TYPES,
  ...COMMUNITY_ALLOWED_AUDIO_MIME_TYPES,
  ...COMMUNITY_ALLOWED_FILE_MIME_TYPES,
]);

export const COMMUNITY_ALLOWED_TEXT_ARTIFACT_MIME_TYPES: ReadonlySet<string> = new Set([
  'text/html',
  'image/svg+xml',
  'text/markdown',
  'text/x-markdown',
  'application/json',
  'text/plain',
  'text/csv',
  'application/xml',
  'text/xml',
  'text/css',
  'application/x-yaml',
  'text/yaml',
  'text/javascript',
  'application/javascript',
  'application/typescript',
  'text/x-sql',
  'application/sql',
]);

const SAFE_DATA_IMAGE_MIME_TYPES: ReadonlySet<string> = COMMUNITY_ALLOWED_IMAGE_MIME_TYPES;
const SAFE_DATA_AUDIO_MIME_TYPES: ReadonlySet<string> = COMMUNITY_ALLOWED_AUDIO_MIME_TYPES;
const SAFE_DATA_VIDEO_MIME_TYPES: ReadonlySet<string> = COMMUNITY_ALLOWED_VIDEO_MIME_TYPES;
const SAFE_DATA_FILE_MIME_TYPES: ReadonlySet<string> = COMMUNITY_ALLOWED_FILE_MIME_TYPES;

const LIBRARY_FEATURED_ENTRY_TYPES: ReadonlySet<string> = new Set([
  'playbook',
  'collaborative-doc',
  'collaborative-sheet',
  'collaborative-deck',
  'artifact-post',
  'artifact',
]);

export type CommunityArtifactModality = 'Document' | 'Spreadsheet' | 'Presentation';
export type CommunityArtifactCollaborationMode = 'Suggest' | 'Edit' | 'Comment Only';

/**
 * Common metadata shared by every Community post/reply attachment and Space Media Library entry.
 */
export interface CommunityAttachmentBase {
  id: string;
  kind: CommunityAttachmentKind;
  spaceId: string;
  postId: string;
  spaceItemId?: string | null;
  forumPostAttachmentId?: string | null;
  caption?: string | null;
  sequence: number;
  featureInLibrary: boolean;
  folder: CommunitySpaceItemFolder | string | null;
  band?: CommunityVisibilityBand;
  authorUserId?: string | null;
  authorName?: string | null;
  createdAt?: string | Date | null;
  postTitle?: string | null;
  forumId?: string | null;
  forumName?: string | null;
}

/**
 * Embedded MJ Artifact (or Artifact Version) attached to a Community post/reply.
 */
export interface CommunityArtifactAttachmentItem extends CommunityAttachmentBase {
  kind: 'artifact';
  artifactId: string;
  artifactVersionId?: string | null;
  artifactTypeName: string;
  artifactName: string;
  previewContent?: string | null;
  contentType?: string | null;
  versionNumber?: number | null;
  modality?: CommunityArtifactModality | null;
  collaborationMode?: CommunityArtifactCollaborationMode | null;
  showInlinePreview?: boolean;
  fileId?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  url?: string | null;
}

/**
 * Regular media or document file attached to a Community post/reply (image, video, audio, PDF, Office doc).
 */
export interface CommunityFileAttachmentItem extends CommunityAttachmentBase {
  kind: 'image' | 'video' | 'audio' | 'file';
  fileId?: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  posterUrl?: string | null;
  durationSeconds?: number | null;
  artifactId?: string | null;
  artifactVersionId?: string | null;
}

/**
 * Unified discriminated union representing both embedded MJ Artifacts and regular file/media attachments.
 */
export type CommunityAttachmentItem =
  | CommunityArtifactAttachmentItem
  | CommunityFileAttachmentItem;

export interface GroupedPostAttachments {
  visualMedia: CommunityFileAttachmentItem[];
  audioTracks: CommunityFileAttachmentItem[];
  artifacts: CommunityArtifactAttachmentItem[];
  files: CommunityFileAttachmentItem[];
  totalCount: number;
}

export interface CommunityAttachmentValidationResult {
  valid: boolean;
  errors: string[];
  normalizedMimeType?: string;
  classifiedKind?: CommunityAttachmentKind;
  sanitizedUrl?: string | null;
  sanitizedPosterUrl?: string | null;
}

/**
 * Normalizes a claimed MIME type by stripping parameters (`;charset=...`) and lowercasing.
 */
export function NormalizeAttachmentMimeType(mimeType: string | null | undefined): string {
  if (typeof mimeType !== 'string') {
    return '';
  }
  return mimeType.split(';')[0].trim().toLowerCase();
}

/**
 * Returns true if the normalized MIME type is explicitly permitted by the Community attachment allowlist.
 * Actively rejects script-capable types such as `text/html`, `image/svg+xml`, and `application/javascript`.
 */
export function IsAllowedAttachmentMimeType(mimeType: string | null | undefined): boolean {
  const normalized = NormalizeAttachmentMimeType(mimeType);
  return COMMUNITY_ALLOWED_MIME_TYPES.has(normalized);
}

/**
 * Returns true if the normalized MIME type is permitted for sandboxed `ContentMode = 'Text'`
 * MJ Artifact versions (HTML, SVG, Markdown, JSON, CSV, plain text, code).
 */
export function IsAllowedTextArtifactMimeType(mimeType: string | null | undefined): boolean {
  const normalized = NormalizeAttachmentMimeType(mimeType);
  return COMMUNITY_ALLOWED_TEXT_ARTIFACT_MIME_TYPES.has(normalized);
}

/**
 * Classifies an attachment into `artifact`, `image`, `video`, `audio`, or `file`.
 */
export function ClassifyAttachmentKind(
  mimeType: string | null | undefined,
  isArtifact: boolean = false,
): CommunityAttachmentKind {
  if (isArtifact) {
    return 'artifact';
  }
  const normalized = NormalizeAttachmentMimeType(mimeType);
  if (normalized.startsWith('image/')) {
    return 'image';
  }
  if (normalized.startsWith('video/')) {
    return 'video';
  }
  if (normalized.startsWith('audio/')) {
    return 'audio';
  }
  return 'file';
}

/**
 * Determines the default `Feature in Space Library` toggle value for a new attachment:
 * - Returns `true` by default for embedded MJ Artifacts (`kind === 'artifact'`) and Playbooks/Collaborative Docs.
 * - Returns `false` by default for casual post/reply media and file uploads (always user-toggleable).
 */
export function ResolveDefaultFeatureInLibrary(
  kind: CommunityAttachmentKind,
  entryType?: CommunityAttachmentEntryType | null,
): boolean {
  if (kind === 'artifact') {
    return true;
  }
  const normalizedEntry = typeof entryType === 'string' ? entryType.trim().toLowerCase() : '';
  if (normalizedEntry && LIBRARY_FEATURED_ENTRY_TYPES.has(normalizedEntry)) {
    return true;
  }
  return false;
}

/**
 * Maps the `featureInLibrary` boolean flag to its target `SpaceItem.Folder` label:
 * `true -> 'Library'`, `false -> 'Post Media'`.
 */
export function ResolveAttachmentSpaceItemFolder(featureInLibrary: boolean): CommunitySpaceItemFolder {
  return featureInLibrary
    ? COMMUNITY_SPACE_ITEM_FOLDERS.Library
    : COMMUNITY_SPACE_ITEM_FOLDERS.PostMedia;
}

/**
 * Returns true when a `SpaceItem.Folder` value represents the curated `'Library'` tier.
 */
export function IsFeaturedLibraryFolder(folder: string | null | undefined): boolean {
  return typeof folder === 'string' && folder.trim().toLowerCase() === 'library';
}

/**
 * Groups a post's attachments into rendering buckets (`visualMedia`, `audioTracks`, `artifacts`, `files`)
 * while preserving the author's `sequence` ordering (and original array index for equal sequences).
 */
export function GroupPostAttachmentsForDisplay(
  attachments: ReadonlyArray<CommunityAttachmentItem>,
): GroupedPostAttachments {
  const indexed = attachments.map((item, originalIndex) => ({ item, originalIndex }));
  indexed.sort((a, b) => {
    const seqDiff = a.item.sequence - b.item.sequence;
    return seqDiff !== 0 ? seqDiff : a.originalIndex - b.originalIndex;
  });

  const visualMedia: CommunityFileAttachmentItem[] = [];
  const audioTracks: CommunityFileAttachmentItem[] = [];
  const artifacts: CommunityArtifactAttachmentItem[] = [];
  const files: CommunityFileAttachmentItem[] = [];

  for (const { item } of indexed) {
    if (item.kind === 'artifact') {
      artifacts.push(item);
    } else if (item.kind === 'image' || item.kind === 'video') {
      visualMedia.push(item);
    } else if (item.kind === 'audio') {
      audioTracks.push(item);
    } else {
      files.push(item);
    }
  }

  return {
    visualMedia,
    audioTracks,
    artifacts,
    files,
    totalCount: indexed.length,
  };
}

function containsControlCharacters(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

function isAllowedDataMimeForKind(mime: string, kind?: CommunityAttachmentKind): boolean {
  if (kind === 'image') {
    return SAFE_DATA_IMAGE_MIME_TYPES.has(mime);
  }
  if (kind === 'audio') {
    return SAFE_DATA_AUDIO_MIME_TYPES.has(mime);
  }
  if (kind === 'video') {
    return SAFE_DATA_VIDEO_MIME_TYPES.has(mime);
  }
  if (kind === 'file') {
    return SAFE_DATA_FILE_MIME_TYPES.has(mime);
  }
  if (kind === 'artifact') {
    return false;
  }
  return (
    SAFE_DATA_IMAGE_MIME_TYPES.has(mime) ||
    SAFE_DATA_AUDIO_MIME_TYPES.has(mime) ||
    SAFE_DATA_VIDEO_MIME_TYPES.has(mime) ||
    SAFE_DATA_FILE_MIME_TYPES.has(mime)
  );
}

/**
 * Validates and sanitizes an attachment or media URL for safe rendering.
 * Rejects `javascript:`, `vbscript:`, control characters, protocol-relative URLs, and unsafe `data:` schemes
 * (including `data:text/html` and `data:image/svg+xml`). Permits `https://`, `http://`, safe `blob:https?://`,
 * and validated `data:image/`, `data:audio/`, `data:video/` URIs.
 */
export function SanitizeCommunityAttachmentUrl(
  rawUrl: string | null | undefined,
  kind?: CommunityAttachmentKind,
  maxDataUrlBytes: number = COMMUNITY_ATTACHMENT_MAX_DATA_URL_BYTES,
): string | null {
  if (typeof rawUrl !== 'string') {
    return null;
  }
  const trimmed = rawUrl.trim();
  if (!trimmed || containsControlCharacters(trimmed)) {
    return null;
  }

  const lower = trimmed.toLowerCase();

  // Reject dangerous or ambiguous schemes immediately
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('//')
  ) {
    return null;
  }

  if (lower.startsWith('data:')) {
    const maxEncodedLength = Math.ceil(maxDataUrlBytes * 1.4) + 128;
    if (trimmed.length > maxEncodedLength) {
      return null;
    }

    const commaIdx = trimmed.indexOf(',');
    if (commaIdx <= 5) {
      return null;
    }
    const header = trimmed.slice(5, commaIdx);
    const payload = trimmed.slice(commaIdx + 1);
    if (!payload.trim()) {
      return null;
    }

    const headerParts = header.split(';').map((p) => p.trim().toLowerCase()).filter(Boolean);
    const mime = headerParts[0] ?? '';
    if (!isAllowedDataMimeForKind(mime, kind)) {
      return null;
    }

    const isBase64 = headerParts.includes('base64');
    if (isBase64) {
      const compactPayload = payload.replace(/\s+/g, '');
      if (!compactPayload || !/^[A-Za-z0-9+/=]+$/.test(compactPayload)) {
        return null;
      }
    }

    return trimmed;
  }

  if (lower.startsWith('blob:')) {
    const inner = trimmed.slice(5);
    const innerLower = inner.toLowerCase();
    if (!innerLower.startsWith('https://') && !innerLower.startsWith('http://')) {
      return null;
    }
    try {
      const parsedInner = new URL(inner);
      if ((parsedInner.protocol === 'https:' || parsedInner.protocol === 'http:') && parsedInner.hostname.length > 0) {
        return `blob:${parsedInner.toString()}`;
      }
      return null;
    } catch {
      return null;
    }
  }

  if (lower.startsWith('https://') || lower.startsWith('http://')) {
    try {
      const parsed = new URL(trimmed);
      if ((parsed.protocol === 'https:' || parsed.protocol === 'http:') && parsed.hostname.length > 0) {
        return parsed.toString();
      }
      return null;
    } catch {
      return null;
    }
  }

  if (trimmed.startsWith('/api/files/')) {
    const fileIdPart = trimmed.slice('/api/files/'.length);
    if (IsValidUUID(fileIdPart)) {
      return `/api/files/${fileIdPart}`;
    }
    return null;
  }

  return null;
}

/**
 * Returns true when a URL is a transient browser `blob:` URL or an unbacked `attachments.local`
 * placeholder that must NEVER be persisted into `MJ: Artifact Versions.Content`.
 */
export function IsTemporaryOrPlaceholderAttachmentUrl(rawUrl: string | null | undefined): boolean {
  if (typeof rawUrl !== 'string') {
    return false;
  }
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return false;
  }
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('blob:')) {
    return true;
  }
  if (lower.startsWith('https://') || lower.startsWith('http://')) {
    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.toLowerCase();
      return host === 'attachments.local' || host.endsWith('.attachments.local');
    } catch {
      return true;
    }
  }
  return false;
}

/**
 * Sanitizes an attachment URL for durable persistence. Rejects every scheme disallowed by
 * `SanitizeCommunityAttachmentUrl` AND explicitly rejects `blob:` and `attachments.local` URLs.
 */
export function SanitizePersistedAttachmentUrl(
  rawUrl: string | null | undefined,
  kind?: CommunityAttachmentKind,
  maxDataUrlBytes: number = COMMUNITY_ATTACHMENT_MAX_DATA_URL_BYTES,
): string | null {
  if (IsTemporaryOrPlaceholderAttachmentUrl(rawUrl)) {
    return null;
  }
  return SanitizeCommunityAttachmentUrl(rawUrl, kind, maxDataUrlBytes);
}

/**
 * Computes the exact byte length of an authoritative `MJ: Artifact Versions.Content` payload
 * when `ContentSizeBytes` is omitted (supports `data:` URIs and `ContentMode = 'Text'` payloads).
 * Returns `null` when size cannot be determined from the content string (e.g., `https://` URLs).
 */
export function ComputeAttachmentContentByteLength(
  content: string | null | undefined,
  contentMode?: string | null,
): number | null {
  if (typeof content !== 'string') {
    return null;
  }
  const trimmed = content.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.toLowerCase().startsWith('data:')) {
    const commaIdx = trimmed.indexOf(',');
    if (commaIdx <= 5) {
      return null;
    }
    const header = trimmed.slice(5, commaIdx).toLowerCase();
    const payload = trimmed.slice(commaIdx + 1);
    const isBase64 = header
      .split(';')
      .map((p) => p.trim())
      .includes('base64');
    if (isBase64) {
      const compact = payload.replace(/\s+/g, '');
      if (!compact || !/^[A-Za-z0-9+/=]+$/.test(compact) || compact.length % 4 !== 0) {
        return null;
      }
      const padding = compact.endsWith('==') ? 2 : compact.endsWith('=') ? 1 : 0;
      const decoded = Math.floor((compact.length * 3) / 4) - padding;
      return decoded > 0 ? decoded : null;
    }
    try {
      const decodedText = decodeURIComponent(payload);
      const len = new TextEncoder().encode(decodedText).byteLength;
      return len > 0 ? len : null;
    } catch {
      const len = new TextEncoder().encode(payload).byteLength;
      return len > 0 ? len : null;
    }
  }
  if (contentMode === 'Text') {
    const len = new TextEncoder().encode(trimmed).byteLength;
    return len > 0 ? len : null;
  }
  return null;
}

export interface AuthoritativeFileRowInput {
  ID: string;
  Name?: string | null;
  ContentType?: string | null;
  Size?: number | null;
  ContentSizeBytes?: number | null;
  DownloadURL?: string | null;
  Url?: string | null;
  Content?: string | null;
  ProviderKey?: string | null;
  Status?: string | null;
}

export interface AuthoritativeFileValidationResult {
  valid: boolean;
  error?: string;
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  kind?: 'image' | 'video' | 'audio' | 'file';
  sizeBytes?: number;
  url?: string;
}

/**
 * Resolves a durable, sanitized download URL for an `MJ: Files` record from explicit URL fields
 * (`DownloadURL`, `Url`, `Content`) or synthesizes a canonical `/api/files/<ID>` route when a valid
 * `ProviderKey` storage reference is present. Fails closed if an explicit URL is unsafe/temporary.
 */
export function ResolveAuthoritativeFileUrl(
  fileRow: AuthoritativeFileRowInput,
  kind?: CommunityAttachmentKind,
): string | null {
  const explicitUrl = fileRow.DownloadURL ?? fileRow.Url ?? fileRow.Content ?? null;
  if (typeof explicitUrl === 'string' && explicitUrl.trim().length > 0) {
    return SanitizePersistedAttachmentUrl(explicitUrl, kind);
  }

  if (typeof fileRow.ProviderKey === 'string') {
    const trimmedKey = fileRow.ProviderKey.trim();
    if (trimmedKey.length > 0 && !containsControlCharacters(trimmedKey)) {
      const lowerKey = trimmedKey.toLowerCase();
      if (lowerKey.startsWith('https://') || lowerKey.startsWith('http://')) {
        return SanitizePersistedAttachmentUrl(trimmedKey, kind);
      }
      if (
        !lowerKey.startsWith('javascript:') &&
        !lowerKey.startsWith('vbscript:') &&
        !lowerKey.startsWith('data:') &&
        !lowerKey.startsWith('blob:') &&
        !trimmedKey.startsWith('//') &&
        !trimmedKey.includes('..') &&
        IsValidUUID(fileRow.ID?.trim() ?? '')
      ) {
        return `/api/files/${fileRow.ID.trim()}`;
      }
    }
  }

  return null;
}

/**
 * Validates an `MJ: Files` record under `ContextUser`.
 * Derives authoritative MIME type, positive byte size (from the file row or an optional companion
 * `MJ: Artifact Versions` record linked via `FileID`), and durable URL — failing closed if any
 * authoritative field is missing, disallowed, conflicting, or unsafe.
 */
export function ValidateAuthoritativeFileRecord(
  fileRow: AuthoritativeFileRowInput,
  expectedKind?: 'image' | 'video' | 'audio' | 'file',
  companionVersionRow?: AuthoritativeArtifactVersionRowInput | null,
): AuthoritativeFileValidationResult {
  const status = typeof fileRow.Status === 'string' ? fileRow.Status.trim().toLowerCase() : '';
  if (status === 'deleting' || status === 'deleted' || status === 'failed' || status === 'error') {
    return {
      valid: false,
      error: `Referenced MJ: Files record ${fileRow.ID} has status "${fileRow.Status}" and cannot be attached.`,
    };
  }

  const mimeType = NormalizeAttachmentMimeType(fileRow.ContentType ?? '');
  if (!mimeType || !IsAllowedAttachmentMimeType(mimeType)) {
    return {
      valid: false,
      error: `MJ: Files record ${fileRow.ID} MIME type "${fileRow.ContentType ?? ''}" is missing or not permitted by the Community attachment allowlist.`,
    };
  }

  const classified = ClassifyAttachmentKind(mimeType, false);
  if (classified === 'artifact') {
    return {
      valid: false,
      error: `MJ: Files record ${fileRow.ID} MIME type "${mimeType}" cannot be attached as a file.`,
    };
  }
  if (expectedKind && classified !== expectedKind) {
    return {
      valid: false,
      error: `MJ: Files record ${fileRow.ID} MIME type "${mimeType}" classifies as "${classified}", not "${expectedKind}".`,
    };
  }

  const fileOwnSize = fileRow.ContentSizeBytes ?? fileRow.Size ?? null;
  let rawSize: number | null = fileOwnSize;
  if (
    rawSize == null &&
    companionVersionRow &&
    idsMatchCaseInsensitive(companionVersionRow.FileID, fileRow.ID)
  ) {
    rawSize =
      companionVersionRow.ContentSizeBytes != null
        ? companionVersionRow.ContentSizeBytes
        : ComputeAttachmentContentByteLength(companionVersionRow.Content, companionVersionRow.ContentMode);
  }

  if (typeof rawSize !== 'number' || !Number.isFinite(rawSize) || rawSize <= 0) {
    return {
      valid: false,
      error: `MJ: Files record ${fileRow.ID} is missing a valid positive authoritative byte size.`,
    };
  }
  if (rawSize > COMMUNITY_ATTACHMENT_MAX_FILE_BYTES) {
    return {
      valid: false,
      error: `MJ: Files record ${fileRow.ID} size (${rawSize} bytes) exceeds the maximum allowed (${COMMUNITY_ATTACHMENT_MAX_FILE_BYTES} bytes).`,
    };
  }

  if (companionVersionRow && idsMatchCaseInsensitive(companionVersionRow.FileID, fileRow.ID)) {
    if (companionVersionRow.MimeType && companionVersionRow.MimeType.trim()) {
      const compMime = NormalizeAttachmentMimeType(companionVersionRow.MimeType);
      if (!IsAllowedAttachmentMimeType(compMime)) {
        return {
          valid: false,
          error: `Artifact Version ${companionVersionRow.ID} MIME type "${companionVersionRow.MimeType}" is not permitted by the Community attachment allowlist.`,
        };
      }
      if (compMime !== mimeType) {
        return {
          valid: false,
          error: `Artifact Version ${companionVersionRow.ID} MIME type "${compMime}" conflicts with linked MJ: Files ${fileRow.ID} ContentType "${mimeType}".`,
        };
      }
    }
    if (fileOwnSize != null && companionVersionRow.ContentSizeBytes != null) {
      if (companionVersionRow.ContentSizeBytes > COMMUNITY_ATTACHMENT_MAX_FILE_BYTES) {
        return {
          valid: false,
          error: `Artifact Version ${companionVersionRow.ID} size (${companionVersionRow.ContentSizeBytes} bytes) exceeds the maximum allowed (${COMMUNITY_ATTACHMENT_MAX_FILE_BYTES} bytes).`,
        };
      }
      if (companionVersionRow.ContentSizeBytes !== fileOwnSize) {
        return {
          valid: false,
          error: `Artifact Version ${companionVersionRow.ID} ContentSizeBytes (${companionVersionRow.ContentSizeBytes}) conflicts with linked MJ: Files ${fileRow.ID} authoritative size (${fileOwnSize} bytes).`,
        };
      }
    }
  }

  const safeUrl = ResolveAuthoritativeFileUrl(fileRow, classified);
  if (!safeUrl) {
    return {
      valid: false,
      error: `MJ: Files record ${fileRow.ID} lacks a valid durable download/provider URL.`,
    };
  }

  const fileName = fileRow.Name?.trim() || 'attachment';
  return {
    valid: true,
    fileId: fileRow.ID,
    fileName,
    mimeType,
    kind: classified,
    sizeBytes: rawSize,
    url: safeUrl,
  };
}

export interface AuthoritativeArtifactVersionRowInput {
  ID: string;
  ArtifactID: string;
  FileID: string | null;
  ContentMode: string | null;
  MimeType: string | null;
  ContentSizeBytes: number | null;
  Content: string | null;
  FileName?: string | null;
  VersionNumber?: number | null;
}

export interface AuthoritativeArtifactVersionValidationResult {
  valid: boolean;
  error?: string;
  versionId?: string;
  artifactId?: string;
  fileId?: string | null;
  contentMode?: 'File' | 'Text';
  mimeType?: string;
  sizeBytes?: number;
  url?: string | null;
  fileName?: string;
}

function idsMatchCaseInsensitive(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Centralized server-boundary validation for an `MJ: Artifact Versions` target across both
 * `ForumPostAttachmentServerEntity` and `CommunityAttachmentServerService`.
 */
export function ValidateAuthoritativeArtifactVersionRecord(
  version: AuthoritativeArtifactVersionRowInput,
  options: {
    targetEntityName?: 'MJ: Files' | 'MJ: Artifacts';
    targetRecordUuid?: string | null;
    expectedFileId?: string | null;
    expectedKind?: CommunityAttachmentKind;
    linkedFileRow?: AuthoritativeFileRowInput | null;
  } = {},
): AuthoritativeArtifactVersionValidationResult {
  if (!version.ArtifactID || !IsValidUUID(version.ArtifactID.trim())) {
    return {
      valid: false,
      error: `Artifact Version ${version.ID} is missing a valid parent ArtifactID.`,
    };
  }

  if (
    options.targetEntityName === 'MJ: Artifacts' &&
    options.targetRecordUuid &&
    !idsMatchCaseInsensitive(version.ArtifactID, options.targetRecordUuid)
  ) {
    return {
      valid: false,
      error: `Artifact Version ${version.ID} does not belong to Artifact ${options.targetRecordUuid}.`,
    };
  }

  const requiredFileTarget =
    options.targetEntityName === 'MJ: Files' ? options.targetRecordUuid ?? null : options.expectedFileId ?? null;
  if (requiredFileTarget) {
    if (!version.FileID || !IsValidUUID(version.FileID.trim())) {
      return {
        valid: false,
        error: `Artifact Version ${version.ID} has null or invalid FileID and cannot bind to MJ: Files ${requiredFileTarget}.`,
      };
    }
    if (!idsMatchCaseInsensitive(version.FileID, requiredFileTarget)) {
      return {
        valid: false,
        error: `Artifact Version ${version.ID} belongs to File ${version.FileID}, not ${requiredFileTarget}.`,
      };
    }
  }

  const mode = version.ContentMode;
  if (mode !== 'File' && mode !== 'Text') {
    return {
      valid: false,
      error: `Artifact Version ${version.ID} has unsupported ContentMode "${mode ?? 'null'}".`,
    };
  }

  if (options.targetEntityName === 'MJ: Files' && mode !== 'File') {
    return {
      valid: false,
      error: `Artifact Version ${version.ID} targeting MJ: Files has ContentMode "${mode}", expected "File".`,
    };
  }
  if (options.expectedKind && options.expectedKind !== 'artifact' && mode !== 'File') {
    return {
      valid: false,
      error: `Artifact Version ${version.ID} has ContentMode "${mode}", expected "File" for file/media attachments.`,
    };
  }

  if (mode === 'File') {
    const hasFileId = typeof version.FileID === 'string' && version.FileID.trim().length > 0;
    if (hasFileId) {
      if (!IsValidUUID(version.FileID!.trim())) {
        return {
          valid: false,
          error: `Artifact Version ${version.ID} has invalid FileID "${version.FileID}".`,
        };
      }
      if (!options.linkedFileRow || !idsMatchCaseInsensitive(options.linkedFileRow.ID, version.FileID)) {
        return {
          valid: false,
          error: `Artifact Version ${version.ID} references FileID ${version.FileID}, but the linked MJ: Files record was not loaded or does not match.`,
        };
      }
    } else if (options.linkedFileRow) {
      return {
        valid: false,
        error: `Artifact Version ${version.ID} has null FileID and cannot bind to MJ: Files ${options.linkedFileRow.ID}.`,
      };
    }

    if (options.linkedFileRow) {
      const expectedFileKind =
        options.expectedKind && options.expectedKind !== 'artifact' ? options.expectedKind : undefined;
      const fileCheck = ValidateAuthoritativeFileRecord(options.linkedFileRow, expectedFileKind, version);
      if (!fileCheck.valid) {
        return {
          valid: false,
          error: fileCheck.error,
        };
      }

      if (version.Content && version.Content.trim()) {
        if (IsTemporaryOrPlaceholderAttachmentUrl(version.Content)) {
          return {
            valid: false,
            error: `Artifact Version ${version.ID} content URL uses a temporary or placeholder scheme (blob:/attachments.local).`,
          };
        }
        if (!SanitizePersistedAttachmentUrl(version.Content, fileCheck.kind)) {
          return {
            valid: false,
            error: `Artifact Version ${version.ID} content URL uses an unsafe or unsupported scheme.`,
          };
        }
      }

      if (version.ContentSizeBytes != null) {
        if (!Number.isFinite(version.ContentSizeBytes) || version.ContentSizeBytes <= 0) {
          return {
            valid: false,
            error: `Artifact Version ${version.ID} is missing a valid positive authoritative ContentSizeBytes.`,
          };
        }
        if (version.ContentSizeBytes > COMMUNITY_ATTACHMENT_MAX_FILE_BYTES) {
          return {
            valid: false,
            error: `Artifact Version ${version.ID} size (${version.ContentSizeBytes} bytes) exceeds the maximum allowed (${COMMUNITY_ATTACHMENT_MAX_FILE_BYTES} bytes).`,
          };
        }
        if (version.ContentSizeBytes !== fileCheck.sizeBytes) {
          return {
            valid: false,
            error: `Artifact Version ${version.ID} ContentSizeBytes (${version.ContentSizeBytes}) conflicts with linked MJ: Files ${fileCheck.fileId} authoritative size (${fileCheck.sizeBytes} bytes).`,
          };
        }
      }

      return {
        valid: true,
        versionId: version.ID,
        artifactId: version.ArtifactID,
        fileId: version.FileID,
        contentMode: 'File',
        mimeType: fileCheck.mimeType!,
        sizeBytes: fileCheck.sizeBytes!,
        url: fileCheck.url!,
        fileName: options.linkedFileRow.Name?.trim() || version.FileName?.trim() || 'attachment',
      };
    }

    const mimeType = NormalizeAttachmentMimeType(version.MimeType || '');
    if (!mimeType || !IsAllowedAttachmentMimeType(mimeType)) {
      return {
        valid: false,
        error: `Artifact Version ${version.ID} MIME type "${version.MimeType ?? ''}" is not permitted by the Community attachment allowlist.`,
      };
    }

    const classified = ClassifyAttachmentKind(mimeType, false);
    if (classified === 'artifact') {
      return {
        valid: false,
        error: `Artifact Version ${version.ID} MIME type "${mimeType}" cannot be attached as a file.`,
      };
    }
    if (options.expectedKind && options.expectedKind !== 'artifact' && classified !== options.expectedKind) {
      return {
        valid: false,
        error: `Artifact Version ${version.ID} MIME type "${mimeType}" classifies as "${classified}", not "${options.expectedKind}".`,
      };
    }

    let safeUrl: string | null = null;
    if (version.Content && version.Content.trim()) {
      if (IsTemporaryOrPlaceholderAttachmentUrl(version.Content)) {
        return {
          valid: false,
          error: `Artifact Version ${version.ID} content URL uses a temporary or placeholder scheme (blob:/attachments.local).`,
        };
      }
      safeUrl = SanitizePersistedAttachmentUrl(version.Content, classified);
      if (!safeUrl) {
        return {
          valid: false,
          error: `Artifact Version ${version.ID} content URL uses an unsafe or unsupported scheme.`,
        };
      }
    } else {
      return {
        valid: false,
        error: `Artifact Version ${version.ID} requires either a valid FileID or a durable safe Content URL.`,
      };
    }

    const authoritativeSize =
      version.ContentSizeBytes != null
        ? version.ContentSizeBytes
        : ComputeAttachmentContentByteLength(version.Content, 'File');

    if (typeof authoritativeSize !== 'number' || !Number.isFinite(authoritativeSize) || authoritativeSize <= 0) {
      return {
        valid: false,
        error: `Artifact Version ${version.ID} is missing a valid positive authoritative ContentSizeBytes.`,
      };
    }
    if (authoritativeSize > COMMUNITY_ATTACHMENT_MAX_FILE_BYTES) {
      return {
        valid: false,
        error: `Artifact Version ${version.ID} size (${authoritativeSize} bytes) exceeds the maximum allowed (${COMMUNITY_ATTACHMENT_MAX_FILE_BYTES} bytes).`,
      };
    }

    return {
      valid: true,
      versionId: version.ID,
      artifactId: version.ArtifactID,
      fileId: version.FileID,
      contentMode: 'File',
      mimeType,
      sizeBytes: authoritativeSize,
      url: safeUrl,
      fileName: version.FileName?.trim() || 'attachment',
    };
  }

  // ContentMode === 'Text': sandboxed HTML / SVG / Markdown / JSON / Code artifacts
  if (typeof version.FileID === 'string' && version.FileID.trim().length > 0) {
    return {
      valid: false,
      error: `Artifact Version ${version.ID} has ContentMode "Text" and cannot bind FileID ${version.FileID}.`,
    };
  }
  const textMime = NormalizeAttachmentMimeType(version.MimeType ?? '');
  if (!textMime || !IsAllowedTextArtifactMimeType(textMime)) {
    return {
      valid: false,
      error: `Artifact Version ${version.ID} text MIME type "${version.MimeType ?? ''}" is missing or not permitted.`,
    };
  }

  const trimmedContent = typeof version.Content === 'string' ? version.Content.trim() : '';
  if (!trimmedContent || containsControlCharacters(trimmedContent.replace(/[\r\n\t]/g, ''))) {
    return {
      valid: false,
      error: `Artifact Version ${version.ID} text Content must be non-empty and free of unsafe control characters.`,
    };
  }
  const lowerContent = trimmedContent.toLowerCase();
  if (
    IsTemporaryOrPlaceholderAttachmentUrl(trimmedContent) ||
    lowerContent.startsWith('javascript:') ||
    lowerContent.startsWith('vbscript:')
  ) {
    return {
      valid: false,
      error: `Artifact Version ${version.ID} text Content uses a forbidden URL scheme.`,
    };
  }

  const textSize =
    version.ContentSizeBytes != null
      ? version.ContentSizeBytes
      : ComputeAttachmentContentByteLength(version.Content, 'Text');
  if (typeof textSize !== 'number' || !Number.isFinite(textSize) || textSize <= 0) {
    return {
      valid: false,
      error: `Artifact Version ${version.ID} is missing a valid positive authoritative ContentSizeBytes.`,
    };
  }
  if (textSize > COMMUNITY_ATTACHMENT_MAX_FILE_BYTES) {
    return {
      valid: false,
      error: `Artifact Version ${version.ID} size (${textSize} bytes) exceeds the maximum allowed (${COMMUNITY_ATTACHMENT_MAX_FILE_BYTES} bytes).`,
    };
  }

  return {
    valid: true,
    versionId: version.ID,
    artifactId: version.ArtifactID,
    fileId: version.FileID,
    contentMode: 'Text',
    mimeType: textMime,
    sizeBytes: textSize,
    url: null,
    fileName: version.FileName?.trim() || 'artifact',
  };
}

/**
 * Validates a single attachment's file size against the configured per-file byte limit.
 */
export function ValidateAttachmentFileSize(
  sizeBytes: number,
  maxFileBytes: number = COMMUNITY_ATTACHMENT_MAX_FILE_BYTES,
): CommunityAttachmentValidationResult {
  const errors: string[] = [];
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    errors.push('Attachment file size must be a positive number of bytes.');
  } else if (sizeBytes > maxFileBytes) {
    errors.push(`Attachment size (${sizeBytes} bytes) exceeds the maximum allowed (${maxFileBytes} bytes).`);
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates attachment count and aggregate byte limits for a single post or reply submission.
 */
export function ValidateAttachmentBatchLimits(
  attachments: ReadonlyArray<{ sizeBytes?: number | null }>,
  limits: Partial<CommunityAttachmentLimits> = {},
): CommunityAttachmentValidationResult {
  const maxCount = limits.maxCountPerPost ?? COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST;
  const maxFile = limits.maxFileBytes ?? COMMUNITY_ATTACHMENT_MAX_FILE_BYTES;
  const maxAggregate = limits.maxAggregateBytesPerPost ?? COMMUNITY_ATTACHMENT_MAX_AGGREGATE_BYTES_PER_POST;
  const errors: string[] = [];

  if (attachments.length > maxCount) {
    errors.push(`Attachment count (${attachments.length}) exceeds the maximum of ${maxCount} attachments per post.`);
  }

  let aggregateBytes = 0;
  for (let i = 0; i < attachments.length; i += 1) {
    const size = attachments[i].sizeBytes;
    if (size != null) {
      const fileResult = ValidateAttachmentFileSize(size, maxFile);
      if (!fileResult.valid) {
        errors.push(`Attachment[${i}]: ${fileResult.errors.join(' ')}`);
      } else {
        aggregateBytes += size;
      }
    }
  }

  if (aggregateBytes > maxAggregate) {
    errors.push(
      `Total attachment size (${aggregateBytes} bytes) exceeds the per-post aggregate limit (${maxAggregate} bytes).`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export interface CommunityAttachmentValidationInput {
  kind: CommunityAttachmentKind;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  url?: string | null;
  posterUrl?: string | null;
  caption?: string | null;
  artifactId?: string | null;
  artifactName?: string | null;
}

/**
 * Validates an attachment payload (artifact or file/media) for MIME allowlist compliance,
 * size limits, caption bounds, artifact identity, and safe media URLs.
 */
export function ValidateCommunityAttachmentInput(
  input: CommunityAttachmentValidationInput,
  limits: Partial<CommunityAttachmentLimits> = {},
): CommunityAttachmentValidationResult {
  const errors: string[] = [];
  const maxFileBytes = limits.maxFileBytes ?? COMMUNITY_ATTACHMENT_MAX_FILE_BYTES;
  const maxDataUrlBytes = limits.maxDataUrlBytes ?? COMMUNITY_ATTACHMENT_MAX_DATA_URL_BYTES;

  if (input.caption && input.caption.length > COMMUNITY_ATTACHMENT_MAX_CAPTION_LENGTH) {
    errors.push(`Caption exceeds maximum length of ${COMMUNITY_ATTACHMENT_MAX_CAPTION_LENGTH} characters.`);
  }

  if (input.kind === 'artifact') {
    if (!input.artifactId || !IsValidUUID(input.artifactId.trim())) {
      errors.push('Artifact attachments require a valid ArtifactID UUID.');
    }
    if (!input.artifactName || !input.artifactName.trim()) {
      errors.push('Artifact attachments require a non-empty artifactName.');
    }

    let sanitizedUrl: string | null = null;
    if (input.url) {
      sanitizedUrl = SanitizeCommunityAttachmentUrl(input.url, 'artifact', maxDataUrlBytes);
      if (!sanitizedUrl) {
        errors.push('Attachment URL uses an unsafe or unsupported scheme.');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      classifiedKind: 'artifact',
      sanitizedUrl,
    };
  }

  if (!input.fileName || !input.fileName.trim()) {
    errors.push('File and media attachments require a non-empty fileName.');
  }

  const normalizedMime = NormalizeAttachmentMimeType(input.mimeType);
  if (!IsAllowedAttachmentMimeType(normalizedMime)) {
    errors.push(`MIME type "${input.mimeType ?? ''}" is not permitted by the Community attachment allowlist.`);
  }

  const classifiedKind = ClassifyAttachmentKind(normalizedMime, false);
  if (classifiedKind !== input.kind) {
    errors.push(`MIME type "${normalizedMime}" classifies as "${classifiedKind}", not "${input.kind}".`);
  }

  if (input.sizeBytes == null) {
    errors.push('File and media attachments require a positive sizeBytes value.');
  } else {
    const sizeCheck = ValidateAttachmentFileSize(input.sizeBytes, maxFileBytes);
    if (!sizeCheck.valid) {
      errors.push(...sizeCheck.errors);
    }
  }

  let sanitizedUrl: string | null = null;
  if (input.url) {
    sanitizedUrl = SanitizeCommunityAttachmentUrl(input.url, input.kind, maxDataUrlBytes);
    if (!sanitizedUrl) {
      errors.push('Attachment URL uses an unsafe or unsupported scheme.');
    }
  }

  let sanitizedPosterUrl: string | null = null;
  if (input.posterUrl) {
    sanitizedPosterUrl = SanitizeCommunityAttachmentUrl(input.posterUrl, 'image', maxDataUrlBytes);
    if (!sanitizedPosterUrl) {
      errors.push('Poster URL uses an unsafe or unsupported scheme.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    normalizedMimeType: normalizedMime,
    classifiedKind,
    sanitizedUrl,
    sanitizedPosterUrl,
  };
}
