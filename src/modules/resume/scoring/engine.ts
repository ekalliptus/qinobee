import type { ResumeDocument } from "@modules/resume/types";
import type {
  CategoryScore,
  ResumeScore,
  ResumeScoreCategoryId,
  ScoreIssue,
  Severity,
} from "./types";
import { RULES } from "./rules";

export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  important: 1,
  suggestion: 2,
  passed: 3,
};

// Weights sum to 1.0. Completeness and impact matter most for ATS outcomes.
const CATEGORY_META: Record<
  ResumeScoreCategoryId,
  { label: string; weight: number }
> = {
  completeness: { label: "Completeness", weight: 0.22 },
  impact: { label: "Impact", weight: 0.18 },
  content: { label: "Content Quality", weight: 0.16 },
  keywords: { label: "Keywords", weight: 0.14 },
  readability: { label: "Readability", weight: 0.12 },
  formatting: { label: "Formatting", weight: 0.1 },
  structure: { label: "Section Structure", weight: 0.08 },
};

const DISCLAIMER =
  "This score is guidance based on common resume practices and does not guarantee a hiring outcome.";

const clamp = (n: number): number => Math.max(0, Math.min(100, n));

export function scoreResume(resume: ResumeDocument): ResumeScore {
  const byCategory = new Map<
    ResumeScoreCategoryId,
    { scores: number[]; issues: ScoreIssue[] }
  >();

  for (const rule of RULES) {
    const { score, issues } = rule.evaluate(resume);
    const bucket = byCategory.get(rule.category) ?? { scores: [], issues: [] };
    bucket.scores.push(clamp(score));
    bucket.issues.push(...issues);
    byCategory.set(rule.category, bucket);
  }

  const categories: CategoryScore[] = (
    Object.keys(CATEGORY_META) as ResumeScoreCategoryId[]
  ).map((id) => {
    const meta = CATEGORY_META[id];
    const bucket = byCategory.get(id) ?? { scores: [], issues: [] };
    const avg =
      bucket.scores.length === 0
        ? 0
        : bucket.scores.reduce((a, b) => a + b, 0) / bucket.scores.length;
    return {
      id,
      label: meta.label,
      score: Math.round(clamp(avg)),
      weight: meta.weight,
      issues: bucket.issues,
    };
  });

  const overall = clamp(
    Math.round(
      categories.reduce((sum, c) => sum + c.score * c.weight, 0),
    ),
  );

  return {
    overall,
    categories,
    disclaimer: DISCLAIMER,
    generatedAt: new Date().toISOString(),
  };
}

// Most severe issues across all categories, capped at n.
export function topIssues(score: ResumeScore, n: number): ScoreIssue[] {
  return score.categories
    .flatMap((c) => c.issues)
    .filter((i) => i.severity !== "passed")
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .slice(0, n);
}
