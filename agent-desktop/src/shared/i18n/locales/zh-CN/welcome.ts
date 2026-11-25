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
  copyInstallCommand: "复制安装命令",
  dividerOr: "或",
  // V2.10.44 — install-lane shell labels. These are OS/shell
  // brand names conventionally kept untranslated in Chinese
  // documentation. We use the localized "shell" word for the
  // chip + bash chip stays as-is.
  installLaneWindowsShell: "Windows PowerShell",
  installLaneUnixShell: "WSL / macOS / Linux",
  connectRemote: "连接远程运行时",
  connectRemoteTitle: "连接远程运行时",
  connectRemoteSubtitle: "输入正在运行的 Cubecloud 兼容 API 服务器 URL。",
  // V2.10.44 — connect-remote-gateway 和 connect-ssh 面板的中文翻译
  connectRemotePanelTitle: "连接远程网关",
  connectRemoteSubtitleHermes:
    "当 Agent Desktop 需要挂接到正在运行的 {{runtime}} 网关而非本地安装时，使用已有的运行时 URL。",
  connectRemoteSubtitleOpenclaw:
    "挂接到正在运行的 {{runtime}} 兼容端点，而非本地安装。Agent Desktop 需要启用 OpenClaw 的 HTTP 兼容层。",
  // IronClaw 第三个远程通道。当前浏览器侧网关是已发布主机端口
  // 3231，操作面使用 /api/health。
  connectRemoteSubtitleIronclaw:
    "挂接到正在运行的 {{runtime}} WASM 沙箱容器网关，而非本地安装。请使用已发布的网关端口（默认 3231）和 /api/health 操作面。",
  // V2.10.61 — 改写以去掉“下方” Docker 切换的虚假承诺（该面
  // 板实际上没有在 Welcome.tsx 中渲染）。Docker Desktop 挂接面
  // 板是干净的 V2.10.62 候选；在此之前，通道选择器告诉用户真
  // 相（IronClaw 可以从远程面板挂接；Docker 挂接在路线图上）。
  lanePickerHint:
    "这些是直接网关通道。{{ironclaw}} 是容器运行时——在远程面板中选择它以挂接到已发布的端口。",
  connectSshPanelTitle: "通过 SSH 隧道接入远程网关",
  connectSshSubtitleHermes:
    "当 {{runtime}} 网关需要保持私有、仅通过 Agent Desktop 的隧道可达时，使用 SSH。",
  connectSshSubtitleOpenclaw:
    "当 {{runtime}} 兼容网关需要保持私有、仅通过 Agent Desktop 的隧道可达时，使用 SSH。",
  connectSshSubtitleIronclaw:
    "通过 SSH 转发现有的 {{runtime}} 网关，无需直接暴露已发布的容器端口。",
  runtimeLane: "运行时通道",
  sshHost: "SSH 主机",
  sshHostPlaceholder: "192.168.1.100 或 myserver.local",
  sshPort: "SSH 端口",
  sshPortPlaceholder: "22",
  sshUsername: "用户名",
  sshUsernamePlaceholder: "user",
  sshKeyPath: "私钥路径",
  sshKeyPathPlaceholder: "~/.ssh/id_rsa",
  sshKeyPathNote: "（可选 — 默认为 ~/.ssh/id_rsa）",
  sshRemotePort: "远程运行时端口",
  sshRemotePortNote: "（默认 {{port}}）",
  sshRuntimeOpenclawNote:
    "{{runtime}} 通常监听 {{port}} 端口，并需要启用 HTTP 兼容层后 Agent Desktop 才能挂接。",
  sshRuntimeHermesNote: "{{runtime}} SSH 接入通常监听 {{port}} 端口。",
  // IronClaw 的 SSH 通道说明。
  sshRuntimeIronclawNote:
    "{{runtime}} 通过 SSH 接入时通常监听 {{port}}，并要求转发后的网关暴露 /api/health 以及 OpenAI 兼容的 /v1 端点。",
  sshSecretIronclawNote: "（除非转发后的 IronClaw 网关强制要求 GATEWAY_AUTH_TOKEN，否则可选）",
  sshSecretOpenclawNote: "（启用 OpenClaw 鉴权时必填）",
  sshSecretHermesNote: "（除非远程 Hermes 网关强制鉴权，否则可选）",
  testingSshConnection: "正在测试 SSH 连接…",
  connectViaSsh: "通过 SSH 连接",
  sshSystemHint:
    "使用系统 SSH。请确保您已能在不输入密码的情况下运行 ssh {{user}}@{{host}}。",
  // 错误路径标题与按钮（Welcome 屏）
  errorLocalInstallHeader: "本地安装需要处理",
  errorSshHeader: "到 {{runtime}} 的 SSH 隧道需要处理",
  errorRemoteHeader: "到 {{runtime}} 的远程连接需要处理",
  retryLocalInstall: "重试本地安装",
  retrySshConnection: "重试 SSH 连接",
  retryRemoteConnection: "重试远程连接",
  reviewSshSettings: "查看 SSH 设置",
  reviewRemoteSettings: "查看远程设置",
  connectViaSshShort: "通过 SSH 连接",
  connectToRemoteGatewayShort: "连接远程网关",
  // 表单校验错误
  errorPleaseEnterUrl: "请输入 URL。",
  errorConnectionTestFailed: "连接测试失败。",
  errorHostAndUsernameRequired: "请填写主机和用户名。",
  errorHostAndUsernameRequiredNoPeriod: "请填写主机和用户名",
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
      "三个旋钮，轻微调整智能体的语气。改动仅应用于当前配置文件，可稍后在设置中再调。",
    varianceLabel: "Variance",
    varianceHint:
      "措辞表现力。0 = 平淡直白，100 = 比喻生动。",
    motionLabel: "Motion",
    motionHint:
      "回答结构化程度。0 = 连贯的短文，100 = 大量条列要点。",
    densityLabel: "Density",
    densityHint:
      "每段信息密度。0 = 疏松简短，100 = 紧凑密集。",
    reset: "恢复默认",
    saved: "Saved.",
  },
  detectedRuntimesTitle: "发现正在运行的智能体",
  detectedRuntimesHealthy:
    "选择一个正在运行的运行时立即连接。安装本地运行时是可选的。",
  detectedRuntimesAuth:
    "发现了一些需要密钥的运行时。选择一个以预填远程连接表单。",
  authRequiredHint:
    "这些运行时可以访问，但需要 API 服务端密钥或网关令牌才能让 Agent Desktop 连接。",
} as const;
