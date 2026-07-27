import { env } from "cloudflare:workers";
import type { SqlDb } from "./adapter";
import { d1Adapter } from "./d1-adapter";

// This adapter version (@astrojs/cloudflare v14) removed `locals.runtime.env`
// (it now throws); the request-scoped bindings live on the `cloudflare:workers`
// `env` proxy, which workerd resolves per-request via async context. There is
// NO module-global DB and NO process.env in the request path. Tests never touch
// this module — they build a bun:sqlite `SqlDb` via `createSqliteAdapter`.
//
// `locals` is accepted to keep call sites request-scoped and future-proof even
// though env is sourced from `cloudflare:workers` in this adapter version.

/** Request-scoped application database (D1) from the CF runtime binding. */
export function getSqlDb(_locals?: App.Locals): SqlDb {
  return d1Adapter(env.DB);
}

/** Request-scoped, typed environment (bindings + vars) from the CF runtime. */
export function getEnv(_locals?: App.Locals): Env {
  return env;
}
