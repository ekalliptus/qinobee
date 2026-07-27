# Qinobee

Qinobee is a student-success and AI-assisted resume builder MVP. It pairs a marketing site for an
integrated student career-development platform with a working app: users register, sign in, and
build ATS-friendly resumes with rule-based scoring, keyword/job-description matching, six print-ready
templates, and optional AI writing assistance. It is built on Astro SSR + Bun + SQLite, TypeScript
(strict), Tailwind v4, React 19 islands, and Zod v4.

> **Brand is a placeholder.** "Qinobee" and its copy are a replaceable default. Edit
> [`src/config/site.ts`](src/config/site.ts) to rebrand (name, description, email, locales, app URL).

## Prerequisites

- **[Bun](https://bun.sh) >= 1.3** (developed against 1.3.14). Bun is the package manager, script
  runner, and test runner.
- **Bun is required at runtime.** The database layer uses `bun:sqlite`, `Bun.password` (auth
  hashing), and `Bun.serve`-compatible behavior. A Node-only environment cannot run the DB/auth
  layer. (`package.json` lists a `node >= 22.12` engine hint, but the app must run on Bun or a
  Bun-compatible host/container.)

## Quickstart

```bash
bun install
cp .env.example .env   # fill AUTH_SECRET; AI_API_KEY optional (AI falls back to rule-based when unset)
bun run dev
bun run check
bun test
bun run build
bun run preview
```

- `bun run dev` — Astro dev server at http://localhost:4321
- `bun run check` — `astro check` (TypeScript + Astro diagnostics)
- `bun test` — Bun test runner (tests colocated under `tests/`)
- `bun run build` — `astro check && astro build` (Node standalone server output in `dist/`)
- `bun run preview` — serve the production build locally
- `bun run format` / `bun run format:check` — Prettier

The SQLite database file is created automatically on first run at `DATABASE_URL`
(default `./data/qinobee.sqlite`); tables are migrated at startup. WAL mode and foreign keys are
enabled.

## Environment variables

Copy `.env.example` to `.env`. **Only variables prefixed `PUBLIC_` are exposed to the browser.**
Everything else is server-only and must never be shipped to the client. In particular, **`AI_API_KEY`
must never be exposed to the browser** — all AI calls happen server-side.

| Variable              | Purpose                                                              | Required?                                             |
| --------------------- | -------------------------------------------------------------------- | ----------------------------------------------------- |
| `PUBLIC_SITE_URL`     | Canonical site origin; used for SEO/canonicals/sitemap.              | Optional (defaults to localhost)                      |
| `DATABASE_URL`        | SQLite file path (`:memory:` supported).                             | Optional (default `./data/qinobee.sqlite`)            |
| `AUTH_SECRET`         | Secret for auth/session security. **Set a strong value.**            | Required for real use                                 |
| `AI_API_KEY`          | Bearer token for the OpenAI-compatible AI provider. **Server-only.** | Optional (unset ⇒ rule-based fallback)                |
| `AI_BASE_URL`         | AI provider base URL.                                                 | Optional (default `https://router.ekalliptus.com/v1`) |
| `AI_MODEL`            | AI model name.                                                        | Optional (default `gaskeun`)                          |
| `DEMO_WEBHOOK_URL`    | Webhook target for "Request a demo" submissions.                     | Optional                                              |
| `DEMO_WEBHOOK_SECRET` | Shared secret to sign demo webhook calls. **Server-only.**           | Optional                                              |
| `PUBLIC_ANALYTICS_ID` | Analytics identifier (client-exposed by design).                     | Optional                                              |

## How AI works

- **Server-only, OpenAI-compatible.** The AI client (`src/lib/ai/client.ts`) POSTs to
  `${AI_BASE_URL}/chat/completions` with a Bearer `AI_API_KEY`, model `AI_MODEL` (default `gaskeun`),
  `response_format: json_object`. It never logs messages or the key.
- **Deterministic fallback when unset.** When `AI_API_KEY` is empty, the app is fully functional and
  uses rule-based, non-fabricating fallbacks (whitespace/casing normalization, action-verb hints,
  length guidance). AI failures/garbage responses also fall back rather than throw.
- **Consent-gated and never auto-applied.** AI endpoints require recorded user consent
  (`users.ai_consent_at`); suggestions are returned to the editor for the user to review and apply
  manually. Skills suggestion and job-match analysis are intentionally deterministic in this MVP
  (the AI never fabricates skills or overrides the matcher).

## Features

**Built**

- Marketing site: home, features, solutions (index + `/solutions/[slug]`), success stories, about,
  resources (blog/guides/updates + detail), request-demo, privacy/terms, 404/500, RSS, sitemap,
  robots.
- Auth: register / login / logout, SQLite-backed sessions, `Bun.password` hashing, `qb_session`
  cookie, middleware guarding `/app`.
- Resume module: Zod schemas, repository (interface + SQLite) with ownership checks, optimistic
  locking, revision snapshots and soft delete; rule-based ATS scoring; job-description matcher; six
  React templates; a single hydrated editor island with undo/redo, conflict-safe autosave, live
  preview, and AI/Score/Match panels.
- Print-to-PDF export page (browser "Save as PDF").
- i18n dictionaries (en/id) with fallback; SEO meta + JSON-LD helpers.

**Deferred / not built** — see [docs/REMAINING-INTEGRATIONS.md](docs/REMAINING-INTEGRATIONS.md).
Notable: public resume sharing, cover-letter builder, full version-history UI, pointer
drag-and-drop (keyboard reorder ships), server-side Chromium PDF, OAuth/SSO, production
Postgres/Supabase, employer/mentor/admin workflows, and most `/app` sub-pages beyond dashboard +
resume (shown as "Soon").

Feature flags live in [`src/config/features.ts`](src/config/features.ts).
Architecture details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## How-to

- **Rebrand.** Edit [`src/config/site.ts`](src/config/site.ts) (name, short name, description,
  email, locales). SEO helpers and layouts read from it.
- **Add a solution.** Add an entry to [`src/data/solutions.ts`](src/data/solutions.ts); it renders
  through the `/solutions/[slug]` dynamic route (and appears in nav via `src/config/navigation.ts`).
- **Add a resume template.** Add a `*.tsx` component under
  [`src/modules/resume/templates/`](src/modules/resume/templates/) and register it in
  [`registry.ts`](src/modules/resume/templates/registry.ts) with id, name, layout, category, and
  photo support. Add a thumbnail SVG under `public/templates/`.
- **Add resource content.** Add a Markdown file under
  [`src/content/resources/`](src/content/resources/) (`blog/`, `guides/`, `case-studies/`,
  `updates/`) matching the schema in `src/content/resource-schema.ts`. Drafts (`draft: true`) are
  hidden in production builds.
- **Connect a production backend.** Implement the `ResumeRepository` interface
  ([`src/modules/resume/repository/interface.ts`](src/modules/resume/repository/interface.ts)) for
  Postgres/Supabase and swap the SQLite implementation. Migrate auth storage similarly (users,
  sessions, consent, rate limits currently live in SQLite via `src/lib/db/`).

## Deployment

- Build with Bun: `bun run build` produces an Astro **Node standalone** server in `dist/` (adapter
  `@astrojs/node`, `mode: standalone`).
- **Run the built server with Bun** (or a Bun-compatible host/container) because `bun:sqlite` and
  `Bun.password` are runtime dependencies.
- Point `DATABASE_URL` at a SQLite file on a **persistent volume**; the schema migrates on startup.
- Set `AUTH_SECRET` and `PUBLIC_SITE_URL`; set `AI_API_KEY` only if you want live AI.
- **Serverless is not supported as-is** with the SQLite adapter (no persistent local filesystem /
  Bun runtime guarantee). For serverless/edge, first swap the persistence layer (see above) and use
  a hosted database.
- Validate locally with `bun run build && bun run preview` before deploying.

## Testing

Run `bun test`. Tests are colocated under `tests/` (unit + integration, using `:memory:` SQLite).
`bun run check` runs the type/Astro diagnostics used in CI-style verification. At time of writing
`bun test` reports 105 passing tests, but re-run it to confirm for your checkout.

## License

No license file is present yet — **add a license** before distributing.
