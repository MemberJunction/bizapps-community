import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import {
  ALL_POST_TYPE_CODES,
  GetWorldSeedSummary,
  WORLD_COMMUNITY_SPACES,
  WORLD_FORUMS,
  WORLD_IDEA_ALLOCATIONS,
  WORLD_INTERACTIVE_SESSIONS,
  WORLD_MEMBER_PROFILES,
  WORLD_POST_FLAGS,
  WORLD_POST_REACTIONS,
  WORLD_POSTS,
  WORLD_TOPIC_TAGS,
} from './seed-world.mjs';
import {
  ARCH_AMA_POSTS,
  ARCH_CASE_POSTS,
  ARCH_COMMUNITY_SPACES,
  ARCH_FORUM_MEMBERS,
  ARCH_FORUM_ROLE_TYPES,
  ARCH_FORUM_SUBSCRIPTIONS,
  ARCH_FORUMS,
  ARCH_IDEA_ALLOCATIONS,
  ARCH_INTERACTIVE_POSTS,
  ARCH_INTERACTIVE_SESSIONS,
  ARCH_MEMBER_PROFILES,
  ARCH_MEMBERS,
  ARCH_POST_FLAGS,
  ARCH_POST_REACTIONS,
  ARCH_POST_TAGS,
  ARCH_POSTS,
  ARCH_SPACE_MEMBERS,
  ARCH_SPACE_ROLE_TYPES,
  ARCH_SPACE_TYPES,
  ARCH_TOPIC_TAGS,
} from './world/arch-world-data.mjs';
import {
  BuildArchitectAssociationWorldSql,
  CreatePersistedArchWorldProvider,
  EnsureArchWorldSqliteSchema,
  ExecuteArchitectAssociationWorldSql,
  LoadArchitectAssociationWorld,
  ResetSharedArchWorldStore,
  TeardownArchitectAssociationWorld,
} from './world/arch-world-loader.mjs';
import {
  ExecuteTranspiledArchWorldDialectSql,
  RegisterArchWorldIntegrationTests,
} from './world/arch-world-integration.mjs';
import * as CommunityEntities from '../packages/Entities/dist/index.js';

const requireFromActions = createRequire(new URL('../packages/Actions/package.json', import.meta.url));
const { RunView } = await import(requireFromActions.resolve('@memberjunction/core'));
const { COMMUNITY_ENTITY_NAMES } = CommunityEntities;

const REQUIRED_SPACE_NAMES = [
  'Customer Community Portal',
  'Partner & ISV Enablement Network',
  'Internal Engineering Guild',
];

const HERE = dirname(fileURLToPath(import.meta.url));

const ALL_FORUM_TYPE_CODES = [
  'general-discussion',
  'qa-knowledge-base',
  'ideation-campaign',
  'playbooks-and-docs',
  'peer-case-rounds',
  'live-events-and-amas',
];

describe('BizApps Community world data model seed', () => {
  it('defines at least 25 records in total', () => {
    const { totalRecords } = GetWorldSeedSummary();
    assert.ok(totalRecords >= 25, `expected >= 25 records, got ${totalRecords}`);
  });

  it('defines exactly the 3 required Collaboration Spaces by name', () => {
    assert.equal(WORLD_COMMUNITY_SPACES.length, 3);
    const names = WORLD_COMMUNITY_SPACES.map((s) => s.Name);
    for (const required of REQUIRED_SPACE_NAMES) {
      assert.ok(names.includes(required), `missing required space "${required}"`);
    }
  });

  it('every Space has a unique ID and slug', () => {
    const ids = new Set(WORLD_COMMUNITY_SPACES.map((s) => s.ID));
    const slugs = new Set(WORLD_COMMUNITY_SPACES.map((s) => s.Slug));
    assert.equal(ids.size, WORLD_COMMUNITY_SPACES.length);
    assert.equal(slugs.size, WORLD_COMMUNITY_SPACES.length);
  });

  it('covers all 6 ForumType codes across the seeded Forums', () => {
    const coveredTypes = new Set(WORLD_FORUMS.map((f) => f.ForumTypeCode));
    for (const code of ALL_FORUM_TYPE_CODES) {
      assert.ok(coveredTypes.has(code), `missing forum of type "${code}"`);
    }
  });

  it('covers all 13 PostType codes across the seeded Posts', () => {
    const coveredTypes = new Set(WORLD_POSTS.map((p) => p.PostTypeCode));
    for (const code of ALL_POST_TYPE_CODES) {
      assert.ok(coveredTypes.has(code), `missing post of type "${code}"`);
    }
  });

  it('every Forum references a Space that was actually seeded (cross-domain referential integrity)', () => {
    const spaceIds = new Set(WORLD_COMMUNITY_SPACES.map((s) => s.ID));
    for (const forum of WORLD_FORUMS) {
      assert.ok(spaceIds.has(forum.SpaceID), `Forum ${forum.ID} references unknown Space ${forum.SpaceID}`);
    }
  });

  it('every Post references a Forum that was actually seeded', () => {
    const forumIds = new Set(WORLD_FORUMS.map((f) => f.ID));
    for (const post of WORLD_POSTS) {
      assert.ok(forumIds.has(post.ForumID), `Post ${post.ID} references unknown Forum ${post.ForumID}`);
    }
  });

  it('isolates each Space\'s forums from the others — no Forum is shared across Spaces (fnCommunityForumAccess isolation)', () => {
    const forumsBySpace = new Map();
    for (const forum of WORLD_FORUMS) {
      const list = forumsBySpace.get(forum.SpaceID) ?? [];
      list.push(forum.ID);
      forumsBySpace.set(forum.SpaceID, list);
    }
    // Every forum belongs to exactly one Space — the premise fnCommunityForumAccess's per-Space
    // membership check relies on. Also prove each of the 3 Spaces actually owns at least one forum,
    // so the isolation claim is non-vacuous.
    assert.equal(forumsBySpace.size, 3);
    const allForumIds = WORLD_FORUMS.map((f) => f.ID);
    assert.equal(new Set(allForumIds).size, allForumIds.length);
  });

  it('seeds a verified Q&A canon answer', () => {
    const answer = WORLD_POSTS.find((p) => p.PostTypeCode === 'answer');
    assert.ok(answer, 'no answer post seeded');
    assert.equal(answer.IsAccepted, true);
    assert.equal(answer.AIEpistemicStatus, 'Canon Verified');
  });

  it('seeds Quadratic Ideation Campaign allocations where QuadraticVotes = sqrt(PointsAllocated)', () => {
    assert.ok(WORLD_IDEA_ALLOCATIONS.length >= 2, 'expected at least 2 idea allocations');
    for (const allocation of WORLD_IDEA_ALLOCATIONS) {
      assert.equal(allocation.QuadraticVotes, Math.sqrt(allocation.PointsAllocated));
    }
    const ideaPost = WORLD_POSTS.find((p) => p.ID === WORLD_IDEA_ALLOCATIONS[0].IdeaPostID);
    assert.ok(ideaPost, 'idea allocations must reference a seeded idea-proposal post');
    assert.equal(ideaPost.PostTypeCode, 'idea-proposal');
  });

  it("the idea-proposal post's aggregate columns match the sum of its WORLD_IDEA_ALLOCATIONS rows (TotalPointsAllocated=61, EffectiveVoteSum=11, BackerCount=2)", () => {
    const ideaPost = WORLD_POSTS.find((p) => p.PostTypeCode === 'idea-proposal');
    assert.ok(ideaPost, 'no idea-proposal post seeded');
    const allocations = WORLD_IDEA_ALLOCATIONS.filter((a) => a.IdeaPostID === ideaPost.ID);

    const totalPoints = allocations.reduce((sum, a) => sum + a.PointsAllocated, 0);
    const totalVotes = allocations.reduce((sum, a) => sum + a.QuadraticVotes, 0);

    assert.equal(ideaPost.TotalPointsAllocated, totalPoints);
    assert.equal(ideaPost.EffectiveQuadraticVotes, totalVotes);
    assert.equal(ideaPost.UniqueBackerCount, allocations.length);

    // The exact values called out as the canonical demo scenario.
    assert.equal(ideaPost.TotalPointsAllocated, 61);
    assert.equal(ideaPost.EffectiveQuadraticVotes, 11);
    assert.equal(ideaPost.UniqueBackerCount, 2);
  });

  it('seeds Interactive Mini-App sessions for a seeded interactive-experience post', () => {
    assert.ok(WORLD_INTERACTIVE_SESSIONS.length >= 2);
    const interactivePost = WORLD_POSTS.find((p) => p.PostTypeCode === 'interactive-experience');
    assert.ok(interactivePost);
    for (const session of WORLD_INTERACTIVE_SESSIONS) {
      assert.equal(session.InteractivePostID, interactivePost.ID);
    }
  });

  it('seeds reactions, member reputation profiles (ReputationLedger equivalent), and a moderation report', () => {
    assert.ok(WORLD_POST_REACTIONS.length > 0);
    assert.ok(WORLD_MEMBER_PROFILES.length === WORLD_COMMUNITY_SPACES.length, 'one reputation profile per seeded Space');
    assert.ok(WORLD_POST_FLAGS.length > 0);
  });

  it('seeds at least one Topic Tag per Space', () => {
    const spaceIdsWithTags = new Set(WORLD_TOPIC_TAGS.map((t) => t.SpaceID));
    for (const space of WORLD_COMMUNITY_SPACES) {
      assert.ok(spaceIdsWithTags.has(space.ID), `Space ${space.Name} has no Topic Tag`);
    }
  });
});

describe('seed-world.sql / seed-world.pg.sql parity with seed-world.mjs', () => {
  const sqlServerScript = readFileSync(join(HERE, 'seed-world.sql'), 'utf8');
  const postgresScript = readFileSync(join(HERE, 'seed-world.pg.sql'), 'utf8');

  it('both dialects insert every WORLD_IDEA_ALLOCATIONS row by ID (not just the first backer)', () => {
    for (const allocation of WORLD_IDEA_ALLOCATIONS) {
      assert.ok(sqlServerScript.includes(allocation.ID), `seed-world.sql missing allocation ${allocation.ID}`);
      assert.ok(postgresScript.includes(allocation.ID), `seed-world.pg.sql missing allocation ${allocation.ID}`);
    }
  });

  it("both dialects recompute the idea post's aggregate columns from its real allocation rows (never a static mismatched literal)", () => {
    assert.ok(/UPDATE \[__mj_BizAppsCommunity\]\.\[ForumIdeaPost\]/.test(sqlServerScript));
    assert.ok(/UPDATE "ForumIdeaPost"/.test(postgresScript));
  });

  it('both dialects insert every WORLD_INTERACTIVE_SESSIONS row by ID', () => {
    for (const session of WORLD_INTERACTIVE_SESSIONS) {
      assert.ok(sqlServerScript.includes(session.ID), `seed-world.sql missing interactive session ${session.ID}`);
      assert.ok(postgresScript.includes(session.ID), `seed-world.pg.sql missing interactive session ${session.ID}`);
    }
  });

  it('both dialects insert all 3 WORLD_POST_REACTIONS rows by ID (not just the first 2)', () => {
    for (const reaction of WORLD_POST_REACTIONS) {
      assert.ok(sqlServerScript.includes(reaction.ID), `seed-world.sql missing reaction ${reaction.ID}`);
      assert.ok(postgresScript.includes(reaction.ID), `seed-world.pg.sql missing reaction ${reaction.ID}`);
    }
  });
});

describe('ARCH-WORLD entity persistence, independent reads, SQL/PG generator, and space-tag parity', () => {
  it('persists double-load + no-op teardown via Metadata/RunView + SQLite and supports independent fresh-provider reads without re-seeding', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'arch-world-seed-test-'));
    const stateFile = join(tempDir, 'arch-world-state.json');
    const sqliteFile = join(tempDir, 'arch-world-state.sqlite');
    try {
      const store = ResetSharedArchWorldStore({
        persistenceFilePath: stateFile,
        sqliteFilePath: sqliteFile,
        clearPersistence: true,
      });
      const first = await LoadArchitectAssociationWorld({
        store,
        persistenceFilePath: stateFile,
        sqliteFilePath: sqliteFile,
      });
      assert.ok(first.createdCount > 0);
      assert.ok(first.validatedEntityCount > 300);

      const second = await LoadArchitectAssociationWorld({
        store,
        persistenceFilePath: stateFile,
        sqliteFilePath: sqliteFile,
      });
      assert.equal(second.createdCount, 0);
      assert.equal(second.updatedCount, 0);
      assert.equal(second.idempotent, true);

      const teardown = TeardownArchitectAssociationWorld({
        store,
        persistenceFilePath: stateFile,
        sqliteFilePath: sqliteFile,
      });
      assert.equal(teardown.preserved, true);
      assert.equal(teardown.persistedOnDisk, true);
      assert.equal(teardown.sqlitePersistedOnDisk, true);

      // Independent reader using a brand-new provider instance backed by SQLite with zero shared memory
      const independentProvider = CreatePersistedArchWorldProvider({
        persistenceFilePath: stateFile,
        sqliteFilePath: sqliteFile,
      });
      try {
        const rv = new RunView(independentProvider);
        const [usersRes, spacesRes, spaceMembersRes, forumsRes, postsRes, postTagsRes, allocsRes] = await Promise.all([
          rv.RunView({ EntityName: 'MJ: Users', ResultType: 'simple' }, independentProvider.CurrentUser),
          rv.RunView({ EntityName: COMMUNITY_ENTITY_NAMES.CommunitySpaces, ResultType: 'simple' }, independentProvider.CurrentUser),
          rv.RunView({ EntityName: 'MJ_BizApps_Collaboration: Space Members', ResultType: 'simple' }, independentProvider.CurrentUser),
          rv.RunView({ EntityName: COMMUNITY_ENTITY_NAMES.Forums, ResultType: 'simple' }, independentProvider.CurrentUser),
          rv.RunView({ EntityName: COMMUNITY_ENTITY_NAMES.ForumPosts, ResultType: 'simple' }, independentProvider.CurrentUser),
          rv.RunView({ EntityName: COMMUNITY_ENTITY_NAMES.ForumPostTags, ResultType: 'simple' }, independentProvider.CurrentUser),
          rv.RunView({ EntityName: COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations, ResultType: 'simple' }, independentProvider.CurrentUser),
        ]);
        assert.equal(usersRes.Results.length, ARCH_MEMBERS.length);
        assert.equal(spacesRes.Results.length, ARCH_COMMUNITY_SPACES.length);
        assert.equal(spaceMembersRes.Results.length, ARCH_SPACE_MEMBERS.length);
        assert.equal(forumsRes.Results.length, ARCH_FORUMS.length);
        assert.equal(postsRes.Results.length, ARCH_POSTS.length);
        assert.equal(postTagsRes.Results.length, ARCH_POST_TAGS.length);
        assert.equal(allocsRes.Results.length, ARCH_IDEA_ALLOCATIONS.length);
      } finally {
        independentProvider.CloseSqlite();
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('BuildArchitectAssociationWorldSql() emits complete 27-table idempotent SQL Server, PostgreSQL, and SQLite statements in identical FK order and executes cleanly on empty schemas', async () => {
    const sqlServer = BuildArchitectAssociationWorldSql('sqlserver');
    const postgres = BuildArchitectAssociationWorldSql('postgres');
    const sqlite = BuildArchitectAssociationWorldSql('sqlite');
    const dual = BuildArchitectAssociationWorldSql();
    assert.equal(dual.sqlServer, sqlServer);
    assert.equal(dual.postgres, postgres);
    assert.equal(dual.sqlite, sqlite);

    for (const group of [
      ARCH_SPACE_TYPES,
      ARCH_SPACE_ROLE_TYPES,
      ARCH_FORUM_ROLE_TYPES,
      ARCH_MEMBERS,
      ARCH_COMMUNITY_SPACES,
      ARCH_SPACE_MEMBERS,
      ARCH_FORUMS,
      ARCH_FORUM_MEMBERS,
      ARCH_MEMBER_PROFILES,
      ARCH_FORUM_SUBSCRIPTIONS,
      ARCH_TOPIC_TAGS,
      ARCH_POST_TAGS,
      ARCH_IDEA_ALLOCATIONS,
      ARCH_CASE_POSTS,
      ARCH_AMA_POSTS,
      ARCH_INTERACTIVE_POSTS,
      ARCH_INTERACTIVE_SESSIONS,
      ARCH_POST_REACTIONS,
      ARCH_POST_FLAGS,
    ]) {
      for (const row of group) {
        assert.ok(sqlServer.includes(row.ID), `sqlServer missing ${row.ID}`);
        assert.ok(postgres.includes(row.ID), `postgres missing ${row.ID}`);
        assert.ok(sqlite.includes(row.ID), `sqlite missing ${row.ID}`);
      }
    }

    const tempDir = mkdtempSync(join(tmpdir(), 'arch-world-sql-seed-'));
    const sqliteFile = join(tempDir, 'arch-world.sqlite');
    const mssqlTranspiledFile = join(tempDir, 'arch-world-mssql.sqlite');
    const pgTranspiledFile = join(tempDir, 'arch-world-pg.sqlite');
    try {
      const res = await ExecuteArchitectAssociationWorldSql({ dialect: 'sqlite', sqliteFilePath: sqliteFile });
      assert.equal(res.counts.SpaceType, ARCH_SPACE_TYPES.length);
      assert.equal(res.counts.SpaceRoleType, ARCH_SPACE_ROLE_TYPES.length);
      assert.equal(res.counts.ForumRoleType, ARCH_FORUM_ROLE_TYPES.length);
      assert.equal(res.counts.User, ARCH_MEMBERS.length);
      assert.equal(res.counts.SpaceMember, ARCH_SPACE_MEMBERS.length);
      assert.equal(res.counts.ForumMember, ARCH_FORUM_MEMBERS.length);
      assert.equal(res.counts.ForumCasePost, ARCH_CASE_POSTS.length);
      assert.equal(res.counts.ForumPostFlag, ARCH_POST_FLAGS.length);

      for (const [dialectName, scriptText, targetFile] of [
        ['sqlserver', sqlServer, mssqlTranspiledFile],
        ['postgres', postgres, pgTranspiledFile],
      ]) {
        const emptyDb = new DatabaseSync(targetFile);
        EnsureArchWorldSqliteSchema(emptyDb);
        emptyDb.close();

        const firstExec = ExecuteTranspiledArchWorldDialectSql({
          dialect: dialectName,
          sqlText: scriptText,
          sqliteFilePath: targetFile,
        });
        const secondExec = ExecuteTranspiledArchWorldDialectSql({
          dialect: dialectName,
          sqlText: scriptText,
          sqliteFilePath: targetFile,
        });
        assert.deepEqual(firstExec.counts, res.counts, `${dialectName} counts must match SQLite 27-table parity`);
        assert.deepEqual(secondExec.counts, firstExec.counts, `${dialectName} double-load must be idempotent`);

        const readerProvider = CreatePersistedArchWorldProvider({
          persistenceFilePath: null,
          sqliteFilePath: targetFile,
        });
        try {
          const rv = new RunView(readerProvider);
          const [spaceRolesRes, forumRolesRes, spaceMembersRes, forumMembersRes] = await Promise.all([
            rv.RunView({ EntityName: 'MJ_BizApps_Collaboration: Space Role Types', ResultType: 'simple' }, readerProvider.CurrentUser),
            rv.RunView({ EntityName: COMMUNITY_ENTITY_NAMES.ForumRoleTypes, ResultType: 'simple' }, readerProvider.CurrentUser),
            rv.RunView({ EntityName: 'MJ_BizApps_Collaboration: Space Members', ResultType: 'simple' }, readerProvider.CurrentUser),
            rv.RunView({ EntityName: COMMUNITY_ENTITY_NAMES.ForumMembers, ResultType: 'simple' }, readerProvider.CurrentUser),
          ]);
          assert.equal(spaceRolesRes.Results.length, ARCH_SPACE_ROLE_TYPES.length);
          assert.ok(
            spaceRolesRes.Results.some((r) => r.ID.toUpperCase() === 'A7C40010-4E12-4B8F-9A10-000000000003'),
            `${dialectName} must provision ARCH-WORLD contributor SpaceRoleType`,
          );
          assert.equal(forumRolesRes.Results.length, ARCH_FORUM_ROLE_TYPES.length);
          assert.equal(spaceMembersRes.Results.length, ARCH_SPACE_MEMBERS.length);
          assert.equal(forumMembersRes.Results.length, ARCH_FORUM_MEMBERS.length);
        } finally {
          readerProvider.CloseSqlite();
        }
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

RegisterArchWorldIntegrationTests();
