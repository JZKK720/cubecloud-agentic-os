export const LOOPBACK_HOST = "127.0.0.1";

export const DEFAULT_LOCAL_GATEWAY_PORT = 8642;
export const OPENCLAW_LOCAL_GATEWAY_PORT = 18789;
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
