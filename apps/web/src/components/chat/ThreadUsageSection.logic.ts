import type { OrchestrationV2SubagentUsage } from "@t3tools/contracts";
import { formatDuration } from "@t3tools/shared/orchestrationTiming";

import {
  deriveLatestContextWindowSnapshot,
  formatContextWindowTokens,
  type ContextWindowSnapshot,
} from "../../lib/contextWindow";

/** A subagent run's totals as its provider reports them. */
export type ThreadUsageRun = Omit<OrchestrationV2SubagentUsage, "context">;

/** What the thread panel's Usage section shows; null fields are hidden. */
export interface ThreadUsageSummary {
  readonly context: ContextWindowSnapshot | null;
  readonly costUsd: number | null;
  readonly run?: ThreadUsageRun | null;
}

/**
 * A Claude subagent's child thread has no provider conversation of its own, so
 * its usage comes from its subagent record, and only from there. Other threads
 * (Codex subagent children included) use their own provider turns.
 */
export function deriveThreadUsageSummary(input: {
  readonly subagentUsage: OrchestrationV2SubagentUsage | null | undefined;
  readonly context: ContextWindowSnapshot | null;
  readonly costUsd: number | null;
}): ThreadUsageSummary {
  if (input.subagentUsage == null) {
    return { context: input.context, costUsd: input.costUsd };
  }
  const { context, ...run } = input.subagentUsage;
  return {
    context: context === undefined ? null : deriveLatestContextWindowSnapshot([], context),
    costUsd: null,
    run: Object.keys(run).length === 0 ? null : run,
  };
}

/** "37% · 369k / 1m", or the bare token count when the window size is unknown. */
export function formatThreadContextUsage(context: ContextWindowSnapshot): string {
  const used = formatContextWindowTokens(context.usedTokens);
  if (context.maxTokens == null || context.usedPercentage === null) return `${used} tokens`;
  return `${Math.round(context.usedPercentage)}% · ${used} / ${formatContextWindowTokens(context.maxTokens)}`;
}

/** The latest turn's input and output, the counts a status line usually shows. */
export function formatThreadTokenUsage(context: ContextWindowSnapshot): string | null {
  if (context.inputTokens == null && context.outputTokens == null) return null;
  return `${formatContextWindowTokens(context.inputTokens ?? null)} in · ${formatContextWindowTokens(context.outputTokens ?? null)} out`;
}

/** "12 tool uses · 45k tokens · 1m 3s", the way Claude Code sums up an agent. */
export function formatThreadRunUsage(run: ThreadUsageRun): string | null {
  const parts = [
    run.toolUses === undefined
      ? null
      : `${run.toolUses} ${run.toolUses === 1 ? "tool use" : "tool uses"}`,
    run.totalTokens === undefined ? null : `${formatContextWindowTokens(run.totalTokens)} tokens`,
    run.durationMs === undefined ? null : formatDuration(run.durationMs),
  ].filter((part) => part !== null);
  return parts.length === 0 ? null : parts.join(" · ");
}

export function formatThreadCostUsd(costUsd: number): string {
  return `$${costUsd.toFixed(costUsd > 0 && costUsd < 0.01 ? 4 : 2)}`;
}

export function hasThreadUsage(usage: ThreadUsageSummary): boolean {
  return usage.context !== null || usage.costUsd !== null || usage.run != null;
}
