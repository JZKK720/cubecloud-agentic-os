import { beforeEach, describe, expect, it, vi } from "vitest";
import http from "http";

const { execFileSpy, execFilePromisifiedSpy, mockState } = vi.hoisted(() => {
  const promisifyCustom = Symbol.for("nodejs.util.promisify.custom");
  const mockState = {
    dockerPsStdout: "",
    probedHealthUrls: [] as string[],
  };
  const execFilePromisifiedSpy = vi.fn(async () => ({
    stdout: mockState.dockerPsStdout,
    stderr: "",
  }));
  const execFileSpy = vi.fn(
    (
      _file: string,
      _args: string[],
      _options: Record<string, unknown>,
      callback: (err: Error | null, stdout: string, stderr: string) => void,
    ) => callback(null, mockState.dockerPsStdout, ""),
  ) as typeof vi.fn & Record<symbol, unknown>;
  execFileSpy[promisifyCustom] = execFilePromisifiedSpy;

  return {
    mockState,
    execFileSpy,
    execFilePromisifiedSpy,
  };
});

vi.mock("child_process", () => ({
  execFile: execFileSpy,
  default: { execFile: execFileSpy },
}));

describe("discoverDockerRuntimes", () => {
  beforeEach(() => {
    vi.resetModules();
    execFileSpy.mockClear();
    execFilePromisifiedSpy.mockClear();
    mockState.dockerPsStdout = "";
    mockState.probedHealthUrls = [];
  });

  it("prefers the IronClaw gateway on port 8281 when multiple published ports exist", async () => {
    mockState.dockerPsStdout = [
      JSON.stringify({
        ID: "abc123",
        Names: "ironclaw-gateway",
        Image: "ghcr.io/cubecloud/ironclaw:latest",
        Status: "Up 5 minutes",
        Ports:
          "0.0.0.0:3000->3000/tcp, 0.0.0.0:8281->8281/tcp, 0.0.0.0:8644->8644/tcp",
        Labels:
          "com.docker.compose.project=ironclaw,com.docker.compose.service=gateway",
      }),
    ].join("\n");

    const requestSpy = vi
      .spyOn(http, "request")
      .mockImplementation((target: unknown, ...rest: unknown[]) => {
        const targetUrl = String(target);
        mockState.probedHealthUrls.push(targetUrl);
        const callback = rest[rest.length - 1] as (response: {
          statusCode: number;
          resume: () => void;
        }) => void;
        callback({
          statusCode:
            targetUrl === "http://127.0.0.1:8281/health" ? 200 : 404,
          resume: () => {},
        });

        return {
          on: () => {},
          end: () => {},
          destroy: () => {},
        } as unknown as ReturnType<typeof http.request>;
      });

    try {
      const { discoverDockerRuntimes } = await import(
        "../src/main/docker-runtimes"
      );
      const result = await discoverDockerRuntimes();

      expect(execFilePromisifiedSpy).toHaveBeenCalledTimes(1);
      expect(mockState.probedHealthUrls).toContain(
        "http://127.0.0.1:8281/health",
      );
      expect(result.status).toBe("ready");
      expect(result.runtimes).toHaveLength(1);
      expect(result.runtimes[0]?.kind).toBe("ironclaw");
      expect(result.runtimes[0]?.port).toBe(8281);
      expect(result.runtimes[0]?.endpointUrl).toBe("http://127.0.0.1:8281");
      expect(result.runtimes[0]?.healthUrl).toBe(
        "http://127.0.0.1:8281/health",
      );
    } finally {
      requestSpy.mockRestore();
    }
  });
});