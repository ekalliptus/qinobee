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
  "skillGroups",
  "awards",
  "certifications",
  "organisations",
  "projects",
  "languages",
  "volunteerExperiences",
  "customSections",
];

/**
 * Executive — refined serif, centered name header with a full-width rule,
 * small-caps centered headings. Senior, understated tone.
 */
export function ExecutiveTemplate({ resume }: ResumeTemplateProps) {
  const s = resolveSettings(resume, {
    accentColor: "#1f2937",
    lineHeight: 1.5,
    fontFamily: "Garamond, serif",
  });
  const lang = resume.language;
  const pi = resume.personalInformation;
  const order = resolveSectionOrder(resume, DEFAULT_ORDER).filter((k) =>
    hasContent(resume, k),
  );

  const heading: CSSProperties = {
    fontSize: "1em",
    fontVariant: "small-caps",
    letterSpacing: "0.12em",
    textAlign: "center",
    margin: "0 0 2mm",
    color: s.accentColor,
    borderBottom: s.divider ? "1px solid #9ca3af" : "none",
    paddingBottom: "1mm",
  };

  return (
    <article style={pageStyle(s)}>
      <header
        style={{
          textAlign: "center",
          marginBottom: "4mm",
          borderTop: `2px solid ${s.accentColor}`,
          borderBottom: `2px solid ${s.accentColor}`,
          padding: "3mm 0",
        }}
      >
        <h1
          style={{
            fontSize: "2.1em",
            letterSpacing: "0.06em",
            margin: 0,
            color: s.accentColor,
          }}
        >
          {fullName(pi)}
        </h1>
        {pi.headline ? (
          <div
            style={{
              fontSize: "1.05em",
              fontStyle: "italic",
              color: "#374151",
            }}
          >
            {pi.headline}
          </div>
        ) : null}
        <ContactLine
          resume={resume}
          showLinks={s.showLinks}
          style={{ marginTop: "1.5mm", fontSize: "0.88em", color: "#4b5563" }}
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
