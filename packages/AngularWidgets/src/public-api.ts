import { BaseSingleton } from '@memberjunction/global';
import type {
  ICommunitySpaceSummary,
  IForumSummary,
  IForumTypeDescriptor,
  IPostTypeDescriptor,
} from '@mj-biz-apps/community-entities';

export interface CommunityHeaderChip {
  key: string;
  label: string;
  icon: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning';
}

export interface CommunityTabDescriptor {
  key: string;
  label: string;
  icon: string;
  sequence: number;
}

export interface ForumVocabulary {
  threadSingular: string;
  threadPlural: string;
  replySingular: string;
  replyPlural: string;
  createActionLabel: string;
}

/**
 * Base UI driver for `ForumType.UIDriverClass`.
 */
export abstract class BaseForumUIDriver {
  public abstract GetDefaultVocabulary(): ForumVocabulary;

  public GetHeaderChips(_forum: IForumSummary): CommunityHeaderChip[] {
    return [];
  }
}

export class GeneralForumUIDriver extends BaseForumUIDriver {
  public override GetDefaultVocabulary(): ForumVocabulary {
    return {
      threadSingular: 'Discussion',
      threadPlural: 'Discussions',
      replySingular: 'Reply',
      replyPlural: 'Replies',
      createActionLabel: 'Start Discussion',
    };
  }
}

export class QAForumUIDriver extends BaseForumUIDriver {
  public override GetDefaultVocabulary(): ForumVocabulary {
    return {
      threadSingular: 'Question',
      threadPlural: 'Questions',
      replySingular: 'Answer',
      replyPlural: 'Answers',
      createActionLabel: 'Ask Question',
    };
  }
}

export class IdeaCampaignForumUIDriver extends BaseForumUIDriver {
  public override GetDefaultVocabulary(): ForumVocabulary {
    return {
      threadSingular: 'Idea Proposal',
      threadPlural: 'Idea Proposals',
      replySingular: 'Comment',
      replyPlural: 'Comments',
      createActionLabel: 'Propose Idea',
    };
  }
}

export class ForumUIDriverRegistry extends BaseSingleton<ForumUIDriverRegistry> {
  private drivers = new Map<string, BaseForumUIDriver>();

  protected constructor() {
    super();
  }

  public static get Instance(): ForumUIDriverRegistry {
    return super.getInstance<ForumUIDriverRegistry>();
  }

  public Register(key: string, driver: BaseForumUIDriver): void {
    this.drivers.set(key.trim(), driver);
  }

  public Resolve(
    forumType: Pick<IForumTypeDescriptor, 'Code' | 'UIDriverClass'>,
  ): BaseForumUIDriver {
    const byClass = forumType.UIDriverClass
      ? this.drivers.get(forumType.UIDriverClass.trim())
      : undefined;
    if (byClass) {
      return byClass;
    }
    const byCode = this.drivers.get(forumType.Code.trim());
    if (byCode) {
      return byCode;
    }
    return new GeneralForumUIDriver();
  }
}

/**
 * Base UI driver for `PostType.UIDriverClass`.
 */
export abstract class BasePostUIDriver {
  public abstract readonly BadgeLabel: string;
  public abstract readonly BadgeIcon: string;
  public SupportsInlineExpansion = true;
}

export class QuestionPostUIDriver extends BasePostUIDriver {
  public readonly BadgeLabel = 'Question';
  public readonly BadgeIcon = 'fa-solid fa-circle-question';
}

export class IdeaPostUIDriver extends BasePostUIDriver {
  public readonly BadgeLabel = 'Idea Proposal';
  public readonly BadgeIcon = 'fa-solid fa-lightbulb';
}

export class ArtifactPostUIDriver extends BasePostUIDriver {
  public readonly BadgeLabel = 'Co-Authored Artifact';
  public readonly BadgeIcon = 'fa-solid fa-file-signature';
}

export class InteractivePostUIDriver extends BasePostUIDriver {
  public readonly BadgeLabel = 'Interactive Mini-App';
  public readonly BadgeIcon = 'fa-solid fa-gamepad';
}

export class PostUIDriverRegistry extends BaseSingleton<PostUIDriverRegistry> {
  private drivers = new Map<string, BasePostUIDriver>();

  protected constructor() {
    super();
  }

  public static get Instance(): PostUIDriverRegistry {
    return super.getInstance<PostUIDriverRegistry>();
  }

  public Register(key: string, driver: BasePostUIDriver): void {
    this.drivers.set(key.trim(), driver);
  }

  public Resolve(
    postType: Pick<IPostTypeDescriptor, 'Code' | 'UIDriverClass'>,
  ): BasePostUIDriver | null {
    if (postType.UIDriverClass && this.drivers.has(postType.UIDriverClass.trim())) {
      return this.drivers.get(postType.UIDriverClass.trim()) ?? null;
    }
    return this.drivers.get(postType.Code.trim()) ?? null;
  }
}

/**
 * UI driver for Collaboration's `community` SpaceType (`CommunitySpaceUIDriver`).
 * Contributes the `Forums`, `Q&A Canon`, and `Ideation` tabs alongside Collaboration's native
 * `Overview`, `Chats`, `Tasks`, `Library`, and `Members` tabs.
 */
export class CommunitySpaceUIDriver {
  public GetTabs(): CommunityTabDescriptor[] {
    return [
      { key: 'forums', label: 'Forums & Stream', icon: 'fa-solid fa-comments', sequence: 15 },
      { key: 'qa-canon', label: 'Q&A Canon', icon: 'fa-solid fa-check-double', sequence: 16 },
      { key: 'ideation', label: 'Ideation & Wallets', icon: 'fa-solid fa-lightbulb', sequence: 17 },
    ];
  }

  public GetHeaderChips(space: ICommunitySpaceSummary): CommunityHeaderChip[] {
    const chips: CommunityHeaderChip[] = [
      {
        key: 'community-kind',
        label: space.CommunityKind,
        icon: 'fa-solid fa-users-rays',
        tone: 'accent',
      },
    ];
    if (space.AskFirstEnabled) {
      chips.push({
        key: 'ask-first',
        label: 'Ask-First AI Active',
        icon: 'fa-solid fa-wand-magic-sparkles',
        tone: 'success',
      });
    }
    return chips;
  }
}

export function RegisterBuiltInCommunityUIDrivers(): void {
  ForumUIDriverRegistry.Instance.Register('GeneralForumUIDriver', new GeneralForumUIDriver());
  ForumUIDriverRegistry.Instance.Register('general-discussion', new GeneralForumUIDriver());
  ForumUIDriverRegistry.Instance.Register('QAForumUIDriver', new QAForumUIDriver());
  ForumUIDriverRegistry.Instance.Register('qa-knowledge-base', new QAForumUIDriver());
  ForumUIDriverRegistry.Instance.Register(
    'IdeaCampaignForumUIDriver',
    new IdeaCampaignForumUIDriver(),
  );
  ForumUIDriverRegistry.Instance.Register('ideation-campaign', new IdeaCampaignForumUIDriver());

  PostUIDriverRegistry.Instance.Register('QuestionPostUIDriver', new QuestionPostUIDriver());
  PostUIDriverRegistry.Instance.Register('question', new QuestionPostUIDriver());
  PostUIDriverRegistry.Instance.Register('IdeaPostUIDriver', new IdeaPostUIDriver());
  PostUIDriverRegistry.Instance.Register('idea-proposal', new IdeaPostUIDriver());
  PostUIDriverRegistry.Instance.Register('ArtifactPostUIDriver', new ArtifactPostUIDriver());
  PostUIDriverRegistry.Instance.Register('InteractivePostUIDriver', new InteractivePostUIDriver());
  PostUIDriverRegistry.Instance.Register('interactive-experience', new InteractivePostUIDriver());
}
