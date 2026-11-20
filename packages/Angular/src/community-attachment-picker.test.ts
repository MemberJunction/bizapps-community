import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  COMMUNITY_ATTACHMENT_MAX_CAPTION_LENGTH,
  COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST,
  COMMUNITY_ATTACHMENT_MAX_FILE_BYTES,
  COMMUNITY_SPACE_ITEM_FOLDERS,
} from '@mj-biz-apps/community-core';
import {
  CreateDraftArtifactAttachment,
  CreateDraftFileAttachment,
  DEMO_ACCESSIBLE_ARTIFACTS,
  FilterAccessibleArtifacts,
  InferAttachmentMimeType,
  MoveDraftAttachment,
  PICKER_HELPER_LIBRARY_COPY,
  PersistPostAttachmentsFromClient,
  RemoveDraftAttachment,
  ResolveComposerAttachmentEntryType,
  SyncDraftsForEntryTypeChange,
  ToggleDraftAttachmentFeatureInLibrary,
  UpdateDraftArtifactPinnedVersion,
  UpdateDraftAttachmentCaption,
  ValidateDraftAttachmentBatch,
  ValidateDraftAttachmentsForSubmit,
  type DraftCommunityAttachment,
  type ForumPostAttachmentEntityLike,
  type SpaceItemEntityLike,
} from './lib/community-attachment-picker.ts';
import {
  PersistAskSharePost,
  PersistDetailReply,
  type AskSharePostEntityLike,
  type AuthorizedForumOption,
  type CommunityCommonsItem,
  type ReplyForumPostEntityLike,
} from './lib/community-hub-commons.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIB_DIR = join(HERE, 'lib');

const SPACE_UUID = '11111111-1111-4111-8111-111111111111';
const FORUM_UUID = '22222222-2222-4222-8222-222222222222';
const USER_UUID = '33333333-3333-4333-8333-333333333333';
const POST_UUID = '44444444-4444-4444-8444-444444444444';
const REPLY_UUID = '55555555-5555-4555-8555-555555555555';
const ARTIFACTS_ENTITY_UUID = '66666666-6666-4666-8666-666666666666';
const FILES_ENTITY_UUID = '77777777-7777-4777-8777-777777777777';
const POST_TYPE_DISCUSSION_UUID = '88888888-8888-4888-8888-888888888888';
const POST_TYPE_REPLY_UUID = '99999999-9999-4999-8999-999999999999';

describe('Slice 3 — Multi-File Attachment Drafting, Reordering, Captioning & Validation', () => {
  it('drafts images, videos, audio clips, PDFs, and documents with MIME inference and validation', () => {
    assert.equal(InferAttachmentMimeType('', 'diagram.png'), 'image/png');
    assert.equal(InferAttachmentMimeType('', 'walkthrough.mp4'), 'video/mp4');
    assert.equal(InferAttachmentMimeType('', 'memo.mp3'), 'audio/mpeg');
    assert.equal(InferAttachmentMimeType('', 'runbook.pdf'), 'application/pdf');
    assert.equal(
      InferAttachmentMimeType('', 'spec.docx'),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );

    const img = CreateDraftFileAttachment({
      fileName: 'diagram.png',
      mimeType: 'image/png',
      sizeBytes: 24576,
      url: 'https://cdn.example.com/diagram.png',
      entryType: 'post',
      sequence: 1,
    });
    assert.ok(img.draft);
    assert.equal(img.draft.kind, 'image');
    assert.equal(img.draft.previewUrl, 'https://cdn.example.com/diagram.png');
    assert.equal(img.draft.formattedSize, '24 KB');

    const pdf = CreateDraftFileAttachment({
      fileName: 'audit-runbook.pdf',
      mimeType: '',
      sizeBytes: 512000,
      url: 'https://cdn.example.com/audit-runbook.pdf',
      entryType: 'post',
      sequence: 2,
    });
    assert.ok(pdf.draft);
    assert.equal(pdf.draft.kind, 'file');
    assert.equal(pdf.draft.typeLabel, 'PDF');
    assert.equal(pdf.draft.previewUrl, null);

    const audio = CreateDraftFileAttachment({
      fileName: 'voice-note.wav',
      mimeType: 'audio/wav',
      sizeBytes: 120000,
      url: 'https://cdn.example.com/voice-note.wav',
      entryType: 'reply',
      sequence: 3,
    });
    assert.ok(audio.draft);
    assert.equal(audio.draft.kind, 'audio');

    const badMime = CreateDraftFileAttachment({
      fileName: 'payload.html',
      mimeType: 'text/html',
      sizeBytes: 1024,
      url: 'https://cdn.example.com/payload.html',
      entryType: 'post',
      sequence: 4,
    });
    assert.ok(badMime.error);
    assert.equal(badMime.draft, undefined);

    const oversized = CreateDraftFileAttachment({
      fileName: 'huge.mp4',
      mimeType: 'video/mp4',
      sizeBytes: COMMUNITY_ATTACHMENT_MAX_FILE_BYTES + 1,
      url: 'https://cdn.example.com/huge.mp4',
      entryType: 'post',
      sequence: 5,
    });
    assert.ok(oversized.error);

    const unsafeUrl = CreateDraftFileAttachment({
      fileName: 'xss.png',
      mimeType: 'image/png',
      sizeBytes: 1024,
      url: 'javascript:alert(1)',
      entryType: 'post',
      sequence: 6,
    });
    assert.ok(unsafeUrl.error);
  });

  it('reorders attachments up/down, removes items, normalizes sequence, and enforces caption bounds', () => {
    const first = CreateDraftFileAttachment({
      fileName: 'one.png',
      mimeType: 'image/png',
      sizeBytes: 1024,
      url: 'https://cdn.example.com/one.png',
      entryType: 'post',
      sequence: 1,
    }).draft!;
    const second = CreateDraftFileAttachment({
      fileName: 'two.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048,
      url: 'https://cdn.example.com/two.pdf',
      entryType: 'post',
      sequence: 2,
    }).draft!;
    const third = CreateDraftArtifactAttachment({
      artifact: DEMO_ACCESSIBLE_ARTIFACTS[0],
      entryType: 'post',
      sequence: 3,
    }).draft!;

    let list: DraftCommunityAttachment[] = [first, second, third];

    // Move third item up to index 1
    list = MoveDraftAttachment(list, third.draftId, 'up');
    assert.deepEqual(
      list.map((d) => d.draftId),
      [first.draftId, third.draftId, second.draftId],
    );
    assert.deepEqual(
      list.map((d) => d.sequence),
      [1, 2, 3],
    );

    // Move first item down to index 1
    list = MoveDraftAttachment(list, first.draftId, 'down');
    assert.deepEqual(
      list.map((d) => d.draftId),
      [third.draftId, first.draftId, second.draftId],
    );
    assert.deepEqual(
      list.map((d) => d.sequence),
      [1, 2, 3],
    );

    // Boundary move is a safe no-op
    const atTop = MoveDraftAttachment(list, third.draftId, 'up');
    assert.deepEqual(
      atTop.map((d) => d.draftId),
      list.map((d) => d.draftId),
    );

    // Caption update and length bound check
    const okCaption = UpdateDraftAttachmentCaption(list, first.draftId, 'Architecture topology snapshot');
    assert.equal(okCaption.error, null);
    assert.equal(okCaption.drafts[1].caption, 'Architecture topology snapshot');

    const overCaption = UpdateDraftAttachmentCaption(
      okCaption.drafts,
      first.draftId,
      'x'.repeat(COMMUNITY_ATTACHMENT_MAX_CAPTION_LENGTH + 1),
    );
    assert.ok(overCaption.error);
    const submitValidation = ValidateDraftAttachmentsForSubmit(overCaption.drafts);
    assert.equal(submitValidation.valid, false);

    // Removal normalizes sequence
    const afterRemove = RemoveDraftAttachment(okCaption.drafts, third.draftId);
    assert.equal(afterRemove.length, 2);
    assert.deepEqual(
      afterRemove.map((d) => d.sequence),
      [1, 2],
    );
  });

  it('enforces per-post count ceiling in batch validation', () => {
    const many: DraftCommunityAttachment[] = [];
    for (let i = 0; i < COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST; i += 1) {
      many.push(
        CreateDraftFileAttachment({
          fileName: `img-${i}.png`,
          mimeType: 'image/png',
          sizeBytes: 1024,
          url: `https://cdn.example.com/img-${i}.png`,
          entryType: 'post',
          sequence: i + 1,
        }).draft!,
      );
    }
    const extra = CreateDraftFileAttachment({
      fileName: 'extra.png',
      mimeType: 'image/png',
      sizeBytes: 1024,
      url: 'https://cdn.example.com/extra.png',
      entryType: 'post',
      sequence: COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST + 1,
    }).draft!;

    const batch = ValidateDraftAttachmentBatch(many, [extra]);
    assert.equal(batch.valid, false);
    assert.ok(batch.errors.some((e) => e.includes('exceeds the maximum')));
  });
});

describe('Slice 3 — MJ Artifact Search, Selection, Version Pinning & Auto-Library Toggle Defaults', () => {
  it('filters accessible MJ Artifacts by name or type and supports optional version pinning', () => {
    const byType = FilterAccessibleArtifacts(DEMO_ACCESSIBLE_ARTIFACTS, 'svg');
    assert.equal(byType.length, 1);
    assert.equal(byType[0].name, 'Dual-Dialect Schema Parity Pipeline Diagram');

    const byName = FilterAccessibleArtifacts(DEMO_ACCESSIBLE_ARTIFACTS, 'rollover');
    assert.equal(byName.length, 1);
    assert.equal(byName[0].latestVersionNumber, 2);

    const attached = CreateDraftArtifactAttachment({
      artifact: byName[0],
      entryType: 'post',
      sequence: 1,
    });
    assert.ok(attached.draft);
    assert.equal(attached.draft.pinnedVersionId, null);
    assert.equal(attached.draft.latestVersionNumber, 2);

    // Pin specific version v1
    const v1Id = byName[0].versions[1].versionId;
    const pinned = UpdateDraftArtifactPinnedVersion([attached.draft], attached.draft.draftId, v1Id);
    assert.equal(pinned[0].kind, 'artifact');
    if (pinned[0].kind === 'artifact') {
      assert.equal(pinned[0].pinnedVersionId, v1Id);
      assert.equal(pinned[0].pinnedVersionNumber, 1);
      assert.ok(pinned[0].previewContent?.includes('Baseline Latency'));
    }

    // Revert to latest version
    const unpinned = UpdateDraftArtifactPinnedVersion(pinned, attached.draft.draftId, null);
    if (unpinned[0].kind === 'artifact') {
      assert.equal(unpinned[0].pinnedVersionId, null);
      assert.equal(unpinned[0].pinnedVersionNumber, null);
      assert.ok(unpinned[0].previewContent?.includes('Zero-Downtime Cutover Telemetry'));
    }
  });

  it('applies ResolveDefaultFeatureInLibrary defaults for MJ Artifacts, Playbooks, and casual reply images', () => {
    assert.equal(ResolveComposerAttachmentEntryType('post', 'Playbook Note'), 'playbook');
    assert.equal(ResolveComposerAttachmentEntryType('post', 'Discussion Post'), 'post');
    assert.equal(ResolveComposerAttachmentEntryType('reply', 'Question'), 'reply');

    // Casual reply image -> off by default ('Post Media')
    const replyImg = CreateDraftFileAttachment({
      fileName: 'reply-screenshot.png',
      mimeType: 'image/png',
      sizeBytes: 2048,
      url: 'https://cdn.example.com/reply-screenshot.png',
      entryType: 'reply',
      sequence: 1,
    }).draft!;
    assert.equal(replyImg.featureInLibrary, false);
    assert.equal(replyImg.folder, COMMUNITY_SPACE_ITEM_FOLDERS.PostMedia);

    // MJ Artifact -> auto-enabled ('Library') even inside a reply
    const replyArt = CreateDraftArtifactAttachment({
      artifact: DEMO_ACCESSIBLE_ARTIFACTS[0],
      entryType: 'reply',
      sequence: 2,
    }).draft!;
    assert.equal(replyArt.featureInLibrary, true);
    assert.equal(replyArt.folder, COMMUNITY_SPACE_ITEM_FOLDERS.Library);

    // Playbook file -> auto-enabled ('Library')
    const playbookPdf = CreateDraftFileAttachment({
      fileName: 'playbook-checklist.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 4096,
      url: 'https://cdn.example.com/playbook-checklist.pdf',
      entryType: 'playbook',
      sequence: 1,
    }).draft!;
    assert.equal(playbookPdf.featureInLibrary, true);
    assert.equal(playbookPdf.folder, COMMUNITY_SPACE_ITEM_FOLDERS.Library);

    // Switching post entry type from Discussion Post -> Playbook Note updates non-overridden drafts
    const discussionPdf = CreateDraftFileAttachment({
      fileName: 'notes.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 4096,
      url: 'https://cdn.example.com/notes.pdf',
      entryType: 'post',
      sequence: 1,
    }).draft!;
    assert.equal(discussionPdf.featureInLibrary, false);

    const syncedToPlaybook = SyncDraftsForEntryTypeChange([discussionPdf], 'playbook');
    assert.equal(syncedToPlaybook[0].featureInLibrary, true);
    assert.equal(syncedToPlaybook[0].folder, COMMUNITY_SPACE_ITEM_FOLDERS.Library);

    // Manual toggle sets override so subsequent entryType changes respect user intent
    const manuallyDisabled = ToggleDraftAttachmentFeatureInLibrary(syncedToPlaybook, discussionPdf.draftId, false);
    assert.equal(manuallyDisabled[0].featureInLibrary, false);
    assert.equal(manuallyDisabled[0].folder, COMMUNITY_SPACE_ITEM_FOLDERS.PostMedia);
    const afterSyncRespectsOverride = SyncDraftsForEntryTypeChange(manuallyDisabled, 'playbook');
    assert.equal(afterSyncRespectsOverride[0].featureInLibrary, false);
  });
});

describe('Slice 3 — SpaceItem + ForumPostAttachment Persistence & Fail-Closed Error Handling', () => {
  it('persists SpaceItem + ForumPostAttachment records via MJ entity factories in live mode', async () => {
    const savedSpaceItems: SpaceItemEntityLike[] = [];
    const savedAttachments: ForumPostAttachmentEntityLike[] = [];
    let nextId = 1;

    const imgDraft = CreateDraftFileAttachment({
      fileName: 'cutover-chart.png',
      mimeType: 'image/png',
      sizeBytes: 8192,
      url: 'https://cdn.example.com/cutover-chart.png',
      entryType: 'post',
      sequence: 1,
      caption: 'Cutover chart',
    }).draft!;
    const artDraft = CreateDraftArtifactAttachment({
      artifact: DEMO_ACCESSIBLE_ARTIFACTS[0],
      pinnedVersionId: DEMO_ACCESSIBLE_ARTIFACTS[0].versions[1].versionId,
      entryType: 'post',
      sequence: 2,
      caption: 'Baseline report',
    }).draft!;

    const result = await PersistPostAttachmentsFromClient({
      postId: POST_UUID,
      spaceId: SPACE_UUID,
      drafts: [imgDraft, artDraft],
      isOfflineDemoMode: false,
      currentUserId: USER_UUID,
      authorName: 'Amith',
      resolveEntityId: async (entityName) =>
        entityName === 'MJ: Artifacts' ? ARTIFACTS_ENTITY_UUID : FILES_ENTITY_UUID,
      createSpaceItemEntity: async () => {
        const entity: SpaceItemEntityLike = {
          ID: `aaaa0000-0000-4000-8000-00000000010${nextId++}`,
          SpaceID: '',
          EntityID: '',
          RecordID: '',
          Band: 'Shared',
          PromotedAt: null,
          PromotedByUserID: null,
          Folder: null,
          ArtifactVersionID: null,
          Save: async () => {
            savedSpaceItems.push(entity);
            return true;
          },
          Delete: async () => true,
        };
        return entity;
      },
      createForumPostAttachmentEntity: async () => {
        const entity: ForumPostAttachmentEntityLike = {
          ID: `bbbb0000-0000-4000-8000-00000000020${nextId++}`,
          PostID: '',
          SpaceItemID: '',
          Caption: null,
          Sequence: 0,
          Save: async () => {
            savedAttachments.push(entity);
            return true;
          },
          Delete: async () => true,
        };
        return entity;
      },
    });

    assert.equal(result.success, true);
    assert.equal(result.offlineFallback, false);
    assert.equal(savedSpaceItems.length, 2);
    assert.equal(savedAttachments.length, 2);

    assert.equal(savedSpaceItems[0].EntityID, FILES_ENTITY_UUID);
    assert.equal(savedSpaceItems[0].Folder, 'Post Media');
    assert.equal(savedAttachments[0].Caption, 'Cutover chart');
    assert.equal(savedAttachments[0].Sequence, 1);

    assert.equal(savedSpaceItems[1].EntityID, ARTIFACTS_ENTITY_UUID);
    assert.equal(savedSpaceItems[1].Folder, 'Library');
    assert.equal(savedSpaceItems[1].ArtifactVersionID, DEMO_ACCESSIBLE_ARTIFACTS[0].versions[1].versionId);
    assert.equal(savedAttachments[1].Caption, 'Baseline report');
    assert.equal(savedAttachments[1].Sequence, 2);
  });

  it('rolls back created SpaceItem records and fails visibly when ForumPostAttachment.Save() fails', async () => {
    const deletedEntities: string[] = [];

    const imgDraft = CreateDraftFileAttachment({
      fileName: 'diagram.png',
      mimeType: 'image/png',
      sizeBytes: 4096,
      url: 'https://cdn.example.com/diagram.png',
      entryType: 'post',
      sequence: 1,
    }).draft!;

    const result = await PersistPostAttachmentsFromClient({
      postId: POST_UUID,
      spaceId: SPACE_UUID,
      drafts: [imgDraft],
      isOfflineDemoMode: false,
      currentUserId: USER_UUID,
      resolveEntityId: async () => FILES_ENTITY_UUID,
      createSpaceItemEntity: async () => ({
        ID: 'cccc0000-0000-4000-8000-000000000301',
        SpaceID: '',
        EntityID: '',
        RecordID: '',
        Band: 'Shared',
        PromotedAt: null,
        PromotedByUserID: null,
        Folder: null,
        ArtifactVersionID: null,
        Save: async () => true,
        Delete: async () => {
          deletedEntities.push('SpaceItem');
          return true;
        },
      }),
      createForumPostAttachmentEntity: async () => ({
        ID: '',
        PostID: '',
        SpaceItemID: '',
        Caption: null,
        Sequence: 0,
        LatestResult: { CompleteMessage: 'Permission denied on ForumPostAttachment' },
        Save: async () => false,
        Delete: async () => {
          deletedEntities.push('ForumPostAttachment');
          return true;
        },
      }),
    });

    assert.equal(result.success, false);
    assert.match(result.errorMessage ?? '', /Permission denied on ForumPostAttachment/);
    assert.deepEqual(deletedEntities, ['SpaceItem']);
  });

  it('rolls back new ForumPost in PersistAskSharePost and PersistDetailReply when attachment persistence fails', async () => {
    let postDeleted = false;
    let replyDeleted = false;

    const authorizedForums: AuthorizedForumOption[] = [
      {
        id: FORUM_UUID,
        name: 'Engineering Discussions',
        spaceId: SPACE_UUID,
        dbSpaceId: SPACE_UUID,
        forumTypeCode: 'general-discussion',
        status: 'Active',
        postingPolicy: 'Open',
      },
    ];
    const postTypeIdByCode = new Map<string, string>([
      ['discussion', POST_TYPE_DISCUSSION_UUID],
      ['reply', POST_TYPE_REPLY_UUID],
    ]);

    const imgDraft = CreateDraftFileAttachment({
      fileName: 'snapshot.png',
      mimeType: 'image/png',
      sizeBytes: 2048,
      url: 'https://cdn.example.com/snapshot.png',
      entryType: 'post',
      sequence: 1,
    }).draft!;

    const postOutcome = await PersistAskSharePost({
      draft: {
        entryType: 'Discussion Post',
        title: 'Multi-region failover plan',
        spaceId: SPACE_UUID,
        body: 'Detailed failover notes.',
        tagsInput: '',
      },
      isOfflineDemoMode: false,
      targetForumId: FORUM_UUID,
      allowedForumIDs: [FORUM_UUID],
      authorizedForums,
      postTypeIdByCode,
      currentUserId: USER_UUID,
      authorName: 'Amith',
      draftAttachments: [imgDraft],
      persistAttachments: async () => ({
        success: false,
        errorMessage: 'Simulated SpaceItem write failure',
        persistedAttachments: [],
      }),
      createForumPostEntity: async (): Promise<AskSharePostEntityLike> => ({
        ID: POST_UUID,
        ForumID: '',
        AuthorUserID: null,
        PostTypeID: '',
        Title: null,
        BodyMarkdown: '',
        Status: 'Published',
        Save: async () => true,
        Delete: async () => {
          postDeleted = true;
          return true;
        },
      }),
    });

    assert.equal(postOutcome.success, false);
    assert.equal(postDeleted, true);
    assert.match(postOutcome.errorMessage ?? '', /Simulated SpaceItem write failure/);

    const parentItem: CommunityCommonsItem = {
      id: `post-${POST_UUID}`,
      title: 'Parent Thread',
      excerpt: 'Parent',
      bodyMarkdown: 'Parent body',
      spaceId: SPACE_UUID,
      spaceLabel: 'Engineering',
      streamType: 'post',
      entryTypeLabel: 'Discussion Post',
      statusBadge: 'Discussion',
      statusTone: 'brand',
      epistemicStatus: 'Published',
      confidenceScore: null,
      authorName: 'Amith',
      authorRole: 'Member',
      authorInitials: 'AM',
      timestampLabel: 'Just now',
      tags: [],
      upvoteCount: 0,
      upvotedByMe: false,
      replyCount: 0,
      replies: [],
      graduatedToDeliverable: false,
      deliverableTitle: null,
      sourceTab: 'knowledge-stream',
      sourcePostId: POST_UUID,
      forumId: FORUM_UUID,
    };

    const replyOutcome = await PersistDetailReply({
      item: parentItem,
      replyBody: 'Here is a reply with an attachment',
      authorName: 'Amith',
      isOfflineDemoMode: false,
      postTypeIdByCode,
      currentUserId: USER_UUID,
      spaceId: SPACE_UUID,
      draftAttachments: [imgDraft],
      persistAttachments: async () => ({
        success: false,
        errorMessage: 'Simulated attachment failure',
        persistedAttachments: [],
      }),
      createForumPostEntity: async (): Promise<ReplyForumPostEntityLike> => ({
        ID: REPLY_UUID,
        ForumID: '',
        PostTypeID: '',
        RootPostID: null,
        ParentPostID: null,
        ReplyDepth: 0,
        AuthorUserID: null,
        BodyMarkdown: '',
        Status: 'Published',
        Save: async () => true,
        Delete: async () => {
          replyDeleted = true;
          return true;
        },
      }),
      reloadThreadReplies: async () => [],
    });

    assert.equal(replyOutcome.success, false);
    assert.equal(replyDeleted, true);
    assert.match(replyOutcome.errorMessage ?? '', /Simulated attachment failure/);
  });

  it('persists attachments cleanly in in-memory offline demo mode for both posts and replies', async () => {
    const artDraft = CreateDraftArtifactAttachment({
      artifact: DEMO_ACCESSIBLE_ARTIFACTS[3],
      entryType: 'post',
      sequence: 1,
    }).draft!;

    const postOutcome = await PersistAskSharePost({
      draft: {
        entryType: 'Playbook Note',
        title: 'Demo Playbook with Artifact',
        spaceId: SPACE_UUID,
        body: 'Playbook content.',
        tagsInput: 'security',
      },
      isOfflineDemoMode: true,
      targetForumId: '',
      allowedForumIDs: [],
      postTypeIdByCode: new Map(),
      currentUserId: null,
      authorName: 'Demo Author',
      draftAttachments: [artDraft],
      createForumPostEntity: null,
    });

    assert.equal(postOutcome.success, true);
    assert.ok(postOutcome.createdItem?.attachments);
    assert.equal(postOutcome.createdItem.attachments.length, 1);
    assert.equal(postOutcome.createdItem.attachments[0].kind, 'artifact');
    assert.equal(postOutcome.createdItem.attachments[0].featureInLibrary, true);

    const replyImg = CreateDraftFileAttachment({
      fileName: 'reply-img.png',
      mimeType: 'image/png',
      sizeBytes: 1500,
      url: 'https://cdn.example.com/reply-img.png',
      entryType: 'reply',
      sequence: 1,
    }).draft!;

    const replyOutcome = await PersistDetailReply({
      item: postOutcome.createdItem,
      replyBody: 'Adding a visual diagram',
      authorName: 'Demo Reviewer',
      isOfflineDemoMode: true,
      postTypeIdByCode: new Map(),
      currentUserId: null,
      draftAttachments: [replyImg],
      createForumPostEntity: null,
      reloadThreadReplies: null,
    });

    assert.equal(replyOutcome.success, true);
    assert.equal(replyOutcome.replies.length, 1);
    assert.ok(replyOutcome.replies[0].attachments);
    assert.equal(replyOutcome.replies[0].attachments.length, 1);
    assert.equal(replyOutcome.replies[0].attachments[0].featureInLibrary, false);
    assert.equal(replyOutcome.replies[0].attachments[0].folder, 'Post Media');
  });
});

describe('Slice 3 — CommunityAttachmentPickerComponent Architecture, Tokens & Composer Wiring', () => {
  const pickerTs = readFileSync(join(LIB_DIR, 'community-attachment-picker.component.ts'), 'utf8');
  const pickerHtml = readFileSync(join(LIB_DIR, 'community-attachment-picker.component.html'), 'utf8');
  const pickerCss = readFileSync(join(LIB_DIR, 'community-attachment-picker.component.css'), 'utf8');
  const publicApi = readFileSync(join(HERE, 'public-api.ts'), 'utf8');
  const hubHtml = readFileSync(join(LIB_DIR, 'community-hub-resource.component.html'), 'utf8');
  const streamHtml = readFileSync(join(LIB_DIR, 'knowledge-stream.component.html'), 'utf8');

  it('exports standalone OnPush CommunityAttachmentPickerComponent and uses --mj-* design tokens exclusively', () => {
    assert.match(pickerTs, /standalone:\s*true/);
    assert.match(pickerTs, /selector:\s*'mjc-attachment-picker'/);
    assert.match(pickerTs, /changeDetection:\s*ChangeDetectionStrategy\.OnPush/);
    assert.match(publicApi, /community-attachment-picker\.component/);
    assert.match(publicApi, /community-attachment-picker\.ts/);

    const rawColorPattern = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g;
    assert.deepEqual(pickerCss.match(rawColorPattern) ?? [], []);
    assert.deepEqual(pickerHtml.match(rawColorPattern) ?? [], []);
    assert.deepEqual(pickerTs.match(rawColorPattern) ?? [], []);
  });

  it('includes file dropzone, searchable MJ Artifact picker, version pin, reorder/caption/remove controls & helper copy', () => {
    assert.match(pickerHtml, /Attach Media \/ Files/);
    assert.match(pickerHtml, /Embed MJ Artifact/);
    assert.match(pickerHtml, /\(drop\)="onDrop\(\$event\)"/);
    assert.match(pickerHtml, /Feature in Space Library/);
    assert.ok(PICKER_HELPER_LIBRARY_COPY.includes('Library -> Media & Files'));
  });

  it('wires <mjc-attachment-picker> into + New Post modal, inline quick reply, and Full-Page Thread View reply composer', () => {
    // + New Post modal
    assert.match(hubHtml, /<mjc-attachment-picker[\s\S]*askShareAttachments/);
    // Full-Page Thread View reply composer
    assert.match(hubHtml, /<mjc-attachment-picker[\s\S]*detailReplyAttachments/);
    // Inline quick reply composer inside expanded feed threads
    assert.match(streamHtml, /<mjc-attachment-picker[\s\S]*getInlineReplyAttachments\(item\.id\)/);
  });
});
