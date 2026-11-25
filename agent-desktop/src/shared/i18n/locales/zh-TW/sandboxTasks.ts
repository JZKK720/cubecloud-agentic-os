// Sandbox Tasks 畫面字串的繁體中文（台灣）翻譯。

export default {
  title: "沙箱任務",
  subtitle:
    "將任務派送至 IronClaw WASM 沙箱網關。工具呼叫會在隔離的沙箱容器中執行。",
  gatewayUrl: "IronClaw 網關 URL",
  bearerToken: "Bearer token（選填）",
  connect: "連線",
  probing: "探測中...",
  connected: "已連線",
  notConnected: "未連線",
  model: "模型",
  contextFolder: "上下文資料夾（選填）",
  taskDescription: "描述任務內容",
  sendToSandbox: "送至沙箱",
  dispatching: "派送中...",
  completed: "已完成",
  failed: "失敗",
  reply: "回覆",
  toolCalls: "工具呼叫（WASM 沙箱）",
  tokenRequiredHint:
    "網關可連線。請新增網關 token 並重新連線以載入模型。",
} as const;
