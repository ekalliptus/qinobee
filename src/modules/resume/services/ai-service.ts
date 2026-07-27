import type { ResumeDocument } from "@modules/resume/types";
import type { JobMatchResult } from "@modules/resume/matcher/types";
import { matchJob } from "@modules/resume/matcher/matcher";
import { hasActionVerb } from "@modules/resume/utils/empty";
import {
  buildImproveBulletMessages,
  buildImproveSummaryMessages,
  buildSuggestSkillsMessages,
} from "@lib/ai/prompts";
import { callChatCompletion, parseSuggestion } from "@lib/ai/client";
import type {
  SuggestionResult,
  SkillSuggestionsResult,
  JobMatchAiResult,
} from "@lib/ai/types";

const MAX_INPUT = 6000;
const MIN_SUMMARY_LEN = 120;
const MAX_SUMMARY_LEN = 600;

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

export interface AiService {
  readonly enabled: boolean;
  improveBullet(input: ImproveBulletInput): Promise<SuggestionResult>;
  improveSummary(input: ImproveSummaryInput): Promise<SuggestionResult>;
  suggestSkills(input: SuggestSkillsInput): Promise<SkillSuggestionsResult>;
  analyseJobMatch(input: AnalyseJobMatchInput): Promise<JobMatchAiResult>;
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

export function createAiService(opts: AiServiceOptions = {}): AiService {
  const apiKey = opts.apiKey ?? process.env.AI_API_KEY ?? "";
  const baseUrl = opts.baseUrl ?? process.env.AI_BASE_URL ?? "https://router.ekalliptus.com/v1";
  const model = opts.model ?? process.env.AI_MODEL ?? "gaskeun";
  const fetchImpl = opts.fetchImpl;
  const timeoutMs = opts.timeoutMs;
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
  };
}

let singleton: AiService | null = null;
export function getAiService(): AiService {
  if (!singleton) singleton = createAiService();
  return singleton;
}
