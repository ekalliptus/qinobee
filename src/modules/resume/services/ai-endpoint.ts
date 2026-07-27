import { z } from "zod";
import type { AiService } from "./ai-service";

/** Minimal user shape needed by the AI endpoint handlers. */
export interface EndpointUser {
  id: string;
  email: string;
}

/**
 * JSON response bag. Shape varies by status (suggestion/changes/source/skills/error),
 * so the index value is `any` to keep call sites and tests ergonomic.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ResponseBody = { ok: boolean; [k: string]: any };

export interface HandlerResult {
  status: number;
  body: ResponseBody;
}

const improveSchema = z.object({
  kind: z.enum(["bullet", "summary"]),
  text: z.string().min(1).max(4000),
  tone: z.string().max(60).optional(),
  jobContext: z.string().max(4000).optional(),
});

const suggestSkillsSchema = z.object({
  existingSkills: z.array(z.string().min(1).max(60)).max(100),
  roleHint: z.string().max(120).optional(),
});

export interface HandleImproveArgs {
  user: EndpointUser | null;
  consentGiven: boolean;
  aiService: AiService;
  body: unknown;
}

/**
 * Pure, injectable core of the /api/resume/ai/improve endpoint.
 * Auth → consent → validation → service. Never throws (service is safe).
 */
export async function handleImprove(args: HandleImproveArgs): Promise<HandlerResult> {
  if (!args.user) return { status: 401, body: { ok: false } };
  if (!args.consentGiven) {
    return { status: 403, body: { ok: false, error: "consent_required" } };
  }

  const parsed = improveSchema.safeParse(args.body);
  if (!parsed.success) return { status: 400, body: { ok: false } };

  const { kind, text, tone, jobContext } = parsed.data;
  const result =
    kind === "summary"
      ? await args.aiService.improveSummary({ text, tone })
      : await args.aiService.improveBullet({ text, tone, jobContext });

  return {
    status: 200,
    body: {
      ok: true,
      suggestion: result.suggestion,
      changes: result.changes,
      source: result.source,
    },
  };
}

export interface HandleSuggestSkillsArgs {
  user: EndpointUser | null;
  consentGiven: boolean;
  aiService: AiService;
  body: unknown;
}

/** Pure core of /api/resume/ai/suggest-skills. */
export async function handleSuggestSkills(
  args: HandleSuggestSkillsArgs,
): Promise<HandlerResult> {
  if (!args.user) return { status: 401, body: { ok: false } };
  if (!args.consentGiven) {
    return { status: 403, body: { ok: false, error: "consent_required" } };
  }

  const parsed = suggestSkillsSchema.safeParse(args.body);
  if (!parsed.success) return { status: 400, body: { ok: false } };

  const result = await args.aiService.suggestSkills({
    existingSkills: parsed.data.existingSkills,
    roleHint: parsed.data.roleHint,
  });
  return { status: 200, body: { ok: true, skills: result.skills, source: result.source } };
}
