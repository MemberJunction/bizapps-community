import { CommonModule, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import {
  ClampSlideIndex,
  ResolveLightboxKeyboardAction,
  StepCarouselIndex,
} from './community-attachment-gallery.ts';
import {
  ComputeNextTrapFocusTarget,
  type CommunitySpaceDirectoryItem,
  type CommunitySpaceFilterId,
} from './community-hub-commons.ts';
import {
  ComputeMediaLibraryCounts,
  FilterMediaLibraryEntries,
  MEDIA_LIBRARY_KIND_OPTIONS,
  MEDIA_LIBRARY_SCOPE_OPTIONS,
  PartitionMediaLibraryForDisplay,
  type MediaLibraryEntry,
  type MediaLibraryKindCounts,
  type MediaLibraryKindFilter,
  type MediaLibraryScopeCounts,
  type MediaLibraryScopeFilter,
} from './community-media-library.ts';

/**
 * Auto-Indexed Space Media & Artifacts Library component (`<mjc-media-library>`).
 * Displays every image, video, audio clip, embedded MJ Artifact, and file attachment across
 * posts and replies in the active Space (or all accessible Spaces), with type filter pills,
 * curation/uploader scope pills, search, visual thumbnail grid with click-to-lightbox,
 * sandboxed MJ Artifact preview modal, and direct "View in Thread ->" navigation.
 */
@Component({
  standalone: true,
  selector: 'mjc-media-library',
  imports: [CommonModule, FormsModule],
  templateUrl: './community-media-library.component.html',
  styleUrl: './community-media-library.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityMediaLibraryComponent {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly doc = inject(DOCUMENT);

  public readonly kindOptions = MEDIA_LIBRARY_KIND_OPTIONS;
  public readonly scopeOptions = MEDIA_LIBRARY_SCOPE_OPTIONS;

  private rawEntries: ReadonlyArray<MediaLibraryEntry> = [];
  private currentSpaceFilter: CommunitySpaceFilterId = 'all';
  private currentKindFilter: MediaLibraryKindFilter = 'all';
  private currentScopeFilter: MediaLibraryScopeFilter = 'all';
  private currentSearchQuery = '';
  private readonly trustedSrcdocCache = new Map<string, SafeHtml>();
  private lastModalTrigger: HTMLElement | null = null;

  @ViewChild('lightboxDialog') private lightboxDialog?: ElementRef<HTMLElement>;
  @ViewChild('artifactModalDialog') private artifactModalDialog?: ElementRef<HTMLElement>;

  public filteredEntries: MediaLibraryEntry[] = [];
  public visualGridEntries: MediaLibraryEntry[] = [];
  public resourceCardEntries: MediaLibraryEntry[] = [];
  public kindCounts: MediaLibraryKindCounts = {
    all: 0,
    image: 0,
    video: 0,
    audio: 0,
    artifact: 0,
    file: 0,
  };
  public scopeCounts: MediaLibraryScopeCounts = {
    all: 0,
    featured: 0,
    myUploads: 0,
  };

  public lightboxIndex: number | null = null;
  public previewArtifactEntryId: string | null = null;

  @Input() public spaces: ReadonlyArray<CommunitySpaceDirectoryItem> = [];

  @Input()
  public set entries(value: ReadonlyArray<MediaLibraryEntry> | null | undefined) {
    this.rawEntries = value ?? [];
    this.recomputeView();
  }
  public get entries(): ReadonlyArray<MediaLibraryEntry> {
    return this.rawEntries;
  }

  @Input()
  public set activeSpaceFilter(value: CommunitySpaceFilterId) {
    this.currentSpaceFilter = value || 'all';
    this.recomputeView();
  }
  public get activeSpaceFilter(): CommunitySpaceFilterId {
    return this.currentSpaceFilter;
  }

  @Input()
  public set kindFilter(value: MediaLibraryKindFilter) {
    this.currentKindFilter = value || 'all';
    this.recomputeView();
  }
  public get kindFilter(): MediaLibraryKindFilter {
    return this.currentKindFilter;
  }

  @Input()
  public set scopeFilter(value: MediaLibraryScopeFilter) {
    this.currentScopeFilter = value || 'all';
    this.recomputeView();
  }
  public get scopeFilter(): MediaLibraryScopeFilter {
    return this.currentScopeFilter;
  }

  @Input()
  public set searchQuery(value: string) {
    this.currentSearchQuery = value ?? '';
    this.recomputeView();
  }
  public get searchQuery(): string {
    return this.currentSearchQuery;
  }

  @Output() public readonly spaceFilterChange = new EventEmitter<CommunitySpaceFilterId>();
  @Output() public readonly kindFilterChange = new EventEmitter<MediaLibraryKindFilter>();
  @Output() public readonly scopeFilterChange = new EventEmitter<MediaLibraryScopeFilter>();
  @Output() public readonly searchQueryChange = new EventEmitter<string>();
  @Output() public readonly viewInThread = new EventEmitter<string>();
  @Output() public readonly filtersReset = new EventEmitter<void>();

  public get lightboxEntry(): MediaLibraryEntry | null {
    if (this.lightboxIndex === null || this.visualGridEntries.length === 0) {
      return null;
    }
    return this.visualGridEntries[ClampSlideIndex(this.lightboxIndex, this.visualGridEntries.length)] ?? null;
  }

  public get previewArtifactEntry(): MediaLibraryEntry | null {
    if (!this.previewArtifactEntryId) return null;
    return this.filteredEntries.find((e) => e.id === this.previewArtifactEntryId) ?? null;
  }

  public get hasActiveFilters(): boolean {
    return Boolean(
      this.currentKindFilter !== 'all' ||
        this.currentScopeFilter !== 'all' ||
        this.currentSearchQuery.trim() ||
        (this.currentSpaceFilter && this.currentSpaceFilter !== 'all'),
    );
  }

  public getKindCount(key: MediaLibraryKindFilter): number {
    return this.kindCounts[key];
  }

  public getScopeCount(key: MediaLibraryScopeFilter): number {
    if (key === 'featured') return this.scopeCounts.featured;
    if (key === 'my-uploads') return this.scopeCounts.myUploads;
    return this.scopeCounts.all;
  }

  public onSpaceSelect(spaceId: string): void {
    this.spaceFilterChange.emit(spaceId || 'all');
  }

  public selectKind(kind: MediaLibraryKindFilter): void {
    this.kindFilterChange.emit(kind);
  }

  public selectScope(scope: MediaLibraryScopeFilter): void {
    this.scopeFilterChange.emit(scope);
  }

  public onSearchInput(query: string): void {
    this.searchQueryChange.emit(query);
  }

  public clearSearch(): void {
    this.searchQueryChange.emit('');
  }

  public resetFilters(): void {
    this.filtersReset.emit();
  }

  public openEntryThread(sourceItemId: string): void {
    this.lightboxIndex = null;
    this.previewArtifactEntryId = null;
    this.viewInThread.emit(sourceItemId);
  }

  // ─── Lightbox Modal ───────────────────────────────────────────────────────

  public openLightbox(index: number): void {
    if (this.visualGridEntries.length === 0) return;
    this.captureTriggerFocus();
    this.previewArtifactEntryId = null;
    this.lightboxIndex = ClampSlideIndex(index, this.visualGridEntries.length);
    this.cdr.markForCheck();
    this.scheduleModalInitialFocus('lightbox');
  }

  public closeLightbox(): void {
    if (this.lightboxIndex === null) return;
    this.lightboxIndex = null;
    this.cdr.markForCheck();
    this.restoreTriggerFocus();
  }

  public prevLightboxItem(): void {
    if (this.lightboxIndex === null || this.visualGridEntries.length <= 1) return;
    this.lightboxIndex = StepCarouselIndex(this.lightboxIndex, -1, this.visualGridEntries.length, true);
    this.cdr.markForCheck();
  }

  public nextLightboxItem(): void {
    if (this.lightboxIndex === null || this.visualGridEntries.length <= 1) return;
    this.lightboxIndex = StepCarouselIndex(this.lightboxIndex, 1, this.visualGridEntries.length, true);
    this.cdr.markForCheck();
  }

  public onLightboxKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      this.trapTabFocus(event, this.lightboxDialog?.nativeElement);
      return;
    }
    const action = ResolveLightboxKeyboardAction(event.key);
    if (action === 'none') return;
    event.preventDefault();
    event.stopPropagation();
    if (action === 'close') {
      this.closeLightbox();
    } else if (action === 'prev') {
      this.prevLightboxItem();
    } else if (action === 'next') {
      this.nextLightboxItem();
    }
  }

  // ─── Sandboxed Artifact Preview Modal ─────────────────────────────────────

  public openArtifactPreview(entryId: string): void {
    const match = this.filteredEntries.find((e) => e.id === entryId && e.kind === 'artifact');
    if (!match) return;
    this.captureTriggerFocus();
    this.lightboxIndex = null;
    this.previewArtifactEntryId = entryId;
    this.cdr.markForCheck();
    this.scheduleModalInitialFocus('artifact');
  }

  public closeArtifactPreview(): void {
    if (!this.previewArtifactEntryId) return;
    this.previewArtifactEntryId = null;
    this.cdr.markForCheck();
    this.restoreTriggerFocus();
  }

  public onArtifactModalKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      this.trapTabFocus(event, this.artifactModalDialog?.nativeElement);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.closeArtifactPreview();
    }
  }

  public getTrustedSrcdoc(entry: MediaLibraryEntry): SafeHtml | null {
    const html = entry.artifactPreview?.sandboxedHtmlDocument;
    if (!html) return null;
    const cacheKey = `${entry.id}::${html}`;
    const cached = this.trustedSrcdocCache.get(cacheKey);
    if (cached) return cached;
    const trusted = this.sanitizer.bypassSecurityTrustHtml(html);
    this.trustedSrcdocCache.set(cacheKey, trusted);
    return trusted;
  }

  // ─── Internal View Model & Focus Management ───────────────────────────────

  private recomputeView(): void {
    const criteria = {
      spaceFilter: this.currentSpaceFilter,
      kindFilter: this.currentKindFilter,
      scopeFilter: this.currentScopeFilter,
      searchQuery: this.currentSearchQuery,
    };
    this.filteredEntries = FilterMediaLibraryEntries(this.rawEntries, criteria);
    const partitioned = PartitionMediaLibraryForDisplay(this.filteredEntries);
    this.visualGridEntries = partitioned.visualGrid;
    this.resourceCardEntries = partitioned.resourceCards;

    const counts = ComputeMediaLibraryCounts(this.rawEntries, criteria);
    this.kindCounts = counts.kindCounts;
    this.scopeCounts = counts.scopeCounts;

    if (this.lightboxIndex !== null && this.lightboxIndex >= this.visualGridEntries.length) {
      this.lightboxIndex = this.visualGridEntries.length > 0 ? 0 : null;
    }
    if (this.previewArtifactEntryId && !this.filteredEntries.some((e) => e.id === this.previewArtifactEntryId)) {
      this.previewArtifactEntryId = null;
    }
    this.cdr.markForCheck();
  }

  private captureTriggerFocus(): void {
    const active = this.doc?.activeElement;
    if (
      active instanceof HTMLElement &&
      active !== this.doc?.body &&
      active !== this.doc?.documentElement
    ) {
      this.lastModalTrigger = active;
    }
  }

  private restoreTriggerFocus(): void {
    const trigger = this.lastModalTrigger;
    this.lastModalTrigger = null;
    if (!trigger) return;
    setTimeout(() => {
      if (trigger.isConnected) {
        trigger.focus();
      }
    }, 0);
  }

  @HostListener('document:keydown.escape', ['$event'])
  public onDocumentEscape(event: Event): void {
    if (this.previewArtifactEntryId) {
      event.stopPropagation();
      this.closeArtifactPreview();
      return;
    }
    if (this.lightboxIndex !== null) {
      event.stopPropagation();
      this.closeLightbox();
    }
  }

  private scheduleModalInitialFocus(kind: 'lightbox' | 'artifact'): void {
    const focusDialog = (): boolean => {
      const dialogEl =
        kind === 'lightbox'
          ? this.lightboxDialog?.nativeElement
          : this.artifactModalDialog?.nativeElement;
      if (!dialogEl) return false;
      const focusables = this.getFocusableElements(dialogEl);
      const target = focusables[0] ?? dialogEl;
      target.focus();
      return true;
    };
    queueMicrotask(() => {
      if (!focusDialog()) {
        setTimeout(() => {
          focusDialog();
        }, 0);
      }
    });
  }

  private trapTabFocus(event: KeyboardEvent, container: HTMLElement | undefined): void {
    if (!container) return;
    const focusables = this.getFocusableElements(container);
    if (focusables.length === 0) {
      event.preventDefault();
      container.focus();
      return;
    }
    const active = this.doc?.activeElement instanceof HTMLElement ? this.doc.activeElement : null;
    const next = ComputeNextTrapFocusTarget(focusables, active, event.shiftKey);
    if (next) {
      event.preventDefault();
      next.focus();
    }
  }

  private getFocusableElements(container: HTMLElement): HTMLElement[] {
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
}
