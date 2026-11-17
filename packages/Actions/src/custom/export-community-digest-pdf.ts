import PDFDocument from 'pdfkit';

export interface CommunityDigestItem {
  forumSlug: string;
  title: string;
  authorDisplayName: string;
  summary: string;
}

export interface CommunityDigestPDFOptions {
  spaceName: string;
  generatedAt?: Date;
  /** Hard cap on included items, enforced regardless of the caller's own value. Default 100, max 100. */
  maxItems?: number;
}

export const COMMUNITY_DIGEST_PDF_MAX_ITEMS = 100;

/**
 * Renders a Community Digest as a real server-side PDF via `pdfkit` (never `window.print()`).
 * Enforces a hard `COMMUNITY_DIGEST_PDF_MAX_ITEMS` cap on included items — the caller's own
 * `maxItems` can only tighten that bound, never widen it — and returns the finished buffer, whose
 * first bytes are always the `%PDF-1.` magic header.
 */
export async function BuildCommunityDigestPDF(
  items: ReadonlyArray<CommunityDigestItem>,
  options: CommunityDigestPDFOptions,
): Promise<Buffer> {
  const maxItems = Math.min(options.maxItems ?? COMMUNITY_DIGEST_PDF_MAX_ITEMS, COMMUNITY_DIGEST_PDF_MAX_ITEMS);
  const boundedItems = items.slice(0, maxItems);
  const generatedAt = options.generatedAt ?? new Date();

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text(`${options.spaceName} — Community Digest`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated ${generatedAt.toISOString()}`, { align: 'center' });
    doc.moveDown(2);

    if (boundedItems.length === 0) {
      doc.fontSize(12).text('No activity to report for this digest period.');
    } else {
      for (const item of boundedItems) {
        doc.fontSize(14).text(item.title);
        doc.fontSize(10).text(`${item.forumSlug} · ${item.authorDisplayName}`);
        doc.fontSize(11).text(item.summary);
        doc.moveDown();
      }
    }

    doc.end();
  });
}
