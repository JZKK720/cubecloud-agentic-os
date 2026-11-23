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
// V2.10.84 — corrected. Raven's gateway has never listened on 8855.
// Verified against the installed raven 0.2.8 wheel and `raven serve
// --help`: the headless gateway is WebSocket-RPC on 18792, and the
// repo's own history contains no 8855 port (only an embedding float).
// Raven exposes NO OpenAI-compatible /v1 surface — its inbound HTTP is
// `/health`, `/auth`, /rpc and the file/knowledge viewers. The desktop
// therefore probes `/health` here and classifies it as attached
// (read-only), not as a chat-completions lane.
export const RAVEN_DEFAULT_PORT = 18792;

/**
 * Default local OpenAI-compatible endpoint for the DeepSeek Harness lane.
 *
 * Ollama's `/v1` surface. The dsh provider tree defaults here so the product
 * ships pointing at a local model server rather than a cloud API: the framing
 * is local-first, offline-capable, and no API key is required for a local
 * server. A hosted route is something the operator adds later.
 */
export const OLLAMA_DEFAULT_BASE_URL = "http://127.0.0.1:11434/v1";

/** Route id the pi-ai provider tree uses for the local Ollama endpoint. */
export const OLLAMA_ROUTE_ID = "ollama";

/**
 * Route id used when the operator points the lane at a hosted, key-bearing
 * endpoint instead of a local model server.
 *
 * The base URL is theirs — it is never defaulted, and it is never used unless
 * they typed it. The key is stored in the profile's config (local, same
 * directory as every other setting) and exported to the runtime child as an
 * env var, so it is never written into a patch file that could be committed.
 */
export const DSH_CUSTOM_ROUTE_ID = "custom";

/** Config keys the Settings endpoint form persists. */
export const DSH_CONFIG_KEYS = {
  baseUrl: "runtime.dsh_base_url",
  model: "runtime.dsh_model",
  apiKey: "runtime.dsh_api_key",
} as const;
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
