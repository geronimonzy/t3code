import type {
  OrchestrationV2Subagent,
  OrchestrationV2ThreadProjection,
  ThreadId,
} from "@t3tools/contracts";
import { CheckIcon, CircleSlashIcon, CircleXIcon, UsersIcon } from "lucide-react";
import { useMemo } from "react";

import { cn } from "~/lib/utils";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { ComposerBanner } from "./ComposerBanner";
import { useLingeringSubagentIds } from "../../hooks/useLingeringSubagentIds";
import {
  applySubagentNotifications,
  deriveSubagentStrip,
  type SubagentStrip,
  type SubagentStripChip,
} from "./ComposerSubagentStrip.logic";

const NO_SUBAGENTS: ReadonlyArray<OrchestrationV2Subagent> = [];

/**
 * The live subagent strip for a thread, or null while nothing is running.
 * Agents seen finishing stay for a moment as "done" chips before they leave.
 */
export function useComposerSubagentStrip(
  projection: Pick<OrchestrationV2ThreadProjection, "subagents" | "turnItems"> | null,
  threadKey: string,
): SubagentStrip | null {
  const projectedSubagents = projection?.subagents;
  const turnItems = projection?.turnItems;
  const subagents = useMemo(
    () => applySubagentNotifications(projectedSubagents ?? NO_SUBAGENTS, turnItems ?? []),
    [projectedSubagents, turnItems],
  );
  const lingeringIds = useLingeringSubagentIds(subagents, threadKey);
  return useMemo(() => deriveSubagentStrip(subagents, lingeringIds), [subagents, lingeringIds]);
}

export const SUBAGENT_STATE_LABEL = {
  working: "Working",
  done: "Done",
  failed: "Failed",
  stopped: "Stopped",
} as const satisfies Record<SubagentStripChip["state"], string>;

export const SUBAGENT_STATE_TONE = {
  working: "text-muted-foreground",
  done: "text-success",
  failed: "text-destructive",
  stopped: "text-muted-foreground",
} as const satisfies Record<SubagentStripChip["state"], string>;

export function ComposerSubagentStrip(props: {
  readonly strip: SubagentStrip;
  readonly mascots: boolean;
  readonly onOpenThread: (threadId: ThreadId) => void;
}) {
  const { strip } = props;
  const total = strip.visible.length + strip.overflow.length;
  return (
    <ComposerBanner.Row>
      <ComposerBanner.Icon>
        <UsersIcon />
      </ComposerBanner.Icon>
      <ComposerBanner.Content
        role="group"
        aria-label={
          strip.workingCount > 0
            ? `${strip.workingCount} of ${total} subagents working`
            : `${total} ${total === 1 ? "subagent" : "subagents"} finished`
        }
        className="gap-0.5"
      >
        {strip.visible.map((chip) => (
          <SubagentChip
            key={chip.id}
            chip={chip}
            mascots={props.mascots}
            onOpenThread={props.onOpenThread}
          />
        ))}
        {strip.overflow.length > 0 ? (
          <Tooltip>
            <TooltipTrigger
              delay={200}
              render={
                <span className="shrink-0 whitespace-nowrap px-1 text-muted-foreground text-xs" />
              }
            >
              +{strip.overflow.length} more
            </TooltipTrigger>
            <TooltipPopup side="top" className="max-w-72">
              <ul className="space-y-0.5 text-xs">
                {strip.overflow.map((chip) => (
                  <li key={chip.id} className="truncate">
                    {chip.title}
                    <span className="text-muted-foreground">
                      {" "}
                      · {SUBAGENT_STATE_LABEL[chip.state]}
                    </span>
                  </li>
                ))}
              </ul>
            </TooltipPopup>
          </Tooltip>
        ) : null}
      </ComposerBanner.Content>
    </ComposerBanner.Row>
  );
}

function SubagentChip(props: {
  readonly chip: SubagentStripChip;
  readonly mascots: boolean;
  readonly onOpenThread: (threadId: ThreadId) => void;
}) {
  const { chip } = props;
  const childThreadId = chip.childThreadId;
  const detail = chip.progress ?? SUBAGENT_STATE_LABEL[chip.state];
  const content = (
    <>
      {props.mascots ? <SubagentMascot state={chip.state} /> : null}
      {props.mascots && chip.state === "working" ? null : <SubagentStateIcon state={chip.state} />}
      <span className="max-w-[60%] shrink-0 truncate font-medium text-foreground">
        {chip.title}
      </span>
      <span className={cn("min-w-0 truncate", SUBAGENT_STATE_TONE[chip.state])}>{detail}</span>
    </>
  );
  const className =
    "flex min-w-0 max-w-64 flex-1 basis-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-start text-xs";
  const label = `${chip.title}: ${detail}`;
  return (
    <Tooltip>
      <TooltipTrigger
        delay={300}
        render={
          childThreadId === null ? (
            <span className={className} aria-label={label} />
          ) : (
            <button
              type="button"
              className={cn(
                className,
                "cursor-pointer hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring",
              )}
              aria-label={`Open subagent ${label}`}
              onClick={() => props.onOpenThread(childThreadId)}
            />
          )
        }
      >
        {content}
      </TooltipTrigger>
      <TooltipPopup side="top" className="max-w-80">
        <div className="text-xs">
          <div className="font-medium">{chip.title}</div>
          <div className="text-muted-foreground">{detail}</div>
        </div>
      </TooltipPopup>
    </Tooltip>
  );
}

export function SubagentStateIcon(props: { readonly state: SubagentStripChip["state"] }) {
  switch (props.state) {
    case "working":
      // The same duty-cycled pulse the background-work banner uses for live work.
      return (
        <span className="flex size-3 flex-none items-center justify-center" aria-hidden="true">
          <ComposerBanner.Dot className="animate-status-pulse text-foreground" />
        </span>
      );
    case "done":
      return <CheckIcon className="size-3 flex-none text-success" aria-hidden="true" />;
    case "failed":
      return <CircleXIcon className="size-3 flex-none text-destructive" aria-hidden="true" />;
    case "stopped":
      return (
        <CircleSlashIcon className="size-3 flex-none text-muted-foreground" aria-hidden="true" />
      );
  }
}

/**
 * A static pixel Claude. It hops once when it appears and jumps once when it
 * finishes; the changing animation name is what replays it, and nothing loops.
 */
export function SubagentMascot(props: { readonly state: SubagentStripChip["state"] }) {
  const settled = props.state !== "working";
  return (
    <svg
      viewBox="0 0 13 8"
      className={cn(
        "h-3 w-5 flex-none",
        settled ? "motion-safe:animate-subagent-jump" : "motion-safe:animate-subagent-hop",
        (props.state === "failed" || props.state === "stopped") && "opacity-50 grayscale",
      )}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <g className="fill-[#d97757]">
        <rect x="2" y="0" width="9" height="5" />
        <rect x="0" y="2" width="2" height="2" />
        <rect x="11" y="2" width="2" height="2" />
        <rect x="3" y="5" width="1" height="2" />
        <rect x="5" y="5" width="1" height="2" />
        <rect x="7" y="5" width="1" height="2" />
        <rect x="9" y="5" width="1" height="2" />
      </g>
      {props.state === "done" ? (
        // Happy closed eyes.
        <g className="fill-black">
          <rect x="3" y="2" width="2" height="1" />
          <rect x="8" y="2" width="2" height="1" />
        </g>
      ) : (
        <g className="fill-black">
          <rect x="4" y="1" width="1" height="2" />
          <rect x="8" y="1" width="1" height="2" />
        </g>
      )}
    </svg>
  );
}
