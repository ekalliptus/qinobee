/** Pure, deterministic page-break math for A4 resume rendering. */

/** Usable A4 content height in mm: 297mm page minus 16mm top+bottom margins. */
export const A4_CONTENT_MM = 297 - 2 * 16;

/** Convert millimetres to CSS pixels at the given DPI (default 96). */
export function mmToPx(mm: number, dpi = 96): number {
  return (mm * dpi) / 25.4;
}

/** Convert CSS pixels to millimetres at the given DPI (default 96). */
export function pxToMm(px: number, dpi = 96): number {
  return (px * 25.4) / dpi;
}

/** Full A4 page height in mm (used when counting rendered/printed pages). */
export const A4_PAGE_MM = 297;

/**
 * Number of A4 pages needed for the given content height (min 1).
 * `toleranceMm` absorbs sub-pixel/rounding slack so content that just fills a
 * page isn't counted as spilling onto the next one.
 */
export function estimatePages(
  contentHeightMm: number,
  usableMm = A4_CONTENT_MM,
  toleranceMm = 0,
): number {
  return Math.max(1, Math.ceil((contentHeightMm - toleranceMm) / usableMm));
}

/** Page count plus a flag for content overflowing a single page. */
export function pageBreakInfo(
  contentHeightMm: number,
  usableMm = A4_CONTENT_MM,
  toleranceMm = 0,
): { pages: number; overflow: boolean } {
  return {
    pages: estimatePages(contentHeightMm, usableMm, toleranceMm),
    overflow: contentHeightMm - toleranceMm > usableMm,
  };
}

/**
 * Y offsets (mm) where each A4 page boundary falls inside one continuous
 * content sheet. Returns [] for single-page content. Used by the preview to
 * draw page-break seams that scale with CSS zoom.
 */
export function pageBoundaryOffsetsMm(
  contentHeightMm: number,
  pageMm = A4_PAGE_MM,
): number[] {
  const offsets: number[] = [];
  for (let y = pageMm; y < contentHeightMm; y += pageMm) {
    offsets.push(y);
  }
  return offsets;
}
