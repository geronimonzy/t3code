import {
  ProviderDriverKind,
  ProviderInstanceId,
  type ServerProvider,
  type ServerProviderUsageLimits,
} from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  highestUsedPercent,
  sidebarUsageReports,
  usageTone,
  usedPercent,
} from "./SidebarUsageLimits.logic";

const now = Date.parse("2026-10-09T12:00:00.000Z");

const limits = (...usedPercents: number[]): ServerProviderUsageLimits => ({
  checkedAt: "2026-10-09T11:59:00.000Z",
  windows: usedPercents.map((usedPercent, index) => ({
    id: `window-${index}`,
    kind: "session",
    label: index === 0 ? "Session" : "Weekly",
    usedPercent,
    windowDurationMins: 300,
    resetsAt: "2026-10-09T14:00:00.000Z",
  })),
});

function provider(
  id: string,
  driver: string,
  overrides: Partial<ServerProvider> = {},
): ServerProvider {
  return {
    instanceId: ProviderInstanceId.make(id),
    driver: ProviderDriverKind.make(driver),
    enabled: true,
    installed: true,
    version: null,
    status: "ready",
    auth: { status: "authenticated", email: `${id}@example.com` },
    checkedAt: "2026-10-09T11:00:00.000Z",
    models: [],
    slashCommands: [],
    skills: [],
    ...overrides,
  };
}

describe("sidebarUsageReports", () => {
  it("reports each provider kind once, in provider order, skipping ones without limits", () => {
    const reports = sidebarUsageReports(
      [
        provider("claude", "claudeAgent", { usageLimits: limits(30, 55) }),
        provider("cursor", "cursor"),
        provider("codex", "codex", { usageLimits: limits(10) }),
        provider("claude-work", "claudeAgent", { usageLimits: limits(80) }),
      ],
      [],
      now,
    );
    expect(reports.map((entry) => entry.driver)).toEqual(["claudeAgent", "codex"]);
    expect(reports[0]!.report.accounts.length).toBeGreaterThan(0);
  });

  it("is empty when no provider reports limits", () => {
    expect(sidebarUsageReports([provider("cursor", "cursor")], [], now)).toEqual([]);
  });
});

describe("used share", () => {
  it("reports the most-spent window across accounts", () => {
    const [entry] = sidebarUsageReports(
      [provider("claude", "claudeAgent", { usageLimits: limits(30, 55) })],
      [],
      now,
    );
    expect(highestUsedPercent(entry!.report)).toBe(55);
  });

  it("clamps and rounds the used share", () => {
    expect(usedPercent({ usedPercent: 79.4 })).toBe(79);
    expect(usedPercent({ usedPercent: 130 })).toBe(100);
    expect(usedPercent({ usedPercent: -5 })).toBe(0);
  });

  it("warns from 75% used and turns critical from 90%", () => {
    expect([usageTone(74), usageTone(75), usageTone(89), usageTone(90)]).toEqual([
      "normal",
      "warning",
      "warning",
      "critical",
    ]);
  });
});
