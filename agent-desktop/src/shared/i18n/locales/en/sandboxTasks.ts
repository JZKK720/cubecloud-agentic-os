// Source-of-truth Sandbox Tasks screen strings.
// Every other locale falls back to these when its own copy is missing.

export default {
  title: "Sandbox Tasks",
  subtitle:
    "Dispatch tasks to the IronClaw WASM-sandbox gateway. Tool calls execute in isolated sandbox containers.",
  gatewayUrl: "IronClaw Gateway URL",
  bearerToken: "Bearer token (optional)",
  connect: "Connect",
  probing: "Probing...",
  connected: "Connected",
  notConnected: "Not connected",
  model: "Model",
  contextFolder: "Context folder (optional)",
  taskDescription: "Describe the task",
  sendToSandbox: "Send to Sandbox",
  dispatching: "Dispatching...",
  completed: "Completed",
  failed: "Failed",
  reply: "Reply",
  toolCalls: "Tool calls (WASM sandbox)",
} as const;