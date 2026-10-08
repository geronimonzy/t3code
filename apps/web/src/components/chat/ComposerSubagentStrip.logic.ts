import type { OrchestrationV2Subagent, ThreadId } from "@t3tools/contracts";
import { formatSubagentDisplayTitle } from "@t3tools/client-runtime/state/subagent-display";
import { isActiveSubagentStatus } from "@t3tools/client-runtime/state/subagentRuntime";
import * as DateTime from "effect/DateTime";

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

/**
 * What the strip remembers about each agent it has seen working: still
 * working, settled and showing its outcome, or settled and gone. Agents
 * first seen already settled are never tracked, so opening a thread does not
 * flash old results back into the strip.
 */
export type SubagentStripPhase = "working" | "settling" | "expired";
export type SubagentStripPhases = ReadonlyMap<string, SubagentStripPhase>;

export const NO_SUBAGENT_STRIP_PHASES: SubagentStripPhases = new Map();

/**
 * Folds the latest roster into the tracked phases, returning the same map
 * when nothing changed.
 */
export function observeSubagentStrip(
  phases: SubagentStripPhases,
  subagents: ReadonlyArray<OrchestrationV2Subagent>,
): SubagentStripPhases {
  let next: Map<string, SubagentStripPhase> | null = null;
  for (const subagent of subagents) {
    const phase = phases.get(subagent.id);
    if (isActiveSubagentStatus(subagent.status)) {
      if (phase === "working") continue;
      next ??= new Map(phases);
      next.set(subagent.id, "working");
    } else if (phase === "working") {
      next ??= new Map(phases);
      next.set(subagent.id, "settling");
    }
  }
  return next ?? phases;
}

/** Ends an agent's linger, unless it started working again meanwhile. */
export function expireSubagentStripPhase(
  phases: SubagentStripPhases,
  id: string,
): SubagentStripPhases {
  if (phases.get(id) !== "settling") return phases;
  const next = new Map(phases);
  next.set(id, "expired");
  return next;
}

/**
 * Settled agents that still get a chip. An agent tracked as working counts
 * too: its status can flip a render before the tracker catches up, and
 * dropping the chip for that one frame makes the strip blink.
 */
export function lingeringSubagentIds(phases: SubagentStripPhases): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const [id, phase] of phases) if (phase !== "expired") ids.add(id);
  return ids;
}

function spawnOrder(left: OrchestrationV2Subagent, right: OrchestrationV2Subagent): number {
  const at = (subagent: OrchestrationV2Subagent) =>
    DateTime.toEpochMillis(subagent.startedAt ?? subagent.updatedAt);
  return at(left) - at(right) || left.id.localeCompare(right.id);
}

/**
 * The strip for a thread: working agents plus recently settled ones, in spawn
 * order so chips never reshuffle. Deliberately not scoped to the active run:
 * each background agent that finishes wakes the parent into a new run, and a
 * run-scoped strip would vanish for every wake. Null hides the strip.
 */
export function deriveSubagentStrip(
  subagents: ReadonlyArray<OrchestrationV2Subagent>,
  lingeringIds: ReadonlySet<string>,
  maxVisible = SUBAGENT_STRIP_MAX_VISIBLE,
): SubagentStrip | null {
  const shown = subagents
    .filter((subagent) => isActiveSubagentStatus(subagent.status) || lingeringIds.has(subagent.id))
    .toSorted(spawnOrder);
  const chips: SubagentStripChip[] = [];
  let workingCount = 0;
  for (const subagent of shown) {
    const state = chipState(subagent.status);
    if (state === "working") workingCount += 1;
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
