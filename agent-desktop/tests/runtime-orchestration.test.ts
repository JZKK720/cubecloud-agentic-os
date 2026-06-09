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

    expect(hermes.onboardingSurface).toBe("welcome");
    expect(hermes.capabilities.canInstallLocally).toBe(true);
    expect(hermes.preferredTaskOrchestratorIds).toContain("hermes");

    expect(ironclaw.role).toBe("gateway-handoff");
    expect(ironclaw.capabilities.canDiscoverViaDocker).toBe(true);
    expect(ironclaw.preferredTaskOrchestratorIds).toEqual(["hermes", "ecc"]);

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
  });

  it("keeps ecc as an optional external orchestrator bridge", () => {
    const ecc = getTaskOrchestratorDefinition("ecc");
    const openclaw = getTaskOrchestratorDefinition("openclaw");

    expect(ecc.integrationMode).toBe("optional-bridge");
    expect(ecc.compatibleRuntimeProviderIds).toEqual([
      "hermes",
      "ironclaw",
      "openclaw",
    ]);
    expect(ecc.notes.join(" ")).toMatch(/optional external harness backend/i);

    expect(openclaw.integrationMode).toBe("optional-runtime");
    expect(openclaw.notes.join(" ")).toMatch(/do not|instead of reviving/i);
    expect(openclaw.notes.join(" ")).toMatch(/office|hq/i);
  });
});