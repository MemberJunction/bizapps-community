import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  ViewChildren,
  QueryList,
  inject,
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { CompositeKey, Metadata, RunView, type UserInfo } from '@memberjunction/core';
import { GraphQLActionClient, GraphQLDataProvider } from '@memberjunction/graphql-dataprovider';
import { RegisterClass, UUIDsEqual } from '@memberjunction/global';
import { BaseResourceComponent } from '@memberjunction/ng-shared';
import { MJPageLayoutComponent, MJPageBodyComponent } from '@memberjunction/ng-ui-components';
import type { ResourceData } from '@memberjunction/core-entities';
import {
  COMMUNITY_ENTITY_NAMES,
  type mjBizAppsCommunityForumAnswerPostEntity,
  type mjBizAppsCommunityForumIdeaPostEntity,
  type mjBizAppsCommunityForumPostEntity,
  type mjBizAppsCommunityForumQuestionPostEntity,
} from '@mj-biz-apps/community-entities';
import { AssertValidUUID, AssertValidUUIDList, COMMUNITY_ACTION_IDS, type IdeationAllocationMode } from '@mj-biz-apps/community-core';
import { CommunityHubPreferences, type CommunityHubTabKey } from './community-hub-preferences.ts';
import {
  ComputeCampaignWalletSpentOnOthers,
  LoadAllPaginatedRows,
  PersistIdeaAllocationAtomic,
  type IdeaAllocationAggregateRow,
} from './community-hub-ideation.ts';
import {
  AddStreamItemReply,
  BuildCommonsStreamItems,
  BuildEditorialPorchHighlights,
  COMMUNITY_SPACES_DIRECTORY,
  ComputeNextTrapFocusTarget,
  FindMatchedCanonQuestion,
  GraduateStreamItem,
  MapForumNameToSpaceId,
  PersistAskSharePost,
  SEEDED_COMMUNITY_SESSIONS,
  ToggleStreamItemUpvote,
  type AskShareEntryType,
  type AskShareValidationErrors,
  type AuthorizedForumOption,
  type CommunityCommonsItem,
  type CommunityFeaturedHighlight,
  type CommunitySessionItem,
  type CommunitySpaceFilterId,
  type CommunityStreamTypeFilter,
  type MatchedCanonQuestion,
} from './community-hub-commons.ts';
import { KnowledgeStreamComponent, type KnowledgeStreamWalletSummaryItem } from './knowledge-stream.component.ts';
import { QaCanonWorkbenchComponent } from './qa-canon-workbench.component.ts';
import { LivingCoAuthoringComponent } from './living-co-authoring.component.ts';
import {
  ComputeIdeationWalletSummary,
  ComputeIdeaPointPresets,
  ComputeQuadraticEffectiveVotes,
  DEFAULT_CAMPAIGN_BUDGET_POINTS,
  NormalizeCampaignBudget,
  type IdeationWalletSummary,
} from './community-hub-workbench.ts';
import { QuadraticVotingSliderComponent } from './widgets/quadratic-voting-slider.component.ts';

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
  questionPostId: string | null;
  title: string;
  bodyMarkdown: string;
  epistemicStatus: string | null;
  confidenceScore: number | null;
  isAccepted: boolean;
}

export interface CommunityHubIdeaItem {
  id: string;
  campaignId: string;
  title: string;
  summary: string;
  totalPointsAllocated: number;
  effectiveQuadraticVotes: number;
  /** The CURRENT user's own prior allocation on this idea (0 if they have not backed it yet). */
  myPointsAllocated: number;
  myEffectiveVotes: number;
}

export interface CommunityHubLivingDocItem {
  id: string;
  title: string;
  bodyMarkdown: string;
  postTypeCode: 'collaborative-doc' | 'collaborative-sheet' | 'collaborative-deck' | 'interactive-experience';
  experienceKind?: string | null;
}

export interface CommunityHubFeedPost {
  id: string;
  title: string;
  bodyMarkdown: string;
  status: string;
  authorName?: string | null;
  authorRole?: string | null;
}

/** An Ideation Campaign's wallet rules (`ForumIdeaCampaign` IS-A `Forum`), bound onto the
 * Quadratic Voting slider per selected campaign so cross-campaign wallets never bleed together. */
export interface CommunityHubCampaign {
  id: string;
  name: string;
  allocationMode: IdeationAllocationMode;
  budgetPoints: number;
  maxPointsPerIdea: number | null;
}

interface ForumRow {
  ID: string;
  Name: string;
}

interface ForumPostRow {
  ID: string;
  ForumID: string;
  Title: string | null;
  BodyMarkdown: string;
  Status: string;
  AuthorUserID?: string | null;
}

interface AnswerPostRow {
  ID: string;
  QuestionPostID: string;
  AIEpistemicStatus: string | null;
  AIConfidenceScore: number | null;
  IsAcceptedByAuthor: boolean;
}

interface IdeaPostRow {
  ID: string;
  TotalPointsAllocated: number;
  EffectiveQuadraticVotes: number;
}

interface IdeaCampaignRow {
  ID: string;
  AllocationMode: IdeationAllocationMode;
  DefaultBudgetPoints: number;
  MaxPointsPerIdea: number | null;
}

interface SubtypeIdRow {
  ID: string;
}

interface InteractiveSubtypeRow {
  ID: string;
  ExperienceKind: string | null;
}

const DEFAULT_CAMPAIGN: CommunityHubCampaign = {
  id: 'seed-campaign-1',
  name: 'Product Roadmap Q1',
  allocationMode: 'Quadratic',
  budgetPoints: 100,
  maxPointsPerIdea: 40,
};

const SEEDED_FEED_POSTS_FALLBACK: CommunityHubFeedPost[] = [
  {
    id: 'seed-feed-1',
    title: 'Zero-Downtime API Key Rotation & Multi-Region Rollover Guide',
    bodyMarkdown:
      'Provision a secondary client secret, roll worker secrets across active regions, verify lease telemetry, and revoke legacy keys after one lease interval.',
    status: 'Published',
  },
];

const SEEDED_QA_CANON_FALLBACK: CommunityHubQACanonItem[] = [
  {
    id: 'seed-answer-1',
    questionPostId: 'seed-question-1',
    title: 'How do I rotate my API key without downtime?',
    bodyMarkdown:
      'Mint a secondary client secret, deploy the dual-key config to workers, then revoke the legacy secret after one lease interval.',
    epistemicStatus: 'Canon Verified',
    confidenceScore: 0.94,
    isAccepted: true,
  },
];

const SEEDED_IDEATION_FALLBACK: CommunityHubIdeaItem[] = [
  {
    id: 'seed-idea-1',
    campaignId: DEFAULT_CAMPAIGN.id,
    title: 'Add webhook signing secrets rotation API',
    summary: 'Zero-downtime dual active signing secrets via Admin API and CLI.',
    totalPointsAllocated: 61,
    effectiveQuadraticVotes: 11,
    myPointsAllocated: 0,
    myEffectiveVotes: 0,
  },
];

const SEEDED_LIVING_DOCS_FALLBACK: CommunityHubLivingDocItem[] = [
  {
    id: 'seed-doc-1',
    title: 'OAuth2 Partner Onboarding Playbook',
    bodyMarkdown: '## OAuth2 Partner Playbook\n- Configure PKCE callback URLs\n- Enable token rotation alerts',
    postTypeCode: 'collaborative-doc',
  },
  {
    id: 'seed-form-1',
    title: 'Partner Readiness Check-In Form',
    bodyMarkdown: 'Inline member readiness check-in form.',
    postTypeCode: 'collaborative-sheet',
  },
  {
    id: 'seed-interactive-1',
    title: 'Platform Trivia: Test Your Onboarding Knowledge',
    bodyMarkdown: 'Interactive knowledge check running inside an isolated sandbox.',
    postTypeCode: 'interactive-experience',
    experienceKind: 'Trivia',
  },
];

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildMiniAppSrcdoc(title: string, kind: string): string {
  const safeTitle = escapeHtml(title);
  const safeKind = escapeHtml(kind);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  body { font-family: system-ui, sans-serif; margin: 16px; background: Canvas; color: CanvasText; }
  .card { border: 1px solid currentColor; border-radius: 8px; padding: 14px; }
  .opts { display: flex; flex-direction: column; gap: 8px; margin: 12px 0; }
  button { padding: 8px 12px; border-radius: 6px; border: 1px solid currentColor; background: ButtonFace; color: ButtonText; cursor: pointer; text-align: left; }
  .score { font-weight: 600; margin-top: 8px; }
</style>
</head>
<body>
  <div class="card">
    <h2 style="margin:0 0 6px 0;font-size:16px;">${safeTitle} (${safeKind})</h2>
    <p style="margin:0 0 8px 0;font-size:13px;">Check your understanding: which security pattern allows zero-downtime key rotation?</p>
    <div class="opts">
      <button type="button" onclick="pick(false)">A) Delete existing key immediately before issuing a replacement</button>
      <button type="button" onclick="pick(true)">B) Dual-active grace window with rolling cutover before revocation</button>
      <button type="button" onclick="pick(false)">C) Disable TLS certificate validation during rollover</button>
    </div>
    <p id="out" class="score" aria-live="polite">Select an option above to score this mini-app.</p>
  </div>
  <script>
    function pick(correct) {
      var out = document.getElementById('out');
      out.textContent = correct ? 'Score: 100% — Correct! Dual-active grace window prevents service interruption.' : 'Not quite — try enabling overlapping active keys before revocation.';
    }
  </script>
</body>
</html>`;
}

/**
 * Top-level Community Hub resource (`Application.DefaultNavItems[].DriverClass` =
 * `'CommunityHubResource'` in `metadata/applications/.applications.json`). Hosts the sticky shell,
 * collapsible editorial porch, 3-column Knowledge Stream Commons, Q&A Canon Workbench, Campaign-Scoped
 * Quadratic Ideation Wallet, Living Co-Authoring / Sandboxed Mini-Apps, Slide-Over Detail Sheet
 * drawer, and Ask/Share composer modal.
 */
@RegisterClass(BaseResourceComponent, 'CommunityHubResource')
@Component({
  standalone: true,
  selector: 'mjc-community-hub-resource',
  imports: [
    CommonModule,
    FormsModule,
    MJPageLayoutComponent,
    MJPageBodyComponent,
    KnowledgeStreamComponent,
    QaCanonWorkbenchComponent,
    LivingCoAuthoringComponent,
    QuadraticVotingSliderComponent,
  ],
  templateUrl: './community-hub-resource.component.html',
  styleUrl: './community-hub-resource.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityHubResource extends BaseResourceComponent implements OnInit {
  public readonly tabs = COMMUNITY_HUB_TABS;
  public readonly spaceDirectory = COMMUNITY_SPACES_DIRECTORY.filter((s) => s.id !== 'all');
  public activeTabKey: CommunityHubTabKey = COMMUNITY_HUB_TABS[0].key;
  public focusedTabKey: CommunityHubTabKey = COMMUNITY_HUB_TABS[0].key;

  public spaceName = 'MemberJunction Community';
  public isOfflineDemoMode = false;
  public authorizedForums: AuthorizedForumOption[] = [];
  public allowedForumIDs: string[] = [];
  public feedPosts: CommunityHubFeedPost[] = [];
  public selectedFeedPostId: string | null = null;
  public threadSynthesisResult: string | null = null;
  public isSynthesizingFeed = false;

  // Sticky Header Search, Digest Export & Editorial Porch state
  public headerSearchQuery = '';
  public porchCollapsed = false;
  public isExportingDigest = false;
  public digestExportError: string | null = null;

  // 3-Column Commons Workspace state
  public commonsItems: CommunityCommonsItem[] = [];
  public activeSpaceFilter: CommunitySpaceFilterId = 'all';
  public activeTopicFilter: string | null = null;
  public activeStreamTypeFilter: CommunityStreamTypeFilter = 'all';
  public sessions: CommunitySessionItem[] = SEEDED_COMMUNITY_SESSIONS.map((s) => ({ ...s }));

  // Slide-Over Detail Sheet Drawer state
  public detailSheetItemId: string | null = null;
  public detailReplyText = '';
  public detailActionMessage: string | null = null;

  // Ask or Share Modal state
  public isAskShareModalOpen = false;
  public askShareEntryType: AskShareEntryType = 'Question';
  public askShareTitle = '';
  public askShareSpaceId: CommunitySpaceFilterId = 'architecture-standards';
  public askShareForumId = '';
  public askShareBody = '';
  public askShareTags = '';
  public askShareValidationErrors: AskShareValidationErrors = {};
  public askShareError: string | null = null;

  public qaCanonItems: CommunityHubQACanonItem[] = [];
  public selectedQaId: string | null = null;
  public showQuestionComposer = false;
  public newQuestionTitle = '';
  public newQuestionBody = '';
  public newAnswerBody = '';
  public qaActionMessage: string | null = null;

  public campaigns: CommunityHubCampaign[] = [DEFAULT_CAMPAIGN];
  public selectedCampaignId: string | null = DEFAULT_CAMPAIGN.id;
  public ideationItems: CommunityHubIdeaItem[] = [];
  public allUserAllocations: IdeaAllocationAggregateRow[] = [];
  public selectedIdeaId: string | null = null;
  public focusedIdeaId: string | null = null;
  public ideationErrorMessage: string | null = null;
  public ideationLoadFailed = false;
  public showIdeaComposer = false;
  public newIdeaTitle = '';
  public newIdeaSummary = '';
  private readonly postTypeIdByCode = new Map<string, string>();
  private readonly userAddedCommonsItems: CommunityCommonsItem[] = [];

  public livingDocItems: CommunityHubLivingDocItem[] = [];
  public selectedLivingDocId: string | null = null;
  public editingDocMarkdown = '';
  public docActionMessage: string | null = null;
  public formRespondentName = '';
  public formConfidenceRating = 'High';
  public formComments = '';
  public formSubmissionCount = 0;
  public formSubmittedMessage: string | null = null;
  public sandboxedMiniAppSrcdoc: SafeHtml | null = null;
  private miniAppResetNonce = 0;

  public get activeCampaign(): CommunityHubCampaign {
    const selected =
      this.campaigns.find((c) => this.selectedCampaignId && UUIDsEqual(c.id, this.selectedCampaignId)) ??
      this.campaigns[0] ??
      DEFAULT_CAMPAIGN;
    const normalizedBudget = NormalizeCampaignBudget(selected.budgetPoints, DEFAULT_CAMPAIGN_BUDGET_POINTS);
    return normalizedBudget === selected.budgetPoints ? selected : { ...selected, budgetPoints: normalizedBudget };
  }

  public get visibleIdeationItems(): CommunityHubIdeaItem[] {
    const campaignId = this.activeCampaign.id;
    return this.ideationItems.filter((i) => UUIDsEqual(i.campaignId, campaignId));
  }

  public get walletSummary(): IdeationWalletSummary {
    return ComputeIdeationWalletSummary(this.visibleIdeationItems, this.activeCampaign.budgetPoints);
  }

  public get remainingWalletPoints(): number {
    return this.walletSummary.remainingPoints;
  }

  public get selectedIdeaPointPresets(): number[] {
    if (!this.selectedIdeaItem) return [];
    return ComputeIdeaPointPresets({
      mode: this.activeCampaign.allocationMode,
      currentPoints: this.pointsOnSelectedIdea,
      remainingBudget: this.remainingWalletPoints,
      maxPointsPerIdea: this.activeCampaign.maxPointsPerIdea,
      budgetPoints: this.activeCampaign.budgetPoints,
    });
  }

  public get walletSummaryIdeas(): ReadonlyArray<KnowledgeStreamWalletSummaryItem> {
    return this.visibleIdeationItems.map((i) => ({
      id: i.id,
      title: i.title,
      myPointsAllocated: i.myPointsAllocated,
    }));
  }

  public get matchedCanonQuestion(): MatchedCanonQuestion | null {
    return FindMatchedCanonQuestion(this.headerSearchQuery, this.qaCanonItems, this.commonsItems);
  }

  public get featuredHighlights(): ReadonlyArray<CommunityFeaturedHighlight> {
    return BuildEditorialPorchHighlights({
      commonsItems: this.commonsItems,
      qaCanonItems: this.qaCanonItems,
      livingDocItems: this.livingDocItems,
    });
  }

  public get detailSheetItem(): CommunityCommonsItem | null {
    if (!this.detailSheetItemId) return null;
    return this.commonsItems.find((item) => item.id === this.detailSheetItemId) ?? null;
  }

  public get hasActiveOverlay(): boolean {
    return Boolean(this.detailSheetItem || this.isAskShareModalOpen);
  }

  public get askShareDeflectionMatches(): ReadonlyArray<CommunityHubQACanonItem> {
    const q = this.askShareTitle.trim().toLowerCase();
    if (q.length < 4) return [];
    const words = q.split(/\s+/).filter((w) => w.length > 3);
    if (words.length === 0) return [];
    return this.qaCanonItems
      .filter((item) => {
        const hay = `${item.title} ${item.bodyMarkdown}`.toLowerCase();
        return words.some((w) => hay.includes(w));
      })
      .slice(0, 2);
  }

  public get selectedFeedPost(): CommunityHubFeedPost | null {
    return this.feedPosts.find((p) => p.id === this.selectedFeedPostId) ?? this.feedPosts[0] ?? null;
  }

  public get selectedQaItem(): CommunityHubQACanonItem | null {
    return this.qaCanonItems.find((q) => q.id === this.selectedQaId) ?? this.qaCanonItems[0] ?? null;
  }

  public get selectedIdeaItem(): CommunityHubIdeaItem | null {
    return this.ideationItems.find((i) => i.id === this.selectedIdeaId) ?? null;
  }

  public get selectedLivingDoc(): CommunityHubLivingDocItem | null {
    return this.livingDocItems.find((d) => d.id === this.selectedLivingDocId) ?? this.livingDocItems[0] ?? null;
  }

  /** The current user's existing allocation on `selectedIdeaId`. */
  public get pointsOnSelectedIdea(): number {
    return this.selectedIdeaItem?.myPointsAllocated ?? 0;
  }

  /** The current user's total allocation across every OTHER idea IN THE ACTIVE CAMPAIGN (never
   * summing other campaigns and never omitting off-page allocations). */
  public get pointsOnOtherIdeas(): number {
    const targetCampaignId = this.activeCampaign.id;
    const campaignIdeaIds = new Set(
      this.ideationItems.filter((i) => UUIDsEqual(i.campaignId, targetCampaignId)).map((i) => i.id),
    );
    if (this.allUserAllocations.length > 0 && campaignIdeaIds.size > 0) {
      return ComputeCampaignWalletSpentOnOthers({
        campaignIdeaIds,
        userAllocations: this.allUserAllocations,
        excludeIdeaId: this.selectedIdeaId,
      });
    }
    return this.ideationItems
      .filter((i) => UUIDsEqual(i.campaignId, targetCampaignId) && i.id !== this.selectedIdeaId)
      .reduce((sum, i) => sum + i.myPointsAllocated, 0);
  }

  @ViewChildren('tabButton') private tabButtons!: QueryList<ElementRef<HTMLButtonElement>>;
  @ViewChildren('ideaButton') private ideaButtons!: QueryList<ElementRef<HTMLButtonElement>>;
  @ViewChild('detailSheetDialog') private detailSheetDialog?: ElementRef<HTMLElement>;
  @ViewChild('askShareDialog') private askShareDialog?: ElementRef<HTMLElement>;

  private lastDetailTrigger: HTMLElement | null = null;
  private lastAskShareTrigger: HTMLElement | null = null;

  private readonly preferences = new CommunityHubPreferences();
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly doc = inject(DOCUMENT);

  public override ngOnInit(): void {
    super.ngOnInit();
    queueMicrotask(() => {
      this.NotifyLoadStarted();
      this.restoreUserPreferences();
      void this.loadHubState().finally(() => this.NotifyLoadComplete());
    });
  }

  private restoreUserPreferences(): void {
    const saved = this.preferences.GetActiveTab();
    if (saved && this.tabs.some((tab) => tab.key === saved)) {
      this.activeTabKey = saved;
      this.focusedTabKey = saved;
    }
    this.porchCollapsed = this.preferences.GetPorchCollapsed();
  }

  private rebuildCommonsItems(): void {
    const built = BuildCommonsStreamItems({
      feedPosts: this.feedPosts,
      qaCanonItems: this.qaCanonItems,
      ideationItems: this.ideationItems,
      livingDocItems: this.livingDocItems,
      includeDemoFixtures: this.isOfflineDemoMode,
    });
    const merged = [...this.userAddedCommonsItems, ...built];
    const seen = new Set<string>();
    this.commonsItems = merged.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  private async loadHubState(): Promise<void> {
    const provider = Metadata.Provider;
    const user: UserInfo | undefined = provider?.CurrentUser;
    if (!provider || !user) {
      this.applySeededFallback();
      return;
    }

    this.isOfflineDemoMode = false;

    try {
      const rv = new RunView();
      const [forumsResult, answersResult, ideasResult, spaceResult, feedResult, campaignsResult, postTypesResult] = await Promise.all([
        rv.RunView<ForumRow>(
          { EntityName: 'MJ_BizApps_Community: Forums', Fields: ['ID', 'Name'], ResultType: 'simple', MaxRows: 100 },
          user,
        ),
        rv.RunView<AnswerPostRow & { Title: string | null }>(
          {
            EntityName: COMMUNITY_ENTITY_NAMES.ForumAnswerPosts,
            Fields: ['ID', 'QuestionPostID', 'Title', 'AIEpistemicStatus', 'AIConfidenceScore', 'IsAcceptedByAuthor'],
            ResultType: 'simple',
            MaxRows: 50,
          },
          user,
        ),
        LoadAllPaginatedRows<IdeaPostRow>({
          runView: rv,
          entityName: COMMUNITY_ENTITY_NAMES.ForumIdeaPosts,
          extraFilter: '1=1',
          fields: ['ID', 'TotalPointsAllocated', 'EffectiveQuadraticVotes'],
          user,
        }),
        rv.RunView<{ ID: string; Name: string }>(
          { EntityName: 'MJ_BizApps_Collaboration: Spaces', Fields: ['ID', 'Name'], ResultType: 'simple', MaxRows: 1 },
          user,
        ),
        rv.RunView<ForumPostRow>(
          {
            EntityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
            ExtraFilter: `RootPostID IS NULL AND Status = 'Published'`,
            Fields: ['ID', 'ForumID', 'Title', 'BodyMarkdown', 'Status', 'AuthorUserID'],
            OrderBy: '__mj_CreatedAt DESC',
            ResultType: 'simple',
            MaxRows: 50,
          },
          user,
        ),
        rv.RunView<IdeaCampaignRow>(
          {
            EntityName: COMMUNITY_ENTITY_NAMES.ForumIdeaCampaigns,
            Fields: ['ID', 'AllocationMode', 'DefaultBudgetPoints', 'MaxPointsPerIdea'],
            ResultType: 'simple',
            MaxRows: 50,
          },
          user,
        ),
        rv.RunView<{ ID: string; Code: string }>(
          { EntityName: COMMUNITY_ENTITY_NAMES.PostTypes, Fields: ['ID', 'Code'], ResultType: 'simple', MaxRows: 50 },
          user,
        ),
      ]);

      this.postTypeIdByCode.clear();
      for (const pt of postTypesResult?.Success ? postTypesResult.Results ?? [] : []) {
        if (pt.Code) {
          this.postTypeIdByCode.set(pt.Code.trim().toLowerCase(), pt.ID);
        }
      }

      const forumRows = forumsResult?.Success ? forumsResult.Results ?? [] : [];
      const forumNameById = new Map(forumRows.map((f) => [f.ID.toLowerCase(), f.Name]));
      this.authorizedForums = forumRows.map((f) => ({
        id: f.ID,
        name: f.Name,
        spaceId: MapForumNameToSpaceId(f.Name),
      }));
      this.allowedForumIDs = this.authorizedForums.map((f) => f.id);
      this.spaceName = spaceResult?.Success ? spaceResult.Results?.[0]?.Name ?? this.spaceName : this.spaceName;

      this.feedPosts =
        feedResult?.Success && feedResult.Results && feedResult.Results.length > 0
          ? feedResult.Results.map((p) => ({
              id: p.ID,
              title: p.Title ?? 'Untitled Thread',
              bodyMarkdown: p.BodyMarkdown ?? '',
              status: p.Status,
              authorName: p.AuthorUserID && UUIDsEqual(p.AuthorUserID, user.ID) ? user.Name : 'Community Member',
              authorRole: 'Member',
            }))
          : [];
      this.selectedFeedPostId = this.feedPosts[0]?.id ?? null;

      const loadedCampaigns: CommunityHubCampaign[] =
        campaignsResult?.Success && campaignsResult.Results && campaignsResult.Results.length > 0
          ? campaignsResult.Results.map((c) => ({
              id: c.ID,
              name: forumNameById.get(c.ID.toLowerCase()) ?? `Campaign ${c.ID.slice(0, 6)}`,
              allocationMode: c.AllocationMode,
              budgetPoints: NormalizeCampaignBudget(c.DefaultBudgetPoints, DEFAULT_CAMPAIGN_BUDGET_POINTS),
              maxPointsPerIdea: c.MaxPointsPerIdea,
            }))
          : [DEFAULT_CAMPAIGN];
      this.campaigns = loadedCampaigns;
      if (!this.campaigns.some((c) => this.selectedCampaignId && UUIDsEqual(c.id, this.selectedCampaignId))) {
        this.selectedCampaignId = this.campaigns[0]?.id ?? DEFAULT_CAMPAIGN.id;
      }

      if (answersResult?.Success && answersResult.Results && answersResult.Results.length > 0) {
        const answerIds = answersResult.Results.map((a) => `'${AssertValidUUID(a.ID, 'answerId')}'`).join(',');
        const bodyRes = await rv.RunView<Pick<ForumPostRow, 'ID' | 'Title' | 'BodyMarkdown'>>(
          {
            EntityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
            ExtraFilter: `ID IN (${answerIds})`,
            Fields: ['ID', 'Title', 'BodyMarkdown'],
            ResultType: 'simple',
            MaxRows: answersResult.Results.length,
          },
          user,
        );
        const bodyById = new Map((bodyRes?.Success ? bodyRes.Results ?? [] : []).map((p) => [p.ID.toLowerCase(), p]));
        this.qaCanonItems = answersResult.Results.map((a) => {
          const post = bodyById.get(a.ID.toLowerCase());
          return {
            id: a.ID,
            questionPostId: a.QuestionPostID ?? null,
            title: post?.Title ?? a.Title ?? 'Community Answer',
            bodyMarkdown: post?.BodyMarkdown ?? '',
            epistemicStatus: a.AIEpistemicStatus,
            confidenceScore: a.AIConfidenceScore,
            isAccepted: a.IsAcceptedByAuthor,
          };
        });
      } else {
        this.qaCanonItems = SEEDED_QA_CANON_FALLBACK;
      }
      this.selectedQaId = this.qaCanonItems[0]?.id ?? null;

      this.ideationLoadFailed = false;
      this.ideationErrorMessage = null;
      if (!ideasResult.success) {
        this.ideationLoadFailed = true;
        this.ideationItems = [];
        this.allUserAllocations = [];
        this.ideationErrorMessage = ideasResult.errorMessage || 'Failed to load campaign ideation items — voting is disabled.';
      } else if (ideasResult.rows.length > 0) {
        AssertValidUUID(user.ID, 'user.ID');
        const ideaPostIds = ideasResult.rows.map((i) => AssertValidUUID(i.ID, 'ideaPostId'));
        const [ideaPostsRes, myAllocsRes] = await Promise.all([
          LoadAllPaginatedRows<Pick<ForumPostRow, 'ID' | 'ForumID' | 'Title' | 'BodyMarkdown'>>({
            runView: rv,
            entityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
            extraFilter: `ID IN (${ideaPostIds.map((id) => `'${id}'`).join(',')})`,
            fields: ['ID', 'ForumID', 'Title', 'BodyMarkdown'],
            user,
          }),
          LoadAllPaginatedRows<IdeaAllocationAggregateRow>({
            runView: rv,
            entityName: COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations,
            extraFilter: `UserID = '${user.ID}'`,
            fields: ['ID', 'IdeaPostID', 'PointsAllocated', 'QuadraticVotes'],
            user,
          }),
        ]);

        if (!ideaPostsRes.success || !myAllocsRes.success) {
          this.ideationLoadFailed = true;
          this.ideationItems = [];
          this.allUserAllocations = [];
          this.ideationErrorMessage =
            ideaPostsRes.errorMessage ||
            myAllocsRes.errorMessage ||
            'Failed to load campaign ideation metadata or user allocations — voting is disabled.';
        } else {
          const postMetaById = new Map(ideaPostsRes.rows.map((p) => [p.ID.toLowerCase(), p]));
          this.allUserAllocations = myAllocsRes.rows;
          const myAllocByIdeaId = new Map(this.allUserAllocations.map((a) => [a.IdeaPostID.toLowerCase(), a]));

          this.ideationItems = ideasResult.rows
            .filter((i) => postMetaById.has(i.ID.toLowerCase()))
            .map((i) => {
              const postMeta = postMetaById.get(i.ID.toLowerCase())!;
              const mine = myAllocByIdeaId.get(i.ID.toLowerCase());
              return {
                id: i.ID,
                campaignId: postMeta.ForumID,
                title: postMeta.Title ?? 'Idea Proposal',
                summary: postMeta.BodyMarkdown ?? '',
                totalPointsAllocated: i.TotalPointsAllocated,
                effectiveQuadraticVotes: i.EffectiveQuadraticVotes,
                myPointsAllocated: mine?.PointsAllocated ?? 0,
                myEffectiveVotes: mine?.QuadraticVotes ?? 0,
              };
            });
        }
      } else {
        this.ideationItems = [];
        this.allUserAllocations = [];
      }

      this.livingDocItems = await this.loadLivingDocItems(rv, user);
      this.rebuildCommonsItems();
      this.syncSelectionDefaults();
    } catch (err) {
      this.ideationLoadFailed = true;
      this.ideationErrorMessage = err instanceof Error ? err.message : 'Failed to load Community Hub state.';
      this.applySeededFallback();
    } finally {
      this.cdr.markForCheck();
    }
  }

  private applySeededFallback(): void {
    this.isOfflineDemoMode = true;
    this.authorizedForums = [];
    this.campaigns = [{ ...DEFAULT_CAMPAIGN }];
    this.selectedCampaignId = DEFAULT_CAMPAIGN.id;
    this.allUserAllocations = [];
    this.feedPosts = SEEDED_FEED_POSTS_FALLBACK.map((p) => ({ ...p }));
    this.selectedFeedPostId = this.feedPosts[0]?.id ?? null;
    this.qaCanonItems = SEEDED_QA_CANON_FALLBACK.map((q) => ({ ...q }));
    this.selectedQaId = this.qaCanonItems[0]?.id ?? null;
    this.ideationItems = SEEDED_IDEATION_FALLBACK.map((i) => ({ ...i }));
    this.livingDocItems = SEEDED_LIVING_DOCS_FALLBACK.map((d) => ({ ...d }));
    this.rebuildCommonsItems();
    this.syncSelectionDefaults();
    this.cdr.markForCheck();
  }

  private syncSelectionDefaults(): void {
    const firstVisibleIdea = this.visibleIdeationItems[0]?.id ?? null;
    this.selectedIdeaId = firstVisibleIdea;
    this.focusedIdeaId = firstVisibleIdea;
    if (this.livingDocItems.length > 0 && !this.livingDocItems.some((d) => d.id === this.selectedLivingDocId)) {
      this.SelectLivingDoc(this.livingDocItems[0].id);
    }
  }

  private async loadLivingDocItems(rv: RunView, user: UserInfo): Promise<CommunityHubLivingDocItem[]> {
    const [artifactIds, formIds, interactiveIds] = await Promise.all([
      rv.RunView<SubtypeIdRow>(
        { EntityName: 'MJ_BizApps_Community: Forum Artifact Posts', Fields: ['ID'], ResultType: 'simple', MaxRows: 20 },
        user,
      ),
      rv.RunView<SubtypeIdRow>(
        { EntityName: 'MJ_BizApps_Community: Forum Form Posts', Fields: ['ID'], ResultType: 'simple', MaxRows: 20 },
        user,
      ),
      rv.RunView<InteractiveSubtypeRow>(
        {
          EntityName: 'MJ_BizApps_Community: Forum Interactive Posts',
          Fields: ['ID', 'ExperienceKind'],
          ResultType: 'simple',
          MaxRows: 20,
        },
        user,
      ),
    ]);

    const idsWithType: Array<{
      id: string;
      postTypeCode: CommunityHubLivingDocItem['postTypeCode'];
      experienceKind?: string | null;
    }> = [
      ...(artifactIds?.Success ? artifactIds.Results ?? [] : []).map((r) => ({
        id: r.ID,
        postTypeCode: 'collaborative-doc' as const,
      })),
      ...(formIds?.Success ? formIds.Results ?? [] : []).map((r) => ({
        id: r.ID,
        postTypeCode: 'collaborative-sheet' as const,
      })),
      ...(interactiveIds?.Success ? interactiveIds.Results ?? [] : []).map((r) => ({
        id: r.ID,
        postTypeCode: 'interactive-experience' as const,
        experienceKind: r.ExperienceKind,
      })),
    ];
    if (idsWithType.length === 0) {
      return this.isOfflineDemoMode ? SEEDED_LIVING_DOCS_FALLBACK : [];
    }

    const safeIds = AssertValidUUIDList(idsWithType.map((r) => r.id).join(','), 'livingDocIds');
    const postsResult = await rv.RunView<Pick<ForumPostRow, 'ID' | 'Title' | 'BodyMarkdown'>>(
      {
        EntityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
        ExtraFilter: `ID IN (${safeIds.map((id) => `'${id}'`).join(',')})`,
        Fields: ['ID', 'Title', 'BodyMarkdown'],
        ResultType: 'simple',
        MaxRows: idsWithType.length,
      },
      user,
    );
    const postById = new Map((postsResult?.Success ? postsResult.Results ?? [] : []).map((r) => [r.ID.toLowerCase(), r]));

    return idsWithType.map((r) => {
      const post = postById.get(r.id.toLowerCase());
      return {
        id: r.id,
        title: post?.Title ?? 'Untitled',
        bodyMarkdown: post?.BodyMarkdown ?? '',
        postTypeCode: r.postTypeCode,
        experienceKind: r.experienceKind ?? null,
      };
    });
  }

  // ─── Sticky Top Shell, Search Spotlight, Porch & Digest PDF Export ────────

  public onHeaderSearchChange(query: string): void {
    this.headerSearchQuery = query;
    this.cdr.markForCheck();
  }

  public clearHeaderSearch(): void {
    this.headerSearchQuery = '';
    this.cdr.markForCheck();
  }

  public openMatchedCanonSpotlight(): void {
    const matched = this.matchedCanonQuestion;
    if (!matched) return;
    if (this.commonsItems.some((i) => i.id === matched.sourceItemId)) {
      this.openDetailSheet(matched.sourceItemId);
      return;
    }
    this.jumpToQaCanon(matched.id);
  }

  public jumpToQaCanon(qaId?: string | null): void {
    if (qaId && this.qaCanonItems.some((q) => q.id === qaId)) {
      this.selectedQaId = qaId;
    }
    this.SelectTab('qa-canon-workbench');
    this.cdr.markForCheck();
  }

  public togglePorch(): void {
    this.porchCollapsed = !this.porchCollapsed;
    void this.preferences.SetPorchCollapsed(this.porchCollapsed);
    this.cdr.markForCheck();
  }

  public openHighlight(highlight: CommunityFeaturedHighlight): void {
    if (this.commonsItems.some((item) => item.id === highlight.targetItemId)) {
      this.openDetailSheet(highlight.targetItemId);
      return;
    }
    this.SelectTab(highlight.targetTab);
  }

  public async exportDigestPdf(): Promise<void> {
    if (this.isExportingDigest) return;
    const effectiveSpaceName = this.spaceName.trim() || 'MemberJunction Community';
    this.isExportingDigest = true;
    this.digestExportError = null;
    this.cdr.markForCheck();

    try {
      const provider = Metadata.Provider as GraphQLDataProvider | undefined;
      if (!provider) {
        this.digestExportError = 'Digest export requires an active GraphQL connection.';
        return;
      }
      const actionClient = new GraphQLActionClient(provider);
      const result = await actionClient.RunAction(COMMUNITY_ACTION_IDS.ExportDigestPDF, [
        { Name: 'SpaceName', Value: effectiveSpaceName, Type: 'Input' },
        { Name: 'AllowedForumIDs', Value: this.allowedForumIDs.join(','), Type: 'Input' },
      ]);

      if (!result.Success) {
        this.digestExportError = result.Message ?? 'Digest export failed.';
        return;
      }

      const pdfBase64Param = result.Params?.find((p) => p.Name === 'PDFBase64');
      const pdfBase64 = typeof pdfBase64Param?.Value === 'string' ? pdfBase64Param.Value : null;
      if (pdfBase64) {
        this.downloadPdfBytes(pdfBase64, `${effectiveSpaceName}-community-digest.pdf`);
      } else {
        this.digestExportError = 'The action did not return a PDF.';
      }
    } catch (err) {
      this.digestExportError = err instanceof Error ? err.message : 'Digest export failed.';
    } finally {
      this.isExportingDigest = false;
      this.cdr.markForCheck();
    }
  }

  private downloadPdfBytes(base64: string, fileName: string): void {
    const bytes = atob(base64);
    const buffer = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      buffer[i] = bytes.charCodeAt(i);
    }
    const blob = new Blob([buffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  // ─── 3-Column Commons Workspace Handlers ──────────────────────────────────

  public setSpaceFilter(spaceId: CommunitySpaceFilterId): void {
    this.activeSpaceFilter = spaceId;
    this.cdr.markForCheck();
  }

  public setTopicFilter(topic: string | null): void {
    this.activeTopicFilter = topic;
    this.cdr.markForCheck();
  }

  public setStreamTypeFilter(streamType: CommunityStreamTypeFilter): void {
    this.activeStreamTypeFilter = streamType;
    this.cdr.markForCheck();
  }

  public resetCommonsFilters(): void {
    this.activeSpaceFilter = 'all';
    this.activeTopicFilter = null;
    this.activeStreamTypeFilter = 'all';
    this.headerSearchQuery = '';
    this.cdr.markForCheck();
  }

  public upvoteCommonsItem(itemId: string): void {
    this.commonsItems = ToggleStreamItemUpvote(this.commonsItems, itemId);
    this.cdr.markForCheck();
  }

  public toggleSessionRsvp(sessionId: string): void {
    this.sessions = this.sessions.map((s) => (s.id === sessionId ? { ...s, rsvped: !s.rsvped } : s));
    this.cdr.markForCheck();
  }

  // ─── Slide-Over Detail Sheet Drawer ───────────────────────────────────────

  @HostListener('document:keydown.escape')
  public onDocumentEscape(): void {
    if (this.isAskShareModalOpen) {
      this.closeAskShareModal();
      return;
    }
    if (this.detailSheetItemId) {
      this.closeDetailSheet();
    }
  }

  public openDetailSheet(itemId: string): void {
    if (!this.detailSheetItemId) {
      const active = this.doc?.activeElement;
      if (active instanceof HTMLElement && !active.closest('[role="dialog"]')) {
        this.lastDetailTrigger = active;
      }
    }
    this.detailSheetItemId = itemId;
    this.detailReplyText = '';
    this.detailActionMessage = null;
    this.cdr.markForCheck();
    this.scheduleOverlayInitialFocus('detail');
  }

  public closeDetailSheet(): void {
    const trigger = this.lastDetailTrigger;
    this.lastDetailTrigger = null;
    this.detailSheetItemId = null;
    this.detailReplyText = '';
    this.detailActionMessage = null;
    this.cdr.markForCheck();
    this.restoreOverlayTriggerFocus(trigger, '.mjc-inspect-btn');
  }

  public submitDetailReply(): void {
    const item = this.detailSheetItem;
    const text = this.detailReplyText.trim();
    if (!item || !text) return;
    const authorName = Metadata.Provider?.CurrentUser?.Name || 'Community Member';
    this.commonsItems = AddStreamItemReply(this.commonsItems, item.id, text, authorName);
    this.detailReplyText = '';
    this.detailActionMessage = 'Reply added to thread.';
    this.cdr.markForCheck();
  }

  public graduateDetailItem(itemId: string): void {
    this.commonsItems = GraduateStreamItem(this.commonsItems, itemId);
    this.detailActionMessage = 'Thread graduated into an active Working Group deliverable.';
    this.cdr.markForCheck();
  }

  // ─── Ask or Share Modal ───────────────────────────────────────────────────

  public openAskShareModal(defaultType: AskShareEntryType = 'Question'): void {
    if (!this.isAskShareModalOpen) {
      const active = this.doc?.activeElement;
      if (active instanceof HTMLElement && !active.closest('[role="dialog"]')) {
        this.lastAskShareTrigger = active;
      }
    }
    this.isAskShareModalOpen = true;
    this.askShareEntryType = defaultType;
    this.askShareTitle = '';
    if (!this.isOfflineDemoMode && this.authorizedForums.length > 0) {
      const preferred =
        (this.activeSpaceFilter !== 'all'
          ? this.authorizedForums.find((f) => f.spaceId === this.activeSpaceFilter)
          : undefined) ?? this.authorizedForums[0];
      this.askShareForumId = preferred.id;
      this.askShareSpaceId = preferred.spaceId;
    } else {
      this.askShareForumId = '';
      this.askShareSpaceId = this.activeSpaceFilter !== 'all' ? this.activeSpaceFilter : 'architecture-standards';
    }
    this.askShareBody = '';
    this.askShareTags = '';
    this.askShareValidationErrors = {};
    this.askShareError = null;
    this.cdr.markForCheck();
    this.scheduleOverlayInitialFocus('ask-share');
  }

  public onAskShareForumChange(forumId: string): void {
    this.askShareForumId = forumId;
    const matched = this.authorizedForums.find((f) => UUIDsEqual(f.id, forumId));
    if (matched) {
      this.askShareSpaceId = matched.spaceId;
    }
    this.askShareError = null;
    this.cdr.markForCheck();
  }

  public closeAskShareModal(): void {
    const trigger = this.lastAskShareTrigger;
    this.lastAskShareTrigger = null;
    this.isAskShareModalOpen = false;
    this.askShareValidationErrors = {};
    this.askShareError = null;
    this.cdr.markForCheck();
    this.restoreOverlayTriggerFocus(trigger, '#mjc-header-ask-share-btn');
  }

  public onOverlayKeydown(event: KeyboardEvent, kind: 'detail' | 'ask-share'): void {
    if (event.key !== 'Tab') {
      return;
    }
    const dialogEl =
      kind === 'detail' ? this.detailSheetDialog?.nativeElement : this.askShareDialog?.nativeElement;
    if (!dialogEl) {
      return;
    }
    const focusables = this.getVisibleFocusableElements(dialogEl);
    if (focusables.length === 0) {
      event.preventDefault();
      dialogEl.focus();
      return;
    }
    const active = this.doc?.activeElement instanceof HTMLElement ? this.doc.activeElement : null;
    const nextTarget = ComputeNextTrapFocusTarget(focusables, active, event.shiftKey);
    if (nextTarget) {
      event.preventDefault();
      nextTarget.focus();
    }
  }

  private getVisibleFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector =
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const candidates = Array.from(container.querySelectorAll<HTMLElement>(selector));
    return candidates.filter((el) => {
      if (el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true') {
        return false;
      }
      if (typeof el.getClientRects === 'function' && el.getClientRects().length === 0) {
        return false;
      }
      return true;
    });
  }

  private scheduleOverlayInitialFocus(kind: 'detail' | 'ask-share'): void {
    queueMicrotask(() => {
      const moved = this.focusOverlayEntryControl(kind);
      if (!moved) {
        setTimeout(() => {
          this.focusOverlayEntryControl(kind);
        }, 0);
      }
    });
  }

  private focusOverlayEntryControl(kind: 'detail' | 'ask-share'): boolean {
    const dialogEl =
      kind === 'detail' ? this.detailSheetDialog?.nativeElement : this.askShareDialog?.nativeElement;
    if (!dialogEl) {
      return false;
    }
    const focusables = this.getVisibleFocusableElements(dialogEl);
    const target = focusables[0] ?? dialogEl;
    target.focus();
    return this.doc?.activeElement === target;
  }

  private restoreOverlayTriggerFocus(trigger: HTMLElement | null, fallbackSelector: string): void {
    queueMicrotask(() => {
      if (trigger && trigger.isConnected) {
        trigger.focus();
        return;
      }
      const fallback = this.doc?.querySelector<HTMLElement>(fallbackSelector);
      fallback?.focus();
    });
  }

  public inspectAskShareDeflection(qaId: string): void {
    this.closeAskShareModal();
    const matchItem = this.commonsItems.find((i) => i.sourcePostId === qaId);
    if (matchItem) {
      this.openDetailSheet(matchItem.id);
    } else {
      this.jumpToQaCanon(qaId);
    }
  }

  public async submitAskShareModal(): Promise<void> {
    this.askShareError = null;
    const provider = Metadata.Provider;
    const user: UserInfo | undefined = provider?.CurrentUser;
    if (!this.isOfflineDemoMode && provider && user) {
      await this.ensurePostTypesLoaded(user).catch(() => undefined);
    }

    const outcome = await PersistAskSharePost({
      draft: {
        entryType: this.askShareEntryType,
        title: this.askShareTitle,
        spaceId: this.askShareSpaceId,
        body: this.askShareBody,
        tagsInput: this.askShareTags,
      },
      isOfflineDemoMode: this.isOfflineDemoMode || !provider || !user,
      targetForumId: this.askShareForumId,
      allowedForumIDs: this.allowedForumIDs,
      authorizedForums: this.authorizedForums,
      postTypeIdByCode: this.postTypeIdByCode,
      currentUserId: user?.ID,
      authorName: user?.Name || 'Community Member',
      createForumPostEntity:
        provider && user
          ? () =>
              new Metadata().GetEntityObject<mjBizAppsCommunityForumPostEntity>(
                COMMUNITY_ENTITY_NAMES.ForumPosts,
                user,
              )
          : null,
    });

    if (!outcome.success || !outcome.createdItem) {
      this.askShareValidationErrors = outcome.validationErrors;
      this.askShareError = outcome.errorMessage;
      this.cdr.markForCheck();
      return;
    }

    const newItem = outcome.createdItem;
    this.userAddedCommonsItems.unshift(newItem);
    this.commonsItems = [newItem, ...this.commonsItems];
    this.feedPosts = [
      {
        id: newItem.sourcePostId,
        title: newItem.title,
        bodyMarkdown: newItem.bodyMarkdown,
        status: 'Published',
        authorName: newItem.authorName,
        authorRole: newItem.authorRole,
      },
      ...this.feedPosts,
    ];

    if (this.askShareEntryType === 'Question') {
      const qaEntry: CommunityHubQACanonItem = {
        id: newItem.sourcePostId,
        questionPostId: newItem.sourcePostId,
        title: newItem.title,
        bodyMarkdown: newItem.bodyMarkdown,
        epistemicStatus: 'Novel Insight',
        confidenceScore: null,
        isAccepted: false,
      };
      this.qaCanonItems = [qaEntry, ...this.qaCanonItems];
      this.selectedQaId = qaEntry.id;
    }

    this.selectedFeedPostId = newItem.sourcePostId;
    this.askShareTitle = '';
    this.askShareBody = '';
    this.askShareTags = '';
    this.askShareValidationErrors = {};
    this.askShareError = null;
    this.closeAskShareModal();
  }

  public SelectTab(key: CommunityHubTabKey): void {
    this.activeTabKey = key;
    this.focusedTabKey = key;
    void this.preferences.SetActiveTab(key);
  }

  public SelectFeedPost(postId: string): void {
    this.selectedFeedPostId = postId;
    this.threadSynthesisResult = null;
  }

  public async SynthesizeFeedThread(postId: string): Promise<void> {
    if (this.isSynthesizingFeed) return;
    this.isSynthesizingFeed = true;
    this.threadSynthesisResult = null;
    this.cdr.markForCheck();

    const post = this.feedPosts.find((p) => p.id === postId);
    try {
      const provider = Metadata.Provider;
      if (provider?.CurrentUser) {
        const actionClient = new GraphQLActionClient(provider as GraphQLDataProvider);
        const res = await actionClient.RunAction(COMMUNITY_ACTION_IDS.LivingThreadSynthesis, [
          { Name: 'RootPostID', Value: postId, Type: 'Input' },
        ]);
        this.threadSynthesisResult = res.Message || `Living synthesis updated for "${post?.title ?? postId}".`;
      } else {
        this.threadSynthesisResult = `Synthesized key takeaways for "${post?.title ?? postId}".`;
      }
    } catch (err) {
      this.threadSynthesisResult = err instanceof Error ? err.message : 'Synthesis failed.';
    } finally {
      this.isSynthesizingFeed = false;
      this.cdr.markForCheck();
    }
  }

  public SelectQAQuestion(itemId: string): void {
    this.selectedQaId = itemId;
    this.qaActionMessage = null;
    this.cdr.markForCheck();
  }

  private resolvePostTypeId(code: string): string | null {
    return this.postTypeIdByCode.get(code.trim().toLowerCase()) ?? null;
  }

  private async ensurePostTypesLoaded(user: UserInfo): Promise<void> {
    if (this.postTypeIdByCode.size > 0) return;
    const res = await new RunView().RunView<{ ID: string; Code: string }>(
      { EntityName: COMMUNITY_ENTITY_NAMES.PostTypes, Fields: ['ID', 'Code'], ResultType: 'simple', MaxRows: 50 },
      user,
    );
    for (const pt of res?.Success ? res.Results ?? [] : []) {
      if (pt.Code) {
        this.postTypeIdByCode.set(pt.Code.trim().toLowerCase(), pt.ID);
      }
    }
  }

  public async CreateQuestion(): Promise<void> {
    const title = this.newQuestionTitle.trim();
    const body = this.newQuestionBody.trim();
    if (!title || !body) return;

    const generatedId = crypto.randomUUID();
    const created: CommunityHubQACanonItem = {
      id: generatedId,
      questionPostId: generatedId,
      title,
      bodyMarkdown: body,
      epistemicStatus: 'Novel Insight',
      confidenceScore: null,
      isAccepted: false,
    };

    const provider = Metadata.Provider;
    const user: UserInfo | undefined = provider?.CurrentUser;
    if (provider && user) {
      if (!this.allowedForumIDs[0]) {
        this.qaActionMessage = 'No forum is available to post a question.';
        this.cdr.markForCheck();
        return;
      }
      try {
        await this.ensurePostTypesLoaded(user);
        const postTypeId = this.resolvePostTypeId('question');
        if (!postTypeId) {
          this.qaActionMessage = 'PostType "question" is not configured — cannot create question.';
          this.cdr.markForCheck();
          return;
        }
        const md = new Metadata();
        const post = await md.GetEntityObject<mjBizAppsCommunityForumPostEntity>(COMMUNITY_ENTITY_NAMES.ForumPosts, user);
        const qPost = await md.GetEntityObject<mjBizAppsCommunityForumQuestionPostEntity>(
          COMMUNITY_ENTITY_NAMES.ForumQuestionPosts,
          user,
        );
        if (!post || !qPost) {
          this.qaActionMessage = 'Could not instantiate Question entities.';
          this.cdr.markForCheck();
          return;
        }
        post.ForumID = this.allowedForumIDs[0];
        post.AuthorUserID = user.ID;
        post.PostTypeID = postTypeId;
        post.Title = title;
        post.BodyMarkdown = body;
        post.Status = 'Published';
        const postSaved = await post.Save();
        if (!postSaved) {
          this.qaActionMessage = 'Failed to save Forum Post for question.';
          this.cdr.markForCheck();
          return;
        }
        qPost.ID = post.ID;
        const qSaved = await qPost.Save();
        if (!qSaved) {
          await post.Delete().catch(() => false);
          this.qaActionMessage = 'Failed to save Forum Question Post subtype — rolled back base post.';
          this.cdr.markForCheck();
          return;
        }
        created.id = post.ID;
        created.questionPostId = post.ID;
      } catch (err) {
        this.qaActionMessage = err instanceof Error ? err.message : 'Failed to post question.';
        this.cdr.markForCheck();
        return;
      }
    }

    this.qaCanonItems = [created, ...this.qaCanonItems];
    this.rebuildCommonsItems();
    this.selectedQaId = created.id;
    this.newQuestionTitle = '';
    this.newQuestionBody = '';
    this.showQuestionComposer = false;
    this.qaActionMessage = `Posted question "${created.title}". Submit an answer below for Epistemic grading.`;
    this.cdr.markForCheck();
  }

  public async SubmitAnswer(targetItemId?: string, answerBodyOverride?: string): Promise<void> {
    const body = (answerBodyOverride ?? this.newAnswerBody).trim();
    const target =
      (targetItemId ? this.qaCanonItems.find((q) => q.id === targetItemId) : null) ?? this.selectedQaItem;
    if (!body || !target) return;

    const targetQuestionId = target.questionPostId ?? target.id;
    const generatedId = crypto.randomUUID();
    const newAnswer: CommunityHubQACanonItem = {
      id: generatedId,
      questionPostId: targetQuestionId,
      title: `Re: ${target.title}`,
      bodyMarkdown: body,
      epistemicStatus: 'Novel Insight',
      confidenceScore: null,
      isAccepted: false,
    };

    const provider = Metadata.Provider;
    const user: UserInfo | undefined = provider?.CurrentUser;
    if (provider && user) {
      if (!this.allowedForumIDs[0]) {
        this.qaActionMessage = 'No forum is available to submit an answer.';
        this.cdr.markForCheck();
        return;
      }
      try {
        await this.ensurePostTypesLoaded(user);
        const postTypeId = this.resolvePostTypeId('answer');
        if (!postTypeId) {
          this.qaActionMessage = 'PostType "answer" is not configured — cannot save answer.';
          this.cdr.markForCheck();
          return;
        }
        const md = new Metadata();
        const post = await md.GetEntityObject<mjBizAppsCommunityForumPostEntity>(COMMUNITY_ENTITY_NAMES.ForumPosts, user);
        const aPost = await md.GetEntityObject<mjBizAppsCommunityForumAnswerPostEntity>(
          COMMUNITY_ENTITY_NAMES.ForumAnswerPosts,
          user,
        );
        if (!post || !aPost) {
          this.qaActionMessage = 'Could not instantiate Answer entities.';
          this.cdr.markForCheck();
          return;
        }
        post.ForumID = this.allowedForumIDs[0];
        post.AuthorUserID = user.ID;
        post.PostTypeID = postTypeId;
        post.RootPostID = targetQuestionId;
        post.ParentPostID = targetQuestionId;
        post.Title = newAnswer.title;
        post.BodyMarkdown = body;
        post.Status = 'Published';
        const postSaved = await post.Save();
        if (!postSaved) {
          this.qaActionMessage = 'Failed to save Forum Post for answer.';
          this.cdr.markForCheck();
          return;
        }
        aPost.ID = post.ID;
        aPost.QuestionPostID = targetQuestionId;
        aPost.AIEpistemicStatus = 'Novel Insight';
        aPost.IsAcceptedByAuthor = false;
        const aSaved = await aPost.Save();
        if (!aSaved) {
          await post.Delete().catch(() => false);
          this.qaActionMessage = 'Failed to save Forum Answer Post subtype — rolled back base post.';
          this.cdr.markForCheck();
          return;
        }
        newAnswer.id = post.ID;
      } catch (err) {
        this.qaActionMessage = err instanceof Error ? err.message : 'Failed to submit answer.';
        this.cdr.markForCheck();
        return;
      }
    }

    this.qaCanonItems = [newAnswer, ...this.qaCanonItems];
    this.rebuildCommonsItems();
    this.selectedQaId = newAnswer.id;
    this.newAnswerBody = '';
    this.qaActionMessage = 'Answer submitted for Epistemic grading.';
    this.cdr.markForCheck();
  }

  public async GradeAnswerWithAI(itemId: string): Promise<void> {
    const item = this.qaCanonItems.find((q) => q.id === itemId);
    if (!item) return;

    const provider = Metadata.Provider;
    if (provider?.CurrentUser) {
      try {
        AssertValidUUID(item.id, 'answerPostId');
        const actionClient = new GraphQLActionClient(provider as GraphQLDataProvider);
        const res = await actionClient.RunAction(COMMUNITY_ACTION_IDS.EpistemicAnswerGrading, [
          { Name: 'AnswerPostID', Value: item.id, Type: 'Input' },
        ]);
        if (!res.Success) {
          this.qaActionMessage = res.Message || 'Epistemic grading failed.';
          this.cdr.markForCheck();
          return;
        }
        const statusParam = res.Params?.find((p) => p.Name === 'EpistemicStatus')?.Value;
        const scoreParam = res.Params?.find((p) => p.Name === 'ConfidenceScore')?.Value;
        if (typeof statusParam === 'string' && statusParam.trim()) {
          item.epistemicStatus = statusParam;
        }
        if (typeof scoreParam === 'number' && Number.isFinite(scoreParam)) {
          item.confidenceScore = scoreParam;
        } else if (typeof scoreParam === 'string' && scoreParam.trim() && Number.isFinite(Number(scoreParam))) {
          item.confidenceScore = Number(scoreParam);
        }
        this.qaActionMessage = res.Message || `Graded "${item.title}".`;
        this.rebuildCommonsItems();
        this.cdr.markForCheck();
        return;
      } catch (err) {
        this.qaActionMessage = err instanceof Error ? err.message : 'Epistemic grading failed.';
        this.cdr.markForCheck();
        return;
      }
    }

    item.epistemicStatus = 'Canon Verified';
    item.confidenceScore = 0.91;
    this.qaActionMessage = `Graded "${item.title}" as Canon Verified (0.91 confidence).`;
    this.rebuildCommonsItems();
    this.cdr.markForCheck();
  }

  public async PromoteAnswerToCanon(itemId: string): Promise<void> {
    const item = this.qaCanonItems.find((q) => q.id === itemId);
    if (!item) return;

    const provider = Metadata.Provider;
    const user: UserInfo | undefined = provider?.CurrentUser;
    if (provider && user) {
      try {
        const answerId = AssertValidUUID(item.id, 'canonAnswerPostId');
        const questionId = AssertValidUUID(item.questionPostId ?? '', 'questionPostId');
        const md = new Metadata();
        const answer = await md.GetEntityObject<mjBizAppsCommunityForumAnswerPostEntity>(
          COMMUNITY_ENTITY_NAMES.ForumAnswerPosts,
          CompositeKey.FromID(answerId),
          user,
        );
        const question = await md.GetEntityObject<mjBizAppsCommunityForumQuestionPostEntity>(
          COMMUNITY_ENTITY_NAMES.ForumQuestionPosts,
          CompositeKey.FromID(questionId),
          user,
        );
        if (!answer || !question) {
          this.qaActionMessage = 'Could not load target Question or Answer record for Canon promotion.';
          this.cdr.markForCheck();
          return;
        }

        const prevAcceptedId = question.AcceptedAnswerPostID;
        if (prevAcceptedId && !UUIDsEqual(prevAcceptedId, answerId)) {
          const prevAnswer = await md.GetEntityObject<mjBizAppsCommunityForumAnswerPostEntity>(
            COMMUNITY_ENTITY_NAMES.ForumAnswerPosts,
            CompositeKey.FromID(prevAcceptedId),
            user,
          );
          if (prevAnswer && prevAnswer.IsAcceptedByAuthor) {
            prevAnswer.IsAcceptedByAuthor = false;
            if (!(await prevAnswer.Save())) {
              this.qaActionMessage = `Failed to clear previously accepted answer ${prevAcceptedId}.`;
              this.cdr.markForCheck();
              return;
            }
          }
        }

        question.AcceptedAnswerPostID = answerId;
        question.AICanonAnswerPostID = answerId;
        if (!(await question.Save())) {
          this.qaActionMessage = `Failed to persist Canon link onto Question ${questionId}.`;
          this.cdr.markForCheck();
          return;
        }

        answer.IsAcceptedByAuthor = true;
        answer.AIEpistemicStatus = 'Canon Verified';
        if (!(await answer.Save())) {
          this.qaActionMessage = `Failed to persist Canon Verified status onto Answer ${answerId}.`;
          this.cdr.markForCheck();
          return;
        }
      } catch (err) {
        this.qaActionMessage = err instanceof Error ? err.message : 'Failed to promote answer to Canon.';
        this.cdr.markForCheck();
        return;
      }
    }

    for (const q of this.qaCanonItems) {
      if (item.questionPostId && q.questionPostId && UUIDsEqual(q.questionPostId, item.questionPostId) && q.id !== item.id) {
        q.isAccepted = false;
      }
    }
    item.isAccepted = true;
    item.epistemicStatus = 'Canon Verified';
    this.qaActionMessage = `Promoted "${item.title}" to Knowledge Canon.`;
    this.rebuildCommonsItems();
    this.cdr.markForCheck();
  }

  public SelectCampaign(campaignId: string): void {
    this.selectedCampaignId = campaignId;
    this.ideationErrorMessage = null;
    const first = this.visibleIdeationItems[0]?.id ?? null;
    this.selectedIdeaId = first;
    this.focusedIdeaId = first;
    this.cdr.markForCheck();
  }

  public SelectIdea(ideaId: string): void {
    this.selectedIdeaId = ideaId;
    this.focusedIdeaId = ideaId;
    this.ideationErrorMessage = null;
    this.cdr.markForCheck();
  }

  public applyQuickIdeaAllocation(points: number): void {
    if (!this.selectedIdeaId) return;
    const effectiveVotes = ComputeQuadraticEffectiveVotes(points, this.activeCampaign.allocationMode);
    void this.OnVoteAllocationChanged(this.selectedIdeaId, points, effectiveVotes);
  }

  public async ProposeIdea(): Promise<void> {
    const title = this.newIdeaTitle.trim();
    if (!title) return;
    const summary = this.newIdeaSummary.trim() || 'Community member proposal.';
    const generatedId = crypto.randomUUID();
    const created: CommunityHubIdeaItem = {
      id: generatedId,
      campaignId: this.activeCampaign.id,
      title,
      summary,
      totalPointsAllocated: 0,
      effectiveQuadraticVotes: 0,
      myPointsAllocated: 0,
      myEffectiveVotes: 0,
    };

    const provider = Metadata.Provider;
    const user: UserInfo | undefined = provider?.CurrentUser;
    if (provider && user) {
      try {
        await this.ensurePostTypesLoaded(user);
        const postTypeId = this.resolvePostTypeId('idea');
        if (!postTypeId) {
          this.ideationErrorMessage = 'PostType "idea" is not configured — cannot propose idea.';
          this.cdr.markForCheck();
          return;
        }
        const md = new Metadata();
        const post = await md.GetEntityObject<mjBizAppsCommunityForumPostEntity>(COMMUNITY_ENTITY_NAMES.ForumPosts, user);
        const ideaPost = await md.GetEntityObject<mjBizAppsCommunityForumIdeaPostEntity>(
          COMMUNITY_ENTITY_NAMES.ForumIdeaPosts,
          user,
        );
        if (!post || !ideaPost) {
          this.ideationErrorMessage = 'Could not instantiate Idea entities.';
          this.cdr.markForCheck();
          return;
        }
        post.ForumID = this.activeCampaign.id;
        post.AuthorUserID = user.ID;
        post.PostTypeID = postTypeId;
        post.Title = title;
        post.BodyMarkdown = summary;
        post.Status = 'Published';
        const postSaved = await post.Save();
        if (!postSaved) {
          this.ideationErrorMessage = 'Failed to save Forum Post for proposed idea.';
          this.cdr.markForCheck();
          return;
        }
        ideaPost.ID = post.ID;
        ideaPost.TotalPointsAllocated = 0;
        ideaPost.EffectiveQuadraticVotes = 0;
        ideaPost.UniqueBackerCount = 0;
        const ideaSaved = await ideaPost.Save();
        if (!ideaSaved) {
          await post.Delete().catch(() => false);
          this.ideationErrorMessage = 'Failed to save Forum Idea Post subtype — rolled back base post.';
          this.cdr.markForCheck();
          return;
        }
        created.id = post.ID;
      } catch (err) {
        this.ideationErrorMessage = err instanceof Error ? err.message : 'Failed to save proposed idea.';
        this.cdr.markForCheck();
        return;
      }
    }

    this.ideationItems = [created, ...this.ideationItems];
    this.rebuildCommonsItems();
    this.selectedIdeaId = created.id;
    this.focusedIdeaId = created.id;
    this.newIdeaTitle = '';
    this.newIdeaSummary = '';
    this.showIdeaComposer = false;
    this.ideationErrorMessage = null;
    this.cdr.markForCheck();
  }

  public OnIdeaKeydown(event: KeyboardEvent, currentIdeaId: string): void {
    const list = this.visibleIdeationItems;
    const currentIndex = list.findIndex((i) => UUIDsEqual(i.id, currentIdeaId));
    if (currentIndex < 0 || list.length === 0) return;
    let nextIndex = currentIndex;

    switch (event.key) {
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % list.length;
        break;
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + list.length) % list.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = list.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.SelectIdea(currentIdeaId);
        return;
      default:
        return;
    }

    event.preventDefault();
    const nextId = list[nextIndex].id;
    this.focusedIdeaId = nextId;
    this.cdr.markForCheck();
    queueMicrotask(() => this.focusIdeaButton(nextIndex));
  }

  private focusIdeaButton(index: number): void {
    this.ideaButtons?.toArray()[index]?.nativeElement.focus();
  }

  /** Persists a member's Quadratic Voting allocation atomically with fail-closed aggregate
   * computation & compensating rollback (`CR-21`) and campaign-scoped wallet tracking (`CR-22`). */
  public async OnVoteAllocationChanged(ideaId: string, pointsAllocated: number, effectiveVotes: number): Promise<void> {
    const idea = this.ideationItems.find((i) => UUIDsEqual(i.id, ideaId));
    if (!idea) return;

    this.ideationErrorMessage = null;
    const previous = {
      totalPointsAllocated: idea.totalPointsAllocated,
      effectiveQuadraticVotes: idea.effectiveQuadraticVotes,
      myPointsAllocated: idea.myPointsAllocated,
      myEffectiveVotes: idea.myEffectiveVotes,
    };
    const prevAllocsSnapshot = [...this.allUserAllocations];

    const otherBackersPoints = idea.totalPointsAllocated - idea.myPointsAllocated;
    const otherBackersVotes = idea.effectiveQuadraticVotes - idea.myEffectiveVotes;
    idea.totalPointsAllocated = otherBackersPoints + pointsAllocated;
    idea.effectiveQuadraticVotes = otherBackersVotes + effectiveVotes;
    idea.myPointsAllocated = pointsAllocated;
    idea.myEffectiveVotes = effectiveVotes;
    this.upsertLocalUserAllocation(ideaId, pointsAllocated, effectiveVotes);
    this.cdr.markForCheck();

    const provider = Metadata.Provider;
    const user: UserInfo | undefined = provider?.CurrentUser;
    if (!provider || !user) return;

    try {
      const outcome = await PersistIdeaAllocationAtomic({
        ideaPostId: ideaId,
        user,
        pointsAllocated,
        effectiveVotes,
      });
      if (!outcome.success) {
        Object.assign(idea, previous);
        this.allUserAllocations = prevAllocsSnapshot;
        this.ideationErrorMessage = outcome.errorMessage ?? 'Could not save allocation — reverted.';
      } else if (outcome.aggregate) {
        idea.totalPointsAllocated = outcome.aggregate.totalPointsAllocated;
        idea.effectiveQuadraticVotes = outcome.aggregate.effectiveQuadraticVotes;
      }
    } catch (err) {
      Object.assign(idea, previous);
      this.allUserAllocations = prevAllocsSnapshot;
      this.ideationErrorMessage = err instanceof Error ? err.message : 'Allocation persistence failed — reverted.';
    } finally {
      this.cdr.markForCheck();
    }
  }

  private upsertLocalUserAllocation(ideaId: string, pointsAllocated: number, quadraticVotes: number): void {
    const idx = this.allUserAllocations.findIndex((a) => UUIDsEqual(a.IdeaPostID, ideaId));
    if (idx >= 0) {
      this.allUserAllocations[idx] = { ...this.allUserAllocations[idx], PointsAllocated: pointsAllocated, QuadraticVotes: quadraticVotes };
    } else {
      this.allUserAllocations.push({ ID: `local-${ideaId}`, IdeaPostID: ideaId, PointsAllocated: pointsAllocated, QuadraticVotes: quadraticVotes });
    }
  }

  // ─── Living Co-Authoring, Inline Forms & Sandboxed Mini-App Viewer (CR-04) ───

  public SelectLivingDoc(docId: string): void {
    this.selectedLivingDocId = docId;
    const doc = this.livingDocItems.find((d) => d.id === docId) ?? null;
    this.editingDocMarkdown = doc?.bodyMarkdown ?? '';
    this.docActionMessage = null;
    this.formSubmittedMessage = null;
    if (doc?.postTypeCode === 'interactive-experience') {
      const rawHtml = buildMiniAppSrcdoc(doc.title, doc.experienceKind ?? 'Interactive');
      this.sandboxedMiniAppSrcdoc = this.sanitizer.bypassSecurityTrustHtml(rawHtml);
    } else {
      this.sandboxedMiniAppSrcdoc = null;
    }
    this.cdr.markForCheck();
  }

  public async SaveCoAuthoringDocument(targetDocId?: string, markdownOverride?: string): Promise<void> {
    const doc =
      (targetDocId ? this.livingDocItems.find((d) => d.id === targetDocId) : null) ?? this.selectedLivingDoc;
    if (!doc) return;
    if (targetDocId && this.selectedLivingDocId !== targetDocId) {
      this.selectedLivingDocId = targetDocId;
    }
    const markdownToSave = markdownOverride ?? this.editingDocMarkdown;
    this.editingDocMarkdown = markdownToSave;
    const provider = Metadata.Provider;
    const user: UserInfo | undefined = provider?.CurrentUser;
    if (provider && user) {
      try {
        const post = await new Metadata().GetEntityObject<mjBizAppsCommunityForumPostEntity>(
          COMMUNITY_ENTITY_NAMES.ForumPosts,
          CompositeKey.FromID(AssertValidUUID(doc.id, 'livingDocId')),
          user,
        );
        if (!post) {
          this.docActionMessage = `Could not find document "${doc.title}" to save revision.`;
          this.cdr.markForCheck();
          return;
        }
        post.BodyMarkdown = markdownToSave;
        if (!(await post.Save())) {
          this.docActionMessage = `Failed saving co-authored revision for "${doc.title}".`;
          this.cdr.markForCheck();
          return;
        }
      } catch (err) {
        this.docActionMessage = err instanceof Error ? err.message : 'Failed saving co-authored revision.';
        this.cdr.markForCheck();
        return;
      }
    }
    this.livingDocItems = this.livingDocItems.map((item) =>
      item.id === doc.id ? { ...item, bodyMarkdown: markdownToSave } : item,
    );
    this.docActionMessage = `Saved co-authored revision for "${doc.title}".`;
    this.cdr.markForCheck();
  }

  public SubmitInlineForm(targetDocId?: string): void {
    const doc =
      (targetDocId ? this.livingDocItems.find((d) => d.id === targetDocId) : null) ?? this.selectedLivingDoc;
    if (!doc) return;
    if (targetDocId && this.selectedLivingDocId !== targetDocId) {
      this.selectedLivingDocId = targetDocId;
    }
    this.formSubmissionCount += 1;
    this.formSubmittedMessage = `Recorded submission #${this.formSubmissionCount} for "${doc.title}" (Confidence: ${this.formConfidenceRating}).`;
    this.formComments = '';
    this.cdr.markForCheck();
  }

  public ResetMiniApp(targetDocId?: string): void {
    const doc =
      (targetDocId ? this.livingDocItems.find((d) => d.id === targetDocId) : null) ?? this.selectedLivingDoc;
    if (!doc || doc.postTypeCode !== 'interactive-experience') return;
    if (targetDocId && this.selectedLivingDocId !== targetDocId) {
      this.selectedLivingDocId = targetDocId;
    }
    this.miniAppResetNonce += 1;
    const rawHtml = buildMiniAppSrcdoc(`${doc.title} #${this.miniAppResetNonce}`, doc.experienceKind ?? 'Interactive');
    this.sandboxedMiniAppSrcdoc = this.sanitizer.bypassSecurityTrustHtml(rawHtml);
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
    this.focusedTabKey = this.tabs[nextIndex].key;
    this.cdr.markForCheck();
    queueMicrotask(() => this.focusTabButton(nextIndex));
  }

  private focusTabButton(index: number): void {
    this.tabButtons?.toArray()[index]?.nativeElement.focus();
  }

  public override async GetResourceDisplayName(_data: ResourceData): Promise<string> {
    return this.spaceName ? `${this.spaceName} — Community Hub` : 'MemberJunction Community Hub';
  }

  public override async GetResourceIconClass(_data: ResourceData): Promise<string> {
    return 'fa-solid fa-comments';
  }
}
