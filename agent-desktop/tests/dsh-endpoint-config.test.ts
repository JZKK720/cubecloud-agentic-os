// The operator-typed endpoint path, end to end from config to patch file.
//
// Separate file from `deepseek-harness.test.ts` because the config module has
// to be mocked *before* the adapter is imported, and that file already imports
// the adapter at top level for its other tests. A hoisted `vi.mock` here is the
// only place the saved-endpoint path can be exercised honestly.
//
// WHY THIS MATTERS: Settings lets an operator type a base URL, a model id and
// an optional API key, then save. Every one of those three values has to reach
// the runtime, and until this existed none of them did — the form wrote config
// keys that nothing read. These tests pin the wiring, not the YAML shape.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const configValues: Record<string, string | null> = {};

vi.mock("../src/main/config", () => ({
  getConfigValue: (key: string) => configValues[key] ?? null,
  setConfigValue: (key: string, value: string) => {
    configValues[key] = value;
    return true;
  },
  // The adapter imports neighbours of these; keep the mock honest so a future
  // import from this module does not silently resolve to undefined.
  hasOAuthCredentials: () => false,
  getConnectionConfig: () => ({}),
  getModelConfig: () => ({}),
}));

const {
  ensureLocalProviderMounted,
  DEEPSEEK_HARNESS_PROVIDER_ID,
} = await import("../src/main/harnesses/deepseek-harness");
const { localApiKeyEnvName } = await import("../src/main/dsh-provider-config");
const { DSH_CONFIG_KEYS, DSH_CUSTOM_ROUTE_ID } = await import(
  "../src/shared/runtime-defaults"
);

describe("a saved endpoint reaches the runtime", () => {
  let home: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "dsh-endpoint-"));
    for (const key of Object.keys(configValues)) delete configValues[key];
  });

  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
  });

  const patchText = () =>
    readFileSync(join(home, "profiles", "sdk", "cordis.patch.yml"), "utf8");

  it("composes the saved base URL, model and key into one route", () => {
    configValues[DSH_CONFIG_KEYS.baseUrl] = "https://gw.example.com/v1";
    configValues[DSH_CONFIG_KEYS.model] = "gw-model-1";
    configValues[DSH_CONFIG_KEYS.apiKey] = "sk-stored";

    const composed = ensureLocalProviderMounted(home);

    // A saved endpoint is the operator's explicit choice, so it is the active
    // route rather than an extra one sitting beside the local default.
    expect(composed?.provider).toBe(DSH_CUSTOM_ROUTE_ID);
    expect(composed?.model).toBe("gw-model-1");

    const patch = patchText();
    expect(patch).toContain("https://gw.example.com/v1");
    // MEASURED: pi-ai refuses a route the installed catalog does not describe
    // unless that route lists its models. The typed model id is what gets
    // declared.
    expect(patch).toContain("gw-model-1");
    // The credential travels through the child env, never through the file, so
    // a patch written into a home directory can be inspected and committed
    // without leaking it.
    expect(patch).not.toContain("sk-stored");
    expect(composed?.env[localApiKeyEnvName(DSH_CUSTOM_ROUTE_ID)]).toBe(
      "sk-stored",
    );
  });

  it("works with no key at all — a local server is the default case", () => {
    configValues[DSH_CONFIG_KEYS.baseUrl] = "http://127.0.0.1:11434/v1";
    configValues[DSH_CONFIG_KEYS.model] = "qwen3.6:35b-a3b-mtp-q4_K_M";

    const composed = ensureLocalProviderMounted(home);

    expect(composed?.provider).toBe(DSH_CUSTOM_ROUTE_ID);
    expect(composed?.env[localApiKeyEnvName(DSH_CUSTOM_ROUTE_ID)]).toBeUndefined();
  });

  it("keeps the local default when no endpoint was ever saved", () => {
    const composed = ensureLocalProviderMounted(home);
    expect(composed?.provider).toBe("ollama");
    expect(patchText()).toContain("http://127.0.0.1:11434/v1");
  });

  it("keeps the key out of the patch when only the URL was saved", () => {
    configValues[DSH_CONFIG_KEYS.baseUrl] = "https://gw.example.com/v1";
    configValues[DSH_CONFIG_KEYS.model] = "gw-model-1";

    ensureLocalProviderMounted(home);

    // No key means no apiKeyEnv for this route: better a clear runtime error
    // than a placeholder sent to a host that may actually check it.
    expect(patchText()).not.toContain(
      `apiKeyEnv: ${localApiKeyEnvName(DSH_CUSTOM_ROUTE_ID)}`,
    );
  });

  it("is idempotent when a saved endpoint is re-mounted", () => {
    configValues[DSH_CONFIG_KEYS.baseUrl] = "https://gw.example.com/v1";
    configValues[DSH_CONFIG_KEYS.model] = "gw-model-1";

    ensureLocalProviderMounted(home);
    ensureLocalProviderMounted(home);

    expect(patchText().match(/- id: llm-pi-ai/g)).toHaveLength(1);
    expect(patchText().match(/custom:/g)).toHaveLength(1);
  });
});

it("the provider id is the string the runtime catalog uses", () => {
  expect(DEEPSEEK_HARNESS_PROVIDER_ID).toBe("deepseek-harness");
});
