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
import type { AiService } from "@modules/resume/services/ai-service";
import { toWorkExperience, toEducation } from "@modules/resume/services/ai-service";
import { splitExperienceBlocks, splitEducationBlocks } from "./split-sections";

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

  // Deterministic structuring: run the section splitters through the SAME
  // schema mappers the AI path uses. Structured entries win; the raw
  // "Imported:" custom section is only a fallback when a splitter yields
  // nothing for that part (never fabricating entries the user didn't write).
  const workExperiences = splitExperienceBlocks(parsed.experienceText ?? "")
    .map(toWorkExperience)
    .filter((e): e is NonNullable<typeof e> => e !== null);
  if (workExperiences.length > 0) patch.workExperiences = workExperiences;

  const educations = splitEducationBlocks(parsed.educationText ?? "")
    .map(toEducation)
    .filter((e): e is NonNullable<typeof e> => e !== null);
  if (educations.length > 0) patch.educations = educations;

  const customSections: CustomSection[] = [];
  if (parsed.experienceText && workExperiences.length === 0)
    customSections.push(importedSection("Imported: Experience", parsed.experienceText));
  if (parsed.educationText && educations.length === 0)
    customSections.push(importedSection("Imported: Education", parsed.educationText));
  if (customSections.length > 0) patch.customSections = customSections;

  return { input, patch };
}

export interface ImportOptions {
  text: string;
  title?: string;
  language?: "id" | "en";
  templateId?: string;
  /** Opt into AI structuring. Consent/enablement are the caller's concern. */
  useAi?: boolean;
  /** Injected so tests exercise the AI path without any network. */
  aiService?: AiService;
}

/**
 * Thin, HTTP-free orchestration used by the import endpoint (and tests): parse
 * the text, seed a fresh DRAFT résumé, and apply the parsed fields as a patch.
 * When `useAi` and an `aiService` are supplied, raw experience/education text is
 * structured into workExperiences/educations; the matching "Imported:" custom
 * section is then dropped only for the part that was structured. Falls back to
 * the deterministic custom-section behavior when AI is off/empty/failed.
 * Returns the new id, parser warnings, and whether AI structuring took effect.
 */
export async function importResume(
  db: SqlDb,
  userId: string,
  opts: ImportOptions,
): Promise<{ id: string; warnings: string[]; aiStructured: boolean }> {
  const parsed = parseResumeText(opts.text);
  const language = opts.language ?? "en";
  const { input, patch } = parsedToResumeSeed(parsed, {
    title: opts.title ?? deriveTitle(parsed),
    language,
    templateId: opts.templateId ?? "essential",
  });

  const warnings = [...parsed.warnings];
  let aiStructured = false;

  if (opts.useAi && opts.aiService) {
    // Send the FULL CV text; the AI extracts every field. The deterministic
    // seed above stays as the gap-filler for anything the AI leaves empty.
    const ai = await opts.aiService.extractResume({ text: opts.text, language });

    if (ai.source === "ai") {
      // personalInformation: AI-first per subfield; heuristic fills gaps.
      const basePi = patch.personalInformation;
      const aiPi = ai.personalInformation;
      if (aiPi || basePi) {
        const merged: PersonalInformation = {
          firstName: aiPi?.firstName ?? basePi?.firstName ?? "Untitled",
          email: aiPi?.email ?? basePi?.email ?? "you@example.com",
          links: aiPi?.links && aiPi.links.length > 0 ? aiPi.links : (basePi?.links ?? []),
        };
        const lastName = aiPi?.lastName ?? basePi?.lastName;
        if (lastName) merged.lastName = lastName.slice(0, 80);
        const headline = aiPi?.headline ?? basePi?.headline;
        if (headline) merged.headline = headline.slice(0, 160);
        const phone = aiPi?.phone ?? basePi?.phone;
        if (phone) merged.phone = phone.slice(0, 40);
        const city = aiPi?.city ?? basePi?.city;
        if (city) merged.city = city.slice(0, 120);
        const country = aiPi?.country ?? basePi?.country;
        if (country) merged.country = country.slice(0, 80);
        patch.personalInformation = merged;
      }

      // professionalSummary: AI-first, heuristic fallback (already in patch).
      if (ai.professionalSummary) patch.professionalSummary = ai.professionalSummary.slice(0, 3000);

      // skills: AI-first as a single group; else keep the heuristic group.
      if (ai.skills.length > 0) {
        patch.skillGroups = [{ category: "custom", label: "Skills", skills: ai.skills }];
      }

      // Structured entries replace the raw "Imported:" custom-section fallback.
      const dropTitles: string[] = [];
      if (ai.workExperiences.length > 0) {
        patch.workExperiences = ai.workExperiences;
        dropTitles.push("Imported: Experience");
      }
      if (ai.educations.length > 0) {
        patch.educations = ai.educations;
        dropTitles.push("Imported: Education");
      }
      if (ai.projects.length > 0) patch.projects = ai.projects;
      if (dropTitles.length > 0 && patch.customSections) {
        const kept = patch.customSections.filter((s) => !dropTitles.includes(s.title));
        if (kept.length > 0) patch.customSections = kept;
        else delete patch.customSections;
      }

      const produced =
        ai.workExperiences.length > 0 ||
        ai.educations.length > 0 ||
        ai.projects.length > 0 ||
        ai.skills.length > 0 ||
        !!ai.professionalSummary ||
        !!aiPi;
      if (produced) {
        aiStructured = true;
        warnings.push("AI extracted your CV — please review all fields.");
      }
    }
  }

  const svc = createResumeService(db);
  const created = await svc.create({ userId, input });
  const updated = await svc.update(userId, created.id, {
    revision: created.revision,
    patch,
    reason: "import",
  });
  return { id: updated.id, warnings, aiStructured };
}
