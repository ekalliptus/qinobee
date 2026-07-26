# Qinobee Vertical MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working Astro + Bun + SQLite student-success platform MVP with real auth, a functional resume builder (editor, autosave, six templates, ATS scoring, job matcher, server-side AI, print-to-PDF), and a neo-brutalist marketing site.

**Architecture:** Astro SSR (form-first, progressive enhancement) with a single hydrated React editor island. Server actions validate with Zod and call service modules backed by `bun:sqlite` repositories. AI runs server-only against an OpenAI-compatible endpoint. See `docs/superpowers/specs/2026-07-26-qinobee-vertical-mvp-design.md`.

**Tech Stack:** Astro (SSR), TypeScript strict, Bun (pm/runner/test), Tailwind CSS + CSS tokens, React (island only), Zod, Lucide, `bun:sqlite`, `Bun.password`.

---

## File Structure

```text
qinobee/
├── astro.config.mjs                     # SSR + Bun adapter, react, tailwind, sitemap
├── tsconfig.json                        # strict, path aliases
├── package.json                         # scripts
├── .env.example
├── .gitignore
├── src/
│   ├── config/{site.ts,navigation.ts,features.ts}
│   ├── styles/{tokens.css,typography.css,global.css,utilities.css}
│   ├── lib/
│   │   ├── db/{client.ts,migrate.ts}                 # sqlite singleton + schema
│   │   ├── auth/{password.ts,session.ts,middleware.ts}
│   │   ├── validation/{primitives.ts}
│   │   ├── ai/{client.ts,prompts.ts}
│   │   ├── rate-limit/index.ts
│   │   ├── seo/index.ts
│   │   └── utils/{slug.ts,filename.ts,dates.ts}
│   ├── modules/resume/
│   │   ├── types/index.ts
│   │   ├── schemas/index.ts                          # Zod + inferred types
│   │   ├── repository/{interface.ts,sqlite.ts}
│   │   ├── services/{resume-service.ts,ai-service.ts}
│   │   ├── scoring/{rules.ts,engine.ts}
│   │   ├── matcher/{normalize.ts,matcher.ts}
│   │   ├── templates/{registry.ts,*.astro or .tsx}
│   │   ├── utils/{empty.ts,page-break.ts}
│   │   └── components/                               # React editor island
│   │       ├── ResumeEditor.tsx
│   │       ├── store.ts                              # state + undo/redo + autosave
│   │       ├── sections/*.tsx
│   │       ├── Preview.tsx
│   │       ├── ScorePanel.tsx
│   │       ├── MatchPanel.tsx
│   │       └── AiPanel.tsx
│   ├── components/{ui,layout,sections,forms}/
│   ├── layouts/{BaseLayout,MarketingLayout,AppLayout,ContentLayout}.astro
│   ├── actions/index.ts                              # Astro actions
│   ├── content.config.ts
│   ├── content/{blog,guides,updates,case-studies}/
│   ├── data/{solutions.ts,faqs.ts}
│   ├── i18n/{en.ts,id.ts,index.ts}
│   └── pages/                                        # routes
├── tests/                                            # bun tests mirror src
└── README.md
```

---

## Phase 0 — Bootstrap & tooling

### Task 0.1: Scaffold Astro project with Bun

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `bunfig.toml`

- [ ] **Step 1: Scaffold**

Run in project root (already has `docs/`, `.git`):
```bash
bun create astro@latest . -- --template minimal --no-install --no-git --yes
bun add -d @astrojs/check typescript
bunx astro add react tailwind sitemap --yes
bun add zod lucide-react
```
Choose the Bun/Node standalone SSR adapter when adding SSR (next step). If `bun create` refuses a non-empty dir, scaffold in `./tmp-astro` and move files in, preserving `docs/` and `.git/`.

- [ ] **Step 2: Configure SSR + adapter**

Set `astro.config.mjs` to `output: "server"` with the standalone Node adapter (Bun-compatible):
```bash
bunx astro add node --yes
```
```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import node from "@astrojs/node";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  site: process.env.PUBLIC_SITE_URL ?? "http://localhost:4321",
  integrations: [react(), tailwind({ applyBaseStyles: false }), sitemap()],
});
```

- [ ] **Step 3: tsconfig strict + aliases**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "strict": true,
    "verbatimModuleSyntax": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@lib/*": ["src/lib/*"],
      "@data/*": ["src/data/*"],
      "@modules/*": ["src/modules/*"]
    }
  }
}
```

- [ ] **Step 4: package.json scripts**

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "bun test",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

- [ ] **Step 5: .gitignore + .env.example**

`.gitignore` includes: `node_modules`, `dist`, `.astro`, `data/*.sqlite*`, `.env`.
`.env.example` per spec §6.

- [ ] **Step 6: Verify tooling**

Run: `bun install && bun run check`
Expected: install succeeds, `astro check` reports 0 errors (empty project).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: bootstrap Astro SSR project with Bun"
```

---

### Task 0.2: Design tokens + base styles

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/typography.css`, `src/styles/global.css`, `src/styles/utilities.css`

- [ ] **Step 1: tokens.css**

Copy the palette + border/shadow tokens from spec §6 (`--color-*`, `--border-width`, `--shadow-sm/md/lg`). Add spacing scale and radius token (small rounding).

- [ ] **Step 2: typography.css**

`@font-face` self-hosted Space Grotesk, Inter, IBM Plex Mono (place `.woff2` in `src/assets/fonts/`, download at build-time or vendor them). Define `--font-heading`, `--font-body`, `--font-mono`. Set `font-display: swap`.

- [ ] **Step 3: global.css**

Import tokens, typography. Base reset, `body { background: var(--color-paper); color: var(--color-ink); }`. `@media (prefers-reduced-motion: reduce)` disables transitions. `:focus-visible` strong outline.

- [ ] **Step 4: utilities.css**

`.neo-button`, `.neo-card` (2px ink border + hard shadow), `.neo-input`. Button hover/active offset exactly per spec §7.

- [ ] **Step 5: Wire into BaseLayout (created in 0.3) — placeholder note**

(Import happens in Task 0.3.)

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: neo-brutalism design tokens and base styles"
```

---

### Task 0.3: Config + layouts + BaseLayout

**Files:**
- Create: `src/config/site.ts`, `src/config/navigation.ts`, `src/config/features.ts`
- Create: `src/lib/seo/index.ts`
- Create: `src/layouts/BaseLayout.astro`, `MarketingLayout.astro`, `AppLayout.astro`, `ContentLayout.astro`

- [ ] **Step 1: site.ts**

```ts
export const siteConfig = {
  name: "Qinobee",
  shortName: "QB",
  description:
    "An integrated student success and career development platform for modern educational institutions.",
  email: "hello@example.com",
  demoUrl: "/request-demo",
  appUrl: "/app",
  defaultLocale: "en",
  supportedLocales: ["en", "id"] as const,
};
```

- [ ] **Step 2: navigation.ts + features.ts**

`navigation.ts`: header/footer link arrays. `features.ts`: `export const features = { aiAssist: true, publicShare: false, coverLetter: false, versionHistoryUi: false } as const;`

- [ ] **Step 3: seo/index.ts**

`buildMeta({ title, description, canonical, ogImage, noindex })` returns an object; plus JSON-LD helpers for Organization, WebSite, SoftwareApplication, BreadcrumbList, FAQPage.

- [ ] **Step 4: BaseLayout.astro**

`<html lang>`, `<head>` from `buildMeta`, skip link, imports the four CSS files, `<slot/>`. One H1 rule enforced by pages.

- [ ] **Step 5: Marketing/App/Content layouts**

Compose BaseLayout + header/footer (header/footer components stubbed now, filled in Phase 1).

- [ ] **Step 6: Verify + commit**

Run: `bun run check` → 0 errors.
```bash
git add -A && git commit -m "feat: site config, SEO helpers, layouts"
```

---

## Phase 1 — Marketing website

### Task 1.1: UI primitives

**Files:**
- Create: `src/components/ui/{Button,Badge,StatusBadge,SectionLabel,NeoCard,FeatureCard,MetricCard,Alert,Container,Section,ScoreRing}.astro`
- Test: `tests/components/button.test.ts` (variant→class mapping helper)

- [ ] **Step 1: Write failing test for button class helper**

Extract class logic into `src/components/ui/button-classes.ts`:
```ts
// tests/components/button.test.ts
import { test, expect } from "bun:test";
import { buttonClasses } from "@components/ui/button-classes";

test("primary md maps to expected classes", () => {
  const cls = buttonClasses("primary", "md");
  expect(cls).toContain("neo-button");
  expect(cls).toContain("bg-[var(--color-yellow)]");
});
test("danger variant uses red", () => {
  expect(buttonClasses("danger", "sm")).toContain("bg-[var(--color-red)]");
});
```

- [ ] **Step 2: Run — fails (module missing).** `bun test tests/components/button.test.ts`

- [ ] **Step 3: Implement `button-classes.ts`** mapping the 6 variants + 3 sizes. `Button.astro` consumes it and renders `<a>` or `<button>` with `min-height:44px`, focus-visible, disabled, loading spinner slot, accessible name required for icon-only.

- [ ] **Step 4: Run — passes.**

- [ ] **Step 5: Build remaining primitives** (no logic → no unit test; visual only). Each: 2px border, hard shadow, token colours.

- [ ] **Step 6: Commit** `feat: neo-brutalism UI primitives`

---

### Task 1.2: Header + footer + announcement bar + mobile drawer

**Files:**
- Create: `src/components/layout/{Header.astro,Footer.astro,AnnouncementBar.astro,MobileDrawer.tsx}`

- [ ] **Step 1:** AnnouncementBar closable, persists dismissal in `localStorage` (inline `<script>`, no island), reserves height to avoid CLS, `aria`-labelled close button.
- [ ] **Step 2:** Header sticky, solid bg, bottom border, desktop nav from `navigation.ts`, Sign In + Request Demo CTAs, no glass.
- [ ] **Step 3:** MobileDrawer React island (`client:idle`): menu button, drawer, accordion submenus, focus trap, Escape close, `aria-expanded`.
- [ ] **Step 4:** Footer: brand, nav columns, legal links, locale switch placeholder.
- [ ] **Step 5:** Wire into MarketingLayout.
- [ ] **Step 6: Verify + commit** `bun run check`; `feat: site header, footer, mobile navigation`

---

### Task 1.3: Homepage

**Files:**
- Create: `src/pages/index.astro`
- Create: `src/data/solutions.ts`, `src/data/faqs.ts`
- Create: `src/components/sections/{Hero,LogoStrip,ProblemSection,SolutionEcosystem,ResumeShowcase,WorkflowSteps,ProductTabs,Outcomes,Customisation,Security,SuccessStory,ResourcesTeaser,Faq,FinalCta}.astro`
- Create: `src/components/interactive/ProductTabs.tsx` (tabs island)

- [ ] **Step 1: solutions.ts + faqs.ts** — 8 solutions (category colour, icon, description, capabilities) and the 10 FAQ items from spec §9.15. Mark hero demo numbers with a `demo: true` note / visible "Illustrative data" label.
- [ ] **Step 2:** Build each section per spec §9.1–9.16 using primitives. Hero visual is a CSS/HTML dashboard composition (no images required), labelled illustrative.
- [ ] **Step 3:** ProductTabs as a small React island (`client:visible`) with accessible tab semantics (roving tabindex, `aria-selected`).
- [ ] **Step 4:** FAQ uses accessible accordion (native `<details>` acceptable). Emit FAQPage JSON-LD.
- [ ] **Step 5:** Assemble `index.astro`, single H1 in Hero, correct heading order.
- [ ] **Step 6: Verify + commit** `bun run check`; `feat: homepage sections`

---

### Task 1.4: Solutions, resources, content collections, legal, error pages

**Files:**
- Create: `src/content.config.ts`, `src/content/**` (2–3 sample entries each type)
- Create: `src/pages/solutions/index.astro` + one detail page pattern `src/pages/solutions/[slug].astro`
- Create: `src/pages/resources/{index,blog,guides,updates}.astro`, `src/pages/resources/[...slug].astro`
- Create: `src/pages/{about,privacy,terms}.astro`, `src/pages/404.astro`, `src/pages/500.astro`
- Create: `src/pages/rss.xml.ts`, `public/robots.txt`
- Test: `tests/content/schema.test.ts`

- [ ] **Step 1: Write failing test** for the resource schema in `content.config.ts` (validate a good object passes, a draft/missing-field object behaves correctly).
```ts
import { test, expect } from "bun:test";
import { resourceSchema } from "@/content.config";
test("valid resource parses", () => {
  expect(() => resourceSchema.parse({
    title: "t", description: "d", publishedAt: "2026-01-01",
    type: "blog", cover: "/x.png", author: "a",
  })).not.toThrow();
});
```
- [ ] **Step 2: Run — fails.**
- [ ] **Step 3:** Implement `content.config.ts` with the Zod `resourceSchema` from spec §43; export the schema for testing. Define collections. Draft filtering in queries: `import.meta.env.PROD` excludes `draft:true`.
- [ ] **Step 4: Run — passes.**
- [ ] **Step 5:** Build solutions index + `[slug]` detail (data-driven from `solutions.ts`), resources listing + entry pages via ContentLayout, legal pages, 404/500, RSS, robots.txt. Breadcrumbs + BreadcrumbList JSON-LD.
- [ ] **Step 6: Verify + commit** `bun run check` + `bun test`; `feat: solutions, resources, content collections, legal + error pages`

---

## Phase 2 — Persistence, auth, request-demo

### Task 2.1: SQLite client + migrations

**Files:**
- Create: `src/lib/db/client.ts`, `src/lib/db/migrate.ts`
- Test: `tests/lib/db.test.ts`

- [ ] **Step 1: Write failing test**
```ts
import { test, expect } from "bun:test";
import { createDb } from "@lib/db/client";
import { migrate } from "@lib/db/migrate";
test("migrate creates users table", () => {
  const db = createDb(":memory:");
  migrate(db);
  const row = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  expect(row).toBeTruthy();
});
```
- [ ] **Step 2: Run — fails.**
- [ ] **Step 3: Implement.** `createDb(path)` returns a `bun:sqlite` `Database`, sets `PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;`. `migrate(db)` creates all six tables from spec §4 (idempotent `CREATE TABLE IF NOT EXISTS`). App-level singleton reads `DATABASE_URL`.
- [ ] **Step 4: Run — passes.**
- [ ] **Step 5: Commit** `feat: sqlite client and schema migrations`

---

### Task 2.2: Validation primitives + password + session

**Files:**
- Create: `src/lib/validation/primitives.ts`, `src/lib/auth/password.ts`, `src/lib/auth/session.ts`
- Test: `tests/lib/auth.test.ts`, `tests/lib/validation.test.ts`

- [ ] **Step 1: Failing tests**
```ts
// tests/lib/auth.test.ts
import { test, expect } from "bun:test";
import { hashPassword, verifyPassword } from "@lib/auth/password";
import { newSessionToken, hashToken } from "@lib/auth/session";
test("password round trip", async () => {
  const h = await hashPassword("s3cret!");
  expect(await verifyPassword("s3cret!", h)).toBe(true);
  expect(await verifyPassword("wrong", h)).toBe(false);
});
test("session token is high entropy and hash is stable", () => {
  const t = newSessionToken();
  expect(t.length).toBeGreaterThanOrEqual(43);
  expect(hashToken(t)).toBe(hashToken(t));
  expect(hashToken(t)).not.toBe(t);
});
```
```ts
// tests/lib/validation.test.ts
import { test, expect } from "bun:test";
import { httpUrl } from "@lib/validation/primitives";
test("rejects javascript: urls", () => {
  expect(httpUrl.safeParse("javascript:alert(1)").success).toBe(false);
  expect(httpUrl.safeParse("https://ok.com").success).toBe(true);
});
```
- [ ] **Step 2: Run — fails.**
- [ ] **Step 3: Implement.**
  - `password.ts`: `Bun.password.hash`/`verify` (argon2id default).
  - `session.ts`: `newSessionToken()` = 32 random bytes base64url; `hashToken` = SHA-256 hex via `Bun.CryptoHasher`.
  - `primitives.ts`: `httpUrl` Zod refine to `http:`/`https:` only; `boundedText(max)`, `email`.
- [ ] **Step 4: Run — passes.**
- [ ] **Step 5: Commit** `feat: auth crypto and validation primitives`

---

### Task 2.3: Auth service + middleware + pages

**Files:**
- Create: `src/lib/auth/service.ts`, `src/lib/auth/middleware.ts`, `src/middleware.ts`
- Create: `src/lib/rate-limit/index.ts`
- Create: `src/pages/register.astro`, `src/pages/login.astro`, `src/pages/logout.ts`
- Create: `src/actions/index.ts` (register/login actions)
- Test: `tests/lib/rate-limit.test.ts`, `tests/integration/auth.test.ts`

- [ ] **Step 1: Failing tests**
```ts
// tests/lib/rate-limit.test.ts
import { test, expect } from "bun:test";
import { createDb } from "@lib/db/client";
import { migrate } from "@lib/db/migrate";
import { rateLimit } from "@lib/rate-limit";
test("blocks after N in window", () => {
  const db = createDb(":memory:"); migrate(db);
  const key = "login:1.2.3.4";
  for (let i = 0; i < 5; i++) expect(rateLimit(db, key, 5, 60).allowed).toBe(true);
  expect(rateLimit(db, key, 5, 60).allowed).toBe(false);
});
```
```ts
// tests/integration/auth.test.ts
import { test, expect } from "bun:test";
import { createDb } from "@lib/db/client";
import { migrate } from "@lib/db/migrate";
import { AuthService } from "@lib/auth/service";
test("register then login issues a session; wrong password fails", async () => {
  const db = createDb(":memory:"); migrate(db);
  const auth = new AuthService(db);
  const user = await auth.register("a@b.com", "s3cret!");
  const sess = await auth.login("a@b.com", "s3cret!");
  expect(sess.userId).toBe(user.id);
  await expect(auth.login("a@b.com", "nope")).rejects.toThrow();
});
```
- [ ] **Step 2: Run — fails.**
- [ ] **Step 3: Implement.**
  - `rate-limit`: fixed-window counter in `rate_limits` table.
  - `AuthService`: `register` (unique email, hash, insert), `login` (verify, create session row storing token hash + expiry, return token), `validateSession(token)`, `logout(token)`. Rotate session on login.
  - `middleware.ts` helper + `src/middleware.ts`: read cookie, populate `Astro.locals.user`; guard `/app/**` (redirect to `/login`).
  - Register/login pages: native forms posting to actions; states idle/invalid/submitting/success/error. Set `HttpOnly; SameSite=Lax; Secure(prod)` cookie. `logout.ts` clears cookie + revokes.
- [ ] **Step 4: Run — passes.**
- [ ] **Step 5: Commit** `feat: local auth (register, login, logout, sessions, guard)`

---

### Task 2.4: Request-demo

**Files:**
- Create: `src/pages/request-demo.astro`, action in `src/actions/index.ts`
- Create: `src/lib/services/demo-service.ts`
- Test: `tests/integration/demo.test.ts`

- [ ] **Step 1: Failing test** — valid payload persists a `demo_requests` row with status `received`; invalid payload rejected by Zod; honeypot filled → silently dropped (no row / status `spam`).
- [ ] **Step 2: Run — fails.**
- [ ] **Step 3: Implement.** Zod schema (fields from spec §41), honeypot field, rate limit, `DemoService.submit` inserts row; if `DEMO_WEBHOOK_URL` set, POST (signed) and record result; on failure store status `error` (never fake success). Two-column page (benefits | form), full state machine.
- [ ] **Step 4: Run — passes.**
- [ ] **Step 5: Commit** `feat: request-demo form with real persistence`

---

## Phase 3 — Resume data model & services

### Task 3.1: Resume schemas + types

**Files:**
- Create: `src/modules/resume/schemas/index.ts`, `src/modules/resume/types/index.ts`
- Test: `tests/resume/schema.test.ts`

- [ ] **Step 1: Failing tests** — a minimal valid `ResumeDocument` parses; bad email rejected; bad link URL rejected; over-length summary rejected; `sectionOrder`/`hiddenSections` defaults applied.
- [ ] **Step 2: Run — fails.**
- [ ] **Step 3: Implement** Zod schemas for `PersonalInformation`, `WorkExperience`, `Education`, `Project`, `SkillGroup`, `ResumeTemplateSettings`, `ResumeScore`, `ResumeDocument` (spec §4/§39). Use `httpUrl`, bounded text. Export inferred TS types from `types/index.ts` (`z.infer`). Deferred arrays declared optional.
- [ ] **Step 4: Run — passes.**
- [ ] **Step 5: Commit** `feat: resume Zod schemas and types`

---

### Task 3.2: Repository interface + SQLite impl + service

**Files:**
- Create: `src/modules/resume/repository/interface.ts`, `repository/sqlite.ts`
- Create: `src/modules/resume/services/resume-service.ts`
- Create: `src/lib/utils/slug.ts`
- Test: `tests/resume/repository.test.ts`, `tests/integration/resume-crud.test.ts`

- [ ] **Step 1: Failing tests**
```ts
// tests/integration/resume-crud.test.ts (essentials)
import { test, expect } from "bun:test";
import { createDb } from "@lib/db/client";
import { migrate } from "@lib/db/migrate";
import { SqliteResumeRepository } from "@modules/resume/repository/sqlite";
test("create, find, list scoped to owner", async () => {
  const db = createDb(":memory:"); migrate(db);
  const repo = new SqliteResumeRepository(db);
  const r = await repo.create({ userId: "u1", title: "CV", language: "en", templateId: "essential" });
  expect((await repo.findById("u1", r.id))?.id).toBe(r.id);
  expect(await repo.findById("u2", r.id)).toBeNull();          // ownership
  expect((await repo.list("u1")).length).toBe(1);
});
test("update requires matching revision (optimistic lock)", async () => {
  const db = createDb(":memory:"); migrate(db);
  const repo = new SqliteResumeRepository(db);
  const r = await repo.create({ userId: "u1", title: "CV", language: "en", templateId: "essential" });
  const ok = await repo.update("u1", r.id, { revision: r.revision, patch: { title: "New" } });
  expect(ok.revision).toBe(r.revision + 1);
  await expect(repo.update("u1", r.id, { revision: r.revision, patch: { title: "Stale" } }))
    .rejects.toThrow(/conflict/i);                              // 409
});
test("softDelete hides from list", async () => {
  const db = createDb(":memory:"); migrate(db);
  const repo = new SqliteResumeRepository(db);
  const r = await repo.create({ userId: "u1", title: "CV", language: "en", templateId: "essential" });
  await repo.softDelete("u1", r.id);
  expect(await repo.list("u1")).toHaveLength(0);
});
```
- [ ] **Step 2: Run — fails.**
- [ ] **Step 3: Implement.**
  - `interface.ts`: `ResumeRepository` per spec §40 (+ `update` takes `{ revision, patch }`).
  - `sqlite.ts`: JSON-in-column storage; `create` seeds default `sectionOrder`; `update` runs `UPDATE ... SET data=?, revision=revision+1 WHERE id=? AND user_id=? AND revision=?`; 0 rows changed → throw `ConflictError`; also writes a bounded `resume_revisions` snapshot inside a transaction; `duplicate` clones with new id + reset revision; `softDelete` sets `deleted_at`; all reads filter `deleted_at IS NULL` and `user_id`.
  - `resume-service.ts`: validates patches with Zod before persisting; recomputes `status`.
- [ ] **Step 4: Run — passes.**
- [ ] **Step 5: Commit** `feat: resume repository (sqlite) with ownership + optimistic locking`

---

## Phase 4 — Scoring & matcher (pure logic, no AI)

### Task 4.1: ATS scoring engine

**Files:**
- Create: `src/modules/resume/scoring/rules.ts`, `scoring/engine.ts`
- Create: `src/modules/resume/utils/empty.ts`
- Test: `tests/resume/scoring.test.ts`

- [ ] **Step 1: Failing tests** — empty resume scores low with `critical` completeness issues; a well-filled resume scores higher; each category returns `{score,severity,message}`; weighted overall in 0–100; deterministic (same input → same score).
- [ ] **Step 2: Run — fails.**
- [ ] **Step 3: Implement.** `ResumeScoreRule` + `ResumeRuleResult` interfaces (spec §31). Rules for Completeness, Readability, Impact (action verbs, passive voice), Formatting, Keywords, Section Structure. `engine.ts` runs rules, aggregates weighted overall, returns categories + issues + disclaimer text.
- [ ] **Step 4: Run — passes.**
- [ ] **Step 5: Commit** `feat: rule-based ATS scoring engine`

---

### Task 4.2: Keyword normalization + job matcher

**Files:**
- Create: `src/modules/resume/matcher/normalize.ts`, `matcher/matcher.ts`
- Test: `tests/resume/matcher.test.ts`

- [ ] **Step 1: Failing tests**
```ts
import { test, expect } from "bun:test";
import { normalizeTerm } from "@modules/resume/matcher/normalize";
import { matchJob } from "@modules/resume/matcher/matcher";
test("normalizes synonyms", () => {
  expect(normalizeTerm("JS")).toBe(normalizeTerm("JavaScript"));
  expect(normalizeTerm("UI")).toBe(normalizeTerm("User Interface"));
});
test("does not conflate distinct skills", () => {
  expect(normalizeTerm("Java")).not.toBe(normalizeTerm("JavaScript"));
});
test("reports matched and missing keywords", () => {
  const res = matchJob({ skills: ["JavaScript", "SEO"] } as any, "Looking for JS and QA");
  expect(res.matched).toContain("javascript");
  expect(res.missing).toContain("qa");
});
```
- [ ] **Step 2: Run — fails.**
- [ ] **Step 3: Implement.** `normalize.ts`: lowercase, trim, synonym map (JS/UI/SEO/QA…) — explicit map, no fuzzy conflation. `matcher.ts`: extract JD keywords, compare to resume terms, output overall match %, matched, missing, relevant experience hints, gaps, sections to improve.
- [ ] **Step 4: Run — passes.**
- [ ] **Step 5: Commit** `feat: job-description matcher with safe term normalization`

---

## Phase 5 — Resume editor (React island)

### Task 5.1: Editor store — state, undo/redo, autosave, conflict

**Files:**
- Create: `src/modules/resume/components/store.ts`, `src/lib/utils/history.ts`
- Test: `tests/resume/history.test.ts`, `tests/resume/autosave.test.ts`

- [ ] **Step 1: Failing tests**
```ts
// history: undo/redo
import { test, expect } from "bun:test";
import { History } from "@lib/utils/history";
test("undo/redo restores states", () => {
  const h = new History({ n: 0 });
  h.push({ n: 1 }); h.push({ n: 2 });
  expect(h.undo()).toEqual({ n: 1 });
  expect(h.undo()).toEqual({ n: 0 });
  expect(h.redo()).toEqual({ n: 1 });
});
```
```ts
// autosave: stale response must not overwrite newer local state
import { test, expect } from "bun:test";
import { reconcileSave } from "@modules/resume/components/store";
test("ignores out-of-order server response", () => {
  // local at revision 5; a response confirming revision 3 arrives late
  const next = reconcileSave({ localRevision: 5, ackRevision: 3, status: "saving" });
  expect(next.applied).toBe(false);
});
test("conflict marks state", () => {
  const next = reconcileSave({ localRevision: 5, conflict: true, status: "saving" });
  expect(next.status).toBe("conflict");
});
```
- [ ] **Step 2: Run — fails.**
- [ ] **Step 3: Implement.** `history.ts`: bounded undo/redo stack. `store.ts`: React state (zustand-free, `useReducer` or a tiny store), debounced (750ms) autosave dispatcher, `reconcileSave` pure helper (drops stale acks by revision, sets `conflict`), save-state machine (`Saving…/Saved/Offline changes/Save failed/Conflict`).
- [ ] **Step 4: Run — passes.**
- [ ] **Step 5: Commit** `feat: editor store with undo/redo and conflict-safe autosave`

---

### Task 5.2: Autosave endpoint + editor sections + reorder

**Files:**
- Create: `src/pages/api/resume/[id]/autosave.ts` (or Astro action) — server autosave with revision check
- Create: `src/modules/resume/components/ResumeEditor.tsx`, `sections/*.tsx`
- Create: `src/modules/resume/utils/reorder.ts`
- Test: `tests/resume/reorder.test.ts`

- [ ] **Step 1: Failing test** for `reorder.ts` (`moveUp/moveDown/moveToTop/moveToBottom` on an array by index, bounds-safe).
- [ ] **Step 2: Run — fails.**
- [ ] **Step 3: Implement** reorder utils; then build editor sections (Personal Info, Summary, Work, Education, Projects, Skills) as controlled forms bound to the store, each item with keyboard reorder buttons + add/duplicate/delete; section nav with status (Empty/Incomplete/Complete). Autosave endpoint: auth + ownership + Zod + `repo.update` with revision; returns new revision or `409`.
- [ ] **Step 4: Run — passes.**
- [ ] **Step 5:** Manual: type in a field → autosave fires once after 750ms → status `Saved`.
- [ ] **Step 6: Commit** `feat: resume editor sections with keyboard reorder + autosave endpoint`

---

### Task 5.3: Live preview + page-break helper

**Files:**
- Create: `src/modules/resume/components/Preview.tsx`, `src/modules/resume/utils/page-break.ts`
- Create: `src/styles/print.css`
- Test: `tests/resume/page-break.test.ts`

- [ ] **Step 1: Failing test** for `estimatePages(contentHeightMm)` / overflow-warning helper (A4 = 297mm usable; returns page count + overflow flag).
- [ ] **Step 2: Run — fails.**
- [ ] **Step 3: Implement** helper; `Preview.tsx` renders the selected template with live store data at `210mm` width, zoom + fit-width/fit-page controls, page-number + overflow warning, memoized to avoid editor lag. `print.css` hides editor chrome, sets A4 page size.
- [ ] **Step 4: Run — passes.**
- [ ] **Step 5: Commit** `feat: A4 live preview with page-break warnings + print stylesheet`

---

## Phase 6 — Templates & export

### Task 6.1: Six templates + registry

**Files:**
- Create: `src/modules/resume/templates/registry.ts` + six template components (`Essential, Modern, Executive, Graduate, Technical, Academic`)
- Test: `tests/resume/templates.test.ts`

- [ ] **Step 1: Failing test** — registry exposes 6 templates with unique ids, valid `ResumeTemplate` metadata, and a resolver `getTemplate(id)` that falls back safely.
- [ ] **Step 2: Run — fails.**
- [ ] **Step 3: Implement** registry + six components sharing one data model. Differences span typography/spacing/headings/dividers/layout (single vs two-column), not just colour. All: selectable text, A4, logical DOM order, no skill charts, both locales, safe with long content.
- [ ] **Step 4: Run — passes.**
- [ ] **Step 5: Commit** `feat: six original resume templates + registry`

---

### Task 6.2: Template customisation + print-to-PDF export

**Files:**
- Create: `src/modules/resume/components/TemplatePanel.tsx`
- Create: `src/lib/utils/filename.ts`
- Create: `src/pages/app/resume/[id]/export.astro` (print-optimized page)
- Test: `tests/lib/filename.test.ts`

- [ ] **Step 1: Failing test**
```ts
import { test, expect } from "bun:test";
import { safeResumeFilename } from "@lib/utils/filename";
test("builds safe filename", () => {
  expect(safeResumeFilename("Muhammad Fatih", "Frontend Developer CV"))
    .toBe("Muhammad-Fatih-Frontend-Developer-CV.pdf");
  expect(safeResumeFilename("../../etc", "x")).not.toContain("/");
});
```
- [ ] **Step 2: Run — fails.**
- [ ] **Step 3: Implement** `filename.ts` (strip unsafe chars, collapse to hyphens). TemplatePanel with safe bounds (min font/margin/contrast/line-height) + `Reset template settings`. Export page renders template only + triggers `window.print()`; document title set for PDF metadata; hyperlinks preserved.
- [ ] **Step 4: Run — passes.**
- [ ] **Step 5:** Manual: export page → browser Save-as-PDF → text selectable, A4, no editor UI.
- [ ] **Step 6: Commit** `feat: template customisation + print-to-PDF export`

---

## Phase 7 — App shell, dashboard, resume CRUD pages

### Task 7.1: App shell + dashboard + resume dashboard + create wizard

**Files:**
- Create: `src/pages/app/dashboard.astro`, `src/pages/app/resume/index.astro`, `src/pages/app/resume/new.astro`, `src/pages/app/resume/[id]/edit.astro`
- Create: `src/components/layout/AppSidebar.astro`
- Create: resume CRUD actions in `src/actions/index.ts`
- Test: `tests/integration/resume-actions.test.ts`

- [ ] **Step 1: Failing test** — create/duplicate/delete actions enforce auth + ownership (unauthenticated → rejected; other user's id → rejected).
- [ ] **Step 2: Run — fails.**
- [ ] **Step 3: Implement** AppLayout sidebar (role-based nav; student role for MVP), dashboard cards (profile completion, resume score, quick actions — illustrative where data absent), resume list with card actions (Edit/Preview/Duplicate/Rename/Score/Match/Download/Delete), delete confirmation dialog, empty state, create wizard (language → starting point → template → name → edit; upload = `Coming soon` via feature flag). `[id]/edit.astro` mounts `<ResumeEditor client:load />`.
- [ ] **Step 4: Run — passes.**
- [ ] **Step 5: Commit** `feat: app shell, dashboard, resume dashboard, create wizard`

---

## Phase 8 — AI assistance (server-only)

### Task 8.1: AI client + response validation + fallback

**Files:**
- Create: `src/lib/ai/client.ts`, `src/lib/ai/prompts.ts`
- Create: `src/modules/resume/services/ai-service.ts`
- Test: `tests/lib/ai.test.ts`

- [ ] **Step 1: Failing tests** — response parser accepts valid structured JSON and rejects malformed/hallucinated shapes; when no `AI_API_KEY`, service returns a deterministic non-AI fallback (never throws to the editor); request builder includes only selected field text (not whole resume).
```ts
import { test, expect } from "bun:test";
import { parseSuggestion } from "@lib/ai/client";
test("rejects malformed suggestion", () => {
  expect(parseSuggestion('{"nope":true}').ok).toBe(false);
  expect(parseSuggestion('{"suggestion":"Improved text","changes":["x"]}').ok).toBe(true);
});
```
- [ ] **Step 2: Run — fails.**
- [ ] **Step 3: Implement.** `client.ts`: `fetch` to `${AI_BASE_URL}/chat/completions`, model `AI_MODEL` (`gaskeun`), `Authorization: Bearer ${AI_API_KEY}`, timeout + abort, Zod-validated JSON parse (`parseSuggestion`). `prompts.ts`: system prompt forbidding invented facts/metrics/titles/skills, preserve meaning/tense, structured JSON, flag uncertainty, no protected-attribute inference. `ai-service.ts`: `improveBullet/improveSummary/suggestSkills/analyseJobMatch`; falls back to rule-based helpers when disabled; rate-limited; never logs content.
- [ ] **Step 4: Run — passes.**
- [ ] **Step 5: Commit** `feat: server-only AI service with validation and non-AI fallback`

---

### Task 8.2: AI panel + consent + endpoints

**Files:**
- Create: `src/modules/resume/components/AiPanel.tsx`, `ScorePanel.tsx`, `MatchPanel.tsx`
- Create: `src/pages/api/resume/ai/*.ts` (server endpoints)
- Create: consent action + `users.ai_consent_at`
- Test: `tests/integration/ai-endpoint.test.ts`

- [ ] **Step 1: Failing test** — AI endpoint requires auth + prior consent (no consent → `403`); with fallback active, returns a suggestion object; endpoint never returns the API key or echoes secrets.
- [ ] **Step 2: Run — fails.**
- [ ] **Step 3: Implement.** Consent dialog (spec §34 text) gating first AI use; endpoints validate auth/consent/ownership + Zod, call `ai-service`, return structured suggestion. `AiPanel` shows original↔suggestion comparison (screen-reader readable), Apply/Reject (never auto-apply). `ScorePanel` renders engine output with `ScoreRing` + severity (not colour-only). `MatchPanel` runs the matcher; tailored copy creates a NEW resume via `duplicate` (master untouched).
- [ ] **Step 4: Run — passes.**
- [ ] **Step 5: Commit** `feat: AI panel with consent, ATS score panel, job-match panel`

---

## Phase 9 — i18n, SEO polish, responsive, a11y, docs

### Task 9.1: i18n + SEO structured data + sitemap/robots

**Files:**
- Create: `src/i18n/{en.ts,id.ts,index.ts}`
- Modify: page heads to emit full JSON-LD + canonical + OG/Twitter
- Test: `tests/i18n/fallback.test.ts`

- [ ] **Step 1: Failing test** — `t(key, locale)` returns the string, falls back to `en` for missing `id` keys, and returns the key itself if absent everywhere.
- [ ] **Step 2: Run — fails.**
- [ ] **Step 3: Implement** i18n dictionaries + `t()` with fallback; UI locale separate from CV locale; CV date formatting via `dates.ts` follows CV locale. Add JSON-LD per page type, canonical, OG/Twitter, favicon; shared social-image fallback. Public shared/preview CV pages emit `noindex,nofollow` (share is deferred, but ensure any preview route is noindex).
- [ ] **Step 4: Run — passes.**
- [ ] **Step 5: Commit** `feat: i18n with fallback + SEO structured data`

---

### Task 9.2: Responsive + accessibility pass

**Files:** touch marketing + app + editor styles.

- [ ] **Step 1:** Audit at 320/360/390/430/768/1024/1280/1440/1920: no horizontal overflow (no `overflow-x:hidden` masking), editor collapses to Edit/Preview/Score segmented control, sidebar → drawer, tabs scrollable, CTAs ≥44×44.
- [ ] **Step 2:** A11y: one H1/page, heading order, skip link, focus-visible, form labels + `aria-describedby`, modal focus trap + Escape, live-region autosave/score status, reduced motion, contrast check.
- [ ] **Step 3:** Fix issues found.
- [ ] **Step 4: Commit** `fix: responsive + accessibility pass`

---

### Task 9.3: README + architecture docs + assumptions

**Files:**
- Create: `README.md`, `docs/ARCHITECTURE.md`, `docs/ASSUMPTIONS.md`, `docs/REMAINING-INTEGRATIONS.md`

- [ ] **Step 1:** README with the exact commands (`bun install/dev/check/test/build/preview`), env vars, brand replacement, adding solutions/templates, connecting a production backend.
- [ ] **Step 2:** ARCHITECTURE: Astro islands, resume module, ATS scoring, AI integration, DB adapter, content management.
- [ ] **Step 3:** ASSUMPTIONS + REMAINING-INTEGRATIONS (production DB, auth provider, AI provider, email, CRM, analytics, file storage, employer portal, deferred features).
- [ ] **Step 4: Commit** `docs: README, architecture, assumptions, remaining integrations`

---

## Phase 10 — Verification

### Task 10.1: Full verification gate

- [ ] **Step 1:** `bun install` → succeeds.
- [ ] **Step 2:** `bun run check` → 0 TypeScript/Astro errors.
- [ ] **Step 3:** `bun test` → all pass (no dummy always-pass tests).
- [ ] **Step 4:** `bun run build` → succeeds.
- [ ] **Step 5:** `bun run preview` + manual smoke: register → login → create CV → fill → preview updates → score → fix → score changes → export PDF → logout; verify `/app/**` guard and cross-user resume access is denied.
- [ ] **Step 6:** Record real command output in the final report. Do not claim success for any step not actually run.
- [ ] **Step 7: Commit** `chore: verification gate green`

---

## Notes for the implementer

- DRY/YAGNI/TDD, commit per task.
- Never expose `AI_API_KEY` or any non-`PUBLIC_` secret to the client.
- Never log resume content, passwords, tokens, or keys.
- All resume queries key on `user_id + resume_id`; internal id is not authorization.
- Autosave: debounce, revision-checked, stale responses ignored, conflicts surfaced.
- No fake submits, no mockup-only buttons, no invented user/institution data.
```

