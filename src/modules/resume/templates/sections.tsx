import type { CSSProperties, ReactNode } from "react";
import type {
  ResumeDocument,
  WorkExperience,
  Education,
  Project,
  Certification,
  Award,
  Organisation,
  VolunteerExperience,
  Language as LanguageSkill,
  CustomSection,
} from "@modules/resume/types";
import type { Language } from "./format";
import { formatDateRange, formatYearRange, formatTextRange } from "./format";
import { BulletList } from "./shared";

export type SectionKey =
  | "personalInformation"
  | "professionalSummary"
  | "workExperiences"
  | "educations"
  | "projects"
  | "skillGroups"
  | "certifications"
  | "awards"
  | "languages"
  | "organisations"
  | "volunteerExperiences"
  | "customSections";

/**
 * Resolve render order: honour resume.sectionOrder when present, drop
 * hiddenSections and the header (personalInformation is rendered by the
 * template header, not as a body section).
 */
export function resolveSectionOrder(
  resume: ResumeDocument,
  fallback: readonly SectionKey[],
): SectionKey[] {
  const hidden = new Set(resume.hiddenSections ?? []);
  const custom = (resume.sectionOrder ?? [])
    .map((r) => r.key as SectionKey)
    .filter((k) => KNOWN.has(k));
  const base = custom.length > 0 ? custom : [...fallback];
  const seen = new Set<SectionKey>();
  const out: SectionKey[] = [];
  for (const k of base) {
    if (k === "personalInformation") continue;
    if (hidden.has(k)) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

const KNOWN = new Set<SectionKey>([
  "personalInformation",
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
]);

export function hasContent(resume: ResumeDocument, key: SectionKey): boolean {
  switch (key) {
    case "professionalSummary":
      return Boolean(resume.professionalSummary?.trim());
    case "workExperiences":
      return resume.workExperiences.length > 0;
    case "educations":
      return resume.educations.length > 0;
    case "projects":
      return resume.projects.length > 0;
    case "skillGroups":
      return resume.skillGroups.some((g) =>
        g.skills.some((s) => s && s.trim()),
      );
    case "certifications":
      return resume.certifications.length > 0;
    case "awards":
      return resume.awards.length > 0;
    case "languages":
      return resume.languages.length > 0;
    case "organisations":
      return resume.organisations.length > 0;
    case "volunteerExperiences":
      return resume.volunteerExperiences.length > 0;
    case "customSections":
      return resume.customSections.length > 0;
    default:
      return false;
  }
}

export const SECTION_LABEL: Record<Language, Record<SectionKey, string>> = {
  en: {
    personalInformation: "Personal Information",
    professionalSummary: "Summary",
    workExperiences: "Experience",
    educations: "Education",
    projects: "Projects",
    skillGroups: "Skills",
    certifications: "Certifications",
    awards: "Awards",
    languages: "Languages",
    organisations: "Organisations",
    volunteerExperiences: "Volunteer Experience",
    customSections: "Additional",
  },
  id: {
    personalInformation: "Informasi Pribadi",
    professionalSummary: "Ringkasan",
    workExperiences: "Pengalaman",
    educations: "Pendidikan",
    projects: "Proyek",
    skillGroups: "Keahlian",
    certifications: "Sertifikasi",
    awards: "Penghargaan",
    languages: "Bahasa",
    organisations: "Organisasi",
    volunteerExperiences: "Pengalaman Relawan",
    customSections: "Tambahan",
  },
};

export function sectionLabel(key: SectionKey, language: Language): string {
  return SECTION_LABEL[language][key];
}

// ---- Small presentational primitives shared by section bodies -------------

const metaStyle: CSSProperties = { color: "#4b5563", fontSize: "0.92em" };

function EntryHeader({
  title,
  subtitle,
  meta,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: "4mm",
      }}
    >
      <div>
        <span style={{ fontWeight: 700 }}>{title}</span>
        {subtitle ? (
          <span style={{ fontWeight: 400 }}> — {subtitle}</span>
        ) : null}
      </div>
      {meta ? <div style={metaStyle}>{meta}</div> : null}
    </div>
  );
}

function place(city?: string, country?: string, remote?: boolean): string {
  const parts = [city, country].filter(Boolean);
  if (remote) parts.push("Remote");
  return parts.join(", ");
}

// ---- Section body renderers (content-only; templates style headings) ------

export function ExperienceBody({
  items,
  language,
  entryGap = "3mm",
}: {
  items: readonly WorkExperience[];
  language: Language;
  entryGap?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: entryGap }}>
      {items.map((w, i) => (
        <div key={i}>
          <EntryHeader
            title={w.jobTitle}
            subtitle={w.company}
            meta={formatDateRange(
              w.startYear,
              w.startMonth,
              w.endYear,
              w.endMonth,
              w.currentlyWorking,
              language,
            )}
          />
          {place(w.city, w.country, w.remote) ? (
            <div style={metaStyle}>{place(w.city, w.country, w.remote)}</div>
          ) : null}
          <BulletList items={w.bullets} />
          {w.skillsUsed.length > 0 ? (
            <div style={{ ...metaStyle, marginTop: "1mm" }}>
              {w.skillsUsed.join(", ")}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function EducationBody({
  items,
  language,
  entryGap = "3mm",
}: {
  items: readonly Education[];
  language: Language;
  entryGap?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: entryGap }}>
      {items.map((e, i) => {
        const degree = [e.degree, e.fieldOfStudy].filter(Boolean).join(", ");
        const gpa =
          e.gpa != null
            ? `GPA ${e.gpa}${e.maxGpa != null ? `/${e.maxGpa}` : ""}`
            : "";
        return (
          <div key={i}>
            <EntryHeader
              title={e.institution}
              subtitle={degree || e.level}
              meta={formatYearRange(
                e.startYear,
                e.endYear,
                e.currentlyStudying,
                language,
              )}
            />
            {[place(e.city, e.country), gpa].filter(Boolean).length > 0 ? (
              <div style={metaStyle}>
                {[place(e.city, e.country), gpa].filter(Boolean).join(" · ")}
              </div>
            ) : null}
            {e.description ? (
              <div style={{ marginTop: "1mm" }}>{e.description}</div>
            ) : null}
            {e.coursework && e.coursework.length > 0 ? (
              <div style={{ ...metaStyle, marginTop: "1mm" }}>
                {e.coursework.join(", ")}
              </div>
            ) : null}
            <BulletList items={e.achievements ?? []} />
          </div>
        );
      })}
    </div>
  );
}

export function ProjectsBody({
  items,
  entryGap = "3mm",
}: {
  items: readonly Project[];
  entryGap?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: entryGap }}>
      {items.map((p, i) => (
        <div key={i}>
          <EntryHeader
            title={
              p.projectUrl ? (
                <a
                  href={p.projectUrl}
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  {p.name}
                </a>
              ) : (
                p.name
              )
            }
            subtitle={p.role}
            meta={formatTextRange(p.startDate, p.endDate)}
          />
          {p.description ? (
            <div style={{ marginTop: "1mm" }}>{p.description}</div>
          ) : null}
          {p.technologies.length > 0 ? (
            <div style={{ ...metaStyle, marginTop: "1mm" }}>
              {p.technologies.join(", ")}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function CertificationsBody({
  items,
}: {
  items: readonly Certification[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5mm" }}>
      {items.map((c, i) => (
        <div key={i}>
          <span style={{ fontWeight: 600 }}>{c.name}</span>
          {c.issuer ? <span> — {c.issuer}</span> : null}
          {c.issueDate ? <span style={metaStyle}> ({c.issueDate})</span> : null}
        </div>
      ))}
    </div>
  );
}

export function AwardsBody({ items }: { items: readonly Award[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5mm" }}>
      {items.map((a, i) => (
        <div key={i}>
          <span style={{ fontWeight: 600 }}>{a.title}</span>
          {a.issuer ? <span> — {a.issuer}</span> : null}
          {a.date ? <span style={metaStyle}> ({a.date})</span> : null}
          {a.description ? (
            <div style={{ marginTop: "0.5mm" }}>{a.description}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function LanguagesBody({
  items,
}: {
  items: readonly LanguageSkill[];
}) {
  return (
    <div>
      {items
        .map((l) => (l.proficiency ? `${l.name} (${l.proficiency})` : l.name))
        .join(", ")}
    </div>
  );
}

export function OrgLikeBody({
  items,
  language,
  entryGap = "2.5mm",
}: {
  items: ReadonlyArray<Organisation | VolunteerExperience>;
  language: Language;
  entryGap?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: entryGap }}>
      {items.map((o, i) => {
        const name = "name" in o ? o.name : o.organisation;
        return (
          <div key={i}>
            <EntryHeader
              title={name}
              subtitle={o.role}
              meta={formatYearRange(
                o.startYear,
                o.endYear,
                o.currentlyActive,
                language,
              )}
            />
            {place(o.city, o.country) ? (
              <div style={metaStyle}>{place(o.city, o.country)}</div>
            ) : null}
            {o.description ? (
              <div style={{ marginTop: "1mm" }}>{o.description}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Dispatch a section key to its body renderer. */
export function SectionBody({
  resume,
  sectionKey,
  language,
}: {
  resume: ResumeDocument;
  sectionKey: SectionKey;
  language: Language;
}): ReactNode {
  switch (sectionKey) {
    case "professionalSummary":
      return <div>{resume.professionalSummary}</div>;
    case "workExperiences":
      return <ExperienceBody items={resume.workExperiences} language={language} />;
    case "educations":
      return <EducationBody items={resume.educations} language={language} />;
    case "projects":
      return <ProjectsBody items={resume.projects} />;
    case "skillGroups":
      return null; // rendered by template-specific SkillGroupList styling
    case "certifications":
      return <CertificationsBody items={resume.certifications} />;
    case "awards":
      return <AwardsBody items={resume.awards} />;
    case "languages":
      return <LanguagesBody items={resume.languages} />;
    case "organisations":
      return <OrgLikeBody items={resume.organisations} language={language} />;
    case "volunteerExperiences":
      return (
        <OrgLikeBody items={resume.volunteerExperiences} language={language} />
      );
    case "customSections":
      return <CustomSectionsBody items={resume.customSections} />;
    default:
      return null;
  }
}

export function CustomSectionsBody({
  items,
  entryGap = "3mm",
}: {
  items: readonly CustomSection[];
  entryGap?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: entryGap }}>
      {items.map((sec, i) => (
        <div key={i}>
          <div style={{ fontWeight: 700, marginBottom: "1mm" }}>
            {sec.title}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2mm" }}>
            {sec.items.map((it, j) => (
              <div key={j}>
                {it.heading ? (
                  <EntryHeader title={it.heading} subtitle={it.subheading} />
                ) : null}
                {it.description ? (
                  <div style={{ marginTop: "1mm" }}>{it.description}</div>
                ) : null}
                <BulletList items={it.bullets} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
