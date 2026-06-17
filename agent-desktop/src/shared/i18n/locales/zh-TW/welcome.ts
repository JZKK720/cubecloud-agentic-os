export default {
  flowTitle: "設定你的閘道",
  subtitle: "你的自我進化 AI 助理，在本機執行，兼顧隱私、能力與持續學習。",
  installIssueTitle: "安裝問題",
  installLocalRuntime: "安裝本機執行階段",
  getStarted: "開始使用",
  retryInstall: "重新安裝",
  terminalTitle: "或透過一條指令安裝 {{runtime}}：",
  terminalInstallHint: "也可以先透過終端機安裝，然後再回來：",
  recheck: "我已完成安裝，重新檢查",
  switchToLocal: "切換到本機模式",
  installSizeHint: "這將安裝所需元件（約 2 GB）",
  lanePickerHint:
    // V2.10.61 — rewritten to drop the false-promise "下方"
    // Docker handoff reference (the panel is not rendered in
    // Welcome.tsx). The Docker Desktop attach panel is a clean
    // V2.10.62 candidate; until then, the lane picker points
    // users at the remote panel as the truthful IronClaw path.
    "這些是直接閘道通道。{{ironclaw}} 是容器執行階段——請從遠端面板選擇它以連接到已發佈的埠。",
  copyInstallCommand: "複製安裝命令",
  dividerOr: "或",
  connectRemote: "連線到遠端執行環境",
  connectRemoteTitle: "連線到遠端執行環境",
  connectRemoteSubtitle: "輸入正在執行的 Cubecloud 相容 API 伺服器 URL。",
  remoteServerUrl: "伺服器 URL",
  remoteApiKey: "API 金鑰（選填）",
  remoteApiKeyPlaceholder: "Bearer token (API_SERVER_KEY)",
  testingConnection: "測試連線中...",
  connect: "連線",
  remoteHint:
    "如果伺服器接受未驗證的請求（如透過 SSH 隧道到 localhost），請留空金鑰。",
  flowStepInstall: "安裝",
  flowStepConnect: "連線",
  flowStepDone: "開始",
  existingGatewayNote: "偵測到執行中的閘道 — 安裝為選用。",
  addOnRuntimesNote: "Ollama、LM Studio、vLLM 等在下一步設定。",
  dockerScanCopy:
    "用於已存在的 {{runtimes}} 容器閘道。如果都未執行，請繼續下方的預設本機安裝。",
  dockerScanning: "正在掃描 Docker Desktop 中的 {{runtime}} 閘道容器…",
  dockerEmpty:
    "沒有可連線的 {{runtimes}} 容器閘道。請啟動容器並發佈本機連接埠後重新掃描。",
  localGatewayCopy: "若 localhost 上已有執行中的閘道，Agent Desktop 可直接使用。同時也會探測預設的 OpenClaw 回環連接埠。",
  localGatewayEmpty: "在 {{ports}} 上沒有回應的本機閘道。若無其他可達的閘道，請安裝本機 {{runtime}}。",
  designDials: {
    title: "Design Dials",
    subtitle:
      "Three knobs that nudge the agent's tone. Changes apply to this profile only and can be tuned later from Settings.",
    varianceLabel: "Variance",
    varianceHint:
      "How expressive the phrasing is. 0 = dry and literal, 100 = metaphorical and colorful.",
    motionLabel: "Motion",
    motionHint:
      "How structured the response is. 0 = flowing essay, 100 = heavy bullet / step list.",
    densityLabel: "Density",
    densityHint:
      "How much information per paragraph. 0 = airy and short, 100 = tightly packed.",
    reset: "Reset to defaults",
    saved: "Saved.",
  },
} as const;
