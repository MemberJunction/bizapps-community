import type { EpistemicAnswerStatus } from '@mj-biz-apps/community-core';

/**
 * Custom DocumentBlocks for MemberJunction Collaborative Documents, Spreadsheets, and Presentations (MJ PR #6215).
 * Enables live Community thread syntheses, verified canon answers, and ideation leaderboards to be embedded
 * directly inside co-authored Space playbooks and slide decks.
 */
export interface IDocumentBlockEnvelope<TAttrs> {
  blockType: string;
  attrs: TAttrs;
  plainTextFallback: string;
}

export interface ThreadSynthesisBlockAttrs {
  rootPostId: string;
  forumSlug: string;
  threadTitle: string;
  summaryMarkdown: string;
  replyWatermark: number;
}

export interface CanonAnswerBlockAttrs {
  questionPostId: string;
  answerPostId: string;
  questionTitle: string;
  answerMarkdown: string;
  epistemicStatus: EpistemicAnswerStatus;
  verifiedByDisplayName: string | null;
}

export interface IdeaLeaderboardBlockAttrs {
  forumId: string;
  campaignTitle: string;
  topIdeas: ReadonlyArray<{
    ideaPostId: string;
    title: string;
    effectiveQuadraticVotes: number;
    totalPointsAllocated: number;
    uniqueBackerCount: number;
  }>;
}

export class CommunityDocumentBlocks {
  public static CreateThreadSynthesisBlock(
    attrs: ThreadSynthesisBlockAttrs,
  ): IDocumentBlockEnvelope<ThreadSynthesisBlockAttrs> {
    return {
      blockType: 'community-thread-synthesis',
      attrs,
      plainTextFallback: `### ${attrs.threadTitle} (Synthesis across ${attrs.replyWatermark} replies)\n\n${attrs.summaryMarkdown}`,
    };
  }

  public static CreateCanonAnswerBlock(
    attrs: CanonAnswerBlockAttrs,
  ): IDocumentBlockEnvelope<CanonAnswerBlockAttrs> {
    return {
      blockType: 'community-canon-answer',
      attrs,
      plainTextFallback: `### Q: ${attrs.questionTitle}\n**Status:** ${attrs.epistemicStatus}\n\n${attrs.answerMarkdown}`,
    };
  }

  public static CreateIdeaLeaderboardBlock(
    attrs: IdeaLeaderboardBlockAttrs,
  ): IDocumentBlockEnvelope<IdeaLeaderboardBlockAttrs> {
    const lines = attrs.topIdeas.map(
      (item, idx) =>
        `${idx + 1}. ${item.title} — ${item.effectiveQuadraticVotes} QV (${item.totalPointsAllocated} pts, ${item.uniqueBackerCount} backers)`,
    );
    return {
      blockType: 'community-idea-leaderboard',
      attrs,
      plainTextFallback: `### ${attrs.campaignTitle} Leaderboard\n` + lines.join('\n'),
    };
  }
}
