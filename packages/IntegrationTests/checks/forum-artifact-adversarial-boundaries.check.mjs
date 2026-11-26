/**
 * Adversarial Boundary Checks for ForumArtifactPost & ForumInteractivePost Viewing
 *
 * Verifies:
 *   1. Cross-organization / cross-tenant RLS denial (Apex & Partner denied Northstar enclave artifacts)
 *   2. Role & member-status permission boundaries (Muted user write-denied; Removed user read-denied)
 *   3. Missing / revoked artifact graceful fallback with zero raw markdown (`###`, `**bold**`, fences)
 *      leakage while preserving relational ForumPost replies
 *   4. Invalid / non-existent / cross-artifact PinnedArtifactVersionID fail-closed boundary &
 *      SQL injection rejection with zero executed SQL queries
 *   5. Empty ID set short-circuit (zero `ID IN ()` queries) & bounded batch chunking
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  BuildValidatedUuidInFilter,
  CommunityArtifactViewerController,
  LoadBatchedArtifactsMetadata,
} from '../../Angular/dist/lib/community-artifact-viewer.js';
import {
  ADVERSARIAL_FIXTURES,
  ARTIFACT_WORLD_IDS,
  WORLD_FORUM_ARTIFACT_POSTS,
  WORLD_FORUM_INTERACTIVE_POSTS,
} from '../world/community-artifact-world.mjs';
import {
  CreateArtifactWorldRunViewProvider,
  EvaluateUserForumAccess,
} from '../world/community-artifact-world-provider.mjs';

const ID = ARTIFACT_WORLD_IDS;
const RAW_MARKDOWN_TOKENS_RE = /(^|\s)#{1,6}\s|\*\*[^*]+\*\*|```/m;

export async function RunForumArtifactAdversarialBoundaryChecks() {
  const results = [];

  // Boundary 1: Cross-organization / cross-tenant RLS denial
  {
    const restrictedPost = WORLD_FORUM_ARTIFACT_POSTS.find((p) => p.ID === ADVERSARIAL_FIXTURES.restrictedTenantPostId);
    assert.ok(restrictedPost);

    for (const unauthorizedUserId of [
      ADVERSARIAL_FIXTURES.unauthorizedApexUserId,
      ADVERSARIAL_FIXTURES.unauthorizedPartnerUserId,
    ]) {
      const provider = CreateArtifactWorldRunViewProvider(unauthorizedUserId);
      const controller = new CommunityArtifactViewerController();
      const snap = await controller.open(
        {
          postId: restrictedPost.ID,
          postTitle: 'Redacted Restricted Link',
          postKind: 'artifact-post',
          artifactId: restrictedPost.ArtifactID,
          pinnedArtifactVersionId: restrictedPost.PinnedArtifactVersionID,
        },
        {
          loader: (req) =>
            LoadBatchedArtifactsMetadata({
              runView: provider,
              artifactIds: [req.artifactId],
              pinnedVersionIds: req.pinnedArtifactVersionId ? [req.pinnedArtifactVersionId] : [],
              user: { ID: unauthorizedUserId },
            }),
        },
      );

      assert.equal(snap.state, 'missing', `Cross-tenant caller ${unauthorizedUserId} must not view Northstar artifact`);
      assert.equal(snap.resolved, null);
      assert.equal(snap.fallback?.reason, 'artifact-not-found');
      assert.doesNotMatch(
        `${snap.fallback?.headline ?? ''} ${snap.fallback?.explanation ?? ''}`,
        /Northstar|HSM|Quorum/i,
        'Unauthorized fallback must never leak confidential tenant artifact details',
      );
    }

    // Authorized Northstar operator MUST resolve the exact same restricted artifact
    const northstarProvider = CreateArtifactWorldRunViewProvider(ADVERSARIAL_FIXTURES.restrictedTenantUserId);
    const northstarController = new CommunityArtifactViewerController();
    const allowedSnap = await northstarController.open(
      {
        postId: restrictedPost.ID,
        postTitle: restrictedPost.Title,
        postKind: 'artifact-post',
        artifactId: restrictedPost.ArtifactID,
        pinnedArtifactVersionId: restrictedPost.PinnedArtifactVersionID,
      },
      {
        loader: (req) =>
          LoadBatchedArtifactsMetadata({
            runView: northstarProvider,
            artifactIds: [req.artifactId],
            pinnedVersionIds: req.pinnedArtifactVersionId ? [req.pinnedArtifactVersionId] : [],
            user: { ID: ADVERSARIAL_FIXTURES.restrictedTenantUserId },
          }),
      },
    );
    assert.equal(allowedSnap.state, 'ready');
    assert.equal(allowedSnap.effectiveVersionNumber, 1);

    results.push({ check: 'cross-tenant-rls-denial', passed: true });
  }

  // Boundary 2: Role & member-status permission denial (Muted vs Removed)
  {
    const mutedAccess = EvaluateUserForumAccess(ADVERSARIAL_FIXTURES.mutedUserId, ID.FORUM_PLAYBOOKS);
    assert.equal(mutedAccess.allowedRead, true, 'Muted member retains read visibility');
    assert.equal(mutedAccess.allowedWrite, false, 'Muted member must be denied posting/reply writes');
    assert.equal(mutedAccess.allowedCoEdit, false, 'Muted member must be denied collaborative doc edits');

    const removedAccess = EvaluateUserForumAccess(ADVERSARIAL_FIXTURES.removedUserId, ID.FORUM_PARTNER_DOCS);
    assert.equal(removedAccess.allowedRead, false, 'Removed member must be denied forum read access');
    assert.equal(removedAccess.allowedWrite, false, 'Removed member must be denied writes');
    assert.equal(removedAccess.allowedArtifacts, false, 'Removed member must be denied MJ: Artifacts reads');

    const removedProvider = CreateArtifactWorldRunViewProvider(ADVERSARIAL_FIXTURES.removedUserId);
    const removedBatch = await LoadBatchedArtifactsMetadata({
      runView: removedProvider,
      artifactIds: [ID.ART_PARTNER_DECK, ID.ART_PLAYBOOK_ROTATION],
      pinnedVersionIds: [ID.VER_PARTNER_V1, ID.VER_PLAYBOOK_V2],
      user: { ID: ADVERSARIAL_FIXTURES.removedUserId },
    });
    assert.equal(removedBatch.artifactsById.size, 0, 'Removed user must receive zero artifacts via RLS');
    assert.equal(removedBatch.versionsById.size, 0, 'Removed user must receive zero artifact versions via RLS');

    results.push({ check: 'role-and-status-permission-denial', passed: true });
  }

  // Boundary 3: Missing / revoked artifact graceful fallback + zero raw markdown leakage + replies intact
  {
    const provider = CreateArtifactWorldRunViewProvider(ID.USER_ELENA);
    const revokedPost = WORLD_FORUM_ARTIFACT_POSTS.find((p) => p.ID === ID.POST_ART_MISSING_REVOKED);
    const revokedInteractive = WORLD_FORUM_INTERACTIVE_POSTS.find((p) => p.ID === ID.POST_INT_MISSING);
    assert.ok(revokedPost && revokedInteractive);

    const controller = new CommunityArtifactViewerController();
    const revokedSnap = await controller.open(
      {
        postId: revokedPost.ID,
        postTitle: revokedPost.Title,
        postKind: 'artifact-post',
        artifactId: revokedPost.ArtifactID,
        pinnedArtifactVersionId: revokedPost.PinnedArtifactVersionID,
        fallbackSummaryMarkdown: revokedPost.BodyMarkdown,
      },
      {
        loader: (req) =>
          LoadBatchedArtifactsMetadata({
            runView: provider,
            artifactIds: [req.artifactId],
            user: { ID: ID.USER_ELENA },
          }),
      },
    );

    assert.equal(revokedSnap.state, 'missing');
    assert.equal(revokedSnap.fallback?.reason, 'artifact-not-found');
    assert.ok(revokedSnap.fallback?.plainSummary.length > 0, 'Fallback must provide clean plain-text summary');
    const renderedFallbackText = [
      revokedSnap.fallback?.headline,
      revokedSnap.fallback?.explanation,
      revokedSnap.fallback?.plainSummary,
    ].join('\n');
    assert.doesNotMatch(
      renderedFallbackText,
      RAW_MARKDOWN_TOKENS_RE,
      `Fallback leaked raw markdown tokens: ${renderedFallbackText}`,
    );

    // Relational replies on the revoked artifact post remain completely accessible
    const repliesRes = await provider.RunView(
      {
        EntityName: 'MJ_BizApps_Community: Forum Posts',
        ExtraFilter: `RootPostID = '${ID.POST_ART_MISSING_REVOKED}'`,
        Fields: ['ID', 'RootPostID', 'ReplyDepth', 'Status', 'BodyMarkdown'],
        ResultType: 'simple',
      },
      { ID: ID.USER_ELENA },
    );
    assert.equal(repliesRes.Success, true);
    assert.equal(repliesRes.Results.length, 3, 'All 3 relational ForumPost replies must remain accessible when artifact is revoked');

    // Interactive post with missing ComponentArtifactID also falls back cleanly
    const intSnap = await controller.open(
      {
        postId: revokedInteractive.ID,
        postTitle: revokedInteractive.Title,
        postKind: 'interactive-post',
        artifactId: revokedInteractive.ComponentArtifactID,
        fallbackSummaryMarkdown: revokedInteractive.BodyMarkdown,
      },
      {
        loader: (req) =>
          LoadBatchedArtifactsMetadata({
            runView: provider,
            artifactIds: [req.artifactId],
            user: { ID: ID.USER_ELENA },
          }),
      },
    );
    assert.equal(intSnap.state, 'missing');
    assert.equal(intSnap.fallback?.reason, 'artifact-not-found');
    assert.doesNotMatch(intSnap.fallback?.plainSummary ?? '', RAW_MARKDOWN_TOKENS_RE);

    results.push({ check: 'missing-revoked-artifact-graceful-fallback', passed: true, preservedReplies: repliesRes.Results.length });
  }

  // Boundary 4: Invalid, cross-artifact, and SQL-injection PinnedArtifactVersionID / ArtifactID fail-closed
  {
    const provider = CreateArtifactWorldRunViewProvider(ID.USER_ELENA);
    const controller = new CommunityArtifactViewerController();

    // 4a. Non-existent PinnedArtifactVersionID
    const invalidPinPost = WORLD_FORUM_ARTIFACT_POSTS.find((p) => p.ID === ID.POST_ART_INVALID_PIN);
    assert.ok(invalidPinPost);
    const invalidPinSnap = await controller.open(
      {
        postId: invalidPinPost.ID,
        postTitle: invalidPinPost.Title,
        postKind: 'artifact-post',
        artifactId: invalidPinPost.ArtifactID,
        pinnedArtifactVersionId: invalidPinPost.PinnedArtifactVersionID,
        fallbackSummaryMarkdown: invalidPinPost.BodyMarkdown,
      },
      {
        loader: (req) =>
          LoadBatchedArtifactsMetadata({
            runView: provider,
            artifactIds: [req.artifactId],
            pinnedVersionIds: [req.pinnedArtifactVersionId],
            user: { ID: ID.USER_ELENA },
          }),
      },
    );
    assert.equal(invalidPinSnap.state, 'missing');
    assert.equal(invalidPinSnap.fallback?.reason, 'pinned-version-not-found');
    assert.equal(invalidPinSnap.effectiveVersionNumber, undefined);

    // 4b. Cross-artifact PinnedArtifactVersionID (version belongs to ART_SLA_MATRIX, not ART_PLAYBOOK_ROTATION)
    const crossArtSnap = await controller.open(
      {
        postId: ID.POST_ART_PINNED,
        postTitle: 'Cross-Artifact Pin Tampering',
        postKind: 'artifact-post',
        artifactId: ID.ART_PLAYBOOK_ROTATION,
        pinnedArtifactVersionId: ADVERSARIAL_FIXTURES.crossArtifactVersionId,
      },
      {
        loader: (req) =>
          LoadBatchedArtifactsMetadata({
            runView: provider,
            artifactIds: [req.artifactId],
            pinnedVersionIds: [req.pinnedArtifactVersionId],
            user: { ID: ID.USER_ELENA },
          }),
      },
    );
    assert.equal(crossArtSnap.state, 'missing');
    assert.equal(crossArtSnap.fallback?.reason, 'pinned-version-not-found');
    assert.equal(crossArtSnap.effectiveVersionNumber, undefined);

    // 4c. SQL injection attempt in ArtifactID must execute ZERO queries
    provider.resetQueryLog();
    const injectionFilter = BuildValidatedUuidInFilter('ID', [ADVERSARIAL_FIXTURES.sqlInjectionArtifactId], 'artifactId');
    assert.equal(injectionFilter.filter, null);
    assert.deepEqual(injectionFilter.validIds, []);
    assert.equal(injectionFilter.invalidIds.length, 1);

    const injectionBatch = await LoadBatchedArtifactsMetadata({
      runView: provider,
      artifactIds: [ADVERSARIAL_FIXTURES.sqlInjectionArtifactId],
      user: { ID: ID.USER_ELENA },
    });
    assert.equal(injectionBatch.queryCount, 0, 'SQL injection input must never execute a RunView query');
    assert.equal(provider.queryLog.length, 0);

    const injectionSnap = await controller.open({
      postId: 'post-sql-inj',
      postTitle: 'Adversarial Malformed ID',
      postKind: 'artifact-post',
      artifactId: ADVERSARIAL_FIXTURES.sqlInjectionArtifactId,
    });
    assert.equal(injectionSnap.state, 'missing');
    assert.equal(injectionSnap.fallback?.reason, 'missing-artifact-id');

    results.push({ check: 'invalid-pin-cross-artifact-and-sql-injection-blocked', passed: true });
  }

  // Boundary 5: Empty ID set short-circuit & bounded chunking
  {
    const provider = CreateArtifactWorldRunViewProvider(ID.USER_ELENA);
    const emptyBatch = await LoadBatchedArtifactsMetadata({
      runView: provider,
      artifactIds: [],
      pinnedVersionIds: [null, undefined, '   '],
      user: { ID: ID.USER_ELENA },
    });
    assert.equal(emptyBatch.success, true);
    assert.equal(emptyBatch.queryCount, 0, 'Empty ID sets must short-circuit with zero queries');
    assert.equal(provider.queryLog.length, 0);

    // Generate 75 distinct valid UUIDs to verify bounded chunkSize=50 batching (2 chunks, never unbounded)
    const seventyFiveIds = Array.from(
      { length: 75 },
      (_, i) => `f6990000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    );
    const chunkedBatch = await LoadBatchedArtifactsMetadata({
      runView: provider,
      artifactIds: seventyFiveIds,
      chunkSize: 50,
      user: { ID: ID.USER_ELENA },
    });
    assert.equal(chunkedBatch.success, true);
    assert.equal(chunkedBatch.queryCount, 2, '75 UUIDs with chunkSize=50 must split into exactly 2 bounded queries');
    assert.equal(provider.queryLog[0].maxRows, 50);
    assert.equal(provider.queryLog[1].maxRows, 25);

    results.push({ check: 'empty-short-circuit-and-bounded-chunking', passed: true });
  }

  return {
    suite: 'forum-artifact-adversarial-boundaries',
    passed: true,
    checkCount: results.length,
    checks: results,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  describe('Cross-Stack Adversarial Boundary Checks — RLS, Missing/Revoked Artifacts, Invalid Pins & SQL Safety', () => {
    it('passes all cross-tenant RLS, role/status denial, revoked fallback, invalid pin, SQL-injection, and chunking boundaries', async () => {
      const summary = await RunForumArtifactAdversarialBoundaryChecks();
      assert.equal(summary.passed, true);
      assert.equal(summary.checkCount, 5);
    });
  });
}
