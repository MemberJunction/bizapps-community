import {
  BaseEngine,
  Metadata,
  type BaseEnginePropertyConfig,
  type BaseEntityEvent,
  type IMetadataProvider,
  type UserInfo,
} from '@memberjunction/core';
import { UUIDsEqual } from '@memberjunction/global';
import type { MJApplicationSettingEntity } from '@memberjunction/core-entities';
import {
  CommunityConfigurationResolver,
  type CommunityConfiguration,
} from '@mj-biz-apps/community-core';
import {
  COMMUNITY_ENTITY_NAMES,
  ForumSubtypeDirectory,
  PostSubtypeDirectory,
  type IForumRoleTypeDescriptor,
  type IForumSummary,
  type IForumTypeDescriptor,
  type IPostTypeDescriptor,
} from '@mj-biz-apps/community-entities';

const normalizeKey = (key: string | null | undefined): string => (key ?? '').trim().toLowerCase();

/** Maximum number of distinct Space forum directories retained in the bounded user-scoped container cache. */
const MAX_CACHED_SPACE_CONTAINERS = 20;

interface SpaceIdCarrier {
  SpaceID?: string | null;
}

/**
 * Browser-safe process-wide singleton metadata cache for BizApps Community (`ForumType`, `PostType`, `ForumRoleType`)
 * and 4-tier configuration cascade resolution.
 *
 * Follows the BizApps 5-rule performance standard:
 * 1. `BaseEngine<T>` (`BaseSingleton`) for bounded reference/taxonomy metadata (`AutoRefresh: true`).
 * 2. Multi-provider & impersonation safety: `ProviderToUse` follows the active provider passed to `Config()`
 *    or `Metadata.Provider`, auto-evicts user-scoped caches on `userId` change, sets `CacheLocal: false`
 *    on any RLS-filtered entity, and gates optional queries on `EntityInfo.GetUserPermisions(user)?.CanRead`.
 * 3. O(1) lookup maps invalidated on reload in `AdditionalLoading()`.
 * 4. Bounded per-space container cache (`GetCachedSpaceForums`/`SetCachedSpaceForums`) with `BaseEntity`
 *    event invalidation, explicit `InvalidateSpace()`/`ClearUserCaches()`, and persona-switch eviction.
 */
export class CommunityEngineBase extends BaseEngine<CommunityEngineBase> {
  private _forumTypes: IForumTypeDescriptor[] = [];
  private _postTypes: IPostTypeDescriptor[] = [];
  private _forumRoleTypes: IForumRoleTypeDescriptor[] = [];
  private _applicationSettings: Array<Pick<MJApplicationSettingEntity, 'Name' | 'Value' | 'ApplicationID'>> = [];
  private _appSettings: Partial<CommunityConfiguration> = {};

  /** Explicit provider passed to the most recent `Config(..., provider)` call, or `null` to follow `Metadata.Provider`. */
  private _activeProvider: IMetadataProvider | null = null;
  /** Provider instance used during the last completed `Config()` load so provider switches force a refresh. */
  private _lastLoadedProvider: IMetadataProvider | null = null;
  /** Normalized user ID that owns the current user-scoped container cache entries. */
  private _lastContextUserId: string | null = null;

  /**
   * Bounded user-scoped container cache (`ConversationEngine`-style): maps normalized `spaceId`
   * to that Space's visible `IForumSummary[]` window. Never caches global unbounded transactional
   * tables; evicted automatically on `userId` switch and on `Forums` `BaseEntity` save/delete events.
   */
  private _spaceForumsCache = new Map<string, ReadonlyArray<IForumSummary>>();

  /** `MJ: Application Settings.Name` this engine reads its `CommunityConfiguration` JSON from. */
  public static readonly APPLICATION_SETTINGS_NAME = 'CommunitySettings';

  /** `metadata/applications/.applications.json`'s "Community" Application ID — scopes the `CommunitySettings` lookup so another app's same-named row is never applied here. */
  public static readonly COMMUNITY_APPLICATION_ID = 'C8A17000-4E12-4B8F-9A10-100000000001';

  // O(1) memoized lookup indexes, reset on reload in AdditionalLoading()
  private _forumTypesById: Map<string, IForumTypeDescriptor> | null = null;
  private _forumTypesByCode: Map<string, IForumTypeDescriptor> | null = null;
  private _postTypesById: Map<string, IPostTypeDescriptor> | null = null;
  private _postTypesByCode: Map<string, IPostTypeDescriptor> | null = null;
  private _forumRoleTypesById: Map<string, IForumRoleTypeDescriptor> | null = null;
  private _forumRoleTypesByCode: Map<string, IForumRoleTypeDescriptor> | null = null;

  public static get Instance(): CommunityEngineBase {
    return super.getInstance<CommunityEngineBase>();
  }

  /**
   * Impersonation-safe / multi-provider override: follows the explicit provider passed to the most
   * recent `Config()` call, or `Metadata.Provider` when no explicit provider is pinned — never
   * remaining stuck on an earlier provider after an impersonation switch or reconnect.
   */
  public override get ProviderToUse(): IMetadataProvider {
    return this._activeProvider ?? Metadata.Provider ?? super.ProviderToUse;
  }

  /** The normalized user ID currently associated with user-scoped caches, or `null` if none. */
  public get ActiveUserId(): string | null {
    return this._lastContextUserId;
  }

  /**
   * Ensures user-scoped caches belong to `userId`. If the active user changed (e.g., persona switch
   * or impersonation), evicts all user-scoped caches immediately and returns `true`.
   */
  public EnsureUserCacheContext(userId: string | null | undefined): boolean {
    const normalized = normalizeKey(userId);
    const nextUserId = normalized.length > 0 ? normalized : null;
    if (this._lastContextUserId !== nextUserId) {
      this.ClearUserCaches();
      this._lastContextUserId = nextUserId;
      return true;
    }
    return false;
  }

  /** Explicitly clears all user-scoped / bounded container caches. */
  public ClearUserCaches(): void {
    this._spaceForumsCache.clear();
  }

  /** Explicitly invalidates the bounded container cache for a single Space. */
  public InvalidateSpace(spaceId: string): void {
    const key = normalizeKey(spaceId);
    if (key) {
      this._spaceForumsCache.delete(key);
    }
  }

  /**
   * Reads a Space's cached forum directory window for the active user. Auto-evicts if the active
   * user changed since the cache was populated.
   */
  public GetCachedSpaceForums(
    spaceId: string,
    contextUser?: UserInfo | null,
  ): ReadonlyArray<IForumSummary> | undefined {
    const effectiveUserId = contextUser?.ID ?? this.ProviderToUse?.CurrentUser?.ID ?? null;
    if (this.EnsureUserCacheContext(effectiveUserId)) {
      return undefined;
    }
    const key = normalizeKey(spaceId);
    if (!key) return undefined;
    return this._spaceForumsCache.get(key);
  }

  /**
   * Stores a bounded Space forum directory window for the active user, evicting oldest entries
   * past {@link MAX_CACHED_SPACE_CONTAINERS} and clearing prior user entries on user switch.
   */
  public SetCachedSpaceForums(
    spaceId: string,
    forums: ReadonlyArray<IForumSummary>,
    contextUser?: UserInfo | null,
  ): void {
    const effectiveUserId = contextUser?.ID ?? this.ProviderToUse?.CurrentUser?.ID ?? null;
    this.EnsureUserCacheContext(effectiveUserId);
    const key = normalizeKey(spaceId);
    if (!key) return;
    // Refresh insertion order for FIFO/LRU-style eviction
    this._spaceForumsCache.delete(key);
    this._spaceForumsCache.set(key, [...forums]);
    while (this._spaceForumsCache.size > MAX_CACHED_SPACE_CONTAINERS) {
      const oldestKey = this._spaceForumsCache.keys().next().value;
      if (oldestKey !== undefined) {
        this._spaceForumsCache.delete(oldestKey);
      } else {
        break;
      }
    }
  }

  /** Checks `EntityInfo.GetUserPermisions(user)?.CanRead` before querying an entity. */
  private canReadEntity(
    md: IMetadataProvider | null | undefined,
    entityName: string,
    user: UserInfo | undefined,
    isOptional: boolean,
  ): boolean {
    if (!md || typeof md.EntityByName !== 'function') {
      return true;
    }
    const entityInfo = md.EntityByName(entityName);
    if (!entityInfo) {
      // Skip optional entities when the provider's metadata catalog is populated but omits them.
      if (isOptional && Array.isArray(md.Entities) && md.Entities.length > 0) {
        return false;
      }
      return true;
    }
    if (!user || typeof entityInfo.GetUserPermisions !== 'function') {
      return true;
    }
    return entityInfo.GetUserPermisions(user)?.CanRead === true;
  }

  /** Returns `false` for any RLS-filtered or untrusted-cache entity (`CacheLocal: false`). */
  private isCacheLocalSafe(md: IMetadataProvider | null | undefined, entityName: string): boolean {
    if (!md || typeof md.EntityByName !== 'function') {
      return true;
    }
    const entityInfo = md.EntityByName(entityName);
    if (!entityInfo) {
      return true;
    }
    if (entityInfo.TrustServerCacheCompletely === false) {
      return false;
    }
    if (Array.isArray(entityInfo.Permissions) && entityInfo.Permissions.some((p) => Boolean(p.ReadRLSFilterID))) {
      return false;
    }
    return true;
  }

  public async Config(
    forceRefresh?: boolean,
    contextUser?: UserInfo,
    provider?: IMetadataProvider,
  ): Promise<void> {
    this._activeProvider = provider ?? null;
    const md = provider ?? Metadata.Provider;
    const effectiveUser = contextUser ?? md?.CurrentUser;

    const userChanged = this.EnsureUserCacheContext(effectiveUser?.ID ?? null);
    const providerChanged = Boolean(this._lastLoadedProvider && md && this._lastLoadedProvider !== md);
    const effectiveForceRefresh = Boolean(forceRefresh) || providerChanged || userChanged;

    const params: Array<Partial<BaseEnginePropertyConfig>> = [];

    const coreConfigs: Array<{ PropertyName: string; EntityName: string; Optional: boolean }> = [
      { PropertyName: '_forumTypes', EntityName: COMMUNITY_ENTITY_NAMES.ForumTypes, Optional: false },
      { PropertyName: '_postTypes', EntityName: COMMUNITY_ENTITY_NAMES.PostTypes, Optional: false },
      { PropertyName: '_forumRoleTypes', EntityName: COMMUNITY_ENTITY_NAMES.ForumRoleTypes, Optional: false },
      { PropertyName: '_applicationSettings', EntityName: 'MJ: Application Settings', Optional: true },
    ];

    for (const cfg of coreConfigs) {
      if (this.canReadEntity(md, cfg.EntityName, effectiveUser, cfg.Optional)) {
        params.push({
          PropertyName: cfg.PropertyName,
          EntityName: cfg.EntityName,
          AutoRefresh: true,
          CacheLocal: this.isCacheLocalSafe(md, cfg.EntityName),
        });
      } else if (cfg.PropertyName === '_applicationSettings') {
        // Clear any prior privileged user's settings when current user lacks read permission.
        this._applicationSettings = [];
        this._appSettings = {};
      }
    }

    this._lastLoadedProvider = md ?? null;
    if (params.length === 0) {
      await this.AdditionalLoading(effectiveUser);
      return;
    }
    return await this.Load(params, md, effectiveForceRefresh, effectiveUser);
  }

  protected override async HandleIndividualBaseEntityEvent(event: BaseEntityEvent): Promise<boolean> {
    if (event.type === 'save' || event.type === 'delete') {
      const entityName = event.baseEntity?.EntityInfo?.Name?.trim().toLowerCase();
      if (entityName === COMMUNITY_ENTITY_NAMES.Forums.toLowerCase()) {
        const carrier = event.baseEntity as SpaceIdCarrier;
        if (typeof carrier.SpaceID === 'string' && carrier.SpaceID.trim().length > 0) {
          this.InvalidateSpace(carrier.SpaceID);
        } else {
          this.ClearUserCaches();
        }
      }
    }
    return await super.HandleIndividualBaseEntityEvent(event);
  }

  protected override async AdditionalLoading(_contextUser?: UserInfo): Promise<void> {
    // Invalidate memoized lookup indexes on initial load and any reload
    this._forumTypesById = null;
    this._forumTypesByCode = null;
    this._postTypesById = null;
    this._postTypesByCode = null;
    this._forumRoleTypesById = null;
    this._forumRoleTypesByCode = null;

    // The subtype each type names, for the Forum/Post subtype resolvers: they answer a load's hint
    // from memory, never by a read.
    ForumSubtypeDirectory.Instance.Replace(
      this.ForumTypes.map((type) => ({ ID: type.ID, ExtensionEntity: type.ExtensionEntity })),
    );
    PostSubtypeDirectory.Instance.Replace(
      this.PostTypes.map((type) => ({ ID: type.ID, ExtensionEntity: type.ExtensionEntity })),
    );

    this.refreshAppSettingsFromApplicationSettings();
  }

  /** Parses the `CommunitySettings` row's `Value` JSON (from `_applicationSettings`, loaded by
   * `Config()`) into `_appSettings`, feeding `ResolveConfiguration`'s broadest tier. Scoped to
   * `COMMUNITY_APPLICATION_ID`: a row with a NULL `ApplicationID` is treated as global/unscoped and
   * still applies, but a row naming a DIFFERENT application's ID is skipped — another app's
   * same-named `CommunitySettings` row is never applied here. Always resets `_appSettings` to `{}`
   * first, so a reload after the row was removed (or came back empty/malformed) never leaves a
   * stale value from a prior load. */
  private refreshAppSettingsFromApplicationSettings(): void {
    this._appSettings = {};

    const settingsRow = this.GetConfigData<Pick<MJApplicationSettingEntity, 'Name' | 'Value' | 'ApplicationID'>>(
      '_applicationSettings',
    ).find(
      (s) =>
        s.Name === CommunityEngineBase.APPLICATION_SETTINGS_NAME &&
        (s.ApplicationID == null || UUIDsEqual(s.ApplicationID, CommunityEngineBase.COMMUNITY_APPLICATION_ID)),
    );
    if (!settingsRow?.Value) {
      return;
    }
    try {
      this._appSettings = CommunityConfigurationResolver.ParseConfigurationJSON(settingsRow.Value);
    } catch {
      // A malformed CommunitySettings row falls back to the {} reset above (the code defaults,
      // via DEFAULT_COMMUNITY_CONFIGURATION in the cascade) rather than throwing out of a load.
    }
  }

  /**
   * Manual metadata seeding for unit tests and other synchronous bootstrap paths that do not have a
   * live `IMetadataProvider` to run `Config()` against. Populates the same fields `Config()`/`Load()`
   * would, then rebuilds the O(1) caches and subtype directories exactly as a real reload would.
   *
   * `applicationSettingsRows`, when given, exercises the SAME `MJ: Application Settings` parsing
   * path `Config()`'s real `_applicationSettings` load feeds — the row named `CommunitySettings`
   * wins (scoped to `COMMUNITY_APPLICATION_ID`), matching `refreshAppSettingsFromApplicationSettings()`,
   * which always resets `_appSettings` to `{}` first so a removed/absent row is never stale.
   * `appSettings` sets `_appSettings` directly (a pre-parsed `CommunityConfiguration` partial) —
   * applied LAST, after that reset-and-reparse, so an explicit `appSettings` always wins over
   * whatever `applicationSettingsRows` resolved to (or didn't).
   */
  public HydrateMetadata(params: {
    forumTypes: ReadonlyArray<IForumTypeDescriptor>;
    postTypes: ReadonlyArray<IPostTypeDescriptor>;
    forumRoleTypes?: ReadonlyArray<IForumRoleTypeDescriptor>;
    appSettings?: Partial<CommunityConfiguration>;
    applicationSettingsRows?: ReadonlyArray<Pick<MJApplicationSettingEntity, 'Name' | 'Value' | 'ApplicationID'>>;
  }): void {
    this._forumTypes = [...params.forumTypes];
    this._postTypes = [...params.postTypes];
    this._forumRoleTypes = [...(params.forumRoleTypes ?? [])];
    this._applicationSettings = [...(params.applicationSettingsRows ?? [])];

    // AdditionalLoading has no awaits: its body completes synchronously before this returns.
    // Runs refreshAppSettingsFromApplicationSettings(), which resets+reparses _appSettings from
    // _applicationSettings above.
    void this.AdditionalLoading();

    if (params.appSettings) {
      this._appSettings = params.appSettings;
    }
  }

  // ─── Collections ───────────────────────────────────────────────────────────

  public get ForumTypes(): IForumTypeDescriptor[] {
    return this.GetConfigData<IForumTypeDescriptor>('_forumTypes');
  }

  public get PostTypes(): IPostTypeDescriptor[] {
    return this.GetConfigData<IPostTypeDescriptor>('_postTypes');
  }

  public get ForumRoleTypes(): IForumRoleTypeDescriptor[] {
    return this.GetConfigData<IForumRoleTypeDescriptor>('_forumRoleTypes');
  }

  // ─── Lookups by ID and Code ────────────────────────────────────────────────

  private ensureForumTypeMaps(): void {
    if (!this._forumTypesById || !this._forumTypesByCode) {
      const byId = new Map<string, IForumTypeDescriptor>();
      const byCode = new Map<string, IForumTypeDescriptor>();
      for (const t of this.ForumTypes) {
        if (t.ID) byId.set(normalizeKey(t.ID), t);
        if (t.Code) byCode.set(normalizeKey(t.Code), t);
      }
      this._forumTypesById = byId;
      this._forumTypesByCode = byCode;
    }
  }

  public GetForumTypeById(id: string): IForumTypeDescriptor | undefined {
    this.ensureForumTypeMaps();
    return this._forumTypesById?.get(normalizeKey(id));
  }

  public GetForumTypeByCode(code: string): IForumTypeDescriptor | undefined {
    this.ensureForumTypeMaps();
    return this._forumTypesByCode?.get(normalizeKey(code));
  }

  public GetAllForumTypes(): ReadonlyArray<IForumTypeDescriptor> {
    return this.ForumTypes;
  }

  private ensurePostTypeMaps(): void {
    if (!this._postTypesById || !this._postTypesByCode) {
      const byId = new Map<string, IPostTypeDescriptor>();
      const byCode = new Map<string, IPostTypeDescriptor>();
      for (const t of this.PostTypes) {
        if (t.ID) byId.set(normalizeKey(t.ID), t);
        if (t.Code) byCode.set(normalizeKey(t.Code), t);
      }
      this._postTypesById = byId;
      this._postTypesByCode = byCode;
    }
  }

  public GetPostTypeById(id: string): IPostTypeDescriptor | undefined {
    this.ensurePostTypeMaps();
    return this._postTypesById?.get(normalizeKey(id));
  }

  public GetPostTypeByCode(code: string): IPostTypeDescriptor | undefined {
    this.ensurePostTypeMaps();
    return this._postTypesByCode?.get(normalizeKey(code));
  }

  public GetAllPostTypes(): ReadonlyArray<IPostTypeDescriptor> {
    return this.PostTypes;
  }

  private ensureForumRoleTypeMaps(): void {
    if (!this._forumRoleTypesById || !this._forumRoleTypesByCode) {
      const byId = new Map<string, IForumRoleTypeDescriptor>();
      const byCode = new Map<string, IForumRoleTypeDescriptor>();
      for (const r of this.ForumRoleTypes) {
        if (r.ID) byId.set(normalizeKey(r.ID), r);
        if (r.Code) byCode.set(normalizeKey(r.Code), r);
      }
      this._forumRoleTypesById = byId;
      this._forumRoleTypesByCode = byCode;
    }
  }

  public GetForumRoleTypeById(id: string): IForumRoleTypeDescriptor | undefined {
    this.ensureForumRoleTypeMaps();
    return this._forumRoleTypesById?.get(normalizeKey(id));
  }

  public GetForumRoleTypeByCode(code: string): IForumRoleTypeDescriptor | undefined {
    this.ensureForumRoleTypeMaps();
    return this._forumRoleTypesByCode?.get(normalizeKey(code));
  }

  public GetAllForumRoleTypes(): ReadonlyArray<IForumRoleTypeDescriptor> {
    return this.ForumRoleTypes;
  }

  // ─── Configuration cascade ─────────────────────────────────────────────────

  /**
   * Resolves the 3 broadest tiers of the cascade for a forum: code defaults + Application Settings,
   * `ForumType.Configuration`, and `Forum.Configuration`. Convenience wrapper over
   * {@link ResolveConfiguration} for callers (like `CommunitySpaceServerDriver`) that do not yet have
   * a Space or PostType context on hand.
   */
  public ResolveForumConfiguration(
    forum: Pick<IForumSummary, 'ForumTypeID' | 'Configuration'>,
  ): CommunityConfiguration {
    return this.ResolveConfiguration({ forum });
  }

  /**
   * Resolves the full 4-tier Community configuration cascade for a forum (and, optionally, the space
   * it lives in and the post type being authored): `ForumType.Configuration` -> `CommunitySpace`'s
   * underlying `Space.Configuration` -> `Forum.Configuration` -> `PostType.Configuration`.
   */
  public ResolveConfiguration(context: {
    forum: Pick<IForumSummary, 'ForumTypeID' | 'Configuration'>;
    space?: { Configuration?: string | null } | null;
    postType?: Pick<IPostTypeDescriptor, 'Configuration'> | null;
  }): CommunityConfiguration {
    const forumType = this.GetForumTypeById(context.forum.ForumTypeID);
    const typeConfig = CommunityConfigurationResolver.ParseConfigurationJSON(forumType?.Configuration);
    const spaceConfig = CommunityConfigurationResolver.ParseConfigurationJSON(context.space?.Configuration);
    const forumConfig = CommunityConfigurationResolver.ParseConfigurationJSON(context.forum.Configuration);
    const postTypeConfig = CommunityConfigurationResolver.ParseConfigurationJSON(context.postType?.Configuration);
    return CommunityConfigurationResolver.Resolve(
      this._appSettings,
      typeConfig,
      forumConfig,
      spaceConfig,
      postTypeConfig,
    );
  }
}
