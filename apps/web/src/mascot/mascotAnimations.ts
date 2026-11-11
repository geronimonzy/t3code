/**
 * Pixel mascot frames: palette-character grids, all one size so they form one sprite sheet.
 * One-shots stop on their last frame. Loops stay at or below MAX_LOOP_FPS; looping "working"
 * mascots are an owner-approved exception to the no-continuous-animation rule.
 */

export const MASCOT_STATES = ["idle", "input", "working", "done"] as const;
export type MascotState = (typeof MASCOT_STATES)[number];

/** Each provider family has its own mascot, with its own animations and choices. */
const MASCOT_CHARACTERS = ["claude", "codex"] as const;
export type MascotCharacter = (typeof MASCOT_CHARACTERS)[number];

/** Codex threads and agents get the Codex mascot; every other provider keeps Claude's. */
export function mascotCharacterForDriver(driver: string | null | undefined): MascotCharacter {
  return driver === "codex" ? "codex" : "claude";
}

export const MASCOT_FRAME_WIDTH = 17;
export const MASCOT_FRAME_HEIGHT = 10;
const MAX_LOOP_FPS = 4;

/** Palette characters; "." is transparent. Classes must stay literal for Tailwind. */
export const MASCOT_PALETTE = {
  c: "fill-[#d97757]",
  d: "fill-[#a8553a]",
  k: "fill-black",
  w: "fill-white",
  y: "fill-[#f2c14e]",
  r: "fill-[#c0392b]",
  s: "fill-[#d4dae3]",
  b: "fill-[#6b4423]",
  g: "fill-[#7fb069]",
  o: "fill-[#5b8def]",
  p: "fill-[#3d63b8]",
  n: "fill-[#1f2a3d]",
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
  /** Whose mascot this is; absent means Claude's. */
  readonly character?: MascotCharacter;
}

// Rows: 0-2 headroom for hops and props, 3-7 body (arms on 5-6), 8-9 legs.
// Classic frames keep two clear columns each side; themed ones use them for props.
const STAND = [
  ".................",
  ".................",
  ".................",
  "....ccccccccc....",
  "....cckccckcc....",
  "..cccckccckcccc..",
  "..ccccccccccccc..",
  "....ccccccccc....",
  ".....c.c.c.c.....",
  ".....c.c.c.c.....",
];

const BLINK = [
  ".................",
  ".................",
  ".................",
  "....ccccccccc....",
  "....ccccccccc....",
  "..cccckccckcccc..",
  "..ccccccccccccc..",
  "....ccccccccc....",
  ".....c.c.c.c.....",
  ".....c.c.c.c.....",
];

// Closed "^ ^" eyes.
const HAPPY = [
  ".................",
  ".................",
  ".................",
  "....ccccccccc....",
  "....cckccckcc....",
  "..ccckckckckccc..",
  "..ccccccccccccc..",
  "....ccccccccc....",
  ".....c.c.c.c.....",
  ".....c.c.c.c.....",
];

const STEP = [
  ".................",
  ".................",
  ".................",
  "....ccccccccc....",
  "....cckccckcc....",
  "..cccckccckcccc..",
  "..ccccccccccccc..",
  "....ccccccccc....",
  ".....c.c.c.c.....",
  "......c.c.c.c....",
];

const WAVE = [
  ".................",
  ".................",
  ".............cc..",
  "....ccccccccccc..",
  "....cckccckcc....",
  "..cccckccckcc....",
  "..ccccccccccc....",
  "....ccccccccc....",
  ".....c.c.c.c.....",
  ".....c.c.c.c.....",
];

// Samurai theme: headband (r), sheathed sword at the hip (b scabbard, s blade).
// Standing guard, sword sheathed.
const SAMURAI_STAND = [
  ".................",
  ".................",
  "...r.............",
  "..rrrrrrrrrrr....",
  "....cckccckcc....",
  "..cccckccckcccc..",
  "..ccccccccccccc..",
  "...bccccccccc....",
  "..b..c.c.c.c.....",
  ".b...c.c.c.c.....",
];

// Content "^ ^" eyes.
const SAMURAI_HAPPY = [
  ".................",
  ".................",
  "...r.............",
  "..rrrrrrrrrrr....",
  "....cckccckcc....",
  "..ccckckckckccc..",
  "..ccccccccccccc..",
  "...bccccccccc....",
  "..b..c.c.c.c.....",
  ".b...c.c.c.c.....",
];

// Sword raised over the head.
const SAMURAI_RAISE = [
  "..............s..",
  "..............s..",
  "...r..........s..",
  "..rrrrrrrrrrr.b..",
  "....cckccckcccc..",
  "..cccckccckcccc..",
  "..ccccccccccc....",
  "...bccccccccc....",
  "..b..c.c.c.c.....",
  ".b...c.c.c.c.....",
];

// Mid-slash: the blade sweeps down the right with a trail (w).
const SAMURAI_SLASH = [
  "..............w..",
  "...............w.",
  "...r............w",
  "..rrrrrrrrrrr...w",
  "....cckccckcc...w",
  "..cccckccckcc....",
  "..ccccccccccccc..",
  "...bcccccccccccb.",
  "..b..c.c.c.c....s",
  ".b...c.c.c.c....s",
];

// Follow-through, blade low.
const SAMURAI_FOLLOW = [
  ".................",
  ".................",
  "...r.............",
  "..rrrrrrrrrrr....",
  "....cckccckcc....",
  "..cccckccckcc....",
  "..ccccccccccccc..",
  "...bcccccccccccb.",
  "..b..c.c.c.c....s",
  ".b...c.c.c.c....s",
];

// Blade held point-down, about to sheathe.
const SAMURAI_LOWER = [
  ".................",
  ".................",
  "...r.............",
  "..rrrrrrrrrrr....",
  "....cckccckcc....",
  "..cccckccckcccc..",
  "..cccccccccccccb.",
  "...bccccccccc..s.",
  "..b..c.c.c.c...s.",
  ".b...c.c.c.c...s.",
];

// Holding a cup of green tea.
const SAMURAI_TEA = [
  ".................",
  ".................",
  "...r.............",
  "..rrrrrrrrrrr....",
  "....cckccckcc..gg",
  "..cccckccckccccww",
  "..ccccccccccccc..",
  "...bccccccccc....",
  "..b..c.c.c.c.....",
  ".b...c.c.c.c.....",
];

// Steam rising from the cup.
const SAMURAI_STEAM_1 = [
  ".................",
  ".................",
  "...r.............",
  "..rrrrrrrrrrr..w.",
  "....cckccckcc..gg",
  "..cccckccckccccww",
  "..ccccccccccccc..",
  "...bccccccccc....",
  "..b..c.c.c.c.....",
  ".b...c.c.c.c.....",
];

// Steam drifting higher.
const SAMURAI_STEAM_2 = [
  ".................",
  ".................",
  "...r............w",
  "..rrrrrrrrrrr....",
  "....cckccckcc..gg",
  "..cccckccckccccww",
  "..ccccccccccccc..",
  "...bccccccccc....",
  "..b..c.c.c.c.....",
  ".b...c.c.c.c.....",
];

// Sipping, eyes closed.
const SAMURAI_SIP = [
  ".................",
  ".................",
  "...r.........ww..",
  "..rrrrrrrrrrrcc..",
  "....ccccccccccc..",
  "..cccckccckcc....",
  "..ccccccccccc....",
  "...bccccccccc....",
  "..b..c.c.c.c.....",
  ".b...c.c.c.c.....",
];

// A bow: at your service, awaiting orders.
const SAMURAI_BOW = [
  ".................",
  ".................",
  ".................",
  "...r.............",
  "..rrrrrrrrrrr....",
  "....ccccccccc....",
  "..cccckccckcccc..",
  "..ccccccccccccc..",
  "...bccccccccc....",
  "..b..c.c.c.c.....",
];

/** Moves a frame up by `rows`, padding the bottom with transparency. */
function lift(frame: ReadonlyArray<string>, rows: number): ReadonlyArray<string> {
  const blank = ".".repeat(MASCOT_FRAME_WIDTH);
  return [...frame.slice(rows), ...Array.from({ length: rows }, () => blank)];
}

/** Adds a sparkle above the mascot's head. */
function sparkle(frame: ReadonlyArray<string>): ReadonlyArray<string> {
  return frame.map((row, index) =>
    index === 1 ? "...y.........y..." : index === 2 ? "..y.y.......y.y.." : row,
  );
}

const CLAUDE_MASCOT_ANIMATIONS: ReadonlyArray<MascotAnimation> = [
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
  {
    id: "samurai-tea",
    label: "Samurai: tea",
    states: ["idle"],
    fps: 2,
    loop: true,
    frames: [
      SAMURAI_TEA,
      SAMURAI_TEA,
      SAMURAI_STEAM_1,
      SAMURAI_STEAM_2,
      SAMURAI_TEA,
      SAMURAI_TEA,
      SAMURAI_SIP,
      SAMURAI_SIP,
    ],
  },
  {
    id: "samurai-bow",
    label: "Samurai: bow",
    states: ["input"],
    fps: 2,
    loop: true,
    frames: [SAMURAI_STAND, SAMURAI_STAND, SAMURAI_BOW, SAMURAI_BOW],
  },
  {
    id: "samurai-slash",
    label: "Samurai: slash",
    states: ["working"],
    fps: 4,
    loop: true,
    frames: [SAMURAI_RAISE, SAMURAI_RAISE, SAMURAI_SLASH, SAMURAI_FOLLOW],
  },
  {
    id: "samurai-sheathe",
    label: "Samurai: sheathe",
    states: ["done"],
    fps: 6,
    loop: false,
    frames: [SAMURAI_FOLLOW, SAMURAI_LOWER, SAMURAI_STAND, SAMURAI_HAPPY, SAMURAI_HAPPY],
  },
];

/** Swaps palette colors, so one drawing serves another character. */
function recolor(
  frame: ReadonlyArray<string>,
  colors: Readonly<Partial<Record<MascotPaletteKey, MascotPaletteKey>>>,
): ReadonlyArray<string> {
  return frame.map((row) =>
    [...row].map((pixel) => colors[pixel as MascotPaletteKey] ?? pixel).join(""),
  );
}

// Codex: Claude's classic poses in Codex blue.
const CODEX_CLASSIC_ANIMATIONS: ReadonlyArray<MascotAnimation> = CLAUDE_MASCOT_ANIMATIONS.filter(
  (animation) => !animation.id.startsWith("samurai-"),
).map((animation) => ({
  ...animation,
  id: `codex-${animation.id}`,
  character: "codex",
  frames: animation.frames.map((frame) => recolor(frame, { c: "o", d: "p" })),
}));

// Codex ninja theme: dark hood (n) with eye slits, red headband tails, steel shuriken.
const NINJA_LEGS = [".....o.o.o.o.....", ".....o.o.o.o....."];
const NINJA_STAND = [
  ".................",
  ".................",
  ".................",
  "....nnnnnnnnnr...",
  "....nnwnnnwnn.rr.",
  "..ooooooooooooo..",
  "..ooooooooooooo..",
  "....ooooooooo....",
  ...NINJA_LEGS,
];

// Closed "^ ^" eyes.
const NINJA_HAPPY = [
  ".................",
  ".................",
  ".................",
  "....nnwnnnwnnr...",
  "....nwnwnwnwn.rr.",
  "..ooooooooooooo..",
  "..ooooooooooooo..",
  "....ooooooooo....",
  ...NINJA_LEGS,
];

const NINJA_BOW = [
  ".................",
  ".................",
  ".................",
  ".................",
  "....nnnnnnnnnr...",
  "..oonnnnnnnnnnrr.",
  "..ooooooooooooo..",
  "....ooooooooo....",
  ...NINJA_LEGS,
];

// A shuriken raised overhead.
const NINJA_WIND_UP = [
  ".............s.s.",
  "..............s..",
  ".............sos.",
  "....nnnnnnnnnoo..",
  "....nnwnnnwnn.rr.",
  "..ooooooooooo....",
  "..ooooooooooo....",
  "....ooooooooo....",
  ...NINJA_LEGS,
];

const NINJA_THROW = [
  ".................",
  ".................",
  ".................",
  "....nnnnnnnnnrs.s",
  "....nnwnnnwnn.rs.",
  "..oooooooooooos.s",
  "..ooooooooooooo..",
  "....ooooooooo....",
  ...NINJA_LEGS,
];

// Vanishing in a puff of smoke (s), then gone.
const NINJA_SMOKE = [
  ".................",
  ".................",
  ".....s...s.......",
  "...ssnnnnsnnnss..",
  "..ssnnwsssnnss...",
  ".ssoooosssoooss..",
  "..sooossssooos...",
  "...ssoooooooss...",
  ".....s.o.s.o.....",
  ".....o.o.o.o.....",
];

const NINJA_PUFF = [
  ".................",
  ".................",
  "......s...s......",
  "....sssssssss....",
  "...sssssssssss...",
  "..sssssssssssss..",
  "..sssssssssssss..",
  "...sssssssssss...",
  ".....sss.sss.....",
  ".................",
];

const NINJA_WISPS = [
  ".................",
  ".................",
  ".................",
  ".....s.....s.....",
  "...s...s.s...s...",
  "..s..s.....s..s..",
  "....s..s.s..s....",
  "......s...s......",
  ".................",
  ".................",
];

const NINJA_ANIMATIONS: ReadonlyArray<MascotAnimation> = [
  {
    id: "ninja-still",
    label: "Ninja: still",
    states: ["idle"],
    fps: 1,
    loop: false,
    frames: [NINJA_STAND],
    character: "codex",
  },
  {
    id: "ninja-bow",
    label: "Ninja: bow",
    states: ["input"],
    fps: 2,
    loop: true,
    frames: [NINJA_STAND, NINJA_STAND, NINJA_BOW, NINJA_BOW],
    character: "codex",
  },
  {
    id: "ninja-throw",
    label: "Ninja: throw",
    states: ["working"],
    fps: 4,
    loop: true,
    frames: [NINJA_WIND_UP, NINJA_WIND_UP, NINJA_THROW, NINJA_STAND],
    character: "codex",
  },
  {
    id: "ninja-vanish",
    label: "Ninja: vanish",
    states: ["done"],
    fps: 8,
    loop: false,
    frames: [NINJA_STAND, NINJA_SMOKE, NINJA_PUFF, NINJA_WISPS, sparkle(NINJA_HAPPY), NINJA_HAPPY],
    character: "codex",
  },
];

export const MASCOT_ANIMATIONS: ReadonlyArray<MascotAnimation> = [
  ...CLAUDE_MASCOT_ANIMATIONS,
  ...CODEX_CLASSIC_ANIMATIONS,
  ...NINJA_ANIMATIONS,
];

export const DEFAULT_MASCOT_ANIMATION_IDS = {
  idle: "still",
  input: "wave",
  working: "bob",
  done: "jump",
} as const satisfies Record<MascotState, string>;

const DEFAULT_ANIMATION_IDS_BY_CHARACTER = {
  claude: DEFAULT_MASCOT_ANIMATION_IDS,
  codex: {
    idle: "codex-still",
    input: "codex-wave",
    working: "codex-bob",
    done: "codex-jump",
  },
} as const satisfies Record<MascotCharacter, Record<MascotState, string>>;

function animationCharacter(animation: MascotAnimation): MascotCharacter {
  return animation.character ?? "claude";
}

export interface MascotTheme {
  readonly id: string;
  readonly label: string;
  readonly character: MascotCharacter;
  readonly animations: Record<MascotState, string>;
}

/** Presets that pick an animation for every state at once. */
export const MASCOT_THEMES: ReadonlyArray<MascotTheme> = [
  {
    id: "classic",
    label: "Classic",
    character: "claude",
    animations: DEFAULT_ANIMATION_IDS_BY_CHARACTER.claude,
  },
  {
    id: "samurai",
    label: "Samurai",
    character: "claude",
    animations: {
      idle: "samurai-tea",
      input: "samurai-bow",
      working: "samurai-slash",
      done: "samurai-sheathe",
    },
  },
  {
    id: "codex-classic",
    label: "Classic",
    character: "codex",
    animations: DEFAULT_ANIMATION_IDS_BY_CHARACTER.codex,
  },
  {
    id: "ninja",
    label: "Ninja",
    character: "codex",
    animations: {
      idle: "ninja-still",
      input: "ninja-bow",
      working: "ninja-throw",
      done: "ninja-vanish",
    },
  },
];

export function mascotThemesFor(character: MascotCharacter): ReadonlyArray<MascotTheme> {
  return MASCOT_THEMES.filter((theme) => theme.character === character);
}

/** The theme whose animations match the effective choice for every state, if any. */
export function matchingMascotTheme(
  choices: { readonly [State in MascotState]?: string | undefined },
  character: MascotCharacter = "claude",
): MascotTheme | null {
  return (
    mascotThemesFor(character).find((theme) =>
      MASCOT_STATES.every(
        (state) =>
          resolveMascotAnimation(state, choices[state], character).id === theme.animations[state],
      ),
    ) ?? null
  );
}

const ANIMATIONS_BY_ID = new Map(MASCOT_ANIMATIONS.map((animation) => [animation.id, animation]));

export function mascotAnimationsForState(
  state: MascotState,
  character: MascotCharacter = "claude",
): ReadonlyArray<MascotAnimation> {
  return MASCOT_ANIMATIONS.filter(
    (animation) => animation.states.includes(state) && animationCharacter(animation) === character,
  );
}

/** The chosen animation for a state, falling back to the default for unknown or ineligible ids. */
export function resolveMascotAnimation(
  state: MascotState,
  chosenId: string | undefined,
  character: MascotCharacter = "claude",
): MascotAnimation {
  const chosen = chosenId === undefined ? undefined : ANIMATIONS_BY_ID.get(chosenId);
  if (chosen && chosen.states.includes(state) && animationCharacter(chosen) === character) {
    return chosen;
  }
  return ANIMATIONS_BY_ID.get(DEFAULT_ANIMATION_IDS_BY_CHARACTER[character][state])!;
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
