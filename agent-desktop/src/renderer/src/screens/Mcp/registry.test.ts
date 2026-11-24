import { describe, expect, it } from "vitest";
import {
  BUNDLED_MCP_SERVERS,
  MCP_CATEGORIES,
  validateMcpDetail,
} from "./registry";

// The bundled registry is what an operator sees when they open the MCP
// screen, so a malformed entry fails at the point of use rather than at
// build time. `validateMcpDetail` is what the add form applies, so every
// bundled entry must satisfy it — otherwise a one-click install can hand
// the runtime a detail string the form itself would have rejected.
describe("bundled MCP registry", () => {
  it("uses unique names", () => {
    const seen = new Map<string, number>();
    for (const entry of BUNDLED_MCP_SERVERS) {
      seen.set(entry.name, (seen.get(entry.name) ?? 0) + 1);
    }
    expect([...seen].filter(([, n]) => n > 1)).toEqual([]);
  });

  it("every remote entry's detail passes the same validation the add form uses", () => {
    // stdio entries are deliberately exempt: the registry bundles custom
    // binaries (officecli, loop-engineering, graphify, browser-use) that the
    // add form rejects for lacking a known runtime prefix, because a bundled
    // entry already names its own binary. Remote entries have no such
    // exemption, so they must satisfy the form's rule.
    const rejected = BUNDLED_MCP_SERVERS.filter(
      (entry) => entry.transport !== "stdio",
    )
      .map((entry) => ({
        entry,
        reason: validateMcpDetail(entry.transport, entry.detail),
      }))
      .filter(({ reason }) => reason !== null)
      .map(({ entry, reason }) => `${entry.name} (${entry.transport}): ${reason}`);

    expect(rejected).toEqual([]);
  });

  it("http entries point at an https or loopback mcp endpoint", () => {
    const bad = BUNDLED_MCP_SERVERS.filter((entry) => entry.transport === "http")
      .filter((entry) => {
        const match = /^(https?):\/\/([^/]+)/i.exec(entry.detail);
        if (!match) return true;
        const [, scheme, host] = match;
        const loopback = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i.test(host);
        return !(scheme.toLowerCase() === "https" || loopback);
      })
      .map((entry) => `${entry.name}: ${entry.detail}`);

    expect(bad).toEqual([]);
  });

  it("every entry uses a declared category", () => {
    const bad = BUNDLED_MCP_SERVERS.filter(
      (entry) => !MCP_CATEGORIES.includes(entry.category),
    ).map((entry) => `${entry.name}: ${entry.category}`);

    expect(bad).toEqual([]);
  });

  it("includes Astryx as a third-party http hook", () => {
    // Astryx is adopted as an external MCP endpoint rather than vendored.
    // Pinning it stops a future cleanup from quietly dropping the only
    // design-system surface on the MCP screen.
    const astryx = BUNDLED_MCP_SERVERS.find((entry) => entry.name === "astryx");
    expect(astryx).toBeDefined();
    expect(astryx?.transport).toBe("http");
    expect(astryx?.detail).toBe("https://astryx.atmeta.com/mcp");
  });
});
