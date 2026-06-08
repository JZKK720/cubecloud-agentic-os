import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { execFileMock } = vi.hoisted(() => ({
  execFileMock: vi.fn(),
}));

vi.mock("child_process", () => ({
  execFile: execFileMock,
}));

import { discoverControlPlaneProviderModels } from "./providerDiscovery";

describe("providerDiscovery", () => {
  beforeEach(() => {
    execFileMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("discovers Ollama models through the native /api/tags endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [{ name: "llama3.2:3b" }, { model: "qwen2.5-coder:7b" }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await discoverControlPlaneProviderModels(
      "ollama",
      "http://127.0.0.1:11434/v1",
    );

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:11434/api/tags");
    expect(result.status).toBe("ok");
    expect(result.models).toEqual(["llama3.2:3b", "qwen2.5-coder:7b"]);
  });

  it("reports a missing CLI when the codex command is unavailable", async () => {
    execFileMock.mockImplementation(
      (
        _file: string,
        _args: string[],
        callback: (error: Error | null, stdout?: string, stderr?: string) => void,
      ) => {
        callback(new Error("missing"), "", "");
        return {};
      },
    );

    const result = await discoverControlPlaneProviderModels("openai-codex");

    expect(result.status).toBe("missing-cli");
    expect(result.models).toEqual([]);
  });
});