import { describe, expect, it } from "vite-plus/test";
import {
  NodeId,
  ProviderDriverKind,
  ProviderInstanceId,
  RunId,
  ThreadId,
  type OrchestrationV2Subagent,
} from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";

import {
  applySubagentNotifications,
  deriveSubagentStrip,
  expireSubagentStripPhase,
  lingeringSubagentIds,
  NO_SUBAGENT_STRIP_PHASES,
  observeSubagentStrip,
} from "./ComposerSubagentStrip.logic";

function subagent(
  id: string,
  overrides: Partial<Omit<OrchestrationV2Subagent, "id">> = {},
): OrchestrationV2Subagent {
  return {
    id: NodeId.make(id),
    threadId: ThreadId.make("thread-1"),
    runId: RunId.make("run-1"),
    parentNodeId: NodeId.make("node-1"),
    origin: "provider_native",
    createdBy: "agent",
    driver: ProviderDriverKind.make("claudeAgent"),
    providerInstanceId: ProviderInstanceId.make("claudeAgent"),
    providerThreadId: null,
    childThreadId: ThreadId.make(`child-${id}`),
    nativeTaskRef: null,
    prompt: `Prompt for ${id}`,
    title: `Agent ${id}`,
    model: null,
    status: "running",
    result: null,
    // Spawn order follows the id so fixtures read in order.
    startedAt: DateTime.makeUnsafe(`2026-10-08T00:00:0${"abcdef".indexOf(id)}.000Z`),
    completedAt: null,
    updatedAt: DateTime.makeUnsafe("2026-10-08T00:00:10.000Z"),
    ...overrides,
  };
}

const turnOf = (...subagents: OrchestrationV2Subagent[]) => subagents;

describe("deriveSubagentStrip", () => {
  describe("restart-interrupted agents", () => {
    const cut = (id: string, extra: Partial<OrchestrationV2Subagent> = {}) =>
      subagent(id, { status: "cancelled", endedBy: "restart", ...extra });

    it("stays past the linger window as an interrupted stopped chip", () => {
      const strip = deriveSubagentStrip(turnOf(cut("a")), new Set());
      expect(strip?.visible.map((chip) => [chip.state, chip.interrupted])).toEqual([
        ["stopped", true],
      ]);
      expect(strip?.workingCount).toBe(0);
    });

    it("lets a deliberately stopped agent leave", () => {
      const stopped = subagent("a", { status: "cancelled" });
      expect(deriveSubagentStrip(turnOf(stopped), new Set())).toBeNull();
    });

    it("shows as working again once resumed", () => {
      const resumed = subagent("a", { status: "running" });
      const strip = deriveSubagentStrip(turnOf(resumed), new Set());
      expect(strip?.visible.map((chip) => [chip.state, chip.interrupted])).toEqual([
        ["working", false],
      ]);
    });

    it("hides once dismissed", () => {
      expect(deriveSubagentStrip(turnOf(cut("a")), new Set(), 3, new Set(["a"]))).toBeNull();
    });

    it("hides once dismissed even while it still lingers", () => {
      expect(deriveSubagentStrip(turnOf(cut("a")), new Set(["a"]), 3, new Set(["a"]))).toBeNull();
    });
  });

  it("is hidden when no subagent is working or lingering", () => {
    expect(deriveSubagentStrip([], new Set())).toBeNull();
    expect(deriveSubagentStrip(turnOf(subagent("a", { status: "completed" })), new Set())).toBe(
      null,
    );
  });

  it("shows working agents in spawn order with their latest progress", () => {
    const strip = deriveSubagentStrip(
      turnOf(
        subagent("b", { progress: "  Reading package.json  " }),
        subagent("a", { status: "pending" }),
      ),
      new Set(),
    );
    expect(strip?.workingCount).toBe(2);
    expect(strip?.visible.map((chip) => [chip.title, chip.progress, chip.state])).toEqual([
      ["Agent a", null, "working"],
      ["Agent b", "Reading package.json", "working"],
    ]);
  });

  it("marks an agent working in its own worktree with that worktree's branch", () => {
    const strip = deriveSubagentStrip(
      turnOf(
        subagent("a", { worktree: { path: "/repo/.claude/worktrees/agent-a", branch: "fix-a" } }),
        subagent("b", { worktree: { path: "/repo/.claude/worktrees/agent-b", branch: null } }),
        subagent("c"),
      ),
      new Set(),
      5,
    );
    expect(strip?.visible.map((chip) => chip.worktreeBranch)).toEqual(["fix-a", "agent-b", null]);
  });

  it("keeps a settled agent only while it lingers, with its outcome and no stale progress", () => {
    const turn = turnOf(
      subagent("a", { status: "completed", progress: "Last step" }),
      subagent("b", { status: "failed" }),
      subagent("c", { status: "interrupted" }),
    );
    const strip = deriveSubagentStrip(turn, new Set(["a", "b", "c"]));
    expect(strip?.workingCount).toBe(0);
    expect(strip?.visible.map((chip) => [chip.state, chip.progress])).toEqual([
      ["done", null],
      ["failed", null],
      ["stopped", null],
    ]);
    expect(deriveSubagentStrip(turn, new Set(["b"]))?.visible.map((chip) => chip.id)).toEqual([
      "b",
    ]);
  });

  it("keeps agents from earlier runs while the parent runs a wake turn", () => {
    // Each finished background agent wakes the parent into a new run; the
    // strip must not drop the agents still working from the run that spawned them.
    const strip = deriveSubagentStrip(
      [subagent("a"), subagent("b", { runId: RunId.make("run-2") })],
      new Set(),
    );
    expect(strip?.visible.map((chip) => chip.id)).toEqual(["a", "b"]);
  });

  it("falls back to the prompt's first line when the agent has no title", () => {
    const strip = deriveSubagentStrip(
      turnOf(subagent("a", { title: null, prompt: "Find the bug\nthen fix it" })),
      new Set(),
    );
    expect(strip?.visible[0]?.title).toBe("Find the bug");
  });

  it("collapses overflow into +N more, but never for a single hidden chip", () => {
    const four = turnOf(subagent("a"), subagent("b"), subagent("c"), subagent("d"));
    expect(deriveSubagentStrip(four, new Set(), 3)?.visible).toHaveLength(4);

    const five = turnOf(subagent("a"), subagent("b"), subagent("c"), subagent("d"), subagent("e"));
    const strip = deriveSubagentStrip(five, new Set(), 3);
    expect(strip?.visible.map((chip) => chip.id)).toEqual(["a", "b", "c"]);
    expect(strip?.overflow.map((chip) => chip.id)).toEqual(["d", "e"]);
  });
});

describe("subagent strip phases", () => {
  it("keeps a just-finished agent's chip before the tracker catches up", () => {
    const working = observeSubagentStrip(
      NO_SUBAGENT_STRIP_PHASES,
      turnOf(subagent("a"), subagent("b")),
    );
    // Status flipped, tracker not yet updated: the chip must not drop for this frame.
    const flipped = turnOf(subagent("a", { status: "completed" }), subagent("b"));
    expect(
      deriveSubagentStrip(flipped, lingeringSubagentIds(working))?.visible.map(
        (chip) => chip.state,
      ),
    ).toEqual(["done", "working"]);
  });

  it("lingers settled agents until they expire, then drops them", () => {
    const working = observeSubagentStrip(NO_SUBAGENT_STRIP_PHASES, turnOf(subagent("a")));
    const done = turnOf(subagent("a", { status: "completed" }));
    const settling = observeSubagentStrip(working, done);
    expect(settling.get("a")).toBe("settling");
    expect(deriveSubagentStrip(done, lingeringSubagentIds(settling))).not.toBeNull();

    const expired = expireSubagentStripPhase(settling, "a");
    expect(deriveSubagentStrip(done, lingeringSubagentIds(expired))).toBeNull();
    // Observing the same roster again keeps the same map, so nothing re-renders.
    expect(observeSubagentStrip(expired, done)).toBe(expired);
  });

  it("does not expire an agent that resumed working", () => {
    const settling = observeSubagentStrip(
      observeSubagentStrip(NO_SUBAGENT_STRIP_PHASES, turnOf(subagent("a"))),
      turnOf(subagent("a", { status: "idle" })),
    );
    const resumed = observeSubagentStrip(settling, turnOf(subagent("a")));
    expect(resumed.get("a")).toBe("working");
    expect(expireSubagentStripPhase(resumed, "a")).toBe(resumed);
  });

  it("never tracks agents that were already settled when first seen", () => {
    const opened = turnOf(subagent("a", { status: "completed" }));
    const observed = observeSubagentStrip(NO_SUBAGENT_STRIP_PHASES, opened);
    expect(observed).toBe(NO_SUBAGENT_STRIP_PHASES);
    expect(deriveSubagentStrip(opened, lingeringSubagentIds(observed))).toBeNull();
  });
});

type TurnItem = Parameters<typeof applySubagentNotifications>[1][number];

function notification(
  childId: string,
  outcome: "completed" | "failed" | "updated",
  iso = "2026-10-08T00:00:20.000Z",
): TurnItem {
  // Only the fields the strip reads; the rest of a turn item is irrelevant here.
  return {
    type: "notification",
    source: { kind: "subagent", childThreadId: ThreadId.make(`child-${childId}`) },
    outcome,
    summary: "Agent finished",
    updatedAt: DateTime.makeUnsafe(iso),
  } as unknown as TurnItem;
}

describe("applySubagentNotifications", () => {
  const filler = {
    type: "assistant_message",
    updatedAt: DateTime.makeUnsafe("2026-10-08T00:00:21.000Z"),
  } as unknown as TurnItem;

  it("settles a working agent as soon as its wake notification lands", () => {
    const result = applySubagentNotifications(
      [subagent("a"), subagent("b")],
      [notification("a", "completed"), notification("b", "failed"), filler],
    );
    expect(result.map((agent) => agent.status)).toEqual(["completed", "failed"]);
  });

  it("ignores progress updates and notifications from before the agent started", () => {
    const agents = [subagent("a"), subagent("b")];
    const result = applySubagentNotifications(agents, [
      notification("a", "updated"),
      notification("b", "completed", "2026-10-07T23:59:59.000Z"),
    ]);
    expect(result).toBe(agents);
  });

  it("returns the same array when no agent is working", () => {
    const agents = [subagent("a", { status: "completed" })];
    expect(applySubagentNotifications(agents, [notification("a", "completed")])).toBe(agents);
  });
});
