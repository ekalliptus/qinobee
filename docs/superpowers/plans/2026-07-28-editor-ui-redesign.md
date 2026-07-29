# Editor UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Résumé Editor (topbar, 3-pane layout, form sections, item cards) and consolidate all dialogs/popups into one reusable `Dialog` component — keeping the neo-brutalism identity, improving spacing/hierarchy/density and accessibility.

**Architecture:** Pure presentation/interaction refactor of the existing React editor island + one new `Dialog.tsx` primitive. No backend, schema, service, or route changes. Existing store API (`store.doc/update/undo/redo/saveNow/save.status`) and section `Updater` signature are preserved. Dialog replaces `window.confirm`, the hand-rolled `ConsentDialog`, AiPanel inline comparison, and ResumeCard's native `<dialog>`+script.

**Tech Stack:** Astro 7 SSR, React 19 islands, TypeScript strict, Tailwind v4 + CSS tokens (neo-brutalism), `bun:test`.

---

## File map

- Create `src/components/ui/Dialog.tsx` — reusable modal primitive (React).
- Create `src/components/ui/dialog-utils.ts` — pure helpers (focusable selector, focus-trap logic) — unit-testable.
- Modify `src/modules/resume/components/ResumeEditor.tsx` — topbar groups + overflow menu, 3-pane proportions, sticky section header, mobile.
- Modify `src/modules/resume/components/SectionNav.tsx` — status pills, active state (minor).
- Modify `src/modules/resume/components/Preview.tsx` — pane sizing / internal scroll (minor).
- Modify `src/modules/resume/components/sections/list-editors.tsx` — `ItemToolbar` delete via Dialog callback (not window.confirm).
- Modify each `src/modules/resume/components/sections/*.tsx` — consistent field grid + spacing + item cards + wire Dialog for delete.
- Modify `src/modules/resume/components/AiPanel.tsx` — comparison moved into Dialog (size lg); consent via Dialog.
- Delete `src/modules/resume/components/ConsentDialog.tsx` (folded into Dialog usage).
- Modify `src/components/app/ResumeCard.astro` — rename/delete via a small Dialog island (replace native `<dialog>` + script).
- Create `src/components/app/ResumeCardDialog.tsx` — tiny React island for rename/delete confirm using Dialog.
- Test `tests/ui/dialog-utils.test.ts` — pure focusable/focus-trap helpers.

---

## Task R1: Dialog primitive + pure helpers (TDD for helpers)

**Files:**
- Create: `src/components/ui/dialog-utils.ts`
- Create: `src/components/ui/Dialog.tsx`
- Test: `tests/ui/dialog-utils.test.ts`

- [ ] **Step 1: Write the failing test for pure helpers**

`tests/ui/dialog-utils.test.ts`:
```ts
import { test, expect } from "bun:test";
import { getFocusableSelector, isFocusableCandidate } from "@components/ui/dialog-utils";

test("getFocusableSelector returns the standard selector string", () => {
  const sel = getFocusableSelector();
  expect(sel).toContain("a[href]");
  expect(sel).toContain("button:not([disabled])");
  expect(sel).toContain("textarea");
  expect(sel).toContain("input");
  expect(sel).toContain("select");
  expect(sel).toContain('[tabindex]:not([tabindex="-1"])');
});

test("isFocusableCandidate rejects hidden elements", () => {
  // element not visible -> not a candidate
  const el = { tagName: "A", getAttribute: () => null, hidden: true } as unknown as Element;
  expect(isFocusableCandidate(el)).toBe(false);
});
```
Run: `bun test tests/ui/dialog-utils.test.ts` → FAIL (module missing).

- [ ] **Step 2: Implement `dialog-utils.ts`**

```ts
// Standard CSS selector for focusable elements, used by the Dialog focus trap.
export function getFocusableSelector(): string {
  return [
    "a[href]",
    "button:not([disabled])",
    "textarea:not([disabled])",
    "input:not([disabled]):not([type=\"hidden\"])",
    "select:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");
}

// Filter helper: skip elements that are hidden (display:none / hidden attr) or
// removed from the tab order. Used to validate candidates returned by querySelectorAll.
export function isFocusableCandidate(el: Element): boolean {
  const html = el as HTMLElement;
  if (html.hidden) return false;
  if (html.getAttribute("disabled") !== null) return false;
  // offsetParent is null for display:none elements (not for position:fixed).
  // Avoid relying solely on it to keep the helper DOM-light, but use when present.
  if (typeof html.offsetParent === "undefined") return true; // jsdom/no-layout: assume visible
  return html.offsetParent !== null;
}

// Returns the ordered list of focusable elements inside a container.
export function getFocusable(container: HTMLElement): HTMLElement[] {
  const nodes = Array.from(
    container.querySelectorAll<HTMLElement>(getFocusableSelector()),
  );
  return nodes.filter(isFocusableCandidate);
}
```

- [ ] **Step 3: Run test → PASS**

- [ ] **Step 4: Implement `Dialog.tsx`**

A controlled modal using a React portal-less overlay (fixed inset). Uses the helpers above for the focus trap.

```tsx
import { useEffect, useRef, useState, type ReactNode } from "react";
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
  size?: Size;            // sm=480 md=560 lg=720
  initialFocus?: "body" | "primary";
}

const SIZE_CLASS: Record<Size, string> = {
  sm: "max-w-[480px]",
  md: "max-w-[560px]",
  lg: "max-w-[720px]",
};

const PRIMARY_BG: Record<Variant, string> = {
  default: "bg-[var(--color-yellow)]",
  danger: "bg-[var(--color-red)] text-[var(--color-white)]",
};

export function Dialog({
  open, title, onClose, children,
  variant = "default", primaryLabel, onPrimary,
  size = "sm", initialFocus = "body",
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Scroll lock + focus trap while open.
  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const el = dialogRef.current;
    if (el) {
      const focusables = getFocusable(el);
      const target = initialFocus === "primary" && primaryLabel
        ? el.querySelector<HTMLElement>("[data-dialog-primary]")
        : focusables[0];
      target?.focus();
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const f = getFocusable(dialogRef.current);
      if (f.length === 0) return;
      const first = f[0]!, last = f[f.length - 1]!;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-ink)]/40 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`neo-card ${SIZE_CLASS[size]} w-full bg-[var(--color-white)]`}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-[var(--font-heading)] text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="neo-button min-h-[44px] min-w-[44px] bg-[var(--color-white)] px-2 text-sm"
          >×</button>
        </div>
        <div className="mt-4 flex flex-col gap-4">{children}</div>
        {primaryLabel && onPrimary && (
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="neo-button min-h-[44px] px-4 bg-[var(--color-white)] text-sm">Cancel</button>
            <button
              type="button"
              data-dialog-primary
              onClick={onPrimary}
              className={`neo-button min-h-[44px] px-4 text-sm ${PRIMARY_BG[variant]}`}
            >{primaryLabel}</button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify**

Run: `bun test tests/ui/dialog-utils.test.ts` → PASS
Run: `bun run check` → 0 errors
Run: `bun run build` → success

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Dialog.tsx src/components/ui/dialog-utils.ts tests/ui/dialog-utils.test.ts
git commit -m "feat(ui): reusable Dialog primitive with focus trap + scroll lock"
```

---

## Task R2: Refactor ResumeEditor — topbar groups + overflow menu + 3-pane proportions

**Files:**
- Modify: `src/modules/resume/components/ResumeEditor.tsx`

Context from audit: topbar is one `flex flex-wrap gap-3` with 7+ buttons (Undo/Redo/SaveNow/Template/Score/Match/Download). 3-pane grid `md:grid-cols-[minmax(0,220px)_minmax(0,1fr)_minmax(0,360px)]`. Mobile segmented control already exists.

- [ ] **Step 1: Restructure the topbar into left group + right group + overflow menu**

Replace the single button row (around lines 168–219) with:
- **Left group**: back link `<a href="/app/resume">←</a>`, résumé title (click → inline edit: a controlled `<input>` toggled by an `editingTitle` state, blur/Enter saves via `store.update({ title })`), save-status dot + text in `aria-live="polite"` using `STATUS_LABEL[store.save.status]`.
- **Right primary group**: Undo, Redo, "ATS Score" (toggles `showScore`), "Export PDF" (`<a href={exportUrl}>`).
- **Overflow "More" ▾**: a button with `aria-expanded`/`aria-controls="editor-more-menu"` that toggles a dropdown containing: Template (toggles `showTemplates`), Match with a Job (toggles `showMatch`). Implement the dropdown as a relative-positioned panel with: Escape close, click-outside close (a `useEffect` listening for `document` mousedown when open), focus moves to first item on open, arrow-key navigation optional but Escape + click-outside required.

Keep `BTN = "neo-button min-h-[44px] px-3 text-sm ..."` for buttons. Remove the now-redundant top-level Template/Match/SaveNow buttons (SaveNow can move into the More menu too, or stay accessible via autosave — keep it in More).

- [ ] **Step 2: Fix 3-pane proportions + sticky section header**

Change the desktop grid (around line 323) to:
```tsx
<div className="hidden gap-4 md:grid md:grid-cols-[220px_minmax(0,1fr)_minmax(0,45%)]">
```
Ensure the form pane is `min-w-0 overflow-y-auto` and the preview pane is `min-w-0 overflow-auto`. The active section's header (the `<h2>` rendered by each section component) should stick to the top of the form pane: wrap the rendered section in a container and give the section's header `sticky top-0 z-10 bg-[var(--color-paper)]`. (If sections already render their own `<h2>`, add a `sticky`-headed wrapper in ResumeEditor around `{form}`.) Ensure no horizontal overflow: all grid children `min-w-0`.

- [ ] **Step 3: Keep mobile segmented control + drawer**

Mobile (<md): keep the Edit | Preview | Score segmented control. On mobile the nav (SectionNav) should be reachable — render it as a horizontal scrollable pill strip above the form when mobileTab==="edit", instead of a full 220px column. Keep the topbar compact on mobile (back, title, More).

- [ ] **Step 4: Verify**

Run: `bun run check` → 0 errors
Run: `bun run build` → success
Manual reasoning: confirm no `window.confirm`, topbar has left/right/overflow structure, grid columns are 220/1fr/45%.

- [ ] **Step 5: Commit**

```bash
git add src/modules/resume/components/ResumeEditor.tsx
git commit -m "refactor(editor): grouped topbar + overflow menu + 3-pane proportions"
```

---

## Task R3: Form sections — consistent field grid, spacing, item cards, Dialog for delete

**Files:**
- Modify: `src/modules/resume/components/sections/list-editors.tsx`
- Modify: `src/modules/resume/components/sections/{PersonalInfo,Summary,WorkExperience,Education,Projects,Skills}Section.tsx`

- [ ] **Step 1: Change `ItemToolbar` delete to use a Dialog callback instead of `window.confirm`**

In `list-editors.tsx`, `ItemToolbar` currently calls `confirm(...)`. Change its contract: add an `onDelete` that is ONLY invoked after confirmation. Introduce a small local confirm Dialog inside `ItemToolbar`:
- Add state `const [confirmOpen, setConfirmOpen] = useState(false)`.
- The delete `×`/Delete button calls `setConfirmOpen(true)` (no `confirm()`).
- Render `<Dialog open={confirmOpen} title={\`Delete this ${label}??\} variant="danger" primaryLabel="Delete" onPrimary={() => { setConfirmOpen(false); onDelete(); }} onClose={() => setConfirmOpen(false)}>This action cannot be undone.</Dialog>` (import `Dialog` from `@components/ui/Dialog`).
- Remove the `confirm(...)` call entirely.
`ItemToolbar` props unchanged except it now manages its own confirm Dialog.

- [ ] **Step 2: Standardize item card + field grid across all section components**

For each item-card section (Work/Education/Projects/Skills/PersonalInfo-links):
- Card wrapper class: `flex flex-col gap-3 border-2 border-[var(--color-ink)] rounded-[var(--radius)] p-4 bg-[var(--color-white)]` (note `p-4` not `p-3`; consistent).
- Header row inside the card: auto-derived title + `<ReorderControls>` + delete, so the item header is consistent. (Skills group card: header = label + reorder + delete.)
- Field grid: `grid gap-4 sm:grid-cols-2`. Pairs that should share a row: (First/Last name), (City/Country), (Start month/Start year) etc. Long fields (`sm:col-span-2` / `col-span-full`). For the 4-column date grid use `grid gap-4 sm:grid-cols-4`.
- Spacing between cards: parent list `flex flex-col gap-4`. "Add" button below list: `neo-button` full-width or left-aligned, `mt-2`.
- Ensure every section's root is `<section className="flex flex-col gap-6">` with an `<h2 className="text-xl font-bold">` heading (so the sticky header in ResumeEditor has a target). Keep hints/counters under fields via the existing `TextField`/`TextArea` `hint`.

Do NOT change field components' APIs (`TextField`/`TextArea`/`SelectField`/`CheckboxField` stay). Just reorganize their container grid + spacing.

- [ ] **Step 3: Verify**

Run: `bun run check` → 0 errors
Run: `bun run build` → success
Grep: `grep -rn "window.confirm\|confirm(" src/modules/resume/components/sections/` → no matches (delete now via Dialog).

- [ ] **Step 4: Commit**

```bash
git add src/modules/resume/components/sections/
git commit -m "refactor(editor): consistent field grid + item cards + Dialog delete confirm"
```

---

## Task R4: AI comparison + consent moved into Dialog

**Files:**
- Modify: `src/modules/resume/components/AiPanel.tsx`
- Delete: `src/modules/resume/components/ConsentDialog.tsx`

- [ ] **Step 1: Render the AI comparison inside a Dialog (size lg)**

In `AiPanel.tsx`, when a result is available, wrap the Original↔Suggested comparison in `<Dialog open title="Improve with AI" size="lg" variant="default" primaryLabel="Apply" onPrimary={apply} onClose={reject}>`. The two labelled `<section aria-label="Original text">` / `"Suggested text"` regions stay inside the Dialog body. Keep the `changes` list and source badge inside. The "Reject" action = `onClose`; "Apply" = `onPrimary`. Set `initialFocus="body"` so focus lands on the comparison, not Apply (safer). Remove the inline Apply/Reject buttons (the Dialog provides them via primaryLabel/onPrimary + onClose). If `result` is null, keep the generate/loading UI inline (small) — only the comparison is modal.

`AiPanel` props: keep `{ kind, text, consented, onConsented, onApply, onClose? }`. `onClose` now closes the Dialog (reject). `onApply` applies then closes.

- [ ] **Step 2: Replace ConsentDialog with a Dialog usage**

Delete `ConsentDialog.tsx`. In `AiPanel`, where it previously rendered `<ConsentDialog>`, render `<Dialog open title="Enable AI suggestions?" primaryLabel="Enable" onPrimary={doConsent} onClose={onCancel}><p>AI suggestions process the selected field text to generate writing feedback. Review all suggestions before applying them.</p></Dialog>`. `doConsent` POSTs `/api/resume/ai/consent` then calls `onConsented`; `onCancel` hides the consent dialog. Remove the old ConsentDialog import everywhere (grep `ConsentDialog`).

- [ ] **Step 3: Verify**

Run: `bun run check` → 0 errors (no dangling ConsentDialog imports).
Run: `bun run build` → success.
Grep: `grep -rn "ConsentDialog" src/` → no matches.

- [ ] **Step 4: Commit**

```bash
git add src/modules/resume/components/AiPanel.tsx
git rm src/modules/resume/components/ConsentDialog.tsx
git commit -m "refactor(editor): AI comparison + consent inside reusable Dialog"
```

---

## Task R5: ResumeCard rename/delete via Dialog island (replace native `<dialog>` + script)

**Files:**
- Create: `src/components/app/ResumeCardDialog.tsx`
- Modify: `src/components/app/ResumeCard.astro`

- [ ] **Step 1: Create a tiny `ResumeCardDialog.tsx` island**

A small React island that manages rename + delete dialogs for one resume. Props: `{ resumeId: string; currentTitle: string }`. It renders two buttons ("Rename", "Delete") OR — to minimize Astro surgery — render the two trigger buttons in Astro and mount this island just to provide the dialogs. Simplest robust approach: the island renders BOTH the trigger buttons and the Dialogs (so no shared script needed):

```tsx
import { useState } from "react";
import { Dialog } from "@components/ui/Dialog";

export function ResumeCardDialog({ resumeId, currentTitle }: { resumeId: string; currentTitle: string }) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [title, setTitle] = useState(currentTitle);
  return (
    <>
      <button className="neo-button ..." onClick={() => setRenameOpen(true)}>Rename</button>
      <button className="neo-button ..." onClick={() => setDeleteOpen(true)}>Delete</button>
      <Dialog open={renameOpen} title="Rename CV" primaryLabel="Save"
        onPrimary={() => {
          const form = document.createElement("form");
          form.method = "POST"; form.action = `/api/resume/${resumeId}/rename`;
          const i = document.createElement("input"); i.name = "title"; i.value = title; form.appendChild(i);
          document.body.appendChild(form); form.submit();
        }}
        onClose={() => setRenameOpen(false)}>
        <label className="font-medium">CV name
          <input className="neo-input mt-1 w-full" value={title} onChange={(e)=>setTitle(e.target.value)} />
        </label>
      </Dialog>
      <Dialog open={deleteOpen} title="Delete CV?" variant="danger" primaryLabel="Delete"
        onPrimary={() => {
          const form = document.createElement("form");
          form.method = "POST"; form.action = `/api/resume/${resumeId}/delete`;
          document.body.appendChild(form); form.submit();
        }}
        onClose={() => setDeleteOpen(false)}>
        <p>This will permanently delete "{currentTitle}". This action cannot be undone.</p>
      </Dialog>
    </>
  );
}
```
(Submitting a hidden form keeps the existing POST endpoints working with no JS routing.)

- [ ] **Step 2: Wire into ResumeCard.astro**

Replace the native `<dialog>` elements + the delegated `<script>` block with `<ResumeCardDialog client:idle resumeId={resume.id} currentTitle={resume.title} />` mounted where the Rename/Delete buttons were. Remove the `data-open-dialog`/`data-close-dialog` attributes and the inline script. Keep the other actions (Edit/Download/Duplicate) as Astro links/forms as-is.

- [ ] **Step 3: Verify**

Run: `bun run check` → 0 errors
Run: `bun run build` → success
Grep: `grep -n "data-open-dialog\|showModal()\|<dialog" src/components/app/ResumeCard.astro` → no matches.

- [ ] **Step 4: Commit**

```bash
git add src/components/app/ResumeCardDialog.tsx src/components/app/ResumeCard.astro
git commit -m "refactor(app): ResumeCard rename/delete via Dialog island (drop native dialog + script)"
```

---

## Task R6: Verification + deploy

- [ ] **Step 1:** `bun run check` → 0 errors.
- [ ] **Step 2:** `bun test` → all green (existing tests unaffected; new dialog-utils tests pass).
- [ ] **Step 3:** `bun run build` → success.
- [ ] **Step 4:** Redeploy: `bunx wrangler deploy`.
- [ ] **Step 5:** Manual smoke (live): open `/app/resume/<id>/edit` at desktop width — topbar grouped with More menu, 3 panes proportional, no horizontal overflow; open a section, delete an item → Dialog appears, Escape closes, focus returns; trigger AI improve → comparison Dialog; 320px width — segmented control, no overflow. Resume list → Rename/Delete via Dialog.
- [ ] **Step 6:** Commit + push.

```bash
git add -A
git commit -m "chore(editor-ui): verification + deploy"
git push origin main
```

---

## Notes for the implementer

- Pure presentation refactor — do NOT change store API, section `Updater`, endpoints, schemas, or data.
- Keep neo-brutalism tokens/classes (`.neo-button`, `.neo-card`, `.neo-input`, `--space-*`). Improve spacing/hierarchy, not identity.
- Dialog is the ONE modal primitive; delete `ConsentDialog`, native `<dialog>`+script, and `window.confirm`.
- No horizontal overflow anywhere — `min-w-0` on every flex/grid child; preview scrolls internally.
- Accessibility: focus trap + Escape + scroll-lock in Dialog; `aria-live` save status; ≥44px targets; reduced motion respected (Dialog transition disabled under `prefers-reduced-motion` — add a `@media` guard or omit animation if uncertain).
```
