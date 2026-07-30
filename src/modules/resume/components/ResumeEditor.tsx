import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
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

/** Coloured dot per save status for the topbar indicator. */
const STATUS_DOT: Record<SaveStatus, string> = {
  idle: "bg-[var(--color-muted)]",
  dirty: "bg-[var(--color-warning)]",
  saving: "bg-[var(--color-blue)]",
  saved: "bg-[var(--color-success)]",
  failed: "bg-[var(--color-red)]",
  conflict: "bg-[var(--color-red)]",
  offline: "bg-[var(--color-muted)]",
};

const BTN = "neo-button min-h-[44px] px-3 text-sm bg-[var(--color-white)] text-[var(--color-ink)]";

/** Compact icon-like button (≥44px target) used by the back link + More trigger. */
const ICON_BTN =
  "neo-button min-h-[44px] min-w-[44px] px-2 text-sm bg-[var(--color-white)] text-[var(--color-ink)]";

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
  const mobileTabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [conflictDismissed, setConflictDismissed] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [showMatch, setShowMatch] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);

  // --- Inline-editable résumé title -------------------------------------
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(store.doc.title);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  // Keep the draft in sync with the committed title when not editing, so a
  // reload or external change to store.doc.title is reflected on next edit.
  useEffect(() => {
    if (!editingTitle) setTitleDraft(store.doc.title);
  }, [store.doc.title, editingTitle]);

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  const commitTitle = () => {
    const next = titleDraft.trim();
    setEditingTitle(false);
    if (next && next !== store.doc.title) {
      store.update({ title: next });
    } else {
      setTitleDraft(store.doc.title);
    }
  };
  const cancelTitle = () => {
    setTitleDraft(store.doc.title);
    setEditingTitle(false);
  };

  // --- Overflow "More" menu ---------------------------------------------
  const [moreOpen, setMoreOpen] = useState(false);
  const moreBtnRef = useRef<HTMLButtonElement | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const moreFirstItemRef = useRef<HTMLButtonElement | null>(null);

  // Click-outside closes the menu (only while open).
  useEffect(() => {
    if (!moreOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (moreMenuRef.current && target && !moreMenuRef.current.contains(target)) {
        setMoreOpen(false);
        moreBtnRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [moreOpen]);

  // When the menu opens, move focus to the first item (a11y).
  useEffect(() => {
    if (moreOpen) moreFirstItemRef.current?.focus();
  }, [moreOpen]);

  // Escape closes the menu and restores focus to the trigger. We attach a
  // keydown listener scoped to the menu container so it never swallows Escape
  // from inputs elsewhere (e.g. the title field).
  const onMenuKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setMoreOpen(false);
      moreBtnRef.current?.focus();
    }
  };

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

  const activeLabel = SECTIONS.find((s) => s.key === active)?.label ?? "";

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar: left group (back / title / save status) · right primary · More overflow */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Left group: back link + inline-editable title + save status */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <a
            href="/app/resume"
            aria-label="Back to my resumes"
            className={`${ICON_BTN} shrink-0`}
          >
            ←
          </a>

          {editingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={titleDraft}
              maxLength={160}
              aria-label="Edit résumé title"
              className="neo-input min-w-0 flex-1 text-sm font-semibold sm:max-w-[16rem]"
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitTitle();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  cancelTitle();
                }
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setTitleDraft(store.doc.title);
                setEditingTitle(true);
              }}
              className="neo-button min-h-[44px] min-w-0 max-w-full truncate bg-transparent px-2 text-left text-sm font-semibold text-[var(--color-ink)]"
              title={store.doc.title}
              aria-label={`Edit résumé title: ${store.doc.title}`}
            >
              <span className="truncate">{store.doc.title}</span>
            </button>
          )}

          <span
            aria-live="polite"
            className="flex shrink-0 items-center gap-1.5 text-sm font-medium"
          >
            <span
              aria-hidden="true"
              className={`inline-block h-2.5 w-2.5 rounded-full border-2 border-[var(--color-ink)] ${STATUS_DOT[status]}`}
            />
            <span className="hidden sm:inline">{STATUS_LABEL[status]}</span>
          </span>
        </div>

        {/* Right primary group */}
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className={BTN}
            disabled={!store.canUndo}
            onClick={store.undo}
            aria-label="Undo"
          >
            Undo
          </button>
          <button
            type="button"
            className={BTN}
            disabled={!store.canRedo}
            onClick={store.redo}
            aria-label="Redo"
          >
            Redo
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
          <a
            href={`/app/resume/${store.doc.id}/export`}
            target="_blank"
            rel="noopener"
            className={BTN}
            aria-label="Export PDF"
          >
            Export PDF
          </a>

          {/* Overflow More menu (absolute, never pushes layout width) */}
          <div className="relative">
            <button
              ref={moreBtnRef}
              type="button"
              className={ICON_BTN}
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              aria-controls="editor-more-menu"
              onClick={() => setMoreOpen((v) => !v)}
            >
              More
              <span aria-hidden="true">▾</span>
            </button>
            {moreOpen ? (
              <div
                ref={moreMenuRef}
                id="editor-more-menu"
                role="menu"
                className="neo-card absolute right-0 top-[calc(100%+0.5rem)] z-20 flex w-56 flex-col gap-2 p-2"
                onKeyDown={onMenuKeyDown}
              >
                <button
                  ref={moreFirstItemRef}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={showTemplates}
                  className={BTN}
                  onClick={() => {
                    setShowTemplates((v) => !v);
                    setMoreOpen(false);
                    moreBtnRef.current?.focus();
                  }}
                >
                  Template
                </button>
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={showMatch}
                  className={BTN}
                  onClick={() => {
                    setShowMatch((v) => !v);
                    setMoreOpen(false);
                    moreBtnRef.current?.focus();
                  }}
                >
                  Match with a Job
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={BTN}
                  onClick={() => {
                    store.saveNow();
                    setMoreOpen(false);
                    moreBtnRef.current?.focus();
                  }}
                >
                  Save now
                </button>
              </div>
            ) : null}
          </div>
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
        {(["edit", "preview", "score"] as const).map((t, i, tabs) => {
          const selected = mobileTab === t;
          return (
            <button
              key={t}
              ref={(el) => {
                mobileTabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`editor-tab-${t}`}
              aria-selected={selected}
              aria-controls="editor-tabpanel"
              tabIndex={selected ? 0 : -1}
              className={`neo-button min-h-[44px] min-w-0 flex-1 px-2 text-sm ${
                selected
                  ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                  : "bg-[var(--color-white)] text-[var(--color-ink)]"
              }`}
              onClick={() => setMobileTab(t)}
              onKeyDown={(e) => {
                const last = tabs.length - 1;
                let next = i;
                if (e.key === "ArrowRight") next = i === last ? 0 : i + 1;
                else if (e.key === "ArrowLeft") next = i === 0 ? last : i - 1;
                else if (e.key === "Home") next = 0;
                else if (e.key === "End") next = last;
                else return;
                e.preventDefault();
                setMobileTab(tabs[next]);
                mobileTabRefs.current[next]?.focus();
              }}
            >
              {t === "edit" ? "Edit" : t === "preview" ? "Preview" : "Score"}
            </button>
          );
        })}
      </div>

      {/* Mobile view */}
      <div
        id="editor-tabpanel"
        role="tabpanel"
        aria-labelledby={`editor-tab-${mobileTab}`}
        className="flex flex-col gap-4 md:hidden"
      >
        {mobileTab === "edit" ? (
          <>
            {/* Horizontal-scrolling section pill strip (no fixed 220px column on mobile) */}
            <div className="-mx-1 overflow-x-auto px-1">
              <nav aria-label="Resume sections" className="flex gap-2 pb-1">
                {SECTIONS.map((s) => {
                  const isActive = s.key === active;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      aria-current={isActive ? "true" : undefined}
                      onClick={() => setActive(s.key)}
                      className={`neo-button min-h-[44px] shrink-0 whitespace-nowrap px-3 text-left text-sm ${
                        isActive
                          ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                          : "bg-[var(--color-white)] text-[var(--color-ink)]"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </nav>
            </div>
            {form}
          </>
        ) : mobileTab === "preview" ? (
          <Preview resume={store.doc} />
        ) : (
          <ScorePanel resumeId={store.doc.id} />
        )}
      </div>

      {/* Desktop 3-pane grid: fixed nav · scrollable form (sticky header) · preview */}
      <div className="hidden gap-4 md:grid md:grid-cols-[220px_minmax(0,1fr)_minmax(0,48%)]">
        <div className="min-w-0">{nav}</div>

        {/*
          Form column. The section components render their own <h2> as the first
          child of <section aria-labelledby>. To get a sticky header WITHOUT
          touching those files and WITHOUT producing two visible H2s, we:
            1. Render a sticky visible <h2> here that mirrors the active section.
            2. Visually-hide the section's own internal <h2> via the scoped rule
               below (editor-section-h2) — it stays in the DOM so each
               <section aria-labelledby="sec-*"> still resolves, but only ONE H2
               is visible per section (the sticky mirror).
          The scroll container (max-h + overflow-y-auto) lets the section body
          scroll under the solid sticky header.
        */}
        <div className="flex min-w-0 flex-col md:max-h-[calc(100vh-7rem)] md:overflow-y-auto">
          <style>{`
            .editor-section-h2 > section > h2:first-child {
              position: absolute;
              width: 1px; height: 1px;
              padding: 0; margin: -1px;
              overflow: hidden; clip: rect(0,0,0,0);
              white-space: nowrap; border: 0;
            }
          `}</style>
          <div className="sticky top-0 z-10 -mx-[var(--space-6)] mb-2 border-b-2 border-[var(--color-ink)] bg-[var(--color-paper)] px-[var(--space-6)] py-2">
            <h2 className="text-xl font-bold">{activeLabel}</h2>
          </div>
          <div className="editor-section-h2">{form}</div>
        </div>

        <div className="min-w-0">{previewPane}</div>
      </div>
    </div>
  );
}

export { SECTIONS };
