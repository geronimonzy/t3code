import * as Schema from "effect/Schema";

import { useLocalStorage } from "../hooks/useLocalStorage";

const ACTION_TERMINAL_LOCATION_KEY = "t3code:action-terminal-location";
const ActionTerminalLocation = Schema.Literals(["drawer", "right-panel"]);
export type ActionTerminalLocation = typeof ActionTerminalLocation.Type;

/** Where project actions open their terminal. A layout choice for this browser, so local storage. */
export function useActionTerminalLocation() {
  return useLocalStorage<ActionTerminalLocation, ActionTerminalLocation>(
    ACTION_TERMINAL_LOCATION_KEY,
    "drawer",
    ActionTerminalLocation,
  );
}
