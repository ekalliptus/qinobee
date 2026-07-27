import { test, expect } from "bun:test";
import { createDb } from "@lib/db/client";
import { migrate } from "@lib/db/migrate";
import { rateLimit } from "@lib/rate-limit";

function db() {
  const d = createDb(":memory:");
  migrate(d);
  return d;
}

test("allows up to the limit then blocks within the window", () => {
  const d = db();
  for (let i = 0; i < 5; i++) {
    expect(rateLimit(d, "k", 5, 60).allowed).toBe(true);
  }
  expect(rateLimit(d, "k", 5, 60).allowed).toBe(false);
});

test("remaining counts down", () => {
  const d = db();
  const r1 = rateLimit(d, "r", 5, 60);
  expect(r1.remaining).toBe(4);
});

test("separate keys are independent", () => {
  const d = db();
  expect(rateLimit(d, "a", 1, 60).allowed).toBe(true);
  expect(rateLimit(d, "a", 1, 60).allowed).toBe(false);
  expect(rateLimit(d, "b", 1, 60).allowed).toBe(true);
  expect(rateLimit(d, "b", 1, 60).allowed).toBe(false);
});
