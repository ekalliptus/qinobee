import type { Database } from "bun:sqlite";
import { randomUUID, createHmac } from "node:crypto";
import { demoSchema } from "./demo-schema";

export interface SubmitResult {
  ok: boolean;
  error?: string;
}

export class DemoService {
  constructor(private db: Database) {}

  async submit(raw: unknown): Promise<SubmitResult> {
    // Honeypot: bots fill the hidden company_website field. Silently accept,
    // store as 'spam' for audit, never 'received'. Do not log payload contents.
    const honey = (raw as { company_website?: unknown })?.company_website;
    if (typeof honey === "string" && honey.trim() !== "") {
      this.insert(JSON.stringify({ honeypot: true }), "spam", null);
      return { ok: true };
    }

    const parsed = demoSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "validation" };

    const id = this.insert(JSON.stringify(parsed.data), "received", null);

    // Optional webhook: best-effort, signed. On failure mark row 'error'
    // (metadata only) but the row still persists. Never fake success.
    const url = process.env.DEMO_WEBHOOK_URL;
    if (url) {
      try {
        await this.notify(url, JSON.stringify(parsed.data));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "webhook failed";
        this.db
          .query("UPDATE demo_requests SET status = 'error', error = ? WHERE id = ?")
          .run(msg.slice(0, 200), id);
      }
    }

    return { ok: true };
  }

  private async notify(url: string, body: string): Promise<void> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    const secret = process.env.DEMO_WEBHOOK_SECRET;
    if (secret) {
      headers["x-signature"] = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
    }
    const res = await fetch(url, { method: "POST", headers, body });
    if (!res.ok) throw new Error(`webhook ${res.status}`);
  }

  private insert(payload: string, status: string, error: string | null): string {
    const id = randomUUID();
    this.db
      .query(
        "INSERT INTO demo_requests (id, payload, status, error, created_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(id, payload, status, error, new Date().toISOString());
    return id;
  }
}
