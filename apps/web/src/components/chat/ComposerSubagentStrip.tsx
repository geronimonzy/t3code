import type { OrchestrationV2ThreadProjection, ThreadId } from "@t3tools/contracts";
import { deriveThreadTurnSubagents } from "@t3tools/client-runtime/state/thread-subagents";
import { CheckIcon, CircleSlashIcon, CircleXIcon, UsersIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "~/lib/utils";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { ComposerBanner } from "./ComposerBanner";
import {
  deriveSubagentStrip,
  liveSubagentIds,
  newlySettledSubagentIds,
  SUBAGENT_STRIP_DONE_LINGER_MS,
  type SubagentStrip,
  type SubagentStripChip,
} from "./ComposerSubagentStrip.logic";

const NO_IDS: ReadonlySet<string> = new Set();

interface ScopedIds {
  readonly threadKey: string;
  readonly ids: ReadonlySet<string>;
}

/**
 * The live subagent strip for a thread, or null while nothing is running.
 * Agents seen finishing stay for a moment as "done" chips before they leave.
 */
export function useComposerSubagentStrip(
  projection: Pick<OrchestrationV2ThreadProjection, "runs" | "subagents"> | null,
  threadKey: string,
): SubagentStrip | null {
  const runs = projection?.runs;
  const subagents = projection?.subagents;
  const turn = useMemo(
    () => (runs && subagents ? deriveThreadTurnSubagents({ runs, subagents }) : null),
    [runs, subagents],
  );
  const previousLiveRef = useRef<ScopedIds>({ threadKey, ids: NO_IDS });
  const [lingering, setLingering] = useState<ScopedIds>({ threadKey, ids: NO_IDS });
  // One timer per agent: a resumed agent that settles again restarts its own linger.
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const previous = previousLiveRef.current;
    previousLiveRef.current = { threadKey, ids: liveSubagentIds(turn) };
    if (previous.threadKey !== threadKey) return;
    const settled = newlySettledSubagentIds(previous.ids, turn);
    if (settled.length === 0) return;
    setLingering((current) => ({
      threadKey,
      ids: new Set([...(current.threadKey === threadKey ? current.ids : []), ...settled]),
    }));
    for (const id of settled) {
      clearTimeout(timersRef.current.get(id));
      const timer = setTimeout(() => {
        timersRef.current.delete(id);
        setLingering((current) =>
          current.threadKey === threadKey
            ? { threadKey, ids: new Set([...current.ids].filter((other) => other !== id)) }
            : current,
        );
      }, SUBAGENT_STRIP_DONE_LINGER_MS);
      timersRef.current.set(id, timer);
    }
  }, [threadKey, turn]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
    };
  }, []);

  const lingeringIds = lingering.threadKey === threadKey ? lingering.ids : NO_IDS;
  return useMemo(() => deriveSubagentStrip(turn, lingeringIds), [turn, lingeringIds]);
}

const STATE_LABEL = {
  working: "Working",
  done: "Done",
  failed: "Failed",
  stopped: "Stopped",
} as const satisfies Record<SubagentStripChip["state"], string>;

export function ComposerSubagentStrip(props: {
  readonly strip: SubagentStrip;
  readonly mascots: boolean;
  readonly onOpenThread: (threadId: ThreadId) => void;
}) {
  const { strip } = props;
  const total = strip.visible.length + strip.overflow.length;
  return (
    <ComposerBanner.Row data-chat-composer-subagent-strip="true">
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
                    <span className="text-muted-foreground"> · {STATE_LABEL[chip.state]}</span>
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
  const detail = chip.progress ?? STATE_LABEL[chip.state];
  const content = (
    <>
      {props.mascots ? <SubagentMascot state={chip.state} /> : <ChipStateIcon state={chip.state} />}
      <span className="max-w-[60%] shrink-0 truncate font-medium text-foreground">
        {chip.title}
      </span>
      <span className="min-w-0 truncate text-muted-foreground">{detail}</span>
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

function ChipStateIcon(props: { readonly state: SubagentStripChip["state"] }) {
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
function SubagentMascot(props: { readonly state: SubagentStripChip["state"] }) {
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
