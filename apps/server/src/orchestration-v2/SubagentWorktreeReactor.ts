import { CommandId, type OrchestrationV2DomainEvent, type ThreadId } from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as Crypto from "effect/Crypto";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";

import { forkParked } from "../serverActivation.ts";
import * as Orchestrator from "./Orchestrator.ts";
import * as ProjectionStore from "./ProjectionStore.ts";

export type SubagentWorktreeAction =
  | {
      readonly kind: "point";
      readonly childThreadId: ThreadId;
      readonly path: string;
      readonly branch: string | null;
    }
  // The worktree is gone: the child follows its parent's checkout again.
  | {
      readonly kind: "release";
      readonly childThreadId: ThreadId;
      readonly parentThreadId: ThreadId;
    };

/** What a subagent update asks of its child thread's workspace, if anything. */
export function subagentWorktreeAction(
  event: OrchestrationV2DomainEvent,
  pointedChildThreads: ReadonlyMap<ThreadId, string>,
): SubagentWorktreeAction | null {
  if (event.type !== "subagent.updated") return null;
  const { childThreadId, origin, worktree } = event.payload;
  // A delegated task owns its thread's workspace and provider sessions.
  if (origin !== "provider_native" || childThreadId === null || worktree === undefined) {
    return null;
  }
  if (worktree === null) {
    return { kind: "release", childThreadId, parentThreadId: event.payload.threadId };
  }
  if (pointedChildThreads.get(childThreadId) === worktree.path) return null;
  return { kind: "point", childThreadId, path: worktree.path, branch: worktree.branch };
}

/**
 * Points a subagent's child thread at the git worktree the subagent works in,
 * once its provider observes one, and back at the parent's checkout once that
 * worktree is removed. The child's branch, changes, and editor and pull
 * request actions follow the worktree meanwhile. A provider-native child
 * thread binds no provider session of its own, so moving it detaches nothing.
 */
export class SubagentWorktreeReactor extends Context.Service<
  SubagentWorktreeReactor,
  { readonly start: () => Effect.Effect<void, never, Scope.Scope> }
>()("t3/orchestration-v2/SubagentWorktreeReactor") {}

/** @public Service construction is part of the canonical Effect module API. */
export const make = Effect.gen(function* () {
  const engine = yield* Orchestrator.OrchestratorV2;
  const projections = yield* ProjectionStore.ProjectionStoreV2;
  const crypto = yield* Crypto.Crypto;
  // Every later update of the subagent repeats its worktree; point each child once.
  const pointedChildThreads = new Map<ThreadId, string>();

  const start: SubagentWorktreeReactor["Service"]["start"] = Effect.fn(
    "SubagentWorktreeReactor.start",
  )(function* () {
    yield* forkParked(
      Stream.runForEach(engine.streamDomainEvents, (event) => {
        const action = subagentWorktreeAction(event, pointedChildThreads);
        if (action === null) return Effect.void;
        return Effect.gen(function* () {
          let workspace: { readonly branch: string | null; readonly worktreePath: string | null };
          if (action.kind === "point") {
            pointedChildThreads.set(action.childThreadId, action.path);
            workspace = { branch: action.branch, worktreePath: action.path };
          } else {
            pointedChildThreads.delete(action.childThreadId);
            // Read both threads, so a release after a restart still finds a moved child.
            const parent = yield* projections.getThreadShell(action.parentThreadId);
            const child = yield* projections.getThreadShell(action.childThreadId);
            if (parent === null || child === null || child.worktreePath === parent.worktreePath) {
              return;
            }
            workspace = { branch: parent.branch, worktreePath: parent.worktreePath };
          }
          const uuid = yield* crypto.randomUUIDv4;
          yield* engine.dispatch({
            type: "thread.metadata.update",
            commandId: CommandId.make(`server:subagent-worktree:${action.childThreadId}:${uuid}`),
            threadId: action.childThreadId,
            ...workspace,
          });
        }).pipe(
          Effect.catchCause((cause) =>
            Effect.logWarning("subagent worktree update skipped", {
              threadId: action.childThreadId,
              cause,
            }),
          ),
        );
      }).pipe(
        Effect.catchCause((cause) =>
          Effect.logWarning("subagent worktree event stream failed", { cause }),
        ),
      ),
    );
  });

  return { start } satisfies SubagentWorktreeReactor["Service"];
});

export const layer = Layer.effect(SubagentWorktreeReactor, make);
