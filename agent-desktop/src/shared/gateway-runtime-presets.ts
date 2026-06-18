import {
  DEFAULT_LOCAL_GATEWAY_PORT,
  DEFAULT_SSH_REMOTE_PORT,
  IRONCLAW_DEFAULT_PORT,
  OPENCLAW_LOCAL_GATEWAY_PORT,
} from "./runtime-defaults";

// V2.10.61 — widened to include IronClaw. IronClaw only supports
// the remote-gateway connection mode (not SSH tunnel — see
// RuntimeProviderDefinition.ironclaw.canAttachViaSshTunnel in
// src/shared/runtime-orchestration.ts), so the SSH-tunnel panel
// in Settings.tsx / Welcome.tsx hides the IronClaw button while
// the remote-gateway panel renders it normally.
export type GatewayRuntimePresetId = "hermes" | "openclaw" | "ironclaw";

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
  // V2.10.61 — explicit flag so the SSH panel can hide the
  // IronClaw button (ironclaw is gateway-only, not tunnel-able)
  // without having to re-read the runtime-orchestration layer.
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
  // V2.10.65 — IronClaw ships as a WASM-sandbox container runtime
  // (no SSH tunnel). The lane lives on the remote-gateway panel
  // only. Auth is via a Bearer token (GATEWAY_AUTH_TOKEN in the
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
      "SSH attach is not supported for IronClaw. Use the remote-gateway panel instead.",
    sshSupported: false,
  },
};

export function coerceGatewayRuntimePreset(
  value: unknown,
): GatewayRuntimePresetId | null {
  return value === "openclaw" || value === "hermes" || value === "ironclaw"
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
  // V2.10.61 — SSH lane no longer pins a port for IronClaw, but
  // keep the check defensive in case an older profile stored the
  // container default. The SSH panel will still hide the
  // IronClaw button via sshSupported=false.
  if (sshRemotePort === IRONCLAW_DEFAULT_PORT) {
    return "ironclaw";
  }
  if (sshRemotePort === OPENCLAW_LOCAL_GATEWAY_PORT) {
    return "openclaw";
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