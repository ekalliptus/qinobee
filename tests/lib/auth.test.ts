import { test, expect } from "bun:test";
import { hashPassword, verifyPassword } from "@lib/auth/password";
import { newSessionToken, hashToken } from "@lib/auth/session";

test("password round trip", async () => {
  const h = await hashPassword("s3cret!");
  expect(await verifyPassword("s3cret!", h)).toBe(true);
  expect(await verifyPassword("wrong", h)).toBe(false);
});

test("session token high entropy hash stable", () => {
  const t = newSessionToken();
  expect(t.length).toBeGreaterThanOrEqual(43);
  expect(hashToken(t)).toBe(hashToken(t));
  expect(hashToken(t)).not.toBe(t);
});

test("distinct tokens hash differently", () => {
  expect(hashToken(newSessionToken())).not.toBe(hashToken(newSessionToken()));
});
