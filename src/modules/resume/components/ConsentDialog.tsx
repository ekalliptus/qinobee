import { useEffect, useRef, useState } from "react";

const BTN = "neo-button min-h-[44px] px-3 text-sm";

/**
 * Accessible consent modal shown before the first AI use.
 * Focus trap + Escape + overlay-close. POSTs consent, then proceeds.
 */
export default function ConsentDialog(props: {
  onConsented: () => void;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        props.onCancel();
      }
      if (e.key === "Tab") {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          "button, [href], input, [tabindex]:not([tabindex='-1'])",
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [props]);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/resume/ai/consent", { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      props.onConsented();
    } catch {
      setError("Could not save your choice. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        aria-describedby="consent-desc"
        className="neo-card max-w-md bg-[var(--color-white)] text-[var(--color-ink)]"
      >
        <h2 id="consent-title" className="text-lg font-bold">
          Enable AI writing suggestions
        </h2>
        <p id="consent-desc" className="mt-2 text-sm">
          AI suggestions process selected resume content to generate writing feedback.
          Review all suggestions before applying them.
        </p>
        <p className="mt-2 text-sm">
          Only the specific text you choose to improve (a single bullet or your summary)
          is sent — never your whole resume or personal details.
        </p>
        {error ? (
          <p role="alert" className="mt-2 text-sm font-semibold text-[var(--color-red)]">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <button
            ref={firstBtnRef}
            type="button"
            className={`${BTN} bg-[var(--color-ink)] text-[var(--color-paper)]`}
            disabled={busy}
            onClick={enable}
          >
            {busy ? "Saving…" : "Enable AI suggestions"}
          </button>
          <button
            type="button"
            className={`${BTN} bg-[var(--color-white)] text-[var(--color-ink)]`}
            disabled={busy}
            onClick={props.onCancel}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
