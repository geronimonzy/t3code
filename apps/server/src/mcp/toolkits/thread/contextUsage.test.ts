import { describe, expect, it } from "vite-plus/test";

import { latestContextUsage } from "./contextUsage.ts";

const usage = (usedTokens: number, maxTokens: number | null, updatedAt: string) => ({
  tokenUsage: { usedTokens, ...(maxTokens === null ? {} : { maxTokens }), updatedAt },
});

describe("latestContextUsage", () => {
  it("reports nothing before any turn reported usage", () => {
    expect(latestContextUsage([{}, {}])).toEqual({
      usedTokens: null,
      maxTokens: null,
      percentUsed: null,
      updatedAt: null,
      summary: "No context usage reported yet.",
    });
  });

  it("takes the newest report, not the last turn in the list", () => {
    const result = latestContextUsage([
      usage(150_000, 200_000, "2026-11-05T12:00:05Z"),
      usage(20_000, 200_000, "2026-11-05T12:00:01Z"),
    ]);
    expect(result.usedTokens).toBe(150_000);
    expect(result.percentUsed).toBe(75);
    expect(result.summary).toBe("150k of 200k tokens used (75%)");
  });

  it("reads a 1m window", () => {
    expect(latestContextUsage([usage(221_000, 1_000_000, "2026-11-05T12:00:00Z")]).summary).toBe(
      "221k of 1m tokens used (22%)",
    );
  });

  it("says so when the provider gave no limit", () => {
    const result = latestContextUsage([usage(42_000, null, "2026-11-05T12:00:00Z")]);
    expect(result.percentUsed).toBeNull();
    expect(result.summary).toBe("42k tokens used (limit unknown)");
  });
});
