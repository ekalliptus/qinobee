import type { ResumeDocument, SkillGroup } from "@modules/resume/types";
import { TextField, SelectField } from "./fields";
import { TagList, BTN } from "./list-editors";
import { AccordionItem, useAccordion, initialOpenIndex } from "./EntryAccordion";

type Updater = (fn: (prev: ResumeDocument) => ResumeDocument) => void;

const CATEGORIES = ["technical", "tools", "soft", "industry", "languages", "custom"] as const;

function emptyGroup(): SkillGroup {
  return { category: "technical", skills: [] };
}

export default function SkillsSection(props: { doc: ResumeDocument; update: Updater }) {
  const groups = props.doc.skillGroups;
  const setGroups = (next: SkillGroup[]) => props.update((prev) => ({ ...prev, skillGroups: next }));
  const patchGroup = (i: number, patch: Partial<SkillGroup>) =>
    setGroups(groups.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  const acc = useAccordion(initialOpenIndex(groups.map((g) => g.skills.length > 0)));

  return (
    <section aria-labelledby="sec-skills" className="flex flex-col gap-6">
      <h2 id="sec-skills" className="text-xl font-bold">
        Skills
      </h2>
      <div className="flex flex-col gap-4">
        {groups.map((g, i) => {
          const title = g.label || g.category;
          return (
            <AccordionItem
              key={i}
              index={i}
              length={groups.length}
              title={title}
              open={acc.isOpen(i)}
              onToggle={() => acc.toggle(i)}
              itemLabel="skill group"
              onReorder={(fn) => setGroups(fn(groups) as SkillGroup[])}
              onDuplicate={() => setGroups([...groups.slice(0, i + 1), { ...g }, ...groups.slice(i + 1)])}
              onDelete={() => setGroups(groups.filter((_, j) => j !== i))}
            >
              <div className="flex flex-col gap-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Category"
                  value={g.category}
                  options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                  onChange={(v) => patchGroup(i, { category: v as SkillGroup["category"] })}
                />
                <TextField label="Label (optional)" value={g.label ?? ""} onChange={(v) => patchGroup(i, { label: v })} />
              </div>
              <TagList label="Skills" values={g.skills} onChange={(skills) => patchGroup(i, { skills })} />
              </div>
            </AccordionItem>
          );
        })}
      </div>
      <button
        type="button"
        className={`${BTN} mt-2`}
        onClick={() => {
          setGroups([...groups, emptyGroup()]);
          acc.open(groups.length);
        }}
      >
        Add skill group
      </button>
    </section>
  );
}
