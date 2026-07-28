export default {
  kicker: "程式碼智慧介面",
  summary:
    "使用 CodeGraph 索引本地儲存庫，檢查真實的圖統計資訊，並為 Hermes 工作流程建構上下文包，而不是假裝這是舊的 Office 網頁檢視。",
  cliDetected: "偵測到 CLI",
  cliRequired: "需要 CLI",
  externalLocalProcess: "外部本地處理程序",
  prototypeHint:
    "目前原型透過 IPC 使用本地 CodeGraph CLI。不使用遠端 HTTP 通道，也不嵌入工作區網頁檢視。",
  runtime: "執行階段",
  refreshing: "重新整理中",
  refresh: "重新整理",
  version: "版本",
  command: "命令",
  checking: "檢查中...",
  notDetected: "未偵測到",
  installHint:
    "只有當 `codegraph` CLI 在機器 PATH 中可用時，Agent Desktop 才能驅動此介面。",
  installingCli: "安裝 CLI 中...",
  installCodeGraphCli: "安裝 CodeGraph CLI",
} as const;
