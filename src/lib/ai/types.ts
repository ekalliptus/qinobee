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

// ---- Structure imported sections (extract-only) ---------------------------

export const structuredExperienceSchema = z.object({
  jobTitle: z.string().min(1).max(120),
  company: z.string().min(1).max(160),
  employmentType: z.string().max(40).optional(),
  city: z.string().max(120).optional(),
  country: z.string().max(80).optional(),
  startMonth: z.coerce.number().int().min(1).max(12).optional(),
  startYear: z.coerce.number().int().min(1950).max(2100).optional(),
  endMonth: z.coerce.number().int().min(1).max(12).optional(),
  endYear: z.coerce.number().int().min(1950).max(2100).optional(),
  currentlyWorking: z.boolean().optional(),
  bullets: z.array(z.string().max(500)).max(20).optional(),
});
export type StructuredExperience = z.infer<typeof structuredExperienceSchema>;

export const structuredEducationSchema = z.object({
  institution: z.string().min(1).max(160),
  degree: z.string().max(120).optional(),
  fieldOfStudy: z.string().max(120).optional(),
  startYear: z.coerce.number().int().min(1950).max(2100).optional(),
  endYear: z.coerce.number().int().min(1950).max(2100).optional(),
  currentlyStudying: z.boolean().optional(),
  description: z.string().max(2000).optional(),
});
export type StructuredEducation = z.infer<typeof structuredEducationSchema>;

// ---- Full-text résumé extraction (extract-only) --------------------------
// Comprehensive but lenient: coerce numbers, tolerate unknown keys. The
// service validates each mapped entity against the REAL schemas and drops
// anything invalid; nothing here is fabricated.

export const extractedProjectSchema = z.object({
  name: z.string().min(1).max(160),
  role: z.string().max(120).optional(),
  description: z.string().max(2000).optional(),
  technologies: z.array(z.string().max(60)).max(40).optional(),
  url: z.string().max(300).optional(),
});
export type ExtractedProject = z.infer<typeof extractedProjectSchema>;

export const extractedResumeSchema = z
  .object({
    firstName: z.string().max(80).optional(),
    lastName: z.string().max(80).optional(),
    headline: z.string().max(160).optional(),
    email: z.string().max(160).optional(),
    phone: z.string().max(40).optional(),
    city: z.string().max(120).optional(),
    country: z.string().max(80).optional(),
    links: z
      .array(z.object({ type: z.string().max(20).optional(), url: z.string().max(300) }))
      .max(20)
      .optional(),
    professionalSummary: z.string().max(3000).optional(),
    skills: z.array(z.string().max(60)).max(80).optional(),
    workExperiences: z.array(structuredExperienceSchema).max(30).optional(),
    educations: z.array(structuredEducationSchema).max(30).optional(),
    projects: z.array(extractedProjectSchema).max(30).optional(),
  })
  .passthrough();
export type ExtractedResume = z.infer<typeof extractedResumeSchema>;

export const structureResponseSchema = z.object({
  workExperiences: z.array(structuredExperienceSchema).max(30).default([]),
  educations: z.array(structuredEducationSchema).max(30).default([]),
});
export type StructureResponse = z.infer<typeof structureResponseSchema>;

export type AiResult<T> = T & { source: "ai" | "fallback" };

export type SuggestionResult = AiResult<Suggestion>;
export type SkillSuggestionsResult = AiResult<SkillSuggestions>;
export type JobMatchAiResult = AiResult<{ result: JobMatchResult; commentary?: string }>;
