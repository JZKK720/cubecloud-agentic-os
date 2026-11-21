import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { HarnessTurnDelta } from "@cubecloud/platform-core";
import { createDeepSeekHarness } from "../src/main/harnesses/deepseek-harness";
import {
  dshEventToReasoning,
  dshEventToText,
} from "../src/main/dsh-jsonrpc-client";

// DeepSeek Harness exposes NO OpenAI-compatible gateway. Its inbound surface
// is the SDK wire protocol: JSON-RPC 2.0, newline-delimited, over stdio
// (verified against packages/sdk/protocol/README.md upstream). These tests
// therefore drive a real child process speaking that protocol rather than
// mocking fetch() — an HTTP-shaped mock would test a contract dsh does not
// have.

const FIXTURE = resolve(__dirname, "fixtures", "dsh-fixture-runtime.cjs");

function fixtureHarness() {
  return createDeepSeekHarness({
    command: process.execPath,
    args: [FIXTURE],
  });
}

async function collect(
  iter: AsyncIterable<HarnessTurnDelta>,
): Promise<HarnessTurnDelta[]> {
  const out: HarnessTurnDelta[] = [];
  for await (const delta of iter) out.push(delta);
  return out;
}

describe("dsh event mapping", () => {
  it("reads every text batch from an assistant/message stream", () => {
    const text = dshEventToText({
      type: "assistant/message",
      data: {
        stream: [
          { type: "text-chunks", texts: ["Hello from ", "DeepSeek Harness."] },
        ],
      },
    });
    expect(text).toBe("Hello from DeepSeek Harness.");
  });

  it("reads a single text-delta chunk", () => {
    const text = dshEventToText({
      type: "assistant/message",
      data: { stream: [{ type: "chunk", chunk: { type: "text-delta", text: "hi" } }] },
    });
    expect(text).toBe("hi");
  });

  it("separates reasoning from visible text", () => {
    const event = {
      type: "assistant/message" as const,
      data: {
        stream: [
          { type: "reasoning-chunks", texts: ["thinking"] },
          { type: "text-chunks", texts: ["answer"] },
        ],
      },
    };
    expect(dshEventToReasoning(event)).toBe("thinking");
    expect(dshEventToText(event)).toBe("answer");
  });

  it("returns null for events that carry no model text", () => {
    expect(dshEventToText({ type: "turn/start" })).toBeNull();
    expect(dshEventToReasoning({ type: "turn/start" })).toBeNull();
    expect(dshEventToText({ type: "assistant/message", data: {} })).toBeNull();
  });
});

describe("createDeepSeekHarness", () => {
  it("declares a stdio transport and real turn execution", () => {
    const harness = fixtureHarness();
    expect(harness.profile.transport).toBe("stdio");
    expect(harness.profile.providerId).toBe("deepseek-harness");
    expect(harness.profile.supportsTurnExecution).toBe(true);
    // dsh compacts internally; we must not claim to drive it.
    expect(harness.profile.supportsCompaction).toBe(false);
  });

  it("streams a turn from the fixture runtime over stdio", async () => {
    const harness = fixtureHarness();
    const deltas = await collect(
      harness.turns.runTurn({
        sessionId: "s1",
        message: "hello",
      }),
    );

    const text = deltas
      .filter((d) => d.type === "text")
      .map((d) => (d as { content: string }).content)
      .join("");
    expect(text).toBe("Hello from DeepSeek Harness.");

    // Reasoning is a separate channel, not folded into the answer.
    const reasoning = deltas.filter((d) => d.type === "reasoning");
    expect(reasoning).toHaveLength(1);

    // The turn terminates.
    expect(deltas.some((d) => d.type === "done")).toBe(true);
  });

  it("surfaces tool calls and results from the session log", async () => {
    const deltas = await collect(
      fixtureHarness().turns.runTurn({ sessionId: "s1", message: "hello" }),
    );

    const call = deltas.find((d) => d.type === "tool_call") as
      | { name: string; args: string; callId: string }
      | undefined;
    expect(call?.name).toBe("read_file");
    expect(call?.args).toContain("a.txt");
    expect(call?.callId).toBe("call-1");

    expect(deltas.some((d) => d.type === "tool_result")).toBe(true);
  });

  it("reports token usage from the assistant message", async () => {
    const deltas = await collect(
      fixtureHarness().turns.runTurn({ sessionId: "s1", message: "hello" }),
    );

    const usage = deltas.find((d) => d.type === "usage") as
      | { promptTokens: number; completionTokens: number }
      | undefined;
    expect(usage?.promptTokens).toBe(12);
    expect(usage?.completionTokens).toBe(4);
  });

  it("ends the turn instead of throwing when the runtime cannot start", async () => {
    const harness = createDeepSeekHarness({
      command: "definitely-not-a-real-binary-xyz",
      args: [],
    });

    // Must resolve to deltas, never reject — the chat path's error contract.
    const deltas = await collect(
      harness.turns.runTurn({ sessionId: "s1", message: "hello" }),
    );
    expect(deltas.some((d) => d.type === "done")).toBe(true);
  });

  it("reports a completed turn with the session id", async () => {
    const deltas = await collect(
      fixtureHarness().turns.runTurn({ sessionId: "s1", message: "hello" }),
    );

    const done = deltas[deltas.length - 1] as { type: string; sessionId?: string };
    expect(done.type).toBe("done");
    expect(done.sessionId).toBe("s1");
  });

  it("does not report an aborted turn as a clean completion", async () => {
    // turn/end carries a TurnEndReason of { kind: 'completed' | 'aborted' |
    // 'blocked' }. An aborted turn must not look like success, so the final
    // delta carries no session id.
    const harness = createDeepSeekHarness({
      command: process.execPath,
      args: [FIXTURE],
      env: { DSH_FIXTURE_ABORT: "1" },
    });

    const deltas = await collect(
      harness.turns.runTurn({ sessionId: "s1", message: "hello" }),
    );

    const done = deltas[deltas.length - 1] as { type: string; sessionId?: string };
    expect(done.type).toBe("done");
    expect(done.sessionId).toBeUndefined();
  });
});
