import type { ThreadStructureVisibleTurnItem } from "@t3tools/client-runtime/state/models";
import * as DateTime from "effect/DateTime";
import { describe, expect, it } from "vite-plus/test";

import { derivePlanCard } from "./planCard.logic";

type Status = "pending" | "running" | "completed";

const todo = (id: string, at: string, steps: ReadonlyArray<[string, Status]>) =>
  ({
    item: {
      type: "todo_list",
      id,
      planId: `plan-${id}`,
      updatedAt: DateTime.makeUnsafe(at),
      steps: steps.map(([text, status], index) => ({ id: `${id}-${index}`, text, status })),
    },
  }) as unknown as ThreadStructureVisibleTurnItem;

const message = (id: string) =>
  ({ item: { type: "assistant_message", id } }) as unknown as ThreadStructureVisibleTurnItem;

describe("derivePlanCard", () => {
  it("returns no plans for a thread without checklists", () => {
    expect(derivePlanCard([message("m1"), message("m2")])).toEqual({ current: null, earlier: [] });
  });

  it("takes the newest checklist as current", () => {
    const { current, earlier } = derivePlanCard([
      todo("a", "2026-11-05T10:00:00Z", [["Port the diff", "completed"]]),
      message("m1"),
      todo("b", "2026-11-05T11:00:00Z", [
        ["Write tests", "running"],
        ["Ship", "pending"],
      ]),
    ]);
    expect(current?.title).toBe("Write tests");
    expect(current?.itemId).toBe("b");
    expect(earlier.map((plan) => plan.title)).toEqual(["Port the diff"]);
  });

  it("collapses identical consecutive checklists", () => {
    const steps: ReadonlyArray<[string, Status]> = [
      ["One", "completed"],
      ["Two", "running"],
    ];
    const { current, earlier } = derivePlanCard([
      todo("a", "2026-11-05T10:00:00Z", steps),
      todo("b", "2026-11-05T10:05:00Z", steps),
      todo("c", "2026-11-05T10:10:00Z", steps),
    ]);
    expect(current?.title).toBe("One");
    expect(current?.itemId).toBe("c");
    expect(earlier).toEqual([]);
  });

  it("keeps a list whose statuses changed as a separate entry", () => {
    const { current, earlier } = derivePlanCard([
      todo("a", "2026-11-05T10:00:00Z", [
        ["One", "running"],
        ["Two", "pending"],
      ]),
      todo("b", "2026-11-05T10:05:00Z", [
        ["One", "completed"],
        ["Two", "running"],
      ]),
    ]);
    expect(current?.itemId).toBe("b");
    expect(earlier.map((plan) => plan.itemId)).toEqual(["a"]);
  });

  it("counts done and total", () => {
    const { current } = derivePlanCard([
      todo("a", "2026-11-05T10:00:00Z", [
        ["1", "completed"],
        ["2", "completed"],
        ["3", "completed"],
        ["4", "running"],
        ["5", "pending"],
      ]),
    ]);
    expect(current).toMatchObject({ done: 3, total: 5, updatedAt: "2026-11-05T10:00:00.000Z" });
  });
});
