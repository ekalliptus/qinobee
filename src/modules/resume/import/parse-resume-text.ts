import { httpUrl } from "@lib/validation/primitives";

export interface ParsedResume {
  firstName?: string;
  lastName?: string;
  headline?: string;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  links: Array<{ type: string; url: string }>;
  professionalSummary?: string;
  skills: string[];
  experienceText?: string;
  educationText?: string;
  rawSections: Record<string, string>;
  warnings: string[];
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_RE = /\+?\(?\d[\d\s()-]{5,}\d/;
const URL_RE = /https?:\/\/[^\s|]+/gi;
// Bare known hosts without scheme (so linkedin.com/... / github.com/... are captured).
const BARE_HOST_RE =
  /(?<![/@.\w])((?:www\.)?(?:linkedin\.com|github\.com|behance\.net|dribbble\.com)\/[^\s|]+)/gi;

// A line "City, Country" or "City, ST" commonly appears in the contact block.
const LOCATION_RE = /^\s*([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3})\s*,\s*([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,2})\s*$/;

// Canonical section keys produced by the heading matcher.
type SectionKey =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "awards"
  | "languages"
  | "volunteer"
  | "organizations";

// Heading synonyms → canonical section key. Keys are matched after normalization
// (lowercased, trailing colon/parenthetical removed). Extend freely.
const HEADING_EXACT: Record<string, SectionKey> = {
  summary: "summary",
  profile: "summary",
  "professional summary": "summary",
  summaryofqualifications: "summary",
  qualifications: "summary",
  about: "summary",
  "about me": "summary",
  objective: "summary",
  "career objective": "summary",
  "professional profile": "summary",

  experience: "experience",
  "work experience": "experience",
  "professional experience": "experience",
  employment: "experience",
  "employment history": "experience",
  "work history": "experience",
  career: "experience",
  "career history": "experience",
  "professional background": "experience",
  "work background": "experience",
  "relevant experience": "experience",
  "relevant work experience": "experience",
  "work": "experience",
  experienceandachievements: "experience",

  education: "education",
  "academic background": "education",
  "academic history": "education",
  "education and training": "education",
  "educational background": "education",
  academics: "education",

  skills: "skills",
  "technical skills": "skills",
  "skills and abilities": "skills",
  "skills & abilities": "skills",
  "skills and expertise": "skills",
  "skills & expertise": "skills",
  "core skills": "skills",
  "core competencies": "skills",
  competencies: "skills",
  "key skills": "skills",
  "areas of expertise": "skills",
  "technical competencies": "skills",
  "skills summary": "skills",
  expertise: "skills",

  projects: "projects",
  "personal projects": "projects",
  "key projects": "projects",
  "selected projects": "projects",
  "notable projects": "projects",
  portfolio: "projects",

  certifications: "certifications",
  certification: "certifications",
  licenses: "certifications",
  "licenses and certifications": "certifications",
  "licenses & certifications": "certifications",

  awards: "awards",
  honors: "awards",
  "awards and honors": "awards",
  "awards & honors": "awards",
  achievements: "awards",

  languages: "languages",
  "language skills": "languages",
  "languages known": "languages",

  volunteer: "volunteer",
  "volunteer experience": "volunteer",
  "volunteer work": "volunteer",
  "community service": "volunteer",

  organization: "organizations",
  organizations: "organizations",
  organisation: "organizations",
  organisations: "organizations",
  "leadership experience": "organizations",
  activities: "organizations",
  "extracurricular activities": "organizations",
};

// Prefix substrings (after normalization) that also indicate a section heading,
// for headings like "Experience — Recent roles" or "Skills: Frontend, Backend".
const HEADING_PREFIXES: Array<[string, SectionKey]> = [
  ["experience", "experience"],
  ["employment", "experience"],
  ["work history", "experience"],
  ["education", "education"],
  ["academic", "education"],
  ["skills", "skills"],
  ["technical skills", "skills"],
  ["core competencies", "skills"],
  ["projects", "projects"],
  ["certifications", "certifications"],
  ["licenses", "certifications"],
  ["awards", "awards"],
  ["honors", "awards"],
  ["languages", "languages"],
  ["volunteer", "volunteer"],
  ["organizations", "organizations"],
  ["organisations", "organizations"],
];

const SUMMARY_CAP = 3000;
const SKILL_TOKEN_MAX = 60;
const SKILL_CAP = 50;

function normalizeLine(line: string): string {
  // Lowercase, strip a trailing colon, strip parenthetical/bracketed suffixes,
  // strip leading bullets/numbering, collapse internal whitespace.
  return line
    .trim()
    .replace(/[:\u200b]+$/, "")
    .replace(/\s*[-–—|·]+\s*$/, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/^\s*(?:[-•*··]|\d+[.)])\s*/, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function matchHeading(line: string): SectionKey | undefined {
  const norm = normalizeLine(line);
  if (!norm) return undefined;
  // Heading must be short (single line, few words) — avoid matching body lines.
  const words = norm.split(" ");
  if (words.length === 0 || words.length > 5) return undefined;

  // Exact synonym match.
  const compact = norm.replace(/[^a-z &]/g, "").replace(/\s+/g, " ").trim();
  if (HEADING_EXACT[compact]) return HEADING_EXACT[compact];
  const noSpace = compact.replace(/\s+/g, "");
  if (HEADING_EXACT[noSpace]) return HEADING_EXACT[noSpace];

  // Prefix match (e.g. "Experience — Recent roles").
  for (const [prefix, key] of HEADING_PREFIXES) {
    if (compact.startsWith(prefix) || noSpace.startsWith(prefix.replace(/\s+/g, ""))) {
      // Only treat as heading if the remainder is short or a separator.
      const rest = compact.slice(prefix.length).replace(/^[\s\-–—|·:]+/, "").trim();
      if (rest.length === 0 || rest.split(" ").length <= 3) return key;
    }
  }
  return undefined;
}

function looksLikeName(line: string): boolean {
  if (EMAIL_RE.test(line) || PHONE_RE.test(line)) return false;
  if (/https?:\/\//i.test(line) || BARE_HOST_RE.test(line)) return false;
  if (matchHeading(line)) return false;
  if (LOCATION_RE.test(line)) return false;
  const words = line.trim().split(/\s+/);
  if (words.length < 1 || words.length > 4) return false;
  // Mostly letters (allow hyphen, apostrophe, dot).
  return words.every((w) => /^[A-Za-z][A-Za-z.'-]*$/.test(w));
}

function looksLikeHeadline(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (EMAIL_RE.test(line) || PHONE_RE.test(line)) return false;
  if (/https?:\/\//i.test(line) || BARE_HOST_RE.test(line)) return false;
  if (matchHeading(line)) return false;
  if (LOCATION_RE.test(line)) return false;
  return /[A-Za-z]/.test(t);
}

function classifyLink(url: string): string {
  let host = "";
  try {
    host = new URL(url).host.toLowerCase().replace(/^www\./, "");
  } catch {
    return "website";
  }
  if (host === "linkedin.com") return "linkedin";
  if (host === "github.com") return "github";
  if (host === "behance.net") return "behance";
  if (host === "dribbble.com") return "dribbble";
  return "website";
}

function extractLinks(text: string): Array<{ type: string; url: string }> {
  const found: string[] = [];
  for (const m of text.matchAll(URL_RE)) found.push(m[0]);
  for (const m of text.matchAll(BARE_HOST_RE))
    found.push(`https://${m[1].replace(/^www\./, "")}`);

  const out: Array<{ type: string; url: string }> = [];
  const seen = new Set<string>();
  for (let raw of found) {
    raw = raw.replace(/[).,;]+$/, "");
    const parsed = httpUrl.safeParse(raw);
    if (!parsed.success) continue;
    const url = parsed.data;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ type: classifyLink(url), url });
  }
  return out;
}

function extractSkills(body: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (let tokenRaw of body.split(/[,\n|•·]+/)) {
    tokenRaw = tokenRaw.replace(/^[^A-Za-z0-9]+/, "").replace(/[:\s]+$/, "");
    const token = tokenRaw.trim();
    if (!token || token.length > SKILL_TOKEN_MAX) continue;
    // Skip category labels like "Languages:" or "Tools:" inside a skills block.
    if (/^[A-Za-z ]{1,20}:$/.test(token)) continue;
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(token);
    if (out.length >= SKILL_CAP) break;
  }
  return out;
}

export function parseResumeText(text: string): ParsedResume {
  const result: ParsedResume = {
    links: [],
    skills: [],
    rawSections: {},
    warnings: [],
  };

  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized) {
    result.warnings.push("empty input");
    return result;
  }

  const rawLines = normalized.split("\n");
  // Collapse 3+ blank lines but keep single blanks as section separators.
  const lines = rawLines.map((l) => l.replace(/\s+$/, ""));

  // Contact fields (scan whole text).
  const emailMatch = normalized.match(EMAIL_RE);
  if (emailMatch) result.email = emailMatch[0];
  else result.warnings.push("Could not detect email");

  const phoneMatch = normalized.match(PHONE_RE);
  if (phoneMatch) result.phone = phoneMatch[0].trim();

  result.links = extractLinks(normalized);

  // Name + headline + location from the top non-empty lines (before first heading).
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  const firstLine = nonEmpty[0];

  if (firstLine && looksLikeName(firstLine)) {
    const words = firstLine.trim().split(/\s+/);
    result.firstName = words[0];
    if (words.length > 1) result.lastName = words.slice(1).join(" ");
  } else {
    result.warnings.push("Could not detect name");
  }

  // Headline = first line after the name (before any heading) that looks like one.
  // Location = a "City, Country/State" anywhere in the contact block (may share a
  // line with email/phone, e.g. "email | Berlin, Germany").
  const startIdx = firstLine && looksLikeName(firstLine) ? 1 : 0;
  for (let i = startIdx; i < nonEmpty.length; i++) {
    const line = nonEmpty[i];
    if (matchHeading(line)) break; // contact block ends at first heading
    if (!result.headline && looksLikeHeadline(line)) {
      result.headline = line.trim();
    }
    if (!result.city) {
      // Try a standalone location line first.
      let m = line.match(LOCATION_RE);
      if (!m) {
        // Try to find "City, Country" as a substring (after a separator).
        const segs = line.split(/[|•·\t]/);
        for (const seg of segs) {
          const sm = seg.match(LOCATION_RE);
          if (sm) { m = sm; break; }
        }
      }
      if (m) {
        result.city = m[1]!.trim();
        result.country = m[2]!.trim();
      }
    }
  }

  // Sections: walk lines, split on headings. Repeated headings with the same
  // canonical key (e.g. "Experience" + "Employment History") are APPENDED, so a
  // CV split across multiple same-key blocks isn't truncated.
  let currentKey: SectionKey | undefined;
  let buffer: string[] = [];
  const flush = () => {
    if (currentKey) {
      const body = buffer.join("\n").trim();
      if (body) {
        const prev = result.rawSections[currentKey];
        result.rawSections[currentKey] = prev ? `${prev}\n\n${body}` : body;
      }
    }
    buffer = [];
  };
  for (const line of lines) {
    const heading = matchHeading(line);
    if (heading) {
      flush();
      currentKey = heading;
    } else if (currentKey) {
      buffer.push(line);
    }
  }
  flush();

  const summary = result.rawSections.summary;
  if (summary) result.professionalSummary = summary.slice(0, SUMMARY_CAP);
  if (result.rawSections.experience)
    result.experienceText = result.rawSections.experience;
  if (result.rawSections.education)
    result.educationText = result.rawSections.education;
  if (result.rawSections.skills)
    result.skills = extractSkills(result.rawSections.skills);

  return result;
}
