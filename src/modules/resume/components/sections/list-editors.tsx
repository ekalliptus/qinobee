import { useState } from "react";
import { moveUp, moveDown, moveToTop, moveToBottom } from "@modules/resume/utils/reorder";

const BTN = "neo-button min-h-[44px] px-3 text-sm bg-[var(--color-white)] text-[var(--color-ink)]";
const BTN_DANGER = "neo-button min-h-[44px] px-3 text-sm bg-[var(--color-red)] text-[var(--color-ink)]";

/** Up/Down/Top/Bottom reorder controls for an item at `index` in a list of `length`. */
export function ReorderControls(props: {
  index: number;
  length: number;
  label: string;
  onReorder: (next: (arr: unknown[]) => unknown[]) => void;
}) {
  const { index, length, label } = props;
  return (
    <div className="flex gap-1" role="group" aria-label={`Reorder ${label}`}>
      <button
        type="button"
        className={BTN}
        aria-label={`Move ${label} to top`}
        disabled={index === 0}
        onClick={() => props.onReorder((a) => moveToTop(a, index))}
      >
        ⤒
      </button>
      <button
        type="button"
        className={BTN}
        aria-label={`Move ${label} up`}
        disabled={index === 0}
        onClick={() => props.onReorder((a) => moveUp(a, index))}
      >
        ↑
      </button>
      <button
        type="button"
        className={BTN}
        aria-label={`Move ${label} down`}
        disabled={index === length - 1}
        onClick={() => props.onReorder((a) => moveDown(a, index))}
      >
        ↓
      </button>
      <button
        type="button"
        className={BTN}
        aria-label={`Move ${label} to bottom`}
        disabled={index === length - 1}
        onClick={() => props.onReorder((a) => moveToBottom(a, index))}
      >
        ⤓
      </button>
    </div>
  );
}

/** A list of short string tags (skills, technologies) with add/remove. */
export function TagList(props: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    props.onChange([...props.values, v]);
    setDraft("");
  };
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-[var(--color-ink)]">{props.label}</span>
      <ul className="flex flex-wrap gap-2" aria-label={props.label}>
        {props.values.map((tag, i) => (
          <li key={`${tag}-${i}`} className="flex items-center gap-1 border-2 border-[var(--color-ink)] rounded-[var(--radius-sm)] px-2 py-1">
            <span>{tag}</span>
            <button
              type="button"
              className="min-h-[44px] min-w-[44px] px-1"
              aria-label={`Remove ${tag}`}
              onClick={() => props.onChange(props.values.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          className="neo-input min-h-[44px] flex-1"
          value={draft}
          aria-label={`Add ${props.label}`}
          placeholder="Type and press Add"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className={BTN} onClick={add}>
          Add
        </button>
      </div>
    </div>
  );
}

/** A reorderable list of longer strings (bullets) with add/remove/reorder. */
export function BulletList(props: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const reorder = (fn: (arr: unknown[]) => unknown[]) =>
    props.onChange(fn(props.values) as string[]);
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-[var(--color-ink)]">{props.label}</span>
      <ul className="flex flex-col gap-2" aria-label={props.label}>
        {props.values.map((bullet, i) => (
          <li key={i} className="flex flex-col gap-1 sm:flex-row sm:items-start">
            <textarea
              className="neo-input min-h-[44px] flex-1 py-2"
              rows={2}
              aria-label={`${props.label} item ${i + 1}`}
              value={bullet}
              onChange={(e) =>
                props.onChange(props.values.map((v, j) => (j === i ? e.target.value : v)))
              }
            />
            <div className="flex gap-1">
              <ReorderControls index={i} length={props.values.length} label={`${props.label} item ${i + 1}`} onReorder={reorder} />
              <button
                type="button"
                className={BTN_DANGER}
                aria-label={`Remove ${props.label} item ${i + 1}`}
                onClick={() => props.onChange(props.values.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className={BTN} onClick={() => props.onChange([...props.values, ""])}>
        Add {props.label}
      </button>
    </div>
  );
}

/** Item-level Add / Duplicate / Delete toolbar for array sections. */
export function ItemToolbar(props: {
  index: number;
  length: number;
  label: string;
  onReorder: (fn: (arr: unknown[]) => unknown[]) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <ReorderControls index={props.index} length={props.length} label={props.label} onReorder={props.onReorder} />
      <button type="button" className={BTN} onClick={props.onDuplicate}>
        Duplicate
      </button>
      <button
        type="button"
        className={BTN_DANGER}
        onClick={() => {
          if (confirm(`Delete this ${props.label}?`)) props.onDelete();
        }}
      >
        Delete
      </button>
    </div>
  );
}

export { BTN, BTN_DANGER };
