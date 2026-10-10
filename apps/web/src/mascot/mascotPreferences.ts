import * as Schema from "effect/Schema";

import { useLocalStorage } from "../hooks/useLocalStorage";
import type { MascotCharacter } from "./mascotAnimations";

const MASCOTS_ENABLED_KEY = "t3code:subagent-strip-mascots";
// Claude's choices keep the key they were first saved under.
const MASCOT_ANIMATIONS_KEYS = {
  claude: "t3code:mascot-animations",
  codex: "t3code:mascot-animations-codex",
} as const satisfies Record<MascotCharacter, string>;

/** Purely cosmetic and per-browser, so mascot settings live in local storage, not synced settings. */
export function useMascotsPreference() {
  return useLocalStorage(MASCOTS_ENABLED_KEY, true, Schema.Boolean);
}

const MascotAnimationChoices = Schema.Struct({
  idle: Schema.optional(Schema.String),
  input: Schema.optional(Schema.String),
  working: Schema.optional(Schema.String),
  done: Schema.optional(Schema.String),
});
export type MascotAnimationChoices = typeof MascotAnimationChoices.Type;

/** The animation id picked per state; missing or unknown ids fall back to the defaults. */
export function useMascotAnimationChoices(character: MascotCharacter = "claude") {
  return useLocalStorage<MascotAnimationChoices, MascotAnimationChoices>(
    MASCOT_ANIMATIONS_KEYS[character],
    {},
    MascotAnimationChoices,
  );
}
