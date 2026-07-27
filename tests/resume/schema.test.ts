import { test, expect } from "bun:test";
import {
  resumeDocumentSchema,
  personalInformationSchema,
  workExperienceSchema,
  createResumeInputSchema,
} from "@modules/resume/schemas";

function minimalDoc() {
  return {
    id: "r1",
    userId: "u1",
    title: "My CV",
    language: "en",
    templateId: "essential",
    status: "draft",
    personalInformation: {
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@x.com",
      links: [],
    },
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
  };
}

test("minimal valid document parses", () => {
  expect(() => resumeDocumentSchema.parse(minimalDoc())).not.toThrow();
});

test("invalid email rejected", () => {
  const d = minimalDoc();
  d.personalInformation.email = "nope";
  expect(() => resumeDocumentSchema.parse(d)).toThrow();
});

test("bad link url rejected", () => {
  const d = minimalDoc();
  (d.personalInformation as any).links = [
    { type: "website", url: "javascript:alert(1)" },
  ];
  expect(() => resumeDocumentSchema.parse(d)).toThrow();
});

test("over-length summary rejected", () => {
  const d: any = minimalDoc();
  d.professionalSummary = "x".repeat(5000);
  expect(() => resumeDocumentSchema.parse(d)).toThrow();
});

test("templateSettings arrays get defaults", () => {
  const parsed = resumeDocumentSchema.parse(minimalDoc());
  expect(Array.isArray(parsed.hiddenSections)).toBe(true);
  expect(parsed.templateSettings).toBeDefined();
});

test("personalInformation defaults links to empty array", () => {
  const parsed = personalInformationSchema.parse({
    firstName: "Ada",
    email: "ada@x.com",
  });
  expect(Array.isArray(parsed.links)).toBe(true);
  expect(parsed.links.length).toBe(0);
});

test("createResumeInput requires title/language/templateId", () => {
  expect(
    createResumeInputSchema.safeParse({ title: "CV", language: "en" }).success,
  ).toBe(false);
  expect(
    createResumeInputSchema.safeParse({
      title: "CV",
      language: "en",
      templateId: "essential",
    }).success,
  ).toBe(true);
});

test("valid work experience parses", () => {
  const we = {
    jobTitle: "Engineer",
    company: "Acme",
    employmentType: "full-time",
    startMonth: 1,
    startYear: 2020,
  };
  expect(workExperienceSchema.safeParse(we).success).toBe(true);
});

test("work experience defaults bullets/skillsUsed", () => {
  const parsed = workExperienceSchema.parse({
    jobTitle: "Engineer",
    company: "Acme",
    employmentType: "full-time",
    startMonth: 1,
    startYear: 2020,
  });
  expect(Array.isArray(parsed.bullets)).toBe(true);
  expect(Array.isArray(parsed.skillsUsed)).toBe(true);
  expect(parsed.currentlyWorking).toBe(false);
});

test("work experience rejects out-of-range month", () => {
  const we = {
    jobTitle: "Engineer",
    company: "Acme",
    employmentType: "full-time",
    startMonth: 13,
    startYear: 2020,
  };
  expect(workExperienceSchema.safeParse(we).success).toBe(false);
});
