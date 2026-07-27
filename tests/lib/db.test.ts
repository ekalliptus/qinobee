import { test, expect } from "bun:test";
import { createSqliteAdapter } from "@lib/db/sqlite-adapter";
import { migrateDb } from "@lib/db/migrate";

test("migrateDb creates all six tables", async () => {
  const db = createSqliteAdapter(":memory:");
  await migrateDb(db);
  for (const t of [
    "users",
    "sessions",
    "resumes",
    "resume_revisions",
    "demo_requests",
    "rate_limits",
  ]) {
    const row = await db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
      .bind(t)
      .first();
    expect(row).toBeTruthy();
  }
});

test("migrateDb is idempotent", async () => {
  const db = createSqliteAdapter(":memory:");
  await migrateDb(db);
  await expect(migrateDb(db)).resolves.toBeUndefined();
});

test("adapter run reports changes; first returns null when absent", async () => {
  const db = createSqliteAdapter(":memory:");
  await migrateDb(db);
  const now = new Date().toISOString();
  const res = await db
    .prepare(
      "INSERT INTO users (id,email,password_hash,created_at) VALUES (?,?,?,?)",
    )
    .bind("u1", "a@b.com", "h", now)
    .run();
  expect(res.changes).toBe(1);
  const got = await db
    .prepare("SELECT email FROM users WHERE id=?")
    .bind("u1")
    .first<{ email: string }>();
  expect(got?.email).toBe("a@b.com");
  const missing = await db
    .prepare("SELECT email FROM users WHERE id=?")
    .bind("nope")
    .first();
  expect(missing).toBeNull();
});

test("batch is atomic", async () => {
  const db = createSqliteAdapter(":memory:");
  await migrateDb(db);
  const now = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        "INSERT INTO users (id,email,password_hash,created_at) VALUES (?,?,?,?)",
      )
      .bind("u2", "c@d.com", "h", now),
  ]);
  const got = await db
    .prepare("SELECT COUNT(*) c FROM users")
    .first<{ c: number }>();
  expect(got?.c).toBe(1);
});
