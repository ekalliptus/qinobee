import { useCallback, useId, useRef, useState } from "react";
import { features } from "@/config/features";
import { orderPageText } from "@modules/resume/import/order-text-items";
import { isLikelyScanned } from "@modules/resume/import/scanned";
import type { PDFDocumentProxy } from "pdfjs-dist";

/**
 * I3 — In-browser PDF text extraction island.
 *
 * The binary PDF NEVER leaves the browser: pdf.js runs client-side, and only
 * the extracted plain text is POSTed to /api/resume/import.
 *
 * Worker loading: pdf.js is dynamically imported (keeps it out of every other
 * bundle), and the worker is bundled via Vite's `?url` import of
 * `pdfjs-dist/build/pdf.worker.min.mjs?url` — no CDN dependency.
 */

// Client-side caps (server also validates text length: 1..100000).
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_PAGES = 15;
const MAX_TEXT_CHARS = 100_000;
const PREVIEW_CHARS = 500;
// OCR fallback is slow; cap pages and use 2x scale for legible glyphs.
const MAX_OCR_PAGES = 5;
const OCR_SCALE = 2;

type Phase =
  | "idle"
  | "reading"
  | "ocr"
  | "ready"
  | "submitting"
  | "awaiting-consent"
  | "error";

const NEO_INPUT =
  "neo-input min-h-[44px] w-full border-2 px-3";
const NEO_BUTTON =
  "neo-button min-h-[44px] px-4 text-sm font-semibold";
const INK = { borderColor: "var(--color-ink)", color: "var(--color-ink)" } as const;

function stripExt(name: string): string {
  return name.replace(/\.[^.]+$/, "").trim() || "Imported CV";
}

/**
 * In-browser OCR fallback for scanned PDFs. Renders each page to a canvas with
 * pdf.js, then recognizes text with a lazily-loaded tesseract.js worker (v7:
 * `createWorker(lang)` returns a ready worker). The page image never leaves the
 * device; only the wasm/model files are fetched from tesseract's CDN.
 */
async function runOcr(
  doc: PDFDocumentProxy,
  pageCount: number,
  language: "id" | "en",
  setProgress: (s: string) => void
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const lang = language === "id" ? "ind" : "eng";
  const worker = await createWorker(lang);
  const n = Math.min(pageCount, MAX_OCR_PAGES);
  const parts: string[] = [];
  try {
    for (let p = 1; p <= n; p++) {
      setProgress(`OCR page ${p} of ${n}…`);
      const page = await doc.getPage(p);
      const viewport = page.getViewport({ scale: OCR_SCALE });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvas, viewport }).promise;
      const { data } = await worker.recognize(canvas);
      parts.push(data.text);
      page.cleanup();
    }
  } finally {
    await worker.terminate();
  }
  return parts.join("\n\n").replace(/[ \t]+\n/g, "\n").trim();
}

export default function PdfImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [truncated, setTruncated] = useState(false);
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState<"id" | "en">("id");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [useAi, setUseAi] = useState(false);

  const aiEnabled = features.aiAssist;
  const errorId = useId();
  const progressId = useId();
  const previewId = useId();
  const aiHelpId = useId();
  const consentDescId = useId();

  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
    setProgress("");
    setText("");
    setTruncated(false);
    setWarnings([]);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const extract = useCallback(async (file: File) => {
    setError(null);
    setWarnings([]);
    // Validate client-side.
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setPhase("error");
      setError("That file isn't a PDF. Please choose a .pdf file.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setPhase("error");
      setError("That PDF is larger than 10 MB. Please choose a smaller file.");
      return;
    }

    setPhase("reading");
    setProgress("Loading PDF reader…");
    setTitle((t) => t || stripExt(file.name));

    try {
      const pdfjs = await import("pdfjs-dist");
      // Vite `?url` import: worker is bundled and served locally (no CDN).
      const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

      const data = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data });
      const doc = await loadingTask.promise;
      const pageCount = Math.min(doc.numPages, MAX_PAGES);

      const parts: string[] = [];
      for (let p = 1; p <= pageCount; p++) {
        setProgress(`Reading page ${p} of ${pageCount}…`);
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1 });
        // pdf.js items are `TextItem | TextMarkedContent`; only TextItem has
        // `str`/`transform`. Map the former to positioned items for ordering.
        const items = content.items.flatMap((it) =>
          "str" in it
            ? [{ str: it.str, x: it.transform[4], y: it.transform[5], width: it.width ?? 0 }]
            : []
        );
        parts.push(orderPageText(items, { pageWidth: viewport.width }));
        page.cleanup();
      }

      let extracted = parts.join("\n\n").replace(/[ \t]+\n/g, "\n").trim();

      // Scanned/image-only PDFs yield little/no text: fall back to in-browser
      // OCR. tesseract.js is lazy-loaded here so normal imports never pull it.
      if (isLikelyScanned(extracted, pageCount)) {
        setPhase("ocr");
        setProgress(
          "No selectable text found — running OCR on the scanned PDF. This can " +
            "take a while and downloads a language model the first time."
        );
        try {
          extracted = await runOcr(doc, pageCount, language, setProgress);
        } catch {
          await loadingTask.destroy();
          setPhase("error");
          setError(
            "OCR failed on this PDF. It may be an unsupported image, or the " +
              "language model couldn't be downloaded. Please try another file."
          );
          return;
        }
        if (isLikelyScanned(extracted, pageCount)) {
          await loadingTask.destroy();
          setPhase("error");
          setError(
            "Could not read text from this PDF (it may be an image with no " +
              "recognizable text). Please try another file."
          );
          return;
        }
      }

      await loadingTask.destroy();

      let didTruncate = false;
      if (extracted.length > MAX_TEXT_CHARS) {
        extracted = extracted.slice(0, MAX_TEXT_CHARS);
        didTruncate = true;
      }

      if (!extracted) {
        setPhase("error");
        setError(
          "We couldn't read any text from that PDF. It may be a scanned image. Try a text-based PDF."
        );
        return;
      }

      setText(extracted);
      setTruncated(didTruncate);
      setProgress(
        `Read ${extracted.length.toLocaleString()} characters from ${pageCount} page${
          pageCount === 1 ? "" : "s"
        }.`
      );
      setPhase("ready");
    } catch {
      setPhase("error");
      setError("We couldn't read that PDF. It may be corrupted or password-protected.");
    }
  }, [language]);

  const onFile = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) void extract(file);
    },
    [extract]
  );

  // POST the extracted text to create the draft. `withAi` sends the text to the
  // AI provider server-side; consent is verified before this is ever called.
  const doImport = useCallback(
    async (withAi: boolean) => {
      setPhase("submitting");
      setError(null);
      setWarnings([]);
      try {
        const res = await fetch("/api/resume/import", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            text,
            title: title.trim() || undefined,
            language,
            templateId: "essential",
            useAi: withAi,
          }),
        });

        if (res.status === 401) {
          window.location.href = "/login?next=/app/resume/new";
          return;
        }
        // Defensive: consent flow should have run, but honour a server 403.
        if (res.status === 403) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          if (body?.error === "consent_required") {
            setPhase("awaiting-consent");
            return;
          }
        }
        if (!res.ok) {
          setPhase("error");
          setError(
            res.status === 413
              ? "The extracted text is too large for the server. Try a shorter CV."
              : res.status === 429
                ? "Too many imports right now. Please wait a minute and try again."
                : res.status === 400
                  ? "The server rejected the extracted text. Try a different PDF."
                  : "Something went wrong creating your draft. Please try again."
          );
          return;
        }

        const body = (await res.json()) as {
          ok: boolean;
          id?: string;
          warnings?: string[];
          aiStructured?: boolean;
        };
        if (!body.ok || !body.id) {
          setPhase("error");
          setError("Something went wrong creating your draft. Please try again.");
          return;
        }
        if (body.warnings?.length) setWarnings(body.warnings);
        if (body.aiStructured) {
          setProgress("AI organised your experience & education — review on the next screen.");
        }
        window.location.href = "/app/resume/" + body.id + "/edit";
      } catch {
        setPhase("error");
        setError("Network error. Check your connection and try again.");
      }
    },
    [text, title, language]
  );

  // Entry point for "Create draft". Checks consent first when AI is on.
  const submit = useCallback(async () => {
    if (useAi && aiEnabled) {
      setPhase("submitting");
      setError(null);
      try {
        const res = await fetch("/api/resume/ai/consent", {
          method: "GET",
          credentials: "same-origin",
        });
        if (res.status === 401) {
          window.location.href = "/login?next=/app/resume/new";
          return;
        }
        if (res.ok) {
          const body = (await res.json()) as { consent?: boolean };
          if (!body.consent) {
            setPhase("awaiting-consent");
            return;
          }
        }
        // On any non-OK GET, fall through: doImport handles a 403 defensively.
      } catch {
        // Network hiccup on the check: let doImport surface the real error.
      }
    }
    await doImport(useAi && aiEnabled);
  }, [useAi, aiEnabled, doImport]);

  // User accepted the inline consent step: record consent, then import with AI.
  const acceptConsent = useCallback(async () => {
    setPhase("submitting");
    setError(null);
    try {
      const res = await fetch("/api/resume/ai/consent", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(String(res.status));
      await doImport(true);
    } catch {
      setPhase("awaiting-consent");
      setError("Could not save your choice. Please try again.");
    }
  }, [doImport]);

  // User declined AI: continue with the deterministic, server-only import.
  const declineConsent = useCallback(() => {
    setUseAi(false);
    setError(null);
    void doImport(false);
  }, [doImport]);

  const busy = phase === "reading" || phase === "ocr" || phase === "submitting";
  const locked = phase === "ocr" || phase === "submitting" || phase === "awaiting-consent";

  return (
    <div className="mt-2 flex flex-col gap-3" style={{ color: "var(--color-ink)" }}>
      <p className="text-sm">
        <strong>Private by design:</strong> your PDF is read in your browser — the file itself
        never leaves your device. Only the extracted text is sent to create a draft you can
        review and edit. With AI structuring off, that text stays on our server only; with AI on,
        the extracted text is also sent to the AI provider. Parsing isn&apos;t perfect.
      </p>
      <p className="text-xs opacity-70">
        If a PDF has no selectable text (a scan or image), we run OCR right here in your browser to
        read it. The image stays on your device — only the OCR language model is downloaded (from a
        CDN) the first time.
      </p>

      {/* Drop zone + keyboard-accessible picker trigger */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!busy) onFile(e.dataTransfer.files);
        }}
        className="flex flex-col items-start gap-2 border-2 border-dashed p-4 motion-safe:transition-colors"
        style={{
          borderColor: "var(--color-ink)",
          background: dragOver ? "var(--color-yellow)" : "transparent",
        }}
      >
        <p className="text-sm">Drag a PDF here, or</p>
        <input
          ref={inputRef}
          id="pdf-import-file"
          type="file"
          accept="application/pdf"
          className="sr-only"
          disabled={busy}
          onChange={(e) => onFile(e.target.files)}
        />
        <button
          type="button"
          className={NEO_BUTTON}
          style={{ ...INK, background: "var(--color-white)" }}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          aria-describedby={error ? errorId : undefined}
        >
          Choose PDF…
        </button>
        <p className="text-xs opacity-70">PDF only, up to 10 MB, first {MAX_PAGES} pages.</p>
      </div>

      {/* Progress (polite) */}
      <p id={progressId} aria-live="polite" className="min-h-[20px] text-sm">
        {progress}
      </p>

      {/* Error (polite, linked to trigger) */}
      {error ? (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="border-2 p-2 text-sm font-semibold"
          style={{ borderColor: "var(--color-ink)", background: "var(--color-yellow)" }}
        >
          {error}
          {phase === "error" ? (
            <>
              {" "}
              <button
                type="button"
                className="underline"
                onClick={reset}
                style={{ color: "var(--color-ink)" }}
              >
                Try another file
              </button>
            </>
          ) : null}
        </p>
      ) : null}

      {phase === "ready" || phase === "submitting" || phase === "awaiting-consent" ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Resume name</span>
            <input
              type="text"
              className={NEO_INPUT}
              style={{ ...INK, background: "var(--color-white)" }}
              value={title}
              maxLength={160}
              disabled={locked}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Language</span>
            <select
              className={NEO_INPUT}
              style={{ ...INK, background: "var(--color-white)" }}
              value={language}
              disabled={locked}
              onChange={(e) => setLanguage(e.target.value as "id" | "en")}
            >
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English</option>
            </select>
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Preview (what we read)</span>
            <pre
              id={previewId}
              className="max-h-40 overflow-auto whitespace-pre-wrap border-2 p-2 text-xs"
              style={{ borderColor: "var(--color-ink)", background: "var(--color-white)" }}
            >
              {text.slice(0, PREVIEW_CHARS)}
              {text.length > PREVIEW_CHARS ? "…" : ""}
            </pre>
            {truncated ? (
              <p className="text-xs opacity-70">
                The CV was long — we kept the first {MAX_TEXT_CHARS.toLocaleString()} characters.
              </p>
            ) : null}
          </div>

          {aiEnabled ? (
            <div className="flex flex-col gap-1">
              <label className="flex items-start gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  className="mt-1 min-h-[20px] min-w-[20px]"
                  checked={useAi}
                  disabled={locked}
                  aria-describedby={aiHelpId}
                  onChange={(e) => setUseAi(e.target.checked)}
                />
                <span>Use AI to structure my experience &amp; education</span>
              </label>
              <p id={aiHelpId} className="pl-7 text-xs opacity-70">
                Sends the extracted text to the AI provider to organise it into entries. You can
                review everything before saving. Rule-based import is used if you leave this off.
              </p>
            </div>
          ) : null}

          {phase === "awaiting-consent" ? (
            <div
              role="group"
              aria-labelledby={consentDescId}
              className="flex flex-col gap-2 border-2 p-3"
              style={{ borderColor: "var(--color-ink)", background: "var(--color-yellow)" }}
            >
              <p id={consentDescId} className="text-sm font-semibold">
                Enable AI structuring?
              </p>
              <p className="text-sm">
                To organise your experience &amp; education, the full extracted text is sent to the
                AI provider. Nothing is saved until you review the draft. You can also continue
                without AI — your text then stays on our server only.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={NEO_BUTTON}
                  style={{
                    borderColor: "var(--color-ink)",
                    background: "var(--color-ink)",
                    color: "var(--color-paper)",
                  }}
                  onClick={() => void acceptConsent()}
                >
                  Enable AI &amp; continue
                </button>
                <button
                  type="button"
                  className={NEO_BUTTON}
                  style={{ ...INK, background: "var(--color-white)" }}
                  onClick={declineConsent}
                >
                  Continue without AI
                </button>
              </div>
            </div>
          ) : null}

          {warnings.length ? (
            <ul className="list-disc pl-5 text-xs">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={NEO_BUTTON}
              style={{ borderColor: "var(--color-ink)", background: "var(--color-ink)", color: "var(--color-paper)" }}
              disabled={locked}
              aria-describedby={`${previewId} ${progressId}`}
              onClick={() => void submit()}
            >
              {phase === "submitting" ? "Creating draft…" : "Create draft from PDF"}
            </button>
            <button
              type="button"
              className={NEO_BUTTON}
              style={{ ...INK, background: "var(--color-white)" }}
              disabled={locked}
              onClick={reset}
            >
              Choose a different file
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
