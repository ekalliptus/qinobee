import { useState } from "react";
import type { ReactNode } from "react";
import { features } from "@/config/features";
import ConsentDialog from "./ConsentDialog";

const BTN = "neo-button min-h-[44px] px-3 text-sm bg-[var(--color-white)] text-[var(--color-ink)]";
const TONES = [
  "Professional",
  "Concise",
  "Confident",
  "Academic",
  "Entry-level",
  "Leadership",
  "Technical",
] as const;

interface ImproveResponse {
  ok: boolean;
  suggestion?: string;
  changes?: string[];
  source?: "ai" | "fallback";
}

/**
 * AI assist for a single field (a bullet or the summary).
 * Never auto-applies: the user must press Apply. Comparison is screen-reader
 * readable via labelled regions and text headings (not color alone).
 */
/** Render-prop passed down to sections so they can offer AI assist per field. */
export type RenderAiAssist = (args: {
  kind: "bullet" | "summary";
  text: string;
  onApply: (newText: string) => void;
}) => ReactNode;

/**
 * A toggle button that reveals AiPanel for a single field.
 * Used inline in the Summary section and per experience bullet.
 */
export function AiAssistField(props: {
  kind: "bullet" | "summary";
  text: string;
  consented: boolean;
  onConsented: () => void;
  onApply: (newText: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!features.aiAssist) return null;
  return (
    <div>
      <button
        type="button"
        className={BTN}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Hide AI assist" : "Improve with AI"}
      </button>
      {open ? (
        <AiPanel
          kind={props.kind}
          text={props.text}
          consented={props.consented}
          onConsented={props.onConsented}
          onApply={(t) => {
            props.onApply(t);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

export default function AiPanel(props: {
  kind: "bullet" | "summary";
  text: string;
  consented: boolean;
  onConsented: () => void;
  onApply: (newText: string) => void;
  onClose?: () => void;
}) {
  const [tone, setTone] = useState<string>("Professional");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImproveResponse | null>(null);
  const [showConsent, setShowConsent] = useState(false);

  if (!features.aiAssist) return null;

  async function generate() {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/resume/ai/improve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: props.kind, text: props.text, tone }),
      });
      if (res.status === 403) {
        setLoading(false);
        setShowConsent(true);
        return;
      }
      if (res.status === 429) {
        throw new Error("You've made too many requests. Please wait a moment.");
      }
      if (!res.ok) throw new Error("Could not generate a suggestion.");
      const data = (await res.json()) as ImproveResponse;
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function onGenerateClick() {
    if (!props.consented) {
      setShowConsent(true);
      return;
    }
    void generate();
  }

  return (
    <div className="neo-card mt-2 flex flex-col gap-3 bg-[var(--color-paper)]">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Improve with AI</h3>
        {props.onClose ? (
          <button type="button" className={BTN} onClick={props.onClose}>
            Close
          </button>
        ) : null}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Tone</span>
        <select
          className="neo-input min-h-[44px]"
          value={tone}
          onChange={(e) => setTone(e.target.value)}
        >
          {TONES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className={`${BTN} bg-[var(--color-ink)] text-[var(--color-paper)]`}
        disabled={loading || props.text.trim().length === 0}
        onClick={onGenerateClick}
      >
        {loading ? "Generating…" : "Generate suggestion"}
      </button>

      <div aria-live="polite">
        {error ? (
          <p role="alert" className="text-sm font-semibold text-[var(--color-red)]">
            {error}
          </p>
        ) : null}

        {result && result.suggestion ? (
          <div className="flex flex-col gap-3">
            {result.source ? (
              <p className="text-sm">
                <span className="font-semibold">Source:</span>{" "}
                {result.source === "ai" ? "AI" : "Rule-based"}
                {result.source === "fallback"
                  ? " — AI is unavailable, so this is a deterministic rewrite."
                  : ""}
              </p>
            ) : null}

            <section aria-label="Original text" className="border-2 border-[var(--color-ink)] rounded-[var(--radius-sm)] p-2">
              <h4 className="text-sm font-bold">Original</h4>
              <p className="whitespace-pre-wrap text-sm">{props.text}</p>
            </section>
            <section aria-label="Suggested text" className="border-2 border-[var(--color-ink)] rounded-[var(--radius-sm)] p-2">
              <h4 className="text-sm font-bold">Suggested</h4>
              <p className="whitespace-pre-wrap text-sm">{result.suggestion}</p>
            </section>

            {result.changes && result.changes.length > 0 ? (
              <div>
                <h4 className="text-sm font-bold">Changes</h4>
                <ul className="list-disc pl-5 text-sm">
                  {result.changes.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex gap-2">
              <button
                type="button"
                className={`${BTN} bg-[var(--color-success)]`}
                onClick={() => {
                  props.onApply(result.suggestion!);
                  setResult(null);
                }}
              >
                Apply
              </button>
              <button type="button" className={BTN} onClick={() => setResult(null)}>
                Reject
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {showConsent ? (
        <ConsentDialog
          onConsented={() => {
            setShowConsent(false);
            props.onConsented();
            void generate();
          }}
          onCancel={() => setShowConsent(false)}
        />
      ) : null}
    </div>
  );
}
