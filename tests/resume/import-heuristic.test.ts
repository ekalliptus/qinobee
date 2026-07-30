import { test, expect } from "bun:test";
import { createSqliteAdapter } from "@lib/db/sqlite-adapter";
import { migrateDb } from "@lib/db/migrate";
import { importResume } from "@modules/resume/import/build-import-input";
import { createResumeService } from "@modules/resume/services/resume-service";

async function setup() {
  const db = createSqliteAdapter(":memory:"); await migrateDb(db);
  const now = new Date().toISOString();
  await db.prepare("INSERT INTO users (id,email,password_hash,created_at) VALUES (?,?,?,?)").bind("u1","u1@x.com","h",now).run();
  return db;
}

const CV = `Ada Lovelace
Engineer
ada@example.com

Work Experience
Frontend Developer, PT Nusantara (2022 - Present)
- Built the dashboard
Intern, Startup Kreatif (2021 - 2021)
- Landing pages

Education
Bachelor of Informatics, Institut Teknologi Bandung (2018 - 2022)`;

test("non-AI import produces structured work/education, no Imported custom sections", async () => {
  const db = await setup();
  const { id } = await importResume(db, "u1", { text: CV, language: "en", useAi: false });
  const doc = await createResumeService(db).getOrThrow("u1", id);
  expect(doc.workExperiences.length).toBeGreaterThanOrEqual(2);
  expect(doc.educations.length).toBeGreaterThanOrEqual(1);
  const titles = (doc.customSections ?? []).map((c: any) => c.title);
  expect(titles).not.toContain("Imported: Experience");
  expect(titles).not.toContain("Imported: Education");
  // first experience mapped sensibly
  expect(doc.workExperiences[0]!.jobTitle).toBe("Frontend Developer");
  expect(doc.workExperiences[0]!.company).toBe("PT Nusantara");
});

test("import with no experience/education keeps arrays empty (no fabrication)", async () => {
  const db = await setup();
  const { id } = await importResume(db, "u1", { text: "Ada Lovelace\nada@example.com\n\nSkills\nReact, SQL", language: "en", useAi: false });
  const doc = await createResumeService(db).getOrThrow("u1", id);
  expect(doc.workExperiences.length).toBe(0);
  expect(doc.educations.length).toBe(0);
});
