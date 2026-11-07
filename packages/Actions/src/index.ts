import type { EpistemicAnswerStatus } from '@mj-biz-apps/community-core';

export interface AskFirstCitation {
  postId: string;
  forumSlug: string;
  title: string;
  authorDisplayName: string;
  epistemicStatus: EpistemicAnswerStatus | null;
  confidenceScore: number;
}

export interface AskFirstDeflectionResult {
  deflected: boolean;
  confidenceScore: number;
  synthesizedAnswerMarkdown: string | null;
  citations: AskFirstCitation[];
  suggestedPostTypeCode: string;
  suggestedTitle: string;
  suggestedTagSlugs: string[];
}

export interface ThreadGraduationRequest {
  rootPostId: string;
  targetSpaceTypeCode: string;
  targetSpaceName: string;
  seedInitialTaskTitle?: string | null;
  includeParticipantUserIds: string[];
}

export interface ThreadGraduationResult {
  promotedToSpaceId: string;
  targetSpaceTypeCode: string;
  seededTaskId: string | null;
  invitedParticipantCount: number;
}

export function LoadBizAppsCommunityActions(): void {}
