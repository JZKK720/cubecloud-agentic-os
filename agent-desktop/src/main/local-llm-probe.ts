// local-llm-probe.ts — find a local OpenAI-compatible model server.
//
// WHY THIS EXISTS: the adapter now defaults to a local route instead of a
// cloud one, but "default" is not evidence. Pointing at 127.0.0.1:11434 says
// nothing about whether Ollama is running, or whether it has a model pulled.
// A desktop that silently sends a chat into the void is worse than one that
// says "no local model server found".
//
// This probe answers three questions the UI needs:
//   - is a server listening at this base URL?
//   - which models does it advertise? (GET /v1/models)
//   - is any of them usable?
//
// Every candidate is loopback. Nothing here reaches the network: the security
// floor for a sovereign product is that prompts only go where the operator
// pointed.
//
// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)

const PROBE_TIMEOUT_MS = 3_000;

export interface LocalLlmProbeResult {
  /** The route id this result describes. */
  routeId: string;
  baseUrl: string;
  reachable: boolean;
  /** Model ids the server advertises, or null when the call failed. */
  models: string[] | null;
  /** One-line status for the UI. */
  detail: string;
  error: string | null;
  scannedAt: string;
}

/** True when a URL points at the loopback interface over http(s). */
export function isLoopbackUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "[::1]"
    );
  } catch {
    return false;
  }
}

interface ModelsResponse {
  data?: Array<{ id?: string }>;
  // Ollama's native endpoint returns { models: [{ name }] }; tolerate both.
  models?: Array<{ name?: string; id?: string }>;
}

/** GET <base>/models and read the advertised model ids. Never throws. */
export async function probeLocalLlm(
  routeId: string,
  baseUrl: string,
): Promise<LocalLlmProbeResult> {
  const scannedAt = new Date().toISOString();

  if (!isLoopbackUrl(baseUrl)) {
    // Refuse rather than probe: a non-loopback "local" server is a
    // misconfiguration we should surface, not silently contact.
    return {
      routeId,
      baseUrl,
      reachable: false,
      models: null,
      detail: "not a loopback endpoint — refusing to probe",
      error: "non-loopback",
      scannedAt,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/models`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });

    if (!res.ok) {
      return {
        routeId,
        baseUrl,
        reachable: true,
        models: null,
        detail: `server answered HTTP ${res.status}`,
        error: `HTTP ${res.status}`,
        scannedAt,
      };
    }

    const body = (await res.json()) as ModelsResponse;
    const ids = [
      ...(body.data ?? []).map((m) => m.id),
      ...(body.models ?? []).map((m) => m.id ?? m.name),
    ].filter((id): id is string => typeof id === "string" && id.length > 0);

    const unique = [...new Set(ids)];

    return {
      routeId,
      baseUrl,
      reachable: true,
      models: unique,
      detail:
        unique.length === 0
          ? "server reachable, no models loaded"
          : `server reachable, ${unique.length} model${unique.length === 1 ? "" : "s"}`,
      error: null,
      scannedAt,
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? "timed out"
          : err.message
        : String(err);
    return {
      routeId,
      baseUrl,
      reachable: false,
      models: null,
      detail: `no server at ${baseUrl}`,
      error: message.slice(0, 200),
      scannedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Probe every candidate in order and return the first usable one. */
export async function findFirstReachableLocalLlm(
  candidates: readonly { id: string; baseURL: string }[],
): Promise<{ found: LocalLlmProbeResult | null; all: LocalLlmProbeResult[] }> {
  const all: LocalLlmProbeResult[] = [];
  for (const candidate of candidates) {
    const result = await probeLocalLlm(candidate.id, candidate.baseURL);
    all.push(result);
    // "Usable" means reachable with at least one model — a server with an
    // empty catalog cannot serve a turn.
    if (result.reachable && (result.models?.length ?? 0) > 0) {
      return { found: result, all };
    }
  }
  return { found: null, all };
}
