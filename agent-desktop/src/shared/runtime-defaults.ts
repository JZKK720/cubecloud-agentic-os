export const LOOPBACK_HOST = "127.0.0.1";

export const DEFAULT_LOCAL_GATEWAY_PORT = 8642;
export const OPENCLAW_LOCAL_GATEWAY_PORT = 18789;
// V2.10.65 — IronClaw's OpenAI-compatible HTTP gateway lives on
// the container's port 3000, published to host port 3231 by
// default. Port 8281 (container 8080) is the internal HTTP channel
// bus (only /health, no REST API); port 50051 is gRPC (NearAI
// protocol). The desktop attaches to the gateway port for chat.
// Operators can override it at attach time; the const is a
// placeholder for the form, not a hard-coded bind address.
export const IRONCLAW_DEFAULT_PORT = 3231;
export const RAVEN_DEFAULT_PORT = 8855;
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
