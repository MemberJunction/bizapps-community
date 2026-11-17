import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ComputeQaCanonStats,
  FilterQaCanonItems,
  GetEpistemicBadgeTone,
  type QaCanonFilterKey,
  type QaCanonItemInput,
  type QaCanonStats,
} from './community-hub-workbench.ts';
import type { CommunityBadgeTone } from './community-hub-commons.ts';

export interface QaFilterPillOption {
  key: QaCanonFilterKey;
  label: string;
}

const QA_FILTER_PILLS: ReadonlyArray<QaFilterPillOption> = [
  { key: 'all', label: 'All Entries' },
  { key: 'canon-verified', label: 'Canon Verified' },
  { key: 'novel-insight', label: 'Novel Insight' },
  { key: 'needs-review', label: 'Needs Review' },
];

/**
 * Epistemic Q&A Canon Workbench:
 *   - Hero banner with Canon Verified / Acceptance / Confidence metrics and Ask-a-Question composer toggle
 *   - Epistemic status filter bar and instant search across canon records
 *   - 2-column split with status-coded Q&A index on the left and epistemic inspector + answer composer on the right
 */
@Component({
  standalone: true,
  selector: 'mjc-qa-canon-workbench',
  imports: [CommonModule, FormsModule],
  templateUrl: './qa-canon-workbench.component.html',
  styleUrl: './qa-canon-workbench.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QaCanonWorkbenchComponent {
  public readonly filterPills = QA_FILTER_PILLS;

  @Input() public items: ReadonlyArray<QaCanonItemInput> = [];
  @Input() public selectedQaId: string | null = null;
  @Input() public showQuestionComposer = false;
  @Input() public newQuestionTitle = '';
  @Input() public newQuestionBody = '';
  @Input() public newAnswerBody = '';
  @Input() public qaActionMessage: string | null = null;

  @Output() public readonly toggleComposer = new EventEmitter<void>();
  @Output() public readonly newQuestionTitleChange = new EventEmitter<string>();
  @Output() public readonly newQuestionBodyChange = new EventEmitter<string>();
  @Output() public readonly createQuestion = new EventEmitter<void>();
  @Output() public readonly selectQa = new EventEmitter<string>();
  @Output() public readonly gradeAnswer = new EventEmitter<string>();
  @Output() public readonly promoteAnswer = new EventEmitter<string>();
  @Output() public readonly newAnswerBodyChange = new EventEmitter<string>();
  @Output() public readonly submitAnswer = new EventEmitter<void>();

  public activeFilter: QaCanonFilterKey = 'all';
  public searchQuery = '';

  public get stats(): QaCanonStats {
    return ComputeQaCanonStats(this.items);
  }

  public get filteredItems(): QaCanonItemInput[] {
    return FilterQaCanonItems(this.items, this.activeFilter, this.searchQuery);
  }

  public get selectedItem(): QaCanonItemInput | null {
    const visible = this.filteredItems;
    if (visible.length === 0) {
      return this.items.find((q) => q.id === this.selectedQaId) ?? this.items[0] ?? null;
    }
    return visible.find((q) => q.id === this.selectedQaId) ?? visible[0] ?? null;
  }

  public countForFilter(key: QaCanonFilterKey): number {
    return FilterQaCanonItems(this.items, key, '').length;
  }

  public badgeToneFor(item: QaCanonItemInput): CommunityBadgeTone {
    return GetEpistemicBadgeTone(item.epistemicStatus, item.isAccepted);
  }

  public confidencePct(item: QaCanonItemInput): number | null {
    if (typeof item.confidenceScore !== 'number' || !Number.isFinite(item.confidenceScore)) {
      return null;
    }
    return Math.round(item.confidenceScore * 100);
  }

  public setFilter(key: QaCanonFilterKey): void {
    this.activeFilter = key;
  }

  public clearFilters(): void {
    this.activeFilter = 'all';
    this.searchQuery = '';
  }

  public onToggleComposer(): void {
    this.toggleComposer.emit();
  }

  public onCreateQuestion(): void {
    this.createQuestion.emit();
  }

  public onSelectItem(id: string): void {
    this.selectQa.emit(id);
  }

  public onGradeAnswer(id: string): void {
    this.gradeAnswer.emit(id);
  }

  public onPromoteAnswer(id: string): void {
    this.promoteAnswer.emit(id);
  }

  public onSubmitAnswer(): void {
    this.submitAnswer.emit();
  }
}
