// WeKnora (enterprise RAG knowledge platform) probe — row R6 of the
// coordination matrix / decision-core replan §D3.4
// (`docs/plans/2026-10-07-decision-core-governance-bench-replan.md`).
//
// WeKnora (MIT): Go server with REST under `/api/v1` (knowledge-bases,
// knowledge, chunks, sessions, knowledge-chat, wiki) and a built-in MCP
// endpoint per space (`/mcp/<endpoint_id>`, Streamable HTTP). The console's
// treatment is retrieval-only: probe + Tools card + optional MCP
// registration in the desktop's MCP registry. The console never mounts a
// WeKnora `agent-chat` lane (that is the workspace/chat contract's job).
//
// Cubecloud original work (2026). Distributed under the repo's dual license
// per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

const WEKNORA_PROBE_TIMEOUT_MS_CONST = 6_000;
const WEKNORA_API_PREFIX = "/api/v1";

export const WEKNORA_PROBE_TIMEOUT_MS = WEKNORA_PROBE_TIMEOUT_MS_CONST;

export interface WeknoraProbeOptions {
  /** Optional `X-API-Key` for the inventory call. */
  apiKey?: string | null;
  /** Optional `X-Tenant-ID` for platform-scoped keys. */
  tenantId?: string | null;
}

export interface WeknoraProbeResult {
  /** True when the server answered (any HTTP status counts as reachable
   *  — WeKnora's /health may 404 on older builds). */
  reachable: boolean;
  baseUrl: string;
  /** Number of knowledge bases visible, or null when the inventory call
   *  failed (auth/network/parse). */
  kbCount: number | null;
  /** Set when the KB list returned 401/403 — a config hint for the card. */
  authNote: string | null;
  error: string | null;
  scannedAt: string;
}

/** Normalize an operator-entered WeKnora base URL: trim trailing slashes;
 *  http(s) only (loopback http recommended by the security floor — remote
 *  https allowed because WeKnora is often server-hosted). */
export function normalizeWeknoraBaseUrl(raw: string | null | undefined): string | null {
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

/** A never-settling response (hanging server or a mock that ignores the
 *  abort signal) must not block the probe: race every fetch against the
 *  timeout so the probe always returns — same pattern as
 *  `cubecloud-agent-probe.ts`'s `withTimeoutRace`. */
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
): Promise<{
  ok: boolean;
  status: number | null;
  body: unknown;
  error: string | null;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response: Response = await withTimeoutRace(
      fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers,
      }),
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
    // AbortError from our own timeout surfaces as a bounded failure.
    return { ok: false, status: null, body: null, error: String(err) };
  } finally {
    clearTimeout(timer);
  }
}

/** Stateless probe of an operator-configured WeKnora server. Never
 *  throws; failures degrate into the result shape. */
export async function probeWeknora(
  rawBaseUrl: string | null | undefined,
  options: WeknoraProbeOptions = {},
): Promise<WeknoraProbeResult> {
  const baseUrl = normalizeWeknoraBaseUrl(rawBaseUrl);
  const scannedAt = new Date().toISOString();
  if (!baseUrl) {
    return {
      reachable: false,
      baseUrl: "",
      kbCount: null,
      authNote: null,
      error: "invalid or missing WeKnora base URL",
      scannedAt,
    };
  }

  const headers: Record<string, string> = { accept: "application/json" };
  if (options.apiKey) headers["X-API-Key"] = options.apiKey;
  if (options.tenantId) headers["X-Tenant-ID"] = options.tenantId;

  // 1) Availability: try /health only (bounded); ANY http answer counts
  //    as reachable. A second variant probe would double the dead-server
  //    wait, so a silent server is declared unreachable in one round.
  const health = await fetchBounded(
    `${baseUrl}/health`,
    WEKNORA_PROBE_TIMEOUT_MS,
    headers,
  );
  if (health.status === null) {
    return {
      reachable: false,
      baseUrl,
      kbCount: null,
      authNote: null,
      error: health.error ?? "WeKnora server unreachable",
      scannedAt,
    };
  }

  // 2) Inventory (optional, needs auth; 401/403 degrade gracefully).
  const inventory = await fetchBounded(
    `${baseUrl}${WEKNORA_API_PREFIX}/knowledge-bases`,
    WEKNORA_PROBE_TIMEOUT_MS,
    headers,
  );
  let kbCount: number | null = null;
  let authNote: string | null = null;
  if (inventory.status === 401 || inventory.status === 403) {
    authNote =
      "Reachable but the knowledge list needs a valid API key (X-API-Key) — set one in the WeKnora panel config.";
  } else if (inventory.ok) {
    // Body comes from the same bounded call — no second unbounded fetch.
    const body =
      (inventory.body as {
        data?: { knowledge_bases?: unknown[]; knowledgeBases?: unknown[] };
      } | null) ?? null;
    const list =
      body?.data?.knowledge_bases ?? body?.data?.knowledgeBases ?? null;
    kbCount = Array.isArray(list) ? list.length : 0;
  } else {
    authNote = `KB inventory unavailable (HTTP ${inventory.status ?? "?"})`;
  }

  return {
    reachable: true,
    baseUrl,
    kbCount,
    authNote,
    error: null,
    scannedAt,
  };
}