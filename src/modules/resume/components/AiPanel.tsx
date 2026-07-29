import { useState } from "react";
import type { ReactNode } from "react";
import { features } from "@/config/features";
import { Dialog } from "@components/ui/Dialog";

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
  const [consentBusy, setConsentBusy] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

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

  function handleApply() {
    if (!result?.suggestion) return;
    props.onApply(result.suggestion);
    setResult(null);
    props.onClose?.();
  }

  function handleReject() {
    setResult(null);
    props.onClose?.();
  }

  async function enableConsent() {
    setConsentBusy(true);
    setConsentError(null);
    try {
      const res = await fetch("/api/resume/ai/consent", { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      setShowConsent(false);
      props.onConsented();
      void generate();
    } catch {
      setConsentError("Could not save your choice. Please try again.");
      setConsentBusy(false);
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-3">
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
      </div>

      <Dialog
        open={!!result}
        title="Improve with AI"
        size="lg"
        variant="default"
        primaryLabel="Apply"
        onPrimary={handleApply}
        onClose={handleReject}
        initialFocus="body"
      >
        {result?.source ? (
          <p className="text-sm">
            <span className="font-semibold">Source:</span>{" "}
            {result.source === "ai" ? "AI" : "Rule-based"}
            {result.source === "fallback"
              ? " — AI is unavailable, so this is a deterministic rewrite."
              : ""}
          </p>
        ) : null}

        <section
          aria-label="Original text"
          className="border-2 border-[var(--color-ink)] rounded-[var(--radius-sm)] p-2"
        >
          <h3 className="text-sm font-bold">Original</h3>
          <p className="whitespace-pre-wrap text-sm">{props.text}</p>
        </section>
        <section
          aria-label="Suggested text"
          className="border-2 border-[var(--color-ink)] rounded-[var(--radius-sm)] p-2"
        >
          <h3 className="text-sm font-bold">Suggested</h3>
          <p className="whitespace-pre-wrap text-sm">{result?.suggestion}</p>
        </section>

        {result?.changes && result.changes.length > 0 ? (
          <div>
            <h3 className="text-sm font-bold">Changes</h3>
            <ul className="list-disc pl-5 text-sm">
              {result.changes.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={showConsent}
        title="Enable AI suggestions?"
        variant="default"
        primaryLabel={consentBusy ? "Saving…" : "Enable"}
        onPrimary={enableConsent}
        onClose={() => {
          if (consentBusy) return;
          setShowConsent(false);
          setConsentError(null);
        }}
      >
        <p>
          AI suggestions process the selected field text to generate writing feedback.
          Review all suggestions before applying them.
        </p>
        {consentError ? (
          <p role="alert" className="text-sm font-semibold text-[var(--color-red)]">
            {consentError}
          </p>
        ) : null}
      </Dialog>
    </div>
  );
}
