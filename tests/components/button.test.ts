import { test, expect } from "bun:test";
import { buttonClasses } from "@components/ui/button-classes";

test("primary md maps expected classes", () => {
  const cls = buttonClasses("primary", "md");
  expect(cls).toContain("neo-button");
  expect(cls).toContain("bg-[var(--color-yellow)]");
});

test("danger variant uses red", () => {
  expect(buttonClasses("danger", "sm")).toContain("bg-[var(--color-red)]");
});

test("size sm and lg differ", () => {
  expect(buttonClasses("primary", "sm")).not.toEqual(
    buttonClasses("primary", "lg"),
  );
});
