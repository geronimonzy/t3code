import type { OrchestrationV2ProviderTurn } from "@t3tools/contracts";

export interface ContextUsage {
  readonly usedTokens: number | null;
  readonly maxTokens: number | null;
  readonly percentUsed: number | null;
  readonly updatedAt: string | null;
  readonly summary: string;
}

const formatTokens = (tokens: number) =>
  tokens >= 1_000_000
    ? `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1)}m`
    : tokens >= 1_000
      ? `${Math.round(tokens / 1_000)}k`
      : `${tokens}`;

/**
 * The calling thread's context fill for `t3_context_usage`: the newest token usage any of its
 * provider turns reported. Turns update it live, so a call mid-turn sees the current turn.
 */
export function latestContextUsage(
  turns: ReadonlyArray<Pick<OrchestrationV2ProviderTurn, "tokenUsage">>,
): ContextUsage {
  let latest: NonNullable<OrchestrationV2ProviderTurn["tokenUsage"]> | null = null;
  for (const { tokenUsage } of turns) {
    if (tokenUsage === undefined) continue;
    if (latest === null || Date.parse(tokenUsage.updatedAt) >= Date.parse(latest.updatedAt)) {
      latest = tokenUsage;
    }
  }
  if (latest === null) {
    return {
      usedTokens: null,
      maxTokens: null,
      percentUsed: null,
      updatedAt: null,
      summary: "No context usage reported yet.",
    };
  }
  const maxTokens = latest.maxTokens ?? null;
  const percentUsed =
    maxTokens === null || maxTokens === 0
      ? null
      : Math.round((latest.usedTokens / maxTokens) * 100);
  return {
    usedTokens: latest.usedTokens,
    maxTokens,
    percentUsed,
    updatedAt: latest.updatedAt,
    summary:
      maxTokens === null
        ? `${formatTokens(latest.usedTokens)} tokens used (limit unknown)`
        : `${formatTokens(latest.usedTokens)} of ${formatTokens(maxTokens)} tokens used (${percentUsed}%)`,
  };
}
