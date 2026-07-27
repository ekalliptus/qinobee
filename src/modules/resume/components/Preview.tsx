import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import type { ResumeDocument } from "@modules/resume/types";
import { getTemplate } from "@modules/resume/templates/registry";
import { pageBreakInfo, pxToMm } from "@modules/resume/utils/page-break";
import "@/styles/print.css";

const A4_WIDTH_MM = 210;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 0.1;

/** useLayoutEffect on the client, no-op on the server (SSR safety). */
const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

type FitMode = "none" | "width" | "page";

const CTRL =
  "neo-button min-h-[44px] min-w-[44px] px-2 flex items-center justify-center bg-[var(--color-white)] text-[var(--color-ink)] text-sm";

/** Renders the resolved template once per resume change; isolated from zoom state. */
const TemplateStage = memo(function TemplateStage({ resume }: { resume: ResumeDocument }) {
  const T = getTemplate(resume.templateId);
  return <T.component resume={resume} mode="preview" />;
});

function Preview({ resume, className }: { resume: ResumeDocument; className?: string }) {
  const [zoom, setZoom] = useState(0.6);
  const [fit, setFit] = useState<FitMode>("width");
  const [heightMm, setHeightMm] = useState<number | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Refs mirror state so the ResizeObserver callback reads latest without re-subscribing.
  const zoomRef = useRef(zoom);
  const fitRef = useRef(fit);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    fitRef.current = fit;
  }, [fit]);

  // Measure rendered template height (px) -> mm, and drive fit-to-width/page zoom.
  useIsoLayoutEffect(() => {
    const content = contentRef.current;
    const viewport = viewportRef.current;
    if (!content || !viewport || typeof ResizeObserver === "undefined") return;

    const measure = () => {
      const px = content.getBoundingClientRect().height / (zoomRef.current || 1);
      setHeightMm(pxToMm(px));
      if (fitRef.current === "width" || fitRef.current === "page") {
        const availPx = viewport.clientWidth - 24; // padding budget
        const a4wPx = content.getBoundingClientRect().width / (zoomRef.current || 1);
        let next = availPx / a4wPx;
        if (fitRef.current === "page") {
          const availH = viewport.clientHeight - 24;
          const a4hPx = content.getBoundingClientRect().height / (zoomRef.current || 1);
          next = Math.min(next, availH / a4hPx);
        }
        setZoom(clampZoom(next));
      }
    };

    const ro = new ResizeObserver(measure);
    ro.observe(content);
    ro.observe(viewport);
    measure();
    return () => ro.disconnect();
  }, [resume, fit]);

  const info = useMemo(
    () => (heightMm == null ? null : pageBreakInfo(heightMm)),
    [heightMm],
  );

  const nudge = (delta: number) => {
    setFit("none");
    setZoom((z) => clampZoom(z + delta));
  };
  const reset = () => {
    setFit("none");
    setZoom(1);
  };

  return (
    <div className={`flex min-w-0 flex-col gap-2 ${className ?? ""}`}>
      <div
        role="toolbar"
        aria-label="Preview controls"
        className="no-print flex flex-wrap items-center gap-2"
      >
        <button type="button" className={CTRL} aria-label="Zoom out" onClick={() => nudge(-ZOOM_STEP)}>
          <Minus size={18} aria-hidden="true" />
        </button>
        <span aria-live="polite" className="min-w-[44px] text-center text-sm font-medium">
          {Math.round(zoom * 100)}%
        </span>
        <button type="button" className={CTRL} aria-label="Zoom in" onClick={() => nudge(ZOOM_STEP)}>
          <Plus size={18} aria-hidden="true" />
        </button>
        <button type="button" className={CTRL} aria-label="Reset zoom" onClick={reset}>
          <RotateCcw size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`${CTRL} ${fit === "width" ? "bg-[var(--color-ink)] text-[var(--color-paper)]" : ""}`}
          aria-label="Fit width"
          aria-pressed={fit === "width"}
          onClick={() => setFit("width")}
        >
          Fit width
        </button>
        <button
          type="button"
          className={`${CTRL} ${fit === "page" ? "bg-[var(--color-ink)] text-[var(--color-paper)]" : ""}`}
          aria-label="Fit page"
          aria-pressed={fit === "page"}
          onClick={() => setFit("page")}
        >
          <Maximize2 size={16} aria-hidden="true" className="mr-1" />
          Fit page
        </button>
      </div>

      <div
        aria-live="polite"
        className="no-print flex min-h-[24px] items-center gap-1 text-sm font-medium"
      >
        {info ? (
          info.overflow ? (
            <span className="flex items-center gap-1 text-[var(--color-ink)]">
              <AlertTriangle size={16} aria-hidden="true" />
              Content exceeds one page ({info.pages} pages)
            </span>
          ) : (
            <span>Page count: {info.pages}</span>
          )
        ) : null}
      </div>

      <div
        ref={viewportRef}
        className="relative max-h-[70vh] w-full overflow-auto bg-[var(--color-paper)] p-3"
      >
        <div
          style={{
            width: `${A4_WIDTH_MM}mm`,
            transform: `scale(${zoom})`,
            transformOrigin: "top center",
            margin: "0 auto",
          }}
        >
          <div ref={contentRef} className="resume-page">
            <TemplateStage resume={resume} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(Preview);
