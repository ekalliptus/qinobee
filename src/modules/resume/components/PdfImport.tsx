import { useCallback, useId, useRef, useState } from "react";

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

type Phase = "idle" | "reading" | "ready" | "submitting" | "error";

const NEO_INPUT =
  "neo-input min-h-[44px] w-full border-2 px-3";
const NEO_BUTTON =
  "neo-button min-h-[44px] px-4 text-sm font-semibold";
const INK = { borderColor: "var(--color-ink)", color: "var(--color-ink)" } as const;

function stripExt(name: string): string {
  return name.replace(/\.[^.]+$/, "").trim() || "Imported CV";
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

  const errorId = useId();
  const progressId = useId();
  const previewId = useId();

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
        const line = content.items
          .map((it) => ("str" in it ? it.str : ""))
          .filter(Boolean)
          .join(" ");
        parts.push(line);
        page.cleanup();
      }
      await loadingTask.destroy();

      let extracted = parts.join("\n").replace(/[ \t]+\n/g, "\n").trim();
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
  }, []);

  const onFile = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) void extract(file);
    },
    [extract]
  );

  const submit = useCallback(async () => {
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
        }),
      });

      if (res.status === 401) {
        window.location.href = "/login?next=/app/resume/new";
        return;
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

      const body = (await res.json()) as { ok: boolean; id?: string; warnings?: string[] };
      if (!body.ok || !body.id) {
        setPhase("error");
        setError("Something went wrong creating your draft. Please try again.");
        return;
      }
      if (body.warnings?.length) setWarnings(body.warnings);
      window.location.href = "/app/resume/" + body.id + "/edit";
    } catch {
      setPhase("error");
      setError("Network error. Check your connection and try again.");
    }
  }, [text, title, language]);

  const busy = phase === "reading" || phase === "submitting";

  return (
    <div className="mt-2 flex flex-col gap-3" style={{ color: "var(--color-ink)" }}>
      <p className="text-sm">
        <strong>Private by design:</strong> your PDF is read in your browser. Only the extracted
        text is sent to create a draft you can review and edit. Parsing isn&apos;t perfect.
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

      {phase === "ready" || phase === "submitting" ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Resume name</span>
            <input
              type="text"
              className={NEO_INPUT}
              style={{ ...INK, background: "var(--color-white)" }}
              value={title}
              maxLength={160}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Language</span>
            <select
              className={NEO_INPUT}
              style={{ ...INK, background: "var(--color-white)" }}
              value={language}
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
              disabled={phase === "submitting"}
              aria-describedby={`${previewId} ${progressId}`}
              onClick={() => void submit()}
            >
              {phase === "submitting" ? "Creating draft…" : "Create draft from PDF"}
            </button>
            <button
              type="button"
              className={NEO_BUTTON}
              style={{ ...INK, background: "var(--color-white)" }}
              disabled={phase === "submitting"}
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
