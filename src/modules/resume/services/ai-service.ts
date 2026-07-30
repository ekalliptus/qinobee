import type {
  ResumeDocument,
  WorkExperience,
  Education,
  Project,
  PersonalInformation,
  Link,
} from "@modules/resume/types";
import type { JobMatchResult } from "@modules/resume/matcher/types";
import { matchJob } from "@modules/resume/matcher/matcher";
import { hasActionVerb } from "@modules/resume/utils/empty";
import {
  workExperienceSchema,
  educationSchema,
  projectSchema,
} from "@modules/resume/schemas";
import { httpUrl } from "@lib/validation/primitives";
import {
  buildImproveBulletMessages,
  buildImproveSummaryMessages,
  buildSuggestSkillsMessages,
  buildStructureSectionsMessages,
  buildExtractResumeMessages,
} from "@lib/ai/prompts";
import { callChatCompletion, parseSuggestion, parseJsonObject } from "@lib/ai/client";
import {
  structuredExperienceSchema,
  structuredEducationSchema,
  extractedResumeSchema,
  extractedProjectSchema,
  type StructuredExperience,
  type StructuredEducation,
} from "@lib/ai/types";
import type {
  SuggestionResult,
  SkillSuggestionsResult,
  JobMatchAiResult,
} from "@lib/ai/types";

const MAX_INPUT = 6000;
// Full-CV extraction sends far more text than section structuring; bound it
// generously (upstream already caps the request body at 100k chars).
const MAX_EXTRACT_INPUT = 100000;
const MIN_SUMMARY_LEN = 120;
const MAX_SUMMARY_LEN = 600;
const MAX_SKILLS = 50;
// Permissive email shape — good enough to reject obvious non-emails without
// rejecting valid addresses. The seed schema's z.email() is the real gate.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface AiServiceOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export interface ImproveBulletInput {
  text: string;
  tone?: string;
  jobContext?: string;
  // Accepted for caller convenience; not sent to the provider.
  context?: unknown;
}
export interface ImproveSummaryInput {
  text: string;
  tone?: string;
}
export interface SuggestSkillsInput {
  existingSkills: string[];
  roleHint?: string;
}
export interface AnalyseJobMatchInput {
  resume: ResumeDocument;
  jobDescription: string;
}

export interface StructureSectionsInput {
  experienceText?: string;
  educationText?: string;
  language: "id" | "en";
}
export interface StructureSectionsResult {
  workExperiences: WorkExperience[];
  educations: Education[];
  source: "ai" | "fallback";
}

export interface ExtractResumeInput {
  text: string;
  language: "id" | "en";
}
export interface ExtractResumeResult {
  personalInformation?: Partial<PersonalInformation>;
  professionalSummary?: string;
  skills: string[];
  workExperiences: WorkExperience[];
  educations: Education[];
  projects: Project[];
  source: "ai" | "fallback";
}

export interface AiService {
  readonly enabled: boolean;
  improveBullet(input: ImproveBulletInput): Promise<SuggestionResult>;
  improveSummary(input: ImproveSummaryInput): Promise<SuggestionResult>;
  suggestSkills(input: SuggestSkillsInput): Promise<SkillSuggestionsResult>;
  analyseJobMatch(input: AnalyseJobMatchInput): Promise<JobMatchAiResult>;
  structureSections(input: StructureSectionsInput): Promise<StructureSectionsResult>;
  extractResume(input: ExtractResumeInput): Promise<ExtractResumeResult>;
}

function trimInput(text: string): string {
  return text.length > MAX_INPUT ? text.slice(0, MAX_INPUT) : text;
}

// ---- Deterministic, non-fabricating fallbacks ----

function fallbackBullet(text: string): SuggestionResult {
  const changes: string[] = [];
  let out = text.replace(/\s+/g, " ").trim();
  if (out !== text.trim()) changes.push("normalized whitespace");
  if (out && out[0] !== out[0]!.toUpperCase()) {
    out = out[0]!.toUpperCase() + out.slice(1);
    changes.push("capitalized first letter");
  }
  if (out && !hasActionVerb(out)) {
    changes.push("consider starting with a strong action verb");
  }
  return { suggestion: out || text, changes, source: "fallback" };
}

function fallbackSummary(text: string): SuggestionResult {
  const changes: string[] = [];
  let out = text.replace(/\s+/g, " ").trim();
  if (out !== text.trim()) changes.push("normalized whitespace");
  if (out && out[0] !== out[0]!.toUpperCase()) {
    out = out[0]!.toUpperCase() + out.slice(1);
    changes.push("capitalized first letter");
  }
  if (out.length < MIN_SUMMARY_LEN) {
    changes.push(`summary is short (aim for ${MIN_SUMMARY_LEN}-${MAX_SUMMARY_LEN} characters)`);
  } else if (out.length > MAX_SUMMARY_LEN) {
    changes.push(`summary is long (aim for ${MIN_SUMMARY_LEN}-${MAX_SUMMARY_LEN} characters)`);
  }
  return { suggestion: out || text, changes, source: "fallback" };
}

function fallbackSkills(existingSkills: string[]): SkillSuggestionsResult {
  const seen = new Set<string>();
  const skills = existingSkills
    .map((s) => s.trim())
    .filter((s) => {
      if (!s) return false;
      const key = s.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 50)
    .map((skill) => ({ skill, confirmed: false }));
  return { skills, source: "fallback" };
}

function fallbackMatch(input: AnalyseJobMatchInput): JobMatchAiResult {
  const result: JobMatchResult = matchJob(input.resume, input.jobDescription);
  return { result, source: "fallback" };
}

// ---- Structuring: map extract-only AI items to schema-valid entries -------
//
// Required-field handling (extract-only, never fabricate content):
//   WorkExperience requires jobTitle, company, employmentType, startMonth,
//   startYear. jobTitle/company are content — if absent the item is DROPPED
//   (structuredExperienceSchema already enforces both are non-empty).
//   employmentType is a structural enum: the AI's free text is mapped to the
//   nearest enum, else defaulted to "full-time" (a structural default, not a
//   content claim). startYear is a date anchor: if the text yielded no year we
//   DROP the item rather than invent one. startMonth defaults to 1 only when a
//   year IS present (year is the stated anchor; month granularity is a
//   structural default). currentlyWorking defaults false; bullets/skillsUsed
//   default []. Education only requires institution.

const EMPLOYMENT_ENUM = [
  "full-time",
  "part-time",
  "internship",
  "contract",
  "freelance",
  "apprenticeship",
  "volunteer",
] as const;
type EmploymentType = (typeof EMPLOYMENT_ENUM)[number];

function mapEmploymentType(raw?: string): EmploymentType {
  if (!raw) return "full-time";
  const n = raw.toLowerCase().replace(/[\s_]+/g, "-");
  if ((EMPLOYMENT_ENUM as readonly string[]).includes(n)) return n as EmploymentType;
  if (n.includes("full")) return "full-time";
  if (n.includes("part")) return "part-time";
  if (n.includes("intern")) return "internship";
  if (n.includes("contract") || n.includes("kontrak")) return "contract";
  if (n.includes("free")) return "freelance";
  if (n.includes("apprentice")) return "apprenticeship";
  if (n.includes("volunt") || n.includes("relawan")) return "volunteer";
  return "full-time";
}

function mapExperience(item: StructuredExperience): WorkExperience | null {
  if (item.startYear === undefined) return null; // no date anchor -> don't invent
  const candidate: Record<string, unknown> = {
    jobTitle: item.jobTitle,
    company: item.company,
    employmentType: mapEmploymentType(item.employmentType),
    startMonth: item.startMonth ?? 1,
    startYear: item.startYear,
    currentlyWorking: item.currentlyWorking ?? false,
    bullets: item.bullets ?? [],
    skillsUsed: [],
  };
  if (item.city) candidate.city = item.city;
  if (item.country) candidate.country = item.country;
  if (item.endMonth !== undefined) candidate.endMonth = item.endMonth;
  if (item.endYear !== undefined) candidate.endYear = item.endYear;
  const parsed = workExperienceSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

// Shared mapping entry points: validate a loose (AI or heuristic) item against
// the structured schema, then map to a schema-valid entity. Single source of
// mapping truth for both the AI extraction path and the deterministic splitter.
export function toWorkExperience(loose: unknown): WorkExperience | null {
  const s = structuredExperienceSchema.safeParse(loose);
  if (!s.success) return null; // drops items missing jobTitle/company
  return mapExperience(s.data);
}

export function toEducation(loose: unknown): Education | null {
  const s = structuredEducationSchema.safeParse(loose);
  if (!s.success) return null; // drops items missing institution
  return mapEducation(s.data);
}

function mapEducation(item: StructuredEducation): Education | null {
  const candidate: Record<string, unknown> = {
    institution: item.institution,
    currentlyStudying: item.currentlyStudying ?? false,
  };
  if (item.degree) candidate.degree = item.degree;
  if (item.fieldOfStudy) candidate.fieldOfStudy = item.fieldOfStudy;
  if (item.startYear !== undefined) candidate.startYear = item.startYear;
  if (item.endYear !== undefined) candidate.endYear = item.endYear;
  if (item.description) candidate.description = item.description;
  const parsed = educationSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

// Projects require only a name (content). url -> projectUrl only if it is a
// valid http(s) URL; technologies default to []. Nothing is fabricated.
function mapProject(item: {
  name: string;
  role?: string;
  description?: string;
  technologies?: string[];
  url?: string;
}): Project | null {
  const candidate: Record<string, unknown> = {
    name: item.name,
    technologies: item.technologies ?? [],
  };
  if (item.role) candidate.role = item.role;
  if (item.description) candidate.description = item.description;
  if (item.url) {
    const u = httpUrl.safeParse(item.url);
    if (u.success) candidate.projectUrl = u.data;
  }
  const parsed = projectSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

// Classify a link URL by host to the schema's link-type enum, dropping any URL
// that is not a valid http(s) URL. Never invents a link.
function classifyLinkHost(url: string): Link["type"] {
  let host = "";
  try {
    host = new URL(url).host.toLowerCase().replace(/^www\./, "");
  } catch {
    return "website";
  }
  if (host === "linkedin.com") return "linkedin";
  if (host === "github.com") return "github";
  if (host === "behance.net") return "behance";
  if (host === "dribbble.com") return "dribbble";
  return "website";
}

function mapLinks(raw?: Array<{ type?: string; url: string }>): Link[] {
  if (!raw) return [];
  const out: Link[] = [];
  const seen = new Set<string>();
  for (const l of raw) {
    const u = httpUrl.safeParse(l.url);
    if (!u.success) continue;
    if (seen.has(u.data)) continue;
    seen.add(u.data);
    out.push({ type: classifyLinkHost(u.data), url: u.data });
  }
  return out;
}

function dedupeSkills(raw?: string[]): string[] {
  if (!raw) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of raw) {
    const token = s.trim();
    if (!token) continue;
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(token);
    if (out.length >= MAX_SKILLS) break;
  }
  return out;
}

// Build a Partial<PersonalInformation> from only the present, valid fields.
// email is included only if it looks like an email; links validated via httpUrl.
function mapPersonalInformation(
  data: import("@lib/ai/types").ExtractedResume,
): Partial<PersonalInformation> | undefined {
  const pi: Partial<PersonalInformation> = {};
  if (data.firstName?.trim()) pi.firstName = data.firstName.trim();
  if (data.lastName?.trim()) pi.lastName = data.lastName.trim();
  if (data.headline?.trim()) pi.headline = data.headline.trim().slice(0, 160);
  if (data.email && EMAIL_RE.test(data.email.trim())) pi.email = data.email.trim();
  if (data.phone?.trim()) pi.phone = data.phone.trim().slice(0, 40);
  if (data.city?.trim()) pi.city = data.city.trim().slice(0, 120);
  if (data.country?.trim()) pi.country = data.country.trim().slice(0, 80);
  const links = mapLinks(data.links);
  if (links.length > 0) pi.links = links;
  return Object.keys(pi).length > 0 ? pi : undefined;
}

export function createAiService(opts: AiServiceOptions = {}): AiService {
  const apiKey = opts.apiKey ?? "";
  const baseUrl = opts.baseUrl ?? "https://router.ekalliptus.com/v1";
  const model = opts.model ?? "gaskeun";
  const fetchImpl = opts.fetchImpl;
  const timeoutMs = opts.timeoutMs ?? 25000;
  const enabled = !!apiKey;

  async function complete(messages: Parameters<typeof callChatCompletion>[0]["messages"]) {
    return callChatCompletion({ baseUrl, apiKey, model, messages, fetchImpl, timeoutMs });
  }

  return {
    enabled,

    async improveBullet(input) {
      const text = trimInput(input.text);
      if (!enabled) return fallbackBullet(text);
      try {
        const content = await complete(
          buildImproveBulletMessages({ text, tone: input.tone, jobContext: input.jobContext }),
        );
        const parsed = parseSuggestion(content);
        if (!parsed.ok) return fallbackBullet(text);
        return { ...parsed.value, source: "ai" };
      } catch {
        return fallbackBullet(text);
      }
    },

    async improveSummary(input) {
      const text = trimInput(input.text);
      if (!enabled) return fallbackSummary(text);
      try {
        const content = await complete(
          buildImproveSummaryMessages({ text, tone: input.tone }),
        );
        const parsed = parseSuggestion(content);
        if (!parsed.ok) return fallbackSummary(text);
        return { ...parsed.value, source: "ai" };
      } catch {
        return fallbackSummary(text);
      }
    },

    async suggestSkills(input) {
      // MVP: never fabricate skills. Always use the deterministic fallback,
      // which echoes normalized existing skills as unconfirmed.
      return fallbackSkills(input.existingSkills);
    },

    async analyseJobMatch(input) {
      // Deterministic matcher is always the backbone; AI never overrides it.
      return fallbackMatch(input);
    },

    async structureSections(input) {
      const experienceText = trimInput(input.experienceText ?? "");
      const educationText = trimInput(input.educationText ?? "");
      const empty: StructureSectionsResult = {
        workExperiences: [],
        educations: [],
        source: "fallback",
      };
      if (!enabled) return empty;
      if (!experienceText.trim() && !educationText.trim()) return empty;
      try {
        const content = await complete(
          buildStructureSectionsMessages({ experienceText, educationText, language: input.language }),
        );
        const obj = parseJsonObject(content);
        if (!obj || typeof obj !== "object") return empty;
        const rawExp = (obj as { workExperiences?: unknown }).workExperiences;
        const rawEdu = (obj as { educations?: unknown }).educations;
        const workExperiences: WorkExperience[] = [];
        if (Array.isArray(rawExp)) {
          for (const raw of rawExp.slice(0, 30)) {
            const mapped = toWorkExperience(raw);
            if (mapped) workExperiences.push(mapped);
          }
        }
        const educations: Education[] = [];
        if (Array.isArray(rawEdu)) {
          for (const raw of rawEdu.slice(0, 30)) {
            const mapped = toEducation(raw);
            if (mapped) educations.push(mapped);
          }
        }
        return { workExperiences, educations, source: "ai" };
      } catch {
        return empty;
      }
    },

    async extractResume(input) {
      const empty: ExtractResumeResult = {
        skills: [],
        workExperiences: [],
        educations: [],
        projects: [],
        source: "fallback",
      };
      const text =
        input.text.length > MAX_EXTRACT_INPUT
          ? input.text.slice(0, MAX_EXTRACT_INPUT)
          : input.text;
      if (!enabled) return empty;
      if (!text.trim()) return empty;
      try {
        const content = await complete(
          buildExtractResumeMessages({ text, language: input.language }),
        );
        const obj = parseJsonObject(content);
        if (!obj || typeof obj !== "object") return empty;
        // Validate scalar/link/skill fields as a group; arrays are parsed
        // element-by-element below so ONE malformed item never discards the
        // whole extraction (drop-invalid, not fail-all).
        const scalar = extractedResumeSchema
          .omit({ workExperiences: true, educations: true, projects: true })
          .safeParse(obj);
        if (!scalar.success) return empty;
        const data = scalar.data;
        const rec = obj as Record<string, unknown>;

        const workExperiences: WorkExperience[] = [];
        const rawExp = rec.workExperiences;
        if (Array.isArray(rawExp)) {
          for (const raw of rawExp.slice(0, 30)) {
            const mapped = toWorkExperience(raw);
            if (mapped) workExperiences.push(mapped);
          }
        }
        const educations: Education[] = [];
        const rawEdu = rec.educations;
        if (Array.isArray(rawEdu)) {
          for (const raw of rawEdu.slice(0, 30)) {
            const mapped = toEducation(raw);
            if (mapped) educations.push(mapped);
          }
        }
        const projects: Project[] = [];
        const rawProj = rec.projects;
        if (Array.isArray(rawProj)) {
          for (const raw of rawProj.slice(0, 30)) {
            const s = extractedProjectSchema.safeParse(raw);
            if (!s.success) continue;
            const mapped = mapProject(s.data);
            if (mapped) projects.push(mapped);
          }
        }

        const result: ExtractResumeResult = {
          skills: dedupeSkills(data.skills),
          workExperiences,
          educations,
          projects,
          source: "ai",
        };
        const personalInformation = mapPersonalInformation(data);
        if (personalInformation) result.personalInformation = personalInformation;
        if (data.professionalSummary?.trim())
          result.professionalSummary = data.professionalSummary.trim().slice(0, 3000);
        return result;
      } catch {
        return empty;
      }
    },
  };
}

/** Request-scoped: reads AI config from the CF runtime env, not process.env. */
export function getAiService(env: {
  AI_API_KEY?: string;
  AI_BASE_URL?: string;
  AI_MODEL?: string;
}): AiService {
  return createAiService({
    apiKey: env.AI_API_KEY,
    baseUrl: env.AI_BASE_URL,
    model: env.AI_MODEL,
  });
}
