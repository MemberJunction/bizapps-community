import type { EpistemicAnswerStatus } from '@mj-biz-apps/community-core';

export interface AskFirstCitation {
  postId: string;
  forumSlug: string;
  title: string;
  authorDisplayName: string;
  epistemicStatus: EpistemicAnswerStatus | null;
  confidenceScore: number;
  semanticSimilarity?: number;
  lexicalOverlap?: number;
  isAccepted?: boolean;
  isVerified?: boolean;
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
  alreadyGraduated?: boolean;
}

// COMMUNITY_ACTION_IDS lives in @mj-biz-apps/community-core (browser-safe, zero @memberjunction/actions
// or pdfkit dependency) so Angular client code can reference action GUIDs without pulling in this
// Node-only package. Re-exported here for existing server-side consumers.
export { COMMUNITY_ACTION_IDS } from '@mj-biz-apps/community-core';
export * from './custom/action-id-params.ts';
export * from './custom/save-or-fail.ts';
export * from './custom/ask-first-deflection.ts';
export * from './custom/AskFirstDeflectionAction.ts';
export * from './custom/epistemic-answer-grading.ts';
export * from './custom/EpistemicAnswerGradingAction.ts';
export * from './custom/living-thread-synthesis.ts';
export * from './custom/living-thread-synthesis-cache.ts';
export * from './custom/LivingThreadSynthesisAction.ts';
export * from './custom/export-community-digest-pdf.ts';
export * from './custom/ExportCommunityDigestPDFAction.ts';
export * from './custom/CommunityTestCommunicationProvider.ts';
export * from './custom/digest-reply-loop.ts';
export * from './custom/SendPersonalizedCommunityDigestAction.ts';
export * from './custom/ProcessInboundDigestReplyAction.ts';

import { AskFirstDeflectionAction } from './custom/AskFirstDeflectionAction.ts';
import { CommunityTestCommunicationProvider } from './custom/CommunityTestCommunicationProvider.ts';
import { EpistemicAnswerGradingAction } from './custom/EpistemicAnswerGradingAction.ts';
import { ExportCommunityDigestPDFAction } from './custom/ExportCommunityDigestPDFAction.ts';
import { LivingThreadSynthesisAction } from './custom/LivingThreadSynthesisAction.ts';
import { SendPersonalizedCommunityDigestAction } from './custom/SendPersonalizedCommunityDigestAction.ts';
import { ProcessInboundDigestReplyAction } from './custom/ProcessInboundDigestReplyAction.ts';

/**
 * Forces the custom Action subclasses and communication test driver to be included in the build despite tree-shaking.
 * Call this from your application bootstrap.
 */
export function LoadBizAppsCommunityActions(): void {
  void AskFirstDeflectionAction;
  void EpistemicAnswerGradingAction;
  void LivingThreadSynthesisAction;
  void ExportCommunityDigestPDFAction;
  void CommunityTestCommunicationProvider;
  void SendPersonalizedCommunityDigestAction;
  void ProcessInboundDigestReplyAction;
}
