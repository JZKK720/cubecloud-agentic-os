// P2: Provider prefix routing tests.
//
// Model strings carry a provider: prefix (ollama:llama3.3 → Ollama,
// anthropic:claude-5 → Anthropic, bare gpt-5.5 → OpenAI).
// The ProviderRouter dispatches by prefix, lazy-builds provider
// clients, caches them, and supports invalidation.

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  type ProviderClient,
  type ProviderRouter,
  createProviderRouter,
  parseProviderPrefix,
} from "../src/provider-router";

// ── Mock providers ─────────────────────────────────────────

function makeMockProvider(name: string): ProviderClient {
  return {
    name,
    async complete() {
      return { text: `response from ${name}` };
    },
    async *stream() {
      yield { text: `stream from ${name}` };
    },
  };
}

// ── Tests ──────────────────────────────────────────────────

describe("parseProviderPrefix", () => {
  it("extracts provider prefix from 'ollama:llama3.3'", () => {
    const { provider, model } = parseProviderPrefix("ollama:llama3.3");
    expect(provider).toBe("ollama");
    expect(model).toBe("llama3.3");
  });

  it("extracts provider prefix from 'anthropic:claude-5'", () => {
    const { provider, model } = parseProviderPrefix("anthropic:claude-5");
    expect(provider).toBe("anthropic");
    expect(model).toBe("claude-5");
  });

  it("defaults to 'openai' for bare model names", () => {
    const { provider, model } = parseProviderPrefix("gpt-5.5");
    expect(provider).toBe("openai");
    expect(model).toBe("gpt-5.5");
  });

  it("handles 'local:ollama' prefix", () => {
    const { provider, model } = parseProviderPrefix("local:ollama:llama3.3");
    expect(provider).toBe("local:ollama");
    expect(model).toBe("llama3.3");
  });

  it("handles empty string gracefully", () => {
    const { provider, model } = parseProviderPrefix("");
    expect(provider).toBe("openai");
    expect(model).toBe("");
  });
});

describe("ProviderRouter", () => {
  let router: ProviderRouter;

  beforeEach(() => {
    const providers = new Map<string, () => ProviderClient>([
      ["openai", () => makeMockProvider("openai")],
      ["anthropic", () => makeMockProvider("anthropic")],
      ["ollama", () => makeMockProvider("ollama")],
      ["local:ollama", () => makeMockProvider("local:ollama")],
    ]);
    router = createProviderRouter(providers);
  });

  it("dispatches to the correct provider by prefix", async () => {
    const client = router.getClient("ollama:llama3.3");
    expect(client.name).toBe("ollama");
  });

  it("dispatches to anthropic", async () => {
    const client = router.getClient("anthropic:claude-5");
    expect(client.name).toBe("anthropic");
  });

  it("defaults to openai for bare model names", () => {
    const client = router.getClient("gpt-5.5");
    expect(client.name).toBe("openai");
  });

  it("handles local:ollama prefix", () => {
    const client = router.getClient("local:ollama:llama3.3");
    expect(client.name).toBe("local:ollama");
  });

  it("caches provider clients (same instance)", () => {
    const c1 = router.getClient("ollama:llama3.3");
    const c2 = router.getClient("ollama:llama3.2");
    // Same provider → same cached client instance
    expect(c1).toBe(c2);
  });

  it("throws for unknown provider", () => {
    expect(() => router.getClient("unknown:model")).toThrow(
      /No provider for "unknown"/,
    );
  });

  it("invalidate() clears the cache", () => {
    const c1 = router.getClient("ollama:llama3.3");
    router.invalidate();
    const c2 = router.getClient("ollama:llama3.3");
    // After invalidation, a new instance is created
    expect(c1).not.toBe(c2);
  });

  it("complete() calls the provider's complete method", async () => {
    const result = await router.complete("anthropic:claude-5", []);
    expect(result.text).toBe("response from anthropic");
  });

  it("stream() calls the provider's stream method", async () => {
    const deltas: string[] = [];
    for await (const d of router.stream("ollama:llama3.3", [])) {
      deltas.push(d.text);
    }
    expect(deltas).toEqual(["stream from ollama"]);
  });
});