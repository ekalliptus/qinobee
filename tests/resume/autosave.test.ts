import { test, expect } from "bun:test";
import { reconcileSave } from "@modules/resume/components/save-reconcile";

test("applies an in-order ack and advances save state to saved", () => {
  const next = reconcileSave(
    { status: "saving", localRevision: 5, savedRevision: 4, inFlightRevision: 5 },
    { type: "ack", ackRevision: 5 },
  );
  expect(next.status).toBe("saved");
  expect(next.savedRevision).toBe(5);
});

test("ignores a stale (out-of-order) ack for an older revision", () => {
  const next = reconcileSave(
    { status: "saving", localRevision: 7, savedRevision: 6, inFlightRevision: 7 },
    { type: "ack", ackRevision: 3 },
  );
  expect(next.applied).toBe(false);
  expect(next.savedRevision).toBe(6); // unchanged
});

test("a conflict response sets status to conflict without losing local revision", () => {
  const next = reconcileSave(
    { status: "saving", localRevision: 7, savedRevision: 6, inFlightRevision: 7 },
    { type: "conflict" },
  );
  expect(next.status).toBe("conflict");
  expect(next.localRevision).toBe(7);
});

test("a network error sets save-failed (retryable), keeps local changes", () => {
  const next = reconcileSave(
    { status: "saving", localRevision: 7, savedRevision: 6, inFlightRevision: 7 },
    { type: "error" },
  );
  expect(next.status).toBe("failed");
  expect(next.localRevision).toBe(7);
});

test("a local edit bumps localRevision and marks dirty", () => {
  const next = reconcileSave(
    { status: "saved", localRevision: 5, savedRevision: 5, inFlightRevision: null },
    { type: "edit" },
  );
  expect(next.localRevision).toBe(6);
  expect(next.status).toBe("dirty");
});
