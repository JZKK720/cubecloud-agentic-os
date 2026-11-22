/**
 * DataFlow ManagedApp — capability honesty and the security warning.
 *
 * The adapter wraps a service the desktop does not own: DataFlow runs as a
 * container and exposes its MCP tools over legacy HTTP+SSE. Two properties
 * matter enough to pin:
 *
 *   1. It must never claim health it cannot verify. With no server listening,
 *      `health().ok` is false and the detail says why.
 *   2. When the endpoint DOES answer, the detail must carry the warning that
 *      DataFlow's MCP surface is unauthenticated and its tools execute
 *      pipeline code. That is a property of the tool, not a bug we can patch,
 *      so the operator has to see it where the card is.
 *
 * `lifecycle()` must be null — this is a fabric-attach adapter, and reporting a
 * start/stop it cannot honour is the exact dishonesty `contract.ts` warns
 * about.
 *
 * `probeMcpServer` and the config reader are both mocked; no socket opens.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const probeMock = vi.hoisted(() => vi.fn());
const readBlockMock = vi.hoisted(() => vi.fn());

vi.mock("../src/main/mcp-probe", () => ({ probeMcpServer: probeMock }));
vi.mock("../src/main/managed-apps/config-blocks", () => ({
  readAppBlock: readBlockMock,
  writeAppBlock: vi.fn(),
  MANAGED_APP_CONFIG_BLOCKS: [
    "workspace",
    "everos",
    "headroom",
    "openviking",
    "weknora",
    "dataflow",
  ],
}));

import {
  createDataFlowApp,
  DATAFLOW_DEFAULT_MCP_URL,
  DATAFLOW_SECURITY_WARNING,
  loadDataFlowConfig,
} from "../src/main/managed-apps/dataflow";
import { createManagedAppRegistry } from "../src/main/managed-apps/registry";

function probeResult(ok: boolean, tools: string[] | null, error: string | null = null) {
  return {
    ok,
    tools,
    detail: ok ? `${tools?.length ?? 0} tools` : "unreachable",
    error,
    scannedAt: "2026-11-22T00:00:00.000Z",
  };
}

describe("DataFlow managed app", () => {
  beforeEach(() => {
    probeMock.mockReset();
    readBlockMock.mockReset();
    readBlockMock.mockReturnValue(null);
  });

  it("is registered in the roster and pins as a fabric-attach app", () => {
    const registry = createManagedAppRegistry();
    const app = registry.find((a) => a.id === "dataflow");
    expect(app).toBeDefined();
    expect(app!.label).toBe("DataFlow");
    expect(app!.mode).toBe("fabric-attach");
  });

  it("degrades honestly when nothing is listening", async () => {
    probeMock.mockResolvedValue(probeResult(false, null, "connect ECONNREFUSED"));
    const app = createDataFlowApp();

    const discovery = await app.discover();
    expect(discovery.state).toBe("not-found");
    // The failure reason reaches the operator rather than being swallowed.
    expect(discovery.detail).toContain("ECONNREFUSED");
    // And the warning is NOT shown for a server that is not there — telling
    // someone an app they have not installed is dangerous is noise.
    expect(discovery.detail).not.toContain(DATAFLOW_SECURITY_WARNING);

    const health = await app.health();
    expect(health.ok).toBe(false);
    expect(health.capabilities).not.toContain("lifecycle");
  });

  it("reports found and carries the security warning when it answers", async () => {
    const tools = Array.from({ length: 20 }, (_, i) => `tool_${i}`);
    probeMock.mockResolvedValue(probeResult(true, tools));
    const app = createDataFlowApp();

    const discovery = await app.discover();
    expect(discovery.state).toBe("found");
    expect(discovery.detail).toContain(DATAFLOW_SECURITY_WARNING);

    const health = await app.health();
    expect(health.ok).toBe(true);
    // The documented count reaches the card, from the probe rather than a
    // hard-coded 20.
    expect(health.detail).toContain("20 tools");
    expect(health.detail).toContain(DATAFLOW_SECURITY_WARNING);
    // Capability-honest: attach only, never lifecycle.
    expect(health.capabilities).toEqual(["inventory", "config"]);
  });

  it("mirrors the advertised tools through inventory", async () => {
    probeMock.mockResolvedValue(probeResult(true, ["list_pipelines", "execute_pipeline"]));
    const app = createDataFlowApp();

    const inventory = await app.inventory();
    expect(inventory.ok).toBe(true);
    expect(inventory.data).toEqual({
      baseUrl: DATAFLOW_DEFAULT_MCP_URL,
      tools: ["list_pipelines", "execute_pipeline"],
    });
    expect(inventory.error).toBeNull();
  });

  it("has no lifecycle it cannot honour", () => {
    const app = createDataFlowApp();
    expect(app.lifecycle()).toBeNull();
    expect(app.governance()).toBeNull();
  });

  it("owns exactly one config block and exposes its endpoint", () => {
    const app = createDataFlowApp();
    const schema = app.configSchema();
    expect(schema).not.toBeNull();
    expect(schema!.block).toBe("dataflow");
    expect(schema!.fields.map((f) => f.key)).toEqual(["baseUrl"]);
  });

  it("falls back to the default endpoint when the block is empty", () => {
    readBlockMock.mockReturnValue({ baseUrl: "   " });
    expect(loadDataFlowConfig().baseUrl).toBe(DATAFLOW_DEFAULT_MCP_URL);

    readBlockMock.mockReturnValue({ baseUrl: "http://10.0.0.5:8000/mcp" });
    expect(loadDataFlowConfig().baseUrl).toBe("http://10.0.0.5:8000/mcp");
  });
});
