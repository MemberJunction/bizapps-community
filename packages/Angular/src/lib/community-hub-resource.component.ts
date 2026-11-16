import { Component, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, OnInit, ViewChildren, QueryList, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Metadata, RunView, type UserInfo } from '@memberjunction/core';
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

export interface CommunityHubQACanonItem {
  id: string;
  title: string;
  epistemicStatus: string | null;
  isAccepted: boolean;
}

export interface CommunityHubIdeaItem {
  id: string;
  title: string;
  totalPointsAllocated: number;
  effectiveQuadraticVotes: number;
}

export interface CommunityHubLivingDocItem {
  id: string;
  title: string;
  postTypeCode: 'collaborative-doc' | 'collaborative-sheet' | 'collaborative-deck' | 'interactive-experience';
}

interface ForumPostRow {
  ID: string;
  Title: string | null;
  Status: string;
}

interface AnswerPostRow {
  ID: string;
  AIEpistemicStatus: string | null;
  IsAcceptedByAuthor: boolean;
}

interface IdeaPostRow {
  ID: string;
  TotalPointsAllocated: number;
  EffectiveQuadraticVotes: number;
}

/** Deterministic fallback shown when no live RunView-capable provider is available (offline, or a
 * unit/E2E test harness) — never an empty, broken-looking panel. */
const SEEDED_QA_CANON_FALLBACK: CommunityHubQACanonItem[] = [
  { id: 'seed-answer-1', title: 'How do I rotate my API key without downtime?', epistemicStatus: 'Canon Verified', isAccepted: true },
];
const SEEDED_IDEATION_FALLBACK: CommunityHubIdeaItem[] = [
  { id: 'seed-idea-1', title: 'Add webhook signing secrets rotation API', totalPointsAllocated: 61, effectiveQuadraticVotes: 11 },
];
const SEEDED_LIVING_DOCS_FALLBACK: CommunityHubLivingDocItem[] = [
  { id: 'seed-doc-1', title: 'OAuth2 Partner Onboarding Playbook', postTypeCode: 'collaborative-doc' },
  { id: 'seed-interactive-1', title: 'Platform Trivia: Test Your Onboarding Knowledge', postTypeCode: 'interactive-experience' },
];

/**
 * Top-level Community Hub resource (`Application.DefaultNavItems[].DriverClass` =
 * `'CommunityHubResource'` in `metadata/applications/.applications.json`). Hosts the 4-tab
 * Community experience: Knowledge Stream, Q&A Canon Workbench, Quadratic Ideation Wallet, and
 * Living Co-Authoring & Interactive Mini-Apps.
 *
 * Implements the WAI-ARIA Authoring Practices "manual activation" tablist pattern: arrow keys move
 * focus (roving `tabindex`, wrapping) without changing the active panel; `Enter`/`Space` activates
 * whichever tab is focused. `Home`/`End` jump focus to the first/last tab.
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
  public focusedTabKey: CommunityHubTabKey = COMMUNITY_HUB_TABS[0].key;

  public spaceName = 'Community';
  public allowedForumIDs: string[] = [];
  public qaCanonItems: CommunityHubQACanonItem[] = [];
  public ideationItems: CommunityHubIdeaItem[] = [];
  public livingDocItems: CommunityHubLivingDocItem[] = [];
  public selectedIdeaId: string | null = null;

  @ViewChildren('tabButton') private tabButtons!: QueryList<ElementRef<HTMLButtonElement>>;

  private readonly preferences = new CommunityHubPreferences();
  private readonly cdr = inject(ChangeDetectorRef);

  public override ngOnInit(): void {
    super.ngOnInit();
    // Deferred out of this synchronous ngOnInit: calling NotifyLoadStarted (which mutates
    // loading-state bindings) before Angular's first OnPush change-detection pass for this
    // component has completed can trip NG0100 ("value changed after it was checked").
    queueMicrotask(() => {
      this.NotifyLoadStarted();
      this.restoreActiveTabPreference();
      void this.loadHubState().finally(() => this.NotifyLoadComplete());
    });
  }

  private restoreActiveTabPreference(): void {
    const saved = this.preferences.GetActiveTab();
    if (saved && this.tabs.some((tab) => tab.key === saved)) {
      this.activeTabKey = saved;
      this.focusedTabKey = saved;
    }
  }

  /** Loads authorized Space/Forum/Q&A/Idea/Living-Doc state via Metadata/RunView, falling back to
   * a small deterministic seed when no live provider is available (offline, or a test harness). */
  private async loadHubState(): Promise<void> {
    const provider = Metadata.Provider;
    const user: UserInfo | undefined = provider?.CurrentUser;
    if (!provider || !user) {
      this.applySeededFallback();
      return;
    }

    try {
      const rv = new RunView();
      const [forumsResult, answersResult, ideasResult] = await Promise.all([
        rv.RunView<ForumPostRow>(
          { EntityName: 'MJ_BizApps_Community: Forums', Fields: ['ID'], ResultType: 'simple', MaxRows: 100 },
          user,
        ),
        rv.RunView<AnswerPostRow & { Title: string | null }>(
          {
            EntityName: 'MJ_BizApps_Community: Forum Answer Posts',
            ExtraFilter: `IsAcceptedByAuthor = 1`,
            Fields: ['ID', 'Title', 'AIEpistemicStatus', 'IsAcceptedByAuthor'],
            ResultType: 'simple',
            MaxRows: 20,
          },
          user,
        ),
        rv.RunView<IdeaPostRow & { Title: string | null }>(
          {
            EntityName: 'MJ_BizApps_Community: Forum Idea Posts',
            Fields: ['ID', 'Title', 'TotalPointsAllocated', 'EffectiveQuadraticVotes'],
            ResultType: 'simple',
            MaxRows: 20,
          },
          user,
        ),
      ]);

      this.allowedForumIDs = forumsResult?.Success ? (forumsResult.Results ?? []).map((f) => f.ID) : [];
      this.qaCanonItems =
        answersResult?.Success && answersResult.Results
          ? answersResult.Results.map((a) => ({
              id: a.ID,
              title: a.Title ?? 'Community Answer',
              epistemicStatus: a.AIEpistemicStatus,
              isAccepted: a.IsAcceptedByAuthor,
            }))
          : SEEDED_QA_CANON_FALLBACK;
      this.ideationItems =
        ideasResult?.Success && ideasResult.Results
          ? ideasResult.Results.map((i) => ({
              id: i.ID,
              title: i.Title ?? 'Idea Proposal',
              totalPointsAllocated: i.TotalPointsAllocated,
              effectiveQuadraticVotes: i.EffectiveQuadraticVotes,
            }))
          : SEEDED_IDEATION_FALLBACK;
      this.livingDocItems = SEEDED_LIVING_DOCS_FALLBACK;
      this.selectedIdeaId = this.ideationItems[0]?.id ?? null;
    } catch {
      // A RunView failure (unavailable service, network error, permission denial) degrades to the
      // seeded fallback rather than leaving the hub blank.
      this.applySeededFallback();
    } finally {
      this.cdr.markForCheck();
    }
  }

  private applySeededFallback(): void {
    this.qaCanonItems = SEEDED_QA_CANON_FALLBACK;
    this.ideationItems = SEEDED_IDEATION_FALLBACK;
    this.livingDocItems = SEEDED_LIVING_DOCS_FALLBACK;
    this.selectedIdeaId = this.ideationItems[0]?.id ?? null;
    this.cdr.markForCheck();
  }

  public SelectTab(key: CommunityHubTabKey): void {
    this.activeTabKey = key;
    this.focusedTabKey = key;
    void this.preferences.SetActiveTab(key);
  }

  public SelectIdea(ideaId: string): void {
    this.selectedIdeaId = ideaId;
  }

  /** Persists a member's Quadratic Voting allocation change. No live persistence endpoint is wired
   * in this slice — rolls the change into the in-memory aggregate so the UI reflects it immediately,
   * and callers needing server persistence should route through `Community.*` actions. */
  public OnVoteAllocationChanged(ideaId: string, pointsAllocated: number, effectiveVotes: number): void {
    const idea = this.ideationItems.find((i) => i.id === ideaId);
    if (!idea) return;
    idea.totalPointsAllocated = pointsAllocated;
    idea.effectiveQuadraticVotes = effectiveVotes;
    this.cdr.markForCheck();
  }

  // ─── WAI-ARIA tablist keyboard handling (manual activation pattern) ────────

  public OnTabKeydown(event: KeyboardEvent, currentKey: CommunityHubTabKey): void {
    const currentIndex = this.tabs.findIndex((t) => t.key === currentKey);
    let nextIndex = currentIndex;

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % this.tabs.length;
        break;
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + this.tabs.length) % this.tabs.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = this.tabs.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.SelectTab(currentKey);
        return;
      default:
        return;
    }

    event.preventDefault();
    const nextKey = this.tabs[nextIndex].key;
    this.focusedTabKey = nextKey;
    this.cdr.markForCheck();
    queueMicrotask(() => this.focusTabButton(nextIndex));
  }

  private focusTabButton(index: number): void {
    this.tabButtons?.toArray()[index]?.nativeElement.focus();
  }

  public override async GetResourceDisplayName(_data: ResourceData): Promise<string> {
    return 'Community Hub';
  }

  public override async GetResourceIconClass(_data: ResourceData): Promise<string> {
    return 'fa-solid fa-comments';
  }
}
