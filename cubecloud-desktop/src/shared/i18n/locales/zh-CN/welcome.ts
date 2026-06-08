export default {
  flowTitle: "设置你的网关",
  subtitle: "你的自进化 AI 助手，运行在本机，兼顾隐私、能力与持续学习。",
  installIssueTitle: "安装问题",
  installLocalRuntime: "安装本地运行时",
  getStarted: "开始使用",
  retryInstall: "重新安装",
  terminalTitle: "或使用一条命令安装 {{runtime}}：",
  terminalInstallHint: "也可以先通过终端安装，然后再回来：",
  recheck: "我已安装完成，重新检查",
  switchToLocal: "切换到本地模式",
  installSizeHint: "这将安装所需组件（约 2 GB）",
  lanePickerHint:
    "这些是直接网关通道。{{ironclaw}} 是容器运行时而非直接网关，请使用下方的 Docker Desktop 切换来挂接。",
  copyInstallCommand: "复制安装命令",
  dividerOr: "或",
  connectRemote: "连接远程运行时",
  connectRemoteTitle: "连接远程运行时",
  connectRemoteSubtitle: "输入正在运行的 Cubecloud 兼容 API 服务器 URL。",
  remoteServerUrl: "服务器 URL",
  remoteApiKey: "API 密钥（可选）",
  remoteApiKeyPlaceholder: "Bearer token (API_SERVER_KEY)",
  testingConnection: "测试连接中...",
  connect: "连接",
  remoteHint:
    "如果服务器接受未认证的请求（如通过 SSH 隧道到 localhost），请留空密钥。",
  flowStepInstall: "安装",
  flowStepConnect: "连接",
  flowStepDone: "开始",
  existingGatewayNote: "检测到正在运行的网关 — 安装是可选的。",
  addOnRuntimesNote: "Ollama、LM Studio、vLLM 等在下一步配置。",
  dockerScanCopy:
    "用于已存在的 {{runtimes}} 容器网关。如果都未运行，请继续下面的默认本地安装。",
  dockerScanning: "正在扫描 Docker Desktop 中的 {{runtime}} 网关容器…",
  dockerEmpty:
    "没有可连接的 {{runtimes}} 容器网关。请启动容器并发布本地端口后重新扫描。",
  localGatewayCopy: "如果 localhost 上已有运行中的网关，Agent Desktop 可直接使用。同时也会探测默认的 OpenClaw 回环端口。",
  localGatewayEmpty: "在 {{ports}} 上没有响应中的 localhost 网关。如果没有任何可达的网关，请安装本地 {{runtime}}。",
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
