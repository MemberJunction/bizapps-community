import assert from 'node:assert/strict';
import test from 'node:test';
import {
  Metadata,
  type BaseEnginePropertyConfig,
  type IMetadataProvider,
  type UserInfo,
} from '@memberjunction/core';
import { CommunityEngineBase } from './CommunityEngineBase.ts';
import type { IForumRoleTypeDescriptor, IForumTypeDescriptor, IPostTypeDescriptor } from '@mj-biz-apps/community-entities';

test('@mj-biz-apps/community-engine-base CommunityEngineBase metadata hydration & lookups', () => {
  const engine = CommunityEngineBase.Instance;

  const mockForumTypes: IForumTypeDescriptor[] = [
    {
      ID: 'C8A17100-4E12-4B8F-9A10-100000000001',
      Code: 'general-discussion',
      Name: 'General Discussion',
      Configuration: JSON.stringify({
        Posts: {
          AllowedPostTypeCodes: ['discussion', 'reply', 'comment'],
          DefaultRootPostTypeCode: 'discussion',
          MaxReplyDepth: 5,
        },
        ForumOverridable: ['Posts.MaxReplyDepth'],
      }),
    },
    {
      ID: 'C8A17100-4E12-4B8F-9A10-100000000002',
      Code: 'qa-knowledge-base',
      Name: 'Q&A Knowledge Base',
      ServerDriverClass: 'QAForumServerDriver',
      UIDriverClass: 'QAForumUIDriver',
    },
  ];

  const mockPostTypes: IPostTypeDescriptor[] = [
    {
      ID: 'C8A17200-4E12-4B8F-9A10-100000000001',
      Code: 'discussion',
      Name: 'Discussion',
      PlacementRule: 'Root Only',
    },
    {
      ID: 'C8A17200-4E12-4B8F-9A10-100000000002',
      Code: 'reply',
      Name: 'Reply',
      PlacementRule: 'Reply Only',
    },
  ];

  const mockRoleTypes: IForumRoleTypeDescriptor[] = [
    {
      ID: 'C8A17300-4E12-4B8F-9A10-100000000001',
      Code: 'forum-admin',
      Name: 'Forum Admin',
      Level: 1000,
    },
  ];

  engine.HydrateMetadata({
    forumTypes: mockForumTypes,
    postTypes: mockPostTypes,
    forumRoleTypes: mockRoleTypes,
    appSettings: {
      AskFirstEnabled: true,
      Synthesis: {
        AutoSummarizeThreshold: 5,
        AskFirstDeflection: true,
        DeflectionMinConfidence: 0.8,
      },
    },
  });

  // O(1) Lookups by ID (case-insensitive)
  const ftById = engine.GetForumTypeById('c8a17100-4e12-4b8f-9a10-100000000001');
  assert.equal(ftById?.Code, 'general-discussion');

  // O(1) Lookups by Code
  const ftByCode = engine.GetForumTypeByCode('qa-knowledge-base');
  assert.equal(ftByCode?.ServerDriverClass, 'QAForumServerDriver');

  const ptById = engine.GetPostTypeById('C8A17200-4E12-4B8F-9A10-100000000001');
  assert.equal(ptById?.Code, 'discussion');

  const ptByCode = engine.GetPostTypeByCode('reply');
  assert.equal(ptByCode?.PlacementRule, 'Reply Only');

  const rtById = engine.GetForumRoleTypeById('c8a17300-4e12-4b8f-9a10-100000000001');
  assert.equal(rtById?.Code, 'forum-admin');

  const rtByCode = engine.GetForumRoleTypeByCode('forum-admin');
  assert.equal(rtByCode?.Level, 1000);

  // Lists
  assert.equal(engine.GetAllForumTypes().length, 2);
  assert.equal(engine.GetAllPostTypes().length, 2);
  assert.equal(engine.GetAllForumRoleTypes().length, 1);

  // 4-tier configuration resolution
  const resolved = engine.ResolveForumConfiguration({
    ForumTypeID: 'c8a17100-4e12-4b8f-9a10-100000000001',
    Configuration: JSON.stringify({
      Posts: {
        MaxReplyDepth: 2,
        AllowedPostTypeCodes: ['discussion'], // unauthorized override
      },
    }),
  });

  assert.equal(resolved.AskFirstEnabled, true);
  assert.equal(resolved.ThreadSynthesisThreshold, 5);
  assert.equal(resolved.Posts.MaxReplyDepth, 2); // whitelisted override applied
  // unauthorized override rejected:
  assert.deepEqual(resolved.Posts.AllowedPostTypeCodes, ['discussion', 'reply', 'comment']);
});

test('@mj-biz-apps/community-engine-base CommunityEngineBase is a BaseEngine<T> singleton with O(1) caches that invalidate on reload', () => {
  const engine = CommunityEngineBase.Instance;
  assert.equal(engine, CommunityEngineBase.Instance, 'Instance must return the same process-wide singleton');

  engine.HydrateMetadata({
    forumTypes: [
      { ID: 'TYPE-1', Code: 'alpha', Name: 'Alpha' } as IForumTypeDescriptor,
    ],
    postTypes: [],
    forumRoleTypes: [],
  });
  assert.equal(engine.GetForumTypeByCode('alpha')?.ID, 'TYPE-1');
  assert.equal(engine.GetForumTypeByCode('beta'), undefined);

  // A re-hydration (simulating a reload) must invalidate the memoized Map so a newly
  // added row is immediately visible without a process restart.
  engine.HydrateMetadata({
    forumTypes: [
      { ID: 'TYPE-1', Code: 'alpha', Name: 'Alpha' } as IForumTypeDescriptor,
      { ID: 'TYPE-2', Code: 'beta', Name: 'Beta' } as IForumTypeDescriptor,
    ],
    postTypes: [],
    forumRoleTypes: [],
  });
  assert.equal(engine.GetForumTypeByCode('beta')?.ID, 'TYPE-2');
  assert.equal(engine.GetAllForumTypes().length, 2);
});

test('@mj-biz-apps/community-engine-base CommunityEngineBase.ResolveConfiguration applies the full ForumType -> Space -> Forum -> PostType cascade', () => {
  const engine = CommunityEngineBase.Instance;

  const forumType: IForumTypeDescriptor = {
    ID: 'TYPE-CASCADE',
    Code: 'cascade-type',
    Name: 'Cascade Type',
    Configuration: JSON.stringify({
      ForumOverridable: ['Posts.MaxReplyDepth'],
      Posts: { MaxReplyDepth: 2 },
    }),
  } as IForumTypeDescriptor;

  engine.HydrateMetadata({
    forumTypes: [forumType],
    postTypes: [],
    forumRoleTypes: [],
  });

  const resolved = engine.ResolveConfiguration({
    forum: {
      ForumTypeID: 'TYPE-CASCADE',
      Configuration: JSON.stringify({ Posts: { MaxReplyDepth: 5 } }),
    },
    space: { Configuration: JSON.stringify({ Posts: { MaxReplyDepth: 3 } }) },
    postType: { Configuration: JSON.stringify({ Posts: { MaxReplyDepth: 9 } }) },
  });

  // PostType is the most specific whitelisted tier and wins the tie over Forum, Space, and ForumType.
  assert.equal(resolved.Posts.MaxReplyDepth, 9);

  // Without a PostType tier, Forum (whitelisted) wins over Space and ForumType.
  const withoutPostType = engine.ResolveConfiguration({
    forum: {
      ForumTypeID: 'TYPE-CASCADE',
      Configuration: JSON.stringify({ Posts: { MaxReplyDepth: 5 } }),
    },
    space: { Configuration: JSON.stringify({ Posts: { MaxReplyDepth: 3 } }) },
  });
  assert.equal(withoutPostType.Posts.MaxReplyDepth, 5);

  // Without Forum or PostType tiers, Space (unconditional, like ForumType) wins over ForumType.
  const spaceOnly = engine.ResolveConfiguration({
    forum: { ForumTypeID: 'TYPE-CASCADE', Configuration: null },
    space: { Configuration: JSON.stringify({ Posts: { MaxReplyDepth: 3 } }) },
  });
  assert.equal(spaceOnly.Posts.MaxReplyDepth, 3);
});

test('@mj-biz-apps/community-engine-base CommunityEngineBase loads Application Settings (the CommunitySettings row) and feeds ResolveConfiguration\'s broadest tier', () => {
  const engine = CommunityEngineBase.Instance;

  engine.HydrateMetadata({
    forumTypes: [{ ID: 'TYPE-APPSETTINGS', Code: 'appsettings-type', Name: 'AppSettings Type' } as IForumTypeDescriptor],
    postTypes: [],
    forumRoleTypes: [],
    applicationSettingsRows: [
      { Name: 'SomeOtherAppsSettings', Value: JSON.stringify({ AskFirstEnabled: false }) },
      { Name: 'CommunitySettings', Value: JSON.stringify({ DefaultDigestCadence: 'Weekly Digest' }) },
    ],
  });

  const resolved = engine.ResolveConfiguration({ forum: { ForumTypeID: 'TYPE-APPSETTINGS', Configuration: null } });
  // The CommunitySettings row (not SomeOtherAppsSettings) was parsed into _appSettings and flows
  // through, since nothing more specific overrides DefaultDigestCadence here.
  assert.equal(resolved.DefaultDigestCadence, 'Weekly Digest');
});

test('@mj-biz-apps/community-engine-base CommunityEngineBase tolerates a missing or malformed CommunitySettings row without throwing', () => {
  const engine = CommunityEngineBase.Instance;

  engine.HydrateMetadata({
    forumTypes: [{ ID: 'TYPE-NOAPPSETTINGS', Code: 'no-appsettings-type', Name: 'No AppSettings' } as IForumTypeDescriptor],
    postTypes: [],
    forumRoleTypes: [],
    applicationSettingsRows: [{ Name: 'CommunitySettings', Value: '{not valid json' }],
  });

  assert.doesNotThrow(() =>
    engine.ResolveConfiguration({ forum: { ForumTypeID: 'TYPE-NOAPPSETTINGS', Configuration: null } }),
  );
});

// NOTE: these 3 tests exercise `refreshAppSettingsFromApplicationSettings()` — the exact logic
// `Config()` -> `AdditionalLoading()` runs against whatever `Config()`'s real `Load()` fetched —
// via `HydrateMetadata`'s `applicationSettingsRows` path rather than a live/fake `IMetadataProvider`.
// `Config()` itself calls `BaseEngine.Load()`, which requires a reasonably complete
// `IMetadataProvider` (RunView, SetProvider, ResolveContextUser, telemetry, …) to exercise for
// real; building a correct fake of that full interface is its own substantial effort, so the
// provider-backed wiring itself is left to integration testing against a live database (same
// constraint already documented for `fnCommunityForumAccess` and `ApplyCanonPromotion`/
// `GraduateThreadToSpace` in this package's siblings) — what IS fully covered here is the
// ApplicationID-scoping and reset-on-reload LOGIC itself.

test('@mj-biz-apps/community-engine-base CommunityEngineBase scopes CommunitySettings to the Community ApplicationID — a competing app\'s same-named row is ignored', () => {
  const engine = CommunityEngineBase.Instance;
  const COMPETING_APP_ID = 'DEADBEEF-0000-4000-8000-000000000099';

  engine.HydrateMetadata({
    forumTypes: [{ ID: 'TYPE-SCOPED', Code: 'scoped-type', Name: 'Scoped Type' } as IForumTypeDescriptor],
    postTypes: [],
    forumRoleTypes: [],
    applicationSettingsRows: [
      {
        Name: 'CommunitySettings',
        ApplicationID: COMPETING_APP_ID,
        Value: JSON.stringify({ DefaultDigestCadence: 'Highlights Only' }),
      },
    ],
  });

  const resolved = engine.ResolveConfiguration({ forum: { ForumTypeID: 'TYPE-SCOPED', Configuration: null } });
  // The competing app's row must NOT have been applied — DefaultDigestCadence stays at the code default.
  assert.notEqual(resolved.DefaultDigestCadence, 'Highlights Only');
});

test('@mj-biz-apps/community-engine-base CommunityEngineBase applies a CommunitySettings row scoped to the real Community ApplicationID (or left NULL/global)', () => {
  const engine = CommunityEngineBase.Instance;

  engine.HydrateMetadata({
    forumTypes: [{ ID: 'TYPE-SCOPED-2', Code: 'scoped-type-2', Name: 'Scoped Type 2' } as IForumTypeDescriptor],
    postTypes: [],
    forumRoleTypes: [],
    applicationSettingsRows: [
      {
        Name: 'CommunitySettings',
        ApplicationID: CommunityEngineBase.COMMUNITY_APPLICATION_ID,
        Value: JSON.stringify({ DefaultDigestCadence: 'Daily Digest' }),
      },
    ],
  });

  const resolved = engine.ResolveConfiguration({ forum: { ForumTypeID: 'TYPE-SCOPED-2', Configuration: null } });
  assert.equal(resolved.DefaultDigestCadence, 'Daily Digest');
});

test('@mj-biz-apps/community-engine-base CommunityEngineBase resets _appSettings on reload when the CommunitySettings row is removed (never stale)', () => {
  const engine = CommunityEngineBase.Instance;
  const forumType = { ID: 'TYPE-RESET', Code: 'reset-type', Name: 'Reset Type' } as IForumTypeDescriptor;

  engine.HydrateMetadata({
    forumTypes: [forumType],
    postTypes: [],
    forumRoleTypes: [],
    applicationSettingsRows: [{ Name: 'CommunitySettings', Value: JSON.stringify({ DefaultDigestCadence: 'Weekly Digest' }) }],
  });
  const withSettings = engine.ResolveConfiguration({ forum: { ForumTypeID: 'TYPE-RESET', Configuration: null } });
  assert.equal(withSettings.DefaultDigestCadence, 'Weekly Digest');

  // Reload with the row gone entirely — must reset to the code default, not retain 'Weekly Digest'.
  engine.HydrateMetadata({
    forumTypes: [forumType],
    postTypes: [],
    forumRoleTypes: [],
    applicationSettingsRows: [],
  });
  const afterRemoval = engine.ResolveConfiguration({ forum: { ForumTypeID: 'TYPE-RESET', Configuration: null } });
  assert.notEqual(afterRemoval.DefaultDigestCadence, 'Weekly Digest');
});

test('@mj-biz-apps/community-engine-base CommunityEngineBase impersonation safety: ProviderToUse follows active provider and auto-evicts user caches on userId switch', async () => {
  const engine = CommunityEngineBase.Instance;

  const userA = { ID: '11111111-1111-4111-8111-111111111111', Name: 'Alice' } as UserInfo;
  const userB = { ID: '22222222-2222-4222-8222-222222222222', Name: 'Bob' } as UserInfo;

  const makeMockEntity = (name: string, opts: { canRead: boolean; hasRls?: boolean }) => ({
    Name: name,
    TrustServerCacheCompletely: !opts.hasRls,
    Permissions: opts.hasRls ? [{ ReadRLSFilterID: 'rls-1' }] : [],
    GetUserPermisions: (_u: UserInfo) => ({ CanRead: opts.canRead }),
  });

  const capturedConfigs: Array<Array<Partial<BaseEnginePropertyConfig>>> = [];
  const capturedForceFlags: boolean[] = [];

  const providerA = {
    CurrentUser: userA,
    Entities: [
      makeMockEntity('MJ_BizApps_Community: Forum Types', { canRead: true, hasRls: false }),
      makeMockEntity('MJ_BizApps_Community: Post Types', { canRead: true, hasRls: true }),
      makeMockEntity('MJ_BizApps_Community: Forum Role Types', { canRead: true, hasRls: false }),
      makeMockEntity('MJ: Application Settings', { canRead: true, hasRls: false }),
    ],
    EntityByName(name: string) {
      return this.Entities.find((e) => e.Name === name);
    },
  } as IMetadataProvider;

  const providerB = {
    CurrentUser: userB,
    Entities: [
      makeMockEntity('MJ_BizApps_Community: Forum Types', { canRead: true, hasRls: false }),
      makeMockEntity('MJ_BizApps_Community: Post Types', { canRead: true, hasRls: false }),
      makeMockEntity('MJ_BizApps_Community: Forum Role Types', { canRead: true, hasRls: false }),
      makeMockEntity('MJ: Application Settings', { canRead: false, hasRls: false }),
    ],
    EntityByName(name: string) {
      return this.Entities.find((e) => e.Name === name);
    },
  } as IMetadataProvider;

  type LoadOverrideFn = (
    configs: Array<Partial<BaseEnginePropertyConfig>>,
    provider?: IMetadataProvider,
    forceRefresh?: boolean,
    contextUser?: UserInfo,
  ) => Promise<void>;
  interface EngineWithLoad {
    Load: LoadOverrideFn;
  }
  const engineWithLoad = engine as object as EngineWithLoad;
  const originalLoad = engineWithLoad.Load;
  const originalGlobalProvider = Metadata.Provider;
  try {
    engineWithLoad.Load = async (configs, _p, forceRefresh) => {
      capturedConfigs.push(configs);
      capturedForceFlags.push(Boolean(forceRefresh));
    };

    // 1. Load under providerA / userA
    await engine.Config(false, userA, providerA);
    assert.equal(engine.ProviderToUse, providerA, 'ProviderToUse must follow explicit providerA');
    assert.equal(engine.ActiveUserId, userA.ID.toLowerCase());
    assert.equal(capturedConfigs.length, 1);
    assert.equal(capturedConfigs[0].length, 4, 'All 4 metadata entities should load when CanRead=true');
    assert.equal(
      capturedConfigs[0].every((c) => c.AutoRefresh === true),
      true,
      'Every BaseEnginePropertyConfig must set AutoRefresh: true',
    );
    const postTypesCfg = capturedConfigs[0].find((c) => c.PropertyName === '_postTypes');
    assert.equal(postTypesCfg?.CacheLocal, false, 'RLS-filtered entity must set CacheLocal: false');
    const forumTypesCfg = capturedConfigs[0].find((c) => c.PropertyName === '_forumTypes');
    assert.equal(forumTypesCfg?.CacheLocal, true, 'Non-RLS taxonomy entity may set CacheLocal: true');

    // Populate userA's bounded space container cache
    const spaceId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    engine.SetCachedSpaceForums(
      spaceId,
      [
        {
          ID: 'f1',
          SpaceID: spaceId,
          ParentForumID: null,
          ForumTypeID: 'ft1',
          Slug: 'general',
          Name: 'General',
          Description: null,
          Icon: null,
          ColorHex: null,
          VisibilityBand: 'Shared',
          AnonymousReadMode: null,
          InheritsSpaceMembers: true,
          PostingPolicy: 'Open',
          InboundEmailAlias: null,
          Sequence: 1,
          Status: 'Active',
          Configuration: null,
        },
      ],
      userA,
    );
    assert.equal(engine.GetCachedSpaceForums(spaceId, userA)?.length, 1);

    // 2. Switch to providerB / userB (impersonation) — where Application Settings has CanRead=false
    await engine.Config(false, userB, providerB);
    assert.equal(engine.ProviderToUse, providerB, 'ProviderToUse must switch immediately to providerB');
    assert.equal(engine.ActiveUserId, userB.ID.toLowerCase());
    assert.equal(capturedForceFlags[1], true, 'Provider/user switch must force refresh');
    assert.equal(
      capturedConfigs[1].some((c) => c.PropertyName === '_applicationSettings'),
      false,
      'Optional MJ: Application Settings must be gated off when CanRead=false',
    );
    assert.equal(
      engine.GetCachedSpaceForums(spaceId, userB),
      undefined,
      'User-scoped space forums cache must auto-evict on userId change',
    );

    // 3. Explicit InvalidateSpace and following Metadata.Provider when provider arg omitted
    engine.SetCachedSpaceForums(spaceId, [], userB);
    assert.deepEqual(engine.GetCachedSpaceForums(spaceId, userB), []);
    engine.InvalidateSpace(spaceId);
    assert.equal(engine.GetCachedSpaceForums(spaceId, userB), undefined);

    Metadata.Provider = providerA;
    await engine.Config(false, userA);
    assert.equal(engine.ProviderToUse, providerA, 'ProviderToUse must follow Metadata.Provider when explicit provider is omitted');
  } finally {
    engineWithLoad.Load = originalLoad;
    Metadata.Provider = originalGlobalProvider;
    engine.ClearUserCaches();
  }
});
