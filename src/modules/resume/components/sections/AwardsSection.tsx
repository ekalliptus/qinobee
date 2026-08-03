import type { ResumeDocument, Award } from "@modules/resume/types";
import { TextField, TextArea } from "./fields";
import { BTN } from "./list-editors";
import { AccordionItem, useAccordion, initialOpenIndex } from "./EntryAccordion";

type Updater = (fn: (prev: ResumeDocument) => ResumeDocument) => void;

export default function AwardsSection(props: {
  doc: ResumeDocument;
  update: Updater;
}) {
  const items = props.doc.awards;
  const setItems = (next: Award[]) =>
    props.update((prev) => ({ ...prev, awards: next }));
  const patchItem = (i: number, patch: Partial<Award>) =>
    setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const acc = useAccordion(initialOpenIndex(items.map((a) => !!a.title)));

  return (
    <section aria-labelledby="sec-awards" className="flex flex-col gap-6">
      <h2 id="sec-awards" className="text-xl font-bold">
        Awards
      </h2>
      <div className="flex flex-col gap-4">
        {items.map((it, i) => (
          <AccordionItem
            key={i}
            index={i}
            length={items.length}
            title={it.title || `Award ${i + 1}`}
            open={acc.isOpen(i)}
            onToggle={() => acc.toggle(i)}
            itemLabel="award"
            onReorder={(fn) => setItems(fn(items) as Award[])}
            onDuplicate={() =>
              setItems([...items.slice(0, i + 1), { ...it }, ...items.slice(i + 1)])
            }
            onDelete={() => setItems(items.filter((_, j) => j !== i))}
          >
            <div className="flex flex-col gap-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Title" value={it.title} onChange={(v) => patchItem(i, { title: v })} />
                <TextField label="Issuer" value={it.issuer ?? ""} onChange={(v) => patchItem(i, { issuer: v })} />
                <TextField label="Date" value={it.date ?? ""} onChange={(v) => patchItem(i, { date: v })} />
              </div>
              <TextArea label="Description" rows={3} value={it.description ?? ""} onChange={(v) => patchItem(i, { description: v })} />
            </div>
          </AccordionItem>
        ))}
      </div>
      <button type="button" className={`${BTN} mt-2`} onClick={() => { setItems([...items, { title: "" }]); acc.open(items.length); }}>
        Add award
      </button>
    </section>
  );
}
