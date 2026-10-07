// cubecloud-agent (AI Workspace) probe — stateless HTTP client against the
// workspace server's public endpoints.
//
// Scope is contract row A of
// `docs/plans/2026-10-06-cubecloud-agent-integration-plan.md`:
//   GET /health            → availability (required)
//   GET /v1/info           → identity/version (optional; older builds 404)
//   GET /v1/stack/status   → component statuses (optional; desktop extras)
//
// Cubecloud original work (2026). Distributed under the repo's dual license
// per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.
//
// Like `everos.ts` and `gbrain-probe.ts`, this module never throws: callers
// (IPC handlers, renderer cards) get a stable `reachable` shape and render
// state from it.

export const CUBECLOUD_AGENT_PROBE_TIMEOUT_MS = 4_000;

/** The plan's default workspace origin — loopback only, same allow-list
 *  class the hardened webview accepts (`isAllowedWebviewUrl`). */
export const CUBECLOUD_AGENT_DEFAULT_URL = "http://127.0.0.1:6767";

export interface CubecloudAgentHealthBody {
  status: string | null;
  body: unknown;
}

export interface CubecloudAgentProbeResult {
  /** True only when `/health` returned a 2xx response. */
  reachable: boolean;
  baseUrl: string;
  health: CubecloudAgentHealthBody;
  /** Parsed `/v1/info` when available; null on 404/parse failure. */
  info: {
    name?: string;
    version?: string;
    auth?: unknown;
    [key: string]: unknown;
  } | null;
  /** Parsed `/v1/stack/status` when available; null on 404/parse failure. */
  stack: unknown;
  /** Human-readable error (network failure, bad JSON) or null. */
  error: string | null;
  scannedAt: string;
}

/** Accepts `127.0.0.1:6767`, `http://127.0.0.1:6767/`, `localhost:6767`.
 *  Loopback hosts only, http only (the hardened-webview allow-list class).
 *  Returns null for anything else — callers must not probe arbitrary
 *  origins from a user-entered string. */
export function normalizeWorkspaceOrigin(raw: string | null | undefined): string | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const candidate = /^https?:\/\//i.test(raw.trim())
    ? raw.trim()
    : `http://${raw.trim()}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  if (
    host !== "localhost" &&
    host !== "127.0.0.1" &&
    host !== "::1" &&
    host !== "[::1]"
  ) {
    return null;
  }
  return `${url.protocol}//${url.host}`;
}

async function fetchJson(
  baseUrl: string,
  path: string,
  timeoutMs: number,
): Promise<{ ok: boolean; status: number | null; body: unknown; error: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "GET",
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    const isJson = (response.headers.get("content-type") ?? "").includes(
      "application/json",
    );
    let body: unknown = null;
    if (isJson) {
      try {
        body = await response.json();
      } catch (err) {
        return {
          ok: false,
          status: response.status,
          body: null,
          error: `invalid JSON from ${path}: ${String(err)}`,
        };
      }
    } else {
      body = await response.text().catch(() => null);
    }
    return { ok: response.ok, status: response.status, body, error: null };
  } catch (err) {
    return { ok: false, status: null, body: null, error: String(err) };
  } finally {
    clearTimeout(timer);
  }
}

/** A hanging body/never-settling response must not leak unhandled
 *  rejections or block the probe: race every response read against the
 *  timeout so the probe always returns. */
function withTimeoutRace<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timeout after ${timeoutMs}ms`)),
      timeoutMs,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/** Probe the AI Workspace server. Never throws. `baseUrl` must already be
 *  normalized (see `normalizeWorkspaceOrigin`) or defaults to loopback. */
export async function probeCubecloudAgent(
  baseUrlInput?: string | null,
): Promise<CubecloudAgentProbeResult> {
  const baseUrl =
    normalizeWorkspaceOrigin(baseUrlInput ?? undefined) ??
    CUBECLOUD_AGENT_DEFAULT_URL;

  const scannedAt = new Date().toISOString();

  const healthProbe = async (): Promise<CubecloudAgentProbeResult> => {
    const health = await fetchJson(
      baseUrl,
      "/health",
      CUBECLOUD_AGENT_PROBE_TIMEOUT_MS,
    );

    const healthStatus =
      health.ok && health.body && typeof health.body === "object"
        ? ((health.body as { status?: string }).status ?? "ok")
        : null;

    if (!health.ok) {
      return {
        reachable: false,
        baseUrl,
        health: { status: null, body: null },
        info: null,
        stack: null,
        error: health.error ?? `health HTTP ${health.status ?? "unreachable"}`,
        scannedAt,
      };
    }

    // /v1/info and /v1/stack/status are opportunistic — a lot of workspace
    // builds answer only /health, which still counts as attached.
    const [info, stack] = await Promise.all([
      fetchJson(baseUrl, "/v1/info", CUBECLOUD_AGENT_PROBE_TIMEOUT_MS),
      fetchJson(baseUrl, "/v1/stack/status", CUBECLOUD_AGENT_PROBE_TIMEOUT_MS),
    ]);

    const infoParsed =
      info.ok && info.body && typeof info.body === "object"
        ? (info.body as NonNullable<CubecloudAgentProbeResult["info"]>)
        : null;
    const stackParsed = stack.ok ? stack.body : null;

    return {
      reachable: true,
      baseUrl,
      health: { status: healthStatus, body: health.body },
      info: infoParsed,
      stack: stackParsed,
      error: null,
      scannedAt,
    };
  };

  try {
    return await withTimeoutRace(
      healthProbe(),
      // Bounded: health window + slack. A server that accepts HTTP but
      // never answers cannot hang the probe longer than this.
      CUBECLOUD_AGENT_PROBE_TIMEOUT_MS + 2_000,
    );
  } catch (err) {
    // Unreachable via race timeout too — degrade gracefully.
    return {
      reachable: false,
      baseUrl,
      health: { status: null, body: null },
      info: null,
      stack: null,
      error: String(err),
      scannedAt,
    };
  }
}