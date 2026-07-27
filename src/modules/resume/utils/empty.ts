import type { ResumeDocument } from "@modules/resume/types";

export function isBlank(str: string | undefined | null): boolean {
  return !str || str.trim().length === 0;
}

export function countWords(str: string | undefined | null): number {
  if (isBlank(str)) return 0;
  return str!.trim().split(/\s+/).length;
}

const ACTION_VERBS = new Set([
  "led",
  "built",
  "designed",
  "improved",
  "created",
  "launched",
  "reduced",
  "increased",
  "developed",
  "implemented",
  "managed",
  "delivered",
  "drove",
  "owned",
  "shipped",
  "analysed",
  "analyzed",
  "optimised",
  "optimized",
  "automated",
  "coordinated",
  "mentored",
  "architected",
  "spearheaded",
  "streamlined",
  "engineered",
  "established",
  "migrated",
  "scaled",
  "accelerated",
]);

export function hasActionVerb(bullet: string | undefined | null): boolean {
  if (isBlank(bullet)) return false;
  const first = bullet!.trim().split(/\s+/)[0]!.toLowerCase().replace(/[^a-z]/g, "");
  return ACTION_VERBS.has(first);
}

export function hasNumber(str: string | undefined | null): boolean {
  if (isBlank(str)) return false;
  return /\d/.test(str!);
}

// Light heuristic; deliberately conservative to avoid false positives.
export function isPassiveVoiceish(str: string | undefined | null): boolean {
  if (isBlank(str)) return false;
  return /\b(was|were|been|be)\b\s+\w+ed\b/i.test(str!);
}

// A section is "empty" when it has no meaningful content.
export function isSectionEmpty(resume: ResumeDocument, key: string): boolean {
  switch (key) {
    case "personalInformation":
      return (
        isBlank(resume.personalInformation.firstName) &&
        isBlank(resume.personalInformation.email)
      );
    case "professionalSummary":
      return isBlank(resume.professionalSummary);
    case "workExperiences":
      return resume.workExperiences.length === 0;
    case "educations":
      return resume.educations.length === 0;
    case "projects":
      return resume.projects.length === 0;
    case "organisations":
      return resume.organisations.length === 0;
    case "volunteerExperiences":
      return resume.volunteerExperiences.length === 0;
    case "certifications":
      return resume.certifications.length === 0;
    case "awards":
      return resume.awards.length === 0;
    case "skillGroups":
      return resume.skillGroups.every((g) => g.skills.length === 0);
    case "languages":
      return resume.languages.length === 0;
    case "customSections":
      return resume.customSections.length === 0;
    default:
      return true;
  }
}

const ALL_SECTION_KEYS = [
  "professionalSummary",
  "workExperiences",
  "educations",
  "projects",
  "organisations",
  "volunteerExperiences",
  "certifications",
  "awards",
  "skillGroups",
  "languages",
  "customSections",
] as const;

// Non-hidden, non-empty section keys.
export function visibleSections(resume: ResumeDocument): string[] {
  const hidden = new Set(resume.hiddenSections);
  return ALL_SECTION_KEYS.filter(
    (k) => !hidden.has(k) && !isSectionEmpty(resume, k),
  );
}

export function allSkills(resume: ResumeDocument): string[] {
  const fromGroups = resume.skillGroups.flatMap((g) => g.skills);
  const fromExp = resume.workExperiences.flatMap((w) => w.skillsUsed);
  return [...fromGroups, ...fromExp].map((s) => s.trim()).filter(Boolean);
}
