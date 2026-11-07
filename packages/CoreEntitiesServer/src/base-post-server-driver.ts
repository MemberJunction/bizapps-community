import { BaseSingleton, MJGlobal } from '@memberjunction/global';
import type { IForumPostSummary, IForumSummary, IPostTypeDescriptor } from '@mj-biz-apps/community-entities';
import type { ForumValidationResult } from './base-forum-server-driver.ts';

export interface PostSearchChunk {
  postId: string;
  title: string;
  markdown: string;
  epistemicWeight: number;
}

export interface PostDriverContext {
  post: IForumPostSummary;
  postType: IPostTypeDescriptor;
  forum: IForumSummary;
  currentUserId: string;
}

export interface PostReplyChangeContext extends PostDriverContext {
  reply: IForumPostSummary;
}

/**
 * Abstract server plug-in base class for `PostType.ServerDriverClass`.
 */
export abstract class BasePostServerDriver {
  public async ValidatePostChange(_ctx: PostDriverContext): Promise<ForumValidationResult> {
    return { allowed: true };
  }

  public async OnPostSaved(_ctx: PostDriverContext): Promise<void> {}

  public async OnReplyAdded(_ctx: PostReplyChangeContext): Promise<void> {}

  public async BuildSearchChunks(_ctx: PostDriverContext): Promise<PostSearchChunk[]> {
    return [
      {
        postId: _ctx.post.ID,
        title: _ctx.post.Title ?? 'Community Post',
        markdown: _ctx.post.SummaryMarkdown ?? _ctx.post.BodyMarkdown,
        epistemicWeight: 1.0,
      },
    ];
  }
}

export class PostDriverRegistry extends BaseSingleton<PostDriverRegistry> {
  private drivers = new Map<string, BasePostServerDriver>();

  protected constructor() {
    super();
  }

  public static get Instance(): PostDriverRegistry {
    return super.getInstance<PostDriverRegistry>();
  }

  public Register(driverClassOrCode: string, driver: BasePostServerDriver): void {
    this.drivers.set(driverClassOrCode.trim(), driver);
  }

  public Resolve(postType: Pick<IPostTypeDescriptor, 'Code' | 'ServerDriverClass'>): BasePostServerDriver | null {
    const keys = [postType.ServerDriverClass?.trim(), postType.Code?.trim()].filter(
      (key): key is string => Boolean(key),
    );
    for (const key of keys) {
      const registered = this.drivers.get(key);
      if (registered) {
        return registered;
      }
      const fromClassFactory = MJGlobal.Instance.ClassFactory.CreateInstance<BasePostServerDriver>(
        BasePostServerDriver,
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
