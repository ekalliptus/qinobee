import { test, expect } from "bun:test";
import { slugify } from "@lib/utils/slug";
test("slugify basic", () => {
  expect(slugify("Frontend Developer CV")).toBe("frontend-developer-cv");
  expect(slugify("  Héllo  World!! ")).toBe("hello-world");
});
