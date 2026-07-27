export default {
  flowTitle: "Set up your gateway",
  subtitle: "Private, powerful AI that runs on your machine.",
  flowStepInstall: "Install",
  flowStepConnect: "Connect",
  flowStepDone: "Start",
  installLocalRuntime: "Install local runtime",
  existingGatewayNote: "A live gateway was detected — install is optional.",
  installSizeHint: "Installs required components (~2 GB).",
  addOnRuntimesNote: "Ollama, LM Studio, vLLM, and more are configured in the next step.",
  dockerScanCopy:
    "For an existing {{runtimes}} gateway container. Continue with the default local install below if none of them are already running.",
  dockerScanning: "Scanning Docker Desktop for {{runtime}} gateway containers...",
  dockerEmpty:
    "No paired runtime gateway ({{runtimes}}) was ready to connect. Start the container, publish its local port, then rescan.",
  localGatewayCopy:
    "If a localhost gateway is already running, Agent Desktop can use it directly. This probe also checks the default OpenClaw loopback port.",
  localGatewayEmpty:
    "No live localhost gateway responded on {{ports}}. Install the local {{runtime}} only if no other gateway is reachable.",
  installIssueTitle: "Installation Issue",
  getStarted: "Get Started",
  retryInstall: "Retry Installation",
  terminalTitle:
    "Or install the {{runtime}} in one command:",
  terminalInstallHint: "Install via terminal, then come back:",
  recheck: "I've installed it — check again",
  switchToLocal: "Switch to local mode",
  copyInstallCommand: "Copy install command",
  dividerOr: "or",
  // V2.10.44 — install-lane shell labels. Kept as brand-style
  // English even in zh-CN locale because the OS / shell names
  // are conventionally untranslated ("PowerShell" stays
  // "PowerShell" in Chinese documentation).
  installLaneWindowsShell: "Windows PowerShell",
  installLaneUnixShell: "WSL / macOS / Linux",
  connectRemote: "Connect to Remote Runtime",
  connectRemoteTitle: "Connect to Remote Runtime",
  connectRemoteSubtitle:
    "Enter the URL of a running Cubecloud-compatible API server.",
  // V2.10.44 — used by the connect-remote-gateway and connect-ssh
  // panels in Welcome.tsx. The dynamic interpolation inserts the
  // localized runtime display name (e.g. "Hermes Agent" / "OpenClaw").
  connectRemotePanelTitle: "Connect to remote gateway",
  connectRemoteSubtitleHermes:
    "Use an existing runtime URL when Agent Desktop should attach to a running {{runtime}} gateway instead of installing locally.",
  connectRemoteSubtitleOpenclaw:
    "Attach to a running {{runtime}} compatibility endpoint instead of installing locally. Agent Desktop expects the OpenClaw HTTP compatibility surface to be enabled.",
  // IronClaw third remote lane. The live browser-facing gateway is
  // the published host port 3231 with /api/health as the operator
  // surface.
  connectRemoteSubtitleIronclaw:
    "Attach to a running {{runtime}} WASM-sandbox container gateway instead of installing locally. Use the published gateway port (default 3231) and the operator-facing /api/health surface.",
  // V2.10.77 — SSH panel title + subtitles (were missing, causing
  // raw i18n keys to display in the UI).
  connectSshPanelTitle: "Connect via SSH",
  connectSshSubtitleHermes:
    "Forward an existing {{runtime}} gateway over SSH without exposing the published port directly.",
  connectSshSubtitleOpenclaw:
    "Forward an existing {{runtime}} gateway over SSH. HTTP compatibility must be enabled on the remote gateway.",
  connectSshSubtitleIronclaw:
    "Forward an existing {{runtime}} gateway over SSH without exposing the published container port directly.",
  // V2.10.61 — rewritten to drop the false-promise "below" Docker
  // handoff reference (the panel was not actually rendered in
  // Welcome.tsx). The Docker Desktop attach panel is a clean
  // V2.10.62 candidate; until then, the lane picker tells the
  // user the truth (IronClaw is attachable from the remote
  // panel; the Docker handoff is on the roadmap).
  lanePickerHint:
    "These are direct gateway lanes. {{ironclaw}} ships as a container runtime — pick it from the remote panel to attach to the published port.",
  runtimeLane: "Runtime lane",
  sshHost: "SSH Host",
  sshHostPlaceholder: "192.168.1.100 or myserver.local",
  sshPort: "SSH Port",
  sshPortPlaceholder: "22",
  sshUsername: "Username",
  sshUsernamePlaceholder: "user",
  sshKeyPath: "Private Key Path",
  sshKeyPathPlaceholder: "~/.ssh/id_rsa",
  sshKeyPathNote: "(optional — defaults to ~/.ssh/id_rsa)",
  sshRemotePort: "Remote Runtime Port",
  sshRemotePortNote: "(default {{port}})",
  sshRuntimeOpenclawNote:
    "{{runtime}} usually listens on {{port}} and requires its HTTP compatibility surface to be enabled before Agent Desktop can attach.",
  sshRuntimeHermesNote:
    "{{runtime}} usually listens on {{port}} for SSH attach.",
  // IronClaw note for the SSH lane.
  sshRuntimeIronclawNote:
    "{{runtime}} usually listens on {{port}} for SSH attach and expects the forwarded gateway to expose /api/health plus the OpenAI-compatible /v1 endpoints.",
  sshSecretIronclawNote:
    "(optional unless the forwarded IronClaw gateway enforces GATEWAY_AUTH_TOKEN)",
  sshSecretOpenclawNote: "(required when OpenClaw auth is enabled)",
  sshSecretHermesNote: "(optional unless the remote Hermes gateway enforces auth)",
  testingSshConnection: "Testing SSH connection…",
  connectViaSsh: "Connect via SSH",
  sshSystemHint:
    "Uses your system SSH. Make sure you can already run ssh {{user}}@{{host}} without a password prompt.",
  // Error-path headers + buttons on the Welcome screen
  errorLocalInstallHeader: "Local install needs attention",
  errorSshHeader: "SSH tunnel to {{runtime}} needs attention",
  errorRemoteHeader: "Remote {{runtime}} connection needs attention",
  retryLocalInstall: "Retry local install",
  retrySshConnection: "Retry SSH connection",
  retryRemoteConnection: "Retry remote connection",
  reviewSshSettings: "Review SSH settings",
  reviewRemoteSettings: "Review remote settings",
  connectViaSshShort: "Connect via SSH",
  connectToRemoteGatewayShort: "Connect to remote gateway",
  // Form validation errors raised by the connect handlers
  errorPleaseEnterUrl: "Please enter a URL.",
  errorConnectionTestFailed: "Connection test failed.",
  errorHostAndUsernameRequired: "Host and username are required.",
  // Original "Please enter a URL." had a trailing period; this is the
  // SSH variant used by Settings.tsx.
  errorHostAndUsernameRequiredNoPeriod: "Host and username are required",
  remoteServerUrl: "Server URL",
  remoteApiKey: "API Key (optional)",
  remoteApiKeyPlaceholder: "Bearer token (API_SERVER_KEY)",
  testingConnection: "Testing",
  connect: "Connect",
  remoteHint:
    "Leave the key empty if the server accepts unauthenticated requests (e.g. via SSH tunnel to localhost).",
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
