import { useEffect, useRef, type ReactNode } from "react";
import { getFocusable } from "./dialog-utils";

type Variant = "default" | "danger";
type Size = "sm" | "md" | "lg";

export interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  variant?: Variant;
  primaryLabel?: string;
  onPrimary?: () => void;
  size?: Size;
  initialFocus?: "body" | "primary";
}

const SIZE_CLASS: Record<Size, string> = {
  sm: "max-w-[480px]",
  md: "max-w-[560px]",
  lg: "max-w-[720px]",
};

const PRIMARY_BG: Record<Variant, string> = {
  default: "bg-[var(--color-yellow)] text-[var(--color-ink)]",
  danger: "bg-[var(--color-red)] text-[var(--color-white)]",
};

/**
 * Controlled modal primitive (React island). Fixed inset overlay + centred
 * neo-card. Features: focus trap (Tab/Shift+Tab wrap), Escape to close,
 * click-on-overlay to close, body scroll-lock, and focus return to the
 * trigger element on close.
 *
 * NOTE: the overlay backdrop uses an inline rgba style rather than Tailwind's
 * `/alpha` modifier, because Tailwind cannot apply alpha to an arbitrary CSS
 * var color string (the modifier would be silently dropped).
 */
export function Dialog({
  open,
  title,
  onClose,
  children,
  variant = "default",
  primaryLabel,
  onPrimary,
  size = "sm",
  initialFocus = "body",
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    // Remember the element that had focus before opening, to restore on close.
    triggerRef.current = document.activeElement as HTMLElement;

    // Lock body scroll while the dialog is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the dialog.
    const el = dialogRef.current;
    if (el) {
      const focusables = getFocusable(el);
      const target =
        initialFocus === "primary" && primaryLabel
          ? (el.querySelector<HTMLElement>("[data-dialog-primary]") ?? undefined)
          : focusables[0];
      target?.focus();
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;

      const f = getFocusable(dialogRef.current);
      if (f.length === 0) return;
      const first = f[0]!;
      const last = f[f.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      triggerRef.current?.focus();
    };
  }, [open, onClose, initialFocus, primaryLabel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto motion-reduce:transition-none"
      style={{ backgroundColor: "rgba(23,23,23,0.4)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="flex min-h-full items-center justify-center p-4 sm:p-6"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={`neo-card ${SIZE_CLASS[size]} w-full bg-[var(--color-white)]`}
        >
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-[var(--font-heading)] text-lg font-bold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="neo-button min-h-[44px] min-w-[44px] bg-[var(--color-white)] px-2 text-sm"
            >
              ×
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-4">{children}</div>

          {primaryLabel && onPrimary ? (
            <div className="mt-6 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="neo-button min-h-[44px] px-4 bg-[var(--color-white)] text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                data-dialog-primary
                onClick={onPrimary}
                className={`neo-button min-h-[44px] px-4 text-sm ${PRIMARY_BG[variant]}`}
              >
                {primaryLabel}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
