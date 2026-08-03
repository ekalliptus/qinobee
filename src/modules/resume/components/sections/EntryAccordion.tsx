import { useState, type ReactNode } from "react";
import { ItemToolbar } from "./list-editors";

/**
 * Which item should be open on mount: the first incomplete one, else the first
 * item, else none (-1) for an empty list. `complete[i]` is a per-item flag.
 */
export function initialOpenIndex(complete: boolean[]): number {
  if (complete.length === 0) return -1;
  const firstIncomplete = complete.findIndex((c) => !c);
  return firstIncomplete === -1 ? 0 : firstIncomplete;
}

export interface AccordionItemProps {
  index: number;
  length: number;
  /** Collapsed header title, e.g. "Software Engineer · Acme". */
  title: string;
  /** Optional secondary line (date range / status). */
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  itemLabel: string; // "experience", "education", …
  onReorder: (fn: (arr: unknown[]) => unknown[]) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  children: ReactNode;
}

const HEAD =
  "flex w-full items-center gap-2 px-4 py-3 text-left min-h-[44px]";

export function AccordionItem(props: AccordionItemProps) {
  const panelId = `acc-panel-${props.itemLabel}-${props.index}`;
  const btnId = `acc-btn-${props.itemLabel}-${props.index}`;
  return (
    <div className="border-2 border-[var(--color-ink)] rounded-[var(--radius)] bg-[var(--color-white)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[var(--color-ink)]">
        <button
          type="button"
          id={btnId}
          aria-expanded={props.open}
          aria-controls={panelId}
          className={HEAD}
          onClick={props.onToggle}
        >
          <span aria-hidden="true" className="font-bold">
            {props.open ? "▾" : "▸"}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-semibold">{props.title}</span>
            {props.subtitle ? (
              <span className="truncate text-xs text-[var(--color-ink)]/70">
                {props.subtitle}
              </span>
            ) : null}
          </span>
        </button>
        <div className="px-2">
          <ItemToolbar
            index={props.index}
            length={props.length}
            label={props.itemLabel}
            onReorder={props.onReorder}
            onDuplicate={props.onDuplicate}
            onDelete={props.onDelete}
          />
        </div>
      </div>
      {props.open ? (
        <div id={panelId} role="region" aria-labelledby={btnId} className="p-4">
          {props.children}
        </div>
      ) : null}
    </div>
  );
}

/** Open-state manager for a single list: at most one item auto-open. */
export function useAccordion(initial: number) {
  const [openIndex, setOpenIndex] = useState(initial);
  return {
    openIndex,
    isOpen: (i: number) => i === openIndex,
    toggle: (i: number) => setOpenIndex((cur) => (cur === i ? -1 : i)),
    open: (i: number) => setOpenIndex(i),
  };
}
