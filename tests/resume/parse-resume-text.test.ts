import { test, expect } from "bun:test";
import { parseResumeText } from "@modules/resume/import/parse-resume-text";

const SAMPLE = `Ada Lovelace
Software Engineer
ada.lovelace@example.com | +44 20 7946 0958 | London, UK
linkedin.com/in/adalovelace  https://github.com/ada

Summary
Engineer with five years building reliable web platforms.

Skills
TypeScript, SQL, Testing, Astro | Node.js

Experience
Engineer, Analytical Co (2020 - Present)
- Led migration reducing load time by 40%

Education
BSc Computer Science, Uni (2016 - 2020)
`;

test("extracts email and phone", () => {
  const p = parseResumeText(SAMPLE);
  expect(p.email).toBe("ada.lovelace@example.com");
  expect(p.phone).toContain("20 7946 0958");
});

test("detects name + headline", () => {
  const p = parseResumeText(SAMPLE);
  expect(p.firstName).toBe("Ada");
  expect(p.lastName).toBe("Lovelace");
  expect(p.headline?.toLowerCase()).toContain("software engineer");
});

test("classifies links", () => {
  const p = parseResumeText(SAMPLE);
  const types = p.links.map((l) => l.type);
  expect(types).toContain("linkedin");
  expect(types).toContain("github");
  expect(p.links.some((l) => l.url.includes("github.com/ada"))).toBe(true);
  expect(p.links.some((l) => l.url.includes("linkedin.com/in/adalovelace"))).toBe(true);
});

test("summary + skills + section bodies", () => {
  const p = parseResumeText(SAMPLE);
  expect(p.professionalSummary?.toLowerCase()).toContain("reliable web platforms");
  expect(p.skills).toContain("TypeScript");
  expect(p.skills).toContain("Node.js");
  expect(p.experienceText?.toLowerCase()).toContain("analytical co");
  expect(p.educationText?.toLowerCase()).toContain("bsc computer science");
});

test("blank input → empty with warning, no fabrication", () => {
  const p = parseResumeText("   \n  \n");
  expect(p.email).toBeUndefined();
  expect(p.firstName).toBeUndefined();
  expect(p.skills).toEqual([]);
  expect(p.links).toEqual([]);
  expect(p.warnings.length).toBeGreaterThan(0);
});

test("does not misread a heading as a name", () => {
  const p = parseResumeText("Experience\nDid things\n");
  expect(p.firstName).toBeUndefined();
  expect(p.warnings).toContain("Could not detect name");
});

test("dedupes links and skills, warns on missing email", () => {
  const p = parseResumeText(
    "Jane Q Public\nDesigner\nhttps://github.com/jane\nhttps://github.com/jane\n\nSkills\nFigma, figma, Sketch\n",
  );
  expect(p.links.length).toBe(1);
  expect(p.skills).toEqual(["Figma", "Sketch"]);
  expect(p.email).toBeUndefined();
  expect(p.warnings).toContain("Could not detect email");
  expect(p.firstName).toBe("Jane");
  expect(p.lastName).toBe("Q Public");
});

// Regression: CVs use varied section headings; the parser must normalize synonyms.
const SYNONYMS_CV = `Maya Smith
Senior Designer
maya@example.com | Berlin, Germany

Professional Experience
Lead Designer, Studio X (2019 - Present)
- Redesigned the marketing site

Employment History (Prior)
Designer, Co Y (2017 - 2019)

Academic Background
M.A. Design, UdK Berlin (2015 - 2017)

Technical Skills
Figma, Prototyping

Core Competencies
Leadership, Mentorship

Certifications & Licenses
Certified UX Designer
`;

test("normalizes experience heading synonyms", () => {
  const p = parseResumeText(SYNONYMS_CV);
  expect(p.experienceText?.toLowerCase()).toContain("lead designer");
  expect(p.experienceText?.toLowerCase()).toContain("designer, co y");
});

test("normalizes education synonyms (Academic Background)", () => {
  const p = parseResumeText(SYNONYMS_CV);
  expect(p.educationText?.toLowerCase()).toContain("udk berlin");
});

test("normalizes skills synonyms and merges", () => {
  const p = parseResumeText(SYNONYMS_CV);
  expect(p.skills).toContain("Figma");
  // "Core Competencies" should also map to skills; only the LAST skills section
  // wins the flat list, so Leadership/Mentorship must be present too.
  expect(p.skills.some((s) => /leadership/i.test(s))).toBe(true);
});

test("extracts city/country from contact block", () => {
  const p = parseResumeText(SYNONYMS_CV);
  expect(p.city).toBe("Berlin");
  expect(p.country).toBe("Germany");
});
