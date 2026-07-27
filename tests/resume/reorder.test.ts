import { test, expect } from "bun:test";
import { moveUp, moveDown, moveToTop, moveToBottom } from "@modules/resume/utils/reorder";

test("moveUp swaps with previous", () => { expect(moveUp(["a","b","c"], 1)).toEqual(["b","a","c"]); });
test("moveUp at 0 is a no-op", () => { expect(moveUp(["a","b"], 0)).toEqual(["a","b"]); });
test("moveDown swaps with next", () => { expect(moveDown(["a","b","c"], 1)).toEqual(["a","c","b"]); });
test("moveDown at end is a no-op", () => { expect(moveDown(["a","b"], 1)).toEqual(["a","b"]); });
test("moveToTop / moveToBottom", () => {
  expect(moveToTop(["a","b","c"], 2)).toEqual(["c","a","b"]);
  expect(moveToBottom(["a","b","c"], 0)).toEqual(["b","c","a"]);
});
test("out-of-range index returns a copy unchanged", () => { expect(moveUp(["a","b"], 9)).toEqual(["a","b"]); });
