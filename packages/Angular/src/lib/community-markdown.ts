/**
 * Safe, zero-dependency Markdown formatting helpers for Community Hub surfaces.
 *
 * Security model:
 * - Every character of raw input is HTML-escaped BEFORE any Markdown tag substitution.
 * - Only allowlisted structural tags (`<p>`, `<strong>`, `<em>`, `<code>`, `<ul>`, `<ol>`,
 *   `<li>`, `<blockquote>`, `<br>`) with static `mjc-md-*` class names are emitted.
 * - Zero raw HTML, script, style, event handler, or `javascript:` URLs can ever pass through.
 */

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInlineMarkdown(escapedText: string): string {
  // 1. Protect inline `code` spans first so asterisks inside code are not italicized.
  const codeSpans: string[] = [];
  let text = escapedText.replace(/`([^`\n]+)`/g, (_match, code: string) => {
    const token = `\u0000CODE${codeSpans.length}\u0000`;
    codeSpans.push(`<code class="mjc-md-code">${code}</code>`);
    return token;
  });

  // 2. Markdown links [label](https://...) -> safe label or external link (only http/https).
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, label: string, url: string) => {
    return `<a class="mjc-md-link" href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });

  // 3. Bold (**text** or __text__)
  text = text.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_\n]+?)__/g, '<strong>$1</strong>');

  // 4. Italic (*text*) — require non-space boundaries so `2 * 3` stays literal.
  text = text.replace(/(^|[\s(>])\*([^\s*](?:[^*\n]*?[^\s*])?)\*(?=$|[\s.,;:!?)]|<)/g, '$1<em>$2</em>');

  // 5. Restore protected inline code spans.
  text = text.replace(/\u0000CODE(\d+)\u0000/g, (_match, idxStr: string) => codeSpans[Number(idxStr)] ?? '');
  return text;
}

/**
 * Strips Markdown syntax into clean, readable plain text for compact card excerpts and list previews.
 */
export function StripMarkdownToPlainText(markdown: string | null | undefined): string {
  if (!markdown) return '';
  return markdown
    .replace(/\r\n/g, '\n')
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[^\n]*\n?|\n?```/g, ' '))
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/\*\*([^*]+?)\*\*/g, '$1')
    .replace(/__([^_]+?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/(^|[\s(])\*([^\s*](?:[^*]*?[^\s*])?)\*(?=$|[\s.,;:!?)])/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Converts Markdown into clean, XSS-safe semantic HTML for thread bodies, replies, Q&A answers,
 * AI summaries, and idea details. Uses `<p class="mjc-md-heading">` for Markdown headings so
 * embedding formatted posts inside cards or panels never disrupts page WCAG heading hierarchy.
 */
export function RenderSafeMarkdownHtml(markdown: string | null | undefined): string {
  if (!markdown || !markdown.trim()) {
    return '';
  }

  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: string[] = [];
  let paragraphLines: string[] = [];
  let ulItems: string[] = [];
  let olItems: string[] = [];
  let quoteLines: string[] = [];

  const flushParagraph = (): void => {
    if (paragraphLines.length === 0) return;
    const html = paragraphLines.map((line) => renderInlineMarkdown(escapeHtml(line))).join('<br>');
    blocks.push(`<p class="mjc-md-p">${html}</p>`);
    paragraphLines = [];
  };

  const flushUl = (): void => {
    if (ulItems.length === 0) return;
    const itemsHtml = ulItems.map((item) => `<li>${renderInlineMarkdown(escapeHtml(item))}</li>`).join('');
    blocks.push(`<ul class="mjc-md-list">${itemsHtml}</ul>`);
    ulItems = [];
  };

  const flushOl = (): void => {
    if (olItems.length === 0) return;
    const itemsHtml = olItems.map((item) => `<li>${renderInlineMarkdown(escapeHtml(item))}</li>`).join('');
    blocks.push(`<ol class="mjc-md-list mjc-md-list--ordered">${itemsHtml}</ol>`);
    olItems = [];
  };

  const flushQuote = (): void => {
    if (quoteLines.length === 0) return;
    const html = quoteLines.map((line) => renderInlineMarkdown(escapeHtml(line))).join('<br>');
    blocks.push(`<blockquote class="mjc-md-quote">${html}</blockquote>`);
    quoteLines = [];
  };

  const flushAll = (): void => {
    flushParagraph();
    flushUl();
    flushOl();
    flushQuote();
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushAll();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushAll();
      const level = headingMatch[1].length;
      const headingClass = level <= 2 ? 'mjc-md-heading mjc-md-heading--lg' : 'mjc-md-heading';
      blocks.push(`<p class="${headingClass}">${renderInlineMarkdown(escapeHtml(headingMatch[2].trim()))}</p>`);
      continue;
    }

    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushUl();
      flushOl();
      quoteLines.push(quoteMatch[1]);
      continue;
    }

    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      flushParagraph();
      flushOl();
      flushQuote();
      ulItems.push(ulMatch[1]);
      continue;
    }

    const olMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      flushUl();
      flushQuote();
      olItems.push(olMatch[1]);
      continue;
    }

    flushUl();
    flushOl();
    flushQuote();
    paragraphLines.push(trimmed);
  }

  flushAll();
  return blocks.join('');
}
