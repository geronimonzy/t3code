import { describe, expect, it } from "vite-plus/test";

import {
  DEFAULT_MASCOT_ANIMATION_IDS,
  MASCOT_ANIMATIONS,
  MASCOT_STATES,
  mascotFrameRuns,
  resolveMascotAnimation,
  validateMascotAnimation,
} from "./mascotAnimations";

describe("mascot animations", () => {
  it.each(MASCOT_ANIMATIONS.map((animation) => [animation.id, animation] as const))(
    "%s is a valid sprite within the motion rules",
    (_id, animation) => {
      expect(validateMascotAnimation(animation)).toEqual([]);
    },
  );

  it("has unique ids and a default for every state that is eligible for it", () => {
    expect(new Set(MASCOT_ANIMATIONS.map((animation) => animation.id)).size).toBe(
      MASCOT_ANIMATIONS.length,
    );
    for (const state of MASCOT_STATES) {
      expect(resolveMascotAnimation(state, undefined).id).toBe(DEFAULT_MASCOT_ANIMATION_IDS[state]);
      expect(resolveMascotAnimation(state, undefined).states).toContain(state);
    }
  });

  it("falls back to the default for unknown or ineligible choices", () => {
    expect(resolveMascotAnimation("working", "nope").id).toBe(DEFAULT_MASCOT_ANIMATION_IDS.working);
    // Jump is a done animation, not a working one.
    expect(resolveMascotAnimation("working", "jump").id).toBe(DEFAULT_MASCOT_ANIMATION_IDS.working);
    expect(resolveMascotAnimation("done", "celebrate").id).toBe("celebrate");
  });

  it("flags frames that would break the sprite or loop too fast", () => {
    expect(
      validateMascotAnimation({
        id: "bad",
        label: "Bad",
        states: ["working"],
        fps: 12,
        loop: true,
        frames: [["..q"]],
      }),
    ).toEqual([
      "loops at 12 fps (max 4)",
      "loops a single frame",
      "frame 0 has 1 rows",
      "frame 0 row 0 has 3 columns",
      'frame 0 row 0 uses unknown color "q"',
    ]);
  });

  it("merges same-color pixels into runs offset by the frame's sprite column", () => {
    expect(mascotFrameRuns(["cc.kk", ".c..."], 2)).toEqual([
      { x: 26, y: 0, width: 2, color: "c" },
      { x: 29, y: 0, width: 2, color: "k" },
      { x: 27, y: 1, width: 1, color: "c" },
    ]);
  });
});
