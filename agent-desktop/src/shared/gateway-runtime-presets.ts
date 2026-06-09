import {
  DEFAULT_LOCAL_GATEWAY_PORT,
  DEFAULT_SSH_REMOTE_PORT,
  OPENCLAW_LOCAL_GATEWAY_PORT,
} from "./runtime-defaults";

export type GatewayRuntimePresetId = "hermes" | "openclaw";

export interface GatewayRuntimePreset {
  id: GatewayRuntimePresetId;
  displayName: string;
  remoteExampleUrl: string;
  remoteSecretLabel: string;
  remoteSecretPlaceholder: string;
  remoteSecretHint: string;
  remoteHint: string;
  sshRemotePort: number;
  sshSecretLabel: string;
  sshSecretHint: string;
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
  },
};

export function coerceGatewayRuntimePreset(
  value: unknown,
): GatewayRuntimePresetId | null {
  return value === "openclaw" || value === "hermes" ? value : null;
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
  if (sshRemotePort === OPENCLAW_LOCAL_GATEWAY_PORT) {
    return "openclaw";
  }

  const remoteUrl = (args.remoteUrl || "").trim();
  if (!remoteUrl) {
    return "hermes";
  }

  try {
    const parsed = new URL(remoteUrl);
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
    return result;
  } catch {
    return preset.remoteExampleUrl;
  }
}