import type { SqlDb } from "@lib/db/adapter";
import { createResumeService } from "@modules/resume/services/resume-service";
import { linkSchema } from "@modules/resume/schemas";
import type {
  CreateResumeInput,
  UpdateResumeInput,
  PersonalInformation,
  Link,
  CustomSection,
} from "@modules/resume/types";
import { parseResumeText } from "./parse-resume-text";
import type { ParsedResume } from "./parse-resume-text";

// customSectionSchema item `description` is boundedText(2000); cap raw text so
// the patch always validates. Nothing is lost that the parser cannot already
// keep — the parser itself caps its section bodies.
const DESC_CAP = 2000;

/** A best-effort human title for an imported CV, never fabricating real data. */
export function deriveTitle(parsed: ParsedResume): string {
  const name = [parsed.firstName, parsed.lastName].filter(Boolean).join(" ").trim();
  if (name) return `${name} — Imported CV`.slice(0, 160);
  if (parsed.headline) return parsed.headline.trim().slice(0, 160);
  return "Imported CV";
}

function buildPersonalInformation(parsed: ParsedResume): PersonalInformation | undefined {
  const hasContact =
    parsed.firstName ||
    parsed.lastName ||
    parsed.headline ||
    parsed.email ||
    parsed.phone ||
    parsed.city ||
    parsed.country ||
    parsed.links.length > 0;
  if (!hasContact) return undefined;

  const links: Link[] = [];
  for (const l of parsed.links) {
    const r = linkSchema.safeParse(l);
    if (r.success) links.push(r.data);
  }

  // firstName/email are required by the schema. Use parsed values when present;
  // otherwise keep the same schema-valid placeholders the service seeds — these
  // are placeholders the user edits, not invented personal data.
  return {
    firstName: parsed.firstName ?? "Untitled",
    ...(parsed.lastName ? { lastName: parsed.lastName } : {}),
    ...(parsed.headline ? { headline: parsed.headline.slice(0, 160) } : {}),
    email: parsed.email ?? "you@example.com",
    ...(parsed.phone ? { phone: parsed.phone.slice(0, 40) } : {}),
    ...(parsed.city ? { city: parsed.city.slice(0, 120) } : {}),
    ...(parsed.country ? { country: parsed.country.slice(0, 80) } : {}),
    links,
  };
}

function importedSection(title: string, text: string): CustomSection {
  return { title, items: [{ description: text.slice(0, DESC_CAP), bullets: [] }] };
}

/**
 * Map a deterministic ParsedResume into a create input plus an update patch of
 * the fields the parser actually found. No fabrication: fields the parser left
 * empty are omitted, and the raw (unstructured) experience/education text is
 * preserved verbatim in custom sections rather than invented as structured
 * workExperiences/educations entries the user never wrote.
 */
export function parsedToResumeSeed(
  parsed: ParsedResume,
  opts: { title: string; language: "id" | "en"; templateId: string },
): { input: CreateResumeInput; patch: UpdateResumeInput } {
  const input: CreateResumeInput = {
    title: opts.title,
    language: opts.language,
    templateId: opts.templateId,
    startingPoint: "import",
  };

  const patch: UpdateResumeInput = {};

  const personalInformation = buildPersonalInformation(parsed);
  if (personalInformation) patch.personalInformation = personalInformation;

  if (parsed.professionalSummary) patch.professionalSummary = parsed.professionalSummary.slice(0, 3000);

  if (parsed.skills.length > 0) {
    patch.skillGroups = [{ category: "custom", label: "Imported skills", skills: parsed.skills }];
  }

  const customSections: CustomSection[] = [];
  if (parsed.experienceText) customSections.push(importedSection("Imported: Experience", parsed.experienceText));
  if (parsed.educationText) customSections.push(importedSection("Imported: Education", parsed.educationText));
  if (customSections.length > 0) patch.customSections = customSections;

  return { input, patch };
}

export interface ImportOptions {
  text: string;
  title?: string;
  language?: "id" | "en";
  templateId?: string;
}

/**
 * Thin, HTTP-free orchestration used by the import endpoint (and tests): parse
 * the text, seed a fresh DRAFT résumé, and apply the parsed fields as a patch.
 * Returns the new id plus parser warnings for the caller to surface.
 */
export async function importResume(
  db: SqlDb,
  userId: string,
  opts: ImportOptions,
): Promise<{ id: string; warnings: string[] }> {
  const parsed = parseResumeText(opts.text);
  const { input, patch } = parsedToResumeSeed(parsed, {
    title: opts.title ?? deriveTitle(parsed),
    language: opts.language ?? "en",
    templateId: opts.templateId ?? "essential",
  });
  const svc = createResumeService(db);
  const created = await svc.create({ userId, input });
  const updated = await svc.update(userId, created.id, {
    revision: created.revision,
    patch,
    reason: "import",
  });
  return { id: updated.id, warnings: parsed.warnings };
}
