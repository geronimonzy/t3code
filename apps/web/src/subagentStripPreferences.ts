import * as Schema from "effect/Schema";

import { useLocalStorage } from "./hooks/useLocalStorage";

const SUBAGENT_MASCOTS_KEY = "t3code:subagent-strip-mascots";

/** Purely cosmetic and per-browser, so it lives in local storage rather than synced settings. */
export function useSubagentMascotsPreference() {
  return useLocalStorage(SUBAGENT_MASCOTS_KEY, false, Schema.Boolean);
}
