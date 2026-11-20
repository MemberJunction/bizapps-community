import { Component, ChangeDetectionStrategy, ChangeDetectorRef, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Metadata } from '@memberjunction/core';
import { GraphQLActionClient, GraphQLDataProvider } from '@memberjunction/graphql-dataprovider';
import { COMMUNITY_ACTION_IDS } from '@mj-biz-apps/community-core';
import type { CommunityCommonsItem } from '../community-hub-commons.ts';
import { ComputeLiveAskFirstMatches, type AskFirstLiveMatch } from '../community-hub-wedge.ts';

/**
 * Pre-submission search widget: before a member posts a new Question, surfaces live hybrid
 * semantic + lexical matches as they type and runs `Community.AskFirstDeflection` on search.
 */
@Component({
  standalone: true,
  selector: 'mjc-ask-first-deflection-widget',
  imports: [CommonModule, FormsModule],
  templateUrl: './ask-first-deflection-widget.component.html',
  styleUrl: './ask-first-deflection-widget.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AskFirstDeflectionWidgetComponent {
  private readonly cdr = inject(ChangeDetectorRef);
  private liveSearchNonce = 0;

  public queryText = '';
  public isSearching = false;
  public resultMessage: string | null = null;
  public deflected = false;
  public liveMatches: AskFirstLiveMatch[] = [];

  /** Forum IDs the current member may read, scoped by the host (no permission computation here). */
  @Input() public allowedForumIDs: string[] = [];
  /** Optional local candidate stream items for zero-latency live semantic matching while typing. */
  @Input() public candidateItems: ReadonlyArray<CommunityCommonsItem> = [];
  @Output() public readonly matchSelected = new EventEmitter<string>();

  public async onQueryChange(nextValue: string): Promise<void> {
    this.queryText = nextValue;
    const nonce = ++this.liveSearchNonce;
    const trimmed = nextValue.trim();
    if (trimmed.length < 4 || this.candidateItems.length === 0) {
      this.liveMatches = [];
      this.cdr.markForCheck();
      return;
    }

    const matches = await ComputeLiveAskFirstMatches({
      queryText: trimmed,
      candidates: this.candidateItems,
      maxMatches: 3,
      minScore: 0.24,
    });
    if (nonce !== this.liveSearchNonce) {
      return;
    }
    this.liveMatches = matches;
    this.cdr.markForCheck();
  }

  public openLiveMatch(itemId: string): void {
    this.matchSelected.emit(itemId);
  }

  public async Search(): Promise<void> {
    if (!this.queryText.trim() || this.isSearching) {
      return;
    }
    this.isSearching = true;
    this.resultMessage = null;
    this.cdr.markForCheck();

    try {
      const provider = Metadata.Provider as GraphQLDataProvider;
      const actionClient = new GraphQLActionClient(provider);
      const result = await actionClient.RunAction(COMMUNITY_ACTION_IDS.AskFirstDeflection, [
        { Name: 'QueryText', Value: this.queryText, Type: 'Input' },
        { Name: 'AllowedForumIDs', Value: this.allowedForumIDs.join(','), Type: 'Input' },
      ]);
      this.deflected = result.ResultCode === 'DEFLECTED';
      this.resultMessage = result.Message ?? null;
    } catch (err) {
      this.deflected = false;
      this.resultMessage = err instanceof Error ? err.message : 'Search failed.';
    } finally {
      this.isSearching = false;
      this.cdr.markForCheck();
    }
  }
}
