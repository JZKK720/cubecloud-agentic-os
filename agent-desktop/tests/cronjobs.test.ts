import { describe, it, expect, vi, beforeEach } from "vitest";

const { execFileSpy } = vi.hoisted(() => ({
  execFileSpy: vi.fn(
    (
      _file: string,
      _args: string[],
      _options: Record<string, unknown>,
      callback: (err: Error | null, stdout: string, stderr: string) => void,
    ) => callback(null, "ok", ""),
  ),
}));

vi.mock("child_process", () => ({
  execFile: execFileSpy,
  default: { execFile: execFileSpy },
}));

vi.mock("../src/main/utils", () => ({
  profileHome: () => "C:/hermes",
}));

vi.mock("../src/main/hermes", () => ({
  isRemoteMode: () => false,
  getApiUrl: () => "http://127.0.0.1:8642",
  getRemoteAuthHeader: () => ({}),
}));

// cronjobs.ts imports these from "./homer" (the module was renamed from
// installer). Mocking the old path left this a dead mock, so the real
// platform-branching hermesCliArgs() ran and the assertion only held on
// Windows.
vi.mock("../src/main/homer", () => ({
  HERMES_HOME: "C:/hermes",
  HERMES_PYTHON: "C:/hermes/hermes-agent/venv/Scripts/pythonw.exe",
  HERMES_SCRIPT: "C:/hermes/hermes-agent/venv/bin/hermes",
  hermesCliArgs: (args: string[] = []) => ["-m", "hermes_cli.main", ...args],
}));

describe("createCronJob", () => {
  beforeEach(() => {
    execFileSpy.mockClear();
  });

  it("passes the prompt as the cron create positional argument before flags", async () => {
    const { createCronJob } = await import("../src/main/cronjobs");

    await createCronJob(
      "7 17 * * *",
      "Create a daily brief with local news, weather, and quotes.",
      "Daily brief",
      "telegram",
    );

    expect(execFileSpy).toHaveBeenCalledTimes(1);
    expect(execFileSpy.mock.calls[0][1]).toEqual([
      "-m",
      "hermes_cli.main",
      "cron",
      "create",
      "7 17 * * *",
      "Create a daily brief with local news, weather, and quotes.",
      "--name",
      "Daily brief",
      "--deliver",
      "telegram",
    ]);
    expect(execFileSpy.mock.calls[0][1]).not.toContain("--");
  });
});
