import { test, expect } from "bun:test";
import { orderPageText, type TextItem } from "@modules/resume/import/order-text-items";

// Single column: three lines top-to-bottom (higher y = higher on page)
test("single column orders top-to-bottom, left-to-right", () => {
  const items: TextItem[] = [
    { str: "Name", x: 50, y: 700, width: 40 },
    { str: "Summary", x: 50, y: 660, width: 60 },
    { str: "line", x: 50, y: 620, width: 30 },
  ];
  expect(orderPageText(items)).toBe("Name\nSummary\nline");
});

test("same-line items join by x", () => {
  const items: TextItem[] = [
    { str: "Doe", x: 85, y: 701, width: 30 },
    { str: "Jane", x: 50, y: 700, width: 30 },
  ];
  expect(orderPageText(items)).toBe("Jane Doe");
});

// Two columns: left col (Skills) and right col (Experience). pdf.js may interleave.
test("two columns: left column fully before right column", () => {
  const items: TextItem[] = [
    // right column items appear first in source (jumbled), x ~ 350
    { str: "Experience", x: 350, y: 700, width: 80 },
    { str: "Engineer at Co", x: 350, y: 660, width: 100 },
    // left column, x ~ 50
    { str: "Skills", x: 50, y: 700, width: 40 },
    { str: "TypeScript", x: 50, y: 660, width: 60 },
  ];
  const out = orderPageText(items, { pageWidth: 500 });
  expect(out.indexOf("Skills")).toBeLessThan(out.indexOf("Experience"));
  expect(out.indexOf("TypeScript")).toBeLessThan(out.indexOf("Experience"));
});

test("two columns keep intra-column top-to-bottom order", () => {
  const items: TextItem[] = [
    { str: "R1", x: 350, y: 700, width: 40 },
    { str: "L1", x: 50, y: 700, width: 40 },
    { str: "R2", x: 350, y: 650, width: 40 },
    { str: "L2", x: 50, y: 650, width: 40 },
  ];
  expect(orderPageText(items, { pageWidth: 500 })).toBe("L1\nL2\nR1\nR2");
});

test("single column with slight y jitter stays one line", () => {
  const items: TextItem[] = [
    { str: "a", x: 50, y: 500, width: 10 },
    { str: "b", x: 65, y: 502, width: 10 },
    { str: "c", x: 80, y: 499, width: 10 },
  ];
  expect(orderPageText(items)).toBe("a b c");
});

test("collapses duplicate spaces within a joined line", () => {
  const items: TextItem[] = [
    { str: "Hello ", x: 50, y: 500, width: 40 },
    { str: " World", x: 95, y: 500, width: 40 },
  ];
  expect(orderPageText(items)).toBe("Hello World");
});

test("empty items → empty string", () => {
  expect(orderPageText([{ str: "  ", x: 0, y: 0, width: 0 }])).toBe("");
});

test("no items → empty string", () => {
  expect(orderPageText([])).toBe("");
});
