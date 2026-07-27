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
    fontFamily: "Georgia, 'Times New Roman', serif",
  });
  const lang = resume.language;
  const pi = resume.personalInformation;
  const order = resolveSectionOrder(resume, DEFAULT_ORDER).filter((k) =>
    hasContent(resume, k),
  );

  const heading: CSSProperties = {
    fontSize: "1em",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    borderBottom: s.divider ? "1px solid #d1d5db" : "none",
    paddingBottom: "1mm",
    margin: `0 0 2mm`,
    color: s.accentColor,
  };

  return (
    <article style={pageStyle(s)}>
      <header style={{ textAlign: s.alignment, marginBottom: "3mm" }}>
        <h1 style={{ fontSize: "1.9em", margin: 0, color: s.accentColor }}>
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
          style={{ marginTop: "1.5mm", fontSize: "0.9em", color: "#374151" }}
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
