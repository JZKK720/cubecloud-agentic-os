// dsh-provider-config.ts — compose the DeepSeek Harness LLM provider tree.
//
// WHY THIS EXISTS: the first version of this adapter hard-coded
// `deepseek-official` (a cloud route needing an API key) because the default
// `sdk` profile's only provider, `deepseek-account`, needs an interactive
// browser sign-in. That was the wrong instinct for a local-first product: it
// traded a sovereign deployment for a cloud dependency to make a test pass.
//
// The architecture we actually want is `dsh-llm-pi-ai`, which routes "model
// requests to multiple pi-ai providers, OpenAI-compatible gateways, or
// self-hosted servers from one configuration". Its `providers:` dictionary is
// the whole surface — each key is a route name a request selects, and a route
// needs only `api: openai-completions` plus a `baseURL`.
//
// That is exactly an Ollama / LM Studio / vLLM / llama.cpp endpoint. So the
// default here is a **local loopback route**, and DeepSeek's own cloud route is
// one optional entry the operator may add, never a default.
//
// Verified against `packages/llm/llm-pi-ai/README.md` upstream:
//   providers:
//     <route>:
//       displayName: <label>
//       api: openai-completions        # wire protocol for non-catalog routes
//       baseURL: <endpoint>
//       apiKeyEnv: <ENV NAME>          # omitted = no credential
//       models:
//         - id: <model>
//           contextWindow: <n>
//           reasoningEfforts: { off: ..., high: ... }
//
// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)

/** Provider routes we ship a default for. */
export interface DshProviderRoute {
  /** Route name the request selects. */
  id: string;
  displayName: string;
  /** OpenAI-compatible endpoint, e.g. http://127.0.0.1:11434/v1 */
  baseURL: string;
  /** Environment variable holding the key. Omitted for keyless local servers. */
  apiKeyEnv?: string;
  /** Model ids offered on this route. */
  models: Array<{ id: string; contextWindow?: number }>;
}

/** The default local route: Ollama on its standard loopback port.
 *  Both constants live in shared/runtime-defaults so the renderer can import
 *  them without crossing the process boundary. */
import { OLLAMA_DEFAULT_BASE_URL, OLLAMA_ROUTE_ID } from "../shared/runtime-defaults";

export { OLLAMA_DEFAULT_BASE_URL, OLLAMA_ROUTE_ID };

/**
 * Local-model endpoints we recognise, in the order we prefer them.
 *
 * Every one is loopback: this adapter never defaults to a remote host. A
 * sovereign deployment has no reason to and the security floor forbids
 * sending prompts somewhere the operator did not choose.
 */
export const LOCAL_PROVIDER_CANDIDATES: readonly {
  id: string;
  displayName: string;
  baseURL: string;
}[] = [
  { id: OLLAMA_ROUTE_ID, displayName: "Ollama (local)", baseURL: OLLAMA_DEFAULT_BASE_URL },
  { id: "lmstudio", displayName: "LM Studio (local)", baseURL: "http://127.0.0.1:1234/v1" },
  { id: "llamacpp", displayName: "llama.cpp server (local)", baseURL: "http://127.0.0.1:8080/v1" },
  { id: "vllm", displayName: "vLLM (local)", baseURL: "http://127.0.0.1:8000/v1" },
] as const;

/** A route the operator added themselves, e.g. a hosted gateway. */
export interface CustomDshRoute {
  id: string;
  baseURL: string;
  apiKeyEnv?: string;
  /** The key itself. Exported to the child env, never written to the patch. */
  apiKey?: string;
  models?: Array<{ id: string; contextWindow?: number }>;
}

export interface DshProviderConfigInput {
  /** Route to make active. Defaults to the first reachable local route. */
  activeRoute?: string;
  /** Model id on that route. */
  model?: string;
  /** Extra routes to mount alongside the local defaults. */
  customRoutes?: CustomDshRoute[];
  /** Local routes to omit (operator disabled them). */
  disabledLocalRoutes?: string[];
}

export interface DshProviderConfigResult {
  /** YAML for the pi-ai `providers:` block. */
  yaml: string;
  /** The route the runtime should be initialized with. */
  provider: string;
  /** The model the runtime should be initialized with. */
  model: string;
  /**
   * Env vars the caller must set on the child process. Local routes need a
   * placeholder key because pi-ai refuses a route with no credential; the
   * local servers ignore the header.
   */
  env: Record<string, string>;
}

/**
 * The placeholder credential value local servers expect.
 *
 * MEASURED against the real runtime: pi-ai's OpenAI-compatible provider
 * "still insists on a key or an `Authorization` header of its own"
 * (`dsh-llm-pi-ai/lib/index.js`), so a route with no `apiKeyEnv` fails with
 * `No API key for provider: <route>` (code `PI_AI_ERROR`) before any request
 * goes out. Ollama, LM Studio, llama.cpp and vLLM all ignore the header, so a
 * fixed placeholder satisfies the client without introducing a secret.
 */
export const LOCAL_PLACEHOLDER_API_KEY = "local-no-key-required";

/** Env var names the adapter exports for each local route. */
export function localApiKeyEnvName(routeId: string): string {
  return `CUBECLOUD_DSH_${routeId.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_API_KEY`;
}

/** One route rendered as a pi-ai `providers:` entry. */
function renderRoute(route: DshProviderRoute, indent: string): string[] {
  const lines: string[] = [];
  lines.push(`${indent}${route.id}:`);
  lines.push(`${indent}  displayName: ${JSON.stringify(route.displayName)}`);
  // Non-catalog routes must declare their wire protocol.
  lines.push(`${indent}  api: openai-completions`);
  lines.push(`${indent}  baseURL: ${route.baseURL}`);
  if (route.apiKeyEnv) {
    lines.push(`${indent}  apiKeyEnv: ${route.apiKeyEnv}`);
  }
  if (route.models.length > 0) {
    lines.push(`${indent}  models:`);
    for (const m of route.models) {
      lines.push(`${indent}    - id: ${m.id}`);
      if (typeof m.contextWindow === "number") {
        lines.push(`${indent}      contextWindow: ${m.contextWindow}`);
      }
    }
  }
  return lines;
}

/**
 * Build the provider tree and the (provider, model) pair to initialize with.
 *
 * The returned YAML is a `providers:` block intended for the pi-ai plugin's
 * config. When `activeRoute` is given it wins; otherwise the first enabled
 * local candidate is used, so a fresh install points somewhere real rather
 * than at a cloud API it has no key for.
 */
export function buildDshProviderConfig(
  input: DshProviderConfigInput = {},
): DshProviderConfigResult {
  const disabled = new Set(input.disabledLocalRoutes ?? []);
  const local = LOCAL_PROVIDER_CANDIDATES.filter((r) => !disabled.has(r.id));

  // A custom route that carries a key needs an env var name to be exported
  // through; if the caller configured none, derive one rather than dropping
  // the credential on the floor.
  const customRoutes = (input.customRoutes ?? []).map((r) => ({
    ...r,
    apiKeyEnv: r.apiKeyEnv ?? (r.apiKey ? localApiKeyEnvName(r.id) : undefined),
  }));

  const routes: DshProviderRoute[] = [
    ...local.map((r) => ({
      id: r.id,
      displayName: r.displayName,
      baseURL: r.baseURL,
      // Local servers ignore credentials, but pi-ai's OpenAI-compatible
      // provider refuses a route with none, so give each local route its own
      // env var holding a placeholder. It never reaches a remote host.
      apiKeyEnv: localApiKeyEnvName(r.id),
      models: [],
    })),
    ...customRoutes.map((r) => ({
      id: r.id,
      displayName: r.id,
      baseURL: r.baseURL,
      apiKeyEnv: r.apiKeyEnv,
      models: r.models ?? [],
    })),
  ];

  const activeRoute =
    input.activeRoute && routes.some((r) => r.id === input.activeRoute)
      ? input.activeRoute
      : (routes[0]?.id ?? OLLAMA_ROUTE_ID);

  const active = routes.find((r) => r.id === activeRoute);

  // Model selection: explicit wins; else the route's first declared model. A
  // local route with no declared models means "whatever the server has", and
  // the runtime resolves it — so an empty id is a legitimate value here.
  const model = input.model ?? active?.models[0]?.id ?? "";

  const lines: string[] = ["providers:"];
  for (const route of routes) {
    lines.push(...renderRoute(route, "  "));
  }

  // Every route needs its credential present in the child env, or the runtime
  // answers "No API key for provider: <route>". Local routes get a placeholder
  // their server ignores; a custom route gets the operator's real key, or the
  // placeholder when they left it blank (some hosted gateways do not check).
  const env: Record<string, string> = {};
  for (const route of routes) {
    if (!route.apiKeyEnv) continue;
    const custom = customRoutes.find((c) => c.id === route.id);
    if (!custom) {
      env[route.apiKeyEnv] = LOCAL_PLACEHOLDER_API_KEY;
      continue;
    }
    if (!custom.apiKey) continue;
    env[route.apiKeyEnv] = custom.apiKey;
  }

  return { yaml: lines.join("\n") + "\n", provider: activeRoute, model, env };
}

/**
 * Write the provider tree into a profile's patch file.
 *
 * Appends a single row mounting `@deepseek-ai/dsh-llm-pi-ai` with the composed
 * `providers:` config. Idempotent: an existing `dsh-llm-pi-ai` row is replaced
 * in place so re-running with a different route set does not stack duplicates.
 *
 * Returns true when the file reflects the requested config.
 */
export function writeDshProviderPatch(
  patchPath: string,
  config: DshProviderConfigResult,
  fs: {
    existsSync: (p: string) => boolean;
    readFileSync: (p: string, enc: "utf-8") => string;
    writeFileSync: (p: string, data: string, enc: "utf-8") => void;
    mkdirSync: (p: string, opts: { recursive: boolean }) => void;
  },
  dirname: string,
): boolean {
  try {
    fs.mkdirSync(dirname, { recursive: true });

    const indented = config.yaml
      .trimEnd()
      .split("\n")
      .map((l) => (l ? `      ${l}` : l))
      .join("\n");

    const row =
      "- id: llm-pi-ai\n" +
      "  name: '@deepseek-ai/dsh-llm-pi-ai'\n" +
      "  config:\n" +
      indented +
      "\n";

    let existing = fs.existsSync(patchPath)
      ? fs.readFileSync(patchPath, "utf-8")
      : "";

    // Replace a previous pi-ai row (from this module or a hand edit) rather
    // than appending a second one: two rows for the same plugin id make the
    // composed tree ambiguous.
    const rowRe = /- id: llm-pi-ai\n(?: {2,}.*\n)*/;
    if (rowRe.test(existing)) {
      existing = existing.replace(rowRe, row);
    } else {
      existing =
        existing === "" || existing.endsWith("\n")
          ? existing + row
          : existing + "\n" + row;
    }

    fs.writeFileSync(patchPath, existing, "utf-8");
    return true;
  } catch {
    return false;
  }
}
