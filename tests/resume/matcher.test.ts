import { test, expect } from "bun:test";
import { normalizeTerm } from "@modules/resume/matcher/normalize";
import { matchJob } from "@modules/resume/matcher/matcher";
import type { ResumeDocument } from "@modules/resume/types";

function resumeWith(skills: string[], text = ""): ResumeDocument {
  return {
    id: "r1",
    userId: "u1",
    title: "CV",
    language: "en",
    templateId: "essential",
    status: "draft",
    personalInformation: {
      firstName: "A",
      lastName: "B",
      email: "a@b.com",
      links: [],
    } as any,
    professionalSummary: text,
    workExperiences: [],
    educations: [],
    projects: [],
    organisations: [],
    volunteerExperiences: [],
    certifications: [],
    awards: [],
    skillGroups: [{ id: "g", label: "Technical", skills }] as any,
    languages: [],
    customSections: [],
    sectionOrder: [],
    hiddenSections: [],
    templateSettings: {},
    revision: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  } as ResumeDocument;
}

test("normalizes synonyms to a common canonical form", () => {
  expect(normalizeTerm("JS")).toBe(normalizeTerm("JavaScript"));
  expect(normalizeTerm("UI")).toBe(normalizeTerm("User Interface"));
  expect(normalizeTerm("SEO")).toBe(normalizeTerm("Search Engine Optimization"));
  expect(normalizeTerm("QA")).toBe(normalizeTerm("Quality Assurance"));
});

test("does NOT conflate genuinely different skills", () => {
  expect(normalizeTerm("Java")).not.toBe(normalizeTerm("JavaScript"));
});

test("reports matched and missing keywords", () => {
  const r = resumeWith(["JavaScript", "SEO"]);
  const res = matchJob(r, "We need JS and QA experience.");
  expect(res.matched).toContain(normalizeTerm("JavaScript"));
  expect(res.missing).toContain(normalizeTerm("QA"));
  expect(res.overall).toBeGreaterThanOrEqual(0);
  expect(res.overall).toBeLessThanOrEqual(100);
});

test("overall match rises when resume covers more JD keywords", () => {
  const jd = "Looking for JavaScript, SEO and QA.";
  const low = matchJob(resumeWith(["JavaScript"]), jd).overall;
  const high = matchJob(resumeWith(["JavaScript", "SEO", "QA"]), jd).overall;
  expect(high).toBeGreaterThan(low);
});

test("deterministic", () => {
  const r = resumeWith(["JavaScript"]);
  expect(matchJob(r, "JS please").overall).toBe(
    matchJob(r, "JS please").overall,
  );
});
