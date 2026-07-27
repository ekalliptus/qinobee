import type { SqlDb } from "@lib/db/adapter";
import { demoSchema } from "./demo-schema";

export interface SubmitResult {
  ok: boolean;
  error?: string;
}

/**
 * Webhook config. Injected so the service is portable to Cloudflare Workers,
 * where env is request-scoped (`locals.runtime.env`) and NOT on `process.env`.
 * Defaults to `process.env` for backward-compat under the node/bun adapter.
 */
export interface DemoEnv {
  DEMO_WEBHOOK_URL?: string;
  DEMO_WEBHOOK_SECRET?: string;
}

/** Web Crypto HMAC-SHA256 (hex) — runs on Workers, unlike node:crypto createHmac. */
async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class DemoService {
  private env: DemoEnv;

  constructor(
    private db: SqlDb,
    env: DemoEnv = process.env as DemoEnv,
  ) {
    this.env = env;
  }

  async submit(raw: unknown): Promise<SubmitResult> {
    // Honeypot: bots fill the hidden company_website field. Silently accept,
    // store as 'spam' for audit, never 'received'. Do not log payload contents.
    const honey = (raw as { company_website?: unknown })?.company_website;
    if (typeof honey === "string" && honey.trim() !== "") {
      await this.insert(JSON.stringify({ honeypot: true }), "spam", null);
      return { ok: true };
    }

    const parsed = demoSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "validation" };

    const id = await this.insert(JSON.stringify(parsed.data), "received", null);

    // Optional webhook: best-effort, signed. On failure mark row 'error'
    // (metadata only) but the row still persists. Never fake success.
    const url = this.env.DEMO_WEBHOOK_URL;
    if (url) {
      try {
        await this.notify(url, JSON.stringify(parsed.data));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "webhook failed";
        await this.db
          .prepare("UPDATE demo_requests SET status = 'error', error = ? WHERE id = ?")
          .bind(msg.slice(0, 200), id)
          .run();
      }
    }

    return { ok: true };
  }

  private async notify(url: string, body: string): Promise<void> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    const secret = this.env.DEMO_WEBHOOK_SECRET;
    if (secret) {
      headers["x-signature"] = "sha256=" + (await hmacSha256Hex(secret, body));
    }
    const res = await fetch(url, { method: "POST", headers, body });
    if (!res.ok) throw new Error(`webhook ${res.status}`);
  }

  private async insert(payload: string, status: string, error: string | null): Promise<string> {
    const id = crypto.randomUUID();
    await this.db
      .prepare(
        "INSERT INTO demo_requests (id, payload, status, error, created_at) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(id, payload, status, error, new Date().toISOString())
      .run();
    return id;
  }
}
