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

type ExtractResult = Awaited<ReturnType<AiService["extractResume"]>>;

const EMPTY_EXTRACT: ExtractResult = {
  skills: [],
  workExperiences: [],
  educations: [],
  projects: [],
  source: "fallback",
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
    // Import flow now calls extractResume; map structureSections shape onto it.
    extractResume: async () => ({
      skills: [],
      projects: [],
      workExperiences: result.workExperiences,
      educations: result.educations,
      source: result.source,
    }),
  } as AiService;
}

function stubExtract(extract: Partial<ExtractResult>): AiService {
  const result: ExtractResult = { ...EMPTY_EXTRACT, ...extract };
  return {
    enabled: true,
    improveBullet: async () => ({ suggestion: "", changes: [], source: "fallback" }),
    improveSummary: async () => ({ suggestion: "", changes: [], source: "fallback" }),
    suggestSkills: async () => ({ skills: [], source: "fallback" }),
    analyseJobMatch: async () => {
      throw new Error("not used");
    },
    structureSections: async () => ({ workExperiences: [], educations: [], source: "fallback" as const }),
    extractResume: async () => result,
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

test("useAi with rich extractResume → all fields populated, no Imported custom sections, aiStructured", async () => {
  const db = await seededDb();
  const stub = stubExtract({
    personalInformation: {
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@navy.mil",
      city: "Arlington",
      links: [{ type: "linkedin", url: "https://linkedin.com/in/grace" }],
    },
    professionalSummary: "Pioneering computer scientist and Navy rear admiral.",
    skills: ["COBOL", "Compilers", "Leadership"],
    workExperiences: [WE],
    educations: [EDU],
    projects: [
      { name: "A-0 Compiler", role: "Creator", projectUrl: "https://example.com/a0", technologies: ["assembly"], description: "First compiler." },
    ],
    source: "ai",
  });
  const { id, aiStructured } = await importResume(db, "u1", {
    text: SAMPLE,
    useAi: true,
    aiService: stub,
  });
  expect(aiStructured).toBe(true);
  const doc = await loadDoc(db, id);
  expect(doc.personalInformation.email).toBe("grace@navy.mil");
  expect(doc.personalInformation.firstName).toBe("Grace");
  expect(doc.professionalSummary).toBe("Pioneering computer scientist and Navy rear admiral.");
  const skillsGroup = doc.skillGroups.find((g) => g.skills.includes("COBOL"));
  expect(skillsGroup).toBeDefined();
  expect(doc.workExperiences.length).toBe(1);
  expect(doc.educations.length).toBe(1);
  expect(doc.projects.length).toBe(1);
  expect(doc.projects[0]!.name).toBe("A-0 Compiler");
  const titles = doc.customSections.map((s) => s.title);
  expect(titles).not.toContain("Imported: Experience");
  expect(titles).not.toContain("Imported: Education");
});

test("useAi where AI omits summary → heuristic summary fills the gap", async () => {
  const db = await seededDb();
  const withSummary = `Ada Lovelace
Software Engineer
ada@example.com

Summary
Seasoned engineer who ships.

Experience
Engineer, Analytical Co (2020 - Present)
`;
  const stub = stubExtract({ workExperiences: [WE], source: "ai" });
  const { id } = await importResume(db, "u1", {
    text: withSummary,
    useAi: true,
    aiService: stub,
  });
  const doc = await loadDoc(db, id);
  // AI gave no summary; heuristic parsed one from the Summary section.
  expect(doc.professionalSummary).toBe("Seasoned engineer who ships.");
});
