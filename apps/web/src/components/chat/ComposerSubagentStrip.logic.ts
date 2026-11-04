import type { OrchestrationV2Subagent, ThreadId } from "@t3tools/contracts";
import type { ThreadStructureTurnItem } from "@t3tools/client-runtime/state/models";
import { formatSubagentDisplayTitle } from "@t3tools/client-runtime/state/subagent-display";
import { isActiveSubagentStatus } from "@t3tools/client-runtime/state/subagentRuntime";
import { notificationChildThreadId } from "@t3tools/client-runtime/state/thread-execution";
import * as DateTime from "effect/DateTime";

import { mascotCharacterForDriver, type MascotCharacter } from "../../mascot/mascotAnimations";

/** How long a finished chip stays in the strip before it leaves. */
export const SUBAGENT_STRIP_DONE_LINGER_MS = 5_000;
export const SUBAGENT_STRIP_MAX_VISIBLE = 3;

export type SubagentStripChipState = "working" | "input" | "done" | "failed" | "stopped";

export interface SubagentStripChip {
  readonly id: string;
  readonly childThreadId: ThreadId | null;
  readonly title: string;
  readonly progress: string | null;
  readonly state: SubagentStripChipState;
  /** Cut off by a restart: stays until resumed or dismissed, unlike a deliberate stop. */
  readonly interrupted: boolean;
  /** The branch of the worktree the agent works in, when it is not the parent's checkout. */
  readonly worktreeBranch: string | null;
  readonly character: MascotCharacter;
}

export interface SubagentStrip {
  readonly visible: ReadonlyArray<SubagentStripChip>;
  readonly overflow: ReadonlyArray<SubagentStripChip>;
  readonly workingCount: number;
}

export function subagentChipState(
  status: OrchestrationV2Subagent["status"],
): SubagentStripChipState {
  // Waiting means the agent needs the user, e.g. an approval.
  if (status === "waiting") return "input";
  if (isActiveSubagentStatus(status)) return "working";
  if (status === "completed" || status === "idle") return "done";
  if (status === "failed") return "failed";
  return "stopped";
}

function chipTitle(subagent: OrchestrationV2Subagent): string {
  const title = subagent.title?.trim() || subagent.prompt.trim().split("\n", 1)[0] || "Subagent";
  return formatSubagentDisplayTitle(title);
}

/** A worktree's branch, or its folder name when it has none checked out. */
export function subagentWorktreeBranch(
  worktree: { readonly path: string; readonly branch: string | null } | undefined | null,
): string | null {
  if (!worktree) return null;
  return (
    worktree.branch ??
    (worktree.path
      .replace(/[\\/]+$/, "")
      .split(/[\\/]/)
      .at(-1) ||
      null)
  );
}

// The quiet thread's items: streamed text items carry no timestamp, a full projection's do.
type TurnItem = ThreadStructureTurnItem;

/**
 * A background agent's own status only settles once the parent wakes and
 * replays its completion, but the wake's notification lands in the timeline
 * first. Settles working agents that already have one, so the strip agrees
 * with the timeline. Returns the same array when nothing changes.
 */
export function applySubagentNotifications(
  subagents: ReadonlyArray<OrchestrationV2Subagent>,
  turnItems: ReadonlyArray<TurnItem>,
): ReadonlyArray<OrchestrationV2Subagent> {
  const working = new Map<ThreadId, OrchestrationV2Subagent>();
  let earliestStart = Number.POSITIVE_INFINITY;
  for (const subagent of subagents) {
    if (subagent.childThreadId === null || !isActiveSubagentStatus(subagent.status)) continue;
    working.set(subagent.childThreadId, subagent);
    const startedAt = DateTime.toEpochMillis(subagent.startedAt ?? subagent.updatedAt);
    earliestStart = Math.min(earliestStart, startedAt);
  }
  if (working.size === 0) return subagents;

  const notified = new Map<string, OrchestrationV2Subagent["status"]>();
  // Newest first, stopping before anything older than the oldest working agent.
  for (let index = turnItems.length - 1; index >= 0; index -= 1) {
    const item = turnItems[index]!;
    if (!("updatedAt" in item)) continue;
    const at = DateTime.toEpochMillis(item.updatedAt);
    if (at < earliestStart) break;
    if (item.type !== "notification") continue;
    const childThreadId = notificationChildThreadId(item.source);
    const subagent = childThreadId === undefined ? undefined : working.get(childThreadId);
    // "updated" and "unknown" report progress, not an ending.
    const status =
      item.outcome === "updated" || item.outcome === "unknown" ? undefined : item.outcome;
    if (!subagent || !status || notified.has(subagent.id)) continue;
    // A resumed agent's earlier notification does not end its current activation.
    if (at < DateTime.toEpochMillis(subagent.startedAt ?? subagent.updatedAt)) continue;
    notified.set(subagent.id, status);
  }
  if (notified.size === 0) return subagents;
  return subagents.map((subagent) => {
    const status = notified.get(subagent.id);
    return status === undefined ? subagent : { ...subagent, status };
  });
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
/** The two fields phase tracking reads, so sidebar child threads can share it. */
export interface SubagentLifecycle {
  readonly id: string;
  readonly status: OrchestrationV2Subagent["status"];
}

export function observeSubagentStrip(
  phases: SubagentStripPhases,
  subagents: ReadonlyArray<SubagentLifecycle>,
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

/** Restart recovery ended it; it has no terminal outcome of its own to show. */
function isRestartInterrupted(subagent: OrchestrationV2Subagent): boolean {
  return subagent.endedBy === "restart" && !isActiveSubagentStatus(subagent.status);
}

function spawnOrder(left: OrchestrationV2Subagent, right: OrchestrationV2Subagent): number {
  const at = (subagent: OrchestrationV2Subagent) =>
    DateTime.toEpochMillis(subagent.startedAt ?? subagent.updatedAt);
  return at(left) - at(right) || left.id.localeCompare(right.id);
}

const NO_DISMISSED_IDS: ReadonlySet<string> = new Set();

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
  dismissedIds: ReadonlySet<string> = NO_DISMISSED_IDS,
): SubagentStrip | null {
  const shown = subagents
    .filter((subagent) => {
      if (isActiveSubagentStatus(subagent.status)) return true;
      // A dismissed interrupted chip goes at once, even while it lingers.
      if (isRestartInterrupted(subagent)) return !dismissedIds.has(subagent.id);
      return lingeringIds.has(subagent.id);
    })
    .toSorted(spawnOrder);
  const chips: SubagentStripChip[] = [];
  let workingCount = 0;
  for (const subagent of shown) {
    const state = subagentChipState(subagent.status);
    if (isActiveSubagentStatus(subagent.status)) workingCount += 1;
    const progress = subagent.progress?.trim();
    chips.push({
      id: subagent.id,
      childThreadId: subagent.childThreadId,
      title: chipTitle(subagent),
      progress: state === "working" && progress ? progress : null,
      state,
      interrupted: isRestartInterrupted(subagent),
      worktreeBranch: subagentWorktreeBranch(subagent.worktree),
      character: mascotCharacterForDriver(subagent.driver),
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
