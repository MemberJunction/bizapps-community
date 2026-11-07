/**
 * Subtype directories for Forums (`ForumType.ExtensionEntity`) and ForumPosts (`PostType.ExtensionEntity`).
 * Modeled directly on Collaboration's `SpaceSubtypeDirectory` & `SpaceSubtypeResolver`:
 *   - Uses `BaseSingleton` from `@memberjunction/global` so multiple bundle loads share one directory.
 *   - `ResolveLoadHint` answers synchronously from memory without querying.
 */
import { BaseSingleton } from '@memberjunction/global';

export interface ExtensionEntityTypeRecord {
  ID: string;
  ExtensionEntity: string | null;
}

export class ForumSubtypeDirectory extends BaseSingleton<ForumSubtypeDirectory> {
  private byForumTypeId = new Map<string, string | null>();

  protected constructor() {
    super();
  }

  public static get Instance(): ForumSubtypeDirectory {
    return super.getInstance<ForumSubtypeDirectory>();
  }

  public Replace(types: ReadonlyArray<ExtensionEntityTypeRecord>): void {
    this.byForumTypeId = new Map(
      types.map((item) => [item.ID.toLowerCase(), item.ExtensionEntity?.trim() || null]),
    );
  }

  public Get(forumTypeId: string | null | undefined): string | null | undefined {
    if (!forumTypeId) {
      return undefined;
    }
    return this.byForumTypeId.get(forumTypeId.toLowerCase());
  }
}

export class PostSubtypeDirectory extends BaseSingleton<PostSubtypeDirectory> {
  private byPostTypeId = new Map<string, string | null>();

  protected constructor() {
    super();
  }

  public static get Instance(): PostSubtypeDirectory {
    return super.getInstance<PostSubtypeDirectory>();
  }

  public Replace(types: ReadonlyArray<ExtensionEntityTypeRecord>): void {
    this.byPostTypeId = new Map(
      types.map((item) => [item.ID.toLowerCase(), item.ExtensionEntity?.trim() || null]),
    );
  }

  public Get(postTypeId: string | null | undefined): string | null | undefined {
    if (!postTypeId) {
      return undefined;
    }
    return this.byPostTypeId.get(postTypeId.toLowerCase());
  }
}

export interface ForumTypeCarrier {
  ForumTypeID?: string | null;
}

export interface PostTypeCarrier {
  PostTypeID?: string | null;
}

export class ForumSubtypeResolver {
  public async Resolve(record: ForumTypeCarrier): Promise<string | null> {
    const typeId = record?.ForumTypeID ?? null;
    if (!typeId) {
      return null;
    }
    return ForumSubtypeDirectory.Instance.Get(typeId) ?? null;
  }

  public ResolveLoadHint(record: ForumTypeCarrier): string | null {
    const typeId = record?.ForumTypeID ?? null;
    return ForumSubtypeDirectory.Instance.Get(typeId) ?? null;
  }
}

export class ForumPostSubtypeResolver {
  public async Resolve(record: PostTypeCarrier): Promise<string | null> {
    const typeId = record?.PostTypeID ?? null;
    if (!typeId) {
      return null;
    }
    return PostSubtypeDirectory.Instance.Get(typeId) ?? null;
  }

  public ResolveLoadHint(record: PostTypeCarrier): string | null {
    const typeId = record?.PostTypeID ?? null;
    return PostSubtypeDirectory.Instance.Get(typeId) ?? null;
  }
}

export function LoadCommunitySubtypeResolvers(): void {}
