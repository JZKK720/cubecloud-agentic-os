// P1: Harness interface + router tests.
//
// Tests the core contract: a Harness is a behavioral interface that
// abstracts runtime providers. The HarnessRouter dispatches to the
// active harness by RuntimeProviderId.

import { describe, it, expect, vi } from "vitest";
import {
  type Harness,
  type HarnessAdapterProfile,
  type HarnessTurnInput,
  type HarnessTurnDelta,
  type HarnessRouter,
  createHarnessRouter,
} from "../src/harness";

// ── Test helpers ───────────────────────────────────────────

function makeMockHarness(
  id: string,
  label: string,
): Harness {
  const profile: HarnessAdapterProfile = {
    transport: "http",
    supportsStreaming: true,
    supportsToolCalls: true,
    supportsCompaction: false,
    supportsSessionReset: true,
    providerId: id,
    displayName: label,
  };

  return {
    profile,
    turns: {
      async *runTurn(_input: HarnessTurnInput): AsyncIterable<HarnessTurnDelta> {
        yield { type: "text", content: `response from ${label}` };
      },
      async resetSession(_sessionId: string): Promise<void> {},
      async close(): Promise<void> {},
    },
    models: {
      shouldRespond: () => true,
      async compactHistory(history: unknown[]) {
        return { compacted: false, history };
      },
      async oneShot(_prompt: string) {
        return `oneshot from ${label}`;
      },
    },
    tools: {
      mapToolName: (name: string) => name,
      unmapToolName: (name: string) => name,
    },
  };
}

// ── Tests ──────────────────────────────────────────────────

describe("Harness interface", () => {
  it("a mock harness satisfies the Harness interface", () => {
    const harness = makeMockHarness("hermes", "Hermes");
    expect(harness.profile.providerId).toBe("hermes");
    expect(harness.profile.displayName).toBe("Hermes");
    expect(harness.profile.transport).toBe("http");
    expect(typeof harness.turns.runTurn).toBe("function");
    expect(typeof harness.models.oneShot).toBe("function");
  });

  it("runTurn yields text deltas", async () => {
    const harness = makeMockHarness("hermes", "Hermes");
    const deltas: HarnessTurnDelta[] = [];
    for await (const delta of harness.turns.runTurn({
      sessionId: "test-1",
      message: "hello",
    })) {
      deltas.push(delta);
    }
    expect(deltas.length).toBe(1);
    expect(deltas[0].type).toBe("text");
    expect((deltas[0] as { content: string }).content).toBe(
      "response from Hermes",
    );
  });
});

describe("HarnessRouter", () => {
  it("dispatches to the correct harness by provider id", async () => {
    const hermes = makeMockHarness("hermes", "Hermes");
    const ironclaw = makeMockHarness("ironclaw", "IronClaw");

    const router = createHarnessRouter(
      new Map([
        ["hermes", hermes],
        ["ironclaw", ironclaw],
      ]),
      async () => "hermes", // always resolve to hermes
    );

    const deltas: HarnessTurnDelta[] = [];
    for await (const delta of router.runTurn("session-1", {
      sessionId: "session-1",
      message: "hello",
    })) {
      deltas.push(delta);
    }
    expect((deltas[0] as { content: string }).content).toBe(
      "response from Hermes",
    );
  });

  it("switches harness when resolve returns a different id", async () => {
    const hermes = makeMockHarness("hermes", "Hermes");
    const ironclaw = makeMockHarness("ironclaw", "IronClaw");

    let currentProvider: "hermes" | "ironclaw" = "hermes";

    const router = createHarnessRouter(
      new Map([
        ["hermes", hermes],
        ["ironclaw", ironclaw],
      ]),
      async () => currentProvider,
    );

    // First turn → Hermes
    let deltas: HarnessTurnDelta[] = [];
    for await (const delta of router.runTurn("s1", {
      sessionId: "s1",
      message: "hi",
    })) {
      deltas.push(delta);
    }
    expect((deltas[0] as { content: string }).content).toBe(
      "response from Hermes",
    );

    // Switch to IronClaw
    currentProvider = "ironclaw";
    deltas = [];
    for await (const delta of router.runTurn("s1", {
      sessionId: "s1",
      message: "hi",
    })) {
      deltas.push(delta);
    }
    expect((deltas[0] as { content: string }).content).toBe(
      "response from IronClaw",
    );
  });

  it("throws when no harness is registered for the resolved provider", async () => {
    const hermes = makeMockHarness("hermes", "Hermes");

    const router = createHarnessRouter(
      new Map([["hermes", hermes]]),
      async () => "raven" as const, // no raven harness registered
    );

    await expect(
      (async () => {
        for await (const _ of router.runTurn("s1", {
          sessionId: "s1",
          message: "hi",
        })) {
          // should throw before yielding
        }
      })(),
    ).rejects.toThrow(/No harness for/);
  });

  it("calls resetSession on the old harness when switching", async () => {
    const hermes = makeMockHarness("hermes", "Hermes");
    const ironclaw = makeMockHarness("ironclaw", "IronClaw");

    const hermesReset = vi.spyOn(hermes.turns, "resetSession");
    const ironclawReset = vi.spyOn(ironclaw.turns, "resetSession");

    let currentProvider: "hermes" | "ironclaw" = "hermes";

    const router = createHarnessRouter(
      new Map([
        ["hermes", hermes],
        ["ironclaw", ironclaw],
      ]),
      async (_sessionId) => currentProvider,
    );

    // First turn → Hermes (no reset needed)
    for await (const _ of router.runTurn("s1", {
      sessionId: "s1",
      message: "hi",
    })) {
    }
    expect(hermesReset).not.toHaveBeenCalled();

    // Switch to IronClaw → should reset Hermes session
    currentProvider = "ironclaw";
    for await (const _ of router.runTurn("s1", {
      sessionId: "s1",
      message: "hi",
    })) {
    }
    expect(hermesReset).toHaveBeenCalledWith("s1");
    expect(ironclawReset).not.toHaveBeenCalled();
  });
});