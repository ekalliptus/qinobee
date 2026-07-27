import type { ResumeDocument, Project } from "@modules/resume/types";
import { TextField, TextArea } from "./fields";
import { TagList, ItemToolbar, BTN } from "./list-editors";

type Updater = (fn: (prev: ResumeDocument) => ResumeDocument) => void;

function emptyProject(): Project {
  return { name: "", technologies: [] };
}

export default function ProjectsSection(props: { doc: ResumeDocument; update: Updater }) {
  const items = props.doc.projects;
  const setItems = (next: Project[]) => props.update((prev) => ({ ...prev, projects: next }));
  const patchItem = (i: number, patch: Partial<Project>) =>
    setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  return (
    <section aria-labelledby="sec-projects" className="flex flex-col gap-4">
      <h2 id="sec-projects" className="text-xl font-bold">
        Projects
      </h2>
      {items.map((it, i) => (
        <div key={i} className="flex flex-col gap-3 border-2 border-[var(--color-ink)] rounded-[var(--radius-sm)] p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Name" value={it.name} onChange={(v) => patchItem(i, { name: v })} />
            <TextField label="Role" value={it.role ?? ""} onChange={(v) => patchItem(i, { role: v })} />
            <TextField label="Project URL" type="url" value={it.projectUrl ?? ""} onChange={(v) => patchItem(i, { projectUrl: v })} />
            <TextField label="Repository URL" type="url" value={it.repositoryUrl ?? ""} onChange={(v) => patchItem(i, { repositoryUrl: v })} />
            <TextField label="Start date" value={it.startDate ?? ""} onChange={(v) => patchItem(i, { startDate: v })} />
            <TextField label="End date" value={it.endDate ?? ""} onChange={(v) => patchItem(i, { endDate: v })} />
          </div>
          <TextArea label="Description" rows={3} value={it.description ?? ""} onChange={(v) => patchItem(i, { description: v })} />
          <TagList label="Technologies" values={it.technologies} onChange={(technologies) => patchItem(i, { technologies })} />

          <ItemToolbar
            index={i}
            length={items.length}
            label="project"
            onReorder={(fn) => setItems(fn(items) as Project[])}
            onDuplicate={() => setItems([...items.slice(0, i + 1), { ...it }, ...items.slice(i + 1)])}
            onDelete={() => setItems(items.filter((_, j) => j !== i))}
          />
        </div>
      ))}
      <button type="button" className={BTN} onClick={() => setItems([...items, emptyProject()])}>
        Add project
      </button>
    </section>
  );
}
