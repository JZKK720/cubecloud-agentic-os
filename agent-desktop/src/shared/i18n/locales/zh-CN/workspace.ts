export default {
  kicker: "代码智能界面",
  summary:
    "使用 CodeGraph 索引本地仓库，检查真实的图统计信息，并为 Hermes 工作流构建上下文包，而不是假装这是旧的 Office 网页视图。",
  cliDetected: "检测到 CLI",
  cliRequired: "需要 CLI",
  externalLocalProcess: "外部本地进程",
  prototypeHint:
    "当前原型通过 IPC 使用本地 CodeGraph CLI。不使用远程 HTTP 隧道，也不嵌入工作区网页视图。",
  runtime: "运行时",
  refreshing: "刷新中",
  refresh: "刷新",
  version: "版本",
  command: "命令",
  checking: "检查中...",
  notDetected: "未检测到",
  installHint:
    "只有当 `codegraph` CLI 在机器 PATH 中可用时，Agent Desktop 才能驱动此界面。",
  installingCli: "安装 CLI 中...",
  installCodeGraphCli: "安装 CodeGraph CLI",
} as const;
