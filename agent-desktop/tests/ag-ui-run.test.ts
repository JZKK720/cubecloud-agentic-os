// AG-UI over the console kernel, driven end to end over real HTTP.
//
// The codec in `packages/platform-core/src/ag-ui.ts` was unit-tested and
// unreachable: no module in `agent-desktop/src` imported it, so "we speak
// AG-UI" was a claim you could not exercise. These tests boot the actual
// kernel, POST a real `RunAgentInput`, and read the SSE response — the same
// path an external AG-UI client would take.
//
// They also pin the security property: the endpoint lives under `/api/`, so
// it inherits the kernel's origin + token gate rather than opening a second
// unauthenticated door.

import { afterEach, describe, expect, it } from "vitest";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ConsoleRouteRegistry,
  createConsoleServer,
  type AgUiRunHandler,
} from "../console-backend/registry";
import {
  createAgUiRunHandler,
  createKernelAgUiRunHandler,
  historyFromMessages,
  lastUserMessage,
  type AgUiTurnSource,
} from "../console-backend/ag-ui-run";
import { createHarnessAgUiSource } from "../console-backend/ag-ui-harness-source";
import type { HarnessTurnDelta } from "@cubecloud/platform-core";

const TOKEN = "ag-ui-test-token";

function post(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = httpRequest(
      url,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": String(Buffer.byteLength(payload)),
          ...headers,
        },
      },
      (res) => {
        let out = "";
        res.setEncoding("utf8");
        res.on("data", (c) => {
          out += c;
        });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: out }));
      },
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

/** Every `data:` payload in an SSE body, parsed. */
function sseEvents(body: string): Array<{ type: string } & Record<string, unknown>> {
  return body
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => JSON.parse(line.slice("data: ".length)) as { type: string });
}

const servers: Array<{ close: (cb: () => void) => void }> = [];

afterEach(() => {
  while (servers.length) servers.pop()?.close(() => {});
});

async function withKernel(
  agUiRun: AgUiRunHandler | null,
  fn: (base: string) => Promise<void>,
): Promise<void> {
  const registry = new ConsoleRouteRegistry();
  registry.register({
    name: "kernelHome",
    ipcChannel: "kernel-home",
    handler: async () => ({ success: true }),
  });
  const server = createConsoleServer(registry, {
    rendererRoot: join(tmpdir(), "ag-ui-test-no-renderer"),
    authToken: TOKEN,
    agUiRun,
  });
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      fn(`http://127.0.0.1:${port}`).then(resolve, reject);
    });
    server.on("error", reject);
  });
}

/** A source that yields a fixed delta sequence, then ends. */
function scriptedSource(deltas: HarnessTurnDelta[]): AgUiTurnSource {
  return {
    async *runTurn() {
      for (const d of deltas) yield d;
    },
  };
}

describe("lastUserMessage", () => {
  it("finds the last user message in a string-content array", () => {
    expect(
      lastUserMessage([
        { role: "user", content: "first" },
        { role: "assistant", content: "reply" },
        { role: "user", content: "second" },
      ]),
    ).toBe("second");
  });

  it("joins an array-of-parts content", () => {
    expect(
      lastUserMessage([
        { role: "user", content: [{ type: "text", text: "a" }, { type: "text", text: "b" }] },
      ]),
    ).toBe("ab");
  });

  it("returns null when there is no user message", () => {
    expect(lastUserMessage([{ role: "assistant", content: "hi" }])).toBeNull();
    expect(lastUserMessage([])).toBeNull();
  });
});

describe("AG-UI run endpoint", () => {
  it("streams a conformant event sequence over SSE", async () => {
    const handler = createAgUiRunHandler({
      source: scriptedSource([
        { type: "text", content: "Hello" },
        { type: "text", content: " world" },
        { type: "usage", promptTokens: 1, completionTokens: 2 },
        { type: "done" },
      ]),
    });

    await withKernel(handler, async (base) => {
      const res = await post(
        `${base}/api/ag-ui/run`,
        {
          threadId: "t-1",
          runId: "r-1",
          messages: [{ role: "user", content: "hi" }],
          state: null,
          resume: [],
        },
        { "x-console-token": TOKEN },
      );

      expect(res.status).toBe(200);
      const events = sseEvents(res.body);
      const types = events.map((e) => e.type);

      // A run starts once, streams the text, and finishes once.
      expect(types.filter((t) => t === "RUN_STARTED")).toHaveLength(1);
      expect(types.filter((t) => t === "RUN_FINISHED")).toHaveLength(1);
      expect(types.indexOf("RUN_STARTED")).toBe(0);
      expect(types[types.length - 1]).toBe("RUN_FINISHED");

      const content = events
        .filter((e) => e.type === "TEXT_MESSAGE_CONTENT")
        .map((e) => e.delta as string)
        .join("");
      expect(content).toBe("Hello world");
    });
  });

  it("omits absent fields instead of sending null", async () => {
    const handler = createAgUiRunHandler({
      source: scriptedSource([{ type: "text", content: "x" }, { type: "done" }]),
    });

    await withKernel(handler, async (base) => {
      const res = await post(
        `${base}/api/ag-ui/run`,
        { threadId: "t", runId: "r", messages: [{ role: "user", content: "hi" }] },
        { "x-console-token": TOKEN },
      );
      for (const event of sseEvents(res.body)) {
        for (const [key, value] of Object.entries(event)) {
          expect(value, `${event.type}.${key} must not be null`).not.toBeNull();
        }
      }
    });
  });

  it("reports a turn error as RUN_ERROR and never claims success", async () => {
    const handler = createAgUiRunHandler({
      source: scriptedSource([
        { type: "error", message: "provider exploded", code: "PI_AI_ERROR" },
        { type: "done" },
      ]),
    });

    await withKernel(handler, async (base) => {
      const res = await post(
        `${base}/api/ag-ui/run`,
        { threadId: "t", runId: "r", messages: [{ role: "user", content: "hi" }] },
        { "x-console-token": TOKEN },
      );
      const types = sseEvents(res.body).map((e) => e.type);
      expect(types).toContain("RUN_ERROR");
      // A run terminates exactly once: an error is not followed by success.
      expect(types).not.toContain("RUN_FINISHED");
    });
  });

  it("refuses an unauthenticated caller", async () => {
    const handler = createAgUiRunHandler({
      source: scriptedSource([{ type: "done" }]),
    });
    await withKernel(handler, async (base) => {
      const res = await post(`${base}/api/ag-ui/run`, {
        messages: [{ role: "user", content: "hi" }],
      });
      expect(res.status).toBe(401);
    });
  });

  it("rejects a malformed body with 400 rather than crashing", async () => {
    const handler = createAgUiRunHandler({
      source: scriptedSource([{ type: "done" }]),
    });
    await withKernel(handler, async (base) => {
      const res = await new Promise<{ status: number }>((resolve, reject) => {
        const req = httpRequest(
          `${base}/api/ag-ui/run`,
          {
            method: "POST",
            headers: { "content-type": "application/json", "x-console-token": TOKEN },
          },
          (r) => {
            r.resume();
            r.on("end", () => resolve({ status: r.statusCode ?? 0 }));
          },
        );
        req.on("error", reject);
        req.write("{not json");
        req.end();
      });
      expect(res.status).toBe(400);
    });
  });

  it("is 404 when no handler is configured", async () => {
    await withKernel(null, async (base) => {
      const res = await post(
        `${base}/api/ag-ui/run`,
        { messages: [{ role: "user", content: "hi" }] },
        { "x-console-token": TOKEN },
      );
      expect(res.status).toBe(404);
    });
  });
});

/**
 * The handler a real boot uses. It reaches a turn through a registered
 * capability, because the kernel cannot import the harness router without
 * pulling Electron into its closure.
 */
/** A registry stub: capability name → handler. */
function fakeRegistry(
  caps: Record<string, (args: unknown[]) => Promise<unknown>>,
) {
  return {
    get: (name: string) => (caps[name] ? { handler: caps[name] } : undefined),
  };
}

describe("kernel-sourced AG-UI runs", () => {
  it("streams a turn provided by the agUiTurn capability", async () => {
    const handler = createKernelAgUiRunHandler(
      fakeRegistry({
        agUiTurn: async () => [
          { type: "text", content: "from the kernel" },
          { type: "done" },
        ],
      }),
    );

    await withKernel(handler, async (base) => {
      const res = await post(
        `${base}/api/ag-ui/run`,
        { threadId: "t", runId: "r", messages: [{ role: "user", content: "hi" }] },
        { "x-console-token": TOKEN },
      );
      const events = sseEvents(res.body);
      const content = events
        .filter((e) => e.type === "TEXT_MESSAGE_CONTENT")
        .map((e) => e.delta as string)
        .join("");
      expect(content).toBe("from the kernel");
      expect(events.map((e) => e.type)).toContain("RUN_FINISHED");
    });
  });

  it("says so honestly when no source is configured at all", async () => {
    const handler = createKernelAgUiRunHandler(fakeRegistry({}));

    await withKernel(handler, async (base) => {
      const res = await post(
        `${base}/api/ag-ui/run`,
        { threadId: "t", runId: "r", messages: [{ role: "user", content: "hi" }] },
        { "x-console-token": TOKEN },
      );
      const errorEvent = sseEvents(res.body).find((e) => e.type === "RUN_ERROR");
      expect(errorEvent).toBeDefined();
      // Actionable, not a silent empty turn.
      expect(String(errorEvent?.message)).toContain("agUiTurn");
      expect(errorEvent?.code).toBe("NO_TURN_SOURCE");
    });
  });

  it("prefers a directly supplied turn source over the capability", async () => {
    let called = 0;
    const handler = createKernelAgUiRunHandler(
      fakeRegistry({
        agUiTurn: async () => {
          called += 1;
          return [{ type: "text", content: "from capability" }];
        },
      }),
      {
        source: {
          async *runTurn() {
            yield { type: "text", content: "from source" } as const;
          },
        },
      },
    );

    await withKernel(handler, async (base) => {
      const res = await post(
        `${base}/api/ag-ui/run`,
        { threadId: "t", runId: "r", messages: [{ role: "user", content: "hi" }] },
        { "x-console-token": TOKEN },
      );
      const content = sseEvents(res.body)
        .filter((e) => e.type === "TEXT_MESSAGE_CONTENT")
        .map((e) => e.delta as string)
        .join("");
      expect(content).toBe("from source");
      expect(called).toBe(0);
    });
  });
});

describe("harness-backed AG-UI runs", () => {
  it("streams a turn from the harness router", async () => {
    const seen: Array<{ sessionId: string; message: string; history?: unknown }> = [];
    const source = createHarnessAgUiSource({
      createRegistry: () =>
        ({
          adapters: new Map(),
          router: {
            async *runTurn(sessionId: string, input: any) {
              seen.push({ sessionId, message: input.message, history: input.history });
              yield { type: "text", content: "hello " };
              yield { type: "text", content: "from the harness" };
              yield { type: "done" };
            },
            getActiveProvider: () => "hermes",
            close: async () => {},
          },
        }) as any,
    });

    const handler = createKernelAgUiRunHandler(fakeRegistry({}), { source });

    await withKernel(handler, async (base) => {
      const res = await post(
        `${base}/api/ag-ui/run`,
        {
          threadId: "thread-abc",
          runId: "run-1",
          messages: [
            { role: "user", content: "earlier question" },
            { role: "assistant", content: "earlier answer" },
            { role: "user", content: "now this" },
          ],
        },
        { "x-console-token": TOKEN },
      );

      const events = sseEvents(res.body);
      const content = events
        .filter((e) => e.type === "TEXT_MESSAGE_CONTENT")
        .map((e) => e.delta as string)
        .join("");
      expect(content).toBe("hello from the harness");
      expect(events.map((e) => e.type)).toContain("RUN_FINISHED");
      expect(events.map((e) => e.type)).not.toContain("RUN_ERROR");

      // One thread is one runtime session; the prompt goes once, and prior
      // turns travel as history rather than being folded into the message.
      expect(seen).toHaveLength(1);
      expect(seen[0].sessionId).toBe("thread-abc");
      expect(seen[0].message).toBe("now this");
      expect(seen[0].history).toEqual([
        { role: "user", content: "earlier question" },
        { role: "assistant", content: "earlier answer" },
      ]);
    });
  });

  it("reports a harness failure instead of an empty success", async () => {
    const source = createHarnessAgUiSource({
      createRegistry: () =>
        ({
          adapters: new Map(),
          router: {
            // eslint-disable-next-line require-yield
            async *runTurn() {
              yield { type: "error", message: "runtime refused", code: "X" };
            },
            getActiveProvider: () => "hermes",
            close: async () => {},
          },
        }) as any,
    });

    await withKernel(createKernelAgUiRunHandler(fakeRegistry({}), { source }), async (base) => {
      const res = await post(
        `${base}/api/ag-ui/run`,
        { threadId: "t", runId: "r", messages: [{ role: "user", content: "hi" }] },
        { "x-console-token": TOKEN },
      );
      const types = sseEvents(res.body).map((e) => e.type);
      expect(types).toContain("RUN_ERROR");
      expect(types).not.toContain("RUN_FINISHED");
    });
  });
});

describe("historyFromMessages", () => {
  it("drops the trailing user message that becomes the prompt", () => {
    expect(
      historyFromMessages([
        { role: "user", content: "a" },
        { role: "assistant", content: "b" },
        { role: "user", content: "c" },
      ]),
    ).toEqual([
      { role: "user", content: "a" },
      { role: "assistant", content: "b" },
    ]);
  });

  it("ignores non-conversational roles", () => {
    expect(
      historyFromMessages([
        { role: "tool", content: "x" },
        { role: "user", content: "a" },
        { role: "user", content: "b" },
      ]),
    ).toEqual([{ role: "user", content: "a" }]);
  });
});
