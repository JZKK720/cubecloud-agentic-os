// raven-harness.ts — I-phase: the real Raven harness adapter,
// replacing the throwing registry stub (EverMind replan §2.1: harness
// adapter ❌ stub → ✅ implemented; I-phase row in §5).
//
// Raven (EverMind, Apache-2.0, v0.2.x) exposes an **OpenAI-compatible
// chat gateway on 8855** (the WebUI on 18793 is a different surface —
// do not conflate; see `gateway-runtime-presets.ts` comments). Turns
// are standard `POST /v1/chat/completions` with SSE streaming — the
// same wire contract the desktop's other gateways speak, minus the
// desktop's session-id resume semantics (Raven owns its own session
// state server-side).
//
// Design constraints (mirroring `hermes-harness.ts`):
//   - Thin adapter over the platform `Harness` contract; no behavior
//     change elsewhere.
//   - The base URL resolution mirrors the connection config chain
//     (remote → ssh tunnel → local default) via ` getConnectionConfig`
//     + `getSshTunnelUrl`, but pins the Raven port default (8855) so
//     the adapter can coexist with a Hermes gateway on 8642. An
//     operator override rides `runtime.provider_url` in config.
//   - `supportsCompaction: false` → compactHistory is an honest no-op
//     (profile-truthful).
//   - Never throws out of `runTurn` — a gateway failure yields a final
//     `done` delta (the router's error path), matching Hermes's
//     adapter semantics.
//   - `oneShot` (non-streaming) exists as the utility for DM-style
//     decision slots pointed at a Raven lane. Optional API key rides
//     the connection config (vault side; never inlined).
//
// Cubecloud original work (2026). Distributed under the repo's dual
// license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import { getConnectionConfig, getConfigValue } from "../config";
import { getSshTunnelUrl, isSshTunnelActive } from "../ssh-tunnel";
import { RAVEN_DEFAULT_PORT } from "../../shared/runtime-defaults";
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

const RAVEN_CHAT_TIMEOUT_MS = 120_000;
const RAVEN_ONESHOT_TIMEOUT_MS = 30_000;

/** Resolve the Raven gateway base URL: operator override (config
 *  `runtime.provider_url`) → ssh-tunnel URL when active (rewritten to
 *  the Raven port path is not supported remotely; the tunnel forwards
 *  as-is) → local default `127.0.0.1:8855`. Never throws. */
export function resolveRavenBaseUrl(): string {
  try {
    const override = getConfigValue("runtime.provider_url");
    if (override && /^https?:\/\//i.test(override)) {
      return override.replace(/\/+$/, "");
    }
  } catch {
    /* fall through to defaults */
  }
  try {
    const conn = getConnectionConfig();
    if (conn.mode === "remote" && conn.remoteUrl) {
      // Remote mode points at the tunneled/host gateway; Raven remote
      // deployments are expected to serve on their own URL (the
      // override above is the explicit path). Keep the port swap for
      // tunnel setups: replace the remote port with 8855 when the
      // host matches the tunnel host.
      try {
        const url = new URL(conn.remoteUrl);
        url.port = String(RAVEN_DEFAULT_PORT);
        return url.toString().replace(/\/+$/, "");
      } catch {
        /* fall through */
      }
    }
    if (conn.mode === "ssh" && isSshTunnelActive()) {
      const tunnelUrl = getSshTunnelUrl();
      if (tunnelUrl) {
        try {
          const url = new URL(tunnelUrl);
          url.port = String(RAVEN_DEFAULT_PORT);
          return url.toString().replace(/\/+$/, "");
        } catch {
          /* fall through */
        }
      }
    }
  } catch {
    /* fall through */
  }
  return `http://127.0.0.1:${RAVEN_DEFAULT_PORT}`;
}

function authHeaders(): Record<string, string> {
  try {
    const conn = getConnectionConfig();
    if (conn.apiKey) {
      return { authorization: `Bearer ${conn.apiKey}` };
    }
  } catch {
    /* no key available */
  }
  return {};
}

/** Parse one SSE data line's delta content (OpenAI chunk shape). */
function extractChunkContent(data: string): string | null {
  try {
    const parsed = JSON.parse(data) as {
      choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
    };
    const delta = parsed.choices?.[0]?.delta?.content;
    if (typeof delta === "string" && delta.length > 0) return delta;
    // Some gateways fold the whole message into one chunk.
    const message = parsed.choices?.[0]?.message?.content;
    return typeof message === "string" ? message : null;
  } catch {
    return null;
  }
}

/** Create the Raven harness adapter. */
export function createRavenHarness(): Harness {
  const profile: HarnessAdapterProfile = {
    transport: "http",
    supportsStreaming: true,
    supportsToolCalls: true,
    supportsCompaction: false,
    supportsSessionReset: true,
    providerId: "raven",
    displayName: "Raven",
  };

  const turns: HarnessTurnController = {
    async *runTurn(input: HarnessTurnInput): AsyncIterable<HarnessTurnDelta> {
      const baseUrl = resolveRavenBaseUrl();
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        RAVEN_CHAT_TIMEOUT_MS,
      );
      const messages: Array<{ role: string; content: string }> = [];
      if (input.history && input.history.length > 0) {
        for (const msg of input.history) {
          const role =
            msg.role === "agent" ? "assistant" : msg.role;
          messages.push({
            role: role === "assistant" || role === "system" ? role : "user",
            content: String(msg.content ?? ""),
          });
        }
      }
      messages.push({ role: "user", content: input.message });

      let response: Response | null = null;
      try {
        response = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "text/event-stream",
            ...authHeaders(),
          },
          body: JSON.stringify({
            model: "hermes-agent",
            messages,
            stream: true,
            ...(input.sessionId ? { user: input.sessionId } : {}),
          }),
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          throw new Error(`raven gateway HTTP ${response.status}`);
        }
      } catch (err) {
        clearTimeout(timer);
        // Mirror the Hermes adapter: surface the failure as a final
        // `done` (the router's error path) instead of throwing out of
        // the generator.
        yield { type: "done", sessionId: undefined };
        return;
      }

      // Stream SSE lines → deltas.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let settled = false;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split(/\r?\n\r?\n/);
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            for (const line of frame.split(/\r?\n/)) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const data = trimmed.slice(5).trim();
              if (!data || data === "[DONE]") {
                settled = true;
                continue;
              }
              const content = extractChunkContent(data);
              if (content) {
                yield { type: "text", content };
              }
            }
          }
        }
      } catch {
        /* stream error — fall through to done (fail-open adapter) */
      } finally {
        clearTimeout(timer);
        reader.releaseLock?.();
      }
      yield { type: "done", sessionId: settled ? input.sessionId : undefined };
    },

    async resetSession(_sessionId: string): Promise<void> {
      // Raven owns session state server-side; no desktop-side reset.
    },

    async close(): Promise<void> {
      // No persistent desktop-side resources.
    },
  };

  const models: HarnessModelUtilities = {
    shouldRespond: (_history: unknown[]) => true,

    async compactHistory(
      history: unknown[],
      _budget: number,
    ): Promise<CompactionResult> {
      // Profile-truthful: supportsCompaction false → honest no-op.
      return { compacted: false, history };
    },

    async oneShot(prompt: string, _model?: string): Promise<string> {
      const baseUrl = resolveRavenBaseUrl();
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        RAVEN_ONESHOT_TIMEOUT_MS,
      );
      try {
        const response = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({
            model: "hermes-agent",
            messages: [{ role: "user", content: prompt }],
            stream: false,
          }),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`raven gateway HTTP ${response.status}`);
        }
        const body = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = body.choices?.[0]?.message?.content;
        return typeof content === "string" ? content : "";
      } finally {
        clearTimeout(timer);
      }
    },
  };

  const tools: HarnessToolPresentation = {
    mapToolName: (name: string) => name,
    unmapToolName: (name: string) => name,
  };

  return { profile, turns, models, tools };
}