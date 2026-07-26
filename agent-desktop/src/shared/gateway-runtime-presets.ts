import {
  DEFAULT_LOCAL_GATEWAY_PORT,
  DEFAULT_SSH_REMOTE_PORT,
  IRONCLAW_DEFAULT_PORT,
  OPENCLAW_LOCAL_GATEWAY_PORT,
  RAVEN_DEFAULT_PORT,
} from "./runtime-defaults";

// V2.10.61 / V2.10.68 — widened to include IronClaw. IronClaw now
// supports both remote-gateway attach and forwarded SSH attach. The
// SSH path still targets the published gateway port (default 3231)
// and validates the IronClaw-specific /api/health surface.
// V2.10.76 — widened to include Raven. Raven is EverMind's self-
// improving agent harness. Its OpenAI-compatible HTTP gateway runs
// on port 8855 by default and exposes /health + /v1/chat/completions.
export type GatewayRuntimePresetId =
  | "hermes"
  | "openclaw"
  | "ironclaw"
  | "raven";

export interface GatewayRuntimePreset {
  id: GatewayRuntimePresetId;
  displayName: string;
  remoteExampleUrl: string;
  remoteSecretLabel: string;
  remoteSecretPlaceholder: string;
  remoteSecretHint: string;
  remoteHint: string;
  // V2.10.61 — sshRemotePort remains a `number` so the existing
  // parseInt / placeholder call sites in Settings.tsx and
  // Welcome.tsx compile unchanged. IronClaw's value is the
  // WASM-sandbox container default; it is never surfaced in the
  // SSH panel because that panel is hidden for ironclaw.
  sshRemotePort: number;
  sshSecretLabel: string;
  sshSecretHint: string;
  // Explicit flag so the Welcome / Settings SSH panels can follow
  // the preset contract without re-reading runtime-orchestration.
  sshSupported: boolean;
}

const REMOTE_GATEWAY_EXAMPLE_HOST = "192.168.1.100";

export const GATEWAY_RUNTIME_PRESETS: Record<
  GatewayRuntimePresetId,
  GatewayRuntimePreset
> = {
  hermes: {
    id: "hermes",
    displayName: "Hermes Agent",
    remoteExampleUrl: `http://${REMOTE_GATEWAY_EXAMPLE_HOST}:${DEFAULT_LOCAL_GATEWAY_PORT}`,
    remoteSecretLabel: "API server key",
    remoteSecretPlaceholder: "Paste the API_SERVER_KEY for this gateway",
    remoteSecretHint:
      "Leave this empty if the remote Hermes gateway accepts unauthenticated requests.",
    remoteHint:
      "Use the Hermes gateway base URL. If auth is enabled, provide the API_SERVER_KEY for that remote gateway.",
    sshRemotePort: DEFAULT_SSH_REMOTE_PORT,
    sshSecretLabel: "API server key",
    sshSecretHint:
      "Optional for SSH unless the remote Hermes gateway expects API_SERVER_KEY for tunneled requests.",
    sshSupported: true,
  },
  openclaw: {
    id: "openclaw",
    displayName: "OpenClaw",
    remoteExampleUrl: `http://${REMOTE_GATEWAY_EXAMPLE_HOST}:${OPENCLAW_LOCAL_GATEWAY_PORT}/v1`,
    remoteSecretLabel: "Gateway token or password",
    remoteSecretPlaceholder: "Paste the OpenClaw gateway token or password",
    remoteSecretHint:
      "Use this only when OpenClaw gateway auth is enabled for the compatibility endpoint.",
    remoteHint:
      "Use the OpenClaw HTTP compatibility URL, usually ending in /v1. HTTP compatibility must be enabled before Agent Desktop can attach.",
    sshRemotePort: OPENCLAW_LOCAL_GATEWAY_PORT,
    sshSecretLabel: "Gateway token or password",
    sshSecretHint:
      "Use this when OpenClaw gateway auth is enabled. HTTP compatibility must also be enabled on the remote gateway.",
    sshSupported: true,
  },
  // V2.10.65 / V2.10.68 — IronClaw ships as a WASM-sandbox container
  // runtime. Auth is via a Bearer token (GATEWAY_AUTH_TOKEN in the
  // container env). The gateway port (container 3000 → host 3231)
  // exposes the OpenAI-compatible /v1/chat/completions and
  // /v1/models surface plus /api/health. The example URL uses
  // /api/health because it returns the IronClaw-specific shape
  // {"status":"healthy","channel":"gateway"} that distinguishes
  // it from Hermes's /health response.
  ironclaw: {
    id: "ironclaw",
    displayName: "IronClaw",
    remoteExampleUrl: `http://${REMOTE_GATEWAY_EXAMPLE_HOST}:${IRONCLAW_DEFAULT_PORT}/api/health`,
    remoteSecretLabel: "Bearer token (optional)",
    remoteSecretPlaceholder:
      "Paste the IronClaw GATEWAY_AUTH_TOKEN if the gateway enforces auth",
    remoteSecretHint:
      "Leave this empty if the published IronClaw gateway port accepts unauthenticated requests.",
    remoteHint:
      "Use the published IronClaw gateway port (default 3231, container port 3000). The /api/health path returns the IronClaw-specific health shape; /v1/chat/completions and /v1/models are the OpenAI-compatible chat surface.",
    sshRemotePort: IRONCLAW_DEFAULT_PORT,
    sshSecretLabel: "Bearer token (optional)",
    sshSecretHint:
      "Use this when the forwarded IronClaw gateway requires GATEWAY_AUTH_TOKEN.",
    sshSupported: true,
  },
  // V2.10.76 — Raven is EverMind's self-improving agent harness
  // built on EverOS. Its OpenAI-compatible HTTP gateway runs on
  // port 8855 by default. Auth is via an optional Bearer token.
  // The gateway exposes /health (returns {"status":"ok",...
  // "runtime":"raven"}) and /v1/chat/completions. The desktop
  // attaches the same way as Hermes/IronClaw/OpenClaw — the chat
  // path is the unified /v1/chat/completions contract.
  raven: {
    id: "raven",
    displayName: "Raven (EverMind)",
    remoteExampleUrl: `http://${REMOTE_GATEWAY_EXAMPLE_HOST}:${RAVEN_DEFAULT_PORT}`,
    remoteSecretLabel: "Bearer token (optional)",
    remoteSecretPlaceholder:
      "Paste the Raven gateway token if auth is enabled",
    remoteSecretHint:
      "Leave this empty if the Raven gateway accepts unauthenticated requests.",
    remoteHint:
      "Use the Raven gateway base URL (default port 8855). Raven is EverMind's self-improving agent harness with EverOS memory, SkillForge skills, and Sentinel proactivity.",
    sshRemotePort: RAVEN_DEFAULT_PORT,
    sshSecretLabel: "Bearer token (optional)",
    sshSecretHint:
      "Use this when the forwarded Raven gateway requires auth.",
    sshSupported: true,
  },
};

export function coerceGatewayRuntimePreset(
  value: unknown,
): GatewayRuntimePresetId | null {
  return value === "openclaw" ||
    value === "hermes" ||
    value === "ironclaw" ||
    value === "raven"
    ? value
    : null;
}

export function resolveGatewayRuntimePreset(args: {
  storedPreset?: unknown;
  remoteUrl?: string | null;
  sshRemotePort?: number | string | null;
}): GatewayRuntimePresetId {
  return (
    coerceGatewayRuntimePreset(args.storedPreset) ??
    inferGatewayRuntimePreset({
      remoteUrl: args.remoteUrl,
      sshRemotePort: args.sshRemotePort,
    })
  );
}

export function inferGatewayRuntimePreset(args: {
  remoteUrl?: string | null;
  sshRemotePort?: number | string | null;
}): GatewayRuntimePresetId {
  const sshRemotePort = Number(args.sshRemotePort);
  // Defensive: older profiles may store the IronClaw gateway port
  // directly. Keep inferring the preset from that port.
  if (sshRemotePort === IRONCLAW_DEFAULT_PORT) {
    return "ironclaw";
  }
  if (sshRemotePort === OPENCLAW_LOCAL_GATEWAY_PORT) {
    return "openclaw";
  }
  if (sshRemotePort === RAVEN_DEFAULT_PORT) {
    return "raven";
  }

  const remoteUrl = (args.remoteUrl || "").trim();
  if (!remoteUrl) {
    return "hermes";
  }

  try {
    const parsed = new URL(remoteUrl);
    if (Number(parsed.port) === IRONCLAW_DEFAULT_PORT) {
      return "ironclaw";
    }
    if (/\/api\/health(?:\/|$)/i.test(parsed.pathname)) {
      // /api/health is the IronClaw gateway health surface; it
      // returns {"status":"healthy","channel":"gateway"} which
      // distinguishes it from Hermes's /health. An explicit port
      // match above already handles the common case; this catches
      // operator-pinned IronClaw containers on a non-default
      // port that still expose /api/health.
      return "ironclaw";
    }
    if (Number(parsed.port) === OPENCLAW_LOCAL_GATEWAY_PORT) {
      return "openclaw";
    }
    if (Number(parsed.port) === RAVEN_DEFAULT_PORT) {
      return "raven";
    }
    if (/^\/v1(?:\/|$)/i.test(parsed.pathname)) {
      return "openclaw";
    }
  } catch {
    // Fall back to Hermes when the URL is not parseable yet.
  }

  return "hermes";
}

function normalisePresetPath(
  pathname: string,
  presetId: GatewayRuntimePresetId,
): string {
  if (presetId === "openclaw") {
    return !pathname || pathname === "/" ? "/v1" : pathname;
  }
  if (presetId === "ironclaw") {
    return !pathname || pathname === "/" ? "/api/health" : pathname;
  }

  return pathname === "/v1" || pathname === "/v1/" ? "/" : pathname || "/";
}

export function applyGatewayRuntimePresetToRemoteUrl(
  rawUrl: string,
  presetId: GatewayRuntimePresetId,
): string {
  const preset = GATEWAY_RUNTIME_PRESETS[presetId];
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return preset.remoteExampleUrl;
  }

  try {
    const parsed = new URL(trimmed);
    parsed.port = String(preset.sshRemotePort);
    parsed.pathname = normalisePresetPath(parsed.pathname, presetId);

    let result = parsed.toString();
    if (presetId === "hermes") {
      result = result.replace(/\/$/, "");
    }
    if (presetId === "openclaw" && result.endsWith("/")) {
      result = result.slice(0, -1);
    }
    if (presetId === "ironclaw" && result.endsWith("/")) {
      result = result.slice(0, -1);
    }
    return result;
  } catch {
    return preset.remoteExampleUrl;
  }
}