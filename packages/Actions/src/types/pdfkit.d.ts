/**
 * Minimal ambient declaration for the subset of the `pdfkit` API this package uses.
 * `pdfkit` ships no official TypeScript types (no `@types/pdfkit`, no `types` field in its own
 * `package.json`), so this covers the real, used surface rather than casting through `any`.
 */
declare module 'pdfkit' {
  interface PDFDocumentOptions {
    margin?: number;
    margins?: { top: number; bottom: number; left: number; right: number };
    size?: string | [number, number];
    bufferPages?: boolean;
    info?: Record<string, string>;
  }

  interface PDFTextOptions {
    align?: 'left' | 'center' | 'right' | 'justify';
    width?: number;
    continued?: boolean;
  }

  class PDFDocument {
    constructor(options?: PDFDocumentOptions);
    fontSize(size: number): this;
    font(name: string): this;
    text(text: string, options?: PDFTextOptions): this;
    text(text: string, x: number, y: number, options?: PDFTextOptions): this;
    moveDown(lines?: number): this;
    addPage(options?: PDFDocumentOptions): this;
    end(): void;
    on(event: 'data', listener: (chunk: Buffer) => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
  }

  export default PDFDocument;
}
