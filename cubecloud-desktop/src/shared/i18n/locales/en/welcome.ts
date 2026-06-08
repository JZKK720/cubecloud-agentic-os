export default {
  flowTitle: "Set up your gateway",
  subtitle: "Private, powerful AI that runs on your machine.",
  flowStepInstall: "Install",
  flowStepConnect: "Connect",
  flowStepDone: "Start",
  installLocalRuntime: "Install local runtime",
  existingGatewayNote: "A live gateway was detected — install is optional.",
  installSizeHint: "Installs required components (~2 GB).",
  lanePickerHint:
    "These are direct gateway lanes. {{ironclaw}} ships as a container runtime, not a direct gateway, so use the Docker Desktop handoff below to attach it.",
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
  connectRemote: "Connect to Remote Runtime",
  connectRemoteTitle: "Connect to Remote Runtime",
  connectRemoteSubtitle:
    "Enter the URL of a running Cubecloud-compatible API server.",
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
