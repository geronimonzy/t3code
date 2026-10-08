import * as Schema from "effect/Schema";

import { useLocalStorage } from "../hooks/useLocalStorage";

const MASCOTS_ENABLED_KEY = "t3code:subagent-strip-mascots";
const MASCOT_ANIMATIONS_KEY = "t3code:mascot-animations";

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
export function useMascotAnimationChoices() {
  return useLocalStorage<MascotAnimationChoices, MascotAnimationChoices>(
    MASCOT_ANIMATIONS_KEY,
    {},
    MascotAnimationChoices,
  );
}
