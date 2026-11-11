import { ArrowDownUpIcon, CircleDollarSignIcon, WrenchIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { ThreadDetailsSection } from "./ThreadDetailsSection";
import {
  formatThreadCostUsd,
  formatThreadRunUsage,
  formatThreadTokenUsage,
  type ThreadUsageSummary,
} from "./ThreadUsageSection.logic";
import {
  THREAD_DETAILS_PANEL_ICON_CLASS,
  THREAD_DETAILS_PANEL_LOCKED_ROW_CLASS,
} from "./threadDetailsPanelStyles";

function UsageRow(props: { icon: ReactNode; label: string; value: string; note?: string }) {
  const row = (
    <>
      {props.icon}
      <span className="flex-1">{props.label}</span>
      <span className="font-mono text-2xs text-muted-foreground tabular-nums">{props.value}</span>
    </>
  );
  const className = `flex items-center ${THREAD_DETAILS_PANEL_LOCKED_ROW_CLASS}`;
  if (!props.note) return <div className={className}>{row}</div>;
  return (
    <Tooltip>
      <TooltipTrigger render={<div className={className} />}>{row}</TooltipTrigger>
      <TooltipPopup side="top">{props.note}</TooltipPopup>
    </Tooltip>
  );
}

/**
 * Tokens and cost for the thread's active provider conversation, or a subagent's own run.
 * The context window row lives in ThreadDetailsContext, fed the same summary's context.
 */
export function ThreadUsageSection({ usage }: { usage: ThreadUsageSummary }) {
  const tokens = usage.context ? formatThreadTokenUsage(usage.context) : null;
  const run = usage.run ? formatThreadRunUsage(usage.run) : null;
  if (tokens === null && run === null && usage.costUsd === null) return null;
  return (
    <ThreadDetailsSection
      headingId="thread-details-tokens-heading"
      title="Tokens and cost"
      showHeading={false}
    >
      <div className="flex flex-col">
        {tokens ? (
          <UsageRow
            icon={<ArrowDownUpIcon className={THREAD_DETAILS_PANEL_ICON_CLASS} aria-hidden />}
            label="Last turn"
            value={tokens}
          />
        ) : null}
        {run ? (
          <UsageRow
            icon={<WrenchIcon className={THREAD_DETAILS_PANEL_ICON_CLASS} aria-hidden />}
            label="Run"
            value={run}
            note="Totals Claude reports for this subagent run."
          />
        ) : null}
        {usage.costUsd !== null ? (
          <UsageRow
            icon={<CircleDollarSignIcon className={THREAD_DETAILS_PANEL_ICON_CLASS} aria-hidden />}
            label="Cost"
            value={formatThreadCostUsd(usage.costUsd)}
            note="Estimated at API prices for this conversation. Subscription plans are not billed this amount."
          />
        ) : null}
      </div>
    </ThreadDetailsSection>
  );
}
