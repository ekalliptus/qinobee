import type { ResumeDocument, Education } from "@modules/resume/types";
import { TextField, TextArea, CheckboxField } from "./fields";
import { ItemToolbar, BTN } from "./list-editors";

type Updater = (fn: (prev: ResumeDocument) => ResumeDocument) => void;

function emptyEducation(): Education {
  return {
    institution: "",
    currentlyStudying: false,
    coursework: [],
    achievements: [],
  };
}

export default function EducationSection(props: { doc: ResumeDocument; update: Updater }) {
  const items = props.doc.educations;
  const setItems = (next: Education[]) => props.update((prev) => ({ ...prev, educations: next }));
  const patchItem = (i: number, patch: Partial<Education>) =>
    setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  return (
    <section aria-labelledby="sec-edu" className="flex flex-col gap-4">
      <h2 id="sec-edu" className="text-xl font-bold">
        Education
      </h2>
      {items.map((it, i) => (
        <div key={i} className="flex flex-col gap-3 border-2 border-[var(--color-ink)] rounded-[var(--radius-sm)] p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Institution" value={it.institution} onChange={(v) => patchItem(i, { institution: v })} />
            <TextField label="Degree" value={it.degree ?? ""} onChange={(v) => patchItem(i, { degree: v })} />
            <TextField label="Field of study" value={it.fieldOfStudy ?? ""} onChange={(v) => patchItem(i, { fieldOfStudy: v })} />
            <TextField label="Level" value={it.level ?? ""} onChange={(v) => patchItem(i, { level: v })} />
            <TextField label="City" value={it.city ?? ""} onChange={(v) => patchItem(i, { city: v })} />
            <TextField label="Country" value={it.country ?? ""} onChange={(v) => patchItem(i, { country: v })} />
            <TextField
              label="Start year"
              type="number"
              value={it.startYear ? String(it.startYear) : ""}
              onChange={(v) => patchItem(i, { startYear: v ? Number(v) : undefined })}
            />
            <TextField
              label="End year"
              type="number"
              value={it.endYear ? String(it.endYear) : ""}
              onChange={(v) => patchItem(i, { endYear: v ? Number(v) : undefined })}
            />
            <TextField
              label="GPA"
              type="number"
              value={it.gpa != null ? String(it.gpa) : ""}
              onChange={(v) => patchItem(i, { gpa: v ? Number(v) : undefined })}
            />
            <TextField
              label="Max GPA"
              type="number"
              value={it.maxGpa != null ? String(it.maxGpa) : ""}
              onChange={(v) => patchItem(i, { maxGpa: v ? Number(v) : undefined })}
            />
          </div>
          <CheckboxField
            label="I currently study here"
            checked={it.currentlyStudying}
            onChange={(v) => patchItem(i, { currentlyStudying: v })}
          />
          <TextArea label="Activities" rows={2} value={it.activities ?? ""} onChange={(v) => patchItem(i, { activities: v })} />
          <TextArea label="Description" rows={3} value={it.description ?? ""} onChange={(v) => patchItem(i, { description: v })} />

          <ItemToolbar
            index={i}
            length={items.length}
            label="education"
            onReorder={(fn) => setItems(fn(items) as Education[])}
            onDuplicate={() => setItems([...items.slice(0, i + 1), { ...it }, ...items.slice(i + 1)])}
            onDelete={() => setItems(items.filter((_, j) => j !== i))}
          />
        </div>
      ))}
      <button type="button" className={BTN} onClick={() => setItems([...items, emptyEducation()])}>
        Add education
      </button>
    </section>
  );
}
