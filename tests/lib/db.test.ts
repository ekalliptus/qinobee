import { test, expect } from "bun:test";
import { createDb } from "@lib/db/client";
import { migrate } from "@lib/db/migrate";

test("migrate creates users table", () => {
  const db = createDb(":memory:");
  migrate(db);
  const row = db
    .query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    .get();
  expect(row).toBeTruthy();
});

test("migrate creates all six tables", () => {
  const db = createDb(":memory:");
  migrate(db);
  for (const t of [
    "users",
    "sessions",
    "resumes",
    "resume_revisions",
    "demo_requests",
    "rate_limits",
  ]) {
    const row = db
      .query("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
      .get(t);
    expect(row).toBeTruthy();
  }
});

test("migrate idempotent", () => {
  const db = createDb(":memory:");
  migrate(db);
  expect(() => migrate(db)).not.toThrow();
  const fk = db.query("PRAGMA foreign_keys").get() as { foreign_keys: number };
  expect(fk.foreign_keys).toBe(1);
});
