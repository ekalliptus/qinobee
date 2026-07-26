# Qinobee — Vertical MVP Design

Date: 2026-07-26
Status: Approved (design), pending spec review

Educational student-success and career platform inspired by the Kinobi concept, fully
redesigned with an original visual identity. This spec covers the first implementation
cycle: a **Vertical MVP** built with Astro (form-first) + Bun + SQLite.

Not a pixel clone. No Kinobi logos, brand, illustrations, screenshots, templates,
copywriting, testimonials, institution names, numeric claims, or proprietary assets.

---

## 1. Scope

### In scope (Vertical MVP)

- Public marketing website: homepage, solutions overview, resources, request-demo.
- Real local auth: register, login, logout, secure session cookie, ownership checks.
- Student dashboard.
- Resume CRUD: create, edit, rename, duplicate, delete (soft delete).
- Resume editor core sections: personal information, professional summary, work
  experience, education, projects, skills.
- Live A4 preview, debounced autosave, undo/redo, template selection.
- Six original resume templates.
- Rule-based ATS scoring and job-description matcher (function without AI).
- Server-side AI assistance via OpenAI-compatible endpoint
  `https://router.ekalliptus.com/v1/chat/completions`, model `gaskeun`.
- Print-to-PDF export (A4, selectable text, hyperlinks) as the initial export path.
- Content Collections for resources.
- SEO basics, accessibility, responsive layout.
- README, `.env.example`, architecture docs, assumptions, remaining-integrations list.

### Explicitly deferred

- Public resume sharing (`/resume/shared/:token`).
- Cover Letter Builder.
- Full version-history UI (internal revision snapshots kept for restore only).
- Pointer drag-and-drop (keyboard reorder ships instead).
- Server-side Chromium PDF rendering.
- OAuth / SSO.
- Production PostgreSQL / Supabase.
- Employer, mentor, admin, leadership, and other advanced platform workflows.
- Advanced platform pages beyond the marketing set above.

---

## 2. Technology

- Astro (latest stable), SSR with a Bun-compatible adapter.
- TypeScript strict mode.
- Bun: package manager, script runner, test runner, dev runtime.
- Tailwind CSS (Astro-compatible) plus CSS design tokens.
- React only for interactive islands (the resume editor).
- Zod for schema validation everywhere data crosses a boundary.
- Lucide icons.
- Astro Content Collections.
- `bun:sqlite` for persistence.
- `Bun.password` for hashing.

Not used: Next.js, Nuxt, Remix, jQuery, a full React SPA, whole-page client rendering,
large UI/animation libraries without cause, browser-exposed API keys.

Bun lockfile only. No `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`.

---

## 3. Architecture

```text
Browser
├── Astro pages: marketing, auth, dashboard, resume CRUD
└── React ResumeEditor island (only hydrated island)
        │
Astro SSR actions/routes
├── Auth service
├── Resume service
├── ATS scorer
├── Job matcher
├── AI adapter (server-only)
└── Demo-request service
        │
SQLite repositories
├── users
├── sessions
├── resumes
├── resume_revisions
├── demo_requests
└── rate_limits
```

### Module boundaries

- `src/pages/` — routing and HTTP boundary only.
- `src/actions/` — Zod validation, auth checks, service calls.
- `src/modules/auth/` — password hashing, sessions, cookies, ownership.
- `src/modules/resume/` — schema, repository, editor, preview, scoring, matcher, templates.
- `src/lib/ai/` — OpenAI-compatible client; API key server-only.
- `src/components/` — UI primitives and marketing sections.
- `src/config/` — brand, navigation, feature flags (centralised).
- `src/content/` — resources via Content Collections.

### Directory layout (target)

```text
src/
├── actions/
├── assets/
├── components/{common,forms,interactive,layout,sections,ui}
├── config/{navigation.ts,site.ts,features.ts}
├── content/{blog,case-studies,guides,updates}
├── data/{solutions.ts,faqs.ts,testimonials.ts}
├── i18n/{en.ts,id.ts,index.ts}
├── layouts/{BaseLayout,MarketingLayout,AppLayout,ContentLayout}.astro
├── lib/{ai,auth,db,seo,services,utils,validation}
├── modules/resume/{components,schemas,services,stores,types,scoring,templates,utils}
├── pages/
├── styles/{global.css,tokens.css,typography.css,utilities.css}
└── content.config.ts
```

Path aliases: `@/*`, `@components/*`, `@lib/*`, `@data/*`, `@modules/*`.

### Rendering strategy (form-first)

- Marketing is almost entirely HTML/CSS.
- Auth, CRUD, wizard, and request-demo use native HTML forms with progressive
  enhancement; they work without hydration.
- Only `ResumeEditor` is hydrated (`client:load` or `client:visible`).
- The A4 preview reuses the same DOM the print stylesheet renders.
- The six templates share one data model; they are style variants, not six editors.
- No PDF or chart library in the marketing/homepage bundle.

---

## 4. Data model & persistence

Resume stored as validated JSON plus indexed columns.

```ts
interface ResumeDocument {
  id: string;
  userId: string;
  title: string;
  language: "id" | "en";
  templateId: string;
  status: "draft" | "complete" | "archived";
  personalInformation: PersonalInformation;
  professionalSummary?: string;
  workExperiences: WorkExperience[];
  educations: Education[];
  projects: Project[];
  skillGroups: SkillGroup[];
  sectionOrder: ResumeSectionReference[];
  hiddenSections: string[];
  templateSettings: ResumeTemplateSettings;
  latestScore?: ResumeScore;
  revision: number;
  createdAt: string;
  updatedAt: string;
}
```

Note: MVP editor covers personal info, summary, experience, education, projects,
skills. The type may declare deferred arrays (organisations, certifications, etc.)
as optional for forward compatibility, but they are not edited in this cycle.

### Tables

- `users(id, email UNIQUE, password_hash, created_at, ai_consent_at)`
- `sessions(id, user_id, token_hash, expires_at, created_at)`
- `resumes(id, user_id, title, status, template_id, language, revision, data JSON,
  deleted_at, created_at, updated_at)`
- `resume_revisions(id, resume_id, revision, data JSON, reason, created_at)`
- `demo_requests(id, payload JSON, status, error, created_at)`
- `rate_limits(key, window_start, count)`

SQLite configured with WAL, `foreign_keys = ON`, transactions for multi-row writes.

### Concurrency

- Updates carry `revision`; persistence uses `WHERE revision = ?`.
- Stale revision → `409 Conflict`; local changes are not overwritten.
- Editor autosave debounces 750 ms; stale (out-of-order) responses are ignored.
- Revision snapshots are bounded and used for internal restore only (no history UI).

### Repository abstraction

`ResumeRepository` interface with `list / findById / create / update / duplicate /
softDelete`. A SQLite implementation ships; the interface keeps Supabase / PostgreSQL /
REST swappable later. Interface, SQLite repo, and service layer are separate files.

---

## 5. UX & design system

### Visual language

- Modern neo-brutalism: ~2px near-black borders, hard shadows (no blur), paper
  background, block layout, high contrast, physical-feeling buttons.
- No glassmorphism, no generic soft shadows, no excessive gradients.
- Colour system: yellow = primary CTA, blue = career, green = internship,
  pink = mentoring, purple = student life, orange = analytics, red = destructive,
  paper = background, ink = borders/text.
- Typography: `Space Grotesk` headings, `Inter` body, `IBM Plex Mono` accent;
  self-hosted; PDF/print-safe; no large layout shift.
- Tokens in `src/styles/tokens.css`; button hover/active offset behaviour per spec;
  reduced-motion fallback.

### Brand

Centralised in `src/config/site.ts`. Implementation default name: **Qinobee**.
Nothing hardcodes the brand per page. Easily replaceable.

### Design-system components (as needed by MVP)

Button, IconButton, Badge, StatusBadge, SectionLabel, NeoCard, FeatureCard,
MetricCard, Tabs, Accordion, Modal/Dialog, Drawer, Input, Textarea, Select,
Checkbox, FormField, Alert, Toast, Skeleton, EmptyState, Container, Section,
Pagination, Breadcrumb, ScoreRing. Button variants: primary, secondary, dark,
ghost, danger, success; sizes sm/md/lg. Every interactive control: focus-visible,
disabled, loading, accessible name for icon-only, ≥44×44 touch target.

### Primary flow

```text
Landing → Register/Login → Dashboard
→ Resume List → Create Wizard
→ Editor → ATS Score / Job Match → Print PDF
```

### Editor layout

Desktop:

```text
Topbar: Back | Name | Save state | Undo/Redo | Template | Score | Export
Section nav (260–280) | Form editor (flex) | A4 live preview (420–520)
```

Mobile: topbar + segmented Edit | Preview | Score + sticky bottom actions.
No horizontal overflow at any breakpoint.

- Autosave fires ~750 ms after last change.
- Save states: `Saving…`, `Saved`, `Offline changes`, `Save failed`, `Conflict`.
- Reorder via Move up / Move down / Move to top / Move to bottom (keyboard-first).
  Pointer drag-and-drop deferred.
- Preview: zoom, fit-width, page number, overflow/section-split warning.
- Clear empty, loading, validation, and destructive-confirmation states.

### AI interaction

```text
Select field text → Consent (first use) → Generate
→ Show original/suggestion comparison → Apply or Reject
```

- Only the selected field(s) are sent — never the whole resume for one bullet.
- Structured JSON response, validated with Zod.
- Prompt forbids inventing facts, metrics, titles, companies, skills, or results;
  must preserve meaning and tense; flag uncertainty; never infer protected attributes.
- Provider errors never block manual editing.
- Suggestions are never auto-applied.

### Internationalisation

- English and Bahasa Indonesia. `src/i18n/{en,id}.ts` + index.
- UI language separate from CV language. CV dates follow the CV locale.
- URL structure prepared for `/en/...` and `/id/...`.

### Accessibility (WCAG 2.2 AA target)

Semantic HTML, one H1, correct heading order, skip link, full keyboard nav,
strong focus-visible, labelled fields with `aria-describedby`, accessible modal
(Escape, focus trap), accessible tabs/accordion, live-region autosave + ATS status,
contrast, ≥44×44 targets, reduced motion, score not conveyed by colour alone,
AI comparison readable by screen readers.

---

## 6. Security & error handling

### Auth

- Passwords hashed with `Bun.password`.
- Session token: 256-bit random; DB stores only the hash.
- Cookie: `HttpOnly`, `SameSite=Lax`, `Secure` in production.
- Sessions expire, rotate on login, revoke on logout.
- Every resume query keys on `user_id + resume_id`. Internal ID is never authorization.
- Rate limits on login, register, demo-request, and AI.

### Validation & input safety

- Zod on forms, actions, autosave, import, DB JSON reads, and AI responses.
- Length limits on every field.
- URLs accept only `http:` / `https:`.
- Resume output rendered as text — no raw HTML injection.
- CSRF via origin check + `SameSite` cookies.
- Logs contain metadata only; never resume content, passwords, tokens, or API keys.

### AI

- `AI_API_KEY` server-only; endpoint from env config; no `PUBLIC_` prefix on secrets.
- Requests send only relevant fields.
- Per-user consent stored before first use.
- Timeout, abort, rate limit, and request-size caps applied.
- Invalid responses rejected; original text preserved.

### Conflicts & failures

- Autosave sends `revision`; stale revision → `409`.
- Editor keeps local changes and offers reload-or-save-copy on conflict.
- SQLite multi-row writes run in transactions.
- Request-demo failures persist a real error status — never a fake success.
- AI/network outages never block editor, scoring, matcher, or export.
- Error pages leak no stack traces.

### `.env.example`

```env
PUBLIC_SITE_URL=http://localhost:4321
DATABASE_URL=./data/qinobee.sqlite
AUTH_SECRET=
AI_API_KEY=
AI_BASE_URL=https://router.ekalliptus.com/v1
AI_MODEL=gaskeun
DEMO_WEBHOOK_URL=
DEMO_WEBHOOK_SECRET=
PUBLIC_ANALYTICS_ID=
```

---

## 7. ATS scoring & job matcher

- Score 0–100 across categories: Content Quality, Impact, Completeness, Readability,
  Formatting, Keywords, Section Structure, Job Relevance.
- Modular rules; each returns `{ passed, score, severity, message, sectionId? }`.
  Severity: critical / important / suggestion / passed.
- Rules cover completeness, readability, impact (action verbs, passive voice),
  formatting (empty sections, date consistency, page break, readable links),
  keywords (coverage, no stuffing), and job relevance.
- Fully functional without AI.
- Disclaimer shown: guidance only, no hiring guarantee.

Job matcher panel `Match With a Job`: paste a job description → overall match,
matched skills, missing keywords, relevant experience, gaps, sections to improve.
Term normalisation (JavaScript↔JS, UI, SEO, QA) without conflating distinct skills.
A tailored copy creates a **new** resume; the master is never overwritten.

---

## 8. Templates & export

- Six original templates: Essential, Modern, Executive, Graduate, Technical, Academic.
- All ATS-conscious: selectable text, A4, readable, logical DOM order, no skill charts,
  not icon-dependent, support long content and both locales.
- Differences span typography, spacing, headings, dividers, metadata, layout,
  section style — not just colour.
- `ResumeTemplate` metadata interface with `layout` and `category`.
- Template customisation with safe bounds (min font, min margin, contrast, line
  height) and a `Reset template settings` action.

Export: print-to-PDF via A4 preview + print stylesheet + an export button that opens
the browser Save-as-PDF dialog. Selectable text, hyperlinks, no editor chrome, safe
filename (e.g. `Muhammad-Fatih-Frontend-Developer-CV.pdf`). Server-side PDF deferred.

---

## 9. Testing & definition of done

### Unit (Bun test)

Zod schemas + field limits, password/session/token helpers, resume ownership,
revision-conflict logic, ATS scoring + weights, keyword normalisation, AI response
parsing, URL + filename sanitisation, template settings, locale fallback.

### Integration

Register/login/logout; resume create/update/duplicate/delete; autosave success and
conflict; unauthorized resume access rejected; ATS score changes after a fix; matcher
produces matched/missing keywords; AI suggestion requires consent + approval;
request-demo persists for real.

### GUI / manual

Primary user flow, keyboard navigation, mobile editor, print-to-PDF, viewports
320–1920, no horizontal overflow, error/loading/empty states.

No dummy always-pass tests.

### Verification (run before any success claim)

```bash
bun install
bun run check
bun test
bun run build
```

### Definition of done (MVP)

- Marketing pages, auth, dashboard, and Resume Builder core all work.
- Data persists in SQLite; autosave is conflict-safe.
- Six visually distinct templates.
- ATS scoring, job matcher, AI (`gaskeun`), and print export work.
- WCAG-oriented, responsive, SEO basics, Content Collections.
- README, `.env.example`, architecture, assumptions, deployment notes.
- Git initialised; design and implementation recorded.

---

## 10. Deployment

- Astro SSR standalone run by Bun; SQLite via a persistent volume.
- Target: Bun VPS/container. Validated locally first.

---

## 11. Assumptions

- `https://router.ekalliptus.com/v1` is OpenAI Chat Completions compatible, uses
  `Authorization: Bearer ${AI_API_KEY}`, and serves model `gaskeun`.
- Brand default is **Qinobee** (workspace name), fully replaceable via config.
- Print-to-PDF is acceptable as the initial export path.
- All hero/dashboard numbers are illustrative demo data, marked as such.
- Placeholder institutions only; no real logos, names, or claims.
```

