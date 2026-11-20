import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  COMMUNITY_ATTACHMENT_MAX_CAPTION_LENGTH,
  type CommunityAttachmentEntryType,
} from '@mj-biz-apps/community-core';
import {
  CreateDraftArtifactAttachment,
  CreateDraftFileAttachment,
  FilterAccessibleArtifacts,
  MoveDraftAttachment,
  PICKER_ACCEPTED_FILE_EXTENSIONS,
  PICKER_HELPER_LIBRARY_COPY,
  ReadBrowserFilePreviewUrl,
  RemoveDraftAttachment,
  ToggleDraftAttachmentFeatureInLibrary,
  UpdateDraftArtifactPinnedVersion,
  UpdateDraftAttachmentCaption,
  ValidateDraftAttachmentBatch,
  type AccessibleArtifactCatalogItem,
  type DraftCommunityAttachment,
} from './community-attachment-picker.ts';

let nextPickerInstanceId = 0;

/**
 * Standalone OnPush attachment picker for post and reply composers.
 * Supports multi-file media/document upload (button + drag-and-drop), searchable MJ Artifact
 * embedding with optional version pinning, editable captions, up/down sequence reordering,
 * and per-attachment "Feature in Space Library" toggles.
 */
@Component({
  standalone: true,
  selector: 'mjc-attachment-picker',
  imports: [CommonModule, FormsModule],
  templateUrl: './community-attachment-picker.component.html',
  styleUrl: './community-attachment-picker.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityAttachmentPickerComponent {
  private readonly cdr = inject(ChangeDetectorRef);
  public readonly instanceId = ++nextPickerInstanceId;
  public readonly acceptedFileExtensions = PICKER_ACCEPTED_FILE_EXTENSIONS;
  public readonly helperLibraryCopy = PICKER_HELPER_LIBRARY_COPY;
  public readonly maxCaptionLength = COMMUNITY_ATTACHMENT_MAX_CAPTION_LENGTH;

  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  @Input() public drafts: ReadonlyArray<DraftCommunityAttachment> = [];
  @Input() public accessibleArtifacts: ReadonlyArray<AccessibleArtifactCatalogItem> = [];
  @Input() public entryType: CommunityAttachmentEntryType = 'post';
  @Input() public compact = false;
  @Input() public disabled = false;
  @Input() public pickerLabel = 'Attachments & MJ Artifacts';

  @Output() public readonly draftsChange = new EventEmitter<DraftCommunityAttachment[]>();
  @Output() public readonly validationError = new EventEmitter<string | null>();

  public isDragOver = false;
  public isArtifactPopoverOpen = false;
  public artifactSearchQuery = '';
  public localError: string | null = null;

  public get filteredArtifacts(): AccessibleArtifactCatalogItem[] {
    return FilterAccessibleArtifacts(this.accessibleArtifacts, this.artifactSearchQuery);
  }

  public displayTitle(draft: DraftCommunityAttachment): string {
    return draft.kind === 'artifact' ? draft.artifactName : draft.fileName;
  }

  public triggerFilePicker(): void {
    if (this.disabled) return;
    this.fileInput?.nativeElement.click();
  }

  public toggleArtifactPopover(): void {
    if (this.disabled) return;
    this.isArtifactPopoverOpen = !this.isArtifactPopoverOpen;
    this.cdr.markForCheck();
  }

  public closeArtifactPopover(): void {
    this.isArtifactPopoverOpen = false;
    this.cdr.markForCheck();
  }

  public onDragOver(event: DragEvent): void {
    if (this.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    if (!this.isDragOver) {
      this.isDragOver = true;
      this.cdr.markForCheck();
    }
  }

  public onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.isDragOver) {
      this.isDragOver = false;
      this.cdr.markForCheck();
    }
  }

  public async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    if (this.disabled) return;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      await this.addBrowserFiles(files);
    }
    this.cdr.markForCheck();
  }

  public async onFileInputChange(event: Event): Promise<void> {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    if (!input || !input.files || input.files.length === 0) {
      return;
    }
    const files = Array.from(input.files);
    input.value = '';
    await this.addBrowserFiles(files);
  }

  public async addBrowserFiles(fileList: FileList | ReadonlyArray<File>): Promise<void> {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const errors: string[] = [];
    const addedDrafts: DraftCommunityAttachment[] = [];
    let nextSequence = this.drafts.length + 1;

    for (const file of files) {
      const prelim = CreateDraftFileAttachment({
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        url: `https://attachments.local/${encodeURIComponent(file.name)}`,
        entryType: this.entryType,
        sequence: nextSequence,
      });
      if (prelim.error || !prelim.draft) {
        errors.push(prelim.error ?? `Unable to attach "${file.name}".`);
        continue;
      }

      const previewUrl = await ReadBrowserFilePreviewUrl(file, prelim.draft.kind, prelim.draft.mimeType);
      const finalized = CreateDraftFileAttachment({
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        url: previewUrl,
        entryType: this.entryType,
        sequence: nextSequence,
      });
      if (finalized.error || !finalized.draft) {
        errors.push(finalized.error ?? `Unable to attach "${file.name}".`);
        continue;
      }

      addedDrafts.push(finalized.draft);
      nextSequence += 1;
    }

    if (addedDrafts.length > 0) {
      const batchCheck = ValidateDraftAttachmentBatch(this.drafts, addedDrafts);
      if (!batchCheck.valid) {
        errors.push(...batchCheck.errors);
      } else {
        this.draftsChange.emit([...this.drafts, ...addedDrafts]);
      }
    }

    this.setLocalError(errors.length > 0 ? errors.join(' ') : null);
    this.cdr.markForCheck();
  }

  public attachArtifact(artifact: AccessibleArtifactCatalogItem): void {
    if (this.disabled) return;
    const created = CreateDraftArtifactAttachment({
      artifact,
      entryType: this.entryType,
      sequence: this.drafts.length + 1,
    });
    if (created.error || !created.draft) {
      this.setLocalError(created.error ?? `Unable to attach artifact "${artifact.name}".`);
      this.cdr.markForCheck();
      return;
    }

    const batchCheck = ValidateDraftAttachmentBatch(this.drafts, [created.draft]);
    if (!batchCheck.valid) {
      this.setLocalError(batchCheck.errors.join(' '));
      this.cdr.markForCheck();
      return;
    }

    this.setLocalError(null);
    this.draftsChange.emit([...this.drafts, created.draft]);
    this.isArtifactPopoverOpen = false;
    this.artifactSearchQuery = '';
    this.cdr.markForCheck();
  }

  public moveDraft(draftId: string, direction: 'up' | 'down'): void {
    if (this.disabled) return;
    const next = MoveDraftAttachment(this.drafts, draftId, direction);
    this.draftsChange.emit(next);
    this.cdr.markForCheck();
  }

  public removeDraft(draftId: string): void {
    if (this.disabled) return;
    const next = RemoveDraftAttachment(this.drafts, draftId);
    this.setLocalError(null);
    this.draftsChange.emit(next);
    this.cdr.markForCheck();
  }

  public onCaptionChange(draftId: string, caption: string): void {
    const result = UpdateDraftAttachmentCaption(this.drafts, draftId, caption);
    this.setLocalError(result.error);
    this.draftsChange.emit(result.drafts);
    this.cdr.markForCheck();
  }

  public onToggleFeatureInLibrary(draftId: string, event: Event): void {
    const checked = event.target instanceof HTMLInputElement ? event.target.checked : undefined;
    const next = ToggleDraftAttachmentFeatureInLibrary(this.drafts, draftId, checked);
    this.draftsChange.emit(next);
    this.cdr.markForCheck();
  }

  public onPinnedVersionChange(draftId: string, selectedValue: string): void {
    const pinnedVersionId = selectedValue.trim() ? selectedValue.trim() : null;
    const next = UpdateDraftArtifactPinnedVersion(this.drafts, draftId, pinnedVersionId);
    this.draftsChange.emit(next);
    this.cdr.markForCheck();
  }

  private setLocalError(message: string | null): void {
    this.localError = message;
    this.validationError.emit(message);
  }
}
