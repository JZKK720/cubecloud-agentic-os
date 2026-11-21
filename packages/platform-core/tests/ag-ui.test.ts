import { describe, expect, it } from "vitest";
import {
  approvalToInterrupt,
  createAgUiEncoder,
  decodeAgUiEvent,
  resumeToVerdict,
  validateResumeCoverage,
  type AgUiEvent,
  type AgUiToolCallArgs,
  type AgUiToolCallResult,
  type AgUiToolCallStart,
} from "../src/ag-ui";
import type { HarnessTurnDelta } from "../src/harness";

// AG-UI 1.0 is frozen and mechanically pinned upstream. These tests pin
// the two properties that actually bite naive implementations:
//   1. message content is always bracketed by START/END for the same id;
//   2. optional fields are omitted, never null.
// They also pin the interrupt/resume contract our approval inbox relies on.

const OPTS = { threadId: "t1", runId: "r1" };

function collect(deltas: HarnessTurnDelta[]): AgUiEvent[] {
  const enc = createAgUiEncoder(OPTS);
  const out: AgUiEvent[] = [];
  for (const d of deltas) out.push(...enc.push(d));
  out.push(...enc.finish());
  return out;
}

const types = (events: AgUiEvent[]): string[] => events.map((e) => e.type);

describe("createAgUiEncoder", () => {
  it("emits RUN_STARTED once, then text bracketed by START/CONTENT/END", () => {
    const events = collect([
      { type: "text", content: "Hello" },
      { type: "text", content: " world" },
    ]);

    expect(types(events)).toEqual([
      "RUN_STARTED",
      "TEXT_MESSAGE_START",
      "TEXT_MESSAGE_CONTENT",
      "TEXT_MESSAGE_CONTENT",
      "TEXT_MESSAGE_END",
      "RUN_FINISHED",
    ]);

    const started = events[0];
    expect(started).toMatchObject({
      threadId: "t1",
      runId: "r1",
      protocolVersion: "1.0",
    });
  });

  it("reuses one message id for the whole text block", () => {
    const events = collect([
      { type: "text", content: "a" },
      { type: "text", content: "b" },
    ]);

    const ids = events
      .filter((e) => "messageId" in e)
      .map((e) => (e as { messageId: string }).messageId);
    expect(new Set(ids).size).toBe(1);
  });

  it("closes the text message before a tool call opens", () => {
    const events = collect([
      { type: "text", content: "Let me check." },
      { type: "tool_call", callId: "c1", name: "read_file", args: '{"p":"a"}' },
    ]);

    const seq = types(events);
    expect(seq.indexOf("TEXT_MESSAGE_END")).toBeLessThan(
      seq.indexOf("TOOL_CALL_START"),
    );
  });

  it("maps a tool call to START/ARGS/END with the same id", () => {
    const events = collect([
      { type: "tool_call", callId: "c1", name: "read_file", args: '{"p":"a"}' },
    ]);

    const start = events.find((e) => e.type === "TOOL_CALL_START") as AgUiToolCallStart;
    const args = events.find((e) => e.type === "TOOL_CALL_ARGS") as AgUiToolCallArgs;
    const end = events.find((e) => e.type === "TOOL_CALL_END") as { toolCallId: string };

    expect(start.toolCallId).toBe("c1");
    expect(start.toolCallName).toBe("read_file");
    expect(args).toMatchObject({ toolCallId: "c1", delta: '{"p":"a"}' });
    expect(end.toolCallId).toBe("c1");
  });

  it("maps a tool result to TOOL_CALL_RESULT carrying a messageId", () => {
    const events = collect([
      { type: "tool_result", callId: "c1", content: "contents" },
    ]);

    const result = events.find(
      (e) => e.type === "TOOL_CALL_RESULT",
    ) as AgUiToolCallResult;
    expect(result.toolCallId).toBe("c1");
    expect(result.content).toBe("contents");
    expect(result.messageId).toBeTruthy();
  });

  it("brackets reasoning separately from text", () => {
    const events = collect([
      { type: "reasoning", content: "thinking" },
      { type: "text", content: "answer" },
    ]);

    const seq = types(events);
    expect(seq).toContain("REASONING_START");
    expect(seq).toContain("REASONING_MESSAGE_CONTENT");
    expect(seq).toContain("REASONING_MESSAGE_END");
    expect(seq).toContain("REASONING_END");
    // Reasoning must close before the text block opens.
    expect(seq.indexOf("REASONING_END")).toBeLessThan(
      seq.indexOf("TEXT_MESSAGE_START"),
    );
  });

  it("does not invent an event for usage (AG-UI has no usage type)", () => {
    const events = collect([{ type: "usage", promptTokens: 1, completionTokens: 2 }]);
    expect(types(events)).toEqual(["RUN_STARTED", "RUN_FINISHED"]);
  });

  it("never emits null for absent optional fields", () => {
    const events = collect([{ type: "text", content: "hi" }]);
    for (const event of events) {
      for (const [key, value] of Object.entries(event)) {
        expect(value, `${event.type}.${key} must not be null`).not.toBeNull();
      }
    }
  });

  it("finish() is idempotent about the run terminator", () => {
    const enc = createAgUiEncoder(OPTS);
    enc.push({ type: "done" });
    const after = enc.finish();
    // A second finish starts a fresh run envelope rather than emitting a
    // second terminator for the closed one.
    expect(after[0].type).toBe("RUN_STARTED");
  });
});

describe("decodeAgUiEvent", () => {
  it("collapses text content into a harness delta", () => {
    const decoded = decodeAgUiEvent({
      type: "TEXT_MESSAGE_CONTENT",
      messageId: "m1",
      delta: "hi",
    });
    expect(decoded).toEqual({
      kind: "delta",
      delta: { type: "text", content: "hi" },
    });
  });

  it("reports bookends as ignored, not as data", () => {
    const decoded = decodeAgUiEvent({
      type: "TEXT_MESSAGE_START",
      messageId: "m1",
      role: "assistant",
    });
    expect(decoded.kind).toBe("ignored");
  });

  it("turns a terminal interrupt outcome into an interrupt signal", () => {
    const decoded = decodeAgUiEvent({
      type: "RUN_FINISHED",
      threadId: "t",
      runId: "r",
      outcome: {
        type: "interrupt",
        interrupts: [{ id: "i1", reason: "tool_approval" }],
      },
    });
    expect(decoded.kind).toBe("interrupt");
  });

  it("treats RUN_FINISHED without an outcome as done (0.x compat)", () => {
    const decoded = decodeAgUiEvent({
      type: "RUN_FINISHED",
      threadId: "t",
      runId: "r",
    });
    expect(decoded).toEqual({ kind: "delta", delta: { type: "done" } });
  });

  it("surfaces RUN_ERROR as an error, not a delta", () => {
    const decoded = decodeAgUiEvent({
      type: "RUN_ERROR",
      message: "boom",
      code: "E_X",
    });
    expect(decoded).toEqual({ kind: "error", message: "boom", code: "E_X" });
  });
});

describe("approval ⇄ interrupt mapping", () => {
  const approval = {
    id: "ap1",
    sessionId: "s1",
    toolName: "run_command",
    command: "rm -rf build",
    reason: "destructive command",
  };

  it("carries the approval id and session into the interrupt", () => {
    const interrupt = approvalToInterrupt(approval);
    expect(interrupt.id).toBe("ap1");
    expect(interrupt.reason).toBe("tool_approval");
    expect(interrupt.metadata).toEqual({ sessionId: "s1" });
    expect(interrupt.message).toContain("run_command");
  });

  it("maps a resolved payload back to a verdict", () => {
    expect(
      resumeToVerdict({ interruptId: "ap1", status: "resolved", payload: "approve" }),
    ).toBe("approve");
    expect(
      resumeToVerdict({ interruptId: "ap1", status: "resolved", payload: "deny" }),
    ).toBe("deny");
  });

  it("returns null for cancelled or unrecognised payloads", () => {
    expect(resumeToVerdict({ interruptId: "ap1", status: "cancelled" })).toBeNull();
    expect(
      resumeToVerdict({ interruptId: "ap1", status: "resolved", payload: "maybe" }),
    ).toBeNull();
  });
});

describe("validateResumeCoverage", () => {
  const interrupts = [
    { id: "i1", reason: "tool_approval" },
    { id: "i2", reason: "tool_approval" },
  ];

  it("accepts a complete resume list", () => {
    expect(
      validateResumeCoverage(interrupts, [
        { interruptId: "i1", status: "resolved", payload: "approve" },
        { interruptId: "i2", status: "cancelled" },
      ]),
    ).toEqual([]);
  });

  it("flags an omitted interrupt — omission is not abandonment", () => {
    expect(
      validateResumeCoverage(interrupts, [
        { interruptId: "i1", status: "resolved", payload: "approve" },
      ]),
    ).toEqual(["unanswered:i2"]);
  });

  it("flags duplicates and unknown ids", () => {
    const problems = validateResumeCoverage(interrupts, [
      { interruptId: "i1", status: "resolved" },
      { interruptId: "i1", status: "resolved" },
      { interruptId: "i2", status: "resolved" },
      { interruptId: "zz", status: "resolved" },
    ]);
    expect(problems).toContain("duplicate:i1");
    expect(problems).toContain("unknown:zz");
  });
});
