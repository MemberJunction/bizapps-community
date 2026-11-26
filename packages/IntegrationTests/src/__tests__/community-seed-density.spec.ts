import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { IsValidUUID } from '@memberjunction/global';
import {
  ADVERSARIAL_FIXTURES,
  BuildSeedDensityReport,
  GetArtifactWorldSeedSummary,
  WORLD_ARTIFACT_VERSIONS,
  WORLD_ARTIFACTS,
  WORLD_FORUM_ARTIFACT_POSTS,
  WORLD_FORUM_INTERACTIVE_POSTS,
  WORLD_FORUM_POST_REPLIES,
  WORLD_FORUMS,
  WORLD_ORGANIZATIONS,
  WORLD_PEOPLE,
  WORLD_PERMISSIONS,
  WORLD_ROLES,
  WORLD_SPACES,
} from '../../world/community-artifact-world.mjs';
import { VerifyArtifactWorldSqliteReferentialIntegrity } from '../../world/community-artifact-world-provider.mjs';

interface SeedDensityReportShape {
  schemaVersion: string;
  overallPassed: boolean;
  pillars: {
    seedDensity: {
      passed: boolean;
      summary: string;
      checkedCount: number;
      violationCount: number;
      violations: string[];
      counts: Record<string, number>;
      statuses: string[];
      periods: string[];
    };
  };
}

const SAMPLE_MOCKUP_BRAND_RE = /\bmore\s*cheese\b|\bmorecheese\b/i;

describe('BizApps Community Integration World — Seed Density, Referential Integrity & Adversarial Schema', () => {
  it('provisions >= 20 realistic domain-neutral records across all required entity domains', () => {
    const summary = GetArtifactWorldSeedSummary();
    assert.ok(summary.totalRecords >= 20, `Expected >= 20 seed records, got ${summary.totalRecords}`);
    assert.ok(WORLD_ORGANIZATIONS.length >= 3, 'Expected >= 3 organizations for multi-tenant isolation');
    assert.ok(WORLD_SPACES.length >= 3, 'Expected >= 3 spaces');
    assert.ok(WORLD_PEOPLE.length >= 6, 'Expected >= 6 personas');
    assert.ok(WORLD_ROLES.length >= 4, 'Expected >= 4 role types');
    assert.ok(WORLD_PERMISSIONS.length >= 8, 'Expected >= 8 permission / ACL rows');
    assert.ok(WORLD_FORUMS.length >= 5, 'Expected >= 5 forums');
    assert.ok(WORLD_ARTIFACTS.length >= 5, 'Expected >= 5 MJ: Artifacts');
    assert.ok(WORLD_ARTIFACT_VERSIONS.length >= 8, 'Expected >= 8 MJ: Artifact Versions');
    assert.ok(WORLD_FORUM_ARTIFACT_POSTS.length >= 5, 'Expected >= 5 ForumArtifactPost records');
    assert.ok(WORLD_FORUM_INTERACTIVE_POSTS.length >= 2, 'Expected >= 2 ForumInteractivePost records');
    assert.ok(WORLD_FORUM_POST_REPLIES.length >= 12, 'Expected >= 12 relational ForumPost replies');
    assert.ok(summary.statuses.length >= 4, 'Expected >= 4 distinct post statuses');
    assert.ok(summary.periods.length >= 4, 'Expected >= 4 quarterly time periods');
  });

  it('uses valid UUIDs for every primary and foreign key across all seeded tables', () => {
    const idGroups: ReadonlyArray<ReadonlyArray<{ ID: string }>> = [
      WORLD_ORGANIZATIONS,
      WORLD_SPACES,
      WORLD_PEOPLE,
      WORLD_ROLES,
      WORLD_PERMISSIONS,
      WORLD_FORUMS,
      WORLD_ARTIFACTS,
      WORLD_ARTIFACT_VERSIONS,
      WORLD_FORUM_ARTIFACT_POSTS,
      WORLD_FORUM_INTERACTIVE_POSTS,
      WORLD_FORUM_POST_REPLIES,
    ];

    const seenIds = new Set<string>();
    for (const group of idGroups) {
      for (const row of group) {
        assert.equal(IsValidUUID(row.ID), true, `Invalid UUID: ${row.ID}`);
        const lower = row.ID.toLowerCase();
        assert.equal(seenIds.has(lower), false, `Duplicate ID detected across world seed: ${row.ID}`);
        seenIds.add(lower);
      }
    }
  });

  it('maintains strict relational referential integrity in SQLite (PRAGMA foreign_keys = ON)', () => {
    const integrity = VerifyArtifactWorldSqliteReferentialIntegrity();
    assert.equal(integrity.foreignKeyViolations, 0, 'Expected zero SQLite FK violations');
    assert.ok(integrity.fkVerifiedArtifactPosts >= 4, 'Expected >= 4 FK-valid ForumArtifactPost rows');
    assert.equal(integrity.adversarialMissingArtifactPosts, 2, 'Expected 2 adversarial missing/invalid-pin artifact posts');
    assert.equal(integrity.fkVerifiedInteractivePosts, 1, 'Expected 1 FK-valid ForumInteractivePost row');
    assert.equal(integrity.adversarialMissingInteractivePosts, 1, 'Expected 1 adversarial missing interactive post');
    assert.equal(integrity.revokedArtifactIdAbsent, true);
    assert.equal(integrity.nonExistentVersionAbsent, true);
  });

  it('covers all required ForumArtifactPost, ForumInteractivePost, and adversarial boundary scenarios', () => {
    const scenarios = new Set([
      ...WORLD_FORUM_ARTIFACT_POSTS.map((p) => p.ScenarioTag),
      ...WORLD_FORUM_INTERACTIVE_POSTS.map((p) => p.ScenarioTag),
    ]);

    for (const requiredScenario of [
      'pinned-version',
      'unpinned-latest',
      'missing-revoked-artifact',
      'invalid-pinned-version',
      'partner-tenant-pinned',
      'cross-tenant-restricted',
      'interactive-pinned-version',
      'interactive-missing-component',
    ]) {
      assert.ok(scenarios.has(requiredScenario), `Missing required scenario fixture: ${requiredScenario}`);
    }

    assert.equal(IsValidUUID(ADVERSARIAL_FIXTURES.revokedArtifactId), true);
    assert.equal(IsValidUUID(ADVERSARIAL_FIXTURES.nonExistentVersionId), true);
    assert.equal(IsValidUUID(ADVERSARIAL_FIXTURES.crossArtifactVersionId), true);
    assert.equal(IsValidUUID(ADVERSARIAL_FIXTURES.sqlInjectionArtifactId), false);

    // Ensure muted and removed personas exist in WORLD_PEOPLE and WORLD_PERMISSIONS
    const mutedPerson = WORLD_PEOPLE.find((p) => p.ID === ADVERSARIAL_FIXTURES.mutedUserId);
    const removedPerson = WORLD_PEOPLE.find((p) => p.ID === ADVERSARIAL_FIXTURES.removedUserId);
    assert.equal(mutedPerson?.Status, 'Muted');
    assert.equal(removedPerson?.Status, 'Removed');
  });

  it('contains zero sample mockup brand names across all seeded world text', () => {
    const serialized = JSON.stringify({
      WORLD_ORGANIZATIONS,
      WORLD_SPACES,
      WORLD_PEOPLE,
      WORLD_ROLES,
      WORLD_FORUMS,
      WORLD_ARTIFACTS,
      WORLD_ARTIFACT_VERSIONS,
      WORLD_FORUM_ARTIFACT_POSTS,
      WORLD_FORUM_INTERACTIVE_POSTS,
      WORLD_FORUM_POST_REPLIES,
    });
    assert.equal(
      SAMPLE_MOCKUP_BRAND_RE.test(serialized),
      false,
      'World fixtures must use clean domain-neutral copy free of sample mockup brand names',
    );
  });

  it('emits a valid sf-readiness/v3 SeedDensityReport', () => {
    const report = BuildSeedDensityReport() as SeedDensityReportShape;
    assert.equal(report.schemaVersion, 'sf-readiness/v3');
    assert.equal(report.overallPassed, true);
    assert.equal(report.pillars.seedDensity.passed, true);
    assert.equal(report.pillars.seedDensity.violationCount, 0);
    assert.ok(report.pillars.seedDensity.checkedCount >= 60);
  });
});
