/// <reference types="astro/client" />

// Bindings + vars available on the Cloudflare runtime. `import { env } from
// "cloudflare:workers"` is typed against this. Declared locally (not via
// @cloudflare/workers-types global reference) so the worker global types do
// NOT clobber DOM `fetch`/`Response`/`Promise` used by app + React code.
type Env = {
  DB: import("./lib/db/d1-types").D1Database;
  AUTH_SECRET: string;
  AI_API_KEY?: string;
  AI_BASE_URL?: string;
  AI_MODEL?: string;
  DEMO_WEBHOOK_URL?: string;
  DEMO_WEBHOOK_SECRET?: string;
  PUBLIC_SITE_URL?: string;
  PUBLIC_ANALYTICS_ID?: string;
};

declare module "cloudflare:workers" {
  export const env: Env;
}

declare namespace App {
  interface Locals {
    user?: { id: string; email: string };
  }
}
