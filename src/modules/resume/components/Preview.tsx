import type { ReactNode } from "react";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FileText, Maximize2, Minus, Plus } from "lucide-react";
import type { ResumeDocument } from "@modules/resume/types";
import { getTemplate } from "@modules/resume/templates/registry";
import {
  A4_PAGE_MM,
  pageBoundaryOffsetsMm,
  pageBreakInfo,
  pxToMm,
} from "@modules/resume/utils/page-break";
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

function Preview(props: {
  resume: ResumeDocument;
  className?: string;
  appearance?: ReactNode;
}) {
  const { resume, className } = props;
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
        const availPx = viewport.clientWidth - 48; // p-6 padding budget
        const a4wPx = content.getBoundingClientRect().width / (zoomRef.current || 1);
        const fitWidthScale = availPx / a4wPx;
        // Readable floor: computed fit never goes microscopic (manual +/- can).
        let next = Math.max(fitWidthScale, 0.62);
        if (fitRef.current === "page") {
          // Fit ONE A4 page height into the viewport (not the full content, which
          // may span multiple pages). A4 height in px at the current content scale.
          const availH = viewport.clientHeight - 48;
          const a4hPx = (297 * a4wPx) / 210; // preserve aspect ratio
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
    // Count against the full A4 page (print uses @page margin:0); a small
    // tolerance keeps a page that just fills 297mm from counting as 2.
    () => (heightMm == null ? null : pageBreakInfo(heightMm, A4_PAGE_MM, 6)),
    [heightMm],
  );

  const boundaries = useMemo(
    () => (heightMm == null ? [] : pageBoundaryOffsetsMm(heightMm, A4_PAGE_MM)),
    [heightMm],
  );

  const nudge = (delta: number) => {
    setFit("none");
    setZoom((z) => clampZoom(z + delta));
  };

  const pages = info?.pages ?? 1;

  return (
    <div className={`flex min-w-0 flex-col gap-2 ${className ?? ""}`}>
      {props.appearance ? <div className="no-print">{props.appearance}</div> : null}
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
        {info ? (
          <span
            aria-live="polite"
            className="flex items-center gap-1 bg-[var(--color-muted)] border-2 border-[var(--color-ink)] rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium"
          >
            <FileText size={14} aria-hidden="true" />
            {pages} {pages === 1 ? "page" : "pages"}
          </span>
        ) : null}
      </div>

      <div
        ref={viewportRef}
        className="relative w-full overflow-auto bg-[var(--color-muted)] p-6 md:max-h-[calc(100vh-7rem)]"
      >
        {/* Scale with CSS `zoom` (not `transform`): zoom scales the LAYOUT box
            too, so height:auto grows with content, `margin:0 auto` centers, and
            a multi-page CV becomes a genuinely tall, scrollable page. `transform`
            would keep the unscaled layout height and clip/mis-scroll. Page-break
            separators sit every 297mm inside the page (pre-zoom units) so they
            align with each A4 boundary and scale with zoom. */}
        <div
          style={{
            zoom,
            width: `${A4_WIDTH_MM}mm`,
            margin: "0 auto",
            position: "relative",
          }}
        >
          {/* Kulit luar (kertas). Tingginya dipaksa kelipatan penuh halaman. */}
          <div 
            className="resume-page resume-page--flow"
            style={{ minHeight: `${pages * 297}mm` }}
          >
            {/* Isi asli CV yang kita jadikan acuan ukuran (tanpa paksaan tinggi). */}
            <div ref={contentRef}>
              <TemplateStage resume={resume} />
            </div>
          </div>
          {boundaries.map((topMm, i) => (
            <div
              key={i}
              className="no-print preview-page-break"
              aria-hidden="true"
              style={{ position: "absolute", left: "-20mm", right: "-20mm", top: `${topMm}mm` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(Preview);
