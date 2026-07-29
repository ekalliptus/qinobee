import { useState } from "react";
import { Dialog } from "@components/ui/Dialog";

export function ResumeCardDialog({ resumeId, currentTitle }: { resumeId: string; currentTitle: string }) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [title, setTitle] = useState(currentTitle);

  function post(action: string, fields: Record<string, string>) {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = action;
    for (const [name, value] of Object.entries(fields)) {
      const i = document.createElement("input");
      i.type = "hidden"; i.name = name; i.value = value;
      form.appendChild(i);
    }
    document.body.appendChild(form);
    form.submit();
  }

  return (
    <>
      <button type="button" className="neo-button min-h-[44px] px-3 text-sm bg-[var(--color-white)] text-[var(--color-ink)]" onClick={() => setRenameOpen(true)}>Rename</button>
      <button type="button" className="neo-button min-h-[44px] px-3 text-sm bg-[var(--color-red)] text-[var(--color-white)]" onClick={() => setDeleteOpen(true)}>Delete</button>

      <Dialog
        open={renameOpen}
        title="Rename CV"
        primaryLabel="Save"
        onPrimary={() => {
          const next = title.trim() || currentTitle;
          post(`/api/resume/${resumeId}/rename`, { title: next });
        }}
        onClose={() => setRenameOpen(false)}
      >
        <label className="flex flex-col gap-1 font-medium">
          CV name
          <input
            className="neo-input min-h-[44px] w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={160}
            aria-describedby="rename-help"
          />
        </label>
        <p id="rename-help" className="text-xs opacity-70">Internal name for this CV. It won't appear on the PDF.</p>
      </Dialog>

      <Dialog
        open={deleteOpen}
        title="Delete CV?"
        variant="danger"
        primaryLabel="Delete"
        onPrimary={() => post(`/api/resume/${resumeId}/delete`, {})}
        onClose={() => setDeleteOpen(false)}
      >
        <p>This will permanently delete “{currentTitle}”. This action cannot be undone.</p>
      </Dialog>
    </>
  );
}
