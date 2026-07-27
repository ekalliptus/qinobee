import type { Database } from "bun:sqlite";
import { resumeDocumentSchema, createResumeInputSchema, updateResumeInputSchema } from "@modules/resume/schemas";
import type { ResumeDocument } from "@modules/resume/types";
import type { ResumeRepository, CreateArgs, UpdateArgs } from "./interface";
import { ConflictError, NotFoundError } from "./errors";

const MAX_SNAPSHOTS = 20;

const DEFAULT_SECTION_ORDER = [
  { key: "personalInformation" },
  { key: "professionalSummary" },
  { key: "workExperiences" },
  { key: "educations" },
  { key: "projects" },
  { key: "skillGroups" },
  { key: "certifications" },
  { key: "awards" },
  { key: "languages" },
  { key: "organisations" },
  { key: "volunteerExperiences" },
  { key: "customSections" },
];

interface ResumeRow { data: string; revision: number; }

export class SqliteResumeRepository implements ResumeRepository {
  constructor(private db: Database) {}

  private parse(data: string): ResumeDocument {
    return resumeDocumentSchema.parse(JSON.parse(data));
  }

  async list(userId: string): Promise<ResumeDocument[]> {
    const rows = this.db
      .query("SELECT data FROM resumes WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC")
      .all(userId) as { data: string }[];
    return rows.map((r) => this.parse(r.data));
  }

  async findById(userId: string, resumeId: string): Promise<ResumeDocument | null> {
    const row = this.db
      .query("SELECT data FROM resumes WHERE id = ? AND user_id = ? AND deleted_at IS NULL")
      .get(resumeId, userId) as { data: string } | null;
    return row ? this.parse(row.data) : null;
  }

  async create({ userId, input }: CreateArgs): Promise<ResumeDocument> {
    const parsed = createResumeInputSchema.parse(input);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    // Blank doc must satisfy resumeDocumentSchema: firstName is nonEmpty and
    // email must be a valid email, so seed placeholders the user edits later.
    const doc: ResumeDocument = resumeDocumentSchema.parse({
      id,
      userId,
      title: parsed.title,
      language: parsed.language,
      templateId: parsed.templateId,
      status: "draft",
      personalInformation: { firstName: "Untitled", email: "you@example.com", links: [] },
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
      sectionOrder: DEFAULT_SECTION_ORDER,
      hiddenSections: [],
      templateSettings: {},
      revision: 0,
      createdAt: now,
      updatedAt: now,
    });
    this.db
      .query(
        "INSERT INTO resumes (id,user_id,title,status,template_id,language,revision,data,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      )
      .run(id, userId, doc.title, doc.status, doc.templateId, doc.language, 0, JSON.stringify(doc), now, now);
    return doc;
  }

  async update(userId: string, resumeId: string, { revision, patch, reason }: UpdateArgs): Promise<ResumeDocument> {
    const row = this.db
      .query("SELECT data, revision FROM resumes WHERE id = ? AND user_id = ? AND deleted_at IS NULL")
      .get(resumeId, userId) as ResumeRow | null;
    if (!row) throw new NotFoundError();

    const current = this.parse(row.data);
    const validPatch = updateResumeInputSchema.parse(patch);
    const now = new Date().toISOString();
    const newRevision = revision + 1;
    const merged: ResumeDocument = resumeDocumentSchema.parse({
      ...current,
      ...validPatch,
      revision: newRevision,
      updatedAt: now,
    });
    const dataJson = JSON.stringify(merged);

    this.db.transaction(() => {
      const res = this.db
        .query(
          "UPDATE resumes SET data=?, title=?, status=?, template_id=?, language=?, revision=revision+1, updated_at=? WHERE id=? AND user_id=? AND revision=?",
        )
        .run(dataJson, merged.title, merged.status, merged.templateId, merged.language, now, resumeId, userId, revision);
      if (res.changes === 0) throw new ConflictError();

      this.db
        .query("INSERT INTO resume_revisions (id,resume_id,revision,data,reason,created_at) VALUES (?,?,?,?,?,?)")
        .run(crypto.randomUUID(), resumeId, newRevision, dataJson, reason ?? "update", now);

      // Bound snapshot history: keep only the newest MAX_SNAPSHOTS per resume.
      this.db
        .query(
          "DELETE FROM resume_revisions WHERE resume_id = ? AND revision <= (SELECT MAX(revision) - ? FROM resume_revisions WHERE resume_id = ?)",
        )
        .run(resumeId, MAX_SNAPSHOTS, resumeId);
    })();

    return merged;
  }

  async duplicate(userId: string, resumeId: string): Promise<ResumeDocument> {
    const orig = await this.findById(userId, resumeId);
    if (!orig) throw new NotFoundError();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const dup: ResumeDocument = resumeDocumentSchema.parse({
      ...orig,
      id,
      title: `${orig.title} (Copy)`,
      revision: 0,
      createdAt: now,
      updatedAt: now,
    });
    this.db
      .query(
        "INSERT INTO resumes (id,user_id,title,status,template_id,language,revision,data,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      )
      .run(id, userId, dup.title, dup.status, dup.templateId, dup.language, 0, JSON.stringify(dup), now, now);
    return dup;
  }

  async softDelete(userId: string, resumeId: string): Promise<void> {
    const now = new Date().toISOString();
    const res = this.db
      .query("UPDATE resumes SET deleted_at=? WHERE id=? AND user_id=? AND deleted_at IS NULL")
      .run(now, resumeId, userId);
    if (res.changes === 0) throw new NotFoundError();
  }
}
