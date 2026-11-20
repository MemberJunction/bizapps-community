#!/usr/bin/env node
/**
 * Architect Association World Model (`ARCH-WORLD`) — Authoritative Entity Loader, Durable Store,
 * Cross-Process Persistence & Deterministic SQL/PG Seed Generator.
 *
 * Supports:
 *  1. Authoritative MJ Entity / Database Provider Mode (`Metadata.GetEntityObject` + `ValidateAsync()` +
 *     `entity.Save()` + `RunView` natural-key lookups across all ServerEntity subclasses).
 *  2. Durable Cross-Process Persistent Backing Store (`.local-storage/arch-world-state.json`, or
 *     `options.persistenceFilePath` / `process.env.ARCH_WORLD_STATE_FILE`) so independent reads and
 *     subsequent processes observe the retained `ARCH-WORLD` state after `TeardownArchitectAssociationWorld()`.
 *  3. Idempotent SQL Server & PostgreSQL seed generation (`BuildArchitectAssociationWorldSql()`), and
 *     optional direct execution against `options.sqlPool` / `options.pgPool`.
 *
 * Usage:
 *   node scripts/world/arch-world-loader.mjs [--load] [--verify] [--sql] [--pg-sql]
 */
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
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

export const ARCH_TEST_ROLE_ID = 'A7C40000-4E12-4B8F-9A10-000000000001';

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
    schemaVersion: 'arch-world-store/v1',
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
      `${norm(row.PostID)}:${norm(row.ReporterUserID)}:${norm(row.ReasonCategory)}`,
      row,
    );
  }
  for (const row of payload.tasks ?? []) indexStoreRow(store.tasks, null, null, row);
  for (const row of payload.taskTypes ?? []) indexStoreRow(store.taskTypes, null, null, row);

  return store;
}

/** Atomically writes the store snapshot to disk so separate processes see persisted `ARCH-WORLD` state. */
export function SaveArchWorldStoreToDisk(store, persistenceFilePath = DEFAULT_ARCH_WORLD_PERSISTENCE_PATH) {
  if (!persistenceFilePath) return;
  mkdirSync(dirname(persistenceFilePath), { recursive: true });
  const tmpPath = `${persistenceFilePath}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(SerializeArchWorldStore(store), null, 2), 'utf8');
  renameSync(tmpPath, persistenceFilePath);
}

/** Loads a brand-new `ARCH-WORLD` store instance from the on-disk persistence file, or `null` if absent. */
export function LoadArchWorldStoreFromDisk(persistenceFilePath = DEFAULT_ARCH_WORLD_PERSISTENCE_PATH) {
  if (!persistenceFilePath || !existsSync(persistenceFilePath)) {
    return null;
  }
  const raw = readFileSync(persistenceFilePath, 'utf8');
  return DeserializeArchWorldStore(JSON.parse(raw));
}

/** Opens an independent store instance hydrated from the persisted backing store (never auto-seeding). */
export function OpenPersistedArchWorldStore(options = {}) {
  const filePath = resolvePersistenceFilePath(options);
  const loaded = LoadArchWorldStoreFromDisk(filePath);
  if (!loaded) {
    if (options.createIfMissing) {
      return CreateEmptyArchWorldStore();
    }
    throw new Error(`Persisted ARCH-WORLD backing store does not exist at ${filePath}`);
  }
  return loaded;
}

/** Deletes the on-disk backing store file (invoked only by explicit reset, never by teardown). */
export function ClearPersistedArchWorldStore(persistenceFilePath = DEFAULT_ARCH_WORLD_PERSISTENCE_PATH) {
  if (persistenceFilePath && existsSync(persistenceFilePath)) {
    unlinkSync(persistenceFilePath);
  }
}

/** Returns the shared persistent `ARCH-WORLD` store (hydrating from disk if available). */
export function GetSharedArchWorldStore(options = {}) {
  if (!sharedStore) {
    const filePath = resolvePersistenceFilePath(options);
    const fromDisk = options.fromDisk !== false ? LoadArchWorldStoreFromDisk(filePath) : null;
    sharedStore = fromDisk ?? CreateEmptyArchWorldStore();
  }
  return sharedStore;
}

/** Explicit internal reset helper for isolated unit scenarios that require a brand-new empty store. */
export function ResetSharedArchWorldStore(options = {}) {
  sharedStore = CreateEmptyArchWorldStore();
  if (options.clearPersistence !== false) {
    const filePath = resolvePersistenceFilePath(options);
    ClearPersistedArchWorldStore(filePath);
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
  'MJ: Users': buildEntityInfo('MJ: Users', ['ID', 'Name', 'Email']),
  'MJ: Tasks': buildEntityInfo('MJ: Tasks', ['ID', 'Name', 'Description', 'TypeID', 'UserID']),
  'MJ: Task Types': buildEntityInfo('MJ: Task Types', ['ID', 'Name']),
  'MJ_BizApps_Collaboration: Space Types': buildEntityInfo('MJ_BizApps_Collaboration: Space Types', [
    'ID', 'Code', 'Name', 'Configuration',
  ]),
  'MJ_BizApps_Collaboration: Space Role Types': buildEntityInfo('MJ_BizApps_Collaboration: Space Role Types', [
    'ID', 'Code', 'Name', 'CanSeeTeamBand', 'CanContribute', 'IsOwnerRole', 'CanPromoteBand', 'Level', 'IsActive',
  ]),
  'MJ_BizApps_Collaboration: Spaces': buildEntityInfo('MJ_BizApps_Collaboration: Spaces', [
    'ID', 'SpaceTypeID', 'ParentID', 'Slug', 'Name', 'Description', 'OwnerID', 'InheritsMembership',
    'AgentRetrieval', 'StartedAt', 'ClosedAt',
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
    'ID', 'Code', 'Name', 'CanConfigureForum', 'CanModerateQueue', 'CanPinOrLock', 'CanAcceptAnswers',
    'CanVerifyCanon', 'CanPromoteToSpace', 'CanCreateRootPost', 'CanReply', 'CanCoEditDocs',
    'VoteWeightMultiplier', 'IsActive',
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
    'ID', 'ForumID', 'UserID', 'Cadence',
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
    'ID', 'ExperienceKind', 'ScoringMode', 'ShowLeaderboard', 'MaxAttemptsPerMember', 'PlayCount',
  ]),
  [COMMUNITY_ENTITY_NAMES.ForumInteractiveSessions]: buildEntityInfo(
    COMMUNITY_ENTITY_NAMES.ForumInteractiveSessions,
    ['ID', 'InteractivePostID', 'UserID', 'AttemptNumber', 'Score', 'DurationSeconds', 'Completed'],
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
    'ID', 'PostID', 'ReporterUserID', 'ReasonCategory', 'Status', 'Notes',
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

function queryStoreRows(store, entityName, filter = '') {
  const userNameById = new Map(Array.from(store.users.values()).map((u) => [norm(u.ID), u.Name]));
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
      let rows = Array.from(store.users.values());
      if (idEq) rows = rows.filter((u) => norm(u.ID) === idEq);
      if (idIn) rows = rows.filter((u) => idIn.includes(norm(u.ID)));
      if (emailEq) rows = rows.filter((u) => norm(u.Email) === emailEq);
      return rows.map((u) => ({ ID: u.ID, Name: u.Name, Email: u.Email }));
    }
    case 'MJ_BizApps_Collaboration: Spaces': {
      let rows = Array.from(store.spaces.values());
      if (idEq) rows = rows.filter((s) => norm(s.ID) === idEq);
      if (slugEq) rows = rows.filter((s) => norm(s.Slug) === slugEq);
      return rows.map((s) => ({ ...s }));
    }
    case 'MJ_BizApps_Collaboration: Space Types': {
      let rows = Array.from(store.spaceTypes.values());
      if (idEq) rows = rows.filter((t) => norm(t.ID) === idEq);
      if (codeEq) rows = rows.filter((t) => norm(t.Code) === codeEq);
      return rows.map((r) => ({ ...r }));
    }
    case 'MJ_BizApps_Collaboration: Space Role Types': {
      const nameIn = parseSqlInList(filter, 'Name');
      let rows = Array.from(store.spaceRoleTypes.values());
      if (idEq) rows = rows.filter((r) => norm(r.ID) === idEq);
      if (/IsActive\s*=\s*1/i.test(filter)) rows = rows.filter((r) => r.IsActive !== false);
      if (/IsOwnerRole\s*=\s*0/i.test(filter)) rows = rows.filter((r) => !r.IsOwnerRole);
      if (/CanPromoteBand\s*=\s*0/i.test(filter)) rows = rows.filter((r) => !r.CanPromoteBand);
      if (nameIn) rows = rows.filter((r) => nameIn.includes(norm(r.Name)));
      if (/Code\s+NOT\s+IN/i.test(filter)) {
        rows = rows.filter((r) => norm(r.Code) !== 'admin' && norm(r.Code) !== 'owner');
      }
      return rows.map((r) => ({ ...r }));
    }
    case 'MJ_BizApps_Collaboration: Space Members': {
      let rows = Array.from(store.spaceMembers.values());
      if (idEq) rows = rows.filter((m) => norm(m.ID) === idEq);
      if (userIdEq) rows = rows.filter((m) => norm(m.UserID) === userIdEq);
      if (spaceIdEq) rows = rows.filter((m) => norm(m.SpaceID) === spaceIdEq);
      return rows.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.CommunitySpaces: {
      let rows = Array.from(store.communitySpaces.values());
      if (idEq) rows = rows.filter((s) => norm(s.ID) === idEq);
      if (slugEq) rows = rows.filter((s) => norm(s.Slug) === slugEq);
      return rows.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumRoleTypes: {
      let rows = Array.from(store.forumRoleTypes.values());
      if (idEq) rows = rows.filter((r) => norm(r.ID) === idEq);
      if (codeEq) rows = rows.filter((r) => norm(r.Code) === codeEq);
      return rows.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.PostTypes: {
      let rows = Array.from(store.postTypes.values());
      if (idEq) rows = rows.filter((p) => norm(p.ID) === idEq);
      if (codeEq) rows = rows.filter((p) => norm(p.Code) === codeEq);
      return rows.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumTypes: {
      let rows = Array.from(store.forumTypes.values());
      if (idEq) rows = rows.filter((t) => norm(t.ID) === idEq);
      if (codeEq) rows = rows.filter((t) => norm(t.Code) === codeEq);
      return rows.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.Forums: {
      const activeOnly = /Status\s*=\s*'Active'/i.test(filter);
      let rows = Array.from(store.forums.values());
      if (activeOnly) rows = rows.filter((f) => f.Status === 'Active');
      if (idEq) rows = rows.filter((f) => norm(f.ID) === idEq);
      if (idIn) rows = rows.filter((f) => idIn.includes(norm(f.ID)));
      if (spaceIdEq) rows = rows.filter((f) => norm(f.SpaceID) === spaceIdEq);
      if (slugEq) rows = rows.filter((f) => norm(f.Slug) === slugEq);
      return rows.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumIdeaCampaigns: {
      let rows = Array.from(store.ideaCampaigns.values());
      if (idEq) rows = rows.filter((c) => norm(c.ID) === idEq);
      if (idIn) rows = rows.filter((c) => idIn.includes(norm(c.ID)));
      return rows.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumMembers: {
      const activeOnly = /Status\s*=\s*'Active'/i.test(filter);
      let rows = Array.from(store.forumMembers.values());
      if (idEq) rows = rows.filter((m) => norm(m.ID) === idEq);
      if (forumIdEq) rows = rows.filter((m) => norm(m.ForumID) === forumIdEq);
      if (forumIdIn) rows = rows.filter((m) => forumIdIn.includes(norm(m.ForumID)));
      if (userIdEq) rows = rows.filter((m) => norm(m.UserID) === userIdEq);
      if (activeOnly) rows = rows.filter((m) => m.Status === 'Active');
      return rows.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.CommunityMemberProfiles: {
      let rows = Array.from(store.memberProfiles.values());
      if (idEq) rows = rows.filter((p) => norm(p.ID) === idEq);
      if (spaceIdEq) rows = rows.filter((p) => norm(p.SpaceID) === spaceIdEq);
      if (userIdEq) rows = rows.filter((p) => norm(p.UserID) === userIdEq);
      return rows.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumSubscriptions: {
      let rows = Array.from(store.forumSubscriptions.values());
      if (idEq) rows = rows.filter((s) => norm(s.ID) === idEq);
      if (forumIdEq) rows = rows.filter((s) => norm(s.ForumID) === forumIdEq);
      if (userIdEq) rows = rows.filter((s) => norm(s.UserID) === userIdEq);
      return rows.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumTopicTags: {
      let rows = Array.from(store.topicTags.values());
      if (idEq) rows = rows.filter((t) => norm(t.ID) === idEq);
      if (idIn) rows = rows.filter((t) => idIn.includes(norm(t.ID)));
      if (spaceIdEq) rows = rows.filter((t) => norm(t.SpaceID) === spaceIdEq);
      if (slugEq) rows = rows.filter((t) => norm(t.Slug) === slugEq);
      return rows.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumPosts: {
      const rootIdEq = parseSqlEq(filter, 'RootPostID');
      const authorEq = parseSqlEq(filter, 'AuthorUserID');
      const rootNullOnly = /RootPostID\s+IS\s+NULL/i.test(filter);
      const statusEq = parseSqlEq(filter, 'Status');
      const statusIn = parseSqlInList(filter, 'Status');

      let rows = Array.from(store.posts.values());
      if (idEq) rows = rows.filter((p) => norm(p.ID) === idEq);
      if (idIn) rows = rows.filter((p) => idIn.includes(norm(p.ID)));
      if (rootIdEq) rows = rows.filter((p) => norm(p.RootPostID) === rootIdEq);
      if (forumIdEq) rows = rows.filter((p) => norm(p.ForumID) === forumIdEq);
      if (forumIdIn) rows = rows.filter((p) => forumIdIn.includes(norm(p.ForumID)));
      if (authorEq) rows = rows.filter((p) => norm(p.AuthorUserID) === authorEq);
      if (slugEq) rows = rows.filter((p) => norm(p.Slug) === slugEq);
      if (rootNullOnly) rows = rows.filter((p) => p.RootPostID === null);
      if (statusEq) rows = rows.filter((p) => norm(p.Status) === statusEq);
      if (statusIn) rows = rows.filter((p) => statusIn.includes(norm(p.Status)));

      return rows.map((p) => ({
        ...p,
        AuthorUser: userNameById.get(norm(p.AuthorUserID)) ?? p.AuthorUserID,
        __mj_CreatedAt: p.CreatedAt,
      }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumQuestionPosts: {
      let rows = Array.from(store.questionPosts.values());
      if (idEq) rows = rows.filter((q) => norm(q.ID) === idEq);
      if (idIn) rows = rows.filter((q) => idIn.includes(norm(q.ID)));
      return rows.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumAnswerPosts: {
      const qEq = parseSqlEq(filter, 'QuestionPostID');
      const qIn = parseSqlInList(filter, 'QuestionPostID');
      const acceptedOnly = /IsAcceptedByAuthor\s*=\s*1/i.test(filter);
      let rows = Array.from(store.answerPosts.values());
      if (idEq) rows = rows.filter((a) => norm(a.ID) === idEq);
      if (idIn) rows = rows.filter((a) => idIn.includes(norm(a.ID)));
      if (qEq) rows = rows.filter((a) => norm(a.QuestionPostID) === qEq);
      if (qIn) rows = rows.filter((a) => qIn.includes(norm(a.QuestionPostID)));
      if (acceptedOnly) rows = rows.filter((a) => Boolean(a.IsAcceptedByAuthor));
      return rows.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumIdeaPosts: {
      let rows = Array.from(store.ideaPosts.values());
      if (idEq) rows = rows.filter((i) => norm(i.ID) === idEq);
      if (idIn) rows = rows.filter((i) => idIn.includes(norm(i.ID)));
      return rows.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations: {
      const ideaEq = parseSqlEq(filter, 'IdeaPostID');
      const ideaIn = parseSqlInList(filter, 'IdeaPostID');
      let rows = Array.from(store.ideaAllocations.values());
      if (idEq) rows = rows.filter((a) => norm(a.ID) === idEq);
      if (userIdEq) rows = rows.filter((a) => norm(a.UserID) === userIdEq);
      if (ideaEq) rows = rows.filter((a) => norm(a.IdeaPostID) === ideaEq);
      if (ideaIn) rows = rows.filter((a) => ideaIn.includes(norm(a.IdeaPostID)));
      return rows.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumCasePosts: {
      let rows = Array.from(store.casePosts.values());
      if (idEq) rows = rows.filter((c) => norm(c.ID) === idEq);
      return rows.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumAMAPosts: {
      let rows = Array.from(store.amaPosts.values());
      if (idEq) rows = rows.filter((a) => norm(a.ID) === idEq);
      return rows.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumInteractivePosts: {
      let rows = Array.from(store.interactivePosts.values());
      if (idEq) rows = rows.filter((ip) => norm(ip.ID) === idEq);
      return rows.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumInteractiveSessions: {
      const interEq = parseSqlEq(filter, 'InteractivePostID');
      let rows = Array.from(store.interactiveSessions.values());
      if (idEq) rows = rows.filter((s) => norm(s.ID) === idEq);
      if (interEq) rows = rows.filter((s) => norm(s.InteractivePostID) === interEq);
      if (userIdEq) rows = rows.filter((s) => norm(s.UserID) === userIdEq);
      return rows.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumPostTags: {
      const postEq = parseSqlEq(filter, 'PostID');
      const postIdIn = parseSqlInList(filter, 'PostID');
      const topicTagEq = parseSqlEq(filter, 'TopicTagID');
      let rows = Array.from(store.postTags.values());
      if (idEq) rows = rows.filter((pt) => norm(pt.ID) === idEq);
      if (postEq) rows = rows.filter((pt) => norm(pt.PostID) === postEq);
      if (postIdIn) rows = rows.filter((pt) => postIdIn.includes(norm(pt.PostID)));
      if (topicTagEq) rows = rows.filter((pt) => norm(pt.TopicTagID) === topicTagEq);
      return rows.map((r) => ({ ...r }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumPostReactions: {
      const postEq = parseSqlEq(filter, 'PostID');
      const kindEq = parseSqlEq(filter, 'ReactionKind');
      let rows = Array.from(store.postReactions.values());
      if (idEq) rows = rows.filter((r) => norm(r.ID) === idEq);
      if (postEq) rows = rows.filter((r) => norm(r.PostID) === postEq);
      if (userIdEq) rows = rows.filter((r) => norm(r.UserID) === userIdEq);
      if (kindEq) rows = rows.filter((r) => norm(r.ReactionKind) === kindEq);
      return rows.map((r) => ({ ...r, __mj_CreatedAt: '2026-11-18T12:00:00.000Z' }));
    }
    case COMMUNITY_ENTITY_NAMES.ForumPostFlags: {
      const postEq = parseSqlEq(filter, 'PostID');
      const reporterEq = parseSqlEq(filter, 'ReporterUserID');
      let rows = Array.from(store.postFlags.values());
      if (idEq) rows = rows.filter((f) => norm(f.ID) === idEq);
      if (postEq) rows = rows.filter((f) => norm(f.PostID) === postEq);
      if (reporterEq) rows = rows.filter((f) => norm(f.ReporterUserID) === reporterEq);
      return rows.map((r) => ({ ...r }));
    }
    case 'MJ: Task Types':
      return Array.from(store.taskTypes.values()).map((r) => ({ ...r }));
    case 'MJ: Tasks': {
      let rows = Array.from(store.tasks.values());
      if (idEq) rows = rows.filter((t) => norm(t.ID) === idEq);
      return rows.map((r) => ({ ...r }));
    }
    default:
      return [];
  }
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
        naturalKey: (r) => `${norm(r.PostID)}:${norm(r.ReporterUserID)}:${norm(r.ReasonCategory)}`,
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
    if (this.provider.persistenceFilePath) {
      SaveArchWorldStoreToDisk(this.provider.store, this.provider.persistenceFilePath);
    }
  }
}

/**
 * Authoritative MJ `IEntityDataProvider` + `IRunViewProvider` for `ARCH-WORLD`.
 * Instantiates real `BaseEntity` / `*ServerEntity` subclasses (`ForumPostServerEntity`,
 * `ForumAnswerPostServerEntity`, `ForumIdeaAllocationServerEntity`, `ForumPostReactionServerEntity`,
 * `ForumPostTagServerEntity`), enforces `ValidateAsync()`, and persists to both `store` and the
 * durable cross-process backing file.
 */
export class ArchWorldEntityProvider {
  constructor(store, options = {}) {
    this.store = store;
    this.persistenceFilePath = resolvePersistenceFilePath(options);
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
    const rows = queryStoreRows(this.store, params.EntityName, params.ExtraFilter ?? '');
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
    const target = getEntityStoreTarget(this.store, entity.EntityInfo.Name);
    if (!target || !id) return {};
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
    target.map.set(idKey, merged);

    if (target.indexMap && target.naturalKey) {
      target.indexMap.set(target.naturalKey(merged), idKey);
    }

    this.saveCount += 1;
    if (!internalOpts.skipDiskFlush && !this.suspendDiskFlush && this.persistenceFilePath) {
      SaveArchWorldStoreToDisk(this.store, this.persistenceFilePath);
    }
    return { ...merged };
  }

  async Delete(entity) {
    const entityName = entity.EntityInfo.Name;
    const target = getEntityStoreTarget(this.store, entityName);
    if (!target) return true;
    const idKey = norm(entity.ID);
    const existing = target.map.get(idKey);
    target.map.delete(idKey);
    if (existing && target.indexMap && target.naturalKey) {
      target.indexMap.delete(target.naturalKey(existing));
    }
    if (this.persistenceFilePath) {
      SaveArchWorldStoreToDisk(this.store, this.persistenceFilePath);
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
      const target = getEntityStoreTarget(this.store, entityName);
      const row = target ? target.map.get(norm(id)) : null;
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
 * `ARCH-WORLD` state (zero shared in-memory `Map` references).
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
      Name: pt.Code,
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
      Sequence: 10,
      IsActive: true,
    })),
    forumRoleTypes: dataset.forumRoleTypes.map((fr) => ({
      ...fr,
      Description: null,
      Level: 100,
      Sequence: 10,
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

/**
 * Generates deterministic, idempotent SQL Server and PostgreSQL seed scripts for `ARCH-WORLD`
 * following `scripts/seed-world.sql` and `scripts/seed-world.pg.sql` conventions.
 */
export function BuildArchitectAssociationWorldSql(dataset = GetArchWorldDataset()) {
  const mssqlLines = [
    '-- =============================================================================',
    '--  ARCH-WORLD (American Guild of Practicing Architects) Seed Script (SQL Server)',
    '--  Idempotent natural-key / ID upserts with IdeaPost aggregate recomputation.',
    '-- =============================================================================',
    'SET NOCOUNT ON;',
    '',
  ];
  const pgLines = [
    '-- =============================================================================',
    '--  ARCH-WORLD (American Guild of Practicing Architects) Seed Script (PostgreSQL)',
    '--  Idempotent natural-key / ID upserts with IdeaPost aggregate recomputation.',
    '-- =============================================================================',
    'SET search_path TO __mj_BizAppsCommunity, public;',
    '',
  ];

  // Spaces & CommunitySpaces
  for (const space of dataset.Spaces) {
    mssqlLines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCollaboration].[Space] WHERE [ID] = '${space.ID}')`,
      `    INSERT INTO [__mj_BizAppsCollaboration].[Space] ([ID], [SpaceTypeID], [Name], [Description], [OwnerID], [InheritsMembership], [AgentRetrieval], [StartedAt])`,
      `    VALUES ('${space.ID}', '${space.SpaceTypeID}', ${escapeSql(space.Name)}, ${escapeSql(space.Description)}, '${dataset.Members[21].ID}', ${escapeSql(space.InheritsMembership)}, N'Included', SYSDATETIMEOFFSET());`,
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[CommunitySpace] WHERE [ID] = '${space.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[CommunitySpace] ([ID], [Slug], [CommunityKind], [AnonymousReadMode], [AskFirstEnabled], [DefaultDigestCadence])`,
      `    VALUES ('${space.ID}', ${escapeSql(space.Slug)}, ${escapeSql(space.CommunityKind)}, ${escapeSql(space.AnonymousReadMode)}, ${escapeSql(space.AskFirstEnabled)}, ${escapeSql(space.DefaultDigestCadence)});`,
    );
    pgLines.push(
      `INSERT INTO __mj_BizAppsCollaboration."Space" ("ID", "SpaceTypeID", "Name", "Description", "OwnerID", "InheritsMembership", "AgentRetrieval", "StartedAt")`,
      `VALUES ('${space.ID}', '${space.SpaceTypeID}', ${escapePg(space.Name)}, ${escapePg(space.Description)}, '${dataset.Members[21].ID}', ${escapePg(space.InheritsMembership)}, 'Included', CURRENT_TIMESTAMP) ON CONFLICT ("ID") DO NOTHING;`,
      `INSERT INTO "CommunitySpace" ("ID", "Slug", "CommunityKind", "AnonymousReadMode", "AskFirstEnabled", "DefaultDigestCadence")`,
      `VALUES ('${space.ID}', ${escapePg(space.Slug)}, ${escapePg(space.CommunityKind)}, ${escapePg(space.AnonymousReadMode)}, ${escapePg(space.AskFirstEnabled)}, ${escapePg(space.DefaultDigestCadence)}) ON CONFLICT ("ID") DO NOTHING;`,
    );
  }

  // Forums & IdeaCampaigns
  for (const forum of dataset.Forums) {
    mssqlLines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[Forum] WHERE [ID] = '${forum.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[Forum] ([ID], [SpaceID], [ForumTypeID], [Slug], [Name], [Description], [VisibilityBand], [PostingPolicy], [InheritsSpaceMembers], [Sequence], [Status])`,
      `    VALUES ('${forum.ID}', '${forum.SpaceID}', '${forum.ForumTypeID}', ${escapeSql(forum.Slug)}, ${escapeSql(forum.Name)}, ${escapeSql(forum.Description)}, ${escapeSql(forum.VisibilityBand)}, ${escapeSql(forum.PostingPolicy)}, ${escapeSql(forum.InheritsSpaceMembers)}, ${forum.Sequence}, ${escapeSql(forum.Status)});`,
    );
    pgLines.push(
      `INSERT INTO "Forum" ("ID", "SpaceID", "ForumTypeID", "Slug", "Name", "Description", "VisibilityBand", "PostingPolicy", "InheritsSpaceMembers", "Sequence", "Status")`,
      `VALUES ('${forum.ID}', '${forum.SpaceID}', '${forum.ForumTypeID}', ${escapePg(forum.Slug)}, ${escapePg(forum.Name)}, ${escapePg(forum.Description)}, ${escapePg(forum.VisibilityBand)}, ${escapePg(forum.PostingPolicy)}, ${escapePg(forum.InheritsSpaceMembers)}, ${forum.Sequence}, ${escapePg(forum.Status)}) ON CONFLICT ("ID") DO NOTHING;`,
    );
  }

  for (const camp of dataset.IdeaCampaigns) {
    mssqlLines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumIdeaCampaign] WHERE [ID] = '${camp.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[ForumIdeaCampaign] ([ID], [DefaultBudgetPoints], [AllocationMode], [MaxPointsPerIdea])`,
      `    VALUES ('${camp.ID}', ${camp.DefaultBudgetPoints}, ${escapeSql(camp.AllocationMode)}, ${camp.MaxPointsPerIdea});`,
    );
    pgLines.push(
      `INSERT INTO "ForumIdeaCampaign" ("ID", "DefaultBudgetPoints", "AllocationMode", "MaxPointsPerIdea")`,
      `VALUES ('${camp.ID}', ${camp.DefaultBudgetPoints}, ${escapePg(camp.AllocationMode)}, ${camp.MaxPointsPerIdea}) ON CONFLICT ("ID") DO NOTHING;`,
    );
  }

  // Topic Tags
  for (const tag of dataset.TopicTags) {
    mssqlLines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumTopicTag] WHERE [ID] = '${tag.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[ForumTopicTag] ([ID], [SpaceID], [Slug], [Name], [IsOfficial])`,
      `    VALUES ('${tag.ID}', '${tag.SpaceID}', ${escapeSql(tag.Slug)}, ${escapeSql(tag.Name)}, ${escapeSql(tag.IsOfficial)});`,
    );
    pgLines.push(
      `INSERT INTO "ForumTopicTag" ("ID", "SpaceID", "Slug", "Name", "IsOfficial")`,
      `VALUES ('${tag.ID}', '${tag.SpaceID}', ${escapePg(tag.Slug)}, ${escapePg(tag.Name)}, ${escapePg(tag.IsOfficial)}) ON CONFLICT ("ID") DO NOTHING;`,
    );
  }

  // Posts (ReplyDepth order)
  const sortedPosts = [...dataset.Posts].sort((a, b) => (a.ReplyDepth ?? 0) - (b.ReplyDepth ?? 0));
  for (const post of sortedPosts) {
    mssqlLines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumPost] WHERE [ID] = '${post.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[ForumPost] ([ID], [ForumID], [PostTypeID], [RootPostID], [ParentPostID], [ReplyDepth], [AuthorUserID], [Title], [Slug], [BodyMarkdown], [VisibilityBand], [Status], [IsPinned], [IsLocked], [IsFeatured])`,
      `    VALUES ('${post.ID}', '${post.ForumID}', '${post.PostTypeID}', ${post.RootPostID ? `'${post.RootPostID}'` : 'NULL'}, ${post.ParentPostID ? `'${post.ParentPostID}'` : 'NULL'}, ${post.ReplyDepth ?? 0}, '${post.AuthorUserID}', ${escapeSql(post.Title)}, ${escapeSql(post.Slug)}, ${escapeSql(post.BodyMarkdown)}, ${escapeSql(post.VisibilityBand)}, ${escapeSql(post.Status)}, ${escapeSql(post.IsPinned)}, ${escapeSql(post.IsLocked)}, ${escapeSql(post.IsFeatured)});`,
    );
    pgLines.push(
      `INSERT INTO "ForumPost" ("ID", "ForumID", "PostTypeID", "RootPostID", "ParentPostID", "ReplyDepth", "AuthorUserID", "Title", "Slug", "BodyMarkdown", "VisibilityBand", "Status", "IsPinned", "IsLocked", "IsFeatured")`,
      `VALUES ('${post.ID}', '${post.ForumID}', '${post.PostTypeID}', ${post.RootPostID ? `'${post.RootPostID}'` : 'NULL'}, ${post.ParentPostID ? `'${post.ParentPostID}'` : 'NULL'}, ${post.ReplyDepth ?? 0}, '${post.AuthorUserID}', ${escapePg(post.Title)}, ${escapePg(post.Slug)}, ${escapePg(post.BodyMarkdown)}, ${escapePg(post.VisibilityBand)}, ${escapePg(post.Status)}, ${escapePg(post.IsPinned)}, ${escapePg(post.IsLocked)}, ${escapePg(post.IsFeatured)}) ON CONFLICT ("ID") DO NOTHING;`,
    );
  }

  // Question, Answer, Idea, Case, AMA subtypes
  for (const q of dataset.QuestionPosts) {
    mssqlLines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumQuestionPost] WHERE [ID] = '${q.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[ForumQuestionPost] ([ID], [AcceptedAnswerPostID], [AICanonAnswerPostID], [BountyPoints])`,
      `    VALUES ('${q.ID}', ${q.AcceptedAnswerPostID ? `'${q.AcceptedAnswerPostID}'` : 'NULL'}, ${q.AICanonAnswerPostID ? `'${q.AICanonAnswerPostID}'` : 'NULL'}, ${q.BountyPoints ?? 0});`,
    );
    pgLines.push(
      `INSERT INTO "ForumQuestionPost" ("ID", "AcceptedAnswerPostID", "AICanonAnswerPostID", "BountyPoints")`,
      `VALUES ('${q.ID}', ${q.AcceptedAnswerPostID ? `'${q.AcceptedAnswerPostID}'` : 'NULL'}, ${q.AICanonAnswerPostID ? `'${q.AICanonAnswerPostID}'` : 'NULL'}, ${q.BountyPoints ?? 0}) ON CONFLICT ("ID") DO NOTHING;`,
    );
  }

  for (const a of dataset.AnswerPosts) {
    mssqlLines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumAnswerPost] WHERE [ID] = '${a.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[ForumAnswerPost] ([ID], [QuestionPostID], [IsAcceptedByAuthor], [IsVerifiedByModerator], [AIEpistemicStatus], [AIConfidenceScore])`,
      `    VALUES ('${a.ID}', '${a.QuestionPostID}', ${escapeSql(a.IsAcceptedByAuthor)}, ${escapeSql(a.IsVerifiedByModerator)}, ${escapeSql(a.AIEpistemicStatus)}, ${a.AIConfidenceScore});`,
    );
    pgLines.push(
      `INSERT INTO "ForumAnswerPost" ("ID", "QuestionPostID", "IsAcceptedByAuthor", "IsVerifiedByModerator", "AIEpistemicStatus", "AIConfidenceScore")`,
      `VALUES ('${a.ID}', '${a.QuestionPostID}', ${escapePg(a.IsAcceptedByAuthor)}, ${escapePg(a.IsVerifiedByModerator)}, ${escapePg(a.AIEpistemicStatus)}, ${a.AIConfidenceScore}) ON CONFLICT ("ID") DO NOTHING;`,
    );
  }

  for (const idea of dataset.IdeaPosts) {
    mssqlLines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumIdeaPost] WHERE [ID] = '${idea.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[ForumIdeaPost] ([ID], [IdeaStatus], [TotalPointsAllocated], [EffectiveQuadraticVotes], [UniqueBackerCount], [TargetReleaseOrQuarter])`,
      `    VALUES ('${idea.ID}', ${escapeSql(idea.IdeaStatus)}, 0, 0.0, 0, ${escapeSql(idea.TargetReleaseOrQuarter)});`,
    );
    pgLines.push(
      `INSERT INTO "ForumIdeaPost" ("ID", "IdeaStatus", "TotalPointsAllocated", "EffectiveQuadraticVotes", "UniqueBackerCount", "TargetReleaseOrQuarter")`,
      `VALUES ('${idea.ID}', ${escapePg(idea.IdeaStatus)}, 0, 0.0, 0, ${escapePg(idea.TargetReleaseOrQuarter)}) ON CONFLICT ("ID") DO NOTHING;`,
    );
  }

  // Space-scoped PostTags
  for (const pt of dataset.PostTags) {
    mssqlLines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumPostTag] WHERE [ID] = '${pt.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[ForumPostTag] ([ID], [PostID], [TopicTagID]) VALUES ('${pt.ID}', '${pt.PostID}', '${pt.TopicTagID}');`,
    );
    pgLines.push(
      `INSERT INTO "ForumPostTag" ("ID", "PostID", "TopicTagID") VALUES ('${pt.ID}', '${pt.PostID}', '${pt.TopicTagID}') ON CONFLICT ("ID") DO NOTHING;`,
    );
  }

  // Idea Allocations + Aggregate Recomputation
  for (const alloc of dataset.IdeaAllocations) {
    mssqlLines.push(
      `IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumIdeaAllocation] WHERE [ID] = '${alloc.ID}')`,
      `    INSERT INTO [__mj_BizAppsCommunity].[ForumIdeaAllocation] ([ID], [IdeaPostID], [UserID], [PointsAllocated], [QuadraticVotes])`,
      `    VALUES ('${alloc.ID}', '${alloc.IdeaPostID}', '${alloc.UserID}', ${alloc.PointsAllocated}, ${alloc.QuadraticVotes});`,
    );
    pgLines.push(
      `INSERT INTO "ForumIdeaAllocation" ("ID", "IdeaPostID", "UserID", "PointsAllocated", "QuadraticVotes")`,
      `VALUES ('${alloc.ID}', '${alloc.IdeaPostID}', '${alloc.UserID}', ${alloc.PointsAllocated}, ${alloc.QuadraticVotes}) ON CONFLICT ("ID") DO NOTHING;`,
    );
  }

  for (const idea of dataset.IdeaPosts) {
    mssqlLines.push(
      `UPDATE [__mj_BizAppsCommunity].[ForumIdeaPost]`,
      `SET [TotalPointsAllocated] = ISNULL(agg.[TotalPts], 0), [EffectiveQuadraticVotes] = ISNULL(agg.[TotalVotes], 0.0), [UniqueBackerCount] = ISNULL(agg.[Backers], 0)`,
      `FROM [__mj_BizAppsCommunity].[ForumIdeaPost] ip`,
      `OUTER APPLY (SELECT SUM([PointsAllocated]) AS [TotalPts], SUM([QuadraticVotes]) AS [TotalVotes], COUNT(*) AS [Backers] FROM [__mj_BizAppsCommunity].[ForumIdeaAllocation] WHERE [IdeaPostID] = '${idea.ID}') agg`,
      `WHERE ip.[ID] = '${idea.ID}';`,
    );
    pgLines.push(
      `UPDATE "ForumIdeaPost" AS ip`,
      `SET "TotalPointsAllocated" = totals.total_points, "EffectiveQuadraticVotes" = totals.total_votes, "UniqueBackerCount" = totals.backer_count`,
      `FROM (SELECT COALESCE(SUM("PointsAllocated"), 0) AS total_points, COALESCE(SUM("QuadraticVotes"), 0.0) AS total_votes, COUNT(*) AS backer_count FROM "ForumIdeaAllocation" WHERE "IdeaPostID" = '${idea.ID}') AS totals`,
      `WHERE ip."ID" = '${idea.ID}';`,
    );
  }

  return {
    sqlServer: mssqlLines.join('\n'),
    postgres: pgLines.join('\n'),
  };
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
 * `ValidateAsync()` + `entity.Save()`, and persists the world to the durable cross-process backing store.
 */
export async function LoadArchitectAssociationWorld(options = {}) {
  const dataset = options.dataset ?? GetArchWorldDataset();
  EnsureArchWorldServerEntitiesLoaded(dataset);

  const persistenceFilePath = resolvePersistenceFilePath(options);
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

  // Optional direct SQL / PG execution when an external database pool is passed
  if (options.sqlPool || options.pgPool) {
    const sqlScripts = BuildArchitectAssociationWorldSql(dataset);
    if (options.sqlPool && typeof options.sqlPool.request === 'function') {
      await options.sqlPool.request().batch(sqlScripts.sqlServer);
    }
    if (options.pgPool && typeof options.pgPool.query === 'function') {
      await options.pgPool.query(sqlScripts.postgres);
    }
  }

  const prevMetadataProvider = Metadata.Provider;
  const prevRunViewProvider = RunView.Provider;
  const provider = options.provider ?? new ArchWorldEntityProvider(store, {
    persistenceFilePath,
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
        desiredData: row,
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
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: 'MJ: Users',
        naturalFilter: `Email = '${escapeFilterValue(member.Email)}'`,
        desiredData: member,
        contextUser: defaultAdminUser,
        counters,
        validatedCounter,
      });
    }

    // 3. Collaboration Spaces & CommunitySpaces (natural key: Slug)
    for (const space of dataset.Spaces) {
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: 'MJ_BizApps_Collaboration: Spaces',
        naturalFilter: `Slug = '${escapeFilterValue(space.Slug)}'`,
        desiredData: space,
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

    // 6. Forum Members, Member Profiles & Forum Subscriptions
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
        desiredData: profile,
        contextUser: defaultAdminUser,
        ignoredCompareFields: new Set(['HelpfulAnswerCount', 'AcceptedAnswerCount']),
        counters,
        validatedCounter,
      });
    }
    for (const sub of dataset.ForumSubscriptions) {
      await upsertViaEntityProvider({
        metadata,
        runView,
        entityName: COMMUNITY_ENTITY_NAMES.ForumSubscriptions,
        naturalFilter: `ForumID = '${escapeFilterValue(sub.ForumID)}' AND UserID = '${escapeFilterValue(sub.UserID)}'`,
        desiredData: sub,
        contextUser: defaultAdminUser,
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

    // 8. Posts in ReplyDepth order via ForumPostServerEntity (root posts first so FK references resolve)
    const sortedPosts = [...dataset.Posts].sort((a, b) => (a.ReplyDepth ?? 0) - (b.ReplyDepth ?? 0));
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

    // 9. Post Subtypes (Question, Answer via ForumAnswerPostServerEntity, Idea, Case, AMA, Interactive)
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
        desiredData: inter,
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
        desiredData: sess,
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
        desiredData: flag,
        contextUser: defaultAdminUser,
        counters,
        validatedCounter,
      });
    }

    store.lastLoadedAt = options.now ? new Date(options.now).toISOString() : new Date().toISOString();
    if (persistenceFilePath && options.persist !== false) {
      SaveArchWorldStoreToDisk(store, persistenceFilePath);
    }

    const summary = CountArchWorldStoreRecords(store);

    return {
      store,
      provider,
      mode: usingCustomMetadata ? 'external-provider' : 'entity-provider-persisted',
      persistenceFilePath,
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
    if (!usingCustomMetadata && !options.keepProviderActive) {
      Metadata.Provider = prevMetadataProvider;
      RunView.Provider = prevRunViewProvider;
    }
  }
}

/**
 * Deliberate no-op teardown for `ARCH-WORLD` (mirroring `bizapps-orders` `ORD-WORLD`).
 * Preserves all seeded AGPA records in both the store and the durable backing file on disk so
 * independent readers, Explorer UI checks, and Playwright visual capture run against persisted data.
 */
export function TeardownArchitectAssociationWorld(options = {}) {
  const store = options.store ?? GetSharedArchWorldStore(options);
  const persistenceFilePath = resolvePersistenceFilePath(options);
  const summary = CountArchWorldStoreRecords(store);
  return {
    preserved: true,
    persistenceFilePath,
    persistedOnDisk: Boolean(persistenceFilePath && existsSync(persistenceFilePath)),
    reason:
      'ARCH-WORLD teardown is deliberately a no-op so the American Guild of Practicing Architects dataset persists for live smoke testing, Explorer exploration, and Playwright visual capture.',
    counts: summary.counts,
    totalRecords: summary.totalRecords,
  };
}

/**
 * Creates a real-store-backed RunView & Metadata harness for `@mj-biz-apps/community-actions` and
 * `@mj-biz-apps/community-server` services so every action, entity, and graduation service reads from
 * and persists back to `store` (and flushes to the durable backing store when configured).
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
            store.posts.set(norm(wrapper.ID), { ...existing, ...wrapper });
            if (provider.persistenceFilePath) {
              SaveArchWorldStoreToDisk(store, provider.persistenceFilePath);
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
          if (clean.RootPostID) {
            const root = store.posts.get(norm(clean.RootPostID));
            if (root) {
              root.ReplyCount = Array.from(store.posts.values()).filter(
                (p) => norm(p.RootPostID) === norm(root.ID),
              ).length;
            }
          }
          if (provider.persistenceFilePath) {
            SaveArchWorldStoreToDisk(store, provider.persistenceFilePath);
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
        Save: async () => {
          const clean = { ...spaceRecord };
          delete clean.Save;
          delete clean.Delete;
          if (!clean.Slug) {
            clean.Slug = clean.Name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          }
          store.spaces.set(norm(clean.ID), clean);
          store.spacesBySlug.set(norm(clean.Slug), norm(clean.ID));
          if (provider.persistenceFilePath) {
            SaveArchWorldStoreToDisk(store, provider.persistenceFilePath);
          }
          return true;
        },
        Delete: async () => {
          store.spaces.delete(norm(spaceRecord.ID));
          if (provider.persistenceFilePath) {
            SaveArchWorldStoreToDisk(store, provider.persistenceFilePath);
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
          if (provider.persistenceFilePath) {
            SaveArchWorldStoreToDisk(store, provider.persistenceFilePath);
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
          if (provider.persistenceFilePath) {
            SaveArchWorldStoreToDisk(store, provider.persistenceFilePath);
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

export { ARCH_COMMUNITY_SPACES, ARCH_FORUMS, ARCH_FORUM_TYPES, ARCH_POST_TYPES };

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = new Set(process.argv.slice(2));
  if (args.has('--sql')) {
    console.log(BuildArchitectAssociationWorldSql().sqlServer);
  } else if (args.has('--pg-sql')) {
    console.log(BuildArchitectAssociationWorldSql().postgres);
  } else if (args.has('--verify')) {
    const provider = CreatePersistedArchWorldProvider();
    const rv = new RunView(provider);
    const [collabSpaces, communitySpaces, forums, posts, tags, allocs] = await Promise.all([
      rv.RunView({ EntityName: 'MJ_BizApps_Collaboration: Spaces', ResultType: 'simple' }, provider.CurrentUser),
      rv.RunView({ EntityName: COMMUNITY_ENTITY_NAMES.CommunitySpaces, ResultType: 'simple' }, provider.CurrentUser),
      rv.RunView({ EntityName: COMMUNITY_ENTITY_NAMES.Forums, ResultType: 'simple' }, provider.CurrentUser),
      rv.RunView({ EntityName: COMMUNITY_ENTITY_NAMES.ForumPosts, ResultType: 'simple' }, provider.CurrentUser),
      rv.RunView({ EntityName: COMMUNITY_ENTITY_NAMES.ForumTopicTags, ResultType: 'simple' }, provider.CurrentUser),
      rv.RunView({ EntityName: COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations, ResultType: 'simple' }, provider.CurrentUser),
    ]);
    console.log(
      `[arch-world-loader] Verified persisted state: Spaces=${collabSpaces.Results.length}, CommunitySpaces=${communitySpaces.Results.length}, Forums=${forums.Results.length}, Posts=${posts.Results.length}, TopicTags=${tags.Results.length}, IdeaAllocations=${allocs.Results.length}`,
    );
  } else {
    const res = await LoadArchitectAssociationWorld();
    console.log(
      `[arch-world-loader] Loaded ARCH-WORLD (${res.mode}): totalRecords=${res.totalRecords}, created=${res.createdCount}, updated=${res.updatedCount}, unchanged=${res.unchangedCount}, validated=${res.validatedEntityCount}, idempotent=${res.idempotent}`,
    );
  }
}
