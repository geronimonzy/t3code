/** True for a process argument that is a link in this build's own scheme. */
export function isOwnSchemeArgument(value: string, scheme: string): boolean {
  return value.toLowerCase().startsWith(`${scheme}://`);
}

/**
 * Arguments for `app.setAsDefaultProtocolClient` on Windows; null elsewhere. Unpackaged Electron
 * needs its app path passed back, or a link starts a bare Electron shell. The scheme is the
 * build's own, so a dev build never claims `t3code`.
 */
export function resolveWindowsProtocolClient(input: {
  readonly platform: NodeJS.Platform;
  readonly isPackaged: boolean;
  readonly scheme: string;
  readonly execPath: string;
  readonly appPath: string;
}): { readonly scheme: string; readonly path?: string; readonly args?: readonly string[] } | null {
  if (input.platform !== "win32") return null;
  if (input.isPackaged) return { scheme: input.scheme };
  return { scheme: input.scheme, path: input.execPath, args: [input.appPath] };
}
