// kitesurf-probe.ts — detect a running Kitesurf CDP endpoint.
//
// WHY THIS EXISTS: Kitesurf (cloudflare/kitesurf) is a browser engine on
// workerd that speaks the Chrome DevTools Protocol. It ships a container
// image, so an operator can run it as a disposable browser backend:
//
//   docker run --rm -p 127.0.0.1:8787:8787 ghcr.io/cloudflare/kitesurf
//
// The desktop's job here is discovery, not orchestration: it does not spawn or
// supervise the container. It asks the endpoint whether it is a live CDP
// target, and reports that honestly.
//
// WHY PROBE `GET /json/version` RATHER THAN A TCP CONNECT: an open port is not a
// browser. `/json/version` is the CDP handshake — a conformant target answers
// with `Browser`, `Protocol-Version`, and usually a `webSocketDebuggerUrl`.
// Only that answer justifies telling the operator a browser is available.
//
// SECURITY POSTURE (this is the reason the adapter is opt-in): a CDP endpoint
// executes arbitrary page JavaScript, and upstream says Kitesurf is "not a
// hardened sandbox". So this probe is loopback-only and refuses anything else,
// matching local-llm-probe's policy: discovery never reaches a remote host.
//
// Cubecloud original work (2026). Distributed under the repo's dual license
// per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

const PROBE_TIMEOUT_MS = 3_000;

/** Default host port published by the upstream image. */
export const KITESURF_DEFAULT_CDP_URL = "http://127.0.0.1:8787";

export interface KitesurfProbeResult {
  /** True only when the endpoint answered a conformant CDP handshake. */
  reachable: boolean;
  /** The URL probed. */
  baseUrl: string;
  /** `Browser` from /json/version, e.g. "Kitesurf/0.1". */
  browser: string | null;
  /** CDP protocol version the target speaks. */
  protocolVersion: string | null;
  /** One-line status for the card. */
  detail: string;
  /** Machine-readable failure reason, or null. */
  error: string | null;
  scannedAt: string;
}

/** True when a URL is http(s) and points at the loopback interface, INCLUDING
 *  the Docker host-gateway alias.
 *
 *  Deliberately stricter than local-llm-probe's typed-endpoint allowance: a CDP
 *  endpoint accepts commands that execute page JavaScript, so "the operator
 *  typed a remote host" is not sufficient consent to probe it.
 *
 *  `host.docker.internal` is included because the kernel runs in a container
 *  whose own `127.0.0.1` is NOT the host's. Measured: from inside the kernel,
 *  `127.0.0.1:8787` is refused while `host.docker.internal:8787` reaches a
 *  Kitesurf container published with `-p 127.0.0.1:8787:8787`. That alias still
 *  resolves to the operator's own machine, so it does not widen the security
 *  boundary — it is the loopback of the host, reached by its container name. */
export function isLoopbackCdpUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "[::1]" ||
      host === "host.docker.internal"
    );
  } catch {
    return false;
  }
}

/** Where a Kitesurf endpoint should be looked for, in order.
 *
 *  A desktop app on the host reaches the published port directly; the kernel
 *  running in a container reaches the same port through the host-gateway
 *  alias. Exported so the adapter can report why the first candidate failed
 *  rather than silently trying another. */
export const KITESURF_CANDIDATE_URLS: readonly string[] = [
  KITESURF_DEFAULT_CDP_URL,
  "http://host.docker.internal:8787",
] as const;

interface CdpVersionResponse {
  Browser?: unknown;
  "Protocol-Version"?: unknown;
  webSocketDebuggerUrl?: unknown;
}

/** Probe a Kitesurf CDP endpoint. Never throws. */
export async function probeKitesurf(
  baseUrl: string = KITESURF_DEFAULT_CDP_URL,
): Promise<KitesurfProbeResult> {
  const scannedAt = new Date().toISOString();
  const trimmed = baseUrl.trim() || KITESURF_DEFAULT_CDP_URL;

  if (!isLoopbackCdpUrl(trimmed)) {
    return {
      reachable: false,
      baseUrl: trimmed,
      browser: null,
      protocolVersion: null,
      detail:
        "not a loopback CDP endpoint — refusing to probe. A CDP target executes page JavaScript, so Kitesurf must run locally.",
      error: "non-loopback",
      scannedAt,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(`${trimmed.replace(/\/+$/, "")}/json/version`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });

    if (!res.ok) {
      return {
        reachable: false,
        baseUrl: trimmed,
        browser: null,
        protocolVersion: null,
        detail: `port answered HTTP ${res.status} but not a CDP handshake`,
        error: `HTTP ${res.status}`,
        scannedAt,
      };
    }

    const body = (await res.json()) as CdpVersionResponse;
    const browser = typeof body.Browser === "string" ? body.Browser : null;
    const protocolVersion =
      typeof body["Protocol-Version"] === "string"
        ? body["Protocol-Version"]
        : null;

    // A conformant CDP target reports at least one of these. A generic JSON
    // endpoint on the right port is not a browser and must not be reported as
    // one.
    if (!browser && !protocolVersion && !body.webSocketDebuggerUrl) {
      return {
        reachable: false,
        baseUrl: trimmed,
        browser: null,
        protocolVersion: null,
        detail: "endpoint answered JSON, but not a CDP /json/version handshake",
        error: "not-cdp",
        scannedAt,
      };
    }

    return {
      reachable: true,
      baseUrl: trimmed,
      browser,
      protocolVersion,
      detail: `CDP target ${browser ?? "unknown"} speaking protocol ${protocolVersion ?? "unknown"}`,
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
      reachable: false,
      baseUrl: trimmed,
      browser: null,
      protocolVersion: null,
      detail: `no CDP endpoint at ${trimmed}`,
      error: message.slice(0, 200),
      scannedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}
