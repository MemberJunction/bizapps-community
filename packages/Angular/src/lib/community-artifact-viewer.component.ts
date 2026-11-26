import { CommonModule, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  type SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { Metadata, RunView, type UserInfo } from '@memberjunction/core';
import {
  ArtifactsModule,
  type ArtifactVersionSavedEvent,
  type ArtifactViewerViewMode,
} from '@memberjunction/ng-artifacts';
import {
  CommunityArtifactViewerController,
  LoadBatchedArtifactsMetadata,
  MapCollaborationModeToViewerMode,
  type CommunityArtifactViewerMode,
  type CommunityArtifactViewerRequest,
  type CommunityArtifactViewerSnapshot,
  type CommunityArtifactViewerState,
  type ResolvedCommunityArtifactMetadata,
} from './community-artifact-viewer.ts';
import { ComputeNextTrapFocusTarget } from './community-hub-commons.ts';
import { CommunityHubPreferences } from './community-hub-preferences.ts';

let nextArtifactViewerInstanceId = 0;

/**
 * Theme-native in-place and slide-over wrapper around `@memberjunction/ng-artifacts`
 * (`<mj-artifact-viewer-panel>`) for `ForumArtifactPost` and `ForumInteractivePost` viewing.
 *
 * Key capabilities:
 * - Resolves `PinnedArtifactVersionID` -> `VersionNumber` via batched `RunView` queries
 *   (`ResultType: 'simple'`, `ExtraFilter: "ID IN (...)"`) and passes `VersionNumber` to
 *   `<mj-artifact-viewer-panel>`.
 * - Tracks monotonic request tokens so rapid card switching or mid-load Escape never renders
 *   stale responses under `ChangeDetectionStrategy.OnPush`.
 * - Provides Escape-to-close, backdrop click dismissal, focus trapping, and focus restoration
 *   in `drawer` mode.
 * - Renders a clean, Markdown-free graceful fallback when an artifact or pinned version is
 *   missing, revoked, or inaccessible.
 * - Persists maximized drawer preference via `UserInfoEngine.Instance` (zero `localStorage`).
 */
@Component({
  standalone: true,
  selector: 'mjc-community-artifact-viewer',
  imports: [CommonModule, ArtifactsModule],
  templateUrl: './community-artifact-viewer.component.html',
  styleUrl: './community-artifact-viewer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityArtifactViewerComponent implements OnChanges, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly doc = inject(DOCUMENT);
  private readonly preferences = new CommunityHubPreferences();
  private readonly controller = new CommunityArtifactViewerController(this.preferences);

  private readonly instanceId = ++nextArtifactViewerInstanceId;
  public readonly dialogTitleId = `mjc-artifact-viewer-title-${this.instanceId}`;

  @ViewChild('drawerDialog') private drawerDialog?: ElementRef<HTMLElement>;

  private lastTriggerElement: HTMLElement | null = null;
  private lastLoadSignature: string | null = null;
  private isDestroyed = false;

  @Input() public mode: CommunityArtifactViewerMode = 'drawer';
  @Input() public open = false;
  @Input() public request: CommunityArtifactViewerRequest | null = null;
  @Input() public preloadedMetadata: ResolvedCommunityArtifactMetadata | null = null;
  @Input() public currentUser: UserInfo | null = null;
  @Input() public environmentId = '';
  @Input() public showPanelHeader = true;
  @Input() public showPanelTabs = true;
  @Input() public showSaveToCollection = false;

  @Output() public readonly closed = new EventEmitter<void>();
  @Output() public readonly maximizedChanged = new EventEmitter<boolean>();
  @Output() public readonly versionSaved = new EventEmitter<ArtifactVersionSavedEvent>();
  @Output() public readonly stateChanged = new EventEmitter<CommunityArtifactViewerState>();

  public get snapshot(): CommunityArtifactViewerSnapshot {
    return this.controller.snapshot;
  }

  public get isMaximized(): boolean {
    return this.controller.isMaximized;
  }

  public get isVisible(): boolean {
    if (this.mode === 'inline') {
      return this.request !== null && this.snapshot.state !== 'closed';
    }
    return this.open && this.request !== null && this.snapshot.state !== 'closed';
  }

  public get effectiveCurrentUser(): UserInfo | null {
    return this.currentUser ?? Metadata.Provider?.CurrentUser ?? null;
  }

  public get canRenderLivePanel(): boolean {
    return Boolean(
      this.snapshot.state === 'ready' &&
        this.snapshot.resolved?.artifactId &&
        this.effectiveCurrentUser,
    );
  }

  public get canEditArtifact(): boolean {
    const mode = this.request?.collaborationMode;
    return mode === 'Edit' || mode === 'Suggest';
  }

  public get viewerViewMode(): ArtifactViewerViewMode | undefined {
    return MapCollaborationModeToViewerMode(this.request?.collaborationMode);
  }

  public get displayTitle(): string {
    return (
      this.snapshot.resolved?.artifactName ||
      this.request?.postTitle ||
      'Community Artifact'
    );
  }

  public get postKindBadgeLabel(): string {
    if (this.request?.postKind === 'interactive-post') {
      return this.request.experienceKind
        ? `Interactive · ${this.request.experienceKind}`
        : 'Interactive Artifact';
    }
    if (this.request?.artifactModality) {
      return this.request.artifactModality;
    }
    return this.snapshot.resolved?.artifactTypeName || 'MJ Artifact';
  }

  public get pinnedVersionBadgeLabel(): string | null {
    const verNum = this.snapshot.effectiveVersionNumber;
    if (typeof verNum === 'number' && Number.isFinite(verNum)) {
      return `Pinned v${verNum}`;
    }
    if (this.request?.pinnedArtifactVersionId) {
      return 'Pinned Version';
    }
    return null;
  }

  public ngOnChanges(changes: SimpleChanges): void {
    const modeChanged = Boolean(changes['mode']);
    const openChanged = Boolean(changes['open']);
    const requestChanged = Boolean(changes['request']);
    const preloadedChanged = Boolean(changes['preloadedMetadata']);

    if (!modeChanged && !openChanged && !requestChanged && !preloadedChanged) {
      return;
    }

    const shouldBeOpen = this.mode === 'inline' ? this.request !== null : this.open && this.request !== null;
    if (!shouldBeOpen) {
      this.lastLoadSignature = null;
      const wasOpen = this.snapshot.state !== 'closed';
      this.controller.close();
      if (wasOpen) {
        this.stateChanged.emit('closed');
        if (this.mode === 'drawer') {
          this.restoreTriggerFocus();
        }
      }
      this.cdr.markForCheck();
      return;
    }

    if (this.mode === 'drawer' && openChanged && this.open) {
      this.captureTriggerFocus();
    }

    const activeRequest = this.request;
    if (!activeRequest) {
      return;
    }

    const nextSignature = this.buildLoadSignature(activeRequest);
    if (nextSignature === this.lastLoadSignature) {
      return;
    }
    this.lastLoadSignature = nextSignature;

    // Defer async loading via microtask so synchronous ngOnChanges / ngOnInit never trigger NG0100.
    queueMicrotask(() => {
      if (this.isDestroyed) return;
      void this.loadRequest(activeRequest);
    });
  }

  private buildLoadSignature(request: CommunityArtifactViewerRequest): string {
    return [
      this.mode,
      this.open ? '1' : '0',
      request.postId,
      request.postKind,
      request.postTitle,
      request.artifactId ?? '',
      request.pinnedArtifactVersionId ?? '',
      request.pinnedVersionNumber ?? '',
      request.artifactModality ?? '',
      request.collaborationMode ?? '',
      request.experienceKind ?? '',
      request.fallbackSummaryMarkdown ?? '',
      this.preloadedMetadata?.artifactId ?? '',
      this.preloadedMetadata?.pinnedVersionId ?? '',
      this.preloadedMetadata?.pinnedVersionNumber ?? '',
    ].join('|');
  }

  public ngOnDestroy(): void {
    this.isDestroyed = true;
    this.lastLoadSignature = null;
    this.controller.close();
  }

  private async loadRequest(request: CommunityArtifactViewerRequest): Promise<void> {
    const provider = Metadata.Provider;
    const user = this.effectiveCurrentUser ?? undefined;
    const loader =
      provider && user
        ? async (req: CommunityArtifactViewerRequest) => {
            const rv = RunView.FromMetadataProvider(provider);
            return LoadBatchedArtifactsMetadata({
              runView: rv,
              artifactIds: [req.artifactId],
              pinnedVersionIds: req.pinnedArtifactVersionId ? [req.pinnedArtifactVersionId] : [],
              user,
            });
          }
        : null;

    const result = await this.controller.open(request, {
      preloaded: this.preloadedMetadata,
      loader,
    });
    if (this.isDestroyed) return;
    this.stateChanged.emit(result.state);
    this.cdr.markForCheck();

    if (this.mode === 'drawer' && this.open) {
      this.scheduleInitialDialogFocus();
    }
  }

  public close(): void {
    this.lastLoadSignature = null;
    if (this.snapshot.state === 'closed' && !this.open) {
      return;
    }
    this.controller.close();
    this.stateChanged.emit('closed');
    this.closed.emit();
    this.cdr.markForCheck();
    if (this.mode === 'drawer') {
      this.restoreTriggerFocus();
    }
  }

  public async toggleMaximized(): Promise<void> {
    const next = await this.controller.toggleMaximized();
    if (this.isDestroyed) return;
    this.maximizedChanged.emit(next);
    this.cdr.markForCheck();
  }

  public onPanelVersionSaved(event: ArtifactVersionSavedEvent): void {
    this.versionSaved.emit(event);
  }

  public onBackdropClick(): void {
    if (this.mode === 'drawer') {
      this.close();
    }
  }

  public onDrawerKeydown(event: KeyboardEvent): void {
    if (this.mode !== 'drawer') return;
    if (event.key === 'Tab') {
      this.trapTabFocus(event, this.drawerDialog?.nativeElement);
      return;
    }
    if (this.controller.handleKeydown(event.key)) {
      this.lastLoadSignature = null;
      event.preventDefault();
      event.stopPropagation();
      this.stateChanged.emit('closed');
      this.closed.emit();
      this.cdr.markForCheck();
      this.restoreTriggerFocus();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  public onDocumentEscape(event: Event): void {
    if (this.mode !== 'drawer' || !this.isVisible) {
      return;
    }
    if (this.controller.handleKeydown('Escape')) {
      this.lastLoadSignature = null;
      event.preventDefault();
      event.stopPropagation();
      this.stateChanged.emit('closed');
      this.closed.emit();
      this.cdr.markForCheck();
      this.restoreTriggerFocus();
    }
  }

  private captureTriggerFocus(): void {
    const active = this.doc?.activeElement;
    if (
      active instanceof HTMLElement &&
      active !== this.doc?.body &&
      active !== this.doc?.documentElement
    ) {
      this.lastTriggerElement = active;
    }
  }

  private restoreTriggerFocus(): void {
    const trigger = this.lastTriggerElement;
    this.lastTriggerElement = null;
    if (!trigger) return;
    setTimeout(() => {
      if (trigger.isConnected) {
        trigger.focus();
      }
    }, 0);
  }

  private scheduleInitialDialogFocus(): void {
    queueMicrotask(() => {
      const dialogEl = this.drawerDialog?.nativeElement;
      if (!dialogEl) return;
      const focusables = this.getFocusableElements(dialogEl);
      (focusables[0] ?? dialogEl).focus();
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
