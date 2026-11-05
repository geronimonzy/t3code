import type { ThreadStructureVisibleTurnItem } from "@t3tools/client-runtime/state/models";
import * as DateTime from "effect/DateTime";

export type PlanCardStepStatus = "pending" | "running" | "completed";

export interface PlanCardPlan {
  /** The checklist's turn item, used to jump to it in the timeline. */
  readonly itemId: string;
  readonly title: string;
  readonly updatedAt: string;
  readonly steps: ReadonlyArray<{
    readonly id: string;
    readonly text: string;
    readonly status: PlanCardStepStatus;
  }>;
  readonly done: number;
  readonly total: number;
}

// One plan as long as its steps keep their texts; statuses advancing doesn't start a new one.
const samePlan = (left: PlanCardPlan, right: PlanCardPlan) =>
  left.steps.length === right.steps.length &&
  left.steps.every((step, index) => step.text === right.steps[index]?.text);

/**
 * The plan card's checklists for one thread: the newest as `current`, older ones newest first.
 * Each checklist update is its own turn item, so consecutive copies with the same steps count once,
 * as the newest copy.
 */
export function derivePlanCard(turnItems: ReadonlyArray<ThreadStructureVisibleTurnItem>): {
  readonly current: PlanCardPlan | null;
  readonly earlier: ReadonlyArray<PlanCardPlan>;
} {
  const plans: PlanCardPlan[] = [];
  for (const { item } of turnItems) {
    if (item.type !== "todo_list" || item.steps.length === 0) continue;
    const steps = item.steps.map(({ id, text, status }) => ({ id, text, status }));
    const plan: PlanCardPlan = {
      itemId: item.id,
      title: steps[0]!.text,
      updatedAt: DateTime.formatIso(item.updatedAt),
      steps,
      done: steps.filter((step) => step.status === "completed").length,
      total: steps.length,
    };
    const previous = plans.at(-1);
    // A repeat replaces the earlier copy, so the entry jumps to the newest one.
    if (previous !== undefined && samePlan(previous, plan)) plans[plans.length - 1] = plan;
    else plans.push(plan);
  }
  return { current: plans.at(-1) ?? null, earlier: plans.slice(0, -1).toReversed() };
}
