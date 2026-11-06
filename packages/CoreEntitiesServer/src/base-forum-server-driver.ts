import { BaseSingleton, MJGlobal } from '@memberjunction/global';
import type { IForumPostSummary, IForumSummary, IForumTypeDescriptor } from '@mj-biz-apps/community-entities';

export interface ForumValidationResult {
  allowed: boolean;
  reason?: string;
}

export interface ForumAgentContextContribution {
  summary: string;
  data?: Record<string, unknown>;
}

export interface ForumDriverContext {
  forum: IForumSummary;
  forumType: IForumTypeDescriptor;
  currentUserId: string;
}

export interface ForumPostValidationContext extends ForumDriverContext {
  post: IForumPostSummary;
  postTypeCode: string;
}

/**
 * Abstract server plug-in base class for `ForumType.ServerDriverClass`.
 * Mirrors Collaboration's `BaseSpaceTypeServerDriver` pattern.
 */
export abstract class BaseForumServerDriver {
  public async ValidateForumChange(_ctx: ForumDriverContext): Promise<ForumValidationResult> {
    return { allowed: true };
  }

  public async OnForumChanged(_ctx: ForumDriverContext): Promise<void> {}

  public async ValidatePostInForum(
    _ctx: ForumPostValidationContext,
  ): Promise<ForumValidationResult> {
    return { allowed: true };
  }

  public async BuildForumAgentContext(
    _ctx: ForumDriverContext,
  ): Promise<ForumAgentContextContribution | null> {
    return null;
  }
}

export class ForumDriverRegistry extends BaseSingleton<ForumDriverRegistry> {
  private drivers = new Map<string, BaseForumServerDriver>();

  protected constructor() {
    super();
  }

  public static get Instance(): ForumDriverRegistry {
    return super.getInstance<ForumDriverRegistry>();
  }

  public Register(driverClassOrCode: string, driver: BaseForumServerDriver): void {
    this.drivers.set(driverClassOrCode.trim(), driver);
  }

  public Resolve(forumType: Pick<IForumTypeDescriptor, 'Code' | 'ServerDriverClass'>): BaseForumServerDriver | null {
    const keys = [forumType.ServerDriverClass?.trim(), forumType.Code?.trim()].filter(
      (key): key is string => Boolean(key),
    );
    for (const key of keys) {
      const registered = this.drivers.get(key);
      if (registered) {
        return registered;
      }
      const fromClassFactory = MJGlobal.Instance.ClassFactory.CreateInstance<BaseForumServerDriver>(
        BaseForumServerDriver,
        key,
      );
      if (fromClassFactory) {
        this.drivers.set(key, fromClassFactory);
        return fromClassFactory;
      }
    }
    return null;
  }

  public Clear(): void {
    this.drivers.clear();
  }
}
