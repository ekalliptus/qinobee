import type { ResumeDocument } from "@modules/resume/types";
import { STAGES, stageStatus, type StageId } from "./stages";

const STATUS_MARK: Record<string, string> = {
  Complete: "✓",
  Incomplete: "•",
  Empty: "○",
};

export default function StageStepper(props: {
  doc: ResumeDocument;
  active: StageId;
  onSelect: (id: StageId) => void;
}) {
  return (
    <nav aria-label="Résumé stages" className="w-full">
      <ol className="flex w-full gap-1 overflow-x-auto">
        {STAGES.map((s, i) => {
          const status = stageStatus(props.doc, s.id);
          const isActive = s.id === props.active;
          return (
            <li key={s.id} className="min-w-0 flex-1">
              <button
                type="button"
                aria-current={isActive ? "step" : undefined}
                onClick={() => props.onSelect(s.id)}
                className={`neo-button min-h-[44px] w-full min-w-0 justify-start gap-2 whitespace-nowrap px-3 text-sm ${
                  isActive
                    ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                    : "bg-[var(--color-white)] text-[var(--color-ink)]"
                }`}
              >
                <span aria-hidden="true" className="font-bold">
                  {i + 1}
                </span>
                <span className="truncate">{s.label}</span>
                <span className="ml-auto text-xs" aria-label={status}>
                  {STATUS_MARK[status]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
