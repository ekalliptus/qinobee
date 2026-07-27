import type { ResumeDocument } from "@modules/resume/types";
import { isBlank } from "@modules/resume/utils/empty";

export type SectionKey =
  | "personalInformation"
  | "professionalSummary"
  | "workExperiences"
  | "educations"
  | "projects"
  | "skillGroups";

export const SECTIONS: ReadonlyArray<{ key: SectionKey; label: string }> = [
  { key: "personalInformation", label: "Personal Information" },
  { key: "professionalSummary", label: "Professional Summary" },
  { key: "workExperiences", label: "Work Experience" },
  { key: "educations", label: "Education" },
  { key: "projects", label: "Projects" },
  { key: "skillGroups", label: "Skills" },
];

export type SectionStatus = "Empty" | "Incomplete" | "Complete";

/** Simple heuristic status pill for the section nav. */
export function sectionStatus(doc: ResumeDocument, key: SectionKey): SectionStatus {
  switch (key) {
    case "personalInformation": {
      const pi = doc.personalInformation;
      if (isBlank(pi.firstName) && isBlank(pi.email)) return "Empty";
      if (isBlank(pi.firstName) || isBlank(pi.email)) return "Incomplete";
      return "Complete";
    }
    case "professionalSummary": {
      if (isBlank(doc.professionalSummary)) return "Empty";
      return doc.professionalSummary!.trim().length >= 200 ? "Complete" : "Incomplete";
    }
    case "workExperiences": {
      const list = doc.workExperiences;
      if (list.length === 0) return "Empty";
      return list.every((w) => !isBlank(w.jobTitle) && !isBlank(w.company)) ? "Complete" : "Incomplete";
    }
    case "educations": {
      const list = doc.educations;
      if (list.length === 0) return "Empty";
      return list.every((e) => !isBlank(e.institution)) ? "Complete" : "Incomplete";
    }
    case "projects": {
      const list = doc.projects;
      if (list.length === 0) return "Empty";
      return list.every((p) => !isBlank(p.name)) ? "Complete" : "Incomplete";
    }
    case "skillGroups": {
      const groups = doc.skillGroups;
      if (groups.length === 0 || groups.every((g) => g.skills.length === 0)) return "Empty";
      return "Complete";
    }
  }
}
