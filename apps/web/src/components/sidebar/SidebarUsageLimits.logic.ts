import type {
  ServerProvider,
  UsageLimitSourceSnapshots,
  UsageLimitsReport,
} from "@t3tools/contracts";
import {
  collectProviderUsageLimits,
  hasProviderUsageLimits,
  remainingPercent,
} from "@t3tools/shared/usageLimits";

export interface SidebarUsageReport {
  readonly driver: ServerProvider["driver"];
  readonly report: UsageLimitsReport;
}

/**
 * One limits report per provider kind (Claude, Codex, ...) in provider order,
 * built from the same snapshots as Usage → Limits and the /usage-limits panel.
 */
export function sidebarUsageReports(
  providers: ReadonlyArray<ServerProvider>,
  sources: UsageLimitSourceSnapshots,
  now: number,
): ReadonlyArray<SidebarUsageReport> {
  const reports: SidebarUsageReport[] = [];
  const seen = new Set<ServerProvider["driver"]>();
  for (const provider of providers) {
    if (seen.has(provider.driver)) continue;
    seen.add(provider.driver);
    if (!hasProviderUsageLimits(provider.driver, providers, sources)) continue;
    const report = collectProviderUsageLimits(provider.instanceId, providers, sources, now);
    if (report !== null && report.accounts.length > 0) {
      reports.push({ driver: provider.driver, report });
    }
  }
  return reports;
}

/** The tightest window left for a provider, for the collapsed one-line summary. */
export function lowestRemainingPercent(report: UsageLimitsReport): number | null {
  const remaining = report.accounts.flatMap((account) =>
    account.limits.windows.map((window) => remainingPercent(window)),
  );
  return remaining.length === 0 ? null : Math.min(...remaining);
}
