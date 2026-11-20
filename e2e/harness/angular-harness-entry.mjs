import '@angular/compiler';
import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { Metadata, RunView, UserInfo } from '@memberjunction/core';
import { UserInfoEngine } from '@memberjunction/core-entities';
import { GraphQLActionClient } from '@memberjunction/graphql-dataprovider';
import { MJGlobal } from '@memberjunction/global';
import { BaseResourceComponent } from '@memberjunction/ng-shared';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';
import {
  BaseSpaceOverviewCard,
  BaseSpaceTab,
  BaseSpaceTypeUIDriver,
  UIDriverRegistry,
  assembleSpaceContributions,
} from '@mj-biz-apps/collaboration-ng-widgets';
import {
  CommunityHubResource,
  CommunityCollaborationSpaceUIDriver,
  CommunityForumsSpaceTabComponent,
  CommunityQaCanonSpaceTabComponent,
  CommunityIdeationSpaceTabComponent,
  CommunityPlaybooksSpaceTabComponent,
  CommunityOverviewHighlightsCardComponent,
  LoadBizAppsCommunityClient,
  GeneratedFormsModule,
} from '../../packages/Angular/dist/public-api.js';

// Trigger registration across CommunityHubResource, Collaboration Space extensions, and all 25 entity form components.
LoadBizAppsCommunityClient();
window.__generatedFormsModule = GeneratedFormsModule;
window.__communityCollaborationExtensions = [
  CommunityCollaborationSpaceUIDriver,
  CommunityForumsSpaceTabComponent,
  CommunityQaCanonSpaceTabComponent,
  CommunityIdeationSpaceTabComponent,
  CommunityPlaybooksSpaceTabComponent,
  CommunityOverviewHighlightsCardComponent,
];

const GENERATED_FORM_ENTITY_NAMES = [
  'MJ_BizApps_Community: Community Member Profiles',
  'MJ_BizApps_Community: Community Spaces',
  'MJ_BizApps_Community: Forum AMA Posts',
  'MJ_BizApps_Community: Forum Answer Posts',
  'MJ_BizApps_Community: Forum Artifact Posts',
  'MJ_BizApps_Community: Forum Case Posts',
  'MJ_BizApps_Community: Forum Form Posts',
  'MJ_BizApps_Community: Forum Idea Allocations',
  'MJ_BizApps_Community: Forum Idea Campaigns',
  'MJ_BizApps_Community: Forum Idea Posts',
  'MJ_BizApps_Community: Forum Interactive Posts',
  'MJ_BizApps_Community: Forum Interactive Sessions',
  'MJ_BizApps_Community: Forum Members',
  'MJ_BizApps_Community: Forum Post Attachments',
  'MJ_BizApps_Community: Forum Post Flags',
  'MJ_BizApps_Community: Forum Post Reactions',
  'MJ_BizApps_Community: Forum Post Tags',
  'MJ_BizApps_Community: Forum Posts',
  'MJ_BizApps_Community: Forum Question Posts',
  'MJ_BizApps_Community: Forum Role Types',
  'MJ_BizApps_Community: Forum Subscriptions',
  'MJ_BizApps_Community: Forum Topic Tags',
  'MJ_BizApps_Community: Forum Types',
  'MJ_BizApps_Community: Forums',
  'MJ_BizApps_Community: Post Types',
];

const cf = MJGlobal.Instance.ClassFactory;
const hubRegistration = cf.GetRegistration(BaseResourceComponent, 'CommunityHubResource');
const formRegistrations = {};
for (const entityName of GENERATED_FORM_ENTITY_NAMES) {
  const reg = cf.GetRegistration(BaseFormComponent, entityName);
  formRegistrations[entityName] = Boolean(reg);
}

const spaceDriverInstance = UIDriverRegistry.Instance.ResolveDriver('CommunitySpaceUIDriver');
const contributedTabs = assembleSpaceContributions(BaseSpaceTab, 'community', [], (reg, meta) => ({
  key: meta.contributionKey,
  label: meta.label ?? meta.contributionKey,
  icon: meta.icon,
  sortKey: meta.sortKey,
  component: reg.SubClass,
}));
const contributedCards = assembleSpaceContributions(BaseSpaceOverviewCard, 'community', [], (reg, meta) => ({
  key: meta.contributionKey,
  title: meta.title ?? meta.contributionKey,
  sortKey: meta.sortKey,
  side: meta.side,
  component: reg.SubClass,
}));

window.__runtimeRegistrations = {
  CommunityHubResource: Boolean(hubRegistration),
  formRegistrations,
  totalVerified: (hubRegistration ? 1 : 0) + Object.values(formRegistrations).filter(Boolean).length,
  collaboration: {
    driverClassName: spaceDriverInstance.constructor.name,
    isBaseSpaceTypeUIDriver: spaceDriverInstance instanceof BaseSpaceTypeUIDriver,
    assembledTabKeys: contributedTabs.map((t) => t.key),
    assembledCardKeys: contributedCards.map((c) => c.key),
  },
};

const HARNESS_USER = new UserInfo(undefined, {
  ID: '11111111-1111-4111-8111-111111111111',
  Name: 'E2E Harness Member',
  Email: 'member@bizapps-community.local',
  UserRoles: [],
});

const SPACE_1 = '33333333-3333-4333-8333-000000000001';
const SPACE_2 = '33333333-3333-4333-8333-000000000002';

window.__harnessPendingOps = 0;

async function postHarnessJson(endpoint, body) {
  window.__harnessPendingOps += 1;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const parsed = await response.json();
    if (!response.ok) {
      throw new Error(parsed?.ErrorMessage || `Harness request ${endpoint} failed with ${response.status}`);
    }
    return parsed;
  } finally {
    window.__harnessPendingOps = Math.max(0, window.__harnessPendingOps - 1);
  }
}

function createEntityWrapper(entityName, existingRow) {
  const record = existingRow ? { ...existingRow } : { ID: crypto.randomUUID() };
  let activeTxGroup = null;

  const commitOrThrow = async (op) => {
    try {
      const res = await postHarnessJson('/api/harness/tx-submit', {
        ops: [{ op, entityName, record: { ...record } }],
      });
      return Boolean(res?.Success);
    } catch (err) {
      entityObj.LatestResult = { CompleteMessage: err instanceof Error ? err.message : String(err) };
      throw err;
    }
  };

  const entityObj = {
    LatestResult: null,
    NewRecord() {
      record.ID = crypto.randomUUID();
    },
    get TransactionGroup() {
      return activeTxGroup;
    },
    set TransactionGroup(tg) {
      activeTxGroup = tg;
    },
    async Save() {
      if (activeTxGroup) {
        activeTxGroup.AddTransaction({ op: 'save', entityName, record: { ...record } });
        return true;
      }
      return commitOrThrow('save');
    },
    async Delete() {
      if (activeTxGroup) {
        activeTxGroup.AddTransaction({ op: 'delete', entityName, record: { ...record } });
        return true;
      }
      return commitOrThrow('delete');
    },
  };

  return new Proxy(entityObj, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return record[prop];
    },
    set(target, prop, value) {
      if (prop in target) target[prop] = value;
      else record[prop] = value;
      return true;
    },
  });
}

const mockProvider = {
  CurrentUser: HARNESS_USER,
  async RunView(params) {
    return postHarnessJson('/api/harness/run-view', { params });
  },
  async RunViews(paramsArray) {
    return Promise.all(paramsArray.map((p) => this.RunView(p)));
  },
  async GetEntityObject(entityName, compositeKeyOrUser) {
    let existing = null;
    const keyId = compositeKeyOrUser?.KeyValuePairs?.[0]?.Value ?? compositeKeyOrUser?.ID;
    if (keyId) {
      const res = await postHarnessJson('/api/harness/entity-by-id', { entityName, id: keyId });
      existing = res?.record ?? null;
      if (!existing) return null;
    }
    return createEntityWrapper(entityName, existing);
  },
  async ExecuteGQL(query, variables) {
    return postHarnessJson('/api/harness/graphql', { query, variables });
  },
  async CreateTransactionGroup() {
    const ops = [];
    return {
      AddTransaction(opEntry) {
        ops.push(opEntry);
      },
      async Submit() {
        const res = await postHarnessJson('/api/harness/tx-submit', { ops });
        return Boolean(res?.Success);
      },
    };
  },
};

Metadata.Provider = mockProvider;
RunView.Provider = mockProvider;

const userSettingsMap = new Map();
try {
  const initialSettingsRes = await fetch('/api/harness/user-settings');
  if (initialSettingsRes.ok) {
    const parsed = await initialSettingsRes.json();
    for (const [k, v] of Object.entries(parsed?.settings ?? {})) {
      if (typeof v === 'string') {
        userSettingsMap.set(k, v);
      }
    }
  }
} catch {
  // Ignore if harness settings endpoint is unavailable.
}

const uiEngine = UserInfoEngine.Instance;
uiEngine.GetSetting = (key) => userSettingsMap.get(key);
uiEngine.SetSetting = async (key, value) => {
  userSettingsMap.set(key, value);
  await postHarnessJson('/api/harness/user-settings', { key, value });
  return true;
};
uiEngine.SetSettingDebounced = (key, value) => {
  userSettingsMap.set(key, value);
  void postHarnessJson('/api/harness/user-settings', { key, value });
};

GraphQLActionClient.prototype.RunAction = async function (actionName, params) {
  window.__executedActions = window.__executedActions || [];
  window.__executedActions.push({ actionName, params });

  const actionResult = await postHarnessJson('/api/harness/run-action', {
    actionID: actionName,
    params: Array.isArray(params) ? params : [],
  });

  let parsedResult = null;
  if (typeof actionResult?.ResultData === 'string' && actionResult.ResultData.trim()) {
    try {
      parsedResult = JSON.parse(actionResult.ResultData);
    } catch {
      parsedResult = actionResult.ResultData;
    }
  }

  return {
    Success: Boolean(actionResult?.Success),
    ResultCode: actionResult?.ResultCode ?? (actionResult?.Success ? 'SUCCESS' : 'FAILED'),
    Message: actionResult?.Message ?? '',
    Result: parsedResult,
    LogEntry: null,
    Params: Array.isArray(params) ? params : [],
    RunParams: null,
  };
};

window.__runGraphQLAction = async (actionId, params = []) => {
  return new GraphQLActionClient(mockProvider).RunAction(actionId, params);
};

const harnessMode = new URLSearchParams(window.location.search).get('mode');

if (harnessMode === 'collaboration') {
  const ctx = {
    space: null,
    type: null,
    spaceTypeCode: 'community',
    viewer: HARNESS_USER,
    rules: {
      Extensions: {
        community: {
          AskFirstEnabled: true,
          DefaultDigestCadence: 'Daily Digest',
        },
      },
    },
  };
  const builtinDefaults = [
    { key: 'Overview', label: 'Overview', icon: 'fa-solid fa-gauge-high', sortKey: 10 },
    { key: 'Library', label: 'Documents', icon: 'fa-solid fa-folder-open', sortKey: 20 },
    { key: 'Chat', label: 'Chat', icon: 'fa-solid fa-comments', sortKey: 40 },
  ];
  const resolvedTabs = spaceDriverInstance.GetTabs(
    ctx,
    assembleSpaceContributions(BaseSpaceTab, 'community', builtinDefaults, (reg, meta) => ({
      key: meta.contributionKey,
      label: meta.label ?? meta.contributionKey,
      icon: meta.icon,
      sortKey: meta.sortKey,
      component: reg.SubClass,
    })),
  );
  const resolvedCards = spaceDriverInstance.GetOverviewCards(
    ctx,
    assembleSpaceContributions(BaseSpaceOverviewCard, 'community', [], (reg, meta) => ({
      key: meta.contributionKey,
      title: meta.title ?? meta.contributionKey,
      sortKey: meta.sortKey,
      side: meta.side,
      component: reg.SubClass,
    })),
  );
  const resolvedChips = spaceDriverInstance.GetHeaderChips(ctx, []);

  @Component({
    standalone: true,
    selector: 'mjc-collab-embedded-harness',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
      <main class="mjc-collab-host" style="padding:16px;background:var(--mj-bg-page);min-height:100vh;">
        <header style="background:var(--mj-bg-surface);border:1px solid var(--mj-border-default);border-radius:8px;padding:12px 16px;margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
            <div>
              <h1 style="margin:0;font-size:1.15rem;color:var(--mj-text-primary);">Collaboration Space · Customer Success Community</h1>
              <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">
                @for (chip of chips; track chip.key) {
                  <span class="mjc-collab-chip" style="padding:2px 8px;border-radius:999px;background:var(--mj-status-info-bg);color:var(--mj-status-info-text);font-size:0.75rem;font-weight:600;">
                    <i [class]="chip.icon" aria-hidden="true"></i> {{ chip.label }}
                  </span>
                }
              </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <button
                type="button"
                id="mjc-collab-switch-space1-btn"
                (click)="activeSpaceId = space1Id"
                style="padding:6px 10px;border-radius:6px;border:1px solid var(--mj-border-default);background:var(--mj-bg-surface);color:var(--mj-text-primary);cursor:pointer;font-size:0.8rem;font-weight:600;"
              >
                Space 1
              </button>
              <button
                type="button"
                id="mjc-collab-switch-space2-btn"
                (click)="activeSpaceId = space2Id"
                style="padding:6px 10px;border-radius:6px;border:1px solid var(--mj-border-default);background:var(--mj-bg-surface);color:var(--mj-text-primary);cursor:pointer;font-size:0.8rem;font-weight:600;"
              >
                Space 2
              </button>
            </div>
          </div>
          <nav role="tablist" aria-label="Collaboration Space Tabs" style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
            @for (tab of tabs; track tab.key) {
              <button
                type="button"
                role="tab"
                [id]="'mjc-collab-tab-' + tab.key"
                [attr.aria-selected]="activeTabKey === tab.key"
                (click)="activeTabKey = tab.key"
                style="padding:6px 12px;border-radius:6px;border:1px solid var(--mj-border-default);cursor:pointer;"
                [style.background]="activeTabKey === tab.key ? 'var(--mj-brand-primary)' : 'var(--mj-bg-surface)'"
                [style.color]="activeTabKey === tab.key ? 'var(--mj-brand-on-primary)' : 'var(--mj-text-primary)'"
              >
                <i [class]="tab.icon" aria-hidden="true"></i>
                {{ tab.label }}
              </button>
            }
          </nav>
        </header>

        <section id="mjc-collab-overview-cards" style="margin-bottom:12px;">
          @for (card of cards; track card.key) {
            @if (card.component) {
              <ng-container *ngComponentOutlet="card.component; inputs: { SpaceId: activeSpaceId, Sequence: card.sortKey ?? 0 }" />
            }
          }
        </section>

        <section id="mjc-collab-tab-body" role="tabpanel">
          @if (activeTabComponent; as tabCmp) {
            <ng-container *ngComponentOutlet="tabCmp; inputs: { SpaceId: activeSpaceId, SpaceTypeCode: 'community' }" />
          }
        </section>
      </main>
    `,
  })
  class CollaborationEmbeddedHarnessComponent {
    space1Id = SPACE_1;
    space2Id = SPACE_2;
    activeSpaceId = SPACE_1;
    tabs = resolvedTabs.filter((t) => Boolean(t.component));
    cards = resolvedCards;
    chips = resolvedChips;
    activeTabKey = 'forums';

    get activeTabComponent() {
      return this.tabs.find((t) => t.key === this.activeTabKey)?.component ?? null;
    }
  }

  const existingHost = document.querySelector('mjc-community-hub-resource');
  if (existingHost) {
    const embeddedHost = document.createElement('mjc-collab-embedded-harness');
    existingHost.replaceWith(embeddedHost);
  }

  await bootstrapApplication(CollaborationEmbeddedHarnessComponent, {
    providers: [provideZonelessChangeDetection()],
  });
} else {
  await bootstrapApplication(CommunityHubResource, {
    providers: [provideZonelessChangeDetection()],
  });
}

for (let attempt = 0; attempt < 50; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 25));
  if (window.__harnessPendingOps === 0 && attempt >= 3) {
    break;
  }
}
window.__harnessReady = true;
