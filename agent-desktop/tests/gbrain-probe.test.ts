import { describe, expect, it } from "vitest";
import { parseGbrainDoctorOutput } from "../src/main/gbrain-probe";

/**
 * GBrain health-probe tests.
 *
 * The I/O wrapper (`probeGbrain`) spawns the real `gbrain` binary
 * and is not unit-tested here (it requires gbrain on PATH). The pure
 * parser (`parseGbrainDoctorOutput`) is tested exhaustively below.
 */
describe("parseGbrainDoctorOutput", () => {
  it("parses a healthy doctor report (all checks pass)", () => {
    const stdout = JSON.stringify({
      version: "0.42.66.0",
      checks: [
        { id: "db", status: "pass" },
        { id: "embeddings", status: "pass" },
        { id: "graph", status: "pass" },
      ],
    });
    const result = parseGbrainDoctorOutput(stdout);
    expect(result.installed).toBe(true);
    expect(result.healthy).toBe(true);
    expect(result.version).toBe("0.42.66.0");
    expect(result.failingChecks).toBe(0);
    expect(result.totalChecks).toBe(3);
    expect(result.summary).toContain("0.42.66.0");
    expect(result.summary).toContain("3 checks passed");
  });

  it("parses a report with failing checks", () => {
    const stdout = JSON.stringify({
      version: "0.42.1.0",
      checks: [
        { id: "db", status: "pass" },
        { id: "embeddings", status: "fail", message: "no API key" },
        { id: "graph", status: "warn" },
      ],
    });
    const result = parseGbrainDoctorOutput(stdout);
    expect(result.installed).toBe(true);
    expect(result.healthy).toBe(false);
    expect(result.failingChecks).toBe(1);
    expect(result.totalChecks).toBe(3);
    expect(result.summary).toContain("1/3 checks failing");
  });

  it("handles empty output", () => {
    const result = parseGbrainDoctorOutput("");
    expect(result.installed).toBe(true);
    expect(result.healthy).toBe(false);
    expect(result.summary).toContain("empty output");
  });

  it("handles non-JSON output (version mismatch)", () => {
    const result = parseGbrainDoctorOutput("some plain text error");
    expect(result.installed).toBe(true);
    expect(result.healthy).toBe(false);
    expect(result.summary).toContain("non-JSON");
  });

  it("handles a report with no checks array", () => {
    const stdout = JSON.stringify({ version: "0.42.0.0" });
    const result = parseGbrainDoctorOutput(stdout);
    expect(result.installed).toBe(true);
    expect(result.healthy).toBe(false);
    expect(result.totalChecks).toBe(0);
    expect(result.failingChecks).toBe(0);
  });

  it("handles a report with no version field", () => {
    const stdout = JSON.stringify({
      checks: [{ id: "db", status: "pass" }],
    });
    const result = parseGbrainDoctorOutput(stdout);
    expect(result.installed).toBe(true);
    expect(result.healthy).toBe(true);
    expect(result.version).toBeNull();
    expect(result.totalChecks).toBe(1);
  });
});