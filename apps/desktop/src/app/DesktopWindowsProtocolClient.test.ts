import { describe, expect, it } from "vite-plus/test";

import {
  isOwnSchemeArgument,
  resolveWindowsProtocolClient,
} from "./DesktopWindowsProtocolClient.ts";

describe("isOwnSchemeArgument", () => {
  it("accepts only this build's scheme", () => {
    expect(isOwnSchemeArgument("t3code://new?prompt=hi", "t3code")).toBe(true);
    expect(isOwnSchemeArgument("T3CODE://new", "t3code")).toBe(true);
    expect(isOwnSchemeArgument("t3code-dev://new", "t3code")).toBe(false);
    expect(isOwnSchemeArgument("t3code://new", "t3code-dev")).toBe(false);
    expect(isOwnSchemeArgument("C:\\Program Files\\T3 Code\\T3 Code.exe", "t3code")).toBe(false);
    expect(isOwnSchemeArgument("--allow-file-access", "t3code")).toBe(false);
  });
});

describe("resolveWindowsProtocolClient", () => {
  const base = {
    scheme: "t3code",
    execPath: "C:\\electron\\electron.exe",
    appPath: "C:\\repo\\apps\\desktop",
  };

  it("does nothing off Windows", () => {
    expect(resolveWindowsProtocolClient({ ...base, platform: "linux", isPackaged: true })).toBe(
      null,
    );
    expect(resolveWindowsProtocolClient({ ...base, platform: "darwin", isPackaged: true })).toBe(
      null,
    );
  });

  it("registers the executable for packaged builds", () => {
    expect(resolveWindowsProtocolClient({ ...base, platform: "win32", isPackaged: true })).toEqual({
      scheme: "t3code",
    });
  });

  it("registers electron plus the app path for dev builds, under the dev scheme", () => {
    expect(
      resolveWindowsProtocolClient({
        ...base,
        scheme: "t3code-dev",
        platform: "win32",
        isPackaged: false,
      }),
    ).toEqual({
      scheme: "t3code-dev",
      path: "C:\\electron\\electron.exe",
      args: ["C:\\repo\\apps\\desktop"],
    });
  });
});
