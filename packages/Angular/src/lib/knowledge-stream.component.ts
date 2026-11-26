import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DEFAULT_COMMUNITY_SPACE_ICON_CLASS,
  FilterCommonsStream,
  STREAM_TYPE_FILTER_OPTIONS,
  type CommunityCommonsItem,
  type CommunitySessionItem,
  type CommunitySpaceDirectoryItem,
  type CommunitySpaceFilterId,
  type CommunityStreamTypeFilter,
} from './community-hub-commons.ts';
import type { CommunityHubDigestCadence, CommunityHubTabKey } from './community-hub-preferences.ts';
import type { LivingThreadSynthesisView } from './community-hub-wedge.ts';
import { RenderSafeMarkdownHtml } from './community-markdown.ts';
import { CommunityAttachmentGalleryComponent } from './community-attachment-gallery.component.ts';
import { CommunityAttachmentPickerComponent } from './community-attachment-picker.component.ts';
import type {
  AccessibleArtifactCatalogItem,
  DraftCommunityAttachment,
} from './community-attachment-picker.ts';
import { AskFirstDeflectionWidgetComponent } from './widgets/ask-first-deflection-widget.component.ts';

export interface KnowledgeStreamWalletSummaryItem {
  id: string;
  title: string;
  myPointsAllocated: number;
}

export interface InlineReplySubmittedPayload {
  itemId: string;
  replyBody: string;
  attachments: ReadonlyArray<DraftCommunityAttachment>;
}

/**
 * 3-column Commons Workspace for the Knowledge Stream tab:
 *   - Left Navigation Rail: Spaces directory & topic/group filters
 *   - Center Activity Stream: quick composer prompt, stream type pills & editorial cards
 *   - Right Context Rail: Ask-First Canon Lookup, Campaign Priority Wallet & Upcoming Sessions
 */
@Component({
  standalone: true,
  selector: 'mjc-knowledge-stream',
  imports: [
    CommonModule,
    FormsModule,
    AskFirstDeflectionWidgetComponent,
    CommunityAttachmentGalleryComponent,
    CommunityAttachmentPickerComponent,
  ],
  templateUrl: './knowledge-stream.component.html',
  styleUrl: './knowledge-stream.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KnowledgeStreamComponent {
  private readonly cdr = inject(ChangeDetectorRef);
  public readonly streamTypeOptions = STREAM_TYPE_FILTER_OPTIONS;

  @Input() public spaces: ReadonlyArray<CommunitySpaceDirectoryItem> = [];
  @Input() public topics: ReadonlyArray<string> = [];
  @Input() public items: ReadonlyArray<CommunityCommonsItem> = [];
  @Input() public selectedItemId: string | null = null;
  @Input() public activeSpaceFilter: CommunitySpaceFilterId = 'all';
  @Input() public activeTopicFilter: string | null = null;
  @Input() public activeStreamTypeFilter: CommunityStreamTypeFilter = 'all';
  @Input() public searchQuery = '';
  @Input() public allowedForumIDs: string[] = [];
  @Input() public isSynthesizing = false;
  @Input() public threadSynthesisResult: string | null = null;
  @Input() public structuredThreadSynthesis: LivingThreadSynthesisView | null = null;
  @Input() public actionError: string | null = null;
  @Input() public activeCampaignName = '';
  @Input() public remainingWalletPoints = 0;
  @Input() public totalWalletPoints = 0;
  @Input() public walletSummaryIdeas: ReadonlyArray<KnowledgeStreamWalletSummaryItem> = [];
  @Input() public sessions: ReadonlyArray<CommunitySessionItem> = [];
  @Input() public digestCadence: CommunityHubDigestCadence = 'weekly';
  @Input() public topDigestMatchTitle: string | null = null;
  @Input() public topDigestMatchScorePct = 0;
  @Input() public accessibleArtifacts: ReadonlyArray<AccessibleArtifactCatalogItem> = [];

  @Output() public readonly spaceFilterChange = new EventEmitter<CommunitySpaceFilterId>();
  @Output() public readonly topicFilterChange = new EventEmitter<string | null>();
  @Output() public readonly streamTypeFilterChange = new EventEmitter<CommunityStreamTypeFilter>();
  @Output() public readonly filtersReset = new EventEmitter<void>();
  @Output() public readonly itemInspected = new EventEmitter<string>();
  @Output() public readonly itemUpvoted = new EventEmitter<string>();
  @Output() public readonly threadSynthesized = new EventEmitter<string>();
  @Output() public readonly threadRegenerated = new EventEmitter<string>();
  @Output() public readonly inlineReplySubmitted = new EventEmitter<InlineReplySubmittedPayload>();
  @Output() public readonly itemGraduated = new EventEmitter<string>();
  @Output() public readonly askShareRequested = new EventEmitter<void>();
  @Output() public readonly navigateToTab = new EventEmitter<CommunityHubTabKey>();
  @Output() public readonly sessionRsvpToggled = new EventEmitter<string>();
  @Output() public readonly digestPreviewRequested = new EventEmitter<void>();

  public canonLookupQuery = '';
  public showAllTopics = false;
  private readonly defaultVisibleTopicLimit = 10;
  private readonly expandedItemIds = new Set<string>();
  private readonly failedSpaceAvatarIds = new Set<string>();
  private readonly inlineReplyDrafts = new Map<string, string>();
  private readonly inlineReplyAttachments = new Map<string, DraftCommunityAttachment[]>();
  private readonly inlineReplyAttachmentErrors = new Map<string, string | null>();

  public get featuredSpaces(): ReadonlyArray<CommunitySpaceDirectoryItem> {
    return this.spaces.filter((space) => space.id !== 'all');
  }

  public hasRenderableAvatar(space: CommunitySpaceDirectoryItem | null | undefined): boolean {
    if (!space?.imageUrl) {
      return false;
    }
    return !this.failedSpaceAvatarIds.has(space.id.toLowerCase());
  }

  public spaceIconClass(space: CommunitySpaceDirectoryItem | null | undefined): string {
    return space?.iconClass?.trim() || DEFAULT_COMMUNITY_SPACE_ICON_CLASS;
  }

  public spaceForItem(item: CommunityCommonsItem): CommunitySpaceDirectoryItem | null {
    const key = item.spaceId?.trim().toLowerCase();
    if (!key || key === 'all') {
      return null;
    }
    return this.spaces.find((s) => s.id.toLowerCase() === key) ?? null;
  }

  public onSpaceAvatarError(spaceId: string): void {
    const key = spaceId?.trim().toLowerCase();
    if (!key) return;
    this.failedSpaceAvatarIds.add(key);
    this.cdr.markForCheck();
  }

  public get visibleTopics(): ReadonlyArray<string> {
    if (this.showAllTopics || this.topics.length <= this.defaultVisibleTopicLimit) {
      return this.topics;
    }
    const base = this.topics.slice(0, this.defaultVisibleTopicLimit);
    if (this.activeTopicFilter && !base.includes(this.activeTopicFilter) && this.topics.includes(this.activeTopicFilter)) {
      return [...base, this.activeTopicFilter];
    }
    return base;
  }

  public get hiddenTopicsCount(): number {
    return Math.max(0, this.topics.length - this.visibleTopics.length);
  }

  public toggleShowAllTopics(): void {
    this.showAllTopics = !this.showAllTopics;
  }

  public renderMarkdown(markdown: string | null | undefined): string {
    return RenderSafeMarkdownHtml(markdown);
  }

  public showTimestamp(item: CommunityCommonsItem): boolean {
    const ts = item.timestampLabel?.trim().toLowerCase() ?? '';
    const status = item.statusBadge?.trim().toLowerCase() ?? '';
    return ts.length > 0 && ts !== status;
  }

  public spaceDotTone(index: number): 'brand' | 'success' | 'violet' | 'warning' | 'info' {
    const tones: ReadonlyArray<'brand' | 'success' | 'violet' | 'warning' | 'info'> = [
      'brand',
      'success',
      'violet',
      'warning',
      'info',
    ];
    return tones[index % tones.length];
  }

  public get filteredItems(): CommunityCommonsItem[] {
    return FilterCommonsStream(this.items, {
      spaceFilter: this.activeSpaceFilter,
      topicFilter: this.activeTopicFilter,
      streamTypeFilter: this.activeStreamTypeFilter,
      searchQuery: this.searchQuery,
    });
  }

  public get activeSpaceInfo(): CommunitySpaceDirectoryItem | null {
    if (this.activeSpaceFilter === 'all') return null;
    return this.spaces.find((s) => s.id === this.activeSpaceFilter) ?? null;
  }

  public get hasActiveFilters(): boolean {
    return (
      this.activeSpaceFilter !== 'all' ||
      this.activeTopicFilter !== null ||
      this.activeStreamTypeFilter !== 'all' ||
      this.searchQuery.trim().length > 0
    );
  }

  public get canonLookupMatches(): CommunityCommonsItem[] {
    const q = this.canonLookupQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return this.items
      .filter((item) => {
        const hay = `${item.title} ${item.excerpt} ${item.bodyMarkdown} ${item.tags.join(' ')}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 3);
  }

  public get synthesizeTargetId(): string | null {
    if (this.selectedItemId && this.filteredItems.some((i) => i.id === this.selectedItemId)) {
      return this.selectedItemId;
    }
    return this.filteredItems[0]?.id ?? this.items[0]?.id ?? null;
  }

  public get synthesizeTargetSourcePostId(): string {
    const target = this.items.find((i) => i.id === this.synthesizeTargetId) ?? this.items[0];
    return target?.sourcePostId ?? target?.id ?? '';
  }

  public countForSpace(spaceId: CommunitySpaceFilterId): number {
    if (spaceId === 'all') return this.items.length;
    return this.items.filter((item) => item.spaceId === spaceId).length;
  }

  public selectSpace(spaceId: CommunitySpaceFilterId): void {
    this.spaceFilterChange.emit(spaceId);
  }

  public selectTopic(topic: string): void {
    const next = this.activeTopicFilter === topic ? null : topic;
    this.topicFilterChange.emit(next);
  }

  public selectStreamType(streamType: CommunityStreamTypeFilter): void {
    this.streamTypeFilterChange.emit(streamType);
  }

  public resetAllFilters(): void {
    this.filtersReset.emit();
  }

  public openComposer(): void {
    this.askShareRequested.emit();
  }

  public inspectItem(itemId: string): void {
    this.itemInspected.emit(itemId);
  }

  public isItemExpanded(itemId: string): boolean {
    return this.expandedItemIds.has(itemId);
  }

  public toggleItemExpanded(itemId: string): void {
    if (this.expandedItemIds.has(itemId)) {
      this.expandedItemIds.delete(itemId);
    } else {
      this.expandedItemIds.add(itemId);
    }
  }

  public expandAndSynthesize(item: CommunityCommonsItem): void {
    this.expandedItemIds.add(item.id);
    this.threadSynthesized.emit(item.sourcePostId);
  }

  public regenerateSynthesis(sourcePostId: string): void {
    this.threadRegenerated.emit(sourcePostId);
  }

  public getInlineReplyDraft(itemId: string): string {
    return this.inlineReplyDrafts.get(itemId) ?? '';
  }

  public setInlineReplyDraft(itemId: string, value: string): void {
    this.inlineReplyDrafts.set(itemId, value);
  }

  public getInlineReplyAttachments(itemId: string): DraftCommunityAttachment[] {
    return this.inlineReplyAttachments.get(itemId) ?? [];
  }

  public setInlineReplyAttachments(itemId: string, drafts: DraftCommunityAttachment[]): void {
    this.inlineReplyAttachments.set(itemId, [...drafts]);
    this.cdr.markForCheck();
  }

  public getInlineReplyAttachmentError(itemId: string): string | null {
    return this.inlineReplyAttachmentErrors.get(itemId) ?? null;
  }

  public setInlineReplyAttachmentError(itemId: string, error: string | null): void {
    if (error) {
      this.inlineReplyAttachmentErrors.set(itemId, error);
    } else {
      this.inlineReplyAttachmentErrors.delete(itemId);
    }
    this.cdr.markForCheck();
  }

  public clearInlineReplyDraft(itemId: string): void {
    this.inlineReplyDrafts.delete(itemId);
    this.inlineReplyAttachments.delete(itemId);
    this.inlineReplyAttachmentErrors.delete(itemId);
    this.cdr.markForCheck();
  }

  public submitInlineReply(itemId: string): void {
    const replyBody = (this.inlineReplyDrafts.get(itemId) ?? '').trim();
    if (!replyBody || this.getInlineReplyAttachmentError(itemId)) return;
    const attachments = this.inlineReplyAttachments.get(itemId) ?? [];
    this.inlineReplySubmitted.emit({ itemId, replyBody, attachments: [...attachments] });
  }

  public graduateItem(itemId: string): void {
    this.itemGraduated.emit(itemId);
  }

  public upvoteItem(event: Event, itemId: string): void {
    event.stopPropagation();
    this.itemUpvoted.emit(itemId);
  }

  public synthesizeActiveThread(): void {
    this.threadSynthesized.emit(this.synthesizeTargetSourcePostId);
  }

  public openIdeationTab(): void {
    this.navigateToTab.emit('quadratic-ideation-wallet');
  }

  public toggleRsvp(sessionId: string): void {
    this.sessionRsvpToggled.emit(sessionId);
  }

  public openDigestPreview(): void {
    this.digestPreviewRequested.emit();
  }
}
