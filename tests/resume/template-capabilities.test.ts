import { test, expect } from "bun:test";
import { templateCapabilities } from "@modules/resume/templates/capabilities";

test("essential supports divider and alignment", () => {
  expect(templateCapabilities("essential")).toEqual({ divider: true, alignment: true });
});

test("technical supports neither", () => {
  expect(templateCapabilities("technical")).toEqual({ divider: false, alignment: false });
});

test("executive supports divider only (header is always centered)", () => {
  expect(templateCapabilities("executive")).toEqual({ divider: true, alignment: false });
});

test("modern supports alignment only", () => {
  expect(templateCapabilities("modern")).toEqual({ divider: false, alignment: true });
});

test("unknown id falls back to no capabilities", () => {
  expect(templateCapabilities("nope")).toEqual({ divider: false, alignment: false });
});
