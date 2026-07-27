# Remaining integrations

What a team must still wire before this MVP is production-ready. Each item is **deferred / not
built** in the current codebase.

## Infrastructure & data

- **Production database.** Implement the `ResumeRepository` interface
  (`src/modules/resume/repository/interface.ts`) for Postgres/Supabase and swap the SQLite
  implementation. Migrate auth storage (users, sessions, consent, rate limits — currently in SQLite
  via `src/lib/db/`) to the same backend. Required to leave single-node/local-first behind and to
  enable serverless/edge hosting (the SQLite adapter is not serverless-compatible as-is).
- **File storage.** Photo and CV upload are **URL-only** today (`features.resumeUpload = false`).
  Wire object storage (S3/GCS/Supabase Storage) for uploads and hosted assets.
- **PNG OG image.** Replace/augment `public/og-default.svg` with a rasterized PNG (and optionally
  per-page OG generation) for reliable social previews.

## Auth & identity

- **Authentication provider / OAuth / SSO.** Only email + password is implemented. Add OAuth/SSO
  (Google/Microsoft/SAML) and, if needed, email verification and password reset.

## AI

- **AI provider key + operations.** Provide a real `AI_API_KEY` and configure `AI_BASE_URL`/
  `AI_MODEL`. Add production **rate limits, quotas, cost monitoring, and observability**; consider
  enabling AI-backed skills/match (currently deterministic by design).

## Messaging & analytics

- **Email service.** Demo-request notifications currently target an optional webhook
  (`DEMO_WEBHOOK_URL`). Wire a transactional email provider for notifications, verification, and
  password reset.
- **CRM / analytics.** `PUBLIC_ANALYTICS_ID` is a placeholder; integrate an analytics tool and, if
  desired, pipe demo requests / signups into a CRM.

## Product surfaces (feature-flagged / stubbed)

- **Public resume sharing** (`features.publicShare = false`).
- **Cover-letter builder** (`features.coverLetter = false`).
- **Full version-history UI** (`features.versionHistoryUi = false`) — snapshots are already written
  to `resume_revisions`, but there is no browse/restore UI.
- **Server-side PDF** (one-click download) — only print-to-PDF ships today.
- **Pointer drag-and-drop reordering** — keyboard reorder ships; add pointer/drag DnD.
- **Employer / mentor / admin portals** — no roles or workflows beyond the single student surface.
- **Remaining `/app` sub-pages** shown as "Soon": cover letters, career profile, and the broader
  solution surfaces implied by marketing (jobs, applications, internships, mentoring, events,
  scholarships, exchange, notifications, settings, help). Only **dashboard** and the **resume** flow
  are built.

See `src/config/features.ts` for the current flags and `docs/ASSUMPTIONS.md` for scope context.
