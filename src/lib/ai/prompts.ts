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
