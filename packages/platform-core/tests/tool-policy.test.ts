// P3: Command policy + security posture + tool ledger tests.
//
// CommandPolicy: regex-based command screening with allow/deny/require_approval.
// SecurityPosture: three-tier model (dangerous/auto/strict) with composition.
// ToolLedger: idempotent tool call caching for retry safety.

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  type CommandPolicy,
  type CommandDecision,
  createCommandPolicy,
  type SecurityPosture,
  type SecurityPostureLevel,
  composeSecurityPosture,
  type ToolLedger,
  createToolLedger,
  scannableCommand,
} from "../src/tool-policy";

// ── CommandPolicy tests ────────────────────────────────────

describe("CommandPolicy", () => {
  let policy: CommandPolicy;

  beforeEach(() => {
    policy = createCommandPolicy([
      // Org-floor rules (always apply)
      { pattern: /rm\s+-rf/i, decision: "require_approval" as CommandDecision, label: "rm -rf" },
      { pattern: /mkfs/i, decision: "deny" as CommandDecision, label: "mkfs" },
      { pattern: /git\s+push\s+--force/i, decision: "require_approval" as CommandDecision, label: "git push --force" },
      // Scope rules
      { pattern: /ls\s+/i, decision: "allow" as CommandDecision, label: "ls" },
    ]);
  });

  it("allows safe commands", () => {
    const result = policy.evaluate("ls -la /tmp");
    expect(result.decision).toBe("allow");
    expect(result.label).toBe("ls");
  });

  it("denies mkfs", () => {
    const result = policy.evaluate("mkfs.ext4 /dev/sda1");
    expect(result.decision).toBe("deny");
    expect(result.label).toBe("mkfs");
  });

  it("requires approval for rm -rf", () => {
    const result = policy.evaluate("rm -rf /");
    expect(result.decision).toBe("require_approval");
    expect(result.label).toBe("rm -rf");
  });

  it("requires approval for git push --force", () => {
    const result = policy.evaluate("git push --force origin main");
    expect(result.decision).toBe("require_approval");
    expect(result.label).toBe("git push --force");
  });

  it("allows commands that don't match any rule", () => {
    const result = policy.evaluate("echo hello");
    expect(result.decision).toBe("allow");
    expect(result.label).toBe("no-match");
  });

  it("first match wins (org-floor rules take priority)", () => {
    // rm -rf matches before ls
    const result = policy.evaluate("rm -rf /tmp");
    expect(result.decision).toBe("require_approval");
  });
});

// ── scannableCommand tests ─────────────────────────────────

describe("scannableCommand", () => {
  it("extracts the command from a simple shell command", () => {
    expect(scannableCommand("ls -la")).toBe("ls -la");
  });

  it("extracts from command substitution", () => {
    const result = scannableCommand("echo $(rm -rf /)");
    expect(result).toContain("rm -rf");
  });

  it("extracts from heredoc", () => {
    const result = scannableCommand("cat <<EOF\nrm -rf /\nEOF");
    expect(result).toContain("rm -rf");
  });

  it("handles nested subshells", () => {
    const result = scannableCommand("echo $(cat $(ls))");
    expect(result).toContain("cat");
    expect(result).toContain("ls");
  });
});

// ── SecurityPosture tests ──────────────────────────────────

describe("SecurityPosture", () => {
  it("dangerous posture: no inbound screening, no tool approvals", () => {
    const posture: SecurityPosture = {
      level: "dangerous" as SecurityPostureLevel,
      inboundScreening: false,
      toolApprovals: "none" as const,
    };
    expect(posture.level).toBe("dangerous");
    expect(posture.inboundScreening).toBe(false);
    expect(posture.toolApprovals).toBe("none");
  });

  it("auto posture: external screening, no tool approvals", () => {
    const posture: SecurityPosture = {
      level: "auto" as SecurityPostureLevel,
      inboundScreening: true,
      toolApprovals: "none" as const,
    };
    expect(posture.inboundScreening).toBe(true);
  });

  it("strict posture: all tool calls require approval", () => {
    const posture: SecurityPosture = {
      level: "strict" as SecurityPostureLevel,
      inboundScreening: false,
      toolApprovals: "all" as const,
    };
    expect(posture.toolApprovals).toBe("all");
  });

  it("composeSecurityPosture returns the stricter of two postures", () => {
    const orgFloor: SecurityPosture = {
      level: "auto" as SecurityPostureLevel,
      inboundScreening: true,
      toolApprovals: "none" as const,
    };
    const scope: SecurityPosture = {
      level: "strict" as SecurityPostureLevel,
      inboundScreening: false,
      toolApprovals: "all" as const,
    };
    const composed = composeSecurityPosture(orgFloor, scope);
    // strict > auto, so strict wins
    expect(composed.level).toBe("strict");
    expect(composed.toolApprovals).toBe("all");
  });

  it("composeSecurityPosture keeps org floor when scope is more permissive", () => {
    const orgFloor: SecurityPosture = {
      level: "strict" as SecurityPostureLevel,
      inboundScreening: true,
      toolApprovals: "all" as const,
    };
    const scope: SecurityPosture = {
      level: "dangerous" as SecurityPostureLevel,
      inboundScreening: false,
      toolApprovals: "none" as const,
    };
    const composed = composeSecurityPosture(orgFloor, scope);
    // Org floor is strict — scope can't weaken it
    expect(composed.level).toBe("strict");
    expect(composed.toolApprovals).toBe("all");
  });
});

// ── ToolLedger tests ───────────────────────────────────────

describe("ToolLedger", () => {
  let ledger: ToolLedger;

  beforeEach(() => {
    ledger = createToolLedger();
  });

  it("returns undefined for a new call id", () => {
    expect(ledger.get("call-1")).toBeUndefined();
  });

  it("stores and retrieves results by call id", () => {
    ledger.set("call-1", { success: true, output: "done" });
    const result = ledger.get("call-1");
    expect(result).toEqual({ success: true, output: "done" });
  });

  it("has() returns true for stored results", () => {
    ledger.set("call-2", { success: true, output: "ok" });
    expect(ledger.has("call-2")).toBe(true);
    expect(ledger.has("call-3")).toBe(false);
  });

  it("clear() removes all entries", () => {
    ledger.set("call-1", { success: true, output: "a" });
    ledger.set("call-2", { success: true, output: "b" });
    ledger.clear();
    expect(ledger.has("call-1")).toBe(false);
    expect(ledger.has("call-2")).toBe(false);
  });

  it("replay returns stored result without re-executing", async () => {
    const mockFn = vi.fn().mockResolvedValue({ success: true, output: "fresh" });
    ledger.set("call-1", { success: true, output: "cached" });

    const result = await ledger.replay("call-1", mockFn);
    expect(result).toEqual({ success: true, output: "cached" });
    expect(mockFn).not.toHaveBeenCalled();
  });

  it("replay executes and caches when no stored result exists", async () => {
    const mockFn = vi.fn().mockResolvedValue({ success: true, output: "fresh" });
    const result = await ledger.replay("call-3", mockFn);
    expect(result).toEqual({ success: true, output: "fresh" });
    expect(mockFn).toHaveBeenCalledOnce();
    expect(ledger.get("call-3")).toEqual({ success: true, output: "fresh" });
  });
});