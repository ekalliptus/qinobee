# Cloudflare Workers + D1 Migration Plan

> **For agentic workers:** Execute task-by-task with fresh subagents (subagent-driven-development). Steps use checkbox syntax.

**Goal:** Migrate the Qinobee MVP from `@astrojs/node` + `bun:sqlite` + `Bun.password` to `@astrojs/cloudflare` + Cloudflare **D1** + **Web Crypto**, and deploy to the user's Cloudflare account (ekalliptus, account `f24eb3f70bf59379632e280f8756b9e4`) as a Worker.

**Strategy:** Introduce an async `SqlDb` adapter (the app already has a `ResumeRepository` seam). D1 implements `SqlDb` at runtime (from `locals.runtime.env.DB`); a `bun:sqlite`-backed `SqlDb` implements it for fast in-process tests. All crypto moves to Web Crypto (`crypto.subtle` / `crypto.getRandomValues`), which runs on both Bun and Workers — removing `Bun.password` and `node:crypto`/`node:fs`.

**Non-negotiables preserved:** ownership checks (user_id + id), optimistic locking (`WHERE revision=?`), soft delete, Zod validation, consent-gated AI, no secret leak, enumeration-safe 404s.

---

## Constraints / facts

- D1 API is async: `db.prepare(sql).bind(...).first()/all()/run()`; atomic multi-statement via `db.batch([...])`. No interactive transactions.
- D1 binding is request-scoped: available as `Astro.locals.runtime.env.DB` (via `@astrojs/cloudflare`), NOT a module global. So `getDb()` singleton must become `getDb(locals)` / db passed from context.
- `@astrojs/cloudflare` dev uses a workerd-based runtime (Vite) with D1-local (miniflare) — so `astro dev` will use D1-local, not bun:sqlite.
- Tests cannot easily spin D1 → tests use the `bun:sqlite` `SqlDb` adapter constructed in-test and passed directly to services/repos. App code never imports bun:sqlite.
- `bun:sqlite` is synchronous; the adapter wraps it behind the same async `SqlDb` interface so service/repo code is written once (async) for both.
- Pure-logic tests (scoring, matcher, history, reconcile, page-break, filename, slug, i18n, schema, ai-parse, button) do NOT touch the DB and must stay green untouched.

---

## Task M1: `SqlDb` adapter + bun:sqlite impl + canonical schema + async migrate

**Files:**
- Create `src/lib/db/adapter.ts` — the interface.
- Create `src/lib/db/sqlite-adapter.ts` — bun:sqlite implementation (tests/local-fast).
- Create `src/lib/db/schema.sql` — canonical DDL (single source of truth).
- Rewrite `src/lib/db/migrate.ts` — `migrate(db: SqlDb): Promise<void>` that execs schema.sql statements.
- Keep `src/lib/db/client.ts` temporarily exporting a test helper `createSqliteTestDb(path=":memory:"): SqlDb` (used by tests). Remove `node:fs`/`mkdirSync` and the old sync `getDb` in a later task.
- Update `tests/lib/db.test.ts` to the async adapter.

**Interface:**
```ts
export interface SqlStatement {
  bind(...args: unknown[]): SqlStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<T[]>;
  run(): Promise<{ changes: number }>;
}
export interface SqlDb {
  prepare(sql: string): SqlStatement;
  batch(stmts: SqlStatement[]): Promise<void>; // atomic
  exec(sql: string): Promise<void>;            // DDL / multi-statement
}
```
D1's `D1Database` already matches this shape closely (so the D1 adapter in M6 is nearly a passthrough). The bun:sqlite adapter wraps sync calls in `async`. `batch` on bun:sqlite runs the statements inside a `db.transaction(() => ...)()`.

- [ ] Write async `tests/lib/db.test.ts` (migrate creates 6 tables, idempotent, foreign_keys on). Run → adjust → pass.
- [ ] Implement adapter + sqlite-adapter + schema.sql (the 6 tables + indexes from the current `migrate.ts`) + async `migrate`.
- [ ] `bun test tests/lib/db.test.ts` green; `bun run check` 0 errors.
- [ ] Commit `feat(db): async SqlDb adapter + bun:sqlite impl + canonical schema`.

---

## Task M2: Web Crypto password + session (remove Bun.password / node:crypto)

**Files:** rewrite `src/lib/auth/password.ts`, `src/lib/auth/session.ts`; update `tests/lib/auth.test.ts` (hashToken now async).

- `password.ts`: PBKDF2 via `crypto.subtle` — `hashPassword(plain)`: random 16-byte salt (`crypto.getRandomValues`), PBKDF2-HMAC-SHA256, ≥100k iterations, derive 32 bytes; encode `pbkdf2$<iter>$<saltB64url>$<hashB64url>`. `verifyPassword(plain, stored)`: parse, recompute, constant-time compare. Async (already is).
- `session.ts`: `newSessionToken()` = 32 bytes `crypto.getRandomValues` → base64url. `hashToken(token): Promise<string>` = `crypto.subtle.digest("SHA-256", ...)` → hex (now ASYNC). Keep `sessionExpiry`/`SESSION_TTL_MS`.
- These APIs run on Bun (tests) AND Workers.

- [ ] Update auth tests for `await hashToken(...)`. Run → fail → implement → pass.
- [ ] `bun test tests/lib/auth.test.ts` + `tests/lib/validation.test.ts` green; check 0 errors.
- [ ] Commit `feat(auth): Web Crypto PBKDF2 password + async session hashing`.

---

## Task M3: auth service + consent + rate-limit over async SqlDb

**Files:** rewrite `src/lib/auth/service.ts`, `src/lib/auth/consent.ts`, `src/lib/rate-limit/index.ts` to take `SqlDb` and use async queries (`await stmt.first()/run()`). `getSessionUser` and `validateSession` become async (hashToken is async). Update `tests/integration/auth.test.ts`, `tests/lib/consent.test.ts`, `tests/lib/rate-limit.test.ts` to construct the sqlite `SqlDb` and `await`.

- Preserve: enumeration-safe login (same error, dummy verify), session rotation, expiry check, rate-limit fixed-window (use `INSERT ... ON CONFLICT ... RETURNING count` — D1 supports RETURNING; the sqlite adapter must too).
- [ ] Update the 3 tests (async). Run → fail → implement → pass.
- [ ] Full `bun test` green; check 0 errors.
- [ ] Commit `refactor(auth): async data access over SqlDb`.

---

## Task M4: resume repository over async SqlDb (+ batch snapshot)

**Files:** rewrite `src/modules/resume/repository/sqlite.ts` (rename allowed to `d1-repository.ts` or keep name but use `SqlDb`) to use the adapter; `resume-service.ts` factory takes a `SqlDb`. Update `tests/integration/resume-crud.test.ts`, `tests/resume/repository.test.ts`.

- Optimistic lock: `UPDATE ... revision=revision+1 WHERE id=? AND user_id=? AND revision=?`; read `run().changes`; 0 → `ConflictError`. Then insert the revision snapshot + prune (>20) — since D1 has no interactive txn, do: `await update` (the lock), check changes, then `await batch([insertSnapshot, prune])`. Reads filter `deleted_at IS NULL`; every query keyed on user_id+id.
- [ ] Update repo/crud tests (async adapter). Run → fail → implement → pass (ownership, conflict, duplicate, soft-delete, snapshot).
- [ ] Full `bun test` green; check 0 errors.
- [ ] Commit `refactor(resume): repository over async SqlDb with batch snapshot`.

---

## Task M5: demo-service over SqlDb + Web Crypto HMAC

**Files:** rewrite `src/lib/services/demo-service.ts` — take `SqlDb`; replace `node:crypto` HMAC with `crypto.subtle` HMAC-SHA256 (async) for the webhook signature; honeypot + consent + status logic unchanged. Update `tests/integration/demo.test.ts`.

- [ ] Update demo test (async). Run → fail → implement → pass (received / invalid / honeypot=spam).
- [ ] Full `bun test` green; check 0 errors.
- [ ] Commit `refactor(demo): SqlDb + Web Crypto HMAC webhook`.

---

## Task M6: Cloudflare adapter + D1 adapter + request-scoped db wiring

**Files:**
- `astro.config.mjs`: replace `@astrojs/node` with `@astrojs/cloudflare` (`bunx astro add cloudflare`), keep `output:"server"`. Remove node adapter dep.
- Create `src/lib/db/d1-adapter.ts`: wrap `D1Database` as `SqlDb` (passthrough; `batch` via `D1Database.batch`, `exec` via `D1Database.exec`).
- Create `src/lib/db/index.ts`: `getDb(locals: App.Locals): SqlDb` → returns the D1 adapter from `locals.runtime.env.DB`. (App code calls `getDb(Astro.locals)` / `getDb(context.locals)`.)
- `src/env.d.ts`: add Cloudflare runtime types — `type Runtime = import("@astrojs/cloudflare").Runtime<Env>` with `interface Env { DB: D1Database; AUTH_SECRET: string; AI_API_KEY?: string; AI_BASE_URL?: string; AI_MODEL?: string; DEMO_WEBHOOK_URL?: string; DEMO_WEBHOOK_SECRET?: string }`; extend `App.Locals` with `runtime: Runtime` and keep `user?`.
- `src/middleware.ts`: get `const db = getDb(context.locals)`; do session work with it (skip on prerendered). Keep `/app` guard.
- Update EVERY API route (`src/pages/api/**`) and every `/app` page that used `getDb()` to use `getDb(Astro.locals)` / `getDb(context.locals)` and `await` the now-async auth/consent/service calls. Read env via `locals.runtime.env` (NOT `process.env`) for AI/webhook/secrets — provide a small `getEnv(locals)` helper. `getAiService()` and demo webhook must read from `locals.runtime.env`.
- Delete the obsolete sync `getDb`/`createDb`/`node:fs` from `client.ts` (keep only the test helper, or move the test helper into `sqlite-adapter.ts` and delete `client.ts`).

- [ ] Wire everything; `bun run check` 0 errors; `bun run build` succeeds with the Cloudflare adapter.
- [ ] Full `bun test` green (tests use the sqlite `SqlDb` helper).
- [ ] Commit `feat(cf): cloudflare adapter + D1 adapter + request-scoped db`.

---

## Task M7: wrangler config, D1 provisioning, migrations

**Files:** `wrangler.jsonc` (or `.toml`), `migrations/0001_init.sql` (= schema.sql).

- `wrangler.jsonc`: `name="qinobee"`, `compatibility_date` (recent), `compatibility_flags=["nodejs_compat"]` (safety), `main` = the Cloudflare adapter's server entry (per `@astrojs/cloudflare` docs — usually `./dist/_worker.js/index.js` with `assets` binding to `./dist`), `[[d1_databases]]` binding `DB`, `database_name="qinobee"`, `database_id="<from create>"`, and `migrations_dir="migrations"`.
- Provision: `bunx wrangler d1 create qinobee` → capture `database_id` → put in wrangler config. Copy `schema.sql` → `migrations/0001_init.sql`. Apply local + remote: `bunx wrangler d1 migrations apply qinobee --local` and `--remote`.
- Confirm D1 write permission is present in the token; if not, report the exact scope needed.

- [ ] Provision D1, wire config + migrations, apply both. `bun run build` still green.
- [ ] Commit `chore(cf): wrangler config + D1 database + init migration`.

---

## Task M8: local smoke (wrangler dev / astro dev) + secrets + deploy

- Local: run `astro dev` (cloudflare adapter, D1-local). Smoke: register → login → create resume → autosave 200 → stale 409 → cross-user 404 → AI consent 403→200 fallback. (Same curl script used earlier.)
- Secrets (remote): `bunx wrangler secret put AUTH_SECRET` (and AI_API_KEY etc. if the user provides them). Non-secret vars (AI_BASE_URL, AI_MODEL, PUBLIC_SITE_URL) via `[vars]` in wrangler config.
- Build + deploy: `bun run build` then `bunx wrangler deploy` (or `astro build` which emits the worker; deploy per `@astrojs/cloudflare` docs).
- Remote smoke: hit the `*.workers.dev` URL — home 200, `/app` guard 302, register→login→create→autosave→conflict→ownership 404.

- [ ] Local smoke passes.
- [ ] Deploy; record the live URL; remote smoke passes (report real HTTP codes).
- [ ] Commit `chore(cf): deploy config + docs`; update README deployment section.

---

## Verification gate
`bun run check` 0 errors · `bun test` all green · `bun run build` (cloudflare) succeeds · local smoke · remote smoke. Do not claim deploy success without the live URL responding.

## Rollback / safety
- The `@astrojs/node` path remains in git history (tag/branch `pre-cf` before M6 if desired).
- No secrets committed; secrets set via `wrangler secret put`. D1 is the user's Cloudflare resource.
- Public repo already exists; this migration is additive commits on `main`.
```

