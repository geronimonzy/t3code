import type { OrchestrationV2Subagent, ThreadId } from "@t3tools/contracts";
import type { ThreadStructure } from "@t3tools/client-runtime/state/models";
import {
  CheckIcon,
  CircleSlashIcon,
  CircleXIcon,
  GitBranchIcon,
  MessageCircleQuestionIcon,
  UsersIcon,
} from "lucide-react";
import { useState } from "react";

import { cn } from "~/lib/utils";
import { Mascot } from "../../mascot/Mascot";
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
const NO_DISMISSED: ReadonlySet<string> = new Set();

/**
 * The live subagent strip for a thread, or null while nothing is running.
 * Agents seen finishing stay for a moment as "done" chips before they leave.
 */
export function useComposerSubagentStrip(
  projection: Pick<ThreadStructure, "subagents" | "turnItems"> | null,
  threadKey: string,
): { readonly strip: SubagentStrip | null; readonly dismiss: (id: string) => void } {
  const projectedSubagents = projection?.subagents;
  const turnItems = projection?.turnItems;
  const subagents = applySubagentNotifications(projectedSubagents ?? NO_SUBAGENTS, turnItems ?? []);
  const lingeringIds = useLingeringSubagentIds(subagents, threadKey);
  // Dismissal is local to this client and thread; only restart-interrupted chips need it.
  const [dismissed, setDismissed] = useState<{
    readonly threadKey: string;
    readonly ids: ReadonlySet<string>;
  }>({ threadKey, ids: NO_DISMISSED });
  const dismissedIds = dismissed.threadKey === threadKey ? dismissed.ids : NO_DISMISSED;
  const dismiss = (id: string) =>
    setDismissed((current) => ({
      threadKey,
      ids: new Set(current.threadKey === threadKey ? current.ids : NO_DISMISSED).add(id),
    }));
  const strip = deriveSubagentStrip(subagents, lingeringIds, undefined, dismissedIds);
  return { strip, dismiss };
}

export const SUBAGENT_STATE_LABEL = {
  working: "Working",
  input: "Needs input",
  done: "Done",
  failed: "Failed",
  stopped: "Stopped",
} as const satisfies Record<SubagentStripChip["state"], string>;

export const SUBAGENT_STATE_TONE = {
  working: "text-muted-foreground",
  input: "text-needs-input",
  done: "text-success",
  failed: "text-destructive",
  stopped: "text-muted-foreground",
} as const satisfies Record<SubagentStripChip["state"], string>;

export function ComposerSubagentStrip(props: {
  readonly strip: SubagentStrip;
  readonly mascots: boolean;
  readonly onOpenThread: (threadId: ThreadId) => void;
  readonly onDismiss: (id: string) => void;
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
            onDismiss={props.onDismiss}
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
  readonly onDismiss: (id: string) => void;
}) {
  const { chip } = props;
  const childThreadId = chip.childThreadId;
  const detail =
    chip.progress ?? (chip.interrupted ? "Interrupted" : SUBAGENT_STATE_LABEL[chip.state]);
  const content = (
    <>
      {props.mascots ? <SubagentMascot state={chip.state} character={chip.character} /> : null}
      {props.mascots && chip.state === "working" ? null : <SubagentStateIcon state={chip.state} />}
      <span className="max-w-[60%] shrink-0 truncate font-medium text-foreground">
        {chip.title}
      </span>
      {chip.worktreeBranch !== null ? (
        <GitBranchIcon className="size-3 flex-none text-muted-foreground" aria-hidden="true" />
      ) : null}
      <span className={cn("min-w-0 truncate", SUBAGENT_STATE_TONE[chip.state])}>{detail}</span>
    </>
  );
  const className =
    "flex min-w-0 max-w-64 flex-1 basis-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-start text-xs";
  const label = `${chip.title}: ${detail}`;
  const tooltip = (
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
          {chip.worktreeBranch !== null ? (
            <div className="text-muted-foreground">Worktree: {chip.worktreeBranch}</div>
          ) : null}
        </div>
      </TooltipPopup>
    </Tooltip>
  );
  if (!chip.interrupted) return tooltip;
  return (
    <>
      {tooltip}
      <ComposerBanner.Dismiss
        aria-label={`Dismiss ${chip.title}`}
        onClick={() => props.onDismiss(chip.id)}
      />
    </>
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
    case "input":
      return (
        <MessageCircleQuestionIcon
          className={cn("size-3 flex-none", SUBAGENT_STATE_TONE.input)}
          aria-hidden="true"
        />
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

/** The chip's mascot: its state's chosen animation, dimmed when the work failed or stopped. */
export function SubagentMascot(props: {
  readonly state: SubagentStripChip["state"];
  readonly character: SubagentStripChip["character"];
}) {
  const muted = props.state === "failed" || props.state === "stopped";
  return <Mascot state={muted ? "idle" : props.state} character={props.character} muted={muted} />;
}
