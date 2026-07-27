import type { ResumeDocument } from "@modules/resume/types";

export type Severity = "critical" | "important" | "suggestion" | "passed";

export type ResumeScoreCategoryId =
  | "content"
  | "impact"
  | "completeness"
  | "readability"
  | "formatting"
  | "keywords"
  | "structure";

export interface ScoreIssue {
  severity: Severity;
  message: string;
  sectionId?: string;
  recommendation?: string;
}

export interface CategoryScore {
  id: ResumeScoreCategoryId;
  label: string;
  score: number; // 0..100
  weight: number;
  issues: ScoreIssue[];
}

export interface ResumeScore {
  overall: number; // 0..100 weighted
  categories: CategoryScore[];
  disclaimer: string;
  generatedAt: string;
}

export interface ResumeScoreRule {
  id: string;
  category: ResumeScoreCategoryId;
  evaluate(resume: ResumeDocument): { score: number; issues: ScoreIssue[] };
}
