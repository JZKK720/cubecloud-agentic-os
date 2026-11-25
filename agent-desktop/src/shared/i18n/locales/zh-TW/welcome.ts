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
  // V2.10.44 — install-lane shell labels. 與 en/ 相同，作業系統與
  // shell 名稱依慣例不翻譯。
  installLaneWindowsShell: "Windows PowerShell",
  installLaneUnixShell: "WSL / macOS / Linux",
  // V2.10.44 — 連線遠端閘道與 SSH 面板使用。插值會帶入本地化的
  // 執行環境顯示名稱（例如「Hermes Agent」／「OpenClaw」）。
  connectRemotePanelTitle: "連線到遠端閘道",
  connectRemoteSubtitleHermes:
    "當 Agent Desktop 應附加到執行中的 {{runtime}} 閘道而非本機安裝時，請使用現有的執行環境 URL。",
  connectRemoteSubtitleOpenclaw:
    "附加到執行中的 {{runtime}} 相容端點，而非本機安裝。Agent Desktop 預期已啟用 OpenClaw HTTP 相容層。",
  connectRemoteSubtitleIronclaw:
    "附加到執行中的 {{runtime}} WASM 沙箱容器閘道，而非本機安裝。請使用已發佈的閘道連接埠（預設 3231）與面向操作員的 /api/health 介面。",
  runtimeLane: "執行環境通道",
  sshHost: "SSH 主機",
  sshHostPlaceholder: "192.168.1.100 或 myserver.local",
  sshPort: "SSH 連接埠",
  sshPortPlaceholder: "22",
  sshUsername: "使用者名稱",
  sshUsernamePlaceholder: "user",
  sshKeyPath: "私鑰路徑",
  sshKeyPathPlaceholder: "~/.ssh/id_rsa",
  sshKeyPathNote: "(選填 — 預設為 ~/.ssh/id_rsa)",
  sshRemotePort: "遠端執行環境連接埠",
  sshRemotePortNote: "(預設 {{port}})",
  sshRuntimeOpenclawNote:
    "{{runtime}} 通常監聽 {{port}} 埠，且必須先啟用其 HTTP 相容層，Agent Desktop 才能附加。",
  sshRuntimeHermesNote:
    "{{runtime}} 通常監聽 {{port}} 埠以供 SSH 附加。",
  sshRuntimeIronclawNote:
    "{{runtime}} 通常監聽 {{port}} 埠以供 SSH 附加，並預期轉發的閘道會提供 /api/health 以及 OpenAI 相容的 /v1 端點。",
  sshSecretIronclawNote:
    "(僅在轉發的 IronClaw 閘道強制 GATEWAY_AUTH_TOKEN 時才需要)",
  sshSecretOpenclawNote: "(啟用 OpenClaw 驗證時必填)",
  sshSecretHermesNote: "(僅在遠端 Hermes 閘道強制驗證時才需要)",
  testingSshConnection: "正在測試 SSH 連線…",
  connectViaSsh: "透過 SSH 連線",
  sshSystemHint:
    "使用系統的 SSH。請確認你已能在無密碼提示的情況下執行 ssh {{user}}@{{host}}。",
  errorLocalInstallHeader: "本機安裝需要處理",
  errorSshHeader: "SSH 通道到 {{runtime}} 需要處理",
  errorRemoteHeader: "遠端 {{runtime}} 連線需要處理",
  retryLocalInstall: "重試本機安裝",
  retrySshConnection: "重試 SSH 連線",
  retryRemoteConnection: "重試遠端連線",
  reviewSshSettings: "檢查 SSH 設定",
  reviewRemoteSettings: "檢查遠端設定",
  connectViaSshShort: "透過 SSH 連線",
  connectToRemoteGatewayShort: "連線到遠端閘道",
  errorPleaseEnterUrl: "請輸入 URL。",
  errorConnectionTestFailed: "連線測試失敗。",
  errorHostAndUsernameRequired: "主機與使用者名稱為必填。",
  errorHostAndUsernameRequiredNoPeriod: "主機與使用者名稱為必填",
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
      "三個旋鈕，微調智能體的語氣。變更僅套用於此設定檔，可稍後在設定中再調整。",
    varianceLabel: "Variance",
    varianceHint:
      "措辭的表現力。0 = 平淡直述，100 = 比喻生動。",
    motionLabel: "Motion",
    motionHint:
      "回應的結構化程度。0 = 流暢的散文，100 = 大量列點清單。",
    densityLabel: "Density",
    densityHint:
      "每段資訊密度。0 = 寬鬆簡短，100 = 緊湊密集。",
    reset: "重設為預設值",
    saved: "已儲存。",
  },
  detectedRuntimesTitle: "我們偵測到正在執行的代理",
  detectedRuntimesHealthy:
    "選擇一個正在執行的執行環境即可立即連線。安裝本機執行環境為選用。",
  detectedRuntimesAuth:
    "我們找到需要金鑰的執行環境。選擇一個以預填遠端連線表單。",
  authRequiredHint:
    "這些執行環境可連線，但在 Agent Desktop 附加之前需要 API 伺服器金鑰或閘道 token。",
  // V2.10.77 — SSH 面板標題與副標題
  connectSshPanelTitle: "透過 SSH 連線",
  connectSshSubtitleHermes:
    "透過 SSH 轉發現有的 {{runtime}} 閘道，無需直接公開已發佈的連接埠。",
  connectSshSubtitleOpenclaw:
    "透過 SSH 轉發現有的 {{runtime}} 閘道。遠端閘道必須啟用 HTTP 相容性。",
  connectSshSubtitleIronclaw:
    "透過 SSH 轉發現有的 {{runtime}} 閘道，無需直接公開已發佈的容器連接埠。",
} as const;
