import { describe, expect, it } from "vitest";
import {
  getRuntimeProviderDefinition,
  getTaskOrchestratorDefinition,
} from "../src/shared/runtime-orchestration";

describe("runtime orchestration contract", () => {
  it("maps current runtime providers to truthful onboarding surfaces", () => {
    const hermes = getRuntimeProviderDefinition("hermes");
    const ironclaw = getRuntimeProviderDefinition("ironclaw");
    const openclaw = getRuntimeProviderDefinition("openclaw");
    const raven = getRuntimeProviderDefinition("raven");

    expect(hermes.onboardingSurface).toBe("welcome");
    expect(hermes.capabilities.canInstallLocally).toBe(true);
    expect(hermes.preferredTaskOrchestratorIds).toContain("hermes");

    expect(ironclaw.role).toBe("gateway-handoff");
    expect(ironclaw.capabilities.canDiscoverViaDocker).toBe(true);
    expect(ironclaw.capabilities.canAttachViaSshTunnel).toBe(true);
    expect(ironclaw.connectionModes).toContain("ssh-tunnel");
    expect(ironclaw.preferredTaskOrchestratorIds).toEqual(["hermes"]);

    expect(openclaw.onboardingSurface).toBe("setup");
    expect(openclaw.role).toBe("gateway-handoff");
    expect(openclaw.capabilities.canInstallLocally).toBe(true);
    expect(openclaw.capabilities.canAttachToExistingLocalGateway).toBe(true);
    expect(openclaw.capabilities.canAttachToRemoteGateway).toBe(true);
    expect(openclaw.capabilities.canAttachViaSshTunnel).toBe(true);
    expect(openclaw.capabilities.canImportExistingState).toBe(true);
    expect(openclaw.capabilities.canDiscoverLocalCli).toBe(true);
    expect(openclaw.capabilities.exposesChatGateway).toBe(true);
    expect(openclaw.connectionModes).toContain("ssh-tunnel");
    expect(openclaw.notes.join(" ")).toMatch(/onboard|wsl/i);
    expect(openclaw.notes.join(" ")).toMatch(/attach|gateway|ssh/i);

    expect(raven.onboardingSurface).toBe("setup");
    expect(raven.role).toBe("primary-runtime");
    expect(raven.integrationStatus).toBe("planned");
    expect(raven.capabilities.canInstallLocally).toBe(true);
    expect(raven.capabilities.exposesChatGateway).toBe(true);
    expect(raven.notes.join(" ")).toMatch(/EverMind|EverOS/i);
  });

  it("has Hermes and OpenClaw task orchestrators (ECC removed)", () => {
    const hermes = getTaskOrchestratorDefinition("hermes");
    const openclaw = getTaskOrchestratorDefinition("openclaw");

    expect(hermes.displayName).toBe("Hermes Task Dispatch");
    expect(hermes.integrationMode).toBe("native-core");
    expect(hermes.compatibleRuntimeProviderIds).toEqual([
      "hermes",
      "ironclaw",
    ]);

    expect(openclaw.integrationMode).toBe("optional-runtime");
    expect(openclaw.notes.join(" ")).toMatch(/do not|instead of reviving/i);
    expect(openclaw.notes.join(" ")).toMatch(/office|hq/i);
  });
});