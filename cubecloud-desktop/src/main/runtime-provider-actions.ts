import { shell } from "electron";
import { discoverDockerRuntimes } from "./docker-runtimes";
import {
  launchOpenClawWslInstall,
  runClawMigrate,
  type InstallProgress,
} from "./installer";
import type {
  RuntimeProviderActionId,
  RuntimeProviderActionResult,
  RuntimeProviderId,
} from "../shared/runtime-orchestration";

const OPENCLAW_INSTALL_GUIDE_URL =
  "https://docs.openclaw.ai/start/getting-started";

type ProgressReporter = (progress: InstallProgress) => void;

export async function runRuntimeProviderAction(
  providerId: RuntimeProviderId,
  actionId: RuntimeProviderActionId,
  reportProgress?: ProgressReporter,
): Promise<RuntimeProviderActionResult> {
  switch (`${providerId}:${actionId}`) {
    case "hermes:scan-docker-gateways":
    case "ironclaw:scan-docker-gateways":
    case "openclaw:scan-docker-gateways": {
      // The same Docker ps output feeds every runtime provider.
      // `discoverDockerRuntimes` itself iterates all
      // `canDiscoverViaDocker` catalog entries, so the action stays a
      // single dispatch regardless of how many runtimes advertise
      // container discovery in the future.
      return {
        success: true,
        message: "Docker scan complete.",
        payload: await discoverDockerRuntimes(),
      };
    }
    case "openclaw:import-existing-state": {
      await runClawMigrate(reportProgress ?? (() => {}));
      return {
        success: true,
        message:
          "OpenClaw migration completed. Continue with provider setup below.",
      };
    }
    case "openclaw:install-via-wsl": {
      const result = await launchOpenClawWslInstall(reportProgress ?? (() => {}));
      return {
        success: true,
        message: result.message,
      };
    }
    case "openclaw:open-install-guide": {
      await shell.openExternal(OPENCLAW_INSTALL_GUIDE_URL);
      return {
        success: true,
        message:
          "Opened the OpenClaw install guide. OpenClaw installs through npm, pnpm, or bun, and upstream recommends WSL2 on Windows.",
      };
    }
    default:
      return {
        success: false,
        error: `Unsupported runtime provider action: ${providerId}/${actionId}`,
      };
  }
}