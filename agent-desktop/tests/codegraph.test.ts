import { beforeEach, describe, expect, it, vi } from "vitest";

const { execFileSpy, spawnSyncSpy, existsSyncSpy } = vi.hoisted(() => {
  return {
    execFileSpy: vi.fn(),
    spawnSyncSpy: vi.fn(),
    existsSyncSpy: vi.fn(),
  };
});

vi.mock("child_process", () => ({
  execFile: execFileSpy,
  spawnSync: spawnSyncSpy,
  default: {
    execFile: execFileSpy,
    spawnSync: spawnSyncSpy,
  },
}));

vi.mock("fs", () => ({
  existsSync: existsSyncSpy,
  default: {
    existsSync: existsSyncSpy,
  },
}));

vi.mock("../src/main/homer", () => ({
  getEnhancedPath: () => "C:\\mock-bin",
  HERMES_HOME: "D:\\hermes",
}));

describe("CodeGraph workspace integration", () => {
  beforeEach(() => {
    vi.resetModules();
    execFileSpy.mockReset();
    spawnSyncSpy.mockReset();
    existsSyncSpy.mockReset();
  });

  it("resolves the codegraph launcher and reads its version", async () => {
    const isWindows = process.platform === "win32";
    spawnSyncSpy.mockReturnValue({
      error: null,
      status: 0,
      stdout: isWindows
        ? "C:\\Users\\test\\AppData\\Roaming\\npm\\codegraph.cmd\r\n"
        : "/usr/local/bin/codegraph\n",
    });
    execFileSpy.mockImplementation(
      (
        _file: string,
        _args: string[],
        _opts: Record<string, unknown>,
        callback: (err: Error | null, stdout: string, stderr: string) => void,
      ) => callback(null, "0.9.8\n", ""),
    );

    const { getCodeGraphCliStatus } = await import("../src/main/codegraph");
    const status = await getCodeGraphCliStatus();

    expect(status.installed).toBe(true);
    expect(status.version).toBe("0.9.8");
    expect(execFileSpy).toHaveBeenCalledTimes(1);
    // The lookup binary is platform-specific. Pinning it stops a
    // Windows-only lookup from shipping silently on Linux.
    expect(spawnSyncSpy.mock.calls[0]?.[0]).toBe(
      isWindows ? "where.exe" : "which",
    );

    if (isWindows) {
      // A .cmd launcher only runs through cmd.exe with the /d /s /c prefix.
      expect(status.command).toContain("codegraph.cmd");
      expect(execFileSpy.mock.calls[0]?.[0]).toBe(
        process.env.ComSpec || "cmd.exe",
      );
      expect(execFileSpy.mock.calls[0]?.[1]).toEqual(
        expect.arrayContaining([
          "/d",
          "/s",
          "/c",
          expect.stringContaining("codegraph.cmd"),
        ]),
      );
    } else {
      // A POSIX executable is spawned directly with its args untouched.
      expect(status.command).toBe("/usr/local/bin/codegraph");
      expect(execFileSpy.mock.calls[0]?.[0]).toBe("/usr/local/bin/codegraph");
      expect(execFileSpy.mock.calls[0]?.[1]).toEqual(["--version"]);
    }
  });

  it("returns an uninitialized project status without spawning the CLI", async () => {
    existsSyncSpy.mockReturnValue(false);

    const { getCodeGraphProjectStatus } = await import(
      "../src/main/codegraph"
    );
    const result = await getCodeGraphProjectStatus("D:\\repo");

    expect(result.success).toBe(true);
    expect(result.status?.initialized).toBe(false);
    expect(result.status?.projectPath).toBe("D:\\repo");
    expect(spawnSyncSpy).not.toHaveBeenCalled();
    expect(execFileSpy).not.toHaveBeenCalled();
  });

  it("installs CodeGraph globally through npm when requested", async () => {
    const isWindows = process.platform === "win32";
    spawnSyncSpy.mockReturnValue({
      error: null,
      status: 0,
      stdout: isWindows
        ? "C:\\Users\\test\\AppData\\Roaming\\npm\\npm.cmd\r\n"
        : "/usr/local/bin/npm\n",
    });
    existsSyncSpy.mockReturnValue(false);
    execFileSpy.mockImplementation(
      (
        _file: string,
        _args: string[],
        _opts: Record<string, unknown>,
        callback: (err: Error | null, stdout: string, stderr: string) => void,
      ) => callback(null, "added 1 package\n", ""),
    );

    const { installCodeGraphCli } = await import("../src/main/codegraph");
    const result = await installCodeGraphCli();

    expect(result.success).toBe(true);
    expect(execFileSpy).toHaveBeenCalledTimes(2);
    if (isWindows) {
      expect(execFileSpy.mock.calls[0]?.[1]).toEqual(
        expect.arrayContaining([
          "/d",
          "/s",
          "/c",
          expect.stringContaining("npm.cmd"),
        ]),
      );
    } else {
      // POSIX spawns npm directly, so the cmd.exe wrapper must be absent.
      expect(execFileSpy.mock.calls[0]?.[0]).toBe("/usr/local/bin/npm");
      expect(execFileSpy.mock.calls[0]?.[1]).toEqual([
        "install",
        "-g",
        "@colbymchenry/codegraph@latest",
      ]);
    }
  });

  it("configures the Hermes target through CodeGraph install", async () => {
    const isWindows = process.platform === "win32";
    spawnSyncSpy.mockReturnValue({
      error: null,
      status: 0,
      stdout: isWindows
        ? "C:\\Users\\test\\AppData\\Roaming\\npm\\codegraph.cmd\r\n"
        : "/usr/local/bin/codegraph\n",
    });
    execFileSpy.mockImplementation(
      (
        _file: string,
        _args: string[],
        _opts: Record<string, unknown>,
        callback: (err: Error | null, stdout: string, stderr: string) => void,
      ) => callback(null, "Hermes configured\n", ""),
    );

    const { setupCodeGraphHermes } = await import("../src/main/codegraph");
    const result = await setupCodeGraphHermes();

    expect(result.success).toBe(true);
    expect(execFileSpy).toHaveBeenCalledTimes(1);
    expect(execFileSpy.mock.calls[0]?.[1]).toEqual(
      expect.arrayContaining([
        isWindows ? "/d" : "install",
        expect.stringContaining("--target=hermes"),
      ]),
    );
    if (isWindows) {
      expect(execFileSpy.mock.calls[0]?.[1]).toEqual(
        expect.arrayContaining(["/s", "/c"]),
      );
    }
    // The install must point CodeGraph at this profile's Hermes home.
    expect(
      (execFileSpy.mock.calls[0]?.[2] as { env?: Record<string, string> }).env
        ?.HERMES_HOME,
    ).toBe("D:\\hermes");
  });
});