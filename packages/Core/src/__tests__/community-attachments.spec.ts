import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COMMUNITY_ATTACHMENT_MAX_AGGREGATE_BYTES_PER_POST,
  COMMUNITY_ATTACHMENT_MAX_CAPTION_LENGTH,
  COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST,
  COMMUNITY_ATTACHMENT_MAX_FILE_BYTES,
  COMMUNITY_SPACE_ITEM_FOLDERS,
  ClassifyAttachmentKind,
  GroupPostAttachmentsForDisplay,
  IsAllowedAttachmentMimeType,
  IsFeaturedLibraryFolder,
  NormalizeAttachmentMimeType,
  ResolveAttachmentSpaceItemFolder,
  ResolveDefaultFeatureInLibrary,
  SanitizeCommunityAttachmentUrl,
  ValidateAttachmentBatchLimits,
  ValidateAttachmentFileSize,
  ValidateCommunityAttachmentInput,
  type CommunityAttachmentItem,
} from '../index.ts';

const SPACE_ID = '11111111-1111-4111-8111-111111111111';
const POST_ID = '22222222-2222-4222-8222-222222222222';
const ARTIFACT_ID = '33333333-3333-4333-8333-333333333333';

describe('@mj-biz-apps/community-core media & artifact attachments', () => {
  it('classifies MIME types and embedded artifacts into CommunityAttachmentKind', () => {
    assert.equal(ClassifyAttachmentKind('image/png', false), 'image');
    assert.equal(ClassifyAttachmentKind('IMAGE/WEBP; charset=utf-8', false), 'image');
    assert.equal(ClassifyAttachmentKind('video/mp4', false), 'video');
    assert.equal(ClassifyAttachmentKind('audio/mpeg', false), 'audio');
    assert.equal(ClassifyAttachmentKind('application/pdf', false), 'file');
    assert.equal(
      ClassifyAttachmentKind('application/vnd.openxmlformats-officedocument.wordprocessingml.document', false),
      'file',
    );
    assert.equal(ClassifyAttachmentKind('application/pdf', true), 'artifact');
    assert.equal(ClassifyAttachmentKind(null, true), 'artifact');
  });

  it('enforces strict MIME allowlist and blocks script-capable types', () => {
    assert.equal(NormalizeAttachmentMimeType('Image/PNG; name="shot.png"'), 'image/png');
    assert.equal(IsAllowedAttachmentMimeType('image/png'), true);
    assert.equal(IsAllowedAttachmentMimeType('video/webm'), true);
    assert.equal(IsAllowedAttachmentMimeType('audio/wav'), true);
    assert.equal(IsAllowedAttachmentMimeType('application/pdf'), true);
    assert.equal(
      IsAllowedAttachmentMimeType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
      true,
    );

    assert.equal(IsAllowedAttachmentMimeType('text/html'), false);
    assert.equal(IsAllowedAttachmentMimeType('image/svg+xml'), false);
    assert.equal(IsAllowedAttachmentMimeType('application/javascript'), false);
    assert.equal(IsAllowedAttachmentMimeType('application/x-msdownload'), false);
    assert.equal(IsAllowedAttachmentMimeType(''), false);
    assert.equal(IsAllowedAttachmentMimeType(null), false);
  });

  it('sanitizes attachment URLs and blocks javascript:, vbscript:, and unsafe data: URIs', () => {
    assert.equal(
      SanitizeCommunityAttachmentUrl('https://cdn.example.com/media/chart.png', 'image'),
      'https://cdn.example.com/media/chart.png',
    );
    assert.equal(
      SanitizeCommunityAttachmentUrl('http://127.0.0.1:4200/assets/demo.mp4', 'video'),
      'http://127.0.0.1:4200/assets/demo.mp4',
    );
    assert.equal(
      SanitizeCommunityAttachmentUrl('blob:https://community.example.com/abc-123', 'image'),
      'blob:https://community.example.com/abc-123',
    );
    assert.equal(
      SanitizeCommunityAttachmentUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==', 'image'),
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
    );
    assert.equal(
      SanitizeCommunityAttachmentUrl('data:audio/mpeg;base64,//uQxAAAA', 'audio'),
      'data:audio/mpeg;base64,//uQxAAAA',
    );
    assert.equal(
      SanitizeCommunityAttachmentUrl('data:video/mp4;base64,AAAAIGZ0eXBpc29t', 'video'),
      'data:video/mp4;base64,AAAAIGZ0eXBpc29t',
    );

    // Unsafe schemes & control characters
    assert.equal(SanitizeCommunityAttachmentUrl('javascript:alert(1)', 'image'), null);
    assert.equal(SanitizeCommunityAttachmentUrl('  JaVaScRiPt:alert(1)', 'image'), null);
    assert.equal(SanitizeCommunityAttachmentUrl('java\nscript:alert(1)', 'image'), null);
    assert.equal(SanitizeCommunityAttachmentUrl('vbscript:msgbox(1)', 'file'), null);
    assert.equal(SanitizeCommunityAttachmentUrl('data:text/html,<script>alert(1)</script>', 'image'), null);
    assert.equal(SanitizeCommunityAttachmentUrl('data:image/svg+xml,<svg onload=alert(1)>', 'image'), null);
    assert.equal(SanitizeCommunityAttachmentUrl('data:application/javascript,alert(1)', 'file'), null);
    assert.equal(SanitizeCommunityAttachmentUrl('blob:javascript:alert(1)', 'image'), null);
    assert.equal(SanitizeCommunityAttachmentUrl('//evil.example.com/payload.png', 'image'), null);
    // Mismatched data: kind
    assert.equal(SanitizeCommunityAttachmentUrl('data:audio/mpeg;base64,//uQxAAAA', 'image'), null);
    assert.equal(SanitizeCommunityAttachmentUrl('data:image/png;base64,iVBORw0KGgo=', 'file'), null);
    // Oversized inline data URI rejected
    assert.equal(
      SanitizeCommunityAttachmentUrl(`data:image/png;base64,${'A'.repeat(200)}`, 'image', 64),
      null,
    );
  });

  it('enforces per-file, count, aggregate byte, and caption limits at boundaries', () => {
    assert.equal(ValidateAttachmentFileSize(1).valid, true);
    assert.equal(ValidateAttachmentFileSize(COMMUNITY_ATTACHMENT_MAX_FILE_BYTES).valid, true);
    assert.equal(ValidateAttachmentFileSize(COMMUNITY_ATTACHMENT_MAX_FILE_BYTES + 1).valid, false);
    assert.equal(ValidateAttachmentFileSize(0).valid, false);
    assert.equal(ValidateAttachmentFileSize(-5).valid, false);

    const exactMaxCount = Array.from({ length: COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST }, () => ({
      sizeBytes: 1024,
    }));
    assert.equal(ValidateAttachmentBatchLimits(exactMaxCount).valid, true);

    const overMaxCount = Array.from({ length: COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST + 1 }, () => ({
      sizeBytes: 1024,
    }));
    assert.equal(ValidateAttachmentBatchLimits(overMaxCount).valid, false);

    // 5 files of 10 MiB = 50 MiB exact aggregate boundary passes; +1 byte fails
    const exactAggregate = Array.from({ length: 5 }, () => ({
      sizeBytes: COMMUNITY_ATTACHMENT_MAX_FILE_BYTES,
    }));
    assert.equal(COMMUNITY_ATTACHMENT_MAX_AGGREGATE_BYTES_PER_POST, 50 * 1024 * 1024);
    assert.equal(ValidateAttachmentBatchLimits(exactAggregate).valid, true);

    const overAggregate = [...exactAggregate, { sizeBytes: 1 }];
    assert.equal(ValidateAttachmentBatchLimits(overAggregate).valid, false);

    const validInput = ValidateCommunityAttachmentInput({
      kind: 'image',
      fileName: 'diagram.png',
      mimeType: 'image/png',
      sizeBytes: 2048,
      url: 'https://cdn.example.com/diagram.png',
      caption: 'Architecture overview',
    });
    assert.equal(validInput.valid, true);
    assert.equal(validInput.classifiedKind, 'image');

    const badCaption = ValidateCommunityAttachmentInput({
      kind: 'artifact',
      artifactId: ARTIFACT_ID,
      artifactName: 'Q4 Playbook',
      caption: 'x'.repeat(COMMUNITY_ATTACHMENT_MAX_CAPTION_LENGTH + 1),
    });
    assert.equal(badCaption.valid, false);
  });

  it('routes SpaceItem folders to Library for MJ Artifacts/Playbooks and Post Media for casual media', () => {
    assert.equal(ResolveDefaultFeatureInLibrary('artifact', 'post'), true);
    assert.equal(ResolveDefaultFeatureInLibrary('artifact', 'reply'), true);
    assert.equal(ResolveDefaultFeatureInLibrary('file', 'playbook'), true);
    assert.equal(ResolveDefaultFeatureInLibrary('image', 'collaborative-doc'), true);

    assert.equal(ResolveDefaultFeatureInLibrary('image', 'reply'), false);
    assert.equal(ResolveDefaultFeatureInLibrary('video', 'reply'), false);
    assert.equal(ResolveDefaultFeatureInLibrary('audio', 'reply'), false);
    assert.equal(ResolveDefaultFeatureInLibrary('file', 'reply'), false);
    assert.equal(ResolveDefaultFeatureInLibrary('image', 'post'), false);

    assert.equal(ResolveAttachmentSpaceItemFolder(true), COMMUNITY_SPACE_ITEM_FOLDERS.Library);
    assert.equal(ResolveAttachmentSpaceItemFolder(false), COMMUNITY_SPACE_ITEM_FOLDERS.PostMedia);
    assert.equal(IsFeaturedLibraryFolder('Library'), true);
    assert.equal(IsFeaturedLibraryFolder('Post Media'), false);
    assert.equal(IsFeaturedLibraryFolder(null), false);
  });

  it('groups post attachments into visualMedia, audioTracks, artifacts, and files preserving sequence', () => {
    const items: CommunityAttachmentItem[] = [
      {
        id: 'att-file-late',
        kind: 'file',
        spaceId: SPACE_ID,
        postId: POST_ID,
        fileName: 'runbook.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 4096,
        url: 'https://cdn.example.com/runbook.pdf',
        sequence: 5,
        featureInLibrary: false,
        folder: 'Post Media',
      },
      {
        id: 'att-video-2',
        kind: 'video',
        spaceId: SPACE_ID,
        postId: POST_ID,
        fileName: 'walkthrough.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 102400,
        url: 'https://cdn.example.com/walkthrough.mp4',
        posterUrl: 'https://cdn.example.com/walkthrough-poster.jpg',
        durationSeconds: 95,
        sequence: 3,
        featureInLibrary: false,
        folder: 'Post Media',
      },
      {
        id: 'att-artifact-1',
        kind: 'artifact',
        spaceId: SPACE_ID,
        postId: POST_ID,
        artifactId: ARTIFACT_ID,
        artifactVersionId: '44444444-4444-4444-8444-444444444444',
        artifactTypeName: 'HTML',
        artifactName: 'Interactive Benchmark Report',
        previewContent: '<div>Report</div>',
        contentType: 'text/html',
        versionNumber: 2,
        sequence: 2,
        featureInLibrary: true,
        folder: 'Library',
      },
      {
        id: 'att-audio-1',
        kind: 'audio',
        spaceId: SPACE_ID,
        postId: POST_ID,
        fileName: 'standup-note.mp3',
        mimeType: 'audio/mpeg',
        sizeBytes: 25600,
        url: 'https://cdn.example.com/standup-note.mp3',
        durationSeconds: 42,
        sequence: 4,
        featureInLibrary: false,
        folder: 'Post Media',
      },
      {
        id: 'att-img-1',
        kind: 'image',
        spaceId: SPACE_ID,
        postId: POST_ID,
        fileName: 'hero.png',
        mimeType: 'image/png',
        sizeBytes: 15000,
        url: 'https://cdn.example.com/hero.png',
        sequence: 1,
        featureInLibrary: false,
        folder: 'Post Media',
      },
    ];

    const grouped = GroupPostAttachmentsForDisplay(items);
    assert.equal(grouped.totalCount, 5);
    assert.deepEqual(
      grouped.visualMedia.map((i) => i.id),
      ['att-img-1', 'att-video-2'],
    );
    assert.deepEqual(
      grouped.audioTracks.map((i) => i.id),
      ['att-audio-1'],
    );
    assert.deepEqual(
      grouped.artifacts.map((i) => i.id),
      ['att-artifact-1'],
    );
    assert.deepEqual(
      grouped.files.map((i) => i.id),
      ['att-file-late'],
    );
  });
});
