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
  type mjBizAppsCommunityForumPostAttachmentEntity,
  type mjBizAppsCommunityForumPostEntity,
  type mjBizAppsCommunityForumPostReactionEntity,
  type mjBizAppsCommunityForumPostTagEntity,
  type mjBizAppsCommunityForumQuestionPostEntity,
} from '@mj-biz-apps/community-entities';
import {
  AssertValidUUID,
  AssertValidUUIDList,
  ClassifyAttachmentKind,
  EscapeSqlLiteral,
  IsFeaturedLibraryFolder,
  NormalizeAttachmentMimeType,
  SanitizeCommunityAttachmentUrl,
  type CommunityArtifactAttachmentItem,
  type CommunityAttachmentEntryType,
  type CommunityAttachmentItem,
  type CommunityFileAttachmentItem,
  type IdeationAllocationMode,
} from '@mj-biz-apps/community-core';
import { DEMO_SEED_ATTACHMENTS } from './community-attachment-demo.ts';
import { CommunityAttachmentGalleryComponent } from './community-attachment-gallery.component.ts';
import { CommunityAttachmentPickerComponent } from './community-attachment-picker.component.ts';
import {
  DEMO_ACCESSIBLE_ARTIFACTS,
  LoadAccessibleArtifactsCatalog,
  PersistPostAttachmentsFromClient,
  ResolveComposerAttachmentEntryType,
  SyncDraftsForEntryTypeChange,
  type AccessibleArtifactCatalogItem,
  type CollaborationSpaceItemEntityView,
  type DraftCommunityAttachment,
} from './community-attachment-picker.ts';
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
import {
  CreateForumQuestionPostGraphQLAdapter,
  GraduateThreadViaProvider,
  PromoteAnswerToCanonViaProvider,
  ResolveCommunityGraphQLExecutor,
} from './community-hub-mutations.ts';
import {
  BuildCommonsStreamItems,
  BuildDynamicSpaceDirectory,
  BuildDynamicTopicTags,
  BuildEditorialPorchHighlights,
  COMMUNITY_SPACES_DIRECTORY,
  ComputeNextTrapFocusTarget,
  FilterAskShareTopicTagSuggestions,
  FilterForumsForAskShareEntryType,
  FindMatchedCanonQuestion,
  GraduateStreamItem,
  IsForumCompatibleWithAskShareEntryType,
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
  BuildMediaLibraryEntries,
  type MediaLibraryEntry,
  type MediaLibraryKindFilter,
  type MediaLibraryScopeFilter,
} from './community-media-library.ts';
import { CommunityMediaLibraryComponent } from './community-media-library.component.ts';
import { RenderSafeMarkdownHtml, StripMarkdownToPlainText } from './community-markdown.ts';
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

/** The 5 Community Hub tabs, in display order. */
export const COMMUNITY_HUB_TABS: ReadonlyArray<CommunityHubTabDefinition> = [
  { key: 'knowledge-stream', label: 'Feed', icon: 'fa-solid fa-house' },
  { key: 'qa-canon-workbench', label: 'Q&A', icon: 'fa-solid fa-circle-question' },
  { key: 'quadratic-ideation-wallet', label: 'Ideas', icon: 'fa-solid fa-lightbulb' },
  {
    key: 'living-co-authoring',
    label: 'Playbooks',
    icon: 'fa-solid fa-book-open',
  },
  {
    key: 'media-library',
    label: 'Library',
    icon: 'fa-solid fa-photo-film',
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
  attachments?: CommunityAttachmentItem[];
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
  attachments?: CommunityAttachmentItem[];
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
  attachments?: CommunityAttachmentItem[];
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
  attachments?: CommunityAttachmentItem[];
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
  ForumTypeID?: string | null;
  Status?: string | null;
  PostingPolicy?: string | null;
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
    attachments: DEMO_SEED_ATTACHMENTS.feedRotation,
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
    attachments: DEMO_SEED_ATTACHMENTS.qaRotation,
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
    attachments: DEMO_SEED_ATTACHMENTS.ideaSigning,
  },
];

const SEEDED_LIVING_DOCS_FALLBACK: CommunityHubLivingDocItem[] = [
  {
    id: 'seed-doc-1',
    title: 'OAuth2 Partner Onboarding Playbook',
    bodyMarkdown: '## OAuth2 Partner Playbook\n- Configure PKCE callback URLs\n- Enable token rotation alerts',
    postTypeCode: 'collaborative-doc',
    attachments: DEMO_SEED_ATTACHMENTS.livingPlaybook,
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
    CommunityAttachmentGalleryComponent,
    CommunityAttachmentPickerComponent,
    CommunityMediaLibraryComponent,
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

  // Sticky Header Search, Digest Export, Personalized Digest Preview & Highlights state
  public headerSearchQuery = '';
  public porchCollapsed = true;
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
  public detailReplyAttachments: DraftCommunityAttachment[] = [];
  public detailReplyAttachmentError: string | null = null;
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
  public askShareTagInputFocused = false;
  public askShareTagHighlightIndex = 0;
  public askShareValidationErrors: AskShareValidationErrors = {};
  public askShareError: string | null = null;
  public askShareAttachments: DraftCommunityAttachment[] = [];
  public askShareAttachmentError: string | null = null;
  public accessibleArtifacts: AccessibleArtifactCatalogItem[] = [];

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
  private readonly attachmentsByPostId = new Map<string, CommunityAttachmentItem[]>();
  private readonly authoredPostIds = new Set<string>();
  private currentUserId: string | null = null;

  public mediaLibraryEntries: MediaLibraryEntry[] = [];
  public mediaLibraryKindFilter: MediaLibraryKindFilter = 'all';
  public mediaLibraryScopeFilter: MediaLibraryScopeFilter = 'all';
  public mediaLibrarySearchQuery = '';

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

  public get relatedDetailItems(): ReadonlyArray<CommunityCommonsItem> {
    const active = this.detailSheetItem;
    if (!active) return [];
    const others = this.commonsItems.filter((item) => item.id !== active.id);
    const sameSpace = others.filter((item) => item.spaceId === active.spaceId);
    const differentSpace = others.filter((item) => item.spaceId !== active.spaceId);
    return [...sameSpace, ...differentSpace].slice(0, 4);
  }

  public get hasActiveOverlay(): boolean {
    return Boolean(this.isAskShareModalOpen || this.isDigestDrawerOpen);
  }

  public renderMarkdown(markdown: string | null | undefined): string {
    return RenderSafeMarkdownHtml(markdown);
  }

  public stripMarkdown(markdown: string | null | undefined): string {
    return StripMarkdownToPlainText(markdown);
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
  @ViewChild(KnowledgeStreamComponent) private knowledgeStreamRef?: KnowledgeStreamComponent;

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
    this.porchCollapsed = this.preferences.GetPorchCollapsed(true);
    const savedCadence = this.preferences.GetDigestCadence();
    if (savedCadence) {
      this.digestCadence = savedCadence;
    }
    const savedTopic = this.preferences.GetActiveTopicFilter();
    if (savedTopic) {
      this.activeTopicFilter = savedTopic;
    }
    const savedLibKind = this.preferences.GetMediaLibraryKind();
    if (savedLibKind) {
      this.mediaLibraryKindFilter = savedLibKind;
    }
    const savedLibScope = this.preferences.GetMediaLibraryScope();
    if (savedLibScope) {
      this.mediaLibraryScopeFilter = savedLibScope;
    }
  }

  private rebuildMediaLibraryEntries(): void {
    this.mediaLibraryEntries = BuildMediaLibraryEntries({
      commonsItems: this.commonsItems,
      currentUserId: this.currentUserId,
      authoredPostIds: this.authoredPostIds,
      spaceNameById: this.spaceNameById,
      isOfflineDemoMode: this.isOfflineDemoMode,
    });
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
          attachments: this.attachmentsByPostId.get(key) ?? p.attachments,
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
          attachments: this.attachmentsByPostId.get(key) ?? qa.attachments,
        };
      }),
      ideationItems: this.ideationItems.map((idea) => {
        const key = idea.id.toLowerCase();
        return {
          ...idea,
          upvotedByMe: this.upvotedPostIds.has(key),
          replies: this.repliesByRootPostId.get(key),
          tags: this.isOfflineDemoMode ? undefined : (this.tagNamesByPostId.get(key) ?? []),
          attachments: this.attachmentsByPostId.get(key) ?? idea.attachments,
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
          attachments: this.attachmentsByPostId.get(key) ?? doc.attachments,
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
    this.rebuildMediaLibraryEntries();
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
    this.attachmentsByPostId.clear();
    this.authoredPostIds.clear();
    this.mediaLibraryEntries = [];
    this.detailSheetItemId = null;
    this.detailReplyText = '';
    this.detailReplyAttachments = [];
    this.detailReplyAttachmentError = null;
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
    this.askShareAttachments = [];
    this.askShareAttachmentError = null;
    this.accessibleArtifacts = [];
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
    this.currentUserId = user?.ID ?? null;
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

      const [
        forumsResult,
        forumTypesResult,
        collabSpacesResult,
        communitySpacesResult,
        postTypesResult,
        topicTagsResult,
      ] = await Promise.all([
        LoadAllPaginatedRows<ForumRow>({
          runView: rv,
          entityName: COMMUNITY_ENTITY_NAMES.Forums,
          extraFilter: scopedSpaceId ? `SpaceID = '${scopedSpaceId}'` : '1=1',
          fields: ['ID', 'Name', 'SpaceID', 'ForumTypeID', 'Status', 'PostingPolicy', 'Description'],
          user,
        }),
        LoadAllPaginatedRows<{ ID: string; Code: string }>({
          runView: rv,
          entityName: COMMUNITY_ENTITY_NAMES.ForumTypes,
          extraFilter: '1=1',
          fields: ['ID', 'Code'],
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

      const forumTypeCodeById = new Map<string, string>();
      for (const ft of forumTypesResult.success ? forumTypesResult.rows : []) {
        if (ft.Code) {
          forumTypeCodeById.set(ft.ID.toLowerCase(), ft.Code.trim().toLowerCase());
        }
      }

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
        forumTypeCode: f.ForumTypeID ? (forumTypeCodeById.get(f.ForumTypeID.toLowerCase()) ?? null) : null,
        status: f.Status ?? null,
        postingPolicy: f.PostingPolicy ?? null,
      }));
      this.allowedForumIDs = this.authorizedForums.map((f) => f.id);
      if (scopedSpaceId) {
        this.spaceName = collabNameById.get(scopedSpaceId.toLowerCase()) ?? this.spaceName;
      } else {
        const preferredSpace =
          liveSpaceRows.find((s) => /\b(commons|hub|community)\b/i.test(s.Name ?? '')) ??
          collabSpaces.find((s) => /\b(commons|hub|community)\b/i.test(s.Name ?? '')) ??
          (liveSpaceRows.length === 1 ? liveSpaceRows[0] : null);
        this.spaceName = preferredSpace?.Name ?? 'Community';
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
          ? feedResult.rows.map((p) => {
              if (p.AuthorUserID && UUIDsEqual(p.AuthorUserID, user.ID)) {
                this.authoredPostIds.add(p.ID.toLowerCase());
              }
              return {
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
              };
            })
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
          'ID' | 'ForumID' | 'Title' | 'BodyMarkdown' | 'AuthorUserID' | 'ReplyCount' | 'ReactionScore' | 'PromotedToSpaceID'
        >;
        let bodyById = new Map<string, AnswerMetaRow>(spacePostById);
        if (!scopedSpaceId) {
          const answerIds = answersResult.rows.map((a) => `'${AssertValidUUID(a.ID, 'answerId')}'`).join(',');
          const bodyRes = await LoadAllPaginatedRows<AnswerMetaRow>({
            runView: rv,
            entityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
            extraFilter: `ID IN (${answerIds})`,
            fields: ['ID', 'ForumID', 'Title', 'BodyMarkdown', 'AuthorUserID', 'ReplyCount', 'ReactionScore', 'PromotedToSpaceID'],
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
          if (post?.AuthorUserID && UUIDsEqual(post.AuthorUserID, user.ID)) {
            this.authoredPostIds.add(post.ID.toLowerCase());
          }
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
            : LoadAllPaginatedRows<Pick<ForumPostRow, 'ID' | 'ForumID' | 'Title' | 'BodyMarkdown' | 'AuthorUserID' | 'PromotedToSpaceID'>>({
                runView: rv,
                entityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
                extraFilter: ideaFilter,
                fields: ['ID', 'ForumID', 'Title', 'BodyMarkdown', 'AuthorUserID', 'PromotedToSpaceID'],
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
              if (postMeta.AuthorUserID && UUIDsEqual(postMeta.AuthorUserID, user.ID)) {
                this.authoredPostIds.add(postMeta.ID.toLowerCase());
              }
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
      const [_, loadedArtifacts] = await Promise.all([
        allRootIds.length > 0
          ? this.loadPostSupplementaryMetadata(rv, user, allRootIds)
          : Promise.resolve(),
        LoadAccessibleArtifactsCatalog(rv, user).catch(() => [] as AccessibleArtifactCatalogItem[]),
      ]);
      if (loadVersion !== this.loadHubStateVersion) return;
      this.accessibleArtifacts = loadedArtifacts;

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
        if (r.AuthorUserID && UUIDsEqual(r.AuthorUserID, user.ID)) {
          this.authoredPostIds.add(r.ID.toLowerCase());
        }
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

    const replyIds: string[] = [];
    for (const replyList of this.repliesByRootPostId.values()) {
      for (const reply of replyList) {
        try {
          replyIds.push(AssertValidUUID(reply.id, 'replyId'));
        } catch {
          // Skip non-UUID synthetic IDs.
        }
      }
    }

    await this.loadAttachmentsForPosts(rv, user, Array.from(new Set([...validIds, ...replyIds])));

    if (this.attachmentsByPostId.size > 0) {
      this.feedPosts = this.feedPosts.map((p) => ({
        ...p,
        attachments: this.attachmentsByPostId.get(p.id.toLowerCase()) ?? p.attachments,
      }));
      this.qaCanonItems = this.qaCanonItems.map((q) => ({
        ...q,
        attachments: this.attachmentsByPostId.get(q.id.toLowerCase()) ?? q.attachments,
      }));
      this.ideationItems = this.ideationItems.map((i) => ({
        ...i,
        attachments: this.attachmentsByPostId.get(i.id.toLowerCase()) ?? i.attachments,
      }));
      this.livingDocItems = this.livingDocItems.map((d) => ({
        ...d,
        attachments: this.attachmentsByPostId.get(d.id.toLowerCase()) ?? d.attachments,
      }));
      for (const [rootKey, replyList] of this.repliesByRootPostId.entries()) {
        this.repliesByRootPostId.set(
          rootKey,
          replyList.map((r) => ({
            ...r,
            attachments: this.attachmentsByPostId.get(r.id.toLowerCase()) ?? r.attachments,
          })),
        );
      }
    }
  }

  private async loadAttachmentsForPosts(
    rv: RunView,
    user: UserInfo,
    postIds: ReadonlyArray<string>,
  ): Promise<void> {
    this.attachmentsByPostId.clear();
    if (postIds.length === 0) return;

    interface LiveAttachmentRow {
      ID: string;
      PostID: string;
      SpaceItemID: string;
      Caption: string | null;
      Sequence: number;
    }
    interface LiveSpaceItemRow {
      ID: string;
      SpaceID: string;
      EntityID: string;
      RecordID: string;
      Folder: string | null;
      ArtifactVersionID: string | null;
    }
    interface LiveArtifactVersionRow {
      ID: string;
      ArtifactID: string;
      VersionNumber: number | null;
      Name: string | null;
      ContentMode: string | null;
      Content: string | null;
      FileID: string | null;
      FileName: string | null;
      MimeType: string | null;
      ContentSizeBytes: number | null;
    }
    interface LiveArtifactRow {
      ID: string;
      Name: string;
      Type: string | null;
    }
    interface LiveFileRow {
      ID: string;
      Name: string;
      ContentType: string | null;
    }

    try {
      const postIn = this.buildUuidInClause(postIds, 'attachmentPostId');
      const attRes = await LoadAllPaginatedRows<LiveAttachmentRow>({
        runView: rv,
        entityName: COMMUNITY_ENTITY_NAMES.ForumPostAttachments,
        extraFilter: `PostID IN (${postIn})`,
        fields: ['ID', 'PostID', 'SpaceItemID', 'Caption', 'Sequence'],
        user,
      });
      if (!attRes.success || attRes.rows.length === 0) return;

      const spaceItemIds = Array.from(new Set(attRes.rows.map((a) => a.SpaceItemID)));
      const spaceItemIn = this.buildUuidInClause(spaceItemIds, 'spaceItemId');
      const siRes = await LoadAllPaginatedRows<LiveSpaceItemRow>({
        runView: rv,
        entityName: 'MJ_BizApps_Collaboration: Space Items',
        extraFilter: `ID IN (${spaceItemIn})`,
        fields: ['ID', 'SpaceID', 'EntityID', 'RecordID', 'Folder', 'ArtifactVersionID'],
        user,
      });
      if (!siRes.success || siRes.rows.length === 0) return;

      const siById = new Map(siRes.rows.map((s) => [s.ID.toLowerCase(), s]));
      const versionIds = Array.from(
        new Set(siRes.rows.map((s) => s.ArtifactVersionID).filter((v): v is string => Boolean(v))),
      );

      const versionById = new Map<string, LiveArtifactVersionRow>();
      if (versionIds.length > 0) {
        const verRes = await LoadAllPaginatedRows<LiveArtifactVersionRow>({
          runView: rv,
          entityName: 'MJ: Artifact Versions',
          extraFilter: `ID IN (${this.buildUuidInClause(versionIds, 'artifactVersionId')})`,
          fields: ['ID', 'ArtifactID', 'VersionNumber', 'Name', 'ContentMode', 'Content', 'FileID', 'FileName', 'MimeType', 'ContentSizeBytes'],
          user,
        });
        if (verRes.success) {
          for (const v of verRes.rows) {
            versionById.set(v.ID.toLowerCase(), v);
          }
        }
      }

      const artifactIds = new Set<string>();
      const fileIds = new Set<string>();
      for (const si of siRes.rows) {
        const recordUuid = si.RecordID.startsWith('ID|') ? si.RecordID.slice(3) : si.RecordID;
        const ver = si.ArtifactVersionID ? versionById.get(si.ArtifactVersionID.toLowerCase()) : undefined;
        if (ver?.ArtifactID) artifactIds.add(ver.ArtifactID);
        if (ver?.FileID) fileIds.add(ver.FileID);
        try {
          AssertValidUUID(recordUuid, 'recordUuid');
          if (!ver || ver.ContentMode !== 'File') {
            artifactIds.add(recordUuid);
          } else {
            fileIds.add(recordUuid);
          }
        } catch {
          // Ignore non-UUID record references.
        }
      }

      const artifactById = new Map<string, LiveArtifactRow>();
      if (artifactIds.size > 0) {
        const artRes = await LoadAllPaginatedRows<LiveArtifactRow>({
          runView: rv,
          entityName: 'MJ: Artifacts',
          extraFilter: `ID IN (${this.buildUuidInClause(Array.from(artifactIds), 'artifactId')})`,
          fields: ['ID', 'Name', 'Type'],
          user,
        });
        if (artRes.success) {
          for (const a of artRes.rows) artifactById.set(a.ID.toLowerCase(), a);
        }
      }

      const fileById = new Map<string, LiveFileRow>();
      if (fileIds.size > 0) {
        const fileRes = await LoadAllPaginatedRows<LiveFileRow>({
          runView: rv,
          entityName: 'MJ: Files',
          extraFilter: `ID IN (${this.buildUuidInClause(Array.from(fileIds), 'fileId')})`,
          fields: ['ID', 'Name', 'ContentType'],
          user,
        });
        if (fileRes.success) {
          for (const f of fileRes.rows) fileById.set(f.ID.toLowerCase(), f);
        }
      }

      for (const att of attRes.rows) {
        const si = siById.get(att.SpaceItemID.toLowerCase());
        if (!si) continue;
        const ver = si.ArtifactVersionID ? versionById.get(si.ArtifactVersionID.toLowerCase()) ?? null : null;
        const recordUuid = si.RecordID.startsWith('ID|') ? si.RecordID.slice(3) : si.RecordID;
        const artifact =
          (ver?.ArtifactID ? artifactById.get(ver.ArtifactID.toLowerCase()) : undefined) ??
          artifactById.get(recordUuid.toLowerCase()) ??
          null;
        const featureInLibrary = IsFeaturedLibraryFolder(si.Folder);
        const authoredByCurrentUser = this.authoredPostIds.has(att.PostID.toLowerCase());
        const attAuthorUserId = authoredByCurrentUser ? user.ID : null;
        const attAuthorName = authoredByCurrentUser ? user.Name || 'Community Member' : 'Community Member';

        let mapped: CommunityAttachmentItem;
        if (artifact && (!ver || ver.ContentMode !== 'File')) {
          const item: CommunityArtifactAttachmentItem = {
            id: att.ID,
            kind: 'artifact',
            spaceId: si.SpaceID,
            postId: att.PostID,
            spaceItemId: si.ID,
            forumPostAttachmentId: att.ID,
            artifactId: artifact.ID,
            artifactVersionId: ver?.ID ?? si.ArtifactVersionID,
            artifactTypeName: artifact.Type?.trim() || 'Artifact',
            artifactName: artifact.Name || ver?.Name || att.Caption || 'Untitled Artifact',
            previewContent: ver?.Content ?? null,
            contentType: ver?.MimeType ?? null,
            versionNumber: ver?.VersionNumber ?? null,
            showInlinePreview: true,
            caption: att.Caption,
            sequence: att.Sequence,
            featureInLibrary,
            folder: si.Folder,
            authorUserId: attAuthorUserId,
            authorName: attAuthorName,
          };
          mapped = item;
        } else {
          const fileId = ver?.FileID ?? recordUuid;
          const fileRow = fileById.get(fileId.toLowerCase()) ?? null;
          const fileName = ver?.FileName || fileRow?.Name || att.Caption || 'attachment';
          const mimeType = NormalizeAttachmentMimeType(ver?.MimeType || fileRow?.ContentType || 'application/octet-stream');
          const kind = ClassifyAttachmentKind(mimeType, false);
          const safeUrl = SanitizeCommunityAttachmentUrl(ver?.Content ?? null, kind) ?? '';
          const fileItem: CommunityFileAttachmentItem = {
            id: att.ID,
            kind: kind === 'artifact' ? 'file' : kind,
            spaceId: si.SpaceID,
            postId: att.PostID,
            spaceItemId: si.ID,
            forumPostAttachmentId: att.ID,
            fileId,
            fileName,
            mimeType,
            sizeBytes: ver?.ContentSizeBytes ?? 0,
            url: safeUrl,
            artifactVersionId: si.ArtifactVersionID,
            caption: att.Caption,
            sequence: att.Sequence,
            featureInLibrary,
            folder: si.Folder,
            authorUserId: attAuthorUserId,
            authorName: attAuthorName,
          };
          mapped = fileItem;
        }

        const key = att.PostID.toLowerCase();
        const existing = this.attachmentsByPostId.get(key) ?? [];
        existing.push(mapped);
        existing.sort((a, b) => a.sequence - b.sequence);
        this.attachmentsByPostId.set(key, existing);
      }
    } catch {
      // Leave attachmentsByPostId empty if host environment omits attachment metadata tables.
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
      attachments: this.attachmentsByPostId.get(row.ID.toLowerCase()),
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
    this.currentUserId = 'demo-member';
    this.accessibleArtifacts = [...DEMO_ACCESSIBLE_ARTIFACTS];
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
      'ID' | 'ForumID' | 'Title' | 'BodyMarkdown' | 'AuthorUserID' | 'ReplyCount' | 'ReactionScore' | 'PromotedToSpaceID'
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
        fields: ['ID', 'ForumID', 'Title', 'BodyMarkdown', 'AuthorUserID', 'ReplyCount', 'ReactionScore', 'PromotedToSpaceID'],
        user,
      });
      postById = new Map((postsResult.success ? postsResult.rows : []).map((r) => [r.ID.toLowerCase(), r]));
    }

    const visibleItems = scopedPostInList
      ? idsWithType.filter((r) => postById.has(r.id.toLowerCase()))
      : idsWithType;

    return visibleItems.map((r) => {
      const post = postById.get(r.id.toLowerCase());
      if (post?.AuthorUserID && UUIDsEqual(post.AuthorUserID, user.ID)) {
        this.authoredPostIds.add(post.ID.toLowerCase());
      }
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
      const exportActionId = await ResolveCommunityActionIDWithRunView('ExportDigestPDF');
      if (!exportActionId) {
        this.digestExportError = 'Community.ExportDigestPDF action is missing or disabled in MJ: Actions.';
        return;
      }
      const result = await actionClient.RunAction(exportActionId, [
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

  // ─── Space Media & Artifacts Library Handlers ─────────────────────────────

  public setMediaLibraryKindFilter(kind: MediaLibraryKindFilter): void {
    this.mediaLibraryKindFilter = kind;
    void this.preferences.SetMediaLibraryKind(kind);
    this.cdr.markForCheck();
  }

  public setMediaLibraryScopeFilter(scope: MediaLibraryScopeFilter): void {
    this.mediaLibraryScopeFilter = scope;
    void this.preferences.SetMediaLibraryScope(scope);
    this.cdr.markForCheck();
  }

  public setMediaLibrarySearchQuery(query: string): void {
    this.mediaLibrarySearchQuery = query;
    this.cdr.markForCheck();
  }

  public resetMediaLibraryFilters(): void {
    this.activeSpaceFilter = 'all';
    this.mediaLibraryKindFilter = 'all';
    this.mediaLibraryScopeFilter = 'all';
    this.mediaLibrarySearchQuery = '';
    void this.preferences.SetMediaLibraryKind('all');
    void this.preferences.SetMediaLibraryScope('all');
    this.cdr.markForCheck();
  }

  public openMediaLibraryThread(sourceItemId: string): void {
    this.openDetailSheet(sourceItemId);
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
      if (!actionId) {
        this.sendTestDigestResult = null;
        this.sendTestDigestError =
          'Community.SendPersonalizedDigest action is missing or disabled in the MJ: Actions catalog.';
        return;
      }
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
    if (this.doc?.querySelector('.mjc-att-modal-backdrop, .mjc-lib-modal-backdrop')) {
      return;
    }
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
    queueMicrotask(() => {
      const hubEl = this.doc?.querySelector<HTMLElement>('.mjc-community-hub');
      if (hubEl && typeof hubEl.scrollTo === 'function') {
        hubEl.scrollTo({ top: 0 });
      }
    });
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

  private createClientAttachmentPersister(
    user: UserInfo | undefined,
    isOfflineDemoMode: boolean,
  ) {
    const md = new Metadata();
    return async (params: {
      postId: string;
      spaceId: string;
      drafts: ReadonlyArray<DraftCommunityAttachment>;
    }) => {
      const outcome = await PersistPostAttachmentsFromClient({
        postId: params.postId,
        spaceId: params.spaceId,
        drafts: params.drafts,
        isOfflineDemoMode,
        currentUserId: user?.ID ?? null,
        authorName: user?.Name || 'Community Member',
        resolveEntityId: !isOfflineDemoMode && user
          ? async (entityName: string) => {
              if (typeof md.EntityByName === 'function') {
                const info = md.EntityByName(entityName);
                if (info?.ID) return info.ID;
              }
              const res = await new RunView().RunView<{ ID: string }>(
                {
                  EntityName: 'MJ: Entities',
                  ExtraFilter: `Name = '${EscapeSqlLiteral(entityName)}'`,
                  Fields: ['ID'],
                  ResultType: 'simple',
                  MaxRows: 1,
                },
                user,
              );
              return res?.Success ? res.Results?.[0]?.ID ?? null : null;
            }
          : null,
        createSpaceItemEntity: !isOfflineDemoMode && user
          ? () => md.GetEntityObject<CollaborationSpaceItemEntityView>('MJ_BizApps_Collaboration: Space Items', user)
          : null,
        createForumPostAttachmentEntity: !isOfflineDemoMode && user
          ? () => md.GetEntityObject<mjBizAppsCommunityForumPostAttachmentEntity>(COMMUNITY_ENTITY_NAMES.ForumPostAttachments, user)
          : null,
      });

      if (outcome.success && outcome.persistedAttachments.length > 0) {
        this.attachmentsByPostId.set(params.postId.toLowerCase(), [...outcome.persistedAttachments]);
      }

      return {
        success: outcome.success,
        errorMessage: outcome.errorMessage,
        persistedAttachments: outcome.persistedAttachments,
      };
    };
  }

  public async submitDetailReply(
    targetItemId?: string,
    replyTextOverride?: string,
    replyAttachmentsOverride?: ReadonlyArray<DraftCommunityAttachment>,
  ): Promise<void> {
    const item = targetItemId
      ? this.commonsItems.find((entry) => entry.id === targetItemId) ?? null
      : this.detailSheetItem;
    const text = (replyTextOverride ?? this.detailReplyText).trim();
    if (!item || !text) return;

    if (replyAttachmentsOverride === undefined && this.detailReplyAttachmentError) {
      this.detailErrorMessage = this.detailReplyAttachmentError;
      this.streamActionError = this.detailReplyAttachmentError;
      this.cdr.markForCheck();
      return;
    }

    const drafts = replyAttachmentsOverride ?? this.detailReplyAttachments;

    this.detailActionMessage = null;
    this.detailErrorMessage = null;
    this.streamActionError = null;

    const provider = Metadata.Provider;
    const user: UserInfo | undefined = provider?.CurrentUser;
    const offlineOnly = !provider;

    if (!offlineOnly && user) {
      await this.ensurePostTypesLoaded(user).catch(() => undefined);
    }

    const targetSpaceId = offlineOnly
      ? item.spaceId
      : (item.forumId ? this.forumSpaceIdByForumId.get(item.forumId.toLowerCase()) : null) ?? item.spaceId;

    const rv = new RunView();
    const outcome = await PersistDetailReply({
      item,
      replyBody: text,
      authorName: user?.Name || 'Community Member',
      isOfflineDemoMode: offlineOnly,
      postTypeIdByCode: this.postTypeIdByCode,
      currentUserId: user?.ID ?? null,
      spaceId: targetSpaceId,
      draftAttachments: drafts,
      persistAttachments: this.createClientAttachmentPersister(user, offlineOnly),
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
      const errMsg = outcome.errorMessage ?? 'Failed to save reply on server.';
      this.detailErrorMessage = errMsg;
      this.streamActionError = errMsg;
      this.cdr.markForCheck();
      return;
    }

    if (!outcome.offlineFallback) {
      this.repliesByRootPostId.set(item.sourcePostId.toLowerCase(), [...outcome.replies]);
    }
    if (outcome.persistedReplyId) {
      this.authoredPostIds.add(outcome.persistedReplyId.toLowerCase());
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
    this.rebuildMediaLibraryEntries();
    if (replyTextOverride === undefined) {
      this.detailReplyText = '';
      this.detailReplyAttachments = [];
      this.detailReplyAttachmentError = null;
    } else if (targetItemId) {
      this.knowledgeStreamRef?.clearInlineReplyDraft(targetItemId);
    }
    this.detailActionMessage = outcome.statusMessage ?? 'Reply saved to thread.';
    this.cdr.markForCheck();
  }

  public async graduateDetailItem(itemId: string): Promise<void> {
    const item = this.commonsItems.find((entry) => entry.id === itemId);
    if (!item || item.graduatedToDeliverable) return;

    this.detailActionMessage = null;
    this.detailErrorMessage = null;
    this.streamActionError = null;

    const provider = Metadata.Provider;
    if (!provider) {
      this.commonsItems = GraduateStreamItem(this.commonsItems, itemId);
      this.detailActionMessage = 'Working Group created from this thread.';
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
      const errMsg = result.errorMessage ?? 'Failed to start Working Group space.';
      this.detailErrorMessage = errMsg;
      this.streamActionError = errMsg;
      this.cdr.markForCheck();
      return;
    }

    this.commonsItems = GraduateStreamItem(this.commonsItems, itemId, result.promotedToSpaceId);
    this.detailActionMessage = result.promotedToSpaceId
      ? `Working Group Space created (${result.promotedToSpaceId}).`
      : 'Working Group created from this thread.';
    this.cdr.markForCheck();
  }

  // ─── Ask or Share Modal ───────────────────────────────────────────────────

  public get askShareAttachmentEntryType(): CommunityAttachmentEntryType {
    return ResolveComposerAttachmentEntryType('post', this.askShareEntryType);
  }

  public get compatibleAskShareForums(): ReadonlyArray<AuthorizedForumOption> {
    return FilterForumsForAskShareEntryType(
      this.authorizedForums,
      this.askShareEntryType,
      this.activeSpaceFilter,
    );
  }

  public get availableAskShareTopicTags(): ReadonlyArray<LiveForumTopicTagRow> {
    if (this.isOfflineDemoMode) return [];
    const selectedForum = this.authorizedForums.find((f) => UUIDsEqual(f.id, this.askShareForumId));
    const targetSpaceId = selectedForum?.dbSpaceId?.trim() || null;
    if (!targetSpaceId) return this.loadedTopicTags;
    return this.loadedTopicTags.filter((t) => !t.SpaceID || UUIDsEqual(t.SpaceID, targetSpaceId));
  }

  public get selectedAskShareTopicTags(): ReadonlyArray<LiveForumTopicTagRow> {
    const byId = new Map(this.availableAskShareTopicTags.map((t) => [t.ID.toLowerCase(), t]));
    const resolved: LiveForumTopicTagRow[] = [];
    for (const id of this.askShareSelectedTagIds) {
      const match = byId.get(id.toLowerCase());
      if (match) {
        resolved.push(match);
      }
    }
    return resolved;
  }

  public get askShareTagSuggestions(): ReadonlyArray<LiveForumTopicTagRow> {
    return FilterAskShareTopicTagSuggestions({
      availableTags: this.availableAskShareTopicTags,
      query: this.askShareTags,
      selectedTagIds: this.askShareSelectedTagIds,
      maxResults: 8,
    });
  }

  public get isAskShareTagMenuOpen(): boolean {
    return this.askShareTagInputFocused && this.askShareTagSuggestions.length > 0;
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

  public removeAskShareTopicTag(tagId: string): void {
    this.askShareSelectedTagIds = this.askShareSelectedTagIds.filter((id) => !UUIDsEqual(id, tagId));
    this.cdr.markForCheck();
  }

  public onAskShareTagInputFocus(): void {
    this.askShareTagInputFocused = true;
    this.askShareTagHighlightIndex = 0;
    this.cdr.markForCheck();
  }

  public onAskShareTagInputBlur(): void {
    this.askShareTagInputFocused = false;
    this.cdr.markForCheck();
  }

  public onAskShareTagInputChange(nextValue: string): void {
    this.askShareTags = nextValue;
    this.askShareTagInputFocused = true;
    this.askShareTagHighlightIndex = 0;
    this.cdr.markForCheck();
  }

  public selectAskShareTagSuggestion(tag: LiveForumTopicTagRow): void {
    if (!this.isAskShareTopicTagSelected(tag.ID)) {
      this.askShareSelectedTagIds = [...this.askShareSelectedTagIds, tag.ID];
    }
    const lastCommaIdx = this.askShareTags.lastIndexOf(',');
    if (lastCommaIdx >= 0) {
      const prefix = this.askShareTags.slice(0, lastCommaIdx).trim();
      this.askShareTags = prefix ? `${prefix}, ` : '';
    } else {
      this.askShareTags = '';
    }
    this.askShareTagHighlightIndex = 0;
    this.cdr.markForCheck();
  }

  public onAskShareTagInputKeydown(event: KeyboardEvent): void {
    const suggestions = this.askShareTagSuggestions;
    if (event.key === 'ArrowDown' && suggestions.length > 0) {
      event.preventDefault();
      this.askShareTagInputFocused = true;
      this.askShareTagHighlightIndex = (this.askShareTagHighlightIndex + 1) % suggestions.length;
      this.cdr.markForCheck();
      return;
    }
    if (event.key === 'ArrowUp' && suggestions.length > 0) {
      event.preventDefault();
      this.askShareTagInputFocused = true;
      this.askShareTagHighlightIndex =
        (this.askShareTagHighlightIndex - 1 + suggestions.length) % suggestions.length;
      this.cdr.markForCheck();
      return;
    }
    if (event.key === 'Enter' && this.isAskShareTagMenuOpen) {
      event.preventDefault();
      const chosen = suggestions[this.askShareTagHighlightIndex] ?? suggestions[0];
      if (chosen) {
        this.selectAskShareTagSuggestion(chosen);
      }
      return;
    }
    if (event.key === ',' && suggestions.length > 0) {
      const lastCommaIdx = this.askShareTags.lastIndexOf(',');
      const token = (lastCommaIdx >= 0 ? this.askShareTags.slice(lastCommaIdx + 1) : this.askShareTags)
        .trim()
        .replace(/^#+/, '')
        .trim()
        .toLowerCase();
      const exact = suggestions.find(
        (t) => t.Name.trim().toLowerCase() === token || (t.Slug?.trim().toLowerCase() ?? '') === token,
      );
      if (exact) {
        event.preventDefault();
        this.selectAskShareTagSuggestion(exact);
      }
      return;
    }
    if (event.key === 'Escape' && this.isAskShareTagMenuOpen) {
      event.preventDefault();
      event.stopPropagation();
      this.askShareTagInputFocused = false;
      this.cdr.markForCheck();
      return;
    }
    if (event.key === 'Backspace' && this.askShareTags === '' && this.askShareSelectedTagIds.length > 0) {
      this.askShareSelectedTagIds = this.askShareSelectedTagIds.slice(0, -1);
      this.cdr.markForCheck();
    }
  }

  public onAskShareEntryTypeChange(nextType: AskShareEntryType): void {
    this.askShareEntryType = nextType;
    this.askShareError = null;
    this.askShareAttachments = SyncDraftsForEntryTypeChange(
      this.askShareAttachments,
      ResolveComposerAttachmentEntryType('post', nextType),
    );
    if (!this.isOfflineDemoMode) {
      const previousForum = this.authorizedForums.find((f) => UUIDsEqual(f.id, this.askShareForumId));
      const compatible = this.compatibleAskShareForums;
      const stillCompatible = compatible.some((f) => UUIDsEqual(f.id, this.askShareForumId));
      if (!stillCompatible) {
        const sameSpaceMatch = previousForum?.dbSpaceId
          ? compatible.find((f) => f.dbSpaceId && UUIDsEqual(f.dbSpaceId, previousForum.dbSpaceId!))
          : undefined;
        const nextForum = sameSpaceMatch ?? compatible[0] ?? null;
        this.askShareForumId = nextForum?.id ?? '';
        if (nextForum) {
          this.askShareSpaceId = nextForum.spaceId;
        }
        const prevSpace = previousForum?.dbSpaceId ?? null;
        const nextSpace = nextForum?.dbSpaceId ?? null;
        if (!prevSpace || !nextSpace || !UUIDsEqual(prevSpace, nextSpace)) {
          this.askShareSelectedTagIds = [];
        }
      }
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
      const compatible = this.compatibleAskShareForums;
      const preferred = compatible[0] ?? this.authorizedForums[0];
      this.askShareForumId = preferred?.id ?? '';
      this.askShareSpaceId = preferred?.spaceId ?? 'architecture-standards';
    } else {
      this.askShareForumId = '';
      this.askShareSpaceId = this.activeSpaceFilter !== 'all' ? this.activeSpaceFilter : 'architecture-standards';
    }
    this.askShareBody = '';
    this.askShareTags = '';
    this.askShareSelectedTagIds = [];
    this.askShareTagInputFocused = false;
    this.askShareTagHighlightIndex = 0;
    this.askShareValidationErrors = {};
    this.askShareError = null;
    this.askShareAttachments = [];
    this.askShareAttachmentError = null;
    this.cdr.markForCheck();
    this.scheduleOverlayInitialFocus('ask-share');
  }

  public onAskShareForumChange(forumId: string): void {
    const previousForum = this.authorizedForums.find((f) => UUIDsEqual(f.id, this.askShareForumId));
    this.askShareForumId = forumId;
    const matched = this.authorizedForums.find((f) => UUIDsEqual(f.id, forumId));
    if (matched) {
      this.askShareSpaceId = matched.spaceId;
    }
    const prevSpace = previousForum?.dbSpaceId ?? null;
    const nextSpace = matched?.dbSpaceId ?? null;
    if (!prevSpace || !nextSpace || !UUIDsEqual(prevSpace, nextSpace)) {
      this.askShareSelectedTagIds = [];
    }
    this.askShareTagHighlightIndex = 0;
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
    this.askShareTagInputFocused = false;
    this.askShareTagHighlightIndex = 0;
    this.liveAskShareDeflections = [];
    this.askShareValidationErrors = {};
    this.askShareError = null;
    this.askShareAttachments = [];
    this.askShareAttachmentError = null;
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
    if (this.askShareAttachmentError) {
      this.askShareError = this.askShareAttachmentError;
      this.cdr.markForCheck();
      return;
    }

    const provider = Metadata.Provider;
    const user: UserInfo | undefined = provider?.CurrentUser;
    const offlineOnly = !provider;
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
      isOfflineDemoMode: offlineOnly,
      targetForumId: this.askShareForumId,
      allowedForumIDs: this.allowedForumIDs,
      authorizedForums: this.authorizedForums,
      postTypeIdByCode: this.postTypeIdByCode,
      currentUserId: user?.ID,
      authorName: user?.Name || 'Community Member',
      selectedTopicTagIds: this.askShareSelectedTagIds,
      topicTags: this.loadedTopicTags,
      draftAttachments: this.askShareAttachments,
      persistAttachments: this.createClientAttachmentPersister(user, offlineOnly),
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
          ? async () => {
              const gqlExecutor = ResolveCommunityGraphQLExecutor(provider);
              if (gqlExecutor) {
                return CreateForumQuestionPostGraphQLAdapter(gqlExecutor);
              }
              return new Metadata().GetEntityObject<mjBizAppsCommunityForumQuestionPostEntity>(
                COMMUNITY_ENTITY_NAMES.ForumQuestionPosts,
                user,
              );
            }
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
    this.authoredPostIds.add(newItem.sourcePostId.toLowerCase());
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
        attachments: newItem.attachments,
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
        attachments: newItem.attachments,
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
        attachments: newItem.attachments,
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
    this.askShareAttachments = [];
    this.askShareAttachmentError = null;
    this.askShareValidationErrors = {};
    this.askShareError = null;
    this.closeAskShareModal();
  }

  public SelectTab(key: CommunityHubTabKey): void {
    this.activeTabKey = key;
    this.focusedTabKey = key;
    if (this.detailSheetItemId) {
      this.detailSheetItemId = null;
      this.detailReplyText = '';
      this.detailActionMessage = null;
      this.detailErrorMessage = null;
    }
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

  public async SynthesizeFeedThread(postId: string, forceRegenerate = false): Promise<void> {
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
        if (!actionId) {
          const errMsg =
            'Community.LivingThreadSynthesis action is missing or disabled in the MJ: Actions catalog.';
          this.detailErrorMessage = errMsg;
          this.streamActionError = errMsg;
          this.threadSynthesisResult = null;
          this.structuredThreadSynthesis = null;
          return;
        }
        const actionInputs: Array<{ Name: string; Value: string; Type: 'Input' }> = [
          { Name: 'RootPostID', Value: postId, Type: 'Input' },
        ];
        if (forceRegenerate) {
          actionInputs.push({ Name: 'ForceRegenerate', Value: 'true', Type: 'Input' });
        }
        const res = await actionClient.RunAction(actionId, actionInputs);
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

  private resolveTargetForumId(
    preferredForumId?: string | null,
    entryType?: AskShareEntryType,
  ): string | null {
    const explicit = ResolveAuthorizedForumTarget(preferredForumId, this.allowedForumIDs);
    if (explicit) {
      if (!entryType) {
        return explicit;
      }
      const explicitForum = this.authorizedForums.find((f) => UUIDsEqual(f.id, explicit));
      if (!explicitForum || IsForumCompatibleWithAskShareEntryType(explicitForum, entryType)) {
        return explicit;
      }
    }
    if (entryType) {
      const compatible = FilterForumsForAskShareEntryType(
        this.authorizedForums,
        entryType,
        this.activeSpaceFilter,
      );
      if (compatible.length > 0) {
        return ResolveAuthorizedForumTarget(compatible[0].id, this.allowedForumIDs);
      }
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

    const targetForumId = this.resolveTargetForumId(null, 'Question');
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
        const gqlExecutor = ResolveCommunityGraphQLExecutor(provider);
        const qPost = gqlExecutor
          ? CreateForumQuestionPostGraphQLAdapter(gqlExecutor)
          : await md.GetEntityObject<mjBizAppsCommunityForumQuestionPostEntity>(
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
          const reason = post.LatestResult?.CompleteMessage?.trim() || post.LatestResult?.Message?.trim();
          this.qaActionMessage = reason
            ? `Failed to save question: ${reason}`
            : 'Failed to save Forum Post for question.';
          this.cdr.markForCheck();
          return;
        }
        qPost.ID = post.ID;
        const qSaved = await qPost.Save();
        if (!qSaved) {
          const qReason = qPost.LatestResult?.CompleteMessage?.trim() || qPost.LatestResult?.Message?.trim();
          await post.Delete().catch(() => false);
          this.qaActionMessage = qReason
            ? `Failed to save Question subtype: ${qReason} — rolled back base post.`
            : 'Failed to save Forum Question Post subtype — rolled back base post.';
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
        const gradeActionId = await ResolveCommunityActionIDWithRunView('EpistemicAnswerGrading');
        if (!gradeActionId) {
          this.qaActionMessage =
            'Community.EpistemicAnswerGrading action is missing or disabled in MJ: Actions.';
          this.cdr.markForCheck();
          return;
        }
        const res = await actionClient.RunAction(gradeActionId, [
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

  public getIdeaNextVoteDeltaCost(idea: CommunityHubIdeaItem): number {
    if (this.activeCampaign.allocationMode === 'Quadratic') {
      const currentVotes = Math.floor(Math.sqrt(Math.max(0, idea.myPointsAllocated)));
      const nextPoints = (currentVotes + 1) * (currentVotes + 1);
      return Math.max(1, nextPoints - idea.myPointsAllocated);
    }
    return 5;
  }

  public canStepIdeaVote(idea: CommunityHubIdeaItem, deltaVotes: 1 | -1): boolean {
    if (this.ideationLoadFailed) return false;
    if (deltaVotes < 0) {
      return idea.myPointsAllocated > 0;
    }
    const deltaCost = this.getIdeaNextVoteDeltaCost(idea);
    const nextPoints = idea.myPointsAllocated + deltaCost;
    if (deltaCost > this.remainingWalletPoints) {
      return false;
    }
    if (this.activeCampaign.maxPointsPerIdea != null && nextPoints > this.activeCampaign.maxPointsPerIdea) {
      return false;
    }
    return nextPoints <= this.activeCampaign.budgetPoints;
  }

  public stepIdeaVote(event: Event, idea: CommunityHubIdeaItem, deltaVotes: 1 | -1): void {
    event.stopPropagation();
    if (!this.canStepIdeaVote(idea, deltaVotes)) return;
    this.SelectIdea(idea.id);

    let nextPoints: number;
    if (this.activeCampaign.allocationMode === 'Quadratic') {
      const currentVotes =
        deltaVotes > 0
          ? Math.floor(Math.sqrt(Math.max(0, idea.myPointsAllocated)))
          : Math.ceil(Math.sqrt(Math.max(0, idea.myPointsAllocated)));
      const nextVotes = Math.max(0, currentVotes + deltaVotes);
      nextPoints = nextVotes * nextVotes;
    } else {
      nextPoints = Math.max(0, idea.myPointsAllocated + deltaVotes * 5);
    }

    const maxAllowed = Math.min(
      idea.myPointsAllocated + this.remainingWalletPoints,
      this.activeCampaign.maxPointsPerIdea ?? this.activeCampaign.budgetPoints,
      this.activeCampaign.budgetPoints,
    );
    const clampedPoints = Math.max(0, Math.min(nextPoints, maxAllowed));
    const effectiveVotes = ComputeQuadraticEffectiveVotes(clampedPoints, this.activeCampaign.allocationMode);
    void this.OnVoteAllocationChanged(idea.id, clampedPoints, effectiveVotes);
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
    return this.spaceName ? `${this.spaceName} — Community` : 'Community';
  }

  public override async GetResourceIconClass(_data: ResourceData): Promise<string> {
    return 'fa-solid fa-comments';
  }
}
