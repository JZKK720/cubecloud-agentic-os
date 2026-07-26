import { describe, expect, it } from "vitest";
import {
  classifySkillScanExitCode,
  findInstalledSkillDir,
} from "../src/main/skills";

/**
 * SkillSpector hard-gate tests.
 *
 * The gate has two pure, unit-testable pieces:
 *   1. `classifySkillScanExitCode` — maps the scanner exit code to a
 *      safe/blocked verdict. Exit 0 = safe, 1 = do_not_install (block),
 *      2 = error (block).
 *   2. `findInstalledSkillDir` — resolves the on-disk directory of a
 *      freshly-installed skill by walking the profile skills tree.
 *
 * The I/O wrapper (`scanSkillWithSkillspector`) spawns the real
 * `skillspector` binary and is not unit-tested here —it is covered by
 * the ENOENT-skip path in production code and by integration smokes.
 */
describe("classifySkillScanExitCode", () => {
  it("exit 0 = safe (pass)", () => {
    const result = classifySkillScanExitCode(
      0,
      "Scanning...\nrisk_score: 5\nverdict: safe_to_install",
      "",
    );
    expect(result.safe).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.summary).toContain("safe_to_install");
  });

  it("exit 1 = do_not_install (hard block)", () => {
    const result = classifySkillScanExitCode(
      1,
      "Scanning...\nrisk_score: 92\nverdict: do_not_install",
      "",
    );
    expect(result.safe).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain("do_not_install");
  });

  it("exit 2 = error (block — investigate before retrying)", () => {
    const result = classifySkillScanExitCode(
      2,
      "Scanning...\nError: could not parse SKILL.md",
      "traceback...",
    );
    expect(result.safe).toBe(false);
    expect(result.exitCode).toBe(2);
    expect(result.summary).toContain("could not parse");
  });

  it("falls back to a default verdict message when stdout is empty", () => {
    const result = classifySkillScanExitCode(1, "", "");
    expect(result.safe).toBe(false);
    expect(result.summary).toContain("do_not_install");
  });

  it("falls back to a default error message for exit 2 with empty stdout", () => {
    const result = classifySkillScanExitCode(2, "", "");
    expect(result.safe).toBe(false);
    expect(result.summary).toContain("SkillSpector error");
    expect(result.summary).toContain("2");
  });

  it("keeps only the last 3 non-empty lines as the summary", () => {
    const stdout = [
      "line one",
      "line two",
      "line three",
      "line four",
      "line five",
    ].join("\n");
    const result = classifySkillScanExitCode(0, stdout, "");
    expect(result.summary).toBe("line three\nline four\nline five");
  });
});

describe("findInstalledSkillDir", () => {
  it("returns null when the skills directory does not exist", () => {
    // Use a profile name that won't exist on a dev machine.
    const result = findInstalledSkillDir(
      "nonexistent-skill",
      "nonexistent-profile-xyz",
    );
    expect(result).toBeNull();
  });
});