// Phase E — platform helper tests. The point is de-Electronization:
// the helper must answer without throwing when `window.electron` is
// absent (the browser shell), and still prefer Electron when present.

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  getPlatform,
  isWindows,
  isMac,
  getRuntimeVersions,
} from "../src/renderer/src/utils/platform";

function setElectron(value: unknown): void {
  Object.defineProperty(window, "electron", {
    configurable: true,
    value,
  });
}

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).electron;
});

describe("platform helper", () => {
  it("never throws when window.electron is absent (browser shell)", () => {
    setElectron(undefined);
    expect(typeof getPlatform()).toBe("string");
    expect(typeof isWindows()).toBe("boolean");
    expect(typeof isMac()).toBe("boolean");
    const v = getRuntimeVersions();
    expect(v).toEqual({ electron: "", chrome: "", node: "" });
  });

  it("prefers the Electron bridge when present", () => {
    setElectron({
      process: {
        platform: "win32",
        versions: { electron: "31.0.0", chrome: "126.0.0", node: "20.0.0" },
      },
    });
    expect(getPlatform()).toBe("win32");
    expect(isWindows()).toBe(true);
    expect(getRuntimeVersions().electron).toBe("31.0.0");
  });

  it("maps a darwin Electron platform to isMac", () => {
    setElectron({ process: { platform: "darwin", versions: {} } });
    expect(isMac()).toBe(true);
    expect(isWindows()).toBe(false);
  });
});
