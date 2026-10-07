/**
 * P5 — Config center + vault bridge tests
 * (`src/main/cubecloud-agent-config.ts`).
 *
 * The gate spec is §3.1 of the coordination matrix (decided before coding):
 *   - Console generates ONE artifact: the provision-time env fragment
 *     (`.env` body) with a hash-stamped header.
 *   - The console NEVER writes/touches the workspace's `config.yaml`.
 *   - Secrets are never logged; only a fingerprint (first4…last4).
 *   - API key lives in the desktop config store; the fragment is built
 *     from vault values at provision time.
 *
 * Tests verify:
 *   1. buildProvisionEnv renders the correct env body + hash-stamped header.
 *   2. The stamp changes when the body changes and is stable for the same
 *      body (reproducible provisioning).
 *   3. fingerprintApiKey only ever returns first4 + last4 (+ fixed middle).
 *   4. Voice URLs and auth mode defaults render from the attachment mode.
 *   5. CI guard: module source contains no `config.yaml` write or
 *      PATCH/POST/DELETE/PUT — the single-writer ban (part 2).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

import {
  buildProvisionEnv,
  fingerprintApiKey,
  type ProvisionInput,
} from "../src/main/cubecloud-agent-config";

describe("cubecloud-agent config center (P5)", () => {
  const baseInput: ProvisionInput = {
    workspaceBaseUrl: "http://127.0.0.1:6767",
    workspaceApiKey: "sk-test-1234567890abcdef",
    hermesBaseUrl: "http://127.0.0.1:8642",
    hermesApiKey: "hk-abcdef1234567890",
  };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the provision env with the hash-stamped header", async () => {
    const result = await buildProvisionEnv(baseInput);
    expect(result.env).toContain("# cubecloud-agent provision v1");
    expect(result.env).toMatch(/provision v1 [0-9a-f]{12}/);
    expect(result.env).toContain("CUBECLOUD_WORKSPACE_BASE_URL=http://127.0.0.1:6767");
    expect(result.env).toContain("HERMES_VOICE_URL=http://127.0.0.1:8642");
  });

  it("stamp is stable for the same body and changes when the body changes", async () => {
    const a = await buildProvisionEnv(baseInput);
    const b = await buildProvisionEnv(baseInput);
    expect(a.stamp).toBe(b.stamp);
    const c = await buildProvisionEnv({
      ...baseInput,
      workspaceBaseUrl: "http://127.0.0.1:7777",
    });
    expect(c.stamp).not.toBe(a.stamp);
  });

  it("fingerprintApiKey never exposes the full key", () => {
    const fp = fingerprintApiKey("sk-test-1234567890abcdef");
    expect(fp).toMatch(/^sk-t…cdef$/);
    expect(fp).not.toContain("1234567890");
    expect(fingerprintApiKey("")).toBe("(none)");
    expect(fingerprintApiKey("ab")).toBe("(set, short)");
  });

  it("omits optional blocks cleanly when not provided", async () => {
    const result = await buildProvisionEnv({
      workspaceBaseUrl: "http://127.0.0.1:6767",
    });
    expect(result.env).toContain("CUBECLOUD_WORKSPACE_BASE_URL");
    expect(result.env).not.toContain("HERMES_VOICE_URL");
    expect(result.env).not.toContain("API_KEY");
  });

  it("renders single-user local mode flag for M0/M1 attachment", async () => {
    const result = await buildProvisionEnv({
      ...baseInput,
      localSingleUser: true,
    });
    expect(result.env).toContain("OMNIGENT_LOCAL_SINGLE_USER=1");
  });

  it("P5 CI ban — no config.yaml writes, no mutation verbs in the module", () => {
    const src = readFileSync(
      join(__dirname, "..", "src", "main", "cubecloud-agent-config.ts"),
      "utf8",
    );
    // Strip comments and docstrings — the ban is about functional usage.
    const code = src
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");
    // The workspace owns config.yaml — the console must never touch it.
    expect(code).not.toMatch(/config\.yaml/);
    expect(code).not.toMatch(/method:\s*"(POST|PATCH|PUT|DELETE)"/);
    // Only writes the provision fragment, through the dedicated helper.
    expect(code).toMatch(/writeProvisionEnv/);
  });
});