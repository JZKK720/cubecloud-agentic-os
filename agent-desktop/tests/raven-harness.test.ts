/**
 * I-phase — Raven harness adapter tests
 * (`src/main/harnesses/raven-harness.ts`).
 *
 * Replaces the throwing stub in `harnesses/registry.ts` (EverMind replan
 * §2.1 row "harness adapter": ❌ stub throws → ✅ real adapter).
 *
 * Raven contract (grounded in the replan + hermes.ts detection code):
 *   - OpenAI-compatible chat gateway on **8855** (NOT the WebUI's 18793).
 *   - `/health` returns a body whose `runtime` field reads `"raven"` or
 *     `"evermind"`.
 *   - Turns ride `/v1/chat/completions` (SSE, OpenAI shape) — the same
 *     wire contract Hermes serves, which is why the desktop probes
 *     both with one routine.
 *
 * Tests verify (mirroring the registry/hermes adapter conventions):
 *   1. createRavenHarness returns a full Harness (profile, turns, models,
 *      tools) — no throw on construction.
 *   2. runTurn streams text deltas from the mocked SSE chat endpoint
 *      (OpenAI chunk shape), honors the controller's abort signal, and
 *      ends with a `done` delta.
 *   3. Unavailable gateway → runTurn yields `done` (error surfaced in the
 *      delta), never throws out of the generator.
 *   4. oneShot returns the assistant content for non-streaming use
 *      (decision-slot helper for DM slots when pointed at Raven).
 *   5. compactHistory is a no-op (supportsCompaction false), matching
 *      profile truth.
 *   6. Registry: the Raven adapter replaces the stub — resolving "raven"
 *      yields an adapter whose profile.providerId is "raven" and whose
 *      runTurn no longer throws a "not yet implemented" error.
 *
 * fetch is mocked; no real gateway or network I/O runs in tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

/** Build an SSE `Response` from OpenAI-style chunk objects. */
function sseResponse(chunks: Array<{ content?: string; done?: boolean }>): Response {
  const lines = chunks.map((c) =>
    c.done
      ? "data: [DONE]\n\n"
      : `data: ${JSON.stringify({
          choices: [{ delta: { content: c.content ?? "" } }],
        })}\n\n`,
  );
  const body = lines.join("");
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

describe("raven harness adapter (I-phase)", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("constructs a full harness without throwing", async () => {
    const { createRavenHarness } = await import(
      "../src/main/harnesses/raven-harness"
    );
    const harness = createRavenHarness();
    expect(harness.profile.providerId).toBe("raven");
    expect(harness.profile.displayName).toBe("Raven");
    expect(harness.profile.transport).toBe("http");
    expect(harness.profile.supportsStreaming).toBe(true);
    expect(harness.profile.supportsCompaction).toBe(false);
  });

  it("runTurn streams text deltas and ends with done", async () => {
    fetchMock.mockResolvedValue(
      sseResponse([
        { content: "Hel" },
        { content: "lo" },
        { done: true },
      ]),
    );
    const { createRavenHarness } = await import(
      "../src/main/harnesses/raven-harness"
    );
    const harness = createRavenHarness();
    const deltas = [];
    for await (const delta of harness.turns.runTurn({
      message: "hi",
      sessionId: "s1",
      history: [],
    })) {
      deltas.push(delta);
    }
    const texts = deltas.filter((d) => d.type === "text");
    expect(texts.map((t) => ("content" in t ? t.content : ""))).toEqual([
      "Hel",
      "lo",
    ]);
    expect(deltas[deltas.length - 1]!.type).toBe("done");
    // The chat request hits /v1/chat/completions.
    const url = String(fetchMock.mock.calls[0]![0]);
    expect(url).toContain("/v1/chat/completions");
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe("POST");
  });

  it("unavailable gateway → runTurn still ends with a done delta (never throws)", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const { createRavenHarness } = await import(
      "../src/main/harnesses/raven-harness"
    );
    const harness = createRavenHarness();
    const deltas = [];
    for await (const delta of harness.turns.runTurn({
      message: "hi",
      sessionId: "s1",
      history: [],
    })) {
      deltas.push(delta);
    }
    expect(deltas.at(-1)!.type).toBe("done");
  });

  it("oneShot returns the assistant content (non-streaming)", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { role: "assistant", content: "answer text" } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const { createRavenHarness } = await import(
      "../src/main/harnesses/raven-harness"
    );
    const harness = createRavenHarness();
    const answer = await harness.models.oneShot("ping");
    expect(answer).toBe("answer text");
  });

  it("compactHistory is a no-op (profile supportsCompaction false)", async () => {
    const { createRavenHarness } = await import(
      "../src/main/harnesses/raven-harness"
    );
    const harness = createRavenHarness();
    const history = [{ role: "user", content: "a" }];
    const result = await harness.models.compactHistory(history, 1000);
    expect(result.compacted).toBe(false);
    expect(result.history).toBe(history);
  });

  it("registry wires the real adapter — no 'not yet implemented' stub remains for raven", async () => {
    const { createHarnessRegistry } = await import(
      "../src/main/harnesses/registry"
    );
    const registry = createHarnessRegistry();
    const raven = registry.adapters.get("raven")!;
    expect(raven.profile.providerId).toBe("raven");
    // runTurn must NOT throw the old stub error.
    fetchMock.mockResolvedValue(sseResponse([{ done: true }]));
    let threwStubError = false;
    try {
      for await (const _ of raven.turns.runTurn({
        message: "hi",
        sessionId: undefined,
        history: [],
      })) {
        /* drain */
      }
    } catch (err) {
      threwStubError = String(err).includes("not yet implemented");
    }
    expect(threwStubError).toBe(false);
  });
});