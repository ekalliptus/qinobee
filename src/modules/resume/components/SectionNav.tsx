import type { ResumeDocument } from "@modules/resume/types";
import { SECTIONS, sectionStatus, type SectionKey, type SectionStatus } from "./sections/keys";

const PILL: Record<SectionStatus, string> = {
  Empty: "bg-[var(--color-white)] text-[var(--color-ink)]",
  Incomplete: "bg-[var(--color-yellow)] text-[var(--color-ink)]",
  Complete: "bg-[var(--color-success)] text-[var(--color-ink)]",
};

export default function SectionNav(props: {
  doc: ResumeDocument;
  active: SectionKey;
  onSelect: (key: SectionKey) => void;
}) {
  return (
    <nav aria-label="Resume sections">
      <ul className="flex flex-col gap-2">
        {SECTIONS.map((s) => {
          const status = sectionStatus(props.doc, s.key);
          const isActive = s.key === props.active;
          return (
            <li key={s.key}>
              <button
                type="button"
                aria-current={isActive ? "true" : undefined}
                onClick={() => props.onSelect(s.key)}
                className={`neo-button w-full min-h-[44px] justify-between px-3 text-left text-sm ${
                  isActive
                    ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                    : "bg-[var(--color-white)] text-[var(--color-ink)]"
                }`}
              >
                <span>{s.label}</span>
                <span className={`ml-2 rounded-[var(--radius-sm)] border-2 border-[var(--color-ink)] px-2 py-0.5 text-xs ${PILL[status]}`}>
                  {status}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
