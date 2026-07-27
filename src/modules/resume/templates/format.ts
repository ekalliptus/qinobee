import type { Link } from "@modules/resume/types";

export type Language = "id" | "en";

const MONTHS: Record<Language, readonly string[]> = {
  en: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  id: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ],
};

const PRESENT: Record<Language, string> = { en: "Present", id: "Sekarang" };

function monthName(month: number | undefined, language: Language): string {
  if (!month || month < 1 || month > 12) return "";
  return MONTHS[language][month - 1] ?? "";
}

/** "Jan 2020", "2020", or "" when no year. */
function formatMonthYear(
  year: number | undefined,
  month: number | undefined,
  language: Language,
): string {
  if (!year) return "";
  const m = monthName(month, language);
  return m ? `${m} ${year}` : String(year);
}

/**
 * Locale-aware date range, e.g. "Jan 2020 – Present" (en) /
 * "Jan 2020 – Sekarang" (id). Returns "" when there is nothing to show.
 */
export function formatDateRange(
  startYear: number | undefined,
  startMonth: number | undefined,
  endYear: number | undefined,
  endMonth: number | undefined,
  current: boolean,
  language: Language,
): string {
  const start = formatMonthYear(startYear, startMonth, language);
  const end = current
    ? PRESENT[language]
    : formatMonthYear(endYear, endMonth, language);
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

/** Year-only range for education/organisations. */
export function formatYearRange(
  startYear: number | undefined,
  endYear: number | undefined,
  current: boolean,
  language: Language,
): string {
  const start = startYear ? String(startYear) : "";
  const end = current ? PRESENT[language] : endYear ? String(endYear) : "";
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

/** Free-text range for project startDate/endDate strings. */
export function formatTextRange(
  start: string | undefined,
  end: string | undefined,
): string {
  const s = start?.trim();
  const e = end?.trim();
  if (s && e) return `${s} – ${e}`;
  return s || e || "";
}

/** Human label for a link: explicit label, else derived from type/url. */
export function linkLabel(link: Link): string {
  if (link.label && link.label.trim()) return link.label.trim();
  if (link.type !== "other" && link.type !== "website") {
    return link.type.charAt(0).toUpperCase() + link.type.slice(1);
  }
  return link.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
