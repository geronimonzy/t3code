import { describe, expect, it } from "vite-plus/test";
import {
  NodeId,
  ProviderDriverKind,
  ProviderInstanceId,
  RunId,
  ThreadId,
  type OrchestrationV2Subagent,
} from "@t3tools/contracts";
import { deriveThreadTurnSubagents } from "@t3tools/client-runtime/state/thread-subagents";
import * as DateTime from "effect/DateTime";

import {
  deriveSubagentStrip,
  liveSubagentIds,
  newlySettledSubagentIds,
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

const activeRun = { id: RunId.make("run-1"), status: "running" } as never;

function turnOf(...subagents: OrchestrationV2Subagent[]) {
  return deriveThreadTurnSubagents({ runs: [activeRun], subagents });
}

describe("deriveSubagentStrip", () => {
  it("is hidden when no subagent is working or lingering", () => {
    expect(deriveSubagentStrip(null, new Set())).toBeNull();
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

describe("newlySettledSubagentIds", () => {
  it("reports only agents that were seen working and have since settled", () => {
    const before = turnOf(subagent("a"), subagent("b"), subagent("c", { status: "completed" }));
    const after = turnOf(
      subagent("a", { status: "completed" }),
      subagent("b"),
      subagent("c", { status: "completed" }),
    );
    expect(newlySettledSubagentIds(liveSubagentIds(before), after)).toEqual(["a"]);
  });

  it("ignores agents that were already settled when first seen", () => {
    const opened = turnOf(subagent("a", { status: "completed" }));
    expect(newlySettledSubagentIds(liveSubagentIds(null), opened)).toEqual([]);
  });
});
