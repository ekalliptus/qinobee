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

// Known section headings → normalized key.
const HEADINGS: Record<string, string> = {
  summary: "summary",
  profile: "summary",
  about: "summary",
  experience: "experience",
  "work experience": "experience",
  employment: "experience",
  "work history": "experience",
  education: "education",
  skills: "skills",
  "technical skills": "skills",
  projects: "projects",
  certifications: "certifications",
  awards: "awards",
  languages: "languages",
  volunteer: "volunteer",
  organization: "organizations",
  organizations: "organizations",
  organisation: "organizations",
  organisations: "organizations",
};

const SUMMARY_CAP = 3000;
const SKILL_TOKEN_MAX = 60;
const SKILL_CAP = 50;

function normalizeHeading(line: string): string | undefined {
  const key = line.trim().replace(/:\s*$/, "").toLowerCase();
  return HEADINGS[key];
}

function looksLikeName(line: string): boolean {
  if (EMAIL_RE.test(line) || PHONE_RE.test(line)) return false;
  if (/https?:\/\//i.test(line) || BARE_HOST_RE.test(line)) return false;
  if (normalizeHeading(line)) return false;
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
  if (normalizeHeading(line)) return false;
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
  for (const tokenRaw of body.split(/[,\n|•·]+/)) {
    const token = tokenRaw.replace(/^[\s\-*•·]+/, "").trim();
    if (!token || token.length > SKILL_TOKEN_MAX) continue;
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

  // Name + headline from the top non-empty lines (before first heading).
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  const firstLine = nonEmpty[0];

  if (firstLine && looksLikeName(firstLine)) {
    const words = firstLine.trim().split(/\s+/);
    result.firstName = words[0];
    if (words.length > 1) result.lastName = words.slice(1).join(" ");
    const next = nonEmpty[1];
    if (next && looksLikeHeadline(next)) result.headline = next.trim();
  } else {
    result.warnings.push("Could not detect name");
  }

  // Sections: walk lines, split on headings.
  let currentKey: string | undefined;
  let buffer: string[] = [];
  const flush = () => {
    if (currentKey) {
      const body = buffer.join("\n").trim();
      if (body) result.rawSections[currentKey] = body;
    }
    buffer = [];
  };
  for (const line of lines) {
    const heading = normalizeHeading(line);
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
