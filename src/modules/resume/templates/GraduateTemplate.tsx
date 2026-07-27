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

// Education-forward ordering for students / new grads.
const DEFAULT_ORDER: SectionKey[] = [
  "professionalSummary",
  "educations",
  "projects",
  "workExperiences",
  "skillGroups",
  "organisations",
  "volunteerExperiences",
  "certifications",
  "awards",
  "languages",
  "customSections",
];

/**
 * Graduate — student-friendly, education first. Rounded accent chip headings,
 * airy spacing, friendly sans-serif. Single column.
 */
export function GraduateTemplate({ resume }: ResumeTemplateProps) {
  const s = resolveSettings(resume, {
    accentColor: "#0d9488",
    fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif",
  });
  const lang = resume.language;
  const pi = resume.personalInformation;
  const order = resolveSectionOrder(resume, DEFAULT_ORDER).filter((k) =>
    hasContent(resume, k),
  );

  const heading: CSSProperties = {
    display: "inline-block",
    fontSize: "0.95em",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    background: s.accentColor,
    color: "#ffffff",
    padding: "1mm 3mm",
    borderRadius: "2mm",
    margin: "0 0 2.5mm",
  };

  return (
    <article style={pageStyle(s)}>
      <header style={{ textAlign: s.alignment, marginBottom: "4mm" }}>
        <h1 style={{ fontSize: "2em", margin: 0, color: s.accentColor }}>
          {fullName(pi)}
        </h1>
        {pi.headline ? (
          <div style={{ fontSize: "1.05em", color: "#374151" }}>
            {pi.headline}
          </div>
        ) : null}
        <ContactLine
          resume={resume}
          showLinks={s.showLinks}
          style={{ marginTop: "1.5mm", fontSize: "0.9em", color: "#4b5563" }}
        />
      </header>

      {order.map((key) => (
        <section key={key} style={{ marginBottom: `${s.sectionSpacing}mm` }}>
          <div>
            <h2 style={heading}>{sectionLabel(key, lang)}</h2>
          </div>
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
