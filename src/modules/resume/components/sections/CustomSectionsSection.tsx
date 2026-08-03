import type { ResumeDocument, CustomSection } from "@modules/resume/types";
import { TextField, TextArea } from "./fields";
import { BTN, BTN_DANGER, BulletList } from "./list-editors";
import { AccordionItem, useAccordion, initialOpenIndex } from "./EntryAccordion";

type Updater = (fn: (prev: ResumeDocument) => ResumeDocument) => void;

export default function CustomSectionsSection(props: {
  doc: ResumeDocument;
  update: Updater;
}) {
  const items = props.doc.customSections;
  const setItems = (next: CustomSection[]) =>
    props.update((prev) => ({ ...prev, customSections: next }));
  const patchItem = (i: number, patch: Partial<CustomSection>) =>
    setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const patchEntry = (
    i: number,
    j: number,
    patch: Partial<CustomSection["items"][number]>,
  ) =>
    setItems(
      items.map((s, si) =>
        si === i
          ? { ...s, items: s.items.map((e, ei) => (ei === j ? { ...e, ...patch } : e)) }
          : s,
      ),
    );
  const addEntry = (i: number) =>
    setItems(items.map((s, si) => (si === i ? { ...s, items: [...s.items, { bullets: [] }] } : s)));
  const removeEntry = (i: number, j: number) =>
    setItems(
      items.map((s, si) =>
        si === i ? { ...s, items: s.items.filter((_, ei) => ei !== j) } : s,
      ),
    );
  const acc = useAccordion(initialOpenIndex(items.map((s) => !!s.title)));

  return (
    <section aria-labelledby="sec-custom" className="flex flex-col gap-6">
      <h2 id="sec-custom" className="text-xl font-bold">
        Custom sections
      </h2>
      <div className="flex flex-col gap-4">
        {items.map((it, i) => (
          <AccordionItem
            key={i}
            index={i}
            length={items.length}
            title={it.title || `Section ${i + 1}`}
            open={acc.isOpen(i)}
            onToggle={() => acc.toggle(i)}
            itemLabel="section"
            onReorder={(fn) => setItems(fn(items) as CustomSection[])}
            onDuplicate={() =>
              setItems([...items.slice(0, i + 1), { ...it }, ...items.slice(i + 1)])
            }
            onDelete={() => setItems(items.filter((_, j) => j !== i))}
          >
            <div className="flex flex-col gap-3">
              <TextField label="Title" value={it.title} onChange={(v) => patchItem(i, { title: v })} />
              <div className="flex flex-col gap-4">
                {it.items.map((entry, j) => (
                  <div key={j} className="flex flex-col gap-3 border-2 border-[var(--color-ink)] rounded-[var(--radius)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold" aria-hidden="true">
                        {entry.heading || `Entry ${j + 1}`}
                      </span>
                      <button
                        type="button"
                        className={BTN_DANGER}
                        aria-label={`Remove entry ${j + 1}`}
                        onClick={() => removeEntry(i, j)}
                      >
                        Remove entry
                      </button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <TextField label="Heading" value={entry.heading ?? ""} onChange={(v) => patchEntry(i, j, { heading: v })} />
                      <TextField label="Subheading" value={entry.subheading ?? ""} onChange={(v) => patchEntry(i, j, { subheading: v })} />
                    </div>
                    <TextArea label="Description" rows={3} value={entry.description ?? ""} onChange={(v) => patchEntry(i, j, { description: v })} />
                    <BulletList label="Bullets" values={entry.bullets} onChange={(v) => patchEntry(i, j, { bullets: v })} />
                  </div>
                ))}
                <button type="button" className={BTN} onClick={() => addEntry(i)}>
                  Add entry
                </button>
              </div>
            </div>
          </AccordionItem>
        ))}
      </div>
      <button type="button" className={`${BTN} mt-2`} onClick={() => { setItems([...items, { title: "", items: [] }]); acc.open(items.length); }}>
        Add section
      </button>
    </section>
  );
}
