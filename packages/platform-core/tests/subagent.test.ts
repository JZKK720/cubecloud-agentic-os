// P10: Subagent exploration tests.
//
// A read-only child harness with fresh context for broad research.
// The subagent gets a fresh context window (no parent history),
// has read-only tools (no file writes, no command execution),
// and returns a summary to the parent.

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  type SubagentConfig,
  type SubagentResult,
  createSubagentConfig,
  validateSubagentConfig,
  READ_ONLY_TOOLS,
  runSubagent,
} from "../src/subagent";
import type { Harness, HarnessRouter } from "../src/harness";

// ── Mock harness for subagent tests ───────────────────────

function makeMockHarness(): Harness {
  return {
    profile: {
      transport: "http",
      supportsStreaming: true,
      supportsToolCalls: true,
      supportsCompaction: false,
      supportsSessionReset: true,
      providerId: "hermes",
      displayName: "Hermes",
    },
    turns: {
      async *runTurn(input) {
        yield { type: "text" as const, content: `research result for: ${input.message}` };
        yield { type: "done" as const, sessionId: input.sessionId };
      },
      async resetSession() {},
      async close() {},
    },
    models: {
      shouldRespond: () => true,
      async compactHistory(h: unknown[]) { return { compacted: false, history: h }; },
      async oneShot(p: string) { return `oneshot: ${p}`; },
    },
    tools: {
      mapToolName: (n: string) => n,
      unmapToolName: (n: string) => n,
    },
  };
}

// ── SubagentConfig tests ──────────────────────────────────

describe("createSubagentConfig", () => {
  it("creates a config with read-only tools by default", () => {
    const config = createSubagentConfig("Research the codebase architecture");
    expect(config.message).toBe("Research the codebase architecture");
    expect(config.tools).toEqual(READ_ONLY_TOOLS);
    expect(config.readOnly).toBe(true);
    expect(config.freshContext).toBe(true);
  });

  it("accepts custom tools", () => {
    const config = createSubagentConfig("test", { tools: ["read", "search", "write"] });
    expect(config.tools).toEqual(["read", "search", "write"]);
    expect(config.readOnly).toBe(false);
  });

  it("accepts a custom model", () => {
    const config = createSubagentConfig("test", { model: "anthropic:claude-5" });
    expect(config.model).toBe("anthropic:claude-5");
  });
});

describe("READ_ONLY_TOOLS", () => {
  it("contains read and search tools", () => {
    expect(READ_ONLY_TOOLS).toContain("read");
    expect(READ_ONLY_TOOLS).toContain("search");
  });

  it("does not contain write or execute tools", () => {
    expect(READ_ONLY_TOOLS).not.toContain("write");
    expect(READ_ONLY_TOOLS).not.toContain("execute");
    expect(READ_ONLY_TOOLS).not.toContain("shell");
  });
});

// ── validateSubagentConfig tests ──────────────────────────

describe("validateSubagentConfig", () => {
  it("returns no errors for a valid read-only config", () => {
    const config = createSubagentConfig("test");
    const errors = validateSubagentConfig(config);
    expect(errors).toEqual([]);
  });

  it("returns an error when readOnly is true but tools include write", () => {
    const config: SubagentConfig = {
      message: "test",
      tools: ["read", "write"],
      readOnly: true,
      freshContext: true,
    };
    const errors = validateSubagentConfig(config);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("write");
  });

  it("returns an error when message is empty", () => {
    const config: SubagentConfig = {
      message: "",
      tools: READ_ONLY_TOOLS,
      readOnly: true,
      freshContext: true,
    };
    const errors = validateSubagentConfig(config);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("message");
  });
});

// ── runSubagent tests ─────────────────────────────────────

describe("runSubagent", () => {
  it("runs a subagent and returns a summary result", async () => {
    const mockHarness = makeMockHarness();
    const mockRouter: HarnessRouter = {
      async *runTurn(_sessionId, input) {
        yield* mockHarness.turns.runTurn(input);
      },
      getActiveProvider: () => "hermes",
      async close() {},
    };

    const config = createSubagentConfig("Research the architecture");
    const result = await runSubagent(mockRouter, config);

    expect(result.success).toBe(true);
    expect(result.summary).toContain("research result for: Research the architecture");
    expect(result.deltas).toBeDefined();
    expect(result.deltas.length).toBeGreaterThan(0);
  });

  it("returns failure when validation fails", async () => {
    const mockRouter: HarnessRouter = {
      async *runTurn() { yield { type: "text", content: "x" }; },
      getActiveProvider: () => "hermes",
      async close() {},
    };

    const config: SubagentConfig = {
      message: "",
      tools: READ_ONLY_TOOLS,
      readOnly: true,
      freshContext: true,
    };
    const result = await runSubagent(mockRouter, config);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it("catches harness errors and returns failure", async () => {
    const mockRouter: HarnessRouter = {
      async *runTurn() {
        throw new Error("gateway down");
      },
      getActiveProvider: () => "hermes",
      async close() {},
    };

    const config = createSubagentConfig("test");
    const result = await runSubagent(mockRouter, config);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("gateway down");
  });
});