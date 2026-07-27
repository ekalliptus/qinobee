import type { CSSProperties } from "react";
import type { ResumeTemplateProps } from "./types";
import { resolveSettings, pageStyle } from "./settings";
import { fullName } from "./name";
import { ContactLine, SkillGroupList } from "./shared";
import {
  resolveSectionOrder,
  hasContent,
  sectionLabel,
  SectionBody,
  type SectionKey,
} from "./sections";

// Formal CV ordering: education, then research/awards/publications-like.
const DEFAULT_ORDER: SectionKey[] = [
  "professionalSummary",
  "educations",
  "workExperiences",
  "projects",
  "awards",
  "certifications",
  "organisations",
  "volunteerExperiences",
  "skillGroups",
  "languages",
  "customSections",
];

/**
 * Academic — formal, dense CV. Numbered sections, serif body, tight spacing,
 * built to carry long lists (publications, coursework, achievements) without
 * clipping. Single column.
 */
export function AcademicTemplate({ resume }: ResumeTemplateProps) {
  const s = resolveSettings(resume, {
    accentColor: "#111827",
    lineHeight: 1.4,
    sectionSpacing: 5,
    fontFamily: "'Times New Roman', Georgia, serif",
  });
  const lang = resume.language;
  const pi = resume.personalInformation;
  const order = resolveSectionOrder(resume, DEFAULT_ORDER).filter((k) =>
    hasContent(resume, k),
  );

  const heading: CSSProperties = {
    fontSize: "1em",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    borderBottom: s.divider ? "2px solid #111827" : "none",
    paddingBottom: "0.5mm",
    margin: "0 0 2mm",
    color: s.accentColor,
  };

  return (
    <article style={pageStyle(s)}>
      <header
        style={{
          textAlign: s.alignment,
          marginBottom: "4mm",
          paddingBottom: "2mm",
          borderBottom: "1px solid #9ca3af",
        }}
      >
        <h1
          style={{ fontSize: "1.8em", margin: 0, color: s.accentColor }}
        >
          {fullName(pi)}
        </h1>
        {pi.headline ? (
          <div style={{ fontSize: "1em", color: "#374151" }}>{pi.headline}</div>
        ) : null}
        <ContactLine
          resume={resume}
          showLinks={s.showLinks}
          style={{ marginTop: "1mm", fontSize: "0.85em", color: "#4b5563" }}
        />
      </header>

      {order.map((key, i) => (
        <section key={key} style={{ marginBottom: `${s.sectionSpacing}mm` }}>
          <h2 style={heading}>
            {i + 1}. {sectionLabel(key, lang)}
          </h2>
          {key === "skillGroups" ? (
            <SkillGroupList groups={resume.skillGroups} />
          ) : (
            <SectionBody resume={resume} sectionKey={key} language={lang} />
          )}
        </section>
      ))}
    </article>
  );
}
