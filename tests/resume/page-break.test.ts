import { test, expect } from "bun:test";
import {
  estimatePages,
  A4_CONTENT_MM,
  pageBreakInfo,
  mmToPx,
  pxToMm,
} from "@modules/resume/utils/page-break";

test("A4 usable height constant is ~ one page", () => {
  expect(A4_CONTENT_MM).toBeGreaterThan(0);
  expect(A4_CONTENT_MM).toBeLessThan(297);
});

test("content shorter than one page => 1 page, no overflow", () => {
  const info = pageBreakInfo(100);
  expect(info.pages).toBe(1);
  expect(info.overflow).toBe(false);
});

test("content taller than one page => 2 pages and overflow flag", () => {
  const info = pageBreakInfo(A4_CONTENT_MM + 50);
  expect(info.pages).toBe(2);
  expect(info.overflow).toBe(true);
});

test("estimatePages rounds up", () => {
  expect(estimatePages(A4_CONTENT_MM * 2 + 1)).toBe(3);
  expect(estimatePages(0)).toBe(1);
});

test("mmToPx and pxToMm are inverse at 96dpi", () => {
  expect(mmToPx(A4_CONTENT_MM)).toBeCloseTo((A4_CONTENT_MM * 96) / 25.4, 5);
  expect(pxToMm(mmToPx(100))).toBeCloseTo(100, 5);
});
