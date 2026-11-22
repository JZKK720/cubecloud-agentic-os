// deepseek-harness.ts — the DeepSeek Harness runtime adapter.
//
// Fifth runtime lane. Unlike every other adapter in this directory, dsh does
// not speak HTTP: its inbound surface is the SDK wire protocol — JSON-RPC 2.0
// over stdio (`dsh --profile sdk`). See `dsh-jsonrpc-client.ts` for the
// verified framing and method set.
//
// Turn shape
//   1. spawn + `initialize`
//   2. `session/prompt` with the user message as one text content block
//      (the runtime answers with a durable-enqueue receipt, not the reply)
//   3. the reply arrives as `session.event` notifications; each
//      `assistant/message` carries the exact timed model stream
//   4. `session.status` going idle (or `session/wait` resolving) ends the turn
//
// Because the reply is notification-driven, this adapter yields deltas as
// events arrive. It is therefore genuinely streaming, not a poll loop.
//
// Honest limits, declared in the profile rather than discovered at runtime:
//   - transport "stdio": the runtime is a child process we own
//   - supportsCompaction false: dsh compacts internally; we do not drive it
//   - supportsTurnExecution true: the adapter is real
//
// Cubecloud original work (2026). Distributed under the repo's dual license
// per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import type {
  Harness,
  HarnessAdapterProfile,
  HarnessTurnInput,
  HarnessTurnDelta,
  HarnessTurnController,
  HarnessModelUtilities,
  HarnessToolPresentation,
  CompactionResult,
} from "@cubecloud/platform-core";
import {
  DshJsonRpcClient,
  dshEventToFailure,
  dshEventToReasoning,
  dshEventToText,
  type DshSessionEvent,
} from "../dsh-jsonrpc-client";
import { getConfigValue } from "../config";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import {
  buildDshProviderConfig,
  writeDshProviderPatch,
  type CustomDshRoute,
} from "../dsh-provider-config";
import {
  buildDshMcpBridge,
  writeDshMcpPatch,
  type DesktopMcpServer,
  type DshMcpBridgeResult,
} from "../dsh-mcp-bridge";

const TURN_IDLE_TIMEOUT_MS = 180_000;

/** Provider id for the runtime union. Kept as a const so the registry, the
 *  runtime catalog and the tests cannot drift. */
export const DEEPSEEK_HARNESS_PROVIDER_ID = "deepseek-harness";

/**
 * Mount the desktop's MCP inventory into the dsh profile.
 *
 * The desktop already owns an MCP inventory and a probe; dsh ships its own MCP
 * client. Without this the two are unrelated — a server registered in the MCP
 * screen never reaches the dsh runtime. This projects the one inventory into
 * the active runtime instead of duplicating a catalog.
 *
 * @param mcpServers the operator's inventory, or undefined to mount nothing
 * @returns the bridge result so the caller can surface skipped servers
 */
export function ensureMcpBridgeMounted(
  dshHome: string,
  mcpServers?: readonly DesktopMcpServer[],
): DshMcpBridgeResult | null {
  if (!mcpServers) return null;
  const patchPath = join(dshHome, "profiles", "sdk", "cordis.patch.yml");
  const result = buildDshMcpBridge(mcpServers);
  const ok = writeDshMcpPatch(
    patchPath,
    result,
    { existsSync, readFileSync, writeFileSync, mkdirSync },
    dirname(patchPath),
  );
  return ok ? result : null;
}

/**
 * Compose and mount the local-first provider tree into a profile home.
 *
 * The default route is a loopback OpenAI-compatible endpoint (Ollama first),
 * never a cloud API. `dsh-llm-pi-ai` takes a `providers:` dictionary where each
 * key is a route name and a route needs only `api: openai-completions` plus a
 * `baseURL` — which is exactly an Ollama / LM Studio / vLLM / llama.cpp
 * endpoint.
 *
 * Idempotent: an existing `llm-pi-ai` row is replaced, not duplicated, so
 * changing the route set does not leave two rows for one plugin id.
 *
 * @returns the (provider, model) pair the runtime should be initialized with,
 *          or null when the patch could not be written.
 */
export function ensureLocalProviderMounted(dshHome: string): {
  provider: string;
  model: string;
  env: Record<string, string>;
} | null {  const patchPath = join(dshHome, "profiles", "sdk", "cordis.patch.yml");
  const config = buildDshProviderConfig({
    activeRoute: readConfiguredRoute(),
    model: readConfiguredModel(),
    customRoutes: readCustomRoutes(),
  });

  const ok = writeDshProviderPatch(
    patchPath,
    config,
    { existsSync, readFileSync, writeFileSync, mkdirSync },
    dirname(patchPath),
  );

  return ok
    ? { provider: config.provider, model: config.model, env: config.env }
    : null;
}

export interface DeepSeekHarnessOptions {
  /** Override the launch command (tests pass a fixture script). */
  command?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  /** Provider route id. Defaults to the composed local route (Ollama). */
  provider?: string;
  /** Model id. Defaults to the route's first declared model. */
  model?: string;
  /**
   * The desktop's MCP inventory, projected into dsh plugins before each turn.
   * Undefined mounts nothing (the runtime keeps whatever the profile has).
   */
  mcpServers?: () => readonly DesktopMcpServer[];
}

/** Resolve the dsh profile from config so an operator can pick sdk-minimal. */
function resolveProfile(): string {
  try {
    const raw = getConfigValue("runtime.dsh_profile");
    if (raw === "sdk" || raw === "sdk-minimal" || raw === "headless") {
      return raw;
    }
  } catch {
    /* fall through */
  }
  return "sdk";
}

/** Operator-chosen route, or null to let the composed default decide. */
function readConfiguredRoute(): string | undefined {
  try {
    const raw = getConfigValue("runtime.dsh_provider");
    if (typeof raw === "string" && raw.trim()) return raw.trim();
  } catch {
    /* fall through */
  }
  return undefined;
}

/** Operator-chosen model, or undefined to use the route's default. */
function readConfiguredModel(): string | undefined {
  try {
    const raw = getConfigValue("runtime.dsh_model");
    if (typeof raw === "string" && raw.trim()) return raw.trim();
  } catch {
    /* fall through */
  }
  return undefined;
}

/**
 * Extra routes from config, for an operator who wants a hosted gateway.
 *
 * Stored as `runtime.dsh_routes` JSON so we do not invent a config dialect:
 *   [{"id":"acme","baseURL":"https://gw.example/v1","apiKeyEnv":"ACME_KEY",
 *     "models":[{"id":"acme-think"}]}]
 */
function readCustomRoutes(): CustomDshRoute[] {
  try {
    const raw = getConfigValue("runtime.dsh_routes");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is CustomDshRoute =>
        typeof r === "object" &&
        r !== null &&
        typeof (r as CustomDshRoute).id === "string" &&
        typeof (r as CustomDshRoute).baseURL === "string",
    );
  } catch {
    return [];
  }
}

/** Resolve the DSH home the runtime will use (mirrors the child's DSH_HOME). */
function resolveDshHome(options: DeepSeekHarnessOptions): string | null {
  const fromEnv = options.env?.DSH_HOME ?? process.env.DSH_HOME;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  try {
    const configured = getConfigValue("runtime.dsh_home");
    if (typeof configured === "string" && configured.trim()) {
      return configured.trim();
    }
  } catch {
    /* fall through */
  }
  return null;
}

/** Create the DeepSeek Harness adapter. */
export function createDeepSeekHarness(
  options: DeepSeekHarnessOptions = {},
): Harness {
  const profile: HarnessAdapterProfile = {
    transport: "stdio",
    supportsStreaming: true,
    supportsToolCalls: true,
    supportsCompaction: false,
    supportsSessionReset: true,
    supportsTurnExecution: true,
    providerId: DEEPSEEK_HARNESS_PROVIDER_ID,
    displayName: "DeepSeek Harness",
  };

  const turns: HarnessTurnController = {
    async *runTurn(input: HarnessTurnInput): AsyncIterable<HarnessTurnDelta> {
      // Compose the local-first provider tree. The default route is loopback
      // (Ollama first); a cloud route is something the operator adds, never a
      // default, because this product is local-first and offline-capable.
      let provider = options.provider;
      let model = options.model;
      let providerEnv: Record<string, string> = {};
      const home = resolveDshHome(options);
      if (home && (!provider || !model)) {
        const composed = ensureLocalProviderMounted(home);
        if (composed) {
          provider = provider ?? composed.provider;
          model = model ?? composed.model;
          providerEnv = composed.env;
        }
      }

      // Project the desktop's MCP inventory into the runtime, so a server the
      // operator registered in the MCP screen is actually available to the
      // agent instead of existing only in a file this runtime never reads.
      if (home && options.mcpServers) {
        try {
          ensureMcpBridgeMounted(home, options.mcpServers());
        } catch {
          // A bridge failure must not cost the user their turn; the runtime
          // simply starts with whatever the profile already has.
        }
      }

      const client = new DshJsonRpcClient({
        command: options.command,
        args: options.args ?? [
          "-y",
          "@deepseek-ai/dsh",
          "--profile",
          resolveProfile(),
        ],
        cwd: options.cwd,
        env: { ...options.env, ...providerEnv },
        provider,
        model,
      });

      // Collect deltas from notifications. The generator awaits this queue.
      const queue: HarnessTurnDelta[] = [];
      let finished = false;
      let wake: (() => void) | null = null;
      /** Set when the runtime reports a provider failure. */
      let failure: { message: string; code?: string } | null = null;

      const push = (delta: HarnessTurnDelta): void => {
        queue.push(delta);
        const fn = wake;
        wake = null;
        fn?.();
      };

      const onEvent = (event: DshSessionEvent): void => {
        const text = dshEventToText(event);
        if (text) push({ type: "text", content: text });

        const reasoning = dshEventToReasoning(event);
        if (reasoning) push({ type: "reasoning", content: reasoning });

        if (event.type === "tool/call") {
          const data = event.data ?? {};
          push({
            type: "tool_call",
            callId: String(data.callId ?? ""),
            name: String(data.name ?? ""),
            args: String(data.arguments ?? ""),
          });
        }

        if (event.type === "tool/result") {
          const data = event.data ?? {};
          push({
            type: "tool_result",
            callId: String(data.callId ?? ""),
            content: JSON.stringify(data.message ?? ""),
          });
        }

        if (event.type === "assistant/message") {
          const usage = (event.data ?? {}).usage as
            | { inputTokens?: number; outputTokens?: number }
            | undefined;
          if (usage) {
            push({
              type: "usage",
              promptTokens: Number(usage.inputTokens ?? 0),
              completionTokens: Number(usage.outputTokens ?? 0),
            });
          }
        }

        // A provider failure produces no text at all: it surfaces as a
        // `finish` chunk with reason.kind 'error' inside assistant/attempt, or
        // as turn/end with reason.kind 'error'. Capture it so the turn is not
        // reported as a clean but empty answer.
        const eventFailure = dshEventToFailure(event);
        if (eventFailure && !failure) {
          failure = eventFailure;
        }

        // A closed turn is the natural end of one chat turn. `reason` is
        // TurnEndReason, which is merge-extensible upstream — do not assume a
        // closed union.
        if (event.type === "turn/end") {
          finished = true;
          const fn = wake;
          wake = null;
          fn?.();
        }
      };

      let unlisten: (() => void) | null = null;

      try {
        await client.start();
        unlisten = client.onSessionEvent(onEvent);

        // The runtime streams every session's events; filter to ours.
        // dsh opens the session on first prompt, so this is the session id
        // the runtime will use for the events we care about.
        await client.prompt(input.sessionId, [
          { type: "text", text: input.message },
        ]);

        const deadline = Date.now() + TURN_IDLE_TIMEOUT_MS;

        while (!finished) {
          // Drain everything currently queued.
          while (queue.length > 0) {
            yield queue.shift()!;
          }
          if (finished) break;
          if (Date.now() > deadline) {
            break;
          }
          await new Promise<void>((resolve) => {
            wake = resolve;
            // Never wait forever: re-check the deadline periodically so a
            // silent runtime cannot hang the turn.
            setTimeout(() => {
              if (wake === resolve) {
                wake = null;
                resolve();
              }
            }, 1_000);
          });
        }

        while (queue.length > 0) {
          yield queue.shift()!;
        }
      } catch (err) {
        // A transport or initialize failure must be REPORTED, not turned into
        // a silent empty turn. The first real runs showed exactly that: an
        // initialize rejection became a bare `done`, so the operator saw nothing.
        while (queue.length > 0) {
          yield queue.shift()!;
        }
        yield {
          type: "error",
          message: err instanceof Error ? err.message : String(err),
          code: "DSH_TRANSPORT",
        };
        yield { type: "done", sessionId: undefined };
        return;
      } finally {
        unlisten?.();
        await client.dispose().catch(() => {
          /* best effort */
        });
      }

      // A turn that failed at the provider level is not a success. Emit the
      // failure so the operator sees WHY, then close the turn.
      if (failure) {
        yield { type: "error", message: failure.message, code: failure.code };
        yield { type: "done", sessionId: undefined };
        return;
      }

      yield { type: "done", sessionId: input.sessionId };
    },

    async resetSession(_sessionId: string): Promise<void> {
      // Each turn owns its child process; nothing survives to reset.
    },

    async close(): Promise<void> {
      // Per-turn processes are disposed in the runTurn finally block.
    },
  };

  const models: HarnessModelUtilities = {
    shouldRespond: (_history: unknown[]) => true,

    async compactHistory(
      history: unknown[],
      _budget: number,
    ): Promise<CompactionResult> {
      // dsh compacts internally; profile-truthful no-op.
      return { compacted: false, history };
    },

    async oneShot(prompt: string, _model?: string): Promise<string> {
      // A one-shot is a turn with no tool surface. Reuse the same client so
      // there is one wire implementation to keep correct.
      let provider = options.provider;
      let model = options.model;
      const home = resolveDshHome(options);
      if (home && (!provider || !model)) {
        const composed = ensureLocalProviderMounted(home);
        if (composed) {
          provider = provider ?? composed.provider;
          model = model ?? composed.model;
        }
      }

      const client = new DshJsonRpcClient({
        command: options.command,
        args: options.args ?? [
          "-y",
          "@deepseek-ai/dsh",
          "--profile",
          resolveProfile(),
        ],
        cwd: options.cwd,
        env: options.env,
        provider,
        model,
      });

      const parts: string[] = [];
      let finished = false;
      let wake: (() => void) | null = null;

      try {
        await client.start();
        const unlisten = client.onSessionEvent((event) => {
          const text = dshEventToText(event);
          if (text) parts.push(text);
          if (event.type === "turn/end") {
            finished = true;
            const fn = wake;
            wake = null;
            fn?.();
          }
        });

        await client.prompt(`oneshot-${Date.now().toString(36)}`, [
          { type: "text", text: prompt },
        ]);

        const deadline = Date.now() + TURN_IDLE_TIMEOUT_MS;
        while (!finished && Date.now() < deadline) {
          await new Promise<void>((resolve) => {
            wake = resolve;
            setTimeout(() => {
              if (wake === resolve) {
                wake = null;
                resolve();
              }
            }, 1_000);
          });
        }
        unlisten();
        return parts.join("");
      } finally {
        await client.dispose().catch(() => {
          /* best effort */
        });
      }
    },
  };

  const tools: HarnessToolPresentation = {
    mapToolName: (name: string) => name,
    unmapToolName: (name: string) => name,
  };

  return { profile, turns, models, tools };
}
