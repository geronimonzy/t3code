import type { ScopedThreadRef } from "@t3tools/contracts";
import { GitBranchIcon } from "lucide-react";
import { memo, useState } from "react";

import { cn } from "~/lib/utils";
import type { MascotCharacter } from "../mascot/mascotAnimations";
import { Tooltip, TooltipPopup, TooltipTrigger } from "./ui/tooltip";
import {
  SUBAGENT_STATE_LABEL,
  SUBAGENT_STATE_TONE,
  SubagentMascot,
  SubagentStateIcon,
} from "./chat/ComposerSubagentStrip";
import { SUBAGENT_STRIP_MAX_VISIBLE } from "./chat/ComposerSubagentStrip.logic";
import type { SidebarSubagentRow } from "./Sidebar.logic";

/**
 * A thread's live subagents, nested under its sidebar row. Each opens the
 * subagent's own thread; finished ones stay briefly as done before leaving.
 */
export const SidebarSubagentRows = memo(function SidebarSubagentRows(props: {
  readonly rows: ReadonlyArray<SidebarSubagentRow>;
  readonly mascots: boolean;
  /** Which mascot a provider instance gets. */
  readonly mascotCharacterFor: (providerInstanceId: string) => MascotCharacter;
  readonly onActivate: (threadRef: ScopedThreadRef) => void;
}) {
  const { rows } = props;
  const [expanded, setExpanded] = useState(false);
  if (rows.length === 0) return null;
  // "+1 more" takes the same room as the row it hides, so only collapse two or more.
  const collapsible = rows.length > SUBAGENT_STRIP_MAX_VISIBLE + 1;
  const visible = collapsible && !expanded ? rows.slice(0, SUBAGENT_STRIP_MAX_VISIBLE) : rows;
  const hidden = rows.length - visible.length;
  return (
    <ul
      aria-label="Subagents"
      className="mt-px flex flex-col gap-px ps-(--sidebar-row-content-inset)"
    >
      {visible.map((row) => (
        <li key={row.key} className="list-none">
          <button
            type="button"
            className="flex h-6 w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-md ps-3 pe-2 text-start text-xs hover:bg-sidebar-row-hover focus-visible:outline-2 focus-visible:outline-ring"
            aria-label={`Open subagent ${row.title}, ${SUBAGENT_STATE_LABEL[row.state]}`}
            onClick={() => props.onActivate(row.threadRef)}
          >
            {props.mascots ? (
              <SubagentMascot
                state={row.state}
                character={props.mascotCharacterFor(row.providerInstanceId)}
              />
            ) : null}
            {props.mascots && row.state === "working" ? null : (
              <SubagentStateIcon state={row.state} />
            )}
            <span className="min-w-0 flex-1 truncate text-sidebar-foreground">{row.title}</span>
            {row.worktreeBranch !== null ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      className="flex flex-none text-sidebar-muted-foreground"
                      aria-label={`Worktree ${row.worktreeBranch}`}
                    />
                  }
                >
                  <GitBranchIcon className="size-3" aria-hidden="true" />
                </TooltipTrigger>
                <TooltipPopup side="right">Worktree: {row.worktreeBranch}</TooltipPopup>
              </Tooltip>
            ) : null}
            <span className={cn("shrink-0", SUBAGENT_STATE_TONE[row.state])}>
              {SUBAGENT_STATE_LABEL[row.state]}
            </span>
          </button>
        </li>
      ))}
      {collapsible ? (
        <li className="list-none">
          <button
            type="button"
            className="flex h-6 w-full cursor-pointer items-center rounded-md ps-3 pe-2 text-start text-sidebar-muted-foreground text-xs hover:bg-sidebar-row-hover focus-visible:outline-2 focus-visible:outline-ring"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Show fewer" : `+${hidden} more subagents`}
          </button>
        </li>
      ) : null}
    </ul>
  );
});
