import { test, expect } from "bun:test";
import { History } from "@lib/utils/history";

test("undo/redo restores states", () => {
  const h = new History<{ n: number }>({ n: 0 });
  h.push({ n: 1 }); h.push({ n: 2 });
  expect(h.current).toEqual({ n: 2 });
  expect(h.undo()).toEqual({ n: 1 });
  expect(h.undo()).toEqual({ n: 0 });
  expect(h.canUndo).toBe(false);
  expect(h.redo()).toEqual({ n: 1 });
  expect(h.redo()).toEqual({ n: 2 });
  expect(h.canRedo).toBe(false);
});

test("push after undo clears the redo branch", () => {
  const h = new History<number>(0);
  h.push(1); h.push(2);
  h.undo();            // now at 1
  h.push(9);           // branch from 1
  expect(h.current).toBe(9);
  expect(h.canRedo).toBe(false);
});

test("respects max size (drops oldest)", () => {
  const h = new History<number>(0, 3); // keep at most 3 entries
  h.push(1); h.push(2); h.push(3); h.push(4);
  // oldest dropped; cannot undo all the way back to 0
  let steps = 0; while (h.canUndo) { h.undo(); steps++; }
  expect(steps).toBeLessThanOrEqual(2);
});
