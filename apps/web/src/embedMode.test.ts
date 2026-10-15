import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import {
  getEmbedMode,
  parseEmbedParam,
  resetEmbedModeForTests,
  resolveEmbedMode,
  syncEmbedModeFromSearch,
} from "./embedMode";

function installSessionStorage() {
  const data = new Map<string, string>();
  vi.stubGlobal("window", {
    location: { search: "" },
    sessionStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    },
  });
  return data;
}

describe("embed mode flag", () => {
  let storage: Map<string, string>;
  beforeEach(() => {
    storage = installSessionStorage();
    resetEmbedModeForTests();
  });

  it("parses the embed param", () => {
    expect(parseEmbedParam("?embed=compact")).toBe("compact");
    expect(parseEmbedParam("?a=1&embed=off")).toBeNull();
    expect(parseEmbedParam("?other=1")).toBeUndefined();
    expect(parseEmbedParam("?embed=weird")).toBeUndefined();
  });

  it("falls back to the stored value when the URL is silent", () => {
    expect(resolveEmbedMode("", "compact")).toBe("compact");
    expect(resolveEmbedMode("?embed=off", "compact")).toBeNull();
  });

  it("persists across navigation that drops the param", () => {
    syncEmbedModeFromSearch("?embed=compact");
    expect(storage.get("t3code:embed")).toBe("compact");
    syncEmbedModeFromSearch("");
    expect(getEmbedMode()).toBe("compact");
  });

  it("restores from sessionStorage after a reload", () => {
    storage.set("t3code:embed", "compact");
    expect(getEmbedMode()).toBe("compact");
  });

  it("embed=off clears the flag and storage", () => {
    syncEmbedModeFromSearch("?embed=compact");
    syncEmbedModeFromSearch("?embed=off");
    expect(getEmbedMode()).toBeNull();
    expect(storage.has("t3code:embed")).toBe(false);
  });

  it("stays off when never enabled", () => {
    syncEmbedModeFromSearch("");
    expect(getEmbedMode()).toBeNull();
  });
});
