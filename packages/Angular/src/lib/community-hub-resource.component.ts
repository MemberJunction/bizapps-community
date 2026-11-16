import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RegisterClass } from '@memberjunction/global';
import { BaseResourceComponent } from '@memberjunction/ng-shared';
import { MJPageLayoutComponent, MJPageBodyComponent } from '@memberjunction/ng-ui-components';
import type { ResourceData } from '@memberjunction/core-entities';
import { CommunityHubPreferences, type CommunityHubTabKey } from './community-hub-preferences.ts';
import { AskFirstDeflectionWidgetComponent } from './widgets/ask-first-deflection-widget.component.ts';
import { QuadraticVotingSliderComponent } from './widgets/quadratic-voting-slider.component.ts';
import { DigestExportButtonComponent } from './widgets/digest-export-button.component.ts';

export interface CommunityHubTabDefinition {
  key: CommunityHubTabKey;
  label: string;
  icon: string;
}

/** The 4 Community Hub tabs, in display order. */
export const COMMUNITY_HUB_TABS: ReadonlyArray<CommunityHubTabDefinition> = [
  { key: 'knowledge-stream', label: 'Knowledge Stream', icon: 'fa-solid fa-stream' },
  { key: 'qa-canon-workbench', label: 'Q&A Canon Workbench', icon: 'fa-solid fa-check-double' },
  { key: 'quadratic-ideation-wallet', label: 'Quadratic Ideation Wallet', icon: 'fa-solid fa-lightbulb' },
  {
    key: 'living-co-authoring',
    label: 'Living Co-Authoring & Interactive Mini-Apps',
    icon: 'fa-solid fa-file-signature',
  },
];

/**
 * Top-level Community Hub resource (`Application.DefaultNavItems[].DriverClass` =
 * `'CommunityHubResource'` in `metadata/applications/.applications.json`). Hosts the 4-tab
 * Community experience: Knowledge Stream, Q&A Canon Workbench, Quadratic Ideation Wallet, and
 * Living Co-Authoring & Interactive Mini-Apps.
 */
@RegisterClass(BaseResourceComponent, 'CommunityHubResource')
@Component({
  standalone: true,
  selector: 'mjc-community-hub-resource',
  imports: [
    CommonModule,
    MJPageLayoutComponent,
    MJPageBodyComponent,
    AskFirstDeflectionWidgetComponent,
    QuadraticVotingSliderComponent,
    DigestExportButtonComponent,
  ],
  templateUrl: './community-hub-resource.component.html',
  styleUrl: './community-hub-resource.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityHubResource extends BaseResourceComponent implements OnInit {
  public readonly tabs = COMMUNITY_HUB_TABS;
  public activeTabKey: CommunityHubTabKey = COMMUNITY_HUB_TABS[0].key;

  private readonly preferences = new CommunityHubPreferences();

  public override ngOnInit(): void {
    super.ngOnInit();
    // Deferred out of this synchronous ngOnInit: calling NotifyLoadStarted (which mutates
    // loading-state bindings) before Angular's first OnPush change-detection pass for this
    // component has completed can trip NG0100 ("value changed after it was checked").
    queueMicrotask(() => {
      this.NotifyLoadStarted();
      this.restoreActiveTabPreference();
      this.NotifyLoadComplete();
    });
  }

  private restoreActiveTabPreference(): void {
    const saved = this.preferences.GetActiveTab();
    if (saved && this.tabs.some((tab) => tab.key === saved)) {
      this.activeTabKey = saved;
    }
  }

  public SelectTab(key: CommunityHubTabKey): void {
    this.activeTabKey = key;
    void this.preferences.SetActiveTab(key);
  }

  public override async GetResourceDisplayName(_data: ResourceData): Promise<string> {
    return 'Community Hub';
  }

  public override async GetResourceIconClass(_data: ResourceData): Promise<string> {
    return 'fa-solid fa-comments';
  }
}
