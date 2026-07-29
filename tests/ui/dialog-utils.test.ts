import { test, expect } from "bun:test";
import {
  getFocusableSelector,
  isFocusableCandidate,
} from "@components/ui/dialog-utils";

test("getFocusableSelector returns the standard selector string", () => {
  const sel = getFocusableSelector();
  expect(sel).toContain("a[href]");
  expect(sel).toContain("button:not([disabled])");
  expect(sel).toContain("textarea");
  expect(sel).toContain("input");
  expect(sel).toContain("select");
  expect(sel).toContain('[tabindex]:not([tabindex="-1"])');
});

test("isFocusableCandidate rejects hidden elements", () => {
  const el = {
    tagName: "A",
    getAttribute: () => null,
    hidden: true,
  } as unknown as Element;
  expect(isFocusableCandidate(el)).toBe(false);
});

test("isFocusableCandidate rejects disabled elements", () => {
  const el = {
    tagName: "BUTTON",
    hidden: false,
    getAttribute: (name: string) =>
      name === "disabled" ? "" : null,
  } as unknown as Element;
  expect(isFocusableCandidate(el)).toBe(false);
});
