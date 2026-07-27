export type SaveStatus =
  | "idle"
  | "dirty"
  | "saving"
  | "saved"
  | "failed"
  | "conflict"
  | "offline";

export interface SaveState {
  status: SaveStatus;
  localRevision: number; // increments on local edit
  savedRevision: number; // last server-confirmed revision
  inFlightRevision: number | null; // revision of save currently in flight
}

export type SaveEvent =
  | { type: "edit" }
  | { type: "saveStart"; revision: number }
  | { type: "ack"; ackRevision: number }
  | { type: "conflict" }
  | { type: "error" }
  | { type: "offline" };

export interface ReconcileResult extends SaveState {
  applied: boolean;
}

/**
 * Pure, conflict-safe save reducer.
 *
 * Stale-ack rule: an ack whose ackRevision < the current savedRevision is
 * out-of-order and IGNORED (applied:false, state unchanged). This guarantees
 * a late ack for an older revision can never overwrite newer confirmed state.
 */
export function reconcileSave(
  state: SaveState,
  event: SaveEvent,
): ReconcileResult {
  switch (event.type) {
    case "edit":
      return {
        ...state,
        localRevision: state.localRevision + 1,
        status: "dirty",
        applied: true,
      };

    case "saveStart":
      return {
        ...state,
        status: "saving",
        inFlightRevision: event.revision,
        applied: true,
      };

    case "ack": {
      // stale / out-of-order ack: never regress savedRevision
      if (event.ackRevision < state.savedRevision) {
        return { ...state, applied: false };
      }
      const savedRevision = Math.max(state.savedRevision, event.ackRevision);
      const inFlightRevision =
        state.inFlightRevision !== null &&
        event.ackRevision >= state.inFlightRevision
          ? null
          : state.inFlightRevision;
      const status: SaveStatus =
        savedRevision >= state.localRevision ? "saved" : "dirty";
      return {
        ...state,
        savedRevision,
        inFlightRevision,
        status,
        applied: true,
      };
    }

    case "conflict":
      return { ...state, status: "conflict", applied: true };

    case "error":
      return { ...state, status: "failed", applied: true };

    case "offline":
      return { ...state, status: "offline", applied: true };
  }
}
