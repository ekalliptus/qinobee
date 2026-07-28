# Editor UI Redesign — Design

Date: 2026-07-28
Status: Approved (design), pending spec review

Redesign the Résumé Editor CV and the dialog/popup system for usability. Marketing
pages and the global neo-brutalism style are NOT changed — identity is preserved; this
is a cleanup of spacing, hierarchy, density, and interaction patterns within the editor.

Not a visual re-skin. No data/logic/API changes — purely presentation + interaction.

---

## 1. Scope

### In scope

- Résumé Editor (`ResumeEditor.tsx` island + section components + Preview).
- Topbar layout (group + overflow menu).
- 3-pane desktop layout proportions.
- Form section visual structure (grid, spacing, labels, hints, repeatable groups).
- Item editors (experience/education/project/skill) cards.
- A single reusable `Dialog` component replacing all ad-hoc modals + `window.confirm`.
- AI comparison + consent inside Dialog.
- Accessibility pass for the editor (headings, focus, live regions, reduced motion).

### Out of scope (untouched)

- Marketing site, homepage, solutions, resources.
- Global neo-brutalism tokens (colours, borders, shadows, typography) — kept as-is.
- Resume data model, schemas, repository, services, scoring, matcher, AI service, endpoints.
- Templates (6) and their rendering.
- Auth, dashboard, create wizard, import flow (their cards may reuse the new Dialog if
  trivial, but they are not the focus).

---

## 2. Design principles (constrain the work)

- **Keep neo-brutalism**: 2px ink borders, hard shadows, block colours, paper background.
  Do NOT soften to generic modern SaaS.
- **Reduce density, not identity**: more consistent spacing, clearer hierarchy, fewer
  crowded controls — same visual language.
- **One pattern per concern**: one Dialog component, one item-card pattern, one
  field-grid pattern. Eliminate ad-hoc variants.
- **Keyboard-first**: every action reachable without a pointer; reorder via buttons.
- **No horizontal overflow at any breakpoint** — `min-w-0` on flex/grid children,
  internal scroll for wide content (preview). Never `overflow-x: hidden` as a mask.
- **Accessibility WCAG 2.2 AA-oriented**: heading order, focus-visible, focus trap,
  live regions, ≥44px targets, reduced motion, status not colour-only.

---

## 3. Editor layout (desktop ≥1024px)

Three panes under a sticky topbar. Proportions fixed, content scrolls internally.

```
┌─────────────────────────────────────────────────────────────┐
│ TOPBAR (60px, sticky, solid bg, border-b)                   │
│ ← My Resumes │ Untitled CV │ ● Saved   [↶][↷] [Score][Export][More▾]│
├──────────┬──────────────────────────────┬───────────────────┤
│ NAV 220px│ FORM (flex, min-w-0)          │ PREVIEW ~45%      │
│          │ (scroll, section header sticky│ (overflow-auto,   │
│ ● Pers.  │  inside form)                 │  A4 scaled,       │
│ ○ Summ.  │  field grid (2-col)           │  internal scroll) │
│ ○ Work   │  item cards                   │  zoom toolbar     │
│ ○ Edu    │                              │                   │
│ ○ Skills │                              │                   │
│ ○ Proj.  │                              │                   │
└──────────┴──────────────────────────────┴───────────────────┘
```

- Container: `display:flex; height: calc(100dvh - <topbar>); overflow:hidden`.
- Nav: `flex: 0 0 220px`, own scroll, `min-w-0`.
- Form: `flex: 1 1 auto; min-w: 0; overflow-y:auto`.
- Preview: `flex: 0 0 45%; min-w:0; overflow:auto`.
- Sticky section header lives INSIDE the form scroll area (sticks to top of the form
  pane, not the viewport).

### Mobile (<1024px)

- Topbar compact: back, title, More. Undo/Redo + Score/Export collapse into More.
- Nav becomes a drawer (off-canvas) toggled by a button; OR collapses to a horizontal
  scrollable pill strip. Segmented control Edit | Preview | Score switches the single
  visible pane. No 3-pane on mobile.

---

## 4. Topbar — group + overflow

```
LEFT                                     RIGHT
[←] Untitled CV ● Saved          [↶][↷]  [ATS Score][Export PDF]  [More ▾]
```

- **Left group:** back link (`/app/resume`); résumé title (click to edit inline → inline
  rename input, NOT a dialog); save-status indicator (coloured dot + text:
  `Saved` / `Saving…` / `Save failed` / `Conflict` / `Offline changes`) in
  `aria-live="polite"`.
- **Right primary group:** Undo, Redo (disabled state obvious), ATS Score (opens Score
  panel), Export PDF (link to export page).
- **Overflow "More" ▾** dropdown: Template, Match with a Job, AI Assist, (Share later).
  Accessible menu: trigger `aria-expanded`/`aria-controls`, roving tabindex, arrow-key
  navigation, Escape closes and returns focus to trigger, click-outside closes.
- Buttons ≥44px, consistent gap (`--space-2`), icon+label where helpful, icon-only has
  `aria-label`.

---

## 5. Form sections

Uniform pattern across Personal / Summary / Work / Education / Skills / Projects.

```
┌──────────────────────────────────────────────┐
│ Personal Information            [complete ●]  │  section header (sticky in form)
├──────────────────────────────────────────────┤
│  First name              Last name            │  2-col grid (→1-col <640px)
│  [____________]          [____________]       │
│  Professional headline                        │  full-width
│  [____________________________________]       │
│  Max 160 characters. 28/160                   │  hint + counter (12px, 70%)
│  Links                       [+ Add link]     │  repeatable group
│  [type▾][url________][×]                      │
└──────────────────────────────────────────────┘
```

- **Field grid:** `display:grid; grid-template-columns: 1fr 1fr; gap: var(--space-4)`.
  Long fields `grid-column: 1 / -1`. Collapses to 1 column under 640px.
- **Spacing:** `--space-4` between fields, `--space-6` between sections, form padding
  `--space-6`.
- **Labels** above fields (not floating), 14px, weight 600. Hint/counter below, 12px,
  opacity 0.7.
- **Repeatable groups** (links, bullets, skills, experiences): bordered mini-cards with
  a visible `+ Add` button and an explicit `×` remove (not hover-only).
- **Validation inline:** red border + `aria-invalid` + `aria-describedby` pointing to an
  inline error message. No alert popup for field errors.
- **Section header** sticky inside the form pane: always shows which section is active.

### Item editor (experience/education/project)

```
┌──────────────────────────────────────────────┐
│ Experience 1                       [▲][▼][×]  │  header: auto title + reorder + delete
│   Software Engineer · Analytical Co           │
├──────────────────────────────────────────────┤
│  Job title            Company                 │
│  [__________]         [__________]            │
│  Employment type      City                    │
│  [Full-time ▾]        [__________]            │
│  [✓] Currently working here                   │
│  Bullets                          [+ Add]     │
│  • Led migration reducing load time   [×]     │
│  [textarea + counter]                         │
└──────────────────────────────────────────────┘
[+ Add experience]
```

- Card: 2px ink border, `--radius`, `--shadow-sm`, padding `--space-4`.
- Header: auto-derived title (e.g. `Job title · Company`), reorder buttons ▲▼ with
  `aria-label="Move up"/"Move down"`, delete `×` with `aria-label`.
- Delete opens the Dialog confirmation (NOT `window.confirm`).
- Reorder via keyboard buttons (▲▼ / Move to top / Move to bottom). Pointer DnD not
  required.

---

## 6. Dialog system — one reusable component

New `src/components/ui/Dialog.tsx` (React). Replaces:
- `window.confirm` (delete item/resume/skill/bullet).
- `ConsentDialog.tsx` (ad-hoc consent).
- ResumeCard native `<dialog>` + inline wiring script (rename/delete).
- AiPanel inline comparison.

### API

```tsx
interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  variant?: "default" | "danger";      // CTA colour
  primaryLabel?: string;               // omit → no primary button (custom body handles actions)
  onPrimary?: () => void;
  size?: "sm" | "md" | "lg";           // 480 / 560 / 720 px
  initialFocus?: "body" | "primary" | "reject";
}
```

### Behaviour

- `role="dialog" aria-modal="true"`, `aria-labelledby` → title.
- **Focus trap** while open; **Escape** closes and returns focus to the trigger;
  click on overlay closes; **body scroll-lock** while open.
- Centred; `max-width` per size; padding `--space-6`; close `×` top-right.
- Transition: fade + scale 150ms; disabled under `prefers-reduced-motion`.
- Variant `danger` → primary button red; `default` → primary yellow.
- Cleanup listeners on unmount/close.

### Usages

| Action | Dialog | Size | Variant |
|---|---|---|---|
| Delete item (exp/edu/proj/skill) | "Delete {kind}?" | sm | danger |
| Delete résumé (ResumeCard) | "Delete CV?" | sm | danger |
| Rename résumé | inline form in Dialog | sm | default |
| AI consent (first use) | consent body | sm | default |
| AI improve comparison | Original↔Suggested | lg | default |
| Template picker | grid of templates | md | default |
| Match with a Job | JD textarea + results | md | default |

---

## 7. AI comparison & consent (inside Dialog)

```
┌─────────────────────────────────────────────────────────────┐
│  Improve with AI                                        ×   │  size lg (720px)
├─────────────────────────────────────────────────────────────┤
│  Tone: [Professional ▾]                                     │
│  ┌── Original ──────────┐  ┌── Suggested ────────────────┐ │
│  │ did the migration    │  │ Migrated legacy billing     │ │
│  │ of the billing       │  │ system to modern infra...   │ │
│  └──────────────────────┘  └──────────────────────────────┘ │
│  Changes: • Replaced "did" with "Migrated" ...              │
│  [Source: AI]                       [Reject]  [Apply]       │
└─────────────────────────────────────────────────────────────┘
```

- Two labelled `<section aria-label="Original text">` / `"Suggested text"` regions —
  distinguishable by screen reader, not colour alone.
- Source badge: "AI" or "Rule-based" (with a note when AI unavailable → fallback).
- Buttons **Reject** (default focus — safe action) / **Apply** (primary). Apply closes
  the dialog and updates the field via the store. Never auto-apply.
- Consent: on first "Improve with AI" click, if `GET /api/resume/ai/consent` says not
  consented, open a consent Dialog (sm) → Enable (POST consent) → reopen improve dialog;
  "Not now" cancels. After consent once, never prompt again.

---

## 8. Accessibility

- Heading order: topbar H1 (résumé title), section header H2, item header H3. No skips.
- Skip link to `#editor-form`.
- Focus trap in Dialog; focus returns to trigger on close.
- Save status in `aria-live="polite"`.
- Keyboard: Tab order logical (nav → form → preview toolbar). Reorder via ▲▼ buttons.
  Escape closes dialog/menu/dropdown.
- Targets ≥44px; adequate spacing between topbar buttons.
- Reduced motion: dialog/preview transitions disabled; nothing conveys meaning by
  animation alone.
- Contrast: text on yellow/green = ink; text on red/ink = paper. Status badges use
  text + icon, not colour alone.

---

## 9. Files (expected)

- Create `src/components/ui/Dialog.tsx` (+ a small `useDialog`/portal helper if needed).
- Rewrite `src/modules/resume/components/ResumeEditor.tsx` (topbar groups + overflow,
  3-pane proportions, sticky section header, mobile segmented/drawer).
- Rewrite `src/modules/resume/components/SectionNav.tsx` (status pills, active state).
- Refactor section components `src/modules/resume/components/sections/*.tsx`
  (field grid, spacing, item cards, Dialog for delete).
- Refactor `src/modules/resume/components/Preview.tsx` (pane sizing, internal scroll,
  zoom toolbar kept).
- Refactor `src/modules/resume/components/AiPanel.tsx` (move comparison into Dialog).
- Replace `src/modules/resume/components/ConsentDialog.tsx` with Dialog usage (or delete
  + inline into AiPanel).
- Update `src/components/app/ResumeCard.astro` to use the Dialog island for
  rename/delete (replace native `<dialog>` + wiring script).
- Minor shared field helpers in `sections/fields.tsx` (grid-aware TextField etc.).

No backend, schema, or route changes.

---

## 10. Verification

- `bun run check` → 0 errors.
- `bun test` → all green (no logic changes; existing tests unaffected).
- `bun run build` → success.
- Manual: open editor at 1280px and 320px — no horizontal overflow, topbar clean and
  grouped, More menu opens/closes with keyboard, Dialog focus-traps and returns focus,
  form 2-col collapses to 1-col, preview scrolls internally.

---

## 11. Assumptions

- Neo-brutalism identity is retained (per "rapikan, tetap neo-brutal").
- 3-pane layout retained and fixed in proportion (not switched to tabs/drawer-only).
- Topbar uses group + overflow menu (not sidebar relocation).
- One Dialog component for all secondary actions (not inline panels/drawers).
- No new functionality — purely presentation/interaction refactor of existing features.
