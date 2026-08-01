# Kinobi-Inspired Résumé Editor — Design

Date: 2026-08-02
Status: Approved design, awaiting written-spec review

## 1. Goal

Rebuild the QinoBee résumé editor around the effective interaction patterns found in
`./reff/`: a guided six-stage form, a wide two-column workspace, a sticky A4 preview,
appearance controls next to the preview, compact accordion entries, and clear native
print pagination.

This is not a clone. QinoBee keeps its name, copy, neo-brutalist design tokens,
templates, icons, accessibility standards, autosave, undo/redo, AI, ATS score, job
matching, and mobile preview. No image, logo, font, text, compiled code, colour palette,
or other proprietary asset from `./reff/` will ship.

## 2. Success criteria

The work is complete when:

1. Desktop uses a stable two-column editor rather than the current three-pane grid.
2. The form occupies roughly 55% of available workspace; preview uses a sticky A4-sized
   column up to `595.28px` wide.
3. Six stages organize all résumé fields already supported by the schema.
4. Repeatable entries are collapsed accordions except the active/new entry.
5. Preview appearance controls remain visible beside the form and never push the
   workspace down.
6. Two- and three-page previews scroll fully and show subtle boundaries matching A4
   page breaks.
7. Browser print preserves repeated page margins and avoids preventable section/entry
   splits.
8. At widths below `1024px`, only one Edit, Preview, or Score pane is visible.
9. Existing autosave, optimistic conflict handling, undo/redo, AI, score, matching,
   import, and export continue to work.
10. No reference asset or branding is included in source control or production output.

## 3. Scope

### Included

- Editor route shell and workspace width.
- Sticky editor toolbar.
- Six-stage stepper and stage navigation.
- Two-column desktop form/preview layout.
- Accordion treatment for repeatable records.
- Editing UI for schema-backed sections currently missing from the editor.
- Preview appearance toolbar.
- Template selection dialog or sheet.
- ATS score and job-match side sheet.
- Multi-page preview boundaries and print-fragment safeguards.
- Responsive and accessibility behavior.
- Focused tests for stage mapping, page math, accordion behavior, and regression flows.

### Excluded

- Marketing pages.
- Authentication, database, repository, or API redesign.
- New résumé data fields.
- New templates.
- Drag-only reordering.
- JavaScript page-composition engine.
- Exact visual copying of Kinobi.
- Importing any file under `./reff/` into application code or git history.

## 4. Chosen approach

### Selected: pattern parity with native flow

Use one long template DOM for preview and browser-native print fragmentation. Apply the
reference's information architecture and control locality while retaining QinoBee's
existing React store and renderer.

Why:

- Smallest change that addresses the observed UX mismatch.
- One renderer remains the source of truth for preview and export.
- Native CSS pagination is less fragile than cloning content into synthetic pages.
- Existing zoom, autosave, and template systems remain reusable.

### Rejected: pixel clone

A pixel clone would copy branding decisions, inherit inaccessible behavior such as
mobile preview removal and disabled pinch zoom, and still retain the reference's brittle
manual page-break calculations.

### Rejected: synthetic page compositor

Rendering separate cloned A4 sheets would require measuring and moving arbitrary React
nodes between pages, duplicating semantics, handling oversized entries, and reproducing
browser print behavior. Add such an engine only if future requirements demand manual
page-level placement.

## 5. Information architecture

The editor exposes six stages. Stage selection is non-linear; users may open any stage.
`Back` and `Save & Continue` provide the guided path without locking navigation.

| Stage | Sections |
|---|---|
| 1. Personal | Personal information and contact links |
| 2. Professional | Professional summary, work experience, projects, skills |
| 3. Education | Education |
| 4. Organization | Organizations and volunteer experience |
| 5. Other | Certifications, awards, languages, custom sections |
| 6. Review | Completeness, ATS score, section order/visibility, final preview and export |

Each step displays one of three text-supported states: Complete, Incomplete, Empty.
Colour supplements the text; it never carries status alone.

## 6. Desktop shell and layout

Desktop begins at `1024px` (`lg`). The editor route uses an editor-specific full-width
application shell rather than the current `max-w-6xl` page wrapper and duplicate page
heading.

```text
┌──────────────── sticky editor toolbar ──────────────────────────────┐
│ Back │ editable title │ save state       Undo Redo Score Export More│
├────────────────────── six-stage stepper ────────────────────────────┤
│ 1 Personal — 2 Professional — 3 Education — 4 Organization — ...  │
├────────────────────────────────┬────────────────────────────────────┤
│ Form card, minmax(0, 55%)      │ Sticky preview, max 595.28px      │
│ page scroll                    │ appearance toolbar                │
│                                │ bounded A4 scroller               │
└────────────────────────────────┴────────────────────────────────────┘
```

Rules:

- Workspace: full available width with a `1600px` ceiling and centered gutters.
- Grid: `minmax(0, 55fr) minmax(420px, 45fr)` with a `24px` gap.
- Preview column: `position: sticky; top: var(--editor-sticky-offset)`, where the
  variable equals the rendered toolbar plus stepper height and workspace gap.
- Form uses normal document flow. The page owns vertical scrolling; no nested form
  scroller.
- Preview owns only its A4 canvas scrolling.
- Editor toolbar and stepper are sticky, with one shared background and border stack.
- Sticky offsets use shared CSS custom properties rather than duplicated magic numbers.
- Three-pane navigation is removed. The stepper replaces the left section sidebar.

## 7. Editor toolbar

### Desktop

Left:

- Back to My Résumés.
- Inline-editable résumé title.
- Save status: Saved, Saving…, Save failed, Conflict, or Offline changes.

Right:

- Undo and Redo.
- ATS Score.
- Export PDF.
- More menu: Template, Match with a Job, AI Assist, Save now.

The toolbar is one row when space allows. Controls preserve `44px` targets. The More
menu keeps existing Escape, focus-return, and click-outside behavior and adds Arrow
Up/Down/Home/End navigation.

### Mobile and tablet

Show Back, truncated title, save state, and More. Undo, Redo, Score, Export, Template,
Match, AI, and Save now live in More. No wrapped multi-row topbar.

## 8. Stage stepper

Desktop renders six connected steps beneath the toolbar. Every step is a real button
with `aria-current="step"` for the active stage. Completed steps use checkmarks plus
text; incomplete and empty states remain distinguishable without colour.

Below `1024px`, use a horizontally scrollable step strip. Selecting a stage switches
back to the Edit pane and scrolls the active step into view. Browser history is not
modified because stage state is local editor state.

The store continues autosaving field changes. `Save & Continue` calls the existing
flush/save path, reports failure without losing local state, then advances only after a
successful save or when no unsaved changes remain. `Back` changes stage without forcing
a save because autosave already owns persistence.

## 9. Form card

Each stage renders one white neo-brutalist card:

- stage title and short original QinoBee guidance;
- optional Tips button;
- stage contents;
- footer actions: Back and Save & Continue, or Export on Review.

Fields preserve current labels, validation, counters, and minimum target size. Two-column
field grids collapse below `640px`. Errors remain inline with `aria-invalid` and
`aria-describedby`.

No reference copy is reused. Guidance is concise, original, and tied to the actual
schema constraints.

## 10. Repeatable entry accordions

Work, education, project, organization, volunteer, certification, award, language, and
custom-section records use one shared accordion-card pattern.

Collapsed header:

- derived title, such as `Software Engineer · Acme`;
- optional date range;
- status such as Incomplete;
- expand/collapse button;
- Move up, Move down, Duplicate, and Delete actions.

Behavior:

- Only one item per list opens automatically.
- Newly added items open and receive focus on their first field.
- Existing lists initially open the first incomplete item; otherwise the first item.
- Opening an item does not close items in other section lists.
- Delete uses the existing accessible confirmation dialog.
- Reorder remains keyboard-button based; pointer drag is optional and excluded here.
- Collapsed summaries update immediately as fields change.
- Empty lists show guidance and a full-width Add button.

A shared `EntryAccordion` handles disclosure and action chrome. Existing section editors
retain field-specific rendering and store updates.

## 11. Preview column

### Appearance toolbar

A compact two-row toolbar sits directly above the preview canvas.

Primary row:

- Font family.
- Font scale: Small, Medium, Large mapped to safe existing values.
- Line spacing.
- Zoom out, percentage, zoom in.
- Fit width and Fit page.

Secondary row:

- Accent colour.
- Divider toggle, only when the selected template supports it.
- Alignment, only when honored by the selected template.
- Template button.
- Page count.

Advanced spacing and margin controls remain available in the Template dialog. Controls
with no real effect are hidden. `Show photo` remains hidden until photo editing and
rendering both exist. `headingStyle` is not exposed until templates implement it.

Changes write through the existing résumé patch/store path and autosave normally.

### Canvas

- Canvas backdrop is muted and scrollable.
- A4 source geometry remains `210mm × 297mm`.
- CSS `zoom` remains because it scales both painting and layout dimensions.
- Fit Width is default.
- Preview scroller has a viewport-relative maximum height on desktop and a bounded
  `calc(100dvh - chrome)` height in the Preview mobile pane.
- Horizontal centering uses layout width, not transform compensation.

## 12. Multi-page preview and print

The template remains one semantic continuous DOM. Boundaries are guides, not synthetic
pages.

Preview boundary behavior:

- Calculate page count from measured unzoomed content height.
- Place a subtle `2px` dashed seam at every `297mm` boundary.
- Use a narrow muted band behind the seam to suggest a page gap without covering résumé
  content.
- Remove the large `Page N` pill.
- Display total page count in the toolbar.
- Do not add previous/next navigation or snapping; the preview is a normal scroller.

Print behavior:

- Define A4 page size and repeated page margins through `@page`.
- Avoid breaking section headings from their first content block.
- Apply `break-inside: avoid-page` to short repeatable records and contact/header blocks.
- Permit very long records to fragment instead of overflowing or disappearing.
- Use `orphans` and `widows` where supported.
- Hide all preview chrome and boundaries in print.
- Preview and export use the same template renderer and settings.

The first implementation remains native CSS pagination. Exact node-to-page placement is
not promised.

## 13. Score, match, AI, and template surfaces

Panels must not push the workspace vertically.

- ATS Score: right side sheet on desktop, full-screen sheet on mobile.
- Job Match: same side-sheet pattern.
- AI Assist: existing consent and comparison dialogs remain modal.
- Template picker: dialog/sheet with six existing original QinoBee thumbnails.
- Appearance changes leave preview visible whenever the viewport can accommodate it.

Side sheets trap focus, close on Escape, lock body scroll, return focus to their trigger,
and expose an accessible title. Reuse the existing dialog primitives where possible;
do not add a dependency.

## 14. Responsive behavior

### `>=1024px`

- Sticky desktop toolbar and stepper.
- Two-column form plus preview.
- Preview sticky.

### `640px–1023px`

- Compact toolbar.
- Horizontal step strip.
- Existing Edit, Preview, Score segmented switch.
- One pane visible at a time.

### `<640px`

- Same one-pane model.
- Form fields become one column.
- Stage footer is sticky only when it does not obscure validation content; otherwise it
  remains in normal flow.
- Preview controls wrap into two compact rows.
- Pinch zoom remains enabled.

No breakpoint may create horizontal page overflow. A4 overflow stays inside the preview
scroller.

## 15. State and data flow

No database or API changes are required.

```text
Field/appearance action
  -> existing editor store patch
  -> immediate React render
  -> history snapshot for undo/redo
  -> debounced autosave
  -> existing revision-checked API
  -> Saved / Conflict / Error status

Stage navigation
  -> local activeStage state
  -> derive stage status from current document
  -> render mapped section components

Preview
  -> current ResumeDocument
  -> existing template registry
  -> ResizeObserver measurement
  -> page-count and boundary guides
```

Accordion disclosure, active pane, open sheet, and active stage are ephemeral UI state;
they are not persisted to the résumé document.

## 16. Error handling

- Autosave failure keeps unsaved local edits and exposes retry/Save now.
- Revision conflicts preserve the current conflict dialog/path.
- Save & Continue never silently discards edits.
- Invalid fields block explicit stage continuation, focus the first invalid control, and
  leave autosave behavior unchanged.
- Preview measurement failure falls back to one page without preventing editing or
  export.
- Unsupported appearance controls are omitted rather than shown disabled without an
  explanation.
- Side-sheet failures render inline messages; no destructive action auto-retries.
- Export remains available through the existing authenticated export route.

## 17. Accessibility

- One visible page-level heading.
- Logical heading hierarchy inside every stage.
- `aria-current="step"` on the active stage.
- Accordion buttons use `aria-expanded` and `aria-controls`.
- Menus support Arrow keys, Home, End, Escape, and focus return.
- Dialogs and sheets trap focus and restore it.
- Status is announced through polite live regions.
- All controls have visible focus and at least `44px` pointer targets.
- Reorder and status never depend on colour or drag alone.
- Reduced-motion preferences disable nonessential transitions.
- Resume print content retains semantic headings, lists, and links.

## 18. Component boundaries

Minimum focused changes:

- `edit.astro`: switch to full-width editor shell; remove duplicate heading.
- `ResumeEditor.tsx`: toolbar, stage orchestration, responsive pane switching, sheets.
- `StageStepper.tsx`: six-stage navigation and status.
- `EntryAccordion.tsx`: shared repeatable-item disclosure/action shell.
- Existing section editors: grouped under stages and extended for schema-backed sections.
- `Preview.tsx`: integrated appearance toolbar and refined boundary presentation.
- `TemplatePanel.tsx`: become dialog content; hide unsupported controls.
- `print.css`: shared page geometry, preview seams, native fragmentation rules.
- Existing Dialog: reused for template and confirmations; extended only if side-sheet
  semantics cannot remain clear in a separate minimal component.

Do not create interfaces, factories, or dependencies without a second concrete use.

## 19. Verification

Automated checks:

1. Pure test for section-to-stage mapping and Complete/Incomplete/Empty status.
2. Existing page-break tests plus 1-, 2-, and 3-page boundary cases.
3. Component-level self-checks where practical for accordion disclosure and stage
   progression.
4. Existing Bun tests.
5. `astro check` and production build.

Manual desktop checks at `1024`, `1280`, `1440`, and `1920px`:

- Toolbar and stepper remain sticky without overlap.
- Form remains readable and preview remains A4-centered.
- Appearance changes update preview and autosave.
- Accordion add, focus, reorder, duplicate, delete.
- Two- and three-page scroll reaches the final content.
- Score, match, template, and AI surfaces do not shift workspace layout.

Manual mobile checks at `375×812` and tablet at `768×1024`:

- One pane only.
- Stage strip scrolls to active stage.
- Preview and score switch correctly.
- No page-level horizontal overflow.
- More menu exposes displaced actions.

Print checks:

- Essential plus one structurally different template.
- One-, two-, and three-page fixtures.
- No missing content.
- Repeated page margins.
- No preventable orphaned section headings.
- Boundaries and editor chrome absent from PDF.

## 20. Delivery order

1. Shell, sticky toolbar, breakpoint correction, and two-column workspace.
2. Stage mapping and stepper.
3. Accordion item shell and missing schema-backed section editors.
4. Preview-local appearance controls and template dialog.
5. Multi-page seam and native print fragmentation.
6. Score/match side sheets and compact mobile toolbar.
7. Accessibility, regression checks, production build, and browser verification.

Each step leaves the editor usable. Data migrations are unnecessary.
