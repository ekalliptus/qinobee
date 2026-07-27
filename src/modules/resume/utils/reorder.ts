/** Pure, immutable, bounds-safe array reordering helpers. */

function inRange(len: number, i: number): boolean {
  return Number.isInteger(i) && i >= 0 && i < len;
}

function move<T>(arr: readonly T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}

export function moveUp<T>(arr: readonly T[], index: number): T[] {
  if (!inRange(arr.length, index) || index === 0) return arr.slice();
  return move(arr, index, index - 1);
}

export function moveDown<T>(arr: readonly T[], index: number): T[] {
  if (!inRange(arr.length, index) || index === arr.length - 1) return arr.slice();
  return move(arr, index, index + 1);
}

export function moveToTop<T>(arr: readonly T[], index: number): T[] {
  if (!inRange(arr.length, index)) return arr.slice();
  return move(arr, index, 0);
}

export function moveToBottom<T>(arr: readonly T[], index: number): T[] {
  if (!inRange(arr.length, index)) return arr.slice();
  return move(arr, index, arr.length - 1);
}
