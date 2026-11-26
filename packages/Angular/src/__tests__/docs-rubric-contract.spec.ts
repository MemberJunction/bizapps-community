import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ANGULAR_ROOT = join(HERE, '..', '..');
const REPO_ROOT = join(ANGULAR_ROOT, '..', '..');

const CLAUDE_MD = join(REPO_ROOT, 'CLAUDE.md');
const AGENTS_MD = join(REPO_ROOT, 'AGENTS.md');
const ROOT_README = join(REPO_ROOT, 'README.md');
const ANGULAR_README = join(ANGULAR_ROOT, 'README.md');
const INTEGRATION_README = join(REPO_ROOT, 'packages', 'IntegrationTests', 'README.md');
const VIEWER_SPEC = join(REPO_ROOT, '.mj', 'specs', 'ng-artifacts-forum-viewer', 'spec.md');
const CHANGESET_DIR = join(REPO_ROOT, '.changeset');
const WORKFLOWS_DIR = join(REPO_ROOT, '.github', 'workflows');

function assertDocsRubricContent(docName: string, content: string): void {
  assert.match(
    content,
    /MJ Docs \(MJ: Artifacts\) vs\. MJ: Comments vs\. Quick Notes/,
    `${docName} must contain the 'MJ Docs (MJ: Artifacts) vs. MJ: Comments vs. Quick Notes' rubric section`,
  );
  assert.match(content, /Category A\s+—\s+MJ Docs \(`MJ: Artifacts`\)/, `${docName} must classify Category A — MJ Docs (MJ: Artifacts)`);
  assert.match(content, /Category B\s+—\s+`MJ: Comments`/, `${docName} must classify Category B — MJ: Comments`);
  assert.match(
    content,
    /Category C\s+—\s+Quick Notes \/ Relational Records/,
    `${docName} must classify Category C — Quick Notes / Relational Records`,
  );
  assert.match(content, /ForumArtifactPost/, `${docName} must explicitly classify ForumArtifactPost as Category A`);
  assert.match(content, /ArtifactID/, `${docName} must reference ForumArtifactPost.ArtifactID`);
  assert.match(content, /PinnedArtifactVersionID/, `${docName} must reference PinnedArtifactVersionID`);
  assert.match(content, /ForumInteractivePost/, `${docName} must explicitly classify ForumInteractivePost as Category A`);
  assert.match(content, /ComponentArtifactID/, `${docName} must reference ForumInteractivePost.ComponentArtifactID`);
  assert.match(content, /@memberjunction\/ng-artifacts/, `${docName} must reference @memberjunction/ng-artifacts`);
  assert.match(content, /<mj-artifact-viewer-panel>/, `${docName} must reference <mj-artifact-viewer-panel>`);
  assert.match(
    content,
    /ForumPost`?\s+replies\s+(?:explicitly\s+)?remain\s+Category C\s+relational/i,
    `${docName} must confirm high-volume ForumPost replies remain Category C relational records`,
  );
}

describe('AC-7 — Docs vs. Notes Rubric, Living Documentation, Spec, Changeset & CI Gate Contract', () => {
  it('CLAUDE.md and AGENTS.md codify the MJ Docs (MJ: Artifacts) vs. MJ: Comments vs. Quick Notes rubric', () => {
    assert.equal(existsSync(CLAUDE_MD), true, 'CLAUDE.md must exist at repository root');
    assert.equal(existsSync(AGENTS_MD), true, 'AGENTS.md must exist at repository root');

    assertDocsRubricContent('CLAUDE.md', readFileSync(CLAUDE_MD, 'utf8'));
    assertDocsRubricContent('AGENTS.md', readFileSync(AGENTS_MD, 'utf8'));
  });

  it('Git-canonical spec under .mj/specs/ng-artifacts-forum-viewer/spec.md documents viewer, batched RunView, rubric, and verification matrix', () => {
    assert.equal(existsSync(VIEWER_SPEC), true, '.mj/specs/ng-artifacts-forum-viewer/spec.md must exist');
    const spec = readFileSync(VIEWER_SPEC, 'utf8');

    assertDocsRubricContent('.mj/specs/ng-artifacts-forum-viewer/spec.md', spec);
    assert.match(spec, /CommunityArtifactViewerComponent/);
    assert.match(spec, /LoadBatchedArtifactsMetadata/);
    assert.match(spec, /ResultType:\s*'simple'/);
    assert.match(spec, /ID IN \(\.\.\.\)/);
    assert.match(spec, /1440×900/);
    assert.match(spec, /1024×768/);
    assert.match(spec, /390×844/);
    assert.match(spec, /test-harnesses\/integration\.mjs/);
  });

  it('root README.md, packages/Angular/README.md, and packages/IntegrationTests/README.md are synchronized', () => {
    const rootReadme = readFileSync(ROOT_README, 'utf8');
    const angularReadme = readFileSync(ANGULAR_README, 'utf8');
    const integrationReadme = readFileSync(INTEGRATION_README, 'utf8');

    assert.match(rootReadme, /@memberjunction\/ng-artifacts/);
    assert.match(rootReadme, /CommunityArtifactViewerComponent/);
    assert.match(rootReadme, /<mj-artifact-viewer-panel>/);
    assert.match(rootReadme, /\.mj\/specs\/ng-artifacts-forum-viewer\/spec\.md/);
    assert.match(rootReadme, /packages\/Angular\/README\.md/);
    assert.match(rootReadme, /packages\/IntegrationTests\/README\.md/);
    assert.match(rootReadme, /test-harnesses\/integration\.mjs/);
    assert.match(rootReadme, /Category A/);
    assert.match(rootReadme, /Category C/);

    assert.match(angularReadme, /CommunityArtifactViewerComponent/);
    assert.match(angularReadme, /<mj-artifact-viewer-panel>/);
    assert.match(angularReadme, /MJ Docs \(`MJ: Artifacts`\) vs\. `MJ: Comments` vs\. Quick Notes/);
    assert.match(angularReadme, /ForumArtifactPost/);
    assert.match(angularReadme, /ForumInteractivePost/);
    assert.match(angularReadme, /ForumPost`?\s+replies\s+remain\s+Category C\s+relational/i);
    assert.match(angularReadme, /\.mj\/specs\/ng-artifacts-forum-viewer\/spec\.md/);

    assert.match(integrationReadme, /MJ Docs \(MJ: Artifacts\) vs\. MJ: Comments vs\. Quick Notes/);
    assert.match(integrationReadme, /\.mj\/specs\/ng-artifacts-forum-viewer\/spec\.md/);
    assert.match(integrationReadme, /test-harnesses\/integration\.mjs/);
    assert.match(integrationReadme, /ForumArtifactPost/);
    assert.match(integrationReadme, /ForumInteractivePost/);
  });

  it('includes a clean non-breaking .changeset/*.md entry for @mj-biz-apps/community-ng and @memberjunction/ng-artifacts', () => {
    assert.equal(existsSync(CHANGESET_DIR), true, '.changeset directory must exist');
    const entries = readdirSync(CHANGESET_DIR).filter((name) => name.endsWith('.md') && name.toLowerCase() !== 'readme.md');
    const matchingEntry = entries.find((name) => {
      const text = readFileSync(join(CHANGESET_DIR, name), 'utf8');
      return text.includes('@memberjunction/ng-artifacts') && text.includes('"@mj-biz-apps/community-ng"');
    });

    assert.ok(matchingEntry, 'Expected a .changeset/*.md entry for "@mj-biz-apps/community-ng" describing @memberjunction/ng-artifacts');
    const changeset = readFileSync(join(CHANGESET_DIR, matchingEntry!), 'utf8');
    assert.match(changeset, /"@mj-biz-apps\/community-ng":\s*(?:minor|patch)/);
    assert.doesNotMatch(changeset, /"@mj-biz-apps\/community-ng":\s*major/);
    assert.match(changeset, /ForumArtifactPost/);
    assert.match(changeset, /ForumInteractivePost/);
  });

  it('verifies .github/workflows/*.yml runs build, unit tests, and static/caret-pin/dependency-model gates on PRs targeting next', () => {
    const ciYml = readFileSync(join(WORKFLOWS_DIR, 'ci.yml'), 'utf8');
    const caretPinsYml = readFileSync(join(WORKFLOWS_DIR, 'caret-pins.yml'), 'utf8');
    const repoChecksYml = readFileSync(join(WORKFLOWS_DIR, 'repo-checks.yml'), 'utf8');

    assert.match(ciYml, /pull_request:/);
    assert.match(ciYml, /branches:\s*\[[^\]]*next[^\]]*\]/);
    assert.match(ciYml, /node scripts\/check-downstream-names\.mjs/);
    assert.match(ciYml, /pnpm run build/);
    assert.match(ciYml, /pnpm run test/);

    assert.match(caretPinsYml, /pull_request:/);
    assert.match(caretPinsYml, /branches:\s*\[[^\]]*next[^\]]*\]/);
    assert.match(caretPinsYml, /node \.github\/scripts\/check-caret-pins\.mjs/);

    assert.match(repoChecksYml, /pull_request:/);
    assert.match(repoChecksYml, /branches:\s*\[[^\]]*next[^\]]*\]/);
    assert.match(repoChecksYml, /validate-metadata-directory-order\.sh/);
    assert.match(repoChecksYml, /check-dependency-model\.mjs/);
  });
});
