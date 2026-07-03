export default {
  title: "Gateway",
  messagingGateway: "Messaging Gateway",
  platforms: "Platforms",
  status: "Status",
  running: "Running",
  stopped: "Stopped",
  gatewayHint:
    "Connects Hermes to Telegram, Discord, Slack, and other platforms",
  kicker: "Post-setup control plane",
  heroSummary:
    "Keep gateway credentials local in Hermes, enable only the platform bridges you need, and manage the same runtime lanes surfaced during onboarding from one desktop control plane.",
  platformsHint:
    "Onboarding sets the first runtime and model. This screen keeps the gateway service and platform handoffs aligned afterward.",
  supportedBridgesHint:
    "Supported bridges stay disabled until you opt in. Enable only the providers and messaging lanes this machine should expose.",
  platformsEnabled: "{{enabled}}/{{total}} platforms enabled",
  group: {
    messaging: "Messaging",
    eastern: "Eastern platforms",
    async: "Async channels",
    home: "Home automation",
  },
  runtimes: {
    title: "Runtimes",
    summary:
      "The same runtime registry surfaced during onboarding. Each row shows whether the runtime is healthy on this machine.",
    registryLabel: "Runtime registry",
    refreshAria: "Re-scan the runtime registry",
    empty: "No runtimes are installed yet. Onboarding will install Hermes by default.",
    statusReady: "Runtime is ready to host the gateway.",
    statusUnavailable: "Runtime is not yet available on this machine.",
    detected: "Detected",
    responded: "Responded",
    scanning: "Scanning…",
    localProbesLabel: "Local gateway probes",
    localProbesRefreshAria: "Probe localhost gateway ports",
    localProbesEmpty:
      "No localhost gateway responded. Use the Welcome screen to install or attach one.",
    discoveryHint: "This runtime ships a discovery surface you can call into from the Welcome screen.",
  },
  container: {
    title: "Container discovery",
    summary:
      "Scan Docker Desktop for paired runtimes (IronClaw, OpenClaw, and any provider advertising a Docker gateway).",
    sharedHint:
      "Same registry as the Welcome screen. Rescan here after starting or stopping a container.",
    statusLabel: "Docker scan status",
    refreshAria: "Re-scan Docker Desktop runtimes",
    rescan: "Rescan",
    empty: "No Docker runtimes were detected. Install Docker Desktop or start a paired container.",
    scannedAt: "last scan {{value}}",
  },
} as const;
