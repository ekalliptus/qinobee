import type { ReactNode } from "react";
import type { ResumeDocument } from "@modules/resume/types";
import type { RenderAiAssist } from "./AiPanel";
import { STAGES, type StageId } from "./stages";
import PersonalInfoSection from "./sections/PersonalInfoSection";
import SummarySection from "./sections/SummarySection";
import WorkExperienceSection from "./sections/WorkExperienceSection";
import ProjectsSection from "./sections/ProjectsSection";
import SkillsSection from "./sections/SkillsSection";
import EducationSection from "./sections/EducationSection";
import OrganisationsSection from "./sections/OrganisationsSection";
import VolunteerSection from "./sections/VolunteerSection";
import CertificationsSection from "./sections/CertificationsSection";
import AwardsSection from "./sections/AwardsSection";
import LanguagesSection from "./sections/LanguagesSection";
import CustomSectionsSection from "./sections/CustomSectionsSection";

type Updater = (fn: (prev: ResumeDocument) => ResumeDocument) => void;

const GUIDANCE: Record<StageId, string> = {
  personal: "Your name, contact details, and professional links.",
  professional: "Summary, work history, projects, and skills — the core of your CV.",
  education: "Degrees, institutions, and academic achievements.",
  organization: "Organizations you belong to and volunteer roles.",
  other: "Certifications, awards, languages, and any custom sections.",
  review: "Check completeness and export your résumé.",
};

const BTN =
  "neo-button min-h-[44px] px-4 text-sm bg-[var(--color-white)] text-[var(--color-ink)]";

function StageSections(props: {
  stage: StageId;
  doc: ResumeDocument;
  update: Updater;
  renderAiAssist?: RenderAiAssist;
}) {
  const { doc, update, renderAiAssist } = props;
  switch (props.stage) {
    case "personal":
      return <PersonalInfoSection doc={doc} update={update} />;
    case "professional":
      return (
        <div className="flex flex-col gap-8">
          <SummarySection doc={doc} update={update} renderAiAssist={renderAiAssist} />
          <WorkExperienceSection doc={doc} update={update} renderAiAssist={renderAiAssist} />
          <ProjectsSection doc={doc} update={update} />
          <SkillsSection doc={doc} update={update} />
        </div>
      );
    case "education":
      return <EducationSection doc={doc} update={update} />;
    case "organization":
      return (
        <div className="flex flex-col gap-8">
          <OrganisationsSection doc={doc} update={update} />
          <VolunteerSection doc={doc} update={update} />
        </div>
      );
    case "other":
      return (
        <div className="flex flex-col gap-8">
          <CertificationsSection doc={doc} update={update} />
          <AwardsSection doc={doc} update={update} />
          <LanguagesSection doc={doc} update={update} />
          <CustomSectionsSection doc={doc} update={update} />
        </div>
      );
    case "review":
      return null;
  }
}

export default function StageForm(props: {
  stage: StageId;
  doc: ResumeDocument;
  update: Updater;
  renderAiAssist?: RenderAiAssist;
  onBack?: () => void;
  onNext?: () => void;
  reviewBody?: ReactNode;
}) {
  const meta = STAGES.find((s) => s.id === props.stage)!;
  const idx = STAGES.findIndex((s) => s.id === props.stage);
  const isFirst = idx === 0;
  const isLast = idx === STAGES.length - 1;

  return (
    <div className="neo-card flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold">{meta.label}</h2>
        <p className="text-sm text-[var(--color-ink)]/70">{GUIDANCE[props.stage]}</p>
      </div>

      {props.stage === "review" ? props.reviewBody : (
        <StageSections
          stage={props.stage}
          doc={props.doc}
          update={props.update}
          renderAiAssist={props.renderAiAssist}
        />
      )}

      <div className="mt-2 flex items-center justify-between gap-2 border-t-2 border-[var(--color-ink)] pt-4">
        <button type="button" className={BTN} disabled={isFirst} onClick={props.onBack}>
          Back
        </button>
        {!isLast ? (
          <button
            type="button"
            className={`${BTN} bg-[var(--color-ink)] text-[var(--color-paper)]`}
            onClick={props.onNext}
          >
            Save &amp; Continue
          </button>
        ) : (
          <a
            href={`/app/resume/${props.doc.id}/export`}
            target="_blank"
            rel="noopener"
            className={`${BTN} bg-[var(--color-ink)] text-[var(--color-paper)]`}
          >
            Export PDF
          </a>
        )}
      </div>
    </div>
  );
}
