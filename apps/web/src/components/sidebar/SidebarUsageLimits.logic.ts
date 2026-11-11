import type {
  ServerProvider,
  UsageLimitSourceSnapshots,
  UsageLimitsReport,
} from "@t3tools/contracts";
import { collectProviderUsageLimits, hasProviderUsageLimits } from "@t3tools/shared/usageLimits";

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

/** Share of the window's quota spent, 0..100, as the providers' own usage pages show it. */
export function usedPercent(window: { readonly usedPercent: number }): number {
  return Math.round(Math.max(0, Math.min(100, window.usedPercent)));
}

/** Bar tone by how much is spent: calm, then a warning, then nearly out. */
export function usageTone(used: number): "normal" | "warning" | "critical" {
  if (used >= 90) return "critical";
  if (used >= 75) return "warning";
  return "normal";
}

/** The most-spent window for a provider, for the collapsed one-line summary. */
export function highestUsedPercent(report: UsageLimitsReport): number | null {
  const used = report.accounts.flatMap((account) => account.limits.windows.map(usedPercent));
  return used.length === 0 ? null : Math.max(...used);
}
