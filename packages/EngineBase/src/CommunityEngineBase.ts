import { BaseSingleton } from '@memberjunction/global';
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

/**
 * Browser-safe process-wide singleton metadata cache for BizApps Community (`ForumType`, `PostType`, `ForumRoleType`)
 * and 4-tier configuration cascade resolution.
 * Modeled on CollaborationEngineBase in @mj-biz-apps/collaboration-engine-base.
 */
export class CommunityEngineBase extends BaseSingleton<CommunityEngineBase> {
  private forumTypes = new Map<string, IForumTypeDescriptor>();
  private forumTypesByCode = new Map<string, IForumTypeDescriptor>();
  private postTypes = new Map<string, IPostTypeDescriptor>();
  private postTypesByCode = new Map<string, IPostTypeDescriptor>();
  private forumRoleTypes = new Map<string, IForumRoleTypeDescriptor>();
  private forumRoleTypesByCode = new Map<string, IForumRoleTypeDescriptor>();
  private appSettings: Partial<CommunityConfiguration> = {};

  protected constructor() {
    super();
  }

  public static get Instance(): CommunityEngineBase {
    return super.getInstance<CommunityEngineBase>();
  }

  public HydrateMetadata(params: {
    forumTypes: ReadonlyArray<IForumTypeDescriptor>;
    postTypes: ReadonlyArray<IPostTypeDescriptor>;
    forumRoleTypes?: ReadonlyArray<IForumRoleTypeDescriptor>;
    appSettings?: Partial<CommunityConfiguration>;
  }): void {
    this.forumTypes.clear();
    this.forumTypesByCode.clear();
    for (const ft of params.forumTypes) {
      this.forumTypes.set(ft.ID.toLowerCase(), ft);
      this.forumTypesByCode.set(ft.Code.toLowerCase(), ft);
    }

    this.postTypes.clear();
    this.postTypesByCode.clear();
    for (const pt of params.postTypes) {
      this.postTypes.set(pt.ID.toLowerCase(), pt);
      this.postTypesByCode.set(pt.Code.toLowerCase(), pt);
    }

    this.forumRoleTypes.clear();
    this.forumRoleTypesByCode.clear();
    for (const frt of params.forumRoleTypes ?? []) {
      this.forumRoleTypes.set(frt.ID.toLowerCase(), frt);
      this.forumRoleTypesByCode.set(frt.Code.toLowerCase(), frt);
    }

    this.appSettings = params.appSettings ?? {};

    ForumSubtypeDirectory.Instance.Replace(params.forumTypes);
    PostSubtypeDirectory.Instance.Replace(params.postTypes);
  }

  public GetForumTypeById(id: string): IForumTypeDescriptor | undefined {
    return this.forumTypes.get(id.toLowerCase());
  }

  public GetForumTypeByCode(code: string): IForumTypeDescriptor | undefined {
    return this.forumTypesByCode.get(code.toLowerCase());
  }

  public GetAllForumTypes(): ReadonlyArray<IForumTypeDescriptor> {
    return Array.from(this.forumTypes.values());
  }

  public GetPostTypeById(id: string): IPostTypeDescriptor | undefined {
    return this.postTypes.get(id.toLowerCase());
  }

  public GetPostTypeByCode(code: string): IPostTypeDescriptor | undefined {
    return this.postTypesByCode.get(code.toLowerCase());
  }

  public GetAllPostTypes(): ReadonlyArray<IPostTypeDescriptor> {
    return Array.from(this.postTypes.values());
  }

  public GetForumRoleTypeById(id: string): IForumRoleTypeDescriptor | undefined {
    return this.forumRoleTypes.get(id.toLowerCase());
  }

  public GetForumRoleTypeByCode(code: string): IForumRoleTypeDescriptor | undefined {
    return this.forumRoleTypesByCode.get(code.toLowerCase());
  }

  public GetAllForumRoleTypes(): ReadonlyArray<IForumRoleTypeDescriptor> {
    return Array.from(this.forumRoleTypes.values());
  }

  public ResolveForumConfiguration(forum: Pick<IForumSummary, 'ForumTypeID' | 'Configuration'>): CommunityConfiguration {
    const forumType = this.GetForumTypeById(forum.ForumTypeID);
    const typeConfig = CommunityConfigurationResolver.ParseConfigurationJSON(
      forumType?.Configuration,
    );
    const forumConfig = CommunityConfigurationResolver.ParseConfigurationJSON(
      forum.Configuration,
    );
    return CommunityConfigurationResolver.Resolve(this.appSettings, typeConfig, forumConfig);
  }
}
