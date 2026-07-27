import type { ResumeDocument, SkillGroup } from "@modules/resume/types";
import { TextField, SelectField } from "./fields";
import { TagList, ItemToolbar, BTN } from "./list-editors";

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

  return (
    <section aria-labelledby="sec-skills" className="flex flex-col gap-4">
      <h2 id="sec-skills" className="text-xl font-bold">
        Skills
      </h2>
      {groups.map((g, i) => (
        <div key={i} className="flex flex-col gap-3 border-2 border-[var(--color-ink)] rounded-[var(--radius-sm)] p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Category"
              value={g.category}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              onChange={(v) => patchGroup(i, { category: v as SkillGroup["category"] })}
            />
            <TextField label="Label (optional)" value={g.label ?? ""} onChange={(v) => patchGroup(i, { label: v })} />
          </div>
          <TagList label="Skills" values={g.skills} onChange={(skills) => patchGroup(i, { skills })} />

          <ItemToolbar
            index={i}
            length={groups.length}
            label="skill group"
            onReorder={(fn) => setGroups(fn(groups) as SkillGroup[])}
            onDuplicate={() => setGroups([...groups.slice(0, i + 1), { ...g }, ...groups.slice(i + 1)])}
            onDelete={() => setGroups(groups.filter((_, j) => j !== i))}
          />
        </div>
      ))}
      <button type="button" className={BTN} onClick={() => setGroups([...groups, emptyGroup()])}>
        Add skill group
      </button>
    </section>
  );
}
