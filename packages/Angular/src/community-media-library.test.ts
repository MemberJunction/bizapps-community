import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ResolveAuthoritativeFileUrl, SanitizeCommunityAttachmentUrl } from '@mj-biz-apps/community-core';
import type { CommunityCommonsItem } from './lib/community-hub-commons.ts';
import {
  COMMUNITY_HUB_PREFERENCE_KEYS,
  CommunityHubPreferences,
  type IUserPreferenceStore,
} from './lib/community-hub-preferences.ts';
import {
  BuildMediaLibraryEntries,
  ComputeMediaLibraryCounts,
  FilterMediaLibraryEntries,
  MEDIA_LIBRARY_KIND_OPTIONS,
  MEDIA_LIBRARY_SCOPE_OPTIONS,
  PartitionMediaLibraryForDisplay,
} from './lib/community-media-library.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIB_DIR = join(HERE, 'lib');

const USER_1 = '11111111-1111-4111-8111-111111111111';
const USER_2 = '22222222-2222-4222-8222-222222222222';
const SPACE_1 = '33333333-3333-4333-8333-000000000001';
const SPACE_2 = '33333333-3333-4333-8333-000000000002';

function createFakeStore(): { store: IUserPreferenceStore; data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    store: {
      GetSetting: (key: string) => data.get(key),
      SetSetting: async (key: string, value: string) => {
        data.set(key, value);
        return true;
      },
      SetSettingDebounced: (key: string, value: string) => {
        data.set(key, value);
      },
    },
  };
}

function buildSampleCommonsItems(): CommunityCommonsItem[] {
  return [
    {
      id: 'item-post-1',
      title: 'Zero-Downtime API Key Rotation Playbook',
      excerpt: 'Key rollover sequence across regions.',
      bodyMarkdown: 'Full details',
      spaceId: SPACE_1,
      spaceLabel: 'Customer Success Community',
      streamType: 'post',
      entryTypeLabel: 'Discussion Post',
      statusBadge: 'Discussion',
      statusTone: 'brand',
      epistemicStatus: null,
      confidenceScore: null,
      authorName: 'Amith',
      authorRole: 'Member',
      authorInitials: 'AM',
      timestampLabel: 'Today',
      tags: ['API Security'],
      upvoteCount: 3,
      upvotedByMe: false,
      replyCount: 1,
      graduatedToDeliverable: false,
      deliverableTitle: null,
      sourceTab: 'knowledge-stream',
      sourcePostId: '44444444-4444-4444-8444-000000000001',
      attachments: [
        {
          id: 'att-img-1',
          kind: 'image',
          spaceId: SPACE_1,
          postId: '44444444-4444-4444-8444-000000000001',
          fileName: 'dual-key-cutover.png',
          mimeType: 'image/png',
          sizeBytes: 24576,
          url: 'https://cdn.example.com/dual-key-cutover.png',
          caption: 'Dual-key grace period topology',
          sequence: 1,
          featureInLibrary: false,
          folder: 'Post Media',
          authorUserId: USER_1,
          authorName: 'Amith',
        },
        {
          id: 'att-art-1',
          kind: 'artifact',
          spaceId: SPACE_1,
          postId: '44444444-4444-4444-8444-000000000001',
          artifactId: 'aaaa0000-0000-4000-8000-000000000001',
          artifactTypeName: 'HTML',
          artifactName: 'Multi-Region Rollover Latency Report',
          previewContent: '<div>p95 42ms</div>',
          contentType: 'text/html',
          versionNumber: 2,
          caption: 'Live regional cutover telemetry',
          sequence: 2,
          featureInLibrary: true,
          folder: 'Library',
          authorUserId: USER_1,
          authorName: 'Amith',
        },
      ],
      replies: [
        {
          id: '44444444-4444-4444-8444-000000000011',
          authorName: 'Jordan',
          authorRole: 'Architect',
          authorInitials: 'JO',
          timestampLabel: 'Published',
          bodyMarkdown: 'Attached staging audio walkthrough + compliance PDF.',
          isAccepted: false,
          upvotes: 1,
          attachments: [
            {
              id: 'att-audio-1',
              kind: 'audio',
              spaceId: SPACE_1,
              postId: '44444444-4444-4444-8444-000000000011',
              fileName: 'staging-walkthrough.wav',
              mimeType: 'audio/wav',
              sizeBytes: 48000,
              url: 'https://cdn.example.com/staging-walkthrough.wav',
              durationSeconds: 74,
              caption: 'Voice memo from staging rehearsal',
              sequence: 1,
              featureInLibrary: false,
              folder: 'Post Media',
              authorUserId: USER_2,
              authorName: 'Jordan',
            },
            {
              id: 'att-file-1',
              kind: 'file',
              spaceId: SPACE_1,
              postId: '44444444-4444-4444-8444-000000000011',
              fileName: 'soc2-rotation-audit.pdf',
              mimeType: 'application/pdf',
              sizeBytes: 120000,
              url: 'https://cdn.example.com/soc2-rotation-audit.pdf',
              caption: 'SOC2 audit verification checklist',
              sequence: 2,
              featureInLibrary: true,
              folder: 'Library',
              authorUserId: USER_2,
              authorName: 'Jordan',
            },
          ],
        },
      ],
    },
    {
      id: 'item-post-2',
      title: 'Space 2 Enclave Video Briefing',
      excerpt: 'Video walkthrough.',
      bodyMarkdown: 'Video details',
      spaceId: SPACE_2,
      spaceLabel: 'Internal Security Guild',
      streamType: 'post',
      entryTypeLabel: 'Discussion Post',
      statusBadge: 'Discussion',
      statusTone: 'brand',
      epistemicStatus: null,
      confidenceScore: null,
      authorName: 'Jordan',
      authorRole: 'Security',
      authorInitials: 'JO',
      timestampLabel: 'Today',
      tags: [],
      upvoteCount: 1,
      upvotedByMe: false,
      replyCount: 0,
      replies: [],
      graduatedToDeliverable: false,
      deliverableTitle: null,
      sourceTab: 'knowledge-stream',
      sourcePostId: '44444444-4444-4444-8444-000000000002',
      attachments: [
        {
          id: 'att-video-1',
          kind: 'video',
          spaceId: SPACE_2,
          postId: '44444444-4444-4444-8444-000000000002',
          fileName: 'enclave-demo.mp4',
          mimeType: 'video/mp4',
          sizeBytes: 204800,
          url: 'https://cdn.example.com/enclave-demo.mp4',
          durationSeconds: 132,
          caption: 'Hardware enclave failover recording',
          sequence: 1,
          featureInLibrary: false,
          folder: 'Post Media',
          authorUserId: USER_2,
          authorName: 'Jordan',
        },
      ],
    },
  ];
}

describe('Slice 4 — Auto-Indexed Space Media & Artifacts Library Indexing & Filtering', () => {
  it('auto-indexes every image, video, audio track, MJ Artifact, and file across posts and replies', () => {
    const items = buildSampleCommonsItems();
    const entries = BuildMediaLibraryEntries({
      commonsItems: items,
      currentUserId: USER_1,
      authoredPostIds: new Set(['44444444-4444-4444-8444-000000000001']),
    });

    assert.equal(entries.length, 5);
    assert.deepEqual(
      entries.map((e) => e.kind),
      ['image', 'artifact', 'audio', 'file', 'video'],
    );

    const replyAudio = entries.find((e) => e.id === 'att-audio-1');
    assert.ok(replyAudio);
    assert.equal(replyAudio.isReplyAttachment, true);
    assert.equal(replyAudio.sourceItemId, 'item-post-1');
    assert.equal(replyAudio.postTitle, 'Zero-Downtime API Key Rotation Playbook');
    assert.equal(replyAudio.isMyUpload, false);

    const myImage = entries.find((e) => e.id === 'att-img-1');
    assert.ok(myImage);
    assert.equal(myImage.isMyUpload, true);
    assert.equal(myImage.featureInLibrary, false);

    const featuredArt = entries.find((e) => e.id === 'att-art-1');
    assert.ok(featuredArt);
    assert.equal(featuredArt.featureInLibrary, true);
    assert.equal(featuredArt.artifactPreview?.format, 'html');
  });

  it('filters by Space, type pills, scope pills (Featured Library / My Uploads), and search query', () => {
    const entries = BuildMediaLibraryEntries({
      commonsItems: buildSampleCommonsItems(),
      currentUserId: USER_1,
    });

    // Space filter
    const space2Only = FilterMediaLibraryEntries(entries, {
      spaceFilter: SPACE_2,
      kindFilter: 'all',
      scopeFilter: 'all',
      searchQuery: '',
    });
    assert.equal(space2Only.length, 1);
    assert.equal(space2Only[0].kind, 'video');

    // Type filter pills
    const artifactsOnly = FilterMediaLibraryEntries(entries, {
      spaceFilter: 'all',
      kindFilter: 'artifact',
      scopeFilter: 'all',
      searchQuery: '',
    });
    assert.equal(artifactsOnly.length, 1);
    assert.equal(artifactsOnly[0].title, 'Multi-Region Rollover Latency Report');

    // Featured Library scope
    const featured = FilterMediaLibraryEntries(entries, {
      spaceFilter: 'all',
      kindFilter: 'all',
      scopeFilter: 'featured',
      searchQuery: '',
    });
    assert.deepEqual(
      featured.map((e) => e.id),
      ['att-art-1', 'att-file-1'],
    );

    // My Uploads scope
    const mine = FilterMediaLibraryEntries(entries, {
      spaceFilter: 'all',
      kindFilter: 'all',
      scopeFilter: 'my-uploads',
      searchQuery: '',
    });
    assert.deepEqual(
      mine.map((e) => e.id),
      ['att-img-1', 'att-art-1'],
    );

    // Search by filename, caption, and source post title
    const byCaption = FilterMediaLibraryEntries(entries, {
      spaceFilter: 'all',
      kindFilter: 'all',
      scopeFilter: 'all',
      searchQuery: 'staging rehearsal',
    });
    assert.deepEqual(
      byCaption.map((e) => e.id),
      ['att-audio-1'],
    );

    const byPostTitle = FilterMediaLibraryEntries(entries, {
      spaceFilter: 'all',
      kindFilter: 'all',
      scopeFilter: 'all',
      searchQuery: 'Key Rotation Playbook',
    });
    assert.equal(byPostTitle.length, 4);

    // Counts reconcile accurately
    const counts = ComputeMediaLibraryCounts(entries, {
      spaceFilter: SPACE_1,
      kindFilter: 'all',
      scopeFilter: 'all',
      searchQuery: '',
    });
    assert.equal(counts.kindCounts.all, 4);
    assert.equal(counts.kindCounts.image, 1);
    assert.equal(counts.kindCounts.artifact, 1);
    assert.equal(counts.kindCounts.audio, 1);
    assert.equal(counts.kindCounts.file, 1);
    assert.equal(counts.kindCounts.video, 0);
    assert.equal(counts.scopeCounts.featured, 2);
    assert.equal(counts.scopeCounts.myUploads, 2);

    // Partition separates visual grid (images/videos) from resource cards (audio/artifacts/files)
    const partitioned = PartitionMediaLibraryForDisplay(entries);
    assert.deepEqual(
      partitioned.visualGrid.map((e) => e.kind),
      ['image', 'video'],
    );
    assert.deepEqual(
      partitioned.resourceCards.map((e) => e.kind),
      ['artifact', 'audio', 'file'],
    );
  });

  it('sanitizes unsafe URLs when indexing attachments into the library', () => {
    const items = buildSampleCommonsItems();
    items[0].attachments = [
      {
        id: 'att-xss',
        kind: 'image',
        spaceId: SPACE_1,
        postId: '44444444-4444-4444-8444-000000000001',
        fileName: 'xss.png',
        mimeType: 'image/png',
        sizeBytes: 100,
        url: 'javascript:alert(1)',
        sequence: 1,
        featureInLibrary: false,
        folder: 'Post Media',
      },
    ];
    const entries = BuildMediaLibraryEntries({ commonsItems: items, currentUserId: USER_1 });
    const xssEntry = entries.find((e) => e.id === 'att-xss');
    assert.ok(xssEntry);
    assert.equal(xssEntry.safeUrl, null);
  });
});

describe('Slice 4 — UserInfoEngine Preference Persistence & Media Library Architecture', () => {
  it('persists media-library tab and library filters via UserInfoEngine preference store (never localStorage)', async () => {
    const { store, data } = createFakeStore();
    const prefs = new CommunityHubPreferences(store);

    await prefs.SetActiveTab('media-library');
    await prefs.SetMediaLibraryKind('artifact');
    await prefs.SetMediaLibraryScope('my-uploads');

    assert.equal(data.get(COMMUNITY_HUB_PREFERENCE_KEYS.activeTab), 'media-library');
    assert.equal(prefs.GetActiveTab(), 'media-library');
    assert.equal(prefs.GetMediaLibraryKind(), 'artifact');
    assert.equal(prefs.GetMediaLibraryScope(), 'my-uploads');
  });

  it('declares all required filter/scope options and exports OnPush CommunityMediaLibraryComponent with --mj-* tokens only', () => {
    assert.deepEqual(
      MEDIA_LIBRARY_KIND_OPTIONS.map((o) => o.label),
      ['All', 'Images', 'Video', 'Audio', 'Artifacts', 'Files'],
    );
    assert.deepEqual(
      MEDIA_LIBRARY_SCOPE_OPTIONS.map((o) => o.label),
      ['All Media & Files', 'Featured Library', 'My Uploads'],
    );

    const libTs = readFileSync(join(LIB_DIR, 'community-media-library.component.ts'), 'utf8');
    const libHtml = readFileSync(join(LIB_DIR, 'community-media-library.component.html'), 'utf8');
    const libCss = readFileSync(join(LIB_DIR, 'community-media-library.component.css'), 'utf8');
    const libLogicTs = readFileSync(join(LIB_DIR, 'community-media-library.ts'), 'utf8');
    const hubTs = readFileSync(join(LIB_DIR, 'community-hub-resource.component.ts'), 'utf8');
    const hubHtml = readFileSync(join(LIB_DIR, 'community-hub-resource.component.html'), 'utf8');
    const publicApi = readFileSync(join(HERE, 'public-api.ts'), 'utf8');

    assert.match(libTs, /standalone:\s*true/);
    assert.match(libTs, /selector:\s*'mjc-media-library'/);
    assert.match(libTs, /changeDetection:\s*ChangeDetectionStrategy\.OnPush/);
    assert.match(publicApi, /community-media-library\.component/);
    assert.match(publicApi, /community-media-library\.ts/);

    assert.match(hubTs, /key:\s*'media-library',\s*label:\s*'Library',\s*icon:\s*'fa-solid fa-photo-film'/);
    assert.match(hubHtml, /<mjc-media-library/);
    assert.match(libHtml, /View in Thread →/);
    assert.match(libHtml, /sandbox="allow-scripts"/);

    const rawColorPattern = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g;
    for (const [name, content] of [
      ['community-media-library.component.ts', libTs],
      ['community-media-library.component.html', libHtml],
      ['community-media-library.component.css', libCss],
      ['community-media-library.ts', libLogicTs],
    ]) {
      assert.deepEqual(content.match(rawColorPattern) ?? [], [], `${name} must use --mj-* tokens exclusively`);
    }
  });

  it('CR-7: resolves real-schema MJ: Files ProviderKey URLs (/api/files/<ID>) and omits truncated MJ: Files Fields in hub hydration', () => {
    const fileId = 'ffffffff-8888-4888-8888-000000000009';
    const resolvedUrl = ResolveAuthoritativeFileUrl(
      {
        ID: fileId,
        Name: 'real-schema.png',
        ContentType: 'image/png',
        ProviderKey: 'community/spaces/real-schema.png',
        Status: 'Uploaded',
      },
      'image',
    );
    assert.equal(resolvedUrl, `/api/files/${fileId}`);
    assert.equal(SanitizeCommunityAttachmentUrl(resolvedUrl, 'image'), `/api/files/${fileId}`);

    const hubTs = readFileSync(join(LIB_DIR, 'community-hub-resource.component.ts'), 'utf8');
    assert.match(hubTs, /ResolveAuthoritativeFileUrl/);
    assert.match(hubTs, /companionVersionByFileId/);
    assert.doesNotMatch(hubTs, /entityName:\s*'MJ: Files',\s*[\r\n]+[^\}]*fields:\s*\[/);
  });
});
