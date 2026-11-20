/**
 * The `MJ: Actions` primary key for each Community action, matching metadata/actions/
 * .community-actions.json exactly. Shared with @mj-biz-apps/community-ng so client widgets can
 * invoke `GraphQLActionClient.RunAction(actionID, params)` without hardcoding the GUID.
 */
export const COMMUNITY_ACTION_IDS = {
  AskFirstDeflection: 'EE9A6630-CEF5-4996-8AB8-1CA68B2FF475',
  EpistemicAnswerGrading: 'FE5FFFC8-2CB4-4DC4-862F-E38DF19FE88D',
  LivingThreadSynthesis: 'B40307E3-3337-47F0-96CC-25A27A56BBDC',
  ExportDigestPDF: '6E7F8091-A2B3-44C5-D5D6-E7F8A9B0C1D2',
} as const;

/**
 * `@RegisterClass(BaseAction, ...)` driver class names for Community actions, including
 * personalization digest dispatch and inbound reply-by-email processing.
 */
export const COMMUNITY_ACTION_DRIVER_CLASSES = {
  AskFirstDeflection: 'Community.AskFirstDeflection',
  EpistemicAnswerGrading: 'Community.EpistemicAnswerGrading',
  LivingThreadSynthesis: 'Community.LivingThreadSynthesis',
  ExportDigestPDF: 'Community.ExportDigestPDF',
  SendPersonalizedDigest: 'Community.SendPersonalizedDigest',
  ProcessInboundDigestReply: 'Community.ProcessInboundDigestReply',
} as const;
