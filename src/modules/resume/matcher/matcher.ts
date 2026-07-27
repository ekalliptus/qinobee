import type { ResumeDocument } from "@modules/resume/types";
import type { JobMatchResult } from "@modules/resume/matcher/types";
import {
  extractKeywords,
  normalizeTerm,
  resumeTerms,
} from "@modules/resume/matcher/normalize";

const GAP_LIMIT = 10;
const MIN_SUMMARY_LEN = 120;
const MIN_EXPERIENCE_BULLETS = 3;

/** Match a resume against a job description. Deterministic and pure. */
export function matchJob(
  resume: ResumeDocument,
  jobDescription: string,
): JobMatchResult {
  const jdKeywords = extractKeywords(jobDescription);
  const have = resumeTerms(resume);

  const matched = jdKeywords.filter((k) => have.has(k));
  const missing = jdKeywords.filter((k) => !have.has(k));
  const overall = jdKeywords.length
    ? Math.round((100 * matched.length) / jdKeywords.length)
    : 0;

  const matchedSet = new Set(matched);
  const relevantExperience = collectRelevant(resume, matchedSet);

  const gaps = missing.slice(0, GAP_LIMIT);
  const sectionsToImprove = deriveSections(resume, missing);

  return {
    overall,
    matched,
    missing,
    relevantExperience,
    gaps,
    sectionsToImprove,
  };
}

/** Titles/project names whose normalized tokens intersect matched keywords. */
function collectRelevant(
  resume: ResumeDocument,
  matched: Set<string>,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const consider = (label?: string) => {
    if (!label) return;
    const tokens = extractKeywords(label);
    if (!tokens.some((t) => matched.has(t))) return;
    if (seen.has(label)) return;
    seen.add(label);
    out.push(label);
  };

  for (const w of resume.workExperiences ?? []) consider(w.jobTitle);
  for (const p of resume.projects ?? []) consider(p.name);

  return out;
}

/** Heuristic: which sections to improve given missing keywords + resume shape. */
function deriveSections(
  resume: ResumeDocument,
  missing: string[],
): string[] {
  const out: string[] = [];

  if (missing.length > 0) {
    // Missing keywords absent from the skills section imply a skills gap.
    const skillTerms = new Set<string>();
    for (const g of resume.skillGroups ?? []) {
      for (const s of g.skills ?? []) skillTerms.add(normalizeTerm(s));
    }
    if (missing.some((m) => !skillTerms.has(m))) out.push("skills");
  }

  const summary = resume.professionalSummary ?? "";
  if (summary.trim().length < MIN_SUMMARY_LEN) out.push("summary");

  const totalBullets = (resume.workExperiences ?? []).reduce(
    (n, w) => n + (w.bullets?.length ?? 0),
    0,
  );
  if (totalBullets < MIN_EXPERIENCE_BULLETS) out.push("experience");

  return out;
}
