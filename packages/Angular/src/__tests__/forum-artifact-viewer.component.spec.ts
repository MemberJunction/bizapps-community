import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UserInfo, type RunViewParams, type RunViewResult } from '@memberjunction/core';
import {
  BuildArtifactFallbackModel,
  BuildValidatedUuidInFilter,
  ChunkArtifactIds,
  CommunityArtifactViewerController,
  ExtractResolvedMetadataFromBatch,
  LoadBatchedArtifactsMetadata,
  MapArtifactModalityToPostTypeCode,
  MapCollaborationModeToViewerMode,
  ResolveArtifactViewerState,
  type BatchedArtifactMetadataRow,
  type BatchedArtifactVersionRow,
  type CommunityArtifactRunViewLike,
  type CommunityArtifactViewerRequest,
} from '../lib/community-artifact-viewer.ts';
import {
  COMMUNITY_HUB_PREFERENCE_KEYS,
  CommunityHubPreferences,
  type IUserPreferenceStore,
} from '../lib/community-hub-preferences.ts';
import { BuildCommonsStreamItems } from '../lib/community-hub-commons.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIB_DIR = join(HERE, '..', 'lib');

const ARTIFACT_ID_1 = '11111111-1111-4111-8111-000000000001';
const ARTIFACT_ID_2 = '11111111-1111-4111-8111-000000000002';
const ARTIFACT_ID_MISSING = '11111111-1111-4111-8111-000000000099';
const VERSION_ID_1 = '22222222-2222-4222-8222-000000000001';
const VERSION_ID_2 = '22222222-2222-4222-8222-000000000002';
const VERSION_ID_OTHER = '22222222-2222-4222-8222-000000000099';
const POST_ID_1 = '33333333-3333-4333-8333-000000000001';
const POST_ID_2 = '33333333-3333-4333-8333-000000000002';
const TEST_USER = new UserInfo(undefined, { ID: '44444444-4444-4444-8444-000000000001', Name: 'Test Member' });

function createFakePreferences(): {
  preferences: CommunityHubPreferences;
  data: Map<string, string>;
} {
  const data = new Map<string, string>();
  const store: IUserPreferenceStore = {
    GetSetting: (key: string) => data.get(key),
    SetSetting: async (key: string, value: string) => {
      data.set(key, value);
      return true;
    },
    SetSettingDebounced: (key: string, value: string) => {
      data.set(key, value);
    },
  };
  return { preferences: new CommunityHubPreferences(store), data };
}

describe('CommunityArtifactViewer — Batched RunView UUID Filtering & Chunking', () => {
  it('short-circuits with filter=null and 0 RunView calls when ID list is empty or contains only invalid IDs', async () => {
    let runViewCalls = 0;
    let runViewsCalls = 0;
    const rv: CommunityArtifactRunViewLike = {
      RunView: async <T>(_params: RunViewParams): Promise<RunViewResult<T>> => {
        runViewCalls += 1;
        return { Success: true, Results: [] } as RunViewResult<T>;
      },
      RunViews: async <T>(_params: RunViewParams[]): Promise<RunViewResult<T>[]> => {
        runViewsCalls += 1;
        return [];
      },
    };

    const emptyFilter = BuildValidatedUuidInFilter('ID', [], 'artifactId');
    assert.equal(emptyFilter.filter, null);
    assert.deepEqual(emptyFilter.validIds, []);

    const invalidOnly = BuildValidatedUuidInFilter(
      'ID',
      [null, undefined, '', 'not-a-uuid', "'; DROP TABLE ForumPost; --"],
      'artifactId',
    );
    assert.equal(invalidOnly.filter, null);
    assert.equal(invalidOnly.validIds.length, 0);
    assert.equal(invalidOnly.invalidIds.length, 2);

    const loadRes = await LoadBatchedArtifactsMetadata({
      runView: rv,
      artifactIds: ['', 'invalid-id'],
      pinnedVersionIds: [null],
      user: TEST_USER,
    });
    assert.equal(loadRes.success, true);
    assert.equal(loadRes.queryCount, 0);
    assert.equal(runViewCalls, 0);
    assert.equal(runViewsCalls, 0);
  });

  it('deduplicates UUIDs case-insensitively and executes a single batched RunViews call with ResultType simple and ID IN (...)', async () => {
    const capturedBatches: RunViewParams[][] = [];
    const rv: CommunityArtifactRunViewLike = {
      RunView: async <T>(_params: RunViewParams): Promise<RunViewResult<T>> => {
        throw new Error('Expected RunViews batch for multi-query metadata lookup');
      },
      RunViews: async <T>(paramsList: RunViewParams[]): Promise<RunViewResult<T>[]> => {
        capturedBatches.push(paramsList);
        return paramsList.map((p) => {
          if (p.EntityName === 'MJ: Artifacts') {
            const rows: BatchedArtifactMetadataRow[] = [
              { ID: ARTIFACT_ID_1, Name: 'Architecture Playbook', Type: 'Document', Description: '### Overview\n**Bold** summary' },
              { ID: ARTIFACT_ID_2, Name: 'Capacity Simulator', Type: 'Component', Description: 'Interactive widget' },
            ];
            return { Success: true, Results: rows as T[] } as RunViewResult<T>;
          }
          const rows: BatchedArtifactVersionRow[] = [
            { ID: VERSION_ID_1, ArtifactID: ARTIFACT_ID_1, VersionNumber: 3, Name: 'v3 Release', ContentMode: 'Text' },
            { ID: VERSION_ID_2, ArtifactID: ARTIFACT_ID_2, VersionNumber: 2, Name: 'v2 Widget', ContentMode: 'Text' },
          ];
          return { Success: true, Results: rows as T[] } as RunViewResult<T>;
        });
      },
    };

    const res = await LoadBatchedArtifactsMetadata({
      runView: rv,
      artifactIds: [ARTIFACT_ID_1, ARTIFACT_ID_1.toUpperCase(), ARTIFACT_ID_2],
      pinnedVersionIds: [VERSION_ID_1, VERSION_ID_2, VERSION_ID_1.toUpperCase()],
      user: TEST_USER,
    });

    assert.equal(res.success, true);
    assert.equal(capturedBatches.length, 1);
    assert.equal(capturedBatches[0].length, 2);

    const [artQuery, verQuery] = capturedBatches[0];
    assert.equal(artQuery.EntityName, 'MJ: Artifacts');
    assert.equal(artQuery.ResultType, 'simple');
    assert.equal(artQuery.ExtraFilter, `ID IN ('${ARTIFACT_ID_1}','${ARTIFACT_ID_2}')`);
    assert.equal(artQuery.MaxRows, 2);

    assert.equal(verQuery.EntityName, 'MJ: Artifact Versions');
    assert.equal(verQuery.ResultType, 'simple');
    assert.equal(verQuery.ExtraFilter, `ID IN ('${VERSION_ID_1}','${VERSION_ID_2}')`);
    assert.equal(verQuery.MaxRows, 2);

    assert.equal(res.artifactsById.get(ARTIFACT_ID_1)?.Name, 'Architecture Playbook');
    assert.equal(res.versionsById.get(VERSION_ID_1)?.VersionNumber, 3);
    assert.equal(res.versionsById.get(VERSION_ID_2)?.VersionNumber, 2);

    const extracted = ExtractResolvedMetadataFromBatch({
      postTitle: 'Fallback Title',
      artifactId: ARTIFACT_ID_1,
      pinnedArtifactVersionId: VERSION_ID_1,
      batch: res,
    });
    assert.ok(extracted);
    assert.equal(extracted.pinnedVersionNumber, 3);
    assert.doesNotMatch(extracted.previewPlainExcerpt, /###|\*\*/);
  });

  it('chunks large ID sets by chunkSize to keep IN (...) clauses bounded', async () => {
    const chunks = ChunkArtifactIds([1, 2, 3, 4, 5], 2);
    assert.deepEqual(chunks, [[1, 2], [3, 4], [5]]);

    const capturedFilters: string[] = [];
    const rv: CommunityArtifactRunViewLike = {
      RunView: async <T>(p: RunViewParams): Promise<RunViewResult<T>> => {
        capturedFilters.push(p.ExtraFilter ?? '');
        return { Success: true, Results: [] } as RunViewResult<T>;
      },
    };

    const res = await LoadBatchedArtifactsMetadata({
      runView: rv,
      artifactIds: [ARTIFACT_ID_1, ARTIFACT_ID_2, ARTIFACT_ID_MISSING],
      chunkSize: 2,
      user: TEST_USER,
    });

    assert.equal(res.success, true);
    assert.equal(res.queryCount, 2);
    assert.equal(capturedFilters.length, 2);
    assert.equal(capturedFilters[0], `ID IN ('${ARTIFACT_ID_1}','${ARTIFACT_ID_2}')`);
    assert.equal(capturedFilters[1], `ID IN ('${ARTIFACT_ID_MISSING}')`);
  });
});

describe('CommunityArtifactViewer — State Transitions, PinnedVersion Pass-Through & Fallback', () => {
  it('transitions closed -> loading -> ready and passes resolved VersionNumber from PinnedArtifactVersionID for ForumArtifactPost and ForumInteractivePost', async () => {
    const { preferences, data } = createFakePreferences();
    const controller = new CommunityArtifactViewerController(preferences);
    assert.equal(controller.snapshot.state, 'closed');

    let releaseLoader: (() => void) | null = null;
    const gate = new Promise<void>((resolve) => {
      releaseLoader = resolve;
    });

    const artifactPostRequest: CommunityArtifactViewerRequest = {
      postId: POST_ID_1,
      postTitle: 'OAuth2 Partner Playbook',
      postKind: 'artifact-post',
      artifactId: ARTIFACT_ID_1,
      pinnedArtifactVersionId: VERSION_ID_1,
      artifactModality: 'Document',
      collaborationMode: 'Suggest',
      fallbackSummaryMarkdown: '### Summary\nUse **PKCE** callbacks.',
    };

    const openPromise = controller.open(artifactPostRequest, {
      loader: async () => {
        await gate;
        return {
          success: true,
          artifactsById: new Map([
            [ARTIFACT_ID_1, { ID: ARTIFACT_ID_1, Name: 'OAuth2 Playbook Doc', Type: 'Document', Description: '## PKCE Guide' }],
          ]),
          versionsById: new Map([
            [VERSION_ID_1, { ID: VERSION_ID_1, ArtifactID: ARTIFACT_ID_1, VersionNumber: 4, Name: 'v4 Approved' }],
          ]),
          invalidArtifactIds: [],
          invalidVersionIds: [],
          queryCount: 2,
        };
      },
    });

    assert.equal(controller.snapshot.state, 'loading');
    releaseLoader!();
    const readySnap = await openPromise;

    assert.equal(readySnap.state, 'ready');
    assert.equal(readySnap.resolved?.artifactId, ARTIFACT_ID_1);
    assert.equal(readySnap.resolved?.pinnedVersionId, VERSION_ID_1);
    assert.equal(readySnap.effectiveVersionNumber, 4);
    assert.equal(readySnap.fallback, null);

    // ForumInteractivePost with ComponentArtifactID + PinnedArtifactVersionID
    const interactiveRequest: CommunityArtifactViewerRequest = {
      postId: POST_ID_2,
      postTitle: 'SLA Capacity Simulator',
      postKind: 'interactive-post',
      artifactId: ARTIFACT_ID_2,
      pinnedArtifactVersionId: VERSION_ID_2,
      experienceKind: 'Calculator',
    };
    const interactiveSnap = await controller.open(interactiveRequest, {
      loader: async () => ({
        success: true,
        artifactsById: new Map([
          [ARTIFACT_ID_2, { ID: ARTIFACT_ID_2, Name: 'SLA Simulator Component', Type: 'Component' }],
        ]),
        versionsById: new Map([
          [VERSION_ID_2, { ID: VERSION_ID_2, ArtifactID: ARTIFACT_ID_2, VersionNumber: 2, Name: 'v2' }],
        ]),
        invalidArtifactIds: [],
        invalidVersionIds: [],
        queryCount: 2,
      }),
    });
    assert.equal(interactiveSnap.state, 'ready');
    assert.equal(interactiveSnap.request?.postKind, 'interactive-post');
    assert.equal(interactiveSnap.resolved?.artifactId, ARTIFACT_ID_2);
    assert.equal(interactiveSnap.effectiveVersionNumber, 2);

    // Maximized preference persists through UserInfoEngine-backed store
    const maxOn = await controller.toggleMaximized();
    assert.equal(maxOn, true);
    assert.equal(data.get(COMMUNITY_HUB_PREFERENCE_KEYS.artifactViewerMaximized), 'true');

    // Escape closes the open viewer cleanly
    assert.equal(controller.handleKeydown('Enter'), false);
    assert.equal(controller.handleKeydown('Escape'), true);
    assert.equal(controller.snapshot.state, 'closed');
    assert.equal(controller.snapshot.request, null);
    assert.equal(controller.handleKeydown('Escape'), false);
  });

  it('discards stale async responses when rapidly switching cards or pressing Escape mid-load', async () => {
    const controller = new CommunityArtifactViewerController();
    let resolveFirst: (() => void) | null = null;
    const firstGate = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });

    const firstOpen = controller.open(
      {
        postId: POST_ID_1,
        postTitle: 'Slow Card 1',
        postKind: 'artifact-post',
        artifactId: ARTIFACT_ID_1,
        pinnedArtifactVersionId: VERSION_ID_1,
      },
      {
        loader: async () => {
          await firstGate;
          return {
            success: true,
            artifactsById: new Map([[ARTIFACT_ID_1, { ID: ARTIFACT_ID_1, Name: 'Stale Doc 1', Type: 'Document' }]]),
            versionsById: new Map([[VERSION_ID_1, { ID: VERSION_ID_1, ArtifactID: ARTIFACT_ID_1, VersionNumber: 1, Name: 'v1' }]]),
            invalidArtifactIds: [],
            invalidVersionIds: [],
            queryCount: 2,
          };
        },
      },
    );

    // Immediately switch to Card 2 before Card 1 resolves
    const secondSnap = await controller.open(
      {
        postId: POST_ID_2,
        postTitle: 'Fast Card 2',
        postKind: 'artifact-post',
        artifactId: ARTIFACT_ID_2,
        pinnedArtifactVersionId: VERSION_ID_2,
      },
      {
        loader: async () => ({
          success: true,
          artifactsById: new Map([[ARTIFACT_ID_2, { ID: ARTIFACT_ID_2, Name: 'Fresh Doc 2', Type: 'Document' }]]),
          versionsById: new Map([[VERSION_ID_2, { ID: VERSION_ID_2, ArtifactID: ARTIFACT_ID_2, VersionNumber: 5, Name: 'v5' }]]),
          invalidArtifactIds: [],
          invalidVersionIds: [],
          queryCount: 2,
        }),
      },
    );

    assert.equal(secondSnap.state, 'ready');
    assert.equal(secondSnap.resolved?.artifactId, ARTIFACT_ID_2);
    assert.equal(secondSnap.effectiveVersionNumber, 5);

    // Now let stale Card 1 resolve — it must NOT overwrite Card 2
    resolveFirst!();
    await firstOpen;
    assert.equal(controller.snapshot.resolved?.artifactId, ARTIFACT_ID_2);
    assert.equal(controller.snapshot.effectiveVersionNumber, 5);

    // Pressing Escape mid-load keeps viewer closed when response arrives later
    let resolveThird: (() => void) | null = null;
    const thirdGate = new Promise<void>((resolve) => {
      resolveThird = resolve;
    });
    const thirdOpen = controller.open(
      {
        postId: POST_ID_1,
        postTitle: 'Cancelled Card',
        postKind: 'artifact-post',
        artifactId: ARTIFACT_ID_1,
      },
      {
        loader: async () => {
          await thirdGate;
          return {
            success: true,
            artifactsById: new Map([[ARTIFACT_ID_1, { ID: ARTIFACT_ID_1, Name: 'Should Ignore', Type: 'Document' }]]),
            versionsById: new Map(),
            invalidArtifactIds: [],
            invalidVersionIds: [],
            queryCount: 1,
          };
        },
      },
    );
    assert.equal(controller.handleKeydown('Escape'), true);
    assert.equal(controller.snapshot.state, 'closed');
    resolveThird!();
    await thirdOpen;
    assert.equal(controller.snapshot.state, 'closed');
  });

  it('renders graceful missing-artifact and invalid-pinned-version fallbacks with zero raw markdown tokens', () => {
    const rawMd = '### Heading Title\n**Bold warning** and `inline code`\n```ts\nconst x = 1;\n```';

    // 1. Missing ArtifactID
    const missingId = ResolveArtifactViewerState({
      request: {
        postId: POST_ID_1,
        postTitle: 'Broken Link Post',
        postKind: 'artifact-post',
        artifactId: null,
        fallbackSummaryMarkdown: rawMd,
      },
      artifactsById: new Map(),
      versionsById: new Map(),
    });
    assert.equal(missingId.state, 'missing');
    assert.equal(missingId.fallback?.reason, 'missing-artifact-id');
    assert.doesNotMatch(missingId.fallback?.plainSummary ?? '', /###|\*\*|```/);
    assert.match(missingId.fallback?.plainSummary ?? '', /Heading Title/);

    // 2. Deleted / revoked artifact not returned by RLS-filtered RunView
    const revoked = ResolveArtifactViewerState({
      request: {
        postId: POST_ID_1,
        postTitle: 'Revoked Artifact Post',
        postKind: 'artifact-post',
        artifactId: ARTIFACT_ID_MISSING,
        fallbackSummaryMarkdown: rawMd,
      },
      artifactsById: new Map(),
      versionsById: new Map(),
    });
    assert.equal(revoked.state, 'missing');
    assert.equal(revoked.fallback?.reason, 'artifact-not-found');
    assert.doesNotMatch(revoked.fallback?.plainSummary ?? '', /###|\*\*|```/);

    // 3. PinnedArtifactVersionID belongs to a DIFFERENT artifact -> fail closed to fallback
    const mismatchedVersion = ResolveArtifactViewerState({
      request: {
        postId: POST_ID_1,
        postTitle: 'Cross-Artifact Pinned Version',
        postKind: 'artifact-post',
        artifactId: ARTIFACT_ID_1,
        pinnedArtifactVersionId: VERSION_ID_OTHER,
        fallbackSummaryMarkdown: rawMd,
      },
      artifactsById: new Map([[ARTIFACT_ID_1, { ID: ARTIFACT_ID_1, Name: 'Doc 1', Type: 'Document' }]]),
      versionsById: new Map([[VERSION_ID_OTHER, { ID: VERSION_ID_OTHER, ArtifactID: ARTIFACT_ID_2, VersionNumber: 9, Name: 'Other' }]]),
    });
    assert.equal(mismatchedVersion.state, 'missing');
    assert.equal(mismatchedVersion.fallback?.reason, 'pinned-version-not-found');

    // 4. Load error fallback
    const errFallback = BuildArtifactFallbackModel({
      reason: 'load-error',
      request: {
        postId: POST_ID_1,
        postTitle: 'Network Error',
        postKind: 'artifact-post',
        artifactId: ARTIFACT_ID_1,
        fallbackSummaryMarkdown: '## Section\n**Important** fallback copy',
      },
      errorMessage: 'GraphQL timeout',
    });
    assert.equal(errFallback.headline, 'Unable to load artifact');
    assert.equal(errFallback.explanation, 'GraphQL timeout');
    assert.doesNotMatch(errFallback.plainSummary, /##|\*\*/);
  });

  it('maps CollaborationMode, ArtifactModality, and BuildCommonsStreamItems artifact fields cleanly', () => {
    assert.equal(MapCollaborationModeToViewerMode('Edit'), 'edit');
    assert.equal(MapCollaborationModeToViewerMode('Suggest'), 'suggest');
    assert.equal(MapCollaborationModeToViewerMode('Comment Only'), undefined);
    assert.equal(MapArtifactModalityToPostTypeCode('Document'), 'collaborative-doc');
    assert.equal(MapArtifactModalityToPostTypeCode('Presentation'), 'collaborative-deck');
    assert.equal(MapArtifactModalityToPostTypeCode('Spreadsheet'), 'collaborative-sheet');

    const stream = BuildCommonsStreamItems({
      feedPosts: [],
      qaCanonItems: [],
      ideationItems: [],
      livingDocItems: [
        {
          id: POST_ID_1,
          title: 'Multi-Region Runbook',
          bodyMarkdown: '### Runbook\n**Verified** steps',
          postTypeCode: 'collaborative-doc',
          artifactId: ARTIFACT_ID_1,
          pinnedArtifactVersionId: VERSION_ID_1,
          pinnedVersionNumber: 3,
          artifactModality: 'Document',
          collaborationMode: 'Suggest',
          isArtifactPost: true,
        },
        {
          id: POST_ID_2,
          title: 'Latency Simulator',
          bodyMarkdown: 'Interactive calculator',
          postTypeCode: 'interactive-experience',
          experienceKind: 'Calculator',
          artifactId: ARTIFACT_ID_2,
          pinnedArtifactVersionId: VERSION_ID_2,
          pinnedVersionNumber: 2,
          isArtifactPost: true,
        },
      ],
    });

    assert.equal(stream.length, 2);
    assert.equal(stream[0].artifactId, ARTIFACT_ID_1);
    assert.equal(stream[0].pinnedArtifactVersionId, VERSION_ID_1);
    assert.equal(stream[0].pinnedVersionNumber, 3);
    assert.equal(stream[0].isArtifactPost, true);
    assert.doesNotMatch(stream[0].excerpt, /###|\*\*/);

    assert.equal(stream[1].artifactId, ARTIFACT_ID_2);
    assert.equal(stream[1].pinnedArtifactVersionId, VERSION_ID_2);
    assert.equal(stream[1].isInteractiveArtifactPost, true);
  });
});

describe('CommunityArtifactViewerComponent — Angular Template & Wiring Verification', () => {
  const viewerTs = readFileSync(join(LIB_DIR, 'community-artifact-viewer.component.ts'), 'utf8');
  const viewerHtml = readFileSync(join(LIB_DIR, 'community-artifact-viewer.component.html'), 'utf8');
  const hubTs = readFileSync(join(LIB_DIR, 'community-hub-resource.component.ts'), 'utf8');
  const hubHtml = readFileSync(join(LIB_DIR, 'community-hub-resource.component.html'), 'utf8');
  const livingHtml = readFileSync(join(LIB_DIR, 'living-co-authoring.component.html'), 'utf8');
  const streamHtml = readFileSync(join(LIB_DIR, 'knowledge-stream.component.html'), 'utf8');

  it('uses OnPush, inject(), ArtifactsModule, @if/@switch, and wraps <mj-artifact-viewer-panel> with VersionNumber pass-through', () => {
    assert.match(viewerTs, /changeDetection:\s*ChangeDetectionStrategy\.OnPush/);
    assert.match(viewerTs, /from\s+'@memberjunction\/ng-artifacts'/);
    assert.match(viewerTs, /imports:\s*\[CommonModule,\s*ArtifactsModule\]/);
    assert.match(viewerTs, /inject\(ChangeDetectorRef\)/);
    assert.match(viewerTs, /inject\(DOCUMENT\)/);
    assert.match(viewerTs, /@HostListener\('document:keydown\.escape'/);
    assert.match(viewerTs, /queueMicrotask\(/);

    assert.match(viewerHtml, /<mj-artifact-viewer-panel/);
    assert.match(viewerHtml, /\[artifactId\]="resolved\.artifactId"/);
    assert.match(viewerHtml, /\[VersionNumber\]="snapshot\.effectiveVersionNumber"/);
    assert.match(viewerHtml, /\[CurrentUser\]="effectiveCurrentUser"/);
    assert.match(viewerHtml, /mjc-artifact-viewer-fallback/);
    assert.match(viewerHtml, /mjc-artifact-viewer-close-btn/);
    assert.match(viewerHtml, /role="dialog"/);
    assert.match(viewerHtml, /aria-modal="true"/);
  });

  it('wires ForumArtifactPost and ForumInteractivePost fields and slide-over/inline viewers across Hub, Feed, and Playbooks', () => {
    assert.match(hubTs, /fields:\s*\['ID',\s*'ArtifactID',\s*'PinnedArtifactVersionID',\s*'ArtifactModality',\s*'CollaborationMode'\]/);
    assert.match(hubTs, /fields:\s*\['ID',\s*'ComponentArtifactID',\s*'PinnedArtifactVersionID',\s*'ExperienceKind'\]/);
    assert.match(hubTs, /LoadBatchedArtifactsMetadata\(/);
    assert.match(hubHtml, /<mjc-community-artifact-viewer[\s\S]*mode="drawer"/);
    assert.match(hubHtml, /<mjc-community-artifact-viewer[\s\S]*mode="inline"/);
    assert.match(livingHtml, /<mjc-community-artifact-viewer[\s\S]*mode="inline"/);
    assert.match(streamHtml, /openArtifactViewer\(item\)/);
  });
});
