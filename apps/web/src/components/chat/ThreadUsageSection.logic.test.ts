import { describe, expect, it } from "vite-plus/test";

import type { ContextWindowSnapshot } from "../../lib/contextWindow";
import {
  deriveThreadUsageSummary,
  formatThreadCostUsd,
  formatThreadRunUsage,
  formatThreadTokenUsage,
} from "./ThreadUsageSection.logic";

const snapshot = (overrides: Partial<ContextWindowSnapshot>): ContextWindowSnapshot => ({
  usedTokens: 368_880,
  totalProcessedTokens: null,
  maxTokens: 1_000_000,
  remainingTokens: 631_120,
  usedPercentage: 36.888,
  remainingPercentage: 63.112,
  inputTokens: 368_864,
  cachedInputTokens: 366_363,
  outputTokens: 16,
  reasoningOutputTokens: 0,
  lastUsedTokens: null,
  lastInputTokens: null,
  lastCachedInputTokens: null,
  lastOutputTokens: null,
  lastReasoningOutputTokens: null,
  toolUses: null,
  durationMs: null,
  compactsAutomatically: true,
  autoCompactThreshold: null,
  cost: null,
  updatedAt: "2026-10-10T17:52:47.529Z",
  ...overrides,
});

describe("thread usage formatting", () => {
  it("shows the latest turn's input and output", () => {
    expect(formatThreadTokenUsage(snapshot({}))).toBe("369k in · 16 out");
    expect(formatThreadTokenUsage(snapshot({ inputTokens: null, outputTokens: null }))).toBeNull();
  });

  it("keeps small costs readable", () => {
    expect(formatThreadCostUsd(12.345)).toBe("$12.35");
    expect(formatThreadCostUsd(0.0042)).toBe("$0.0042");
    expect(formatThreadCostUsd(0)).toBe("$0.00");
  });
});

describe("subagent thread usage", () => {
  const ownContext = snapshot({});

  it("shows a subagent's own usage and nothing of any conversation usage", () => {
    const usage = deriveThreadUsageSummary({
      subagentUsage: {
        context: {
          usedTokens: 21_007,
          maxTokens: 200_000,
          inputTokens: 21_000,
          outputTokens: 7,
          updatedAt: "2026-10-15T00:00:00.000Z",
        },
        totalTokens: 23_500,
        toolUses: 5,
        durationMs: 63_000,
      },
      context: ownContext,
      costUsd: 0.21,
    });
    expect(usage.costUsd).toBeNull();
    expect(usage.context?.usedTokens).toBe(21_007);
    expect(usage.context?.maxTokens).toBe(200_000);
    expect(usage.context && formatThreadTokenUsage(usage.context)).toBe("21k in · 7 out");
    expect(usage.run && formatThreadRunUsage(usage.run)).toBe("5 tool uses · 24k tokens · 1m 3s");
  });

  it("shows totals alone before the subagent's first response", () => {
    const usage = deriveThreadUsageSummary({
      subagentUsage: { toolUses: 1 },
      context: null,
      costUsd: null,
    });
    expect(usage.context).toBeNull();
    expect(usage.run && formatThreadRunUsage(usage.run)).toBe("1 tool use");
  });

  it("keeps a thread's own usage when it has no subagent usage", () => {
    expect(
      deriveThreadUsageSummary({ subagentUsage: null, context: ownContext, costUsd: 0.21 }),
    ).toEqual({ context: ownContext, costUsd: 0.21 });
  });
});
