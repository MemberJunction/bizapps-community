#!/usr/bin/env node
/**
 * Architect Association World Model (`ARCH-WORLD`) — Authoritative Entity Loader, Durable
 * Relational SQLite Store (`node:sqlite` with `PRAGMA foreign_keys = ON`), Cross-Process
 * Persistence & Deterministic SQL Server / PostgreSQL / SQLite Seed Generator.
 *
 * Supports:
 *  1. Authoritative MJ Entity / Database Provider Mode (`Metadata.GetEntityObject` + `ValidateAsync()` +
 *     `entity.Save()` + `RunView` natural-key lookups across all ServerEntity subclasses), backed by
 *     an on-disk relational SQLite database (`.local-storage/arch-world.sqlite` with strict
 *     `FOREIGN KEY` enforcement) and JSON snapshot (`.local-storage/arch-world-state.json`).
 *  2. Complete 27-table FK-safe SQL generator (`BuildArchitectAssociationWorldSql(dialect, options)`)
 *     for `'sqlserver'`, `'postgres'`, and `'sqlite'` in identical topological dependency order
 *     (including `SpaceType`, `SpaceRoleType`, `ForumType`, `PostType`, `ForumRoleType`, all 26
 *     `__mj.User` rows, `Space`, 64 `SpaceMember` rows, `CommunitySpace`, `Forum`, 14 `ForumMember`
 *     rows, 26 `CommunityMemberProfile` rows, 10 `ForumSubscription` rows, all IsA subtype tables,
 *     and cyclic-FK-safe `AcceptedAnswerPostID` updates), plus live SQL execution (`--apply-db` /
 *     `options.sqlPool` / `options.pgPool` / `options.sqlExecutor`).
 *  3. Cross-process verification (`--verify`) reading persisted relational SQLite tables with zero
 *     shared memory and no re-seeding.
 *
 * Usage:
 *   node scripts/world/arch-world-loader.mjs [--load] [--verify] [--sql] [--pg-sql] [--sqlite-sql]
 *   node scripts/world/arch-world-loader.mjs --sql-out <path> [--dialect sqlserver|postgres|sqlite]
 *   node scripts/world/arch-world-loader.mjs --apply-db [--dialect sqlserver|postgres]
 */
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import {
  ARCH_COMMUNITY_SPACES,
  ARCH_FORUM_TYPES,
  ARCH_FORUMS,
  ARCH_POST_TYPES,
  ARCH_TASK_TYPE_ID,
  GetArchWorldDataset,
} from './arch-world-data.mjs';
import * as CommunityCoreEntitiesServer from '../../packages/CoreEntitiesServer/dist/index.js';
import * as CommunityEntities from '../../packages/Entities/dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
export const DEFAULT_ARCH_WORLD_PERSISTENCE_PATH = join(
  REPO_ROOT,
  '.local-storage',
  'arch-world-state.json',
);
export const DEFAULT_ARCH_WORLD_SQLITE_PATH = join(
  REPO_ROOT,
  '.local-storage',
  'arch-world.sqlite',
);

export const ARCH_TEST_ROLE_ID = 'A7C40000-4E12-4B8F-9A10-000000000001';
export const ARCH_DEFAULT_ENVIRONMENT_ID = 'A7C40030-4E12-4B8F-9A10-000000000001';
export const ARCH_DEFAULT_ARTIFACT_TYPE_ID = 'A7C40040-4E12-4B8F-9A10-000000000001';
export const ARCH_INTERACTIVE_ARTIFACT_ID = 'A7C40910-4E12-4B8F-9A10-000000000001';
export const ARCH_INTERACTIVE_ARTIFACT_VERSION_ID = 'A7C40920-4E12-4B8F-9A10-000000000001';

const requireFromActions = createRequire(new URL('../../packages/Actions/package.json', import.meta.url));
const {
  BaseEntity,
  CompositeKey,
  EntityInfo,
  Metadata,
  ProviderType,
  RunView,
  TransactionGroupBase,
  TransactionResult,
  UserInfo,
} = await import(requireFromActions.resolve('@memberjunction/core'));
const { MJGlobal } = await import(requireFromActions.resolve('@memberjunction/global'));

const { COMMUNITY_ENTITY_NAMES } = CommunityEntities;
const {
  CommunityEngine,
  LoadBizAppsCommunityCoreEntitiesServer,
} = CommunityCoreEntitiesServer;

let sharedStore = null;

function norm(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function resolvePersistenceFilePath(options = {}) {
  if (options.persistenceFilePath === null || options.persistenceFilePath === false) {
    return null;
  }
  if (typeof options.persistenceFilePath === 'string' && options.persistenceFilePath.trim().length > 0) {
    return options.persistenceFilePath.trim();
  }
  const fromEnv = process.env.ARCH_WORLD_STATE_FILE;
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  return DEFAULT_ARCH_WORLD_PERSISTENCE_PATH;
}

export function resolveSqliteFilePath(options = {}) {
  if (options.sqliteFilePath === null || options.sqliteFilePath === false) {
    return null;
  }
  if (typeof options.sqliteFilePath === 'string' && options.sqliteFilePath.trim().length > 0) {
    return options.sqliteFilePath.trim();
  }
  const fromEnv = process.env.ARCH_WORLD_SQLITE_FILE;
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  if (options.persistenceFilePath === null || options.persistenceFilePath === false) {
    return null;
  }
  if (typeof options.persistenceFilePath === 'string' && options.persistenceFilePath.trim().length > 0) {
    return `${options.persistenceFilePath.trim().replace(/\.json$/i, '')}.sqlite`;
  }
  const stateEnv = process.env.ARCH_WORLD_STATE_FILE;
  if (typeof stateEnv === 'string' && stateEnv.trim().length > 0) {
    return `${stateEnv.trim().replace(/\.json$/i, '')}.sqlite`;
  }
  return DEFAULT_ARCH_WORLD_SQLITE_PATH;
}

function valuesEqual(va, vb) {
  if (va instanceof Date && vb instanceof Date) {
    return va.getTime() === vb.getTime();
  }
  if (va instanceof Date && typeof vb === 'string') {
    return va.getTime() === new Date(vb).getTime();
  }
  if (typeof va === 'string' && vb instanceof Date) {
    return new Date(va).getTime() === vb.getTime();
  }
  if (Array.isArray(va) && Array.isArray(vb)) {
    return va.length === vb.length && va.every((v, idx) => valuesEqual(v, vb[idx]));
  }
  return va === vb;
}

function fieldsSubsetMatch(existing, desired, ignoredFields = new Set(), allowedFields = null) {
  for (const key of Object.keys(desired)) {
    if (ignoredFields.has(key)) continue;
    if (allowedFields && !allowedFields.has(key)) continue;
    const desiredVal = desired[key];
    if (desiredVal === undefined) continue;
    if (!valuesEqual(existing[key], desiredVal)) {
      return false;
    }
  }
  return true;
}

function deriveMemberFields(member) {
  const rawName = String(member?.Name ?? 'AGPA Member').trim();
  const withoutTitle = rawName.replace(/^(Dr\.|Mr\.|Ms\.|Mrs\.)\s+/i, '').split(',')[0].trim();
  const parts = withoutTitle.split(/\s+/).filter(Boolean);
  const firstName = (member?.FirstName ?? parts[0] ?? 'AGPA').slice(0, 50);
  const lastName = (member?.LastName ?? (parts.length > 1 ? parts.slice(1).join(' ') : 'Member')).slice(0, 50);
  const isOwner = norm(member?.ID) === 'a7c40400-4e12-4b8f-9a10-000000000022';
  return {
    ID: member.ID,
    Name: rawName.slice(0, 100),
    FirstName: firstName,
    LastName: lastName,
    Email: String(member.Email ?? '').slice(0, 100),
    Type: member?.Type === 'Owner' || isOwner ? 'Owner' : 'User',
    IsActive: member?.IsActive !== false,
  };
}

function normalizeSubscriptionDeliveryLevel(sub) {
  const raw = sub?.DeliveryLevel ?? sub?.Cadence ?? 'Digest Only';
  if (raw === 'Instant') return 'Every Post';
  if (raw === 'Daily' || raw === 'Weekly') return 'Digest Only';
  if (['Every Post', 'First Post Only', 'Digest Only', 'Muted'].includes(raw)) {
    return raw;
  }
  return 'Digest Only';
}

function sortPostsTopologically(posts) {
  const remaining = new Map(posts.map((p) => [norm(p.ID), p]));
  const inserted = new Set();
  const ordered = [];

  const sortedCandidates = [...posts].sort(
    (a, b) => (a.ReplyDepth ?? 0) - (b.ReplyDepth ?? 0) || String(a.ID).localeCompare(String(b.ID)),
  );

  let progress = true;
  while (remaining.size > 0 && progress) {
    progress = false;
    for (const post of sortedCandidates) {
      const idKey = norm(post.ID);
      if (!remaining.has(idKey)) continue;
      const rootKey = post.RootPostID ? norm(post.RootPostID) : null;
      const parentKey = post.ParentPostID ? norm(post.ParentPostID) : null;
      const rootReady = !rootKey || rootKey === idKey || inserted.has(rootKey) || !remaining.has(rootKey);
      const parentReady = !parentKey || parentKey === idKey || inserted.has(parentKey) || !remaining.has(parentKey);
      if (rootReady && parentReady) {
        ordered.push(post);
        inserted.add(idKey);
        remaining.delete(idKey);
        progress = true;
      }
    }
  }

  for (const post of sortedCandidates) {
    if (remaining.has(norm(post.ID))) {
      ordered.push(post);
    }
  }
  return ordered;
}

/** Builds a `UserInfo` carrying the authoritative `ARCH_TEST_ROLE_ID` permission role. */
export function MakeArchUserInfo(user) {
  const id = String(user?.ID ?? '').trim();
  return new UserInfo(undefined, {
    ID: id,
    Name: String(user?.Name ?? 'AGPA Member'),
    Email: String(user?.Email ?? 'member@agpa-guild.org'),
    Type: user?.Type ?? 'User',
    UserRoles: [{ RoleID: ARCH_TEST_ROLE_ID, Role: 'Developer', UserID: id }],
  });
}

/**
 * Creates a fresh, empty persistent store for `ARCH-WORLD` with natural-key indexes.
 */
export function CreateEmptyArchWorldStore() {
  return {
    users: new Map(),
    usersByEmail: new Map(),
    spaceTypes: new Map(),
    spaceRoleTypes: new Map(),
    forumTypes: new Map(),
    postTypes: new Map(),
    forumRoleTypes: new Map(),
    spaces: new Map(),
    spacesBySlug: new Map(),
    communitySpaces: new Map(),
    spaceMembers: new Map(),
    spaceMembersByKey: new Map(),
    forums: new Map(),
    forumsByKey: new Map(),
    ideaCampaigns: new Map(),
    forumMembers: new Map(),
    forumMembersByKey: new Map(),
    memberProfiles: new Map(),
    memberProfilesByKey: new Map(),
    forumSubscriptions: new Map(),
    forumSubscriptionsByKey: new Map(),
    topicTags: new Map(),
    topicTagsByKey: new Map(),
    posts: new Map(),
    postsByKey: new Map(),
    questionPosts: new Map(),
    answerPosts: new Map(),
    ideaPosts: new Map(),
    ideaAllocations: new Map(),
    ideaAllocationsByKey: new Map(),
    casePosts: new Map(),
    amaPosts: new Map(),
    interactivePosts: new Map(),
    interactiveSessions: new Map(),
    interactiveSessionsByKey: new Map(),
    postTags: new Map(),
    postTagsByKey: new Map(),
    postReactions: new Map(),
    postReactionsByKey: new Map(),
    postFlags: new Map(),
    postFlagsByKey: new Map(),
    tasks: new Map(),
    taskTypes: new Map([
      [ARCH_TASK_TYPE_ID.toLowerCase(), { ID: ARCH_TASK_TYPE_ID, Name: 'Community Action Item' }],
    ]),
    processedInboundMessageIds: new Set(),
    lastLoadedAt: null,
  };
}

/** Serializes an `ARCH-WORLD` store to a deterministic JSON-compatible object. */
export function SerializeArchWorldStore(store) {
  return {
    schemaVersion: 'arch-world-store/v2',
    lastLoadedAt: store.lastLoadedAt,
    processedInboundMessageIds: Array.from(store.processedInboundMessageIds),
    users: Array.from(store.users.values()),
    spaceTypes: Array.from(store.spaceTypes.values()),
    spaceRoleTypes: Array.from(store.spaceRoleTypes.values()),
    forumTypes: Array.from(store.forumTypes.values()),
    postTypes: Array.from(store.postTypes.values()),
    forumRoleTypes: Array.from(store.forumRoleTypes.values()),
    spaces: Array.from(store.spaces.values()),
    communitySpaces: Array.from(store.communitySpaces.values()),
    spaceMembers: Array.from(store.spaceMembers.values()),
    forums: Array.from(store.forums.values()),
    ideaCampaigns: Array.from(store.ideaCampaigns.values()),
    forumMembers: Array.from(store.forumMembers.values()),
    memberProfiles: Array.from(store.memberProfiles.values()),
    forumSubscriptions: Array.from(store.forumSubscriptions.values()),
    topicTags: Array.from(store.topicTags.values()),
    posts: Array.from(store.posts.values()),
    questionPosts: Array.from(store.questionPosts.values()),
    answerPosts: Array.from(store.answerPosts.values()),
    ideaPosts: Array.from(store.ideaPosts.values()),
    ideaAllocations: Array.from(store.ideaAllocations.values()),
    casePosts: Array.from(store.casePosts.values()),
    amaPosts: Array.from(store.amaPosts.values()),
    interactivePosts: Array.from(store.interactivePosts.values()),
    interactiveSessions: Array.from(store.interactiveSessions.values()),
    postTags: Array.from(store.postTags.values()),
    postReactions: Array.from(store.postReactions.values()),
    postFlags: Array.from(store.postFlags.values()),
    tasks: Array.from(store.tasks.values()),
    taskTypes: Array.from(store.taskTypes.values()),
  };
}

function indexStoreRow(map, indexMap, naturalKey, row) {
  const idKey = norm(row.ID);
  map.set(idKey, { ...row });
  if (indexMap && naturalKey) {
    indexMap.set(naturalKey, idKey);
  }
}

/** Rebuilds an `ARCH-WORLD` store and all natural-key indexes from a serialized snapshot. */
export function DeserializeArchWorldStore(payload) {
  const store = CreateEmptyArchWorldStore();
  if (!payload || typeof payload !== 'object') return store;

  store.lastLoadedAt = payload.lastLoadedAt ?? null;
  if (Array.isArray(payload.processedInboundMessageIds)) {
    for (const id of payload.processedInboundMessageIds) {
      store.processedInboundMessageIds.add(String(id));
    }
  }

  for (const row of payload.users ?? []) indexStoreRow(store.users, store.usersByEmail, norm(row.Email), row);
  for (const row of payload.spaceTypes ?? []) indexStoreRow(store.spaceTypes, null, null, row);
  for (const row of payload.spaceRoleTypes ?? []) indexStoreRow(store.spaceRoleTypes, null, null, row);
  for (const row of payload.forumTypes ?? []) indexStoreRow(store.forumTypes, null, null, row);
  for (const row of payload.postTypes ?? []) indexStoreRow(store.postTypes, null, null, row);
  for (const row of payload.forumRoleTypes ?? []) indexStoreRow(store.forumRoleTypes, null, null, row);
  for (const row of payload.spaces ?? []) indexStoreRow(store.spaces, store.spacesBySlug, norm(row.Slug), row);
  for (const row of payload.communitySpaces ?? []) indexStoreRow(store.communitySpaces, null, null, row);
  for (const row of payload.spaceMembers ?? []) {
    indexStoreRow(store.spaceMembers, store.spaceMembersByKey, `${norm(row.SpaceID)}:${norm(row.UserID)}`, row);
  }
  for (const row of payload.forums ?? []) {
    indexStoreRow(store.forums, store.forumsByKey, `${norm(row.SpaceID)}:${norm(row.Slug)}`, row);
  }
  for (const row of payload.ideaCampaigns ?? []) indexStoreRow(store.ideaCampaigns, null, null, row);
  for (const row of payload.forumMembers ?? []) {
    indexStoreRow(store.forumMembers, store.forumMembersByKey, `${norm(row.ForumID)}:${norm(row.UserID)}`, row);
  }
  for (const row of payload.memberProfiles ?? []) {
    indexStoreRow(store.memberProfiles, store.memberProfilesByKey, `${norm(row.SpaceID)}:${norm(row.UserID)}`, row);
  }
  for (const row of payload.forumSubscriptions ?? []) {
    indexStoreRow(
      store.forumSubscriptions,
      store.forumSubscriptionsByKey,
      `${norm(row.ForumID)}:${norm(row.UserID)}`,
      row,
    );
  }
  for (const row of payload.topicTags ?? []) {
    indexStoreRow(store.topicTags, store.topicTagsByKey, `${norm(row.SpaceID)}:${norm(row.Slug)}`, row);
  }
  for (const row of payload.posts ?? []) {
    const key = row.Slug ? `${norm(row.ForumID)}:slug:${norm(row.Slug)}` : `id:${norm(row.ID)}`;
    indexStoreRow(store.posts, store.postsByKey, key, row);
  }
  for (const row of payload.questionPosts ?? []) indexStoreRow(store.questionPosts, null, null, row);
  for (const row of payload.answerPosts ?? []) indexStoreRow(store.answerPosts, null, null, row);
  for (const row of payload.ideaPosts ?? []) indexStoreRow(store.ideaPosts, null, null, row);
  for (const row of payload.ideaAllocations ?? []) {
    indexStoreRow(store.ideaAllocations, store.ideaAllocationsByKey, `${norm(row.IdeaPostID)}:${norm(row.UserID)}`, row);
  }
  for (const row of payload.casePosts ?? []) indexStoreRow(store.casePosts, null, null, row);
  for (const row of payload.amaPosts ?? []) indexStoreRow(store.amaPosts, null, null, row);
  for (const row of payload.interactivePosts ?? []) indexStoreRow(store.interactivePosts, null, null, row);
  for (const row of payload.interactiveSessions ?? []) {
    indexStoreRow(
      store.interactiveSessions,
      store.interactiveSessionsByKey,
      `${norm(row.InteractivePostID)}:${norm(row.UserID)}:${row.AttemptNumber}`,
      row,
    );
  }
  for (const row of payload.postTags ?? []) {
    indexStoreRow(store.postTags, store.postTagsByKey, `${norm(row.PostID)}:${norm(row.TopicTagID)}`, row);
  }
  for (const row of payload.postReactions ?? []) {
    indexStoreRow(
      store.postReactions,
      store.postReactionsByKey,
      `${norm(row.PostID)}:${norm(row.UserID)}:${norm(row.ReactionKind)}`,
      row,
    );
  }
  for (const row of payload.postFlags ?? []) {
    indexStoreRow(
      store.postFlags,
      store.postFlagsByKey,
      `${norm(row.PostID)}:${norm(row.ReportedByUserID)}:${norm(row.ReasonCategory)}`,
      row,
    );
  }
  for (const row of payload.tasks ?? []) indexStoreRow(store.tasks, null, null, row);
  for (const row of payload.taskTypes ?? []) indexStoreRow(store.taskTypes, null, null, row);

  return store;
}

// ============================================================================
// Relational SQLite Schema & Sync Layer (`node:sqlite` with PRAGMA foreign_keys = ON)
// ============================================================================

const SQLITE_SCHEMA_DDL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "User" (
  "ID" TEXT PRIMARY KEY,
  "Name" TEXT NOT NULL,
  "FirstName" TEXT NULL,
  "LastName" TEXT NULL,
  "Email" TEXT NOT NULL UNIQUE,
  "Type" TEXT NOT NULL CHECK ("Type" IN ('User', 'Owner')),
  "IsActive" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "SpaceType" (
  "ID" TEXT PRIMARY KEY,
  "Code" TEXT NOT NULL UNIQUE,
  "Name" TEXT NOT NULL,
  "Description" TEXT NULL,
  "Vocabulary" TEXT NOT NULL DEFAULT 'community',
  "Discoverability" TEXT NOT NULL DEFAULT 'Listed',
  "JoinMode" TEXT NOT NULL DEFAULT 'SelfServe',
  "MessagingPanel" INTEGER NOT NULL DEFAULT 1,
  "LibraryPanel" INTEGER NOT NULL DEFAULT 1,
  "WorkPanel" INTEGER NOT NULL DEFAULT 1,
  "DefaultAgentRetrieval" TEXT NOT NULL DEFAULT 'Included',
  "DefaultBand" TEXT NOT NULL DEFAULT 'Shared',
  "InviteApproval" TEXT NOT NULL DEFAULT 'Approve',
  "DisplayRank" INTEGER NOT NULL DEFAULT 0,
  "IsActive" INTEGER NOT NULL DEFAULT 1,
  "DefaultAllowParentAssignees" INTEGER NOT NULL DEFAULT 1,
  "Configuration" TEXT NULL
);

CREATE TABLE IF NOT EXISTS "SpaceRoleType" (
  "ID" TEXT PRIMARY KEY,
  "Code" TEXT NOT NULL UNIQUE,
  "Name" TEXT NOT NULL,
  "Description" TEXT NULL,
  "Level" INTEGER NOT NULL DEFAULT 100,
  "MaxGrantableLevel" INTEGER NOT NULL DEFAULT 0,
  "CanInvite" INTEGER NOT NULL DEFAULT 0,
  "CanSeeTeamBand" INTEGER NOT NULL DEFAULT 0,
  "CanContribute" INTEGER NOT NULL DEFAULT 1,
  "IsOwnerRole" INTEGER NOT NULL DEFAULT 0,
  "CanPromoteBand" INTEGER NOT NULL DEFAULT 0,
  "DisplayRank" INTEGER NOT NULL DEFAULT 0,
  "IsActive" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "Space" (
  "ID" TEXT PRIMARY KEY,
  "SpaceTypeID" TEXT NOT NULL REFERENCES "SpaceType"("ID"),
  "ParentID" TEXT NULL REFERENCES "Space"("ID"),
  "Slug" TEXT NULL,
  "Name" TEXT NOT NULL,
  "Description" TEXT NULL,
  "OwnerID" TEXT NOT NULL REFERENCES "User"("ID"),
  "InheritsMembership" INTEGER NOT NULL DEFAULT 0,
  "AgentRetrieval" TEXT NOT NULL DEFAULT 'Included',
  "StartedAt" TEXT NULL,
  "ClosedAt" TEXT NULL,
  "AllowParentAssignees" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "SpaceMember" (
  "ID" TEXT PRIMARY KEY,
  "SpaceID" TEXT NOT NULL REFERENCES "Space"("ID"),
  "UserID" TEXT NOT NULL REFERENCES "User"("ID"),
  "SpaceRoleTypeID" TEXT NOT NULL REFERENCES "SpaceRoleType"("ID"),
  "Band" TEXT NOT NULL DEFAULT 'Shared',
  "Status" TEXT NOT NULL DEFAULT 'Active',
  UNIQUE ("SpaceID", "UserID")
);

CREATE TABLE IF NOT EXISTS "CommunitySpace" (
  "ID" TEXT PRIMARY KEY REFERENCES "Space"("ID"),
  "Slug" TEXT NOT NULL UNIQUE,
  "CommunityKind" TEXT NOT NULL CHECK ("CommunityKind" IN ('Association Wide', 'Special Interest Group', 'Product Community', 'Working Group', 'Other')),
  "AnonymousReadMode" TEXT NOT NULL CHECK ("AnonymousReadMode" IN ('None', 'Teaser Only', 'Full Read')),
  "AskFirstEnabled" INTEGER NOT NULL DEFAULT 1,
  "DefaultDigestCadence" TEXT NOT NULL CHECK ("DefaultDigestCadence" IN ('Every Post', 'Daily Digest', 'Weekly Digest', 'Highlights Only', 'Muted'))
);

CREATE TABLE IF NOT EXISTS "ForumType" (
  "ID" TEXT PRIMARY KEY,
  "Code" TEXT NOT NULL UNIQUE,
  "Name" TEXT NOT NULL UNIQUE,
  "ServerDriverClass" TEXT NULL,
  "UIDriverClass" TEXT NULL,
  "ExtensionEntity" TEXT NULL,
  "Configuration" TEXT NULL,
  "Sequence" INTEGER NOT NULL DEFAULT 0,
  "IsActive" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "PostType" (
  "ID" TEXT PRIMARY KEY,
  "Code" TEXT NOT NULL UNIQUE,
  "Name" TEXT NOT NULL UNIQUE,
  "ServerDriverClass" TEXT NULL,
  "UIDriverClass" TEXT NULL,
  "ExtensionEntity" TEXT NULL,
  "PlacementRule" TEXT NOT NULL CHECK ("PlacementRule" IN ('Root Only', 'Reply Only', 'Both')),
  "AllowsNestedReplies" INTEGER NOT NULL DEFAULT 1,
  "TriggersThreadSynthesis" INTEGER NOT NULL DEFAULT 1,
  "IndexedInCorpus" INTEGER NOT NULL DEFAULT 1,
  "Configuration" TEXT NULL,
  "Sequence" INTEGER NOT NULL DEFAULT 0,
  "IsActive" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "ForumRoleType" (
  "ID" TEXT PRIMARY KEY,
  "Code" TEXT NOT NULL UNIQUE,
  "Name" TEXT NOT NULL UNIQUE,
  "Description" TEXT NULL,
  "Level" INTEGER NOT NULL DEFAULT 100,
  "CanConfigureForum" INTEGER NOT NULL DEFAULT 0,
  "CanModerateQueue" INTEGER NOT NULL DEFAULT 0,
  "CanPinOrLock" INTEGER NOT NULL DEFAULT 0,
  "CanAcceptAnswers" INTEGER NOT NULL DEFAULT 0,
  "CanVerifyCanon" INTEGER NOT NULL DEFAULT 0,
  "CanPromoteToSpace" INTEGER NOT NULL DEFAULT 0,
  "CanCreateRootPost" INTEGER NOT NULL DEFAULT 1,
  "CanReply" INTEGER NOT NULL DEFAULT 1,
  "CanCoEditDocs" INTEGER NOT NULL DEFAULT 0,
  "VoteWeightMultiplier" REAL NOT NULL DEFAULT 1.0,
  "Sequence" INTEGER NOT NULL DEFAULT 0,
  "IsActive" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "Forum" (
  "ID" TEXT PRIMARY KEY,
  "SpaceID" TEXT NOT NULL REFERENCES "CommunitySpace"("ID"),
  "ParentForumID" TEXT NULL REFERENCES "Forum"("ID"),
  "ForumTypeID" TEXT NOT NULL REFERENCES "ForumType"("ID"),
  "Slug" TEXT NOT NULL,
  "Name" TEXT NOT NULL,
  "Description" TEXT NULL,
  "Icon" TEXT NULL,
  "ColorHex" TEXT NULL,
  "VisibilityBand" TEXT NOT NULL CHECK ("VisibilityBand" IN ('Shared', 'Team', 'PrivateForum')),
  "AnonymousReadMode" TEXT NULL,
  "InheritsSpaceMembers" INTEGER NOT NULL DEFAULT 1,
  "PostingPolicy" TEXT NOT NULL CHECK ("PostingPolicy" IN ('Open', 'Moderated', 'ReadOnly')),
  "InboundEmailAlias" TEXT NULL,
  "Sequence" INTEGER NOT NULL DEFAULT 0,
  "Status" TEXT NOT NULL CHECK ("Status" IN ('Active', 'Archived', 'Locked')),
  "Configuration" TEXT NULL,
  UNIQUE ("SpaceID", "Slug")
);

CREATE TABLE IF NOT EXISTS "ForumMember" (
  "ID" TEXT PRIMARY KEY,
  "ForumID" TEXT NOT NULL REFERENCES "Forum"("ID"),
  "UserID" TEXT NOT NULL REFERENCES "User"("ID"),
  "ForumRoleTypeID" TEXT NOT NULL REFERENCES "ForumRoleType"("ID"),
  "Status" TEXT NOT NULL CHECK ("Status" IN ('Active', 'Invited', 'Muted', 'Removed')),
  UNIQUE ("ForumID", "UserID")
);

CREATE TABLE IF NOT EXISTS "CommunityMemberProfile" (
  "ID" TEXT PRIMARY KEY,
  "SpaceID" TEXT NOT NULL REFERENCES "CommunitySpace"("ID"),
  "UserID" TEXT NOT NULL REFERENCES "User"("ID"),
  "PersonID" TEXT NULL,
  "BioMarkdown" TEXT NULL,
  "ExpertiseTagsJSON" TEXT NULL,
  "HelpfulAnswerCount" INTEGER NOT NULL DEFAULT 0,
  "AcceptedAnswerCount" INTEGER NOT NULL DEFAULT 0,
  "ReputationScore" INTEGER NOT NULL DEFAULT 0,
  "DigestCadence" TEXT NOT NULL CHECK ("DigestCadence" IN ('Every Post', 'Daily Digest', 'Weekly Digest', 'Highlights Only', 'Muted')),
  "OpenToPeerMentoring" INTEGER NOT NULL DEFAULT 0,
  UNIQUE ("SpaceID", "UserID")
);

CREATE TABLE IF NOT EXISTS "ForumTopicTag" (
  "ID" TEXT PRIMARY KEY,
  "SpaceID" TEXT NOT NULL REFERENCES "CommunitySpace"("ID"),
  "ParentTagID" TEXT NULL REFERENCES "ForumTopicTag"("ID"),
  "TagID" TEXT NULL,
  "Slug" TEXT NOT NULL,
  "Name" TEXT NOT NULL,
  "Description" TEXT NULL,
  "ColorHex" TEXT NULL,
  "IsOfficial" INTEGER NOT NULL DEFAULT 0,
  "PostCount" INTEGER NOT NULL DEFAULT 0,
  UNIQUE ("SpaceID", "Slug")
);

CREATE TABLE IF NOT EXISTS "TaskType" (
  "ID" TEXT PRIMARY KEY,
  "Name" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Task" (
  "ID" TEXT PRIMARY KEY,
  "Name" TEXT NOT NULL,
  "Description" TEXT NULL,
  "TypeID" TEXT NOT NULL REFERENCES "TaskType"("ID"),
  "UserID" TEXT NULL REFERENCES "User"("ID")
);

CREATE TABLE IF NOT EXISTS "Environment" (
  "ID" TEXT PRIMARY KEY,
  "Name" TEXT NOT NULL,
  "IsDefault" INTEGER NOT NULL DEFAULT 1,
  "__mj_CreatedAt" TEXT NULL,
  "__mj_UpdatedAt" TEXT NULL
);

CREATE TABLE IF NOT EXISTS "ArtifactType" (
  "ID" TEXT PRIMARY KEY,
  "Name" TEXT NOT NULL,
  "__mj_CreatedAt" TEXT NULL,
  "__mj_UpdatedAt" TEXT NULL
);

CREATE TABLE IF NOT EXISTS "Artifact" (
  "ID" TEXT PRIMARY KEY,
  "EnvironmentID" TEXT NOT NULL REFERENCES "Environment"("ID"),
  "Name" TEXT NOT NULL,
  "Description" TEXT NULL,
  "TypeID" TEXT NOT NULL REFERENCES "ArtifactType"("ID"),
  "UserID" TEXT NOT NULL REFERENCES "User"("ID"),
  "Visibility" TEXT NOT NULL DEFAULT 'Always',
  "__mj_CreatedAt" TEXT NULL,
  "__mj_UpdatedAt" TEXT NULL
);

CREATE TABLE IF NOT EXISTS "ArtifactVersion" (
  "ID" TEXT PRIMARY KEY,
  "ArtifactID" TEXT NOT NULL REFERENCES "Artifact"("ID"),
  "VersionNumber" INTEGER NOT NULL DEFAULT 1,
  "UserID" TEXT NOT NULL REFERENCES "User"("ID"),
  "ContentMode" TEXT NOT NULL DEFAULT 'Text',
  "ForceToolsOnly" INTEGER NOT NULL DEFAULT 0,
  "__mj_CreatedAt" TEXT NULL,
  "__mj_UpdatedAt" TEXT NULL
);

CREATE TABLE IF NOT EXISTS "ForumPost" (
  "ID" TEXT PRIMARY KEY,
  "ForumID" TEXT NOT NULL REFERENCES "Forum"("ID"),
  "PostTypeID" TEXT NOT NULL REFERENCES "PostType"("ID"),
  "RootPostID" TEXT NULL REFERENCES "ForumPost"("ID"),
  "ParentPostID" TEXT NULL REFERENCES "ForumPost"("ID"),
  "ReplyDepth" INTEGER NOT NULL DEFAULT 0,
  "AuthorUserID" TEXT NULL REFERENCES "User"("ID"),
  "AuthorPersonID" TEXT NULL,
  "AuthorAgentID" TEXT NULL,
  "Title" TEXT NULL,
  "Slug" TEXT NULL,
  "BodyMarkdown" TEXT NOT NULL,
  "SummaryMarkdown" TEXT NULL,
  "SummaryGeneratedAt" TEXT NULL,
  "SummaryReplyWatermark" INTEGER NOT NULL DEFAULT 0,
  "VisibilityBand" TEXT NOT NULL CHECK ("VisibilityBand" IN ('Shared', 'Team')),
  "Status" TEXT NOT NULL CHECK ("Status" IN ('Draft', 'PendingModeration', 'Published', 'Answered', 'Resolved', 'Archived', 'Redacted')),
  "IsPinned" INTEGER NOT NULL DEFAULT 0,
  "IsLocked" INTEGER NOT NULL DEFAULT 0,
  "IsFeatured" INTEGER NOT NULL DEFAULT 0,
  "ReplyCount" INTEGER NOT NULL DEFAULT 0,
  "ParticipantCount" INTEGER NOT NULL DEFAULT 1,
  "ReactionScore" INTEGER NOT NULL DEFAULT 0,
  "ViewCount" INTEGER NOT NULL DEFAULT 0,
  "LastActivityAt" TEXT NULL,
  "CreatedAt" TEXT NULL,
  "PromotedToSpaceID" TEXT NULL REFERENCES "Space"("ID"),
  "LinkedTaskID" TEXT NULL REFERENCES "Task"("ID")
);

CREATE TABLE IF NOT EXISTS "ForumSubscription" (
  "ID" TEXT PRIMARY KEY,
  "UserID" TEXT NOT NULL REFERENCES "User"("ID"),
  "ForumID" TEXT NULL REFERENCES "Forum"("ID"),
  "RootPostID" TEXT NULL REFERENCES "ForumPost"("ID"),
  "TopicTagID" TEXT NULL REFERENCES "ForumTopicTag"("ID"),
  "DeliveryLevel" TEXT NOT NULL CHECK ("DeliveryLevel" IN ('Every Post', 'First Post Only', 'Digest Only', 'Muted'))
);

CREATE TABLE IF NOT EXISTS "ForumQuestionPost" (
  "ID" TEXT PRIMARY KEY REFERENCES "ForumPost"("ID"),
  "AcceptedAnswerPostID" TEXT NULL REFERENCES "ForumAnswerPost"("ID"),
  "AICanonAnswerPostID" TEXT NULL REFERENCES "ForumAnswerPost"("ID"),
  "BountyPoints" INTEGER NOT NULL DEFAULT 0,
  "ResolvedAt" TEXT NULL
);

CREATE TABLE IF NOT EXISTS "ForumAnswerPost" (
  "ID" TEXT PRIMARY KEY REFERENCES "ForumPost"("ID"),
  "QuestionPostID" TEXT NOT NULL REFERENCES "ForumQuestionPost"("ID"),
  "IsAcceptedByAuthor" INTEGER NOT NULL DEFAULT 0,
  "IsVerifiedByModerator" INTEGER NOT NULL DEFAULT 0,
  "VerifiedByUserID" TEXT NULL REFERENCES "User"("ID"),
  "VerifiedAt" TEXT NULL,
  "AIEpistemicStatus" TEXT NULL CHECK ("AIEpistemicStatus" IS NULL OR "AIEpistemicStatus" IN ('Canon Verified', 'Novel Insight', 'Partially Outdated', 'Conflicts With Canon')),
  "AIConfidenceScore" REAL NULL,
  "AIRationaleMarkdown" TEXT NULL,
  "FreshnessReviewDueAt" TEXT NULL
);

CREATE TABLE IF NOT EXISTS "ForumIdeaCampaign" (
  "ID" TEXT PRIMARY KEY REFERENCES "Forum"("ID"),
  "DefaultBudgetPoints" INTEGER NOT NULL DEFAULT 100,
  "AllocationMode" TEXT NOT NULL CHECK ("AllocationMode" IN ('Point Allocation', 'Quadratic')),
  "MaxPointsPerIdea" INTEGER NULL,
  "SubmissionsCloseAt" TEXT NULL,
  "VotingClosesAt" TEXT NULL
);

CREATE TABLE IF NOT EXISTS "ForumIdeaPost" (
  "ID" TEXT PRIMARY KEY REFERENCES "ForumPost"("ID"),
  "IdeaStatus" TEXT NOT NULL CHECK ("IdeaStatus" IN ('Under Consideration', 'Planned', 'In Progress', 'Shipped', 'Declined')),
  "TotalPointsAllocated" INTEGER NOT NULL DEFAULT 0,
  "EffectiveQuadraticVotes" REAL NOT NULL DEFAULT 0,
  "UniqueBackerCount" INTEGER NOT NULL DEFAULT 0,
  "TargetReleaseOrQuarter" TEXT NULL,
  "StatusRationaleMarkdown" TEXT NULL,
  "MergedIntoIdeaPostID" TEXT NULL REFERENCES "ForumIdeaPost"("ID")
);

CREATE TABLE IF NOT EXISTS "ForumIdeaAllocation" (
  "ID" TEXT PRIMARY KEY,
  "IdeaPostID" TEXT NOT NULL REFERENCES "ForumIdeaPost"("ID"),
  "UserID" TEXT NOT NULL REFERENCES "User"("ID"),
  "PointsAllocated" INTEGER NOT NULL CHECK ("PointsAllocated" > 0),
  "QuadraticVotes" REAL NOT NULL,
  "RationaleComment" TEXT NULL,
  UNIQUE ("IdeaPostID", "UserID")
);

CREATE TABLE IF NOT EXISTS "ForumCasePost" (
  "ID" TEXT PRIMARY KEY REFERENCES "ForumPost"("ID"),
  "SituationMarkdown" TEXT NOT NULL,
  "ActionTakenMarkdown" TEXT NOT NULL,
  "OutcomeMarkdown" TEXT NULL,
  "IsAnonymized" INTEGER NOT NULL DEFAULT 0,
  "AnonymizedAuthorAlias" TEXT NULL
);

CREATE TABLE IF NOT EXISTS "ForumAMAPost" (
  "ID" TEXT PRIMARY KEY REFERENCES "ForumPost"("ID"),
  "HostUserID" TEXT NOT NULL REFERENCES "User"("ID"),
  "ScheduledStartAt" TEXT NOT NULL,
  "ScheduledEndAt" TEXT NOT NULL,
  "QuestionsOpenAt" TEXT NOT NULL,
  "IsLiveNow" INTEGER NOT NULL DEFAULT 0,
  "RecapMarkdown" TEXT NULL
);

CREATE TABLE IF NOT EXISTS "ForumInteractivePost" (
  "ID" TEXT PRIMARY KEY REFERENCES "ForumPost"("ID"),
  "ComponentArtifactID" TEXT NOT NULL REFERENCES "Artifact"("ID"),
  "PinnedArtifactVersionID" TEXT NULL REFERENCES "ArtifactVersion"("ID"),
  "ExperienceKind" TEXT NOT NULL CHECK ("ExperienceKind" IN ('Quiz', 'Trivia', 'Calculator', 'Simulation', 'Flashcards', 'Poll Game', 'Other')),
  "ScoringMode" TEXT NOT NULL CHECK ("ScoringMode" IN ('Best Score', 'Fastest Time', 'Streak', 'Completion', 'None')),
  "ShowLeaderboard" INTEGER NOT NULL DEFAULT 1,
  "MaxAttemptsPerMember" INTEGER NULL,
  "PlayCount" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "ForumInteractiveSession" (
  "ID" TEXT PRIMARY KEY,
  "InteractivePostID" TEXT NOT NULL REFERENCES "ForumInteractivePost"("ID"),
  "ArtifactVersionID" TEXT NOT NULL REFERENCES "ArtifactVersion"("ID"),
  "UserID" TEXT NOT NULL REFERENCES "User"("ID"),
  "AttemptNumber" INTEGER NOT NULL DEFAULT 1,
  "Score" REAL NULL,
  "DurationSeconds" INTEGER NULL,
  "Completed" INTEGER NOT NULL DEFAULT 0,
  UNIQUE ("InteractivePostID", "UserID", "AttemptNumber")
);

CREATE TABLE IF NOT EXISTS "ForumPostTag" (
  "ID" TEXT PRIMARY KEY,
  "PostID" TEXT NOT NULL REFERENCES "ForumPost"("ID"),
  "TopicTagID" TEXT NOT NULL REFERENCES "ForumTopicTag"("ID"),
  "AssignedByAI" INTEGER NOT NULL DEFAULT 0,
  UNIQUE ("PostID", "TopicTagID")
);

CREATE TABLE IF NOT EXISTS "ForumPostReaction" (
  "ID" TEXT PRIMARY KEY,
  "PostID" TEXT NOT NULL REFERENCES "ForumPost"("ID"),
  "UserID" TEXT NOT NULL REFERENCES "User"("ID"),
  "ReactionKind" TEXT NOT NULL CHECK ("ReactionKind" IN ('Upvote', 'Helpful', 'Insightful', 'Agree', 'Celebrate', 'Curious')),
  "Weight" REAL NOT NULL DEFAULT 1.0,
  UNIQUE ("PostID", "UserID", "ReactionKind")
);

CREATE TABLE IF NOT EXISTS "ForumPostFlag" (
  "ID" TEXT PRIMARY KEY,
  "PostID" TEXT NOT NULL REFERENCES "ForumPost"("ID"),
  "ReportedByUserID" TEXT NULL REFERENCES "User"("ID"),
  "ReasonCategory" TEXT NOT NULL CHECK ("ReasonCategory" IN ('Off Topic', 'Spam', 'Harassment', 'Outdated Advice', 'Needs Redaction', 'Other')),
  "Status" TEXT NOT NULL CHECK ("Status" IN ('Open', 'Dismissed', 'ActionTaken')),
  "ReasonDetails" TEXT NULL
);

CREATE TABLE IF NOT EXISTS "ArchWorldMeta" (
  "Key" TEXT PRIMARY KEY,
  "Value" TEXT NULL
);
`;

const SQLITE_TABLE_SPECS = {
  'MJ: Users': {
    table: 'User',
    storeKey: 'users',
    columns: ['ID', 'Name', 'FirstName', 'LastName', 'Email', 'Type', 'IsActive'],
    booleans: new Set(['IsActive']),
  },
  'MJ: Task Types': {
    table: 'TaskType',
    storeKey: 'taskTypes',
    columns: ['ID', 'Name'],
    booleans: new Set(),
  },
  'MJ: Tasks': {
    table: 'Task',
    storeKey: 'tasks',
    columns: ['ID', 'Name', 'Description', 'TypeID', 'UserID'],
    booleans: new Set(),
  },
  'MJ_BizApps_Collaboration: Space Types': {
    table: 'SpaceType',
    storeKey: 'spaceTypes',
    columns: [
      'ID', 'Code', 'Name', 'Description', 'Vocabulary', 'Discoverability', 'JoinMode',
      'MessagingPanel', 'LibraryPanel', 'WorkPanel', 'DefaultAgentRetrieval', 'DefaultBand',
      'InviteApproval', 'DisplayRank', 'IsActive', 'DefaultAllowParentAssignees', 'Configuration',
    ],
    booleans: new Set(['MessagingPanel', 'LibraryPanel', 'WorkPanel', 'IsActive', 'DefaultAllowParentAssignees']),
  },
  'MJ_BizApps_Collaboration: Space Role Types': {
    table: 'SpaceRoleType',
    storeKey: 'spaceRoleTypes',
    columns: [
      'ID', 'Code', 'Name', 'Description', 'Level', 'MaxGrantableLevel', 'CanInvite',
      'CanSeeTeamBand', 'CanContribute', 'IsOwnerRole', 'CanPromoteBand', 'DisplayRank', 'IsActive',
    ],
    booleans: new Set(['CanInvite', 'CanSeeTeamBand', 'CanContribute', 'IsOwnerRole', 'CanPromoteBand', 'IsActive']),
  },
  'MJ_BizApps_Collaboration: Spaces': {
    table: 'Space',
    storeKey: 'spaces',
    columns: ['ID', 'SpaceTypeID', 'ParentID', 'Slug', 'Name', 'Description', 'OwnerID', 'InheritsMembership', 'AgentRetrieval', 'StartedAt', 'ClosedAt', 'AllowParentAssignees'],
    booleans: new Set(['InheritsMembership', 'AllowParentAssignees']),
  },
  'MJ_BizApps_Collaboration: Space Members': {
    table: 'SpaceMember',
    storeKey: 'spaceMembers',
    columns: ['ID', 'SpaceID', 'UserID', 'SpaceRoleTypeID', 'Band', 'Status'],
    booleans: new Set(),
  },
  [COMMUNITY_ENTITY_NAMES.CommunitySpaces]: {
    table: 'CommunitySpace',
    storeKey: 'communitySpaces',
    columns: ['ID', 'Slug', 'CommunityKind', 'AnonymousReadMode', 'AskFirstEnabled', 'DefaultDigestCadence'],
    booleans: new Set(['AskFirstEnabled']),
  },
  [COMMUNITY_ENTITY_NAMES.ForumTypes]: {
    table: 'ForumType',
    storeKey: 'forumTypes',
    columns: ['ID', 'Code', 'Name', 'ServerDriverClass', 'UIDriverClass', 'ExtensionEntity', 'Configuration', 'Sequence', 'IsActive'],
    booleans: new Set(['IsActive']),
  },
  [COMMUNITY_ENTITY_NAMES.PostTypes]: {
    table: 'PostType',
    storeKey: 'postTypes',
    columns: ['ID', 'Code', 'Name', 'ServerDriverClass', 'UIDriverClass', 'ExtensionEntity', 'PlacementRule', 'AllowsNestedReplies', 'TriggersThreadSynthesis', 'IndexedInCorpus', 'Configuration', 'Sequence', 'IsActive'],
    booleans: new Set(['AllowsNestedReplies', 'TriggersThreadSynthesis', 'IndexedInCorpus', 'IsActive']),
  },
  [COMMUNITY_ENTITY_NAMES.ForumRoleTypes]: {
    table: 'ForumRoleType',
    storeKey: 'forumRoleTypes',
    columns: ['ID', 'Code', 'Name', 'Description', 'Level', 'CanConfigureForum', 'CanModerateQueue', 'CanPinOrLock', 'CanAcceptAnswers', 'CanVerifyCanon', 'CanPromoteToSpace', 'CanCreateRootPost', 'CanReply', 'CanCoEditDocs', 'VoteWeightMultiplier', 'Sequence', 'IsActive'],
    booleans: new Set(['CanConfigureForum', 'CanModerateQueue', 'CanPinOrLock', 'CanAcceptAnswers', 'CanVerifyCanon', 'CanPromoteToSpace', 'CanCreateRootPost', 'CanReply', 'CanCoEditDocs', 'IsActive']),
  },
  [COMMUNITY_ENTITY_NAMES.Forums]: {
    table: 'Forum',
    storeKey: 'forums',
    columns: ['ID', 'SpaceID', 'ParentForumID', 'ForumTypeID', 'Slug', 'Name', 'Description', 'Icon', 'ColorHex', 'VisibilityBand', 'AnonymousReadMode', 'InheritsSpaceMembers', 'PostingPolicy', 'InboundEmailAlias', 'Sequence', 'Status', 'Configuration'],
    booleans: new Set(['InheritsSpaceMembers']),
  },
  [COMMUNITY_ENTITY_NAMES.ForumIdeaCampaigns]: {
    table: 'ForumIdeaCampaign',
    storeKey: 'ideaCampaigns',
    columns: ['ID', 'DefaultBudgetPoints', 'AllocationMode', 'MaxPointsPerIdea', 'SubmissionsCloseAt', 'VotingClosesAt'],
    booleans: new Set(),
  },
  [COMMUNITY_ENTITY_NAMES.ForumMembers]: {
    table: 'ForumMember',
    storeKey: 'forumMembers',
    columns: ['ID', 'ForumID', 'UserID', 'ForumRoleTypeID', 'Status'],
    booleans: new Set(),
  },
  [COMMUNITY_ENTITY_NAMES.CommunityMemberProfiles]: {
    table: 'CommunityMemberProfile',
    storeKey: 'memberProfiles',
    columns: ['ID', 'SpaceID', 'UserID', 'PersonID', 'BioMarkdown', 'ExpertiseTagsJSON', 'HelpfulAnswerCount', 'AcceptedAnswerCount', 'ReputationScore', 'DigestCadence', 'OpenToPeerMentoring'],
    booleans: new Set(['OpenToPeerMentoring']),
  },
  [COMMUNITY_ENTITY_NAMES.ForumSubscriptions]: {
    table: 'ForumSubscription',
    storeKey: 'forumSubscriptions',
    columns: ['ID', 'UserID', 'ForumID', 'RootPostID', 'TopicTagID', 'DeliveryLevel'],
    booleans: new Set(),
  },
  [COMMUNITY_ENTITY_NAMES.ForumTopicTags]: {
    table: 'ForumTopicTag',
    storeKey: 'topicTags',
    columns: ['ID', 'SpaceID', 'ParentTagID', 'TagID', 'Slug', 'Name', 'Description', 'ColorHex', 'IsOfficial', 'PostCount'],
    booleans: new Set(['IsOfficial']),
  },
  [COMMUNITY_ENTITY_NAMES.ForumPosts]: {
    table: 'ForumPost',
    storeKey: 'posts',
    columns: ['ID', 'ForumID', 'PostTypeID', 'RootPostID', 'ParentPostID', 'ReplyDepth', 'AuthorUserID', 'AuthorPersonID', 'AuthorAgentID', 'Title', 'Slug', 'BodyMarkdown', 'SummaryMarkdown', 'SummaryGeneratedAt', 'SummaryReplyWatermark', 'VisibilityBand', 'Status', 'IsPinned', 'IsLocked', 'IsFeatured', 'ReplyCount', 'ParticipantCount', 'ReactionScore', 'ViewCount', 'LastActivityAt', 'CreatedAt', 'PromotedToSpaceID', 'LinkedTaskID'],
    booleans: new Set(['IsPinned', 'IsLocked', 'IsFeatured']),
  },
  [COMMUNITY_ENTITY_NAMES.ForumQuestionPosts]: {
    table: 'ForumQuestionPost',
    storeKey: 'questionPosts',
    columns: ['ID', 'AcceptedAnswerPostID', 'AICanonAnswerPostID', 'BountyPoints', 'ResolvedAt'],
    booleans: new Set(),
  },
  [COMMUNITY_ENTITY_NAMES.ForumAnswerPosts]: {
    table: 'ForumAnswerPost',
    storeKey: 'answerPosts',
    columns: ['ID', 'QuestionPostID', 'IsAcceptedByAuthor', 'IsVerifiedByModerator', 'VerifiedByUserID', 'VerifiedAt', 'AIEpistemicStatus', 'AIConfidenceScore', 'AIRationaleMarkdown', 'FreshnessReviewDueAt'],
    booleans: new Set(['IsAcceptedByAuthor', 'IsVerifiedByModerator']),
  },
  [COMMUNITY_ENTITY_NAMES.ForumIdeaPosts]: {
    table: 'ForumIdeaPost',
    storeKey: 'ideaPosts',
    columns: ['ID', 'IdeaStatus', 'TotalPointsAllocated', 'EffectiveQuadraticVotes', 'UniqueBackerCount', 'TargetReleaseOrQuarter', 'StatusRationaleMarkdown', 'MergedIntoIdeaPostID'],
    booleans: new Set(),
  },
  [COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations]: {
    table: 'ForumIdeaAllocation',
    storeKey: 'ideaAllocations',
    columns: ['ID', 'IdeaPostID', 'UserID', 'PointsAllocated', 'QuadraticVotes', 'RationaleComment'],
    booleans: new Set(),
  },
  [COMMUNITY_ENTITY_NAMES.ForumCasePosts]: {
    table: 'ForumCasePost',
    storeKey: 'casePosts',
    columns: ['ID', 'SituationMarkdown', 'ActionTakenMarkdown', 'OutcomeMarkdown', 'IsAnonymized', 'AnonymizedAuthorAlias'],
    booleans: new Set(['IsAnonymized']),
  },
  [COMMUNITY_ENTITY_NAMES.ForumAMAPosts]: {
    table: 'ForumAMAPost',
    storeKey: 'amaPosts',
    columns: ['ID', 'HostUserID', 'ScheduledStartAt', 'ScheduledEndAt', 'QuestionsOpenAt', 'IsLiveNow', 'RecapMarkdown'],
    booleans: new Set(['IsLiveNow']),
  },
  [COMMUNITY_ENTITY_NAMES.ForumInteractivePosts]: {
    table: 'ForumInteractivePost',
    storeKey: 'interactivePosts',
    columns: ['ID', 'ComponentArtifactID', 'PinnedArtifactVersionID', 'ExperienceKind', 'ScoringMode', 'ShowLeaderboard', 'MaxAttemptsPerMember', 'PlayCount'],
    booleans: new Set(['ShowLeaderboard']),
  },
  [COMMUNITY_ENTITY_NAMES.ForumInteractiveSessions]: {
    table: 'ForumInteractiveSession',
    storeKey: 'interactiveSessions',
    columns: ['ID', 'InteractivePostID', 'ArtifactVersionID', 'UserID', 'AttemptNumber', 'Score', 'DurationSeconds', 'Completed'],
    booleans: new Set(['Completed']),
  },
  [COMMUNITY_ENTITY_NAMES.ForumPostTags]: {
    table: 'ForumPostTag',
    storeKey: 'postTags',
    columns: ['ID', 'PostID', 'TopicTagID', 'AssignedByAI'],
    booleans: new Set(['AssignedByAI']),
  },
  [COMMUNITY_ENTITY_NAMES.ForumPostReactions]: {
    table: 'ForumPostReaction',
    storeKey: 'postReactions',
    columns: ['ID', 'PostID', 'UserID', 'ReactionKind', 'Weight'],
    booleans: new Set(),
  },
  [COMMUNITY_ENTITY_NAMES.ForumPostFlags]: {
    table: 'ForumPostFlag',
    storeKey: 'postFlags',
    columns: ['ID', 'PostID', 'ReportedByUserID', 'ReasonCategory', 'Status', 'ReasonDetails'],
    booleans: new Set(),
  },
};

function openSqliteDatabase(sqliteFilePath) {
  if (!sqliteFilePath) return null;
  mkdirSync(dirname(sqliteFilePath), { recursive: true });
  const db = new DatabaseSync(sqliteFilePath);
  EnsureArchWorldSqliteSchema(db);
  return db;
}

/** Initializes the strict-FK SQLite schema for `ARCH-WORLD`. */
export function EnsureArchWorldSqliteSchema(db) {
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec(SQLITE_SCHEMA_DDL);
  db.exec('PRAGMA foreign_keys = ON;');
}

function seedSqliteInteractiveSupportRows(db, ownerUserId) {
  db.prepare(
    'INSERT INTO "Environment" ("ID", "Name", "IsDefault") VALUES (?, ?, ?) ON CONFLICT("ID") DO NOTHING',
  ).run(ARCH_DEFAULT_ENVIRONMENT_ID, 'Default', 1);
  db.prepare(
    'INSERT INTO "ArtifactType" ("ID", "Name") VALUES (?, ?) ON CONFLICT("ID") DO NOTHING',
  ).run(ARCH_DEFAULT_ARTIFACT_TYPE_ID, 'Component');
  db.prepare(
    'INSERT INTO "Artifact" ("ID", "EnvironmentID", "Name", "Description", "TypeID", "UserID", "Visibility") VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT("ID") DO NOTHING',
  ).run(
    ARCH_INTERACTIVE_ARTIFACT_ID,
    ARCH_DEFAULT_ENVIRONMENT_ID,
    'IBC 2027 Mass Timber Readiness Challenge',
    'Interactive AGPA Type IV-A/B/C readiness quiz component.',
    ARCH_DEFAULT_ARTIFACT_TYPE_ID,
    ownerUserId,
    'Always',
  );
  db.prepare(
    'INSERT INTO "ArtifactVersion" ("ID", "ArtifactID", "VersionNumber", "UserID", "ContentMode", "ForceToolsOnly") VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT("ID") DO NOTHING',
  ).run(ARCH_INTERACTIVE_ARTIFACT_VERSION_ID, ARCH_INTERACTIVE_ARTIFACT_ID, 1, ownerUserId, 'Text', 0);
}

function toSqliteBindValue(val, isBool) {
  if (val === undefined || val === null) return null;
  if (isBool || typeof val === 'boolean') return val ? 1 : 0;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'object') return JSON.stringify(val);
  return val;
}

function fromSqliteRow(row, booleanCols) {
  const out = {};
  for (const [key, val] of Object.entries(row)) {
    out[key] = booleanCols.has(key) && val !== null && val !== undefined ? Boolean(val) : val;
  }
  return out;
}

function normalizeRowForSqlite(entityName, rawRow) {
  const row = { ...rawRow };
  if (entityName === 'MJ: Users') {
    const derived = deriveMemberFields(row);
    return { ...row, ...derived };
  }
  if (entityName === 'MJ_BizApps_Collaboration: Space Types') {
    return {
      ...row,
      Vocabulary: row.Vocabulary ?? row.Code ?? 'community',
      Discoverability: row.Discoverability ?? 'Listed',
      JoinMode: row.JoinMode ?? 'SelfServe',
      MessagingPanel: row.MessagingPanel ?? true,
      LibraryPanel: row.LibraryPanel ?? true,
      WorkPanel: row.WorkPanel ?? true,
      DefaultAgentRetrieval: row.DefaultAgentRetrieval ?? 'Included',
      DefaultBand: row.DefaultBand ?? 'Shared',
      InviteApproval: row.InviteApproval ?? 'Approve',
      DisplayRank: row.DisplayRank ?? 0,
      IsActive: row.IsActive ?? true,
      DefaultAllowParentAssignees: row.DefaultAllowParentAssignees ?? true,
    };
  }
  if (entityName === 'MJ_BizApps_Collaboration: Space Role Types') {
    const level = row.Level ?? 100;
    return {
      ...row,
      Level: level,
      MaxGrantableLevel: row.MaxGrantableLevel ?? (row.IsOwnerRole ? level : 0),
      CanInvite: row.CanInvite ?? false,
      CanSeeTeamBand: row.CanSeeTeamBand ?? false,
      CanContribute: row.CanContribute ?? true,
      IsOwnerRole: row.IsOwnerRole ?? false,
      CanPromoteBand: row.CanPromoteBand ?? false,
      DisplayRank: row.DisplayRank ?? 0,
      IsActive: row.IsActive ?? true,
    };
  }
  if (entityName === 'MJ_BizApps_Collaboration: Spaces') {
    return {
      ...row,
      AgentRetrieval: row.AgentRetrieval ?? 'Included',
      InheritsMembership: row.InheritsMembership ?? false,
      AllowParentAssignees: row.AllowParentAssignees ?? true,
    };
  }
  if (entityName === COMMUNITY_ENTITY_NAMES.CommunitySpaces) {
    return {
      ...row,
      CommunityKind: row.CommunityKind ?? 'Association Wide',
      AnonymousReadMode: row.AnonymousReadMode ?? 'Teaser Only',
      AskFirstEnabled: row.AskFirstEnabled ?? true,
      DefaultDigestCadence: row.DefaultDigestCadence ?? 'Daily Digest',
    };
  }
  if (entityName === COMMUNITY_ENTITY_NAMES.ForumTypes) {
    return {
      ...row,
      Sequence: row.Sequence ?? 0,
      IsActive: row.IsActive ?? true,
    };
  }
  if (entityName === COMMUNITY_ENTITY_NAMES.PostTypes) {
    return {
      ...row,
      Name: row.Name ?? row.Code,
      PlacementRule: row.PlacementRule ?? 'Both',
      AllowsNestedReplies: row.AllowsNestedReplies ?? true,
      TriggersThreadSynthesis: row.TriggersThreadSynthesis ?? true,
      IndexedInCorpus: row.IndexedInCorpus ?? true,
      Sequence: row.Sequence ?? 0,
      IsActive: row.IsActive ?? true,
    };
  }
  if (entityName === COMMUNITY_ENTITY_NAMES.ForumRoleTypes) {
    return {
      ...row,
      Description: row.Description ?? null,
      Level: row.Level ?? 100,
      CanConfigureForum: row.CanConfigureForum ?? false,
      CanModerateQueue: row.CanModerateQueue ?? false,
      CanPinOrLock: row.CanPinOrLock ?? false,
      CanAcceptAnswers: row.CanAcceptAnswers ?? false,
      CanVerifyCanon: row.CanVerifyCanon ?? false,
      CanPromoteToSpace: row.CanPromoteToSpace ?? false,
      CanCreateRootPost: row.CanCreateRootPost ?? true,
      CanReply: row.CanReply ?? true,
      CanCoEditDocs: row.CanCoEditDocs ?? false,
      VoteWeightMultiplier: row.VoteWeightMultiplier ?? 1.0,
      Sequence: row.Sequence ?? 0,
      IsActive: row.IsActive ?? true,
    };
  }
  if (entityName === COMMUNITY_ENTITY_NAMES.Forums) {
    return {
      ...row,
      VisibilityBand: row.VisibilityBand ?? 'Shared',
      InheritsSpaceMembers: row.InheritsSpaceMembers ?? true,
      PostingPolicy: row.PostingPolicy ?? 'Open',
      Sequence: row.Sequence ?? 0,
      Status: row.Status ?? 'Active',
    };
  }
  if (entityName === COMMUNITY_ENTITY_NAMES.ForumMembers) {
    return {
      ...row,
      Status: row.Status ?? 'Active',
    };
  }
  if (entityName === COMMUNITY_ENTITY_NAMES.CommunityMemberProfiles) {
    return {
      ...row,
      BioMarkdown: row.BioMarkdown ?? row.Bio ?? null,
      HelpfulAnswerCount: row.HelpfulAnswerCount ?? 0,
      AcceptedAnswerCount: row.AcceptedAnswerCount ?? 0,
      ReputationScore: row.ReputationScore ?? 0,
      DigestCadence: row.DigestCadence ?? 'Daily Digest',
      OpenToPeerMentoring: Boolean(row.OpenToPeerMentoring),
    };
  }
  if (entityName === COMMUNITY_ENTITY_NAMES.ForumSubscriptions) {
    return {
      ...row,
      DeliveryLevel: normalizeSubscriptionDeliveryLevel(row),
    };
  }
  if (entityName === COMMUNITY_ENTITY_NAMES.ForumTopicTags) {
    return {
      ...row,
      IsOfficial: row.IsOfficial ?? false,
      PostCount: row.PostCount ?? 0,
    };
  }
  if (entityName === COMMUNITY_ENTITY_NAMES.ForumPosts) {
    return {
      ...row,
      ReplyDepth: row.ReplyDepth ?? 0,
      SummaryReplyWatermark: row.SummaryReplyWatermark ?? 0,
      VisibilityBand: row.VisibilityBand ?? 'Shared',
      Status: row.Status ?? 'Published',
      IsPinned: row.IsPinned ?? false,
      IsLocked: row.IsLocked ?? false,
      IsFeatured: row.IsFeatured ?? false,
      ReplyCount: row.ReplyCount ?? 0,
      ParticipantCount: row.ParticipantCount ?? 1,
      ReactionScore: row.ReactionScore ?? 0,
      ViewCount: row.ViewCount ?? 0,
    };
  }
  if (entityName === COMMUNITY_ENTITY_NAMES.ForumQuestionPosts) {
    return {
      ...row,
      BountyPoints: row.BountyPoints ?? 0,
    };
  }
  if (entityName === COMMUNITY_ENTITY_NAMES.ForumAnswerPosts) {
    return {
      ...row,
      IsAcceptedByAuthor: row.IsAcceptedByAuthor ?? false,
      IsVerifiedByModerator: row.IsVerifiedByModerator ?? false,
    };
  }
  if (entityName === COMMUNITY_ENTITY_NAMES.ForumIdeaCampaigns) {
    return {
      ...row,
      DefaultBudgetPoints: row.DefaultBudgetPoints ?? 100,
      AllocationMode: row.AllocationMode ?? 'Point Allocation',
    };
  }
  if (entityName === COMMUNITY_ENTITY_NAMES.ForumIdeaPosts) {
    return {
      ...row,
      IdeaStatus: row.IdeaStatus ?? 'Under Consideration',
      TotalPointsAllocated: row.TotalPointsAllocated ?? 0,
      EffectiveQuadraticVotes: row.EffectiveQuadraticVotes ?? 0,
      UniqueBackerCount: row.UniqueBackerCount ?? 0,
    };
  }
  if (entityName === COMMUNITY_ENTITY_NAMES.ForumCasePosts) {
    return {
      ...row,
      IsAnonymized: row.IsAnonymized ?? false,
    };
  }
  if (entityName === COMMUNITY_ENTITY_NAMES.ForumAMAPosts) {
    return {
      ...row,
      IsLiveNow: row.IsLiveNow ?? false,
    };
  }
  if (entityName === COMMUNITY_ENTITY_NAMES.ForumInteractivePosts) {
    return {
      ...row,
      ComponentArtifactID: row.ComponentArtifactID ?? ARCH_INTERACTIVE_ARTIFACT_ID,
      PinnedArtifactVersionID: row.PinnedArtifactVersionID ?? ARCH_INTERACTIVE_ARTIFACT_VERSION_ID,
      ExperienceKind: row.ExperienceKind ?? 'Quiz',
      ScoringMode: row.ScoringMode ?? 'Best Score',
      ShowLeaderboard: row.ShowLeaderboard ?? true,
      PlayCount: row.PlayCount ?? 0,
    };
  }
  if (entityName === COMMUNITY_ENTITY_NAMES.ForumInteractiveSessions) {
    return {
      ...row,
      ArtifactVersionID: row.ArtifactVersionID ?? ARCH_INTERACTIVE_ARTIFACT_VERSION_ID,
      AttemptNumber: row.AttemptNumber ?? 1,
      Completed: row.Completed ?? false,
    };
  }
  if (entityName === COMMUNITY_ENTITY_NAMES.ForumPostTags) {
    return {
      ...row,
      AssignedByAI: row.AssignedByAI ?? false,
    };
  }
  if (entityName === COMMUNITY_ENTITY_NAMES.ForumPostReactions) {
    return {
      ...row,
      ReactionKind: row.ReactionKind ?? 'Upvote',
      Weight: row.Weight ?? 1.0,
    };
  }
  if (entityName === COMMUNITY_ENTITY_NAMES.ForumPostFlags) {
    return {
      ...row,
      ReportedByUserID: row.ReportedByUserID ?? row.ReporterUserID ?? null,
      ReasonDetails: row.ReasonDetails ?? row.Notes ?? null,
      Status: row.Status ?? 'Open',
    };
  }
  return row;
}

function upsertRowToSqlite(db, entityName, rawRow) {
  if (!db) return;
  const spec = SQLITE_TABLE_SPECS[entityName];
  if (!spec) return;

  const normalized = normalizeRowForSqlite(entityName, rawRow);
  if (entityName === COMMUNITY_ENTITY_NAMES.ForumInteractivePosts && normalized.ID) {
    const ownerRow = db.prepare('SELECT "ID" FROM "User" LIMIT 1').get();
    if (ownerRow?.ID) {
      seedSqliteInteractiveSupportRows(db, ownerRow.ID);
    }
  }
  if (entityName === 'MJ: Tasks' && normalized.TypeID) {
    db.prepare('INSERT INTO "TaskType" ("ID", "Name") VALUES (?, ?) ON CONFLICT("ID") DO NOTHING').run(
      normalized.TypeID,
      'Community Action Item',
    );
  }

  const cols = spec.columns;
  const colList = cols.map((c) => `"${c}"`).join(', ');
  const placeholders = cols.map(() => '?').join(', ');
  const updates = cols
    .filter((c) => c !== 'ID')
    .map((c) => `"${c}" = excluded."${c}"`)
    .join(', ');
  const sql = updates
    ? `INSERT INTO "${spec.table}" (${colList}) VALUES (${placeholders}) ON CONFLICT("ID") DO UPDATE SET ${updates}`
    : `INSERT INTO "${spec.table}" (${colList}) VALUES (${placeholders}) ON CONFLICT("ID") DO NOTHING`;
  const params = cols.map((c) => toSqliteBindValue(normalized[c], spec.booleans.has(c)));
  db.prepare(sql).run(...params);
}

function deleteRowFromSqlite(db, entityName, id) {
  if (!db || !id) return;
  const spec = SQLITE_TABLE_SPECS[entityName];
  if (!spec) return;
  db.prepare(`DELETE FROM "${spec.table}" WHERE lower("ID") = lower(?)`).run(String(id));
}

function saveMetaToSqlite(db, store) {
  if (!db) return;
  const stmt = db.prepare(
    'INSERT INTO "ArchWorldMeta" ("Key", "Value") VALUES (?, ?) ON CONFLICT("Key") DO UPDATE SET "Value" = excluded."Value"',
  );
  stmt.run('lastLoadedAt', store.lastLoadedAt ?? null);
  stmt.run('processedInboundMessageIds', JSON.stringify(Array.from(store.processedInboundMessageIds)));
}

/** Synchronizes an entire `ArchWorldStore` into an on-disk SQLite relational database. */
export function SaveArchWorldStoreToSqlite(store, sqliteFilePath = DEFAULT_ARCH_WORLD_SQLITE_PATH) {
  if (!sqliteFilePath) return;
  const db = openSqliteDatabase(sqliteFilePath);
  try {
    db.exec('BEGIN IMMEDIATE;');
    try {
      for (const row of store.taskTypes.values()) upsertRowToSqlite(db, 'MJ: Task Types', row);
      for (const row of store.spaceTypes.values()) upsertRowToSqlite(db, 'MJ_BizApps_Collaboration: Space Types', row);
      for (const row of store.spaceRoleTypes.values()) upsertRowToSqlite(db, 'MJ_BizApps_Collaboration: Space Role Types', row);
      for (const row of store.forumTypes.values()) upsertRowToSqlite(db, COMMUNITY_ENTITY_NAMES.ForumTypes, row);
      for (const row of store.postTypes.values()) upsertRowToSqlite(db, COMMUNITY_ENTITY_NAMES.PostTypes, row);
      for (const row of store.forumRoleTypes.values()) upsertRowToSqlite(db, COMMUNITY_ENTITY_NAMES.ForumRoleTypes, row);
      for (const row of store.users.values()) upsertRowToSqlite(db, 'MJ: Users', row);
      for (const row of store.spaces.values()) upsertRowToSqlite(db, 'MJ_BizApps_Collaboration: Spaces', row);
      for (const row of store.spaceMembers.values()) upsertRowToSqlite(db, 'MJ_BizApps_Collaboration: Space Members', row);
      for (const row of store.communitySpaces.values()) upsertRowToSqlite(db, COMMUNITY_ENTITY_NAMES.CommunitySpaces, row);
      for (const row of store.forums.values()) upsertRowToSqlite(db, COMMUNITY_ENTITY_NAMES.Forums, row);
      for (const row of store.ideaCampaigns.values()) upsertRowToSqlite(db, COMMUNITY_ENTITY_NAMES.ForumIdeaCampaigns, row);
      for (const row of store.forumMembers.values()) upsertRowToSqlite(db, COMMUNITY_ENTITY_NAMES.ForumMembers, row);
      for (const row of store.memberProfiles.values()) upsertRowToSqlite(db, COMMUNITY_ENTITY_NAMES.CommunityMemberProfiles, row);
      for (const row of store.topicTags.values()) upsertRowToSqlite(db, COMMUNITY_ENTITY_NAMES.ForumTopicTags, row);
      for (const row of store.tasks.values()) upsertRowToSqlite(db, 'MJ: Tasks', row);
      for (const row of sortPostsTopologically(Array.from(store.posts.values()))) {
        upsertRowToSqlite(db, COMMUNITY_ENTITY_NAMES.ForumPosts, row);
      }
      for (const row of store.forumSubscriptions.values()) upsertRowToSqlite(db, COMMUNITY_ENTITY_NAMES.ForumSubscriptions, row);
      for (const row of store.questionPosts.values()) {
        upsertRowToSqlite(db, COMMUNITY_ENTITY_NAMES.ForumQuestionPosts, {
          ...row,
          AcceptedAnswerPostID: null,
          AICanonAnswerPostID: null,
        });
      }
      for (const row of store.answerPosts.values()) upsertRowToSqlite(db, COMMUNITY_ENTITY_NAMES.ForumAnswerPosts, row);
      for (const row of store.questionPosts.values()) upsertRowToSqlite(db, COMMUNITY_ENTITY_NAMES.ForumQuestionPosts, row);
      for (const row of store.ideaPosts.values()) upsertRowToSqlite(db, COMMUNITY_ENTITY_NAMES.ForumIdeaPosts, row);
      for (const row of store.ideaAllocations.values()) upsertRowToSqlite(db, COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations, row);
      for (const row of store.casePosts.values()) upsertRowToSqlite(db, COMMUNITY_ENTITY_NAMES.ForumCasePosts, row);
      for (const row of store.amaPosts.values()) upsertRowToSqlite(db, COMMUNITY_ENTITY_NAMES.ForumAMAPosts, row);
      for (const row of store.interactivePosts.values()) upsertRowToSqlite(db, COMMUNITY_ENTITY_NAMES.ForumInteractivePosts, row);
      for (const row of store.interactiveSessions.values()) upsertRowToSqlite(db, COMMUNITY_ENTITY_NAMES.ForumInteractiveSessions, row);
      for (const row of store.postTags.values()) upsertRowToSqlite(db, COMMUNITY_ENTITY_NAMES.ForumPostTags, row);
      for (const row of store.postReactions.values()) upsertRowToSqlite(db, COMMUNITY_ENTITY_NAMES.ForumPostReactions, row);
      for (const row of store.postFlags.values()) upsertRowToSqlite(db, COMMUNITY_ENTITY_NAMES.ForumPostFlags, row);
      saveMetaToSqlite(db, store);
      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } finally {
    db.close();
  }
}

/** Loads a brand-new `ArchWorldStore` directly from the relational SQLite database file, or `null` if absent. */
export function LoadArchWorldStoreFromSqlite(sqliteFilePath = DEFAULT_ARCH_WORLD_SQLITE_PATH) {
  if (!sqliteFilePath || !existsSync(sqliteFilePath)) {
    return null;
  }
  const db = openSqliteDatabase(sqliteFilePath);
  try {
    const payload = {};
    for (const spec of Object.values(SQLITE_TABLE_SPECS)) {
      const rows = db.prepare(`SELECT * FROM "${spec.table}"`).all();
      payload[spec.storeKey] = rows.map((r) => fromSqliteRow(r, spec.booleans));
    }
    const metaRows = db.prepare('SELECT "Key", "Value" FROM "ArchWorldMeta"').all();
    for (const m of metaRows) {
      if (m.Key === 'lastLoadedAt') payload.lastLoadedAt = m.Value;
      if (m.Key === 'processedInboundMessageIds' && m.Value) {
        payload.processedInboundMessageIds = JSON.parse(m.Value);
      }
    }
    if ((payload.users?.length ?? 0) === 0 && (payload.spaces?.length ?? 0) === 0) {
      return null;
    }
    return DeserializeArchWorldStore(payload);
  } finally {
    db.close();
  }
}

/** Returns exact SQLite `SELECT COUNT(*)` totals across all 27+ relational `ARCH-WORLD` tables. */
export function QueryArchWorldSqliteCounts(sqliteFilePathOrDb = DEFAULT_ARCH_WORLD_SQLITE_PATH) {
  const ownsDb = typeof sqliteFilePathOrDb === 'string';
  if (ownsDb && !existsSync(sqliteFilePathOrDb)) {
    throw new Error(`SQLite database does not exist at ${sqliteFilePathOrDb}`);
  }
  const db = ownsDb ? openSqliteDatabase(sqliteFilePathOrDb) : sqliteFilePathOrDb;
  const tables = [
    'SpaceType',
    'SpaceRoleType',
    'ForumType',
    'PostType',
    'ForumRoleType',
    'User',
    'Space',
    'SpaceMember',
    'CommunitySpace',
    'Forum',
    'ForumMember',
    'CommunityMemberProfile',
    'ForumTopicTag',
    'ForumPost',
    'ForumSubscription',
    'ForumQuestionPost',
    'ForumAnswerPost',
    'ForumIdeaCampaign',
    'ForumIdeaPost',
    'ForumIdeaAllocation',
    'ForumCasePost',
    'ForumAMAPost',
    'ForumInteractivePost',
    'ForumInteractiveSession',
    'ForumPostTag',
    'ForumPostReaction',
    'ForumPostFlag',
    'Task',
  ];
  try {
    const counts = {};
    for (const table of tables) {
      const row = db.prepare(`SELECT COUNT(*) AS cnt FROM "${table}"`).get();
      counts[table] = Number(row?.cnt ?? 0);
    }
    return counts;
  } finally {
    if (ownsDb) db.close();
  }
}

/** Atomically writes the store snapshot to disk (and SQLite when configured) so separate processes see persisted `ARCH-WORLD` state. */
export function SaveArchWorldStoreToDisk(store, persistenceFilePath = DEFAULT_ARCH_WORLD_PERSISTENCE_PATH, options = {}) {
  if (persistenceFilePath) {
    mkdirSync(dirname(persistenceFilePath), { recursive: true });
    const tmpPath = `${persistenceFilePath}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(tmpPath, JSON.stringify(SerializeArchWorldStore(store), null, 2), 'utf8');
    renameSync(tmpPath, persistenceFilePath);
  }
  const sqliteFilePath = resolveSqliteFilePath({ persistenceFilePath, ...options });
  if (sqliteFilePath && options.syncSqlite !== false) {
    SaveArchWorldStoreToSqlite(store, sqliteFilePath);
  }
}

/** Loads a brand-new `ARCH-WORLD` store instance from the on-disk persistence file, or `null` if absent. */
export function LoadArchWorldStoreFromDisk(persistenceFilePath = DEFAULT_ARCH_WORLD_PERSISTENCE_PATH) {
  if (!persistenceFilePath || !existsSync(persistenceFilePath)) {
    return null;
  }
  const raw = readFileSync(persistenceFilePath, 'utf8');
  return DeserializeArchWorldStore(JSON.parse(raw));
}

/** Opens an independent store instance hydrated from the persisted SQLite DB (or JSON snapshot fallback), never auto-seeding. */
export function OpenPersistedArchWorldStore(options = {}) {
  const sqlitePath = resolveSqliteFilePath(options);
  const filePath = resolvePersistenceFilePath(options);
  const fromSqlite = sqlitePath ? LoadArchWorldStoreFromSqlite(sqlitePath) : null;
  if (fromSqlite) {
    return fromSqlite;
  }
  const loaded = LoadArchWorldStoreFromDisk(filePath);
  if (loaded) {
    return loaded;
  }
  if (options.createIfMissing) {
    return CreateEmptyArchWorldStore();
  }
  throw new Error(`Persisted ARCH-WORLD backing store does not exist at ${sqlitePath ?? filePath}`);
}

/** Deletes the on-disk backing store files (invoked only by explicit reset, never by teardown). */
export function ClearPersistedArchWorldStore(persistenceFilePath = DEFAULT_ARCH_WORLD_PERSISTENCE_PATH, sqliteFilePath = undefined) {
  if (persistenceFilePath && existsSync(persistenceFilePath)) {
    unlinkSync(persistenceFilePath);
  }
  const resolvedSqlite = sqliteFilePath === undefined ? resolveSqliteFilePath({ persistenceFilePath }) : sqliteFilePath;
  if (resolvedSqlite) {
    for (const suffix of ['', '-wal', '-shm']) {
      const target = `${resolvedSqlite}${suffix}`;
      if (existsSync(target)) unlinkSync(target);
    }
  }
}

/** Returns the shared persistent `ARCH-WORLD` store (hydrating from SQLite/disk if available). */
export function GetSharedArchWorldStore(options = {}) {
  if (!sharedStore) {
    const sqlitePath = resolveSqliteFilePath(options);
    const filePath = resolvePersistenceFilePath(options);
    const fromSqlite = options.fromDisk !== false && sqlitePath ? LoadArchWorldStoreFromSqlite(sqlitePath) : null;
    const fromDisk = !fromSqlite && options.fromDisk !== false ? LoadArchWorldStoreFromDisk(filePath) : null;
    sharedStore = fromSqlite ?? fromDisk ?? CreateEmptyArchWorldStore();
  }
  return sharedStore;
}

/** Explicit internal reset helper for isolated unit scenarios that require a brand-new empty store. */
export function ResetSharedArchWorldStore(options = {}) {
  sharedStore = CreateEmptyArchWorldStore();
  if (options.clearPersistence !== false) {
    const filePath = resolvePersistenceFilePath(options);
    const sqlitePath = resolveSqliteFilePath(options);
    ClearPersistedArchWorldStore(filePath, sqlitePath);
  }
  return sharedStore;
}

/** Counts every record group currently held in an `ARCH-WORLD` store. */
export function CountArchWorldStoreRecords(store) {
  const counts = {
    Members: store.users.size,
    Spaces: store.spaces.size,
    SpaceMembers: store.spaceMembers.size,
    Forums: store.forums.size,
    ForumMembers: store.forumMembers.size,
    MemberProfiles: store.memberProfiles.size,
    ForumSubscriptions: store.forumSubscriptions.size,
    TopicTags: store.topicTags.size,
    Posts: store.posts.size,
    QuestionPosts: store.questionPosts.size,
    AnswerPosts: store.answerPosts.size,
    IdeaCampaigns: store.ideaCampaigns.size,
    IdeaPosts: store.ideaPosts.size,
    IdeaAllocations: store.ideaAllocations.size,
    CasePosts: store.casePosts.size,
    AMAPosts: store.amaPosts.size,
    InteractivePosts: store.interactivePosts.size,
    InteractiveSessions: store.interactiveSessions.size,
    PostTags: store.postTags.size,
    PostReactions: store.postReactions.size,
    PostFlags: store.postFlags.size,
    Tasks: store.tasks.size,
  };
  const totalRecords = Object.values(counts).reduce((sum, n) => sum + n, 0);
  return { counts, totalRecords };
}

function buildEntityInfo(entityName, fieldNames) {
  return new EntityInfo({
    ID: `arch-entity-${entityName}`,
    Name: entityName,
    Status: 'Active',
    IncludeInAPI: true,
    AllowCreateAPI: true,
    AllowUpdateAPI: true,
    AllowDeleteAPI: true,
    BaseTable: entityName,
    BaseView: entityName,
    EntityFields: fieldNames.map((name) => ({
      ID: `arch-field-${entityName}-${name}`,
      Name: name,
      DisplayName: name,
      IsPrimaryKey: name === 'ID',
      AllowsNull: name !== 'ID',
      Type: name === 'PointsAllocated' || name === 'ReplyDepth' || name === 'Sequence' ? 'int' : 'nvarchar',
      AllowUpdateAPI: true,
    })),
    EntityPermissions: [
      {
        RoleID: ARCH_TEST_ROLE_ID,
        CanCreate: true,
        CanRead: true,
        CanUpdate: true,
        CanDelete: true,
      },
    ],
  });
}

const ARCH_ENTITY_INFOS = {
  'MJ: Users': buildEntityInfo('MJ: Users', ['ID', 'Name', 'FirstName', 'LastName', 'Email', 'Type', 'IsActive']),
  'MJ: Tasks': buildEntityInfo('MJ: Tasks', ['ID', 'Name', 'Description', 'TypeID', 'UserID']),
  'MJ: Task Types': buildEntityInfo('MJ: Task Types', ['ID', 'Name']),
  'MJ_BizApps_Collaboration: Space Types': buildEntityInfo('MJ_BizApps_Collaboration: Space Types', [
    'ID', 'Code', 'Name', 'Description', 'Vocabulary', 'Discoverability', 'JoinMode',
    'MessagingPanel', 'LibraryPanel', 'WorkPanel', 'DefaultAgentRetrieval', 'DefaultBand',
    'InviteApproval', 'DisplayRank', 'IsActive', 'DefaultAllowParentAssignees', 'Configuration',
  ]),
  'MJ_BizApps_Collaboration: Space Role Types': buildEntityInfo('MJ_BizApps_Collaboration: Space Role Types', [
    'ID', 'Code', 'Name', 'Description', 'Level', 'MaxGrantableLevel', 'CanInvite',
    'CanSeeTeamBand', 'CanContribute', 'IsOwnerRole', 'CanPromoteBand', 'DisplayRank', 'IsActive',
  ]),
  'MJ_BizApps_Collaboration: Spaces': buildEntityInfo('MJ_BizApps_Collaboration: Spaces', [
    'ID', 'SpaceTypeID', 'ParentID', 'Slug', 'Name', 'Description', 'OwnerID', 'InheritsMembership',
    'AgentRetrieval', 'StartedAt', 'ClosedAt', 'AllowParentAssignees',
  ]),
  'MJ_BizApps_Collaboration: Space Members': buildEntityInfo('MJ_BizApps_Collaboration: Space Members', [
    'ID', 'SpaceID', 'UserID', 'SpaceRoleTypeID', 'Band', 'Status',
  ]),
  [COMMUNITY_ENTITY_NAMES.CommunitySpaces]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.CommunitySpaces, [
    'ID', 'Slug', 'CommunityKind', 'AnonymousReadMode', 'AskFirstEnabled', 'DefaultDigestCadence',
  ]),
  [COMMUNITY_ENTITY_NAMES.ForumTypes]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.ForumTypes, [
    'ID', 'Code', 'Name', 'ServerDriverClass', 'UIDriverClass', 'ExtensionEntity', 'Configuration', 'Sequence', 'IsActive',
  ]),
  [COMMUNITY_ENTITY_NAMES.PostTypes]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.PostTypes, [
    'ID', 'Code', 'Name', 'ServerDriverClass', 'UIDriverClass', 'ExtensionEntity', 'PlacementRule',
    'AllowsNestedReplies', 'TriggersThreadSynthesis', 'IndexedInCorpus', 'Configuration', 'Sequence', 'IsActive',
  ]),
  [COMMUNITY_ENTITY_NAMES.ForumRoleTypes]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.ForumRoleTypes, [
    'ID', 'Code', 'Name', 'Description', 'Level', 'CanConfigureForum', 'CanModerateQueue', 'CanPinOrLock', 'CanAcceptAnswers',
    'CanVerifyCanon', 'CanPromoteToSpace', 'CanCreateRootPost', 'CanReply', 'CanCoEditDocs',
    'VoteWeightMultiplier', 'Sequence', 'IsActive',
  ]),
  [COMMUNITY_ENTITY_NAMES.Forums]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.Forums, [
    'ID', 'SpaceID', 'ParentForumID', 'ForumTypeID', 'Slug', 'Name', 'Description', 'Icon', 'ColorHex',
    'VisibilityBand', 'AnonymousReadMode', 'InheritsSpaceMembers', 'PostingPolicy', 'InboundEmailAlias',
    'Sequence', 'Status', 'Configuration',
  ]),
  [COMMUNITY_ENTITY_NAMES.ForumIdeaCampaigns]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.ForumIdeaCampaigns, [
    'ID', 'DefaultBudgetPoints', 'AllocationMode', 'MaxPointsPerIdea', 'SubmissionsCloseAt', 'VotingClosesAt',
  ]),
  [COMMUNITY_ENTITY_NAMES.ForumMembers]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.ForumMembers, [
    'ID', 'ForumID', 'UserID', 'ForumRoleTypeID', 'Status',
  ]),
  [COMMUNITY_ENTITY_NAMES.CommunityMemberProfiles]: buildEntityInfo(
    COMMUNITY_ENTITY_NAMES.CommunityMemberProfiles,
    [
      'ID', 'SpaceID', 'UserID', 'PersonID', 'BioMarkdown', 'ExpertiseTagsJSON',
      'HelpfulAnswerCount', 'AcceptedAnswerCount', 'ReputationScore', 'DigestCadence', 'OpenToPeerMentoring',
    ],
  ),
  [COMMUNITY_ENTITY_NAMES.ForumSubscriptions]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.ForumSubscriptions, [
    'ID', 'UserID', 'ForumID', 'RootPostID', 'TopicTagID', 'DeliveryLevel',
  ]),
  [COMMUNITY_ENTITY_NAMES.ForumTopicTags]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.ForumTopicTags, [
    'ID', 'SpaceID', 'ParentTagID', 'TagID', 'Slug', 'Name', 'Description', 'ColorHex', 'IsOfficial', 'PostCount',
  ]),
  [COMMUNITY_ENTITY_NAMES.ForumPosts]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.ForumPosts, [
    'ID', 'ForumID', 'PostTypeID', 'RootPostID', 'ParentPostID', 'ReplyDepth', 'AuthorUserID',
    'AuthorPersonID', 'AuthorAgentID', 'Title', 'Slug', 'BodyMarkdown', 'SummaryMarkdown',
    'SummaryGeneratedAt', 'SummaryReplyWatermark', 'VisibilityBand', 'Status', 'IsPinned', 'IsLocked',
    'IsFeatured', 'ReplyCount', 'ParticipantCount', 'ReactionScore', 'ViewCount', 'LastActivityAt',
    'PromotedToSpaceID', 'LinkedTaskID',
  ]),
  [COMMUNITY_ENTITY_NAMES.ForumQuestionPosts]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.ForumQuestionPosts, [
    'ID', 'AcceptedAnswerPostID', 'AICanonAnswerPostID', 'BountyPoints', 'ResolvedAt',
  ]),
  [COMMUNITY_ENTITY_NAMES.ForumAnswerPosts]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.ForumAnswerPosts, [
    'ID', 'QuestionPostID', 'IsAcceptedByAuthor', 'IsVerifiedByModerator', 'VerifiedByUserID',
    'VerifiedAt', 'AIEpistemicStatus', 'AIConfidenceScore', 'AIRationaleMarkdown', 'FreshnessReviewDueAt',
  ]),
  [COMMUNITY_ENTITY_NAMES.ForumIdeaPosts]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.ForumIdeaPosts, [
    'ID', 'IdeaStatus', 'TotalPointsAllocated', 'EffectiveQuadraticVotes', 'UniqueBackerCount',
    'TargetReleaseOrQuarter', 'StatusRationaleMarkdown', 'MergedIntoIdeaPostID',
  ]),
  [COMMUNITY_ENTITY_NAMES.ForumCasePosts]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.ForumCasePosts, [
    'ID', 'SituationMarkdown', 'ActionTakenMarkdown', 'OutcomeMarkdown', 'IsAnonymized', 'AnonymizedAuthorAlias',
  ]),
  [COMMUNITY_ENTITY_NAMES.ForumAMAPosts]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.ForumAMAPosts, [
    'ID', 'HostUserID', 'ScheduledStartAt', 'ScheduledEndAt', 'QuestionsOpenAt', 'IsLiveNow', 'RecapMarkdown',
  ]),
  [COMMUNITY_ENTITY_NAMES.ForumInteractivePosts]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.ForumInteractivePosts, [
    'ID', 'ComponentArtifactID', 'PinnedArtifactVersionID', 'ExperienceKind', 'ScoringMode', 'ShowLeaderboard',
    'MaxAttemptsPerMember', 'PlayCount',
  ]),
  [COMMUNITY_ENTITY_NAMES.ForumInteractiveSessions]: buildEntityInfo(
    COMMUNITY_ENTITY_NAMES.ForumInteractiveSessions,
    ['ID', 'InteractivePostID', 'ArtifactVersionID', 'UserID', 'AttemptNumber', 'Score', 'DurationSeconds', 'Completed'],
  ),
  [COMMUNITY_ENTITY_NAMES.ForumPostTags]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.ForumPostTags, [
    'ID', 'PostID', 'TopicTagID', 'AssignedByAI',
  ]),
  [COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations, [
    'ID', 'IdeaPostID', 'UserID', 'PointsAllocated', 'QuadraticVotes', 'RationaleComment',
  ]),
  [COMMUNITY_ENTITY_NAMES.ForumPostReactions]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.ForumPostReactions, [
    'ID', 'PostID', 'UserID', 'ReactionKind', 'Weight',
  ]),
  [COMMUNITY_ENTITY_NAMES.ForumPostFlags]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.ForumPostFlags, [
    'ID', 'PostID', 'ReportedByUserID', 'ReasonCategory', 'Status', 'ReasonDetails',
  ]),
};

function parseSqlInList(filter, fieldName) {
  const regex = new RegExp(`(?:^|[^A-Za-z0-9_])${fieldName}\\s+IN\\s*\\(([^)]+)\\)`, 'i');
  const match = filter.match(regex);
  if (!match) return null;
  return match[1]
    .split(',')
    .map((part) => part.trim().replace(/^'+|'+$/g, '').toLowerCase())
    .filter(Boolean);
}

function parseSqlEq(filter, fieldName) {
  const regex = new RegExp(`(?:^|[^A-Za-z0-9_])${fieldName}\\s*=\\s*'([^']*)'`, 'i');
  const match = filter.match(regex);
  return match ? match[1].trim().toLowerCase() : null;
}

function filterStoreRows(rows, entityName, filter = '', userNameById = new Map()) {
  const idEq = parseSqlEq(filter, 'ID');
  const idIn = parseSqlInList(filter, 'ID');
  const spaceIdEq = parseSqlEq(filter, 'SpaceID');
  const forumIdEq = parseSqlEq(filter, 'ForumID');
  const forumIdIn = parseSqlInList(filter, 'ForumID');
  const userIdEq = parseSqlEq(filter, 'UserID');
  const slugEq = parseSqlEq(filter, 'Slug');
  const codeEq = parseSqlEq(filter, 'Code');
  const emailEq = parseSqlEq(filter, 'Email');

  switch (entityName) {
    case 'MJ: Users': {
      let out = rows;
      if (idEq) out = out.filter((u) => norm(u.ID) === idEq);
      if (idIn) out = out.filter((u) => idIn.includes(norm(u.ID)));
      if (emailEq) out = out.filter((u) => norm(u.Email) === emailEq);
      return out.map((u) => ({ ...u }));
    }
    case 'MJ_BizApps_Collaboration: Spaces': {
      let out = rows;
      if (idEq) out = out.filter((s) => norm(s.ID) === idEq);
      if (slugEq) out = out.filter((s) => norm(s.Slug) === slugEq);
      return out.map((s) => ({ ...s }));
    }
    case 'MJ_BizApps_Collaboration: Space Types': {
      let out = rows;
      if (idEq) out = out.filter((t) => norm(t.ID) === idEq);
      if (codeEq) out = out.filter((t) => norm(t.Code) === codeEq);
      return out.map((r) => ({ ...r }));
    }
    case 'MJ_BizApps_Collaboration: Space Role Types': {
      const nameIn = parseSqlInList(filter, 'Name');
      let out = rows;
      if (idEq) out = out.filter((r) => norm(r.ID) === idEq);
      if (/IsActive\s*=\s*1/i.test(filter)) out = out.filter((r) => r.IsActive !== false);
      if (/IsOwnerRole\s*=\s*0/i.test(filter)) out = out.filter((r) => !r.IsOwnerRole);
      if (/CanPromoteBand\s*=\s*0/i.test(filter)) out = out.filter((r) => !r.CanPromoteBand);
      if (nameIn) out = out.filter((r) => nameIn.includes(norm(r.Name)));
      if (/Code\s+NOT\s+IN/i.test(filter)) {
        out = out.filter((r) => norm(r.Code) !== 'admin' && norm(r.Code) !== 'owner');
      }
      return out.map((r) => ({ ...r }));
    }
    case 'MJ_BizApps_Collaboration: Space Members': {
      let out = rows;
      if (idEq) out = out.filter((m) => norm(m.ID) === idEq);
      if (userIdEq) out = out.filter((m) => norm(m.UserID) === userIdEq);
      if (spaceIdEq) out = out.filter((m) => norm(m.SpaceID) === spaceIdEq);
      return out.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.CommunitySpaces: {
      let out = rows;
      if (idEq) out = out.filter((s) => norm(s.ID) === idEq);
      if (slugEq) out = out.filter((s) => norm(s.Slug) === slugEq);
      return out.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumRoleTypes: {
      let out = rows;
      if (idEq) out = out.filter((r) => norm(r.ID) === idEq);
      if (codeEq) out = out.filter((r) => norm(r.Code) === codeEq);
      return out.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.PostTypes: {
      let out = rows;
      if (idEq) out = out.filter((p) => norm(p.ID) === idEq);
      if (codeEq) out = out.filter((p) => norm(p.Code) === codeEq);
      return out.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumTypes: {
      let out = rows;
      if (idEq) out = out.filter((t) => norm(t.ID) === idEq);
      if (codeEq) out = out.filter((t) => norm(t.Code) === codeEq);
      return out.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.Forums: {
      const activeOnly = /Status\s*=\s*'Active'/i.test(filter);
      let out = rows;
      if (activeOnly) out = out.filter((f) => f.Status === 'Active');
      if (idEq) out = out.filter((f) => norm(f.ID) === idEq);
      if (idIn) out = out.filter((f) => idIn.includes(norm(f.ID)));
      if (spaceIdEq) out = out.filter((f) => norm(f.SpaceID) === spaceIdEq);
      if (slugEq) out = out.filter((f) => norm(f.Slug) === slugEq);
      return out.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumIdeaCampaigns: {
      let out = rows;
      if (idEq) out = out.filter((c) => norm(c.ID) === idEq);
      if (idIn) out = out.filter((c) => idIn.includes(norm(c.ID)));
      return out.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumMembers: {
      const activeOnly = /Status\s*=\s*'Active'/i.test(filter);
      let out = rows;
      if (idEq) out = out.filter((m) => norm(m.ID) === idEq);
      if (forumIdEq) out = out.filter((m) => norm(m.ForumID) === forumIdEq);
      if (forumIdIn) out = out.filter((m) => forumIdIn.includes(norm(m.ForumID)));
      if (userIdEq) out = out.filter((m) => norm(m.UserID) === userIdEq);
      if (activeOnly) out = out.filter((m) => m.Status === 'Active');
      return out.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.CommunityMemberProfiles: {
      let out = rows;
      if (idEq) out = out.filter((p) => norm(p.ID) === idEq);
      if (spaceIdEq) out = out.filter((p) => norm(p.SpaceID) === spaceIdEq);
      if (userIdEq) out = out.filter((p) => norm(p.UserID) === userIdEq);
      return out.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumSubscriptions: {
      let out = rows;
      if (idEq) out = out.filter((s) => norm(s.ID) === idEq);
      if (forumIdEq) out = out.filter((s) => norm(s.ForumID) === forumIdEq);
      if (userIdEq) out = out.filter((s) => norm(s.UserID) === userIdEq);
      return out.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumTopicTags: {
      let out = rows;
      if (idEq) out = out.filter((t) => norm(t.ID) === idEq);
      if (idIn) out = out.filter((t) => idIn.includes(norm(t.ID)));
      if (spaceIdEq) out = out.filter((t) => norm(t.SpaceID) === spaceIdEq);
      if (slugEq) out = out.filter((t) => norm(t.Slug) === slugEq);
      return out.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumPosts: {
      const rootIdEq = parseSqlEq(filter, 'RootPostID');
      const authorEq = parseSqlEq(filter, 'AuthorUserID');
      const rootNullOnly = /RootPostID\s+IS\s+NULL/i.test(filter);
      const statusEq = parseSqlEq(filter, 'Status');
      const statusIn = parseSqlInList(filter, 'Status');

      let out = rows;
      if (idEq) out = out.filter((p) => norm(p.ID) === idEq);
      if (idIn) out = out.filter((p) => idIn.includes(norm(p.ID)));
      if (rootIdEq) out = out.filter((p) => norm(p.RootPostID) === rootIdEq);
      if (forumIdEq) out = out.filter((p) => norm(p.ForumID) === forumIdEq);
      if (forumIdIn) out = out.filter((p) => forumIdIn.includes(norm(p.ForumID)));
      if (authorEq) out = out.filter((p) => norm(p.AuthorUserID) === authorEq);
      if (slugEq) out = out.filter((p) => norm(p.Slug) === slugEq);
      if (rootNullOnly) out = out.filter((p) => p.RootPostID === null || p.RootPostID === undefined);
      if (statusEq) out = out.filter((p) => norm(p.Status) === statusEq);
      if (statusIn) out = out.filter((p) => statusIn.includes(norm(p.Status)));

      return out.map((p) => ({
        ...p,
        AuthorUser: p.AuthorUser ?? userNameById.get(norm(p.AuthorUserID)) ?? p.AuthorUserID,
        __mj_CreatedAt: p.CreatedAt ?? p.__mj_CreatedAt,
      }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumQuestionPosts: {
      let out = rows;
      if (idEq) out = out.filter((q) => norm(q.ID) === idEq);
      if (idIn) out = out.filter((q) => idIn.includes(norm(q.ID)));
      return out.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumAnswerPosts: {
      const qEq = parseSqlEq(filter, 'QuestionPostID');
      const qIn = parseSqlInList(filter, 'QuestionPostID');
      const acceptedOnly = /IsAcceptedByAuthor\s*=\s*1/i.test(filter);
      let out = rows;
      if (idEq) out = out.filter((a) => norm(a.ID) === idEq);
      if (idIn) out = out.filter((a) => idIn.includes(norm(a.ID)));
      if (qEq) out = out.filter((a) => norm(a.QuestionPostID) === qEq);
      if (qIn) out = out.filter((a) => qIn.includes(norm(a.QuestionPostID)));
      if (acceptedOnly) out = out.filter((a) => Boolean(a.IsAcceptedByAuthor));
      return out.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumIdeaPosts: {
      let out = rows;
      if (idEq) out = out.filter((i) => norm(i.ID) === idEq);
      if (idIn) out = out.filter((i) => idIn.includes(norm(i.ID)));
      return out.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations: {
      const ideaEq = parseSqlEq(filter, 'IdeaPostID');
      const ideaIn = parseSqlInList(filter, 'IdeaPostID');
      let out = rows;
      if (idEq) out = out.filter((a) => norm(a.ID) === idEq);
      if (userIdEq) out = out.filter((a) => norm(a.UserID) === userIdEq);
      if (ideaEq) out = out.filter((a) => norm(a.IdeaPostID) === ideaEq);
      if (ideaIn) out = out.filter((a) => ideaIn.includes(norm(a.IdeaPostID)));
      return out.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumCasePosts: {
      let out = rows;
      if (idEq) out = out.filter((c) => norm(c.ID) === idEq);
      return out.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumAMAPosts: {
      let out = rows;
      if (idEq) out = out.filter((a) => norm(a.ID) === idEq);
      return out.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumInteractivePosts: {
      let out = rows;
      if (idEq) out = out.filter((ip) => norm(ip.ID) === idEq);
      return out.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumInteractiveSessions: {
      const interEq = parseSqlEq(filter, 'InteractivePostID');
      let out = rows;
      if (idEq) out = out.filter((s) => norm(s.ID) === idEq);
      if (interEq) out = out.filter((s) => norm(s.InteractivePostID) === interEq);
      if (userIdEq) out = out.filter((s) => norm(s.UserID) === userIdEq);
      return out.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumPostTags: {
      const postEq = parseSqlEq(filter, 'PostID');
      const postIdIn = parseSqlInList(filter, 'PostID');
      const topicTagEq = parseSqlEq(filter, 'TopicTagID');
      let out = rows;
      if (idEq) out = out.filter((pt) => norm(pt.ID) === idEq);
      if (postEq) out = out.filter((pt) => norm(pt.PostID) === postEq);
      if (postIdIn) out = out.filter((pt) => postIdIn.includes(norm(pt.PostID)));
      if (topicTagEq) out = out.filter((pt) => norm(pt.TopicTagID) === topicTagEq);
      return out.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumPostReactions: {
      const postEq = parseSqlEq(filter, 'PostID');
      const kindEq = parseSqlEq(filter, 'ReactionKind');
      let out = rows;
      if (idEq) out = out.filter((r) => norm(r.ID) === idEq);
      if (postEq) out = out.filter((r) => norm(r.PostID) === postEq);
      if (userIdEq) out = out.filter((r) => norm(r.UserID) === userIdEq);
      if (kindEq) out = out.filter((r) => norm(r.ReactionKind) === kindEq);
      return out.map((r) => ({ ...r, __mj_CreatedAt: '2026-11-18T12:00:00.000Z' }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumPostFlags: {
      const postEq = parseSqlEq(filter, 'PostID');
      const reporterEq = parseSqlEq(filter, 'ReportedByUserID');
      let out = rows;
      if (idEq) out = out.filter((f) => norm(f.ID) === idEq);
      if (postEq) out = out.filter((f) => norm(f.PostID) === postEq);
      if (reporterEq) out = out.filter((f) => norm(f.ReportedByUserID) === reporterEq);
      return out.map((r) => ({ ...r }));
    }
    case 'MJ: Task Types':
      return rows.map((r) => ({ ...r }));
    case 'MJ: Tasks': {
      let out = rows;
      if (idEq) out = out.filter((t) => norm(t.ID) === idEq);
      return out.map((r) => ({ ...r }));
    }
    default:
      return [];
  }
}

function queryStoreRows(store, entityName, filter = '') {
  const userNameById = new Map(Array.from(store.users.values()).map((u) => [norm(u.ID), u.Name]));
  const spec = SQLITE_TABLE_SPECS[entityName];
  if (!spec || !store[spec.storeKey]) return [];
  const rows = Array.from(store[spec.storeKey].values());
  return filterStoreRows(rows, entityName, filter, userNameById);
}

function querySqliteRows(db, entityName, filter = '') {
  const spec = SQLITE_TABLE_SPECS[entityName];
  if (!spec) return [];
  if (entityName === COMMUNITY_ENTITY_NAMES.ForumPosts) {
    const rawRows = db
      .prepare('SELECT p.*, u."Name" AS "AuthorUser" FROM "ForumPost" p LEFT JOIN "User" u ON lower(u."ID") = lower(p."AuthorUserID")')
      .all();
    const mapped = rawRows.map((r) => fromSqliteRow(r, spec.booleans));
    return filterStoreRows(mapped, entityName, filter);
  }
  const rawRows = db.prepare(`SELECT * FROM "${spec.table}"`).all();
  const mapped = rawRows.map((r) => fromSqliteRow(r, spec.booleans));
  return filterStoreRows(mapped, entityName, filter);
}

function getEntityStoreTarget(store, entityName) {
  switch (entityName) {
    case 'MJ: Users':
      return { map: store.users, indexMap: store.usersByEmail, naturalKey: (r) => norm(r.Email) };
    case 'MJ: Tasks':
      return { map: store.tasks, indexMap: null, naturalKey: null };
    case 'MJ: Task Types':
      return { map: store.taskTypes, indexMap: null, naturalKey: null };
    case 'MJ_BizApps_Collaboration: Space Types':
      return { map: store.spaceTypes, indexMap: null, naturalKey: null };
    case 'MJ_BizApps_Collaboration: Space Role Types':
      return { map: store.spaceRoleTypes, indexMap: null, naturalKey: null };
    case 'MJ_BizApps_Collaboration: Spaces':
      return { map: store.spaces, indexMap: store.spacesBySlug, naturalKey: (r) => norm(r.Slug) };
    case 'MJ_BizApps_Collaboration: Space Members':
      return {
        map: store.spaceMembers,
        indexMap: store.spaceMembersByKey,
        naturalKey: (r) => `${norm(r.SpaceID)}:${norm(r.UserID)}`,
      };
    case COMMUNITY_ENTITY_NAMES.CommunitySpaces:
      return { map: store.communitySpaces, indexMap: null, naturalKey: null };
    case COMMUNITY_ENTITY_NAMES.ForumTypes:
      return { map: store.forumTypes, indexMap: null, naturalKey: null };
    case COMMUNITY_ENTITY_NAMES.PostTypes:
      return { map: store.postTypes, indexMap: null, naturalKey: null };
    case COMMUNITY_ENTITY_NAMES.ForumRoleTypes:
      return { map: store.forumRoleTypes, indexMap: null, naturalKey: null };
    case COMMUNITY_ENTITY_NAMES.Forums:
      return {
        map: store.forums,
        indexMap: store.forumsByKey,
        naturalKey: (r) => `${norm(r.SpaceID)}:${norm(r.Slug)}`,
      };
    case COMMUNITY_ENTITY_NAMES.ForumIdeaCampaigns:
      return { map: store.ideaCampaigns, indexMap: null, naturalKey: null };
    case COMMUNITY_ENTITY_NAMES.ForumMembers:
      return {
        map: store.forumMembers,
        indexMap: store.forumMembersByKey,
        naturalKey: (r) => `${norm(r.ForumID)}:${norm(r.UserID)}`,
      };
    case COMMUNITY_ENTITY_NAMES.CommunityMemberProfiles:
      return {
        map: store.memberProfiles,
        indexMap: store.memberProfilesByKey,
        naturalKey: (r) => `${norm(r.SpaceID)}:${norm(r.UserID)}`,
      };
    case COMMUNITY_ENTITY_NAMES.ForumSubscriptions:
      return {
        map: store.forumSubscriptions,
        indexMap: store.forumSubscriptionsByKey,
        naturalKey: (r) => `${norm(r.ForumID)}:${norm(r.UserID)}`,
      };
    case COMMUNITY_ENTITY_NAMES.ForumTopicTags:
      return {
        map: store.topicTags,
        indexMap: store.topicTagsByKey,
        naturalKey: (r) => `${norm(r.SpaceID)}:${norm(r.Slug)}`,
      };
    case COMMUNITY_ENTITY_NAMES.ForumPosts:
      return {
        map: store.posts,
        indexMap: store.postsByKey,
        naturalKey: (r) => (r.Slug ? `${norm(r.ForumID)}:slug:${norm(r.Slug)}` : `id:${norm(r.ID)}`),
      };
    case COMMUNITY_ENTITY_NAMES.ForumQuestionPosts:
      return { map: store.questionPosts, indexMap: null, naturalKey: null };
    case COMMUNITY_ENTITY_NAMES.ForumAnswerPosts:
      return { map: store.answerPosts, indexMap: null, naturalKey: null };
    case COMMUNITY_ENTITY_NAMES.ForumIdeaPosts:
      return { map: store.ideaPosts, indexMap: null, naturalKey: null };
    case COMMUNITY_ENTITY_NAMES.ForumCasePosts:
      return { map: store.casePosts, indexMap: null, naturalKey: null };
    case COMMUNITY_ENTITY_NAMES.ForumAMAPosts:
      return { map: store.amaPosts, indexMap: null, naturalKey: null };
    case COMMUNITY_ENTITY_NAMES.ForumInteractivePosts:
      return { map: store.interactivePosts, indexMap: null, naturalKey: null };
    case COMMUNITY_ENTITY_NAMES.ForumInteractiveSessions:
      return {
        map: store.interactiveSessions,
        indexMap: store.interactiveSessionsByKey,
        naturalKey: (r) => `${norm(r.InteractivePostID)}:${norm(r.UserID)}:${r.AttemptNumber}`,
      };
    case COMMUNITY_ENTITY_NAMES.ForumPostTags:
      return {
        map: store.postTags,
        indexMap: store.postTagsByKey,
        naturalKey: (r) => `${norm(r.PostID)}:${norm(r.TopicTagID)}`,
      };
    case COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations:
      return {
        map: store.ideaAllocations,
        indexMap: store.ideaAllocationsByKey,
        naturalKey: (r) => `${norm(r.IdeaPostID)}:${norm(r.UserID)}`,
      };
    case COMMUNITY_ENTITY_NAMES.ForumPostReactions:
      return {
        map: store.postReactions,
        indexMap: store.postReactionsByKey,
        naturalKey: (r) => `${norm(r.PostID)}:${norm(r.UserID)}:${norm(r.ReactionKind)}`,
      };
    case COMMUNITY_ENTITY_NAMES.ForumPostFlags:
      return {
        map: store.postFlags,
        indexMap: store.postFlagsByKey,
        naturalKey: (r) => `${norm(r.PostID)}:${norm(r.ReportedByUserID)}:${norm(r.ReasonCategory)}`,
      };
    default:
      return null;
  }
}

function extractPlainRecord(entity) {
  const row = {};
  for (const field of entity.Fields) {
    if (field.Value !== undefined) {
      row[field.Name] = field.Value;
    }
  }
  return row;
}

class ArchWorldTransactionGroup extends TransactionGroupBase {
  constructor(provider) {
    super();
    this.provider = provider;
    this.snapshot = null;
  }

  async BeginGroupTransaction() {
    this.snapshot = SerializeArchWorldStore(this.provider.store);
  }

  async RollbackGroupTransaction() {
    if (this.snapshot) {
      const restored = DeserializeArchWorldStore(this.snapshot);
      for (const key of Object.keys(this.provider.store)) {
        this.provider.store[key] = restored[key];
      }
      if (this.provider.sqliteFilePath) {
        SaveArchWorldStoreToSqlite(this.provider.store, this.provider.sqliteFilePath);
      }
      this.snapshot = null;
    }
  }

  async HandleSubmit() {
    const results = [];
    for (const tx of this.PendingTransactions) {
      try {
        if (tx.OperationType === 'Delete') {
          const deleted = await this.provider.Delete(tx.BaseEntity, tx.ExtraData, tx.BaseEntity.ContextCurrentUser);
          results.push(new TransactionResult(tx, deleted, Boolean(deleted)));
        } else {
          const saved = await this.provider.Save(
            tx.BaseEntity,
            tx.BaseEntity.ContextCurrentUser ?? this.provider.CurrentUser,
            tx.ExtraData,
            { skipDiskFlush: true },
          );
          results.push(new TransactionResult(tx, saved, true));
        }
      } catch (err) {
        results.push(new TransactionResult(tx, err, false));
      }
    }
    return results;
  }

  async CommitGroupTransaction() {
    this.snapshot = null;
    if (this.provider.persistenceFilePath || this.provider.sqliteFilePath) {
      SaveArchWorldStoreToDisk(this.provider.store, this.provider.persistenceFilePath, {
        sqliteFilePath: this.provider.sqliteFilePath,
        syncSqlite: false,
      });
    }
  }
}

/**
 * Authoritative MJ `IEntityDataProvider` + `IRunViewProvider` for `ARCH-WORLD`.
 * Instantiates real `BaseEntity` / `*ServerEntity` subclasses (`ForumPostServerEntity`,
 * `ForumAnswerPostServerEntity`, `ForumIdeaAllocationServerEntity`, `ForumPostReactionServerEntity`,
 * `ForumPostTagServerEntity`), enforces `ValidateAsync()`, synchronizes every write to the
 * relational SQLite database (`PRAGMA foreign_keys = ON;`), and queries SQLite on `RunView()`.
 */
export class ArchWorldEntityProvider {
  constructor(store, options = {}) {
    this.store = store;
    this.persistenceFilePath = resolvePersistenceFilePath(options);
    this.sqliteFilePath = resolveSqliteFilePath(options);
    this.sqliteDb = this.sqliteFilePath ? openSqliteDatabase(this.sqliteFilePath) : null;
    this.ProviderType = ProviderType.Network;
    this.Entities = Object.values(ARCH_ENTITY_INFOS);
    this._currentUser =
      options.currentUser ??
      MakeArchUserInfo({
        ID: 'A7C40400-4E12-4B8F-9A10-000000000022',
        Name: 'Rachel Goldstein, FAIA',
        Email: 'rachel.goldstein@agpa-guild.org',
        Type: 'Owner',
      });
    this._seq = 9000;
    this.saveCount = 0;
    this.validateCount = 0;
    this.suspendDiskFlush = false;
  }

  get CurrentUser() {
    return this._currentUser;
  }

  set CurrentUser(user) {
    this._currentUser = user;
  }

  CloseSqlite() {
    if (this.sqliteDb) {
      this.sqliteDb.close();
      this.sqliteDb = null;
    }
  }

  EntityByName(entityName) {
    return ARCH_ENTITY_INFOS[entityName];
  }

  async Config() {
    return true;
  }

  async GetRecordChanges() {
    return [];
  }

  async CreateTransactionGroup() {
    return new ArchWorldTransactionGroup(this);
  }

  async RunView(params) {
    const rows = this.sqliteDb
      ? querySqliteRows(this.sqliteDb, params.EntityName, params.ExtraFilter ?? '')
      : queryStoreRows(this.store, params.EntityName, params.ExtraFilter ?? '');
    const maxRows = params.MaxRows ?? rows.length;
    const sliced = rows.slice(0, maxRows);
    return {
      Success: true,
      Results: sliced,
      RowCount: sliced.length,
      TotalRowCount: rows.length,
      ExecutionTime: 1,
      ErrorMessage: '',
      UserViewGridState: undefined,
    };
  }

  async RunViews(paramsArray) {
    return Promise.all((paramsArray ?? []).map((p) => this.RunView(p)));
  }

  async Load(entity, compositeKey) {
    const id = String(compositeKey?.GetValueByFieldName?.('ID') ?? '');
    const entityName = entity.EntityInfo.Name;
    if (!id) return {};
    if (this.sqliteDb) {
      const spec = SQLITE_TABLE_SPECS[entityName];
      if (spec) {
        const row = this.sqliteDb
          .prepare(`SELECT * FROM "${spec.table}" WHERE lower("ID") = lower(?)`)
          .get(id);
        if (row) return fromSqliteRow(row, spec.booleans);
      }
    }
    const target = getEntityStoreTarget(this.store, entityName);
    if (!target) return {};
    const existing = target.map.get(norm(id));
    return existing ? { ...existing } : {};
  }

  async Save(entity, _user, _options, internalOpts = {}) {
    const entityName = entity.EntityInfo.Name;
    const target = getEntityStoreTarget(this.store, entityName);
    if (!target) {
      throw new Error(`Unsupported entity in ArchWorldEntityProvider: ${entityName}`);
    }

    const idField = entity.Fields.find((f) => f.Name === 'ID');
    if (idField && !idField.Value) {
      this._seq += 1;
      idField.Value = `A7C40999-4E12-4B8F-9A10-${String(this._seq).padStart(12, '0')}`;
    }

    const row = extractPlainRecord(entity);
    const idKey = norm(row.ID);
    const prev = target.map.get(idKey);
    const merged = prev ? { ...prev, ...row } : row;

    if (this.sqliteDb) {
      upsertRowToSqlite(this.sqliteDb, entityName, merged);
    }

    target.map.set(idKey, merged);
    if (target.indexMap && target.naturalKey) {
      target.indexMap.set(target.naturalKey(merged), idKey);
    }

    this.saveCount += 1;
    if (!internalOpts.skipDiskFlush && !this.suspendDiskFlush && this.persistenceFilePath) {
      SaveArchWorldStoreToDisk(this.store, this.persistenceFilePath, {
        sqliteFilePath: this.sqliteFilePath,
        syncSqlite: false,
      });
    }
    return { ...merged };
  }

  async Delete(entity) {
    const entityName = entity.EntityInfo.Name;
    const target = getEntityStoreTarget(this.store, entityName);
    if (!target) return true;
    const idKey = norm(entity.ID);
    const existing = target.map.get(idKey);
    if (this.sqliteDb) {
      deleteRowFromSqlite(this.sqliteDb, entityName, entity.ID);
    }
    target.map.delete(idKey);
    if (existing && target.indexMap && target.naturalKey) {
      target.indexMap.delete(target.naturalKey(existing));
    }
    if (!this.suspendDiskFlush && this.persistenceFilePath) {
      SaveArchWorldStoreToDisk(this.store, this.persistenceFilePath, {
        sqliteFilePath: this.sqliteFilePath,
        syncSqlite: false,
      });
    }
    return true;
  }

  async GetEntityObject(entityName, loadKeyOrUser, contextUser) {
    const info = ARCH_ENTITY_INFOS[entityName];
    if (!info) {
      throw new Error(`Missing EntityInfo for "${entityName}" in ArchWorldEntityProvider.`);
    }

    let loadKey;
    let effectiveUser = this._currentUser;
    if (loadKeyOrUser instanceof CompositeKey) {
      loadKey = loadKeyOrUser;
      if (contextUser) effectiveUser = contextUser;
    } else if (loadKeyOrUser) {
      effectiveUser = loadKeyOrUser;
    } else if (contextUser) {
      effectiveUser = contextUser;
    }

    if (effectiveUser && (!effectiveUser.UserRoles || effectiveUser.UserRoles.length === 0)) {
      effectiveUser = MakeArchUserInfo(effectiveUser);
    }

    const hasReg = MJGlobal.Instance.ClassFactory.GetRegistration(BaseEntity, entityName);
    const instance = hasReg
      ? MJGlobal.Instance.ClassFactory.CreateInstance(BaseEntity, entityName, info, this)
      : new BaseEntity(info, this);
    instance.ContextCurrentUser = effectiveUser;

    if (loadKey) {
      const id = String(loadKey.GetValueByFieldName('ID') ?? '');
      let row = null;
      if (this.sqliteDb) {
        const spec = SQLITE_TABLE_SPECS[entityName];
        if (spec) {
          const dbRow = this.sqliteDb
            .prepare(`SELECT * FROM "${spec.table}" WHERE lower("ID") = lower(?)`)
            .get(id);
          if (dbRow) row = fromSqliteRow(dbRow, spec.booleans);
        }
      }
      if (!row) {
        const target = getEntityStoreTarget(this.store, entityName);
        row = target ? target.map.get(norm(id)) : null;
      }
      if (!row) return null;
      await instance.LoadFromData({ ...row });
    } else {
      instance.NewRecord();
    }

    return instance;
  }
}

/**
 * Creates a brand-new `ArchWorldEntityProvider` backed exclusively by the on-disk persisted
 * relational SQLite database (and JSON snapshot fallback) with zero shared in-memory `Map` references.
 */
export function CreatePersistedArchWorldProvider(options = {}) {
  const store = OpenPersistedArchWorldStore(options);
  return new ArchWorldEntityProvider(store, options);
}

/** Registers server entity subclasses & hydrates forum/post/role metadata into `CommunityEngine`. */
export function EnsureArchWorldServerEntitiesLoaded(dataset = GetArchWorldDataset()) {
  LoadBizAppsCommunityCoreEntitiesServer();
  CommunityEngine.Instance.HydrateMetadata({
    forumTypes: dataset.forumTypes.map((ft) => ({
      ID: ft.ID,
      Code: ft.Code,
      Name: ft.Name,
      Description: null,
      Icon: null,
      ServerDriverClass: ft.ServerDriverClass ?? null,
      UIDriverClass: null,
      ExtensionEntity: null,
      Configuration: null,
      Sequence: 10,
      IsActive: true,
    })),
    postTypes: dataset.postTypes.map((pt) => ({
      ID: pt.ID,
      Code: pt.Code,
      Name: pt.Name ?? pt.Code,
      Description: null,
      Icon: null,
      ServerDriverClass: pt.ServerDriverClass ?? null,
      UIDriverClass: null,
      ExtensionEntity: null,
      PlacementRule: pt.PlacementRule,
      AllowsNestedReplies: pt.AllowsNestedReplies,
      TriggersThreadSynthesis: true,
      IndexedInCorpus: true,
      Configuration: null,
      Sequence: pt.Sequence ?? 10,
      IsActive: true,
    })),
    forumRoleTypes: dataset.forumRoleTypes.map((fr, idx) => ({
      ...fr,
      Description: fr.Description ?? null,
      Level: fr.Level ?? 100,
      Sequence: fr.Sequence ?? (idx + 1) * 10,
    })),
  });
}

function escapeSql(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') return String(value);
  return `N'${String(value).replace(/'/g, "''")}'`;
}

function escapePg(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

function escapeSqlite(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildSqlServerScript(dataset) {
  const lines = [
    '-- =============================================================================',
    '--  ARCH-WORLD (American Guild of Practicing Architects) Seed Script (SQL Server)',
    '--  Complete 27-table FK-safe idempotent upserts in topological dependency order.',
    '-- =============================================================================',
    'SET NOCOUNT ON;',
    '',
  ];

  // 1. __mj_BizAppsCollaboration.SpaceType (2 space types)
  dataset.spaceTypes.forEach((st, idx) => {
    lines.push(
      `IF EXISTS (SELECT 1 FROM [__mj_BizAppsCollaboration].[SpaceType] WHERE [ID] = '${st.ID}')`,
      `    UPDATE [__mj_BizAppsCollaboration].[SpaceType] SET [Name] = ${escapeSql(st.Name)}, [Description] = ${escapeSql(st.Description ?? null)}, [Configuration] = ${escapeSql(st.Configuration ?? null)}, [IsActive] = ${escapeSql(st.IsActive ?? true)} WHERE [ID] = '${st.ID}';`,
      `ELSE IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCollaboration].[SpaceType] WHERE [Code] = ${escapeSql(st.Code)})`,
      `    INSERT INTO [__mj_BizAppsCollaboration].[SpaceType] ([ID], [Code], [Name], [Description], [Vocabulary], [Discoverability], [JoinMode], [MessagingPanel], [LibraryPanel], [WorkPanel], [DefaultAgentRetrieval], [DefaultBand], [InviteApproval], [DisplayRank], [IsActive], [DefaultAllowParentAssignees], [Configuration])`,
      `    VALUES ('${st.ID}', ${escapeSql(st.Code)}, ${escapeSql(st.Name)}, ${escapeSql(st.Description ?? null)}, ${escapeSql(st.Vocabulary ?? st.Code)}, ${escapeSql(st.Discoverability ?? 'Listed')}, ${escapeSql(st.JoinMode ?? 'SelfServe')}, ${escapeSql(st.MessagingPanel ?? true)}, ${escapeSql(st.LibraryPanel ?? true)}, ${escapeSql(st.WorkPanel ?? true)}, ${escapeSql(st.DefaultAgentRetrieval ?? 'Included')}, ${escapeSql(st.DefaultBand ?? 'Shared')}, ${escapeSql(st.InviteApproval ?? 'Approve')}, ${st.DisplayRank ?? (idx + 1) * 10}, ${escapeSql(st.IsActive ?? true)}, ${escapeSql(st.DefaultAllowParentAssignees ?? true)}, ${escapeSql(st.Configuration ?? null)});`,
    );
  });

  // 2. __mj_BizAppsCollaboration.SpaceRoleType (4 space role types, incl. ARCH-WORLD contributor)
  dataset.spaceRoleTypes.forEach((srt, idx) => {
    const level = srt.Level ?? 100;
    const maxGrantable = srt.MaxGrantableLevel ?? (srt.IsOwnerRole ? level : 0);
    lines.push(
      `IF EXISTS (SELECT 1 FROM [__mj_BizAppsCollaboration].[SpaceRoleType] WHERE [ID] = '${srt.ID}')`,
      `    UPDATE [__mj_BizAppsCollaboration].[SpaceRoleType] SET [Name] = ${escapeSql(srt.Name)}, [Description] = ${escapeSql(srt.Description ?? null)}, [Level] = ${level}, [MaxGrantableLevel] = ${maxGrantable}, [CanInvite] = ${escapeSql(srt.CanInvite ?? false)}, [CanPromoteBand] = ${escapeSql(srt.CanPromoteBand ?? false)}, [CanSeeTeamBand] = ${escapeSql(srt.CanSeeTeamBand ?? false)}, [IsOwnerRole] = ${escapeSql(srt.IsOwnerRole ?? false)}, [CanContribute] = ${escapeSql(srt.CanContribute ?? true)}, [DisplayRank] = ${srt.DisplayRank ?? (idx + 1) * 10}, [IsActive] = ${escapeSql(srt.IsActive ?? true)} WHERE [ID] = '${srt.ID}';`,
      `ELSE IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCollaboration].[SpaceRoleType] WHERE [Code] = ${escapeSql(srt.Code)})`,
      `    INSERT INTO [__mj_BizAppsCollaboration].[SpaceRoleType] ([ID], [Code], [Name], [Description], [Level], [MaxGrantableLevel], [CanInvite], [CanPromoteBand], [CanSeeTeamBand], [IsOwnerRole], [DisplayRank], [IsActive], [CanContribute])`,
      `    VALUES ('${srt.ID}', ${escapeSql(srt.Code)}, ${escapeSql(srt.Name)}, ${escapeSql(srt.Description ?? null)}, ${level}, ${maxGrantable}, ${escapeSql(srt.CanInvite ?? false)}, ${escapeSql(srt.CanPromoteBand ?? false)}, ${escapeSql(srt.CanSeeTeamBand ?? false)}, ${escapeSql(srt.IsOwnerRole ?? false)}, ${srt.DisplayRank ?? (idx + 1) * 10}, ${escapeSql(srt.IsActive ?? true)}, ${escapeSql(srt.CanContribute ?? true)});`,
    );
  });

  // 3. __mj_BizAppsCommunity.ForumType (6)
  dataset.forumTypes.forEach((ft, idx) => {
    lines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumType] WHERE [ID] = '${ft.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[ForumType] ([ID], [Code], [Name], [ServerDriverClass], [Sequence], [IsActive])`,
      `    VALUES ('${ft.ID}', ${escapeSql(ft.Code)}, ${escapeSql(ft.Name)}, ${escapeSql(ft.ServerDriverClass ?? null)}, ${(idx + 1) * 10}, 1);`,
      `ELSE`,
      `    UPDATE [__mj_BizAppsCommunity].[ForumType] SET [Name] = ${escapeSql(ft.Name)}, [ServerDriverClass] = ${escapeSql(ft.ServerDriverClass ?? null)}, [Sequence] = ${(idx + 1) * 10}, [IsActive] = 1 WHERE [ID] = '${ft.ID}';`,
    );
  });

  // 4. __mj_BizAppsCommunity.PostType (13)
  dataset.postTypes.forEach((pt, idx) => {
    lines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[PostType] WHERE [ID] = '${pt.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[PostType] ([ID], [Code], [Name], [ServerDriverClass], [PlacementRule], [AllowsNestedReplies], [Sequence], [IsActive])`,
      `    VALUES ('${pt.ID}', ${escapeSql(pt.Code)}, ${escapeSql(pt.Name ?? pt.Code)}, ${escapeSql(pt.ServerDriverClass ?? null)}, ${escapeSql(pt.PlacementRule)}, ${escapeSql(pt.AllowsNestedReplies)}, ${pt.Sequence ?? (idx + 1) * 10}, 1);`,
      `ELSE`,
      `    UPDATE [__mj_BizAppsCommunity].[PostType] SET [Name] = ${escapeSql(pt.Name ?? pt.Code)}, [ServerDriverClass] = ${escapeSql(pt.ServerDriverClass ?? null)}, [PlacementRule] = ${escapeSql(pt.PlacementRule)}, [AllowsNestedReplies] = ${escapeSql(pt.AllowsNestedReplies)}, [Sequence] = ${pt.Sequence ?? (idx + 1) * 10}, [IsActive] = 1 WHERE [ID] = '${pt.ID}';`,
    );
  });

  // 5. __mj_BizAppsCommunity.ForumRoleType (7)
  dataset.forumRoleTypes.forEach((fr, idx) => {
    const seq = fr.Sequence ?? (idx + 1) * 10;
    const level = fr.Level ?? 100;
    lines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumRoleType] WHERE [ID] = '${fr.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[ForumRoleType] ([ID], [Code], [Name], [Description], [Level], [CanConfigureForum], [CanModerateQueue], [CanPinOrLock], [CanAcceptAnswers], [CanVerifyCanon], [CanPromoteToSpace], [CanCreateRootPost], [CanReply], [CanCoEditDocs], [VoteWeightMultiplier], [Sequence], [IsActive])`,
      `    VALUES ('${fr.ID}', ${escapeSql(fr.Code)}, ${escapeSql(fr.Name)}, ${escapeSql(fr.Description ?? null)}, ${level}, ${escapeSql(fr.CanConfigureForum)}, ${escapeSql(fr.CanModerateQueue)}, ${escapeSql(fr.CanPinOrLock)}, ${escapeSql(fr.CanAcceptAnswers)}, ${escapeSql(fr.CanVerifyCanon)}, ${escapeSql(fr.CanPromoteToSpace)}, ${escapeSql(fr.CanCreateRootPost)}, ${escapeSql(fr.CanReply)}, ${escapeSql(fr.CanCoEditDocs)}, ${fr.VoteWeightMultiplier}, ${seq}, ${escapeSql(fr.IsActive)});`,
      `ELSE`,
      `    UPDATE [__mj_BizAppsCommunity].[ForumRoleType] SET [Name] = ${escapeSql(fr.Name)}, [Description] = ${escapeSql(fr.Description ?? null)}, [Level] = ${level}, [CanConfigureForum] = ${escapeSql(fr.CanConfigureForum)}, [CanModerateQueue] = ${escapeSql(fr.CanModerateQueue)}, [CanPinOrLock] = ${escapeSql(fr.CanPinOrLock)}, [CanAcceptAnswers] = ${escapeSql(fr.CanAcceptAnswers)}, [CanVerifyCanon] = ${escapeSql(fr.CanVerifyCanon)}, [CanPromoteToSpace] = ${escapeSql(fr.CanPromoteToSpace)}, [CanCreateRootPost] = ${escapeSql(fr.CanCreateRootPost)}, [CanReply] = ${escapeSql(fr.CanReply)}, [CanCoEditDocs] = ${escapeSql(fr.CanCoEditDocs)}, [VoteWeightMultiplier] = ${fr.VoteWeightMultiplier}, [Sequence] = ${seq}, [IsActive] = ${escapeSql(fr.IsActive)} WHERE [ID] = '${fr.ID}';`,
    );
  });

  // 6. __mj.User (all 26 ARCH_MEMBERS)
  for (const member of dataset.Members) {
    const u = deriveMemberFields(member);
    lines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj].[User] WHERE [ID] = '${u.ID}')`,
      `    INSERT INTO [__mj].[User] ([ID], [Name], [FirstName], [LastName], [Email], [Type], [IsActive])`,
      `    VALUES ('${u.ID}', ${escapeSql(u.Name)}, ${escapeSql(u.FirstName)}, ${escapeSql(u.LastName)}, ${escapeSql(u.Email)}, ${escapeSql(u.Type)}, ${escapeSql(u.IsActive)});`,
      `ELSE`,
      `    UPDATE [__mj].[User] SET [Name] = ${escapeSql(u.Name)}, [FirstName] = ${escapeSql(u.FirstName)}, [LastName] = ${escapeSql(u.LastName)}, [Email] = ${escapeSql(u.Email)}, [Type] = ${escapeSql(u.Type)}, [IsActive] = ${escapeSql(u.IsActive)} WHERE [ID] = '${u.ID}';`,
    );
  }

  // 7. __mj_BizAppsCollaboration.Space (4 spaces)
  const ownerId = dataset.Members[21].ID;
  for (const space of dataset.Spaces) {
    lines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCollaboration].[Space] WHERE [ID] = '${space.ID}')`,
      `    INSERT INTO [__mj_BizAppsCollaboration].[Space] ([ID], [SpaceTypeID], [Name], [Description], [OwnerID], [InheritsMembership], [AgentRetrieval], [StartedAt], [AllowParentAssignees])`,
      `    VALUES ('${space.ID}', '${space.SpaceTypeID}', ${escapeSql(space.Name)}, ${escapeSql(space.Description)}, '${ownerId}', ${escapeSql(space.InheritsMembership)}, N'Included', SYSDATETIMEOFFSET(), 1);`,
      `ELSE`,
      `    UPDATE [__mj_BizAppsCollaboration].[Space] SET [Name] = ${escapeSql(space.Name)}, [Description] = ${escapeSql(space.Description)}, [OwnerID] = '${ownerId}', [InheritsMembership] = ${escapeSql(space.InheritsMembership)} WHERE [ID] = '${space.ID}';`,
    );
  }

  // 8. __mj_BizAppsCollaboration.SpaceMember (64 memberships)
  for (const sm of dataset.SpaceMembers) {
    lines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCollaboration].[SpaceMember] WHERE [ID] = '${sm.ID}')`,
      `    INSERT INTO [__mj_BizAppsCollaboration].[SpaceMember] ([ID], [SpaceID], [UserID], [SpaceRoleTypeID], [Band], [Status])`,
      `    VALUES ('${sm.ID}', '${sm.SpaceID}', '${sm.UserID}', '${sm.SpaceRoleTypeID}', ${escapeSql(sm.Band)}, ${escapeSql(sm.Status)});`,
      `ELSE`,
      `    UPDATE [__mj_BizAppsCollaboration].[SpaceMember] SET [SpaceRoleTypeID] = '${sm.SpaceRoleTypeID}', [Band] = ${escapeSql(sm.Band)}, [Status] = ${escapeSql(sm.Status)} WHERE [ID] = '${sm.ID}';`,
    );
  }

  // 9. __mj_BizAppsCommunity.CommunitySpace (4 community spaces)
  for (const space of dataset.Spaces) {
    lines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[CommunitySpace] WHERE [ID] = '${space.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[CommunitySpace] ([ID], [Slug], [CommunityKind], [AnonymousReadMode], [AskFirstEnabled], [DefaultDigestCadence])`,
      `    VALUES ('${space.ID}', ${escapeSql(space.Slug)}, ${escapeSql(space.CommunityKind)}, ${escapeSql(space.AnonymousReadMode)}, ${escapeSql(space.AskFirstEnabled)}, ${escapeSql(space.DefaultDigestCadence)});`,
      `ELSE`,
      `    UPDATE [__mj_BizAppsCommunity].[CommunitySpace] SET [Slug] = ${escapeSql(space.Slug)}, [CommunityKind] = ${escapeSql(space.CommunityKind)}, [AnonymousReadMode] = ${escapeSql(space.AnonymousReadMode)}, [AskFirstEnabled] = ${escapeSql(space.AskFirstEnabled)}, [DefaultDigestCadence] = ${escapeSql(space.DefaultDigestCadence)} WHERE [ID] = '${space.ID}';`,
    );
  }

  // 10. Forum (13 forums)
  for (const forum of dataset.Forums) {
    lines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[Forum] WHERE [ID] = '${forum.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[Forum] ([ID], [SpaceID], [ForumTypeID], [Slug], [Name], [Description], [VisibilityBand], [PostingPolicy], [InheritsSpaceMembers], [Sequence], [Status])`,
      `    VALUES ('${forum.ID}', '${forum.SpaceID}', '${forum.ForumTypeID}', ${escapeSql(forum.Slug)}, ${escapeSql(forum.Name)}, ${escapeSql(forum.Description)}, ${escapeSql(forum.VisibilityBand)}, ${escapeSql(forum.PostingPolicy)}, ${escapeSql(forum.InheritsSpaceMembers)}, ${forum.Sequence}, ${escapeSql(forum.Status)});`,
      `ELSE`,
      `    UPDATE [__mj_BizAppsCommunity].[Forum] SET [Name] = ${escapeSql(forum.Name)}, [Description] = ${escapeSql(forum.Description)}, [VisibilityBand] = ${escapeSql(forum.VisibilityBand)}, [PostingPolicy] = ${escapeSql(forum.PostingPolicy)}, [Status] = ${escapeSql(forum.Status)} WHERE [ID] = '${forum.ID}';`,
    );
  }

  // 11. ForumMember (14 memberships)
  for (const fm of dataset.ForumMembers) {
    lines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumMember] WHERE [ID] = '${fm.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[ForumMember] ([ID], [ForumID], [UserID], [ForumRoleTypeID], [Status])`,
      `    VALUES ('${fm.ID}', '${fm.ForumID}', '${fm.UserID}', '${fm.ForumRoleTypeID}', ${escapeSql(fm.Status)});`,
      `ELSE`,
      `    UPDATE [__mj_BizAppsCommunity].[ForumMember] SET [ForumRoleTypeID] = '${fm.ForumRoleTypeID}', [Status] = ${escapeSql(fm.Status)} WHERE [ID] = '${fm.ID}';`,
    );
  }

  // 12. CommunityMemberProfile (26 profiles)
  for (const p of dataset.MemberProfiles) {
    lines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[CommunityMemberProfile] WHERE [ID] = '${p.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[CommunityMemberProfile] ([ID], [SpaceID], [UserID], [BioMarkdown], [ExpertiseTagsJSON], [HelpfulAnswerCount], [AcceptedAnswerCount], [ReputationScore], [DigestCadence], [OpenToPeerMentoring])`,
      `    VALUES ('${p.ID}', '${p.SpaceID}', '${p.UserID}', ${escapeSql(p.BioMarkdown ?? p.Bio)}, ${escapeSql(p.ExpertiseTagsJSON)}, ${p.HelpfulAnswerCount}, ${p.AcceptedAnswerCount}, ${p.ReputationScore}, ${escapeSql(p.DigestCadence)}, ${escapeSql(Boolean(p.OpenToPeerMentoring))});`,
      `ELSE`,
      `    UPDATE [__mj_BizAppsCommunity].[CommunityMemberProfile] SET [BioMarkdown] = ${escapeSql(p.BioMarkdown ?? p.Bio)}, [ExpertiseTagsJSON] = ${escapeSql(p.ExpertiseTagsJSON)}, [ReputationScore] = ${p.ReputationScore}, [DigestCadence] = ${escapeSql(p.DigestCadence)} WHERE [ID] = '${p.ID}';`,
    );
  }

  // 13. ForumTopicTag (22 space-local tags)
  for (const tag of dataset.TopicTags) {
    lines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumTopicTag] WHERE [ID] = '${tag.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[ForumTopicTag] ([ID], [SpaceID], [Slug], [Name], [IsOfficial])`,
      `    VALUES ('${tag.ID}', '${tag.SpaceID}', ${escapeSql(tag.Slug)}, ${escapeSql(tag.Name)}, ${escapeSql(tag.IsOfficial)});`,
      `ELSE`,
      `    UPDATE [__mj_BizAppsCommunity].[ForumTopicTag] SET [Name] = ${escapeSql(tag.Name)}, [IsOfficial] = ${escapeSql(tag.IsOfficial)} WHERE [ID] = '${tag.ID}';`,
    );
  }

  // 14. ForumPost (68 posts in topological order)
  for (const post of sortPostsTopologically(dataset.Posts)) {
    lines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumPost] WHERE [ID] = '${post.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[ForumPost] ([ID], [ForumID], [PostTypeID], [RootPostID], [ParentPostID], [ReplyDepth], [AuthorUserID], [Title], [Slug], [BodyMarkdown], [SummaryMarkdown], [VisibilityBand], [Status], [IsPinned], [IsLocked], [IsFeatured], [ReplyCount], [ParticipantCount], [ReactionScore], [ViewCount])`,
      `    VALUES ('${post.ID}', '${post.ForumID}', '${post.PostTypeID}', ${post.RootPostID ? `'${post.RootPostID}'` : 'NULL'}, ${post.ParentPostID ? `'${post.ParentPostID}'` : 'NULL'}, ${post.ReplyDepth ?? 0}, '${post.AuthorUserID}', ${escapeSql(post.Title)}, ${escapeSql(post.Slug)}, ${escapeSql(post.BodyMarkdown)}, ${escapeSql(post.SummaryMarkdown)}, ${escapeSql(post.VisibilityBand)}, ${escapeSql(post.Status)}, ${escapeSql(post.IsPinned)}, ${escapeSql(post.IsLocked)}, ${escapeSql(post.IsFeatured)}, ${post.ReplyCount ?? 0}, ${post.ParticipantCount ?? 1}, ${post.ReactionScore ?? 0}, ${post.ViewCount ?? 0});`,
    );
  }

  // 15. ForumSubscription (10 subscriptions — after User, Forum, ForumTopicTag, ForumPost)
  for (const sub of dataset.ForumSubscriptions) {
    const level = normalizeSubscriptionDeliveryLevel(sub);
    lines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumSubscription] WHERE [ID] = '${sub.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[ForumSubscription] ([ID], [UserID], [ForumID], [DeliveryLevel])`,
      `    VALUES ('${sub.ID}', '${sub.UserID}', '${sub.ForumID}', ${escapeSql(level)});`,
      `ELSE`,
      `    UPDATE [__mj_BizAppsCommunity].[ForumSubscription] SET [DeliveryLevel] = ${escapeSql(level)} WHERE [ID] = '${sub.ID}';`,
    );
  }

  // 16. ForumQuestionPost (cyclic-FK-safe: insert with AcceptedAnswerPostID = NULL first)
  for (const q of dataset.QuestionPosts) {
    lines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumQuestionPost] WHERE [ID] = '${q.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[ForumQuestionPost] ([ID], [AcceptedAnswerPostID], [AICanonAnswerPostID], [BountyPoints], [ResolvedAt])`,
      `    VALUES ('${q.ID}', NULL, NULL, ${q.BountyPoints ?? 0}, ${escapeSql(q.ResolvedAt ?? null)});`,
    );
  }

  // 17. ForumAnswerPost (7 answers) + cyclic-FK-safe AcceptedAnswerPostID linkage
  for (const a of dataset.AnswerPosts) {
    lines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumAnswerPost] WHERE [ID] = '${a.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[ForumAnswerPost] ([ID], [QuestionPostID], [IsAcceptedByAuthor], [IsVerifiedByModerator], [VerifiedByUserID], [AIEpistemicStatus], [AIConfidenceScore])`,
      `    VALUES ('${a.ID}', '${a.QuestionPostID}', ${escapeSql(a.IsAcceptedByAuthor)}, ${escapeSql(a.IsVerifiedByModerator)}, ${a.VerifiedByUserID ? `'${a.VerifiedByUserID}'` : 'NULL'}, ${escapeSql(a.AIEpistemicStatus)}, ${a.AIConfidenceScore});`,
      `ELSE`,
      `    UPDATE [__mj_BizAppsCommunity].[ForumAnswerPost] SET [IsAcceptedByAuthor] = ${escapeSql(a.IsAcceptedByAuthor)}, [IsVerifiedByModerator] = ${escapeSql(a.IsVerifiedByModerator)}, [AIEpistemicStatus] = ${escapeSql(a.AIEpistemicStatus)}, [AIConfidenceScore] = ${a.AIConfidenceScore} WHERE [ID] = '${a.ID}';`,
    );
  }
  for (const q of dataset.QuestionPosts) {
    lines.push(
      `UPDATE [__mj_BizAppsCommunity].[ForumQuestionPost]`,
      `SET [AcceptedAnswerPostID] = ${q.AcceptedAnswerPostID ? `'${q.AcceptedAnswerPostID}'` : 'NULL'}, [AICanonAnswerPostID] = ${q.AICanonAnswerPostID ? `'${q.AICanonAnswerPostID}'` : 'NULL'}, [BountyPoints] = ${q.BountyPoints ?? 0}, [ResolvedAt] = ${escapeSql(q.ResolvedAt ?? null)}`,
      `WHERE [ID] = '${q.ID}';`,
    );
  }

  // 18. ForumIdeaCampaign (1 campaign)
  for (const camp of dataset.IdeaCampaigns) {
    lines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumIdeaCampaign] WHERE [ID] = '${camp.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[ForumIdeaCampaign] ([ID], [DefaultBudgetPoints], [AllocationMode], [MaxPointsPerIdea])`,
      `    VALUES ('${camp.ID}', ${camp.DefaultBudgetPoints}, ${escapeSql(camp.AllocationMode)}, ${camp.MaxPointsPerIdea});`,
    );
  }

  // 19. ForumIdeaPost (5 idea posts)
  for (const idea of dataset.IdeaPosts) {
    lines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumIdeaPost] WHERE [ID] = '${idea.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[ForumIdeaPost] ([ID], [IdeaStatus], [TotalPointsAllocated], [EffectiveQuadraticVotes], [UniqueBackerCount], [TargetReleaseOrQuarter])`,
      `    VALUES ('${idea.ID}', ${escapeSql(idea.IdeaStatus)}, 0, 0.0, 0, ${escapeSql(idea.TargetReleaseOrQuarter)});`,
    );
  }

  // 20. ForumIdeaAllocation (25 allocations) + aggregate recomputation
  for (const alloc of dataset.IdeaAllocations) {
    lines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumIdeaAllocation] WHERE [ID] = '${alloc.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[ForumIdeaAllocation] ([ID], [IdeaPostID], [UserID], [PointsAllocated], [QuadraticVotes])`,
      `    VALUES ('${alloc.ID}', '${alloc.IdeaPostID}', '${alloc.UserID}', ${alloc.PointsAllocated}, ${alloc.QuadraticVotes});`,
    );
  }
  for (const idea of dataset.IdeaPosts) {
    lines.push(
      `UPDATE [__mj_BizAppsCommunity].[ForumIdeaPost]`,
      `SET [TotalPointsAllocated] = ISNULL(agg.[TotalPts], 0), [EffectiveQuadraticVotes] = ISNULL(agg.[TotalVotes], 0.0), [UniqueBackerCount] = ISNULL(agg.[Backers], 0)`,
      `FROM [__mj_BizAppsCommunity].[ForumIdeaPost] ip`,
      `OUTER APPLY (SELECT SUM([PointsAllocated]) AS [TotalPts], SUM([QuadraticVotes]) AS [TotalVotes], COUNT(*) AS [Backers] FROM [__mj_BizAppsCommunity].[ForumIdeaAllocation] WHERE [IdeaPostID] = '${idea.ID}') agg`,
      `WHERE ip.[ID] = '${idea.ID}';`,
    );
  }

  // 21. ForumCasePost (2 case posts)
  for (const c of dataset.CasePosts) {
    lines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumCasePost] WHERE [ID] = '${c.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[ForumCasePost] ([ID], [SituationMarkdown], [ActionTakenMarkdown], [OutcomeMarkdown], [IsAnonymized], [AnonymizedAuthorAlias])`,
      `    VALUES ('${c.ID}', ${escapeSql(c.SituationMarkdown)}, ${escapeSql(c.ActionTakenMarkdown)}, ${escapeSql(c.OutcomeMarkdown)}, ${escapeSql(c.IsAnonymized)}, ${escapeSql(c.AnonymizedAuthorAlias)});`,
    );
  }

  // 22. ForumAMAPost (2 AMA posts)
  for (const ama of dataset.AMAPosts) {
    lines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumAMAPost] WHERE [ID] = '${ama.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[ForumAMAPost] ([ID], [HostUserID], [ScheduledStartAt], [ScheduledEndAt], [QuestionsOpenAt], [IsLiveNow], [RecapMarkdown])`,
      `    VALUES ('${ama.ID}', '${ama.HostUserID}', ${escapeSql(ama.ScheduledStartAt)}, ${escapeSql(ama.ScheduledEndAt)}, ${escapeSql(ama.QuestionsOpenAt)}, ${escapeSql(ama.IsLiveNow)}, ${escapeSql(ama.RecapMarkdown)});`,
    );
  }

  // 23-24. ForumInteractivePost (1) & ForumInteractiveSession (6) — resolve core Environment & ArtifactType
  lines.push(
    'DECLARE @ArchEnvID UNIQUEIDENTIFIER;',
    'SELECT TOP 1 @ArchEnvID = [ID] FROM [__mj].[Environment] WHERE [IsDefault] = 1;',
    'IF @ArchEnvID IS NULL SELECT TOP 1 @ArchEnvID = [ID] FROM [__mj].[Environment] ORDER BY [__mj_CreatedAt] ASC;',
    'DECLARE @ArchArtifactTypeID UNIQUEIDENTIFIER;',
    'SELECT TOP 1 @ArchArtifactTypeID = [ID] FROM [__mj].[ArtifactType] ORDER BY [__mj_CreatedAt] ASC;',
    'IF @ArchEnvID IS NOT NULL AND @ArchArtifactTypeID IS NOT NULL',
    'BEGIN',
    `    IF NOT EXISTS (SELECT 1 FROM [__mj].[Artifact] WHERE [ID] = '${ARCH_INTERACTIVE_ARTIFACT_ID}')`,
    `        INSERT INTO [__mj].[Artifact] ([ID], [EnvironmentID], [Name], [Description], [TypeID], [UserID], [__mj_CreatedAt], [__mj_UpdatedAt], [Visibility])`,
    `        VALUES ('${ARCH_INTERACTIVE_ARTIFACT_ID}', @ArchEnvID, N'IBC 2027 Mass Timber Readiness Challenge', N'Interactive AGPA Type IV-A/B/C readiness quiz component.', @ArchArtifactTypeID, '${ownerId}', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET(), N'Always');`,
    `    IF NOT EXISTS (SELECT 1 FROM [__mj].[ArtifactVersion] WHERE [ID] = '${ARCH_INTERACTIVE_ARTIFACT_VERSION_ID}')`,
    `        INSERT INTO [__mj].[ArtifactVersion] ([ID], [ArtifactID], [VersionNumber], [UserID], [__mj_CreatedAt], [__mj_UpdatedAt], [ContentMode], [ForceToolsOnly])`,
    `        VALUES ('${ARCH_INTERACTIVE_ARTIFACT_VERSION_ID}', '${ARCH_INTERACTIVE_ARTIFACT_ID}', 1, '${ownerId}', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET(), N'Text', 0);`,
  );
  for (const inter of dataset.InteractivePosts) {
    lines.push(
      `    IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumInteractivePost] WHERE [ID] = '${inter.ID}')`,
      `        INSERT INTO [__mj_BizAppsCommunity].[ForumInteractivePost] ([ID], [ComponentArtifactID], [PinnedArtifactVersionID], [ExperienceKind], [ScoringMode], [ShowLeaderboard], [MaxAttemptsPerMember], [PlayCount])`,
      `        VALUES ('${inter.ID}', '${ARCH_INTERACTIVE_ARTIFACT_ID}', '${ARCH_INTERACTIVE_ARTIFACT_VERSION_ID}', ${escapeSql(inter.ExperienceKind)}, ${escapeSql(inter.ScoringMode)}, ${escapeSql(inter.ShowLeaderboard)}, ${inter.MaxAttemptsPerMember ?? 'NULL'}, ${inter.PlayCount ?? 0});`,
    );
  }
  for (const sess of dataset.InteractiveSessions) {
    lines.push(
      `    IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumInteractiveSession] WHERE [ID] = '${sess.ID}')`,
      `        INSERT INTO [__mj_BizAppsCommunity].[ForumInteractiveSession] ([ID], [InteractivePostID], [ArtifactVersionID], [UserID], [AttemptNumber], [Score], [DurationSeconds], [Completed])`,
      `        VALUES ('${sess.ID}', '${sess.InteractivePostID}', '${ARCH_INTERACTIVE_ARTIFACT_VERSION_ID}', '${sess.UserID}', ${sess.AttemptNumber}, ${sess.Score}, ${sess.DurationSeconds}, ${escapeSql(sess.Completed)});`,
    );
  }
  lines.push('END;');

  // 25. ForumPostTag (38 post tags)
  for (const pt of dataset.PostTags) {
    lines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumPostTag] WHERE [ID] = '${pt.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[ForumPostTag] ([ID], [PostID], [TopicTagID]) VALUES ('${pt.ID}', '${pt.PostID}', '${pt.TopicTagID}');`,
    );
  }

  // 26-27. ForumPostReaction (10 reactions) & ForumPostFlag (2 flags)
  for (const rx of dataset.PostReactions) {
    lines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumPostReaction] WHERE [ID] = '${rx.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[ForumPostReaction] ([ID], [PostID], [UserID], [ReactionKind], [Weight])`,
      `    VALUES ('${rx.ID}', '${rx.PostID}', '${rx.UserID}', ${escapeSql(rx.ReactionKind)}, ${rx.Weight ?? 1.0});`,
    );
  }
  for (const flag of dataset.PostFlags) {
    const reportedBy = flag.ReportedByUserID ?? flag.ReporterUserID;
    const reasonDetails = flag.ReasonDetails ?? flag.Notes ?? null;
    lines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumPostFlag] WHERE [ID] = '${flag.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[ForumPostFlag] ([ID], [PostID], [ReportedByUserID], [ReasonCategory], [Status], [ReasonDetails])`,
      `    VALUES ('${flag.ID}', '${flag.PostID}', ${reportedBy ? `'${reportedBy}'` : 'NULL'}, ${escapeSql(flag.ReasonCategory)}, ${escapeSql(flag.Status)}, ${escapeSql(reasonDetails)});`,
      `ELSE`,
      `    UPDATE [__mj_BizAppsCommunity].[ForumPostFlag] SET [Status] = ${escapeSql(flag.Status)}, [ReasonDetails] = ${escapeSql(reasonDetails)} WHERE [ID] = '${flag.ID}';`,
    );
  }

  return lines.join('\n');
}

function buildPostgresScript(dataset) {
  const ownerId = dataset.Members[21].ID;
  const lines = [
    '-- =============================================================================',
    '--  ARCH-WORLD (American Guild of Practicing Architects) Seed Script (PostgreSQL)',
    '--  Complete 27-table FK-safe idempotent upserts in topological dependency order.',
    '-- =============================================================================',
    'SET search_path TO __mj_BizAppsCommunity, public;',
    '',
    'DO $$',
    'DECLARE',
    '    v_default_environment_id UUID;',
    '    v_any_artifact_type_id UUID;',
    'BEGIN',
  ];

  // 1. __mj_BizAppsCollaboration."SpaceType" (2 space types)
  dataset.spaceTypes.forEach((st, idx) => {
    lines.push(
      `IF EXISTS (SELECT 1 FROM __mj_BizAppsCollaboration."SpaceType" WHERE "ID" = '${st.ID}') THEN`,
      `    UPDATE __mj_BizAppsCollaboration."SpaceType" SET "Name" = ${escapePg(st.Name)}, "Description" = ${escapePg(st.Description ?? null)}, "Configuration" = ${escapePg(st.Configuration ?? null)}, "IsActive" = ${escapePg(st.IsActive ?? true)} WHERE "ID" = '${st.ID}';`,
      `ELSIF NOT EXISTS (SELECT 1 FROM __mj_BizAppsCollaboration."SpaceType" WHERE "Code" = ${escapePg(st.Code)}) THEN`,
      `    INSERT INTO __mj_BizAppsCollaboration."SpaceType" ("ID", "Code", "Name", "Description", "Vocabulary", "Discoverability", "JoinMode", "MessagingPanel", "LibraryPanel", "WorkPanel", "DefaultAgentRetrieval", "DefaultBand", "InviteApproval", "DisplayRank", "IsActive", "DefaultAllowParentAssignees", "Configuration")`,
      `    VALUES ('${st.ID}', ${escapePg(st.Code)}, ${escapePg(st.Name)}, ${escapePg(st.Description ?? null)}, ${escapePg(st.Vocabulary ?? st.Code)}, ${escapePg(st.Discoverability ?? 'Listed')}, ${escapePg(st.JoinMode ?? 'SelfServe')}, ${escapePg(st.MessagingPanel ?? true)}, ${escapePg(st.LibraryPanel ?? true)}, ${escapePg(st.WorkPanel ?? true)}, ${escapePg(st.DefaultAgentRetrieval ?? 'Included')}, ${escapePg(st.DefaultBand ?? 'Shared')}, ${escapePg(st.InviteApproval ?? 'Approve')}, ${st.DisplayRank ?? (idx + 1) * 10}, ${escapePg(st.IsActive ?? true)}, ${escapePg(st.DefaultAllowParentAssignees ?? true)}, ${escapePg(st.Configuration ?? null)});`,
      `END IF;`,
    );
  });

  // 2. __mj_BizAppsCollaboration."SpaceRoleType" (4 space role types, incl. ARCH-WORLD contributor)
  dataset.spaceRoleTypes.forEach((srt, idx) => {
    const level = srt.Level ?? 100;
    const maxGrantable = srt.MaxGrantableLevel ?? (srt.IsOwnerRole ? level : 0);
    lines.push(
      `INSERT INTO __mj_BizAppsCollaboration."SpaceRoleType" ("ID", "Code", "Name", "Description", "Level", "MaxGrantableLevel", "CanInvite", "CanPromoteBand", "CanSeeTeamBand", "IsOwnerRole", "DisplayRank", "IsActive", "CanContribute")`,
      `VALUES ('${srt.ID}', ${escapePg(srt.Code)}, ${escapePg(srt.Name)}, ${escapePg(srt.Description ?? null)}, ${level}, ${maxGrantable}, ${escapePg(srt.CanInvite ?? false)}, ${escapePg(srt.CanPromoteBand ?? false)}, ${escapePg(srt.CanSeeTeamBand ?? false)}, ${escapePg(srt.IsOwnerRole ?? false)}, ${srt.DisplayRank ?? (idx + 1) * 10}, ${escapePg(srt.IsActive ?? true)}, ${escapePg(srt.CanContribute ?? true)})`,
      `ON CONFLICT ("ID") DO UPDATE SET "Name" = EXCLUDED."Name", "Description" = EXCLUDED."Description", "Level" = EXCLUDED."Level", "MaxGrantableLevel" = EXCLUDED."MaxGrantableLevel", "CanInvite" = EXCLUDED."CanInvite", "CanPromoteBand" = EXCLUDED."CanPromoteBand", "CanSeeTeamBand" = EXCLUDED."CanSeeTeamBand", "IsOwnerRole" = EXCLUDED."IsOwnerRole", "DisplayRank" = EXCLUDED."DisplayRank", "IsActive" = EXCLUDED."IsActive", "CanContribute" = EXCLUDED."CanContribute";`,
    );
  });

  // 3-5. "ForumType" (6), "PostType" (13), "ForumRoleType" (7)
  dataset.forumTypes.forEach((ft, idx) => {
    lines.push(
      `INSERT INTO "ForumType" ("ID", "Code", "Name", "ServerDriverClass", "Sequence", "IsActive")`,
      `VALUES ('${ft.ID}', ${escapePg(ft.Code)}, ${escapePg(ft.Name)}, ${escapePg(ft.ServerDriverClass ?? null)}, ${(idx + 1) * 10}, TRUE)`,
      `ON CONFLICT ("ID") DO UPDATE SET "Name" = EXCLUDED."Name", "ServerDriverClass" = EXCLUDED."ServerDriverClass", "IsActive" = EXCLUDED."IsActive";`,
    );
  });
  dataset.postTypes.forEach((pt, idx) => {
    lines.push(
      `INSERT INTO "PostType" ("ID", "Code", "Name", "ServerDriverClass", "PlacementRule", "AllowsNestedReplies", "Sequence", "IsActive")`,
      `VALUES ('${pt.ID}', ${escapePg(pt.Code)}, ${escapePg(pt.Name ?? pt.Code)}, ${escapePg(pt.ServerDriverClass ?? null)}, ${escapePg(pt.PlacementRule)}, ${escapePg(pt.AllowsNestedReplies)}, ${pt.Sequence ?? (idx + 1) * 10}, TRUE)`,
      `ON CONFLICT ("ID") DO UPDATE SET "Name" = EXCLUDED."Name", "ServerDriverClass" = EXCLUDED."ServerDriverClass", "PlacementRule" = EXCLUDED."PlacementRule", "AllowsNestedReplies" = EXCLUDED."AllowsNestedReplies";`,
    );
  });
  dataset.forumRoleTypes.forEach((fr, idx) => {
    const seq = fr.Sequence ?? (idx + 1) * 10;
    const level = fr.Level ?? 100;
    lines.push(
      `INSERT INTO "ForumRoleType" ("ID", "Code", "Name", "Description", "Level", "CanConfigureForum", "CanModerateQueue", "CanPinOrLock", "CanAcceptAnswers", "CanVerifyCanon", "CanPromoteToSpace", "CanCreateRootPost", "CanReply", "CanCoEditDocs", "VoteWeightMultiplier", "Sequence", "IsActive")`,
      `VALUES ('${fr.ID}', ${escapePg(fr.Code)}, ${escapePg(fr.Name)}, ${escapePg(fr.Description ?? null)}, ${level}, ${escapePg(fr.CanConfigureForum)}, ${escapePg(fr.CanModerateQueue)}, ${escapePg(fr.CanPinOrLock)}, ${escapePg(fr.CanAcceptAnswers)}, ${escapePg(fr.CanVerifyCanon)}, ${escapePg(fr.CanPromoteToSpace)}, ${escapePg(fr.CanCreateRootPost)}, ${escapePg(fr.CanReply)}, ${escapePg(fr.CanCoEditDocs)}, ${fr.VoteWeightMultiplier}, ${seq}, ${escapePg(fr.IsActive)})`,
      `ON CONFLICT ("ID") DO UPDATE SET "Name" = EXCLUDED."Name", "Description" = EXCLUDED."Description", "Level" = EXCLUDED."Level", "CanConfigureForum" = EXCLUDED."CanConfigureForum", "CanModerateQueue" = EXCLUDED."CanModerateQueue", "CanPinOrLock" = EXCLUDED."CanPinOrLock", "CanAcceptAnswers" = EXCLUDED."CanAcceptAnswers", "CanVerifyCanon" = EXCLUDED."CanVerifyCanon", "CanPromoteToSpace" = EXCLUDED."CanPromoteToSpace", "CanCreateRootPost" = EXCLUDED."CanCreateRootPost", "CanReply" = EXCLUDED."CanReply", "CanCoEditDocs" = EXCLUDED."CanCoEditDocs", "VoteWeightMultiplier" = EXCLUDED."VoteWeightMultiplier", "Sequence" = EXCLUDED."Sequence", "IsActive" = EXCLUDED."IsActive";`,
    );
  });

  // 6. __mj."User" (all 26 ARCH_MEMBERS)
  for (const member of dataset.Members) {
    const u = deriveMemberFields(member);
    lines.push(
      `INSERT INTO __mj."User" ("ID", "Name", "FirstName", "LastName", "Email", "Type", "IsActive")`,
      `VALUES ('${u.ID}', ${escapePg(u.Name)}, ${escapePg(u.FirstName)}, ${escapePg(u.LastName)}, ${escapePg(u.Email)}, ${escapePg(u.Type)}, ${escapePg(u.IsActive)})`,
      `ON CONFLICT ("ID") DO UPDATE SET "Name" = EXCLUDED."Name", "FirstName" = EXCLUDED."FirstName", "LastName" = EXCLUDED."LastName", "Email" = EXCLUDED."Email", "Type" = EXCLUDED."Type", "IsActive" = EXCLUDED."IsActive";`,
    );
  }

  // 7. __mj_BizAppsCollaboration."Space" (4 spaces)
  for (const space of dataset.Spaces) {
    lines.push(
      `INSERT INTO __mj_BizAppsCollaboration."Space" ("ID", "SpaceTypeID", "Name", "Description", "OwnerID", "InheritsMembership", "AgentRetrieval", "StartedAt", "AllowParentAssignees")`,
      `VALUES ('${space.ID}', '${space.SpaceTypeID}', ${escapePg(space.Name)}, ${escapePg(space.Description)}, '${ownerId}', ${escapePg(space.InheritsMembership)}, 'Included', CURRENT_TIMESTAMP, TRUE)`,
      `ON CONFLICT ("ID") DO UPDATE SET "Name" = EXCLUDED."Name", "Description" = EXCLUDED."Description", "OwnerID" = EXCLUDED."OwnerID", "InheritsMembership" = EXCLUDED."InheritsMembership";`,
    );
  }

  // 8. __mj_BizAppsCollaboration."SpaceMember" (64 memberships)
  for (const sm of dataset.SpaceMembers) {
    lines.push(
      `INSERT INTO __mj_BizAppsCollaboration."SpaceMember" ("ID", "SpaceID", "UserID", "SpaceRoleTypeID", "Band", "Status")`,
      `VALUES ('${sm.ID}', '${sm.SpaceID}', '${sm.UserID}', '${sm.SpaceRoleTypeID}', ${escapePg(sm.Band)}, ${escapePg(sm.Status)})`,
      `ON CONFLICT ("ID") DO UPDATE SET "SpaceRoleTypeID" = EXCLUDED."SpaceRoleTypeID", "Band" = EXCLUDED."Band", "Status" = EXCLUDED."Status";`,
    );
  }

  // 9. "CommunitySpace" (4 community spaces)
  for (const space of dataset.Spaces) {
    lines.push(
      `INSERT INTO "CommunitySpace" ("ID", "Slug", "CommunityKind", "AnonymousReadMode", "AskFirstEnabled", "DefaultDigestCadence")`,
      `VALUES ('${space.ID}', ${escapePg(space.Slug)}, ${escapePg(space.CommunityKind)}, ${escapePg(space.AnonymousReadMode)}, ${escapePg(space.AskFirstEnabled)}, ${escapePg(space.DefaultDigestCadence)})`,
      `ON CONFLICT ("ID") DO UPDATE SET "Slug" = EXCLUDED."Slug", "CommunityKind" = EXCLUDED."CommunityKind", "AnonymousReadMode" = EXCLUDED."AnonymousReadMode", "AskFirstEnabled" = EXCLUDED."AskFirstEnabled", "DefaultDigestCadence" = EXCLUDED."DefaultDigestCadence";`,
    );
  }

  // 10. "Forum" (13 forums)
  for (const forum of dataset.Forums) {
    lines.push(
      `INSERT INTO "Forum" ("ID", "SpaceID", "ForumTypeID", "Slug", "Name", "Description", "VisibilityBand", "PostingPolicy", "InheritsSpaceMembers", "Sequence", "Status")`,
      `VALUES ('${forum.ID}', '${forum.SpaceID}', '${forum.ForumTypeID}', ${escapePg(forum.Slug)}, ${escapePg(forum.Name)}, ${escapePg(forum.Description)}, ${escapePg(forum.VisibilityBand)}, ${escapePg(forum.PostingPolicy)}, ${escapePg(forum.InheritsSpaceMembers)}, ${forum.Sequence}, ${escapePg(forum.Status)})`,
      `ON CONFLICT ("ID") DO UPDATE SET "Name" = EXCLUDED."Name", "Description" = EXCLUDED."Description", "VisibilityBand" = EXCLUDED."VisibilityBand", "PostingPolicy" = EXCLUDED."PostingPolicy", "Status" = EXCLUDED."Status";`,
    );
  }

  // 11. "ForumMember" (14 memberships)
  for (const fm of dataset.ForumMembers) {
    lines.push(
      `INSERT INTO "ForumMember" ("ID", "ForumID", "UserID", "ForumRoleTypeID", "Status")`,
      `VALUES ('${fm.ID}', '${fm.ForumID}', '${fm.UserID}', '${fm.ForumRoleTypeID}', ${escapePg(fm.Status)})`,
      `ON CONFLICT ("ID") DO UPDATE SET "ForumRoleTypeID" = EXCLUDED."ForumRoleTypeID", "Status" = EXCLUDED."Status";`,
    );
  }

  // 12. "CommunityMemberProfile" (26 profiles)
  for (const p of dataset.MemberProfiles) {
    lines.push(
      `INSERT INTO "CommunityMemberProfile" ("ID", "SpaceID", "UserID", "BioMarkdown", "ExpertiseTagsJSON", "HelpfulAnswerCount", "AcceptedAnswerCount", "ReputationScore", "DigestCadence", "OpenToPeerMentoring")`,
      `VALUES ('${p.ID}', '${p.SpaceID}', '${p.UserID}', ${escapePg(p.BioMarkdown ?? p.Bio)}, ${escapePg(p.ExpertiseTagsJSON)}, ${p.HelpfulAnswerCount}, ${p.AcceptedAnswerCount}, ${p.ReputationScore}, ${escapePg(p.DigestCadence)}, ${escapePg(Boolean(p.OpenToPeerMentoring))})`,
      `ON CONFLICT ("ID") DO UPDATE SET "BioMarkdown" = EXCLUDED."BioMarkdown", "ExpertiseTagsJSON" = EXCLUDED."ExpertiseTagsJSON", "ReputationScore" = EXCLUDED."ReputationScore", "DigestCadence" = EXCLUDED."DigestCadence";`,
    );
  }

  // 13. "ForumTopicTag" (22 space-local tags)
  for (const tag of dataset.TopicTags) {
    lines.push(
      `INSERT INTO "ForumTopicTag" ("ID", "SpaceID", "Slug", "Name", "IsOfficial")`,
      `VALUES ('${tag.ID}', '${tag.SpaceID}', ${escapePg(tag.Slug)}, ${escapePg(tag.Name)}, ${escapePg(tag.IsOfficial)})`,
      `ON CONFLICT ("ID") DO UPDATE SET "Name" = EXCLUDED."Name", "IsOfficial" = EXCLUDED."IsOfficial";`,
    );
  }

  // 14. "ForumPost" (68 posts in topological order)
  for (const post of sortPostsTopologically(dataset.Posts)) {
    lines.push(
      `INSERT INTO "ForumPost" ("ID", "ForumID", "PostTypeID", "RootPostID", "ParentPostID", "ReplyDepth", "AuthorUserID", "Title", "Slug", "BodyMarkdown", "SummaryMarkdown", "VisibilityBand", "Status", "IsPinned", "IsLocked", "IsFeatured", "ReplyCount", "ParticipantCount", "ReactionScore", "ViewCount")`,
      `VALUES ('${post.ID}', '${post.ForumID}', '${post.PostTypeID}', ${post.RootPostID ? `'${post.RootPostID}'` : 'NULL'}, ${post.ParentPostID ? `'${post.ParentPostID}'` : 'NULL'}, ${post.ReplyDepth ?? 0}, '${post.AuthorUserID}', ${escapePg(post.Title)}, ${escapePg(post.Slug)}, ${escapePg(post.BodyMarkdown)}, ${escapePg(post.SummaryMarkdown)}, ${escapePg(post.VisibilityBand)}, ${escapePg(post.Status)}, ${escapePg(post.IsPinned)}, ${escapePg(post.IsLocked)}, ${escapePg(post.IsFeatured)}, ${post.ReplyCount ?? 0}, ${post.ParticipantCount ?? 1}, ${post.ReactionScore ?? 0}, ${post.ViewCount ?? 0})`,
      `ON CONFLICT ("ID") DO UPDATE SET "Title" = EXCLUDED."Title", "BodyMarkdown" = EXCLUDED."BodyMarkdown", "Status" = EXCLUDED."Status", "IsPinned" = EXCLUDED."IsPinned", "IsLocked" = EXCLUDED."IsLocked", "IsFeatured" = EXCLUDED."IsFeatured";`,
    );
  }

  // 15. "ForumSubscription" (10 subscriptions — after User, Forum, ForumTopicTag, ForumPost)
  for (const sub of dataset.ForumSubscriptions) {
    const level = normalizeSubscriptionDeliveryLevel(sub);
    lines.push(
      `INSERT INTO "ForumSubscription" ("ID", "UserID", "ForumID", "DeliveryLevel")`,
      `VALUES ('${sub.ID}', '${sub.UserID}', '${sub.ForumID}', ${escapePg(level)})`,
      `ON CONFLICT ("ID") DO UPDATE SET "DeliveryLevel" = EXCLUDED."DeliveryLevel";`,
    );
  }

  // 12. "ForumQuestionPost" (cyclic-FK-safe: insert with AcceptedAnswerPostID = NULL first)
  for (const q of dataset.QuestionPosts) {
    lines.push(
      `INSERT INTO "ForumQuestionPost" ("ID", "AcceptedAnswerPostID", "AICanonAnswerPostID", "BountyPoints", "ResolvedAt")`,
      `VALUES ('${q.ID}', NULL, NULL, ${q.BountyPoints ?? 0}, ${escapePg(q.ResolvedAt ?? null)})`,
      `ON CONFLICT ("ID") DO UPDATE SET "BountyPoints" = EXCLUDED."BountyPoints", "ResolvedAt" = EXCLUDED."ResolvedAt";`,
    );
  }

  // 13. "ForumAnswerPost" (7 answers) + cyclic-FK-safe AcceptedAnswerPostID linkage
  for (const a of dataset.AnswerPosts) {
    lines.push(
      `INSERT INTO "ForumAnswerPost" ("ID", "QuestionPostID", "IsAcceptedByAuthor", "IsVerifiedByModerator", "VerifiedByUserID", "AIEpistemicStatus", "AIConfidenceScore")`,
      `VALUES ('${a.ID}', '${a.QuestionPostID}', ${escapePg(a.IsAcceptedByAuthor)}, ${escapePg(a.IsVerifiedByModerator)}, ${a.VerifiedByUserID ? `'${a.VerifiedByUserID}'` : 'NULL'}, ${escapePg(a.AIEpistemicStatus)}, ${a.AIConfidenceScore})`,
      `ON CONFLICT ("ID") DO UPDATE SET "IsAcceptedByAuthor" = EXCLUDED."IsAcceptedByAuthor", "IsVerifiedByModerator" = EXCLUDED."IsVerifiedByModerator", "AIEpistemicStatus" = EXCLUDED."AIEpistemicStatus", "AIConfidenceScore" = EXCLUDED."AIConfidenceScore";`,
    );
  }
  for (const q of dataset.QuestionPosts) {
    lines.push(
      `UPDATE "ForumQuestionPost"`,
      `SET "AcceptedAnswerPostID" = ${q.AcceptedAnswerPostID ? `'${q.AcceptedAnswerPostID}'` : 'NULL'}, "AICanonAnswerPostID" = ${q.AICanonAnswerPostID ? `'${q.AICanonAnswerPostID}'` : 'NULL'}, "ResolvedAt" = ${escapePg(q.ResolvedAt ?? null)}`,
      `WHERE "ID" = '${q.ID}';`,
    );
  }

  // 14. "ForumIdeaCampaign"
  for (const camp of dataset.IdeaCampaigns) {
    lines.push(
      `INSERT INTO "ForumIdeaCampaign" ("ID", "DefaultBudgetPoints", "AllocationMode", "MaxPointsPerIdea")`,
      `VALUES ('${camp.ID}', ${camp.DefaultBudgetPoints}, ${escapePg(camp.AllocationMode)}, ${camp.MaxPointsPerIdea})`,
      `ON CONFLICT ("ID") DO UPDATE SET "DefaultBudgetPoints" = EXCLUDED."DefaultBudgetPoints", "AllocationMode" = EXCLUDED."AllocationMode", "MaxPointsPerIdea" = EXCLUDED."MaxPointsPerIdea";`,
    );
  }

  // 15. "ForumIdeaPost"
  for (const idea of dataset.IdeaPosts) {
    lines.push(
      `INSERT INTO "ForumIdeaPost" ("ID", "IdeaStatus", "TotalPointsAllocated", "EffectiveQuadraticVotes", "UniqueBackerCount", "TargetReleaseOrQuarter")`,
      `VALUES ('${idea.ID}', ${escapePg(idea.IdeaStatus)}, 0, 0.0, 0, ${escapePg(idea.TargetReleaseOrQuarter)})`,
      `ON CONFLICT ("ID") DO UPDATE SET "IdeaStatus" = EXCLUDED."IdeaStatus", "TargetReleaseOrQuarter" = EXCLUDED."TargetReleaseOrQuarter";`,
    );
  }

  // 16. "ForumIdeaAllocation" + aggregate recomputation
  for (const alloc of dataset.IdeaAllocations) {
    lines.push(
      `INSERT INTO "ForumIdeaAllocation" ("ID", "IdeaPostID", "UserID", "PointsAllocated", "QuadraticVotes")`,
      `VALUES ('${alloc.ID}', '${alloc.IdeaPostID}', '${alloc.UserID}', ${alloc.PointsAllocated}, ${alloc.QuadraticVotes})`,
      `ON CONFLICT ("ID") DO UPDATE SET "PointsAllocated" = EXCLUDED."PointsAllocated", "QuadraticVotes" = EXCLUDED."QuadraticVotes";`,
    );
  }
  for (const idea of dataset.IdeaPosts) {
    lines.push(
      `UPDATE "ForumIdeaPost" AS ip`,
      `SET "TotalPointsAllocated" = totals.total_points, "EffectiveQuadraticVotes" = totals.total_votes, "UniqueBackerCount" = totals.backer_count`,
      `FROM (SELECT COALESCE(SUM("PointsAllocated"), 0) AS total_points, COALESCE(SUM("QuadraticVotes"), 0.0) AS total_votes, COUNT(*) AS backer_count FROM "ForumIdeaAllocation" WHERE "IdeaPostID" = '${idea.ID}') AS totals`,
      `WHERE ip."ID" = '${idea.ID}';`,
    );
  }

  // 17. "ForumCasePost"
  for (const c of dataset.CasePosts) {
    lines.push(
      `INSERT INTO "ForumCasePost" ("ID", "SituationMarkdown", "ActionTakenMarkdown", "OutcomeMarkdown", "IsAnonymized", "AnonymizedAuthorAlias")`,
      `VALUES ('${c.ID}', ${escapePg(c.SituationMarkdown)}, ${escapePg(c.ActionTakenMarkdown)}, ${escapePg(c.OutcomeMarkdown)}, ${escapePg(c.IsAnonymized)}, ${escapePg(c.AnonymizedAuthorAlias)})`,
      `ON CONFLICT ("ID") DO UPDATE SET "SituationMarkdown" = EXCLUDED."SituationMarkdown", "ActionTakenMarkdown" = EXCLUDED."ActionTakenMarkdown", "OutcomeMarkdown" = EXCLUDED."OutcomeMarkdown";`,
    );
  }

  // 18. "ForumAMAPost"
  for (const ama of dataset.AMAPosts) {
    lines.push(
      `INSERT INTO "ForumAMAPost" ("ID", "HostUserID", "ScheduledStartAt", "ScheduledEndAt", "QuestionsOpenAt", "IsLiveNow", "RecapMarkdown")`,
      `VALUES ('${ama.ID}', '${ama.HostUserID}', ${escapePg(ama.ScheduledStartAt)}, ${escapePg(ama.ScheduledEndAt)}, ${escapePg(ama.QuestionsOpenAt)}, ${escapePg(ama.IsLiveNow)}, ${escapePg(ama.RecapMarkdown)})`,
      `ON CONFLICT ("ID") DO UPDATE SET "IsLiveNow" = EXCLUDED."IsLiveNow", "RecapMarkdown" = EXCLUDED."RecapMarkdown";`,
    );
  }

  // 19-20. "ForumInteractivePost" & "ForumInteractiveSession"
  lines.push(
    'SELECT "ID" INTO v_default_environment_id FROM __mj."Environment" WHERE "IsDefault" = TRUE LIMIT 1;',
    'IF v_default_environment_id IS NULL THEN',
    '    SELECT "ID" INTO v_default_environment_id FROM __mj."Environment" ORDER BY "__mj_CreatedAt" ASC LIMIT 1;',
    'END IF;',
    'SELECT "ID" INTO v_any_artifact_type_id FROM __mj."ArtifactType" ORDER BY "__mj_CreatedAt" ASC LIMIT 1;',
    'IF v_default_environment_id IS NOT NULL AND v_any_artifact_type_id IS NOT NULL THEN',
    `    INSERT INTO __mj."Artifact" ("ID", "EnvironmentID", "Name", "Description", "TypeID", "UserID", "Visibility")`,
    `    VALUES ('${ARCH_INTERACTIVE_ARTIFACT_ID}', v_default_environment_id, 'IBC 2027 Mass Timber Readiness Challenge', 'Interactive AGPA Type IV-A/B/C readiness quiz component.', v_any_artifact_type_id, '${ownerId}', 'Always') ON CONFLICT ("ID") DO NOTHING;`,
    `    INSERT INTO __mj."ArtifactVersion" ("ID", "ArtifactID", "VersionNumber", "UserID", "ContentMode", "ForceToolsOnly")`,
    `    VALUES ('${ARCH_INTERACTIVE_ARTIFACT_VERSION_ID}', '${ARCH_INTERACTIVE_ARTIFACT_ID}', 1, '${ownerId}', 'Text', FALSE) ON CONFLICT ("ID") DO NOTHING;`,
  );
  for (const inter of dataset.InteractivePosts) {
    lines.push(
      `    INSERT INTO "ForumInteractivePost" ("ID", "ComponentArtifactID", "PinnedArtifactVersionID", "ExperienceKind", "ScoringMode", "ShowLeaderboard", "MaxAttemptsPerMember", "PlayCount")`,
      `    VALUES ('${inter.ID}', '${ARCH_INTERACTIVE_ARTIFACT_ID}', '${ARCH_INTERACTIVE_ARTIFACT_VERSION_ID}', ${escapePg(inter.ExperienceKind)}, ${escapePg(inter.ScoringMode)}, ${escapePg(inter.ShowLeaderboard)}, ${inter.MaxAttemptsPerMember ?? 'NULL'}, ${inter.PlayCount ?? 0})`,
      `    ON CONFLICT ("ID") DO UPDATE SET "PlayCount" = EXCLUDED."PlayCount";`,
    );
  }
  for (const sess of dataset.InteractiveSessions) {
    lines.push(
      `    INSERT INTO "ForumInteractiveSession" ("ID", "InteractivePostID", "ArtifactVersionID", "UserID", "AttemptNumber", "Score", "DurationSeconds", "Completed")`,
      `    VALUES ('${sess.ID}', '${sess.InteractivePostID}', '${ARCH_INTERACTIVE_ARTIFACT_VERSION_ID}', '${sess.UserID}', ${sess.AttemptNumber}, ${sess.Score}, ${sess.DurationSeconds}, ${escapePg(sess.Completed)})`,
      `    ON CONFLICT ("ID") DO UPDATE SET "Score" = EXCLUDED."Score", "DurationSeconds" = EXCLUDED."DurationSeconds", "Completed" = EXCLUDED."Completed";`,
    );
  }
  lines.push('END IF;');

  // 21. "ForumPostTag"
  for (const pt of dataset.PostTags) {
    lines.push(
      `INSERT INTO "ForumPostTag" ("ID", "PostID", "TopicTagID") VALUES ('${pt.ID}', '${pt.PostID}', '${pt.TopicTagID}') ON CONFLICT ("ID") DO NOTHING;`,
    );
  }

  // 22. "ForumPostReaction" & "ForumPostFlag"
  for (const rx of dataset.PostReactions) {
    lines.push(
      `INSERT INTO "ForumPostReaction" ("ID", "PostID", "UserID", "ReactionKind", "Weight")`,
      `VALUES ('${rx.ID}', '${rx.PostID}', '${rx.UserID}', ${escapePg(rx.ReactionKind)}, ${rx.Weight ?? 1.0})`,
      `ON CONFLICT ("ID") DO UPDATE SET "Weight" = EXCLUDED."Weight";`,
    );
  }
  for (const flag of dataset.PostFlags) {
    const reportedBy = flag.ReportedByUserID ?? flag.ReporterUserID;
    const reasonDetails = flag.ReasonDetails ?? flag.Notes ?? null;
    lines.push(
      `INSERT INTO "ForumPostFlag" ("ID", "PostID", "ReportedByUserID", "ReasonCategory", "Status", "ReasonDetails")`,
      `VALUES ('${flag.ID}', '${flag.PostID}', ${reportedBy ? `'${reportedBy}'` : 'NULL'}, ${escapePg(flag.ReasonCategory)}, ${escapePg(flag.Status)}, ${escapePg(reasonDetails)})`,
      `ON CONFLICT ("ID") DO UPDATE SET "Status" = EXCLUDED."Status", "ReasonDetails" = EXCLUDED."ReasonDetails";`,
    );
  }

  lines.push('END $$;');
  return lines.join('\n');
}

function buildSqliteScript(dataset) {
  const ownerId = dataset.Members[21].ID;
  const lines = [
    '-- =============================================================================',
    '--  ARCH-WORLD (American Guild of Practicing Architects) Seed Script (SQLite)',
    '--  Complete 27-table FK-safe idempotent upserts in topological dependency order',
    '--  under PRAGMA foreign_keys = ON.',
    '-- =============================================================================',
    'PRAGMA foreign_keys = ON;',
    '',
  ];

  // 1. SpaceType (2)
  dataset.spaceTypes.forEach((st, idx) => {
    lines.push(
      `INSERT INTO "SpaceType" ("ID", "Code", "Name", "Description", "Vocabulary", "Discoverability", "JoinMode", "MessagingPanel", "LibraryPanel", "WorkPanel", "DefaultAgentRetrieval", "DefaultBand", "InviteApproval", "DisplayRank", "IsActive", "DefaultAllowParentAssignees", "Configuration") VALUES ('${st.ID}', ${escapeSqlite(st.Code)}, ${escapeSqlite(st.Name)}, ${escapeSqlite(st.Description ?? null)}, ${escapeSqlite(st.Vocabulary ?? st.Code)}, ${escapeSqlite(st.Discoverability ?? 'Listed')}, ${escapeSqlite(st.JoinMode ?? 'SelfServe')}, ${escapeSqlite(st.MessagingPanel ?? true)}, ${escapeSqlite(st.LibraryPanel ?? true)}, ${escapeSqlite(st.WorkPanel ?? true)}, ${escapeSqlite(st.DefaultAgentRetrieval ?? 'Included')}, ${escapeSqlite(st.DefaultBand ?? 'Shared')}, ${escapeSqlite(st.InviteApproval ?? 'Approve')}, ${st.DisplayRank ?? (idx + 1) * 10}, ${escapeSqlite(st.IsActive ?? true)}, ${escapeSqlite(st.DefaultAllowParentAssignees ?? true)}, ${escapeSqlite(st.Configuration ?? null)}) ON CONFLICT("ID") DO UPDATE SET "Name" = excluded."Name", "Configuration" = excluded."Configuration", "IsActive" = excluded."IsActive";`,
    );
  });

  // 2. SpaceRoleType (4)
  dataset.spaceRoleTypes.forEach((srt, idx) => {
    const level = srt.Level ?? 100;
    const maxGrantable = srt.MaxGrantableLevel ?? (srt.IsOwnerRole ? level : 0);
    lines.push(
      `INSERT INTO "SpaceRoleType" ("ID", "Code", "Name", "Description", "Level", "MaxGrantableLevel", "CanInvite", "CanSeeTeamBand", "CanContribute", "IsOwnerRole", "CanPromoteBand", "DisplayRank", "IsActive") VALUES ('${srt.ID}', ${escapeSqlite(srt.Code)}, ${escapeSqlite(srt.Name)}, ${escapeSqlite(srt.Description ?? null)}, ${level}, ${maxGrantable}, ${escapeSqlite(srt.CanInvite ?? false)}, ${escapeSqlite(srt.CanSeeTeamBand ?? false)}, ${escapeSqlite(srt.CanContribute ?? true)}, ${escapeSqlite(srt.IsOwnerRole ?? false)}, ${escapeSqlite(srt.CanPromoteBand ?? false)}, ${srt.DisplayRank ?? (idx + 1) * 10}, ${escapeSqlite(srt.IsActive ?? true)}) ON CONFLICT("ID") DO UPDATE SET "Name" = excluded."Name", "Level" = excluded."Level", "MaxGrantableLevel" = excluded."MaxGrantableLevel", "CanContribute" = excluded."CanContribute", "IsActive" = excluded."IsActive";`,
    );
  });

  // 3-5. ForumType (6), PostType (13), ForumRoleType (7)
  dataset.forumTypes.forEach((ft, idx) => {
    lines.push(
      `INSERT INTO "ForumType" ("ID", "Code", "Name", "ServerDriverClass", "Sequence", "IsActive") VALUES ('${ft.ID}', ${escapeSqlite(ft.Code)}, ${escapeSqlite(ft.Name)}, ${escapeSqlite(ft.ServerDriverClass ?? null)}, ${(idx + 1) * 10}, 1) ON CONFLICT("ID") DO UPDATE SET "Name" = excluded."Name", "ServerDriverClass" = excluded."ServerDriverClass", "IsActive" = excluded."IsActive";`,
    );
  });
  dataset.postTypes.forEach((pt, idx) => {
    lines.push(
      `INSERT INTO "PostType" ("ID", "Code", "Name", "ServerDriverClass", "PlacementRule", "AllowsNestedReplies", "Sequence", "IsActive") VALUES ('${pt.ID}', ${escapeSqlite(pt.Code)}, ${escapeSqlite(pt.Name ?? pt.Code)}, ${escapeSqlite(pt.ServerDriverClass ?? null)}, ${escapeSqlite(pt.PlacementRule)}, ${escapeSqlite(pt.AllowsNestedReplies)}, ${pt.Sequence ?? (idx + 1) * 10}, 1) ON CONFLICT("ID") DO UPDATE SET "Name" = excluded."Name", "ServerDriverClass" = excluded."ServerDriverClass", "PlacementRule" = excluded."PlacementRule", "AllowsNestedReplies" = excluded."AllowsNestedReplies";`,
    );
  });
  dataset.forumRoleTypes.forEach((fr, idx) => {
    const seq = fr.Sequence ?? (idx + 1) * 10;
    const level = fr.Level ?? 100;
    lines.push(
      `INSERT INTO "ForumRoleType" ("ID", "Code", "Name", "Description", "Level", "CanConfigureForum", "CanModerateQueue", "CanPinOrLock", "CanAcceptAnswers", "CanVerifyCanon", "CanPromoteToSpace", "CanCreateRootPost", "CanReply", "CanCoEditDocs", "VoteWeightMultiplier", "Sequence", "IsActive") VALUES ('${fr.ID}', ${escapeSqlite(fr.Code)}, ${escapeSqlite(fr.Name)}, ${escapeSqlite(fr.Description ?? null)}, ${level}, ${escapeSqlite(fr.CanConfigureForum)}, ${escapeSqlite(fr.CanModerateQueue)}, ${escapeSqlite(fr.CanPinOrLock)}, ${escapeSqlite(fr.CanAcceptAnswers)}, ${escapeSqlite(fr.CanVerifyCanon)}, ${escapeSqlite(fr.CanPromoteToSpace)}, ${escapeSqlite(fr.CanCreateRootPost)}, ${escapeSqlite(fr.CanReply)}, ${escapeSqlite(fr.CanCoEditDocs)}, ${fr.VoteWeightMultiplier}, ${seq}, ${escapeSqlite(fr.IsActive)}) ON CONFLICT("ID") DO UPDATE SET "Name" = excluded."Name", "Description" = excluded."Description", "Level" = excluded."Level", "Sequence" = excluded."Sequence", "IsActive" = excluded."IsActive";`,
    );
  });

  lines.push(
    `INSERT INTO "TaskType" ("ID", "Name") VALUES ('${ARCH_TASK_TYPE_ID}', 'Community Action Item') ON CONFLICT("ID") DO NOTHING;`,
    `INSERT INTO "Environment" ("ID", "Name", "IsDefault") VALUES ('${ARCH_DEFAULT_ENVIRONMENT_ID}', 'Default', 1) ON CONFLICT("ID") DO NOTHING;`,
    `INSERT INTO "ArtifactType" ("ID", "Name") VALUES ('${ARCH_DEFAULT_ARTIFACT_TYPE_ID}', 'Component') ON CONFLICT("ID") DO NOTHING;`,
  );

  // 6. User (26)
  for (const member of dataset.Members) {
    const u = deriveMemberFields(member);
    lines.push(
      `INSERT INTO "User" ("ID", "Name", "FirstName", "LastName", "Email", "Type", "IsActive") VALUES ('${u.ID}', ${escapeSqlite(u.Name)}, ${escapeSqlite(u.FirstName)}, ${escapeSqlite(u.LastName)}, ${escapeSqlite(u.Email)}, ${escapeSqlite(u.Type)}, ${escapeSqlite(u.IsActive)}) ON CONFLICT("ID") DO UPDATE SET "Name" = excluded."Name", "FirstName" = excluded."FirstName", "LastName" = excluded."LastName", "Email" = excluded."Email", "Type" = excluded."Type", "IsActive" = excluded."IsActive";`,
    );
  }

  // 7. Space (4)
  for (const space of dataset.Spaces) {
    lines.push(
      `INSERT INTO "Space" ("ID", "SpaceTypeID", "Slug", "Name", "Description", "OwnerID", "InheritsMembership", "AgentRetrieval", "AllowParentAssignees") VALUES ('${space.ID}', '${space.SpaceTypeID}', ${escapeSqlite(space.Slug)}, ${escapeSqlite(space.Name)}, ${escapeSqlite(space.Description)}, '${ownerId}', ${escapeSqlite(space.InheritsMembership)}, 'Included', 1) ON CONFLICT("ID") DO UPDATE SET "Name" = excluded."Name", "Description" = excluded."Description", "OwnerID" = excluded."OwnerID";`,
    );
  }

  // 8. SpaceMember (64)
  for (const sm of dataset.SpaceMembers) {
    lines.push(
      `INSERT INTO "SpaceMember" ("ID", "SpaceID", "UserID", "SpaceRoleTypeID", "Band", "Status") VALUES ('${sm.ID}', '${sm.SpaceID}', '${sm.UserID}', '${sm.SpaceRoleTypeID}', ${escapeSqlite(sm.Band)}, ${escapeSqlite(sm.Status)}) ON CONFLICT("ID") DO UPDATE SET "SpaceRoleTypeID" = excluded."SpaceRoleTypeID", "Band" = excluded."Band", "Status" = excluded."Status";`,
    );
  }

  // 9. CommunitySpace (4)
  for (const space of dataset.Spaces) {
    lines.push(
      `INSERT INTO "CommunitySpace" ("ID", "Slug", "CommunityKind", "AnonymousReadMode", "AskFirstEnabled", "DefaultDigestCadence") VALUES ('${space.ID}', ${escapeSqlite(space.Slug)}, ${escapeSqlite(space.CommunityKind)}, ${escapeSqlite(space.AnonymousReadMode)}, ${escapeSqlite(space.AskFirstEnabled)}, ${escapeSqlite(space.DefaultDigestCadence)}) ON CONFLICT("ID") DO UPDATE SET "CommunityKind" = excluded."CommunityKind", "AnonymousReadMode" = excluded."AnonymousReadMode", "AskFirstEnabled" = excluded."AskFirstEnabled", "DefaultDigestCadence" = excluded."DefaultDigestCadence";`,
    );
  }

  // 10. Forum (13)
  for (const forum of dataset.Forums) {
    lines.push(
      `INSERT INTO "Forum" ("ID", "SpaceID", "ForumTypeID", "Slug", "Name", "Description", "VisibilityBand", "PostingPolicy", "InheritsSpaceMembers", "Sequence", "Status") VALUES ('${forum.ID}', '${forum.SpaceID}', '${forum.ForumTypeID}', ${escapeSqlite(forum.Slug)}, ${escapeSqlite(forum.Name)}, ${escapeSqlite(forum.Description)}, ${escapeSqlite(forum.VisibilityBand)}, ${escapeSqlite(forum.PostingPolicy)}, ${escapeSqlite(forum.InheritsSpaceMembers)}, ${forum.Sequence}, ${escapeSqlite(forum.Status)}) ON CONFLICT("ID") DO UPDATE SET "Name" = excluded."Name", "VisibilityBand" = excluded."VisibilityBand", "PostingPolicy" = excluded."PostingPolicy", "Status" = excluded."Status";`,
    );
  }

  // 11. ForumMember (14)
  for (const fm of dataset.ForumMembers) {
    lines.push(
      `INSERT INTO "ForumMember" ("ID", "ForumID", "UserID", "ForumRoleTypeID", "Status") VALUES ('${fm.ID}', '${fm.ForumID}', '${fm.UserID}', '${fm.ForumRoleTypeID}', ${escapeSqlite(fm.Status)}) ON CONFLICT("ID") DO UPDATE SET "ForumRoleTypeID" = excluded."ForumRoleTypeID", "Status" = excluded."Status";`,
    );
  }

  // 12. CommunityMemberProfile (26)
  for (const p of dataset.MemberProfiles) {
    lines.push(
      `INSERT INTO "CommunityMemberProfile" ("ID", "SpaceID", "UserID", "BioMarkdown", "ExpertiseTagsJSON", "HelpfulAnswerCount", "AcceptedAnswerCount", "ReputationScore", "DigestCadence", "OpenToPeerMentoring") VALUES ('${p.ID}', '${p.SpaceID}', '${p.UserID}', ${escapeSqlite(p.BioMarkdown ?? p.Bio)}, ${escapeSqlite(p.ExpertiseTagsJSON)}, ${p.HelpfulAnswerCount}, ${p.AcceptedAnswerCount}, ${p.ReputationScore}, ${escapeSqlite(p.DigestCadence)}, ${escapeSqlite(Boolean(p.OpenToPeerMentoring))}) ON CONFLICT("ID") DO UPDATE SET "BioMarkdown" = excluded."BioMarkdown", "ReputationScore" = excluded."ReputationScore", "DigestCadence" = excluded."DigestCadence";`,
    );
  }

  // 13. ForumTopicTag (22)
  for (const tag of dataset.TopicTags) {
    lines.push(
      `INSERT INTO "ForumTopicTag" ("ID", "SpaceID", "Slug", "Name", "IsOfficial") VALUES ('${tag.ID}', '${tag.SpaceID}', ${escapeSqlite(tag.Slug)}, ${escapeSqlite(tag.Name)}, ${escapeSqlite(tag.IsOfficial)}) ON CONFLICT("ID") DO UPDATE SET "Name" = excluded."Name", "IsOfficial" = excluded."IsOfficial";`,
    );
  }

  // 14. ForumPost (68 topological)
  for (const post of sortPostsTopologically(dataset.Posts)) {
    lines.push(
      `INSERT INTO "ForumPost" ("ID", "ForumID", "PostTypeID", "RootPostID", "ParentPostID", "ReplyDepth", "AuthorUserID", "Title", "Slug", "BodyMarkdown", "SummaryMarkdown", "VisibilityBand", "Status", "IsPinned", "IsLocked", "IsFeatured", "ReplyCount", "ParticipantCount", "ReactionScore", "ViewCount", "LastActivityAt", "CreatedAt") VALUES ('${post.ID}', '${post.ForumID}', '${post.PostTypeID}', ${post.RootPostID ? `'${post.RootPostID}'` : 'NULL'}, ${post.ParentPostID ? `'${post.ParentPostID}'` : 'NULL'}, ${post.ReplyDepth ?? 0}, '${post.AuthorUserID}', ${escapeSqlite(post.Title)}, ${escapeSqlite(post.Slug)}, ${escapeSqlite(post.BodyMarkdown)}, ${escapeSqlite(post.SummaryMarkdown)}, ${escapeSqlite(post.VisibilityBand)}, ${escapeSqlite(post.Status)}, ${escapeSqlite(post.IsPinned)}, ${escapeSqlite(post.IsLocked)}, ${escapeSqlite(post.IsFeatured)}, ${post.ReplyCount ?? 0}, ${post.ParticipantCount ?? 1}, ${post.ReactionScore ?? 0}, ${post.ViewCount ?? 0}, ${escapeSqlite(post.LastActivityAt ?? null)}, ${escapeSqlite(post.CreatedAt ?? null)}) ON CONFLICT("ID") DO UPDATE SET "Title" = excluded."Title", "BodyMarkdown" = excluded."BodyMarkdown", "Status" = excluded."Status";`,
    );
  }

  // 15. ForumSubscription (10)
  for (const sub of dataset.ForumSubscriptions) {
    const level = normalizeSubscriptionDeliveryLevel(sub);
    lines.push(
      `INSERT INTO "ForumSubscription" ("ID", "UserID", "ForumID", "DeliveryLevel") VALUES ('${sub.ID}', '${sub.UserID}', '${sub.ForumID}', ${escapeSqlite(level)}) ON CONFLICT("ID") DO UPDATE SET "DeliveryLevel" = excluded."DeliveryLevel";`,
    );
  }

  // 16. ForumQuestionPost (cyclic-FK-safe: NULL AcceptedAnswerPostID first)
  for (const q of dataset.QuestionPosts) {
    lines.push(
      `INSERT INTO "ForumQuestionPost" ("ID", "AcceptedAnswerPostID", "AICanonAnswerPostID", "BountyPoints", "ResolvedAt") VALUES ('${q.ID}', NULL, NULL, ${q.BountyPoints ?? 0}, ${escapeSqlite(q.ResolvedAt ?? null)}) ON CONFLICT("ID") DO UPDATE SET "BountyPoints" = excluded."BountyPoints", "ResolvedAt" = excluded."ResolvedAt";`,
    );
  }

  // 17. ForumAnswerPost (7) + cyclic-FK-safe AcceptedAnswerPostID UPDATE
  for (const a of dataset.AnswerPosts) {
    lines.push(
      `INSERT INTO "ForumAnswerPost" ("ID", "QuestionPostID", "IsAcceptedByAuthor", "IsVerifiedByModerator", "VerifiedByUserID", "AIEpistemicStatus", "AIConfidenceScore") VALUES ('${a.ID}', '${a.QuestionPostID}', ${escapeSqlite(a.IsAcceptedByAuthor)}, ${escapeSqlite(a.IsVerifiedByModerator)}, ${a.VerifiedByUserID ? `'${a.VerifiedByUserID}'` : 'NULL'}, ${escapeSqlite(a.AIEpistemicStatus)}, ${a.AIConfidenceScore}) ON CONFLICT("ID") DO UPDATE SET "IsAcceptedByAuthor" = excluded."IsAcceptedByAuthor", "IsVerifiedByModerator" = excluded."IsVerifiedByModerator", "AIEpistemicStatus" = excluded."AIEpistemicStatus", "AIConfidenceScore" = excluded."AIConfidenceScore";`,
    );
  }
  for (const q of dataset.QuestionPosts) {
    lines.push(
      `UPDATE "ForumQuestionPost" SET "AcceptedAnswerPostID" = ${q.AcceptedAnswerPostID ? `'${q.AcceptedAnswerPostID}'` : 'NULL'}, "AICanonAnswerPostID" = ${q.AICanonAnswerPostID ? `'${q.AICanonAnswerPostID}'` : 'NULL'}, "ResolvedAt" = ${escapeSqlite(q.ResolvedAt ?? null)} WHERE "ID" = '${q.ID}';`,
    );
  }

  // 18. ForumIdeaCampaign (1)
  for (const camp of dataset.IdeaCampaigns) {
    lines.push(
      `INSERT INTO "ForumIdeaCampaign" ("ID", "DefaultBudgetPoints", "AllocationMode", "MaxPointsPerIdea") VALUES ('${camp.ID}', ${camp.DefaultBudgetPoints}, ${escapeSqlite(camp.AllocationMode)}, ${camp.MaxPointsPerIdea}) ON CONFLICT("ID") DO UPDATE SET "DefaultBudgetPoints" = excluded."DefaultBudgetPoints", "AllocationMode" = excluded."AllocationMode", "MaxPointsPerIdea" = excluded."MaxPointsPerIdea";`,
    );
  }

  // 19. ForumIdeaPost (5)
  for (const idea of dataset.IdeaPosts) {
    lines.push(
      `INSERT INTO "ForumIdeaPost" ("ID", "IdeaStatus", "TotalPointsAllocated", "EffectiveQuadraticVotes", "UniqueBackerCount", "TargetReleaseOrQuarter") VALUES ('${idea.ID}', ${escapeSqlite(idea.IdeaStatus)}, 0, 0.0, 0, ${escapeSqlite(idea.TargetReleaseOrQuarter)}) ON CONFLICT("ID") DO UPDATE SET "IdeaStatus" = excluded."IdeaStatus", "TargetReleaseOrQuarter" = excluded."TargetReleaseOrQuarter";`,
    );
  }

  // 20. ForumIdeaAllocation (25) + recompute
  for (const alloc of dataset.IdeaAllocations) {
    lines.push(
      `INSERT INTO "ForumIdeaAllocation" ("ID", "IdeaPostID", "UserID", "PointsAllocated", "QuadraticVotes") VALUES ('${alloc.ID}', '${alloc.IdeaPostID}', '${alloc.UserID}', ${alloc.PointsAllocated}, ${alloc.QuadraticVotes}) ON CONFLICT("ID") DO UPDATE SET "PointsAllocated" = excluded."PointsAllocated", "QuadraticVotes" = excluded."QuadraticVotes";`,
    );
  }
  for (const idea of dataset.IdeaPosts) {
    lines.push(
      `UPDATE "ForumIdeaPost" SET "TotalPointsAllocated" = COALESCE((SELECT SUM("PointsAllocated") FROM "ForumIdeaAllocation" WHERE "IdeaPostID" = '${idea.ID}'), 0), "EffectiveQuadraticVotes" = COALESCE((SELECT SUM("QuadraticVotes") FROM "ForumIdeaAllocation" WHERE "IdeaPostID" = '${idea.ID}'), 0.0), "UniqueBackerCount" = (SELECT COUNT(*) FROM "ForumIdeaAllocation" WHERE "IdeaPostID" = '${idea.ID}') WHERE "ID" = '${idea.ID}';`,
    );
  }

  // 21. ForumCasePost (2)
  for (const c of dataset.CasePosts) {
    lines.push(
      `INSERT INTO "ForumCasePost" ("ID", "SituationMarkdown", "ActionTakenMarkdown", "OutcomeMarkdown", "IsAnonymized", "AnonymizedAuthorAlias") VALUES ('${c.ID}', ${escapeSqlite(c.SituationMarkdown)}, ${escapeSqlite(c.ActionTakenMarkdown)}, ${escapeSqlite(c.OutcomeMarkdown)}, ${escapeSqlite(c.IsAnonymized)}, ${escapeSqlite(c.AnonymizedAuthorAlias)}) ON CONFLICT("ID") DO UPDATE SET "SituationMarkdown" = excluded."SituationMarkdown", "ActionTakenMarkdown" = excluded."ActionTakenMarkdown", "OutcomeMarkdown" = excluded."OutcomeMarkdown";`,
    );
  }

  // 22. ForumAMAPost (2)
  for (const ama of dataset.AMAPosts) {
    lines.push(
      `INSERT INTO "ForumAMAPost" ("ID", "HostUserID", "ScheduledStartAt", "ScheduledEndAt", "QuestionsOpenAt", "IsLiveNow", "RecapMarkdown") VALUES ('${ama.ID}', '${ama.HostUserID}', ${escapeSqlite(ama.ScheduledStartAt)}, ${escapeSqlite(ama.ScheduledEndAt)}, ${escapeSqlite(ama.QuestionsOpenAt)}, ${escapeSqlite(ama.IsLiveNow)}, ${escapeSqlite(ama.RecapMarkdown)}) ON CONFLICT("ID") DO UPDATE SET "IsLiveNow" = excluded."IsLiveNow", "RecapMarkdown" = excluded."RecapMarkdown";`,
    );
  }

  // 23-24. Artifact/ArtifactVersion + ForumInteractivePost (1) & ForumInteractiveSession (6)
  lines.push(
    `INSERT INTO "Artifact" ("ID", "EnvironmentID", "Name", "Description", "TypeID", "UserID", "Visibility") VALUES ('${ARCH_INTERACTIVE_ARTIFACT_ID}', '${ARCH_DEFAULT_ENVIRONMENT_ID}', 'IBC 2027 Mass Timber Readiness Challenge', 'Interactive AGPA Type IV-A/B/C readiness quiz component.', '${ARCH_DEFAULT_ARTIFACT_TYPE_ID}', '${ownerId}', 'Always') ON CONFLICT("ID") DO NOTHING;`,
    `INSERT INTO "ArtifactVersion" ("ID", "ArtifactID", "VersionNumber", "UserID", "ContentMode", "ForceToolsOnly") VALUES ('${ARCH_INTERACTIVE_ARTIFACT_VERSION_ID}', '${ARCH_INTERACTIVE_ARTIFACT_ID}', 1, '${ownerId}', 'Text', 0) ON CONFLICT("ID") DO NOTHING;`,
  );
  for (const inter of dataset.InteractivePosts) {
    lines.push(
      `INSERT INTO "ForumInteractivePost" ("ID", "ComponentArtifactID", "PinnedArtifactVersionID", "ExperienceKind", "ScoringMode", "ShowLeaderboard", "MaxAttemptsPerMember", "PlayCount") VALUES ('${inter.ID}', '${ARCH_INTERACTIVE_ARTIFACT_ID}', '${ARCH_INTERACTIVE_ARTIFACT_VERSION_ID}', ${escapeSqlite(inter.ExperienceKind)}, ${escapeSqlite(inter.ScoringMode)}, ${escapeSqlite(inter.ShowLeaderboard)}, ${inter.MaxAttemptsPerMember ?? 'NULL'}, ${inter.PlayCount ?? 0}) ON CONFLICT("ID") DO UPDATE SET "PlayCount" = excluded."PlayCount";`,
    );
  }
  for (const sess of dataset.InteractiveSessions) {
    lines.push(
      `INSERT INTO "ForumInteractiveSession" ("ID", "InteractivePostID", "ArtifactVersionID", "UserID", "AttemptNumber", "Score", "DurationSeconds", "Completed") VALUES ('${sess.ID}', '${sess.InteractivePostID}', '${ARCH_INTERACTIVE_ARTIFACT_VERSION_ID}', '${sess.UserID}', ${sess.AttemptNumber}, ${sess.Score}, ${sess.DurationSeconds}, ${escapeSqlite(sess.Completed)}) ON CONFLICT("ID") DO UPDATE SET "Score" = excluded."Score", "DurationSeconds" = excluded."DurationSeconds", "Completed" = excluded."Completed";`,
    );
  }

  // 25. ForumPostTag (38)
  for (const pt of dataset.PostTags) {
    lines.push(
      `INSERT INTO "ForumPostTag" ("ID", "PostID", "TopicTagID", "AssignedByAI") VALUES ('${pt.ID}', '${pt.PostID}', '${pt.TopicTagID}', 0) ON CONFLICT("ID") DO NOTHING;`,
    );
  }

  // 26-27. ForumPostReaction (10) & ForumPostFlag (2)
  for (const rx of dataset.PostReactions) {
    lines.push(
      `INSERT INTO "ForumPostReaction" ("ID", "PostID", "UserID", "ReactionKind", "Weight") VALUES ('${rx.ID}', '${rx.PostID}', '${rx.UserID}', ${escapeSqlite(rx.ReactionKind)}, ${rx.Weight ?? 1.0}) ON CONFLICT("ID") DO UPDATE SET "Weight" = excluded."Weight";`,
    );
  }
  for (const flag of dataset.PostFlags) {
    const reportedBy = flag.ReportedByUserID ?? flag.ReporterUserID;
    const reasonDetails = flag.ReasonDetails ?? flag.Notes ?? null;
    lines.push(
      `INSERT INTO "ForumPostFlag" ("ID", "PostID", "ReportedByUserID", "ReasonCategory", "Status", "ReasonDetails") VALUES ('${flag.ID}', '${flag.PostID}', ${reportedBy ? `'${reportedBy}'` : 'NULL'}, ${escapeSqlite(flag.ReasonCategory)}, ${escapeSqlite(flag.Status)}, ${escapeSqlite(reasonDetails)}) ON CONFLICT("ID") DO UPDATE SET "Status" = excluded."Status", "ReasonDetails" = excluded."ReasonDetails";`,
    );
  }

  return lines.join('\n');
}

/**
 * Generates deterministic, idempotent 27-table SQL seed scripts for `ARCH-WORLD` in identical
 * strict FK topological dependency order across SQL Server, PostgreSQL, and SQLite.
 *
 * Calling conventions:
 *  - `BuildArchitectAssociationWorldSql('sqlserver' | 'postgres' | 'sqlite', options)` -> SQL string
 *  - `BuildArchitectAssociationWorldSql(datasetOrOptions)` -> `{ sqlServer, postgres, sqlite }`
 */
export function BuildArchitectAssociationWorldSql(dialectOrDataset = undefined, options = {}) {
  if (typeof dialectOrDataset === 'string') {
    const d = dialectOrDataset.trim().toLowerCase();
    const dataset = options.dataset ?? GetArchWorldDataset();
    if (d === 'sqlserver' || d === 'mssql' || d === 'tsql') {
      return buildSqlServerScript(dataset);
    }
    if (d === 'postgres' || d === 'postgresql' || d === 'pg') {
      return buildPostgresScript(dataset);
    }
    if (d === 'sqlite') {
      return buildSqliteScript(dataset);
    }
    throw new Error(`Unsupported SQL dialect "${dialectOrDataset}". Expected 'sqlserver', 'postgres', or 'sqlite'.`);
  }

  const dataset =
    dialectOrDataset && Array.isArray(dialectOrDataset.Members)
      ? dialectOrDataset
      : dialectOrDataset?.dataset ?? options.dataset ?? GetArchWorldDataset();

  return {
    sqlServer: buildSqlServerScript(dataset),
    postgres: buildPostgresScript(dataset),
    sqlite: buildSqliteScript(dataset),
  };
}

/**
 * Synchronously creates (if absent) and seeds the relational SQLite database under `PRAGMA foreign_keys = ON;`,
 * returning `{ sqliteFilePath, counts }`.
 */
export function SeedArchWorldSqliteSync(options = {}) {
  const dataset = options.dataset ?? GetArchWorldDataset();
  const sqliteFilePath = resolveSqliteFilePath(options) ?? DEFAULT_ARCH_WORLD_SQLITE_PATH;
  const sql = BuildArchitectAssociationWorldSql('sqlite', { dataset });
  const db = openSqliteDatabase(sqliteFilePath);
  try {
    db.exec('BEGIN IMMEDIATE;');
    try {
      db.exec(sql);
      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
    return {
      dialect: 'sqlite',
      sqliteFilePath,
      counts: QueryArchWorldSqliteCounts(db),
    };
  } finally {
    db.close();
  }
}

/**
 * Executes the generated 27-table `ARCH-WORLD` SQL script against a relational SQL database:
 *  - `'sqlite'`: creates/opens `options.sqliteFilePath` via `node:sqlite` (`DatabaseSync` with
 *    `PRAGMA foreign_keys = ON;`), executes `BuildArchitectAssociationWorldSql('sqlite')` in a
 *    transaction, and returns verified row counts across all tables.
 *  - `'sqlserver'` / `'postgres'`: executes via `options.sqlExecutor`, `options.sqlPool`, or
 *    `options.pgPool`.
 */
export async function ExecuteArchitectAssociationWorldSql(options = {}) {
  const dialect = String(options.dialect ?? 'sqlite').trim().toLowerCase();
  const dataset = options.dataset ?? GetArchWorldDataset();

  if (dialect === 'sqlite') {
    return SeedArchWorldSqliteSync({ ...options, dataset });
  }

  if (dialect === 'sqlserver' || dialect === 'mssql') {
    const sql = BuildArchitectAssociationWorldSql('sqlserver', { dataset });
    if (typeof options.sqlExecutor === 'function') {
      await options.sqlExecutor(sql, 'sqlserver');
      return { dialect: 'sqlserver', executed: true };
    }
    if (options.sqlPool && typeof options.sqlPool.request === 'function') {
      await options.sqlPool.request().batch(sql);
      return { dialect: 'sqlserver', executed: true };
    }
    throw new Error('No SQL Server sqlPool or sqlExecutor was provided.');
  }

  if (dialect === 'postgres' || dialect === 'postgresql' || dialect === 'pg') {
    const sql = BuildArchitectAssociationWorldSql('postgres', { dataset });
    if (typeof options.sqlExecutor === 'function') {
      await options.sqlExecutor(sql, 'postgres');
      return { dialect: 'postgres', executed: true };
    }
    if (options.pgPool && typeof options.pgPool.query === 'function') {
      await options.pgPool.query(sql);
      return { dialect: 'postgres', executed: true };
    }
    throw new Error('No PostgreSQL pgPool or sqlExecutor was provided.');
  }

  throw new Error(`Unsupported dialect "${dialect}" for ExecuteArchitectAssociationWorldSql.`);
}

function escapeFilterValue(value) {
  return String(value ?? '').replace(/'/g, "''");
}

function assignEntityFields(entity, data, excludedKeys = new Set()) {
  for (const [key, value] of Object.entries(data)) {
    if (excludedKeys.has(key) || value === undefined) continue;
    const field = entity.Fields.find((f) => f.Name === key);
    if (field) {
      field.Value = value;
    }
  }
}

/**
 * Authoritative entity-backed upsert using `RunView` natural-key lookup, `Metadata.GetEntityObject`,
 * `entity.ValidateAsync()`, and `entity.Save()`.
 */
async function upsertViaEntityProvider({
  metadata,
  runView,
  entityName,
  naturalFilter,
  desiredData,
  contextUser,
  preserveFields = new Set(),
  ignoredCompareFields = new Set(),
  counters,
  validatedCounter,
}) {
  const rvRes = await runView.RunView(
    {
      EntityName: entityName,
      ExtraFilter: naturalFilter,
      ResultType: 'simple',
      MaxRows: 1,
    },
    contextUser,
  );
  if (!rvRes?.Success) {
    throw new Error(
      `RunView lookup failed for ${entityName} (${naturalFilter}): ${rvRes?.ErrorMessage || 'unknown error'}`,
    );
  }

  const existing = rvRes.Results?.[0] ?? null;

  if (!existing) {
    const entity = await metadata.GetEntityObject(entityName, contextUser);
    if (!entity) {
      throw new Error(`Metadata.GetEntityObject failed creating new ${entityName}`);
    }
    assignEntityFields(entity, desiredData);
    const vr = await entity.ValidateAsync();
    validatedCounter.count += 1;
    if (!vr.Success) {
      const reasons = vr.Errors.map((e) => `${e.Source}: ${e.Message}`).join('; ');
      throw new Error(`ValidateAsync failed for new ${entityName} (${desiredData.ID}): ${reasons}`);
    }
    const saved = await entity.Save();
    if (!saved) {
      throw new Error(
        `Save() failed for new ${entityName} (${desiredData.ID}): ${entity.LatestResult?.CompleteMessage ?? 'unknown error'}`,
      );
    }
    counters.createdCount += 1;
    return 'created';
  }

  const effectiveDesired = { ...desiredData };
  for (const fieldName of preserveFields) {
    if (existing[fieldName] !== undefined && existing[fieldName] !== null && existing[fieldName] !== '') {
      effectiveDesired[fieldName] = existing[fieldName];
    }
  }

  const entityInfo = ARCH_ENTITY_INFOS[entityName];
  const allowedFields = entityInfo ? new Set(entityInfo.Fields.map((f) => f.Name)) : null;

  if (fieldsSubsetMatch(existing, effectiveDesired, ignoredCompareFields, allowedFields)) {
    counters.unchangedCount += 1;
    return 'unchanged';
  }

  const entity = await metadata.GetEntityObject(
    entityName,
    CompositeKey.FromID(existing.ID),
    contextUser,
  );
  if (!entity) {
    throw new Error(`Metadata.GetEntityObject failed loading ${entityName} (${existing.ID})`);
  }
  assignEntityFields(entity, effectiveDesired, new Set(['ID']));
  const vr = await entity.ValidateAsync();
  validatedCounter.count += 1;
  if (!vr.Success) {
    const reasons = vr.Errors.map((e) => `${e.Source}: ${e.Message}`).join('; ');
    throw new Error(`ValidateAsync failed for updated ${entityName} (${existing.ID}): ${reasons}`);
  }
  const saved = await entity.Save();
  if (!saved) {
    throw new Error(
      `Save() failed for updated ${entityName} (${existing.ID}): ${entity.LatestResult?.CompleteMessage ?? 'unknown error'}`,
    );
  }
  counters.updatedCount += 1;
  return 'updated';
}

/**
 * Idempotent natural-key loader for the American Guild of Practicing Architects (`ARCH-WORLD`) dataset.
 * Executes every entity through `RunView` natural-key lookup + `Metadata.GetEntityObject(...)` +
 * `ValidateAsync()` + `entity.Save()`, persists all 27+ relational tables to SQLite (`PRAGMA foreign_keys = ON`)
 * and JSON snapshot, and optionally applies the SQL script to a live SQL Server / PostgreSQL connection.
 */
export async function LoadArchitectAssociationWorld(options = {}) {
  const dataset = options.dataset ?? GetArchWorldDataset();
  EnsureArchWorldServerEntitiesLoaded(dataset);

  const persistenceFilePath = resolvePersistenceFilePath(options);
  const sqliteFilePath = resolveSqliteFilePath(options);
  const store = options.store ?? GetSharedArchWorldStore(options);

  const userById = new Map(dataset.Members.map((m) => [norm(m.ID), MakeArchUserInfo(m)]));
  const rachelMember = dataset.Members.find((m) => norm(m.ID) === 'a7c40400-4e12-4b8f-9a10-000000000022') ?? dataset.Members[0];
  const defaultAdminUser = MakeArchUserInfo({
    ID: rachelMember.ID,
    Name: rachelMember.Name,
    Email: rachelMember.Email,
    Type: 'Owner',
  });

  const forumById = new Map(dataset.Forums.map((f) => [norm(f.ID), f]));
  const moderatorByForumId = new Map();
  const modRoleIds = new Set([
    'c8a17300-4e12-4b8f-9a10-100000000001',
    'c8a17300-4e12-4b8f-9a10-100000000002',
  ]);
  for (const fm of dataset.ForumMembers) {
    if (modRoleIds.has(norm(fm.ForumRoleTypeID)) && fm.Status === 'Active') {
      const u = userById.get(norm(fm.UserID));
      if (u) moderatorByForumId.set(norm(fm.ForumID), u);
    }
  }

  // Optional direct SQL Server / PostgreSQL execution when an external pool or sqlExecutor is passed
  const sqlExecutions = [];
  if (options.sqlPool) {
    sqlExecutions.push(
      await ExecuteArchitectAssociationWorldSql({ dialect: 'sqlserver', dataset, sqlPool: options.sqlPool }),
    );
  }
  if (options.pgPool) {
    sqlExecutions.push(
      await ExecuteArchitectAssociationWorldSql({ dialect: 'postgres', dataset, pgPool: options.pgPool }),
    );
  }
  if (options.sqlExecutor) {
    sqlExecutions.push(
      await ExecuteArchitectAssociationWorldSql({
        dialect: options.dialect ?? 'sqlserver',
        dataset,
        sqlExecutor: options.sqlExecutor,
      }),
    );
  }

  const prevMetadataProvider = Metadata.Provider;
  const prevRunViewProvider = RunView.Provider;
  const provider = options.provider ?? new ArchWorldEntityProvider(store, {
    persistenceFilePath,
    sqliteFilePath,
    currentUser: defaultAdminUser,
  });

  const usingCustomMetadata = Boolean(options.metadata && options.runView);
  if (!usingCustomMetadata) {
    Metadata.Provider = provider;
    RunView.Provider = provider;
  }

  const metadata = options.metadata ?? new Metadata();
  const runView = options.runView ?? new RunView();

  const counters = { createdCount: 0, updatedCount: 0, unchangedCount: 0 };
  const validatedCounter = { count: 0 };
  const prevSuspendFlush = provider.suspendDiskFlush;
  provider.suspendDiskFlush = true;

  try {
    // 1. Reference catalogs
    for (const row of Array.from(store.taskTypes.values())) {
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: 'MJ: Task Types',
        naturalFilter: `ID = '${escapeFilterValue(row.ID)}'`,
        desiredData: row,
        contextUser: defaultAdminUser,
        counters,
        validatedCounter,
      });
    }
    for (const row of dataset.spaceTypes) {
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: 'MJ_BizApps_Collaboration: Space Types',
        naturalFilter: `ID = '${escapeFilterValue(row.ID)}'`,
        desiredData: row,
        contextUser: defaultAdminUser,
        counters,
        validatedCounter,
      });
    }
    for (const row of dataset.spaceRoleTypes) {
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: 'MJ_BizApps_Collaboration: Space Role Types',
        naturalFilter: `ID = '${escapeFilterValue(row.ID)}'`,
        desiredData: row,
        contextUser: defaultAdminUser,
        counters,
        validatedCounter,
      });
    }
    for (const row of dataset.forumTypes) {
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: COMMUNITY_ENTITY_NAMES.ForumTypes,
        naturalFilter: `ID = '${escapeFilterValue(row.ID)}'`,
        desiredData: row,
        contextUser: defaultAdminUser,
        counters,
        validatedCounter,
      });
    }
    for (const row of dataset.postTypes) {
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: COMMUNITY_ENTITY_NAMES.PostTypes,
        naturalFilter: `ID = '${escapeFilterValue(row.ID)}'`,
        desiredData: { Name: row.Code, ...row },
        contextUser: defaultAdminUser,
        counters,
        validatedCounter,
      });
    }
    for (const row of dataset.forumRoleTypes) {
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: COMMUNITY_ENTITY_NAMES.ForumRoleTypes,
        naturalFilter: `ID = '${escapeFilterValue(row.ID)}'`,
        desiredData: row,
        contextUser: defaultAdminUser,
        counters,
        validatedCounter,
      });
    }

    // 2. Members (`MJ: Users`, natural key: Email)
    for (const member of dataset.Members) {
      const derived = deriveMemberFields(member);
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: 'MJ: Users',
        naturalFilter: `Email = '${escapeFilterValue(derived.Email)}'`,
        desiredData: derived,
        contextUser: defaultAdminUser,
        counters,
        validatedCounter,
      });
    }

    // 3. Collaboration Spaces & CommunitySpaces (natural key: Slug)
    const ownerId = dataset.Members[21].ID;
    for (const space of dataset.Spaces) {
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: 'MJ_BizApps_Collaboration: Spaces',
        naturalFilter: `Slug = '${escapeFilterValue(space.Slug)}'`,
        desiredData: {
          ...space,
          OwnerID: ownerId,
          AgentRetrieval: 'Included',
          AllowParentAssignees: true,
        },
        contextUser: defaultAdminUser,
        counters,
        validatedCounter,
      });
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: COMMUNITY_ENTITY_NAMES.CommunitySpaces,
        naturalFilter: `Slug = '${escapeFilterValue(space.Slug)}'`,
        desiredData: {
          ID: space.ID,
          Slug: space.Slug,
          CommunityKind: space.CommunityKind,
          AnonymousReadMode: space.AnonymousReadMode,
          AskFirstEnabled: space.AskFirstEnabled,
          DefaultDigestCadence: space.DefaultDigestCadence,
        },
        contextUser: defaultAdminUser,
        counters,
        validatedCounter,
      });
    }

    // 4. Space Members (natural key: SpaceID + UserID)
    for (const sm of dataset.SpaceMembers) {
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: 'MJ_BizApps_Collaboration: Space Members',
        naturalFilter: `SpaceID = '${escapeFilterValue(sm.SpaceID)}' AND UserID = '${escapeFilterValue(sm.UserID)}'`,
        desiredData: sm,
        contextUser: defaultAdminUser,
        counters,
        validatedCounter,
      });
    }

    // 5. Forums & Idea Campaigns (natural key: SpaceID + Slug)
    for (const forum of dataset.Forums) {
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: COMMUNITY_ENTITY_NAMES.Forums,
        naturalFilter: `SpaceID = '${escapeFilterValue(forum.SpaceID)}' AND Slug = '${escapeFilterValue(forum.Slug)}'`,
        desiredData: forum,
        contextUser: defaultAdminUser,
        counters,
        validatedCounter,
      });
    }
    for (const campaign of dataset.IdeaCampaigns) {
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: COMMUNITY_ENTITY_NAMES.ForumIdeaCampaigns,
        naturalFilter: `ID = '${escapeFilterValue(campaign.ID)}'`,
        desiredData: campaign,
        contextUser: defaultAdminUser,
        counters,
        validatedCounter,
      });
    }

    // 6. Forum Members & Member Profiles
    for (const fm of dataset.ForumMembers) {
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: COMMUNITY_ENTITY_NAMES.ForumMembers,
        naturalFilter: `ForumID = '${escapeFilterValue(fm.ForumID)}' AND UserID = '${escapeFilterValue(fm.UserID)}'`,
        desiredData: fm,
        contextUser: defaultAdminUser,
        counters,
        validatedCounter,
      });
    }
    for (const profile of dataset.MemberProfiles) {
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: COMMUNITY_ENTITY_NAMES.CommunityMemberProfiles,
        naturalFilter: `SpaceID = '${escapeFilterValue(profile.SpaceID)}' AND UserID = '${escapeFilterValue(profile.UserID)}'`,
        desiredData: {
          ...profile,
          BioMarkdown: profile.BioMarkdown ?? profile.Bio,
          OpenToPeerMentoring: Boolean(profile.OpenToPeerMentoring),
        },
        contextUser: defaultAdminUser,
        ignoredCompareFields: new Set(['HelpfulAnswerCount', 'AcceptedAnswerCount']),
        counters,
        validatedCounter,
      });
    }

    // 7. Topic Tags (natural key: SpaceID + Slug)
    for (const tag of dataset.TopicTags) {
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: COMMUNITY_ENTITY_NAMES.ForumTopicTags,
        naturalFilter: `SpaceID = '${escapeFilterValue(tag.SpaceID)}' AND Slug = '${escapeFilterValue(tag.Slug)}'`,
        desiredData: tag,
        contextUser: defaultAdminUser,
        ignoredCompareFields: new Set(['PostCount']),
        counters,
        validatedCounter,
      });
    }

    // 8. Posts in topological order via ForumPostServerEntity (root posts first so FK references resolve)
    const sortedPosts = sortPostsTopologically(dataset.Posts);
    const postPreserveFields = new Set([
      'SummaryMarkdown',
      'SummaryGeneratedAt',
      'SummaryReplyWatermark',
      'PromotedToSpaceID',
      'LinkedTaskID',
      'ReplyCount',
      'ReactionScore',
      'LastActivityAt',
    ]);
    for (const post of sortedPosts) {
      const forum = forumById.get(norm(post.ForumID));
      const postContextUser =
        forum?.PostingPolicy === 'Moderated'
          ? moderatorByForumId.get(norm(post.ForumID)) ?? defaultAdminUser
          : userById.get(norm(post.AuthorUserID)) ?? defaultAdminUser;
      const naturalFilter = post.Slug
        ? `ForumID = '${escapeFilterValue(post.ForumID)}' AND Slug = '${escapeFilterValue(post.Slug)}'`
        : `ID = '${escapeFilterValue(post.ID)}'`;
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
        naturalFilter,
        desiredData: post,
        contextUser: postContextUser,
        preserveFields: postPreserveFields,
        ignoredCompareFields: postPreserveFields,
        counters,
        validatedCounter,
      });
    }

    // 8b. Forum Subscriptions (after User, Forum, TopicTags, ForumPosts)
    for (const sub of dataset.ForumSubscriptions) {
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: COMMUNITY_ENTITY_NAMES.ForumSubscriptions,
        naturalFilter: `ForumID = '${escapeFilterValue(sub.ForumID)}' AND UserID = '${escapeFilterValue(sub.UserID)}'`,
        desiredData: {
          ...sub,
          DeliveryLevel: normalizeSubscriptionDeliveryLevel(sub),
        },
        contextUser: defaultAdminUser,
        counters,
        validatedCounter,
      });
    }

    // 9. Post Subtypes (cyclic-FK-safe: insert ForumQuestionPost with AcceptedAnswerPostID=NULL first,
    //    then ForumAnswerPost, then link AcceptedAnswerPostID & AICanonAnswerPostID on ForumQuestionPost)
    for (const q of dataset.QuestionPosts) {
      const checkRes = await runView.RunView(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.ForumQuestionPosts,
          ExtraFilter: `ID = '${escapeFilterValue(q.ID)}'`,
          ResultType: 'simple',
          MaxRows: 1,
        },
        defaultAdminUser,
      );
      if (!checkRes?.Results?.[0]) {
        await upsertViaEntityProvider({
          metadata,
          runView,
          entityName: COMMUNITY_ENTITY_NAMES.ForumQuestionPosts,
          naturalFilter: `ID = '${escapeFilterValue(q.ID)}'`,
          desiredData: { ...q, AcceptedAnswerPostID: null, AICanonAnswerPostID: null },
          contextUser: defaultAdminUser,
          counters,
          validatedCounter,
        });
      }
    }
    const postForumMap = new Map(dataset.Posts.map((p) => [norm(p.ID), p.ForumID]));
    for (const a of dataset.AnswerPosts) {
      const forumId = postForumMap.get(norm(a.ID));
      const modUser = (forumId ? moderatorByForumId.get(norm(forumId)) : null) ?? defaultAdminUser;
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: COMMUNITY_ENTITY_NAMES.ForumAnswerPosts,
        naturalFilter: `ID = '${escapeFilterValue(a.ID)}'`,
        desiredData: a,
        contextUser: modUser,
        counters,
        validatedCounter,
      });
    }
    for (const q of dataset.QuestionPosts) {
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: COMMUNITY_ENTITY_NAMES.ForumQuestionPosts,
        naturalFilter: `ID = '${escapeFilterValue(q.ID)}'`,
        desiredData: q,
        contextUser: defaultAdminUser,
        counters,
        validatedCounter,
      });
    }

    for (const idea of dataset.IdeaPosts) {
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: COMMUNITY_ENTITY_NAMES.ForumIdeaPosts,
        naturalFilter: `ID = '${escapeFilterValue(idea.ID)}'`,
        desiredData: idea,
        contextUser: defaultAdminUser,
        ignoredCompareFields: new Set([
          'TotalPointsAllocated',
          'EffectiveQuadraticVotes',
          'UniqueBackerCount',
        ]),
        counters,
        validatedCounter,
      });
    }
    for (const c of dataset.CasePosts) {
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: COMMUNITY_ENTITY_NAMES.ForumCasePosts,
        naturalFilter: `ID = '${escapeFilterValue(c.ID)}'`,
        desiredData: c,
        contextUser: defaultAdminUser,
        counters,
        validatedCounter,
      });
    }
    for (const ama of dataset.AMAPosts) {
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: COMMUNITY_ENTITY_NAMES.ForumAMAPosts,
        naturalFilter: `ID = '${escapeFilterValue(ama.ID)}'`,
        desiredData: ama,
        contextUser: defaultAdminUser,
        counters,
        validatedCounter,
      });
    }
    for (const inter of dataset.InteractivePosts) {
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: COMMUNITY_ENTITY_NAMES.ForumInteractivePosts,
        naturalFilter: `ID = '${escapeFilterValue(inter.ID)}'`,
        desiredData: {
          ...inter,
          ComponentArtifactID: ARCH_INTERACTIVE_ARTIFACT_ID,
          PinnedArtifactVersionID: ARCH_INTERACTIVE_ARTIFACT_VERSION_ID,
        },
        contextUser: defaultAdminUser,
        counters,
        validatedCounter,
      });
    }

    // 10. PostTags via ForumPostTagServerEntity (enforces Forum.SpaceID === TopicTag.SpaceID)
    for (const pt of dataset.PostTags) {
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: COMMUNITY_ENTITY_NAMES.ForumPostTags,
        naturalFilter: `PostID = '${escapeFilterValue(pt.PostID)}' AND TopicTagID = '${escapeFilterValue(pt.TopicTagID)}'`,
        desiredData: pt,
        contextUser: defaultAdminUser,
        counters,
        validatedCounter,
      });
    }

    // 11. Quadratic IdeaAllocations via ForumIdeaAllocationServerEntity (recomputes parent IdeaPost totals)
    const allocPreserveFields = new Set(['PointsAllocated', 'QuadraticVotes']);
    for (const alloc of dataset.IdeaAllocations) {
      const allocUser = userById.get(norm(alloc.UserID)) ?? defaultAdminUser;
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations,
        naturalFilter: `IdeaPostID = '${escapeFilterValue(alloc.IdeaPostID)}' AND UserID = '${escapeFilterValue(alloc.UserID)}'`,
        desiredData: alloc,
        contextUser: allocUser,
        preserveFields: allocPreserveFields,
        ignoredCompareFields: allocPreserveFields,
        counters,
        validatedCounter,
      });
    }

    // 12. InteractiveSessions, PostReactions (via ForumPostReactionServerEntity), Flags
    for (const sess of dataset.InteractiveSessions) {
      const sessUser = userById.get(norm(sess.UserID)) ?? defaultAdminUser;
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: COMMUNITY_ENTITY_NAMES.ForumInteractiveSessions,
        naturalFilter: `ID = '${escapeFilterValue(sess.ID)}'`,
        desiredData: {
          ...sess,
          ArtifactVersionID: ARCH_INTERACTIVE_ARTIFACT_VERSION_ID,
        },
        contextUser: sessUser,
        counters,
        validatedCounter,
      });
    }
    for (const rx of dataset.PostReactions) {
      const rxUser = userById.get(norm(rx.UserID)) ?? defaultAdminUser;
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: COMMUNITY_ENTITY_NAMES.ForumPostReactions,
        naturalFilter: `PostID = '${escapeFilterValue(rx.PostID)}' AND UserID = '${escapeFilterValue(rx.UserID)}' AND ReactionKind = '${escapeFilterValue(rx.ReactionKind)}'`,
        desiredData: rx,
        contextUser: rxUser,
        ignoredCompareFields: new Set(['Weight']),
        counters,
        validatedCounter,
      });
    }
    for (const flag of dataset.PostFlags) {
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: COMMUNITY_ENTITY_NAMES.ForumPostFlags,
        naturalFilter: `ID = '${escapeFilterValue(flag.ID)}'`,
        desiredData: {
          ...flag,
          ReportedByUserID: flag.ReportedByUserID ?? flag.ReporterUserID ?? null,
          ReasonDetails: flag.ReasonDetails ?? flag.Notes ?? null,
        },
        contextUser: defaultAdminUser,
        counters,
        validatedCounter,
      });
    }

    store.lastLoadedAt = options.now ? new Date(options.now).toISOString() : new Date().toISOString();
    if (provider.sqliteDb) {
      saveMetaToSqlite(provider.sqliteDb, store);
    }
    if (persistenceFilePath && options.persist !== false) {
      SaveArchWorldStoreToDisk(store, persistenceFilePath, {
        sqliteFilePath,
        syncSqlite: false,
      });
    }

    const summary = CountArchWorldStoreRecords(store);

    return {
      store,
      provider,
      mode: usingCustomMetadata ? 'external-provider' : 'entity-provider-sqlite-persisted',
      sqlExecutions,
      persistenceFilePath,
      sqliteFilePath,
      sqliteCounts: sqliteFilePath && existsSync(sqliteFilePath) ? QueryArchWorldSqliteCounts(sqliteFilePath) : null,
      counts: summary.counts,
      totalRecords: summary.totalRecords,
      createdCount: counters.createdCount,
      updatedCount: counters.updatedCount,
      unchangedCount: counters.unchangedCount,
      validatedEntityCount: validatedCounter.count,
      idempotent: counters.createdCount === 0 && counters.updatedCount === 0,
      loadedAt: store.lastLoadedAt,
    };
  } finally {
    provider.suspendDiskFlush = prevSuspendFlush;
    if (!options.provider && !options.keepProviderActive) {
      provider.CloseSqlite();
    }
    if (!usingCustomMetadata && !options.keepProviderActive) {
      Metadata.Provider = prevMetadataProvider;
      RunView.Provider = prevRunViewProvider;
    }
  }
}

/**
 * Deliberate no-op teardown for `ARCH-WORLD` (mirroring `bizapps-orders` `ORD-WORLD`).
 * Preserves all seeded AGPA records in the store, relational SQLite DB, and JSON snapshot so
 * independent readers, Explorer UI checks, and Playwright visual capture run against persisted data.
 */
export function TeardownArchitectAssociationWorld(options = {}) {
  const store = options.store ?? GetSharedArchWorldStore(options);
  const persistenceFilePath = resolvePersistenceFilePath(options);
  const sqliteFilePath = resolveSqliteFilePath(options);
  const summary = CountArchWorldStoreRecords(store);
  return {
    preserved: true,
    persistenceFilePath,
    sqliteFilePath,
    persistedOnDisk: Boolean((sqliteFilePath && existsSync(sqliteFilePath)) || (persistenceFilePath && existsSync(persistenceFilePath))),
    sqlitePersistedOnDisk: Boolean(sqliteFilePath && existsSync(sqliteFilePath)),
    reason:
      'ARCH-WORLD teardown is deliberately a no-op so the American Guild of Practicing Architects dataset persists for live smoke testing, Explorer exploration, and Playwright visual capture.',
    counts: summary.counts,
    totalRecords: summary.totalRecords,
  };
}

/**
 * Creates a real-store-backed RunView & Metadata harness for `@mj-biz-apps/community-actions` and
 * `@mj-biz-apps/community-server` services so every action, entity, and graduation service reads from
 * and persists back to `store` and the relational SQLite database.
 */
export function CreateArchWorldRuntimeBridge(store, options = {}) {
  const provider = new ArchWorldEntityProvider(store, options);

  const handleRunView = async (params) => provider.RunView(params);

  let nextGeneratedPostSeq =
    9000 + Array.from(store.posts.keys()).filter((k) => k.startsWith('a7c40699-')).length;
  const extractIdArg = (keyOrUser) => {
    if (!keyOrUser || typeof keyOrUser !== 'object') return null;
    if (Array.isArray(keyOrUser.KeyValuePairs)) {
      const idPair = keyOrUser.KeyValuePairs.find((kv) => kv.FieldName === 'ID');
      return idPair?.Value ? String(idPair.Value) : null;
    }
    return null;
  };

  const handleGetEntityObject = async (entityName, keyOrUser, maybeUser) => {
    // Route authoritative community ServerEntities through ArchWorldEntityProvider so
    // ValidateAsync(), Save(), and cross-entity rollups execute cleanly on real BaseEntity subclasses.
    if (
      entityName === COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations ||
      entityName === COMMUNITY_ENTITY_NAMES.ForumIdeaPosts ||
      entityName === COMMUNITY_ENTITY_NAMES.ForumPostTags ||
      entityName === COMMUNITY_ENTITY_NAMES.ForumTopicTags ||
      entityName === COMMUNITY_ENTITY_NAMES.ForumAnswerPosts ||
      entityName === COMMUNITY_ENTITY_NAMES.ForumPostReactions
    ) {
      return provider.GetEntityObject(entityName, keyOrUser, maybeUser);
    }

    const requestedId = extractIdArg(keyOrUser);

    if (entityName === 'MJ_BizApps_Community: Forum Posts') {
      if (requestedId) {
        const existing = store.posts.get(norm(requestedId));
        if (!existing) return null;
        const wrapper = {
          ...existing,
          Save: async () => {
            const updated = { ...existing, ...wrapper };
            delete updated.Save;
            store.posts.set(norm(wrapper.ID), updated);
            upsertRowToSqlite(provider.sqliteDb, COMMUNITY_ENTITY_NAMES.ForumPosts, updated);
            if (provider.persistenceFilePath) {
              SaveArchWorldStoreToDisk(store, provider.persistenceFilePath, { syncSqlite: false });
            }
            return true;
          },
        };
        return wrapper;
      }

      nextGeneratedPostSeq += 1;
      const newId =
        options.nextReplyPostId?.() ??
        `A7C40699-4E12-4B8F-9A10-${String(nextGeneratedPostSeq).padStart(12, '0')}`;
      const record = {
        ID: newId,
        ForumID: '',
        PostTypeID: '',
        RootPostID: null,
        ParentPostID: null,
        ReplyDepth: 0,
        AuthorUserID: null,
        Title: null,
        Slug: null,
        BodyMarkdown: '',
        SummaryMarkdown: null,
        SummaryGeneratedAt: null,
        SummaryReplyWatermark: 0,
        VisibilityBand: 'Shared',
        Status: 'Published',
        IsPinned: false,
        IsLocked: false,
        IsFeatured: false,
        ReplyCount: 0,
        ParticipantCount: 1,
        ReactionScore: 0,
        ViewCount: 0,
        LastActivityAt: new Date().toISOString(),
        CreatedAt: new Date().toISOString(),
        PromotedToSpaceID: null,
        LinkedTaskID: null,
        Save: async () => {
          const clean = { ...record };
          delete clean.Save;
          store.posts.set(norm(clean.ID), clean);
          upsertRowToSqlite(provider.sqliteDb, COMMUNITY_ENTITY_NAMES.ForumPosts, clean);
          if (clean.RootPostID) {
            const root = store.posts.get(norm(clean.RootPostID));
            if (root) {
              root.ReplyCount = Array.from(store.posts.values()).filter(
                (p) => norm(p.RootPostID) === norm(root.ID),
              ).length;
              upsertRowToSqlite(provider.sqliteDb, COMMUNITY_ENTITY_NAMES.ForumPosts, root);
            }
          }
          if (provider.persistenceFilePath) {
            SaveArchWorldStoreToDisk(store, provider.persistenceFilePath, { syncSqlite: false });
          }
          return true;
        },
      };
      return record;
    }

    if (entityName === 'MJ_BizApps_Community: Forums') {
      if (!requestedId) return null;
      const existing = store.forums.get(norm(requestedId));
      return existing ? { ...existing, Save: async () => true } : null;
    }

    if (entityName === 'MJ_BizApps_Collaboration: Space Types') {
    return {
      ...row,
      Vocabulary: row.Vocabulary ?? row.Code ?? 'community',
      Discoverability: row.Discoverability ?? 'Listed',
      JoinMode: row.JoinMode ?? 'SelfServe',
      MessagingPanel: row.MessagingPanel ?? true,
      LibraryPanel: row.LibraryPanel ?? true,
      WorkPanel: row.WorkPanel ?? true,
      DefaultAgentRetrieval: row.DefaultAgentRetrieval ?? 'Included',
      DefaultBand: row.DefaultBand ?? 'Shared',
      InviteApproval: row.InviteApproval ?? 'Approve',
      DisplayRank: row.DisplayRank ?? 0,
      IsActive: row.IsActive ?? true,
      DefaultAllowParentAssignees: row.DefaultAllowParentAssignees ?? true,
    };
  }
  if (entityName === 'MJ_BizApps_Collaboration: Space Role Types') {
    const level = row.Level ?? 100;
    return {
      ...row,
      Level: level,
      MaxGrantableLevel: row.MaxGrantableLevel ?? (row.IsOwnerRole ? level : 0),
      CanInvite: row.CanInvite ?? false,
      CanSeeTeamBand: row.CanSeeTeamBand ?? false,
      CanContribute: row.CanContribute ?? true,
      IsOwnerRole: row.IsOwnerRole ?? false,
      CanPromoteBand: row.CanPromoteBand ?? false,
      DisplayRank: row.DisplayRank ?? 0,
      IsActive: row.IsActive ?? true,
    };
  }
  if (entityName === 'MJ_BizApps_Collaboration: Spaces') {
      const spaceRecord = {
        ID: '',
        SpaceTypeID: '',
        ParentID: null,
        Name: '',
        Description: null,
        OwnerID: '',
        InheritsMembership: false,
        AgentRetrieval: 'Included',
        StartedAt: null,
        ClosedAt: null,
        Slug: '',
        AllowParentAssignees: true,
        Save: async () => {
          const clean = { ...spaceRecord };
          delete clean.Save;
          delete clean.Delete;
          if (!clean.Slug) {
            clean.Slug = clean.Name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          }
          store.spaces.set(norm(clean.ID), clean);
          store.spacesBySlug.set(norm(clean.Slug), norm(clean.ID));
          upsertRowToSqlite(provider.sqliteDb, 'MJ_BizApps_Collaboration: Spaces', clean);
          if (provider.persistenceFilePath) {
            SaveArchWorldStoreToDisk(store, provider.persistenceFilePath, { syncSqlite: false });
          }
          return true;
        },
        Delete: async () => {
          store.spaces.delete(norm(spaceRecord.ID));
          deleteRowFromSqlite(provider.sqliteDb, 'MJ_BizApps_Collaboration: Spaces', spaceRecord.ID);
          if (provider.persistenceFilePath) {
            SaveArchWorldStoreToDisk(store, provider.persistenceFilePath, { syncSqlite: false });
          }
          return true;
        },
      };
      return spaceRecord;
    }

    if (entityName === 'MJ: Tasks') {
      const taskRecord = {
        ID: '',
        Name: '',
        Description: null,
        TypeID: '',
        UserID: null,
        TransactionGroup: undefined,
        Save: async () => {
          const clean = { ...taskRecord };
          delete clean.Save;
          delete clean.TransactionGroup;
          store.tasks.set(norm(clean.ID), clean);
          upsertRowToSqlite(provider.sqliteDb, 'MJ: Tasks', clean);
          if (provider.persistenceFilePath) {
            SaveArchWorldStoreToDisk(store, provider.persistenceFilePath, { syncSqlite: false });
          }
          return true;
        },
      };
      return taskRecord;
    }

    if (entityName === 'MJ_BizApps_Collaboration: Space Members') {
      const memberRecord = {
        ID: `A7C40499-4E12-4B8F-9A10-${String(store.spaceMembers.size + 1).padStart(12, '0')}`,
        SpaceID: '',
        UserID: '',
        SpaceRoleTypeID: '',
        Band: 'Shared',
        Status: 'Invited',
        TransactionGroup: undefined,
        Save: async () => {
          const clean = { ...memberRecord };
          delete clean.Save;
          delete clean.TransactionGroup;
          const natKey = `${norm(clean.SpaceID)}:${norm(clean.UserID)}`;
          store.spaceMembers.set(norm(clean.ID), clean);
          store.spaceMembersByKey.set(natKey, norm(clean.ID));
          upsertRowToSqlite(provider.sqliteDb, 'MJ_BizApps_Collaboration: Space Members', clean);
          if (provider.persistenceFilePath) {
            SaveArchWorldStoreToDisk(store, provider.persistenceFilePath, { syncSqlite: false });
          }
          return true;
        },
      };
      return memberRecord;
    }

    return { Save: async () => true };
  };

  return {
    provider,
    handleRunView,
    handleGetEntityObject,
  };
}

function parseCliArgs(argv) {
  const flags = new Set();
  const values = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--sql-out=')) {
      values.sqlOut = arg.slice('--sql-out='.length);
    } else if (arg === '--sql-out' && argv[i + 1]) {
      values.sqlOut = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--dialect=')) {
      values.dialect = arg.slice('--dialect='.length);
    } else if (arg === '--dialect' && argv[i + 1]) {
      values.dialect = argv[i + 1];
      i += 1;
    } else {
      flags.add(arg);
    }
  }
  return { flags, values };
}

export { ARCH_COMMUNITY_SPACES, ARCH_FORUMS, ARCH_FORUM_TYPES, ARCH_POST_TYPES };

if (import.meta.url === `file://${process.argv[1]}`) {
  const { flags, values } = parseCliArgs(process.argv.slice(2));
  if (flags.has('--sql')) {
    console.log(BuildArchitectAssociationWorldSql('sqlserver'));
  } else if (flags.has('--pg-sql')) {
    console.log(BuildArchitectAssociationWorldSql('postgres'));
  } else if (flags.has('--sqlite-sql')) {
    console.log(BuildArchitectAssociationWorldSql('sqlite'));
  } else if (values.sqlOut) {
    const inferredDialect =
      values.dialect ??
      (values.sqlOut.endsWith('.pg.sql')
        ? 'postgres'
        : values.sqlOut.endsWith('.sqlite.sql')
          ? 'sqlite'
          : 'sqlserver');
    const sqlText = BuildArchitectAssociationWorldSql(inferredDialect);
    mkdirSync(dirname(values.sqlOut), { recursive: true });
    writeFileSync(values.sqlOut, sqlText, 'utf8');
    console.log(`[arch-world-loader] Wrote ${inferredDialect} SQL seed (${sqlText.length} bytes) to ${values.sqlOut}`);
  } else if (flags.has('--verify')) {
    const sqlitePath = resolveSqliteFilePath();
    const sqliteCounts = sqlitePath && existsSync(sqlitePath) ? QueryArchWorldSqliteCounts(sqlitePath) : null;
    if (!sqliteCounts) {
      throw new Error(`Expected persisted SQLite database at ${sqlitePath} during --verify.`);
    }
    const provider = CreatePersistedArchWorldProvider();
    try {
      const rv = new RunView(provider);
      const [users, collabSpaces, communitySpaces, forums, posts, tags, allocs] = await Promise.all([
        rv.RunView({ EntityName: 'MJ: Users', ResultType: 'simple' }, provider.CurrentUser),
        rv.RunView({ EntityName: 'MJ_BizApps_Collaboration: Spaces', ResultType: 'simple' }, provider.CurrentUser),
        rv.RunView({ EntityName: COMMUNITY_ENTITY_NAMES.CommunitySpaces, ResultType: 'simple' }, provider.CurrentUser),
        rv.RunView({ EntityName: COMMUNITY_ENTITY_NAMES.Forums, ResultType: 'simple' }, provider.CurrentUser),
        rv.RunView({ EntityName: COMMUNITY_ENTITY_NAMES.ForumPosts, ResultType: 'simple' }, provider.CurrentUser),
        rv.RunView({ EntityName: COMMUNITY_ENTITY_NAMES.ForumTopicTags, ResultType: 'simple' }, provider.CurrentUser),
        rv.RunView({ EntityName: COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations, ResultType: 'simple' }, provider.CurrentUser),
      ]);
      console.log(
        `[arch-world-loader] Verified persisted SQLite state: Users=${users.Results.length}, Spaces=${collabSpaces.Results.length}, SpaceMembers=${sqliteCounts.SpaceMember}, CommunitySpaces=${communitySpaces.Results.length}, Forums=${forums.Results.length}, ForumMembers=${sqliteCounts.ForumMember}, MemberProfiles=${sqliteCounts.CommunityMemberProfile}, ForumSubscriptions=${sqliteCounts.ForumSubscription}, Posts=${posts.Results.length}, TopicTags=${tags.Results.length}, IdeaAllocations=${allocs.Results.length}, CasePosts=${sqliteCounts.ForumCasePost}, AMAPosts=${sqliteCounts.ForumAMAPost}, InteractivePosts=${sqliteCounts.ForumInteractivePost}, InteractiveSessions=${sqliteCounts.ForumInteractiveSession}, PostReactions=${sqliteCounts.ForumPostReaction}, PostFlags=${sqliteCounts.ForumPostFlag}`,
      );
    } finally {
      provider.CloseSqlite();
    }
  } else if (flags.has('--apply-db')) {
    const targetDialect = (values.dialect ?? (process.env.ARCH_WORLD_PG_URL ? 'postgres' : 'sqlserver')).toLowerCase();
    if (targetDialect === 'sqlite') {
      const res = await ExecuteArchitectAssociationWorldSql({ dialect: 'sqlite' });
      console.log(`[arch-world-loader] Applied SQLite relational seed at ${res.sqliteFilePath}: ${JSON.stringify(res.counts)}`);
    } else if (targetDialect === 'postgres' || targetDialect === 'postgresql' || targetDialect === 'pg') {
      const pgUrl = process.env.ARCH_WORLD_PG_URL ?? process.env.DATABASE_URL;
      if (!pgUrl) {
        throw new Error('Set ARCH_WORLD_PG_URL (or DATABASE_URL) or pass --dialect sqlite to --apply-db.');
      }
      const { Client } = await import('pg');
      const client = new Client({ connectionString: pgUrl });
      await client.connect();
      try {
        await ExecuteArchitectAssociationWorldSql({ dialect: 'postgres', pgPool: client });
        console.log('[arch-world-loader] Applied PostgreSQL ARCH-WORLD 27-table seed cleanly.');
      } finally {
        await client.end();
      }
    } else {
      const mssqlConn = process.env.ARCH_WORLD_MSSQL_URL;
      if (!mssqlConn) {
        throw new Error('Set ARCH_WORLD_MSSQL_URL or pass --dialect sqlite to --apply-db.');
      }
      const mssql = await import('mssql');
      const pool = await mssql.default.connect(mssqlConn);
      try {
        await ExecuteArchitectAssociationWorldSql({ dialect: 'sqlserver', sqlPool: pool });
        console.log('[arch-world-loader] Applied SQL Server ARCH-WORLD 27-table seed cleanly.');
      } finally {
        await pool.close();
      }
    }
  } else {
    const res = await LoadArchitectAssociationWorld();
    console.log(
      `[arch-world-loader] Loaded ARCH-WORLD (${res.mode}): totalRecords=${res.totalRecords}, created=${res.createdCount}, updated=${res.updatedCount}, unchanged=${res.unchangedCount}, validated=${res.validatedEntityCount}, idempotent=${res.idempotent}, sqlite=${res.sqliteFilePath}`,
    );
  }
}
