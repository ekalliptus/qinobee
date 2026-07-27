import type { ResumeDocument } from "@modules/resume/types";
import type { ResumeScoreRule, ScoreIssue } from "./types";
import {
  allSkills,
  countWords,
  hasActionVerb,
  hasNumber,
  isBlank,
  isPassiveVoiceish,
  isSectionEmpty,
  visibleSections,
} from "@modules/resume/utils/empty";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

function allBullets(resume: ResumeDocument): string[] {
  return resume.workExperiences.flatMap((w) => w.bullets).filter((b) => !isBlank(b));
}

// ---- Completeness ---------------------------------------------------------

const completenessRule: ResumeScoreRule = {
  id: "completeness.core",
  category: "completeness",
  evaluate(resume) {
    const issues: ScoreIssue[] = [];
    const p = resume.personalInformation;
    // 6 checks, weighted; name + email are critical.
    let score = 0;

    if (isBlank(p.firstName)) {
      issues.push({
        severity: "critical",
        message: "Your name is missing.",
        sectionId: "personalInformation",
        recommendation: "Add your first name so recruiters can identify you.",
      });
    } else {
      score += 20;
    }

    if (isBlank(p.email) || !EMAIL_RE.test(p.email)) {
      issues.push({
        severity: "critical",
        message: "A valid email address is missing.",
        sectionId: "personalInformation",
        recommendation: "Add a professional email address for contact.",
      });
    } else {
      score += 20;
    }

    if (isSectionEmpty(resume, "professionalSummary")) {
      issues.push({
        severity: "important",
        message: "No professional summary.",
        sectionId: "professionalSummary",
        recommendation: "Add a 2-4 sentence summary of your value.",
      });
    } else {
      score += 15;
    }

    const hasExperienceOrProject =
      !isSectionEmpty(resume, "workExperiences") ||
      !isSectionEmpty(resume, "projects");
    if (!hasExperienceOrProject) {
      issues.push({
        severity: "critical",
        message: "No work experience or projects.",
        sectionId: "workExperiences",
        recommendation: "Add at least one work experience or project.",
      });
    } else {
      score += 25;
    }

    if (isSectionEmpty(resume, "educations")) {
      issues.push({
        severity: "suggestion",
        message: "No education listed.",
        sectionId: "educations",
        recommendation: "Add your education history if relevant.",
      });
    } else {
      score += 10;
    }

    if (isSectionEmpty(resume, "skillGroups")) {
      issues.push({
        severity: "important",
        message: "No skills listed.",
        sectionId: "skillGroups",
        recommendation: "Add a skills section with relevant keywords.",
      });
    } else {
      score += 10;
    }

    return { score, issues };
  },
};

// ---- Content Quality ------------------------------------------------------

const contentRule: ResumeScoreRule = {
  id: "content.quality",
  category: "content",
  evaluate(resume) {
    const issues: ScoreIssue[] = [];
    let score = 100;

    const summary = resume.professionalSummary ?? "";
    if (isBlank(summary)) {
      score -= 30;
      issues.push({
        severity: "important",
        message: "Professional summary is empty.",
        sectionId: "professionalSummary",
        recommendation: "Write a concise summary (200-600 characters).",
      });
    } else {
      const len = summary.trim().length;
      if (len < 200) {
        score -= 15;
        issues.push({
          severity: "suggestion",
          message: "Professional summary is quite short.",
          sectionId: "professionalSummary",
          recommendation: "Expand your summary toward 200-600 characters.",
        });
      } else if (len > 600) {
        score -= 15;
        issues.push({
          severity: "suggestion",
          message: "Professional summary is quite long.",
          sectionId: "professionalSummary",
          recommendation: "Trim your summary toward 200-600 characters.",
        });
      }
    }

    if (isBlank(resume.personalInformation.headline)) {
      score -= 15;
      issues.push({
        severity: "suggestion",
        message: "No professional headline.",
        sectionId: "personalInformation",
        recommendation: "Add a short headline, e.g. your target role.",
      });
    }

    const exps = resume.workExperiences;
    const emptyBulletExps = exps.filter(
      (w) => w.bullets.filter((b) => !isBlank(b)).length === 0,
    ).length;
    if (exps.length > 0 && emptyBulletExps > 0) {
      score -= 25;
      issues.push({
        severity: "important",
        message: `${emptyBulletExps} experience entr${emptyBulletExps === 1 ? "y has" : "ies have"} no bullet points.`,
        sectionId: "workExperiences",
        recommendation: "Describe each role with 2-4 accomplishment bullets.",
      });
    }

    return { score: Math.max(0, score), issues };
  },
};

// ---- Impact ---------------------------------------------------------------

const impactRule: ResumeScoreRule = {
  id: "impact.bullets",
  category: "impact",
  evaluate(resume) {
    const issues: ScoreIssue[] = [];
    const bullets = allBullets(resume);

    if (bullets.length === 0) {
      return {
        score: 0,
        issues: [
          {
            severity: "important",
            message: "No accomplishment bullets to measure impact.",
            sectionId: "workExperiences",
            recommendation:
              "Add action-oriented bullets with measurable results.",
          },
        ],
      };
    }

    const actionCount = bullets.filter((b) => hasActionVerb(b)).length;
    const numberCount = bullets.filter((b) => hasNumber(b)).length;
    const passiveCount = bullets.filter((b) => isPassiveVoiceish(b)).length;

    const actionPct = pct(actionCount, bullets.length);
    const numberPct = pct(numberCount, bullets.length);

    // 60% action verbs, 40% measurable results.
    let score = Math.round(actionPct * 0.6 + numberPct * 0.4);

    if (actionPct < 70) {
      issues.push({
        severity: "suggestion",
        message: `Only ${actionPct}% of bullets start with a strong action verb.`,
        sectionId: "workExperiences",
        recommendation:
          "Start bullets with verbs like Led, Built, Improved, Reduced.",
      });
    }
    if (numberPct < 50) {
      issues.push({
        severity: "suggestion",
        message: `Only ${numberPct}% of bullets contain measurable results.`,
        sectionId: "workExperiences",
        recommendation: "Quantify impact with numbers, %, or currency.",
      });
    }
    if (passiveCount > 0) {
      issues.push({
        severity: "suggestion",
        message: `${passiveCount} bullet${passiveCount === 1 ? "" : "s"} may use passive voice.`,
        sectionId: "workExperiences",
        recommendation: "Rewrite in active voice for stronger impact.",
      });
    }

    return { score: Math.max(0, Math.min(100, score)), issues };
  },
};

// ---- Readability ----------------------------------------------------------

const readabilityRule: ResumeScoreRule = {
  id: "readability.text",
  category: "readability",
  evaluate(resume) {
    const issues: ScoreIssue[] = [];
    let score = 100;
    const bullets = allBullets(resume);

    const tooLong = bullets.filter((b) => b.trim().length > 240).length;
    if (tooLong > 0) {
      score -= Math.min(40, tooLong * 15);
      issues.push({
        severity: "important",
        message: `${tooLong} bullet${tooLong === 1 ? " is" : "s are"} very long (over 240 characters).`,
        sectionId: "workExperiences",
        recommendation: "Split long bullets into concise, scannable points.",
      });
    }

    const badCap = bullets.filter((b) => {
      const first = b.trim()[0];
      return first !== undefined && first !== first.toUpperCase();
    }).length;
    if (badCap > 0) {
      score -= Math.min(20, badCap * 10);
      issues.push({
        severity: "suggestion",
        message: `${badCap} bullet${badCap === 1 ? " does" : "s do"} not start with a capital letter.`,
        sectionId: "workExperiences",
        recommendation: "Capitalize the first word of each bullet.",
      });
    }

    // Dense summary paragraph (single very long run of words).
    if (countWords(resume.professionalSummary) > 120) {
      score -= 15;
      issues.push({
        severity: "suggestion",
        message: "Professional summary is dense.",
        sectionId: "professionalSummary",
        recommendation: "Keep the summary under ~120 words for readability.",
      });
    }

    return { score: Math.max(0, score), issues };
  },
};

// ---- Formatting -----------------------------------------------------------

const formattingRule: ResumeScoreRule = {
  id: "formatting.structure",
  category: "formatting",
  evaluate(resume) {
    const issues: ScoreIssue[] = [];
    let score = 100;

    // Empty but visible (referenced in sectionOrder) sections.
    const hidden = new Set(resume.hiddenSections);
    const orderedKeys = resume.sectionOrder.map((r) => r.key);
    const emptyVisible = orderedKeys.filter(
      (k) => !hidden.has(k) && isSectionEmpty(resume, k),
    );
    if (emptyVisible.length > 0) {
      score -= Math.min(40, emptyVisible.length * 15);
      issues.push({
        severity: "important",
        message: `${emptyVisible.length} visible section${emptyVisible.length === 1 ? " is" : "s are"} empty.`,
        recommendation: "Fill or hide empty sections.",
      });
    }

    // Date consistency: start <= end where both present.
    let badDates = 0;
    for (const w of resume.workExperiences) {
      if (w.endYear !== undefined) {
        const start = w.startYear * 12 + (w.startMonth - 1);
        const end = w.endYear * 12 + ((w.endMonth ?? 12) - 1);
        if (end < start) badDates++;
      }
    }
    if (badDates > 0) {
      score -= Math.min(30, badDates * 15);
      issues.push({
        severity: "important",
        message: `${badDates} experience entr${badDates === 1 ? "y has" : "ies have"} an end date before the start date.`,
        sectionId: "workExperiences",
        recommendation: "Fix start/end dates so they are chronological.",
      });
    }

    return { score: Math.max(0, score), issues };
  },
};

// ---- Keywords -------------------------------------------------------------

const keywordsRule: ResumeScoreRule = {
  id: "keywords.coverage",
  category: "keywords",
  evaluate(resume) {
    const issues: ScoreIssue[] = [];
    const skills = new Set(allSkills(resume).map((s) => s.toLowerCase()));
    const unique = skills.size;

    // Reward toward 8 distinct keywords.
    let score = Math.min(100, Math.round((unique / 8) * 100));

    if (unique === 0) {
      score = 0;
      issues.push({
        severity: "important",
        message: "No skills or keywords found.",
        sectionId: "skillGroups",
        recommendation: "Add at least 5-8 relevant skills/keywords.",
      });
    } else if (unique < 5) {
      issues.push({
        severity: "suggestion",
        message: `Only ${unique} distinct keyword${unique === 1 ? "" : "s"} found.`,
        sectionId: "skillGroups",
        recommendation: "Aim for at least 5-8 relevant skills/keywords.",
      });
    }

    return { score, issues };
  },
};

// ---- Section Structure ----------------------------------------------------

const structureRule: ResumeScoreRule = {
  id: "structure.sections",
  category: "structure",
  evaluate(resume) {
    const issues: ScoreIssue[] = [];
    const visible = visibleSections(resume);
    const count = visible.length;

    // Reward toward 4 meaningful sections.
    let score = Math.min(100, Math.round((count / 4) * 100));

    const hasExperience =
      !isSectionEmpty(resume, "workExperiences") ||
      !isSectionEmpty(resume, "projects");
    const hasEducation = !isSectionEmpty(resume, "educations");
    const hasSkills = !isSectionEmpty(resume, "skillGroups");

    const missing: string[] = [];
    if (!hasExperience) missing.push("experience or projects");
    if (!hasEducation) missing.push("education");
    if (!hasSkills) missing.push("skills");

    if (missing.length > 0) {
      score = Math.max(0, score - missing.length * 15);
      issues.push({
        severity: missing.length >= 3 ? "important" : "suggestion",
        message: `Missing core section(s): ${missing.join(", ")}.`,
        recommendation:
          "A strong resume includes experience, education, and skills.",
      });
    }

    if (count < 3) {
      issues.push({
        severity: "suggestion",
        message: `Only ${count} section${count === 1 ? "" : "s"} have content.`,
        recommendation: "Aim for at least 3-4 well-populated sections.",
      });
    }

    return { score, issues };
  },
};

export const RULES: ResumeScoreRule[] = [
  completenessRule,
  contentRule,
  impactRule,
  readabilityRule,
  formattingRule,
  keywordsRule,
  structureRule,
];
