import { formatContextWindowTokens, type ContextWindowSnapshot } from "../../lib/contextWindow";

/** What the thread panel's Usage section shows; null fields are hidden. */
export interface ThreadUsageSummary {
  readonly context: ContextWindowSnapshot | null;
  readonly costUsd: number | null;
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

export function formatThreadCostUsd(costUsd: number): string {
  return `$${costUsd.toFixed(costUsd > 0 && costUsd < 0.01 ? 4 : 2)}`;
}

export function hasThreadUsage(usage: ThreadUsageSummary): boolean {
  return usage.context !== null || usage.costUsd !== null;
}
