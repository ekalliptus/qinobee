import type { ComponentType } from "react";
import type { ResumeDocument } from "@modules/resume/types";

export interface ResumeTemplateProps {
  resume: ResumeDocument;
  /** Rendering context: on-screen preview vs paged print/export. */
  mode?: "preview" | "print";
}

export type ResumeTemplateComponent = ComponentType<ResumeTemplateProps>;

export interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  supportsPhoto: boolean;
  layout: "single-column" | "two-column";
  category: "ats" | "modern" | "academic" | "executive";
  premium: boolean;
  component: ResumeTemplateComponent;
}
