export default {
  title: "網關",
  messagingGateway: "訊息網關",
  platforms: "平台",
  status: "狀態",
  running: "執行中",
  stopped: "已停止",
  gatewayHint: "將 Hermes 連線到 Telegram、Discord、Slack 等平台",
  kicker: "設定後的控制平面",
  heroSummary:
    "在 Hermes 中本地保存閘道憑證，僅啟用所需的平台橋接，並從一個桌面控制平面管理初始引導期間所呈現的同一組執行階段通道。",
  platformsHint:
    "初始引導會設定首個執行階段與模型。此畫面在之後保持閘道服務與平台交接的一致性。",
  supportedBridgesHint:
    "受支援的橋接在您主動啟用前保持停用。僅啟用此機器應暴露的供應商與訊息通道。",
  platformsEnabled: "{{enabled}}/{{total}} 個平台已啟用",
  imChannels: {
    title: "IM 管道",
    summary:
      "將智慧型代理人連接到企業 IM 平台。IM 客戶端的訊息會路由到活躍的執行階段；回覆會發送回對話中。",
  },
  group: {
    messaging: "即時通訊",
    eastern: "東方平台",
    async: "非同步管道",
    home: "智慧家庭",
  },
  runtimes: {
    title: "執行階段",
    summary:
      "與初始歡迎畫面一致的執行階段註冊表。每一列呈現執行階段在此機器上是否可用。",
    registryLabel: "執行階段註冊表",
    refreshAria: "重新掃描執行階段註冊表",
    empty: "尚未安裝任何執行階段。歡迎畫面會預設安裝 Hermes。",
    statusReady: "執行階段已就緒。",
    statusUnavailable: "執行階段在此機器上尚不可用。",
    detected: "已偵測",
    responded: "已回應",
    scanning: "掃描中…",
    localProbesLabel: "本機網關探測",
    localProbesRefreshAria: "探測本機網關通訊埠",
    localProbesEmpty: "本機網關的所有通訊埠目前都沒有回應。",
    discoveryHint: "此執行階段可從歡迎畫面呼叫的探索事件。",
  },
  container: {
    title: "容器探索",
    summary:
      "掃描 Docker Desktop 以便發現配對執行階段（IronClaw、OpenClaw 以及任何以 Docker 網關宣傳的提供商）。",    sharedHint: "與歡迎畫面共用同一註冊表。啟動或停止容器後請在此重新掃描。",    statusLabel: "Docker 掃描狀態",
    refreshAria: "重新掃描 Docker Desktop 執行階段",
    rescan: "重新掃描",
    empty: "未偵測到 Docker 執行階段。安裝 Docker Desktop 或啟動配對容器。",
    scannedAt: "上次掃描 {{value}}",
  },
} as const;
