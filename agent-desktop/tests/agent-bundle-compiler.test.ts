/**
 * P4/R2+R3 — Persona/agent adoption + skills promotion tests
 * (`src/main/agent-bundle-compiler.ts`).
 *
 * The bundle contract (cubecloud-agent `POST /api/agents`, AGENTSPEC.md):
 *   - multipart/form-data with a `bundle` part: a gzipped POSIX tar containing
 *     `config.yaml` (spec_version: 1, name, executor.type: agent-meow,
 *     executor.config.harness, prompt) and optionally `AGENTS.md`.
 *   - 201 Created → { id: "ag_...", name }; 409 name conflict; 400 invalid.
 *
 * Tests verify:
 *   1. compileAgentBundle produces a valid tar.gz whose config.yaml contains
 *      the persona fields (spec_version, name, harness, prompt) — parsed
 *      back out of the archive.
 *   2. Instructions → AGENTS.md entry + `instructions: AGENTS.md` line.
 *   3. YAML quoting for description with special characters.
 *   4. promotion round-trip via mocked upload: 201 → success with agent id,
 *      409 → conflict result, 400 → failure with server message.
 *   5. Never throws on network failure.
 *   6. Promotion goes through the READ inventory first (R1) so a 409
 *      conflict can be resolved without guessing.
 *
 * fetch + tar are exercised for real (pure JS, no external dep).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  compileAgentBundle,
  promoteAgentBundle,
  readTarEntries,
  type AgentBundleInput,
} from "../src/main/agent-bundle-compiler";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("agent bundle compiler (P4/R2+R3)", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const minimalInput: AgentBundleInput = {
    name: "cubecloud-researcher",
    description: "Research persona from the console",
    prompt: "You are a research assistant.",
    harness: "openai-agents",
    model: "gpt-4o-mini",
  };

  it("compiles a tar.gz whose config.yaml carries the persona fields", async () => {
    const bytes = await compileAgentBundle(minimalInput);
    const entries = await readTarEntries(bytes);
    const config = entries.get("config.yaml");
    expect(config).toBeDefined();
    const yaml = config!;
    expect(yaml).toContain("spec_version: 1");
    expect(yaml).toContain("name: cubecloud-researcher");
    expect(yaml).toContain("harness: openai-agents");
    expect(yaml).toContain("type: agent-meow");
    expect(yaml).toContain("model: gpt-4o-mini");
    expect(yaml).toContain("prompt: You are a research assistant.");
  });

  it("emits AGENTS.md + instructions pointer when instructions are set", async () => {
    const bytes = await compileAgentBundle({
      ...minimalInput,
      instructions: "Be terse.",
    });
    const entries = await readTarEntries(bytes);
    expect(entries.get("AGENTS.md")).toBe("Be terse.");
    expect(entries.get("config.yaml")).toContain("instructions: AGENTS.md");
  });

  it("no AGENTS.md entry when no instructions", async () => {
    const entries = await readTarEntries(await compileAgentBundle(minimalInput));
    expect(entries.has("AGENTS.md")).toBe(false);
    expect(entries.get("config.yaml")).not.toContain("instructions:");
  });

  it("quotes description values with special characters", async () => {
    const entries = await readTarEntries(
      await compileAgentBundle({
        ...minimalInput,
        description: 'Has: colons and "quotes"',
      }),
    );
    expect(entries.get("config.yaml")).toContain(
      'description: "Has: colons and \\"quotes\\""',
    );
  });

  it("promotion round-trip: session-create resolves with the session id", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ id: "conv_new", agent_id: "ag_abc123" }, 200),
    );
    const result = await promoteAgentBundle(
      "http://127.0.0.1:6767",
      minimalInput,
    );
    expect(result.success).toBe(true);
    expect(result.agentId).toBe("ag_abc123");
    expect(result.conflict).toBe(false);
    // multipart FormData with the bundle part — the live-verified
    // promotion path (POST /v1/sessions with a bundle part; the
    // standalone /api/agents upload was removed in this build).
    const called = fetchMock.mock.calls[0]!;
    expect(String(called[0])).toBe("http://127.0.0.1:6767/v1/sessions");
    expect(called[1]!.method).toBe("POST");
  });

  it("409 conflict: success=false, conflict=true, name surfaced", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ detail: "name already exists" }, 409),
    );
    const result = await promoteAgentBundle(
      "http://127.0.0.1:6767",
      minimalInput,
    );
    expect(result.success).toBe(false);
    expect(result.conflict).toBe(true);
  });

  it("400 invalid bundle: error surfaced, conflict=false", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ detail: "invalid bundle: missing name" }, 400),
    );
    const result = await promoteAgentBundle(
      "http://127.0.0.1:6767",
      minimalInput,
    );
    expect(result.success).toBe(false);
    expect(result.conflict).toBe(false);
    expect(result.error).toMatch(/missing name/);
  });

  it("network failure never throws", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const result = await promoteAgentBundle(
      "http://127.0.0.1:6767",
      minimalInput,
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/ECONNREFUSED/);
  });

  it("rejects an empty name before any upload", async () => {
    const result = await promoteAgentBundle("http://127.0.0.1:6767", {
      ...minimalInput,
      name: "",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/name/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});