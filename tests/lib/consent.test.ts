import { test, expect } from "bun:test";
import { createSqliteAdapter } from "@lib/db/sqlite-adapter";
import { migrateDb } from "@lib/db/migrate";
import { hasAiConsent, setAiConsent } from "@lib/auth/consent";

async function userDb() {
  const db = createSqliteAdapter(":memory:");
  await migrateDb(db);
  await db
    .prepare("INSERT INTO users (id,email,password_hash,created_at) VALUES (?,?,?,?)")
    .bind("u1", "u1@x.com", "h", new Date().toISOString())
    .run();
  return db;
}

test("consent defaults false, can be set true", async () => {
  const db = await userDb();
  expect(await hasAiConsent(db, "u1")).toBe(false);
  await setAiConsent(db, "u1");
  expect(await hasAiConsent(db, "u1")).toBe(true);
});

test("hasAiConsent is false for unknown user", async () => {
  const db = await userDb();
  expect(await hasAiConsent(db, "nope")).toBe(false);
});
