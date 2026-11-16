import { Component, ChangeDetectionStrategy, ChangeDetectorRef, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Metadata } from '@memberjunction/core';
import { GraphQLActionClient, GraphQLDataProvider } from '@memberjunction/graphql-dataprovider';
import { COMMUNITY_ACTION_IDS } from '@mj-biz-apps/community-core';

/**
 * Pre-submission search widget: before a member posts a new Question, runs
 * `Community.AskFirstDeflection` and shows whether a confident existing answer was found.
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

  public queryText = '';
  public isSearching = false;
  public resultMessage: string | null = null;
  public deflected = false;

  /** Forum IDs the current member may read, scoped by the host (no permission computation here). */
  @Input() public allowedForumIDs: string[] = [];

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
