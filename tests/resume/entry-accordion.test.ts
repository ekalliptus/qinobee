import { test, expect } from "bun:test";
import { initialOpenIndex } from "@modules/resume/components/sections/EntryAccordion";

test("empty list opens nothing", () => {
  expect(initialOpenIndex([])).toBe(-1);
});

test("opens first incomplete item", () => {
  expect(initialOpenIndex([true, false, true])).toBe(1);
});

test("all complete opens first item", () => {
  expect(initialOpenIndex([true, true])).toBe(0);
});

test("none complete opens first item", () => {
  expect(initialOpenIndex([false, false])).toBe(0);
});
