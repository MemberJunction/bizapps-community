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
 * Process-wide singleton metadata cache for BizApps Community (`ForumType`, `PostType`, `ForumRoleType`)
 * and 4-tier configuration resolution.
 */
export class CommunityEngine extends BaseSingleton<CommunityEngine> {
  private forumTypes = new Map<string, IForumTypeDescriptor>();
  private forumTypesByCode = new Map<string, IForumTypeDescriptor>();
  private postTypes = new Map<string, IPostTypeDescriptor>();
  private postTypesByCode = new Map<string, IPostTypeDescriptor>();
  private forumRoleTypes = new Map<string, IForumRoleTypeDescriptor>();
  private appSettings: Partial<CommunityConfiguration> = {};

  protected constructor() {
    super();
  }

  public static get Instance(): CommunityEngine {
    return super.getInstance<CommunityEngine>();
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
    for (const frt of params.forumRoleTypes ?? []) {
      this.forumRoleTypes.set(frt.ID.toLowerCase(), frt);
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

  public GetPostTypeById(id: string): IPostTypeDescriptor | undefined {
    return this.postTypes.get(id.toLowerCase());
  }

  public GetPostTypeByCode(code: string): IPostTypeDescriptor | undefined {
    return this.postTypesByCode.get(code.toLowerCase());
  }

  public GetForumRoleTypeById(id: string): IForumRoleTypeDescriptor | undefined {
    return this.forumRoleTypes.get(id.toLowerCase());
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
