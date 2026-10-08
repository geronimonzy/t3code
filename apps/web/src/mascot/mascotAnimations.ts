/**
 * Pixel mascot animations. Each frame is a grid of palette characters, one
 * string per row; every frame of every animation has the same size so the
 * renderer can lay them out as one sprite sheet and step through it.
 *
 * Motion rules (AGENTS.md: no continuously repainting animation):
 * - One-shot animations may play at any rate; they stop on their last frame.
 * - Looping animations must stay at or below MAX_LOOP_FPS and should hold
 *   still most of the time. Looping "working" mascots are a deliberate,
 *   owner-approved exception to the no-loop rule, kept to discrete low-rate
 *   frames like the sidebar's status pulse.
 */

export const MASCOT_STATES = ["idle", "input", "working", "done"] as const;
export type MascotState = (typeof MASCOT_STATES)[number];

export const MASCOT_FRAME_WIDTH = 13;
export const MASCOT_FRAME_HEIGHT = 9;
export const MAX_LOOP_FPS = 4;

/** Palette characters; "." is transparent. Classes must stay literal for Tailwind. */
export const MASCOT_PALETTE = {
  c: "fill-[#d97757]",
  d: "fill-[#a8553a]",
  k: "fill-black",
  w: "fill-white",
  y: "fill-[#f2c14e]",
} as const;
export type MascotPaletteKey = keyof typeof MASCOT_PALETTE;

export interface MascotAnimation {
  readonly id: string;
  readonly label: string;
  /** States a user can pick this animation for. */
  readonly states: ReadonlyArray<MascotState>;
  readonly fps: number;
  readonly loop: boolean;
  readonly frames: ReadonlyArray<ReadonlyArray<string>>;
}

// Rows: 0-1 headroom for hops, 2-6 body (arms on 4-5), 7-8 legs.
const STAND = [
  ".............",
  ".............",
  "..ccccccccc..",
  "..cckccckcc..",
  "cccckccckcccc",
  "ccccccccccccc",
  "..ccccccccc..",
  "...c.c.c.c...",
  "...c.c.c.c...",
];

const BLINK = [
  ".............",
  ".............",
  "..ccccccccc..",
  "..ccccccccc..",
  "cccckccckcccc",
  "ccccccccccccc",
  "..ccccccccc..",
  "...c.c.c.c...",
  "...c.c.c.c...",
];

// Closed "^ ^" eyes.
const HAPPY = [
  ".............",
  ".............",
  "..ccccccccc..",
  "..cckccckcc..",
  "ccckckckckccc",
  "ccccccccccccc",
  "..ccccccccc..",
  "...c.c.c.c...",
  "...c.c.c.c...",
];

const STEP = [
  ".............",
  ".............",
  "..ccccccccc..",
  "..cckccckcc..",
  "cccckccckcccc",
  "ccccccccccccc",
  "..ccccccccc..",
  "...c.c.c.c...",
  "....c.c.c.c..",
];

const WAVE = [
  ".............",
  "...........cc",
  "..ccccccccccc",
  "..cckccckcc..",
  "cccckccckcc..",
  "ccccccccccc..",
  "..ccccccccc..",
  "...c.c.c.c...",
  "...c.c.c.c...",
];

/** Moves a frame up by `rows`, padding the bottom with transparency. */
function lift(frame: ReadonlyArray<string>, rows: number): ReadonlyArray<string> {
  const blank = ".".repeat(MASCOT_FRAME_WIDTH);
  return [...frame.slice(rows), ...Array.from({ length: rows }, () => blank)];
}

/** Adds a sparkle above the mascot's head. */
function sparkle(frame: ReadonlyArray<string>): ReadonlyArray<string> {
  return frame.map((row, index) =>
    index === 0 ? ".y.........y." : index === 1 ? "y.y.......y.y" : row,
  );
}

export const MASCOT_ANIMATIONS: ReadonlyArray<MascotAnimation> = [
  {
    id: "still",
    label: "Still",
    states: MASCOT_STATES,
    fps: 1,
    loop: false,
    frames: [STAND],
  },
  {
    id: "bob",
    label: "Bob",
    states: ["working", "idle"],
    fps: 2,
    loop: true,
    frames: [STAND, lift(STAND, 1)],
  },
  {
    id: "march",
    label: "March",
    states: ["working"],
    fps: 3,
    loop: true,
    frames: [STAND, STEP],
  },
  {
    id: "blink",
    label: "Blink",
    states: ["idle", "working", "input"],
    fps: 2,
    loop: true,
    frames: [STAND, STAND, STAND, STAND, STAND, BLINK],
  },
  {
    id: "doze",
    label: "Doze",
    states: ["idle"],
    fps: 1,
    loop: false,
    frames: [BLINK],
  },
  {
    id: "wave",
    label: "Wave",
    states: ["input"],
    fps: 2,
    loop: true,
    frames: [STAND, WAVE],
  },
  {
    id: "raise-hand",
    label: "Raise hand",
    states: ["input"],
    fps: 1,
    loop: false,
    frames: [WAVE],
  },
  {
    id: "jump",
    label: "Jump",
    states: ["done"],
    fps: 10,
    loop: false,
    frames: [STAND, lift(STAND, 1), lift(HAPPY, 2), lift(HAPPY, 2), lift(HAPPY, 1), HAPPY],
  },
  {
    id: "celebrate",
    label: "Celebrate",
    states: ["done"],
    fps: 6,
    loop: false,
    frames: [STAND, HAPPY, sparkle(HAPPY), HAPPY, sparkle(HAPPY), HAPPY],
  },
  {
    id: "happy",
    label: "Happy",
    states: ["done"],
    fps: 1,
    loop: false,
    frames: [HAPPY],
  },
];

export const DEFAULT_MASCOT_ANIMATION_IDS = {
  idle: "still",
  input: "wave",
  working: "bob",
  done: "jump",
} as const satisfies Record<MascotState, string>;

const ANIMATIONS_BY_ID = new Map(MASCOT_ANIMATIONS.map((animation) => [animation.id, animation]));

export function mascotAnimationsForState(state: MascotState): ReadonlyArray<MascotAnimation> {
  return MASCOT_ANIMATIONS.filter((animation) => animation.states.includes(state));
}

/** The chosen animation for a state, falling back to the default for unknown or ineligible ids. */
export function resolveMascotAnimation(
  state: MascotState,
  chosenId: string | undefined,
): MascotAnimation {
  const chosen = chosenId === undefined ? undefined : ANIMATIONS_BY_ID.get(chosenId);
  if (chosen && chosen.states.includes(state)) return chosen;
  return ANIMATIONS_BY_ID.get(DEFAULT_MASCOT_ANIMATION_IDS[state])!;
}

/** Problems that would break the sprite renderer or the motion rules; empty when valid. */
export function validateMascotAnimation(animation: MascotAnimation): ReadonlyArray<string> {
  const problems: string[] = [];
  if (animation.frames.length === 0) problems.push("has no frames");
  if (animation.loop && animation.fps > MAX_LOOP_FPS) {
    problems.push(`loops at ${animation.fps} fps (max ${MAX_LOOP_FPS})`);
  }
  if (animation.loop && animation.frames.length < 2) problems.push("loops a single frame");
  animation.frames.forEach((frame, frameIndex) => {
    if (frame.length !== MASCOT_FRAME_HEIGHT) {
      problems.push(`frame ${frameIndex} has ${frame.length} rows`);
    }
    frame.forEach((row, rowIndex) => {
      if (row.length !== MASCOT_FRAME_WIDTH) {
        problems.push(`frame ${frameIndex} row ${rowIndex} has ${row.length} columns`);
      }
      for (const pixel of row) {
        if (pixel !== "." && !(pixel in MASCOT_PALETTE)) {
          problems.push(`frame ${frameIndex} row ${rowIndex} uses unknown color "${pixel}"`);
        }
      }
    });
  });
  return problems;
}

export interface MascotRun {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly color: MascotPaletteKey;
}

/** Collapses a frame into same-color horizontal runs, offset by its sprite column. */
export function mascotFrameRuns(frame: ReadonlyArray<string>, frameIndex: number): MascotRun[] {
  const runs: MascotRun[] = [];
  frame.forEach((row, y) => {
    let start = 0;
    while (start < row.length) {
      const pixel = row[start]!;
      let end = start + 1;
      while (end < row.length && row[end] === pixel) end += 1;
      if (pixel !== ".") {
        runs.push({
          x: frameIndex * MASCOT_FRAME_WIDTH + start,
          y,
          width: end - start,
          color: pixel as MascotPaletteKey,
        });
      }
      start = end;
    }
  });
  return runs;
}
