import { test, expect } from "bun:test";
import { createSqliteAdapter } from "@lib/db/sqlite-adapter";
import { migrateDb } from "@lib/db/migrate";
import { rateLimit } from "@lib/rate-limit";

async function db() {
  const d = createSqliteAdapter(":memory:");
  await migrateDb(d);
  return d;
}

test("allows up to the limit then blocks within the window", async () => {
  const d = await db();
  for (let i = 0; i < 5; i++) {
    expect((await rateLimit(d, "k", 5, 60)).allowed).toBe(true);
  }
  expect((await rateLimit(d, "k", 5, 60)).allowed).toBe(false);
});

test("remaining counts down", async () => {
  const d = await db();
  const r1 = await rateLimit(d, "r", 5, 60);
  expect(r1.remaining).toBe(4);
});

test("separate keys are independent", async () => {
  const d = await db();
  expect((await rateLimit(d, "a", 1, 60)).allowed).toBe(true);
  expect((await rateLimit(d, "a", 1, 60)).allowed).toBe(false);
  expect((await rateLimit(d, "b", 1, 60)).allowed).toBe(true);
  expect((await rateLimit(d, "b", 1, 60)).allowed).toBe(false);
});
