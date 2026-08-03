import { useState } from "react";
import { Dialog } from "@components/ui/Dialog";
import PdfImport from "./PdfImport";
import type { ResumeTemplate } from "../templates/types";
import { features } from "@/config/features";

interface ResumeStub {
  id: string;
  title: string;
}

export default function CreateResumeFlow(props: {
  resumes: ResumeStub[];
  templates: ResumeTemplate[];
}) {
  const [modal, setModal] = useState<"scratch" | "duplicate" | "import" | null>(null);

  const cardClass = "flex cursor-pointer flex-col gap-3 border-2 border-[var(--color-ink)] bg-[var(--color-white)] p-6 text-left shadow-[var(--shadow-md)] transition-transform hover:-translate-y-1 hover:shadow-[6px_6px_0_var(--color-ink)]";

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {/* Card 1: Start from scratch */}
        <button type="button" className={cardClass} onClick={() => setModal("scratch")}>
          <div className="flex h-12 w-12 items-center justify-center border-2 border-[var(--color-ink)] bg-[var(--color-yellow)] text-xl font-bold">
            +
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="font-bold text-[var(--color-ink)] text-lg">Start from scratch</h2>
            <p className="text-sm text-[var(--color-ink)]/70">
              Pick a language, template, and name below, then start editing.
            </p>
          </div>
        </button>

        {/* Card 2: Duplicate */}
        <button 
          type="button" 
          className={cardClass} 
          onClick={() => setModal("duplicate")}
          disabled={props.resumes.length === 0}
          style={{ opacity: props.resumes.length === 0 ? 0.6 : 1, cursor: props.resumes.length === 0 ? "not-allowed" : "pointer" }}
        >
          <div className="flex h-12 w-12 items-center justify-center border-2 border-[var(--color-ink)] bg-[var(--color-white)] text-xl font-bold">
            ⎘
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="font-bold text-[var(--color-ink)] text-lg">Duplicate existing CV</h2>
            <p className="text-sm text-[var(--color-ink)]/70">
              {props.resumes.length === 0 
                ? "Available once you have a resume."
                : "Copy one of your resumes as a starting point."}
            </p>
          </div>
        </button>

        {/* Card 3: Import PDF */}
        <button 
          type="button" 
          className={cardClass} 
          onClick={() => setModal("import")}
          disabled={!features.resumeUpload}
          style={{ opacity: !features.resumeUpload ? 0.6 : 1, cursor: !features.resumeUpload ? "not-allowed" : "pointer" }}
        >
          <div className="flex h-12 w-12 items-center justify-center border-2 border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-white)] text-xl font-bold">
            ↑
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="font-bold text-[var(--color-ink)] text-lg">Import from PDF</h2>
            <p className="text-sm text-[var(--color-ink)]/70">
              Upload a CV PDF; we read the text and seed a draft.
            </p>
          </div>
        </button>
      </div>

      {/* Start from Scratch Modal */}
      <Dialog 
        open={modal === "scratch"} 
        title="Start from scratch" 
        size="lg" 
        onClose={() => setModal(null)}
      >
        <form id="form-scratch" method="POST" action="/api/resume/create" className="flex flex-col gap-6">
          <input type="hidden" name="startingPoint" value="scratch" />

          {/* Language */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--color-ink)]">Language</h3>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 border-2 border-[var(--color-ink)] px-4 py-2 cursor-pointer has-[:checked]:bg-[var(--color-yellow)]">
                <input type="radio" name="language" value="id" defaultChecked className="h-4 w-4" />
                <span className="text-sm font-semibold">Bahasa Indonesia</span>
              </label>
              <label className="flex items-center gap-2 border-2 border-[var(--color-ink)] px-4 py-2 cursor-pointer has-[:checked]:bg-[var(--color-yellow)]">
                <input type="radio" name="language" value="en" className="h-4 w-4" />
                <span className="text-sm font-semibold">English</span>
              </label>
            </div>
          </div>

          {/* Template */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--color-ink)]">Template</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[40vh] overflow-y-auto p-1">
              {props.templates.map((t) => (
                <label key={t.id} className="flex cursor-pointer flex-col gap-2 border-2 border-[var(--color-ink)] p-3 has-[:checked]:bg-[var(--color-yellow)]">
                  <span className="flex items-center gap-2">
                    <input type="radio" name="templateId" value={t.id} defaultChecked={t.id === "essential"} className="h-4 w-4" />
                    <span className="font-semibold text-[var(--color-ink)]">{t.name}</span>
                  </span>
                  <img src={t.thumbnail} alt="" loading="lazy" className="h-auto w-full border-2 border-[var(--color-ink)] bg-[var(--color-white)] object-contain" />
                </label>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--color-ink)]">Name</h3>
            <input
              type="text"
              name="title"
              required
              maxLength={160}
              placeholder="e.g. Frontend Developer CV"
              className="min-h-[44px] w-full border-2 border-[var(--color-ink)] bg-[var(--color-white)] px-3 font-semibold"
            />
          </div>

          <div className="mt-2 flex justify-end gap-3 border-t-2 border-[var(--color-ink)] pt-4">
            <button type="button" className="neo-button bg-[var(--color-white)] px-4" onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" className="neo-button bg-[var(--color-ink)] text-[var(--color-paper)] px-6">Create CV</button>
          </div>
        </form>
      </Dialog>

      {/* Duplicate Modal */}
      <Dialog 
        open={modal === "duplicate"} 
        title="Duplicate existing CV" 
        size="md" 
        onClose={() => setModal(null)}
      >
        <p className="mb-4 text-[var(--color-ink)]/80">Copy one of your existing resumes to use as a starting point.</p>
        <form method="POST" className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1">
          {props.resumes.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-2 border-[var(--color-ink)] bg-[var(--color-white)] p-3">
              <span className="min-w-0 truncate font-semibold text-[var(--color-ink)]">{r.title}</span>
              <button
                type="submit"
                formAction={`/api/resume/${r.id}/duplicate`}
                className="neo-button min-h-[36px] bg-[var(--color-yellow)] px-4 text-sm font-bold"
              >
                Duplicate
              </button>
            </div>
          ))}
        </form>
      </Dialog>

      {/* Import Modal */}
      <Dialog 
        open={modal === "import"} 
        title="Import from PDF" 
        size="md" 
        onClose={() => setModal(null)}
      >
        <PdfImport />
      </Dialog>
    </div>
  );
}