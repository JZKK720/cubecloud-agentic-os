import type { GatewayRuntimePresetId } from "./gateway-runtime-presets";

export type ConnectionTransport = "remote" | "ssh";

export type ConnectionDiagnosticCode =
  | "ok"
  | "auth"
  | "wrong-port"
  | "openclaw-compat-disabled"
  | "unreachable";

export interface ConnectionDiagnostic {
  ok: boolean;
  code: ConnectionDiagnosticCode;
  transport: ConnectionTransport;
  runtime: GatewayRuntimePresetId | null;
  statusCode: number | null;
}

interface ConnectionDiagnosticFormatArgs {
  diagnostic: ConnectionDiagnostic;
  runtimeDisplayName: string;
  runtimePresetId: GatewayRuntimePresetId;
}

function resolveSecretName(runtimePresetId: GatewayRuntimePresetId): string {
  return runtimePresetId === "openclaw"
    ? "token or password"
    : "API server key";
}

export function formatConnectionDiagnosticStatus({
  diagnostic,
  runtimeDisplayName,
}: ConnectionDiagnosticFormatArgs): string {
  if (diagnostic.ok) {
    return diagnostic.transport === "ssh"
      ? `SSH tunnel connected to ${runtimeDisplayName}.`
      : `Connected to ${runtimeDisplayName}.`;
  }

  switch (diagnostic.code) {
    case "auth":
      return `Auth rejected by ${runtimeDisplayName}.`;
    case "wrong-port":
      return `${runtimeDisplayName} is not responding on that port.`;
    case "openclaw-compat-disabled":
      return "OpenClaw compatibility endpoint not ready.";
    case "unreachable":
      return diagnostic.transport === "ssh"
        ? "Could not reach the SSH target."
        : `Could not reach ${runtimeDisplayName}.`;
    default:
      return `Could not reach ${runtimeDisplayName}.`;
  }
}

export function formatConnectionDiagnosticDetail({
  diagnostic,
  runtimeDisplayName,
  runtimePresetId,
}: ConnectionDiagnosticFormatArgs): string {
  if (diagnostic.ok) {
    return diagnostic.transport === "ssh"
      ? `SSH tunnel connected to ${runtimeDisplayName}.`
      : `Connected to ${runtimeDisplayName}.`;
  }

  switch (diagnostic.code) {
    case "auth":
      return diagnostic.transport === "ssh"
        ? `The SSH tunnel reached the remote ${runtimeDisplayName} gateway, but it rejected the saved ${resolveSecretName(runtimePresetId)}. Check that secret and try again.`
        : `The remote ${runtimeDisplayName} gateway responded, but it rejected the saved ${resolveSecretName(runtimePresetId)}. Check that secret and try again.`;
    case "wrong-port":
      return diagnostic.transport === "ssh"
        ? `The SSH tunnel opened, but nothing compatible is responding on the selected remote port. Check the saved port and make sure the ${runtimeDisplayName} gateway is listening there.`
        : `Agent Desktop reached that host, but nothing compatible is responding on the selected port. Check the URL and make sure the ${runtimeDisplayName} gateway is listening there.`;
    case "openclaw-compat-disabled":
      return diagnostic.transport === "ssh"
        ? `The SSH tunnel opened, but OpenClaw's HTTP compatibility endpoint is not responding yet. Enable the compatibility surface on the remote host and point Agent Desktop at that /v1 gateway.`
        : `Agent Desktop reached the remote OpenClaw host, but its HTTP compatibility endpoint is not responding yet. Enable the compatibility surface and point Agent Desktop at the /v1 gateway.`;
    case "unreachable":
      return diagnostic.transport === "ssh"
        ? `Could not establish the SSH tunnel or reach the forwarded ${runtimeDisplayName} gateway. Check SSH access, the host, and the remote port.`
        : `Could not reach the remote ${runtimeDisplayName} gateway. Check the host, port, URL, and firewall rules.`;
    default:
      return `Could not reach the remote ${runtimeDisplayName} gateway.`;
  }
}