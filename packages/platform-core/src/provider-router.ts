// provider-router.ts — P2: Provider prefix routing.
//
// Model strings carry a provider: prefix (ollama:llama3.3 → Ollama,
// anthropic:claude-5 → Anthropic, bare gpt-5.5 → OpenAI).
// The ProviderRouter dispatches by prefix, lazy-builds provider
// clients, caches them, and supports invalidation.
//
// Inspired by openworker's ProviderRouter (coworker/providers/router.py),
// adapted to TypeScript for the Cubecloud Agent Desktop.

// ── Types ─────────────────────────────────────────────────

/** A provider client that can complete and stream requests. */
export interface ProviderClient {
  readonly name: string;
  complete(
    model: string,
    messages: Array<{ role: string; content: string }>,
  ): Promise<{ text: string }>;
  stream(
    model: string,
    messages: Array<{ role: string; content: string }>,
  ): AsyncIterable<{ text: string }>;
}

/** Factory function that creates a provider client. */
export type ProviderFactory = () => ProviderClient;

/** The router that dispatches to the correct provider by prefix. */
export interface ProviderRouter {
  /** Get the provider client for a model string. */
  getClient(modelString: string): ProviderClient;
  /** Call complete() on the resolved provider. */
  complete(
    modelString: string,
    messages: Array<{ role: string; content: string }>,
  ): Promise<{ text: string }>;
  /** Call stream() on the resolved provider. */
  stream(
    modelString: string,
    messages: Array<{ role: string; content: string }>,
  ): AsyncIterable<{ text: string }>;
  /** Invalidate the provider cache. */
  invalidate(): void;
}

// ── Prefix parsing ─────────────────────────────────────────

/** Parse a model string into provider and model parts.
 *  "ollama:llama3.3" → { provider: "ollama", model: "llama3.3" }
 *  "gpt-5.5" → { provider: "openai", model: "gpt-5.5" } (default)
 *  "local:ollama:llama3.3" → { provider: "local:ollama", model: "llama3.3" } */
export function parseProviderPrefix(
  modelString: string,
): { provider: string; model: string } {
  if (!modelString) {
    return { provider: "openai", model: "" };
  }

  // Check for "local:" prefix first (e.g. "local:ollama:llama3.3")
  if (modelString.startsWith("local:")) {
    const rest = modelString.slice(6); // remove "local:"
    const colonIdx = rest.indexOf(":");
    if (colonIdx === -1) {
      return { provider: "local", model: rest };
    }
    const subProvider = rest.slice(0, colonIdx);
    const model = rest.slice(colonIdx + 1);
    return { provider: `local:${subProvider}`, model };
  }

  // Check for standard "provider:model" format
  const colonIdx = modelString.indexOf(":");
  if (colonIdx === -1) {
    // No prefix → default to OpenAI
    return { provider: "openai", model: modelString };
  }

  const provider = modelString.slice(0, colonIdx);
  const model = modelString.slice(colonIdx + 1);

  // Known providers
  const knownProviders = new Set([
    "openai",
    "anthropic",
    "ollama",
    "gemini",
    "bedrock",
    "vertex",
    "deepseek",
    "groq",
    "mistral",
  ]);

  if (knownProviders.has(provider)) {
    return { provider, model };
  }

  // Unknown provider prefix → return the provider as-is so the
  // router can throw a clear "No provider for X" error.
  return { provider, model };
}

// ── Router implementation ─────────────────────────────────

/** Create a ProviderRouter from a map of provider factories. */
export function createProviderRouter(
  factories: ReadonlyMap<string, ProviderFactory>,
): ProviderRouter {
  const cache = new Map<string, ProviderClient>();

  function getClient(modelString: string): ProviderClient {
    const { provider, model } = parseProviderPrefix(modelString);

    // Check cache
    const cached = cache.get(provider);
    if (cached) {
      return cached;
    }

    // Build new client
    const factory = factories.get(provider);
    if (!factory) {
      throw new Error(`No provider for "${provider}"`);
    }

    const client = factory();
    cache.set(provider, client);
    return client;
  }

  return {
    getClient,
    async complete(modelString, messages) {
      const { model } = parseProviderPrefix(modelString);
      const client = getClient(modelString);
      return client.complete(model, messages);
    },
    async *stream(modelString, messages) {
      const { model } = parseProviderPrefix(modelString);
      const client = getClient(modelString);
      yield* client.stream(model, messages);
    },
    invalidate() {
      cache.clear();
    },
  };
}