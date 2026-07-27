import { useCallback, useEffect, useReducer, useRef } from "react";
import type { ResumeDocument } from "@modules/resume/types";
import { History } from "@lib/utils/history";
import {
  reconcileSave,
  type SaveEvent,
  type SaveState,
} from "./save-reconcile";

export type SaveResult = { revision: number } | { conflict: true };

export interface ResumeEditorOptions {
  save: (doc: ResumeDocument, revision: number) => Promise<SaveResult>;
  debounceMs?: number;
}

type ResumePatch = Partial<ResumeDocument> | ((prev: ResumeDocument) => ResumeDocument);

interface StoreState {
  doc: ResumeDocument;
  save: SaveState;
}

type StoreAction =
  | { type: "setDoc"; doc: ResumeDocument }
  | { type: "save"; event: SaveEvent };

function reducer(state: StoreState, action: StoreAction): StoreState {
  switch (action.type) {
    case "setDoc":
      return { ...state, doc: action.doc };
    case "save": {
      const { applied: _applied, ...next } = reconcileSave(state.save, action.event);
      return { ...state, save: next };
    }
  }
}

export interface ResumeEditorStore {
  doc: ResumeDocument;
  save: SaveState;
  update: (patch: ResumePatch) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useResumeEditorStore(
  initialDoc: ResumeDocument,
  opts: ResumeEditorOptions,
): ResumeEditorStore {
  const debounceMs = opts.debounceMs ?? 750;

  const [state, dispatch] = useReducer(reducer, undefined, (): StoreState => ({
    doc: initialDoc,
    save: {
      status: "idle",
      localRevision: initialDoc.revision,
      savedRevision: initialDoc.revision,
      inFlightRevision: null,
    },
  }));

  const historyRef = useRef<History<ResumeDocument> | null>(null);
  if (historyRef.current === null) {
    historyRef.current = new History<ResumeDocument>(initialDoc);
  }
  const history = historyRef.current;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localRevisionRef = useRef(state.save.localRevision);
  localRevisionRef.current = state.save.localRevision;
  const docRef = useRef(state.doc);
  docRef.current = state.doc;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const runSave = useCallback(async () => {
    const revision = localRevisionRef.current;
    const doc = docRef.current;
    dispatch({ type: "save", event: { type: "saveStart", revision } });
    try {
      const result = await opts.save(doc, revision);
      if ("conflict" in result) {
        dispatch({ type: "save", event: { type: "conflict" } });
      } else {
        dispatch({ type: "save", event: { type: "ack", ackRevision: result.revision } });
      }
    } catch {
      dispatch({ type: "save", event: { type: "error" } });
    }
  }, [opts]);

  const scheduleSave = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void runSave();
    }, debounceMs);
  }, [clearTimer, debounceMs, runSave]);

  const update = useCallback(
    (patch: ResumePatch) => {
      const prev = docRef.current;
      const nextDoc =
        typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      history.push(nextDoc);
      dispatch({ type: "setDoc", doc: nextDoc });
      dispatch({ type: "save", event: { type: "edit" } });
      scheduleSave();
    },
    [history, scheduleSave],
  );

  const undo = useCallback(() => {
    const doc = history.undo();
    dispatch({ type: "setDoc", doc });
    dispatch({ type: "save", event: { type: "edit" } });
    scheduleSave();
  }, [history, scheduleSave]);

  const redo = useCallback(() => {
    const doc = history.redo();
    dispatch({ type: "setDoc", doc });
    dispatch({ type: "save", event: { type: "edit" } });
    scheduleSave();
  }, [history, scheduleSave]);

  useEffect(() => clearTimer, [clearTimer]);

  return {
    doc: state.doc,
    save: state.save,
    update,
    undo,
    redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
  };
}
