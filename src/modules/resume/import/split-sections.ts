export interface ParsedExperienceBlock {
  jobTitle?: string;
  company?: string;
  startYear?: number;
  endYear?: number;
  currentlyWorking?: boolean;
  bullets: string[];
}

export interface ParsedEducationBlock {
  institution?: string;
  degree?: string;
  fieldOfStudy?: string;
  startYear?: number;
  endYear?: number;
}

const BULLET_RE = /^\s*[-•*·]\s+/;
// Consume an optional leading month name (e.g. "Jan ") around each year so it does not leak into the header text.
const YEAR_RANGE_RE =
  /\(?\s*(?:[A-Za-z]{3,9}\.?\s+)?((?:19|20)\d{2})\s*[-–—]\s*(?:[A-Za-z]{3,9}\.?\s+)?((?:19|20)\d{2}|present|current|sekarang)\s*\)?/i;
// Education "detail" lines (GPA/IPK/etc.) must never start a new entry.
const DETAIL_RE = /^(gpa|ipk|grade|score)\b/i;

function stripYears(line: string): { clean: string; startYear?: number; endYear?: number; current?: boolean } {
  const m = line.match(YEAR_RANGE_RE);
  if (!m) return { clean: line.trim() };
  const startYear = Number(m[1]);
  const endRaw = m[2]!.toLowerCase();
  const current = /present|current|sekarang/.test(endRaw);
  const endYear = current ? undefined : Number(m[2]);
  const clean = line
    .replace(m[0], "")
    .replace(/[()]/g, "")
    .trim()
    .replace(/[,\-–—·|]\s*$/, "")
    .trim();
  return { clean, startYear, endYear, current };
}

// Group lines into blocks: a new block starts at a non-bullet header line; bullets attach to the current header.
// `isDetail` (education only) treats matching lines as attach-only so they never start a fresh entry.
function groupBlocks(text: string, isDetail?: (line: string) => boolean): { header: string; bullets: string[] }[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const blocks: { header: string; bullets: string[] }[] = [];
  let cur: { header: string; bullets: string[] } | null = null;
  for (const line of lines) {
    if (BULLET_RE.test(line) || (isDetail && isDetail(line))) {
      if (cur) cur.bullets.push(line.replace(BULLET_RE, "").trim());
      // headerless bullet/detail -> ignored
    } else {
      if (cur) blocks.push(cur);
      cur = { header: line, bullets: [] };
    }
  }
  if (cur) blocks.push(cur);
  return blocks;
}

export function splitExperienceBlocks(text: string): ParsedExperienceBlock[] {
  if (!text || !text.trim()) return [];
  return groupBlocks(text)
    .map((b) => {
      const { clean, startYear, endYear, current } = stripYears(b.header);
      const parts = clean
        .split(/\s+(?:at|@)\s+|,\s*|\s+[·|]\s+|\s+[-–—]\s+/i)
        .map((p) => p.trim())
        .filter(Boolean);
      const block: ParsedExperienceBlock = { bullets: b.bullets };
      if (parts[0]) block.jobTitle = parts[0];
      if (parts[1]) block.company = parts[1];
      if (startYear) block.startYear = startYear;
      if (endYear) block.endYear = endYear;
      if (current) block.currentlyWorking = true;
      return block;
    })
    .filter((b) => b.jobTitle || b.company);
}

export function splitEducationBlocks(text: string): ParsedEducationBlock[] {
  if (!text || !text.trim()) return [];
  return groupBlocks(text, (line) => DETAIL_RE.test(line))
    .map((b) => {
      const { clean, startYear, endYear } = stripYears(b.header);
      const parts = clean
        .split(/,\s*/)
        .map((p) => p.trim())
        .filter(Boolean);
      const block: ParsedEducationBlock = {};
      if (parts.length >= 2) {
        block.degree = parts[0];
        block.institution = parts.slice(1).join(", ");
      } else if (parts.length === 1) {
        block.institution = parts[0];
      }
      if (startYear) block.startYear = startYear;
      if (endYear) block.endYear = endYear;
      return block;
    })
    .filter((b) => b.institution && !DETAIL_RE.test(b.institution));
}
