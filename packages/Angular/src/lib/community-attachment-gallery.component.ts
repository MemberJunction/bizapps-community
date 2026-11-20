import { CommonModule, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Input,
  ViewChild,
  inject,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import type { CommunityAttachmentItem } from '@mj-biz-apps/community-core';
import {
  BuildAttachmentGalleryModel,
  ClampSlideIndex,
  ResolveCarouselKeyboardAction,
  ResolveLightboxKeyboardAction,
  StepCarouselIndex,
  type AttachmentGalleryMode,
  type AttachmentGalleryModel,
  type SanitizedArtifactCardItem,
  type SanitizedAudioTrackItem,
  type SanitizedVisualMediaItem,
} from './community-attachment-gallery.ts';
import { ComputeNextTrapFocusTarget } from './community-hub-commons.ts';

let nextGalleryInstanceId = 0;

/**
 * Standalone OnPush attachment gallery component rendering:
 * - Single images (click-to-zoom Lightbox) and single videos (`<video controls preload="metadata">`)
 * - Mixed multi-media Visual Carousels with slide counter pills, thumbnail strip & keyboard nav
 * - Single audio cards and multi-track Audio Carousels / Track Switchers (`Track 1 of N`)
 * - Embedded MJ Artifact cards (Markdown, sandboxed `allow-scripts` HTML/SVG iframes, Code/JSON,
 *   structured metadata, Featured in Library badge, and Full Preview modal)
 * - Regular non-media file chips with type icon, formatted size, and sanitized download links.
 */
@Component({
  standalone: true,
  selector: 'mjc-attachment-gallery',
  imports: [CommonModule],
  templateUrl: './community-attachment-gallery.component.html',
  styleUrl: './community-attachment-gallery.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityAttachmentGalleryComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly doc = inject(DOCUMENT);

  private readonly instanceId = ++nextGalleryInstanceId;
  public readonly lightboxTitleId = `mjc-att-lightbox-title-${this.instanceId}`;
  public readonly artifactModalTitleId = `mjc-att-artifact-modal-title-${this.instanceId}`;

  private rawAttachments: ReadonlyArray<CommunityAttachmentItem> = [];
  private galleryMode: AttachmentGalleryMode = 'full';
  private readonly expandedArtifactIds = new Set<string>();
  private readonly trustedSrcdocCache = new Map<string, SafeHtml>();
  private lastModalTrigger: HTMLElement | null = null;

  @ViewChild('lightboxDialog') private lightboxDialog?: ElementRef<HTMLElement>;
  @ViewChild('artifactModalDialog') private artifactModalDialog?: ElementRef<HTMLElement>;

  public model: AttachmentGalleryModel = BuildAttachmentGalleryModel([]);
  public activeSlideIndex = 0;
  public activeAudioIndex = 0;
  public lightboxIndex: number | null = null;
  public fullPreviewArtifactId: string | null = null;
  public carouselAnnouncement = '';
  public audioAnnouncement = '';

  @Input() public ariaLabel = 'Post attachments';

  @Input()
  public set mode(value: AttachmentGalleryMode) {
    if (this.galleryMode !== value) {
      this.galleryMode = value;
      this.syncExpandedArtifacts();
      this.cdr.markForCheck();
    }
  }
  public get mode(): AttachmentGalleryMode {
    return this.galleryMode;
  }

  @Input()
  public set attachments(value: ReadonlyArray<CommunityAttachmentItem> | null | undefined) {
    const next = value ?? [];
    this.rawAttachments = next;
    this.model = BuildAttachmentGalleryModel(next);
    this.activeSlideIndex = ClampSlideIndex(0, this.model.visualMedia.length);
    this.activeAudioIndex = ClampSlideIndex(0, this.model.audioTracks.length);
    this.lightboxIndex = null;
    this.fullPreviewArtifactId = null;
    this.carouselAnnouncement = '';
    this.audioAnnouncement = '';
    this.syncExpandedArtifacts();
    this.cdr.markForCheck();
  }
  public get attachments(): ReadonlyArray<CommunityAttachmentItem> {
    return this.rawAttachments;
  }

  public get hasAttachments(): boolean {
    return this.model.totalCount > 0;
  }

  public get activeVisualSlide(): SanitizedVisualMediaItem | null {
    if (this.model.visualMedia.length === 0) return null;
    return this.model.visualMedia[ClampSlideIndex(this.activeSlideIndex, this.model.visualMedia.length)] ?? null;
  }

  public get activeAudioTrack(): SanitizedAudioTrackItem | null {
    if (this.model.audioTracks.length === 0) return null;
    return this.model.audioTracks[ClampSlideIndex(this.activeAudioIndex, this.model.audioTracks.length)] ?? null;
  }

  public get lightboxItem(): SanitizedVisualMediaItem | null {
    if (this.lightboxIndex === null || this.model.visualMedia.length === 0) {
      return null;
    }
    return this.model.visualMedia[ClampSlideIndex(this.lightboxIndex, this.model.visualMedia.length)] ?? null;
  }

  public get fullPreviewArtifact(): SanitizedArtifactCardItem | null {
    if (!this.fullPreviewArtifactId) return null;
    return this.model.artifacts.find((a) => a.id === this.fullPreviewArtifactId) ?? null;
  }

  private syncExpandedArtifacts(): void {
    this.expandedArtifactIds.clear();
    if (this.galleryMode === 'full') {
      for (const art of this.model.artifacts) {
        if (art.showInlinePreviewByDefault && art.preview.hasPreview) {
          this.expandedArtifactIds.add(art.id);
        }
      }
    }
  }

  public isArtifactExpanded(artifactId: string): boolean {
    return this.expandedArtifactIds.has(artifactId);
  }

  public toggleArtifactPreview(artifactId: string): void {
    if (this.expandedArtifactIds.has(artifactId)) {
      this.expandedArtifactIds.delete(artifactId);
    } else {
      this.expandedArtifactIds.add(artifactId);
    }
    this.cdr.markForCheck();
  }

  public getTrustedSrcdoc(artifact: SanitizedArtifactCardItem): SafeHtml | null {
    const html = artifact.preview.sandboxedHtmlDocument;
    if (!html) return null;
    const cacheKey = `${artifact.id}::${html}`;
    const cached = this.trustedSrcdocCache.get(cacheKey);
    if (cached) return cached;
    const trusted = this.sanitizer.bypassSecurityTrustHtml(html);
    this.trustedSrcdocCache.set(cacheKey, trusted);
    return trusted;
  }

  // ─── Visual Media Carousel ────────────────────────────────────────────────

  public goToSlide(index: number): void {
    if (this.model.visualMedia.length === 0) return;
    const nextIdx = ClampSlideIndex(index, this.model.visualMedia.length);
    this.activeSlideIndex = nextIdx;
    const item = this.model.visualMedia[nextIdx];
    this.carouselAnnouncement = item
      ? `Slide ${nextIdx + 1} of ${this.model.visualMedia.length}: ${item.altText}`
      : '';
    this.cdr.markForCheck();
  }

  public prevSlide(): void {
    if (this.model.visualMedia.length <= 1) return;
    const nextIdx = StepCarouselIndex(this.activeSlideIndex, -1, this.model.visualMedia.length, true);
    this.goToSlide(nextIdx);
  }

  public nextSlide(): void {
    if (this.model.visualMedia.length <= 1) return;
    const nextIdx = StepCarouselIndex(this.activeSlideIndex, 1, this.model.visualMedia.length, true);
    this.goToSlide(nextIdx);
  }

  public onCarouselKeydown(event: KeyboardEvent): void {
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.tagName === 'VIDEO' ||
        target.tagName === 'AUDIO' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT')
    ) {
      return;
    }
    const action = ResolveCarouselKeyboardAction(event.key);
    if (action === 'none' || this.model.visualMedia.length <= 1) {
      return;
    }
    event.preventDefault();
    if (action === 'prev') {
      this.prevSlide();
    } else if (action === 'next') {
      this.nextSlide();
    } else if (action === 'first') {
      this.goToSlide(0);
    } else if (action === 'last') {
      this.goToSlide(this.model.visualMedia.length - 1);
    }
  }

  // ─── Audio Carousel / Track Switcher ──────────────────────────────────────

  public selectAudioTrack(index: number): void {
    if (this.model.audioTracks.length === 0) return;
    const nextIdx = ClampSlideIndex(index, this.model.audioTracks.length);
    this.activeAudioIndex = nextIdx;
    const track = this.model.audioTracks[nextIdx];
    this.audioAnnouncement = track
      ? `Audio track ${nextIdx + 1} of ${this.model.audioTracks.length}: ${track.title}`
      : '';
    this.cdr.markForCheck();
  }

  public prevAudioTrack(): void {
    if (this.model.audioTracks.length <= 1) return;
    const nextIdx = StepCarouselIndex(this.activeAudioIndex, -1, this.model.audioTracks.length, true);
    this.selectAudioTrack(nextIdx);
  }

  public nextAudioTrack(): void {
    if (this.model.audioTracks.length <= 1) return;
    const nextIdx = StepCarouselIndex(this.activeAudioIndex, 1, this.model.audioTracks.length, true);
    this.selectAudioTrack(nextIdx);
  }

  // ─── Lightbox Modal (Escape, ArrowLeft/ArrowRight, Focus Trap & Restore) ──

  public openLightbox(index: number): void {
    if (this.model.visualMedia.length === 0) return;
    this.captureTriggerFocus();
    this.fullPreviewArtifactId = null;
    this.lightboxIndex = ClampSlideIndex(index, this.model.visualMedia.length);
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
    if (this.lightboxIndex === null || this.model.visualMedia.length <= 1) return;
    this.lightboxIndex = StepCarouselIndex(this.lightboxIndex, -1, this.model.visualMedia.length, true);
    this.activeSlideIndex = this.lightboxIndex;
    this.cdr.markForCheck();
  }

  public nextLightboxItem(): void {
    if (this.lightboxIndex === null || this.model.visualMedia.length <= 1) return;
    this.lightboxIndex = StepCarouselIndex(this.lightboxIndex, 1, this.model.visualMedia.length, true);
    this.activeSlideIndex = this.lightboxIndex;
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

  // ─── Embedded MJ Artifact Full Preview Modal ──────────────────────────────

  public openArtifactFullPreview(artifactId: string): void {
    if (!this.model.artifacts.some((a) => a.id === artifactId)) return;
    this.captureTriggerFocus();
    this.lightboxIndex = null;
    this.fullPreviewArtifactId = artifactId;
    this.cdr.markForCheck();
    this.scheduleModalInitialFocus('artifact');
  }

  public closeArtifactFullPreview(): void {
    if (!this.fullPreviewArtifactId) return;
    this.fullPreviewArtifactId = null;
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
      this.closeArtifactFullPreview();
    }
  }

  // ─── Focus Trap & Restoration Helpers ─────────────────────────────────────

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
    if (this.fullPreviewArtifactId) {
      event.stopPropagation();
      this.closeArtifactFullPreview();
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
