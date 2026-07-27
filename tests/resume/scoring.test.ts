import { test, expect } from "bun:test";
import { scoreResume, topIssues } from "@modules/resume/scoring/engine";
import type { ResumeDocument } from "@modules/resume/types";

function blank(): ResumeDocument {
  return {
    id: "r1",
    userId: "u1",
    title: "CV",
    language: "en",
    templateId: "essential",
    status: "draft",
    personalInformation: {
      firstName: "",
      lastName: "",
      email: "",
      links: [],
    } as any,
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
  } as ResumeDocument;
}

function filled(): ResumeDocument {
  const r = blank();
  r.personalInformation = {
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    headline: "Senior Software Engineer",
    links: [{ type: "github", url: "https://github.com/ada" }],
  } as any;
  r.professionalSummary =
    "Senior software engineer with 8 years of experience building reliable, high-scale backend services. Led cross-functional teams, shipped resilient distributed systems, and mentored engineers. Passionate about clean architecture, performance, and measurable business impact.";
  r.workExperiences = [
    {
      jobTitle: "Senior Engineer",
      company: "Acme Corp",
      employmentType: "full-time",
      startMonth: 1,
      startYear: 2020,
      endMonth: 6,
      endYear: 2024,
      currentlyWorking: false,
      bullets: [
        "Led a team of 6 engineers to deliver a payments platform, reducing latency by 40%.",
        "Built an event-driven pipeline that increased throughput by 3x.",
        "Improved deployment reliability, cutting incidents by 25%.",
      ],
      skillsUsed: ["TypeScript", "Node.js", "PostgreSQL"],
    },
  ] as any;
  r.projects = [
    {
      name: "Open Scheduler",
      role: "Maintainer",
      description: "An open-source scheduling library.",
      technologies: ["TypeScript", "Bun"],
    },
  ] as any;
  r.educations = [
    {
      institution: "University of London",
      degree: "BSc Computer Science",
      currentlyStudying: false,
      coursework: [],
      achievements: [],
    },
  ] as any;
  r.skillGroups = [
    {
      category: "technical",
      label: "Technical",
      skills: ["TypeScript", "Node.js", "PostgreSQL", "Docker", "AWS", "Kafka"],
    },
  ] as any;
  return r;
}

test("blank resume scores low with critical completeness issues", () => {
  const s = scoreResume(blank());
  expect(s.overall).toBeLessThan(40);
  const completeness = s.categories.find((c) => c.id === "completeness")!;
  expect(completeness).toBeTruthy();
  expect(completeness.issues.some((i) => i.severity === "critical")).toBe(true);
});

test("filled resume scores higher than blank", () => {
  expect(scoreResume(filled()).overall).toBeGreaterThan(
    scoreResume(blank()).overall,
  );
});

test("overall is 0..100 and deterministic", () => {
  const a = scoreResume(filled());
  const b = scoreResume(filled());
  expect(a.overall).toBe(b.overall);
  expect(a.overall).toBeGreaterThanOrEqual(0);
  expect(a.overall).toBeLessThanOrEqual(100);
});

test("every category has id, label, score, severity summary, and issues array", () => {
  const s = scoreResume(filled());
  for (const c of s.categories) {
    expect(typeof c.id).toBe("string");
    expect(typeof c.label).toBe("string");
    expect(c.score).toBeGreaterThanOrEqual(0);
    expect(c.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(c.issues)).toBe(true);
  }
});

test("score includes a disclaimer", () => {
  expect(scoreResume(filled()).disclaimer).toMatch(/guarantee/i);
});

test("all seven categories are present", () => {
  const s = scoreResume(filled());
  const ids = s.categories.map((c) => c.id as string).sort();
  expect(ids).toEqual(
    [
      "completeness",
      "content",
      "formatting",
      "impact",
      "keywords",
      "readability",
      "structure",
    ].sort(),
  );
});

test("topIssues returns most severe issues first, bounded by n", () => {
  const s = scoreResume(blank());
  const top = topIssues(s, 3);
  expect(top.length).toBeLessThanOrEqual(3);
  expect(top.length).toBeGreaterThan(0);
  expect(top[0]!.severity).toBe("critical");
});
