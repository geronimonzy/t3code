import { CommandId, type OrchestrationV2DomainEvent, type ThreadId } from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as Crypto from "effect/Crypto";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";

import { forkParked } from "../serverActivation.ts";
import * as Orchestrator from "./Orchestrator.ts";

/** The child thread a subagent update should point at a worktree, if any. */
export function subagentWorktreeTarget(
  event: OrchestrationV2DomainEvent,
  pointedChildThreads: ReadonlyMap<ThreadId, string>,
): {
  readonly childThreadId: ThreadId;
  readonly path: string;
  readonly branch: string | null;
} | null {
  if (event.type !== "subagent.updated") return null;
  const { childThreadId, origin, worktree } = event.payload;
  // A delegated task owns its thread's workspace and provider sessions.
  if (origin !== "provider_native" || childThreadId === null || worktree === undefined) {
    return null;
  }
  if (pointedChildThreads.get(childThreadId) === worktree.path) return null;
  return { childThreadId, path: worktree.path, branch: worktree.branch };
}

/**
 * Points a subagent's child thread at the git worktree the subagent works in,
 * once its provider observes one. The child's branch, changes, and editor and
 * pull request actions then follow that worktree instead of the parent's
 * checkout. A provider-native child thread binds no provider session of its
 * own, so moving it detaches nothing.
 */
export class SubagentWorktreeReactor extends Context.Service<
  SubagentWorktreeReactor,
  { readonly start: () => Effect.Effect<void, never, Scope.Scope> }
>()("t3/orchestration-v2/SubagentWorktreeReactor") {}

/** @public Service construction is part of the canonical Effect module API. */
export const make = Effect.gen(function* () {
  const engine = yield* Orchestrator.OrchestratorV2;
  const crypto = yield* Crypto.Crypto;
  // Every later update of the subagent repeats its worktree; point each child once.
  const pointedChildThreads = new Map<ThreadId, string>();

  const start: SubagentWorktreeReactor["Service"]["start"] = Effect.fn(
    "SubagentWorktreeReactor.start",
  )(function* () {
    yield* forkParked(
      Stream.runForEach(engine.streamDomainEvents, (event) => {
        const target = subagentWorktreeTarget(event, pointedChildThreads);
        if (target === null) return Effect.void;
        pointedChildThreads.set(target.childThreadId, target.path);
        return Effect.gen(function* () {
          const uuid = yield* crypto.randomUUIDv4;
          yield* engine.dispatch({
            type: "thread.metadata.update",
            commandId: CommandId.make(`server:subagent-worktree:${target.childThreadId}:${uuid}`),
            threadId: target.childThreadId,
            branch: target.branch,
            worktreePath: target.path,
          });
        }).pipe(
          Effect.catchCause((cause) =>
            Effect.logWarning("subagent worktree update skipped", {
              threadId: target.childThreadId,
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
