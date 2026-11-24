import { describe, expect, it, vi } from "vitest";
import {
  normalizeMcpEndpoint,
  probeMcpServer,
} from "../src/main/mcp-probe";
import { processSseData, type SseCallbacks } from "../src/main/sse-parser";

// The desktop has NO outbound MCP client — `addMcpServer` only writes
// `mcp_servers:` to config.yaml and the runtime connects. That made "I added
// a server" unverifiable from the UI: a bad URL, a wrong transport, or a
// server that rejects the handshake all looked identical to success.
//
// These tests cover the two halves of fixing that:
//   1. processSseData can consume AG-UI's typed event stream (needed when we
//      point at an AG-UI producer instead of an OpenAI-shaped gateway);
//   2. probeMcpServer performs a real handshake and reports what it found.

function callbacks() {
  return {
    onChunk: vi.fn(),
    onToolProgress: vi.fn(),
    onUsage: vi.fn(),
    onError: vi.fn(),
    onDone: vi.fn(),
  } satisfies SseCallbacks;
}

const freshState = () => ({ hasContent: false, lastError: "" });

describe("processSseData — ag-ui dialect", () => {
  it("streams TEXT_MESSAGE_CONTENT into onChunk", () => {
    const cb = callbacks();
    const state = freshState();

    const result = processSseData(
      JSON.stringify({ type: "TEXT_MESSAGE_CONTENT", messageId: "m1", delta: "hi" }),
      cb,
      state,
      "ag-ui",
    );

    expect(cb.onChunk).toHaveBeenCalledWith("hi");
    expect(result.hasContent).toBe(true);
    expect(result.done).toBe(false);
  });

  it("closes the run on RUN_FINISHED", () => {
    const cb = callbacks();
    const state = { hasContent: true, lastError: "" };

    const result = processSseData(
      JSON.stringify({ type: "RUN_FINISHED", threadId: "t", runId: "r" }),
      cb,
      state,
      "ag-ui",
    );

    expect(result.done).toBe(true);
    expect(cb.onDone).toHaveBeenCalled();
  });

  it("surfaces a terminal interrupt instead of treating it as done", () => {
    const cb = callbacks();

    const result = processSseData(
      JSON.stringify({
        type: "RUN_FINISHED",
        threadId: "t",
        runId: "r",
        outcome: {
          type: "interrupt",
          interrupts: [{ id: "i1", reason: "tool_approval" }],
        },
      }),
      cb,
      freshState(),
      "ag-ui",
    ) as { done: boolean; interrupts?: unknown[] };

    expect(result.done).toBe(false);
    expect(result.interrupts).toHaveLength(1);
    // An interrupt is not an error and must not fire onDone.
    expect(cb.onDone).not.toHaveBeenCalled();
    expect(cb.onError).not.toHaveBeenCalled();
  });

  it("reports RUN_ERROR through onError and state.lastError", () => {
    const cb = callbacks();
    const state = freshState();

    const result = processSseData(
      JSON.stringify({ type: "RUN_ERROR", message: "boom" }),
      cb,
      state,
      "ag-ui",
    );

    expect(cb.onError).toHaveBeenCalledWith("boom");
    expect(state.lastError).toBe("boom");
    expect(result.error).toBe("boom");
  });

  it("ignores bookends and state events without failing", () => {
    const cb = callbacks();
    const state = freshState();

    for (const type of [
      "TEXT_MESSAGE_START",
      "TEXT_MESSAGE_END",
      "STATE_SNAPSHOT",
      "STATE_DELTA",
      "ACTIVITY_DELTA",
      "RAW",
    ]) {
      const result = processSseData(JSON.stringify({ type }), cb, state, "ag-ui");
      expect(result.done).toBe(false);
    }

    expect(cb.onChunk).not.toHaveBeenCalled();
    expect(cb.onDone).not.toHaveBeenCalled();
  });

  it("survives a malformed payload", () => {
    const cb = callbacks();
    const result = processSseData("{not json", cb, freshState(), "ag-ui");
    expect(result.done).toBe(false);
    expect(cb.onError).not.toHaveBeenCalled();
  });

  it("leaves the openai dialect behaviour unchanged", () => {
    const cb = callbacks();
    const state = freshState();

    processSseData(
      JSON.stringify({ choices: [{ delta: { content: "hello" } }] }),
      cb,
      state,
    );

    expect(cb.onChunk).toHaveBeenCalledWith("hello");

    const done = processSseData("[DONE]", cb, { hasContent: true, lastError: "" });
    expect(done.done).toBe(true);
  });
});

describe("normalizeMcpEndpoint", () => {
  it("accepts loopback http", () => {
    expect(normalizeMcpEndpoint("http://127.0.0.1:8000/mcp")).toBe(
      "http://127.0.0.1:8000/mcp",
    );
    expect(normalizeMcpEndpoint("http://localhost:3000/mcp")).toBe(
      "http://localhost:3000/mcp",
    );
  });

  it("strips a trailing slash", () => {
    expect(normalizeMcpEndpoint("http://127.0.0.1:8000/mcp/")).toBe(
      "http://127.0.0.1:8000/mcp",
    );
  });

  it("accepts remote https", () => {
    expect(normalizeMcpEndpoint("https://mcp.example.com/mcp")).toBe(
      "https://mcp.example.com/mcp",
    );
  });

  it("rejects plain http on a remote host", () => {
    expect(normalizeMcpEndpoint("http://evil.example.com/mcp")).toBeNull();
  });

  // Measured 2026-11-24 from inside cc-console-backend-1, against a listener on
  // the host: localhost:11434 and 127.0.0.1:11434 both fail, while
  // host.docker.internal:11434 answers 200. A container's 127.0.0.1 is its own,
  // so the only way the kernel reaches a host-run MCP server is the gateway
  // alias. Rejecting it made DataFlow unreachable from the container no matter
  // what the operator configured.
  //
  // This does NOT widen the security boundary: host.docker.internal resolves to
  // the operator's own machine (docker adds it via extra_hosts), so it is the
  // host's loopback reached by its container name - the same reasoning
  // isLoopbackCdpUrl already documents for kitesurf.
  it("accepts the Docker host-gateway alias over plain http", () => {
    expect(normalizeMcpEndpoint("http://host.docker.internal:8000/mcp")).toBe(
      "http://host.docker.internal:8000/mcp",
    );
  });

  it("still rejects every other plain-http host, including look-alikes", () => {
    // A remote host that merely CONTAINS the alias must not pass.
    expect(normalizeMcpEndpoint("http://host.docker.internal.evil.com/mcp")).toBeNull();
    expect(normalizeMcpEndpoint("http://evil.com/host.docker.internal/mcp")).toBeNull();
    expect(normalizeMcpEndpoint("http://10.0.0.5:8000/mcp")).toBeNull();
    expect(normalizeMcpEndpoint("http://192.168.1.10:8000/mcp")).toBeNull();
  });

  it("rejects non-http schemes and junk", () => {
    expect(normalizeMcpEndpoint("file:///etc/passwd")).toBeNull();
    expect(normalizeMcpEndpoint("npx -y server")).toBeNull();
    expect(normalizeMcpEndpoint("")).toBeNull();
    expect(normalizeMcpEndpoint(null)).toBeNull();
  });
});

describe("probeMcpServer", () => {
  it("does not claim success for a stdio server it cannot reach", async () => {
    const result = await probeMcpServer({
      name: "fs",
      type: "stdio",
      detail: "npx -y @modelcontextprotocol/server-filesystem",
    });

    expect(result.ok).toBe(false);
    expect(result.detail).toMatch(/runtime spawns it/i);
  });

  it("rejects an unusable endpoint before any network call", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const result = await probeMcpServer({
      name: "bad",
      type: "sse",
      detail: "not-a-url",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid endpoint");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("completes an http handshake and lists tools", async () => {
    const calls: string[] = [];
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (_url, init) => {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          method?: string;
        };
        calls.push(body.method ?? "");
        if (body.method === "initialize") {
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              result: { protocolVersion: "2025-06-18", capabilities: {} },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 2,
            result: { tools: [{ name: "alpha" }, { name: "beta" }] },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      });

    const result = await probeMcpServer({
      name: "remote",
      type: "http",
      detail: "https://mcp.example.com/mcp",
    });

    expect(calls).toEqual(["initialize", "tools/list"]);
    expect(result.ok).toBe(true);
    expect(result.tools).toEqual(["alpha", "beta"]);
    expect(result.detail).toContain("2 tools");
    spy.mockRestore();
  });

  it("reports an http handshake rejection rather than throwing", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            error: { code: -32600, message: "unsupported protocol version" },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );

    const result = await probeMcpServer({
      name: "strict",
      type: "http",
      detail: "https://mcp.example.com/mcp",
    });

    expect(result.ok).toBe(false);
    expect(result.detail).toContain("unsupported protocol version");
    spy.mockRestore();
  });

  it("reads an SSE-framed JSON-RPC body", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (_url, init) => {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          method?: string;
        };
        const payload =
          body.method === "initialize"
            ? { jsonrpc: "2.0", id: 1, result: { protocolVersion: "x" } }
            : { jsonrpc: "2.0", id: 2, result: { tools: [{ name: "gamma" }] } };
        return new Response(`event: message\ndata: ${JSON.stringify(payload)}\n\n`, {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        });
      });

    const result = await probeMcpServer({
      name: "sse-framed",
      type: "http",
      detail: "https://mcp.example.com/mcp",
    });

    expect(result.ok).toBe(true);
    expect(result.tools).toEqual(["gamma"]);
    spy.mockRestore();
  });

  it("reports an unreachable server without throwing", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("connect ECONNREFUSED"));

    const result = await probeMcpServer({
      name: "down",
      type: "sse",
      detail: "http://127.0.0.1:9999/mcp",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("ECONNREFUSED");
    spy.mockRestore();
  });
});
