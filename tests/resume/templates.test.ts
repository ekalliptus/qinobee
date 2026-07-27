import { test, expect } from "bun:test";
import {
  listTemplates,
  getTemplate,
  TEMPLATE_IDS,
} from "@modules/resume/templates/registry";

test("exposes six templates with unique ids", () => {
  const all = listTemplates();
  expect(all.length).toBe(6);
  const ids = all.map((t) => t.id);
  expect(new Set(ids).size).toBe(6);
});

test("each template has valid metadata", () => {
  for (const t of listTemplates()) {
    expect(typeof t.id).toBe("string");
    expect(typeof t.name).toBe("string");
    expect(typeof t.description).toBe("string");
    expect(["single-column", "two-column"]).toContain(t.layout);
    expect(["ats", "modern", "academic", "executive"]).toContain(t.category);
    expect(typeof t.component).toBe("function");
  }
});

test("getTemplate falls back to default for unknown id", () => {
  const fallback = getTemplate("does-not-exist");
  expect(fallback).toBeTruthy();
  expect(TEMPLATE_IDS).toContain(fallback.id);
});

test("getTemplate returns the requested template", () => {
  expect(getTemplate("essential").id).toBe("essential");
});
