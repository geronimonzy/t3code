import { describe, expect, it } from "vite-plus/test";

import type { ContextWindowSnapshot } from "../../lib/contextWindow";
import {
  formatThreadContextUsage,
  formatThreadCostUsd,
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
  it("shows context as a share of the window", () => {
    expect(formatThreadContextUsage(snapshot({}))).toBe("37% · 369k / 1m");
  });

  it("falls back to a token count when the window size is unknown", () => {
    expect(formatThreadContextUsage(snapshot({ maxTokens: null, usedPercentage: null }))).toBe(
      "369k tokens",
    );
  });

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
