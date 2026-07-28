import { test, expect } from "bun:test";
import { importResume } from "@modules/resume/import/build-import-input";
import { resumeDocumentSchema } from "@modules/resume/schemas";
import type { AiService } from "@modules/resume/services/ai-service";
import type { WorkExperience, Education } from "@modules/resume/types";
import { createSqliteAdapter } from "@lib/db/sqlite-adapter";
import { migrateDb } from "@lib/db/migrate";

const SAMPLE = `Ada Lovelace
Software Engineer
ada@example.com

Experience
Engineer, Analytical Co (2020 - Present)

Education
BSc Computer Science, Uni (2016 - 2020)
`;

const WE: WorkExperience = {
  jobTitle: "Engineer",
  company: "Analytical Co",
  employmentType: "full-time",
  startMonth: 1,
  startYear: 2020,
  currentlyWorking: false,
  bullets: [],
  skillsUsed: [],
};
const EDU: Education = {
  institution: "Uni",
  currentlyStudying: false,
  coursework: [],
  achievements: [],
};

function stubAi(result: {
  workExperiences: WorkExperience[];
  educations: Education[];
  source: "ai" | "fallback";
}): AiService {
  return {
    enabled: true,
    improveBullet: async () => ({ suggestion: "", changes: [], source: "fallback" }),
    improveSummary: async () => ({ suggestion: "", changes: [], source: "fallback" }),
    suggestSkills: async () => ({ skills: [], source: "fallback" }),
    analyseJobMatch: async () => {
      throw new Error("not used");
    },
    structureSections: async () => result,
  } as AiService;
}

async function seededDb() {
  const db = createSqliteAdapter(":memory:");
  await migrateDb(db);
  await db
    .prepare("INSERT INTO users (id,email,password_hash,created_at) VALUES (?,?,?,?)")
    .bind("u1", "u1@x.com", "hash", new Date().toISOString())
    .run();
  return db;
}

async function loadDoc(db: Awaited<ReturnType<typeof seededDb>>, id: string) {
  const row = await db
    .prepare("SELECT data FROM resumes WHERE id = ? AND user_id = ?")
    .bind(id, "u1")
    .first<{ data: string }>();
  return resumeDocumentSchema.parse(JSON.parse(row!.data));
}

test("useAi with structured results → structured entries, no imported custom sections, aiStructured", async () => {
  const db = await seededDb();
  const stub = stubAi({ workExperiences: [WE], educations: [EDU], source: "ai" });
  const { id, aiStructured } = await importResume(db, "u1", {
    text: SAMPLE,
    useAi: true,
    aiService: stub,
  });
  expect(aiStructured).toBe(true);
  const doc = await loadDoc(db, id);
  expect(doc.workExperiences.length).toBe(1);
  expect(doc.educations.length).toBe(1);
  const titles = doc.customSections.map((s) => s.title);
  expect(titles).not.toContain("Imported: Experience");
  expect(titles).not.toContain("Imported: Education");
});

test("useAi false → deterministic custom sections, empty structured, aiStructured false", async () => {
  const db = await seededDb();
  const { id, aiStructured } = await importResume(db, "u1", { text: SAMPLE });
  expect(aiStructured).toBe(false);
  const doc = await loadDoc(db, id);
  expect(doc.workExperiences.length).toBe(0);
  const titles = doc.customSections.map((s) => s.title);
  expect(titles).toContain("Imported: Experience");
  expect(titles).toContain("Imported: Education");
});

test("useAi with empty AI result (fallback) → deterministic custom sections kept, aiStructured false", async () => {
  const db = await seededDb();
  const stub = stubAi({ workExperiences: [], educations: [], source: "fallback" });
  const { id, aiStructured } = await importResume(db, "u1", {
    text: SAMPLE,
    useAi: true,
    aiService: stub,
  });
  expect(aiStructured).toBe(false);
  const doc = await loadDoc(db, id);
  expect(doc.workExperiences.length).toBe(0);
  const titles = doc.customSections.map((s) => s.title);
  expect(titles).toContain("Imported: Experience");
  expect(titles).toContain("Imported: Education");
});

test("useAi with only experiences structured → keeps education custom section only", async () => {
  const db = await seededDb();
  const stub = stubAi({ workExperiences: [WE], educations: [], source: "ai" });
  const { id, aiStructured } = await importResume(db, "u1", {
    text: SAMPLE,
    useAi: true,
    aiService: stub,
  });
  expect(aiStructured).toBe(true);
  const doc = await loadDoc(db, id);
  expect(doc.workExperiences.length).toBe(1);
  const titles = doc.customSections.map((s) => s.title);
  expect(titles).not.toContain("Imported: Experience");
  expect(titles).toContain("Imported: Education");
});
