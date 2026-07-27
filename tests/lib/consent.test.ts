import { test, expect } from "bun:test";
import { createDb } from "@lib/db/client";
import { migrate } from "@lib/db/migrate";
import { hasAiConsent, setAiConsent } from "@lib/auth/consent";

function userDb() {
  const db = createDb(":memory:");
  migrate(db);
  db.query("INSERT INTO users (id,email,password_hash,created_at) VALUES (?,?,?,?)")
    .run("u1", "u1@x.com", "h", new Date().toISOString());
  return db;
}

test("consent defaults false, can be set true", () => {
  const db = userDb();
  expect(hasAiConsent(db, "u1")).toBe(false);
  setAiConsent(db, "u1");
  expect(hasAiConsent(db, "u1")).toBe(true);
});

test("hasAiConsent is false for unknown user", () => {
  const db = userDb();
  expect(hasAiConsent(db, "nope")).toBe(false);
});
