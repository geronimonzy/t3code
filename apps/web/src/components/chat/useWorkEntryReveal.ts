import type { LegendListRef } from "@legendapp/list/react";
import type { RunAttemptId, RunId } from "@t3tools/contracts";
import { useEffect, useRef, useSyncExternalStore, type RefObject } from "react";
import type { TimelineEntry } from "../../session-logic";
import {
  resolveWorkEntryReveal,
  type MessagesTimelineRow,
  type WorkGroupScrollAnchor,
} from "./MessagesTimeline.logic";
import { toastManager } from "../ui/toast";

/** Asks the timeline to show one work entry, such as the tool call that started a monitor. */
export interface WorkEntryRevealRequest {
  readonly entryId: string;
  /** A new key reveals the same entry again. */
  readonly key: number;
}

/**
 * The last revealed entry. Rows subscribe with a selector, so a reveal
 * re-renders only the row it names, not the whole timeline.
 */
export interface WorkEntryRevealStore {
  readonly get: () => WorkEntryRevealRequest | null;
  readonly set: (reveal: WorkEntryRevealRequest) => void;
  readonly subscribe: (listener: () => void) => () => void;
}

export function createWorkEntryRevealStore(): WorkEntryRevealStore {
  let current: WorkEntryRevealRequest | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set: (reveal) => {
      current = reveal;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** The key of the latest reveal naming an entry `holds` accepts, or null. */
export function useWorkEntryRevealKey(
  store: WorkEntryRevealStore,
  holds: (entryId: string) => boolean,
): number | null {
  return useSyncExternalStore(store.subscribe, () => {
    const reveal = store.get();
    return reveal !== null && holds(reveal.entryId) ? reveal.key : null;
  });
}

/**
 * Opens whatever hides the requested entry (turn fold, superseded attempt,
 * tool group) one step per render, then scrolls to its row and expands it.
 */
export function useWorkEntryReveal({
  request,
  entries,
  rows,
  foldRunIds,
  listRef,
  store,
  workGroupState,
  animated,
  onExpandRun,
  onExpandAttempt,
  onExpandGroup,
  onManualNavigation,
}: {
  request: WorkEntryRevealRequest | null;
  entries: ReadonlyArray<TimelineEntry>;
  rows: ReadonlyArray<MessagesTimelineRow>;
  foldRunIds: () => ReadonlyMap<string, RunId>;
  listRef: RefObject<LegendListRef | null>;
  store: WorkEntryRevealStore;
  workGroupState: {
    readonly scrollPositions: Map<string, WorkGroupScrollAnchor>;
    readonly expandedEntries: Set<string>;
  };
  animated: boolean;
  onExpandRun: (runId: RunId) => void;
  onExpandAttempt: (attemptId: RunAttemptId) => void;
  onExpandGroup: (groupId: string) => void;
  onManualNavigation: () => void;
}) {
  const progressRef = useRef<{ key: number; steps: Set<string>; done: boolean } | null>(null);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- drives the virtual list's scroll to the revealed entry, expanding its run or group across renders
  useEffect(() => {
    if (request === null) return;
    if (progressRef.current?.key !== request.key) {
      progressRef.current = { key: request.key, steps: new Set(), done: false };
      onManualNavigation();
    }
    const progress = progressRef.current;
    if (progress.done) return;
    const { entryId } = request;
    const step = resolveWorkEntryReveal({
      entryId,
      timelineEntries: entries,
      rows,
      foldRunIds: foldRunIds(),
    });
    if (step.kind === "scroll") {
      progress.done = true;
      workGroupState.expandedEntries.add(entryId);
      store.set(request);
      void listRef.current?.scrollToIndex({ index: step.rowIndex, animated, viewOffset: 24 });
      return;
    }
    const stepKey =
      step.kind === "expand-run"
        ? `run:${step.runId}`
        : step.kind === "expand-attempt"
          ? `attempt:${step.attemptId}`
          : step.kind === "expand-group"
            ? `group:${step.groupId}`
            : "missing";
    // An expansion that did not uncover the entry would repeat forever.
    if (step.kind === "missing" || progress.steps.has(stepKey)) {
      progress.done = true;
      toastManager.add({
        type: "info",
        title: "Could not find that tool call",
        description: "It may be in earlier turns that are not loaded.",
      });
      return;
    }
    progress.steps.add(stepKey);
    if (step.kind === "expand-run") onExpandRun(step.runId);
    else if (step.kind === "expand-attempt") onExpandAttempt(step.attemptId);
    else {
      // The group's list mounts scrolled to the entry instead of its top.
      workGroupState.scrollPositions.set(`${step.groupId}:details`, { entryId, offset: 0 });
      onExpandGroup(step.groupId);
    }
  }, [
    animated,
    entries,
    foldRunIds,
    listRef,
    onExpandAttempt,
    onExpandGroup,
    onExpandRun,
    onManualNavigation,
    request,
    rows,
    store,
    workGroupState,
  ]);
}
