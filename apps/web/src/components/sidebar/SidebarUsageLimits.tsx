import type { UsageLimitSourceSnapshots, UsageLimitsReport } from "@t3tools/contracts";
import { formatResetsIn, limitsNotice, remainingPercent } from "@t3tools/shared/usageLimits";
import * as Schema from "effect/Schema";
import { ChevronDownIcon, GaugeIcon } from "lucide-react";
import { memo, useMemo } from "react";

import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useNowMinute } from "../../hooks/useNowMinute";
import { cn } from "../../lib/utils";
import { useServerConfigs } from "../../state/entities";
import { usePrimaryEnvironmentId } from "../../state/environments";
import { getDriverOption } from "../settings/providerDriverMeta";
import { barColor, WindowBar } from "../usage/UsageLimits";
import {
  lowestRemainingPercent,
  sidebarUsageReports,
  type SidebarUsageReport,
} from "./SidebarUsageLimits.logic";

const COLLAPSED_KEY = "t3code:sidebar-limits-collapsed";
const NO_SOURCES: UsageLimitSourceSnapshots = [];

type Account = UsageLimitsReport["accounts"][number];

function providerLabel(driver: SidebarUsageReport["driver"]): string {
  return getDriverOption(driver)?.label ?? String(driver);
}

/**
 * Account heading: provider and plan. With several accounts of one provider, a
 * non-email display name (or the position) tells them apart; emails stay out
 * of the always-visible sidebar.
 */
function accountHeading(entry: SidebarUsageReport, account: Account, index: number): string {
  const parts = [providerLabel(entry.driver)];
  if (entry.report.accounts.length > 1) {
    const name = account.displayName?.trim();
    parts.push(name && !name.includes("@") ? name : `#${index + 1}`);
  }
  if (account.plan) parts.push(account.plan);
  return parts.join(" · ");
}

/**
 * Subscription limits for the primary environment's providers, one bar per
 * window with its reset countdown. Refreshes with the minute clock so the
 * countdowns stay true without repainting every second.
 */
export const SidebarUsageLimits = memo(function SidebarUsageLimits() {
  const environmentId = usePrimaryEnvironmentId();
  const configs = useServerConfigs();
  const config = environmentId === null ? undefined : configs.get(environmentId);
  const nowMinute = useNowMinute();
  const [collapsed, setCollapsed] = useLocalStorage(COLLAPSED_KEY, false, Schema.Boolean);
  const providers = config?.providers;
  const sources = config?.usageLimitSources ?? NO_SOURCES;
  const now = Date.parse(nowMinute);
  const reports = useMemo(
    () => (providers ? sidebarUsageReports(providers, sources, now) : []),
    [now, providers, sources],
  );
  if (reports.length === 0) return null;

  const summary = reports
    .map((entry) => {
      const lowest = lowestRemainingPercent(entry.report);
      return lowest === null ? null : `${providerLabel(entry.driver)} ${lowest}%`;
    })
    .filter((part) => part !== null)
    .join(" · ");

  return (
    <section aria-label="Usage limits" className="flex flex-col gap-1 px-2 pb-1">
      <button
        type="button"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed(!collapsed)}
        className="flex h-6 w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-start text-sidebar-muted-foreground text-xs hover:bg-sidebar-row-hover focus-visible:outline-2 focus-visible:outline-ring"
      >
        <GaugeIcon aria-hidden className="size-3.5 shrink-0" />
        <span className="shrink-0 font-medium">Limits</span>
        {collapsed && summary ? (
          <span className="min-w-0 truncate tabular-nums">{summary}</span>
        ) : null}
        <ChevronDownIcon
          aria-hidden
          className={cn("ms-auto size-3.5 shrink-0", !collapsed && "rotate-180")}
        />
      </button>
      {collapsed ? null : (
        <div className="flex flex-col gap-2 px-1.5">
          {reports.flatMap((entry) =>
            entry.report.accounts.map((account, index) => {
              const notice = limitsNotice(account.limits);
              return (
                <div key={account.id} className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-medium text-sidebar-foreground text-xs">
                    {accountHeading(entry, account, index)}
                  </span>
                  {notice ? (
                    <span className="text-muted-foreground text-xs">{notice}</span>
                  ) : (
                    account.limits.windows.map((window) => (
                      <div key={window.id} className="flex min-w-0 flex-col gap-0.5">
                        <div className="flex min-w-0 items-baseline gap-1.5 text-xs">
                          <span className="min-w-0 truncate text-muted-foreground">
                            {window.label}
                          </span>
                          <span className="shrink-0 font-medium tabular-nums">
                            {remainingPercent(window)}%
                          </span>
                          <span className="ms-auto shrink-0 text-muted-foreground tabular-nums">
                            {formatResetsIn(window, now) ?? ""}
                          </span>
                        </div>
                        <WindowBar
                          compact
                          color={barColor(entry.driver)}
                          window={window}
                          now={now}
                        />
                      </div>
                    ))
                  )}
                </div>
              );
            }),
          )}
        </div>
      )}
    </section>
  );
});
