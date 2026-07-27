# Architecture

Qinobee is an Astro SSR application (`output: "server"`, `@astrojs/node` standalone adapter) that
runs on Bun. Marketing pages are mostly static/SSR; the app (`/app`) is authenticated and SSR; a
single hydrated React island powers the resume editor. Persistence is `bun:sqlite`.

## High-level flow

```
                         ┌───────────────────────────────────────────────┐
   Browser               │                Astro SSR (Bun)                 │
 ┌──────────┐            │                                                │
 │ Marketing│  request   │  middleware.ts  ── session guard for /app      │
 │  (static │──────────▶ │        │                                       │
 │  /SSR)   │            │        ▼                                       │
 └──────────┘            │  Pages (.astro)   API routes (/api/**)         │
 ┌──────────┐            │        │                 │                     │
 │  Editor  │  fetch     │        ▼                 ▼                     │
 │  island  │──────────▶ │   Services (resume-service, ai-service,        │
 │ (React)  │  JSON      │            demo-service, auth service)         │
 └──────────┘            │        │                 │                     │
      ▲  hydrate         │        ▼                 ▼                     │
      │  (client:*)      │   Domain: schemas(Zod) · scoring · matcher     │
      └──────────────────│        │                                       │
                         │        ▼                                       │
                         │   Repositories (ResumeRepository iface)        │
                         │        │                                       │
                         │        ▼                                       │
                         │   bun:sqlite (WAL, FKs)  ── data/qinobee.sqlite │
                         └───────────────────────────────────────────────┘
                                   ▲                     │
             AI (server-only) ─────┘  OpenAI-compatible  ▼
             ${AI_BASE_URL}/chat/completions          demo webhook (optional)
```

## Directory map (`src/`)

| Path                             | Responsibility                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------ |
| `config/`                        | `site.ts` (brand), `navigation.ts` (nav), `features.ts` (feature flags).       |
| `data/`                          | Static marketing data: `solutions.ts`, `faqs.ts`.                              |
| `layouts/`                       | `BaseLayout`, `MarketingLayout`, `ContentLayout`, `AppLayout`.                 |
| `components/layout/`             | Header, Footer, AnnouncementBar, AppSidebar; `MobileDrawer.tsx` (island).      |
| `components/sections/`           | Marketing page sections (Astro, static).                                       |
| `components/interactive/`        | `ProductTabs.tsx` (small React island).                                        |
| `components/ui/`                 | Design-system primitives (Button, Card, Badge, ScoreRing, …).                  |
| `components/app/`                | `ResumeCard.astro` and app-only presentational pieces.                         |
| `content/` + `content.config.ts` | Content Collections: `resources/` (blog/guides/case-studies/updates) + schema. |
| `i18n/`                          | `en.ts`/`id.ts` dictionaries, `index.ts` (`t()` + fallback chain).             |
| `lib/ai/`                        | Server-only OpenAI-compatible client, prompt builders, Zod response types.     |
| `lib/auth/`                      | Password hashing, sessions, cookies, middleware helpers, consent, service.     |
| `lib/db/`                        | `client.ts` (connection/pragmas/singleton), `migrate.ts` (schema).             |
| `lib/http/`                      | `form-action.ts` shared form/POST handling helper.                             |
| `lib/rate-limit/`                | Fixed-window rate limiter backed by the `rate_limits` table.                   |
| `lib/seo/`                       | `buildMeta` + JSON-LD builders (organization/website/article/breadcrumb).      |
| `lib/services/`                  | Demo request schema + service (webhook delivery).                              |
| `lib/utils/`                     | `history.ts` (undo/redo), `slug.ts`, `filename.ts`.                            |
| `lib/validation/`                | Zod primitives (email, bounded text, http url).                                |
| `modules/resume/`                | The resume domain (see below).                                                 |
| `pages/`                         | Astro routes: marketing, `/app/**`, `/api/**`, feeds/robots/sitemap.           |
| `middleware.ts`                  | Session resolution + `/app` guard.                                             |
| `styles/`                        | `tokens.css`, `global.css`, `typography.css`, `utilities.css`, `print.css`.    |

### `modules/resume/`

| Path            | Responsibility                                                                          |
| --------------- | --------------------------------------------------------------------------------------- |
| `schemas/`      | Zod schemas — the source of truth for resume shape and validation.                      |
| `types/`        | TypeScript types inferred from schemas.                                                  |
| `repository/`   | `interface.ts` (`ResumeRepository` seam), `sqlite.ts` (impl), `errors.ts`.              |
| `services/`     | `resume-service.ts`, `ai-service.ts`, `ai-endpoint.ts` (request handling glue).         |
| `scoring/`      | Rule-based ATS engine (`engine.ts`, `rules.ts`, `types.ts`).                            |
| `matcher/`      | Job-description matcher: `normalize.ts` (synonyms), `matcher.ts`, `types.ts`.           |
| `templates/`    | Six React templates + `registry.ts`, shared render helpers, formatting, settings.       |
| `components/`   | `ResumeEditor.tsx` island, `store.ts`, `save-reconcile.ts`, sections, panels, Preview.  |
| `utils/`        | `empty.ts` (content predicates), `page-break.ts`, `reorder.ts`.                         |

## Islands strategy

Astro renders everything to HTML on the server; only a few components hydrate on the client:

- **`ResumeEditor`** — the one substantial island. The template components, live `Preview`, and the
  AI/Score/Match panels are imported into this island's bundle and are **not** part of the marketing
  bundle.
- **`MobileDrawer`** and **`ProductTabs`** — small interactive islands.

All marketing sections and app chrome are static/SSR Astro components with zero client JS. This
keeps marketing pages light and confines the React/template code to the editor route.

## Resume module details

- **Schemas (Zod) are the source of truth**; TypeScript types are inferred from them. Validation
  happens at every trust boundary (API bodies, autosave payloads).
- **Repository.** `ResumeRepository` is an interface (`list`, `findById`, `create`, `update`,
  `duplicate`, `softDelete`); the SQLite implementation enforces **ownership** (queries key on
  `user_id` + `id`, so missing and unowned rows are indistinguishable — no enumeration) and
  **optimistic locking** via a monotonic `revision`: an update with a stale revision throws a
  conflict. Each successful update writes a **revision snapshot** into `resume_revisions`. Deletes
  are **soft** (`deleted_at`).
- **Editor store** (`store.ts`). A `useReducer` store wrapping a `History<ResumeDocument>`
  (undo/redo), with **debounced autosave** (default 750 ms). `save-reconcile.ts` implements a
  conflict-safe state machine (`reconcileSave`) tracking `localRevision` / `savedRevision` /
  `inFlightRevision` so overlapping saves and server conflicts are handled deterministically.
- **Sections.** Personal info, summary, work experience, education, projects, skills — each a small
  React component sharing field/list editors; reordering is keyboard-driven (`utils/reorder.ts`).
- **Preview.** Renders the selected template at A4 dimensions with a page-break estimate
  (`utils/page-break.ts`).
- **Templates + registry.** Six templates (`essential`, `modern`, `executive`, `graduate`,
  `technical`, `academic`) described with layout/category/photo-support metadata; `getTemplate`
  falls back to `essential` for unknown ids.

## ATS scoring

Rule-based and **deterministic** — works with no AI. `engine.ts` runs a set of `RULES`, buckets
issues into seven weighted categories (weights sum to 1.0):

| Category      | Weight |
| ------------- | ------ |
| completeness  | 0.22   |
| impact        | 0.18   |
| content       | 0.16   |
| keywords      | 0.14   |
| readability   | 0.12   |
| formatting    | 0.10   |
| structure     | 0.08   |

Each category averages its rule scores (0–100); the overall is the weighted sum. Issues carry a
severity (`critical` / `important` / `suggestion` / `passed`); `topIssues` surfaces the most severe.
Every score ships a **disclaimer**: guidance only, not a hiring guarantee.

## Job matcher

`normalize.ts` uses an **explicit synonym map** (e.g. `js`/`javascript` → `javascript`,
`ai` → `artificial intelligence`). Synonyms are deliberate — there is **no fuzzy conflation** (e.g.
`java` is intentionally absent so it never collapses into `javascript`). `matcher.ts` returns
matched vs. missing keywords against a pasted job description. "Tailoring" produces a **duplicate**
resume so the master document is never mutated.

## AI integration

- Server-only client (`lib/ai/client.ts`); OpenAI-compatible chat/completions with a Bearer key.
- Provider responses are tolerant-parsed (extract first JSON block) and **Zod-validated**; anything
  invalid falls back to deterministic output.
- **Non-AI fallback** everywhere: with no key, or on error/timeout/garbage, the service returns
  rule-based results rather than throwing.
- **Consent** is required (`users.ai_consent_at`, set via `/api/resume/ai/consent`); endpoints are
  **rate-limited**. The **key is never sent to the client** and messages/keys are never logged.
- In this MVP, `suggestSkills` and `analyseJobMatch` are intentionally deterministic (no
  fabrication / matcher is authoritative); only bullet/summary improvement calls the provider.

## Persistence / DB adapter

`bun:sqlite` via `lib/db/client.ts`: creates the file (unless `:memory:`), enables
`PRAGMA foreign_keys = ON` and `journal_mode = WAL`, and migrates once through a singleton. Tables
(`lib/db/migrate.ts`):

- `users` (id, email unique, password_hash, `ai_consent_at`, created_at)
- `sessions` (id, user_id FK, `token_hash` unique, expires_at, created_at)
- `resumes` (id, user_id FK, title, status, template_id, language, `revision`, data JSON,
  `deleted_at`, timestamps)
- `resume_revisions` (id, resume_id FK, revision, data JSON, reason, created_at)
- `demo_requests` (id, payload, status, error, created_at)
- `rate_limits` (key + window_start composite PK, count)

The `ResumeRepository` interface is the **seam** for swapping backends: implement it for
Postgres/Supabase and change the wiring; the rest of the app depends only on the interface.

## Auth

- Passwords hashed with **`Bun.password`** (`lib/auth/password.ts`).
- **Sessions**: a 32-byte random token (base64url) is set in the `qb_session` cookie; only its
  **SHA-256 hash** is stored (`sessions.token_hash`). TTL 7 days.
- **Cookie flags**: `httpOnly`, `sameSite: "lax"`, `secure` (in production), `path: "/"`, `maxAge`.
- **Middleware** resolves the session user and redirects unauthenticated `/app/**` requests to
  `/login?next=…`. The DB is only touched when a session cookie exists or an `/app` route is hit
  (keeps `bun:sqlite` out of the prerender graph).
- **Enumeration-safe**: login/register errors don't reveal whether an email exists; resume lookups
  return the same 404 for missing vs. unowned.
- **Open-redirect-safe**: `safeNext` only accepts local paths (rejects `//`, `\`, absolute URLs).

## Content management

Content Collections (`content.config.ts`) load Markdown from `src/content/resources/` (types:
`blog`, `guide`, `update`, `case-study`) validated by `resource-schema.ts`. `lib/content.ts` filters
`draft: true` entries out of **production** builds (visible in dev).

## SEO + i18n

- `lib/seo/index.ts`: `buildMeta` (title/brand suffix, description, canonical, OG image, robots) and
  JSON-LD builders (organization, website, article, breadcrumb). Personal/app routes render
  `noindex`.
- **Sitemap** (`astro.config.mjs`) excludes `/app`, `/api`, and shared-resume routes.
- **i18n** (`i18n/index.ts`): `en`/`id` dictionaries with a deterministic fallback chain
  (`locale → en → key`). The **UI locale is separate** from the CV `language` (which drives resume
  date/number formatting). Full URL-prefixed locale routing is prepared for but not shipped.

## Security summary

- **Ownership checks** on all resume access (user_id-scoped queries).
- **Zod validation** at every input boundary.
- **Rate limiting** on sensitive/AI endpoints (`lib/rate-limit/`).
- **No secret exposure**: only `PUBLIC_*` vars reach the client; `AI_API_KEY` is server-only.
- **No content logging**: the AI client never logs messages or keys.
- **Honeypot** field on the demo form to deter bots.
- **CSRF posture**: `SameSite=Lax` session cookies + same-origin form/API usage (no cross-site
  state-changing GETs).
