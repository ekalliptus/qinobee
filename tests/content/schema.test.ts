import { test, expect } from "bun:test";
import { resourceSchema } from "@/content/resource-schema";

test("valid resource parses", () => {
  expect(() =>
    resourceSchema.parse({
      title: "t",
      description: "d",
      publishedAt: "2026-01-01",
      type: "blog",
      cover: "/x.png",
      author: "a",
    }),
  ).not.toThrow();
});

test("defaults featured/draft/tags", () => {
  const parsed = resourceSchema.parse({
    title: "t",
    description: "d",
    publishedAt: "2026-01-01",
    type: "guide",
    cover: "/x.png",
    author: "a",
  });
  expect(parsed.featured).toBe(false);
  expect(parsed.draft).toBe(false);
  expect(parsed.tags).toEqual([]);
});

test("rejects invalid type", () => {
  expect(() =>
    resourceSchema.parse({
      title: "t",
      description: "d",
      publishedAt: "2026-01-01",
      type: "invalid",
      cover: "/x.png",
      author: "a",
    }),
  ).toThrow();
});

test("coerces publishedAt to Date", () => {
  const parsed = resourceSchema.parse({
    title: "t",
    description: "d",
    publishedAt: "2026-01-01",
    type: "update",
    cover: "/x.png",
    author: "a",
  });
  expect(parsed.publishedAt).toBeInstanceOf(Date);
});
