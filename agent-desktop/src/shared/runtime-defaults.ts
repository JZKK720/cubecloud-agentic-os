export const LOOPBACK_HOST = "127.0.0.1";

export const DEFAULT_LOCAL_GATEWAY_PORT = 8642;
export const OPENCLAW_LOCAL_GATEWAY_PORT = 18789;
// V2.10.61 — IronClaw ships as a WASM-sandbox container runtime
// and exposes a published HTTP port. The default port mirrors the
// PLATFORM_RUNTIME_PROVIDERS.ironclaw.remoteExampleUrl in
// packages/platform-core/src/index.ts (192.168.1.100:8281/health).
// Operators can override it at attach time; the const is a
// placeholder for the form, not a hard-coded bind address.
export const IRONCLAW_DEFAULT_PORT = 8281;
export const DEFAULT_SSH_REMOTE_PORT = DEFAULT_LOCAL_GATEWAY_PORT;
export const DEFAULT_SSH_LOCAL_PORT = 18642;
export const SSH_CONNECTION_TEST_LOCAL_PORT = 19642;

export const LOCAL_GATEWAY_CANDIDATE_PORTS = [
  DEFAULT_LOCAL_GATEWAY_PORT,
  8644,
] as const;

export function buildLocalGatewayUrl(port = DEFAULT_LOCAL_GATEWAY_PORT): string {
  return `http://${LOOPBACK_HOST}:${port}`;
}

export const DEFAULT_LOCAL_GATEWAY_URL = buildLocalGatewayUrl();
export const OPENCLAW_LOCAL_GATEWAY_URL = buildLocalGatewayUrl(
  OPENCLAW_LOCAL_GATEWAY_PORT,
);
export const IRONCLAW_LOCAL_GATEWAY_URL = buildLocalGatewayUrl(
  IRONCLAW_DEFAULT_PORT,
);
