import { z } from "zod";
import type { JobMatchResult } from "@modules/resume/matcher/types";

export const suggestionSchema = z.object({
  suggestion: z.string().min(1).max(4000),
  changes: z.array(z.string().max(300)).default([]),
  uncertain: z.boolean().optional(),
});
export type Suggestion = z.infer<typeof suggestionSchema>;

export const skillSuggestionsSchema = z.object({
  skills: z
    .array(
      z.object({
        skill: z.string().min(1).max(60),
        confirmed: z.boolean().default(false),
      }),
    )
    .max(50),
});
export type SkillSuggestions = z.infer<typeof skillSuggestionsSchema>;

export type AiResult<T> = T & { source: "ai" | "fallback" };

export type SuggestionResult = AiResult<Suggestion>;
export type SkillSuggestionsResult = AiResult<SkillSuggestions>;
export type JobMatchAiResult = AiResult<{ result: JobMatchResult; commentary?: string }>;
