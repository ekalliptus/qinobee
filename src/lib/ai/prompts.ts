export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

// Shared safety contract. Applied to every request so the model cannot
// fabricate facts or infer protected attributes, and must return pure JSON.
const SAFETY = [
  "You help improve resume text. Follow these rules strictly:",
  "- Do NOT invent facts, metrics, numbers, job titles, employers, dates, certifications, technologies, or skills that are not already present in the input.",
  "- Preserve the candidate's original meaning and verb tense.",
  "- Never infer or mention protected attributes (age, gender, race, religion, nationality, health, disability, marital status, etc.).",
  "- Keep suggestions concise. Describe each edit briefly in the `changes` array.",
  "- If you are unsure or lack information, set `uncertain` to true rather than guessing.",
  "- Return STRICTLY a single JSON object matching the requested schema. No prose, no markdown, no code fences outside the JSON.",
].join("\n");

function toneLine(tone?: string): string {
  return tone ? `Target tone: ${tone}.` : "Target tone: Professional.";
}

const SUGGESTION_SHAPE =
  'Respond with JSON of shape {"suggestion": string, "changes": string[], "uncertain"?: boolean}.';

export function buildImproveBulletMessages(input: {
  text: string;
  tone?: string;
  jobContext?: string;
}): ChatMessage[] {
  const parts = [
    "Improve this single resume experience bullet.",
    toneLine(input.tone),
    input.jobContext ? `Target role context: ${input.jobContext}` : "",
    SUGGESTION_SHAPE,
    "",
    `Bullet: ${input.text}`,
  ].filter(Boolean);
  return [
    { role: "system", content: SAFETY },
    { role: "user", content: parts.join("\n") },
  ];
}

export function buildImproveSummaryMessages(input: {
  text: string;
  tone?: string;
}): ChatMessage[] {
  const parts = [
    "Improve this resume professional summary.",
    toneLine(input.tone),
    "Keep it to roughly 2-4 sentences.",
    SUGGESTION_SHAPE,
    "",
    `Summary: ${input.text}`,
  ].filter(Boolean);
  return [
    { role: "system", content: SAFETY },
    { role: "user", content: parts.join("\n") },
  ];
}

const STRUCTURE_SHAPE = [
  'Output STRICT JSON: {"workExperiences": WorkExperience[], "educations": Education[]}.',
  'WorkExperience = {jobTitle, company, employmentType?, city?, country?, startMonth?, startYear?, endMonth?, endYear?, currentlyWorking?, bullets?}.',
  "Education = {institution, degree?, fieldOfStudy?, startYear?, endYear?, currentlyStudying?, description?}.",
].join("\n");

export function buildStructureSectionsMessages(input: {
  experienceText?: string;
  educationText?: string;
  language: "id" | "en";
}): ChatMessage[] {
  const system = [
    "You restructure resume text the user already provided into JSON. Follow these rules strictly:",
    "- ONLY restructure text present in the input. This is an extraction task, not writing.",
    "- DO NOT invent employers, job titles, dates, numbers, bullets, degrees, institutions, or fields of study.",
    "- If a field is not clearly present in the text, OMIT it entirely (do not guess or use placeholders).",
    "- Preserve the original wording of bullets. You may lightly normalize whitespace only; no embellishment or added metrics.",
    "- Include dates only when explicitly stated in the text.",
    '- Set currentlyWorking/currentlyStudying to true ONLY if the text says "present", "current", or "sekarang".',
    "- Never infer or mention protected attributes (age, gender, race, religion, nationality, health, disability, marital status).",
    `- Respond in ${input.language === "id" ? "Indonesian" : "English"} where wording is generated (labels only; keep the user's own words verbatim).`,
    "- Return STRICTLY a single JSON object. No prose, no markdown outside the JSON.",
    STRUCTURE_SHAPE,
  ].join("\n");
  const parts = [
    input.experienceText ? `Experience text:\n${input.experienceText}` : "",
    input.educationText ? `Education text:\n${input.educationText}` : "",
  ].filter(Boolean);
  return [
    { role: "system", content: system },
    { role: "user", content: parts.join("\n\n") },
  ];
}

const EXTRACT_SHAPE = [
  "Output STRICT JSON with these optional top-level keys:",
  "{firstName, lastName, headline, email, phone, city, country, links, professionalSummary, skills, workExperiences, educations, projects}.",
  "links = [{type?, url}]. skills = string[].",
  "workExperiences = [{jobTitle, company, employmentType?, city?, country?, startMonth?, startYear?, endMonth?, endYear?, currentlyWorking?, bullets?}].",
  "educations = [{institution, degree?, fieldOfStudy?, startYear?, endYear?, currentlyStudying?, description?}].",
  "projects = [{name, role?, description?, technologies?, url?}].",
].join("\n");

export function buildExtractResumeMessages(input: {
  text: string;
  language: "id" | "en";
}): ChatMessage[] {
  const system = [
    "You extract a résumé from raw text into JSON. Follow these rules strictly:",
    "- This is EXTRACTION, not writing. Extract ONLY what is present in the text.",
    "- DO NOT invent employers, job titles, dates, numbers, skills, degrees, institutions, projects, or contact info.",
    "- If a field is not clearly present, OMIT it entirely (no guesses, no placeholders).",
    "- Preserve the candidate's original wording; light whitespace cleanup only. No embellishment or added metrics.",
    "- Include dates only when explicitly stated in the text.",
    '- Set currentlyWorking/currentlyStudying to true ONLY if the text says "present", "current", or "sekarang".',
    "- The input may be a messy or multi-column PDF extraction: reconstruct a sensible reading order, but NEVER fabricate.",
    "- Never infer or mention protected attributes (age, gender, race, religion, nationality, health, disability, marital status).",
    `- Respond in ${input.language === "id" ? "Indonesian" : "English"} where wording is generated (labels only; keep the user's own words verbatim).`,
    "- Return STRICTLY a single JSON object. No prose, no markdown outside the JSON.",
    EXTRACT_SHAPE,
  ].join("\n");
  return [
    { role: "system", content: system },
    { role: "user", content: `Résumé text:\n${input.text}` },
  ];
}

export function buildSuggestSkillsMessages(input: {
  existingSkills: string[];
  roleHint?: string;
}): ChatMessage[] {
  const parts = [
    "Suggest resume skills strictly derived from the candidate's existing skills and the role hint. Do NOT invent skills the candidate has not demonstrated.",
    input.roleHint ? `Role hint: ${input.roleHint}` : "",
    'Respond with JSON of shape {"skills": [{"skill": string, "confirmed": boolean}]}. Set confirmed=false for anything the candidate must verify.',
    "",
    `Existing skills: ${input.existingSkills.join(", ") || "(none)"}`,
  ].filter(Boolean);
  return [
    { role: "system", content: SAFETY },
    { role: "user", content: parts.join("\n") },
  ];
}
