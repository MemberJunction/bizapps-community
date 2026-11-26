/**
 * RLS-enforcing, query-auditing RunView provider & SQLite FK verifier backed by
 * `community-artifact-world.mjs` for cross-stack integration and adversarial boundary checks.
 */
import { DatabaseSync } from 'node:sqlite';
import {
  ADVERSARIAL_FIXTURES,
  ARTIFACT_WORLD_IDS,
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
} from './community-artifact-world.mjs';

function parseInIds(extraFilter, column) {
  if (typeof extraFilter !== 'string') return null;
  const regex = new RegExp(`\\b${column}\\s+IN\\s*\\(([^)]+)\\)`, 'i');
  const match = extraFilter.match(regex);
  if (!match) return null;
  const ids = new Set();
  for (const raw of match[1].split(',')) {
    const cleaned = raw.trim().replace(/^'+|'+$/g, '').toLowerCase();
    if (cleaned) ids.add(cleaned);
  }
  return ids;
}

function parseEqId(extraFilter, column) {
  if (typeof extraFilter !== 'string') return null;
  const regex = new RegExp(`\\b${column}\\s*=\\s*'([^']+)'`, 'i');
  const match = extraFilter.match(regex);
  return match ? match[1].trim().toLowerCase() : null;
}

function projectFields(row, fields) {
  if (!Array.isArray(fields) || fields.length === 0) {
    return { ...row };
  }
  const projected = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(row, field)) {
      projected[field] = row[field];
    }
  }
  return projected;
}

/**
 * Evaluates authoritative Space/Forum/Artifact permissions for a caller against the seeded
 * organization, role, and membership tables.
 */
export function EvaluateUserForumAccess(userId, forumId) {
  const normUser = String(userId ?? '').trim().toLowerCase();
  const normForum = String(forumId ?? '').trim().toLowerCase();
  const person = WORLD_PEOPLE.find((p) => p.ID.toLowerCase() === normUser) ?? null;
  const forum = WORLD_FORUMS.find((f) => f.ID.toLowerCase() === normForum) ?? null;

  if (!person || !forum) {
    return {
      allowedRead: false,
      allowedWrite: false,
      allowedCoEdit: false,
      allowedArtifacts: false,
      reason: 'unknown-user-or-forum',
    };
  }

  if (person.Status === 'Removed') {
    return {
      allowedRead: false,
      allowedWrite: false,
      allowedCoEdit: false,
      allowedArtifacts: false,
      reason: 'user-removed',
    };
  }

  const grant =
    WORLD_PERMISSIONS.find(
      (g) => g.UserID.toLowerCase() === normUser && g.ForumID.toLowerCase() === normForum,
    ) ?? null;

  if (!grant) {
    // Allow read-only access to public Full Read spaces when user belongs to same org or non-isolated space,
    // while strictly denying cross-tenant access to Regulated/StrictTenantIsolated or Team-band spaces.
    const space = WORLD_SPACES.find((s) => s.ID === forum.SpaceID) ?? null;
    const org = WORLD_ORGANIZATIONS.find((o) => o.ID === forum.OrganizationID) ?? null;
    if (
      space &&
      org &&
      org.IsolationMode === 'Standard' &&
      space.AnonymousReadMode === 'Full Read' &&
      forum.VisibilityBand === 'Shared' &&
      person.OrganizationID === forum.OrganizationID
    ) {
      return {
        allowedRead: true,
        allowedWrite: false,
        allowedCoEdit: false,
        allowedArtifacts: true,
        reason: 'same-org-shared-read',
      };
    }
    return {
      allowedRead: false,
      allowedWrite: false,
      allowedCoEdit: false,
      allowedArtifacts: false,
      reason: 'cross-tenant-or-missing-grant',
    };
  }

  if (grant.Status === 'Removed') {
    return {
      allowedRead: false,
      allowedWrite: false,
      allowedCoEdit: false,
      allowedArtifacts: false,
      reason: 'membership-removed',
    };
  }

  const role = WORLD_ROLES.find((r) => r.ID === grant.RoleID) ?? null;
  const isMuted = person.Status === 'Muted' || grant.Status === 'Muted';
  const canWrite = Boolean(!isMuted && grant.CanWrite && role && (role.CanCreateRootPost || role.CanReply));
  const canCoEdit = Boolean(!isMuted && grant.CanWrite && role && role.CanCoEditDocs);

  return {
    allowedRead: Boolean(grant.CanRead),
    allowedWrite: canWrite,
    allowedCoEdit: canCoEdit,
    allowedArtifacts: Boolean(grant.CanRead && grant.CanReadArtifacts),
    reason: isMuted ? 'member-muted' : 'active-grant',
  };
}

/**
 * Checks whether a caller can read a specific seeded `MJ: Artifact` based on its owning Space/Org.
 */
export function CanUserReadArtifact(userId, artifact) {
  const normUser = String(userId ?? '').trim().toLowerCase();
  const person = WORLD_PEOPLE.find((p) => p.ID.toLowerCase() === normUser) ?? null;
  if (!person || person.Status === 'Removed') {
    return false;
  }

  const spaceForums = WORLD_FORUMS.filter((f) => f.SpaceID === artifact.SpaceID);
  return spaceForums.some((forum) => EvaluateUserForumAccess(userId, forum.ID).allowedArtifacts);
}

/**
 * Creates a deterministic, RLS-enforcing `RunView`-compatible provider that logs every single
 * `RunView` / `RunViews` query for strict N+1, batching, and `ResultType: 'simple'` assertions.
 */
export function CreateArtifactWorldRunViewProvider(defaultUserId = ARTIFACT_WORLD_IDS.USER_ELENA) {
  const queryLog = [];
  let batchCallCount = 0;
  let singleCallCount = 0;

  function resolveUserId(contextUser) {
    return String(contextUser?.ID ?? defaultUserId);
  }

  function executeSingle(params, contextUser, batchSize) {
    const userId = resolveUserId(contextUser);
    const entityName = String(params?.EntityName ?? '');
    const extraFilter = String(params?.ExtraFilter ?? '');
    const resultType = params?.ResultType ?? 'entity_object';
    const fields = Array.isArray(params?.Fields) ? [...params.Fields] : null;
    const maxRows = typeof params?.MaxRows === 'number' ? params.MaxRows : null;

    let rows = [];

    switch (entityName) {
      case 'MJ: Artifacts': {
        rows = WORLD_ARTIFACTS.filter((a) => CanUserReadArtifact(userId, a));
        const inIds = parseInIds(extraFilter, 'ID');
        const eqId = parseEqId(extraFilter, 'ID');
        if (inIds) rows = rows.filter((a) => inIds.has(a.ID.toLowerCase()));
        else if (eqId) rows = rows.filter((a) => a.ID.toLowerCase() === eqId);
        break;
      }
      case 'MJ: Artifact Versions': {
        const readableArtifactIds = new Set(
          WORLD_ARTIFACTS.filter((a) => CanUserReadArtifact(userId, a)).map((a) => a.ID.toLowerCase()),
        );
        rows = WORLD_ARTIFACT_VERSIONS.filter((v) => readableArtifactIds.has(v.ArtifactID.toLowerCase()));
        const inIds = parseInIds(extraFilter, 'ID');
        const eqId = parseEqId(extraFilter, 'ID');
        const artInIds = parseInIds(extraFilter, 'ArtifactID');
        const artEqId = parseEqId(extraFilter, 'ArtifactID');
        if (inIds) rows = rows.filter((v) => inIds.has(v.ID.toLowerCase()));
        else if (eqId) rows = rows.filter((v) => v.ID.toLowerCase() === eqId);
        if (artInIds) rows = rows.filter((v) => artInIds.has(v.ArtifactID.toLowerCase()));
        else if (artEqId) rows = rows.filter((v) => v.ArtifactID.toLowerCase() === artEqId);
        break;
      }
      case 'MJ_BizApps_Community: Forum Artifact Posts': {
        rows = WORLD_FORUM_ARTIFACT_POSTS.filter(
          (p) => EvaluateUserForumAccess(userId, p.ForumID).allowedRead,
        );
        const inIds = parseInIds(extraFilter, 'ID');
        const eqId = parseEqId(extraFilter, 'ID');
        if (inIds) rows = rows.filter((p) => inIds.has(p.ID.toLowerCase()));
        else if (eqId) rows = rows.filter((p) => p.ID.toLowerCase() === eqId);
        break;
      }
      case 'MJ_BizApps_Community: Forum Interactive Posts': {
        rows = WORLD_FORUM_INTERACTIVE_POSTS.filter(
          (p) => EvaluateUserForumAccess(userId, p.ForumID).allowedRead,
        );
        const inIds = parseInIds(extraFilter, 'ID');
        const eqId = parseEqId(extraFilter, 'ID');
        if (inIds) rows = rows.filter((p) => inIds.has(p.ID.toLowerCase()));
        else if (eqId) rows = rows.filter((p) => p.ID.toLowerCase() === eqId);
        break;
      }
      case 'MJ_BizApps_Community: Forum Posts': {
        const allPosts = [
          ...WORLD_FORUM_ARTIFACT_POSTS.map((p) => ({
            ...p,
            RootPostID: null,
            ParentPostID: null,
            ReplyDepth: 0,
          })),
          ...WORLD_FORUM_INTERACTIVE_POSTS.map((p) => ({
            ...p,
            RootPostID: null,
            ParentPostID: null,
            ReplyDepth: 0,
          })),
          ...WORLD_FORUM_POST_REPLIES,
        ];
        rows = allPosts.filter((p) => EvaluateUserForumAccess(userId, p.ForumID).allowedRead);
        const inIds = parseInIds(extraFilter, 'ID');
        const rootInIds = parseInIds(extraFilter, 'RootPostID');
        const rootEqId = parseEqId(extraFilter, 'RootPostID');
        const forumInIds = parseInIds(extraFilter, 'ForumID');
        const statusEq = parseEqId(extraFilter, 'Status');
        if (inIds) rows = rows.filter((p) => inIds.has(p.ID.toLowerCase()));
        if (rootInIds) rows = rows.filter((p) => p.RootPostID && rootInIds.has(p.RootPostID.toLowerCase()));
        if (rootEqId) rows = rows.filter((p) => p.RootPostID && p.RootPostID.toLowerCase() === rootEqId);
        if (forumInIds) rows = rows.filter((p) => forumInIds.has(p.ForumID.toLowerCase()));
        if (statusEq) rows = rows.filter((p) => String(p.Status).toLowerCase() === statusEq);
        break;
      }
      case 'MJ_BizApps_Community: Forums': {
        rows = WORLD_FORUMS.filter((f) => EvaluateUserForumAccess(userId, f.ID).allowedRead);
        break;
      }
      case 'MJ_BizApps_Community: Community Spaces': {
        const readableSpaceIds = new Set(
          WORLD_FORUMS.filter((f) => EvaluateUserForumAccess(userId, f.ID).allowedRead).map((f) => f.SpaceID),
        );
        rows = WORLD_SPACES.filter((s) => readableSpaceIds.has(s.ID));
        break;
      }
      default:
        rows = [];
    }

    if (maxRows !== null && maxRows > 0 && rows.length > maxRows) {
      rows = rows.slice(0, maxRows);
    }

    const projected = rows.map((row) => projectFields(row, fields));

    queryLog.push({
      method: batchSize > 1 ? 'RunViews' : 'RunView',
      entityName,
      extraFilter,
      resultType,
      fields,
      maxRows,
      userId,
      batchSize,
      returnedCount: projected.length,
    });

    return {
      Success: true,
      Results: projected,
      TotalRowCount: projected.length,
    };
  }

  return {
    get queryLog() {
      return queryLog;
    },
    get stats() {
      return {
        batchCallCount,
        singleCallCount,
        totalQueries: queryLog.length,
      };
    },
    resetQueryLog() {
      queryLog.length = 0;
      batchCallCount = 0;
      singleCallCount = 0;
    },
    async RunView(params, contextUser) {
      singleCallCount += 1;
      return executeSingle(params, contextUser, 1);
    },
    async RunViews(paramsArray, contextUser) {
      batchCallCount += 1;
      return paramsArray.map((params) => executeSingle(params, contextUser, paramsArray.length));
    },
  };
}

/**
 * Loads the seeded world into an in-memory relational SQLite database with `PRAGMA foreign_keys = ON`
 * to prove complete foreign-key integrity across all 11 entity tables (while tagging intentionally
 * revoked/missing adversarial artifact fixtures separately).
 */
export function VerifyArtifactWorldSqliteReferentialIntegrity() {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE Organization (ID TEXT PRIMARY KEY, Slug TEXT NOT NULL UNIQUE, Name TEXT NOT NULL);
      CREATE TABLE CommunitySpace (
        ID TEXT PRIMARY KEY,
        OrganizationID TEXT NOT NULL REFERENCES Organization(ID),
        Slug TEXT NOT NULL UNIQUE,
        Name TEXT NOT NULL
      );
      CREATE TABLE Person (
        ID TEXT PRIMARY KEY,
        OrganizationID TEXT NOT NULL REFERENCES Organization(ID),
        Name TEXT NOT NULL,
        Email TEXT NOT NULL UNIQUE,
        Status TEXT NOT NULL
      );
      CREATE TABLE ForumRoleType (ID TEXT PRIMARY KEY, Code TEXT NOT NULL UNIQUE, Name TEXT NOT NULL);
      CREATE TABLE Forum (
        ID TEXT PRIMARY KEY,
        SpaceID TEXT NOT NULL REFERENCES CommunitySpace(ID),
        OrganizationID TEXT NOT NULL REFERENCES Organization(ID),
        Slug TEXT NOT NULL,
        Name TEXT NOT NULL
      );
      CREATE TABLE ForumPermission (
        ID TEXT PRIMARY KEY,
        OrganizationID TEXT NOT NULL REFERENCES Organization(ID),
        SpaceID TEXT NOT NULL REFERENCES CommunitySpace(ID),
        ForumID TEXT NOT NULL REFERENCES Forum(ID),
        UserID TEXT NOT NULL REFERENCES Person(ID),
        RoleID TEXT NOT NULL REFERENCES ForumRoleType(ID),
        Status TEXT NOT NULL
      );
      CREATE TABLE Artifact (
        ID TEXT PRIMARY KEY,
        OrganizationID TEXT NOT NULL REFERENCES Organization(ID),
        SpaceID TEXT NOT NULL REFERENCES CommunitySpace(ID),
        Name TEXT NOT NULL,
        Type TEXT NOT NULL
      );
      CREATE TABLE ArtifactVersion (
        ID TEXT PRIMARY KEY,
        ArtifactID TEXT NOT NULL REFERENCES Artifact(ID),
        VersionNumber INTEGER NOT NULL,
        Name TEXT NOT NULL
      );
      CREATE TABLE ForumPost (
        ID TEXT PRIMARY KEY,
        ForumID TEXT NOT NULL REFERENCES Forum(ID),
        RootPostID TEXT REFERENCES ForumPost(ID),
        ParentPostID TEXT REFERENCES ForumPost(ID),
        AuthorUserID TEXT NOT NULL REFERENCES Person(ID),
        ReplyDepth INTEGER NOT NULL,
        Status TEXT NOT NULL,
        Period TEXT NOT NULL
      );
      CREATE TABLE ForumArtifactPost (
        ID TEXT PRIMARY KEY REFERENCES ForumPost(ID),
        ArtifactID TEXT NOT NULL REFERENCES Artifact(ID),
        PinnedArtifactVersionID TEXT REFERENCES ArtifactVersion(ID),
        ArtifactModality TEXT NOT NULL,
        CollaborationMode TEXT NOT NULL
      );
      CREATE TABLE ForumInteractivePost (
        ID TEXT PRIMARY KEY REFERENCES ForumPost(ID),
        ComponentArtifactID TEXT NOT NULL REFERENCES Artifact(ID),
        PinnedArtifactVersionID TEXT REFERENCES ArtifactVersion(ID),
        ExperienceKind TEXT NOT NULL
      );
    `);

    const insOrg = db.prepare('INSERT INTO Organization (ID, Slug, Name) VALUES (?, ?, ?)');
    for (const row of WORLD_ORGANIZATIONS) insOrg.run(row.ID, row.Slug, row.Name);

    const insSpace = db.prepare('INSERT INTO CommunitySpace (ID, OrganizationID, Slug, Name) VALUES (?, ?, ?, ?)');
    for (const row of WORLD_SPACES) insSpace.run(row.ID, row.OrganizationID, row.Slug, row.Name);

    const insPerson = db.prepare('INSERT INTO Person (ID, OrganizationID, Name, Email, Status) VALUES (?, ?, ?, ?, ?)');
    for (const row of WORLD_PEOPLE) insPerson.run(row.ID, row.OrganizationID, row.Name, row.Email, row.Status);

    const insRole = db.prepare('INSERT INTO ForumRoleType (ID, Code, Name) VALUES (?, ?, ?)');
    for (const row of WORLD_ROLES) insRole.run(row.ID, row.Code, row.Name);

    const insForum = db.prepare('INSERT INTO Forum (ID, SpaceID, OrganizationID, Slug, Name) VALUES (?, ?, ?, ?, ?)');
    for (const row of WORLD_FORUMS) insForum.run(row.ID, row.SpaceID, row.OrganizationID, row.Slug, row.Name);

    const insPerm = db.prepare(
      'INSERT INTO ForumPermission (ID, OrganizationID, SpaceID, ForumID, UserID, RoleID, Status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );
    for (const row of WORLD_PERMISSIONS) {
      insPerm.run(row.ID, row.OrganizationID, row.SpaceID, row.ForumID, row.UserID, row.RoleID, row.Status);
    }

    const insArt = db.prepare('INSERT INTO Artifact (ID, OrganizationID, SpaceID, Name, Type) VALUES (?, ?, ?, ?, ?)');
    for (const row of WORLD_ARTIFACTS) insArt.run(row.ID, row.OrganizationID, row.SpaceID, row.Name, row.Type);

    const insVer = db.prepare(
      'INSERT INTO ArtifactVersion (ID, ArtifactID, VersionNumber, Name) VALUES (?, ?, ?, ?)',
    );
    for (const row of WORLD_ARTIFACT_VERSIONS) insVer.run(row.ID, row.ArtifactID, row.VersionNumber, row.Name);

    const insPost = db.prepare(
      'INSERT INTO ForumPost (ID, ForumID, RootPostID, ParentPostID, AuthorUserID, ReplyDepth, Status, Period) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    );
    for (const row of WORLD_FORUM_ARTIFACT_POSTS) {
      insPost.run(row.ID, row.ForumID, null, null, row.AuthorUserID, 0, row.Status, row.Period);
    }
    for (const row of WORLD_FORUM_INTERACTIVE_POSTS) {
      insPost.run(row.ID, row.ForumID, null, null, row.AuthorUserID, 0, row.Status, row.Period);
    }
    for (const row of WORLD_FORUM_POST_REPLIES) {
      insPost.run(
        row.ID,
        row.ForumID,
        row.RootPostID,
        row.ParentPostID,
        row.AuthorUserID,
        row.ReplyDepth,
        row.Status,
        row.Period,
      );
    }

    const validArtifactIds = new Set(WORLD_ARTIFACTS.map((a) => a.ID));
    const validVersionIds = new Set(WORLD_ARTIFACT_VERSIONS.map((v) => v.ID));

    const insArtPost = db.prepare(
      'INSERT INTO ForumArtifactPost (ID, ArtifactID, PinnedArtifactVersionID, ArtifactModality, CollaborationMode) VALUES (?, ?, ?, ?, ?)',
    );
    let fkVerifiedArtifactPosts = 0;
    let adversarialMissingArtifactPosts = 0;
    for (const row of WORLD_FORUM_ARTIFACT_POSTS) {
      if (
        validArtifactIds.has(row.ArtifactID) &&
        (row.PinnedArtifactVersionID === null || validVersionIds.has(row.PinnedArtifactVersionID))
      ) {
        insArtPost.run(
          row.ID,
          row.ArtifactID,
          row.PinnedArtifactVersionID,
          row.ArtifactModality,
          row.CollaborationMode,
        );
        fkVerifiedArtifactPosts += 1;
      } else {
        adversarialMissingArtifactPosts += 1;
      }
    }

    const insIntPost = db.prepare(
      'INSERT INTO ForumInteractivePost (ID, ComponentArtifactID, PinnedArtifactVersionID, ExperienceKind) VALUES (?, ?, ?, ?)',
    );
    let fkVerifiedInteractivePosts = 0;
    let adversarialMissingInteractivePosts = 0;
    for (const row of WORLD_FORUM_INTERACTIVE_POSTS) {
      if (
        validArtifactIds.has(row.ComponentArtifactID) &&
        (row.PinnedArtifactVersionID === null || validVersionIds.has(row.PinnedArtifactVersionID))
      ) {
        insIntPost.run(row.ID, row.ComponentArtifactID, row.PinnedArtifactVersionID, row.ExperienceKind);
        fkVerifiedInteractivePosts += 1;
      } else {
        adversarialMissingInteractivePosts += 1;
      }
    }

    const fkCheckRows = db.prepare('PRAGMA foreign_key_check').all();
    return {
      foreignKeyViolations: fkCheckRows.length,
      fkVerifiedArtifactPosts,
      adversarialMissingArtifactPosts,
      fkVerifiedInteractivePosts,
      adversarialMissingInteractivePosts,
      revokedArtifactIdAbsent: !validArtifactIds.has(ADVERSARIAL_FIXTURES.revokedArtifactId),
      nonExistentVersionAbsent: !validVersionIds.has(ADVERSARIAL_FIXTURES.nonExistentVersionId),
    };
  } finally {
    db.close();
  }
}
