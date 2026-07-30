import type { CSSProperties } from "react";
import type { ResumeDocument } from "@modules/resume/types";

/**
 * templateSettings is stored as a permissive Record<string, unknown>
 * (Task 6.2 builds the editing UI). Read it defensively with fallbacks.
 */
export interface ResolvedSettings {
  fontFamily: string;
  fontScale: number;
  lineHeight: number;
  sectionSpacing: number; // mm between sections
  margin: number; // mm page padding
  headingStyle: string;
  accentColor: string;
  divider: boolean;
  alignment: "left" | "center";
  showPhoto: boolean;
  showLinks: boolean;
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function str(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim() ? v : fallback;
}
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

export function resolveSettings(
  resume: ResumeDocument,
  defaults: Partial<ResolvedSettings> = {},
): ResolvedSettings {
  const s = resume.templateSettings ?? {};
  const align = s["alignment"];
  return {
    fontFamily: str(
      s["fontFamily"],
      defaults.fontFamily ??
        "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    ),
    fontScale: num(s["fontScale"], defaults.fontScale ?? 1),
    lineHeight: num(s["lineHeight"], defaults.lineHeight ?? 1.45),
    sectionSpacing: num(s["sectionSpacing"], defaults.sectionSpacing ?? 7),
    margin: num(s["margin"], defaults.margin ?? 16),
    headingStyle: str(s["headingStyle"], defaults.headingStyle ?? "default"),
    accentColor: str(s["accentColor"], defaults.accentColor ?? "#1f2937"),
    divider: bool(s["divider"], defaults.divider ?? true),
    alignment:
      align === "center" || align === "left"
        ? align
        : (defaults.alignment ?? "left"),
    showPhoto: bool(s["showPhoto"], defaults.showPhoto ?? true),
    showLinks: bool(s["showLinks"], defaults.showLinks ?? true),
  };
}

/** Base A4 page styles shared by every template. */
export function pageStyle(s: ResolvedSettings): CSSProperties {
  return {
    width: "210mm",
    minHeight: "297mm",
    boxSizing: "border-box",
    padding: `${s.margin}mm`,
    background: "#ffffff",
    color: "#111827",
    fontFamily: s.fontFamily,
    fontSize: `${11 * s.fontScale}pt`,
    lineHeight: s.lineHeight,
  };
}
