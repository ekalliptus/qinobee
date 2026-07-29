# Preview Polish + Import Extraction Quality — Design

Date: 2026-07-28
Status: Approved (design)

Two focused improvements to the résumé editor:
1. Live preview looks cramped/ugly — make the A4 preview readable and cleanly framed.
2. Import extraction is weak without AI (Work/Education/Projects show "Empty") — default
   AI structuring ON and add a deterministic fallback splitter so structured entries are
   populated even without AI.

Neo-brutalism identity preserved. No schema/endpoint/data-model changes.

---

## Problem analysis (verified)

- The heuristic parser `parseResumeText` DOES detect sections for clean text (verified in
  Node: summary/skills/experienceText/educationText/links all extracted from an English CV).
- BUT `importResume` only turns experience/education into **structured** `workExperiences`/
  `educations` when AI is used. Without AI, that raw text is dropped into **custom sections**,
  so the editor's Work/Education/Projects/Skills nav shows "Empty" → looks broken.
- The "Use AI" checkbox in the import UI defaults **OFF**, so most imports use the weak path.
- Real multi-column PDFs extract messier text, compounding the heuristic miss.
- Preview: default zoom 0.6 + fit-width inside a ~45% pane renders tiny text; A4 framing and
  the zoom toolbar look cluttered.

---

## Part A — Import extraction quality

### A1. Default AI structuring ON in the import UI
- In `PdfImport.tsx`, the "Use AI to structure my experience & education" checkbox defaults
  **checked** when `features.aiAssist` is true (unchecked/hidden otherwise).
- Consent still required on first use (existing consent Dialog flow): submitting with AI on
  and no consent prompts consent; Enable → proceed; decline → falls back to heuristic import
  (unchecks AI) so the user is never blocked.
- Copy stays accurate: AI-on sends the extracted text to the AI provider; AI-off keeps it on
  the server only; the binary never leaves the browser.

### A2. Deterministic structured fallback (no AI)
- Add a pure module `src/modules/resume/import/split-sections.ts`:
  - `splitExperienceBlocks(text): ParsedExperience[]` — split the experience section text into
    blocks (blank-line or date-pattern boundaries), and from each block derive a best-effort
    `{ jobTitle?, company?, startYear?, endYear?, currentlyWorking?, bullets[] }`. Extract-only:
    the first non-bullet line becomes the header (split on `,`/`·`/`at`/`-` into title/company),
    lines starting with `-`/`•`/`*` become bullets, a `(YYYY - YYYY|Present)` pattern fills years.
    Omit fields not present; NEVER fabricate.
  - `splitEducationBlocks(text): ParsedEducation[]` — analogous: institution/degree/field/years.
- In `build-import-input.ts` `parsedToResumeSeed`: when AI is NOT used, run these splitters on
  `parsed.experienceText`/`parsed.educationText`. If a splitter yields ≥1 valid entry
  (has the minimum required field: jobTitle OR company for experience; institution for
  education), map to schema-valid `workExperiences`/`educations` (reuse the same
  drop-if-missing-required rules as the AI mapper) and DROP the corresponding
  "Imported: Experience/Education" custom section. If a splitter yields nothing, keep the raw
  custom-section fallback (so nothing is lost).
- Result: Work/Education nav is populated even without AI; AI path unchanged (still preferred
  and richer).

### A3. Tests
- Unit `tests/resume/split-sections.test.ts`: split a 2-job experience text → 2 entries with
  titles/bullets/years; blank → []; a block with only bullets and no header → dropped (no
  fabricated company). Education similar.
- Extend `tests/resume/import-ai.test.ts` (or a new `import-heuristic.test.ts`): `importResume`
  with `useAi:false` on a CV with experience/education → created résumé has non-empty
  `workExperiences`/`educations` and NO "Imported: Experience/Education" custom sections.

---

## Part B — Preview polish

### B1. Pane + sizing
- Widen the desktop preview pane from 45% → **48%** (grid `220px minmax(0,1fr) minmax(0,48%)`).
- Default fit-width, but raise the effective floor so text is legible: after computing
  fit-width scale, `Math.max(fitScale, 0.62)` so it never renders microscopic; keep manual
  zoom 0.4–1.5.
- Preserve internal scroll; no page horizontal overflow.

### B2. A4 framing
- Center the A4 page in the viewport with breathing room: viewport padding `--space-6`,
  `background: var(--color-muted)` (subtle) so the white page stands out.
- Give the `.resume-page` a hard neo shadow (`box-shadow: var(--shadow-md)`) + 1px ink hairline
  border so it reads as a physical page.
- Multi-page: show a clean page-break divider (a thin dashed ink line at each A4 page boundary)
  rather than one continuous sheet — a simple absolutely-positioned overlay at
  `n * 297mm` heights, or a repeating linear-gradient guide. Keep it subtle and print-hidden.

### B3. Toolbar
- Compact controls: `[−] 75% [+]  |  Fit width  Fit page` in one tidy row; move page-count to a
  small muted badge (`2 pages`) next to Fit, not a separate heavy row.
- Icons keep `aria-label`; ≥44px targets; `no-print`.

### B4. Template typography polish (light, all six)
- Consistent section spacing rhythm (a touch more space above headings), slightly tighter
  contact line, ensure headings have clear hierarchy. Keep each template's distinct identity;
  do not restructure DOM order. Small, safe CSS tweaks only.

---

## Files (expected)

- Create `src/modules/resume/import/split-sections.ts` + test.
- Modify `src/modules/resume/import/build-import-input.ts` (use splitters in the non-AI path).
- Modify `src/modules/resume/components/PdfImport.tsx` (default AI checkbox on).
- Modify `src/modules/resume/components/Preview.tsx` (sizing, framing, toolbar, page-break guide).
- Modify `src/modules/resume/components/ResumeEditor.tsx` (preview pane 48% grid column).
- Modify `src/styles/print.css` or a small style block for `.resume-page` framing (ensure print
  still hides chrome and shows clean pages).
- Light edits to `src/modules/resume/templates/{Essential,Modern,Executive,Graduate,Technical,Academic}Template.tsx` + `settings.ts`/`shared.tsx` for spacing polish.

No backend, schema, route, or endpoint changes.

---

## Verification

- `bun run check` → 0 errors.
- `bun test` → all green (new split-sections + import-heuristic tests pass).
- `bun run build` → success; redeploy.
- Manual (live): import a CV without AI → Work/Education populated; import with AI (default on)
  → rich structured result; open editor preview → A4 readable, centered, clean framing, tidy
  toolbar, page-break guide for 2-page CV.

---

## Assumptions

- Splitters are extract-only; entries missing required fields are dropped, not fabricated.
- AI remains consent-gated; declining consent falls back to the (now stronger) heuristic.
- Neo-brutalism identity retained; template DOM order unchanged (ATS-safe).
