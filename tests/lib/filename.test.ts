import { test, expect } from "bun:test";
import { safeResumeFilename } from "@lib/utils/filename";

test("builds safe filename from name + title", () => {
  expect(safeResumeFilename("Muhammad Fatih", "Frontend Developer CV")).toBe(
    "Muhammad-Fatih-Frontend-Developer-CV.pdf",
  );
});

test("strips path traversal and unsafe chars", () => {
  const f = safeResumeFilename("../../etc/passwd", "x/y\\z");
  expect(f).not.toContain("/");
  expect(f).not.toContain("\\");
  expect(f).not.toContain("..");
  expect(f.endsWith(".pdf")).toBe(true);
});

test("collapses whitespace and repeated separators", () => {
  expect(safeResumeFilename("  Ada   Lovelace  ", "Résumé")).toBe(
    "Ada-Lovelace-Resume.pdf",
  );
});

test("falls back when empty", () => {
  expect(safeResumeFilename("", "")).toBe("resume.pdf");
});
