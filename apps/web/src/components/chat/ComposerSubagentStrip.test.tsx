import {
  NodeId,
  ProviderDriverKind,
  ProviderInstanceId,
  RunId,
  ThreadId,
  type OrchestrationV2Subagent,
  type OrchestrationV2ThreadProjection,
} from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";
import { act, useLayoutEffect } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";

import { useComposerSubagentStrip } from "./ComposerSubagentStrip";
import { SUBAGENT_STRIP_DONE_LINGER_MS, type SubagentStrip } from "./ComposerSubagentStrip.logic";

type Projection = Pick<OrchestrationV2ThreadProjection, "subagents" | "turnItems">;

function agent(id: string, status: OrchestrationV2Subagent["status"]): OrchestrationV2Subagent {
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
    prompt: "Sleep then report",
    title: `Agent ${id}`,
    model: null,
    status,
    result: null,
    startedAt: DateTime.makeUnsafe("2026-10-08T00:00:00.000Z"),
    completedAt: null,
    updatedAt: DateTime.makeUnsafe("2026-10-08T00:00:01.000Z"),
  };
}

const finishNotice = {
  type: "notification",
  source: { kind: "subagent", childThreadId: ThreadId.make("child-a") },
  outcome: "completed",
  summary: "Agent a finished",
  updatedAt: DateTime.makeUnsafe("2026-10-08T00:00:10.000Z"),
} as unknown as Projection["turnItems"][number];

let renderer: ReactTestRenderer;
let strip: SubagentStrip | null = null;

function Probe({ projection }: { projection: Projection }) {
  const value = useComposerSubagentStrip(projection, "env:thread-1");
  useLayoutEffect(() => {
    strip = value;
  });
  return null;
}

const states = () => strip?.visible.map((chip) => `${chip.id}:${chip.state}`) ?? null;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  act(() => {
    renderer = create(
      <Probe
        projection={{ subagents: [agent("a", "running"), agent("b", "running")], turnItems: [] }}
      />,
    );
  });
});

afterEach(() => {
  act(() => renderer.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("shows a finished agent as done for the linger, then drops it", () => {
  act(() =>
    renderer.update(
      <Probe
        projection={{ subagents: [agent("a", "completed"), agent("b", "running")], turnItems: [] }}
      />,
    ),
  );
  expect(states()).toEqual(["a:done", "b:working"]);
  act(() => vi.advanceTimersByTime(SUBAGENT_STRIP_DONE_LINGER_MS - 1));
  expect(states()).toEqual(["a:done", "b:working"]);
  act(() => vi.advanceTimersByTime(1));
  expect(states()).toEqual(["b:working"]);
});

it("turns done on the wake notification, and stays done when the status catches up", () => {
  const running = [agent("a", "running"), agent("b", "running")];
  act(() =>
    renderer.update(<Probe projection={{ subagents: running, turnItems: [finishNotice] }} />),
  );
  expect(states()).toEqual(["a:done", "b:working"]);
  act(() => vi.advanceTimersByTime(1_000));
  act(() =>
    renderer.update(
      <Probe
        projection={{
          subagents: [agent("a", "completed"), agent("b", "running")],
          turnItems: [finishNotice],
        }}
      />,
    ),
  );
  // The catch-up must not restart the linger.
  act(() => vi.advanceTimersByTime(SUBAGENT_STRIP_DONE_LINGER_MS - 1_000));
  expect(states()).toEqual(["b:working"]);
});

it("keeps the strip up with a done chip when the last agent finishes", () => {
  act(() =>
    renderer.update(
      <Probe
        projection={{
          subagents: [agent("a", "completed"), agent("b", "completed")],
          turnItems: [],
        }}
      />,
    ),
  );
  expect(states()).toEqual(["a:done", "b:done"]);
  act(() => vi.advanceTimersByTime(SUBAGENT_STRIP_DONE_LINGER_MS));
  expect(strip).toBeNull();
});
