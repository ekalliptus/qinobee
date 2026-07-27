import type { ResumeDocument } from "@modules/resume/types";

/**
 * Explicit synonym map. Key = cleaned lowercase surface form, value = canonical.
 * Both abbreviation and expansion map to the SAME canonical string.
 * CRITICAL: "java" is intentionally absent so it never conflates with javascript.
 */
export const SYNONYMS: Readonly<Record<string, string>> = {
  js: "javascript",
  javascript: "javascript",
  ts: "typescript",
  typescript: "typescript",
  ui: "user interface",
  "user interface": "user interface",
  ux: "user experience",
  "user experience": "user experience",
  seo: "search engine optimization",
  "search engine optimization": "search engine optimization",
  qa: "quality assurance",
  "quality assurance": "quality assurance",
  ci: "continuous integration",
  "continuous integration": "continuous integration",
  cd: "continuous delivery",
  "continuous delivery": "continuous delivery",
  ml: "machine learning",
  "machine learning": "machine learning",
  ai: "artificial intelligence",
  "artificial intelligence": "artificial intelligence",
  api: "application programming interface",
  "application programming interface": "application programming interface",
  aws: "amazon web services",
  "amazon web services": "amazon web services",
  sql: "structured query language",
  "structured query language": "structured query language",
  css: "cascading style sheets",
  "cascading style sheets": "cascading style sheets",
  hr: "human resources",
  "human resources": "human resources",
  oop: "object oriented programming",
  "object oriented programming": "object oriented programming",
  nlp: "natural language processing",
  "natural language processing": "natural language processing",
};

/** Multi-word expansions detected before single-word splitting. Longest first. */
const MULTIWORD_PHRASES: readonly string[] = Object.keys(SYNONYMS)
  .filter((k) => k.includes(" "))
  .sort((a, b) => b.length - a.length);

const STOPWORDS: ReadonlySet<string> = new Set([
  "the", "and", "or", "with", "for", "to", "of", "in", "a", "an", "we",
  "need", "experience", "looking", "please", "is", "are", "be", "as", "on",
  "at", "by", "our", "you", "your", "will", "have", "who", "that", "this",
  "we're", "us", "role", "team", "work", "working",
]);

/** Clean: lowercase, trim, collapse whitespace, strip surrounding punctuation. */
function clean(term: string): string {
  return term
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
    .trim();
}

/** Normalize a term to its canonical form via the explicit synonym map. */
export function normalizeTerm(term: string): string {
  const cleaned = clean(term);
  return SYNONYMS[cleaned] ?? cleaned;
}

/**
 * Tokenize a JD into normalized canonical keyword phrases.
 * Detects known multi-word expansions before single-word splitting.
 * Drops stopwords. Deduped, order-stable.
 */
export function extractKeywords(text: string): string[] {
  let remaining = ` ${text.toLowerCase().replace(/\s+/g, " ")} `;
  const found: string[] = [];

  // Extract known multi-word phrases first, blanking them out of the text.
  for (const phrase of MULTIWORD_PHRASES) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(phrase)}(?![\\p{L}\\p{N}])`, "gu");
    if (re.test(remaining)) {
      found.push(SYNONYMS[phrase]!);
      remaining = remaining.replace(re, " ");
    }
  }

  // Then single tokens.
  for (const raw of remaining.split(/[^\p{L}\p{N}+#.]+/u)) {
    const canonical = normalizeTerm(raw);
    if (!canonical) continue;
    if (STOPWORDS.has(canonical)) continue;
    found.push(canonical);
  }

  return dedupe(found);
}

/** Collect normalized terms present in a resume (skills, titles, technologies, significant text). */
export function resumeTerms(resume: ResumeDocument): Set<string> {
  const out = new Set<string>();

  const addPhrase = (v?: string) => {
    if (!v) return;
    const canonical = normalizeTerm(v);
    if (canonical) out.add(canonical);
  };
  const addTokens = (v?: string) => {
    if (!v) return;
    for (const k of extractKeywords(v)) out.add(k);
  };

  for (const g of resume.skillGroups ?? []) {
    for (const s of g.skills ?? []) addPhrase(s);
  }
  for (const w of resume.workExperiences ?? []) {
    addTokens(w.jobTitle);
    for (const s of w.skillsUsed ?? []) addPhrase(s);
    for (const b of w.bullets ?? []) addTokens(b);
  }
  for (const p of resume.projects ?? []) {
    addTokens(p.name);
    for (const t of p.technologies ?? []) addPhrase(t);
    addTokens(p.description);
    for (const c of (p as { contributions?: string[] }).contributions ?? []) addTokens(c);
  }
  addTokens(resume.professionalSummary);

  return out;
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const i of items) {
    if (seen.has(i)) continue;
    seen.add(i);
    out.push(i);
  }
  return out;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
