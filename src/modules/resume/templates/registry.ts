import type { ResumeTemplate } from "./types";
import { EssentialTemplate } from "./EssentialTemplate";
import { ModernTemplate } from "./ModernTemplate";
import { ExecutiveTemplate } from "./ExecutiveTemplate";
import { GraduateTemplate } from "./GraduateTemplate";
import { TechnicalTemplate } from "./TechnicalTemplate";
import { AcademicTemplate } from "./AcademicTemplate";

export const templates: ResumeTemplate[] = [
  {
    id: "essential",
    name: "Essential",
    description:
      "Clean, conservative single-column layout optimised for ATS parsing.",
    thumbnail: "/templates/essential.svg",
    supportsPhoto: false,
    layout: "single-column",
    category: "ats",
    premium: false,
    component: EssentialTemplate,
  },
  {
    id: "modern",
    name: "Modern",
    description:
      "Bold headings with an accent bar and generous whitespace for a contemporary look.",
    thumbnail: "/templates/modern.svg",
    supportsPhoto: true,
    layout: "single-column",
    category: "modern",
    premium: false,
    component: ModernTemplate,
  },
  {
    id: "executive",
    name: "Executive",
    description:
      "Refined serif with a centered header and small-caps sections for senior roles.",
    thumbnail: "/templates/executive.svg",
    supportsPhoto: false,
    layout: "single-column",
    category: "executive",
    premium: false,
    component: ExecutiveTemplate,
  },
  {
    id: "graduate",
    name: "Graduate",
    description:
      "Education-forward, student-friendly layout with chip-style section headings.",
    thumbnail: "/templates/graduate.svg",
    supportsPhoto: true,
    layout: "single-column",
    category: "ats",
    premium: false,
    component: GraduateTemplate,
  },
  {
    id: "technical",
    name: "Technical",
    description:
      "Two-column layout with a skills sidebar and monospace accents for engineers.",
    thumbnail: "/templates/technical.svg",
    supportsPhoto: false,
    layout: "two-column",
    category: "modern",
    premium: false,
    component: TechnicalTemplate,
  },
  {
    id: "academic",
    name: "Academic",
    description:
      "Formal, dense CV with numbered sections built to carry long lists.",
    thumbnail: "/templates/academic.svg",
    supportsPhoto: false,
    layout: "single-column",
    category: "academic",
    premium: false,
    component: AcademicTemplate,
  },
];

export const TEMPLATE_IDS = templates.map((t) => t.id);

export function listTemplates(): ResumeTemplate[] {
  return templates;
}

/** Returns the requested template, falling back to Essential for unknown ids. */
export function getTemplate(id: string): ResumeTemplate {
  return templates.find((t) => t.id === id) ?? templates[0]!;
}
