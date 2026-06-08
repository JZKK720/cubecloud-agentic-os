/**
 * Unit tests for the chat-compression hook
 * (src/main/headroom-chat.ts).
 *
 * The function is the hot-path chokepoint for LLM calls in
 * hermes.ts. It must:
 *   - return the original messages when below
 *     MIN_MESSAGES_TO_COMPRESS
 *   - return the original when config.enabled is false
 *   - return the original when the sidecar isn't running
 *   - return the original when compressMessages fails
 *   - never throw on compressMessages rejection
 *   - apply compression to messages and report savings
 *   - expose isOllamaLikeProvider for the Ollama-aware
 *     footer attribution
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  compressMessagesMock,
  getHeadroomSidecarStatusMock,
  loadHeadroomConfigMock,
} = vi.hoisted(() => ({
  compressMessagesMock: vi.fn(),
  getHeadroomSidecarStatusMock: vi.fn(),
  loadHeadroomConfigMock: vi.fn(),
}));

vi.mock("../src/main/headroom", () => ({
  compressMessages: compressMessagesMock,
  loadHeadroomConfig: loadHeadroomConfigMock,
}));

vi.mock("../src/main/headroom-sidecar", () => ({
  getHeadroomSidecarStatus: getHeadroomSidecarStatusMock,
}));

function makeMessages(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    role: "user" as const,
    content: `message ${i}: ${"x".repeat(200)}`,
  }));
}

function sidecarState(state: string) {
  return {
    state,
    running: state === "running",
    pid: state === "running" ? 1 : null,
    port: 8787,
    baseUrl: "http://127.0.0.1:8787",
    lastError: null,
    crashCount: 0,
    startedAt: 0,
    uptimeMs: 0,
    reason: null,
    mode: "audit" as const,
  };
}

function enabledConfig() {
  return {
    baseUrl: "http://127.0.0.1:8787",
    mode: "audit" as const,
    enabled: true,
    apiKey: null,
  };
}

describe("compressForChat", () => {
  beforeEach(() => {
    compressMessagesMock.mockReset();
    getHeadroomSidecarStatusMock.mockReset();
    loadHeadroomConfigMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns original when conversation is too short", async () => {
    const { compressForChat } = await import("../src/main/headroom-chat");
    const result = await compressForChat(makeMessages(1));
    expect(result.compressed).toBe(false);
    expect(result.skipReason).toBe("too-few-messages");
    expect(compressMessagesMock).not.toHaveBeenCalled();
  });

  it("returns original when Headroom is disabled", async () => {
    const { compressForChat } = await import("../src/main/headroom-chat");
    loadHeadroomConfigMock.mockResolvedValue({
      ...enabledConfig(),
      enabled: false,
    });
    getHeadroomSidecarStatusMock.mockReturnValue(sidecarState("running"));
    const result = await compressForChat(makeMessages(4));
    expect(result.compressed).toBe(false);
    expect(result.skipReason).toBe("headroom-disabled");
    expect(compressMessagesMock).not.toHaveBeenCalled();
  });

  it("returns original when sidecar is stopped", async () => {
    const { compressForChat } = await import("../src/main/headroom-chat");
    loadHeadroomConfigMock.mockResolvedValue(enabledConfig());
    getHeadroomSidecarStatusMock.mockReturnValue(sidecarState("stopped"));
    const result = await compressForChat(makeMessages(4));
    expect(result.compressed).toBe(false);
    expect(result.skipReason).toBe("sidecar-not-running");
    expect(compressMessagesMock).not.toHaveBeenCalled();
  });

  it("returns original when compressMessages reports failure", async () => {
    const { compressForChat } = await import("../src/main/headroom-chat");
    loadHeadroomConfigMock.mockResolvedValue(enabledConfig());
    getHeadroomSidecarStatusMock.mockReturnValue(sidecarState("running"));
    compressMessagesMock.mockResolvedValue({
      success: false,
      messages: [],
      tokensBefore: 0,
      tokensAfter: 0,
      savingsPercent: 0,
      compressed: false,
      error: "proxy offline",
    });
    const result = await compressForChat(makeMessages(4));
    expect(result.compressed).toBe(false);
    expect(result.error).toBe("proxy offline");
  });

  it("reports no-compression-applied when proxy says no compression", async () => {
    const { compressForChat } = await import("../src/main/headroom-chat");
    loadHeadroomConfigMock.mockResolvedValue(enabledConfig());
    getHeadroomSidecarStatusMock.mockReturnValue(sidecarState("running"));
    compressMessagesMock.mockResolvedValue({
      success: true,
      messages: makeMessages(4),
      tokensBefore: 100,
      tokensAfter: 100,
      savingsPercent: 0,
      compressed: false,
    });
    const result = await compressForChat(makeMessages(4));
    expect(result.compressed).toBe(false);
    expect(result.skipReason).toBe("no-compression-applied");
  });

  it("applies compression and reports savings on success", async () => {
    const { compressForChat } = await import("../src/main/headroom-chat");
    loadHeadroomConfigMock.mockResolvedValue(enabledConfig());
    getHeadroomSidecarStatusMock.mockReturnValue(sidecarState("running"));
    const compressed = makeMessages(2);
    compressMessagesMock.mockResolvedValue({
      success: true,
      messages: compressed,
      tokensBefore: 2400,
      tokensAfter: 600,
      savingsPercent: 75,
      compressed: true,
    });
    const result = await compressForChat(makeMessages(4), {
      model: "llama3.1:8b",
      providerHint: "local:ollama",
    });
    expect(result.compressed).toBe(true);
    expect(result.tokensBefore).toBe(2400);
    expect(result.tokensAfter).toBe(600);
    expect(result.savingsPercent).toBe(75);
    expect(result.providerHint).toBe("local:ollama");
    expect(result.messages).toBe(compressed);
    expect(result.compressMs).toBeGreaterThanOrEqual(0);
  });

  it("never throws on compressMessages rejection (timeout-style)", async () => {
    const { compressForChat } = await import("../src/main/headroom-chat");
    loadHeadroomConfigMock.mockResolvedValue(enabledConfig());
    getHeadroomSidecarStatusMock.mockReturnValue(sidecarState("running"));
    // The production code wraps compressMessages in
    // .catch(() => null), so a rejection becomes a null
    // result. Verify the helper still returns gracefully.
    compressMessagesMock.mockRejectedValue(new Error("network blip"));
    const result = await compressForChat(makeMessages(4));
    expect(result.compressed).toBe(false);
    expect(result.error).toMatch(/compress-failed-or-timeout/);
  });

  it("passes the model through to compressMessages", async () => {
    const { compressForChat } = await import("../src/main/headroom-chat");
    loadHeadroomConfigMock.mockResolvedValue(enabledConfig());
    getHeadroomSidecarStatusMock.mockReturnValue(sidecarState("running"));
    compressMessagesMock.mockResolvedValue({
      success: true,
      messages: makeMessages(2),
      tokensBefore: 0,
      tokensAfter: 0,
      savingsPercent: 0,
      compressed: true,
    });
    await compressForChat(makeMessages(4), { model: "qwen2.5:14b" });
    expect(compressMessagesMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(Array),
      "qwen2.5:14b",
    );
  });
});

describe("isOllamaLikeProvider", () => {
  it("recognises local openai-compat providers", async () => {
    const { isOllamaLikeProvider } = await import("../src/main/headroom-chat");
    expect(isOllamaLikeProvider("ollama")).toBe(true);
    expect(isOllamaLikeProvider("OLLAMA")).toBe(true);
    expect(isOllamaLikeProvider("llamacpp")).toBe(true);
    expect(isOllamaLikeProvider("lmstudio")).toBe(true);
    expect(isOllamaLikeProvider("vllm")).toBe(true);
  });

  it("rejects remote providers", async () => {
    const { isOllamaLikeProvider } = await import("../src/main/headroom-chat");
    expect(isOllamaLikeProvider("openai")).toBe(false);
    expect(isOllamaLikeProvider("anthropic")).toBe(false);
    expect(isOllamaLikeProvider("groq")).toBe(false);
    expect(isOllamaLikeProvider("")).toBe(false);
    expect(isOllamaLikeProvider(null)).toBe(false);
    expect(isOllamaLikeProvider(undefined)).toBe(false);
  });
});
