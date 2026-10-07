// OpenViking (agent context database) probe — row R5 of the coordination
// matrix / decision-core replan §D3.4
// (`docs/plans/2026-10-07-decision-core-governance-bench-replan.md`).
//
// OpenViking (Volcengine/ByteDance; AGPL-3.0 core, Apache-2.0 CLI/examples)
// organizes agent context as a `viking://` filesystem: resources, memories,
// skills, sessions with L0/L1/L2 tiered reading. The console's treatment —
// an OPTIONAL tool surface: probe + Status card + optional MCP registration
// in the desktop's MCP registry. **Interop-only, sidecar/remote — never
// vendored into this repo** (AGPL core; NOTICE row when first shipped).
//
// Endpoints (default local `http://127.0.0.1:1933`):
//   GET /health            → availability
//   GET /api/v1/…          → optional inventory (best-effort); the exact
//     list shapes vary by build, so counts are parsed defensively.
//
// Cubecloud original work (2026). Distributed under the repo's dual license
// per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

const OPENVIKING_PROBE_TIMEOUT_MS_CONST = 6_000;

export const OPENVIKING_PROBE_TIMEOUT_MS = OPENVIKING_PROBE_TIMEOUT_MS_CONST;
export const OPENVIKING_DEFAULT_URL = "http://127.0.0.1:1933";

export interface OpenVikingProbeOptions {
  /** Optional bearer key (OpenViking accepts `Authorization: Bearer`). */
  apiKey?: string | null;
}

export interface OpenVikingProbeResult {
  reachable: boolean;
  baseUrl: string;
  /** Best-effort session count (null when the inventory call failed). */
  sessionCount: number | null;
  /** Set when the inventory call failed auth — a config hint for the card. */
  authNote: string | null;
  error: string | null;
  scannedAt: string;
}

/** http(s) only; loopback default is recommended but user-hosted https is
 *  a valid OpenViking deployment. */
export function normalizeOpenVikingBaseUrl(
  raw: string | null | undefined,
): string | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const trimmed = raw.trim().replace(/\/+$/, "");
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

/** A never-settling response must not block the probe (same pattern as
 *  `cubecloud-agent-probe.ts` / `weknora-probe.ts`). */
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

async function fetchBounded(
  url: string,
  timeoutMs: number,
  headers: Record<string, string>,
): Promise<{ ok: boolean; status: number | null; body: unknown; error: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response: Response = await withTimeoutRace(
      fetch(url, { method: "GET", signal: controller.signal, headers }),
      timeoutMs,
    );
    const body = response.ok
      ? ((await withTimeoutRace(
          response.json().catch(() => null),
          timeoutMs,
        )) as unknown)
      : null;
    return { ok: response.ok, status: response.status, body, error: null };
  } catch (err) {
    return { ok: false, status: null, body: null, error: String(err) };
  } finally {
    clearTimeout(timer);
  }
}

function extractArrayCount(
  body: unknown,
  keys: string[],
): number | null {
  if (typeof body !== "object" || body === null) return null;
  const data = (body as Record<string, unknown>).data;
  if (typeof data !== "object" || data === null) return null;
  for (const key of keys) {
    const value = (data as Record<string, unknown>)[key];
    if (Array.isArray(value)) return value.length;
  }
  return null;
}

/** Stateless probe of an operator-configured OpenViking server. Optional
 *  tool surface (row R5); never throws. */
export async function probeOpenViking(
  rawBaseUrl: string | null | undefined = null,
  options: OpenVikingProbeOptions = {},
): Promise<OpenVikingProbeResult> {
  const baseUrl = rawBaseUrl == null
    ? OPENVIKING_DEFAULT_URL
    : (normalizeOpenVikingBaseUrl(rawBaseUrl) ?? OPENVIKING_DEFAULT_URL);
  const scannedAt = new Date().toISOString();

  const headers: Record<string, string> = { accept: "application/json" };
  if (options.apiKey) headers.Authorization = `Bearer ${options.apiKey}`;

  // 1) Availability (bounded; any HTTP answer counts).
  const health = await fetchBounded(
    `${baseUrl}/health`,
    OPENVIKING_PROBE_TIMEOUT_MS,
    headers,
  );
  if (health.status === null) {
    return {
      reachable: false,
      baseUrl,
      sessionCount: null,
      authNote: null,
      error: health.error ?? "OpenViking server unreachable",
      scannedAt,
    };
  }

  // 2) Inventory (best-effort; 401/403 degrade to a hint).
  const inventory = await fetchBounded(
    `${baseUrl}/api/v1/sessions`,
    OPENVIKING_PROBE_TIMEOUT_MS,
    headers,
  );
  let sessionCount: number | null = null;
  let authNote: string | null = null;
  if (inventory.status === 401 || inventory.status === 403) {
    authNote =
      "Reachable but the session inventory needs valid credentials (API key) — set one in the OpenViking panel config.";
  } else if (inventory.ok) {
    sessionCount = extractArrayCount(inventory.body, [
      "sessions",
      "data",
      "items",
    ]);
  } else {
    authNote = `Session inventory unavailable (HTTP ${inventory.status ?? "?"})`;
  }

  return {
    reachable: true,
    baseUrl,
    sessionCount,
    authNote,
    error: null,
    scannedAt,
  };
}