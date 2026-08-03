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

const DEFAULT_ORDER: SectionKey[] = [
  "professionalSummary",
  "workExperiences",
  "projects",
  "educations",
  "skillGroups",
  "certifications",
  "awards",
  "languages",
  "organisations",
  "volunteerExperiences",
  "customSections",
];

/**
 * Modern — bold sans-serif headings with a coloured accent bar to the left,
 * generous whitespace. Single column, contemporary feel.
 */
export function ModernTemplate({ resume }: ResumeTemplateProps) {
  const s = resolveSettings(resume, {
    accentColor: "#2563eb",
    sectionSpacing: 8,
    fontFamily: "Calibri, 'Segoe UI', Roboto, sans-serif",
  });
  const lang = resume.language;
  const pi = resume.personalInformation;
  const order = resolveSectionOrder(resume, DEFAULT_ORDER).filter((k) =>
    hasContent(resume, k),
  );

  const heading: CSSProperties = {
    fontSize: "1.05em",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    borderLeft: `3px solid ${s.accentColor}`,
    paddingLeft: "3mm",
    margin: "0 0 2mm",
    color: "#111827",
  };

  return (
    <article style={pageStyle(s)}>
      <header
        style={{
          textAlign: s.alignment,
          marginBottom: "5mm",
          borderBottom: `2px solid ${s.accentColor}`,
          paddingBottom: "3mm",
        }}
      >
        <h1
          style={{
            fontSize: "2.2em",
            fontWeight: 800,
            margin: 0,
            color: s.accentColor,
          }}
        >
          {fullName(pi)}
        </h1>
        {pi.headline ? (
          <div style={{ fontSize: "1.1em", color: "#374151", marginTop: "1mm" }}>
            {pi.headline}
          </div>
        ) : null}
        <ContactLine
          resume={resume}
          showLinks={s.showLinks}
          style={{ marginTop: "2mm", fontSize: "0.9em", color: "#4b5563" }}
        />
      </header>

      {order.map((key) => (
        <section key={key} style={{ marginBottom: `${s.sectionSpacing}mm` }}>
          <h2 style={heading}>{sectionLabel(key, lang)}</h2>
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
