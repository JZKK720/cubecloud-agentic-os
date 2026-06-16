/**
 * Local-LLM server scan — V2.10.60
 *
 * Probes a small list of well-known local LLM runtime endpoints on
 * the loopback (127.0.0.1 / ::1) interface, with a short per-probe
 * timeout, to answer the question: "is there an Ollama or LM Studio
 * already running on this machine, and where?". Designed to be called
 * from the Models page's "Detect running servers" button.
 *
 * Scope (intentionally small):
 *   - 127.0.0.1 only by default — no LAN scan, no mDNS, no
 *     broadcast. LAN scanning crosses a privacy / network-noise
 *     boundary and is a separate V2.10.61+ feature if the user asks
 *     for it. The renderer can pass extraHosts[] for opt-in LAN.
 *   - Probes are HTTP HEAD on / or HTTP GET on /v1/models (Ollama
 *     and LM Studio both return 200 OK on the OpenAI-compat
 *     /v1/models endpoint when running, and 404 / connection-refused
 *     when not). The probe is intentionally cheaper than
 *     `discoverProviderModels` — we only need "is it up?", not
 *     "what models does it have?".
 *   - Results are best-effort: a missing / refused port returns
 *     `{reachable: false, latencyMs: 0, error: "ECONNREFUSED"}`;
 *     a successful 200 returns `{reachable: true, latencyMs: 17}`.
 *   - 1500 ms timeout per probe. 6 hosts × 1500 ms = 9 s worst case;
 *     the user gets a "scanning..." spinner while it runs.
 *
 * Why this lives in main, not renderer:
 *   The renderer can do fetch() on loopback URLs, but Electron's
 *   sandboxed renderer has CORS / mixed-content quirks that the
 *   main process does not. Putting the scan in main also means a
 *   user running the app on Linux (where 127.0.0.1 is loopback and
 *   Ollama binds to it without firewall prompts) gets the same
 *   behavior as macOS / Windows.
 */

import http from "http";
import https from "https";
import { URL } from "url";

/** The two well-known local LLM ports the desktop knows about by
 *  default. New ports go here as they are recognized; this is the
 *  canonical list and also the source of truth for the
 *  "Detect running servers" button's order. */
export const DEFAULT_LOCAL_LLM_PORTS = [
  { port: 11434, provider: "ollama" as const, label: "Ollama" },
  { port: 1234, provider: "lmstudio" as const, label: "LM Studio" },
];

/** One scanned host entry — the renderer renders this as either
 *  a green pill (reachable) or a grey dot (not running) on a card. */
export interface LocalServerProbe {
  /** "127.0.0.1", "::1", or a LAN host the user explicitly opted in. */
  host: string;
  port: number;
  /** "ollama" or "lmstudio" — matches the PROVIDERS.options `value`
   *  so the card can route detection + URL templating in one place. */
  provider: "ollama" | "lmstudio" | "custom";
  label: string;
  /** True iff the probe got any HTTP response (2xx, 3xx, 4xx, 5xx). */
  reachable: boolean;
  /** Round-trip latency in milliseconds; 0 when unreachable. */
  latencyMs: number;
  /** Status code from the probe, if the server responded. */
  statusCode: number | null;
  /** Best-effort error string when the probe could not connect. */
  error: string | null;
  /** Detected base URL the user can paste into the Add/Edit modal. */
  baseUrl: string;
}

export interface LocalServerScanResult {
  scannedAt: string;
  /** Loopback-only by default. */
  hosts: string[];
  /** All probed (host, port) pairs, reachable or not. */
  probes: LocalServerProbe[];
  /** Convenience: subset of probes that responded. */
  reachable: LocalServerProbe[];
  /** Best-effort per-host base URLs the user can save as a Model. */
  suggestions: Array<{ provider: "ollama" | "lmstudio"; baseUrl: string; label: string }>;
}

const PROBE_TIMEOUT_MS = 1500;

/** Probe a single (host, port) pair. Returns one LocalServerProbe. */
function probeOne(host: string, port: number): Promise<LocalServerProbe> {
  const probeUrl = `http://${host}:${port}/v1/models`;
  const startedAt = Date.now();
  return new Promise((resolve) => {
    let parsed: URL;
    try {
      parsed = new URL(probeUrl);
    } catch (err) {
      resolve({
        host,
        port,
        provider: port === 11434 ? "ollama" : port === 1234 ? "lmstudio" : "custom",
        label: port === 11434 ? "Ollama" : port === 1234 ? "LM Studio" : `Local :${port}`,
        reachable: false,
        latencyMs: 0,
        statusCode: null,
        error: (err as Error).message,
        baseUrl: probeUrl,
      });
      return;
    }
    // http only —local servers don't terminate TLS.
    const req = http.request(
      {
        method: "GET",
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || undefined,
        path: parsed.pathname,
        headers: { Accept: "application/json" },
        timeout: PROBE_TIMEOUT_MS,
      },
      (res) => {
        const latency = Date.now() - startedAt;
        // Drain so the socket can close cleanly.
        res.resume();
        const code = res.statusCode ?? null;
        const provider =
          port === 11434 ? "ollama" : port === 1234 ? "lmstudio" : "custom";
        const label =
          port === 11434
            ? "Ollama"
            : port === 1234
              ? "LM Studio"
              : `Local :${port}`;
        resolve({
          host,
          port,
          provider,
          label,
          // Reachability = any response, including 401 (server up,
          // needs auth) and 4xx (server up, wrong path). 5xx also
          // counts as up —the server is alive and can give an error
          // page. Only network-level failure is "not reachable".
          reachable: code !== null,
          latencyMs: latency,
          statusCode: code,
          error: null,
          baseUrl: `http://${host}:${port}/v1`,
        });
      },
    );
    req.on("error", (err) => {
      resolve({
        host,
        port,
        provider: port === 11434 ? "ollama" : port === 1234 ? "lmstudio" : "custom",
        label: port === 11434 ? "Ollama" : port === 1234 ? "LM Studio" : `Local :${port}`,
        reachable: false,
        latencyMs: 0,
        statusCode: null,
        error: err.message,
        baseUrl: probeUrl,
      });
    });
    req.on("timeout", () => {
      req.destroy();
      resolve({
        host,
        port,
        provider: port === 11434 ? "ollama" : port === 1234 ? "lmstudio" : "custom",
        label: port === 11434 ? "Ollama" : port === 1234 ? "LM Studio" : `Local :${port}`,
        reachable: false,
        latencyMs: PROBE_TIMEOUT_MS,
        statusCode: null,
        error: "timeout",
        baseUrl: probeUrl,
      });
    });
    req.end();
  });
}

/** Run all probes in parallel and assemble the result. */
export async function scanLocalServers(
  opts: { extraHosts?: string[] } = {},
): Promise<LocalServerScanResult> {
  // Resolve the host list: 127.0.0.1 + ::1 by default, plus any
  // user-opted-in LAN hosts (renderer passes via opts.extraHosts).
  const hosts = new Set<string>(["127.0.0.1", "::1"]);
  if (opts.extraHosts) {
    for (const h of opts.extraHosts) {
      if (typeof h === "string" && h.trim()) hosts.add(h.trim());
    }
  }
  // Run every (host, port) probe in parallel — total worst-case is
  // (hosts.length × ports.length × 1.5s), bounded by the user-visible
  // "scanning" spinner in the renderer.
  const tasks: Promise<LocalServerProbe>[] = [];
  for (const host of hosts) {
    for (const { port } of DEFAULT_LOCAL_LLM_PORTS) {
      tasks.push(probeOne(host, port));
    }
  }
  const probes = await Promise.all(tasks);
  const reachable = probes.filter((p) => p.reachable);
  // Dedupe suggestions: same (host, port, provider) reachable probe →
  // one suggestion. We prefer 127.0.0.1 over ::1 over LAN for the
  // suggestion list because the Add/Edit modal's "default URL"
  // works best as a loopback URL the user can paste verbatim.
  const suggestions: LocalServerScanResult["suggestions"] = [];
  const seen = new Set<string>();
  for (const p of [...reachable].sort((a, b) => {
    const score = (h: string) => (h === "127.0.0.1" ? 0 : h === "::1" ? 1 : 2);
    return score(a.host) - score(b.host);
  })) {
    // Suggestions only contain the two named providers — a `custom`
    // probe (e.g. user has an OpenAI-compatible server on an
    // unusual port) doesn't have a pre-wired `baseUrl` we want
    // to push at the user. Look up the named provider from the
    // canonical port list; if it's not there, skip this probe.
    const portEntry = DEFAULT_LOCAL_LLM_PORTS.find((e) => e.port === p.port);
    if (!portEntry) continue;
    const key = `${portEntry.provider}@${p.host}:${p.port}`;
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push({
      provider: portEntry.provider,
      baseUrl: p.baseUrl,
      label: portEntry.label,
    });
  }
  return {
    scannedAt: new Date().toISOString(),
    hosts: Array.from(hosts),
    probes,
    reachable,
    suggestions,
  };
}

/** Health check for a single saved Model. Returns reachability +
 *  latency for the card's status dot. Used by Models.tsx to refresh
 *  the green/red pill on each card. The renderer debounces these
 *  per-card (one in-flight request per card at a time). */
export async function probeLocalModelHealth(
  baseUrl: string,
): Promise<{ reachable: boolean; latencyMs: number; error: string | null }> {
  const trimmed = baseUrl.replace(/\/+$/, "");
  const probeUrl = `${trimmed}/models`;
  let parsed: URL;
  try {
    parsed = new URL(probeUrl);
  } catch (err) {
    return { reachable: false, latencyMs: 0, error: (err as Error).message };
  }
  const mod = parsed.protocol === "https:" ? https : http;
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const req = mod.request(
      {
        method: "GET",
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || undefined,
        path: parsed.pathname,
        headers: { Accept: "application/json" },
        timeout: 1500,
      },
      (res) => {
        res.resume();
        const code = res.statusCode;
        resolve({
          reachable: code !== null && code !== undefined,
          latencyMs: Date.now() - startedAt,
          error: null,
        });
      },
    );
    req.on("error", (err) => {
      resolve({ reachable: false, latencyMs: 0, error: err.message });
    });
    req.on("timeout", () => {
      req.destroy();
      resolve({ reachable: false, latencyMs: 1500, error: "timeout" });
    });
    req.end();
  });
}
