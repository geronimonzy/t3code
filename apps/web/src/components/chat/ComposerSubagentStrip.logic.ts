import type { OrchestrationV2Subagent, ThreadId } from "@t3tools/contracts";
import { formatSubagentDisplayTitle } from "@t3tools/client-runtime/state/subagent-display";
import { isActiveSubagentStatus } from "@t3tools/client-runtime/state/subagentRuntime";
import type { ThreadTurnSubagents } from "@t3tools/client-runtime/state/thread-subagents";

/** How long a finished chip stays in the strip before it leaves. */
export const SUBAGENT_STRIP_DONE_LINGER_MS = 3_000;
export const SUBAGENT_STRIP_MAX_VISIBLE = 3;

export type SubagentStripChipState = "working" | "done" | "failed" | "stopped";

export interface SubagentStripChip {
  readonly id: string;
  readonly childThreadId: ThreadId | null;
  readonly title: string;
  readonly progress: string | null;
  readonly state: SubagentStripChipState;
}

export interface SubagentStrip {
  readonly visible: ReadonlyArray<SubagentStripChip>;
  readonly overflow: ReadonlyArray<SubagentStripChip>;
  readonly workingCount: number;
}

function chipState(status: OrchestrationV2Subagent["status"]): SubagentStripChipState {
  if (isActiveSubagentStatus(status)) return "working";
  if (status === "completed" || status === "idle") return "done";
  if (status === "failed") return "failed";
  return "stopped";
}

function chipTitle(subagent: OrchestrationV2Subagent): string {
  const title = subagent.title?.trim() || subagent.prompt.trim().split("\n", 1)[0] || "Subagent";
  return formatSubagentDisplayTitle(title);
}

/** Ids of the turn's subagents that are still working. */
export function liveSubagentIds(turn: ThreadTurnSubagents | null): ReadonlySet<string> {
  return new Set(
    turn?.subagents
      .filter((subagent) => isActiveSubagentStatus(subagent.status))
      .map((subagent) => subagent.id) ?? [],
  );
}

/**
 * Subagents seen working before that have now settled. Only these earn a
 * brief "done" chip; agents that were already settled when the thread opened
 * never flash back into the strip.
 */
export function newlySettledSubagentIds(
  previousLiveIds: ReadonlySet<string>,
  turn: ThreadTurnSubagents | null,
): ReadonlyArray<string> {
  if (turn === null) return [];
  return turn.subagents
    .filter(
      (subagent) => previousLiveIds.has(subagent.id) && !isActiveSubagentStatus(subagent.status),
    )
    .map((subagent) => subagent.id);
}

/**
 * The strip for one turn: working agents plus recently settled ones, in spawn
 * order so chips never reshuffle. Null hides the strip.
 */
export function deriveSubagentStrip(
  turn: ThreadTurnSubagents | null,
  lingeringIds: ReadonlySet<string>,
  maxVisible = SUBAGENT_STRIP_MAX_VISIBLE,
): SubagentStrip | null {
  if (turn === null) return null;
  const chips: SubagentStripChip[] = [];
  let workingCount = 0;
  for (const subagent of turn.subagents) {
    const state = chipState(subagent.status);
    if (state === "working") workingCount += 1;
    else if (!lingeringIds.has(subagent.id)) continue;
    const progress = subagent.progress?.trim();
    chips.push({
      id: subagent.id,
      childThreadId: subagent.childThreadId,
      title: chipTitle(subagent),
      progress: state === "working" && progress ? progress : null,
      state,
    });
  }
  if (chips.length === 0) return null;
  // "+1 more" takes the same room as the chip it hides, so only collapse two or more.
  const visibleCount = chips.length > maxVisible + 1 ? maxVisible : chips.length;
  return {
    visible: chips.slice(0, visibleCount),
    overflow: chips.slice(visibleCount),
    workingCount,
  };
}
