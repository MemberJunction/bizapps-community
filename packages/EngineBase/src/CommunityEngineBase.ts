import {
  BaseEngine,
  Metadata,
  type BaseEnginePropertyConfig,
  type IMetadataProvider,
  type UserInfo,
} from '@memberjunction/core';
import {
  CommunityConfigurationResolver,
  type CommunityConfiguration,
} from '@mj-biz-apps/community-core';
import {
  ForumSubtypeDirectory,
  PostSubtypeDirectory,
  type IForumRoleTypeDescriptor,
  type IForumSummary,
  type IForumTypeDescriptor,
  type IPostTypeDescriptor,
} from '@mj-biz-apps/community-entities';

const normalizeKey = (key: string | null | undefined): string => (key ?? '').trim().toLowerCase();

/**
 * Browser-safe process-wide singleton metadata cache for BizApps Community (`ForumType`, `PostType`, `ForumRoleType`)
 * and 4-tier configuration cascade resolution.
 * Modeled on CollaborationEngineBase in @mj-biz-apps/collaboration-engine-base: a `BaseEngine<T>` subclass whose
 * `Config()` loads its entities via `BaseEnginePropertyConfig[]`/`Load()`, with O(1) `Map` lookups memoized and
 * invalidated in `AdditionalLoading()`.
 */
export class CommunityEngineBase extends BaseEngine<CommunityEngineBase> {
  private _forumTypes: IForumTypeDescriptor[] = [];
  private _postTypes: IPostTypeDescriptor[] = [];
  private _forumRoleTypes: IForumRoleTypeDescriptor[] = [];
  private _appSettings: Partial<CommunityConfiguration> = {};

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

  public async Config(
    forceRefresh?: boolean,
    contextUser?: UserInfo,
    provider?: IMetadataProvider,
  ): Promise<void> {
    const md = provider ?? Metadata.Provider;
    const params: Array<Partial<BaseEnginePropertyConfig>> = [
      {
        PropertyName: '_forumTypes',
        EntityName: 'MJ_BizApps_Community: Forum Types',
        CacheLocal: true,
      },
      {
        PropertyName: '_postTypes',
        EntityName: 'MJ_BizApps_Community: Post Types',
        CacheLocal: true,
      },
      {
        PropertyName: '_forumRoleTypes',
        EntityName: 'MJ_BizApps_Community: Forum Role Types',
        CacheLocal: true,
      },
    ];

    return await this.Load(params, md, forceRefresh ?? false, contextUser);
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
  }

  /**
   * Manual metadata seeding for unit tests and other synchronous bootstrap paths that do not have a
   * live `IMetadataProvider` to run `Config()` against. Populates the same fields `Config()`/`Load()`
   * would, then rebuilds the O(1) caches and subtype directories exactly as a real reload would.
   */
  public HydrateMetadata(params: {
    forumTypes: ReadonlyArray<IForumTypeDescriptor>;
    postTypes: ReadonlyArray<IPostTypeDescriptor>;
    forumRoleTypes?: ReadonlyArray<IForumRoleTypeDescriptor>;
    appSettings?: Partial<CommunityConfiguration>;
  }): void {
    this._forumTypes = [...params.forumTypes];
    this._postTypes = [...params.postTypes];
    this._forumRoleTypes = [...(params.forumRoleTypes ?? [])];
    this._appSettings = params.appSettings ?? {};

    // AdditionalLoading has no awaits: its body completes synchronously before this returns.
    void this.AdditionalLoading();
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
