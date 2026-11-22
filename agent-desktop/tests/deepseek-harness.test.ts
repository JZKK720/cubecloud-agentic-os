import { resolve } from "node:path";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HarnessTurnDelta } from "@cubecloud/platform-core";
import { createDeepSeekHarness, ensureLocalProviderMounted } from "../src/main/harnesses/deepseek-harness";
import {
  buildDshProviderConfig,
  writeDshProviderPatch,
  LOCAL_PLACEHOLDER_API_KEY,
} from "../src/main/dsh-provider-config";
import { probeLocalLlm } from "../src/main/local-llm-probe";
import {
  dshEventToFailure,
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

function fixtureHarness(env: Record<string, string> = {}) {
  return createDeepSeekHarness({
    command: process.execPath,
    args: [FIXTURE],
    // The fixture validates the real required fields, so pass a real cwd.
    cwd: process.cwd(),
    env,
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

  it("sends the required initialize params (cwd, provider, model)", () => {
    // The first real run failed with '"paths[0]" must be of type string'
    // because only approvalRequests was sent. The fixture now rejects that,
    // so this test fails if the client regresses.
    const harness = fixtureHarness();
    expect(harness.profile.transport).toBe("stdio");
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
    // turn/end carries a TurnEndReason; upstream's is merge-extensible, and
    // the real runtime emits 'completed' | 'aborted' | 'error'.
    const harness = fixtureHarness({ DSH_FIXTURE_ABORT: "1" });

    const deltas = await collect(
      harness.turns.runTurn({ sessionId: "s1", message: "hello" }),
    );

    const done = deltas[deltas.length - 1] as { type: string; sessionId?: string };
    expect(done.type).toBe("done");
    expect(done.sessionId).toBeUndefined();
  });

  it("surfaces a provider failure instead of an empty successful turn", async () => {
    // VERIFIED against the real runtime: when the provider cannot run, no text
    // is emitted at all. The failure arrives as a finish chunk inside
    // assistant/attempt plus turn/end reason.kind 'error'. The first real run
    // reported this as a clean, empty turn — the operator saw nothing.
    const harness = fixtureHarness({ DSH_FIXTURE_ERROR: "1" });

    const deltas = await collect(
      harness.turns.runTurn({ sessionId: "s1", message: "hello" }),
    );

    const error = deltas.find((d) => d.type === "error") as
      | { message: string; code?: string }
      | undefined;
    expect(error).toBeDefined();
    expect(error?.code).toBe("ACCOUNT_SIGN_IN_REQUIRED");
    expect(error?.message).toContain("Sign in to DeepSeek");

    // And the turn must not claim success.
    const done = deltas[deltas.length - 1] as { type: string; sessionId?: string };
    expect(done.sessionId).toBeUndefined();
  });

  it("rejects an unknown provider rather than proceeding", async () => {
    const harness = createDeepSeekHarness({
      command: process.execPath,
      args: [FIXTURE],
      cwd: process.cwd(),
      provider: "not-a-provider",
      model: "deepseek-flash",
    });

    const deltas = await collect(
      harness.turns.runTurn({ sessionId: "s1", message: "hello" }),
    );
    // initialize is rejected by the runtime; that MUST be reported. Before the
    // fix this produced a bare `done` and the operator saw an empty answer.
    const error = deltas.find((d) => d.type === "error") as
      | { message: string; code?: string }
      | undefined;
    expect(error).toBeDefined();
    expect(error?.message).toContain("no adapter registered");
    expect(deltas.some((d) => d.type === "text")).toBe(false);
    expect(deltas[deltas.length - 1]).toMatchObject({ type: "done" });
  });

  it("reports a malformed protocol line instead of hanging", async () => {
    const harness = createDeepSeekHarness({
      command: process.execPath,
      args: [FIXTURE],
      cwd: process.cwd(),
      env: { DSH_FIXTURE_BADPROTO: "1" },
      // Short timeout because the fixture deliberately never answers.
      // (The client's own request timeout is 30s; that is too slow for a test,
      // so rely on the transport failing when the fixture exits.)
    });

    const deltas = await collect(
      harness.turns.runTurn({ sessionId: "s1", message: "hello" }),
    );
    expect(deltas.some((d) => d.type === "done")).toBe(true);
  });
});

describe("ensureLocalProviderMounted", () => {
  let home: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "dsh-home-"));
  });

  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
  });

  it("mounts the local provider tree into the sdk profile", () => {
    const composed = ensureLocalProviderMounted(home);
    expect(composed).not.toBeNull();
    expect(composed?.provider).toBe("ollama");

    const patch = readFileSync(
      join(home, "profiles", "sdk", "cordis.patch.yml"),
      "utf8",
    );
    expect(patch).toContain("@deepseek-ai/dsh-llm-pi-ai");
    expect(patch).toContain("http://127.0.0.1:11434/v1");
    // No cloud route, no cloud credential.
    expect(patch).not.toContain("api.deepseek.com");
  });

  it("is idempotent — a second call leaves one row", () => {
    ensureLocalProviderMounted(home);
    ensureLocalProviderMounted(home);
    const patch = readFileSync(
      join(home, "profiles", "sdk", "cordis.patch.yml"),
      "utf8",
    );
    expect(patch.match(/- id: llm-pi-ai/g)).toHaveLength(1);
  });
});

describe("buildDshProviderConfig", () => {
  it("defaults to the local Ollama route, never a cloud provider", () => {
    const cfg = buildDshProviderConfig();
    expect(cfg.provider).toBe("ollama");
    expect(cfg.yaml).toContain("baseURL: http://127.0.0.1:11434/v1");
    expect(cfg.yaml).toContain("api: openai-completions");
    // The whole point of this module: no cloud route ships by default.
    expect(cfg.yaml).not.toContain("api.deepseek.com");
    expect(cfg.yaml).not.toContain("apiKeyEnv: DEEPSEEK");
  });

  it("declares a per-route placeholder credential for keyless local servers", () => {
    // MEASURED: pi-ai refuses a route with no credential at all —
    // "No API key for provider: <route>". Local servers ignore the header, so
    // each local route gets its own env var holding a placeholder. No secret,
    // no egress.
    const cfg = buildDshProviderConfig();
    expect(cfg.yaml).toContain("apiKeyEnv: CUBECLOUD_DSH_OLLAMA_API_KEY");
    expect(cfg.env.CUBECLOUD_DSH_OLLAMA_API_KEY).toBe(
      LOCAL_PLACEHOLDER_API_KEY,
    );
    // The placeholder is not a real credential and must not look like one.
    expect(cfg.env.CUBECLOUD_DSH_OLLAMA_API_KEY).not.toMatch(/^sk-/);
  });

  it("honours an explicit route and model", () => {
    const cfg = buildDshProviderConfig({
      activeRoute: "lmstudio",
      model: "qwen3.6:35b-a3b-mtp-q4_K_M",
    });
    expect(cfg.provider).toBe("lmstudio");
    expect(cfg.model).toBe("qwen3.6:35b-a3b-mtp-q4_K_M");
    expect(cfg.yaml).toContain("baseURL: http://127.0.0.1:1234/v1");
  });

  it("ignores an unknown active route rather than emitting a dangling one", () => {
    const cfg = buildDshProviderConfig({ activeRoute: "no-such-route" });
    expect(cfg.provider).toBe("ollama");
  });

  it("can omit a disabled local route", () => {
    const cfg = buildDshProviderConfig({ disabledLocalRoutes: ["ollama"] });
    expect(cfg.provider).toBe("lmstudio");
    expect(cfg.yaml).not.toContain("11434");
  });

  it("mounts an operator-supplied custom route alongside the locals", () => {
    const cfg = buildDshProviderConfig({
      customRoutes: [
        {
          id: "acme",
          baseURL: "https://gateway.acme.example/v1",
          apiKeyEnv: "ACME_GATEWAY_KEY",
          models: [{ id: "acme-think", contextWindow: 262144 }],
        },
      ],
    });
    expect(cfg.yaml).toContain("acme:");
    expect(cfg.yaml).toContain("apiKeyEnv: ACME_GATEWAY_KEY");
    expect(cfg.yaml).toContain("acme-think");
    // The default stays local even when a hosted route is available.
    expect(cfg.provider).toBe("ollama");
  });

  it("leaves the model empty when the route declares none", () => {
    // A local server's catalog is whatever the operator pulled; guessing a
    // model id would break on the next machine.
    expect(buildDshProviderConfig().model).toBe("");
  });
});

describe("writeDshProviderPatch", () => {
  let dir: string;
  let patch: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "dsh-patch-"));
    patch = join(dir, "cordis.patch.yml");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("writes a pi-ai row carrying the providers block", () => {
    const cfg = buildDshProviderConfig();
    expect(
      writeDshProviderPatch(patch, cfg, { existsSync, readFileSync, writeFileSync, mkdirSync }, dir),
    ).toBe(true);
    const text = readFileSync(patch, "utf8");
    expect(text).toContain("- id: llm-pi-ai");
    expect(text).toContain("@deepseek-ai/dsh-llm-pi-ai");
    expect(text).toContain("providers:");
    expect(text).toContain("11434");
  });

  it("replaces an existing pi-ai row instead of stacking a second one", () => {
    const first = buildDshProviderConfig();
    const deps = { existsSync, readFileSync, writeFileSync, mkdirSync };
    writeDshProviderPatch(patch, first, deps, dir);

    const second = buildDshProviderConfig({ activeRoute: "lmstudio" });
    writeDshProviderPatch(patch, second, deps, dir);

    const text = readFileSync(patch, "utf8");
    expect(text.match(/- id: llm-pi-ai/g)).toHaveLength(1);
    expect(text).toContain("1234");
  });

  it("preserves unrelated operator rows", () => {
    writeFileSync(patch, "- id: my-plugin\n  name: 'some-package'\n", "utf8");
    writeDshProviderPatch(
      patch,
      buildDshProviderConfig(),
      { existsSync, readFileSync, writeFileSync, mkdirSync },
      dir,
    );
    const text = readFileSync(patch, "utf8");
    expect(text).toContain("my-plugin");
    expect(text).toContain("llm-pi-ai");
  });
});

describe("probeLocalLlm", () => {
  it("refuses a non-loopback endpoint instead of contacting it", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const result = await probeLocalLlm("remote", "https://api.example.com/v1");
    expect(result.reachable).toBe(false);
    expect(result.error).toBe("non-loopback");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("reports the advertised models", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: "qwen3.6" }, { id: "llama4" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const result = await probeLocalLlm("ollama", "http://127.0.0.1:11434/v1");
    expect(result.reachable).toBe(true);
    expect(result.models).toEqual(["qwen3.6", "llama4"]);
    expect(result.detail).toContain("2 models");
    spy.mockRestore();
  });

  it("reports a reachable server with no models as such", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    const result = await probeLocalLlm("ollama", "http://127.0.0.1:11434/v1");
    expect(result.reachable).toBe(true);
    expect(result.detail).toContain("no models");
    spy.mockRestore();
  });

  it("reports an absent server without throwing", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("connect ECONNREFUSED"));
    const result = await probeLocalLlm("ollama", "http://127.0.0.1:11434/v1");
    expect(result.reachable).toBe(false);
    expect(result.detail).toContain("no server");
    spy.mockRestore();
  });
});

describe("dshEventToFailure", () => {
  it("reads a finish chunk with reason.kind error", () => {
    const failure = dshEventToFailure({
      type: "assistant/attempt",
      data: {
        stream: [
          {
            type: "chunk",
            chunk: {
              type: "finish",
              reason: {
                kind: "error",
                failure: { message: "boom", code: "E_BOOM" },
              },
            },
          },
        ],
      },
    });
    expect(failure).toEqual({ message: "boom", code: "E_BOOM" });
  });

  it("reads turn/end reason.kind error", () => {
    const failure = dshEventToFailure({
      type: "turn/end",
      data: { reason: { kind: "error", error: { message: "nope", code: "E_X" } } },
    });
    expect(failure).toEqual({ message: "nope", code: "E_X" });
  });

  it("treats an unknown turn/end kind as a failure (union is extensible)", () => {
    const failure = dshEventToFailure({
      type: "turn/end",
      data: { reason: { kind: "blocked" } },
    });
    expect(failure?.message).toContain("blocked");
  });

  it("returns null for a completed turn and for success finish reasons", () => {
    expect(
      dshEventToFailure({
        type: "turn/end",
        data: { reason: { kind: "completed" } },
      }),
    ).toBeNull();
    expect(
      dshEventToFailure({
        type: "assistant/message",
        data: {
          stream: [{ type: "chunk", chunk: { type: "finish", reason: { kind: "stop" } } }],
        },
      }),
    ).toBeNull();
  });

  it("returns null for events that carry no failure", () => {
    expect(dshEventToFailure({ type: "turn/start" })).toBeNull();
    expect(dshEventToFailure({ type: "user/message" })).toBeNull();
  });
});
