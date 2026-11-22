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
// POLICY: the *candidate list* is loopback-only and stays that way — nothing
// here discovers or defaults to a remote host. But the operator can type any
// http(s) endpoint into the form, and a typed endpoint is an explicit choice,
// so it is probeable (with their key, if they supplied one). Refusing to probe
// while the lane happily sends prompts to the same URL would be the
// inconsistency, not the guard.
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

/** True when a URL is http(s) with a host — i.e. something we could contact. */
export function isHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname.length > 0
    );
  } catch {
    return false;
  }
}

/** Optional credential for a hosted endpoint. */
export interface ProbeCredential {
  /**
   * Send the key. Defaults to true when a key is supplied — a hosted endpoint
   * that needs one answers 401 otherwise, and reporting "no models" for a
   * working endpoint with a missing key is a worse answer than sending it.
   * Pass false to see what the endpoint says without it.
   */
  send?: boolean;
  apiKey?: string;
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
  credential?: ProbeCredential,
): Promise<LocalLlmProbeResult> {
  const scannedAt = new Date().toISOString();

  // A loopback endpoint is always probeable. A remote endpoint is probeable
  // only because the operator typed it into the form — there is no candidate
  // list of remote hosts and nothing here ever supplies one. What stays
  // refused is a URL we cannot parse or that is not http(s).
  if (!isHttpUrl(baseUrl)) {
    return {
      routeId,
      baseUrl,
      reachable: false,
      models: null,
      detail: "not an http(s) endpoint — refusing to probe",
      error: "non-http",
      scannedAt,
    };
  }

  const headers: Record<string, string> = { accept: "application/json" };
  if (credential?.apiKey && credential.send !== false) {
    headers.authorization = `Bearer ${credential.apiKey}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/models`, {
      signal: controller.signal,
      headers,
    });

    if (!res.ok) {
      return {
        routeId,
        baseUrl,
        reachable: true,
        models: null,
        detail:
          res.status === 401 || res.status === 403
            ? `server answered HTTP ${res.status} — the endpoint may need an API key`
            : `server answered HTTP ${res.status}`,
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

/** Probe every candidate in order and return the first usable one.
 *
 *  Loopback-only by construction. `probeLocalLlm` now accepts any http(s) URL
 *  because the operator can type a remote one, so the loopback guarantee this
 *  helper used to inherit from it has to be stated here instead: a candidate
 *  list is our own discovery surface, and discovery must never reach the
 *  network.
 */
export async function findFirstReachableLocalLlm(
  candidates: readonly { id: string; baseURL: string }[],
): Promise<{ found: LocalLlmProbeResult | null; all: LocalLlmProbeResult[] }> {
  const all: LocalLlmProbeResult[] = [];
  for (const candidate of candidates) {
    if (!isLoopbackUrl(candidate.baseURL)) {
      all.push({
        routeId: candidate.id,
        baseUrl: candidate.baseURL,
        reachable: false,
        models: null,
        detail: "not a loopback candidate — refusing to probe",
        error: "non-loopback",
        scannedAt: new Date().toISOString(),
      });
      continue;
    }
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
