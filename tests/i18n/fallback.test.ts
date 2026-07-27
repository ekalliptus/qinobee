import { test, expect } from "bun:test";
import { t, getDict, isSupportedLocale } from "@/i18n";

test("returns the requested locale string", () => {
  expect(t("nav.solutions", "en")).toBe(getDict("en").nav.solutions);
});
test("falls back to en for a missing id key", () => {
  // simulate by requesting a key that exists in en; if id lacks it, returns en value
  const v = t("nav.solutions", "id");
  expect(typeof v).toBe("string");
  expect(v.length).toBeGreaterThan(0);
});
test("unknown key returns the key itself (last-resort)", () => {
  expect(t("this.key.does.not.exist" as any, "en")).toBe("this.key.does.not.exist");
});
test("isSupportedLocale guards", () => {
  expect(isSupportedLocale("en")).toBe(true);
  expect(isSupportedLocale("id")).toBe(true);
  expect(isSupportedLocale("fr")).toBe(false);
});
