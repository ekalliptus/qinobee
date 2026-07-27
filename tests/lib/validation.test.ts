import { test, expect } from "bun:test";
import { httpUrl, email, boundedText, nonEmpty } from "@lib/validation/primitives";

test("httpUrl rejects non-http(s) schemes", () => {
  expect(httpUrl.safeParse("javascript:alert(1)").success).toBe(false);
  expect(httpUrl.safeParse("https://ok.com").success).toBe(true);
  expect(httpUrl.safeParse("http://ok.com").success).toBe(true);
});

test("email validates", () => {
  expect(email.safeParse("a@b.com").success).toBe(true);
  expect(email.safeParse("nope").success).toBe(false);
});

test("boundedText enforces max", () => {
  const t = boundedText(5);
  expect(t.safeParse("hello").success).toBe(true);
  expect(t.safeParse("too long").success).toBe(false);
});

test("nonEmpty trims and bounds", () => {
  const n = nonEmpty(5);
  expect(n.safeParse("hi").success).toBe(true);
  expect(n.safeParse("   ").success).toBe(false);
  expect(n.safeParse("toolong").success).toBe(false);
});
