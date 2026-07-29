// Pure helpers for the Dialog focus trap. Framework-agnostic DOM utilities
// so they can be unit-tested with happy-dom (bun:test) without React.

// Standard CSS selector for focusable elements, used by the Dialog focus trap.
export function getFocusableSelector(): string {
  return [
    "a[href]",
    "button:not([disabled])",
    "textarea:not([disabled])",
    'input:not([disabled]):not([type="hidden"])',
    "select:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");
}

// Filter helper: skip elements that are hidden, disabled, or detached from the
// layout (offsetParent === null). In test/jsdom environments offsetParent is
// undefined, in which case we assume visible and defer to other checks.
export function isFocusableCandidate(el: Element): boolean {
  const html = el as HTMLElement;
  if (html.hidden) return false;
  if (html.getAttribute("disabled") !== null) return false;
  if (typeof html.offsetParent === "undefined") return true; // no-layout env
  return html.offsetParent !== null;
}

// Ordered list of focusable elements inside a container (visible & enabled only).
export function getFocusable(container: HTMLElement): HTMLElement[] {
  const nodes = Array.from(
    container.querySelectorAll<HTMLElement>(getFocusableSelector()),
  );
  return nodes.filter(isFocusableCandidate);
}
