import { test, expect } from "bun:test";
import { createDb } from "@lib/db/client";
import { migrate } from "@lib/db/migrate";
import { DemoService } from "@lib/services/demo-service";

function svc() {
  const db = createDb(":memory:");
  migrate(db);
  return { db, service: new DemoService(db) };
}

test("valid payload persists a demo_requests row with status received", async () => {
  const { db, service } = svc();
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
  const row = db.query("SELECT status FROM demo_requests").get() as { status: string };
  expect(row.status).toBe("received");
});

test("invalid payload rejected, no row", async () => {
  const { db, service } = svc();
  const res = await service.submit({ fullName: "", workEmail: "nope", consent: false } as any);
  expect(res.ok).toBe(false);
  const count = db.query("SELECT COUNT(*) c FROM demo_requests").get() as { c: number };
  expect(count.c).toBe(0);
});

test("honeypot filled is dropped (ok true, but not persisted as received)", async () => {
  const { db, service } = svc();
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
  const rows = db.query("SELECT status FROM demo_requests").all() as { status: string }[];
  expect(rows.every((r) => r.status !== "received")).toBe(true);
  expect(res.ok).toBe(true);
});
