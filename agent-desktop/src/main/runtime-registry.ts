import { getPublicConnectionConfig } from "./config";
import { resolveCommandOnPath } from "./agent-clis";
import { detectGatewayRuntime } from "./hermes";
import {
  checkInstallStatus,
  checkOpenClawExists,
  getEnhancedPath,
} from "./installer";
import {
  RUNTIME_PROVIDER_CATALOG,
  type RuntimeProviderSnapshot,
} from "../shared/runtime-orchestration";

export async function listRuntimeProviders(): Promise<
  RuntimeProviderSnapshot[]
> {
  const installStatus = checkInstallStatus();
  const openclaw = checkOpenClawExists();
  const openclawCommand = resolveCommandOnPath("openclaw", getEnhancedPath());
  const connection = getPublicConnectionConfig();
  const currentRemoteRuntime =
    connection.mode === "remote" && connection.remoteUrl
      ? await detectGatewayRuntime(connection.remoteUrl)
      : null;

  return RUNTIME_PROVIDER_CATALOG.map((definition) => {
    switch (definition.id) {
      case "hermes": {
        return {
          definition,
          status: installStatus.installed ? "ready" : "available",
          available: true,
          detected: installStatus.installed,
          detectedCount: installStatus.installed ? 1 : 0,
          detectedPath: null,
          detectedCommand: null,
          currentConnectionMode:
            connection.mode === "local" || currentRemoteRuntime === "hermes"
              ? connection.mode
              : null,
          actions: [],
          summary: installStatus.installed
            ? `${definition.displayName} is installed and remains the default Agent Desktop runtime.`
            : `${definition.displayName} is the default runtime and can be installed locally from onboarding.`,
          detail:
            connection.mode === "local"
              ? "Local runtime mode is active. Existing localhost, remote, and SSH attach flows remain available."
              : currentRemoteRuntime === "openclaw"
                ? "An OpenClaw gateway is currently attached, so Hermes stays available as the native local fallback runtime and orchestrator."
              : connection.mode === "ssh"
                ? "SSH tunnel mode is active. Hermes remains the native orchestrator even when the runtime is reached remotely."
                : "A remote gateway is active. Hermes local install remains available as the default fallback runtime.",
        } satisfies RuntimeProviderSnapshot;
      }
      case "ironclaw": {
        return {
          definition,
          status: "available",
          available: true,
          detected: false,
          detectedCount: 0,
          detectedPath: null,
          detectedCommand: null,
          currentConnectionMode: connection.mode === "remote" ? "remote" : null,
          actions: [
            {
              id: "scan-docker-gateways",
              kind: "scan",
              label: "Rescan",
              detail:
                "Scan Docker Desktop again for already-running IronClaw gateway containers.",
              primary: false,
            },
          ],
          summary:
            "Docker and remote gateway handoff are supported for an already-running IronClaw container or endpoint.",
          detail:
            "Use the dedicated Docker discovery flow in Welcome to attach to an existing IronClaw gateway. Agent Desktop does not install or host IronClaw itself.",
        } satisfies RuntimeProviderSnapshot;
      }
      case "openclaw": {
        const openclawConnected = currentRemoteRuntime === "openclaw";
        return {
          definition,
          status: openclawConnected || openclaw.found ? "ready" : "available",
          available: true,
          detected: openclawConnected || openclaw.found,
          detectedCount: openclawConnected || openclaw.found ? 1 : 0,
          detectedPath: openclaw.path,
          detectedCommand: openclawCommand,
          currentConnectionMode: openclawConnected ? connection.mode : null,
          actions: [
            ...(process.platform === "win32" && !openclaw.found
              ? [
                  {
                    id: "install-via-wsl",
                    kind: "install",
                    label: "Install OpenClaw in WSL",
                    detail:
                      "Open a WSL shell and hand off to the upstream OpenClaw npm install plus onboarding flow.",
                    primary: !openclawCommand,
                  } as const,
                ]
              : []),
            ...(openclaw.found
              ? [
                  {
                    id: "import-existing-state",
                    kind: "import",
                    label: "Import OpenClaw",
                    detail:
                      "Import the detected OpenClaw state into the current Hermes-first onboarding flow.",
                    primary: true,
                  } as const,
                ]
              : []),
            {
              id: "open-install-guide",
              kind: "docs",
              label: openclawCommand
                ? "Open OpenClaw onboarding guide"
                : "Install OpenClaw CLI",
              detail: openclawCommand
                ? "Open the upstream onboarding guide to finish daemon setup and workspace initialization."
                : "Open the upstream install guide. OpenClaw installs through npm, pnpm, or bun rather than Agent Desktop's bundled installer.",
              primary: process.platform !== "win32" && !openclaw.found,
            },
          ],
          summary: openclawConnected
            ? `${definition.displayName} is currently attached through its OpenAI-compatible gateway surface.`
            : openclaw.found
              ? `${definition.displayName} was detected and can be imported into the current Hermes-first onboarding flow.`
            : openclawCommand
              ? `${definition.displayName} CLI was detected on the current PATH, but its local workspace or daemon state has not been initialized for migration yet.`
              : `${definition.displayName} is optional and can be installed externally when you want its own CLI and daemon available on this machine.`,
          detail: openclawConnected
            ? "Agent Desktop is using OpenClaw's HTTP compatibility surface. Task orchestration remains optional until the wider OpenClaw-specific adapter layer is expanded."
            : openclawCommand
              ? "OpenClaw can attach through its HTTP compatibility surface when chat completions are enabled. On Windows, upstream recommends WSL2 for local OpenClaw onboarding."
            : "OpenClaw stays behind the guided install and migration/import lane until a separate runtime and task adapter exists. The retired Office or HQ surfaces are not coming back.",
        } satisfies RuntimeProviderSnapshot;
      }
      case "raven": {
        return {
          definition,
          status: "planned" as const,
          available: false,
          detected: false,
          detectedCount: 0,
          detectedPath: null,
          detectedCommand: null,
          currentConnectionMode: null,
          actions: [],
          summary:
            "Raven is EverMind's self-improving agent harness. The runtime slot is reserved as 'planned' until Raven's gateway API stabilizes.",
          detail:
            "Raven is pre-alpha (v0.1.x). The desktop already discovers the 'raven' binary on PATH via the AGENT_CLI_CATALOG. EverOS (already integrated as a Tier 2 support surface) is Raven's memory backend.",
        } satisfies RuntimeProviderSnapshot;
      }
    }
  });
}