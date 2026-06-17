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
  // V2.10.61 — IronClaw 第三个远程通道。IronClaw 以 WASM 沙箱
  // 容器运行时形式分发，所以通道文案点名 /health 操作面，并
  // 指向容器默认端口。SSH 挂接不主动引导。
  connectRemoteSubtitleIronclaw:
    "挂接到正在运行的 {{runtime}} WASM 沙箱容器网关，而非本地安装。请使用已发布的容器端口（默认 8281）和 /health 操作面。",
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
  // V2.10.61 — IronClaw 的 SSH 通道说明。IronClaw 仅支持网
  // 关挂接（不支持 SSH 挂接），所以该字符串在 V2.10.61 中
  // 实际不会展示（通过 sshSupported=false 在 SSH 面板隐藏
  // 通道按钮），但仍提供键以避免 i18n 审计误报。
  sshRuntimeIronclawNote:
    "{{runtime}} 仅支持网关挂接，不支持 SSH 挂接。请使用远程面板与已发布的容器端口（默认 {{port}}）。",
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
