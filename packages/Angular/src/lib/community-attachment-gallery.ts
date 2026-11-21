import {
  GroupPostAttachmentsForDisplay,
  NormalizeAttachmentMimeType,
  SanitizeCommunityAttachmentUrl,
  type CommunityArtifactAttachmentItem,
  type CommunityArtifactModality,
  type CommunityAttachmentItem,
  type CommunityFileAttachmentItem,
} from '@mj-biz-apps/community-core';
import { RenderSafeMarkdownHtml } from './community-markdown.ts';

export type AttachmentGalleryMode = 'compact' | 'full';

export type ArtifactPreviewFormat =
  | 'markdown'
  | 'html'
  | 'code'
  | 'json'
  | 'svg'
  | 'structured';

export interface ResolvedArtifactPreview {
  format: ArtifactPreviewFormat;
  rawText: string;
  renderedMarkdownHtml: string | null;
  sandboxedHtmlDocument: string | null;
  formattedCode: string | null;
  codeLanguage: string;
  structuredEntries: Array<{ key: string; value: string }>;
  hasPreview: boolean;
}

export interface SanitizedVisualMediaItem {
  raw: CommunityFileAttachmentItem;
  id: string;
  isVideo: boolean;
  isImage: boolean;
  safeUrl: string | null;
  safePosterUrl: string | null;
  fileName: string;
  caption: string | null;
  altText: string;
  formattedSize: string;
  formattedDuration: string | null;
}

export interface SanitizedAudioTrackItem {
  raw: CommunityFileAttachmentItem;
  id: string;
  safeUrl: string | null;
  title: string;
  fileName: string;
  caption: string | null;
  formattedSize: string;
  formattedDuration: string | null;
}

export interface SanitizedArtifactCardItem {
  raw: CommunityArtifactAttachmentItem;
  id: string;
  artifactId: string;
  artifactName: string;
  artifactTypeName: string;
  versionBadge: string | null;
  featureInLibrary: boolean;
  modality: CommunityArtifactModality | null;
  collaborationMode: string | null;
  caption: string | null;
  showInlinePreviewByDefault: boolean;
  safeUrl: string | null;
  iconClass: string;
  preview: ResolvedArtifactPreview;
}

export interface SanitizedFileAttachmentItem {
  raw: CommunityFileAttachmentItem;
  id: string;
  safeUrl: string | null;
  fileName: string;
  mimeType: string;
  typeLabel: string;
  iconClass: string;
  formattedSize: string;
  caption: string | null;
}

export interface AttachmentGalleryModel {
  visualMedia: SanitizedVisualMediaItem[];
  audioTracks: SanitizedAudioTrackItem[];
  artifacts: SanitizedArtifactCardItem[];
  files: SanitizedFileAttachmentItem[];
  totalCount: number;
}

export type CarouselKeyboardAction = 'prev' | 'next' | 'first' | 'last' | 'none';
export type LightboxKeyboardAction = 'close' | 'prev' | 'next' | 'none';

/**
 * Formats a byte count into human-readable units (B, KB, MB, GB).
 */
export function FormatAttachmentBytes(bytes: number | null | undefined): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) {
    return '0 B';
  }
  if (bytes < 1024) {
    return `${Math.round(bytes)} B`;
  }
  const units = ['KB', 'MB', 'GB'] as const;
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
}

/**
 * Formats media duration seconds as `m:ss` or `h:mm:ss`.
 */
export function FormatMediaDuration(seconds: number | null | undefined): string | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad2 = (n: number): string => String(n).padStart(2, '0');
  if (hrs > 0) {
    return `${hrs}:${pad2(mins)}:${pad2(secs)}`;
  }
  return `${mins}:${pad2(secs)}`;
}

/**
 * Resolves a semantic FontAwesome icon class and display label for non-media file attachments.
 */
export function ResolveFileAttachmentMeta(
  mimeType: string | null | undefined,
  fileName: string,
): { iconClass: string; typeLabel: string } {
  const mime = NormalizeAttachmentMimeType(mimeType);
  const lowerName = fileName.trim().toLowerCase();

  if (mime === 'application/pdf' || lowerName.endsWith('.pdf')) {
    return { iconClass: 'fa-solid fa-file-pdf', typeLabel: 'PDF' };
  }
  if (mime === 'text/csv' || lowerName.endsWith('.csv')) {
    return { iconClass: 'fa-solid fa-file-csv', typeLabel: 'CSV' };
  }
  if (
    mime === 'application/vnd.ms-excel' ||
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    lowerName.endsWith('.xlsx') ||
    lowerName.endsWith('.xls')
  ) {
    return { iconClass: 'fa-solid fa-file-excel', typeLabel: 'Spreadsheet' };
  }
  if (
    mime === 'application/msword' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lowerName.endsWith('.docx') ||
    lowerName.endsWith('.doc')
  ) {
    return { iconClass: 'fa-solid fa-file-word', typeLabel: 'Document' };
  }
  if (
    mime === 'application/vnd.ms-powerpoint' ||
    mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    lowerName.endsWith('.pptx') ||
    lowerName.endsWith('.ppt')
  ) {
    return { iconClass: 'fa-solid fa-file-powerpoint', typeLabel: 'Presentation' };
  }
  if (mime === 'application/zip' || lowerName.endsWith('.zip')) {
    return { iconClass: 'fa-solid fa-file-zipper', typeLabel: 'Archive' };
  }
  if (mime === 'application/json' || lowerName.endsWith('.json')) {
    return { iconClass: 'fa-solid fa-file-code', typeLabel: 'JSON' };
  }
  if (mime === 'text/markdown' || lowerName.endsWith('.md')) {
    return { iconClass: 'fa-solid fa-file-lines', typeLabel: 'Markdown' };
  }
  if (mime === 'text/plain' || lowerName.endsWith('.txt')) {
    return { iconClass: 'fa-solid fa-file-lines', typeLabel: 'Text' };
  }
  return { iconClass: 'fa-solid fa-file', typeLabel: 'File' };
}

/**
 * Resolves a semantic FontAwesome icon class for an embedded MJ Artifact card.
 */
export function ResolveArtifactIconClass(
  artifactTypeName: string | null | undefined,
  modality?: CommunityArtifactModality | null,
): string {
  const type = (artifactTypeName ?? '').trim().toLowerCase();
  if (type.includes('html') || type.includes('react') || type.includes('app')) {
    return 'fa-solid fa-window-maximize';
  }
  if (type.includes('svg') || type.includes('diagram') || type.includes('image')) {
    return 'fa-solid fa-diagram-project';
  }
  if (type.includes('json') || type.includes('code') || type.includes('typescript') || type.includes('sql')) {
    return 'fa-solid fa-code';
  }
  if (type.includes('markdown') || type.includes('doc')) {
    return 'fa-solid fa-book-open';
  }
  if (modality === 'Spreadsheet') {
    return 'fa-solid fa-table';
  }
  if (modality === 'Presentation') {
    return 'fa-solid fa-display';
  }
  return 'fa-solid fa-cube';
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Wraps untrusted HTML artifact content into a complete HTML document for rendering strictly
 * inside `<iframe sandbox="allow-scripts" [srcdoc]="...">` (never `allow-same-origin`).
 */
export function WrapSandboxedHtmlPreview(rawHtml: string, title: string): string {
  const trimmed = rawHtml.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('<!doctype') || lower.startsWith('<html')) {
    return trimmed;
  }
  const safeTitle = escapeHtmlAttr(title || 'Artifact Preview');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${safeTitle}</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, -apple-system, sans-serif; margin: 14px; line-height: 1.5; background: Canvas; color: CanvasText; }
</style>
</head>
<body>${trimmed}</body>
</html>`;
}

/**
 * Wraps SVG artifact markup in an isolated HTML document with a strict Content-Security-Policy
 * (`script-src 'none'`) so vector diagrams render cleanly inside `<iframe sandbox="allow-scripts">`
 * without allowing embedded SVG script execution or parent DOM access.
 */
export function WrapSandboxedSvgPreview(rawSvg: string, title: string): string {
  const safeTitle = escapeHtmlAttr(title || 'SVG Artifact Preview');
  // Strip any script tags or inline event handlers from SVG before placing in CSP-locked iframe.
  const stripped = rawSvg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data: https:;" />
<title>${safeTitle}</title>
<style>
  body { margin: 0; padding: 12px; display: grid; place-items: center; min-height: calc(100vh - 24px); background: Canvas; color: CanvasText; }
  svg { max-width: 100%; height: auto; display: block; }
</style>
</head>
<body>${stripped}</body>
</html>`;
}

/**
 * Classifies an MJ Artifact's inline preview format from its `contentType`, `artifactTypeName`,
 * and `previewContent`.
 */
export function DetectArtifactPreviewFormat(
  artifact: Pick<CommunityArtifactAttachmentItem, 'artifactTypeName' | 'contentType' | 'previewContent'>,
): ArtifactPreviewFormat {
  const contentType = NormalizeAttachmentMimeType(artifact.contentType);
  const typeName = (artifact.artifactTypeName ?? '').trim().toLowerCase();
  const content = (artifact.previewContent ?? '').trim();
  const contentLower = content.toLowerCase();

  if (contentType === 'image/svg+xml' || typeName.includes('svg') || contentLower.startsWith('<svg')) {
    return 'svg';
  }
  if (contentType === 'text/html' || typeName.includes('html') || contentLower.startsWith('<!doctype html') || contentLower.startsWith('<html')) {
    return 'html';
  }
  if (contentType === 'application/json' || typeName.includes('json')) {
    return 'json';
  }
  if (
    contentType === 'text/markdown' ||
    typeName.includes('markdown') ||
    typeName.includes('playbook') ||
    typeName.includes('report') ||
    typeName.includes('document')
  ) {
    return 'markdown';
  }
  if (
    typeName.includes('code') ||
    typeName.includes('typescript') ||
    typeName.includes('javascript') ||
    typeName.includes('sql') ||
    typeName.includes('yaml')
  ) {
    return 'code';
  }

  if (content.startsWith('{') || content.startsWith('[')) {
    try {
      JSON.parse(content);
      return 'json';
    } catch {
      // Not valid JSON; treat as markdown or structured below.
    }
  }
  if (content.length > 0) {
    return 'markdown';
  }
  return 'structured';
}

function buildStructuredEntriesFromArtifact(
  artifact: CommunityArtifactAttachmentItem,
): Array<{ key: string; value: string }> {
  const entries: Array<{ key: string; value: string }> = [
    { key: 'Artifact', value: artifact.artifactName },
    { key: 'Type', value: artifact.artifactTypeName || 'Artifact' },
  ];
  if (typeof artifact.versionNumber === 'number' && Number.isFinite(artifact.versionNumber)) {
    entries.push({ key: 'Version', value: `v${artifact.versionNumber}` });
  }
  if (artifact.modality) {
    entries.push({ key: 'Modality', value: artifact.modality });
  }
  if (artifact.collaborationMode) {
    entries.push({ key: 'Collaboration', value: artifact.collaborationMode });
  }
  if (artifact.folder) {
    entries.push({ key: 'Space Tier', value: String(artifact.folder) });
  }
  return entries;
}

/**
 * Resolves a safe, structured inline preview representation for an embedded MJ Artifact attachment.
 */
export function ResolveArtifactPreview(artifact: CommunityArtifactAttachmentItem): ResolvedArtifactPreview {
  const format = DetectArtifactPreviewFormat(artifact);
  const rawText = artifact.previewContent?.trim() ?? '';
  const structuredEntries = buildStructuredEntriesFromArtifact(artifact);

  if (format === 'html' && rawText) {
    return {
      format: 'html',
      rawText,
      renderedMarkdownHtml: null,
      sandboxedHtmlDocument: WrapSandboxedHtmlPreview(rawText, artifact.artifactName),
      formattedCode: null,
      codeLanguage: 'html',
      structuredEntries,
      hasPreview: true,
    };
  }

  if (format === 'svg' && rawText) {
    return {
      format: 'svg',
      rawText,
      renderedMarkdownHtml: null,
      sandboxedHtmlDocument: WrapSandboxedSvgPreview(rawText, artifact.artifactName),
      formattedCode: null,
      codeLanguage: 'svg',
      structuredEntries,
      hasPreview: true,
    };
  }

  if (format === 'json' && rawText) {
    let formatted = rawText;
    try {
      const parsed: object = JSON.parse(rawText) as object;
      formatted = JSON.stringify(parsed, null, 2);
    } catch {
      formatted = rawText;
    }
    return {
      format: 'json',
      rawText,
      renderedMarkdownHtml: null,
      sandboxedHtmlDocument: null,
      formattedCode: formatted,
      codeLanguage: 'json',
      structuredEntries,
      hasPreview: true,
    };
  }

  if (format === 'code' && rawText) {
    return {
      format: 'code',
      rawText,
      renderedMarkdownHtml: null,
      sandboxedHtmlDocument: null,
      formattedCode: rawText,
      codeLanguage: artifact.artifactTypeName || 'code',
      structuredEntries,
      hasPreview: true,
    };
  }

  if (format === 'markdown' && rawText) {
    return {
      format: 'markdown',
      rawText,
      renderedMarkdownHtml: RenderSafeMarkdownHtml(rawText),
      sandboxedHtmlDocument: null,
      formattedCode: null,
      codeLanguage: 'markdown',
      structuredEntries,
      hasPreview: true,
    };
  }

  return {
    format: 'structured',
    rawText,
    renderedMarkdownHtml: null,
    sandboxedHtmlDocument: null,
    formattedCode: null,
    codeLanguage: 'text',
    structuredEntries,
    hasPreview: structuredEntries.length > 0,
  };
}

/**
 * Builds the sanitized, grouped gallery view-model from raw `CommunityAttachmentItem[]` records.
 */
export function BuildAttachmentGalleryModel(
  attachments: ReadonlyArray<CommunityAttachmentItem> | null | undefined,
): AttachmentGalleryModel {
  if (!attachments || attachments.length === 0) {
    return {
      visualMedia: [],
      audioTracks: [],
      artifacts: [],
      files: [],
      totalCount: 0,
    };
  }

  const grouped = GroupPostAttachmentsForDisplay(attachments);

  const visualMedia: SanitizedVisualMediaItem[] = grouped.visualMedia.map((item) => {
    const isVideo = item.kind === 'video';
    const isImage = item.kind === 'image';
    const safeUrl = SanitizeCommunityAttachmentUrl(item.url, item.kind);
    const safePosterUrl = item.posterUrl
      ? SanitizeCommunityAttachmentUrl(item.posterUrl, 'image')
      : null;
    const altText = item.caption?.trim() || item.fileName;
    return {
      raw: item,
      id: item.id,
      isVideo,
      isImage,
      safeUrl,
      safePosterUrl,
      fileName: item.fileName,
      caption: item.caption?.trim() || null,
      altText,
      formattedSize: FormatAttachmentBytes(item.sizeBytes),
      formattedDuration: FormatMediaDuration(item.durationSeconds),
    };
  });

  const audioTracks: SanitizedAudioTrackItem[] = grouped.audioTracks.map((item) => ({
    raw: item,
    id: item.id,
    safeUrl: SanitizeCommunityAttachmentUrl(item.url, 'audio'),
    title: item.caption?.trim() || item.fileName,
    fileName: item.fileName,
    caption: item.caption?.trim() || null,
    formattedSize: FormatAttachmentBytes(item.sizeBytes),
    formattedDuration: FormatMediaDuration(item.durationSeconds),
  }));

  const artifacts: SanitizedArtifactCardItem[] = grouped.artifacts.map((item) => {
    const versionBadge =
      typeof item.versionNumber === 'number' && Number.isFinite(item.versionNumber)
        ? `v${item.versionNumber}`
        : null;
    const safeUrl = item.url ? SanitizeCommunityAttachmentUrl(item.url, 'artifact') : null;
    return {
      raw: item,
      id: item.id,
      artifactId: item.artifactId,
      artifactName: item.artifactName,
      artifactTypeName: item.artifactTypeName || 'Artifact',
      versionBadge,
      featureInLibrary: Boolean(item.featureInLibrary),
      modality: item.modality ?? null,
      collaborationMode: item.collaborationMode ?? null,
      caption: item.caption?.trim() || null,
      showInlinePreviewByDefault: item.showInlinePreview !== false,
      safeUrl,
      iconClass: ResolveArtifactIconClass(item.artifactTypeName, item.modality),
      preview: ResolveArtifactPreview(item),
    };
  });

  const files: SanitizedFileAttachmentItem[] = grouped.files.map((item) => {
    const meta = ResolveFileAttachmentMeta(item.mimeType, item.fileName);
    return {
      raw: item,
      id: item.id,
      safeUrl: SanitizeCommunityAttachmentUrl(item.url, 'file'),
      fileName: item.fileName,
      mimeType: NormalizeAttachmentMimeType(item.mimeType),
      typeLabel: meta.typeLabel,
      iconClass: meta.iconClass,
      formattedSize: FormatAttachmentBytes(item.sizeBytes),
      caption: item.caption?.trim() || null,
    };
  });

  return {
    visualMedia,
    audioTracks,
    artifacts,
    files,
    totalCount: grouped.totalCount,
  };
}

/**
 * Clamps a slide index within `[0, length - 1]`. Returns `0` when `length <= 0`.
 */
export function ClampSlideIndex(index: number, length: number): number {
  if (!Number.isFinite(length) || length <= 0) {
    return 0;
  }
  const intIdx = Math.trunc(index);
  if (intIdx < 0) return 0;
  if (intIdx >= length) return length - 1;
  return intIdx;
}

/**
 * Computes the next carousel/track index with optional wrap-around looping.
 */
export function StepCarouselIndex(
  currentIndex: number,
  delta: 1 | -1,
  length: number,
  loop = true,
): number {
  if (!Number.isFinite(length) || length <= 0) {
    return 0;
  }
  const safeCurrent = ClampSlideIndex(currentIndex, length);
  if (length === 1) {
    return 0;
  }
  if (loop) {
    return (safeCurrent + delta + length) % length;
  }
  return ClampSlideIndex(safeCurrent + delta, length);
}

/**
 * Maps a keyboard `key` in a carousel container to a semantic navigation action.
 */
export function ResolveCarouselKeyboardAction(key: string): CarouselKeyboardAction {
  switch (key) {
    case 'ArrowLeft':
      return 'prev';
    case 'ArrowRight':
      return 'next';
    case 'Home':
      return 'first';
    case 'End':
      return 'last';
    default:
      return 'none';
  }
}

/**
 * Maps a keyboard `key` inside the Lightbox modal to `close`, `prev`, `next`, or `none`.
 */
export function ResolveLightboxKeyboardAction(key: string): LightboxKeyboardAction {
  switch (key) {
    case 'Escape':
      return 'close';
    case 'ArrowLeft':
      return 'prev';
    case 'ArrowRight':
      return 'next';
    default:
      return 'none';
  }
}
