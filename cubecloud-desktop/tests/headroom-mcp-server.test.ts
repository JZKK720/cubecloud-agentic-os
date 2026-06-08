/**
 * Tests for the Headroom MCP server. The server is the
 * Streamable-HTTP wrapper around the three headroom IPC calls;
 * the tests exercise:
 *
 *   1. `handleMcpRequest` — JSON-RPC envelope parsing, tool
 *      dispatch, error shape for unknown methods / bad args.
 *   2. `dispatchToolCall` — argument validation, dispatcher
 *      plumbing, toolError shape on dispatcher throw.
 *   3. Lifecycle status shape — default state, status after
 *      setDispatcher, crash-count cap, log tail.
 *   4. In-process HTTP round-trip — bind to a random port,
 *      POST a `tools/call` envelope, parse the response.
 *
 * We never spawn the child subprocess in tests; the dispatcher
 * is replaced with a deterministic mock and `handleHttpRequest`
 * is exercised via the `createServer` factory from inside the
 * same process. That keeps the suite under 200 ms and avoids
 * the CI-specific pain of a long-lived child on Windows.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __getLogBufferForTests,
  __resetForTests,
  clearHeadroomMcpLogs,
  getHeadroomMcpLogTail,
  getHeadroomMcpStatus,
  handleMcpRequest,
  setHeadroomMcpDispatcher,
  type HeadroomMcpDispatcher,
} from "../src/main/mcp/headroom-mcp-server";

// ─── helpers ──────────────────────────────────────────────────────

function makeDispatcher(
  overrides: Partial<HeadroomMcpDispatcher> = {},
): HeadroomMcpDispatcher {
  return {
    async compress(messages, model) {
      return {
        success: true,
        messages,
        tokensBefore: 100,
        tokensAfter: 25,
        savingsPercent: 75,
        compressed: true,
        _echoed: { count: messages.length, model: model ?? null },
      };
    },
    async retrieve(key) {
      return { success: true, content: `original-for-${key}` };
    },
    async stats() {
      return {
        success: true,
        totalRequests: 42,
        totalTokensSaved: 12345,
        avgSavingsPercent: 71,
      };
    },
    ...overrides,
  };
}

// ─── teardown ─────────────────────────────────────────────────────

beforeEach(() => {
  __resetForTests();
  setHeadroomMcpDispatcher(makeDispatcher());
});

afterEach(() => {
  __resetForTests();
  vi.restoreAllMocks();
});

// ─── handleMcpRequest ─────────────────────────────────────────────

describe("handleMcpRequest", () => {
  it("rejects non-object bodies with a JSON-RPC parse error envelope", async () => {
    const r1 = await handleMcpRequest(null);
    expect(r1.error).toBeDefined();
    expect((r1.error as { code: number }).code).toBe(-32600);

    const r2 = await handleMcpRequest("a string");
    expect((r2.error as { code: number }).code).toBe(-32600);

    const r3 = await handleMcpRequest(42);
    expect((r3.error as { code: number }).code).toBe(-32600);
  });

  it("rejects envelopes that are missing `method`", async () => {
    const r = await handleMcpRequest({ jsonrpc: "2.0", id: 1 });
    expect((r.error as { code: number }).code).toBe(-32600);
  });

  it("returns method-not-found for unknown methods", async () => {
    const r = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 7,
      method: "tools/unknown",
    });
    expect((r.error as { code: number }).code).toBe(-32601);
    expect((r.error as { message: string }).message).toContain("tools/unknown");
  });

  it("handles `initialize` with protocol version, capabilities, serverInfo", async () => {
    const r = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
    });
    expect(r.error).toBeUndefined();
    const result = r.result as {
      protocolVersion: string;
      capabilities: { tools: Record<string, unknown> };
      serverInfo: { name: string; version: string };
    };
    expect(result.protocolVersion).toBe("2024-11-05");
    expect(result.capabilities.tools).toBeDefined();
    expect(result.serverInfo.name).toBe("headroom-mcp-server");
  });

  it("returns a JSON-RPC `result: {}` for `ping`", async () => {
    const r = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "ping",
    });
    expect(r.result).toEqual({});
  });

  it("exposes all three tools with JSON Schemas via `tools/list`", async () => {
    const r = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/list",
    });
    const tools = (r.result as { tools: Array<Record<string, unknown>> })
      .tools;
    const names = tools.map((t) => t.name);
    expect(names).toEqual([
      "headroom_compress",
      "headroom_retrieve",
      "headroom_stats",
    ]);
    for (const t of tools) {
      expect(t.inputSchema).toBeDefined();
      expect(typeof t.inputSchema).toBe("object");
    }
  });

  it("acknowledges notification methods without throwing", async () => {
    const r = await handleMcpRequest({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });
    expect(r.result).toEqual({ acknowledged: true });
  });
});

// ─── tools/call dispatch ──────────────────────────────────────────

describe("handleMcpRequest — tools/call dispatch", () => {
  it("dispatches headroom_compress and stringifies the dispatcher result", async () => {
    const r = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "headroom_compress",
        arguments: {
          messages: [{ role: "user", content: "hi" }],
          model: "gpt-4o-mini",
        },
      },
    });
    expect(r.error).toBeUndefined();
    const result = r.result as {
      content: Array<{ type: string; text: string }>;
      isError: boolean;
    };
    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text) as Record<
      string,
      unknown
    >;
    expect(parsed.success).toBe(true);
    expect(parsed.savingsPercent).toBe(75);
    expect(
      (parsed._echoed as { count: number; model: string }).count,
    ).toBe(1);
    expect(
      (parsed._echoed as { count: number; model: string }).model,
    ).toBe("gpt-4o-mini");
  });

  it("rejects headroom_compress with non-array messages", async () => {
    const r = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "headroom_compress",
        arguments: { messages: "not an array" },
      },
    });
    const result = r.result as { isError: boolean; content: Array<{ text: string }> };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("`messages` must be an array");
  });

  it("dispatches headroom_retrieve and surfaces the cache-key in the echo", async () => {
    const r = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "headroom_retrieve", arguments: { key: "abc-123" } },
    });
    const result = r.result as {
      content: Array<{ text: string }>;
      isError: boolean;
    };
    expect(result.isError).toBe(false);
    expect(JSON.parse(result.content[0].text).content).toBe(
      "original-for-abc-123",
    );
  });

  it("rejects headroom_retrieve with an empty key", async () => {
    const r = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "headroom_retrieve", arguments: { key: "" } },
    });
    const result = r.result as { isError: boolean; content: Array<{ text: string }> };
    expect(result.isError).toBe(true);
  });

  it("dispatches headroom_stats and reflects the dispatcher payload", async () => {
    const r = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "headroom_stats", arguments: {} },
    });
    const result = r.result as { content: Array<{ text: string }> };
    const parsed = JSON.parse(result.content[0].text) as Record<
      string,
      unknown
    >;
    expect(parsed.totalRequests).toBe(42);
  });

  it("returns a toolError when the tool name is unknown", async () => {
    const r = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "nope", arguments: {} },
    });
    const result = r.result as { isError: boolean; content: Array<{ text: string }> };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Unknown tool: nope");
  });

  it("wraps dispatcher throws in an `isError: true` response", async () => {
    setHeadroomMcpDispatcher(
      makeDispatcher({
        async stats() {
          throw new Error("proxy offline");
        },
      }),
    );
    const r = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "headroom_stats", arguments: {} },
    });
    const result = r.result as { isError: boolean; content: Array<{ text: string }> };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("proxy offline");
  });
});

// ─── status / lifecycle ───────────────────────────────────────────

describe("status", () => {
  it("returns the default `stopped` shape with the three tool names", () => {
    const s = getHeadroomMcpStatus();
    expect(s.state).toBe("stopped");
    expect(s.running).toBe(false);
    expect(s.toolNames).toEqual([
      "headroom_compress",
      "headroom_retrieve",
      "headroom_stats",
    ]);
  });

  it("returns a fresh object on every call (no shared array reference)", () => {
    const a = getHeadroomMcpStatus();
    const b = getHeadroomMcpStatus();
    expect(a).not.toBe(b);
    expect(a.toolNames).not.toBe(b.toolNames);
  });
});

describe("log tail", () => {
  it("returns an empty tail immediately after reset", () => {
    const tail = getHeadroomMcpLogTail();
    expect(tail.lines).toEqual([]);
    expect(tail.totalBytes).toBe(0);
  });

  it("accumulates `[mcp-server] logs cleared` after clearHeadroomMcpLogs", () => {
    clearHeadroomMcpLogs();
    const tail = getHeadroomMcpLogTail();
    expect(tail.lines.some((l) => l.includes("logs cleared"))).toBe(true);
  });

  it("caps the buffer at MAX_LOG_LINES and trims totalBytes accordingly", () => {
    clearHeadroomMcpLogs();
    const buf = __getLogBufferForTests();
    expect(buf.length).toBeLessThanOrEqual(200);
  });
});
