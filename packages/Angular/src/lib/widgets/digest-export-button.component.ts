import { Component, ChangeDetectionStrategy, ChangeDetectorRef, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Metadata } from '@memberjunction/core';
import { GraphQLActionClient, GraphQLDataProvider } from '@memberjunction/graphql-dataprovider';
import { GetActionOutputValue, ResolveCommunityActionIDWithRunView } from '../community-hub-wedge.ts';

/**
 * Exports the member's Community Digest as a real server-side PDF by invoking
 * `Community.ExportDigestPDF` through `GraphQLActionClient` and downloading the returned base64
 * PDF as a file — never `window.print()`.
 */
@Component({
  standalone: true,
  selector: 'mjc-digest-export-button',
  imports: [CommonModule],
  templateUrl: './digest-export-button.component.html',
  styleUrl: './digest-export-button.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DigestExportButtonComponent {
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() public spaceName = '';
  @Input() public allowedForumIDs: string[] = [];

  public isExporting = false;
  public errorMessage: string | null = null;

  public async Export(): Promise<void> {
    if (this.isExporting || !this.spaceName.trim()) {
      return;
    }
    this.isExporting = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    try {
      const provider = Metadata.Provider as GraphQLDataProvider;
      const actionClient = new GraphQLActionClient(provider);
      const actionId = await ResolveCommunityActionIDWithRunView('ExportDigestPDF');
      const result = await actionClient.RunAction(actionId, [
        { Name: 'SpaceName', Value: this.spaceName, Type: 'Input' },
        { Name: 'AllowedForumIDs', Value: this.allowedForumIDs.join(','), Type: 'Input' },
      ]);

      if (!result.Success) {
        this.errorMessage = result.Message ?? 'Digest export failed.';
        return;
      }

      const rawPdf = GetActionOutputValue(result, 'PDFBase64');
      const pdfBase64 = typeof rawPdf === 'string' ? rawPdf : null;
      if (pdfBase64) {
        this.downloadPdf(pdfBase64, `${this.spaceName}-community-digest.pdf`);
      } else {
        this.errorMessage = 'The action did not return a PDF.';
      }
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'Digest export failed.';
    } finally {
      this.isExporting = false;
      this.cdr.markForCheck();
    }
  }

  private downloadPdf(base64: string, fileName: string): void {
    const bytes = atob(base64);
    const buffer = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      buffer[i] = bytes.charCodeAt(i);
    }
    const blob = new Blob([buffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
