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

vi.mock("../src/main/installer", () => ({
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

  it("detects a Windows npm-style codegraph launcher and reads its version", async () => {
    spawnSyncSpy.mockReturnValue({
      error: null,
      status: 0,
      stdout: "C:\\Users\\test\\AppData\\Roaming\\npm\\codegraph.cmd\r\n",
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
    expect(status.command).toContain("codegraph.cmd");
    expect(status.version).toBe("0.9.8");
    expect(execFileSpy).toHaveBeenCalledTimes(1);
    expect(execFileSpy.mock.calls[0]?.[1]).toEqual(
      expect.arrayContaining([
        "/d",
        "/s",
        "/c",
        expect.stringContaining("codegraph.cmd"),
      ]),
    );
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
    spawnSyncSpy.mockReturnValue({
      error: null,
      status: 0,
      stdout: "C:\\Users\\test\\AppData\\Roaming\\npm\\npm.cmd\r\n",
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
    expect(execFileSpy.mock.calls[0]?.[1]).toEqual(
      expect.arrayContaining([
        "/d",
        "/s",
        "/c",
        expect.stringContaining("npm.cmd"),
      ]),
    );
  });

  it("configures the Hermes target through CodeGraph install", async () => {
    spawnSyncSpy.mockReturnValue({
      error: null,
      status: 0,
      stdout: "C:\\Users\\test\\AppData\\Roaming\\npm\\codegraph.cmd\r\n",
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
        "/d",
        "/s",
        "/c",
        expect.stringContaining("--target=hermes"),
      ]),
    );
    expect(
      (execFileSpy.mock.calls[0]?.[2] as { env?: Record<string, string> }).env
        ?.HERMES_HOME,
    ).toBe("D:\\hermes");
  });
});