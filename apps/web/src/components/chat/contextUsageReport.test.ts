import { describe, expect, it } from "vite-plus/test";

import { parseContextUsageReport, parseTokenCount } from "./contextUsageReport";

const REPORT = `## Context Usage

**Model:** claude-opus-5-5
**Tokens:** 710.6k / 1m (71%)

### Estimated usage by category

| Category | Tokens | Percentage |
|----------|--------|------------|
| System prompt | 5.3k | 0.5% |
| MCP tools (deferred) | 42.9k | 4.3% |
| Messages | 682.4k | 68.2% |
| Free space | 256.4k | 25.6% |

### MCP Tools

| Tool | Server | Tokens |
|------|--------|--------|
| mcp__t3-code__delegate_task | t3-code | 1.4k |
| mcp__t3-code__task_status | t3-code | 400 |

### Skills

| Skill | Source | Tokens |
|-------|--------|--------|
| dataviz | Built-in | ~480 |
| goal | User | < 20 |
`;

describe("parseContextUsageReport", () => {
  it("reads the model, totals, categories, and breakdowns", () => {
    const report = parseContextUsageReport(REPORT);
    expect(report?.model).toBe("claude-opus-5-5");
    expect(report?.tokens).toBe("710.6k / 1m (71%)");
    expect(report?.percentage).toBe(71);
    expect(report?.categories.map((category) => [category.name, category.deferred])).toEqual([
      ["System prompt", false],
      ["MCP tools (deferred)", true],
      ["Messages", false],
      ["Free space", false],
    ]);
    expect(report?.categories[2]?.percentage).toBe(68.2);
    expect(report?.details.map((table) => [table.title, table.rows.length])).toEqual([
      ["MCP Tools", 2],
      ["Skills", 2],
    ]);
  });

  it("leaves other messages alone", () => {
    expect(parseContextUsageReport("## Context\n\nSome prose about context usage.")).toBeNull();
    expect(parseContextUsageReport("## Context Usage\n\nNo tables yet.")).toBeNull();
  });

  it("reads token counts as the report prints them", () => {
    expect(parseTokenCount("5.3k")).toBe(5_300);
    expect(parseTokenCount("1m")).toBe(1_000_000);
    expect(parseTokenCount("~480")).toBe(480);
    expect(parseTokenCount("< 20")).toBe(20);
  });
});
