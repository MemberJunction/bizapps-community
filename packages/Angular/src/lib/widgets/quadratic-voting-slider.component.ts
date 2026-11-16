import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommunityRules, type IdeationAllocationMode } from '@mj-biz-apps/community-core';

export interface QuadraticVotingAllocationChangedEvent {
  ideaPostId: string;
  pointsAllocated: number;
  effectiveVotes: number;
}

/**
 * Quadratic Voting / 100-Point Wallet slider for an Ideation Campaign idea. Computes
 * `EffectiveVotes = sqrt(PointsAllocated)` live as the member drags, and live-validates the
 * change against their other allocations via `CommunityRules.ValidateIdeaAllocationChange` — the
 * same refund-on-revote rule the server enforces, so the slider never promises a result the save
 * would then reject.
 */
@Component({
  standalone: true,
  selector: 'mjc-quadratic-voting-slider',
  imports: [CommonModule, FormsModule],
  templateUrl: './quadratic-voting-slider.component.html',
  styleUrl: './quadratic-voting-slider.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuadraticVotingSliderComponent {
  @Input() public ideaPostId = '';
  @Input() public allocationMode: IdeationAllocationMode = 'Quadratic';
  @Input() public budgetPoints = 100;
  @Input() public maxPointsPerIdea: number | null = null;
  @Input() public existingPointsOnOtherIdeas = 0;
  @Input() public existingPointsOnThisIdea = 0;

  /** Emitted after a slider change that `validation.valid` accepts — the host's hook to persist
   * the allocation (e.g. via a server action or RunView-backed save). Not emitted for an
   * over-budget or otherwise rejected change, so a host never persists a value the server would
   * then reject. */
  @Output() public allocationChanged = new EventEmitter<QuadraticVotingAllocationChangedEvent>();

  public pointsAllocated = 0;

  public get effectiveVotes(): number {
    return this.allocationMode === 'Quadratic' ? Math.sqrt(this.pointsAllocated) : this.pointsAllocated;
  }

  public OnSliderInput(): void {
    if (this.validation.valid) {
      this.allocationChanged.emit({
        ideaPostId: this.ideaPostId,
        pointsAllocated: this.pointsAllocated,
        effectiveVotes: this.effectiveVotes,
      });
    }
  }

  public get validation(): { valid: boolean; remainingBudgetPoints: number; errorMessage?: string } {
    const result = CommunityRules.ValidateIdeaAllocationChange({
      mode: this.allocationMode,
      budgetPoints: this.budgetPoints,
      maxPointsPerIdea: this.maxPointsPerIdea,
      existingAllocations: [
        ...(this.existingPointsOnOtherIdeas > 0
          ? [{ ideaPostId: '__others__', pointsAllocated: this.existingPointsOnOtherIdeas }]
          : []),
        ...(this.existingPointsOnThisIdea > 0
          ? [{ ideaPostId: this.ideaPostId, pointsAllocated: this.existingPointsOnThisIdea }]
          : []),
      ],
      changedIdeaPostId: this.ideaPostId,
      newPointsAllocated: this.pointsAllocated,
    });
    return {
      valid: result.valid,
      remainingBudgetPoints: result.remainingBudgetPoints,
      errorMessage: result.errorMessage,
    };
  }
}
