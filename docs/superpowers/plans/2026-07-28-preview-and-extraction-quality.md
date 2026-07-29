# Preview Polish + Extraction Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the résumé preview readable and cleanly framed, and make import extraction populate structured Work/Education/Projects even without AI (plus default AI structuring ON).

**Architecture:** Pure additions + presentation tweaks. New deterministic `split-sections` module feeds structured entries into the existing `importResume` non-AI path; Preview/ResumeEditor/templates get CSS/sizing polish. No schema/endpoint changes. Neo-brutalism retained.

**Tech Stack:** Astro 7 SSR, React 19 island, TS strict, Tailwind v4 + CSS tokens, `bun:test`.

---

## Task P1: Deterministic section splitters (pure, TDD)

**Files:**
- Create: `src/modules/resume/import/split-sections.ts`
- Test: `tests/resume/split-sections.test.ts`

Context: `parseResumeText` returns `experienceText?`/`educationText?` (raw section bodies). We split those into structured entries. Real schema fields (from `@modules/resume/schemas`): `WorkExperience { jobTitle, company, employmentType, startMonth, startYear, endMonth?, endYear?, currentlyWorking, bullets[], skillsUsed[], ... }`; `Education { institution, degree?, fieldOfStudy?, startYear?, endYear?, currentlyStudying, ... }`. This module returns LOOSE partials; mapping to schema-valid entries happens in P2 (reuse existing mappers).

- [ ] **Step 1: Write failing tests**

`tests/resume/split-sections.test.ts`:
```ts
import { test, expect } from "bun:test";
import { splitExperienceBlocks, splitEducationBlocks } from "@modules/resume/import/split-sections";

const EXP = `Frontend Developer, PT Nusantara (Jan 2022 - Present)
- Built the e-commerce dashboard
- Improved load speed by 30%
Web Developer Intern, Startup Kreatif (2021 - 2021)
- Developed landing pages`;

test("splits two experience blocks with title/company/years/bullets", () => {
  const blocks = splitExperienceBlocks(EXP);
  expect(blocks.length).toBe(2);
  expect(blocks[0]!.jobTitle).toBe("Frontend Developer");
  expect(blocks[0]!.company).toBe("PT Nusantara");
  expect(blocks[0]!.startYear).toBe(2022);
  expect(blocks[0]!.currentlyWorking).toBe(true);
  expect(blocks[0]!.bullets).toContain("Built the e-commerce dashboard");
  expect(blocks[1]!.jobTitle).toBe("Web Developer Intern");
  expect(blocks[1]!.endYear).toBe(2021);
});

test("empty text -> no blocks", () => {
  expect(splitExperienceBlocks("")).toEqual([]);
  expect(splitExperienceBlocks("   \n ")).toEqual([]);
});

test("block with only bullets and no header is dropped (no fabrication)", () => {
  const blocks = splitExperienceBlocks("- did things\n- more things");
  expect(blocks.length).toBe(0);
});

const EDU = `Bachelor of Informatics, Institut Teknologi Bandung (2018 - 2022)
GPA 3.7
Senior High School, SMAN 1 Bandung (2015 - 2018)`;

test("splits education blocks with institution/degree/years", () => {
  const blocks = splitEducationBlocks(EDU);
  expect(blocks.length).toBe(2);
  // header "Degree, Institution (years)" — institution is required
  expect(blocks[0]!.institution).toContain("Institut Teknologi Bandung");
  expect(blocks[0]!.degree).toContain("Bachelor of Informatics");
  expect(blocks[0]!.startYear).toBe(2018);
  expect(blocks[0]!.endYear).toBe(2022);
});

test("education empty -> []", () => {
  expect(splitEducationBlocks("")).toEqual([]);
});
```
Run `bun test tests/resume/split-sections.test.ts` → FAIL.

- [ ] **Step 2: Implement `split-sections.ts`**

```ts
export interface ParsedExperienceBlock {
  jobTitle?: string; company?: string;
  startYear?: number; endYear?: number; currentlyWorking?: boolean;
  bullets: string[];
}
export interface ParsedEducationBlock {
  institution?: string; degree?: string; fieldOfStudy?: string;
  startYear?: number; endYear?: number;
}

const BULLET_RE = /^\s*[-•*·]\s+/;
const YEAR_RANGE_RE = /\(?\s*((?:19|20)\d{2})\s*[-–—]\s*((?:19|20)\d{2}|present|current|sekarang)\s*\)?/i;

function stripYears(line: string): { clean: string; startYear?: number; endYear?: number; current?: boolean } {
  const m = line.match(YEAR_RANGE_RE);
  if (!m) return { clean: line.trim() };
  const startYear = Number(m[1]);
  const endRaw = m[2]!.toLowerCase();
  const current = /present|current|sekarang/.test(endRaw);
  const endYear = current ? undefined : Number(m[2]);
  const clean = line.replace(m[0], "").replace(/[()]/g, "").trim().replace(/[,\-–—·|]\s*$/, "").trim();
  return { clean, startYear, endYear, current };
}

// Group lines into blocks: a new block starts at a non-bullet header line.
function groupBlocks(text: string): { header: string; bullets: string[]; raw: string[] }[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const blocks: { header: string; bullets: string[]; raw: string[] }[] = [];
  let cur: { header: string; bullets: string[]; raw: string[] } | null = null;
  for (const line of lines) {
    if (BULLET_RE.test(line)) {
      if (cur) cur.bullets.push(line.replace(BULLET_RE, "").trim());
      // bullet with no preceding header -> ignore (dropped)
    } else {
      if (cur) blocks.push(cur);
      cur = { header: line, bullets: [], raw: [line] };
    }
  }
  if (cur) blocks.push(cur);
  return blocks;
}

export function splitExperienceBlocks(text: string): ParsedExperienceBlock[] {
  if (!text || !text.trim()) return [];
  return groupBlocks(text).map((b) => {
    const { clean, startYear, endYear, current } = stripYears(b.header);
    // header "Title, Company" or "Title at Company" or "Title - Company"
    const parts = clean.split(/\s+(?:at|@)\s+|,\s*|\s+[·|]\s+|\s+[-–—]\s+/i).map((p) => p.trim()).filter(Boolean);
    const jobTitle = parts[0];
    const company = parts[1];
    const block: ParsedExperienceBlock = { bullets: b.bullets };
    if (jobTitle) block.jobTitle = jobTitle;
    if (company) block.company = company;
    if (startYear) block.startYear = startYear;
    if (endYear) block.endYear = endYear;
    if (current) block.currentlyWorking = true;
    return block;
  }).filter((b) => b.jobTitle || b.company); // drop headerless/empty
}

export function splitEducationBlocks(text: string): ParsedEducationBlock[] {
  if (!text || !text.trim()) return [];
  return groupBlocks(text).map((b) => {
    const { clean, startYear, endYear } = stripYears(b.header);
    // header "Degree, Institution" (common) — institution is the LAST comma part
    const parts = clean.split(/,\s*/).map((p) => p.trim()).filter(Boolean);
    const block: ParsedEducationBlock = {};
    if (parts.length >= 2) { block.degree = parts[0]; block.institution = parts.slice(1).join(", "); }
    else if (parts.length === 1) { block.institution = parts[0]; }
    if (startYear) block.startYear = startYear;
    if (endYear) block.endYear = endYear;
    return block;
  }).filter((b) => b.institution); // institution required
}
```
Adjust regex/splitting until the tests pass (the EDU test expects `institution` to contain "Institut Teknologi Bandung" and `degree` "Bachelor of Informatics" from `"Bachelor of Informatics, Institut Teknologi Bandung (...)"` — the comma-split gives degree=part0, institution=rest; the "GPA 3.7" line becomes its own headerless block with no institution → dropped, good).

- [ ] **Step 3: Run tests → PASS**
- [ ] **Step 4: Commit**
```bash
git add src/modules/resume/import/split-sections.ts tests/resume/split-sections.test.ts
git commit -m "feat(import): deterministic experience/education section splitters"
```

---

## Task P2: Use splitters in the non-AI import path

**Files:**
- Modify: `src/modules/resume/import/build-import-input.ts`
- Test: extend `tests/resume/import-ai.test.ts` OR create `tests/resume/import-heuristic.test.ts`

Context: `parsedToResumeSeed(parsed, opts)` currently, in the non-AI path, puts `experienceText`/`educationText` into custom sections. `importResume(db, userId, opts)` calls it. There are existing mappers for AI results (map loose entries → schema-valid `WorkExperience`/`Education`, dropping items missing required fields, coercing numbers, defaulting employmentType `"full-time"`, startMonth `1` when only year is present). REUSE those mappers (or the same logic) for the splitter output.

- [ ] **Step 1: Write failing test** (`tests/resume/import-heuristic.test.ts`)
```ts
import { test, expect } from "bun:test";
import { createSqliteAdapter } from "@lib/db/sqlite-adapter";
import { migrateDb } from "@lib/db/migrate";
import { importResume } from "@modules/resume/import/build-import-input";
import { createResumeService } from "@modules/resume/services/resume-service";

async function setup() {
  const db = createSqliteAdapter(":memory:"); await migrateDb(db);
  const now = new Date().toISOString();
  await db.prepare("INSERT INTO users (id,email,password_hash,created_at) VALUES (?,?,?,?)").bind("u1","u1@x.com","h",now).run();
  return db;
}

const CV = `Ada Lovelace
Engineer
ada@example.com

Work Experience
Frontend Developer, PT Nusantara (2022 - Present)
- Built the dashboard
Intern, Startup Kreatif (2021 - 2021)
- Landing pages

Education
Bachelor of Informatics, Institut Teknologi Bandung (2018 - 2022)`;

test("non-AI import produces structured work/education (no Imported custom sections)", async () => {
  const db = await setup();
  const { id } = await importResume(db, "u1", { text: CV, language: "en", useAi: false });
  const doc = await createResumeService(db).getOrThrow("u1", id);
  expect(doc.workExperiences.length).toBeGreaterThanOrEqual(2);
  expect(doc.educations.length).toBeGreaterThanOrEqual(1);
  const customTitles = (doc.customSections ?? []).map((c: any) => c.title);
  expect(customTitles).not.toContain("Imported: Experience");
  expect(customTitles).not.toContain("Imported: Education");
});
```
Run → FAIL (currently they'd be custom sections / empty).

- [ ] **Step 2: Implement** — in `build-import-input.ts`, import `splitExperienceBlocks`/`splitEducationBlocks`. In `parsedToResumeSeed` (or `importResume` non-AI branch), when NOT using AI:
  - `const exp = splitExperienceBlocks(parsed.experienceText ?? "")` → map each to a schema-valid `WorkExperience` via the SAME mapper used for AI (jobTitle+company required-ish per existing rules; drop invalid; employmentType default "full-time"; startMonth default 1 when startYear present; bullets kept). If ≥1 valid → set `patch.workExperiences` and DROP the "Imported: Experience" custom section.
  - Same for `splitEducationBlocks` → `educations`, drop "Imported: Education".
  - If a splitter yields 0 valid entries → keep the existing raw custom-section fallback for that part.
  Keep AI path unchanged.
- [ ] **Step 3: Run tests → PASS**; run FULL `bun test` → all green.
- [ ] **Step 4: Verify** `bun run check` 0 errors; `bun run build` success.
- [ ] **Step 5: Commit**
```bash
git add src/modules/resume/import/build-import-input.ts tests/resume/import-heuristic.test.ts
git commit -m "feat(import): structured work/education fallback without AI"
```

---

## Task P3: Default AI checkbox ON in import UI

**Files:**
- Modify: `src/modules/resume/components/PdfImport.tsx`

Context: PdfImport has a "Use AI to structure my experience & education" checkbox, currently default UNCHECKED, hidden when `features.aiAssist` false. Consent flow already exists (GET consent → consent Dialog → POST → proceed; decline → continue without AI).

- [ ] **Step 1:** Change the checkbox initial state to `useState(features.aiAssist)` (checked by default when AI is available; stays hidden/false when not). Keep all consent + decline logic intact — declining consent should fall back to `useAi:false` import (already implemented), never block.
- [ ] **Step 2: Verify** `bun run check` 0 errors; `bun run build` success. Confirm the checkbox renders checked by default when `features.aiAssist` true; import still works when unchecked.
- [ ] **Step 3: Commit**
```bash
git add src/modules/resume/components/PdfImport.tsx
git commit -m "feat(import): default AI structuring on when available"
```

---

## Task P4: Preview polish — sizing, A4 framing, toolbar, page-break guide

**Files:**
- Modify: `src/modules/resume/components/Preview.tsx`
- Modify: `src/modules/resume/components/ResumeEditor.tsx` (preview pane grid column 48%)
- Modify: `src/styles/print.css` (or add a scoped style) for `.resume-page` framing + page-break guide

Context: Preview defaults zoom 0.6, fit-width/page modes, A4 width 210mm, viewport `max-h-[70vh] overflow-auto p-3`. `.resume-page` is the A4 content. ResumeEditor desktop grid is `220px minmax(0,1fr) minmax(0,45%)`.

- [ ] **Step 1: Widen preview pane** in `ResumeEditor.tsx`: change the grid to `md:grid-cols-[220px_minmax(0,1fr)_minmax(0,48%)]`.

- [ ] **Step 2: Preview sizing** in `Preview.tsx`: when computing fit-width scale, apply a readable floor: `const scale = Math.max(computedFitWidth, 0.62)`. Keep manual zoom range 0.4–1.5 (manual can still go below the floor if the user chooses; the floor only applies to the auto fit default). Default `fit="width"`.

- [ ] **Step 3: A4 framing** in `Preview.tsx`: viewport wrapper `bg-[var(--color-muted)] p-6` (subtle backdrop so the white page pops). The A4 stage `.resume-page` gets a hard neo shadow + hairline border. Add/adjust in print.css:
```css
.resume-page {
  width: 210mm;
  min-height: 297mm;
  background: #fff;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--color-ink);
  margin: 0 auto;
}
@media print {
  .resume-page { box-shadow: none; border: none; }
}
```
(Ensure print still hides editor chrome and shows a clean page — keep existing `@page { size: A4; margin: 0 }` and `.no-print`.)

- [ ] **Step 4: Page-break guide** in `Preview.tsx`: when the measured content spans >1 A4 page, render subtle dashed guides at each page boundary. Simplest: overlay absolutely-positioned thin dashed lines at `top: n * 297mm` (n=1..pages-1) inside the scaled stage, `border-top: 1px dashed var(--color-ink); opacity:.35`, `no-print`, `pointer-events:none`. Label optional.

- [ ] **Step 5: Toolbar** in `Preview.tsx`: compact one-row toolbar `[−] 75% [+]  Fit width  Fit page  ·  <badge>N pages</badge>`. Move the page count into a small muted badge next to the fit buttons (remove the separate heavy row). Keep `aria-label`s, ≥44px targets, `no-print`, `aria-live` on the page-count badge.

- [ ] **Step 6: Verify** `bun run check` 0 errors; `bun run build` success. Reason: pane 48%, fit floor 0.62, A4 shadow/border, page-break guide, compact toolbar.
- [ ] **Step 7: Commit**
```bash
git add src/modules/resume/components/Preview.tsx src/modules/resume/components/ResumeEditor.tsx src/styles/print.css
git commit -m "feat(editor): readable, cleanly-framed A4 preview + compact toolbar"
```

---

## Task P5: Template typography polish (light, all six)

**Files:**
- Modify: `src/modules/resume/templates/settings.ts` (shared rhythm defaults) and/or
  `src/modules/resume/templates/shared.tsx`, and the six `*Template.tsx` as needed.

- [ ] **Step 1:** Small, safe spacing/typography tweaks that apply broadly:
  - In `settings.ts` defaults: bump default `sectionSpacing` from 6 → 7 (mm) for a touch more air; keep `lineHeight` 1.45. (Do NOT change fontScale/margin.)
  - In `shared.tsx` `ContactLine`: ensure separators are consistent (` · ` between items) and wrap cleanly.
  - Ensure section headings have a small `margin-top` rhythm and clear weight in each template (they already differ — just verify no cramped heading sits flush against the previous section's last line; add a hair of `margin-top` on the section heading if needed via each template's `heading` style).
  Keep each template's distinct identity and DOM order (ATS-safe). No structural changes.
- [ ] **Step 2: Verify** `bun run check` 0 errors; `bun run build` success; `bun test` green (template registry test unaffected).
- [ ] **Step 3: Commit**
```bash
git add src/modules/resume/templates/
git commit -m "polish(templates): consistent section rhythm + contact line"
```

---

## Task P6: Verify + deploy

- [ ] **Step 1:** `bun run check` → 0 errors.
- [ ] **Step 2:** `bun test` → all green.
- [ ] **Step 3:** `bun run build` → success.
- [ ] **Step 4:** `bunx wrangler deploy`.
- [ ] **Step 5:** Live smoke: register → import a text CV (English) WITHOUT AI → confirm Work/Education populated (score reflects it); with AI default on → rich result; open editor → preview readable/centered/framed, compact toolbar, page-break guide on a 2-page CV.
- [ ] **Step 6:** Commit any doc note + push.
```bash
git push origin main
```

---

## Notes for the implementer
- Splitters are extract-only; drop entries missing required fields (no fabricated company/institution).
- Reuse the existing AI→schema mappers for splitter output (don't duplicate mapping rules).
- AI path + consent unchanged; declining consent falls back to the now-stronger heuristic.
- Preview: no page horizontal overflow; print still clean (shadow/border/guides hidden).
- Keep neo-brutalism; template DOM order unchanged (ATS).
```
