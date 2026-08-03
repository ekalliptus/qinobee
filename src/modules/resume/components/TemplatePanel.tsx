import { useId } from "react";
import type {
  ResumeDocument,
  ResumeTemplateSettings,
} from "@modules/resume/types";
import { listTemplates } from "@modules/resume/templates/registry";
import { resolveSettings } from "@modules/resume/templates/settings";

/**
 * Safe bounds — mirror resumeTemplateSettingsSchema so the UI can never write
 * an illegible or unprintable value. Server zod schema is the backstop.
 */
const BOUNDS = {
  fontScale: { min: 0.85, max: 1.25, step: 0.05 },
  lineHeight: { min: 1.1, max: 1.8, step: 0.05 },
  sectionSpacing: { min: 2, max: 14, step: 1 },
  margin: { min: 10, max: 25, step: 1 },
} as const;

/** Curated legible families (settings.ts accepts free-form; we offer a shortlist). */
const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: "System sans", value: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" },
  { label: "Georgia serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Helvetica", value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { label: "Times", value: "'Times New Roman', Times, serif" },
  { label: "Garamond", value: "Garamond, Georgia, serif" },
  { label: "Monospace", value: "'SFMono-Regular', Menlo, Consolas, monospace" },
];

/** Legible accent presets (all pass contrast on white). */
const ACCENT_PRESETS = [
  "#111827",
  "#1f2937",
  "#1d4ed8",
  "#b91c1c",
  "#047857",
  "#7c3aed",
  "#b45309",
] as const;

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

const CARD =
  "neo-card flex flex-col gap-1 p-3 text-left min-h-[44px] cursor-pointer";
const CTRL = "neo-input min-h-[44px] w-full px-2 text-sm";

export interface TemplatePanelProps {
  resume: ResumeDocument;
  onTemplateChange: (id: string) => void;
  onSettingsChange: (settings: Partial<ResumeTemplateSettings>) => void;
  onReset: () => void;
}

export default function TemplatePanel({
  resume,
  onTemplateChange,
  onSettingsChange,
  onReset,
}: TemplatePanelProps) {
  const s = resolveSettings(resume);
  const idBase = useId();
  const templates = listTemplates();

  return (
    <div className="flex flex-col gap-4">
      {/* Template picker */}
      <section aria-label="Template" className="flex flex-col gap-2">
        <h3 className="text-base font-bold">Template</h3>
        <div
          role="radiogroup"
          aria-label="Choose a template"
          className="grid grid-cols-2 gap-2"
        >
          {templates.map((t) => {
            const selected = t.id === resume.templateId;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-current={selected ? "true" : undefined}
                onClick={() => onTemplateChange(t.id)}
                className={`${CARD} ${
                  selected
                    ? "bg-[var(--color-yellow)]"
                    : "bg-[var(--color-white)]"
                }`}
              >
                <img
                  src={t.thumbnail}
                  alt=""
                  width={120}
                  height={170}
                  loading="lazy"
                  className="h-auto w-full border-2 border-[var(--color-ink)]"
                />
                <span className="font-semibold">{t.name}</span>
                <span className="text-xs text-[var(--color-ink)]/70">
                  {t.description}
                </span>
                <span className="mt-1 flex gap-1 text-[10px] font-bold uppercase">
                  <span className="border-2 border-[var(--color-ink)] px-1">
                    {t.category}
                  </span>
                  <span className="border-2 border-[var(--color-ink)] px-1">
                    {t.layout}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Settings */}
      <section aria-label="Appearance" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">Appearance</h3>
          <button
            type="button"
            className="neo-button min-h-[44px] bg-[var(--color-white)] px-3 text-sm text-[var(--color-ink)]"
            onClick={onReset}
          >
            Reset
          </button>
        </div>

        {/* Font family */}
        <label className="flex flex-col gap-1 text-sm font-medium">
          Font family
          <select
            className={CTRL}
            value={s.fontFamily}
            onChange={(e) => onSettingsChange({ fontFamily: e.target.value })}
          >
            {/* Keep current custom value selectable even if off-list. */}
            {FONT_FAMILIES.some((f) => f.value === s.fontFamily) ? null : (
              <option value={s.fontFamily}>Current</option>
            )}
            {FONT_FAMILIES.map((f) => (
              <option key={f.label} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>

        <RangeControl
          id={`${idBase}-scale`}
          label="Font size"
          value={s.fontScale}
          bounds={BOUNDS.fontScale}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => onSettingsChange({ fontScale: v })}
        />
        <RangeControl
          id={`${idBase}-lh`}
          label="Line height"
          value={s.lineHeight}
          bounds={BOUNDS.lineHeight}
          format={(v) => v.toFixed(2)}
          onChange={(v) => onSettingsChange({ lineHeight: v })}
        />
        <RangeControl
          id={`${idBase}-spacing`}
          label="Section spacing"
          value={s.sectionSpacing}
          bounds={BOUNDS.sectionSpacing}
          format={(v) => `${v}mm`}
          onChange={(v) => onSettingsChange({ sectionSpacing: v })}
        />
        <RangeControl
          id={`${idBase}-margin`}
          label="Page margin"
          value={s.margin}
          bounds={BOUNDS.margin}
          format={(v) => `${v}mm`}
          onChange={(v) => onSettingsChange({ margin: v })}
        />

        {/* Accent color */}
        <fieldset className="flex flex-col gap-1">
          <legend className="text-sm font-medium">Accent color</legend>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENT_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Accent ${c}`}
                aria-pressed={s.accentColor.toLowerCase() === c}
                onClick={() => onSettingsChange({ accentColor: c })}
                className={`h-8 w-8 border-2 ${
                  s.accentColor.toLowerCase() === c
                    ? "border-[var(--color-ink)] ring-2 ring-[var(--color-ink)]"
                    : "border-[var(--color-ink)]"
                }`}
                style={{ background: c }}
              />
            ))}
            <input
              type="color"
              aria-label="Custom accent color"
              value={s.accentColor}
              onChange={(e) =>
                onSettingsChange({ accentColor: e.target.value })
              }
              className="h-8 w-12 border-2 border-[var(--color-ink)]"
            />
          </div>
        </fieldset>

        {/* Alignment */}
        <label className="flex flex-col gap-1 text-sm font-medium">
          Header alignment
          <select
            className={CTRL}
            value={s.alignment}
            onChange={(e) =>
              onSettingsChange({
                alignment: e.target.value === "center" ? "center" : "left",
              })
            }
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
          </select>
        </label>

        {/* Toggles */}
        <Toggle
          label="Section dividers"
          checked={s.divider}
          onChange={(v) => onSettingsChange({ divider: v })}
        />
        <Toggle
          label="Show links"
          checked={s.showLinks}
          onChange={(v) => onSettingsChange({ showLinks: v })}
        />
      </section>
    </div>
  );
}

function RangeControl(props: {
  id: string;
  label: string;
  value: number;
  bounds: { min: number; max: number; step: number };
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const { id, label, value, bounds, format, onChange } = props;
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm font-medium">
      <span className="flex justify-between">
        {label}
        <span className="tabular-nums">{format(value)}</span>
      </span>
      <input
        id={id}
        type="range"
        min={bounds.min}
        max={bounds.max}
        step={bounds.step}
        value={value}
        onChange={(e) =>
          onChange(clamp(Number(e.target.value), bounds.min, bounds.max))
        }
        className="min-h-[44px] w-full"
      />
    </label>
  );
}

function Toggle(props: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-[44px] items-center justify-between gap-2 text-sm font-medium">
      {props.label}
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
        className="h-5 w-5"
      />
    </label>
  );
}
