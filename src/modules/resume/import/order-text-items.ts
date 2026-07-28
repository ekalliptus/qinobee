/**
 * Pure, DOM-free reconstruction of reading order from pdf.js text-item
 * positions. pdf.js returns items in a page's internal order, which for
 * multi-column layouts (common in CVs) is jumbled. We regroup by y into lines,
 * detect a two-column split via a vertical gutter, and emit left column
 * top→bottom then right column top→bottom.
 *
 * Coordinates follow pdf.js: origin bottom-left, so a LARGER y is HIGHER on the
 * page. x grows rightward.
 */

export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
}

export interface OrderOptions {
  /** Page width in the same units as x/width. Inferred from items if omitted. */
  pageWidth?: number;
  /** Min gutter width (as a fraction of pageWidth) to treat page as 2-column. */
  columnGapRatio?: number;
  /** Max |y| difference for items to share a line. */
  lineTolerance?: number;
}

interface Line {
  y: number;
  minX: number;
  centerX: number;
  text: string;
}

function collapseSpaces(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Group non-empty items into lines by y, sorting each line left→right. */
function buildLines(items: TextItem[], lineTolerance: number): Line[] {
  // Sort by y descending (top of page first), x ascending as tiebreak.
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: Line[] = [];
  let current: TextItem[] = [];
  let currentY = Number.NaN;

  const flush = () => {
    if (current.length === 0) return;
    const byX = [...current].sort((a, b) => a.x - b.x);
    const text = collapseSpaces(byX.map((i) => i.str).join(" "));
    if (text) {
      const xs = byX.map((i) => i.x);
      const centers = byX.map((i) => i.x + i.width / 2);
      lines.push({
        y: currentY,
        minX: Math.min(...xs),
        centerX: centers.reduce((s, v) => s + v, 0) / centers.length,
        text,
      });
    }
    current = [];
  };

  for (const it of sorted) {
    if (current.length === 0 || Math.abs(it.y - currentY) <= lineTolerance) {
      current.push(it);
      // Anchor the line's y on its first (topmost) item.
      if (current.length === 1) currentY = it.y;
    } else {
      flush();
      current = [it];
      currentY = it.y;
    }
  }
  flush();
  return lines;
}

/**
 * Decide the gutter x for a two-column layout, or null for single column.
 * Heuristic: sort item x-centers, find the largest adjacent gap. If that gap is
 * wider than columnGapRatio * pageWidth AND both sides hold a meaningful share
 * of items (>= 20% each), the gutter sits at the gap midpoint.
 */
function detectGutter(
  centers: number[],
  pageWidth: number,
  columnGapRatio: number
): number | null {
  if (centers.length < 4) return null;
  const sorted = [...centers].sort((a, b) => a - b);
  let bestGap = 0;
  let bestIdx = -1;
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i] - sorted[i - 1];
    if (gap > bestGap) {
      bestGap = gap;
      bestIdx = i;
    }
  }
  if (bestIdx < 0) return null;
  if (bestGap <= columnGapRatio * pageWidth) return null;

  const gutter = (sorted[bestIdx] + sorted[bestIdx - 1]) / 2;
  const leftCount = centers.filter((c) => c < gutter).length;
  const rightShare = (centers.length - leftCount) / centers.length;
  const leftShare = leftCount / centers.length;
  if (leftShare < 0.2 || rightShare < 0.2) return null;
  return gutter;
}

/** Returns reading-ordered plain text for ONE page. */
export function orderPageText(items: TextItem[], opts?: OrderOptions): string {
  const cleaned = items.filter((it) => it.str.trim().length > 0);
  if (cleaned.length === 0) return "";

  const columnGapRatio = opts?.columnGapRatio ?? 0.15;
  const lineTolerance = opts?.lineTolerance ?? 3;
  const pageWidth =
    opts?.pageWidth ?? Math.max(...cleaned.map((i) => i.x + i.width), 1);

  const gutter = detectGutter(
    cleaned.map((i) => i.x + i.width / 2),
    pageWidth,
    columnGapRatio
  );

  let orderedLines: Line[];
  if (gutter === null) {
    orderedLines = buildLines(cleaned, lineTolerance);
  } else {
    const left = cleaned.filter((i) => i.x + i.width / 2 < gutter);
    const right = cleaned.filter((i) => i.x + i.width / 2 >= gutter);
    orderedLines = [
      ...buildLines(left, lineTolerance),
      ...buildLines(right, lineTolerance),
    ];
  }

  const text = orderedLines.map((l) => l.text).join("\n");
  // Collapse 3+ blank lines to 2, then trim.
  return text.replace(/\n{3,}/g, "\n\n").trim();
}
