import { UUIDsEqual } from '@memberjunction/global';
import {
  IsFeaturedLibraryFolder,
  SanitizeCommunityAttachmentUrl,
  type CommunityAttachmentItem,
  type CommunityAttachmentKind,
} from '@mj-biz-apps/community-core';
import {
  FormatAttachmentBytes,
  FormatMediaDuration,
  ResolveArtifactIconClass,
  ResolveArtifactPreview,
  ResolveFileAttachmentMeta,
  type ResolvedArtifactPreview,
} from './community-attachment-gallery.ts';
import type { CommunityCommonsItem, CommunitySpaceFilterId } from './community-hub-commons.ts';

export type MediaLibraryKindFilter = 'all' | CommunityAttachmentKind;
export type MediaLibraryScopeFilter = 'all' | 'featured' | 'my-uploads';

export interface MediaLibraryFilterOption<T extends string> {
  key: T;
  label: string;
  icon: string;
}

export const MEDIA_LIBRARY_KIND_OPTIONS: ReadonlyArray<MediaLibraryFilterOption<MediaLibraryKindFilter>> = [
  { key: 'all', label: 'All', icon: 'fa-solid fa-layer-group' },
  { key: 'image', label: 'Images', icon: 'fa-solid fa-image' },
  { key: 'video', label: 'Video', icon: 'fa-solid fa-film' },
  { key: 'audio', label: 'Audio', icon: 'fa-solid fa-headphones' },
  { key: 'artifact', label: 'Artifacts', icon: 'fa-solid fa-cubes' },
  { key: 'file', label: 'Files', icon: 'fa-solid fa-file-lines' },
];

export const MEDIA_LIBRARY_SCOPE_OPTIONS: ReadonlyArray<MediaLibraryFilterOption<MediaLibraryScopeFilter>> = [
  { key: 'all', label: 'All Media & Files', icon: 'fa-solid fa-photo-film' },
  { key: 'featured', label: 'Featured Library', icon: 'fa-solid fa-bookmark' },
  { key: 'my-uploads', label: 'My Uploads', icon: 'fa-solid fa-user-check' },
];

export interface MediaLibraryEntry {
  id: string;
  attachment: CommunityAttachmentItem;
  kind: CommunityAttachmentKind;
  title: string;
  fileName: string | null;
  artifactTypeName: string | null;
  versionBadge: string | null;
  caption: string | null;
  safeUrl: string | null;
  safePosterUrl: string | null;
  formattedSize: string | null;
  formattedDuration: string | null;
  typeLabel: string;
  iconClass: string;
  featureInLibrary: boolean;
  folder: string;
  isMyUpload: boolean;
  authorUserId: string | null;
  authorName: string;
  spaceId: string;
  spaceLabel: string;
  sourceItemId: string;
  sourcePostId: string;
  rootPostId: string;
  postTitle: string;
  isReplyAttachment: boolean;
  sequence: number;
  createdAt: string | null;
  artifactPreview: ResolvedArtifactPreview | null;
}

export interface MediaLibraryFilterCriteria {
  spaceFilter: CommunitySpaceFilterId;
  kindFilter: MediaLibraryKindFilter;
  scopeFilter: MediaLibraryScopeFilter;
  searchQuery: string;
}

export interface MediaLibraryKindCounts {
  all: number;
  image: number;
  video: number;
  audio: number;
  artifact: number;
  file: number;
}

export interface MediaLibraryScopeCounts {
  all: number;
  featured: number;
  myUploads: number;
}

export interface PartitionedMediaLibrary {
  visualGrid: MediaLibraryEntry[];
  resourceCards: MediaLibraryEntry[];
}

function normalizeIsoTimestamp(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function resolveKindTypeLabel(att: CommunityAttachmentItem): { iconClass: string; typeLabel: string } {
  if (att.kind === 'artifact') {
    return {
      iconClass: ResolveArtifactIconClass(att.artifactTypeName, att.modality),
      typeLabel: att.artifactTypeName || 'Artifact',
    };
  }
  if (att.kind === 'image') {
    return { iconClass: 'fa-solid fa-image', typeLabel: 'Image' };
  }
  if (att.kind === 'video') {
    return { iconClass: 'fa-solid fa-film', typeLabel: 'Video' };
  }
  if (att.kind === 'audio') {
    return { iconClass: 'fa-solid fa-headphones', typeLabel: 'Audio' };
  }
  return ResolveFileAttachmentMeta(att.mimeType, att.fileName);
}

function resolveIsMyUpload(params: {
  attachmentAuthorUserId: string | null | undefined;
  attachmentPostId: string;
  currentUserId: string | null | undefined;
  authoredPostIds?: ReadonlySet<string>;
  isOfflineDemoMode?: boolean;
}): boolean {
  const postKey = params.attachmentPostId.toLowerCase();
  if (params.authoredPostIds?.has(postKey)) {
    return true;
  }
  const currentUser = params.currentUserId?.trim() ?? '';
  const attUser = params.attachmentAuthorUserId?.trim() ?? '';
  if (currentUser && attUser) {
    return UUIDsEqual(currentUser, attUser);
  }
  if (params.isOfflineDemoMode && attUser === 'demo-member') {
    return true;
  }
  return false;
}

function mapAttachmentToLibraryEntry(params: {
  att: CommunityAttachmentItem;
  item: CommunityCommonsItem;
  isReplyAttachment: boolean;
  fallbackAuthorName: string;
  currentUserId: string | null | undefined;
  authoredPostIds?: ReadonlySet<string>;
  spaceNameById?: ReadonlyMap<string, string>;
  isOfflineDemoMode?: boolean;
}): MediaLibraryEntry {
  const { att, item } = params;
  const { iconClass, typeLabel } = resolveKindTypeLabel(att);
  const featureInLibrary = Boolean(att.featureInLibrary) || IsFeaturedLibraryFolder(att.folder);
  const folder = att.folder?.trim() || (featureInLibrary ? 'Library' : 'Post Media');
  const resolvedSpaceId = att.spaceId?.trim() || item.spaceId;
  const resolvedSpaceLabel =
    params.spaceNameById?.get(resolvedSpaceId.toLowerCase()) ?? item.spaceLabel ?? 'Community Space';
  const resolvedAuthorId = att.authorUserId ?? null;
  const resolvedAuthorName = att.authorName?.trim() || params.fallbackAuthorName || 'Community Member';
  const isMyUpload = resolveIsMyUpload({
    attachmentAuthorUserId: resolvedAuthorId,
    attachmentPostId: att.postId || item.sourcePostId,
    currentUserId: params.currentUserId,
    authoredPostIds: params.authoredPostIds,
    isOfflineDemoMode: params.isOfflineDemoMode,
  });

  if (att.kind === 'artifact') {
    const versionBadge =
      typeof att.versionNumber === 'number' && Number.isFinite(att.versionNumber)
        ? `v${att.versionNumber}`
        : null;
    const safeUrl = att.url ? SanitizeCommunityAttachmentUrl(att.url, 'artifact') : null;
    return {
      id: att.forumPostAttachmentId || att.id,
      attachment: att,
      kind: 'artifact',
      title: att.artifactName || att.caption || 'Embedded MJ Artifact',
      fileName: att.fileName ?? null,
      artifactTypeName: att.artifactTypeName || 'Artifact',
      versionBadge,
      caption: att.caption?.trim() || null,
      safeUrl,
      safePosterUrl: null,
      formattedSize:
        typeof att.sizeBytes === 'number' && att.sizeBytes > 0 ? FormatAttachmentBytes(att.sizeBytes) : null,
      formattedDuration: null,
      typeLabel,
      iconClass,
      featureInLibrary,
      folder,
      isMyUpload,
      authorUserId: resolvedAuthorId,
      authorName: resolvedAuthorName,
      spaceId: resolvedSpaceId,
      spaceLabel: resolvedSpaceLabel,
      sourceItemId: item.id,
      sourcePostId: att.postId || item.sourcePostId,
      rootPostId: item.sourcePostId,
      postTitle: att.postTitle?.trim() || item.title,
      isReplyAttachment: params.isReplyAttachment,
      sequence: att.sequence,
      createdAt: normalizeIsoTimestamp(att.createdAt),
      artifactPreview: ResolveArtifactPreview(att),
    };
  }

  const safeUrl = SanitizeCommunityAttachmentUrl(att.url, att.kind);
  const safePosterUrl = att.posterUrl ? SanitizeCommunityAttachmentUrl(att.posterUrl, 'image') : null;
  return {
    id: att.forumPostAttachmentId || att.id,
    attachment: att,
    kind: att.kind,
    title: att.fileName,
    fileName: att.fileName,
    artifactTypeName: null,
    versionBadge: null,
    caption: att.caption?.trim() || null,
    safeUrl,
    safePosterUrl,
    formattedSize: FormatAttachmentBytes(att.sizeBytes),
    formattedDuration: FormatMediaDuration(att.durationSeconds),
    typeLabel,
    iconClass,
    featureInLibrary,
    folder,
    isMyUpload,
    authorUserId: resolvedAuthorId,
    authorName: resolvedAuthorName,
    spaceId: resolvedSpaceId,
    spaceLabel: resolvedSpaceLabel,
    sourceItemId: item.id,
    sourcePostId: att.postId || item.sourcePostId,
    rootPostId: item.sourcePostId,
    postTitle: att.postTitle?.trim() || item.title,
    isReplyAttachment: params.isReplyAttachment,
    sequence: att.sequence,
    createdAt: normalizeIsoTimestamp(att.createdAt),
    artifactPreview: null,
  };
}

/**
 * Auto-indexes every image, video, audio track, MJ Artifact, and file attachment across
 * all root posts and replies in `commonsItems`, preserving Space ownership, curation tier
 * (`Library` vs `Post Media`), uploader identity, and thread navigation links.
 */
export function BuildMediaLibraryEntries(params: {
  commonsItems: ReadonlyArray<CommunityCommonsItem>;
  currentUserId?: string | null;
  authoredPostIds?: ReadonlySet<string>;
  spaceNameById?: ReadonlyMap<string, string>;
  isOfflineDemoMode?: boolean;
}): MediaLibraryEntry[] {
  const entries: MediaLibraryEntry[] = [];
  const seenKeys = new Set<string>();

  const pushEntry = (
    att: CommunityAttachmentItem,
    item: CommunityCommonsItem,
    isReplyAttachment: boolean,
    fallbackAuthorName: string,
  ): void => {
    const dedupKey = (att.forumPostAttachmentId || att.id).toLowerCase();
    if (seenKeys.has(dedupKey)) {
      return;
    }
    seenKeys.add(dedupKey);
    entries.push(
      mapAttachmentToLibraryEntry({
        att,
        item,
        isReplyAttachment,
        fallbackAuthorName,
        currentUserId: params.currentUserId,
        authoredPostIds: params.authoredPostIds,
        spaceNameById: params.spaceNameById,
        isOfflineDemoMode: params.isOfflineDemoMode,
      }),
    );
  };

  for (const item of params.commonsItems) {
    for (const att of item.attachments ?? []) {
      pushEntry(att, item, false, item.authorName);
    }
    for (const reply of item.replies ?? []) {
      for (const att of reply.attachments ?? []) {
        pushEntry(att, item, true, reply.authorName);
      }
    }
  }

  return entries;
}

/**
 * Checks whether a library entry belongs to the active Space filter (or all Spaces when `'all'`).
 */
export function MatchesMediaLibrarySpace(
  entry: Pick<MediaLibraryEntry, 'spaceId'>,
  spaceFilter: CommunitySpaceFilterId,
): boolean {
  if (!spaceFilter || spaceFilter === 'all') {
    return true;
  }
  return entry.spaceId.trim().toLowerCase() === spaceFilter.trim().toLowerCase();
}

function matchesLibrarySearch(entry: MediaLibraryEntry, normalizedQuery: string): boolean {
  if (!normalizedQuery) {
    return true;
  }
  const haystacks = [
    entry.title,
    entry.fileName ?? '',
    entry.caption ?? '',
    entry.postTitle,
    entry.artifactTypeName ?? '',
    entry.spaceLabel,
    entry.authorName,
  ];
  return haystacks.some((value) => value.toLowerCase().includes(normalizedQuery));
}

function matchesLibraryScope(entry: MediaLibraryEntry, scopeFilter: MediaLibraryScopeFilter): boolean {
  if (scopeFilter === 'featured') {
    return entry.featureInLibrary;
  }
  if (scopeFilter === 'my-uploads') {
    return entry.isMyUpload;
  }
  return true;
}

/**
 * Filters indexed Media Library entries by active Space, attachment kind, curation/author scope,
 * and free-text search across filename, artifact title, caption, or source post title.
 */
export function FilterMediaLibraryEntries(
  entries: ReadonlyArray<MediaLibraryEntry>,
  criteria: MediaLibraryFilterCriteria,
): MediaLibraryEntry[] {
  const normalizedQuery = criteria.searchQuery.trim().toLowerCase();
  return entries.filter((entry) => {
    if (!MatchesMediaLibrarySpace(entry, criteria.spaceFilter)) {
      return false;
    }
    if (criteria.kindFilter !== 'all' && entry.kind !== criteria.kindFilter) {
      return false;
    }
    if (!matchesLibraryScope(entry, criteria.scopeFilter)) {
      return false;
    }
    if (!matchesLibrarySearch(entry, normalizedQuery)) {
      return false;
    }
    return true;
  });
}

/**
 * Computes live per-kind and per-scope badge counts for the Library filter bars.
 */
export function ComputeMediaLibraryCounts(
  entries: ReadonlyArray<MediaLibraryEntry>,
  criteria: Pick<MediaLibraryFilterCriteria, 'spaceFilter' | 'kindFilter' | 'scopeFilter' | 'searchQuery'>,
): { kindCounts: MediaLibraryKindCounts; scopeCounts: MediaLibraryScopeCounts } {
  const normalizedQuery = criteria.searchQuery.trim().toLowerCase();
  const base = entries.filter(
    (e) => MatchesMediaLibrarySpace(e, criteria.spaceFilter) && matchesLibrarySearch(e, normalizedQuery),
  );

  const scopeMatched = base.filter((e) => matchesLibraryScope(e, criteria.scopeFilter));
  const kindCounts: MediaLibraryKindCounts = {
    all: scopeMatched.length,
    image: 0,
    video: 0,
    audio: 0,
    artifact: 0,
    file: 0,
  };
  for (const item of scopeMatched) {
    kindCounts[item.kind] += 1;
  }

  const kindMatched =
    criteria.kindFilter === 'all' ? base : base.filter((e) => e.kind === criteria.kindFilter);
  const scopeCounts: MediaLibraryScopeCounts = {
    all: kindMatched.length,
    featured: kindMatched.filter((e) => e.featureInLibrary).length,
    myUploads: kindMatched.filter((e) => e.isMyUpload).length,
  };

  return { kindCounts, scopeCounts };
}

/**
 * Splits filtered Library entries into the visual thumbnail grid (`image` + `video`) and
 * resource cards (`audio` + `artifact` + `file`).
 */
export function PartitionMediaLibraryForDisplay(
  entries: ReadonlyArray<MediaLibraryEntry>,
): PartitionedMediaLibrary {
  const visualGrid: MediaLibraryEntry[] = [];
  const resourceCards: MediaLibraryEntry[] = [];
  for (const entry of entries) {
    if (entry.kind === 'image' || entry.kind === 'video') {
      visualGrid.push(entry);
    } else {
      resourceCards.push(entry);
    }
  }
  return { visualGrid, resourceCards };
}
