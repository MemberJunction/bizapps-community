import { UserInfoEngine } from '@memberjunction/core-entities';

export type CommunityHubTabKey =
  | 'knowledge-stream'
  | 'qa-canon-workbench'
  | 'quadratic-ideation-wallet'
  | 'living-co-authoring';

export type CommunityHubFeedSort = 'recent' | 'top' | 'unanswered';
export type CommunityHubDigestFormat = 'pdf' | 'markdown';
export type CommunityHubDigestCadence = 'daily' | 'weekly' | 'off';

/** The minimal key/value preference surface CommunityHubPreferences depends on, so tests can
 * inject an in-memory fake instead of a live, configured UserInfoEngine. */
export interface IUserPreferenceStore {
  GetSetting(key: string): string | undefined;
  SetSetting(key: string, value: string): Promise<boolean>;
  SetSettingDebounced?: (key: string, value: string) => void;
}

/** Adapts the real, process-wide `UserInfoEngine.Instance` (backed by `MJ: User Settings`) to {@link IUserPreferenceStore}. */
export const UserInfoEngineAdapter: IUserPreferenceStore = {
  GetSetting: (key: string) => UserInfoEngine.Instance.GetSetting(key),
  SetSetting: (key: string, value: string) => UserInfoEngine.Instance.SetSetting(key, value),
  SetSettingDebounced: (key: string, value: string) => UserInfoEngine.Instance.SetSettingDebounced(key, value),
};

export const COMMUNITY_HUB_PREFERENCE_KEYS = {
  activeTab: 'bizapps-community.activeTab',
  selectedSpaceId: 'bizapps-community.selectedSpaceId',
  feedSort: 'bizapps-community.feedSort',
  digestFormat: 'bizapps-community.digestFormat',
  digestCadence: 'bizapps-community.digestCadence',
  activeTopicFilter: 'bizapps-community.activeTopicFilter',
  porchCollapsed: 'bizapps-community.porchCollapsed',
} as const;

/**
 * Persists and loads the Community Hub's 4 named user preferences via `UserInfoEngine.Instance`
 * (`MJ: User Settings`), never `localStorage`. `GetSetting`/`SetSetting` both degrade gracefully
 * (undefined / false) rather than throwing when the engine has no configured user context — a
 * fresh session, an unconfigured test environment — so a missing preference is just "use the
 * default", never a crash.
 */
export class CommunityHubPreferences {
  private readonly store: IUserPreferenceStore;

  constructor(store: IUserPreferenceStore = UserInfoEngineAdapter) {
    this.store = store;
  }

  public GetActiveTab(): CommunityHubTabKey | undefined {
    return this.store.GetSetting(COMMUNITY_HUB_PREFERENCE_KEYS.activeTab) as CommunityHubTabKey | undefined;
  }

  public async SetActiveTab(value: CommunityHubTabKey): Promise<boolean> {
    return this.store.SetSetting(COMMUNITY_HUB_PREFERENCE_KEYS.activeTab, value);
  }

  public GetSelectedSpaceId(): string | undefined {
    return this.store.GetSetting(COMMUNITY_HUB_PREFERENCE_KEYS.selectedSpaceId);
  }

  public async SetSelectedSpaceId(spaceId: string): Promise<boolean> {
    return this.store.SetSetting(COMMUNITY_HUB_PREFERENCE_KEYS.selectedSpaceId, spaceId);
  }

  public GetFeedSort(): CommunityHubFeedSort | undefined {
    return this.store.GetSetting(COMMUNITY_HUB_PREFERENCE_KEYS.feedSort) as CommunityHubFeedSort | undefined;
  }

  public async SetFeedSort(value: CommunityHubFeedSort): Promise<boolean> {
    return this.store.SetSetting(COMMUNITY_HUB_PREFERENCE_KEYS.feedSort, value);
  }

  public GetDigestFormat(): CommunityHubDigestFormat | undefined {
    return this.store.GetSetting(COMMUNITY_HUB_PREFERENCE_KEYS.digestFormat) as CommunityHubDigestFormat | undefined;
  }

  public async SetDigestFormat(value: CommunityHubDigestFormat): Promise<boolean> {
    return this.store.SetSetting(COMMUNITY_HUB_PREFERENCE_KEYS.digestFormat, value);
  }

  public GetPorchCollapsed(defaultCollapsed = false): boolean {
    const raw = this.store.GetSetting(COMMUNITY_HUB_PREFERENCE_KEYS.porchCollapsed);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return defaultCollapsed;
  }

  public async SetPorchCollapsed(collapsed: boolean): Promise<boolean> {
    return this.store.SetSetting(COMMUNITY_HUB_PREFERENCE_KEYS.porchCollapsed, collapsed ? 'true' : 'false');
  }

  public GetDigestCadence(): CommunityHubDigestCadence | undefined {
    const raw = this.store.GetSetting(COMMUNITY_HUB_PREFERENCE_KEYS.digestCadence)?.trim().toLowerCase();
    if (raw === 'daily' || raw === 'weekly' || raw === 'off') {
      return raw;
    }
    return undefined;
  }

  public async SetDigestCadence(cadence: CommunityHubDigestCadence): Promise<boolean> {
    if (this.store.SetSettingDebounced) {
      this.store.SetSettingDebounced(COMMUNITY_HUB_PREFERENCE_KEYS.digestCadence, cadence);
      return true;
    }
    return this.store.SetSetting(COMMUNITY_HUB_PREFERENCE_KEYS.digestCadence, cadence);
  }

  public GetActiveTopicFilter(): string | undefined {
    const raw = this.store.GetSetting(COMMUNITY_HUB_PREFERENCE_KEYS.activeTopicFilter)?.trim();
    return raw ? raw : undefined;
  }

  public async SetActiveTopicFilter(topic: string | null): Promise<boolean> {
    const normalized = topic?.trim() ?? '';
    if (this.store.SetSettingDebounced) {
      this.store.SetSettingDebounced(COMMUNITY_HUB_PREFERENCE_KEYS.activeTopicFilter, normalized);
      return true;
    }
    return this.store.SetSetting(COMMUNITY_HUB_PREFERENCE_KEYS.activeTopicFilter, normalized);
  }
}
