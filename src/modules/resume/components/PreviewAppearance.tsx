import type { ResumeDocument, ResumeTemplateSettings } from "@modules/resume/types";
import { resolveSettings } from "@modules/resume/templates/settings";

export interface TemplateCapabilities {
  divider: boolean;
  alignment: boolean;
}

const SIZE_STEPS = [
  { label: "S", value: 0.9 },
  { label: "M", value: 1.0 },
  { label: "L", value: 1.15 },
];
const FONTS = [
  { label: "Arial / Helvetica", value: "Arial, 'Helvetica Neue', Helvetica, sans-serif" },
  { label: "Calibri / Segoe", value: "Calibri, 'Segoe UI', Roboto, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Garamond", value: "Garamond, serif" }
];
const CTRL = "neo-input min-h-[44px] px-2 text-sm";

export default function PreviewAppearance(props: {
  resume: ResumeDocument;
  capabilities: TemplateCapabilities;
  onSettingsChange: (patch: Partial<ResumeTemplateSettings>) => void;
  onOpenTemplate: () => void;
}) {
  const s = resolveSettings(props.resume);
  return (
    <div className="no-print flex flex-wrap items-center gap-2 border-2 border-[var(--color-ink)] rounded-[var(--radius)] bg-[var(--color-white)] p-2">
      <label className="flex items-center gap-1 text-sm">
        Font
        <select className={CTRL} value={s.fontFamily}
          onChange={(e) => props.onSettingsChange({ fontFamily: e.target.value })}>
          {FONTS.some((f) => f.value === s.fontFamily) ? null : (
            <option value={s.fontFamily}>Current</option>
          )}
          {FONTS.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
        </select>
      </label>
      <div role="group" aria-label="Font size" className="flex gap-1">
        {SIZE_STEPS.map((st) => (
          <button key={st.label} type="button"
            aria-pressed={Math.abs(s.fontScale - st.value) < 0.03}
            className={`neo-button min-h-[44px] px-3 text-sm ${
              Math.abs(s.fontScale - st.value) < 0.03
                ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                : "bg-[var(--color-white)] text-[var(--color-ink)]"}`}
            onClick={() => props.onSettingsChange({ fontScale: st.value })}>
            {st.label}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-1 text-sm">
        Accent
        <input type="color" aria-label="Accent color" value={s.accentColor}
          className="h-8 w-10 border-2 border-[var(--color-ink)]"
          onChange={(e) => props.onSettingsChange({ accentColor: e.target.value })} />
      </label>
      {props.capabilities.alignment ? (
        <label className="flex items-center gap-1 text-sm">
          Align
          <select className={CTRL} value={s.alignment}
            onChange={(e) => props.onSettingsChange({ alignment: e.target.value === "center" ? "center" : "left" })}>
            <option value="left">Left</option>
            <option value="center">Center</option>
          </select>
        </label>
      ) : null}
      {props.capabilities.divider ? (
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" className="h-5 w-5" checked={s.divider}
            onChange={(e) => props.onSettingsChange({ divider: e.target.checked })} />
          Dividers
        </label>
      ) : null}
      <button type="button" className="neo-button min-h-[44px] px-3 text-sm bg-[var(--color-white)] text-[var(--color-ink)]"
        onClick={props.onOpenTemplate}>
        Template…
      </button>
    </div>
  );
}
