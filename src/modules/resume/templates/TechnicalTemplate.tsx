import type { CSSProperties } from "react";
import type { ResumeTemplateProps } from "./types";
import { resolveSettings, pageStyle } from "./settings";
import { fullName } from "./name";
import { ContactLine, SkillGroupList } from "./shared";
import {
  hasContent,
  sectionLabel,
  SectionBody,
  type SectionKey,
} from "./sections";

// Main column (most important, first in DOM for ATS).
const MAIN_ORDER: SectionKey[] = [
  "professionalSummary",
  "workExperiences",
  "projects",
  "educations",
  "customSections",
];
// Sidebar column (visually left, but rendered AFTER main in the DOM).
const SIDE_ORDER: SectionKey[] = [
  "skillGroups",
  "certifications",
  "languages",
  "awards",
  "organisations",
  "volunteerExperiences",
];

/**
 * Technical — two-column grid, monospace accents. The sidebar (skills, tools,
 * certs) is visually on the LEFT, but rendered AFTER the main content in the
 * DOM so ATS parsers read experience/projects first. Hidden sections respected.
 */
export function TechnicalTemplate({ resume }: ResumeTemplateProps) {
  const s = resolveSettings(resume, {
    accentColor: "#0f766e",
    fontFamily: "'Segoe UI', Roboto, Helvetica, sans-serif",
    sectionSpacing: 6,
  });
  const lang = resume.language;
  const pi = resume.personalInformation;
  const mono = "'SFMono-Regular', 'JetBrains Mono', Consolas, monospace";
  const hidden = new Set(resume.hiddenSections ?? []);
  const main = MAIN_ORDER.filter(
    (k) => !hidden.has(k) && hasContent(resume, k),
  );
  const side = SIDE_ORDER.filter(
    (k) => !hidden.has(k) && hasContent(resume, k),
  );

  const mainHeading: CSSProperties = {
    fontSize: "1.05em",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: s.accentColor,
    borderBottom: `2px solid ${s.accentColor}`,
    paddingBottom: "1mm",
    margin: "0 0 2mm",
  };
  const sideHeading: CSSProperties = {
    fontSize: "0.9em",
    fontWeight: 700,
    fontFamily: mono,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#ffffff",
    background: s.accentColor,
    padding: "1mm 2mm",
    margin: "0 0 2mm",
  };

  return (
    <article style={pageStyle(s)}>
      <header
        style={{
          marginBottom: "4mm",
          borderBottom: `1px solid #d1d5db`,
          paddingBottom: "2mm",
        }}
      >
        <h1 style={{ fontSize: "2em", margin: 0, color: "#111827" }}>
          {fullName(pi)}
        </h1>
        {pi.headline ? (
          <div
            style={{ fontFamily: mono, color: s.accentColor, fontSize: "1em" }}
          >
            {pi.headline}
          </div>
        ) : null}
        <ContactLine
          resume={resume}
          showLinks={s.showLinks}
          style={{ marginTop: "1.5mm", fontSize: "0.85em", color: "#4b5563" }}
        />
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "62mm 1fr",
          columnGap: "8mm",
        }}
      >
        {/* Main content FIRST in DOM (ATS reads this first), placed in col 2. */}
        <div style={{ gridColumn: 2, gridRow: 1 }}>
          {main.map((key) => (
            <section key={key} style={{ marginBottom: `${s.sectionSpacing}mm` }}>
              <h2 style={mainHeading}>{sectionLabel(key, lang)}</h2>
              <SectionBody resume={resume} sectionKey={key} language={lang} />
            </section>
          ))}
        </div>

        {/* Sidebar rendered AFTER main, visually placed in col 1. */}
        <div style={{ gridColumn: 1, gridRow: 1 }}>
          {side.map((key) => (
            <section key={key} style={{ marginBottom: `${s.sectionSpacing}mm` }}>
              <h2 style={sideHeading}>{sectionLabel(key, lang)}</h2>
              {key === "skillGroups" ? (
                <SkillGroupList groups={resume.skillGroups} as="block" />
              ) : (
                <SectionBody resume={resume} sectionKey={key} language={lang} />
              )}
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
