import { describe, expect, it, vi } from "vitest";
import type { HarnessTurnDelta } from "@cubecloud/platform-core";
import {
  canRouteThroughHarness,
  runTurnThroughHarness,
  type HarnessChatCallbacks,
  type HarnessRoutedRouter,
} from "../src/main/harness-chat";

// Before this module existed the harness registry only fed the before_model
// policy chain: chat still went straight to /v1/chat/completions. Registering
// a fifth runtime would have shown it in the UI and then ignored it for every
// real turn. These tests pin the adapter that closes that loop, and the
// capability check that keeps stub runtimes on the HTTP path.

function routerOf(deltas: HarnessTurnDelta[]): HarnessRoutedRouter {
  return {
    async *runTurn() {
      for (const d of deltas) yield d;
    },
  };
}

function callbacks(): HarnessChatCallbacks & {
  onChunk: ReturnType<typeof vi.fn>;
  onDone: ReturnType<typeof vi.fn>;
  onError: ReturnType<typeof vi.fn>;
  onToolProgress: ReturnType<typeof vi.fn>;
  onUsage: ReturnType<typeof vi.fn>;
  onReasoningChunk: ReturnType<typeof vi.fn>;
} {
  return {
    onChunk: vi.fn(),
    onDone: vi.fn(),
    onError: vi.fn(),
    onToolProgress: vi.fn(),
    onUsage: vi.fn(),
    onReasoningChunk: vi.fn(),
  };
}

const OPTIONS = { sessionId: "s1", input: { sessionId: "s1", message: "hi" } };

describe("runTurnThroughHarness", () => {
  it("forwards text deltas to onChunk and reports content", async () => {
    const cb = callbacks();
    const result = await runTurnThroughHarness(
      routerOf([
        { type: "text", content: "Hello" },
        { type: "done" },
      ]),
      cb,
      OPTIONS,
    );

    expect(cb.onChunk).toHaveBeenCalledWith("Hello");
    expect(result.producedContent).toBe(true);
    expect(cb.onDone).toHaveBeenCalled();
  });

  it("routes reasoning deltas to their own channel", async () => {
    const cb = callbacks();
    await runTurnThroughHarness(
      routerOf([
        { type: "reasoning", content: "thinking" },
        { type: "text", content: "answer" },
        { type: "done" },
      ]),
      cb,
      OPTIONS,
    );

    expect(cb.onReasoningChunk).toHaveBeenCalledWith("thinking");
    // Reasoning must not leak into the visible answer.
    expect(cb.onChunk).toHaveBeenCalledTimes(1);
    expect(cb.onChunk).toHaveBeenCalledWith("answer");
  });

  it("maps usage deltas onto onUsage with a computed total", async () => {
    const cb = callbacks();
    await runTurnThroughHarness(
      routerOf([
        { type: "usage", promptTokens: 10, completionTokens: 5 },
        { type: "done" },
      ]),
      cb,
      OPTIONS,
    );

    expect(cb.onUsage).toHaveBeenCalledWith({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
    });
  });

  it("surfaces tool calls and results as progress labels", async () => {
    const cb = callbacks();
    await runTurnThroughHarness(
      routerOf([
        { type: "tool_call", callId: "c1", name: "read_file", args: "{}" },
        { type: "tool_result", callId: "c1", content: "ok" },
        { type: "done" },
      ]),
      cb,
      OPTIONS,
    );

    expect(cb.onToolProgress).toHaveBeenCalledWith("read_file");
    expect(cb.onToolProgress).toHaveBeenCalledWith("tool result");
  });

  it("passes a session id from the done delta through to onDone", async () => {
    const cb = callbacks();
    const result = await runTurnThroughHarness(
      routerOf([{ type: "done", sessionId: "srv-42" }]),
      cb,
      OPTIONS,
    );

    expect(cb.onDone).toHaveBeenCalledWith("srv-42");
    expect(result.sessionId).toBe("srv-42");
  });

  it("stops consuming after done, so a chatty adapter cannot hang the UI", async () => {
    const cb = callbacks();
    await runTurnThroughHarness(
      routerOf([
        { type: "text", content: "a" },
        { type: "done" },
        { type: "text", content: "should-never-arrive" },
      ]),
      cb,
      OPTIONS,
    );

    expect(cb.onChunk).toHaveBeenCalledTimes(1);
    expect(cb.onDone).toHaveBeenCalledTimes(1);
  });

  it("finishes the UI when the stream ends without a done delta", async () => {
    const cb = callbacks();
    const result = await runTurnThroughHarness(
      routerOf([{ type: "text", content: "partial" }]),
      cb,
      OPTIONS,
    );

    expect(cb.onDone).toHaveBeenCalled();
    expect(result.producedContent).toBe(true);
  });

  it("reports zero content for an empty turn", async () => {
    const cb = callbacks();
    const result = await runTurnThroughHarness(routerOf([]), cb, OPTIONS);
    expect(result.producedContent).toBe(false);
    expect(cb.onDone).toHaveBeenCalled();
  });
});

describe("canRouteThroughHarness", () => {
  const adapters = new Map<
    string,
    { profile: { providerId: string; supportsTurnExecution?: boolean } }
  >([
    ["hermes", { profile: { providerId: "hermes", supportsTurnExecution: true } }],
    ["ironclaw", { profile: { providerId: "ironclaw", supportsTurnExecution: false } }],
    ["legacy", { profile: { providerId: "legacy" } }],
  ]);

  it("accepts a provider whose adapter declares turn execution", () => {
    expect(canRouteThroughHarness(adapters, "hermes")).toBe(true);
  });

  it("refuses a declared stub", () => {
    expect(canRouteThroughHarness(adapters, "ironclaw")).toBe(false);
  });

  it("refuses an adapter that never declared the capability", () => {
    // Fail closed: silence is not a promise.
    expect(canRouteThroughHarness(adapters, "legacy")).toBe(false);
  });

  it("refuses an unknown or absent provider", () => {
    expect(canRouteThroughHarness(adapters, "nope")).toBe(false);
    expect(canRouteThroughHarness(adapters, undefined)).toBe(false);
  });
});
