import { IsValidUUID } from '@memberjunction/global';

/**
 * The `MJ: Actions` primary key for each Community action, matching `metadata/actions/.community-actions.json`.
 * Shared with `@mj-biz-apps/community-ng` so client widgets can invoke
 * `GraphQLActionClient.RunAction(actionID, params)` with a UUID `ActionID`.
 */
export const COMMUNITY_ACTION_IDS = {
  AskFirstDeflection: 'EE9A6630-CEF5-4996-8AB8-1CA68B2FF475',
  EpistemicAnswerGrading: 'FE5FFFC8-2CB4-4DC4-862F-E38DF19FE88D',
  LivingThreadSynthesis: 'B40307E3-3337-47F0-96CC-25A27A56BBDC',
  ExportDigestPDF: '6E7F8091-A2B3-44C5-D5D6-E7F8A9B0C1D2',
  SendPersonalizedDigest: '8F4A2C10-5B9E-4D7A-9C31-6E8B2D4F1A90',
  ProcessInboundDigestReply: '9A5B3D21-6C0F-4E8B-8D42-7F9C3E5A2B01',
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

/** Returns true when a catalog entry carries a valid UUID and is not `'Disabled'` / `'Inactive'`. */
export function IsActionCatalogEntryActive(entry: ActionCatalogEntryLike): boolean {
  if (!entry.ID || !IsValidUUID(entry.ID.trim())) {
    return false;
  }
  const status = entry.Status?.trim().toLowerCase();
  if (!status) {
    return true;
  }
  return status === 'active';
}

/**
 * Searches an action catalog (such as `ActionEngineBase.Instance.Actions` or a `RunView` result)
 * for an active entry matching `key` by `DriverClass` or `Name`. Returns the matched `ID` ONLY
 * when an active matching entry exists, and returns `null` when missing or disabled.
 */
export function FindCommunityActionInCatalog(
  key: CommunityActionKey,
  catalog?: ReadonlyArray<ActionCatalogEntryLike> | null,
): string | null {
  if (!catalog || catalog.length === 0) {
    return null;
  }

  const targetDriver = COMMUNITY_ACTION_DRIVER_CLASSES[key].toLowerCase();
  const targetName = COMMUNITY_ACTION_NAMES[key].toLowerCase();

  const driverMatches = catalog.filter(
    (entry) => entry.DriverClass?.trim().toLowerCase() === targetDriver,
  );
  if (driverMatches.length > 0) {
    const activeDriver = driverMatches.find((entry) => IsActionCatalogEntryActive(entry));
    return activeDriver?.ID ? activeDriver.ID.trim() : null;
  }

  const nameMatches = catalog.filter(
    (entry) => entry.Name?.trim().toLowerCase() === targetName,
  );
  if (nameMatches.length > 0) {
    const activeByName = nameMatches.find((entry) => IsActionCatalogEntryActive(entry));
    return activeByName?.ID ? activeByName.ID.trim() : null;
  }

  return null;
}

/**
 * Resolves the canonical UUID `ActionID` for a Community action from an optional live action catalog
 * (such as `ActionEngineBase.Instance.Actions`) by `DriverClass` or `Name`, falling back to
 * {@link COMMUNITY_ACTION_IDS} when no matching active catalog entry is present (unless `strict`
 * is `true`, in which case missing/disabled entries return `null`).
 */
export function ResolveCommunityActionID(
  key: CommunityActionKey,
  actions?: ReadonlyArray<ActionCatalogEntryLike> | null,
): string;
export function ResolveCommunityActionID(
  key: CommunityActionKey,
  actions: ReadonlyArray<ActionCatalogEntryLike> | null | undefined,
  options: { strict: true },
): string | null;
export function ResolveCommunityActionID(
  key: CommunityActionKey,
  actions?: ReadonlyArray<ActionCatalogEntryLike> | null,
  options?: { strict?: boolean },
): string | null;
export function ResolveCommunityActionID(
  key: CommunityActionKey,
  actions?: ReadonlyArray<ActionCatalogEntryLike> | null,
  options?: { strict?: boolean },
): string | null {
  const matched = FindCommunityActionInCatalog(key, actions);
  if (matched) {
    return matched;
  }
  if (options?.strict) {
    return null;
  }
  return COMMUNITY_ACTION_IDS[key];
}
