import { describe, expect, it } from "vitest";
import {
  GATEWAY_RUNTIME_PRESETS,
  applyGatewayRuntimePresetToRemoteUrl,
  coerceGatewayRuntimePreset,
  inferGatewayRuntimePreset,
  resolveGatewayRuntimePreset,
  type GatewayRuntimePresetId,
} from "../src/shared/gateway-runtime-presets";
import { IRONCLAW_DEFAULT_PORT, OPENCLAW_LOCAL_GATEWAY_PORT } from "../src/shared/runtime-defaults";

// V2.10.61 — IronClaw lands as a third GatewayRuntimePreset. The
// preset is gateway-only (sshSupported=false) and the inference
// rule must resolve both the explicit 8281 port and the /health
// path surface. These tests pin both the union widening and the
// inference behaviour so a future change to the preset entry
// cannot regress the IronClaw first-class treatment.
describe("gateway runtime preset contract", () => {
  it("widens the union to include ironclaw", () => {
    const ids: GatewayRuntimePresetId[] = [
      "hermes",
      "openclaw",
      "ironclaw",
    ];
    for (const id of ids) {
      expect(coerceGatewayRuntimePreset(id)).toBe(id);
    }
    // Defensive: any other string is rejected, not silently
    // collapsed to hermes. This protects persisted profiles
    // that reference a removed preset id.
    expect(coerceGatewayRuntimePreset("bogus")).toBeNull();
    expect(coerceGatewayRuntimePreset(null)).toBeNull();
  });

  it("marks ironclaw as ssh-unsupported", () => {
    expect(GATEWAY_RUNTIME_PRESETS.ironclaw.sshSupported).toBe(false);
    expect(GATEWAY_RUNTIME_PRESETS.hermes.sshSupported).toBe(true);
    expect(GATEWAY_RUNTIME_PRESETS.openclaw.sshSupported).toBe(true);
  });

  it("infers ironclaw from the WASM-sandbox container port (8281)", () => {
    expect(
      inferGatewayRuntimePreset({
        remoteUrl: `http://192.168.1.100:${IRONCLAW_DEFAULT_PORT}/health`,
      }),
    ).toBe("ironclaw");
    expect(
      inferGatewayRuntimePreset({ sshRemotePort: IRONCLAW_DEFAULT_PORT }),
    ).toBe("ironclaw");
  });

  it("infers ironclaw from the /health path on non-default ports", () => {
    expect(
      inferGatewayRuntimePreset({
        remoteUrl: "http://gpu-host.lan:11435/health",
      }),
    ).toBe("ironclaw");
  });

  it("does not confuse ironclaw with openclaw", () => {
    expect(
      inferGatewayRuntimePreset({
        remoteUrl: `http://192.168.1.100:${OPENCLAW_LOCAL_GATEWAY_PORT}/v1`,
      }),
    ).toBe("openclaw");
    expect(
      inferGatewayRuntimePreset({ sshRemotePort: OPENCLAW_LOCAL_GATEWAY_PORT }),
    ).toBe("openclaw");
  });

  it("falls back to hermes when the URL is empty or unparseable", () => {
    expect(inferGatewayRuntimePreset({ remoteUrl: "" })).toBe("hermes");
    expect(inferGatewayRuntimePreset({ remoteUrl: "not a url" })).toBe(
      "hermes",
    );
  });

  it("respects a stored preset id before re-inferring", () => {
    expect(
      resolveGatewayRuntimePreset({
        storedPreset: "ironclaw",
        remoteUrl: "http://gpu-host.lan:11435/v1",
      }),
    ).toBe("ironclaw");
  });

  it("normalises a bare URL to /health when ironclaw is selected", () => {
    // applyGatewayRuntimePresetToRemoteUrl snaps the port to the
    // preset default (8281) and appends /health on a bare path.
    // This matches the openclaw snap-to-:18789 behaviour and
    // mirrors the existing applyGatewayRuntimePresetToRemoteUrl
    // contract: switching lanes re-anchors the URL to the new
    // preset's surface, the user can then edit the port back.
    expect(
      applyGatewayRuntimePresetToRemoteUrl("http://gpu-host:9000", "ironclaw"),
    ).toBe(`http://gpu-host:${IRONCLAW_DEFAULT_PORT}/health`);
    expect(
      applyGatewayRuntimePresetToRemoteUrl("http://gpu-host:9000/", "ironclaw"),
    ).toBe(`http://gpu-host:${IRONCLAW_DEFAULT_PORT}/health`);
  });

  it("exposes the ironclaw preset entry to callers", () => {
    expect(GATEWAY_RUNTIME_PRESETS.ironclaw.id).toBe("ironclaw");
    expect(GATEWAY_RUNTIME_PRESETS.ironclaw.displayName).toBe("IronClaw");
    expect(GATEWAY_RUNTIME_PRESETS.ironclaw.sshRemotePort).toBe(
      IRONCLAW_DEFAULT_PORT,
    );
    // The remoteExampleUrl must include /health so the form
    // placeholder mirrors the documented IronClaw operator
    // surface from PLATFORM_RUNTIME_PROVIDERS.ironclaw.
    expect(GATEWAY_RUNTIME_PRESETS.ironclaw.remoteExampleUrl).toMatch(
      /\/health$/,
    );
  });
});
