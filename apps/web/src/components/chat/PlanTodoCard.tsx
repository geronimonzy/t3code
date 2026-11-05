import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import type { ThreadStructureVisibleTurnItem } from "@t3tools/client-runtime/state/models";
import type { EnvironmentId, ProjectReadFileResult } from "@t3tools/contracts";
import { AsyncResult, Atom } from "effect/reactivity";
import * as Schema from "effect/Schema";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleDashedIcon,
  CircleIcon,
  RefreshCwIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useLocalStorage } from "~/hooks/useLocalStorage";
import { useNowMinute } from "~/hooks/useNowMinute";
import { cn } from "~/lib/utils";
import { projectEnvironment } from "~/state/projects";
import { formatRelativeTimeLabel } from "~/timestampFormat";

import ChatMarkdown from "../ChatMarkdown";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Toggle, ToggleGroup } from "../ui/toggle-group";
import { useChatCanvas } from "./ChatCanvasContext";
import { derivePlanCard, type PlanCardPlan, type PlanCardStepStatus } from "./planCard.logic";
import { parseTodoFile, todoMemoryPath } from "./todoFile.logic";

const PlanCardTab = Schema.Literals(["plan", "todo"]);
const PLAN_CARD_TAB_KEY = "t3code:plan-card-tab";
export const PLAN_CARD_OPEN_KEY = "t3code:plan-card-open";
// The timeline minimap's ticks reach 36px from the chat's left edge (TimelineMinimap: left-3, w-6);
// the card starts past them instead of mirroring the details card's inset exactly.
const MINIMAP_CLEARANCE_PX = 44;
const NO_TODO_FILE = Atom.make(AsyncResult.initial<ProjectReadFileResult, never>(false));

function StepIcon({ status }: { status: PlanCardStepStatus }) {
  if (status === "completed")
    return <CheckCircle2Icon className="size-3.5 shrink-0 text-muted-foreground" />;
  // A still half-filled circle: no animation, so an open card never repaints on its own.
  if (status === "running")
    return <CircleDashedIcon className="size-3.5 shrink-0 text-foreground" />;
  return <CircleIcon className="size-3.5 shrink-0 text-muted-foreground/60" />;
}

function PlanSteps({ plan }: { plan: PlanCardPlan }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {plan.steps.map((step) => (
        <li key={step.id} className="flex items-start gap-2 text-sm">
          <span className="mt-0.5">
            <StepIcon status={step.status} />
          </span>
          <span
            className={cn(
              "min-w-0",
              step.status === "completed" && "text-muted-foreground line-through",
              step.status === "running" && "text-foreground",
              step.status === "pending" && "text-muted-foreground",
            )}
          >
            {step.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

function EarlierPlan({
  plan,
  onReveal,
}: {
  plan: PlanCardPlan;
  onReveal: (itemId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle2Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <button
          type="button"
          className={cn(
            "min-w-0 flex-1 truncate text-left text-muted-foreground hover:text-foreground",
            plan.done === plan.total && "line-through",
          )}
          onClick={() => onReveal(plan.itemId)}
        >
          {plan.title}
        </button>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {new Date(plan.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={expanded ? "Collapse plan" : "Expand plan"}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </Button>
      </div>
      {expanded ? (
        <div className="pl-5">
          <PlanSteps plan={plan} />
        </div>
      ) : null}
    </li>
  );
}

function PlanTab({
  turnItems,
  onRevealItem,
}: {
  turnItems: ReadonlyArray<ThreadStructureVisibleTurnItem>;
  onRevealItem: (itemId: string) => void;
}) {
  const { current, earlier } = derivePlanCard(turnItems);
  if (current === null) {
    return <p className="text-sm text-muted-foreground">No plan yet.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium">{current.title}</span>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {current.done} of {current.total}
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground/70"
            style={{ width: `${(current.done / current.total) * 100}%` }}
          />
        </div>
        <PlanSteps plan={current} />
      </div>
      {earlier.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
          <span className="text-xs text-muted-foreground">Earlier in this session</span>
          <ul className="flex flex-col gap-1.5">
            {earlier.map((plan) => (
              <EarlierPlan key={plan.itemId} plan={plan} onReveal={onRevealItem} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function TodoTab({
  result,
  workspaceRoot,
  environmentId,
  onRefresh,
}: {
  result: AsyncResult.AsyncResult<ProjectReadFileResult, unknown>;
  workspaceRoot: string | null;
  environmentId: EnvironmentId;
  onRefresh: () => void;
}) {
  // Ticks once a minute, so "Updated 3 min ago" stays true while the card is open.
  const nowMinute = useNowMinute();
  const file = AsyncResult.getOrElse(result, () => null);
  const todo = file === null ? null : parseTodoFile(file.contents, file.exists !== false);
  const updatedLabel = todo?.updatedAt
    ? `Updated ${formatRelativeTimeLabel(todo.updatedAt, Date.parse(`${nowMinute}:00Z`))}`
    : "Not gathered yet";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{updatedLabel}</span>
        <Button size="xs" variant="ghost" onClick={onRefresh} disabled={workspaceRoot === null}>
          <RefreshCwIcon />
          Refresh
        </Button>
      </div>
      {AsyncResult.isFailure(result) ? (
        <p className="text-sm text-muted-foreground">Couldn't read the todo list.</p>
      ) : todo === null || todo.empty ? (
        <p className="text-sm text-muted-foreground">No items planned.</p>
      ) : (
        <ChatMarkdown
          text={todo.body}
          cwd={workspaceRoot ?? undefined}
          environmentId={environmentId}
        />
      )}
    </div>
  );
}

/**
 * The thread's agent checklists and the project's todo list, in a card mirroring the thread
 * details card: same width and top, on the left.
 */
export function PlanTodoCard(props: {
  environmentId: EnvironmentId;
  workspaceRoot: string | null;
  turnItems: ReadonlyArray<ThreadStructureVisibleTurnItem>;
  threadBusy: boolean;
  onRefreshTodo: () => void;
  onRevealItem: (itemId: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useLocalStorage(PLAN_CARD_TAB_KEY, "plan", PlanCardTab);
  const todoAtom =
    props.workspaceRoot === null
      ? NO_TODO_FILE
      : projectEnvironment.readFile({
          environmentId: props.environmentId,
          input: {
            cwd: props.workspaceRoot,
            relativePath: todoMemoryPath(props.workspaceRoot),
            allowMissing: true,
          },
        });
  const todoResult = useAtomValue(todoAtom);
  const rereadTodo = useAtomRefresh(todoAtom);
  // Re-read when the thread's turn ends, whichever tab is showing: that is when the skill wrote it.
  const wasBusy = useRef(props.threadBusy);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- re-reads the todo file on the server when the thread's turn ends
  useEffect(() => {
    if (wasBusy.current && !props.threadBusy) rereadTodo();
    wasBusy.current = props.threadBusy;
  }, [props.threadBusy, rereadTodo]);
  const placement = useChatCanvas()?.detailsCardPlacement ?? null;
  // Without room for an inline details card there is no free side to mirror it on, and an
  // overlay would cover the chat; the toggle stays pressed and the card returns with the room.
  if (placement === null) return null;
  return (
    <aside
      className="absolute z-20"
      style={{
        left: Math.max(placement.right, MINIMAP_CLEARANCE_PX),
        top: placement.y,
        width: placement.width,
        maxHeight: placement.height,
      }}
      data-plan-todo-card
    >
      <div className="dropdown-glass isolate contain-paint grid max-h-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between gap-2 px-3 pt-3">
          <ToggleGroup
            aria-label="Plan card tab"
            value={[tab]}
            onValueChange={(next) => {
              const value = next[0];
              if (value === "plan" || value === "todo") setTab(value);
            }}
          >
            <Toggle value="plan">Plan</Toggle>
            <Toggle value="todo">Todo</Toggle>
          </ToggleGroup>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="Close plan card"
            onClick={props.onClose}
          >
            <XIcon />
          </Button>
        </div>
        <ScrollArea scrollFade className="min-h-0">
          <div className="p-3">
            {tab === "plan" ? (
              <PlanTab turnItems={props.turnItems} onRevealItem={props.onRevealItem} />
            ) : (
              <TodoTab
                result={todoResult}
                environmentId={props.environmentId}
                workspaceRoot={props.workspaceRoot}
                onRefresh={props.onRefreshTodo}
              />
            )}
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
}
