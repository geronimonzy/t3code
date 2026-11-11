/**
 * Project actions reuse only an idle drawer terminal (the active one first). Right-panel ids
 * are excluded even when drawer state lists them: reusing one renders a single PTY in both
 * surfaces, and closing the drawer copy kills the panel shell.
 */
export function findReusableProjectScriptTerminal(input: {
  readonly drawerTerminalIds: ReadonlyArray<string>;
  readonly activeTerminalId: string;
  readonly panelTerminalIds: ReadonlySet<string>;
  readonly runningTerminalIds: ReadonlyArray<string>;
}): string | null {
  const idleDrawerTerminalIds = input.drawerTerminalIds.filter(
    (terminalId) =>
      !input.panelTerminalIds.has(terminalId) && !input.runningTerminalIds.includes(terminalId),
  );
  if (idleDrawerTerminalIds.includes(input.activeTerminalId)) return input.activeTerminalId;
  return idleDrawerTerminalIds[0] ?? null;
}

/**
 * With actions set to open in the right panel, they reuse an idle panel terminal: the active
 * tab's active terminal first, then any other. Returns the tab that holds it so it can be shown.
 */
export function findReusablePanelScriptTerminal(input: {
  readonly surfaces: ReadonlyArray<{
    readonly id: string;
    readonly terminalIds: ReadonlyArray<string>;
    readonly activeTerminalId: string;
  }>;
  readonly activeSurfaceId: string | null;
  readonly runningTerminalIds: ReadonlyArray<string>;
}): { readonly surfaceId: string; readonly terminalId: string } | null {
  const isIdle = (terminalId: string) => !input.runningTerminalIds.includes(terminalId);
  const active = input.surfaces.find((surface) => surface.id === input.activeSurfaceId);
  if (active && isIdle(active.activeTerminalId)) {
    return { surfaceId: active.id, terminalId: active.activeTerminalId };
  }
  for (const surface of input.surfaces) {
    const terminalId = surface.terminalIds.find(isIdle);
    if (terminalId !== undefined) return { surfaceId: surface.id, terminalId };
  }
  return null;
}
