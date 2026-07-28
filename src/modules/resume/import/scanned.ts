/**
 * Pure heuristic to decide whether a PDF is likely a scanned/image-only
 * document (i.e. pdf.js extracted little to no selectable text), which means we
 * should fall back to in-browser OCR.
 */

/** Minimum non-whitespace characters we expect from a single text page. */
export const MIN_TEXT_PER_PAGE = 24;

/**
 * True when the extracted text is implausibly small for the page count.
 * Threshold scales with pages but caps at 5 so a mostly-image multi-page PDF
 * with a little cover text still triggers OCR.
 */
export function isLikelyScanned(text: string, pageCount: number): boolean {
  const dense = text.replace(/\s+/g, "").length;
  const pages = Math.max(1, Math.min(pageCount, 5));
  return dense < MIN_TEXT_PER_PAGE * pages;
}
