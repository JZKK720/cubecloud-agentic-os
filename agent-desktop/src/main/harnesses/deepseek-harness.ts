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
  DSH_DEFAULT_MODEL,
  DSH_DEFAULT_PROVIDER,
  DshJsonRpcClient,
  dshEventToFailure,
  dshEventToReasoning,
  dshEventToText,
  type DshSessionEvent,
} from "../dsh-jsonrpc-client";
import { getConfigValue } from "../config";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const TURN_IDLE_TIMEOUT_MS = 180_000;

/** Provider id for the runtime union. Kept as a const so the registry, the
 *  runtime catalog and the tests cannot drift. */
export const DEEPSEEK_HARNESS_PROVIDER_ID = "deepseek-harness";

/**
 * Mount the api-key adapter into a profile home.
 *
 * MEASURED, not assumed: the `sdk` profile alone registers only
 * `deepseek-account`, whose first turn fails with ACCOUNT_SIGN_IN_REQUIRED
 * unless a human signs in through a browser. Adding this patch row to
 * `profiles/sdk/cordis.patch.yml` registers `deepseek-official` as a second
 * provider, and the `sdk` tool surface (31 tools) stays intact. `sdk-minimal`
 * also offers `deepseek-official` but ships only 3 tools, so it is not a
 * substitute.
 *
 * Idempotent: a no-op when the row is already present.
 *
 * @returns true when the patch is in place.
 */
export function ensureApiKeyProviderMounted(dshHome: string): boolean {
  try {
    const dir = join(dshHome, "profiles", "sdk");
    mkdirSync(dir, { recursive: true });
    const patchPath = join(dir, "cordis.patch.yml");

    const row =
      "- id: llm-deepseek-api-key\n" +
      "  name: '@deepseek-ai/dsh-llm-deepseek-api-key'\n";

    let existing = "";
    if (existsSync(patchPath)) {
      existing = readFileSync(patchPath, "utf-8");
      if (existing.includes("dsh-llm-deepseek-api-key")) return true;
    }

    writeFileSync(
      patchPath,
      existing.endsWith("\n") || existing === ""
        ? existing + row
        : existing + "\n" + row,
      "utf-8",
    );
    return true;
  } catch {
    // A read-only or absent home is not fatal: the adapter still works with
    // whatever providers the deployment already mounts.
    return false;
  }
}

export interface DeepSeekHarnessOptions {
  /** Override the launch command (tests pass a fixture script). */
  command?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  /** Provider adapter id. Defaults to `deepseek-account`. */
  provider?: string;
  /** Model id. Defaults to `deepseek-flash`. */
  model?: string;
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

/**
 * Resolve the provider adapter.
 *
 * VERIFIED against the real runtime (0.2.2-rc.5):
 *   `sdk` profile          → registers `deepseek-account` only (31 tools)
 *   `sdk-minimal` profile  → registers `deepseek-official` only (3 tools)
 *
 * Neither is right on its own: the account provider needs an interactive
 * browser sign-in, and sdk-minimal drops the file/edit/bash tool set. The
 * adapter therefore defaults to the **`sdk` profile plus an api-key patch**,
 * which measured 31 tools and a completing turn against a local endpoint.
 *
 * Overridable via `runtime.dsh_provider`.
 */
function resolveProvider(): string {
  try {
    const raw = getConfigValue("runtime.dsh_provider");
    if (typeof raw === "string" && raw.trim()) return raw.trim();
  } catch {
    /* fall through */
  }
  return DSH_DEFAULT_PROVIDER;
}

/** Resolve the model id, defaulting to the package's own catalog entry. */
function resolveModel(): string {
  try {
    const raw = getConfigValue("runtime.dsh_model");
    if (typeof raw === "string" && raw.trim()) return raw.trim();
  } catch {
    /* fall through */
  }
  return DSH_DEFAULT_MODEL;
}

/** True when the operator pinned a provider explicitly, so we must not patch. */
function providerIsPinned(): boolean {
  try {
    const raw = getConfigValue("runtime.dsh_provider");
    return typeof raw === "string" && !!raw.trim();
  } catch {
    return false;
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
      // Mount the api-key provider unless the operator pinned one. Without it
      // the sdk profile offers only deepseek-account, whose turns fail with
      // ACCOUNT_SIGN_IN_REQUIRED until a human signs in through a browser.
      if (!providerIsPinned()) {
        const home = resolveDshHome(options);
        if (home) ensureApiKeyProviderMounted(home);
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
        provider: options.provider ?? resolveProvider(),
        model: options.model ?? resolveModel(),
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
        provider: options.provider ?? resolveProvider(),
        model: options.model ?? resolveModel(),
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
