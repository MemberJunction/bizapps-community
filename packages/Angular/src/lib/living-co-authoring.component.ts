import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { SafeHtml } from '@angular/platform-browser';
import type { UserInfo } from '@memberjunction/core';
import {
  CalculateSlaCapacitySpec,
  FilterLivingDocItems,
  GetLivingDocTypeMeta,
  ResolveVisibleLivingDoc,
  SyncLivingDocSelection,
  type LivingDocFilterKey,
  type LivingDocItemInput,
  type LivingDocTypeMeta,
  type SavedCapacityPreset,
  type SlaCapacityInput,
  type SlaCapacityResult,
} from './community-hub-workbench.ts';
import type { CommunityArtifactViewerRequest } from './community-artifact-viewer.ts';
import { CommunityArtifactViewerComponent } from './community-artifact-viewer.component.ts';
import { CommunityAttachmentGalleryComponent } from './community-attachment-gallery.component.ts';
import { StripMarkdownToPlainText } from './community-markdown.ts';

export interface LivingDocFilterOption {
  key: LivingDocFilterKey;
  label: string;
}

const LIVING_DOC_FILTERS: ReadonlyArray<LivingDocFilterOption> = [
  { key: 'all', label: 'All Artifacts' },
  { key: 'playbooks', label: 'Living Playbooks' },
  { key: 'forms', label: 'Inline Forms' },
  { key: 'mini-apps', label: 'Interactive Mini-Apps' },
];

/**
 * Living Co-Authoring, Inline Forms & Sandboxed Interactive Mini-Apps Workbench:
 *   - Hero banner with category filters
 *   - Interactive Multi-Region SLA & Capacity Preset Calculator utility card
 *   - 2-column split with living artifact directory on the left and active Markdown editor,
 *     inline check-in form, or sandboxed `allow-scripts` mini-app iframe on the right.
 */
@Component({
  standalone: true,
  selector: 'mjc-living-co-authoring',
  imports: [CommonModule, FormsModule, CommunityArtifactViewerComponent, CommunityAttachmentGalleryComponent],
  templateUrl: './living-co-authoring.component.html',
  styleUrl: './living-co-authoring.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LivingCoAuthoringComponent {
  public readonly filterOptions = LIVING_DOC_FILTERS;

  @Input() public items: ReadonlyArray<LivingDocItemInput> = [];
  @Input() public selectedDocId: string | null = null;
  @Input() public currentUser: UserInfo | null = null;
  @Input() public editingDocMarkdown = '';
  @Input() public docActionMessage: string | null = null;
  @Input() public threadSynthesisResult: string | null = null;
  @Input() public formRespondentName = '';
  @Input() public formConfidenceRating = 'High';
  @Input() public formComments = '';
  @Input() public formSubmissionCount = 0;
  @Input() public formSubmittedMessage: string | null = null;
  @Input() public sandboxedMiniAppSrcdoc: SafeHtml | null = null;

  @Output() public readonly selectDoc = new EventEmitter<string>();
  @Output() public readonly editingDocMarkdownChange = new EventEmitter<string>();
  @Output() public readonly saveDoc = new EventEmitter<{ docId: string; markdown: string }>();
  @Output() public readonly synthesizeDoc = new EventEmitter<string>();
  @Output() public readonly openArtifactDrawer = new EventEmitter<CommunityArtifactViewerRequest>();
  @Output() public readonly formRespondentNameChange = new EventEmitter<string>();
  @Output() public readonly formConfidenceRatingChange = new EventEmitter<string>();
  @Output() public readonly formCommentsChange = new EventEmitter<string>();
  @Output() public readonly submitInlineForm = new EventEmitter<string>();
  @Output() public readonly resetMiniApp = new EventEmitter<string>();

  public activeFilter: LivingDocFilterKey = 'all';
  public searchQuery = '';

  // Interactive SLA & Capacity Calculator utility state
  public targetRps = 600;
  public maxP95LatencyMs = 120;
  public topologyProfile: SlaCapacityInput['topologyProfile'] = 'multi-region-active';
  public savedPresets: SavedCapacityPreset[] = [
    {
      id: 'preset-default-multi',
      label: 'Multi-Region Baseline (600 RPS)',
      detail: '5 replicas · 10,800 burst msgs',
    },
  ];

  public get filteredItems(): LivingDocItemInput[] {
    return FilterLivingDocItems(this.items, this.activeFilter, this.searchQuery);
  }

  public get activeDoc(): LivingDocItemInput | null {
    return ResolveVisibleLivingDoc(this.items, this.selectedDocId, this.activeFilter, this.searchQuery);
  }

  private syncSelectionToVisible(): void {
    const sync = SyncLivingDocSelection({
      items: this.items,
      selectedDocId: this.selectedDocId,
      editingDocMarkdown: this.editingDocMarkdown,
      filterKey: this.activeFilter,
      searchQuery: this.searchQuery,
    });
    if (sync.changed && sync.selectedDocId) {
      this.selectDoc.emit(sync.selectedDocId);
    }
  }

  public get capacitySpec(): SlaCapacityResult {
    return CalculateSlaCapacitySpec({
      targetRps: this.targetRps,
      maxP95LatencyMs: this.maxP95LatencyMs,
      topologyProfile: this.topologyProfile,
    });
  }

  public countForFilter(key: LivingDocFilterKey): number {
    return FilterLivingDocItems(this.items, key, '').length;
  }

  public metaFor(item: LivingDocItemInput): LivingDocTypeMeta {
    return GetLivingDocTypeMeta(item);
  }

  public plainExcerpt(markdown: string | null | undefined, maxLength = 92): string {
    const plain = StripMarkdownToPlainText(markdown);
    if (!plain) return 'Open artifact workspace.';
    return plain.length > maxLength ? `${plain.slice(0, maxLength).trimEnd()}...` : plain;
  }

  public hasArtifactBinding(doc: LivingDocItemInput | null | undefined): boolean {
    return Boolean(doc && (doc.isArtifactPost || doc.artifactId));
  }

  public buildArtifactRequest(doc: LivingDocItemInput): CommunityArtifactViewerRequest {
    return {
      postId: doc.id,
      postTitle: doc.title,
      postKind: doc.postTypeCode === 'interactive-experience' ? 'interactive-post' : 'artifact-post',
      artifactId: doc.artifactId ?? null,
      pinnedArtifactVersionId: doc.pinnedArtifactVersionId ?? null,
      pinnedVersionNumber: doc.pinnedVersionNumber ?? null,
      artifactModality: doc.artifactModality ?? null,
      collaborationMode: doc.collaborationMode ?? null,
      experienceKind: doc.experienceKind ?? null,
      fallbackSummaryMarkdown: doc.bodyMarkdown,
    };
  }

  public onOpenArtifactDrawer(doc: LivingDocItemInput): void {
    this.openArtifactDrawer.emit(this.buildArtifactRequest(doc));
  }

  public setFilter(key: LivingDocFilterKey): void {
    this.activeFilter = key;
    this.syncSelectionToVisible();
  }

  public onSearchQueryChange(query: string): void {
    this.searchQuery = query;
    this.syncSelectionToVisible();
  }

  public clearFilters(): void {
    this.activeFilter = 'all';
    this.searchQuery = '';
    this.syncSelectionToVisible();
  }

  public saveCapacityPreset(): void {
    const spec = this.capacitySpec;
    const label = `${this.topologyProfile} (${this.targetRps} RPS @ ${this.maxP95LatencyMs}ms)`;
    this.savedPresets = [
      {
        id: `preset-${this.savedPresets.length + 1}`,
        label,
        detail: spec.headlineSpec,
      },
      ...this.savedPresets.slice(0, 3),
    ];
  }

  public onSelectDoc(docId: string): void {
    this.selectDoc.emit(docId);
  }

  public onSaveDoc(): void {
    const doc = this.activeDoc;
    if (doc) {
      this.saveDoc.emit({ docId: doc.id, markdown: this.editingDocMarkdown });
    }
  }

  public onSynthesizeDoc(docId: string): void {
    this.synthesizeDoc.emit(docId);
  }

  public onSubmitInlineForm(): void {
    const doc = this.activeDoc;
    if (doc) {
      this.submitInlineForm.emit(doc.id);
    }
  }

  public onResetMiniApp(): void {
    const doc = this.activeDoc;
    if (doc) {
      this.resetMiniApp.emit(doc.id);
    }
  }
}
