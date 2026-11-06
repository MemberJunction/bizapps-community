import { RegisterClass } from '@memberjunction/global';
import { CommunityRules } from '@mj-biz-apps/community-core';
import { CommunityEngine } from '../CommunityEngine.ts';
import {
  BaseForumServerDriver,
  ForumDriverRegistry,
  type ForumDriverContext,
  type ForumPostValidationContext,
  type ForumValidationResult,
} from '../base-forum-server-driver.ts';
import {
  BasePostServerDriver,
  PostDriverRegistry,
  type PostDriverContext,
  type PostSearchChunk,
} from '../base-post-server-driver.ts';

/**
 * Server driver for the `qa-knowledge-base` ForumType.
 * Restricts root posts to `question` and replies to `answer` or `comment`.
 */
@RegisterClass(BaseForumServerDriver, 'QAForumServerDriver')
export class QAForumServerDriver extends BaseForumServerDriver {
  public override async ValidatePostInForum(
    ctx: ForumPostValidationContext,
  ): Promise<ForumValidationResult> {
    const isRoot = ctx.post.RootPostID === null;
    if (isRoot && ctx.postTypeCode !== 'question') {
      return {
        allowed: false,
        reason: 'Root posts in a Q&A Knowledge Base forum must use the Question post type.',
      };
    }
    if (!isRoot && ctx.postTypeCode !== 'answer' && ctx.postTypeCode !== 'comment') {
      return {
        allowed: false,
        reason: 'Replies in a Q&A Knowledge Base forum must be an Answer or Comment.',
      };
    }
    return { allowed: true };
  }
}

/**
 * Server driver for the `ideation-campaign` ForumType.
 */
@RegisterClass(BaseForumServerDriver, 'IdeaCampaignForumServerDriver')
export class IdeaCampaignForumServerDriver extends BaseForumServerDriver {
  public override async ValidatePostInForum(
    ctx: ForumPostValidationContext,
  ): Promise<ForumValidationResult> {
    const isRoot = ctx.post.RootPostID === null;
    if (isRoot && ctx.postTypeCode !== 'idea-proposal' && ctx.postTypeCode !== 'poll-or-form') {
      return {
        allowed: false,
        reason: 'Root posts in an Ideation Campaign forum must be an Idea Proposal or Poll/Form.',
      };
    }
    return { allowed: true };
  }
}

/**
 * Server driver for `question` PostType.
 */
@RegisterClass(BasePostServerDriver, 'QuestionPostServerDriver')
export class QuestionPostServerDriver extends BasePostServerDriver {
  public override async ValidatePostChange(
    ctx: PostDriverContext,
  ): Promise<ForumValidationResult> {
    const placement = CommunityRules.ValidatePostPlacement({
      placementRule: ctx.postType.PlacementRule,
      allowsNestedReplies: ctx.postType.AllowsNestedReplies,
      maxReplyDepth: CommunityEngine.Instance.ResolveForumConfiguration(ctx.forum).Posts.MaxReplyDepth,
      isRootPost: ctx.post.RootPostID === null,
      parentReplyDepth: Math.max(0, ctx.post.ReplyDepth - 1),
    });
    return { allowed: placement.allowed, reason: placement.reason };
  }
}

/**
 * Server driver for `answer` PostType. Boosts verified answers in search/RAG chunks.
 */
@RegisterClass(BasePostServerDriver, 'AnswerPostServerDriver')
export class AnswerPostServerDriver extends BasePostServerDriver {
  public override async BuildSearchChunks(ctx: PostDriverContext): Promise<PostSearchChunk[]> {
    return [
      {
        postId: ctx.post.ID,
        title: ctx.post.Title ?? 'Community Answer',
        markdown: ctx.post.BodyMarkdown,
        epistemicWeight: 1.5,
      },
    ];
  }
}

/**
 * Server driver for `idea-proposal` PostType.
 */
@RegisterClass(BasePostServerDriver, 'IdeaPostServerDriver')
export class IdeaPostServerDriver extends BasePostServerDriver {}

/**
 * Server driver for `collaborative-doc`, `collaborative-sheet`, and `collaborative-deck` PostTypes.
 */
@RegisterClass(BasePostServerDriver, 'ArtifactPostServerDriver')
export class ArtifactPostServerDriver extends BasePostServerDriver {}

/**
 * Server driver for `interactive-experience` PostType (Sandboxed MJ Component Artifacts).
 */
@RegisterClass(BasePostServerDriver, 'InteractivePostServerDriver')
export class InteractivePostServerDriver extends BasePostServerDriver {}

/**
 * Server driver for `poll-or-form` PostType (`BizApps Forms` integration).
 */
@RegisterClass(BasePostServerDriver, 'FormPostServerDriver')
export class FormPostServerDriver extends BasePostServerDriver {}

/**
 * Server driver for the Collaboration `community` SpaceType (`CommunitySpaceServerDriver`).
 * Enforces slug formatting, creates default forums on Community Space creation, and contributes
 * forum/thread summaries to Collaboration's Space Agent context.
 */
export class CommunitySpaceServerDriver {
  public ValidateCommunitySlug(slug: string): ForumValidationResult {
    const normalized = slug.trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
      return {
        allowed: false,
        reason: 'Community Space slug must contain only lowercase letters, numbers, and hyphens.',
      };
    }
    return { allowed: true };
  }

  public BuildCommunityAgentContext(params: {
    spaceName: string;
    slug: string;
    activeForumCount: number;
    canonAnswerCount: number;
  }): ForumDriverContext extends never ? never : { summary: string; data: Record<string, unknown> } {
    return {
      summary: `Community "${params.spaceName}" (${params.slug}): ${params.activeForumCount} active forum(s), ${params.canonAnswerCount} verified canon answer(s).`,
      data: {
        slug: params.slug,
        activeForumCount: params.activeForumCount,
        canonAnswerCount: params.canonAnswerCount,
      },
    };
  }
}

export function RegisterBuiltInCommunityServerDrivers(): void {
  ForumDriverRegistry.Instance.Register('QAForumServerDriver', new QAForumServerDriver());
  ForumDriverRegistry.Instance.Register('qa-knowledge-base', new QAForumServerDriver());
  ForumDriverRegistry.Instance.Register(
    'IdeaCampaignForumServerDriver',
    new IdeaCampaignForumServerDriver(),
  );
  ForumDriverRegistry.Instance.Register(
    'ideation-campaign',
    new IdeaCampaignForumServerDriver(),
  );

  PostDriverRegistry.Instance.Register('QuestionPostServerDriver', new QuestionPostServerDriver());
  PostDriverRegistry.Instance.Register('question', new QuestionPostServerDriver());
  PostDriverRegistry.Instance.Register('AnswerPostServerDriver', new AnswerPostServerDriver());
  PostDriverRegistry.Instance.Register('answer', new AnswerPostServerDriver());
  PostDriverRegistry.Instance.Register('IdeaPostServerDriver', new IdeaPostServerDriver());
  PostDriverRegistry.Instance.Register('idea-proposal', new IdeaPostServerDriver());
  PostDriverRegistry.Instance.Register('ArtifactPostServerDriver', new ArtifactPostServerDriver());
  PostDriverRegistry.Instance.Register(
    'InteractivePostServerDriver',
    new InteractivePostServerDriver(),
  );
  PostDriverRegistry.Instance.Register('FormPostServerDriver', new FormPostServerDriver());
}
