import {
  EventId,
  NodeId,
  ProviderDriverKind,
  ProviderInstanceId,
  ThreadId,
  type OrchestrationV2DomainEvent,
  type OrchestrationV2Subagent,
} from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";
import * as DateTime from "effect/DateTime";

import { subagentWorktreeAction } from "./SubagentWorktreeReactor.ts";

const now = DateTime.makeUnsafe("2026-10-10T12:00:00.000Z");
const childThreadId = ThreadId.make("thread:child");
const worktree = { path: "/repo/.claude/worktrees/agent-1", branch: "worktree-agent-1" };

const subagentUpdated = (
  overrides: Partial<OrchestrationV2Subagent>,
): OrchestrationV2DomainEvent => ({
  id: EventId.make("event:subagent"),
  type: "subagent.updated",
  threadId: ThreadId.make("thread:parent"),
  occurredAt: now,
  payload: {
    id: NodeId.make("node:subagent"),
    threadId: ThreadId.make("thread:parent"),
    runId: null,
    parentNodeId: NodeId.make("node:root"),
    origin: "provider_native",
    createdBy: "agent",
    driver: ProviderDriverKind.make("claudeAgent"),
    providerInstanceId: ProviderInstanceId.make("claudeAgent"),
    providerThreadId: null,
    childThreadId,
    nativeTaskRef: null,
    prompt: "Fix it.",
    title: null,
    model: null,
    status: "running",
    result: null,
    startedAt: now,
    completedAt: null,
    updatedAt: now,
    ...overrides,
  },
});

describe("subagentWorktreeAction", () => {
  it("points a native subagent's child thread at its worktree", () => {
    expect(subagentWorktreeAction(subagentUpdated({ worktree }), new Map())).toEqual({
      kind: "point",
      childThreadId,
      ...worktree,
    });
  });

  it("points each child thread once per worktree", () => {
    const pointed = new Map([[childThreadId, worktree.path]]);
    expect(subagentWorktreeAction(subagentUpdated({ worktree }), pointed)).toBeNull();
  });

  it("returns the child to its parent's checkout once the worktree is gone", () => {
    expect(subagentWorktreeAction(subagentUpdated({ worktree: null }), new Map())).toEqual({
      kind: "release",
      childThreadId,
      parentThreadId: ThreadId.make("thread:parent"),
    });
  });

  it("leaves subagents without a worktree, delegated tasks, and other events alone", () => {
    expect(subagentWorktreeAction(subagentUpdated({}), new Map())).toBeNull();
    expect(
      subagentWorktreeAction(subagentUpdated({ worktree, origin: "app_owned" }), new Map()),
    ).toBeNull();
    expect(
      subagentWorktreeAction(subagentUpdated({ worktree, childThreadId: null }), new Map()),
    ).toBeNull();
  });
});
