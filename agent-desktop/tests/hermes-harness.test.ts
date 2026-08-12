// P1 part 2: HermesHarness adapter tests.
//
// The HermesHarness wraps the existing hermes.ts#sendMessage() callback
// API behind the Harness interface's AsyncIterable<HarnessTurnDelta>.
// This test verifies the adapter correctly translates between the two.

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock hermes.ts — we only need sendMessage and ensureInitialized
vi.mock("../src/main/hermes", () => ({
  sendMessage: vi.fn(),
  ensureInitialized: vi.fn(),
}));

import { sendMessage } from "../src/main/hermes";
import { createHermesHarness } from "../src/main/harnesses/hermes-harness";

const mockSendMessage = vi.mocked(sendMessage);

describe("HermesHarness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("satisfies the Harness interface", () => {
    const harness = createHermesHarness();
    expect(harness.profile.providerId).toBe("hermes");
    expect(harness.profile.displayName).toBe("Hermes Agent");
    expect(harness.profile.transport).toBe("http");
    expect(harness.profile.supportsStreaming).toBe(true);
    expect(typeof harness.turns.runTurn).toBe("function");
    expect(typeof harness.turns.resetSession).toBe("function");
    expect(typeof harness.turns.close).toBe("function");
  });

  it("runTurn yields text deltas from sendMessage onChunk callbacks", async () => {
    mockSendMessage.mockImplementation(
      (
        _message: string,
        cb: {
          onChunk: (text: string) => void;
          onDone: (sessionId?: string) => void;
          onError: (error: string) => void;
        },
      ) => {
        // Simulate streaming chunks then done
        setTimeout(() => cb.onChunk("Hello "), 0);
        setTimeout(() => cb.onChunk("world"), 5);
        setTimeout(() => cb.onDone("session-123"), 10);
        return { abort: () => {} };
      },
    );

    const harness = createHermesHarness();
    const deltas: Array<{ type: string; content?: string; sessionId?: string }> =
      [];

    for await (const delta of harness.turns.runTurn({
      sessionId: "test-1",
      message: "hi",
    })) {
      deltas.push(delta as { type: string; content?: string; sessionId?: string });
    }

    expect(deltas).toEqual([
      { type: "text", content: "Hello " },
      { type: "text", content: "world" },
      { type: "done", sessionId: "session-123" },
    ]);
  });

  it("runTurn yields error delta when sendMessage calls onError", async () => {
    mockSendMessage.mockImplementation(
      (
        _message: string,
        cb: {
          onChunk: (text: string) => void;
          onDone: (sessionId?: string) => void;
          onError: (error: string) => void;
        },
      ) => {
        setTimeout(() => cb.onError("Gateway down"), 0);
        return { abort: () => {} };
      },
    );

    const harness = createHermesHarness();
    const deltas: Array<{ type: string; content?: string }> = [];

    for await (const delta of harness.turns.runTurn({
      sessionId: "test-2",
      message: "hi",
    })) {
      deltas.push(delta as { type: string; content?: string });
    }

    // Should yield a done delta with no sessionId (error case)
    const doneDelta = deltas.find((d) => d.type === "done");
    expect(doneDelta).toBeDefined();
    expect((doneDelta as { sessionId?: string }).sessionId).toBeUndefined();
  });

  it("runTurn yields reasoning deltas when onReasoningChunk is called", async () => {
    mockSendMessage.mockImplementation(
      (
        _message: string,
        cb: {
          onChunk: (text: string) => void;
          onReasoningChunk?: (text: string) => void;
          onDone: (sessionId?: string) => void;
          onError: (error: string) => void;
        },
      ) => {
        setTimeout(() => cb.onReasoningChunk?.("thinking..."), 0);
        setTimeout(() => cb.onChunk("answer"), 5);
        setTimeout(() => cb.onDone(), 10);
        return { abort: () => {} };
      },
    );

    const harness = createHermesHarness();
    const deltas: Array<{ type: string; content?: string }> = [];

    for await (const delta of harness.turns.runTurn({
      sessionId: "test-3",
      message: "hi",
    })) {
      deltas.push(delta as { type: string; content?: string });
    }

    expect(deltas[0]).toEqual({ type: "reasoning", content: "thinking..." });
    expect(deltas[1]).toEqual({ type: "text", content: "answer" });
    expect(deltas[2]).toEqual({ type: "done", sessionId: undefined });
  });

  it("runTurn yields usage delta when onUsage is called", async () => {
    mockSendMessage.mockImplementation(
      (
        _message: string,
        cb: {
          onChunk: (text: string) => void;
          onDone: (sessionId?: string) => void;
          onError: (error: string) => void;
          onUsage?: (usage: {
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
          }) => void;
        },
      ) => {
        setTimeout(() => cb.onChunk("response"), 0);
        setTimeout(
          () =>
            cb.onUsage?.({
              promptTokens: 10,
              completionTokens: 5,
              totalTokens: 15,
            }),
          5,
        );
        setTimeout(() => cb.onDone(), 10);
        return { abort: () => {} };
      },
    );

    const harness = createHermesHarness();
    const deltas: Array<{ type: string; [key: string]: unknown }> = [];

    for await (const delta of harness.turns.runTurn({
      sessionId: "test-4",
      message: "hi",
    })) {
      deltas.push(delta as { type: string; [key: string]: unknown });
    }

    const usageDelta = deltas.find((d) => d.type === "usage");
    expect(usageDelta).toBeDefined();
    expect(usageDelta!.promptTokens).toBe(10);
    expect(usageDelta!.completionTokens).toBe(5);
  });

  it("abort stops the stream early", async () => {
    mockSendMessage.mockImplementation(
      (
        _message: string,
        cb: {
          onChunk: (text: string) => void;
          onDone: (sessionId?: string) => void;
          onError: (error: string) => void;
        },
      ) => {
        // Simulate an immediate error (abort scenario)
        setTimeout(() => cb.onError("aborted"), 0);
        return {
          abort: () => {},
        };
      },
    );

    const harness = createHermesHarness();
    const deltas: Array<{ type: string }> = [];

    for await (const delta of harness.turns.runTurn({
      sessionId: "test-5",
      message: "hi",
    })) {
      deltas.push(delta as { type: string });
    }

    // Should have a done delta with no sessionId (error case)
    const doneDelta = deltas.find((d) => d.type === "done");
    expect(doneDelta).toBeDefined();
  });
});