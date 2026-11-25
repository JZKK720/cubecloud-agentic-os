import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "node:events";
import { tmpdir } from "node:os";
import path from "node:path";

const spawnMock = vi.fn();
vi.mock("child_process", () => ({
  default: { spawn: (...args: unknown[]) => spawnMock(...args) },
  spawn: (...args: unknown[]) => spawnMock(...args),
}));
vi.mock("../src/main/agent-clis", () => ({
  resolveCommandOnPath: () => "C:\\OfficeCLI\\officecli.exe",
}));
vi.mock("../src/main/homer", () => ({
  getEnhancedPath: () => "/usr/bin",
}));

import {
  validateArgs,
  validateInvocation,
  resolveWithinRoots,
  isDocumentSelector,
  runOfficeCli,
  OFFICECLI_VERBS,
} from "../src/main/officecli";

const HOME = tmpdir();

function fakeChild() {
  const child = new EventEmitter() as any;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = vi.fn();
  return child;
}

describe("officecli validator", () => {
  it("allows a document selector like /slide[1]", () => {
    const r = validateArgs("get", ["/slide[1]"], [HOME]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.args).toContain("/slide[1]");
  });

  it("rejects parent traversal", () => {
    const r = validateArgs("get", ["../../etc/passwd"], [HOME]);
    expect(r.ok).toBe(false);
  });

  it("rejects an out-of-root absolute output path", () => {
    const r = validateArgs("view", ["text", "--out", "/etc/passwd"], [HOME]);
    expect(r.ok).toBe(false);
  });

  it("accepts an in-root --out path and resolves it", () => {
    const target = path.join(HOME, "out.txt");
    const r = validateArgs("view", ["text", "--out", target], [HOME]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.args).toContain(path.resolve(target));
  });

  it("rejects a verb outside the whitelist", () => {
    const r = validateInvocation("shell", path.join(HOME, "a.xlsx"), [], [HOME]);
    expect(r.ok).toBe(false);
  });

  it("rejects a file path outside allowed roots", () => {
    const r = validateInvocation("get", "/etc/passwd", [], [HOME]);
    expect(r.ok).toBe(false);
  });

  it("rejects path flags with no value", () => {
    const r = validateArgs("view", ["--out"], [HOME]);
    expect(r.ok).toBe(false);
  });

  it("rejects a path escape inside a JSON batch payload", () => {
    const payload = JSON.stringify({ command: "set", path: "/etc/passwd" });
    const r = validateArgs("batch", [payload], [HOME]);
    expect(r.ok).toBe(false);
  });

  it("accepts an in-root path inside a JSON batch payload", () => {
    const p = path.join(HOME, "in.xlsx");
    const payload = JSON.stringify({ command: "set", path: p });
    const r = validateArgs("batch", [payload], [HOME]);
    expect(r.ok).toBe(true);
  });

  it("treats /slide[1] as a document selector, not a filesystem path", () => {
    expect(isDocumentSelector("/slide[1]")).toBe(true);
    const r = validateArgs("get", ["/slide[1]"], [HOME]);
    expect(r.ok).toBe(true);
  });

  it("rejects absolute POSIX paths that escape the allowed roots", () => {
    expect(isDocumentSelector("/etc/passwd")).toBe(false);
    const r = validateArgs("get", ["/etc/passwd"], [HOME]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/outside allowed roots/);
  });

  it("rejects /Windows and /Program Files style absolute paths", () => {
    expect(isDocumentSelector("/Windows/System32/drivers/etc/hosts")).toBe(false);
    const r = validateArgs("get", ["/Windows/System32/drivers/etc/hosts"], [HOME]);
    expect(r.ok).toBe(false);
  });

  it("contains paths with ../ inside mixed separators", () => {
    expect(resolveWithinRoots("../../etc", [HOME])).toBeNull();
  });

  it("every exposed verb is lowercase and whitelisted", () => {
    for (const v of OFFICECLI_VERBS) expect(v).toBe(v.toLowerCase());
    expect(OFFICECLI_VERBS).not.toContain("shell");
    expect(OFFICECLI_VERBS).not.toContain("exec");
  });
});

describe("runOfficeCli", () => {
  beforeEach(() => spawnMock.mockReset());
  afterEach(() => spawnMock.mockReset());

  it("spawns the binary with the validated argv and reports exit code", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);
    const doc = path.join(HOME, "book.xlsx");
    const p = runOfficeCli({ verb: "view", file: doc, args: ["text"] });
    process.nextTick(() => {
      child.stdout.emit("data", Buffer.from("cell=1"));
      child.emit("close", 0);
    });
    const res = await p;
    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(res.ok).toBe(true);
    expect(res.stdout).toContain("cell=1");
    expect(res.exitCode).toBe(0);
  });
});
