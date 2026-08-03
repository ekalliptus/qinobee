import type { ResumeDocument, Language } from "@modules/resume/types";
import { TextField } from "./fields";
import { ItemToolbar, BTN } from "./list-editors";

type Updater = (fn: (prev: ResumeDocument) => ResumeDocument) => void;

export default function LanguagesSection(props: { doc: ResumeDocument; update: Updater }) {
  const items = props.doc.languages;
  const setItems = (next: Language[]) => props.update((prev) => ({ ...prev, languages: next }));
  const patchItem = (i: number, patch: Partial<Language>) =>
    setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  return (
    <section aria-labelledby="sec-languages" className="flex flex-col gap-6">
      <h2 id="sec-languages" className="text-xl font-bold">Languages</h2>
      <div className="flex flex-col gap-4">
        {items.map((it, i) => (
          <div key={i} className="flex flex-col gap-3 border-2 border-[var(--color-ink)] rounded-[var(--radius)] p-4 bg-[var(--color-white)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold" aria-hidden="true">{it.name || `Language ${i + 1}`}</span>
              <ItemToolbar
                index={i} length={items.length} label="language"
                onReorder={(fn) => setItems(fn(items) as Language[])}
                onDuplicate={() => setItems([...items.slice(0, i + 1), { ...it }, ...items.slice(i + 1)])}
                onDelete={() => setItems(items.filter((_, j) => j !== i))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Language" value={it.name} onChange={(v) => patchItem(i, { name: v })} />
              <TextField label="Proficiency" value={it.proficiency ?? ""} onChange={(v) => patchItem(i, { proficiency: v })} />
            </div>
          </div>
        ))}
      </div>
      <button type="button" className={`${BTN} mt-2`} onClick={() => setItems([...items, { name: "" }])}>
        Add language
      </button>
    </section>
  );
}
