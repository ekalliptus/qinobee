import { test, expect } from "bun:test";
import { createSqliteAdapter } from "@lib/db/sqlite-adapter";
import { migrateDb } from "@lib/db/migrate";
import { DemoService } from "@lib/services/demo-service";

async function svc(env?: { DEMO_WEBHOOK_URL?: string; DEMO_WEBHOOK_SECRET?: string }) {
  const db = createSqliteAdapter(":memory:");
  await migrateDb(db);
  return { db, service: new DemoService(db, env) };
}

test("valid payload persists a demo_requests row with status received", async () => {
  const { db, service } = await svc({});
  const res = await service.submit({
    fullName: "Ada Lovelace",
    workEmail: "ada@uni.edu",
    institution: "Uni",
    jobTitle: "Director",
    country: "US",
    institutionSize: "1000-5000",
    solutions: ["Career Management"],
    challenge: "manual reporting",
    preferredContact: "email",
    consent: true,
  });
  expect(res.ok).toBe(true);
  const row = await db.prepare("SELECT status FROM demo_requests").first<{ status: string }>();
  expect(row?.status).toBe("received");
});

test("invalid payload rejected, no row", async () => {
  const { db, service } = await svc({});
  const res = await service.submit({ fullName: "", workEmail: "nope", consent: false } as any);
  expect(res.ok).toBe(false);
  const count = await db
    .prepare("SELECT COUNT(*) c FROM demo_requests")
    .first<{ c: number }>();
  expect(count?.c).toBe(0);
});

test("honeypot filled is dropped (ok true, but not persisted as received)", async () => {
  const { db, service } = await svc({});
  const res = await service.submit({
    fullName: "Bot",
    workEmail: "bot@spam.com",
    institution: "x",
    jobTitle: "x",
    country: "US",
    institutionSize: "1-100",
    solutions: ["Analytics"],
    challenge: "x",
    preferredContact: "email",
    consent: true,
    company_website: "http://spam", // honeypot field
  } as any);
  const rows = await db
    .prepare("SELECT status FROM demo_requests")
    .all<{ status: string }>();
  expect(rows.every((r) => r.status !== "received")).toBe(true);
  expect(res.ok).toBe(true);
});

test("webhook failure marks row status 'error' but row still persists", async () => {
  const { db, service } = await svc({ DEMO_WEBHOOK_URL: "https://example.test/hook" });
  const orig = globalThis.fetch;
  globalThis.fetch = (async () => new Response("nope", { status: 500 })) as unknown as typeof fetch;
  try {
    const res = await service.submit({
      fullName: "Ada Lovelace",
      workEmail: "ada@uni.edu",
      institution: "Uni",
      jobTitle: "Director",
      country: "US",
      institutionSize: "1000-5000",
      solutions: ["Career Management"],
      challenge: "manual reporting",
      preferredContact: "email",
      consent: true,
    });
    expect(res.ok).toBe(true);
    const row = await db
      .prepare("SELECT status FROM demo_requests")
      .first<{ status: string }>();
    expect(row?.status).toBe("error");
  } finally {
    globalThis.fetch = orig;
  }
});
