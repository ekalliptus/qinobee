import type { ResumeDocument, WorkExperience } from "@modules/resume/types";
import type { RenderAiAssist } from "../AiPanel";
import { TextField, SelectField, CheckboxField } from "./fields";
import { BulletList, TagList, BTN } from "./list-editors";
import { AccordionItem, useAccordion, initialOpenIndex } from "./EntryAccordion";

type Updater = (fn: (prev: ResumeDocument) => ResumeDocument) => void;

const EMPLOYMENT_TYPES = [
  "full-time",
  "part-time",
  "internship",
  "contract",
  "freelance",
  "apprenticeship",
  "volunteer",
] as const;

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

function emptyExperience(): WorkExperience {
  return {
    jobTitle: "",
    company: "",
    employmentType: "full-time",
    startMonth: 1,
    startYear: new Date().getFullYear(),
    currentlyWorking: false,
    bullets: [],
    skillsUsed: [],
  };
}

export default function WorkExperienceSection(props: {
  doc: ResumeDocument;
  update: Updater;
  renderAiAssist?: RenderAiAssist;
}) {
  const items = props.doc.workExperiences;
  const setItems = (next: WorkExperience[]) =>
    props.update((prev) => ({ ...prev, workExperiences: next }));
  const patchItem = (i: number, patch: Partial<WorkExperience>) =>
    setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const acc = useAccordion(initialOpenIndex(items.map((w) => !!w.jobTitle && !!w.company)));

  return (
    <section aria-labelledby="sec-work" className="flex flex-col gap-6">
      <h2 id="sec-work" className="text-xl font-bold">
        Work experience
      </h2>
      <div className="flex flex-col gap-4">
        {items.map((it, i) => {
          const title =
            it.jobTitle || it.company ? `${it.jobTitle}${it.company ? ` · ${it.company}` : ""}` : `Experience ${i + 1}`;
          return (
            <AccordionItem
              key={i}
              index={i}
              length={items.length}
              title={title}
              open={acc.isOpen(i)}
              onToggle={() => acc.toggle(i)}
              itemLabel="experience"
              onReorder={(fn) => setItems(fn(items) as WorkExperience[])}
              onDuplicate={() => setItems([...items.slice(0, i + 1), { ...it }, ...items.slice(i + 1)])}
              onDelete={() => setItems(items.filter((_, j) => j !== i))}
            >
              <div className="flex flex-col gap-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Job title" value={it.jobTitle} onChange={(v) => patchItem(i, { jobTitle: v })} />
                <TextField label="Company" value={it.company} onChange={(v) => patchItem(i, { company: v })} />
                <SelectField
                  label="Employment type"
                  value={it.employmentType}
                  options={EMPLOYMENT_TYPES.map((t) => ({ value: t, label: t }))}
                  onChange={(v) => patchItem(i, { employmentType: v as WorkExperience["employmentType"] })}
                />
                <TextField label="City" value={it.city ?? ""} onChange={(v) => patchItem(i, { city: v })} />
                <TextField label="Country" value={it.country ?? ""} onChange={(v) => patchItem(i, { country: v })} />
                <CheckboxField label="Remote" checked={it.remote ?? false} onChange={(v) => patchItem(i, { remote: v })} />
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <SelectField
                  label="Start month"
                  value={String(it.startMonth)}
                  options={MONTHS}
                  onChange={(v) => patchItem(i, { startMonth: Number(v) })}
                />
                <TextField
                  label="Start year"
                  type="number"
                  value={String(it.startYear)}
                  onChange={(v) => patchItem(i, { startYear: Number(v) || it.startYear })}
                />
                <SelectField
                  label="End month"
                  value={it.endMonth ? String(it.endMonth) : ""}
                  options={[{ value: "", label: "—" }, ...MONTHS]}
                  onChange={(v) => patchItem(i, { endMonth: v ? Number(v) : undefined })}
                />
                <TextField
                  label="End year"
                  type="number"
                  value={it.endYear ? String(it.endYear) : ""}
                  onChange={(v) => patchItem(i, { endYear: v ? Number(v) : undefined })}
                />
              </div>
              <CheckboxField
                label="I currently work here"
                checked={it.currentlyWorking}
                hint={it.currentlyWorking ? "End date is ignored while this is checked." : undefined}
                onChange={(v) =>
                  patchItem(i, v ? { currentlyWorking: true, endMonth: undefined, endYear: undefined } : { currentlyWorking: false })
                }
              />

              <BulletList
                label="Bullets"
                values={it.bullets}
                onChange={(bullets) => patchItem(i, { bullets })}
                renderExtra={
                  props.renderAiAssist
                    ? (value, onApply) =>
                        props.renderAiAssist!({ kind: "bullet", text: value, onApply })
                    : undefined
                }
              />
              <TagList label="Skills used" values={it.skillsUsed} onChange={(skillsUsed) => patchItem(i, { skillsUsed })} />
              </div>
            </AccordionItem>
          );
        })}
      </div>
      <button
        type="button"
        className={`${BTN} mt-2`}
        onClick={() => {
          setItems([...items, emptyExperience()]);
          acc.open(items.length);
        }}
      >
        Add experience
      </button>
    </section>
  );
}
