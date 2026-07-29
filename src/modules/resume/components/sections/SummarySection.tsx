import type { ResumeDocument } from "@modules/resume/types";
import type { RenderAiAssist } from "../AiPanel";
import { TextArea } from "./fields";

type Updater = (fn: (prev: ResumeDocument) => ResumeDocument) => void;

const MIN = 200;
const MAX = 600;

export default function SummarySection(props: {
  doc: ResumeDocument;
  update: Updater;
  renderAiAssist?: RenderAiAssist;
}) {
  const value = props.doc.professionalSummary ?? "";
  const len = value.trim().length;
  const withinRange = len >= MIN && len <= MAX;
  const hint =
    len === 0
      ? `Recommended length ${MIN}–${MAX} characters.`
      : `${len} characters (recommended ${MIN}–${MAX}).`;

  return (
    <section aria-labelledby="sec-summary" className="flex flex-col gap-6">
      <h2 id="sec-summary" className="text-xl font-bold">
        Professional summary
      </h2>
      <TextArea
        label="Summary"
        rows={6}
        value={value}
        hint={hint}
        error={len > 0 && !withinRange ? `Aim for ${MIN}–${MAX} characters.` : undefined}
        onChange={(v) => props.update((prev) => ({ ...prev, professionalSummary: v }))}
      />
      {props.renderAiAssist?.({
        kind: "summary",
        text: value,
        onApply: (v) => props.update((prev) => ({ ...prev, professionalSummary: v })),
      })}
    </section>
  );
}
