import { IsValidUUID } from '@memberjunction/global';

/**
 * The `MJ: Actions` primary key for each Community action, matching metadata/actions/
 * .community-actions.json (and deterministic canonical IDs for personalization/reply actions).
 * Shared with @mj-biz-apps/community-ng so client widgets can invoke
 * `GraphQLActionClient.RunAction(actionID, params)` with a UUID `ActionID`.
 */
export const COMMUNITY_ACTION_IDS = {
  AskFirstDeflection: 'EE9A6630-CEF5-4996-8AB8-1CA68B2FF475',
  EpistemicAnswerGrading: 'FE5FFFC8-2CB4-4DC4-862F-E38DF19FE88D',
  LivingThreadSynthesis: 'B40307E3-3337-47F0-96CC-25A27A56BBDC',
  ExportDigestPDF: '6E7F8091-A2B3-44C5-D5D6-E7F8A9B0C1D2',
  SendPersonalizedDigest: '7F8A9012-B3C4-45D6-86E7-F8A9B0C1D2E3',
  ProcessInboundDigestReply: '8A9B0123-C4D5-46E7-87F8-A9B0C1D2E3F4',
} as const;

export type CommunityActionKey = keyof typeof COMMUNITY_ACTION_IDS;

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

/** Human-readable `MJ: Actions` names for fallback lookup in `ActionEngineBase.Instance.Actions`. */
export const COMMUNITY_ACTION_NAMES: Record<CommunityActionKey, string> = {
  AskFirstDeflection: 'Ask-First Deflection',
  EpistemicAnswerGrading: 'Epistemic Answer Grading',
  LivingThreadSynthesis: 'Living Thread Synthesis',
  ExportDigestPDF: 'Export Community Digest PDF',
  SendPersonalizedDigest: 'Send Personalized Community Digest',
  ProcessInboundDigestReply: 'Process Inbound Community Digest Reply',
};

/** Structural subset of `MJActionEntityExtended` so Core stays independent of `@memberjunction/actions-base`. */
export interface ActionCatalogEntryLike {
  ID?: string | null;
  DriverClass?: string | null;
  Name?: string | null;
  Status?: string | null;
}

/**
 * Resolves the canonical UUID `ActionID` for a Community action from an optional live action catalog
 * (such as `ActionEngineBase.Instance.Actions`) by `DriverClass` or `Name`, falling back to
 * {@link COMMUNITY_ACTION_IDS} when no matching active catalog entry is present.
 */
export function ResolveCommunityActionID(
  key: CommunityActionKey,
  actions?: ReadonlyArray<ActionCatalogEntryLike> | null,
): string {
  const fallbackId = COMMUNITY_ACTION_IDS[key];
  if (!actions || actions.length === 0) {
    return fallbackId;
  }

  const targetDriver = COMMUNITY_ACTION_DRIVER_CLASSES[key].toLowerCase();
  const targetName = COMMUNITY_ACTION_NAMES[key].toLowerCase();

  const isUsable = (entry: ActionCatalogEntryLike): boolean =>
    Boolean(entry.ID && IsValidUUID(entry.ID.trim())) &&
    (!entry.Status || entry.Status.trim().toLowerCase() === 'active');

  const byDriver = actions.find(
    (entry) => isUsable(entry) && entry.DriverClass?.trim().toLowerCase() === targetDriver,
  );
  if (byDriver?.ID) {
    return byDriver.ID.trim();
  }

  const byName = actions.find(
    (entry) => isUsable(entry) && entry.Name?.trim().toLowerCase() === targetName,
  );
  if (byName?.ID) {
    return byName.ID.trim();
  }

  return fallbackId;
}
