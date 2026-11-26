/**
 * Functional Cross-Stack Checks for ForumArtifactPost & ForumInteractivePost Viewing
 *
 * Verifies:
 *   1. Batched RunView (`ResultType: 'simple'`, `ExtraFilter: "ID IN (...)"`, zero N+1 hydrations)
 *   2. Pinned version resolution (`PinnedArtifactVersionID` -> `VersionNumber` pass-through)
 *   3. `ForumInteractivePost` (`ComponentArtifactID` + `PinnedArtifactVersionID`) alignment
 *   4. High-volume relational `ForumPost` reply threading preservation alongside artifact posts
 *   5. Rapid card-switch stale-response cancellation and Escape-to-close dismissal
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  CommunityArtifactViewerController,
  ExtractResolvedMetadataFromBatch,
  LoadBatchedArtifactsMetadata,
  MapArtifactModalityToPostTypeCode,
  MapCollaborationModeToViewerMode,
  ResolveArtifactViewerState,
} from '../../Angular/dist/lib/community-artifact-viewer.js';
import {
  ARTIFACT_WORLD_IDS,
  WORLD_FORUM_ARTIFACT_POSTS,
  WORLD_FORUM_INTERACTIVE_POSTS,
  WORLD_FORUM_POST_REPLIES,
} from '../world/community-artifact-world.mjs';
import { CreateArtifactWorldRunViewProvider } from '../world/community-artifact-world-provider.mjs';

const ID = ARTIFACT_WORLD_IDS;
const UUID_IN_FILTER_RE = /^ID IN \('[0-9a-f-]{36}'(,'[0-9a-f-]{36}')*\)$/i;

export async function RunForumArtifactPostViewerChecks() {
  const results = [];

  // Check 1: Batched RunView (ResultType: 'simple', ExtraFilter: 'ID IN (...)', zero N+1)
  {
    const provider = CreateArtifactWorldRunViewProvider(ID.USER_ELENA);
    const apexArtifactPosts = WORLD_FORUM_ARTIFACT_POSTS.filter((p) => p.OrganizationID === ID.ORG_APEX);
    const apexInteractivePosts = WORLD_FORUM_INTERACTIVE_POSTS.filter((p) => p.OrganizationID === ID.ORG_APEX);

    const artifactIds = [
      ...apexArtifactPosts.map((p) => p.ArtifactID),
      ...apexInteractivePosts.map((p) => p.ComponentArtifactID),
    ];
    const pinnedVersionIds = [
      ...apexArtifactPosts.map((p) => p.PinnedArtifactVersionID),
      ...apexInteractivePosts.map((p) => p.PinnedArtifactVersionID),
    ];

    const batch = await LoadBatchedArtifactsMetadata({
      runView: provider,
      artifactIds,
      pinnedVersionIds,
      user: { ID: ID.USER_ELENA },
    });

    assert.equal(batch.success, true, 'Batched artifact metadata load must succeed');
    assert.equal(batch.queryCount, 2, 'Must execute exactly 2 batched queries (1 Artifacts + 1 Artifact Versions)');
    assert.equal(provider.stats.batchCallCount, 1, 'Must collapse concurrent queries into a single RunViews batch');
    assert.equal(provider.stats.singleCallCount, 0, 'Must issue zero individual N+1 RunView calls');

    for (const q of provider.queryLog) {
      assert.equal(q.resultType, 'simple', `Expected ResultType 'simple' on ${q.entityName}`);
      assert.match(q.extraFilter, UUID_IN_FILTER_RE, `Expected validated ID IN (...) filter on ${q.entityName}`);
      assert.ok(Array.isArray(q.fields) && q.fields.length > 0, `Expected narrow Fields projection on ${q.entityName}`);
    }

    assert.equal(batch.artifactsById.size, 3, 'Expected 3 accessible Apex artifacts resolved in batch');
    assert.equal(batch.versionsById.size, 2, 'Expected 2 valid pinned versions resolved in batch');
    results.push({ check: 'batched-runview-zero-n-plus-1', passed: true, queryCount: batch.queryCount });
  }

  // Check 2: Pinned version resolution (PinnedArtifactVersionID -> VersionNumber pass-through)
  {
    const provider = CreateArtifactWorldRunViewProvider(ID.USER_ELENA);
    const pinnedPost = WORLD_FORUM_ARTIFACT_POSTS.find((p) => p.ID === ID.POST_ART_PINNED);
    const unpinnedPost = WORLD_FORUM_ARTIFACT_POSTS.find((p) => p.ID === ID.POST_ART_UNPINNED);
    assert.ok(pinnedPost && unpinnedPost);

    const batch = await LoadBatchedArtifactsMetadata({
      runView: provider,
      artifactIds: [pinnedPost.ArtifactID, unpinnedPost.ArtifactID],
      pinnedVersionIds: [pinnedPost.PinnedArtifactVersionID, unpinnedPost.PinnedArtifactVersionID],
      user: { ID: ID.USER_ELENA },
    });

    const pinnedResolved = ExtractResolvedMetadataFromBatch({
      postTitle: pinnedPost.Title,
      artifactId: pinnedPost.ArtifactID,
      pinnedArtifactVersionId: pinnedPost.PinnedArtifactVersionID,
      fallbackSummaryMarkdown: pinnedPost.BodyMarkdown,
      batch,
    });
    assert.ok(pinnedResolved, 'Pinned ForumArtifactPost must resolve cleanly');
    assert.equal(
      pinnedResolved.pinnedVersionNumber,
      2,
      'PinnedArtifactVersionID must resolve to VersionNumber 2 (not latest v3)',
    );
    assert.equal(pinnedResolved.pinnedVersionName, 'v2.0 Cutover Verified');
    assert.equal(MapCollaborationModeToViewerMode(pinnedPost.CollaborationMode), 'suggest');
    assert.equal(MapArtifactModalityToPostTypeCode(pinnedPost.ArtifactModality), 'collaborative-doc');

    const unpinnedState = ResolveArtifactViewerState({
      request: {
        postId: unpinnedPost.ID,
        postTitle: unpinnedPost.Title,
        postKind: 'artifact-post',
        artifactId: unpinnedPost.ArtifactID,
        pinnedArtifactVersionId: null,
        artifactModality: unpinnedPost.ArtifactModality,
        collaborationMode: unpinnedPost.CollaborationMode,
      },
      artifactsById: batch.artifactsById,
      versionsById: batch.versionsById,
    });
    assert.equal(unpinnedState.state, 'ready');
    assert.equal(unpinnedState.effectiveVersionNumber, undefined, 'Unpinned post must omit VersionNumber (render latest)');
    assert.equal(MapCollaborationModeToViewerMode(unpinnedPost.CollaborationMode), 'edit');
    assert.equal(MapArtifactModalityToPostTypeCode(unpinnedPost.ArtifactModality), 'collaborative-sheet');

    results.push({ check: 'pinned-version-passthrough', passed: true, pinnedVersionNumber: 2 });
  }

  // Check 3: ForumInteractivePost (ComponentArtifactID + PinnedArtifactVersionID) & Escape-to-close
  {
    const provider = CreateArtifactWorldRunViewProvider(ID.USER_ELENA);
    const interactivePost = WORLD_FORUM_INTERACTIVE_POSTS.find((p) => p.ID === ID.POST_INT_PINNED);
    assert.ok(interactivePost);

    const controller = new CommunityArtifactViewerController();
    const snap = await controller.open(
      {
        postId: interactivePost.ID,
        postTitle: interactivePost.Title,
        postKind: 'interactive-post',
        artifactId: interactivePost.ComponentArtifactID,
        pinnedArtifactVersionId: interactivePost.PinnedArtifactVersionID,
        experienceKind: interactivePost.ExperienceKind,
        fallbackSummaryMarkdown: interactivePost.BodyMarkdown,
      },
      {
        loader: (req) =>
          LoadBatchedArtifactsMetadata({
            runView: provider,
            artifactIds: [req.artifactId],
            pinnedVersionIds: req.pinnedArtifactVersionId ? [req.pinnedArtifactVersionId] : [],
            user: { ID: ID.USER_ELENA },
          }),
      },
    );

    assert.equal(snap.state, 'ready');
    assert.equal(snap.effectiveVersionNumber, 2, 'ForumInteractivePost pinned version must pass through v2');
    assert.equal(snap.resolved?.artifactId, ID.ART_INTERACTIVE_CALC);
    assert.equal(controller.handleKeydown('Escape'), true, 'Escape must dismiss open viewer');
    assert.equal(controller.snapshot.state, 'closed');
    assert.equal(controller.handleKeydown('Escape'), false, 'Repeated Escape while closed must return false');

    results.push({ check: 'interactive-post-pinned-and-escape', passed: true, versionNumber: 2 });
  }

  // Check 4: High-volume relational ForumPost reply threading preservation alongside artifact posts
  {
    const provider = CreateArtifactWorldRunViewProvider(ID.USER_ELENA);
    const targetRoots = [ID.POST_ART_PINNED, ID.POST_ART_UNPINNED, ID.POST_ART_MISSING_REVOKED, ID.POST_INT_PINNED];
    const inClause = targetRoots.map((id) => `'${id}'`).join(',');
    const res = await provider.RunView(
      {
        EntityName: 'MJ_BizApps_Community: Forum Posts',
        ExtraFilter: `RootPostID IN (${inClause})`,
        Fields: ['ID', 'RootPostID', 'ParentPostID', 'ReplyDepth', 'AuthorUserID', 'Status', 'Period', 'BodyMarkdown'],
        ResultType: 'simple',
      },
      { ID: ID.USER_ELENA },
    );

    assert.equal(res.Success, true);
    assert.equal(res.Results.length, 12, 'Expected 12 Apex relational ForumPost replies across 4 artifact/interactive roots');
    const depths = new Set(res.Results.map((r) => r.ReplyDepth));
    assert.ok(depths.has(1) && depths.has(2) && depths.has(3), 'Must preserve multi-level reply depths 1..3');
    const periods = new Set(res.Results.map((r) => r.Period));
    assert.equal(periods.size, 4, 'Replies must span all 4 quarters (2026-Q1..Q4)');

    // Verify replies for the pinned post form a valid parent chain and are NOT stored in MJ: Artifacts
    const pinnedReplies = res.Results.filter((r) => r.RootPostID === ID.POST_ART_PINNED);
    assert.equal(pinnedReplies.length, 5);
    const reply2 = pinnedReplies.find((r) => r.ID === ID.REPLY_02);
    const reply3 = pinnedReplies.find((r) => r.ID === ID.REPLY_03);
    assert.equal(reply2?.ParentPostID, ID.REPLY_01);
    assert.equal(reply3?.ParentPostID, ID.REPLY_02);
    assert.equal(WORLD_FORUM_POST_REPLIES.length, 14);

    results.push({ check: 'relational-reply-threading-preserved', passed: true, replyCount: res.Results.length });
  }

  // Check 5: Rapid card-switch monotonic token discards stale out-of-order responses
  {
    const controller = new CommunityArtifactViewerController();
    let resolveSlow;
    const slowPromise = new Promise((resolve) => {
      resolveSlow = resolve;
    });

    const firstOpen = controller.open(
      {
        postId: ID.POST_ART_PINNED,
        postTitle: 'Slow Card',
        postKind: 'artifact-post',
        artifactId: ID.ART_PLAYBOOK_ROTATION,
        pinnedArtifactVersionId: ID.VER_PLAYBOOK_V2,
      },
      { loader: () => slowPromise },
    );

    const fastOpen = await controller.open(
      {
        postId: ID.POST_ART_UNPINNED,
        postTitle: 'Fast Card',
        postKind: 'artifact-post',
        artifactId: ID.ART_SLA_MATRIX,
        pinnedArtifactVersionId: null,
      },
      {
        loader: async () => ({
          success: true,
          artifactsById: new Map([
            [ID.ART_SLA_MATRIX.toLowerCase(), { ID: ID.ART_SLA_MATRIX, Name: 'SLA Matrix', Type: 'Spreadsheet' }],
          ]),
          versionsById: new Map(),
          invalidArtifactIds: [],
          invalidVersionIds: [],
          queryCount: 1,
        }),
      },
    );

    assert.equal(fastOpen.state, 'ready');
    assert.equal(fastOpen.resolved?.artifactId, ID.ART_SLA_MATRIX);

    resolveSlow({
      success: true,
      artifactsById: new Map([
        [ID.ART_PLAYBOOK_ROTATION.toLowerCase(), { ID: ID.ART_PLAYBOOK_ROTATION, Name: 'Stale Playbook', Type: 'Document' }],
      ]),
      versionsById: new Map([
        [ID.VER_PLAYBOOK_V2.toLowerCase(), { ID: ID.VER_PLAYBOOK_V2, ArtifactID: ID.ART_PLAYBOOK_ROTATION, VersionNumber: 2, Name: 'v2' }],
      ]),
      invalidArtifactIds: [],
      invalidVersionIds: [],
      queryCount: 2,
    });
    await firstOpen;

    assert.equal(
      controller.snapshot.resolved?.artifactId,
      ID.ART_SLA_MATRIX,
      'Stale out-of-order async response must be discarded',
    );
    results.push({ check: 'rapid-switch-stale-response-discarded', passed: true });
  }

  return {
    suite: 'forum-artifact-post-viewer',
    passed: true,
    checkCount: results.length,
    checks: results,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  describe('Cross-Stack Functional Checks — ForumArtifactPost & ForumInteractivePost Viewer', () => {
    it('passes all batched RunView, pinned version, interactive post, relational reply, and stale-token checks', async () => {
      const summary = await RunForumArtifactPostViewerChecks();
      assert.equal(summary.passed, true);
      assert.equal(summary.checkCount, 5);
    });
  });
}
