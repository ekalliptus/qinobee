import type { ResumeDocument, VolunteerExperience } from "@modules/resume/types";
import { TextField, TextArea, CheckboxField } from "./fields";
import { BTN } from "./list-editors";
import { AccordionItem, useAccordion, initialOpenIndex } from "./EntryAccordion";

type Updater = (fn: (prev: ResumeDocument) => ResumeDocument) => void;

function emptyVolunteer(): VolunteerExperience {
  return { organisation: "", currentlyActive: false };
}

export default function VolunteerSection(props: {
  doc: ResumeDocument;
  update: Updater;
}) {
  const items = props.doc.volunteerExperiences;
  const setItems = (next: VolunteerExperience[]) =>
    props.update((prev) => ({ ...prev, volunteerExperiences: next }));
  const patchItem = (i: number, patch: Partial<VolunteerExperience>) =>
    setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const acc = useAccordion(initialOpenIndex(items.map((v) => !!v.organisation)));

  return (
    <section aria-labelledby="sec-volunteer" className="flex flex-col gap-6">
      <h2 id="sec-volunteer" className="text-xl font-bold">
        Volunteer experience
      </h2>
      <div className="flex flex-col gap-4">
        {items.map((it, i) => (
          <AccordionItem
            key={i}
            index={i}
            length={items.length}
            title={it.organisation || it.role ? `${it.organisation}${it.role ? ` · ${it.role}` : ""}` : `Volunteer ${i + 1}`}
            open={acc.isOpen(i)}
            onToggle={() => acc.toggle(i)}
            itemLabel="volunteer role"
            onReorder={(fn) => setItems(fn(items) as VolunteerExperience[])}
            onDuplicate={() =>
              setItems([...items.slice(0, i + 1), { ...it }, ...items.slice(i + 1)])
            }
            onDelete={() => setItems(items.filter((_, j) => j !== i))}
          >
            <div className="flex flex-col gap-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Organization" value={it.organisation} onChange={(v) => patchItem(i, { organisation: v })} />
                <TextField label="Role" value={it.role ?? ""} onChange={(v) => patchItem(i, { role: v })} />
                <TextField label="City" value={it.city ?? ""} onChange={(v) => patchItem(i, { city: v })} />
                <TextField label="Country" value={it.country ?? ""} onChange={(v) => patchItem(i, { country: v })} />
                <TextField label="Start year" type="number" value={it.startYear ? String(it.startYear) : ""} onChange={(v) => patchItem(i, { startYear: v ? Number(v) : undefined })} />
                <TextField label="End year" type="number" value={it.endYear ? String(it.endYear) : ""} onChange={(v) => patchItem(i, { endYear: v ? Number(v) : undefined })} />
              </div>
              <CheckboxField label="Currently active" checked={it.currentlyActive} onChange={(v) => patchItem(i, { currentlyActive: v })} />
              <TextArea label="Description" rows={3} value={it.description ?? ""} onChange={(v) => patchItem(i, { description: v })} />
            </div>
          </AccordionItem>
        ))}
      </div>
      <button type="button" className={`${BTN} mt-2`} onClick={() => { setItems([...items, emptyVolunteer()]); acc.open(items.length); }}>
        Add volunteer role
      </button>
    </section>
  );
}
