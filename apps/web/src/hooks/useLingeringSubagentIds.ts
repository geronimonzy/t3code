import { useEffect, useRef, useState } from "react";

import {
  expireSubagentStripPhase,
  lingeringSubagentIds,
  NO_SUBAGENT_STRIP_PHASES,
  observeSubagentStrip,
  SUBAGENT_STRIP_DONE_LINGER_MS,
  type SubagentLifecycle,
  type SubagentStripPhases,
} from "../components/chat/ComposerSubagentStrip.logic";

interface TrackedPhases {
  readonly scopeKey: string;
  readonly phases: SubagentStripPhases;
}

/**
 * Subagents that recently finished and should still be shown as done.
 * Only agents seen working while mounted qualify; tracking resets when
 * `scopeKey` changes.
 */
export function useLingeringSubagentIds(
  subagents: ReadonlyArray<SubagentLifecycle>,
  scopeKey: string,
): ReadonlySet<string> {
  const [tracked, setTracked] = useState<TrackedPhases>({
    scopeKey,
    phases: NO_SUBAGENT_STRIP_PHASES,
  });
  const trackedPhases = tracked.scopeKey === scopeKey ? tracked.phases : NO_SUBAGENT_STRIP_PHASES;
  // Folded in during render, so a finished agent keeps its row from the first
  // frame its status flips instead of blinking out for one paint.
  const phases = observeSubagentStrip(trackedPhases, subagents);
  if (phases !== trackedPhases) setTracked({ scopeKey, phases });

  // One timer per settling agent. Resuming clears it, so settling again restarts the linger.
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- keeps one linger timer per settling subagent in step with the phases
  useEffect(() => {
    const timers = timersRef.current;
    for (const [id, timer] of timers) {
      if (phases.get(id) !== "settling") {
        clearTimeout(timer);
        timers.delete(id);
      }
    }
    for (const [id, phase] of phases) {
      if (phase !== "settling" || timers.has(id)) continue;
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id);
          setTracked((current) =>
            current.scopeKey === scopeKey
              ? { scopeKey, phases: expireSubagentStripPhase(current.phases, id) }
              : current,
          );
        }, SUBAGENT_STRIP_DONE_LINGER_MS),
      );
    }
  }, [phases, scopeKey]);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- clears the linger timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
    };
  }, []);

  return lingeringSubagentIds(phases);
}
