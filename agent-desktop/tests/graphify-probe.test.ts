import { describe, expect, it } from "vitest";
import { discoverGraphify } from "../src/main/graphify-probe";

/**
 * Graphify probe tests.
 *
 * The version probe (`runGraphifyVersion`) spawns the real `graphify`
 * binary and is not unit-tested here. The discovery function is tested
 * for shape correctness.
 */
describe("discoverGraphify", () => {
  it("returns a valid GraphifyDiscovery shape", () => {
    const result = discoverGraphify();
    expect(result).toHaveProperty("scannedAt");
    expect(result).toHaveProperty("installed");
    expect(result).toHaveProperty("detectedCommand");
    expect(result).toHaveProperty("resolvedPath");
    expect(typeof result.installed).toBe("boolean");
  });

  it("scannedAt is a valid ISO date string", () => {
    const result = discoverGraphify();
    expect(() => new Date(result.scannedAt).toISOString()).not.toThrow();
  });
});