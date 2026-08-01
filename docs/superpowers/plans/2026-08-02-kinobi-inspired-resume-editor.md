# Kinobi-Inspired Résumé Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the QinoBee résumé editor around the effective Kinobi interaction patterns — a guided six-stage form, a wide two-column workspace, a sticky A4 preview, appearance controls beside the preview, compact accordion entries, editable coverage for all schema-backed sections, and clearer multi-page/print behavior — while keeping QinoBee branding, design tokens, and all existing logic.

**Architecture:** Presentation/interaction refactor only. One continuous template DOM drives both preview and native browser print (no synthetic page compositor). Existing React store (`useResumeEditorStore`), autosave, undo/redo, AI, score, and matcher stay unchanged. New pure helpers (stage mapping, page geometry) are TDD-tested with `bun:test`; UI is verified with `astro check`, build, and manual browser passes because the repo has no DOM test harness.

**Tech Stack:** Astro 7 SSR (`@astrojs/cloudflare`), React 19 islands, TypeScript strict, Zod v4, Bun test runner, Tailwind v4 + neo-brutalism CSS tokens.

**Spec:** `docs/superpowers/specs/2026-08-02-kinobi-inspired-resume-editor-design.md`

---

## Conventions for every task

- Run type/build checks with: `bun run check`
- Run unit tests with: `bun test <path>`
- Section editor prop contract (existing): `{ doc: ResumeDocument; update: (fn: (prev: ResumeDocument) => ResumeDocument) => void }`; work/summary additionally accept `renderAiAssist?: RenderAiAssist`.
- Store update accepts a partial or an updater fn: `store.update(patch)` — see `src/modules/resume/components/store.ts:109`.
- Do NOT touch: schemas, repository, services, API endpoints, scoring, matcher, AI service, template rendering logic (except appearance-capability metadata additions in Task 12).
- Keep neo-brutalism tokens; never soften to generic SaaS.
- No new runtime dependency.

---

## Task 1: Page geometry single source of truth (extend page-break utils)

**Files:**
- Modify: `src/modules/resume/utils/page-break.ts`
- Test: `tests/resume/page-break.test.ts`

- [ ] **Step 1: Add failing tests for page-boundary offsets**

Append to `tests/resume/page-break.test.ts`:

```ts
import { pageBoundaryOffsetsMm } from "@modules/resume/utils/page-break";

test("no boundaries for single-page content", () => {
  expect(pageBoundaryOffsetsMm(200, A4_PAGE_MM)).toEqual([]);
});

test("one boundary at 297mm for a 2-page document", () => {
  expect(pageBoundaryOffsetsMm(A4_PAGE_MM + 100, A4_PAGE_MM)).toEqual([297]);
});

test("boundaries repeat every page for a 3-page document", () => {
  expect(pageBoundaryOffsetsMm(A4_PAGE_MM * 2 + 50, A4_PAGE_MM)).toEqual([
    297, 594,
  ]);
});

test("content exactly one page has no boundary", () => {
  expect(pageBoundaryOffsetsMm(A4_PAGE_MM, A4_PAGE_MM)).toEqual([]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/resume/page-break.test.ts`
Expected: FAIL — `pageBoundaryOffsetsMm is not a function`.

- [ ] **Step 3: Implement `pageBoundaryOffsetsMm`**

Append to `src/modules/resume/utils/page-break.ts`:

```ts
/**
 * Y offsets (mm) where each A4 page boundary falls inside one continuous
 * content sheet. Returns [] for single-page content. Used by the preview to
 * draw page-break seams that scale with CSS zoom.
 */
export function pageBoundaryOffsetsMm(
  contentHeightMm: number,
  pageMm = A4_PAGE_MM,
): number[] {
  const offsets: number[] = [];
  for (let y = pageMm; y < contentHeightMm; y += pageMm) {
    offsets.push(y);
  }
  return offsets;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/resume/page-break.test.ts`
Expected: PASS (all cases, including pre-existing).

- [ ] **Step 5: Commit**

```bash
git add src/modules/resume/utils/page-break.ts tests/resume/page-break.test.ts
git commit -m "feat(preview): page-boundary offset helper for multi-page seams"
```

---

## Task 2: Stage model (pure mapping + status)

**Files:**
- Create: `src/modules/resume/components/stages.ts`
- Test: `tests/resume/stages.test.ts`

Stage → section keys mapping mirrors the spec §5. Status per stage is derived from existing `isSectionEmpty` (`src/modules/resume/utils/empty.ts:63`) and the field-completeness rules already in `sections/keys.ts:24`.

- [ ] **Step 1: Write failing tests**

Create `tests/resume/stages.test.ts`:

```ts
import { test, expect } from "bun:test";
import {
  STAGES,
  stageSectionKeys,
  stageStatus,
  type StageId,
} from "@modules/resume/components/stages";
import type { ResumeDocument } from "@modules/resume/types";

function doc(overrides: Partial<ResumeDocument> = {}): ResumeDocument {
  return {
    id: "r1",
    userId: "u1",
    title: "CV",
    language: "en",
    templateId: "essential",
    status: "draft",
    personalInformation: { firstName: "", email: "", links: [] },
    professionalSummary: "",
    workExperiences: [],
    educations: [],
    projects: [],
    organisations: [],
    volunteerExperiences: [],
    certifications: [],
    awards: [],
    skillGroups: [],
    languages: [],
    customSections: [],
    sectionOrder: [],
    hiddenSections: [],
    templateSettings: {},
    revision: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  } as ResumeDocument;
}

test("there are exactly six stages in order", () => {
  expect(STAGES.map((s) => s.id)).toEqual([
    "personal",
    "professional",
    "education",
    "organization",
    "other",
    "review",
  ]);
});

test("professional stage groups summary/work/projects/skills", () => {
  expect(stageSectionKeys("professional")).toEqual([
    "professionalSummary",
    "workExperiences",
    "projects",
    "skillGroups",
  ]);
});

test("empty personal stage is Empty", () => {
  expect(stageStatus(doc(), "personal")).toBe("Empty");
});

test("personal stage with name+email is Complete", () => {
  const d = doc({
    personalInformation: { firstName: "Ada", email: "a@x.com", links: [] },
  });
  expect(stageStatus(d, "personal")).toBe("Complete");
});

test("partial personal stage is Incomplete", () => {
  const d = doc({
    personalInformation: { firstName: "Ada", email: "", links: [] },
  });
  expect(stageStatus(d, "personal")).toBe("Incomplete");
});

test("other stage empty when no cert/award/language/custom", () => {
  expect(stageStatus(doc(), "other")).toBe("Empty");
});

test("other stage complete once any of its sections has content", () => {
  const d = doc({ awards: [{ title: "Dean's List" }] as never });
  expect(stageStatus(d, "other")).toBe("Complete");
});

test("review stage always Complete (informational)", () => {
  expect(stageStatus(doc(), "review")).toBe("Complete");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/resume/stages.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the stage model**

Create `src/modules/resume/components/stages.ts`:

```ts
import type { ResumeDocument } from "@modules/resume/types";
import { isSectionEmpty } from "@modules/resume/utils/empty";
import { isBlank } from "@modules/resume/utils/empty";

export type StageId =
  | "personal"
  | "professional"
  | "education"
  | "organization"
  | "other"
  | "review";

export type StageStatus = "Empty" | "Incomplete" | "Complete";

/** Section keys owned by each editable stage (Review owns none). */
const STAGE_SECTIONS: Record<Exclude<StageId, "review">, string[]> = {
  personal: ["personalInformation"],
  professional: [
    "professionalSummary",
    "workExperiences",
    "projects",
    "skillGroups",
  ],
  education: ["educations"],
  organization: ["organisations", "volunteerExperiences"],
  other: ["certifications", "awards", "languages", "customSections"],
};

export const STAGES: ReadonlyArray<{ id: StageId; label: string }> = [
  { id: "personal", label: "Personal" },
  { id: "professional", label: "Professional" },
  { id: "education", label: "Education" },
  { id: "organization", label: "Organization" },
  { id: "other", label: "Other" },
  { id: "review", label: "Review" },
];

export function stageSectionKeys(id: StageId): string[] {
  return id === "review" ? [] : STAGE_SECTIONS[id];
}

export function stageStatus(doc: ResumeDocument, id: StageId): StageStatus {
  if (id === "review") return "Complete";

  if (id === "personal") {
    const pi = doc.personalInformation;
    if (isBlank(pi.firstName) && isBlank(pi.email)) return "Empty";
    if (isBlank(pi.firstName) || isBlank(pi.email)) return "Incomplete";
    return "Complete";
  }

  const keys = stageSectionKeys(id);
  const allEmpty = keys.every((k) => isSectionEmpty(doc, k));
  return allEmpty ? "Empty" : "Complete";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/resume/stages.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/resume/components/stages.ts tests/resume/stages.test.ts
git commit -m "feat(editor): six-stage model with derived status"
```

---

## Task 3: Shared EntryAccordion shell

**Files:**
- Create: `src/modules/resume/components/sections/EntryAccordion.tsx`
- Test: `tests/resume/entry-accordion.test.ts`

A presentational disclosure card wrapping the existing `ItemToolbar` (reorder/duplicate/delete from `list-editors.tsx:170`). Pure helper `initialOpenIndex` is unit-tested; the component itself is verified via build + manual pass.

- [ ] **Step 1: Write failing test for `initialOpenIndex`**

Create `tests/resume/entry-accordion.test.ts`:

```ts
import { test, expect } from "bun:test";
import { initialOpenIndex } from "@modules/resume/components/sections/EntryAccordion";

test("empty list opens nothing", () => {
  expect(initialOpenIndex([])).toBe(-1);
});

test("opens first incomplete item", () => {
  expect(initialOpenIndex([true, false, true])).toBe(1);
});

test("all complete opens first item", () => {
  expect(initialOpenIndex([true, true])).toBe(0);
});

test("none complete opens first item", () => {
  expect(initialOpenIndex([false, false])).toBe(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/resume/entry-accordion.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement EntryAccordion + helper**

Create `src/modules/resume/components/sections/EntryAccordion.tsx`:

```tsx
import { useState, type ReactNode } from "react";
import { ItemToolbar } from "./list-editors";

/**
 * Which item should be open on mount: the first incomplete one, else the first
 * item, else none (-1) for an empty list. `complete[i]` is a per-item flag.
 */
export function initialOpenIndex(complete: boolean[]): number {
  if (complete.length === 0) return -1;
  const firstIncomplete = complete.findIndex((c) => !c);
  return firstIncomplete === -1 ? 0 : firstIncomplete;
}

export interface AccordionItemProps {
  index: number;
  length: number;
  /** Collapsed header title, e.g. "Software Engineer · Acme". */
  title: string;
  /** Optional secondary line (date range / status). */
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  itemLabel: string; // "experience", "education", …
  onReorder: (fn: (arr: unknown[]) => unknown[]) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  children: ReactNode;
}

const HEAD =
  "flex w-full items-center gap-2 px-4 py-3 text-left min-h-[44px]";

export function AccordionItem(props: AccordionItemProps) {
  const panelId = `acc-panel-${props.itemLabel}-${props.index}`;
  const btnId = `acc-btn-${props.itemLabel}-${props.index}`;
  return (
    <div className="border-2 border-[var(--color-ink)] rounded-[var(--radius)] bg-[var(--color-white)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[var(--color-ink)]">
        <button
          type="button"
          id={btnId}
          aria-expanded={props.open}
          aria-controls={panelId}
          className={HEAD}
          onClick={props.onToggle}
        >
          <span aria-hidden="true" className="font-bold">
            {props.open ? "▾" : "▸"}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-semibold">{props.title}</span>
            {props.subtitle ? (
              <span className="truncate text-xs text-[var(--color-ink)]/70">
                {props.subtitle}
              </span>
            ) : null}
          </span>
        </button>
        <div className="px-2">
          <ItemToolbar
            index={props.index}
            length={props.length}
            label={props.itemLabel}
            onReorder={props.onReorder}
            onDuplicate={props.onDuplicate}
            onDelete={props.onDelete}
          />
        </div>
      </div>
      {props.open ? (
        <div id={panelId} role="region" aria-labelledby={btnId} className="p-4">
          {props.children}
        </div>
      ) : null}
    </div>
  );
}

/** Open-state manager for a single list: at most one item auto-open. */
export function useAccordion(initial: number) {
  const [openIndex, setOpenIndex] = useState(initial);
  return {
    openIndex,
    isOpen: (i: number) => i === openIndex,
    toggle: (i: number) => setOpenIndex((cur) => (cur === i ? -1 : i)),
    open: (i: number) => setOpenIndex(i),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/resume/entry-accordion.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify build**

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/modules/resume/components/sections/EntryAccordion.tsx tests/resume/entry-accordion.test.ts
git commit -m "feat(editor): shared EntryAccordion disclosure shell"
```

---

## Task 4: Convert Work / Education / Projects / Skills to accordions

**Files:**
- Modify: `src/modules/resume/components/sections/WorkExperienceSection.tsx`
- Modify: `src/modules/resume/components/sections/EducationSection.tsx`
- Modify: `src/modules/resume/components/sections/ProjectsSection.tsx`
- Modify: `src/modules/resume/components/sections/SkillsSection.tsx`

Each section currently renders a bordered card with an always-open body and an inline `ItemToolbar`. Replace the outer card + header with `AccordionItem` + `useAccordion`, moving the fields into the accordion body. New items auto-open.

- [ ] **Step 1: Refactor WorkExperienceSection**

Replace the body of `WorkExperienceSection.tsx` (keep imports for fields/list-editors; add accordion import). The map becomes:

```tsx
import { AccordionItem, useAccordion, initialOpenIndex } from "./EntryAccordion";
// …existing imports (TextField, SelectField, CheckboxField, BulletList, TagList, BTN)…

// inside the component, after `const items = props.doc.workExperiences;`
const acc = useAccordion(
  initialOpenIndex(items.map((w) => !!w.jobTitle && !!w.company)),
);

// replace the <div key={i} …card…> block with:
{items.map((it, i) => {
  const title =
    it.jobTitle || it.company
      ? `${it.jobTitle}${it.company ? ` · ${it.company}` : ""}`
      : `Experience ${i + 1}`;
  return (
    <AccordionItem
      key={i}
      index={i}
      length={items.length}
      title={title}
      open={acc.isOpen(i)}
      onToggle={() => acc.toggle(i)}
      itemLabel="experience"
      onReorder={(fn) => setItems(fn(items) as WorkExperience[])}
      onDuplicate={() =>
        setItems([...items.slice(0, i + 1), { ...it }, ...items.slice(i + 1)])
      }
      onDelete={() => setItems(items.filter((_, j) => j !== i))}
    >
      {/* the EXISTING two field grids, currentlyWorking checkbox, BulletList,
          TagList — unchanged — go here */}
    </AccordionItem>
  );
})}

// change the Add button to open the new item:
<button
  type="button"
  className={`${BTN} mt-2`}
  onClick={() => {
    setItems([...items, emptyExperience()]);
    acc.open(items.length);
  }}
>
  Add experience
</button>
```

Keep the outer `<section aria-labelledby="sec-work">` and its `<h2 id="sec-work">` intact.

- [ ] **Step 2: Apply the same pattern to Education**

In `EducationSection.tsx`, add the accordion import, compute:

```tsx
const acc = useAccordion(
  initialOpenIndex(items.map((e) => !!e.institution)),
);
```

Wrap each item in `AccordionItem` with `itemLabel="education"`, `title` = existing derived title, moving the field grid + checkboxes + textareas into the body. Update the Add button to `acc.open(items.length)` after adding.

- [ ] **Step 3: Apply to Projects**

In `ProjectsSection.tsx`:

```tsx
const acc = useAccordion(initialOpenIndex(items.map((p) => !!p.name)));
```

Wrap items with `itemLabel="project"`, body = existing field grids + description + TagList. Add button opens new item.

- [ ] **Step 4: Apply to Skills**

In `SkillsSection.tsx`:

```tsx
const acc = useAccordion(
  initialOpenIndex(groups.map((g) => g.skills.length > 0)),
);
```

Wrap each group with `itemLabel="skill group"`, `title = g.label || g.category`, body = category select + label + TagList. Add button opens new group.

- [ ] **Step 5: Verify build + existing tests**

Run: `bun run check && bun test`
Expected: 0 type errors; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/modules/resume/components/sections/WorkExperienceSection.tsx src/modules/resume/components/sections/EducationSection.tsx src/modules/resume/components/sections/ProjectsSection.tsx src/modules/resume/components/sections/SkillsSection.tsx
git commit -m "feat(editor): collapse repeatable entries into accordions"
```

---

## Task 5: Organization stage sections (Organisations + Volunteer)

**Files:**
- Create: `src/modules/resume/components/sections/OrganisationsSection.tsx`
- Create: `src/modules/resume/components/sections/VolunteerSection.tsx`

Schema: `organisationSchema` (name, role, city, country, startYear, endYear, currentlyActive, description) `src/modules/resume/schemas/index.ts:93`; `volunteerExperienceSchema` uses `organisation` instead of `name` `:104`.

- [ ] **Step 1: Create OrganisationsSection**

```tsx
import type { ResumeDocument, Organisation } from "@modules/resume/types";
import { TextField, TextArea, CheckboxField } from "./fields";
import { BTN } from "./list-editors";
import { AccordionItem, useAccordion, initialOpenIndex } from "./EntryAccordion";

type Updater = (fn: (prev: ResumeDocument) => ResumeDocument) => void;

function emptyOrg(): Organisation {
  return { name: "", currentlyActive: false };
}

export default function OrganisationsSection(props: {
  doc: ResumeDocument;
  update: Updater;
}) {
  const items = props.doc.organisations;
  const setItems = (next: Organisation[]) =>
    props.update((prev) => ({ ...prev, organisations: next }));
  const patchItem = (i: number, patch: Partial<Organisation>) =>
    setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const acc = useAccordion(initialOpenIndex(items.map((o) => !!o.name)));

  return (
    <section aria-labelledby="sec-org" className="flex flex-col gap-6">
      <h2 id="sec-org" className="text-xl font-bold">
        Organizations
      </h2>
      <div className="flex flex-col gap-4">
        {items.map((it, i) => (
          <AccordionItem
            key={i}
            index={i}
            length={items.length}
            title={it.name || it.role ? `${it.name}${it.role ? ` · ${it.role}` : ""}` : `Organization ${i + 1}`}
            open={acc.isOpen(i)}
            onToggle={() => acc.toggle(i)}
            itemLabel="organization"
            onReorder={(fn) => setItems(fn(items) as Organisation[])}
            onDuplicate={() =>
              setItems([...items.slice(0, i + 1), { ...it }, ...items.slice(i + 1)])
            }
            onDelete={() => setItems(items.filter((_, j) => j !== i))}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Name" value={it.name} onChange={(v) => patchItem(i, { name: v })} />
              <TextField label="Role" value={it.role ?? ""} onChange={(v) => patchItem(i, { role: v })} />
              <TextField label="City" value={it.city ?? ""} onChange={(v) => patchItem(i, { city: v })} />
              <TextField label="Country" value={it.country ?? ""} onChange={(v) => patchItem(i, { country: v })} />
              <TextField label="Start year" type="number" value={it.startYear ? String(it.startYear) : ""} onChange={(v) => patchItem(i, { startYear: v ? Number(v) : undefined })} />
              <TextField label="End year" type="number" value={it.endYear ? String(it.endYear) : ""} onChange={(v) => patchItem(i, { endYear: v ? Number(v) : undefined })} />
            </div>
            <CheckboxField label="Currently active" checked={it.currentlyActive} onChange={(v) => patchItem(i, { currentlyActive: v })} />
            <TextArea label="Description" rows={3} value={it.description ?? ""} onChange={(v) => patchItem(i, { description: v })} />
          </AccordionItem>
        ))}
      </div>
      <button type="button" className={`${BTN} mt-2`} onClick={() => { setItems([...items, emptyOrg()]); acc.open(items.length); }}>
        Add organization
      </button>
    </section>
  );
}
```

- [ ] **Step 2: Create VolunteerSection**

Same structure; field is `organisation` (not `name`); `aria-labelledby="sec-volunteer"`, `itemLabel="volunteer role"`, empty factory `{ organisation: "", currentlyActive: false }`, list key `volunteerExperiences`. Title derives from `it.organisation`.

- [ ] **Step 3: Verify build**

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/resume/components/sections/OrganisationsSection.tsx src/modules/resume/components/sections/VolunteerSection.tsx
git commit -m "feat(editor): organizations and volunteer section editors"
```

---

## Task 6: Other stage sections (Certifications, Awards, Languages, Custom)

**Files:**
- Create: `src/modules/resume/components/sections/CertificationsSection.tsx`
- Create: `src/modules/resume/components/sections/AwardsSection.tsx`
- Create: `src/modules/resume/components/sections/LanguagesSection.tsx`
- Create: `src/modules/resume/components/sections/CustomSectionsSection.tsx`

Schemas: `certificationSchema` (name, issuer, issueDate, expiryDate, credentialId, credentialUrl) `:115`; `awardSchema` (title, issuer, date, description) `:124`; `languageSchema` (name, proficiency) `:131`; `customSectionSchema` (title, items[{heading, subheading, description, bullets[]}]) `:177`.

- [ ] **Step 1: CertificationsSection**

Accordion list, `itemLabel="certification"`, title from `it.name`, empty `{ name: "" }`, fields: name, issuer, issueDate, expiryDate, credentialId, credentialUrl (type url). List key `certifications`.

- [ ] **Step 2: AwardsSection**

Accordion list, `itemLabel="award"`, title from `it.title`, empty `{ title: "" }`, fields: title, issuer, date, description (TextArea). List key `awards`.

- [ ] **Step 3: LanguagesSection**

Simpler inline list (no accordion needed — two short fields). Pattern mirrors a compact repeatable using existing `TextField` rows + `ItemToolbar`. Empty `{ name: "" }`, fields: name, proficiency. List key `languages`. Keep `<section aria-labelledby="sec-languages">` + `<h2>`.

```tsx
import type { ResumeDocument, Language } from "@modules/resume/types";
import { TextField } from "./fields";
import { ItemToolbar, BTN } from "./list-editors";

type Updater = (fn: (prev: ResumeDocument) => ResumeDocument) => void;

export default function LanguagesSection(props: { doc: ResumeDocument; update: Updater }) {
  const items = props.doc.languages;
  const setItems = (next: Language[]) => props.update((prev) => ({ ...prev, languages: next }));
  const patchItem = (i: number, patch: Partial<Language>) =>
    setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  return (
    <section aria-labelledby="sec-languages" className="flex flex-col gap-6">
      <h2 id="sec-languages" className="text-xl font-bold">Languages</h2>
      <div className="flex flex-col gap-4">
        {items.map((it, i) => (
          <div key={i} className="flex flex-col gap-3 border-2 border-[var(--color-ink)] rounded-[var(--radius)] p-4 bg-[var(--color-white)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold" aria-hidden="true">{it.name || `Language ${i + 1}`}</span>
              <ItemToolbar
                index={i} length={items.length} label="language"
                onReorder={(fn) => setItems(fn(items) as Language[])}
                onDuplicate={() => setItems([...items.slice(0, i + 1), { ...it }, ...items.slice(i + 1)])}
                onDelete={() => setItems(items.filter((_, j) => j !== i))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Language" value={it.name} onChange={(v) => patchItem(i, { name: v })} />
              <TextField label="Proficiency" value={it.proficiency ?? ""} onChange={(v) => patchItem(i, { proficiency: v })} />
            </div>
          </div>
        ))}
      </div>
      <button type="button" className={`${BTN} mt-2`} onClick={() => setItems([...items, { name: "" }])}>
        Add language
      </button>
    </section>
  );
}
```

- [ ] **Step 4: CustomSectionsSection**

Accordion list, `itemLabel="section"`, title from `it.title`, empty `{ title: "", items: [] }`. Body: title TextField + a nested repeatable of entries (heading, subheading, description via TextArea, bullets via existing `BulletList`). Update nested items immutably. List key `customSections`.

- [ ] **Step 5: Verify build**

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/modules/resume/components/sections/CertificationsSection.tsx src/modules/resume/components/sections/AwardsSection.tsx src/modules/resume/components/sections/LanguagesSection.tsx src/modules/resume/components/sections/CustomSectionsSection.tsx
git commit -m "feat(editor): certifications, awards, languages, custom section editors"
```

---

## Task 7: StageStepper component

**Files:**
- Create: `src/modules/resume/components/StageStepper.tsx`

Renders `STAGES` from Task 2 as connected buttons (desktop) and a horizontal strip (mobile). Uses `stageStatus` for the status affordance (checkmark + text, never colour-only).

- [ ] **Step 1: Implement StageStepper**

```tsx
import type { ResumeDocument } from "@modules/resume/types";
import { STAGES, stageStatus, type StageId } from "./stages";

const STATUS_MARK: Record<string, string> = {
  Complete: "✓",
  Incomplete: "•",
  Empty: "○",
};

export default function StageStepper(props: {
  doc: ResumeDocument;
  active: StageId;
  onSelect: (id: StageId) => void;
}) {
  return (
    <nav aria-label="Résumé stages" className="w-full">
      <ol className="flex w-full gap-1 overflow-x-auto">
        {STAGES.map((s, i) => {
          const status = stageStatus(props.doc, s.id);
          const isActive = s.id === props.active;
          return (
            <li key={s.id} className="min-w-0 flex-1">
              <button
                type="button"
                aria-current={isActive ? "step" : undefined}
                onClick={() => props.onSelect(s.id)}
                className={`neo-button min-h-[44px] w-full min-w-0 justify-start gap-2 whitespace-nowrap px-3 text-sm ${
                  isActive
                    ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                    : "bg-[var(--color-white)] text-[var(--color-ink)]"
                }`}
              >
                <span aria-hidden="true" className="font-bold">
                  {i + 1}
                </span>
                <span className="truncate">{s.label}</span>
                <span className="ml-auto text-xs" aria-label={status}>
                  {STATUS_MARK[status]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/resume/components/StageStepper.tsx
git commit -m "feat(editor): six-stage stepper navigation"
```

---

## Task 8: StageForm — render a stage's sections with card + footer

**Files:**
- Create: `src/modules/resume/components/StageForm.tsx`

Maps a `StageId` to its section components (from Tasks 5–6 plus existing ones), wrapped in one neo-card with a title, short guidance, and Back / Save & Continue footer.

- [ ] **Step 1: Implement StageForm**

```tsx
import type { ResumeDocument } from "@modules/resume/types";
import type { RenderAiAssist } from "./AiPanel";
import { STAGES, type StageId } from "./stages";
import PersonalInfoSection from "./sections/PersonalInfoSection";
import SummarySection from "./sections/SummarySection";
import WorkExperienceSection from "./sections/WorkExperienceSection";
import ProjectsSection from "./sections/ProjectsSection";
import SkillsSection from "./sections/SkillsSection";
import EducationSection from "./sections/EducationSection";
import OrganisationsSection from "./sections/OrganisationsSection";
import VolunteerSection from "./sections/VolunteerSection";
import CertificationsSection from "./sections/CertificationsSection";
import AwardsSection from "./sections/AwardsSection";
import LanguagesSection from "./sections/LanguagesSection";
import CustomSectionsSection from "./sections/CustomSectionsSection";

type Updater = (fn: (prev: ResumeDocument) => ResumeDocument) => void;

const GUIDANCE: Record<StageId, string> = {
  personal: "Your name, contact details, and professional links.",
  professional: "Summary, work history, projects, and skills — the core of your CV.",
  education: "Degrees, institutions, and academic achievements.",
  organization: "Organizations you belong to and volunteer roles.",
  other: "Certifications, awards, languages, and any custom sections.",
  review: "Check completeness and export your résumé.",
};

const BTN =
  "neo-button min-h-[44px] px-4 text-sm bg-[var(--color-white)] text-[var(--color-ink)]";

function StageSections(props: {
  stage: StageId;
  doc: ResumeDocument;
  update: Updater;
  renderAiAssist?: RenderAiAssist;
}) {
  const { doc, update, renderAiAssist } = props;
  switch (props.stage) {
    case "personal":
      return <PersonalInfoSection doc={doc} update={update} />;
    case "professional":
      return (
        <div className="flex flex-col gap-8">
          <SummarySection doc={doc} update={update} renderAiAssist={renderAiAssist} />
          <WorkExperienceSection doc={doc} update={update} renderAiAssist={renderAiAssist} />
          <ProjectsSection doc={doc} update={update} />
          <SkillsSection doc={doc} update={update} />
        </div>
      );
    case "education":
      return <EducationSection doc={doc} update={update} />;
    case "organization":
      return (
        <div className="flex flex-col gap-8">
          <OrganisationsSection doc={doc} update={update} />
          <VolunteerSection doc={doc} update={update} />
        </div>
      );
    case "other":
      return (
        <div className="flex flex-col gap-8">
          <CertificationsSection doc={doc} update={update} />
          <AwardsSection doc={doc} update={update} />
          <LanguagesSection doc={doc} update={update} />
          <CustomSectionsSection doc={doc} update={update} />
        </div>
      );
    case "review":
      return null; // Review body is provided by the editor (score + export).
  }
}

export default function StageForm(props: {
  stage: StageId;
  doc: ResumeDocument;
  update: Updater;
  renderAiAssist?: RenderAiAssist;
  onBack?: () => void;
  onNext?: () => void;
  reviewBody?: React.ReactNode;
}) {
  const meta = STAGES.find((s) => s.id === props.stage)!;
  const idx = STAGES.findIndex((s) => s.id === props.stage);
  const isFirst = idx === 0;
  const isLast = idx === STAGES.length - 1;

  return (
    <div className="neo-card flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold">{meta.label}</h2>
        <p className="text-sm text-[var(--color-ink)]/70">{GUIDANCE[props.stage]}</p>
      </div>

      {props.stage === "review" ? props.reviewBody : (
        <StageSections
          stage={props.stage}
          doc={props.doc}
          update={props.update}
          renderAiAssist={props.renderAiAssist}
        />
      )}

      <div className="mt-2 flex items-center justify-between gap-2 border-t-2 border-[var(--color-ink)] pt-4">
        <button type="button" className={BTN} disabled={isFirst} onClick={props.onBack}>
          Back
        </button>
        {!isLast ? (
          <button
            type="button"
            className={`${BTN} bg-[var(--color-ink)] text-[var(--color-paper)]`}
            onClick={props.onNext}
          >
            Save &amp; Continue
          </button>
        ) : (
          <a
            href={`/app/resume/${props.doc.id}/export`}
            target="_blank"
            rel="noopener"
            className={`${BTN} bg-[var(--color-ink)] text-[var(--color-paper)]`}
          >
            Export PDF
          </a>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/resume/components/StageForm.tsx
git commit -m "feat(editor): stage form card with guidance and footer nav"
```

---

## Task 9: Preview appearance toolbar + refined seams

**Files:**
- Modify: `src/modules/resume/components/Preview.tsx`
- Modify: `src/styles/print.css`
- Create: `src/modules/resume/components/PreviewAppearance.tsx`

Add capability-aware appearance controls above the canvas and replace the bold `Page N` pill with a subtle seam using `pageBoundaryOffsetsMm` (Task 1) and per-template capability (Task 12 metadata — until then use a local capability map defined here and reconciled in Task 12).

- [ ] **Step 1: Refine seams in print.css**

Replace the `.preview-page-break*` rules added earlier with a subtle band + thin rule:

```css
/* Page-break seam (preview only). Subtle: a thin dashed rule with a small
   muted gap band suggesting the edge between two sheets. Hidden on print. */
.preview-page-break {
  pointer-events: none;
  height: 10px;
  margin-top: -5px;
  background: var(--color-muted, #f5f5f4);
  border-top: 1px dashed rgba(23, 23, 23, 0.45);
  border-bottom: 1px dashed rgba(23, 23, 23, 0.2);
}
```

Remove `.preview-page-break__label` (no pill).

- [ ] **Step 2: Create PreviewAppearance**

A compact toolbar bound to the same settings path as TemplatePanel. Font family, size (Small/Medium/Large → 0.9/1.0/1.15 scale), line spacing, accent; divider/alignment gated by `capabilities`.

```tsx
import type { ResumeDocument, ResumeTemplateSettings } from "@modules/resume/types";
import { resolveSettings } from "@modules/resume/templates/settings";

export interface TemplateCapabilities {
  divider: boolean;
  alignment: boolean;
}

const SIZE_STEPS = [
  { label: "S", value: 0.9 },
  { label: "M", value: 1.0 },
  { label: "L", value: 1.15 },
];
const FONTS = [
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Sans", value: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" },
  { label: "Helvetica", value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
];
const CTRL = "neo-input min-h-[44px] px-2 text-sm";

export default function PreviewAppearance(props: {
  resume: ResumeDocument;
  capabilities: TemplateCapabilities;
  onSettingsChange: (patch: Partial<ResumeTemplateSettings>) => void;
  onOpenTemplate: () => void;
}) {
  const s = resolveSettings(props.resume);
  return (
    <div className="no-print flex flex-wrap items-center gap-2 border-2 border-[var(--color-ink)] rounded-[var(--radius)] bg-[var(--color-white)] p-2">
      <label className="flex items-center gap-1 text-sm">
        Font
        <select className={CTRL} value={s.fontFamily}
          onChange={(e) => props.onSettingsChange({ fontFamily: e.target.value })}>
          {FONTS.some((f) => f.value === s.fontFamily) ? null : (
            <option value={s.fontFamily}>Current</option>
          )}
          {FONTS.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
        </select>
      </label>
      <div role="group" aria-label="Font size" className="flex gap-1">
        {SIZE_STEPS.map((st) => (
          <button key={st.label} type="button"
            aria-pressed={Math.abs(s.fontScale - st.value) < 0.03}
            className={`neo-button min-h-[44px] px-3 text-sm ${
              Math.abs(s.fontScale - st.value) < 0.03
                ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                : "bg-[var(--color-white)] text-[var(--color-ink)]"}`}
            onClick={() => props.onSettingsChange({ fontScale: st.value })}>
            {st.label}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-1 text-sm">
        Accent
        <input type="color" aria-label="Accent color" value={s.accentColor}
          className="h-8 w-10 border-2 border-[var(--color-ink)]"
          onChange={(e) => props.onSettingsChange({ accentColor: e.target.value })} />
      </label>
      {props.capabilities.alignment ? (
        <label className="flex items-center gap-1 text-sm">
          Align
          <select className={CTRL} value={s.alignment}
            onChange={(e) => props.onSettingsChange({ alignment: e.target.value === "center" ? "center" : "left" })}>
            <option value="left">Left</option>
            <option value="center">Center</option>
          </select>
        </label>
      ) : null}
      {props.capabilities.divider ? (
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" className="h-5 w-5" checked={s.divider}
            onChange={(e) => props.onSettingsChange({ divider: e.target.checked })} />
          Dividers
        </label>
      ) : null}
      <button type="button" className="neo-button min-h-[44px] px-3 text-sm bg-[var(--color-white)] text-[var(--color-ink)]"
        onClick={props.onOpenTemplate}>
        Template…
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Wire seams in Preview.tsx**

In `Preview.tsx`, replace the `pages > 1 ? Array.from(...)` block with boundary offsets, and add an optional appearance slot above the canvas via a new prop `appearance?: React.ReactNode`.

```tsx
import { A4_PAGE_MM, pageBreakInfo, pageBoundaryOffsetsMm, pxToMm } from "@modules/resume/utils/page-break";

// derive boundaries alongside `info`:
const boundaries = useMemo(
  () => (heightMm == null ? [] : pageBoundaryOffsetsMm(heightMm, A4_PAGE_MM)),
  [heightMm],
);

// render appearance slot before the toolbar row, if provided:
{props.appearance ? <div className="no-print">{props.appearance}</div> : null}

// replace the guide block:
{boundaries.map((topMm, i) => (
  <div
    key={i}
    className="no-print preview-page-break"
    aria-hidden="true"
    style={{ position: "absolute", left: 0, right: 0, top: `${topMm}mm` }}
  />
))}
```

Add `appearance?: React.ReactNode` to Preview's props type.

- [ ] **Step 4: Verify build + page-break tests**

Run: `bun run check && bun test tests/resume/page-break.test.ts`
Expected: 0 errors; tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/modules/resume/components/Preview.tsx src/modules/resume/components/PreviewAppearance.tsx src/styles/print.css
git commit -m "feat(preview): inline appearance toolbar + subtle page seams"
```

---

## Task 10: Template capabilities helper

**Files:**
- Create: `src/modules/resume/templates/capabilities.ts`
- Test: `tests/resume/template-capabilities.test.ts`

Encodes which appearance controls each template actually honors (verified in code): divider → essential/executive/academic; alignment → essential/modern/graduate/academic. Executive centers regardless; technical honors neither.

- [ ] **Step 1: Write failing tests**

Create `tests/resume/template-capabilities.test.ts`:

```ts
import { test, expect } from "bun:test";
import { templateCapabilities } from "@modules/resume/templates/capabilities";

test("essential supports divider and alignment", () => {
  expect(templateCapabilities("essential")).toEqual({ divider: true, alignment: true });
});

test("technical supports neither", () => {
  expect(templateCapabilities("technical")).toEqual({ divider: false, alignment: false });
});

test("executive supports divider only (header is always centered)", () => {
  expect(templateCapabilities("executive")).toEqual({ divider: true, alignment: false });
});

test("modern supports alignment only", () => {
  expect(templateCapabilities("modern")).toEqual({ divider: false, alignment: true });
});

test("unknown id falls back to no capabilities", () => {
  expect(templateCapabilities("nope")).toEqual({ divider: false, alignment: false });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `bun test tests/resume/template-capabilities.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/modules/resume/templates/capabilities.ts`:

```ts
import type { TemplateCapabilities } from "@modules/resume/components/PreviewAppearance";

const MAP: Record<string, TemplateCapabilities> = {
  essential: { divider: true, alignment: true },
  modern: { divider: false, alignment: true },
  executive: { divider: true, alignment: false },
  graduate: { divider: false, alignment: true },
  technical: { divider: false, alignment: false },
  academic: { divider: true, alignment: true },
};

export function templateCapabilities(id: string): TemplateCapabilities {
  return MAP[id] ?? { divider: false, alignment: false };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `bun test tests/resume/template-capabilities.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/resume/templates/capabilities.ts tests/resume/template-capabilities.test.ts
git commit -m "feat(templates): appearance capability map per template"
```

---

## Task 11: Template dialog + hide non-functional controls

**Files:**
- Modify: `src/modules/resume/components/TemplatePanel.tsx`

Keep TemplatePanel content, but remove the always-shown `Show photo` toggle (no photo editing/rendering) and the `headingStyle`-adjacent nothing. Alignment/divider stay (advanced) but the panel is intended to be shown inside a Dialog (wiring in Task 12).

- [ ] **Step 1: Remove the Show photo toggle**

Delete the `<Toggle label="Show photo" … />` block (`TemplatePanel.tsx:242-246`). Leave `showLinks` and the rest.

- [ ] **Step 2: Verify build**

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/resume/components/TemplatePanel.tsx
git commit -m "refactor(templates): drop non-functional Show photo control"
```

---

## Task 12: Rewire ResumeEditor to stages + two-column + sheets

**Files:**
- Modify: `src/modules/resume/components/ResumeEditor.tsx`

Replace section-key state with stage state; render StageStepper + StageForm + Preview(appearance) in a two-column desktop layout; put Template in a Dialog, Score/Match in side sheets. Keep toolbar/title/save/undo/redo/More, conflict banner, mobile tabs.

- [ ] **Step 1: Swap imports and state**

Remove `SectionNav`, `SECTIONS`, `SectionKey`, `ActiveSection`. Add:

```tsx
import StageStepper from "./StageStepper";
import StageForm from "./StageForm";
import PreviewAppearance from "./PreviewAppearance";
import { STAGES, type StageId } from "./stages";
import { templateCapabilities } from "@modules/resume/templates/capabilities";
import { Dialog } from "@components/ui/Dialog";
```

Replace `const [active, setActive] = useState<SectionKey>("personalInformation");` with:

```tsx
const [stage, setStage] = useState<StageId>("personal");
const stageIdx = STAGES.findIndex((s) => s.id === stage);
const goNext = () => {
  store.saveNow();
  const next = STAGES[Math.min(STAGES.length - 1, stageIdx + 1)];
  setStage(next.id);
};
const goBack = () => setStage(STAGES[Math.max(0, stageIdx - 1)].id);
```

- [ ] **Step 2: Build the appearance node + capabilities**

```tsx
const caps = templateCapabilities(store.doc.templateId);
const onSettingsChange = (patch: Partial<ResumeTemplateSettings>) =>
  store.update({ templateSettings: { ...store.doc.templateSettings, ...patch } });

const appearance = (
  <PreviewAppearance
    resume={store.doc}
    capabilities={caps}
    onSettingsChange={onSettingsChange}
    onOpenTemplate={() => setShowTemplates(true)}
  />
);
```

- [ ] **Step 3: Review body (score + export) for the Review stage**

```tsx
const reviewBody = (
  <div className="flex flex-col gap-4">
    <ScorePanel resumeId={store.doc.id} />
  </div>
);
```

- [ ] **Step 4: Replace the desktop 3-pane grid**

Replace the `hidden … md:grid md:grid-cols-[220px_…]` block with a two-column layout and a sticky preview:

```tsx
{/* Desktop two-column: form (55%) + sticky preview */}
<div className="hidden gap-6 lg:grid lg:grid-cols-[minmax(0,55fr)_minmax(420px,45fr)]">
  <div className="min-w-0">
    <StageForm
      stage={stage}
      doc={store.doc}
      update={updateFn}
      renderAiAssist={renderAiAssist}
      onBack={goBack}
      onNext={goNext}
      reviewBody={reviewBody}
    />
  </div>
  <div className="min-w-0">
    <div className="lg:sticky lg:top-4">
      <Preview resume={store.doc} appearance={appearance} />
    </div>
  </div>
</div>
```

Insert the `<StageStepper doc={store.doc} active={stage} onSelect={setStage} />` between the toolbar and the desktop grid, wrapped in a `hidden lg:block` container.

- [ ] **Step 5: Update mobile view to stages**

In the mobile `edit` tab, replace the section pill strip with a stage strip:

```tsx
<div className="lg:hidden">
  <StageStepper doc={store.doc} active={stage} onSelect={(id) => { setStage(id); setMobileTab("edit"); }} />
</div>
```

And render the stage form in the mobile edit pane:

```tsx
{mobileTab === "edit" ? (
  <StageForm stage={stage} doc={store.doc} update={updateFn} renderAiAssist={renderAiAssist} onBack={goBack} onNext={goNext} reviewBody={reviewBody} />
) : mobileTab === "preview" ? (
  <Preview resume={store.doc} appearance={appearance} />
) : (
  <ScorePanel resumeId={store.doc.id} />
)}
```

Change the mobile/desktop breakpoint from `md` to `lg` for the segmented control and panes (replace `md:hidden`→`lg:hidden`, `hidden md:…`→`hidden lg:…`).

- [ ] **Step 6: Template dialog + Match sheet**

Replace the inline `showTemplates` card with a Dialog:

```tsx
<Dialog open={showTemplates} title="Template & appearance" size="lg" onClose={() => setShowTemplates(false)}>
  {templatePanel}
</Dialog>
```

Replace the inline `showMatch` block with a right side sheet. Add a minimal inline side-sheet wrapper (no new file) using fixed positioning + focus semantics consistent with Dialog, OR reuse Dialog with `size="lg"`:

```tsx
<Dialog open={showMatch} title="Match with a job" size="lg" onClose={() => setShowMatch(false)}>
  <MatchPanel resumeId={store.doc.id} />
</Dialog>
```

Remove the old desktop `showScore` card (score now lives in the Review stage and the mobile Score tab); keep the `ATS Score` toolbar button but make it jump to the Review stage on desktop:

```tsx
onClick={() => { setStage("review"); setShowScore(false); }}
```

- [ ] **Step 7: Verify build + full tests**

Run: `bun run check && bun test`
Expected: 0 type errors; all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/modules/resume/components/ResumeEditor.tsx
git commit -m "feat(editor): stage-driven two-column layout with sticky preview and sheets"
```

---

## Task 13: Full-width editor shell

**Files:**
- Modify: `src/pages/app/resume/[id]/edit.astro`

Remove the duplicate page heading and the `max-w-6xl` clamp; give the editor a wide workspace.

- [ ] **Step 1: Widen the shell + drop duplicate heading**

Replace the `<main>` block:

```astro
<BaseLayout meta={{ title: `Edit — ${doc.title}`, noindex: true }}>
  <main id="main-content" class="mx-auto w-full max-w-[1600px] px-4 py-6">
    <ResumeEditor client:load initialDoc={doc} />
  </main>
</BaseLayout>
```

- [ ] **Step 2: Verify build**

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/resume/[id]/edit.astro
git commit -m "feat(editor): full-width workspace, remove duplicate heading"
```

---

## Task 14: Native print fragmentation safeguards

**Files:**
- Modify: `src/styles/print.css`

Prevent preventable breaks: keep section headings with their first content and avoid splitting short entry blocks; allow long ones to fragment.

- [ ] **Step 1: Add print fragmentation rules**

Append inside `print.css` (outside `@media print` for the heading-keep, plus a print block for entry blocks):

```css
@media print {
  /* Keep a section heading attached to the content that follows it. */
  .resume-page h2,
  .resume-page h3 {
    break-after: avoid-page;
  }
  /* Header/contact block should never split. */
  .resume-page header {
    break-inside: avoid-page;
  }
  /* Short entry rows avoid splitting; very long ones may still fragment
     because their content exceeds a page. `article > * > div` targets the
     per-entry wrappers rendered by sections.tsx bodies. */
  .resume-page section > div > div {
    break-inside: avoid-page;
    orphans: 3;
    widows: 3;
  }
}
```

- [ ] **Step 2: Verify build**

Run: `bun run check && bun run build`
Expected: build succeeds.

- [ ] **Step 3: Manual print check**

Open export for a 2-page CV; browser Print preview. Confirm headings aren't stranded at page bottom and short entries aren't split. Record result.

- [ ] **Step 4: Commit**

```bash
git add src/styles/print.css
git commit -m "feat(print): native fragmentation safeguards for headings and entries"
```

---

## Task 15: Cleanup dead code + final verification

**Files:**
- Modify: `src/modules/resume/components/ResumeEditor.tsx` (remove unused `SectionNav` export if now unused)
- Possibly delete: `src/modules/resume/components/SectionNav.tsx` (only if no other importer)

- [ ] **Step 1: Find SectionNav importers**

Run: `grep -rn "SectionNav" src tests`
Expected: only its own file (safe to delete) or ResumeEditor (remove import).

- [ ] **Step 2: Remove if unused**

If no external importer remains, delete `SectionNav.tsx` and remove `export { SECTIONS }` from ResumeEditor if nothing imports it. Re-run grep for `from "./sections/keys"` and `SECTIONS` to confirm no breakage. Keep `sections/keys.ts` if still referenced by other modules; otherwise leave it (out of scope to remove).

- [ ] **Step 3: Full check + tests + build**

Run: `bun run check && bun test && bun run build`
Expected: 0 type errors; all tests pass; build succeeds.

- [ ] **Step 4: Manual desktop verification**

At 1024/1280/1440/1920px: sticky toolbar+stepper, form 55% readable, preview A4 centered and sticky, appearance changes update preview and autosave, accordions add/focus/reorder/duplicate/delete, 2- and 3-page preview scrolls to final content with visible seams, Template dialog and Match sheet don't shift layout. Record results.

- [ ] **Step 5: Manual mobile verification**

At 375×812 and 768×1024: one pane only, stage strip scrolls to active stage, Preview/Score switch, no horizontal overflow, More menu exposes Undo/Redo/Match/Save now. Record results.

- [ ] **Step 6: Commit + push**

```bash
git add -A
git commit -m "chore(editor): remove dead section-nav path after stage migration"
git push origin main
```

---

## Self-review notes

- **Spec §5 stages** → Tasks 2, 7, 8, 12.
- **Spec §6 shell/two-column** → Tasks 12, 13.
- **Spec §7 toolbar** → Task 12 (kept + ATS jumps to Review).
- **Spec §8 stepper** → Tasks 7, 12.
- **Spec §9 form card** → Task 8.
- **Spec §10 accordions** → Tasks 3, 4, 5, 6.
- **Spec §11 preview appearance + canvas** → Tasks 9, 10, 12.
- **Spec §12 multi-page + print** → Tasks 1, 9, 14.
- **Spec §13 score/match/template/AI surfaces** → Tasks 11, 12.
- **Spec §14 responsive** → Task 12 (lg breakpoint).
- **Spec §16 error handling** → autosave/conflict paths untouched; `Save & Continue` uses `saveNow` (Task 12).
- **Spec §17 accessibility** → aria-current step (Task 7), accordion aria-expanded/controls (Task 3), dialogs reused (Tasks 11, 12).
- **Spec §18 component boundaries** → matches file list.
- **Spec §19 verification** → Tasks 1/2/3/10 unit tests; Tasks 14/15 manual + build.
- **Type consistency:** `TemplateCapabilities` defined in `PreviewAppearance.tsx`, imported by `capabilities.ts`; `StageId` defined in `stages.ts`, used by StageStepper/StageForm/ResumeEditor; `initialOpenIndex`/`useAccordion`/`AccordionItem` all from `EntryAccordion.tsx`.
- **No DOM test harness** exists (no happy-dom/testing-library); component behavior is verified via build + manual passes, pure logic via `bun:test`. This is a deliberate ceiling, not an omission.
