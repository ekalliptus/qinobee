import { test, expect } from "bun:test";
import {
  parsedToResumeSeed,
  deriveTitle,
  importResume,
} from "@modules/resume/import/build-import-input";
import type { ParsedResume } from "@modules/resume/import/parse-resume-text";
import { resumeDocumentSchema } from "@modules/resume/schemas";
import { createSqliteAdapter } from "@lib/db/sqlite-adapter";
import { migrateDb } from "@lib/db/migrate";

const OPTS = { title: "T", language: "en" as const, templateId: "essential" };

function empty(): ParsedResume {
  return { links: [], skills: [], rawSections: {}, warnings: [] };
}

test("maps name/email/skills/summary into input + patch", () => {
  const parsed: ParsedResume = {
    ...empty(),
    firstName: "Ada",
    lastName: "Lovelace",
    headline: "Engineer",
    email: "ada@example.com",
    skills: ["TypeScript", "SQL"],
    professionalSummary: "Reliable web platforms.",
  };
  const { input, patch } = parsedToResumeSeed(parsed, OPTS);
  expect(input.title).toBe("T");
  expect(input.language).toBe("en");
  expect(input.templateId).toBe("essential");
  expect(patch.personalInformation?.firstName).toBe("Ada");
  expect(patch.personalInformation?.lastName).toBe("Lovelace");
  expect(patch.personalInformation?.email).toBe("ada@example.com");
  expect(patch.professionalSummary).toBe("Reliable web platforms.");
  const g = patch.skillGroups?.[0];
  expect(g?.category).toBe("custom");
  expect(g?.skills).toEqual(["TypeScript", "SQL"]);
});

test("empty parsed → minimal patch, no fabricated skills/experience", () => {
  const { input, patch } = parsedToResumeSeed(empty(), OPTS);
  expect(input.title).toBe("T");
  expect(patch.skillGroups).toBeUndefined();
  expect(patch.customSections).toBeUndefined();
  expect(patch.professionalSummary).toBeUndefined();
  expect(patch.personalInformation).toBeUndefined();
});

test("raw experience/education preserved as custom sections (not fake structured entries)", () => {
  const parsed: ParsedResume = {
    ...empty(),
    experienceText: "Engineer, Analytical Co (2020 - Present)",
    educationText: "BSc Computer Science, Uni (2016 - 2020)",
  };
  const { patch } = parsedToResumeSeed(parsed, OPTS);
  expect(patch.workExperiences).toBeUndefined();
  expect(patch.educations).toBeUndefined();
  const titles = patch.customSections?.map((s) => s.title);
  expect(titles).toContain("Imported: Experience");
  expect(titles).toContain("Imported: Education");
  const exp = patch.customSections?.find((s) => s.title === "Imported: Experience");
  expect(exp?.items[0]?.description).toContain("Analytical Co");
});

test("only valid links survive mapping", () => {
  const parsed: ParsedResume = {
    ...empty(),
    email: "x@y.com",
    links: [{ type: "linkedin", url: "https://linkedin.com/in/x" }],
  };
  const { patch } = parsedToResumeSeed(parsed, OPTS);
  expect(patch.personalInformation?.links?.[0]?.url).toBe("https://linkedin.com/in/x");
});

test("deriveTitle prefers name, then headline, then fallback", () => {
  expect(deriveTitle({ ...empty(), firstName: "Ada", lastName: "Lovelace" })).toContain("Ada Lovelace");
  expect(deriveTitle({ ...empty(), headline: "Product Designer" })).toContain("Product Designer");
  expect(deriveTitle(empty())).toBe("Imported CV");
});

async function seededDb() {
  const db = createSqliteAdapter(":memory:");
  await migrateDb(db);
  await db
    .prepare("INSERT INTO users (id,email,password_hash,created_at) VALUES (?,?,?,?)")
    .bind("u1", "u1@x.com", "hash", new Date().toISOString())
    .run();
  return db;
}

test("importResume creates a draft résumé with parsed email + skills (through the service)", async () => {
  const db = await seededDb();
  const text = `Ada Lovelace
Software Engineer
ada.lovelace@example.com

Summary
Reliable web platforms.

Skills
TypeScript, SQL

Experience
Engineer, Analytical Co

Education
BSc CS, Uni
`;
  const { id, warnings } = await importResume(db, "u1", { text, language: "en", templateId: "essential" });
  expect(id).toBeTruthy();
  expect(Array.isArray(warnings)).toBe(true);

  const row = await db
    .prepare("SELECT data FROM resumes WHERE id = ? AND user_id = ?")
    .bind(id, "u1")
    .first<{ data: string }>();
  const doc = resumeDocumentSchema.parse(JSON.parse(row!.data));
  expect(doc.status).toBe("draft");
  expect(doc.personalInformation.email).toBe("ada.lovelace@example.com");
  expect(doc.skillGroups[0]?.skills).toContain("TypeScript");
  expect(doc.customSections.some((s) => s.title === "Imported: Experience")).toBe(true);
});

test("importResume on garbage text still creates a valid draft (parser leaves fields blank)", async () => {
  const db = await seededDb();
  const { id } = await importResume(db, "u1", { text: "..........", language: "id", templateId: "essential" });
  const row = await db
    .prepare("SELECT data FROM resumes WHERE id = ?")
    .bind(id)
    .first<{ data: string }>();
  const doc = resumeDocumentSchema.parse(JSON.parse(row!.data));
  expect(doc.status).toBe("draft");
  expect(doc.skillGroups.length).toBe(0);
  expect(doc.workExperiences.length).toBe(0);
});
