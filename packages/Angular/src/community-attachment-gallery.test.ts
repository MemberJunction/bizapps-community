import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { CommunityAttachmentItem } from '@mj-biz-apps/community-core';
import { DEMO_SEED_ATTACHMENTS } from './lib/community-attachment-demo.ts';
import {
  BuildAttachmentGalleryModel,
  ClampSlideIndex,
  DetectArtifactPreviewFormat,
  FormatAttachmentBytes,
  FormatMediaDuration,
  ResolveArtifactPreview,
  ResolveCarouselKeyboardAction,
  ResolveFileAttachmentMeta,
  ResolveLightboxKeyboardAction,
  StepCarouselIndex,
} from './lib/community-attachment-gallery.ts';
import { BuildCommonsStreamItems } from './lib/community-hub-commons.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIB_DIR = join(HERE, 'lib');
const SPACE_ID = '11111111-1111-4111-8111-111111111111';
const POST_ID = '22222222-2222-4222-8222-222222222222';
const ARTIFACT_ID = '33333333-3333-4333-8333-333333333333';

describe('Slice 2 — CommunityAttachmentGallery State, Carousel & Track Switcher', () => {
  it('groups single image, mixed image+video carousel, audio tracks, artifacts, and files preserving sequence', () => {
    const attachments: CommunityAttachmentItem[] = [
      {
        id: 'file-1',
        kind: 'file',
        spaceId: SPACE_ID,
        postId: POST_ID,
        fileName: 'architecture-spec.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 204800,
        url: 'https://cdn.example.com/architecture-spec.pdf',
        sequence: 6,
        featureInLibrary: false,
        folder: 'Post Media',
      },
      {
        id: 'vid-1',
        kind: 'video',
        spaceId: SPACE_ID,
        postId: POST_ID,
        fileName: 'rollout-demo.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 1572864,
        url: 'https://cdn.example.com/rollout-demo.mp4',
        posterUrl: 'https://cdn.example.com/rollout-poster.png',
        durationSeconds: 95,
        caption: 'Multi-region rollout walkthrough',
        sequence: 2,
        featureInLibrary: false,
        folder: 'Post Media',
      },
      {
        id: 'img-1',
        kind: 'image',
        spaceId: SPACE_ID,
        postId: POST_ID,
        fileName: 'diagram-a.png',
        mimeType: 'image/png',
        sizeBytes: 42000,
        url: 'https://cdn.example.com/diagram-a.png',
        caption: 'Topology Diagram',
        sequence: 1,
        featureInLibrary: false,
        folder: 'Post Media',
      },
      {
        id: 'audio-2',
        kind: 'audio',
        spaceId: SPACE_ID,
        postId: POST_ID,
        fileName: 'part-2.mp3',
        mimeType: 'audio/mpeg',
        sizeBytes: 90000,
        url: 'https://cdn.example.com/part-2.mp3',
        durationSeconds: 130,
        caption: 'Part 2: Q&A',
        sequence: 5,
        featureInLibrary: false,
        folder: 'Post Media',
      },
      {
        id: 'audio-1',
        kind: 'audio',
        spaceId: SPACE_ID,
        postId: POST_ID,
        fileName: 'part-1.mp3',
        mimeType: 'audio/mpeg',
        sizeBytes: 75000,
        url: 'https://cdn.example.com/part-1.mp3',
        durationSeconds: 65,
        caption: 'Part 1: Overview',
        sequence: 4,
        featureInLibrary: false,
        folder: 'Post Media',
      },
      {
        id: 'art-1',
        kind: 'artifact',
        spaceId: SPACE_ID,
        postId: POST_ID,
        artifactId: ARTIFACT_ID,
        artifactTypeName: 'Markdown',
        artifactName: 'Deployment Runbook',
        previewContent: '## Step 1\nVerify replica lag.',
        contentType: 'text/markdown',
        versionNumber: 3,
        sequence: 3,
        featureInLibrary: true,
        folder: 'Library',
      },
    ];

    const model = BuildAttachmentGalleryModel(attachments);
    assert.equal(model.totalCount, 6);
    assert.deepEqual(
      model.visualMedia.map((v) => v.id),
      ['img-1', 'vid-1'],
    );
    assert.equal(model.visualMedia[0].isImage, true);
    assert.equal(model.visualMedia[1].isVideo, true);
    assert.equal(model.visualMedia[1].safePosterUrl, 'https://cdn.example.com/rollout-poster.png');
    assert.equal(model.visualMedia[1].formattedDuration, '1:35');

    assert.deepEqual(
      model.audioTracks.map((a) => a.id),
      ['audio-1', 'audio-2'],
    );
    assert.equal(model.audioTracks[0].title, 'Part 1: Overview');
    assert.equal(model.audioTracks[1].formattedDuration, '2:10');

    assert.equal(model.artifacts.length, 1);
    assert.equal(model.artifacts[0].versionBadge, 'v3');
    assert.equal(model.artifacts[0].featureInLibrary, true);

    assert.equal(model.files.length, 1);
    assert.equal(model.files[0].typeLabel, 'PDF');
    assert.equal(model.files[0].formattedSize, '200 KB');
  });

  it('handles carousel index clamping, looping, and keyboard navigation actions accurately', () => {
    assert.equal(ClampSlideIndex(-3, 5), 0);
    assert.equal(ClampSlideIndex(9, 5), 4);
    assert.equal(ClampSlideIndex(2, 5), 2);
    assert.equal(ClampSlideIndex(1, 0), 0);

    // Looping navigation across 4 slides
    assert.equal(StepCarouselIndex(0, -1, 4, true), 3);
    assert.equal(StepCarouselIndex(3, 1, 4, true), 0);
    assert.equal(StepCarouselIndex(1, 1, 4, true), 2);

    // Finite navigation when loop=false
    assert.equal(StepCarouselIndex(0, -1, 4, false), 0);
    assert.equal(StepCarouselIndex(3, 1, 4, false), 3);

    // Carousel & Lightbox keyboard actions
    assert.equal(ResolveCarouselKeyboardAction('ArrowLeft'), 'prev');
    assert.equal(ResolveCarouselKeyboardAction('ArrowRight'), 'next');
    assert.equal(ResolveCarouselKeyboardAction('Home'), 'first');
    assert.equal(ResolveCarouselKeyboardAction('End'), 'last');
    assert.equal(ResolveCarouselKeyboardAction('Tab'), 'none');

    assert.equal(ResolveLightboxKeyboardAction('Escape'), 'close');
    assert.equal(ResolveLightboxKeyboardAction('ArrowLeft'), 'prev');
    assert.equal(ResolveLightboxKeyboardAction('ArrowRight'), 'next');
    assert.equal(ResolveLightboxKeyboardAction('Enter'), 'none');
  });

  it('formats file sizes, media durations, and file type icons across common extensions', () => {
    assert.equal(FormatAttachmentBytes(0), '0 B');
    assert.equal(FormatAttachmentBytes(512), '512 B');
    assert.equal(FormatAttachmentBytes(1536), '1.5 KB');
    assert.equal(FormatAttachmentBytes(2.5 * 1024 * 1024), '2.5 MB');
    assert.equal(FormatMediaDuration(null), null);
    assert.equal(FormatMediaDuration(45), '0:45');
    assert.equal(FormatMediaDuration(3665), '1:01:05');

    assert.equal(ResolveFileAttachmentMeta('application/pdf', 'doc.pdf').typeLabel, 'PDF');
    assert.equal(ResolveFileAttachmentMeta('text/csv', 'metrics.csv').typeLabel, 'CSV');
    assert.equal(
      ResolveFileAttachmentMeta('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'spec.docx')
        .typeLabel,
      'Document',
    );
    assert.equal(ResolveFileAttachmentMeta('application/zip', 'bundle.zip').typeLabel, 'Archive');
  });
});

describe('Slice 2 — Embedded MJ Artifact Rendering & XSS/URL Sanitization', () => {
  it('renders Markdown, sandboxed HTML, sanitized SVG, pretty JSON, Code, and structured previews', () => {
    const mdPreview = ResolveArtifactPreview({
      id: 'a-md',
      kind: 'artifact',
      spaceId: SPACE_ID,
      postId: POST_ID,
      artifactId: ARTIFACT_ID,
      artifactTypeName: 'Markdown',
      artifactName: 'Safe Checklist',
      previewContent: '## Heading\n- Safe **bold**\n<script>alert(1)</script>',
      contentType: 'text/markdown',
      versionNumber: 2,
      sequence: 1,
      featureInLibrary: true,
      folder: 'Library',
    });
    assert.equal(mdPreview.format, 'markdown');
    assert.ok(mdPreview.renderedMarkdownHtml?.includes('<strong>bold</strong>'));
    assert.ok(!mdPreview.renderedMarkdownHtml?.includes('<script>'));
    assert.ok(mdPreview.renderedMarkdownHtml?.includes('&lt;script&gt;'));

    const htmlPreview = ResolveArtifactPreview({
      id: 'a-html',
      kind: 'artifact',
      spaceId: SPACE_ID,
      postId: POST_ID,
      artifactId: ARTIFACT_ID,
      artifactTypeName: 'HTML',
      artifactName: 'Latency Widget',
      previewContent: '<div><strong>99.9%</strong></div>',
      contentType: 'text/html',
      versionNumber: 1,
      sequence: 1,
      featureInLibrary: true,
      folder: 'Library',
    });
    assert.equal(htmlPreview.format, 'html');
    assert.ok(htmlPreview.sandboxedHtmlDocument?.includes('<!DOCTYPE html>'));
    assert.ok(htmlPreview.sandboxedHtmlDocument?.includes('<div><strong>99.9%</strong></div>'));

    const svgPreview = ResolveArtifactPreview({
      id: 'a-svg',
      kind: 'artifact',
      spaceId: SPACE_ID,
      postId: POST_ID,
      artifactId: ARTIFACT_ID,
      artifactTypeName: 'SVG',
      artifactName: 'Pipeline Diagram',
      previewContent: '<svg onload="alert(1)"><script>alert(2)</script><rect width="10" height="10"/></svg>',
      contentType: 'image/svg+xml',
      versionNumber: 1,
      sequence: 1,
      featureInLibrary: true,
      folder: 'Library',
    });
    assert.equal(svgPreview.format, 'svg');
    assert.ok(svgPreview.sandboxedHtmlDocument?.includes("default-src 'none'"));
    assert.ok(!svgPreview.sandboxedHtmlDocument?.includes('<script>'));
    assert.ok(!svgPreview.sandboxedHtmlDocument?.includes('onload='));

    const jsonPreview = ResolveArtifactPreview({
      id: 'a-json',
      kind: 'artifact',
      spaceId: SPACE_ID,
      postId: POST_ID,
      artifactId: ARTIFACT_ID,
      artifactTypeName: 'JSON',
      artifactName: 'Schema Spec',
      previewContent: '{"ok":true,"count":3}',
      contentType: 'application/json',
      versionNumber: 1,
      sequence: 1,
      featureInLibrary: true,
      folder: 'Library',
    });
    assert.equal(jsonPreview.format, 'json');
    assert.ok(jsonPreview.formattedCode?.includes('\n  "ok": true'));

    const structuredPreview = ResolveArtifactPreview({
      id: 'a-struct',
      kind: 'artifact',
      spaceId: SPACE_ID,
      postId: POST_ID,
      artifactId: ARTIFACT_ID,
      artifactTypeName: 'Spreadsheet',
      artifactName: 'Capacity Model',
      previewContent: null,
      contentType: null,
      versionNumber: 4,
      modality: 'Spreadsheet',
      collaborationMode: 'Suggest',
      sequence: 1,
      featureInLibrary: true,
      folder: 'Library',
    });
    assert.equal(structuredPreview.format, 'structured');
    assert.equal(DetectArtifactPreviewFormat({ artifactTypeName: 'Code', contentType: null, previewContent: 'const x = 1;' }), 'code');
    assert.ok(structuredPreview.structuredEntries.some((e) => e.key === 'Version' && e.value === 'v4'));
  });

  it('neutralizes javascript:, vbscript:, data:text/html, and data:image/svg+xml URLs across all attachment kinds', () => {
    const model = BuildAttachmentGalleryModel([
      {
        id: 'bad-img-js',
        kind: 'image',
        spaceId: SPACE_ID,
        postId: POST_ID,
        fileName: 'xss.png',
        mimeType: 'image/png',
        sizeBytes: 100,
        url: 'javascript:alert(1)',
        sequence: 1,
        featureInLibrary: false,
        folder: 'Post Media',
      },
      {
        id: 'bad-img-svg',
        kind: 'image',
        spaceId: SPACE_ID,
        postId: POST_ID,
        fileName: 'evil.svg',
        mimeType: 'image/png',
        sizeBytes: 100,
        url: 'data:image/svg+xml,<svg onload=alert(1)>',
        sequence: 2,
        featureInLibrary: false,
        folder: 'Post Media',
      },
      {
        id: 'bad-video-poster',
        kind: 'video',
        spaceId: SPACE_ID,
        postId: POST_ID,
        fileName: 'clip.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 2048,
        url: 'https://cdn.example.com/clip.mp4',
        posterUrl: 'data:text/html,<script>alert(1)</script>',
        sequence: 3,
        featureInLibrary: false,
        folder: 'Post Media',
      },
      {
        id: 'bad-audio',
        kind: 'audio',
        spaceId: SPACE_ID,
        postId: POST_ID,
        fileName: 'note.mp3',
        mimeType: 'audio/mpeg',
        sizeBytes: 512,
        url: 'vbscript:msgbox(1)',
        sequence: 4,
        featureInLibrary: false,
        folder: 'Post Media',
      },
      {
        id: 'bad-file',
        kind: 'file',
        spaceId: SPACE_ID,
        postId: POST_ID,
        fileName: 'payload.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 512,
        url: '//evil.example.com/payload.pdf',
        sequence: 5,
        featureInLibrary: false,
        folder: 'Post Media',
      },
    ]);

    assert.equal(model.visualMedia[0].safeUrl, null);
    assert.equal(model.visualMedia[1].safeUrl, null);
    assert.equal(model.visualMedia[2].safeUrl, 'https://cdn.example.com/clip.mp4');
    assert.equal(model.visualMedia[2].safePosterUrl, null);
    assert.equal(model.audioTracks[0].safeUrl, null);
    assert.equal(model.files[0].safeUrl, null);
  });
});

describe('Slice 2 — Angular Component Architecture, Sandbox Security, Design Tokens & Surface Integration', () => {
  const galleryTs = readFileSync(join(LIB_DIR, 'community-attachment-gallery.component.ts'), 'utf8');
  const galleryHtml = readFileSync(join(LIB_DIR, 'community-attachment-gallery.component.html'), 'utf8');
  const galleryCss = readFileSync(join(LIB_DIR, 'community-attachment-gallery.component.css'), 'utf8');
  const publicApi = readFileSync(join(HERE, 'public-api.ts'), 'utf8');

  it('declares CommunityAttachmentGalleryComponent as standalone OnPush, exports it, and adheres to --mj-* tokens', () => {
    assert.match(galleryTs, /standalone:\s*true/);
    assert.match(galleryTs, /selector:\s*'mjc-attachment-gallery'/);
    assert.match(galleryTs, /changeDetection:\s*ChangeDetectionStrategy\.OnPush/);
    assert.match(publicApi, /community-attachment-gallery\.component/);
    assert.match(publicApi, /community-attachment-gallery\.ts/);

    const rawColorPattern = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g;
    assert.deepEqual(galleryCss.match(rawColorPattern) ?? [], []);
    assert.deepEqual(galleryHtml.match(rawColorPattern) ?? [], []);
    assert.deepEqual(galleryTs.match(rawColorPattern) ?? [], []);
  });

  it('enforces sandbox="allow-scripts" without allow-same-origin and implements Lightbox Escape/Arrow/FocusTrap', () => {
    assert.match(galleryHtml, /sandbox="allow-scripts"/);
    assert.doesNotMatch(galleryHtml, /allow-same-origin/);
    assert.match(galleryHtml, /<video[\s\S]*controls[\s\S]*preload="metadata"/);
    assert.match(galleryHtml, /<audio[\s\S]*controls[\s\S]*preload="metadata"/);
    assert.match(galleryHtml, /Featured in Library/);
    assert.match(galleryHtml, /role="dialog"[\s\S]*aria-modal="true"/);
    assert.match(galleryHtml, /aria-roledescription="carousel"/);
    assert.match(galleryTs, /ComputeNextTrapFocusTarget/);
    assert.match(galleryTs, /restoreTriggerFocus/);
    assert.match(galleryCss, /overscroll-behavior:\s*contain/);
  });

  it('integrates <mjc-attachment-gallery> across Feed, Inline Replies, Full-Page Thread View, Q&A, Ideas, and Playbooks', () => {
    const streamHtml = readFileSync(join(LIB_DIR, 'knowledge-stream.component.html'), 'utf8');
    const qaHtml = readFileSync(join(LIB_DIR, 'qa-canon-workbench.component.html'), 'utf8');
    const livingHtml = readFileSync(join(LIB_DIR, 'living-co-authoring.component.html'), 'utf8');
    const hubHtml = readFileSync(join(LIB_DIR, 'community-hub-resource.component.html'), 'utf8');

    assert.match(streamHtml, /<mjc-attachment-gallery[\s\S]*\[attachments\]="item\.attachments"/);
    assert.match(streamHtml, /<mjc-attachment-gallery[\s\S]*\[attachments\]="reply\.attachments"/);
    assert.match(hubHtml, /<mjc-attachment-gallery[\s\S]*\[attachments\]="activeDetail\.attachments"/);
    assert.match(hubHtml, /<mjc-attachment-gallery[\s\S]*\[attachments\]="reply\.attachments"/);
    assert.match(hubHtml, /<mjc-attachment-gallery[\s\S]*\[attachments\]="activeIdea\.attachments"/);
    assert.match(qaHtml, /<mjc-attachment-gallery[\s\S]*\[attachments\]="activeQa\.attachments"/);
    assert.match(livingHtml, /<mjc-attachment-gallery[\s\S]*\[attachments\]="doc\.attachments"/);
  });

  it('carries attachments through BuildCommonsStreamItems and ships rich demo seed attachments', () => {
    const built = BuildCommonsStreamItems({
      feedPosts: [
        {
          id: 'p-1',
          title: 'Multi-Media Feed Post',
          bodyMarkdown: 'Body',
          status: 'Published',
          attachments: DEMO_SEED_ATTACHMENTS.feedRotation,
        },
      ],
      qaCanonItems: [
        {
          id: 'qa-1',
          questionPostId: 'q-1',
          title: 'Q&A Entry',
          bodyMarkdown: 'Answer',
          epistemicStatus: 'Canon Verified',
          confidenceScore: 0.94,
          isAccepted: true,
          attachments: DEMO_SEED_ATTACHMENTS.qaRotation,
        },
      ],
      ideationItems: [
        {
          id: 'idea-1',
          campaignId: 'camp-1',
          title: 'Idea Entry',
          summary: 'Summary',
          totalPointsAllocated: 25,
          effectiveQuadraticVotes: 5,
          attachments: DEMO_SEED_ATTACHMENTS.ideaSigning,
        },
      ],
      livingDocItems: [
        {
          id: 'doc-1',
          title: 'Playbook Entry',
          bodyMarkdown: '## Playbook',
          postTypeCode: 'collaborative-doc',
          attachments: DEMO_SEED_ATTACHMENTS.livingPlaybook,
        },
      ],
      includeDemoFixtures: true,
    });

    const feedModel = BuildAttachmentGalleryModel(built.find((i) => i.id === 'post-p-1')?.attachments);
    assert.equal(feedModel.visualMedia.length, 3);
    assert.equal(feedModel.audioTracks.length, 2);
    assert.equal(feedModel.artifacts.length, 1);
    assert.equal(feedModel.files.length, 1);

    const rfcItem = built.find((i) => i.id === 'commons-rfc-2026-08');
    assert.ok(rfcItem?.attachments && rfcItem.attachments.length >= 2);
    assert.ok(rfcItem?.replies[0]?.attachments && rfcItem.replies[0].attachments.length >= 1);
  });
});
