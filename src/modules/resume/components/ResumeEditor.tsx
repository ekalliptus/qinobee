import { useEffect, useState } from "react";
import type { ResumeDocument, UpdateResumeInput } from "@modules/resume/types";
import { useResumeEditorStore, type SaveResult } from "./store";
import type { SaveStatus } from "./save-reconcile";
import SectionNav from "./SectionNav";
import { SECTIONS, type SectionKey } from "./sections/keys";
import PersonalInfoSection from "./sections/PersonalInfoSection";
import SummarySection from "./sections/SummarySection";
import WorkExperienceSection from "./sections/WorkExperienceSection";
import EducationSection from "./sections/EducationSection";
import ProjectsSection from "./sections/ProjectsSection";
import SkillsSection from "./sections/SkillsSection";
import Preview from "./Preview";
import TemplatePanel from "./TemplatePanel";
import ScorePanel from "./ScorePanel";
import MatchPanel from "./MatchPanel";
import { AiAssistField, type RenderAiAssist } from "./AiPanel";
import { features } from "@/config/features";
import type { ResumeTemplateSettings } from "@modules/resume/types";

/** Editable subset only — the exact keys accepted by updateResumeInputSchema. */
export function toPatch(doc: ResumeDocument): UpdateResumeInput {
  return {
    title: doc.title,
    language: doc.language,
    templateId: doc.templateId,
    status: doc.status,
    personalInformation: doc.personalInformation,
    professionalSummary: doc.professionalSummary,
    workExperiences: doc.workExperiences,
    educations: doc.educations,
    projects: doc.projects,
    organisations: doc.organisations,
    volunteerExperiences: doc.volunteerExperiences,
    certifications: doc.certifications,
    awards: doc.awards,
    skillGroups: doc.skillGroups,
    languages: doc.languages,
    customSections: doc.customSections,
    sectionOrder: doc.sectionOrder,
    hiddenSections: doc.hiddenSections,
    templateSettings: doc.templateSettings,
  };
}

async function save(doc: ResumeDocument, revision: number): Promise<SaveResult> {
  const patch = toPatch(doc);
  const res = await fetch(`/api/resume/${doc.id}/autosave`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ revision, patch }),
  });
  if (res.status === 409) return { conflict: true };
  if (!res.ok) throw new Error(`Save failed: ${res.status}`);
  const json = (await res.json()) as { revision: number };
  return { revision: json.revision };
}

const STATUS_LABEL: Record<SaveStatus, string> = {
  idle: "",
  dirty: "Unsaved changes",
  saving: "Saving…",
  saved: "Saved",
  failed: "Save failed — will retry",
  conflict: "Editing conflict",
  offline: "Offline changes",
};

const BTN = "neo-button min-h-[44px] px-3 text-sm bg-[var(--color-white)] text-[var(--color-ink)]";

function ActiveSection(props: {
  active: SectionKey;
  doc: ResumeDocument;
  update: (fn: (prev: ResumeDocument) => ResumeDocument) => void;
  renderAiAssist?: RenderAiAssist;
}) {
  switch (props.active) {
    case "personalInformation":
      return <PersonalInfoSection doc={props.doc} update={props.update} />;
    case "professionalSummary":
      return <SummarySection doc={props.doc} update={props.update} renderAiAssist={props.renderAiAssist} />;
    case "workExperiences":
      return <WorkExperienceSection doc={props.doc} update={props.update} renderAiAssist={props.renderAiAssist} />;
    case "educations":
      return <EducationSection doc={props.doc} update={props.update} />;
    case "projects":
      return <ProjectsSection doc={props.doc} update={props.update} />;
    case "skillGroups":
      return <SkillsSection doc={props.doc} update={props.update} />;
  }
}

type MobileTab = "edit" | "preview" | "score";

export default function ResumeEditor(props: { initialDoc: ResumeDocument }) {
  const store = useResumeEditorStore(props.initialDoc, { save });
  const [active, setActive] = useState<SectionKey>("personalInformation");
  const [mobileTab, setMobileTab] = useState<MobileTab>("edit");
  const [conflictDismissed, setConflictDismissed] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [showMatch, setShowMatch] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);

  useEffect(() => {
    if (!features.aiAssist) return;
    let alive = true;
    fetch("/api/resume/ai/consent")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { consent?: boolean } | null) => {
        if (alive && d?.consent) setAiConsent(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const renderAiAssist: RenderAiAssist | undefined = features.aiAssist
    ? ({ kind, text, onApply }) => (
        <AiAssistField
          kind={kind}
          text={text}
          consented={aiConsent}
          onConsented={() => setAiConsent(true)}
          onApply={onApply}
        />
      )
    : undefined;

  const templatePanel = (
    <TemplatePanel
      resume={store.doc}
      onTemplateChange={(id) => store.update({ templateId: id })}
      onSettingsChange={(patch: Partial<ResumeTemplateSettings>) =>
        store.update({
          templateSettings: { ...store.doc.templateSettings, ...patch },
        })
      }
      onReset={() => store.update({ templateSettings: {} })}
    />
  );

  const status = store.save.status;
  useEffect(() => {
    if (status === "conflict") setConflictDismissed(false);
  }, [status]);

  const updateFn = (fn: (prev: ResumeDocument) => ResumeDocument) => store.update(fn);

  const nav = (
    <SectionNav doc={store.doc} active={active} onSelect={setActive} />
  );
  const form = (
    <ActiveSection active={active} doc={store.doc} update={updateFn} renderAiAssist={renderAiAssist} />
  );
  const previewPane = (
    <div className="flex min-w-0 flex-col gap-2">
      <h2 className="text-lg font-bold">Live preview</h2>
      <Preview resume={store.doc} />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div aria-live="polite" className="min-h-[24px] text-sm font-medium">
          {STATUS_LABEL[status]}
        </div>
        <div className="flex gap-2">
          <button type="button" className={BTN} disabled={!store.canUndo} onClick={store.undo}>
            Undo
          </button>
          <button type="button" className={BTN} disabled={!store.canRedo} onClick={store.redo}>
            Redo
          </button>
          <button type="button" className={BTN} onClick={store.saveNow}>
            Save now
          </button>
          <button
            type="button"
            className={BTN}
            aria-pressed={showTemplates}
            aria-expanded={showTemplates}
            onClick={() => setShowTemplates((v) => !v)}
          >
            Template
          </button>
          <button
            type="button"
            className={BTN}
            aria-pressed={showScore}
            aria-expanded={showScore}
            onClick={() => setShowScore((v) => !v)}
          >
            ATS Score
          </button>
          <button
            type="button"
            className={BTN}
            aria-pressed={showMatch}
            aria-expanded={showMatch}
            onClick={() => setShowMatch((v) => !v)}
          >
            Match With a Job
          </button>
          <a
            href={`/app/resume/${store.doc.id}/export`}
            target="_blank"
            rel="noopener"
            className={BTN}
            aria-label="Download PDF"
          >
            Download PDF
          </a>
        </div>
      </div>

      {/* Conflict banner */}
      {status === "conflict" && !conflictDismissed ? (
        <div role="alert" className="neo-card bg-[var(--color-yellow)] flex flex-col gap-2">
          <p className="font-semibold">This resume changed elsewhere.</p>
          <div className="flex gap-2">
            <button type="button" className={BTN} onClick={() => location.reload()}>
              Reload latest
            </button>
            <button type="button" className={BTN} onClick={() => setConflictDismissed(true)}>
              Keep editing
            </button>
          </div>
        </div>
      ) : null}

      {/* Template + appearance panel */}
      {showTemplates ? (
        <div className="neo-card">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-bold">Template &amp; appearance</h2>
            <button
              type="button"
              className={BTN}
              onClick={() => setShowTemplates(false)}
            >
              Close
            </button>
          </div>
          {templatePanel}
        </div>
      ) : null}

      {/* ATS Score panel (desktop toggle; always available on mobile Score tab) */}
      {showScore ? (
        <div className="hidden md:block">
          <ScorePanel resumeId={store.doc.id} />
        </div>
      ) : null}

      {/* Match With a Job panel */}
      {showMatch ? <MatchPanel resumeId={store.doc.id} /> : null}

      {/* Mobile segmented control */}
      <div className="flex gap-2 md:hidden" role="tablist" aria-label="Editor view">
        {(["edit", "preview", "score"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={mobileTab === t}
            className={`neo-button min-h-[44px] flex-1 px-2 text-sm ${
              mobileTab === t
                ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                : "bg-[var(--color-white)] text-[var(--color-ink)]"
            }`}
            onClick={() => setMobileTab(t)}
          >
            {t === "edit" ? "Edit" : t === "preview" ? "Preview" : "Score"}
          </button>
        ))}
      </div>

      {/* Mobile view */}
      <div className="flex flex-col gap-4 md:hidden">
        {mobileTab === "edit" ? (
          <>
            {nav}
            {form}
          </>
        ) : mobileTab === "preview" ? (
          <Preview resume={store.doc} />
        ) : (
          <ScorePanel resumeId={store.doc.id} />
        )}
      </div>

      {/* Desktop 3-pane grid */}
      <div className="hidden gap-4 md:grid md:grid-cols-[minmax(0,220px)_minmax(0,1fr)_minmax(0,360px)]">
        <div>{nav}</div>
        <div className="min-w-0">{form}</div>
        <div className="min-w-0">{previewPane}</div>
      </div>
    </div>
  );
}

export { SECTIONS };
