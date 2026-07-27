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

/** Number of A4 pages needed for the given content height (min 1). */
export function estimatePages(contentHeightMm: number, usableMm = A4_CONTENT_MM): number {
  return Math.max(1, Math.ceil(contentHeightMm / usableMm));
}

/** Page count plus a flag for content overflowing a single page. */
export function pageBreakInfo(
  contentHeightMm: number,
  usableMm = A4_CONTENT_MM,
): { pages: number; overflow: boolean } {
  return {
    pages: estimatePages(contentHeightMm, usableMm),
    overflow: contentHeightMm > usableMm,
  };
}
