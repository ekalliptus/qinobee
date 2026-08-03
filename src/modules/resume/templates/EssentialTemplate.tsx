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
  "educations",
  "projects",
  "skillGroups",
  "certifications",
  "awards",
  "languages",
  "organisations",
  "volunteerExperiences",
  "customSections",
];

/**
 * Essential — clean, conservative ATS baseline. Single column, thin rule
 * under uppercase headings, no accent bars. This is the default template.
 */
export function EssentialTemplate({ resume }: ResumeTemplateProps) {
  const s = resolveSettings(resume, {
    accentColor: "#111827",
    fontFamily: "Lato, Arial, sans-serif",
  });
  const lang = resume.language;
  const pi = resume.personalInformation;
  const order = resolveSectionOrder(resume, DEFAULT_ORDER).filter((k) =>
    hasContent(resume, k),
  );

  const heading: CSSProperties = {
    fontSize: "0.95em",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    borderBottom: s.divider ? "1px solid #9ca3af" : "none",
    paddingBottom: "1mm",
    margin: `0 0 3mm`,
    color: s.accentColor,
  };

  return (
    <article style={pageStyle(s)}>
      <header style={{ textAlign: s.alignment, marginBottom: "5mm" }}>
        <h1 style={{ fontSize: "1.6em", fontWeight: 700, margin: 0, color: s.accentColor }}>
          {fullName(pi)}
        </h1>
        {pi.headline ? (
          <div style={{ fontSize: "1em", color: "#4b5563", marginTop: "1mm" }}>
            {pi.headline}
          </div>
        ) : null}
        <ContactLine
          resume={resume}
          showLinks={s.showLinks}
          style={{ marginTop: "2mm", fontSize: "0.85em", color: "#6b7280" }}
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
