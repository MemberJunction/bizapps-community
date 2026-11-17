import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { SafeHtml } from '@angular/platform-browser';
import {
  CalculateSlaCapacitySpec,
  FilterLivingDocItems,
  GetLivingDocTypeMeta,
  type LivingDocFilterKey,
  type LivingDocItemInput,
  type LivingDocTypeMeta,
  type SavedCapacityPreset,
  type SlaCapacityInput,
  type SlaCapacityResult,
} from './community-hub-workbench.ts';

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
  imports: [CommonModule, FormsModule],
  templateUrl: './living-co-authoring.component.html',
  styleUrl: './living-co-authoring.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LivingCoAuthoringComponent {
  public readonly filterOptions = LIVING_DOC_FILTERS;

  @Input() public items: ReadonlyArray<LivingDocItemInput> = [];
  @Input() public selectedDocId: string | null = null;
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
  @Output() public readonly saveDoc = new EventEmitter<void>();
  @Output() public readonly synthesizeDoc = new EventEmitter<string>();
  @Output() public readonly formRespondentNameChange = new EventEmitter<string>();
  @Output() public readonly formConfidenceRatingChange = new EventEmitter<string>();
  @Output() public readonly formCommentsChange = new EventEmitter<string>();
  @Output() public readonly submitInlineForm = new EventEmitter<void>();
  @Output() public readonly resetMiniApp = new EventEmitter<void>();

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
    const visible = this.filteredItems;
    if (visible.length === 0) {
      return this.items.find((d) => d.id === this.selectedDocId) ?? this.items[0] ?? null;
    }
    return visible.find((d) => d.id === this.selectedDocId) ?? visible[0] ?? null;
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

  public setFilter(key: LivingDocFilterKey): void {
    this.activeFilter = key;
  }

  public clearFilters(): void {
    this.activeFilter = 'all';
    this.searchQuery = '';
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
    this.saveDoc.emit();
  }

  public onSynthesizeDoc(docId: string): void {
    this.synthesizeDoc.emit(docId);
  }

  public onSubmitInlineForm(): void {
    this.submitInlineForm.emit();
  }

  public onResetMiniApp(): void {
    this.resetMiniApp.emit();
  }
}
