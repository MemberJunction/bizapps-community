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

export * from './custom/ask-first-deflection.ts';
export * from './custom/AskFirstDeflectionAction.ts';
export * from './custom/epistemic-answer-grading.ts';
export * from './custom/EpistemicAnswerGradingAction.ts';
export * from './custom/living-thread-synthesis.ts';
export * from './custom/LivingThreadSynthesisAction.ts';
export * from './custom/export-community-digest-pdf.ts';
export * from './custom/ExportCommunityDigestPDFAction.ts';

/**
 * Forces the custom Action subclasses to be included in the build despite tree-shaking.
 * Call this from your application bootstrap.
 */
export function LoadBizAppsCommunityActions(): void {}
