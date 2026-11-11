import { describe, expect, it } from "vite-plus/test";

import {
  findReusablePanelScriptTerminal,
  findReusableProjectScriptTerminal,
} from "./projectScriptTerminal";

describe("findReusableProjectScriptTerminal", () => {
  it.each([
    {
      name: "never reuses a right-panel terminal, even when stale in drawer state",
      drawerTerminalIds: ["term-1"],
      activeTerminalId: "term-1",
      panelTerminalIds: ["term-1"],
      runningTerminalIds: [],
      expected: null,
    },
    {
      name: "reuses the active idle drawer terminal",
      drawerTerminalIds: ["term-1", "term-2"],
      activeTerminalId: "term-2",
      panelTerminalIds: [],
      runningTerminalIds: [],
      expected: "term-2",
    },
    {
      name: "falls back to another idle drawer terminal when the active one is busy",
      drawerTerminalIds: ["term-1", "term-2"],
      activeTerminalId: "term-1",
      panelTerminalIds: [],
      runningTerminalIds: ["term-1"],
      expected: "term-2",
    },
    {
      name: "finds nothing when every drawer terminal is busy",
      drawerTerminalIds: ["term-1"],
      activeTerminalId: "term-1",
      panelTerminalIds: [],
      runningTerminalIds: ["term-1"],
      expected: null,
    },
  ])("$name", ({ panelTerminalIds, expected, ...input }) => {
    expect(
      findReusableProjectScriptTerminal({ ...input, panelTerminalIds: new Set(panelTerminalIds) }),
    ).toBe(expected);
  });
});

describe("findReusablePanelScriptTerminal", () => {
  const surfaces = [
    { id: "terminal:a", terminalIds: ["a", "a2"], activeTerminalId: "a" },
    { id: "terminal:b", terminalIds: ["b"], activeTerminalId: "b" },
  ];

  it.each([
    {
      name: "reuses the active tab's active terminal when idle",
      activeSurfaceId: "terminal:b",
      runningTerminalIds: [],
      expected: { surfaceId: "terminal:b", terminalId: "b" },
    },
    {
      name: "falls back to another idle panel terminal when the active one is busy",
      activeSurfaceId: "terminal:a",
      runningTerminalIds: ["a"],
      expected: { surfaceId: "terminal:a", terminalId: "a2" },
    },
    {
      name: "ignores a non-terminal active tab",
      activeSurfaceId: "diff",
      runningTerminalIds: ["a"],
      expected: { surfaceId: "terminal:a", terminalId: "a2" },
    },
    {
      name: "finds nothing when every panel terminal is busy",
      activeSurfaceId: "terminal:a",
      runningTerminalIds: ["a", "a2", "b"],
      expected: null,
    },
  ])("$name", ({ expected, ...input }) => {
    expect(findReusablePanelScriptTerminal({ surfaces, ...input })).toEqual(expected);
  });
});
