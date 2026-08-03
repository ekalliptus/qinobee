import { test, expect } from "bun:test";
import {
  STAGES,
  stageSectionKeys,
  stageStatus,
} from "@modules/resume/components/stages";
import type { ResumeDocument } from "@modules/resume/types";

function doc(overrides: Partial<ResumeDocument> = {}): ResumeDocument {
  return {
    id: "r1",
    userId: "u1",
    title: "CV",
    language: "en",
    templateId: "essential",
    status: "draft",
    personalInformation: { firstName: "", email: "", links: [] },
    professionalSummary: "",
    workExperiences: [],
    educations: [],
    projects: [],
    organisations: [],
    volunteerExperiences: [],
    certifications: [],
    awards: [],
    skillGroups: [],
    languages: [],
    customSections: [],
    sectionOrder: [],
    hiddenSections: [],
    templateSettings: {},
    revision: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as ResumeDocument;
}

test("there are exactly six stages in order", () => {
  expect(STAGES.map((s) => s.id)).toEqual([
    "personal",
    "professional",
    "education",
    "organization",
    "other",
    "review",
  ]);
});

test("professional stage groups summary/work/projects/skills", () => {
  expect(stageSectionKeys("professional")).toEqual([
    "professionalSummary",
    "workExperiences",
    "projects",
    "skillGroups",
  ]);
});

test("empty personal stage is Empty", () => {
  expect(stageStatus(doc(), "personal")).toBe("Empty");
});

test("personal stage with name+email is Complete", () => {
  const d = doc({ personalInformation: { firstName: "Ada", email: "a@x.com", links: [] } });
  expect(stageStatus(d, "personal")).toBe("Complete");
});

test("partial personal stage is Incomplete", () => {
  const d = doc({ personalInformation: { firstName: "Ada", email: "", links: [] } });
  expect(stageStatus(d, "personal")).toBe("Incomplete");
});

test("other stage empty when no cert/award/language/custom", () => {
  expect(stageStatus(doc(), "other")).toBe("Empty");
});

test("other stage complete once any of its sections has content", () => {
  const d = doc({ awards: [{ title: "Dean's List" }] as never });
  expect(stageStatus(d, "other")).toBe("Complete");
});

test("review stage always Complete (informational)", () => {
  expect(stageStatus(doc(), "review")).toBe("Complete");
});
