// Sandbox Tasks 屏幕字符串 — 简体中文

export default {
  title: "沙箱任务",
  subtitle:
    "向 IronClaw WASM 沙箱网关派发任务。工具调用在隔离的沙箱容器中执行。",
  gatewayUrl: "IronClaw 网关地址",
  bearerToken: "Bearer 令牌（可选）",
  connect: "连接",
  probing: "探测中...",
  connected: "已连接",
  notConnected: "未连接",
  model: "模型",
  contextFolder: "上下文文件夹（可选）",
  taskDescription: "描述任务",
  sendToSandbox: "发送到沙箱",
  dispatching: "派发中...",
  completed: "已完成",
  failed: "失败",
  reply: "回复",
  toolCalls: "工具调用（WASM 沙箱）",
} as const;