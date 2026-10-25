import { useSyncExternalStore } from "react";

/**
 * Compact embed mode: an external host (a Tauri webview showing one thread in
 * a narrow dock) loads the app with `?embed=compact`. The flag is remembered
 * in sessionStorage so in-app navigation and reloads inside that webview stay
 * embedded; `?embed=off` clears it.
 */
const EMBED_STORAGE_KEY = "t3code:embed";
const EMBED_PARAM = "embed";

export type EmbedMode = "compact" | null;

/** `undefined` means the URL says nothing about embedding. */
export function parseEmbedParam(search: string): EmbedMode | undefined {
  const value = new URLSearchParams(search).get(EMBED_PARAM);
  if (value === "compact") return "compact";
  if (value === "off") return null;
  return undefined;
}

export function resolveEmbedMode(search: string, stored: EmbedMode): EmbedMode {
  const fromUrl = parseEmbedParam(search);
  return fromUrl === undefined ? stored : fromUrl;
}

function readStored(): EmbedMode {
  try {
    return window.sessionStorage.getItem(EMBED_STORAGE_KEY) === "compact" ? "compact" : null;
  } catch {
    return null;
  }
}

function writeStored(mode: EmbedMode) {
  try {
    if (mode === null) window.sessionStorage.removeItem(EMBED_STORAGE_KEY);
    else window.sessionStorage.setItem(EMBED_STORAGE_KEY, mode);
  } catch {
    // Storage can be unavailable; the in-memory value still applies.
  }
}

let current: EmbedMode | undefined;
const listeners = new Set<() => void>();

/** Apply a URL search string; call whenever the location changes. */
export function syncEmbedModeFromSearch(search: string) {
  const previous = current ?? readStored();
  const next = resolveEmbedMode(search, previous);
  if (next !== previous || current === undefined) writeStored(next);
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener();
}

export function getEmbedMode(): EmbedMode {
  if (typeof window === "undefined") return null;
  if (current === undefined) syncEmbedModeFromSearch(window.location.search);
  return current ?? null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Subscribe once at layout level and pass the boolean down. */
export function useIsCompactEmbed(): boolean {
  return useSyncExternalStore(subscribe, getEmbedMode, () => null) === "compact";
}

export function resetEmbedModeForTests() {
  current = undefined;
  listeners.clear();
}
