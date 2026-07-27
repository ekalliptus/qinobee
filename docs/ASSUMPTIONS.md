# Assumptions

Design and scope assumptions baked into this MVP (from the spec §11 and verified against the code).
These are deliberate simplifications for an MVP, not oversights.

- **AI provider is OpenAI-compatible.** The client calls `${AI_BASE_URL}/chat/completions` with a
  `Bearer` token and `response_format: json_object`. Default `AI_BASE_URL` is
  `https://router.ekalliptus.com/v1` and default model `AI_MODEL` is `gaskeun`. Any OpenAI-compatible
  endpoint/model can be substituted via env.
- **AI is optional and non-authoritative.** With no `AI_API_KEY`, the app is fully functional via
  deterministic fallbacks. AI never fabricates skills, never overrides the matcher, and never
  auto-applies changes. Skills suggestion and job-match are deterministic in this MVP by design.
- **Brand defaults to "Qinobee"** and is a placeholder. All brand strings come from
  `src/config/site.ts`; copy is illustrative.
- **Export is print-to-PDF.** The initial export path is the browser's "Save as PDF" via a
  print-styled page. No server-side/Chromium PDF rendering.
- **Demo/marketing data is illustrative** and labeled as such (solutions, FAQs, success stories,
  logo strip). Institution names, testimonials, and outcome figures are **placeholders only** — not
  real customers or verified results.
- **Local-first SQLite persistence with a Bun runtime.** Data lives in a single SQLite file
  (`DATABASE_URL`); `bun:sqlite` and `Bun.password` require Bun. Suitable for local/single-node use;
  production scale-out assumes swapping the persistence layer.
- **Single role in the MVP: student.** Every signed-in user is treated as a student. There is no
  employer/mentor/admin role or portal; the `role` concept is implicit. App nav shows future
  surfaces as disabled "Soon" items rather than dead links.
- **Sessions are 7-day, cookie-based.** `qb_session`, `SameSite=Lax`, token stored only as a
  SHA-256 hash. No OAuth/SSO; email + password only.
- **UI locale is separate from CV language.** `en`/`id` UI dictionaries exist with an `en` fallback;
  full URL-prefixed locale routing is prepared for but not shipped. CV `language` drives template
  date/number formatting independently.
- **ATS score is guidance, not a guarantee.** Rule-based, deterministic, with a disclaimer attached
  to every score.
- **Content drafts are dev-only.** Resource entries with `draft: true` are hidden in production
  builds.
- **`AUTH_SECRET` must be provided** for real deployments; the sample `.env.example` ships empty.
- **OG image is currently SVG** (`public/og-default.svg`). Some social platforms prefer/require PNG
  for link previews; a rasterized PNG card is not yet provided.
- **Feature flags gate deferred work** (`src/config/features.ts`): `publicShare`, `coverLetter`,
  `versionHistoryUi`, `resumeUpload` are all `false`; `aiAssist` is `true`.
