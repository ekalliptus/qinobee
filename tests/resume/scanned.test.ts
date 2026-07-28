import { test, expect } from "bun:test";
import { isLikelyScanned, MIN_TEXT_PER_PAGE } from "@modules/resume/import/scanned";

test("empty text is likely scanned", () => {
  expect(isLikelyScanned("", 1)).toBe(true);
  expect(isLikelyScanned("   \n\t  ", 3)).toBe(true);
});

test("tiny text relative to pages is likely scanned", () => {
  expect(isLikelyScanned("Page 1", 1)).toBe(true);
  expect(isLikelyScanned("a few words here", 5)).toBe(true);
});

test("a real paragraph of text is not scanned", () => {
  const para =
    "Experienced software engineer with a track record of building reliable " +
    "web applications, leading small teams, and shipping features on time.";
  expect(isLikelyScanned(para, 1)).toBe(false);
  expect(isLikelyScanned(para, 15)).toBe(false);
});

test("threshold scales with pages but caps at 5", () => {
  // Threshold = MIN_TEXT_PER_PAGE * min(pageCount, 5).
  const cap = MIN_TEXT_PER_PAGE * 5;
  const justUnder = "x".repeat(cap - 1);
  const justOver = "x".repeat(cap);
  expect(isLikelyScanned(justUnder, 100)).toBe(true);
  expect(isLikelyScanned(justOver, 100)).toBe(false);
});

test("boundary at exactly the per-page minimum for one page", () => {
  expect(isLikelyScanned("y".repeat(MIN_TEXT_PER_PAGE - 1), 1)).toBe(true);
  expect(isLikelyScanned("y".repeat(MIN_TEXT_PER_PAGE), 1)).toBe(false);
});

test("whitespace does not count toward the threshold", () => {
  // 4 non-space chars, padded with spaces — still below one-page minimum.
  expect(isLikelyScanned("a b c d " + " ".repeat(100), 1)).toBe(true);
});

test("zero/negative page counts treated as one page", () => {
  expect(isLikelyScanned("y".repeat(MIN_TEXT_PER_PAGE), 0)).toBe(false);
  expect(isLikelyScanned("", 0)).toBe(true);
});
