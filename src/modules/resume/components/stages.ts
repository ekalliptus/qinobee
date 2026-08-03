import type { ResumeDocument } from "@modules/resume/types";
import { isSectionEmpty, isBlank } from "@modules/resume/utils/empty";

export type StageId =
  | "personal"
  | "professional"
  | "education"
  | "organization"
  | "other"
  | "review";

export type StageStatus = "Empty" | "Incomplete" | "Complete";

/** Section keys owned by each editable stage (Review owns none). */
const STAGE_SECTIONS: Record<Exclude<StageId, "review">, string[]> = {
  personal: ["personalInformation"],
  professional: [
    "professionalSummary",
    "workExperiences",
    "projects",
    "skillGroups",
  ],
  education: ["educations"],
  organization: ["organisations", "volunteerExperiences"],
  other: ["certifications", "awards", "languages", "customSections"],
};

export const STAGES: ReadonlyArray<{ id: StageId; label: string }> = [
  { id: "personal", label: "Personal" },
  { id: "professional", label: "Professional" },
  { id: "education", label: "Education" },
  { id: "organization", label: "Organization" },
  { id: "other", label: "Other" },
  { id: "review", label: "Review" },
];

export function stageSectionKeys(id: StageId): string[] {
  return id === "review" ? [] : STAGE_SECTIONS[id];
}

export function stageStatus(doc: ResumeDocument, id: StageId): StageStatus {
  if (id === "review") return "Complete";

  if (id === "personal") {
    const pi = doc.personalInformation;
    if (isBlank(pi.firstName) && isBlank(pi.email)) return "Empty";
    if (isBlank(pi.firstName) || isBlank(pi.email)) return "Incomplete";
    return "Complete";
  }

  const keys = stageSectionKeys(id);
  const allEmpty = keys.every((k) => isSectionEmpty(doc, k));
  return allEmpty ? "Empty" : "Complete";
}
