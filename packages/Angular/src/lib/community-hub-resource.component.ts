import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  type SimpleChanges,
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
  type mjBizAppsCommunityForumInteractivePostEntity,
  type mjBizAppsCommunityForumPostEntity,
  type mjBizAppsCommunityForumPostReactionEntity,
  type mjBizAppsCommunityForumPostTagEntity,
  type mjBizAppsCommunityForumQuestionPostEntity,
} from '@mj-biz-apps/community-entities';
import {
  AssertValidUUID,
  AssertValidUUIDList,
  COMMUNITY_ACTION_IDS,
  type IdeationAllocationMode,
} from '@mj-biz-apps/community-core';
import {
  CommunityHubPreferences,
  type CommunityHubDigestCadence,
  type CommunityHubTabKey,
} from './community-hub-preferences.ts';
import {
  BuildClientLivingSynthesis,
  BuildPersonalizedDigestPreview,
  ComputeLiveAskFirstMatches,
  GetActionOutputValue,
  ParseLivingSynthesisPayload,
  ParseSendDigestActionResult,
  ResolveCommunityActionIDWithRunView,
  type AskFirstLiveMatch,
  type LivingThreadSynthesisView,
  type PersonalizedDigestPreviewItem,
  type PersonalizedDigestProfileSummary,
  type SendDigestSummaryView,
} from './community-hub-wedge.ts';
import {
  ComputeCampaignWalletSpentOnOthers,
  IDEA_POST_TYPE_CODE,
  LoadAllPaginatedRows,
  PersistIdeaAllocationAtomic,
  PersistProposedIdea,
  type IdeaAllocationAggregateRow,
} from './community-hub-ideation.ts';
import { GraduateThreadViaProvider, PromoteAnswerToCanonViaProvider } from './community-hub-mutations.ts';
import {
  BuildCommonsStreamItems,
  BuildDynamicSpaceDirectory,
  BuildDynamicTopicTags,
  BuildEditorialPorchHighlights,
  COMMUNITY_SPACES_DIRECTORY,
  ComputeNextTrapFocusTarget,
  FindMatchedCanonQuestion,
  GraduateStreamItem,
  MapForumNameToSpaceId,
  PersistAskSharePost,
  PersistDetailReply,
  ResolveAuthorizedForumTarget,
  SEEDED_COMMUNITY_SESSIONS,
  ToggleReactionViaProvider,
  type AskShareEntryType,
  type AskShareValidationErrors,
  type AuthorizedForumOption,
  type CommunityCommonsItem,
  type CommunityCommonsReply,
  type CommunityFeaturedHighlight,
  type CommunitySessionItem,
  type CommunitySpaceDirectoryItem,
  type CommunitySpaceFilterId,
  type CommunityStreamTypeFilter,
  type LiveForumDirectoryRow,
  type LiveForumTopicTagRow,
  type LiveSpaceDirectoryRow,
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
  forumId?: string | null;
  title: string;
  bodyMarkdown: string;
  epistemicStatus: mjBizAppsCommunityForumAnswerPostEntity['AIEpistemicStatus'];
  confidenceScore: number | null;
  isAccepted: boolean;
  reactionScore?: number | null;
  replyCount?: number | null;
  promotedToSpaceId?: string | null;
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
  promotedToSpaceId?: string | null;
}

export interface CommunityHubLivingDocItem {
  id: string;
  forumId?: string | null;
  title: string;
  bodyMarkdown: string;
  postTypeCode: 'collaborative-doc' | 'collaborative-sheet' | 'collaborative-deck' | 'interactive-experience';
  experienceKind?: mjBizAppsCommunityForumInteractivePostEntity['ExperienceKind'] | null;
  reactionScore?: number | null;
  replyCount?: number | null;
  promotedToSpaceId?: string | null;
}

export interface CommunityHubFeedPost {
  id: string;
  forumId?: string | null;
  title: string;
  bodyMarkdown: string;
  status: mjBizAppsCommunityForumPostEntity['Status'];
  authorName?: string | null;
  authorRole?: string | null;
  replyCount?: number | null;
  reactionScore?: number | null;
  promotedToSpaceId?: string | null;
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
  SpaceID?: string | null;
  Description?: string | null;
}

interface ForumPostRow {
  ID: string;
  ForumID: string;
  Title: string | null;
  BodyMarkdown: string;
  Status: mjBizAppsCommunityForumPostEntity['Status'];
  AuthorUserID?: string | null;
  ReplyCount?: number | null;
  ReactionScore?: number | null;
  PromotedToSpaceID?: string | null;
}

interface ForumReplyRow {
  ID: string;
  RootPostID: string | null;
  ParentPostID: string | null;
  AuthorUserID?: string | null;
  BodyMarkdown: string;
  Status: mjBizAppsCommunityForumPostEntity['Status'];
  ReactionScore?: number | null;
}

interface ForumPostTagRow {
  ID: string;
  PostID: string;
  TopicTagID: string;
}

interface ForumPostReactionRow {
  ID: string;
  PostID: string;
}

interface AnswerPostRow {
  ID: string;
  QuestionPostID: string;
  AIEpistemicStatus: mjBizAppsCommunityForumAnswerPostEntity['AIEpistemicStatus'];
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
  ExperienceKind: mjBizAppsCommunityForumInteractivePostEntity['ExperienceKind'] | null;
}

const DEFAULT_CAMPAIGN: CommunityHubCampaign = {
  id: 'seed-campaign-1',
  name: 'Product Roadmap Q1',
  allocationMode: 'Quadratic',
  budgetPoints: 100,
  maxPointsPerIdea: 40,
};

const NO_ACTIVE_CAMPAIGN: CommunityHubCampaign = {
  id: '',
  name: 'No Active Campaign',
  allocationMode: 'Quadratic',
  budgetPoints: 0,
  maxPointsPerIdea: null,
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
 *
 * Aligns `docs/ux/*.html` prototype navigation items to domain-neutral tabs and rails:
 * - "Playbooks & Make-Room Tools" -> `living-co-authoring`
 * - "Committees & Working Groups" / "Committees & Working Groups 1 Vote" -> `knowledge-stream` (`Governance & RFCs`)
 * - "2027 Priority Board" / "2027 Priority Board 60 pts" -> `quadratic-ideation-wallet`
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
export class CommunityHubResource extends BaseResourceComponent implements OnInit, OnChanges {
  @Input() public ScopeSpaceId: string | null = null;
  @Input() public InitialTabKey: CommunityHubTabKey | null = null;
  @Input() public EmbeddedMode = false;
  @Input() public ShowTabBar = true;
  @Output() public readonly embeddedTabRequested = new EventEmitter<CommunityHubTabKey>();
  @Output() public readonly graduatedSpaceOpened = new EventEmitter<{ spaceId: string }>();

  public readonly tabs = COMMUNITY_HUB_TABS;
  public readonly spaceDirectory = COMMUNITY_SPACES_DIRECTORY.filter((s) => s.id !== 'all');
  public activeTabKey: CommunityHubTabKey = COMMUNITY_HUB_TABS[0].key;
  public focusedTabKey: CommunityHubTabKey = COMMUNITY_HUB_TABS[0].key;
  public activeSection: 'hub' | 'spaces' = 'hub';
  public embeddedCollaborationMode = false;
  public activeGraduatedSpaceId: string | null = null;
  public graduatedSpaceRecord: { ID: string; Name: string; Description: string | null } | null = null;
  public isLoadingGraduatedSpace = false;

  public spaceName = 'MemberJunction Community';
  public isOfflineDemoMode = false;
  public authorizedForums: AuthorizedForumOption[] = [];
  public allowedForumIDs: string[] = [];
  public feedPosts: CommunityHubFeedPost[] = [];
  public selectedFeedPostId: string | null = null;
  public threadSynthesisResult: string | null = null;
  public structuredThreadSynthesis: LivingThreadSynthesisView | null = null;
  public isSynthesizingFeed = false;

  // Sticky Header Search, Digest Export, Personalized Digest Preview & Editorial Porch state
  public headerSearchQuery = '';
  public porchCollapsed = false;
  public isExportingDigest = false;
  public digestExportError: string | null = null;
  public isDigestDrawerOpen = false;
  public digestCadence: CommunityHubDigestCadence = 'weekly';
  public digestProfileSummary: PersonalizedDigestProfileSummary | null = null;
  public digestPreviewItems: PersonalizedDigestPreviewItem[] = [];
  public isLoadingDigestPreview = false;
  public isSendingTestDigest = false;
  public sendTestDigestResult: SendDigestSummaryView | null = null;
  public sendTestDigestError: string | null = null;
  public liveAskShareDeflections: AskFirstLiveMatch[] = [];
  private askShareDeflectionNonce = 0;
  private digestPreviewNonce = 0;

  // 3-Column Commons Workspace state
  public commonsItems: CommunityCommonsItem[] = [];
  public streamSpaces: CommunitySpaceDirectoryItem[] = [];
  public streamTopics: string[] = [];
  public loadedTopicTags: LiveForumTopicTagRow[] = [];
  public activeSpaceFilter: CommunitySpaceFilterId = 'all';
  private previousSpaceFilterBeforeWorkingSpace: CommunitySpaceFilterId | null = null;
  public activeTopicFilter: string | null = null;
  public activeStreamTypeFilter: CommunityStreamTypeFilter = 'all';
  public sessions: CommunitySessionItem[] = [];
  public hubLoadError: string | null = null;
  public streamActionError: string | null = null;

  // Slide-Over Detail Sheet Drawer state
  public detailSheetItemId: string | null = null;
  public detailReplyText = '';
  public detailActionMessage: string | null = null;
  public detailErrorMessage: string | null = null;

  // Ask or Share Modal state
  public isAskShareModalOpen = false;
  public askShareEntryType: AskShareEntryType = 'Question';
  public askShareTitle = '';
  public askShareSpaceId: CommunitySpaceFilterId = 'architecture-standards';
  public askShareForumId = '';
  public askShareBody = '';
  public askShareTags = '';
  public askShareSelectedTagIds: string[] = [];
  public askShareValidationErrors: AskShareValidationErrors = {};
  public askShareError: string | null = null;

  public qaCanonItems: CommunityHubQACanonItem[] = [];
  public selectedQaId: string | null = null;
  public showQuestionComposer = false;
  public newQuestionTitle = '';
  public newQuestionBody = '';
  public newAnswerBody = '';
  public qaActionMessage: string | null = null;

  public campaigns: CommunityHubCampaign[] = [];
  public selectedCampaignId: string | null = null;
  public ideationItems: CommunityHubIdeaItem[] = [];
  public allUserAllocations: IdeaAllocationAggregateRow[] = [];
  public selectedIdeaId: string | null = null;
  public focusedIdeaId: string | null = null;
  public ideationErrorMessage: string | null = null;
  public ideationLoadFailed = false;
  public showIdeaComposer = false;
  public newIdeaTitle = '';
  public newIdeaSummary = '';
  public persistenceErrorMessage: string | null = null;
  private readonly postTypeIdByCode = new Map<string, string>();
  private readonly userAddedCommonsItems: CommunityCommonsItem[] = [];
  private readonly forumSpaceIdByForumId = new Map<string, string>();
  private readonly spaceNameById = new Map<string, string>();
  private readonly repliesByRootPostId = new Map<string, CommunityCommonsReply[]>();
  private readonly upvotedPostIds = new Set<string>();
  private readonly tagNamesByPostId = new Map<string, string[]>();

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

  public get hasActiveCampaign(): boolean {
    return this.campaigns.length > 0;
  }

  public get activeCampaign(): CommunityHubCampaign {
    if (this.campaigns.length === 0) {
      return this.isOfflineDemoMode ? DEFAULT_CAMPAIGN : NO_ACTIVE_CAMPAIGN;
    }
    const selected =
      this.campaigns.find((c) => this.selectedCampaignId && UUIDsEqual(c.id, this.selectedCampaignId)) ??
      this.campaigns[0];
    const normalizedBudget = NormalizeCampaignBudget(selected.budgetPoints, DEFAULT_CAMPAIGN_BUDGET_POINTS);
    return normalizedBudget === selected.budgetPoints ? selected : { ...selected, budgetPoints: normalizedBudget };
  }

  public get visibleIdeationItems(): CommunityHubIdeaItem[] {
    const campaignId = this.activeCampaign.id;
    if (!campaignId) return [];
    return this.ideationItems.filter((i) => UUIDsEqual(i.campaignId, campaignId));
  }

  public get walletSummary(): IdeationWalletSummary {
    if (!this.hasActiveCampaign && !this.isOfflineDemoMode) {
      return {
        budgetPoints: 0,
        spentPoints: 0,
        remainingPoints: 0,
        utilizationPct: 0,
        backedIdeasCount: 0,
      };
    }
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
    return Boolean(this.detailSheetItem || this.isAskShareModalOpen || this.isDigestDrawerOpen);
  }

  public get topDigestMatchTitle(): string | null {
    return this.digestPreviewItems[0]?.title ?? null;
  }

  public get topDigestMatchScorePct(): number {
    return this.digestPreviewItems[0]?.matchScorePct ?? 0;
  }

  public get askShareDeflectionMatches(): ReadonlyArray<AskFirstLiveMatch> {
    if (this.liveAskShareDeflections.length > 0) {
      return this.liveAskShareDeflections;
    }
    const q = this.askShareTitle.trim().toLowerCase();
    if (q.length < 4) return [];
    const words = q.split(/\s+/).filter((w) => w.length > 3);
    if (words.length === 0) return [];
    return this.qaCanonItems
      .filter((item) => {
        const hay = `${item.title} ${item.bodyMarkdown}`.toLowerCase();
        return words.some((w) => hay.includes(w));
      })
      .slice(0, 2)
      .map((item) => ({
        id: item.id,
        sourcePostId: item.id,
        title: item.title,
        answerSnippet: item.bodyMarkdown.slice(0, 140),
        epistemicStatus: item.epistemicStatus,
        matchPct: Math.round((item.confidenceScore ?? 0.78) * 100),
        isSemanticMatch: false,
      }));
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
  @ViewChild('digestDrawerDialog') private digestDrawerDialog?: ElementRef<HTMLElement>;

  private lastDetailTrigger: HTMLElement | null = null;
  private lastAskShareTrigger: HTMLElement | null = null;
  private lastDigestTrigger: HTMLElement | null = null;

  private readonly preferences = new CommunityHubPreferences();
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly doc = inject(DOCUMENT);

  private isInitialized = false;

  public override ngOnInit(): void {
    super.ngOnInit();
    queueMicrotask(() => {
      this.NotifyLoadStarted();
      this.isInitialized = true;
      this.restoreUserPreferences();
      if (this.InitialTabKey && this.tabs.some((t) => t.key === this.InitialTabKey)) {
        this.activeTabKey = this.InitialTabKey;
        this.focusedTabKey = this.InitialTabKey;
      }
      void this.loadHubState().finally(() => this.NotifyLoadComplete());
    });
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['InitialTabKey'] && this.InitialTabKey && this.tabs.some((t) => t.key === this.InitialTabKey)) {
      this.activeTabKey = this.InitialTabKey;
      this.focusedTabKey = this.InitialTabKey;
      this.cdr.markForCheck();
    }
    if (this.isInitialized && changes['ScopeSpaceId']) {
      void this.loadHubState();
    }
  }

  private restoreUserPreferences(): void {
    const saved = this.preferences.GetActiveTab();
    if (saved && this.tabs.some((tab) => tab.key === saved)) {
      this.activeTabKey = saved;
      this.focusedTabKey = saved;
    }
    this.porchCollapsed = this.preferences.GetPorchCollapsed();
    const savedCadence = this.preferences.GetDigestCadence();
    if (savedCadence) {
      this.digestCadence = savedCadence;
    }
    const savedTopic = this.preferences.GetActiveTopicFilter();
    if (savedTopic) {
      this.activeTopicFilter = savedTopic;
    }
  }

  private rebuildCommonsItems(): void {
    const built = BuildCommonsStreamItems({
      feedPosts: this.feedPosts.map((p) => {
        const key = p.id.toLowerCase();
        return {
          ...p,
          upvoteCount: p.reactionScore ?? 0,
          upvotedByMe: this.upvotedPostIds.has(key),
          replyCount: p.replyCount ?? 0,
          replies: this.repliesByRootPostId.get(key),
          tags: this.isOfflineDemoMode ? undefined : (this.tagNamesByPostId.get(key) ?? []),
        };
      }),
      qaCanonItems: this.qaCanonItems.map((qa) => {
        const key = qa.id.toLowerCase();
        return {
          ...qa,
          upvoteCount: qa.reactionScore ?? 0,
          upvotedByMe: this.upvotedPostIds.has(key),
          replyCount: qa.replyCount ?? 0,
          replies: this.repliesByRootPostId.get(key),
          tags: this.isOfflineDemoMode ? undefined : (this.tagNamesByPostId.get(key) ?? []),
        };
      }),
      ideationItems: this.ideationItems.map((idea) => {
        const key = idea.id.toLowerCase();
        return {
          ...idea,
          upvotedByMe: this.upvotedPostIds.has(key),
          replies: this.repliesByRootPostId.get(key),
          tags: this.isOfflineDemoMode ? undefined : (this.tagNamesByPostId.get(key) ?? []),
        };
      }),
      livingDocItems: this.livingDocItems.map((doc) => {
        const key = doc.id.toLowerCase();
        return {
          ...doc,
          upvoteCount: doc.reactionScore ?? 0,
          upvotedByMe: this.upvotedPostIds.has(key),
          replyCount: doc.replyCount ?? 0,
          replies: this.repliesByRootPostId.get(key),
          tags: this.isOfflineDemoMode ? undefined : (this.tagNamesByPostId.get(key) ?? []),
        };
      }),
      includeDemoFixtures: this.isOfflineDemoMode,
      spaceNameById: this.isOfflineDemoMode ? undefined : this.spaceNameById,
      forumSpaceIdByForumId: this.isOfflineDemoMode ? undefined : this.forumSpaceIdByForumId,
    });
    const merged = [...this.userAddedCommonsItems, ...built];
    const seen = new Set<string>();
    const seenSourcePostIds = new Set<string>();
    this.commonsItems = merged.filter((item) => {
      if (seen.has(item.id)) return false;
      if (item.sourcePostId && seenSourcePostIds.has(item.sourcePostId)) return false;
      seen.add(item.id);
      if (item.sourcePostId) {
        seenSourcePostIds.add(item.sourcePostId);
      }
      return true;
    });
    void this.refreshDigestPreview();
  }

  private buildUuidInClause(ids: ReadonlyArray<string>, label: string): string {
    return ids.map((id) => `'${AssertValidUUID(id, label)}'`).join(',');
  }

  private loadHubStateVersion = 0;

  private resetTransientSpaceState(): void {
    this.userAddedCommonsItems.length = 0;
    this.forumSpaceIdByForumId.clear();
    this.spaceNameById.clear();
    this.repliesByRootPostId.clear();
    this.upvotedPostIds.clear();
    this.tagNamesByPostId.clear();
    this.detailSheetItemId = null;
    this.detailReplyText = '';
    this.detailActionMessage = null;
    this.detailErrorMessage = null;
    this.streamActionError = null;
    this.hubLoadError = null;
    this.threadSynthesisResult = null;
    this.structuredThreadSynthesis = null;
    this.qaActionMessage = null;
    this.docActionMessage = null;
    this.formSubmittedMessage = null;
    this.ideationErrorMessage = null;
    this.showQuestionComposer = false;
    this.showIdeaComposer = false;
    this.sendTestDigestResult = null;
    this.sendTestDigestError = null;
  }

  private async loadHubState(): Promise<void> {
    const loadVersion = ++this.loadHubStateVersion;
    this.resetTransientSpaceState();

    const provider = Metadata.Provider;
    if (!provider) {
      this.applySeededFallback();
      return;
    }

    const user: UserInfo | undefined = provider.CurrentUser;
    this.isOfflineDemoMode = false;
    if (!user) {
      this.clearLiveHubData(
        'Authenticated user session is required to load Community Hub.',
        [],
        [],
      );
      return;
    }

    try {
      const rv = new RunView();
      const rawScopeId = this.ScopeSpaceId?.trim() ?? '';
      const scopedSpaceId = rawScopeId ? AssertValidUUID(rawScopeId, 'ScopeSpaceId') : null;

      const [forumsResult, collabSpacesResult, communitySpacesResult, postTypesResult, topicTagsResult] =
        await Promise.all([
          LoadAllPaginatedRows<ForumRow>({
            runView: rv,
            entityName: COMMUNITY_ENTITY_NAMES.Forums,
            extraFilter: scopedSpaceId ? `SpaceID = '${scopedSpaceId}'` : '1=1',
            fields: ['ID', 'Name', 'SpaceID', 'Description'],
            user,
          }),
          LoadAllPaginatedRows<{ ID: string; Name: string }>({
            runView: rv,
            entityName: 'MJ_BizApps_Collaboration: Spaces',
            extraFilter: scopedSpaceId ? `ID = '${scopedSpaceId}'` : '1=1',
            fields: ['ID', 'Name'],
            user,
          }),
          LoadAllPaginatedRows<{ ID: string; Slug: string; CommunityKind: string }>({
            runView: rv,
            entityName: COMMUNITY_ENTITY_NAMES.CommunitySpaces,
            extraFilter: scopedSpaceId ? `ID = '${scopedSpaceId}'` : '1=1',
            fields: ['ID', 'Slug', 'CommunityKind'],
            user,
          }),
          LoadAllPaginatedRows<{ ID: string; Code: string }>({
            runView: rv,
            entityName: COMMUNITY_ENTITY_NAMES.PostTypes,
            extraFilter: '1=1',
            fields: ['ID', 'Code'],
            user,
          }),
          LoadAllPaginatedRows<LiveForumTopicTagRow>({
            runView: rv,
            entityName: COMMUNITY_ENTITY_NAMES.ForumTopicTags,
            extraFilter: scopedSpaceId ? `SpaceID = '${scopedSpaceId}'` : '1=1',
            fields: ['ID', 'SpaceID', 'Slug', 'Name', 'PostCount'],
            user,
          }),
        ]);
      if (loadVersion !== this.loadHubStateVersion) return;

      this.postTypeIdByCode.clear();
      for (const pt of postTypesResult.success ? postTypesResult.rows : []) {
        if (pt.Code) {
          this.postTypeIdByCode.set(pt.Code.trim().toLowerCase(), pt.ID);
        }
      }

      const forumRows = forumsResult.success ? forumsResult.rows : [];
      const collabSpaces = collabSpacesResult.success ? collabSpacesResult.rows : [];
      const collabNameById = new Map(collabSpaces.map((s) => [s.ID.toLowerCase(), s.Name]));
      const communitySpaces = communitySpacesResult.success ? communitySpacesResult.rows : [];

      const liveSpaceRows: LiveSpaceDirectoryRow[] =
        communitySpaces.length > 0
          ? communitySpaces.map((cs) => ({
              ID: cs.ID,
              Slug: cs.Slug,
              CommunityKind: cs.CommunityKind,
              Name: collabNameById.get(cs.ID.toLowerCase()) ?? cs.Slug,
            }))
          : collabSpaces.map((s) => ({
              ID: s.ID,
              Name: s.Name,
              CommunityKind: 'Community Space',
            }));

      const liveForumRows: LiveForumDirectoryRow[] = forumRows.map((f) => ({
        ID: f.ID,
        Name: f.Name,
        SpaceID: f.SpaceID ?? null,
        Description: f.Description ?? null,
      }));

      this.loadedTopicTags = topicTagsResult.success ? topicTagsResult.rows : [];
      this.streamSpaces = BuildDynamicSpaceDirectory({
        isOfflineDemoMode: false,
        spaces: liveSpaceRows,
        forums: liveForumRows,
      });
      this.streamTopics = BuildDynamicTopicTags({
        isOfflineDemoMode: false,
        topicTags: this.loadedTopicTags,
      });

      this.spaceNameById.clear();
      for (const spaceItem of this.streamSpaces) {
        if (spaceItem.id !== 'all') {
          this.spaceNameById.set(spaceItem.id.toLowerCase(), spaceItem.name);
        }
      }
      this.forumSpaceIdByForumId.clear();
      for (const f of forumRows) {
        const mappedSpaceId = f.SpaceID?.trim() || f.ID;
        this.forumSpaceIdByForumId.set(f.ID.toLowerCase(), mappedSpaceId);
      }

      const forumNameById = new Map(forumRows.map((f) => [f.ID.toLowerCase(), f.Name]));
      this.authorizedForums = forumRows.map((f) => ({
        id: f.ID,
        name: f.Name,
        spaceId: f.SpaceID?.trim() || MapForumNameToSpaceId(f.Name),
        dbSpaceId: f.SpaceID ?? null,
      }));
      this.allowedForumIDs = this.authorizedForums.map((f) => f.id);
      if (scopedSpaceId) {
        this.spaceName = collabNameById.get(scopedSpaceId.toLowerCase()) ?? this.spaceName;
      } else if (collabSpaces[0]?.Name) {
        this.spaceName = collabSpaces[0].Name;
      }

      if (!forumsResult.success) {
        this.clearLiveHubData(
          forumsResult.errorMessage || 'Failed to load Community Forums.',
          this.streamSpaces,
          this.streamTopics,
        );
        return;
      }

      if (scopedSpaceId && this.allowedForumIDs.length === 0) {
        this.clearLiveHubData(null, this.streamSpaces, this.streamTopics);
        return;
      }

      const scopedForumInList = scopedSpaceId ? this.buildUuidInClause(this.allowedForumIDs, 'forumId') : null;

      type ScopedPostRow = ForumPostRow & { RootPostID?: string | null };
      let spacePostById = new Map<string, ScopedPostRow>();
      let spacePostInList: string | null = null;
      if (scopedForumInList) {
        const spacePostsRes = await LoadAllPaginatedRows<ScopedPostRow>({
          runView: rv,
          entityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
          extraFilter: `Status = 'Published' AND ForumID IN (${scopedForumInList})`,
          fields: [
            'ID',
            'ForumID',
            'RootPostID',
            'Title',
            'BodyMarkdown',
            'Status',
            'AuthorUserID',
            'ReplyCount',
            'ReactionScore',
            'PromotedToSpaceID',
          ],
          user,
        });
        if (loadVersion !== this.loadHubStateVersion) return;
        const spacePosts = spacePostsRes.success ? spacePostsRes.rows : [];
        spacePostById = new Map(spacePosts.map((p) => [p.ID.toLowerCase(), p]));
        if (spacePosts.length > 0) {
          spacePostInList = this.buildUuidInClause(
            spacePosts.map((p) => p.ID),
            'spacePostId',
          );
        }
      }

      const subtypeScopeFilter = scopedSpaceId && spacePostInList ? `ID IN (${spacePostInList})` : '1=1';

      const [answersResult, ideasResult, feedResult, campaignsResult] = await Promise.all([
        scopedSpaceId && !spacePostInList
          ? Promise.resolve({
              success: true,
              rows: [] as Array<AnswerPostRow & { Title: string | null }>,
              errorMessage: null as string | null,
            })
          : LoadAllPaginatedRows<AnswerPostRow & { Title: string | null }>({
              runView: rv,
              entityName: COMMUNITY_ENTITY_NAMES.ForumAnswerPosts,
              extraFilter: subtypeScopeFilter,
              fields: ['ID', 'QuestionPostID', 'Title', 'AIEpistemicStatus', 'AIConfidenceScore', 'IsAcceptedByAuthor'],
              user,
            }),
        scopedSpaceId && !spacePostInList
          ? Promise.resolve({ success: true, rows: [] as IdeaPostRow[], errorMessage: null as string | null })
          : LoadAllPaginatedRows<IdeaPostRow>({
              runView: rv,
              entityName: COMMUNITY_ENTITY_NAMES.ForumIdeaPosts,
              extraFilter: subtypeScopeFilter,
              fields: ['ID', 'TotalPointsAllocated', 'EffectiveQuadraticVotes'],
              user,
            }),
        scopedSpaceId
          ? Promise.resolve({
              success: true,
              rows: Array.from(spacePostById.values()).filter((p) => p.RootPostID == null),
              errorMessage: null as string | null,
            })
          : LoadAllPaginatedRows<ForumPostRow>({
              runView: rv,
              entityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
              extraFilter: `RootPostID IS NULL AND Status = 'Published'`,
              fields: [
                'ID',
                'ForumID',
                'Title',
                'BodyMarkdown',
                'Status',
                'AuthorUserID',
                'ReplyCount',
                'ReactionScore',
                'PromotedToSpaceID',
              ],
              user,
            }),
        LoadAllPaginatedRows<IdeaCampaignRow>({
          runView: rv,
          entityName: COMMUNITY_ENTITY_NAMES.ForumIdeaCampaigns,
          extraFilter: scopedForumInList ? `ID IN (${scopedForumInList})` : '1=1',
          fields: ['ID', 'AllocationMode', 'DefaultBudgetPoints', 'MaxPointsPerIdea'],
          user,
        }),
      ]);
      if (loadVersion !== this.loadHubStateVersion) return;

      if (!feedResult.success) {
        this.hubLoadError = feedResult.errorMessage || 'Failed to load Community Hub feed posts.';
      }

      this.feedPosts =
        feedResult.success && feedResult.rows.length > 0
          ? feedResult.rows.map((p) => ({
              id: p.ID,
              forumId: p.ForumID,
              title: p.Title ?? 'Untitled Thread',
              bodyMarkdown: p.BodyMarkdown ?? '',
              status: p.Status,
              authorName: p.AuthorUserID && UUIDsEqual(p.AuthorUserID, user.ID) ? user.Name : 'Community Member',
              authorRole: 'Member',
              replyCount: p.ReplyCount ?? 0,
              reactionScore: p.ReactionScore ?? 0,
              promotedToSpaceId: p.PromotedToSpaceID ?? null,
            }))
          : [];
      this.selectedFeedPostId = this.feedPosts[0]?.id ?? null;

      const loadedCampaigns: CommunityHubCampaign[] =
        campaignsResult.success && campaignsResult.rows.length > 0
          ? campaignsResult.rows.map((c) => ({
              id: c.ID,
              name: forumNameById.get(c.ID.toLowerCase()) ?? `Campaign ${c.ID.slice(0, 6)}`,
              allocationMode: c.AllocationMode,
              budgetPoints: NormalizeCampaignBudget(c.DefaultBudgetPoints, DEFAULT_CAMPAIGN_BUDGET_POINTS),
              maxPointsPerIdea: c.MaxPointsPerIdea,
            }))
          : [];
      this.campaigns = loadedCampaigns;
      if (!this.campaigns.some((c) => this.selectedCampaignId && UUIDsEqual(c.id, this.selectedCampaignId))) {
        this.selectedCampaignId = this.campaigns[0]?.id ?? null;
      }

      if (answersResult.success && answersResult.rows.length > 0) {
        type AnswerMetaRow = Pick<
          ForumPostRow,
          'ID' | 'ForumID' | 'Title' | 'BodyMarkdown' | 'ReplyCount' | 'ReactionScore' | 'PromotedToSpaceID'
        >;
        let bodyById = new Map<string, AnswerMetaRow>(spacePostById);
        if (!scopedSpaceId) {
          const answerIds = answersResult.rows.map((a) => `'${AssertValidUUID(a.ID, 'answerId')}'`).join(',');
          const bodyRes = await LoadAllPaginatedRows<AnswerMetaRow>({
            runView: rv,
            entityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
            extraFilter: `ID IN (${answerIds})`,
            fields: ['ID', 'ForumID', 'Title', 'BodyMarkdown', 'ReplyCount', 'ReactionScore', 'PromotedToSpaceID'],
            user,
          });
          if (loadVersion !== this.loadHubStateVersion) return;
          bodyById = new Map((bodyRes.success ? bodyRes.rows : []).map((p) => [p.ID.toLowerCase(), p]));
        }
        const matchingAnswers = scopedSpaceId
          ? answersResult.rows.filter((a) => bodyById.has(a.ID.toLowerCase()))
          : answersResult.rows;
        this.qaCanonItems = matchingAnswers.map((a) => {
          const post = bodyById.get(a.ID.toLowerCase());
          return {
            id: a.ID,
            questionPostId: a.QuestionPostID ?? null,
            forumId: post?.ForumID ?? null,
            title: post?.Title ?? a.Title ?? 'Community Answer',
            bodyMarkdown: post?.BodyMarkdown ?? '',
            epistemicStatus: a.AIEpistemicStatus,
            confidenceScore: a.AIConfidenceScore,
            isAccepted: a.IsAcceptedByAuthor,
            reactionScore: post?.ReactionScore ?? 0,
            replyCount: post?.ReplyCount ?? 0,
            promotedToSpaceId: post?.PromotedToSpaceID ?? null,
          };
        });
      } else {
        this.qaCanonItems = [];
        if (!answersResult.success && !this.hubLoadError) {
          this.hubLoadError = answersResult.errorMessage || 'Failed to load Q&A Canon items.';
        }
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
        const ideaFilter = `ID IN (${ideaPostIds.map((id) => `'${id}'`).join(',')})`;
        const [ideaPostsRes, myAllocsRes] = await Promise.all([
          scopedSpaceId
            ? Promise.resolve({
                success: true,
                rows: ideaPostIds
                  .map((id) => spacePostById.get(id.toLowerCase()))
                  .filter((p): p is ScopedPostRow => Boolean(p)),
                errorMessage: null as string | null,
              })
            : LoadAllPaginatedRows<Pick<ForumPostRow, 'ID' | 'ForumID' | 'Title' | 'BodyMarkdown' | 'PromotedToSpaceID'>>({
                runView: rv,
                entityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
                extraFilter: ideaFilter,
                fields: ['ID', 'ForumID', 'Title', 'BodyMarkdown', 'PromotedToSpaceID'],
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
        if (loadVersion !== this.loadHubStateVersion) return;

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
                promotedToSpaceId: postMeta.PromotedToSpaceID ?? null,
              };
            });
        }
      } else {
        this.ideationItems = [];
        this.allUserAllocations = [];
      }

      const loadedDocs = await this.loadLivingDocItems(
        rv,
        user,
        scopedSpaceId ? spacePostInList : undefined,
        scopedSpaceId ? spacePostById : undefined,
      );
      if (loadVersion !== this.loadHubStateVersion) return;
      this.livingDocItems = loadedDocs;

      const allRootIds = Array.from(
        new Set([
          ...this.feedPosts.map((p) => p.id),
          ...this.qaCanonItems.map((q) => q.id),
          ...this.ideationItems.map((i) => i.id),
          ...this.livingDocItems.map((d) => d.id),
        ]),
      );
      if (allRootIds.length > 0) {
        await this.loadPostSupplementaryMetadata(rv, user, allRootIds);
        if (loadVersion !== this.loadHubStateVersion) return;
      }

      this.sessions = [];
      this.rebuildCommonsItems();
      this.syncSelectionDefaults();
    } catch (err) {
      if (loadVersion !== this.loadHubStateVersion) return;
      const errMsg = err instanceof Error ? err.message : 'Failed to load Community Hub state.';
      this.clearLiveHubData(errMsg, this.streamSpaces, this.streamTopics);
    } finally {
      if (loadVersion === this.loadHubStateVersion) {
        this.cdr.markForCheck();
      }
    }
  }

  private clearLiveHubData(
    errorMessage: string | null,
    spaces: CommunitySpaceDirectoryItem[],
    topics: string[],
  ): void {
    this.isOfflineDemoMode = false;
    this.feedPosts = [];
    this.selectedFeedPostId = null;
    this.qaCanonItems = [];
    this.selectedQaId = null;
    this.ideationItems = [];
    this.allUserAllocations = [];
    this.campaigns = [];
    this.selectedCampaignId = null;
    this.livingDocItems = [];
    this.sessions = [];
    this.streamSpaces =
      spaces.length > 0 ? spaces : BuildDynamicSpaceDirectory({ isOfflineDemoMode: false });
    this.streamTopics = topics;
    this.hubLoadError = errorMessage;
    if (errorMessage) {
      this.ideationLoadFailed = true;
      this.ideationErrorMessage = errorMessage;
    }
    this.rebuildCommonsItems();
    this.syncSelectionDefaults();
    this.cdr.markForCheck();
  }

  private async loadPostSupplementaryMetadata(
    rv: RunView,
    user: UserInfo,
    rootPostIds: ReadonlyArray<string>,
  ): Promise<void> {
    const validIds = rootPostIds.filter((id) => {
      try {
        AssertValidUUID(id, 'postId');
        return true;
      } catch {
        return false;
      }
    });
    if (validIds.length === 0) return;

    const validUserId = AssertValidUUID(user.ID, 'user.ID');
    const idInClause = this.buildUuidInClause(validIds, 'rootPostId');
    const tagNameById = new Map(this.loadedTopicTags.map((t) => [t.ID.toLowerCase(), t.Name]));

    const [repliesRes, myReactionsRes, postTagsRes] = await Promise.all([
      LoadAllPaginatedRows<ForumReplyRow>({
        runView: rv,
        entityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
        extraFilter: `RootPostID IN (${idInClause}) AND Status IN ('Published', 'Answered', 'Resolved')`,
        fields: ['ID', 'RootPostID', 'ParentPostID', 'AuthorUserID', 'BodyMarkdown', 'Status', 'ReactionScore'],
        user,
      }),
      LoadAllPaginatedRows<ForumPostReactionRow>({
        runView: rv,
        entityName: COMMUNITY_ENTITY_NAMES.ForumPostReactions,
        extraFilter: `UserID = '${validUserId}' AND ReactionKind = 'Upvote' AND PostID IN (${idInClause})`,
        fields: ['ID', 'PostID'],
        user,
      }),
      LoadAllPaginatedRows<ForumPostTagRow>({
        runView: rv,
        entityName: COMMUNITY_ENTITY_NAMES.ForumPostTags,
        extraFilter: `PostID IN (${idInClause})`,
        fields: ['ID', 'PostID', 'TopicTagID'],
        user,
      }),
    ]);

    this.repliesByRootPostId.clear();
    if (repliesRes.success) {
      for (const r of repliesRes.rows) {
        const rootKey = r.RootPostID?.toLowerCase();
        if (!rootKey) continue;
        const replyItem = this.mapForumReplyRow(r, user);
        const list = this.repliesByRootPostId.get(rootKey) ?? [];
        list.push(replyItem);
        this.repliesByRootPostId.set(rootKey, list);
      }
    }

    this.upvotedPostIds.clear();
    if (myReactionsRes.success) {
      for (const rx of myReactionsRes.rows) {
        this.upvotedPostIds.add(rx.PostID.toLowerCase());
      }
    }

    this.tagNamesByPostId.clear();
    if (postTagsRes.success) {
      for (const pt of postTagsRes.rows) {
        const tagName = tagNameById.get(pt.TopicTagID.toLowerCase());
        if (!tagName) continue;
        const postKey = pt.PostID.toLowerCase();
        const existing = this.tagNamesByPostId.get(postKey) ?? [];
        if (!existing.includes(tagName)) {
          existing.push(tagName);
          this.tagNamesByPostId.set(postKey, existing);
        }
      }
    }
  }

  private mapForumReplyRow(row: ForumReplyRow, user: UserInfo): CommunityCommonsReply {
    const isMe = Boolean(row.AuthorUserID && UUIDsEqual(row.AuthorUserID, user.ID));
    const authorName = isMe ? user.Name || 'Community Member' : 'Community Member';
    const parts = authorName.trim().split(/\s+/).filter(Boolean);
    const initials =
      parts.length === 0
        ? 'MJ'
        : parts.length === 1
          ? parts[0].slice(0, 2).toUpperCase()
          : `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return {
      id: row.ID,
      authorName,
      authorRole: 'Member',
      authorInitials: initials,
      timestampLabel: row.Status,
      bodyMarkdown: row.BodyMarkdown ?? '',
      isAccepted: row.Status === 'Answered',
      upvotes: row.ReactionScore ?? 0,
    };
  }

  private async loadRepliesForRootPost(rv: RunView, user: UserInfo, rootPostId: string): Promise<CommunityCommonsReply[]> {
    const validRootId = AssertValidUUID(rootPostId, 'rootPostId');
    const res = await LoadAllPaginatedRows<ForumReplyRow>({
      runView: rv,
      entityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
      extraFilter: `RootPostID = '${validRootId}' AND Status IN ('Published', 'Answered', 'Resolved')`,
      fields: ['ID', 'RootPostID', 'ParentPostID', 'AuthorUserID', 'BodyMarkdown', 'Status', 'ReactionScore'],
      user,
    });
    if (!res.success) {
      throw new Error(res.errorMessage || 'Failed to reload replies from server.');
    }
    return res.rows.map((r) => this.mapForumReplyRow(r, user));
  }

  private applySeededFallback(): void {
    this.resetTransientSpaceState();
    this.isOfflineDemoMode = true;
    this.authorizedForums = [];
    this.allowedForumIDs = [];
    this.loadedTopicTags = [];
    this.streamSpaces = BuildDynamicSpaceDirectory({ isOfflineDemoMode: true });
    this.streamTopics = BuildDynamicTopicTags({ isOfflineDemoMode: true });
    this.sessions = SEEDED_COMMUNITY_SESSIONS.map((s) => ({ ...s }));
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
    if (this.livingDocItems.length === 0) {
      this.selectedLivingDocId = null;
      this.editingDocMarkdown = '';
      this.sandboxedMiniAppSrcdoc = null;
    } else if (!this.livingDocItems.some((d) => d.id === this.selectedLivingDocId)) {
      this.SelectLivingDoc(this.livingDocItems[0].id);
    }
  }

  private async loadLivingDocItems(
    rv: RunView,
    user: UserInfo,
    scopedPostInList?: string | null,
    scopedPostById?: ReadonlyMap<
      string,
      Pick<ForumPostRow, 'ID' | 'ForumID' | 'Title' | 'BodyMarkdown' | 'ReplyCount' | 'ReactionScore' | 'PromotedToSpaceID'>
    >,
  ): Promise<CommunityHubLivingDocItem[]> {
    if (scopedPostInList === null) {
      return [];
    }
    const extraFilter = scopedPostInList ? `ID IN (${scopedPostInList})` : '1=1';

    const [artifactRes, formRes, interactiveRes] = await Promise.all([
      LoadAllPaginatedRows<SubtypeIdRow>({
        runView: rv,
        entityName: 'MJ_BizApps_Community: Forum Artifact Posts',
        extraFilter,
        fields: ['ID'],
        user,
      }),
      LoadAllPaginatedRows<SubtypeIdRow>({
        runView: rv,
        entityName: 'MJ_BizApps_Community: Forum Form Posts',
        extraFilter,
        fields: ['ID'],
        user,
      }),
      LoadAllPaginatedRows<InteractiveSubtypeRow>({
        runView: rv,
        entityName: 'MJ_BizApps_Community: Forum Interactive Posts',
        extraFilter,
        fields: ['ID', 'ExperienceKind'],
        user,
      }),
    ]);

    const idsWithType: Array<{
      id: string;
      postTypeCode: CommunityHubLivingDocItem['postTypeCode'];
      experienceKind?: mjBizAppsCommunityForumInteractivePostEntity['ExperienceKind'] | null;
    }> = [
      ...(artifactRes.success ? artifactRes.rows : []).map((r) => ({
        id: r.ID,
        postTypeCode: 'collaborative-doc' as const,
      })),
      ...(formRes.success ? formRes.rows : []).map((r) => ({
        id: r.ID,
        postTypeCode: 'collaborative-sheet' as const,
      })),
      ...(interactiveRes.success ? interactiveRes.rows : []).map((r) => ({
        id: r.ID,
        postTypeCode: 'interactive-experience' as const,
        experienceKind: r.ExperienceKind,
      })),
    ];
    if (idsWithType.length === 0) {
      return this.isOfflineDemoMode ? SEEDED_LIVING_DOCS_FALLBACK : [];
    }

    type DocPostMeta = Pick<
      ForumPostRow,
      'ID' | 'ForumID' | 'Title' | 'BodyMarkdown' | 'ReplyCount' | 'ReactionScore' | 'PromotedToSpaceID'
    >;
    let postById: ReadonlyMap<string, DocPostMeta>;
    if (scopedPostById) {
      postById = scopedPostById;
    } else {
      const safeIds = AssertValidUUIDList(idsWithType.map((r) => r.id).join(','), 'livingDocIds');
      const postsResult = await LoadAllPaginatedRows<DocPostMeta>({
        runView: rv,
        entityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
        extraFilter: `ID IN (${safeIds.map((id) => `'${id}'`).join(',')})`,
        fields: ['ID', 'ForumID', 'Title', 'BodyMarkdown', 'ReplyCount', 'ReactionScore', 'PromotedToSpaceID'],
        user,
      });
      postById = new Map((postsResult.success ? postsResult.rows : []).map((r) => [r.ID.toLowerCase(), r]));
    }

    const visibleItems = scopedPostInList
      ? idsWithType.filter((r) => postById.has(r.id.toLowerCase()))
      : idsWithType;

    return visibleItems.map((r) => {
      const post = postById.get(r.id.toLowerCase());
      return {
        id: r.id,
        forumId: post?.ForumID ?? null,
        title: post?.Title ?? 'Untitled',
        bodyMarkdown: post?.BodyMarkdown ?? '',
        postTypeCode: r.postTypeCode,
        experienceKind: r.experienceKind ?? null,
        reactionScore: post?.ReactionScore ?? 0,
        replyCount: post?.ReplyCount ?? 0,
        promotedToSpaceId: post?.PromotedToSpaceID ?? null,
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

      const rawPdf = GetActionOutputValue(result, 'PDFBase64');
      const pdfBase64 = typeof rawPdf === 'string' ? rawPdf : null;
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
    void this.preferences.SetActiveTopicFilter(topic);
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
    void this.preferences.SetActiveTopicFilter(null);
    this.cdr.markForCheck();
  }

  // ─── Personalized Digest Preview Drawer & MJ Comms Dispatch ───────────────

  public async refreshDigestPreview(): Promise<void> {
    const nonce = ++this.digestPreviewNonce;
    this.isLoadingDigestPreview = true;
    this.cdr.markForCheck();

    const provider = Metadata.Provider;
    const user = provider?.CurrentUser;
    const explicitTags = this.activeTopicFilter ? [this.activeTopicFilter] : [];

    try {
      const preview = await BuildPersonalizedDigestPreview({
        userId: user?.ID ?? 'demo-member',
        userName: user?.Name ?? 'Community Member',
        commonsItems: this.commonsItems,
        explicitTopicTags: explicitTags,
        maxItems: 5,
      });
      if (nonce !== this.digestPreviewNonce) {
        return;
      }
      this.digestProfileSummary = preview.profile;
      this.digestPreviewItems = preview.items;
    } finally {
      if (nonce === this.digestPreviewNonce) {
        this.isLoadingDigestPreview = false;
        this.cdr.markForCheck();
      }
    }
  }

  public openDigestDrawer(): void {
    if (!this.isDigestDrawerOpen) {
      const active = this.doc?.activeElement;
      if (
        active instanceof HTMLElement &&
        active !== this.doc?.body &&
        active !== this.doc?.documentElement &&
        !active.closest('[role="dialog"]')
      ) {
        this.lastDigestTrigger = active;
      }
    }
    this.isDigestDrawerOpen = true;
    this.sendTestDigestError = null;
    this.cdr.markForCheck();
    void this.refreshDigestPreview();
    this.scheduleOverlayInitialFocus('digest');
  }

  public closeDigestDrawer(): void {
    const trigger = this.lastDigestTrigger;
    this.lastDigestTrigger = null;
    this.isDigestDrawerOpen = false;
    this.cdr.markForCheck();
    this.restoreOverlayTriggerFocus(trigger, '#mjc-header-digest-btn');
  }

  public setDigestCadence(cadence: CommunityHubDigestCadence): void {
    this.digestCadence = cadence;
    void this.preferences.SetDigestCadence(cadence);
    this.cdr.markForCheck();
  }

  public openDigestItemInDetail(sourceItemId: string): void {
    this.lastDigestTrigger = null;
    this.isDigestDrawerOpen = false;
    this.openDetailSheet(sourceItemId);
  }

  public async sendTestDigest(): Promise<void> {
    if (this.isSendingTestDigest) return;
    this.isSendingTestDigest = true;
    this.sendTestDigestError = null;
    this.sendTestDigestResult = null;
    this.cdr.markForCheck();

    const effectiveSpaceName = this.spaceName.trim() || 'MemberJunction Community';

    try {
      const provider = Metadata.Provider as GraphQLDataProvider | undefined;
      if (!provider) {
        this.sendTestDigestResult = {
          sentCount: 1,
          failedCount: 0,
          providerName: 'Community Test Email Driver',
          dryRun: true,
          topReplyToAddress: this.digestPreviewItems[0]?.replyByEmailHint ?? 'reply+hmac_demo@reply.bizapps.local',
          message: `Test digest preview queued for ${effectiveSpaceName} (${this.digestPreviewItems.length} ranked threads).`,
        };
        return;
      }

      const actionClient = new GraphQLActionClient(provider);
      const actionParams: Array<{ Name: string; Value: string; Type: 'Input' }> = [
        { Name: 'UseTestDriver', Value: 'true', Type: 'Input' },
        { Name: 'DryRun', Value: 'false', Type: 'Input' },
        { Name: 'CommunityName', Value: effectiveSpaceName, Type: 'Input' },
        { Name: 'AllowedForumIDs', Value: this.allowedForumIDs.join(','), Type: 'Input' },
        { Name: 'MaxItemsPerDigest', Value: '5', Type: 'Input' },
      ];
      if (this.ScopeSpaceId?.trim()) {
        actionParams.push({ Name: 'SpaceID', Value: AssertValidUUID(this.ScopeSpaceId, 'ScopeSpaceId'), Type: 'Input' });
      }

      const actionId = await ResolveCommunityActionIDWithRunView('SendPersonalizedDigest');
      const result = await actionClient.RunAction(actionId, actionParams);

      if (result?.Success !== true) {
        this.sendTestDigestResult = null;
        this.sendTestDigestError = result?.Message ?? 'Failed to dispatch test digest.';
        return;
      }

      this.sendTestDigestResult = ParseSendDigestActionResult({
        success: true,
        message: result.Message,
        actionResult: result,
      });
    } catch (err) {
      this.sendTestDigestError = err instanceof Error ? err.message : 'Failed to dispatch test digest.';
    } finally {
      this.isSendingTestDigest = false;
      this.cdr.markForCheck();
    }
  }

  public async upvoteCommonsItem(itemId: string): Promise<void> {
    this.streamActionError = null;
    this.detailErrorMessage = null;
    const item = this.commonsItems.find((i) => i.id === itemId);
    if (!item) return;

    const provider = Metadata.Provider;
    const user: UserInfo | undefined = provider?.CurrentUser;
    const offlineOnly = !provider;

    const result = await ToggleReactionViaProvider({
      item,
      isOfflineDemoMode: offlineOnly,
      currentUserId: user?.ID ?? null,
      findExistingReactionId:
        provider && user
          ? async (postId, userId, kind) => {
              const res = await new RunView().RunView<{ ID: string }>(
                {
                  EntityName: COMMUNITY_ENTITY_NAMES.ForumPostReactions,
                  ExtraFilter: `PostID = '${AssertValidUUID(postId, 'postId')}' AND UserID = '${AssertValidUUID(userId, 'userId')}' AND ReactionKind = '${kind}'`,
                  Fields: ['ID'],
                  ResultType: 'simple',
                  MaxRows: 1,
                },
                user,
              );
              if (!res?.Success) {
                throw new Error(res?.ErrorMessage || 'Failed to look up reaction state.');
              }
              return res.Results?.[0]?.ID ?? null;
            }
          : null,
      loadReactionEntityById:
        provider && user
          ? (reactionId) =>
              new Metadata().GetEntityObject<mjBizAppsCommunityForumPostReactionEntity>(
                COMMUNITY_ENTITY_NAMES.ForumPostReactions,
                CompositeKey.FromID(AssertValidUUID(reactionId, 'reactionId')),
                user,
              )
          : null,
      createReactionEntity:
        provider && user
          ? () =>
              new Metadata().GetEntityObject<mjBizAppsCommunityForumPostReactionEntity>(
                COMMUNITY_ENTITY_NAMES.ForumPostReactions,
                user,
              )
          : null,
      refreshPostReactionScore:
        provider && user
          ? async (postId) => {
              const res = await new RunView().RunView<{ ReactionScore: number | null }>(
                {
                  EntityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
                  ExtraFilter: `ID = '${AssertValidUUID(postId, 'postId')}'`,
                  Fields: ['ReactionScore'],
                  ResultType: 'simple',
                  MaxRows: 1,
                },
                user,
              );
              if (!res?.Success) {
                return null;
              }
              return res.Results?.[0]?.ReactionScore ?? null;
            }
          : null,
    });

    if (!result.success) {
      const msg = result.errorMessage ?? 'Failed to update reaction on server.';
      this.streamActionError = msg;
      if (this.detailSheetItemId === itemId) {
        this.detailErrorMessage = msg;
      }
      this.cdr.markForCheck();
      return;
    }

    const postKey = item.sourcePostId.toLowerCase();
    if (!result.offlineFallback) {
      if (result.upvotedByMe) {
        this.upvotedPostIds.add(postKey);
      } else {
        this.upvotedPostIds.delete(postKey);
      }
    }

    this.commonsItems = this.commonsItems.map((entry) =>
      entry.id === itemId
        ? {
            ...entry,
            upvotedByMe: result.upvotedByMe,
            upvoteCount: result.upvoteCount,
          }
        : entry,
    );
    this.cdr.markForCheck();
  }

  public toggleSessionRsvp(sessionId: string): void {
    this.sessions = this.sessions.map((s) => (s.id === sessionId ? { ...s, rsvped: !s.rsvped } : s));
    this.cdr.markForCheck();
  }

  // ─── Slide-Over Detail Sheet Drawer ───────────────────────────────────────

  @HostListener('document:keydown.escape')
  public onDocumentEscape(): void {
    if (this.isDigestDrawerOpen) {
      this.closeDigestDrawer();
      return;
    }
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
      if (
        active instanceof HTMLElement &&
        active !== this.doc?.body &&
        active !== this.doc?.documentElement &&
        !active.closest('[role="dialog"]')
      ) {
        this.lastDetailTrigger = active;
      }
    }
    this.detailSheetItemId = itemId;
    this.detailReplyText = '';
    this.detailActionMessage = null;
    this.detailErrorMessage = null;
    this.cdr.markForCheck();
    this.scheduleOverlayInitialFocus('detail');
  }

  public closeDetailSheet(): void {
    const trigger = this.lastDetailTrigger;
    this.lastDetailTrigger = null;
    this.detailSheetItemId = null;
    this.detailReplyText = '';
    this.detailActionMessage = null;
    this.detailErrorMessage = null;
    this.structuredThreadSynthesis = null;
    this.cdr.markForCheck();
    this.restoreOverlayTriggerFocus(trigger, '.mjc-inspect-btn');
  }

  public openGraduatedSpace(event: Event, promotedSpaceId: string): void {
    event.preventDefault();
    const spaceId = promotedSpaceId?.trim();
    if (!spaceId) return;

    this.previousSpaceFilterBeforeWorkingSpace = this.activeSpaceFilter;
    this.activeSection = 'spaces';
    this.embeddedCollaborationMode = true;
    this.activeGraduatedSpaceId = spaceId;
    this.activeSpaceFilter = spaceId;
    this.graduatedSpaceRecord = null;
    this.closeDetailSheet();
    this.graduatedSpaceOpened.emit({ spaceId });
    this.notifyHostNavigationForWorkingSpace(spaceId);
    void this.loadGraduatedWorkingSpace(spaceId);
    this.cdr.markForCheck();
  }

  public closeGraduatedWorkingSpace(): void {
    this.activeSection = 'hub';
    this.embeddedCollaborationMode = false;
    this.activeGraduatedSpaceId = null;
    this.activeSpaceFilter = this.previousSpaceFilterBeforeWorkingSpace ?? 'all';
    this.previousSpaceFilterBeforeWorkingSpace = null;
    this.cdr.markForCheck();
  }

  public openCollaborationSpaceRecord(spaceId: string): void {
    const trimmed = spaceId?.trim();
    if (!trimmed) return;
    try {
      this.navigationService?.OpenEntityRecord?.('MJ_BizApps_Collaboration: Spaces', CompositeKey.FromID(trimmed));
    } catch {
      // Ignore when running outside full MJ Explorer shell.
    }
  }

  private notifyHostNavigationForWorkingSpace(spaceId: string): void {
    try {
      this.navigationService?.SetAgentContext?.(this, {
        activeSection: 'spaces',
        embeddedCollaborationMode: true,
        activeSpaceId: spaceId,
      });
      if (typeof this.navigationService?.SwitchToApp === 'function') {
        void this.navigationService
          .SwitchToApp('94F5906B-38AB-4A9F-BFCA-3D395BBBC198', 'Spaces', {
            view: 'space',
            space: spaceId,
            tab: 'overview',
          })
          .catch(() => undefined);
      }
    } catch {
      // Standalone / embedded harness continues with embedded Collaboration Working Space view.
    }
  }

  private async loadGraduatedWorkingSpace(spaceId: string): Promise<void> {
    const provider = Metadata.Provider;
    const user = provider?.CurrentUser;
    if (!provider || !user) {
      this.graduatedSpaceRecord = {
        ID: spaceId,
        Name: this.spaceNameById.get(spaceId.toLowerCase()) ?? 'Working Group Collaboration Space',
        Description: 'Graduated Working Group workspace active for collaborative execution.',
      };
      this.cdr.markForCheck();
      return;
    }

    this.isLoadingGraduatedSpace = true;
    this.cdr.markForCheck();
    try {
      const safeId = AssertValidUUID(spaceId, 'graduatedSpaceId');
      const res = await new RunView().RunView<{ ID: string; Name: string; Description: string | null }>(
        {
          EntityName: 'MJ_BizApps_Collaboration: Spaces',
          ExtraFilter: `ID = '${safeId}'`,
          Fields: ['ID', 'Name', 'Description'],
          ResultType: 'simple',
          MaxRows: 1,
        },
        user,
      );
      if (this.activeGraduatedSpaceId !== spaceId) return;
      const row = res?.Success ? res.Results?.[0] : null;
      this.graduatedSpaceRecord = row ?? {
        ID: spaceId,
        Name: this.spaceNameById.get(spaceId.toLowerCase()) ?? 'Working Group Collaboration Space',
        Description: 'Graduated Working Group Collaboration Space.',
      };
    } catch {
      if (this.activeGraduatedSpaceId === spaceId) {
        this.graduatedSpaceRecord = {
          ID: spaceId,
          Name: this.spaceNameById.get(spaceId.toLowerCase()) ?? 'Working Group Collaboration Space',
          Description: 'Graduated Working Group Collaboration Space.',
        };
      }
    } finally {
      if (this.activeGraduatedSpaceId === spaceId) {
        this.isLoadingGraduatedSpace = false;
        this.cdr.markForCheck();
      }
    }
  }

  public async submitDetailReply(): Promise<void> {
    const item = this.detailSheetItem;
    const text = this.detailReplyText.trim();
    if (!item || !text) return;

    this.detailActionMessage = null;
    this.detailErrorMessage = null;

    const provider = Metadata.Provider;
    const user: UserInfo | undefined = provider?.CurrentUser;
    const offlineOnly = !provider;

    if (!offlineOnly && user) {
      await this.ensurePostTypesLoaded(user).catch(() => undefined);
    }

    const rv = new RunView();
    const outcome = await PersistDetailReply({
      item,
      replyBody: text,
      authorName: user?.Name || 'Community Member',
      isOfflineDemoMode: offlineOnly,
      postTypeIdByCode: this.postTypeIdByCode,
      currentUserId: user?.ID ?? null,
      createForumPostEntity:
        provider && user
          ? () =>
              new Metadata().GetEntityObject<mjBizAppsCommunityForumPostEntity>(
                COMMUNITY_ENTITY_NAMES.ForumPosts,
                user,
              )
          : null,
      reloadThreadReplies:
        provider && user
          ? (rootPostId) => this.loadRepliesForRootPost(rv, user, rootPostId)
          : null,
    });

    if (!outcome.success) {
      this.detailErrorMessage = outcome.errorMessage ?? 'Failed to save reply on server.';
      this.cdr.markForCheck();
      return;
    }

    if (!outcome.offlineFallback) {
      this.repliesByRootPostId.set(item.sourcePostId.toLowerCase(), [...outcome.replies]);
    }

    this.commonsItems = this.commonsItems.map((entry) =>
      entry.id === item.id
        ? {
            ...entry,
            replies: [...outcome.replies],
            replyCount: outcome.replyCount,
          }
        : entry,
    );
    this.detailReplyText = '';
    this.detailActionMessage = outcome.statusMessage ?? 'Reply saved to thread.';
    this.cdr.markForCheck();
  }

  public async graduateDetailItem(itemId: string): Promise<void> {
    const item = this.commonsItems.find((entry) => entry.id === itemId);
    if (!item || item.graduatedToDeliverable) return;

    this.detailActionMessage = null;
    this.detailErrorMessage = null;

    const provider = Metadata.Provider;
    if (!provider) {
      this.commonsItems = GraduateStreamItem(this.commonsItems, itemId);
      this.detailActionMessage = 'Thread graduated into an active Working Group deliverable.';
      this.cdr.markForCheck();
      return;
    }

    const result = await GraduateThreadViaProvider({
      rootPostId: item.sourcePostId,
      targetSpaceTypeCode: 'working-group',
      targetSpaceName: `${item.title.slice(0, 80)} — Working Group`,
      seedInitialTaskTitle: `Operationalize: ${item.title.slice(0, 80)}`,
      provider,
    });

    if (!result.success) {
      this.detailErrorMessage = result.errorMessage ?? 'Failed to graduate thread to Working Group space.';
      this.cdr.markForCheck();
      return;
    }

    this.commonsItems = GraduateStreamItem(this.commonsItems, itemId, result.promotedToSpaceId);
    this.detailActionMessage = result.promotedToSpaceId
      ? `Thread graduated into Working Group Space (${result.promotedToSpaceId}).`
      : 'Thread graduated into an active Working Group deliverable.';
    this.cdr.markForCheck();
  }

  // ─── Ask or Share Modal ───────────────────────────────────────────────────

  public get availableAskShareTopicTags(): ReadonlyArray<LiveForumTopicTagRow> {
    if (this.isOfflineDemoMode) return [];
    const selectedForum = this.authorizedForums.find((f) => UUIDsEqual(f.id, this.askShareForumId));
    const targetSpaceId = selectedForum?.dbSpaceId?.trim() || null;
    if (!targetSpaceId) return this.loadedTopicTags;
    const scoped = this.loadedTopicTags.filter((t) => !t.SpaceID || UUIDsEqual(t.SpaceID, targetSpaceId));
    return scoped.length > 0 ? scoped : this.loadedTopicTags;
  }

  public isAskShareTopicTagSelected(tagId: string): boolean {
    return this.askShareSelectedTagIds.some((id) => UUIDsEqual(id, tagId));
  }

  public toggleAskShareTopicTag(tagId: string): void {
    if (this.isAskShareTopicTagSelected(tagId)) {
      this.askShareSelectedTagIds = this.askShareSelectedTagIds.filter((id) => !UUIDsEqual(id, tagId));
    } else {
      this.askShareSelectedTagIds = [...this.askShareSelectedTagIds, tagId];
    }
    this.cdr.markForCheck();
  }

  public openAskShareModal(defaultType: AskShareEntryType = 'Question'): void {
    if (!this.isAskShareModalOpen) {
      const active = this.doc?.activeElement;
      if (
        active instanceof HTMLElement &&
        active !== this.doc?.body &&
        active !== this.doc?.documentElement &&
        !active.closest('[role="dialog"]')
      ) {
        this.lastAskShareTrigger = active;
      }
    }
    this.isAskShareModalOpen = true;
    this.askShareEntryType = defaultType;
    this.askShareTitle = '';
    if (!this.isOfflineDemoMode && this.authorizedForums.length > 0) {
      const preferred =
        (this.activeSpaceFilter !== 'all'
          ? this.authorizedForums.find(
              (f) => f.spaceId === this.activeSpaceFilter || f.dbSpaceId === this.activeSpaceFilter,
            )
          : undefined) ?? this.authorizedForums[0];
      this.askShareForumId = preferred.id;
      this.askShareSpaceId = preferred.spaceId;
    } else {
      this.askShareForumId = '';
      this.askShareSpaceId = this.activeSpaceFilter !== 'all' ? this.activeSpaceFilter : 'architecture-standards';
    }
    this.askShareBody = '';
    this.askShareTags = '';
    this.askShareSelectedTagIds = [];
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
    this.askShareSelectedTagIds = [];
    this.askShareError = null;
    this.cdr.markForCheck();
  }

  public async onAskShareTitleChange(nextTitle: string): Promise<void> {
    this.askShareTitle = nextTitle;
    const nonce = ++this.askShareDeflectionNonce;
    const trimmed = nextTitle.trim();
    if (trimmed.length < 4) {
      this.liveAskShareDeflections = [];
      this.cdr.markForCheck();
      return;
    }

    const candidates = [
      ...this.qaCanonItems.map((qa) => ({
        id: `qa-${qa.id}`,
        sourcePostId: qa.id,
        title: qa.title,
        bodyMarkdown: qa.bodyMarkdown,
        epistemicStatus: qa.epistemicStatus,
      })),
      ...this.commonsItems
        .filter((item) => item.streamType === 'verified-qa' || item.streamType === 'living-guide')
        .map((item) => ({
          id: item.id,
          sourcePostId: item.sourcePostId,
          title: item.title,
          bodyMarkdown: item.bodyMarkdown,
          epistemicStatus: item.epistemicStatus,
          tags: item.tags,
        })),
    ];

    const deduped = candidates.filter(
      (entry, index, list) => list.findIndex((other) => other.sourcePostId === entry.sourcePostId) === index,
    );

    const matches = await ComputeLiveAskFirstMatches({
      queryText: trimmed,
      candidates: deduped,
      maxMatches: 3,
      minScore: 0.24,
    });
    if (nonce !== this.askShareDeflectionNonce) {
      return;
    }
    this.liveAskShareDeflections = matches;
    this.cdr.markForCheck();
  }

  public closeAskShareModal(): void {
    const trigger = this.lastAskShareTrigger;
    this.lastAskShareTrigger = null;
    this.isAskShareModalOpen = false;
    this.liveAskShareDeflections = [];
    this.askShareValidationErrors = {};
    this.askShareError = null;
    this.cdr.markForCheck();
    this.restoreOverlayTriggerFocus(trigger, '#mjc-header-ask-share-btn');
  }

  public onOverlayKeydown(event: KeyboardEvent, kind: 'detail' | 'ask-share' | 'digest'): void {
    if (event.key !== 'Tab') {
      return;
    }
    const dialogEl =
      kind === 'detail'
        ? this.detailSheetDialog?.nativeElement
        : kind === 'digest'
          ? this.digestDrawerDialog?.nativeElement
          : this.askShareDialog?.nativeElement;
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

  private scheduleOverlayInitialFocus(kind: 'detail' | 'ask-share' | 'digest'): void {
    queueMicrotask(() => {
      const moved = this.focusOverlayEntryControl(kind);
      if (!moved) {
        setTimeout(() => {
          this.focusOverlayEntryControl(kind);
        }, 0);
      }
    });
  }

  private focusOverlayEntryControl(kind: 'detail' | 'ask-share' | 'digest'): boolean {
    const dialogEl =
      kind === 'detail'
        ? this.detailSheetDialog?.nativeElement
        : kind === 'digest'
          ? this.digestDrawerDialog?.nativeElement
          : this.askShareDialog?.nativeElement;
    if (!dialogEl) {
      return false;
    }
    const focusables = this.getVisibleFocusableElements(dialogEl);
    const target = focusables[0] ?? dialogEl;
    target.focus();
    return this.doc?.activeElement === target;
  }

  private restoreOverlayTriggerFocus(trigger: HTMLElement | null, fallbackSelector: string): void {
    const attemptRestore = (): void => {
      const validTrigger =
        trigger &&
        trigger.isConnected &&
        trigger !== this.doc?.body &&
        trigger !== this.doc?.documentElement &&
        !trigger.closest('[inert]')
          ? trigger
          : null;
      const fallback = this.doc?.querySelector<HTMLElement>(fallbackSelector) ?? null;
      const target = validTrigger ?? (fallback && !fallback.closest('[inert]') ? fallback : null);
      if (target) {
        target.focus();
      }
    };
    setTimeout(() => {
      attemptRestore();
      if (typeof requestAnimationFrame === 'function' && this.doc?.querySelector('[inert]')) {
        requestAnimationFrame(() => attemptRestore());
      }
    }, 0);
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
      isOfflineDemoMode: !provider,
      targetForumId: this.askShareForumId,
      allowedForumIDs: this.allowedForumIDs,
      authorizedForums: this.authorizedForums,
      postTypeIdByCode: this.postTypeIdByCode,
      currentUserId: user?.ID,
      authorName: user?.Name || 'Community Member',
      selectedTopicTagIds: this.askShareSelectedTagIds,
      topicTags: this.loadedTopicTags,
      createForumPostEntity:
        provider && user
          ? () =>
              new Metadata().GetEntityObject<mjBizAppsCommunityForumPostEntity>(
                COMMUNITY_ENTITY_NAMES.ForumPosts,
                user,
              )
          : null,
      createQuestionPostEntity:
        provider && user
          ? () =>
              new Metadata().GetEntityObject<mjBizAppsCommunityForumQuestionPostEntity>(
                COMMUNITY_ENTITY_NAMES.ForumQuestionPosts,
                user,
              )
          : null,
      createPostTagEntity:
        provider && user
          ? () =>
              new Metadata().GetEntityObject<mjBizAppsCommunityForumPostTagEntity>(
                COMMUNITY_ENTITY_NAMES.ForumPostTags,
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
    if (!this.isOfflineDemoMode && newItem.tags.length > 0) {
      this.tagNamesByPostId.set(newItem.sourcePostId.toLowerCase(), [...newItem.tags]);
    }
    this.userAddedCommonsItems.unshift(newItem);
    this.feedPosts = [
      {
        id: newItem.sourcePostId,
        forumId: outcome.resolvedForumId ?? newItem.forumId ?? null,
        title: newItem.title,
        bodyMarkdown: newItem.bodyMarkdown,
        status: 'Published',
        authorName: newItem.authorName,
        authorRole: newItem.authorRole,
        replyCount: 0,
        reactionScore: 0,
        promotedToSpaceId: null,
      },
      ...this.feedPosts,
    ];

    if (this.askShareEntryType === 'Question') {
      const qaEntry: CommunityHubQACanonItem = {
        id: newItem.sourcePostId,
        questionPostId: newItem.sourcePostId,
        forumId: outcome.resolvedForumId,
        title: newItem.title,
        bodyMarkdown: newItem.bodyMarkdown,
        epistemicStatus: 'Novel Insight',
        confidenceScore: null,
        isAccepted: false,
        reactionScore: 0,
        replyCount: 0,
        promotedToSpaceId: null,
      };
      this.qaCanonItems = [qaEntry, ...this.qaCanonItems];
      this.selectedQaId = qaEntry.id;
    } else if (this.askShareEntryType === 'Playbook Note') {
      const docEntry: CommunityHubLivingDocItem = {
        id: newItem.sourcePostId,
        forumId: outcome.resolvedForumId,
        title: newItem.title,
        bodyMarkdown: newItem.bodyMarkdown,
        postTypeCode: 'collaborative-doc',
        reactionScore: 0,
        replyCount: 0,
        promotedToSpaceId: null,
      };
      this.livingDocItems = [docEntry, ...this.livingDocItems];
      this.selectedLivingDocId = docEntry.id;
      this.editingDocMarkdown = docEntry.bodyMarkdown;
    }

    this.rebuildCommonsItems();
    this.selectedFeedPostId = newItem.sourcePostId;
    this.askShareTitle = '';
    this.askShareBody = '';
    this.askShareTags = '';
    this.askShareSelectedTagIds = [];
    this.askShareValidationErrors = {};
    this.askShareError = null;
    this.closeAskShareModal();
  }

  public SelectTab(key: CommunityHubTabKey): void {
    this.activeTabKey = key;
    this.focusedTabKey = key;
    if (!this.EmbeddedMode) {
      void this.preferences.SetActiveTab(key);
    } else if (!this.ShowTabBar) {
      this.embeddedTabRequested.emit(key);
    }
    this.cdr.markForCheck();
  }

  public SelectFeedPost(postId: string): void {
    this.selectedFeedPostId = postId;
    this.threadSynthesisResult = null;
  }

  public async SynthesizeFeedThread(postId: string): Promise<void> {
    if (this.isSynthesizingFeed) return;
    this.isSynthesizingFeed = true;
    this.threadSynthesisResult = null;
    this.structuredThreadSynthesis = null;
    this.detailErrorMessage = null;
    this.streamActionError = null;
    this.cdr.markForCheck();

    const post = this.feedPosts.find((p) => p.id === postId);
    const commonsMatch = this.commonsItems.find((item) => item.sourcePostId === postId);
    const title = commonsMatch?.title ?? post?.title ?? postId;
    const bodyMarkdown = commonsMatch?.bodyMarkdown ?? post?.bodyMarkdown ?? '';
    const replies = commonsMatch?.replies ?? [];

    try {
      const provider = Metadata.Provider;
      if (provider?.CurrentUser) {
        const actionClient = new GraphQLActionClient(provider as GraphQLDataProvider);
        const actionId = await ResolveCommunityActionIDWithRunView('LivingThreadSynthesis');
        const res = await actionClient.RunAction(actionId, [
          { Name: 'RootPostID', Value: postId, Type: 'Input' },
        ]);
        if (res?.Success !== true) {
          const errMsg = res?.Message || 'Living thread synthesis failed.';
          this.detailErrorMessage = errMsg;
          this.streamActionError = errMsg;
          this.threadSynthesisResult = null;
          this.structuredThreadSynthesis = null;
          return;
        }
        this.threadSynthesisResult = res.Message || `Living synthesis updated for "${title}".`;
        this.structuredThreadSynthesis = ParseLivingSynthesisPayload({
          rootPostId: postId,
          title,
          bodyMarkdown,
          replies,
          actionResult: res,
          allowClientFallback: false,
        });
      } else {
        this.threadSynthesisResult = `Synthesized key takeaways for "${title}".`;
        this.structuredThreadSynthesis = BuildClientLivingSynthesis({
          rootPostId: postId,
          title,
          bodyMarkdown,
          replies,
          actionMessage: this.threadSynthesisResult,
        });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Synthesis failed.';
      this.detailErrorMessage = errMsg;
      this.streamActionError = errMsg;
      this.threadSynthesisResult = null;
      this.structuredThreadSynthesis = null;
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

  private resolveTargetForumId(preferredForumId?: string | null): string | null {
    const explicit = ResolveAuthorizedForumTarget(preferredForumId, this.allowedForumIDs);
    if (explicit) {
      return explicit;
    }
    if (this.activeSpaceFilter !== 'all') {
      const spaceForum = this.authorizedForums.find((f) => f.spaceId === this.activeSpaceFilter);
      const spaceMatch = ResolveAuthorizedForumTarget(spaceForum?.id, this.allowedForumIDs);
      if (spaceMatch) {
        return spaceMatch;
      }
    }
    const defaultForumId = this.authorizedForums[0]?.id ?? this.allowedForumIDs[0];
    return ResolveAuthorizedForumTarget(defaultForumId, this.allowedForumIDs);
  }

  private normalizeEpistemicStatus(
    raw: string,
  ): mjBizAppsCommunityForumAnswerPostEntity['AIEpistemicStatus'] {
    switch (raw.trim()) {
      case 'Canon Verified':
        return 'Canon Verified';
      case 'Conflicts With Canon':
        return 'Conflicts With Canon';
      case 'Novel Insight':
        return 'Novel Insight';
      case 'Partially Outdated':
        return 'Partially Outdated';
      default:
        return null;
    }
  }

  public async CreateQuestion(): Promise<void> {
    const title = this.newQuestionTitle.trim();
    const body = this.newQuestionBody.trim();
    if (!title || !body) return;

    const targetForumId = this.resolveTargetForumId();
    const generatedId = crypto.randomUUID();
    const created: CommunityHubQACanonItem = {
      id: generatedId,
      questionPostId: generatedId,
      forumId: targetForumId,
      title,
      bodyMarkdown: body,
      epistemicStatus: 'Novel Insight',
      confidenceScore: null,
      isAccepted: false,
    };

    const provider = Metadata.Provider;
    const user: UserInfo | undefined = provider?.CurrentUser;
    if (provider && user) {
      if (!targetForumId) {
        this.qaActionMessage = 'No authorized forum is available to post a question.';
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
        post.ForumID = targetForumId;
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
    const targetForumId = this.resolveTargetForumId(target.forumId);
    const generatedId = crypto.randomUUID();
    const newAnswer: CommunityHubQACanonItem = {
      id: generatedId,
      questionPostId: targetQuestionId,
      forumId: targetForumId,
      title: `Re: ${target.title}`,
      bodyMarkdown: body,
      epistemicStatus: 'Novel Insight',
      confidenceScore: null,
      isAccepted: false,
    };

    const provider = Metadata.Provider;
    const user: UserInfo | undefined = provider?.CurrentUser;
    if (provider && user) {
      if (!targetForumId) {
        this.qaActionMessage = 'No authorized forum is available to submit an answer.';
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
        post.ForumID = targetForumId;
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
        const statusParam = GetActionOutputValue(res, 'EpistemicStatus');
        const scoreParam = GetActionOutputValue(res, 'ConfidenceScore');
        if (typeof statusParam === 'string' && statusParam.trim()) {
          const parsedStatus = this.normalizeEpistemicStatus(statusParam);
          if (parsedStatus) {
            item.epistemicStatus = parsedStatus;
          }
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

    const outcome = await PromoteAnswerToCanonViaProvider({
      questionPostId: item.questionPostId,
      canonAnswerPostId: item.id,
      provider: Metadata.Provider,
    });
    if (!outcome.success) {
      this.qaActionMessage = outcome.errorMessage ?? 'Failed to promote answer to Canon.';
      this.cdr.markForCheck();
      return;
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

  public async ProposeIdea(): Promise<boolean> {
    const title = this.newIdeaTitle.trim();
    if (!title) return false;
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

    if (provider && !user?.ID) {
      this.persistenceErrorMessage = 'Unable to propose idea: no authenticated user in active session.';
      this.cdr.markForCheck();
      return false;
    }

    if (provider && user) {
      if (!this.hasActiveCampaign) {
        this.ideationErrorMessage = 'No ideation campaign is configured for this community space — cannot propose idea.';
        this.cdr.markForCheck();
        return false;
      }
      try {
        await this.ensurePostTypesLoaded(user);
        const postTypeId = this.resolvePostTypeId(IDEA_POST_TYPE_CODE);
        const persisted = await PersistProposedIdea({
          forumId: this.activeCampaign.id,
          postTypeId,
          title,
          summary,
          user,
        });
        if (!persisted.success || !persisted.postId) {
          this.ideationErrorMessage = persisted.errorMessage ?? 'Failed to save proposed idea.';
          this.cdr.markForCheck();
          return false;
        }
        created.id = persisted.postId;
      } catch (err) {
        this.ideationErrorMessage = err instanceof Error ? err.message : 'Failed to save proposed idea.';
        this.cdr.markForCheck();
        return false;
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
    return true;
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
    this.rebuildCommonsItems();
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
