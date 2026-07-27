/**
 * Build a filesystem-safe PDF filename from a resume owner name + title.
 * Strips diacritics, drops any non-alphanumeric char, collapses separators,
 * and guarantees no path traversal (`/`, `\`, `..`). Empty input -> "resume".
 */
export function safeResumeFilename(name: string, title: string): string {
  const base = `${name} ${title}`
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // combining marks
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "resume"}.pdf`;
}
