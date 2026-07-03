export default {
  kicker: "Code intelligence surface",
  summary:
    "Index a local repository with CodeGraph, inspect real graph stats, and build context bundles for Hermes workflows without pretending this is the old Office webview.",
  cliDetected: "CLI detected",
  cliRequired: "CLI required",
  externalLocalProcess: "External local process",
  prototypeHint:
    "The current prototype uses the local CodeGraph CLI over IPC. It does not tunnel over remote HTTP and it does not embed a workspace webview.",
  runtime: "Runtime",
  refreshing: "Refreshing",
  refresh: "Refresh",
  version: "Version",
  command: "Command",
  checking: "Checking...",
  notDetected: "Not detected",
  installHint:
    "Agent Desktop can only drive this surface once the `codegraph` CLI is available on the machine path.",
  installingCli: "Installing CLI...",
  installCodeGraphCli: "Install CodeGraph CLI",
} as const;