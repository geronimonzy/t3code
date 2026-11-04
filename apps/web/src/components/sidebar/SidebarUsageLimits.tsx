import type { UsageLimitSourceSnapshots, UsageLimitsReport } from "@t3tools/contracts";
import { limitsNotice } from "@t3tools/shared/usageLimits";
import * as Schema from "effect/Schema";
import { ChevronDownIcon, GaugeIcon } from "lucide-react";
import { memo } from "react";

import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useNowMinute } from "../../hooks/useNowMinute";
import { cn } from "../../lib/utils";
import { useServerConfigs } from "../../state/entities";
import { useEnvironmentProviders, usePrimaryEnvironmentId } from "../../state/environments";
import { providerClients } from "../settings/providerDriverMeta";
import { usePrimarySettings } from "../../hooks/useSettings";
import { formatResetTimestamp } from "../../timestampFormat";
import {
  highestUsedPercent,
  sidebarUsageReports,
  usageTone,
  usedPercent,
  type SidebarUsageReport,
} from "./SidebarUsageLimits.logic";

const COLLAPSED_KEY = "t3code:sidebar-limits-collapsed";
const NO_SOURCES: UsageLimitSourceSnapshots = [];

type Account = UsageLimitsReport["accounts"][number];
type UsageWindow = Account["limits"]["windows"][number];

const TONE_FILL = {
  normal: "bg-info",
  warning: "bg-warning",
  critical: "bg-error",
} as const satisfies Record<ReturnType<typeof usageTone>, string>;

/** One limit window: label and share used, a bar filling with use, then when it resets. */
function UsageWindowRow(props: {
  readonly window: UsageWindow;
  readonly now: number;
  readonly timestampFormat: Parameters<typeof formatResetTimestamp>[1];
}) {
  const { window } = props;
  const used = usedPercent(window);
  const resetsAt = window.resetsAt
    ? formatResetTimestamp(window.resetsAt, props.timestampFormat, props.now)
    : "";
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex min-w-0 items-baseline gap-2 text-xs">
        <span className="min-w-0 truncate text-sidebar-foreground">{window.label}</span>
        <span className="ms-auto shrink-0 text-muted-foreground tabular-nums">{used}% used</span>
      </div>
      <div
        role="meter"
        aria-label={`${window.label} usage`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={used}
        className="h-1 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn("h-full rounded-full", TONE_FILL[usageTone(used)])}
          style={{ width: `${used}%` }}
        />
      </div>
      {resetsAt ? (
        <span className="truncate text-muted-foreground text-xs">Resets {resetsAt}</span>
      ) : null}
    </div>
  );
}

function providerLabel(driver: SidebarUsageReport["driver"]): string {
  return providerClients.get(driver)?.label ?? String(driver);
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
  const timestampFormat = usePrimarySettings((settings) => settings.timestampFormat);
  const providersByEnvironment = useEnvironmentProviders();
  const providers = environmentId === null ? undefined : providersByEnvironment.get(environmentId);
  const sources = config?.usageLimitSources ?? NO_SOURCES;
  const now = Date.parse(nowMinute);
  const reports = providers ? sidebarUsageReports(providers, sources, now) : [];
  if (reports.length === 0) return null;

  const summary = reports
    .map((entry) => {
      const highest = highestUsedPercent(entry.report);
      return highest === null ? null : `${providerLabel(entry.driver)} ${highest}%`;
    })
    .filter((part) => part !== null)
    .join(" · ");
  const summaryLabel = summary ? `${summary} used` : "";

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
        {collapsed && summaryLabel ? (
          <span className="min-w-0 truncate tabular-nums">{summaryLabel}</span>
        ) : null}
        <ChevronDownIcon
          aria-hidden
          className={cn("ms-auto size-3.5 shrink-0", !collapsed && "rotate-180")}
        />
      </button>
      {collapsed ? null : (
        <div className="flex flex-col gap-2.5 px-1.5">
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
                      <UsageWindowRow
                        key={window.id}
                        window={window}
                        now={now}
                        timestampFormat={timestampFormat}
                      />
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
