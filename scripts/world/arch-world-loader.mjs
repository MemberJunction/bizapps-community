import {
  ARCH_COMMUNITY_SPACES,
  ARCH_FORUM_TYPES,
  ARCH_FORUMS,
  ARCH_POST_TYPES,
  ARCH_TASK_TYPE_ID,
  GetArchWorldDataset,
} from './arch-world-data.mjs';

let sharedStore = null;

function norm(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function shallowEqualRecord(a, b) {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    const va = a[key];
    const vb = b[key];
    if (va instanceof Date && vb instanceof Date) {
      if (va.getTime() !== vb.getTime()) return false;
    } else if (Array.isArray(va) && Array.isArray(vb)) {
      if (va.length !== vb.length || va.some((v, idx) => v !== vb[idx])) return false;
    } else if (va !== vb) {
      return false;
    }
  }
  return true;
}

/**
 * Creates a fresh, empty persistent in-memory store for `ARCH-WORLD` with natural-key indexes.
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

/** Returns the shared persistent `ARCH-WORLD` store (retained across calls & no-op teardowns). */
export function GetSharedArchWorldStore() {
  if (!sharedStore) {
    sharedStore = CreateEmptyArchWorldStore();
  }
  return sharedStore;
}

/** Explicit internal reset helper for isolated unit scenarios that require a brand-new store. */
export function ResetSharedArchWorldStore() {
  sharedStore = CreateEmptyArchWorldStore();
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

function upsertByNaturalKey(primaryMap, naturalIndexMap, naturalKey, record, idField = 'ID') {
  const existingId = naturalIndexMap ? naturalIndexMap.get(naturalKey) : undefined;
  const targetKey = existingId ?? norm(record[idField]);
  const existing = primaryMap.get(targetKey);
  if (!existing) {
    const clone = { ...record };
    primaryMap.set(targetKey, clone);
    if (naturalIndexMap) {
      naturalIndexMap.set(naturalKey, targetKey);
    }
    return 'created';
  }
  const merged = { ...existing, ...record, [idField]: existing[idField] ?? record[idField] };
  if (shallowEqualRecord(existing, merged)) {
    return 'unchanged';
  }
  primaryMap.set(targetKey, merged);
  return 'updated';
}

/**
 * Idempotent natural-key loader for the American Guild of Practicing Architects (`ARCH-WORLD`) dataset.
 * Upserts every catalog, member, space, forum, tag, post, subtype, allocation, session, reaction,
 * and flag in FK-safe topological order so calling it twice yields identical counts and zero duplicates.
 */
export function LoadArchitectAssociationWorld(options = {}) {
  const store = options.store ?? GetSharedArchWorldStore();
  const dataset = options.dataset ?? GetArchWorldDataset();
  const counters = { createdCount: 0, updatedCount: 0, unchangedCount: 0 };

  const tally = (status) => {
    if (status === 'created') counters.createdCount += 1;
    else if (status === 'updated') counters.updatedCount += 1;
    else counters.unchangedCount += 1;
  };

  // 1. Reference catalogs
  for (const row of dataset.spaceTypes) {
    tally(upsertByNaturalKey(store.spaceTypes, null, norm(row.ID), row));
  }
  for (const row of dataset.spaceRoleTypes) {
    tally(upsertByNaturalKey(store.spaceRoleTypes, null, norm(row.ID), row));
  }
  for (const row of dataset.forumTypes) {
    tally(upsertByNaturalKey(store.forumTypes, null, norm(row.ID), row));
  }
  for (const row of dataset.postTypes) {
    tally(upsertByNaturalKey(store.postTypes, null, norm(row.ID), row));
  }
  for (const row of dataset.forumRoleTypes) {
    tally(upsertByNaturalKey(store.forumRoleTypes, null, norm(row.ID), row));
  }

  // 2. Members (`MJ: Users`, natural key: Email)
  for (const member of dataset.Members) {
    tally(upsertByNaturalKey(store.users, store.usersByEmail, norm(member.Email), member));
  }

  // 3. Community Spaces (natural key: Slug)
  for (const space of dataset.Spaces) {
    tally(upsertByNaturalKey(store.spaces, store.spacesBySlug, norm(space.Slug), space));
  }

  // 4. Space Members (natural key: SpaceID + UserID)
  for (const sm of dataset.SpaceMembers) {
    tally(
      upsertByNaturalKey(
        store.spaceMembers,
        store.spaceMembersByKey,
        `${norm(sm.SpaceID)}:${norm(sm.UserID)}`,
        sm,
      ),
    );
  }

  // 5. Forums & Idea Campaigns (natural key: SpaceID + Slug)
  for (const forum of dataset.Forums) {
    tally(
      upsertByNaturalKey(
        store.forums,
        store.forumsByKey,
        `${norm(forum.SpaceID)}:${norm(forum.Slug)}`,
        forum,
      ),
    );
  }
  for (const campaign of dataset.IdeaCampaigns) {
    tally(upsertByNaturalKey(store.ideaCampaigns, null, norm(campaign.ID), campaign));
  }

  // 6. Forum Members, Member Profiles & Forum Subscriptions
  for (const fm of dataset.ForumMembers) {
    tally(
      upsertByNaturalKey(
        store.forumMembers,
        store.forumMembersByKey,
        `${norm(fm.ForumID)}:${norm(fm.UserID)}`,
        fm,
      ),
    );
  }
  for (const profile of dataset.MemberProfiles) {
    tally(
      upsertByNaturalKey(
        store.memberProfiles,
        store.memberProfilesByKey,
        `${norm(profile.SpaceID)}:${norm(profile.UserID)}`,
        profile,
      ),
    );
  }
  for (const sub of dataset.ForumSubscriptions) {
    tally(
      upsertByNaturalKey(
        store.forumSubscriptions,
        store.forumSubscriptionsByKey,
        `${norm(sub.ForumID)}:${norm(sub.UserID)}`,
        sub,
      ),
    );
  }

  // 7. Topic Tags (natural key: SpaceID + Slug)
  for (const tag of dataset.TopicTags) {
    tally(
      upsertByNaturalKey(
        store.topicTags,
        store.topicTagsByKey,
        `${norm(tag.SpaceID)}:${norm(tag.Slug)}`,
        tag,
      ),
    );
  }

  // 8. Posts in ReplyDepth order (root posts first so FK references always resolve)
  const sortedPosts = [...dataset.Posts].sort((a, b) => (a.ReplyDepth ?? 0) - (b.ReplyDepth ?? 0));
  for (const post of sortedPosts) {
    const naturalKey = post.Slug ? `${norm(post.ForumID)}:slug:${norm(post.Slug)}` : `id:${norm(post.ID)}`;
    // Preserve runtime-mutated SummaryMarkdown / PromotedToSpaceID / LinkedTaskID if already present on store
    const existing = store.posts.get(norm(post.ID));
    const mergedInput = existing
      ? {
          ...post,
          SummaryMarkdown: existing.SummaryMarkdown ?? post.SummaryMarkdown,
          SummaryGeneratedAt: existing.SummaryGeneratedAt ?? post.SummaryGeneratedAt,
          SummaryReplyWatermark: existing.SummaryReplyWatermark || post.SummaryReplyWatermark,
          PromotedToSpaceID: existing.PromotedToSpaceID ?? post.PromotedToSpaceID,
          LinkedTaskID: existing.LinkedTaskID ?? post.LinkedTaskID,
          ReplyCount: Math.max(existing.ReplyCount ?? 0, post.ReplyCount ?? 0),
        }
      : post;
    tally(upsertByNaturalKey(store.posts, store.postsByKey, naturalKey, mergedInput));
  }

  // 9. Post Subtypes
  for (const q of dataset.QuestionPosts) {
    tally(upsertByNaturalKey(store.questionPosts, null, norm(q.ID), q));
  }
  for (const a of dataset.AnswerPosts) {
    tally(upsertByNaturalKey(store.answerPosts, null, norm(a.ID), a));
  }
  for (const idea of dataset.IdeaPosts) {
    tally(upsertByNaturalKey(store.ideaPosts, null, norm(idea.ID), idea));
  }
  for (const c of dataset.CasePosts) {
    tally(upsertByNaturalKey(store.casePosts, null, norm(c.ID), c));
  }
  for (const ama of dataset.AMAPosts) {
    tally(upsertByNaturalKey(store.amaPosts, null, norm(ama.ID), ama));
  }
  for (const inter of dataset.InteractivePosts) {
    tally(upsertByNaturalKey(store.interactivePosts, null, norm(inter.ID), inter));
  }

  // 10. PostTags, Quadratic IdeaAllocations, InteractiveSessions, Reactions, Flags
  for (const pt of dataset.PostTags) {
    tally(
      upsertByNaturalKey(
        store.postTags,
        store.postTagsByKey,
        `${norm(pt.PostID)}:${norm(pt.TopicTagID)}`,
        pt,
      ),
    );
  }
  for (const alloc of dataset.IdeaAllocations) {
    tally(
      upsertByNaturalKey(
        store.ideaAllocations,
        store.ideaAllocationsByKey,
        `${norm(alloc.IdeaPostID)}:${norm(alloc.UserID)}`,
        alloc,
      ),
    );
  }
  // Recompute IdeaPost aggregates from authoritative IdeaAllocation rows
  for (const idea of store.ideaPosts.values()) {
    const rows = Array.from(store.ideaAllocations.values()).filter(
      (a) => norm(a.IdeaPostID) === norm(idea.ID),
    );
    const totalPoints = rows.reduce((sum, r) => sum + r.PointsAllocated, 0);
    const totalVotes = Number(rows.reduce((sum, r) => sum + r.QuadraticVotes, 0).toFixed(4));
    const backerCount = rows.length;
    if (
      idea.TotalPointsAllocated !== totalPoints ||
      idea.EffectiveQuadraticVotes !== totalVotes ||
      idea.UniqueBackerCount !== backerCount
    ) {
      idea.TotalPointsAllocated = totalPoints;
      idea.EffectiveQuadraticVotes = totalVotes;
      idea.UniqueBackerCount = backerCount;
    }
  }

  for (const sess of dataset.InteractiveSessions) {
    tally(
      upsertByNaturalKey(
        store.interactiveSessions,
        store.interactiveSessionsByKey,
        `${norm(sess.InteractivePostID)}:${norm(sess.UserID)}:${sess.AttemptNumber}`,
        sess,
      ),
    );
  }
  for (const rx of dataset.PostReactions) {
    tally(
      upsertByNaturalKey(
        store.postReactions,
        store.postReactionsByKey,
        `${norm(rx.PostID)}:${norm(rx.UserID)}:${norm(rx.ReactionKind)}`,
        rx,
      ),
    );
  }
  for (const flag of dataset.PostFlags) {
    tally(
      upsertByNaturalKey(
        store.postFlags,
        store.postFlagsByKey,
        `${norm(flag.PostID)}:${norm(flag.ReporterUserID)}:${norm(flag.ReasonCategory)}`,
        flag,
      ),
    );
  }

  store.lastLoadedAt = options.now ? new Date(options.now).toISOString() : new Date().toISOString();
  const summary = CountArchWorldStoreRecords(store);

  return {
    store,
    counts: summary.counts,
    totalRecords: summary.totalRecords,
    createdCount: counters.createdCount,
    updatedCount: counters.updatedCount,
    unchangedCount: counters.unchangedCount,
    idempotent: counters.createdCount === 0 && counters.updatedCount === 0,
    loadedAt: store.lastLoadedAt,
  };
}

/**
 * Deliberate no-op teardown for `ARCH-WORLD` (mirroring `bizapps-orders` `ORD-WORLD`).
 * Preserves all seeded AGPA records so smoke tests, Explorer UI checks, and Playwright visual
 * capture can run immediately against the populated world without destructive cleanup.
 */
export function TeardownArchitectAssociationWorld(options = {}) {
  const store = options.store ?? GetSharedArchWorldStore();
  const summary = CountArchWorldStoreRecords(store);
  return {
    preserved: true,
    reason:
      'ARCH-WORLD teardown is deliberately a no-op so the American Guild of Practicing Architects dataset persists for live smoke testing, Explorer exploration, and Playwright visual capture.',
    counts: summary.counts,
    totalRecords: summary.totalRecords,
  };
}

function parseSqlInList(filter, fieldName) {
  const regex = new RegExp(`\\b${fieldName}\\s+IN\\s*\\(([^)]+)\\)`, 'i');
  const match = filter.match(regex);
  if (!match) return null;
  return match[1]
    .split(',')
    .map((part) => part.trim().replace(/^'+|'+$/g, '').toLowerCase())
    .filter(Boolean);
}

function parseSqlEq(filter, fieldName) {
  const regex = new RegExp(`\\b${fieldName}\\s*=\\s*'([^']*)'`, 'i');
  const match = filter.match(regex);
  return match ? match[1].trim().toLowerCase() : null;
}

/**
 * Creates a real-store-backed RunView & Metadata harness for `@mj-biz-apps/community-actions` and
 * `@mj-biz-apps/community-server` services so every action and graduation service reads from and
 * persists back to `store`.
 */
export function CreateArchWorldRuntimeBridge(store, options = {}) {
  const userNameById = new Map(
    Array.from(store.users.values()).map((u) => [norm(u.ID), u.Name]),
  );

  const handleRunView = async (params) => {
    const entityName = params.EntityName;
    const filter = params.ExtraFilter ?? '';

    if (entityName === 'MJ: Users') {
      const ids = parseSqlInList(filter, 'ID');
      let rows = Array.from(store.users.values());
      if (ids) rows = rows.filter((u) => ids.includes(norm(u.ID)));
      return { Success: true, Results: rows.map((u) => ({ ID: u.ID, Name: u.Name, Email: u.Email })) };
    }

    if (entityName === 'MJ_BizApps_Collaboration: Spaces') {
      const idEq = parseSqlEq(filter, 'ID');
      let rows = Array.from(store.spaces.values());
      if (idEq) rows = rows.filter((s) => norm(s.ID) === idEq);
      return {
        Success: true,
        Results: rows.map((s) => ({
          ID: s.ID,
          SpaceTypeID: s.SpaceTypeID,
          ParentID: s.ParentID,
          InheritsMembership: s.InheritsMembership,
          ClosedAt: s.ClosedAt,
          Name: s.Name,
        })),
      };
    }

    if (entityName === 'MJ_BizApps_Collaboration: Space Types') {
      const idEq = parseSqlEq(filter, 'ID');
      const codeEq = parseSqlEq(filter, 'Code');
      let rows = Array.from(store.spaceTypes.values());
      if (idEq) rows = rows.filter((t) => norm(t.ID) === idEq);
      if (codeEq) rows = rows.filter((t) => norm(t.Code) === codeEq);
      return { Success: true, Results: rows };
    }

    if (entityName === 'MJ_BizApps_Collaboration: Space Role Types') {
      const idEq = parseSqlEq(filter, 'ID');
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
      return { Success: true, Results: rows };
    }

    if (entityName === 'MJ_BizApps_Collaboration: Space Members') {
      const userIdEq = parseSqlEq(filter, 'UserID');
      const spaceIdEq = parseSqlEq(filter, 'SpaceID');
      let rows = Array.from(store.spaceMembers.values());
      if (userIdEq) rows = rows.filter((m) => norm(m.UserID) === userIdEq);
      if (spaceIdEq) rows = rows.filter((m) => norm(m.SpaceID) === spaceIdEq);
      return { Success: true, Results: rows };
    }

    if (entityName === 'MJ_BizApps_Community: Forum Role Types') {
      const idEq = parseSqlEq(filter, 'ID');
      let rows = Array.from(store.forumRoleTypes.values());
      if (idEq) rows = rows.filter((r) => norm(r.ID) === idEq);
      return { Success: true, Results: rows };
    }

    if (entityName === 'MJ_BizApps_Community: Post Types') {
      const codeEq = parseSqlEq(filter, 'Code');
      let rows = Array.from(store.postTypes.values());
      if (codeEq) rows = rows.filter((p) => norm(p.Code) === codeEq);
      return { Success: true, Results: rows };
    }

    if (entityName === 'MJ_BizApps_Community: Forum Types') {
      return { Success: true, Results: Array.from(store.forumTypes.values()) };
    }

    if (entityName === 'MJ_BizApps_Community: Forums') {
      const idEq = parseSqlEq(filter, 'ID');
      const idIn = parseSqlInList(filter, 'ID');
      const spaceIdEq = parseSqlEq(filter, 'SpaceID');
      const activeOnly = /Status\s*=\s*'Active'/i.test(filter);
      let rows = Array.from(store.forums.values());
      if (activeOnly) rows = rows.filter((f) => f.Status === 'Active');
      if (idEq) rows = rows.filter((f) => norm(f.ID) === idEq);
      if (idIn) rows = rows.filter((f) => idIn.includes(norm(f.ID)));
      if (spaceIdEq) rows = rows.filter((f) => norm(f.SpaceID) === spaceIdEq);
      return { Success: true, Results: rows };
    }

    if (entityName === 'MJ_BizApps_Community: Forum Members') {
      const forumIdEq = parseSqlEq(filter, 'ForumID');
      const forumIdIn = parseSqlInList(filter, 'ForumID');
      const userIdEq = parseSqlEq(filter, 'UserID');
      const activeOnly = /Status\s*=\s*'Active'/i.test(filter);
      let rows = Array.from(store.forumMembers.values());
      if (forumIdEq) rows = rows.filter((m) => norm(m.ForumID) === forumIdEq);
      if (forumIdIn) rows = rows.filter((m) => forumIdIn.includes(norm(m.ForumID)));
      if (userIdEq) rows = rows.filter((m) => norm(m.UserID) === userIdEq);
      if (activeOnly) rows = rows.filter((m) => m.Status === 'Active');
      return { Success: true, Results: rows };
    }

    if (entityName === 'MJ_BizApps_Community: Community Member Profiles') {
      const userIdEq = parseSqlEq(filter, 'UserID');
      let rows = Array.from(store.memberProfiles.values());
      if (userIdEq) rows = rows.filter((p) => norm(p.UserID) === userIdEq);
      return { Success: true, Results: rows };
    }

    if (entityName === 'MJ_BizApps_Community: Forum Posts') {
      const idEq = parseSqlEq(filter, 'ID');
      const idIn = parseSqlInList(filter, 'ID');
      const rootIdEq = parseSqlEq(filter, 'RootPostID');
      const forumIdIn = parseSqlInList(filter, 'ForumID');
      const authorEq = parseSqlEq(filter, 'AuthorUserID');
      const rootNullOnly = /RootPostID\s+IS\s+NULL/i.test(filter);
      const statusEq = parseSqlEq(filter, 'Status');
      const statusIn = parseSqlInList(filter, 'Status');

      let rows = Array.from(store.posts.values());
      if (idEq) rows = rows.filter((p) => norm(p.ID) === idEq);
      if (idIn) rows = rows.filter((p) => idIn.includes(norm(p.ID)));
      if (rootIdEq) rows = rows.filter((p) => norm(p.RootPostID) === rootIdEq);
      if (forumIdIn) rows = rows.filter((p) => forumIdIn.includes(norm(p.ForumID)));
      if (authorEq) rows = rows.filter((p) => norm(p.AuthorUserID) === authorEq);
      if (rootNullOnly) rows = rows.filter((p) => p.RootPostID === null);
      if (statusEq) rows = rows.filter((p) => norm(p.Status) === statusEq);
      if (statusIn) rows = rows.filter((p) => statusIn.includes(norm(p.Status)));

      return {
        Success: true,
        Results: rows.map((p) => ({
          ...p,
          AuthorUser: userNameById.get(norm(p.AuthorUserID)) ?? p.AuthorUserID,
          __mj_CreatedAt: p.CreatedAt,
        })),
      };
    }

    if (entityName === 'MJ_BizApps_Community: Forum Question Posts') {
      const idIn = parseSqlInList(filter, 'ID');
      const idEq = parseSqlEq(filter, 'ID');
      let rows = Array.from(store.questionPosts.values());
      if (idIn) rows = rows.filter((q) => idIn.includes(norm(q.ID)));
      if (idEq) rows = rows.filter((q) => norm(q.ID) === idEq);
      return { Success: true, Results: rows };
    }

    if (entityName === 'MJ_BizApps_Community: Forum Answer Posts') {
      const idIn = parseSqlInList(filter, 'ID');
      const qIn = parseSqlInList(filter, 'QuestionPostID');
      const acceptedOnly = /IsAcceptedByAuthor\s*=\s*1/i.test(filter);
      let rows = Array.from(store.answerPosts.values());
      if (idIn) rows = rows.filter((a) => idIn.includes(norm(a.ID)));
      if (qIn) rows = rows.filter((a) => qIn.includes(norm(a.QuestionPostID)));
      if (acceptedOnly) rows = rows.filter((a) => Boolean(a.IsAcceptedByAuthor));
      return { Success: true, Results: rows };
    }

    if (entityName === 'MJ_BizApps_Community: Forum Post Tags') {
      const postIdIn = parseSqlInList(filter, 'PostID');
      let rows = Array.from(store.postTags.values());
      if (postIdIn) rows = rows.filter((pt) => postIdIn.includes(norm(pt.PostID)));
      return { Success: true, Results: rows };
    }

    if (entityName === 'MJ_BizApps_Community: Forum Topic Tags') {
      const idIn = parseSqlInList(filter, 'ID');
      let rows = Array.from(store.topicTags.values());
      if (idIn) rows = rows.filter((t) => idIn.includes(norm(t.ID)));
      return { Success: true, Results: rows };
    }

    if (entityName === 'MJ_BizApps_Community: Forum Post Reactions') {
      const userIdEq = parseSqlEq(filter, 'UserID');
      let rows = Array.from(store.postReactions.values());
      if (userIdEq) rows = rows.filter((r) => norm(r.UserID) === userIdEq);
      return { Success: true, Results: rows.map((r) => ({ ...r, __mj_CreatedAt: '2026-11-18T12:00:00.000Z' })) };
    }

    if (entityName === 'MJ: Task Types') {
      return { Success: true, Results: Array.from(store.taskTypes.values()) };
    }

    if (entityName === 'MJ: Tasks') {
      const idEq = parseSqlEq(filter, 'ID');
      let rows = Array.from(store.tasks.values());
      if (idEq) rows = rows.filter((t) => norm(t.ID) === idEq);
      return { Success: true, Results: rows };
    }

    return { Success: true, Results: [] };
  };

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

  const handleGetEntityObject = async (entityName, keyOrUser) => {
    const requestedId = extractIdArg(keyOrUser);

    if (entityName === 'MJ_BizApps_Community: Forum Posts') {
      if (requestedId) {
        const existing = store.posts.get(norm(requestedId));
        if (!existing) return null;
        const wrapper = {
          ...existing,
          Save: async () => {
            store.posts.set(norm(wrapper.ID), { ...existing, ...wrapper });
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
          return true;
        },
        Delete: async () => {
          store.spaces.delete(norm(spaceRecord.ID));
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
          return true;
        },
      };
      return memberRecord;
    }

    return { Save: async () => true };
  };

  return {
    handleRunView,
    handleGetEntityObject,
  };
}

export { ARCH_COMMUNITY_SPACES, ARCH_FORUMS, ARCH_FORUM_TYPES, ARCH_POST_TYPES };
