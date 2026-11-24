// dsh-real-smoke.cjs — the skip contract.
//
// WHY THIS TEST EXISTS
//
// `dsh-real-smoke.cjs` proves the deepseek-harness adapter against the REAL
// published `@deepseek-ai/dsh` runtime. Its own header records five bugs that a
// mocked fixture could not catch, so running it matters.
//
// It used to `process.exit(0)` when the runtime or the bundled adapter was
// absent — i.e. it printed `[skip]` and exited SUCCESS. Wired into required CI
// that is a false green: the smoke would be "passing" on every runner where the
// runtime was never installed, and nobody would notice the lane had stopped
// being tested at all. That is the same defect class this repo has been burned
// by (a gate reaching a verdict it has no evidence for).
//
// The contract is now three-valued, which is what the situation actually is:
//
//   exit 0  both paths passed                     -> the lane is proven
//   exit 1  a path FAILED                         -> a real defect
//   exit 2  the runtime/adapter is ABSENT         -> NOT EVALUATED (cannot check)
//
// 2 is what makes it safe to wire into required CI: the runner can distinguish
// "not installed here" from "broken here", and a green 0 can only ever mean the
// smoke actually ran. The script still self-skips on exit 2 so a developer
// without the runtime is not blocked.
//
// This test drives the real script as a child process. It asserts the exit codes
// directly rather than reading the source, because the bug was in behaviour, not
// in spelling — a source-level assertion would have passed on the broken version.

import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SMOKE = path.join(REPO_ROOT, "scripts", "dsh-real-smoke.cjs");

interface RunResult {
  status: number | null;
  stdout: string;
}

/** Run the smoke with an explicit DSH_PACKAGE_DIR, so the test controls whether
 *  the runtime looks present. Never inherits the operator's own install. */
function runSmoke(packageDir: string): RunResult {
  const r = spawnSync(process.execPath, [SMOKE], {
    encoding: "utf8",
    timeout: 120_000,
    env: { ...process.env, DSH_PACKAGE_DIR: packageDir },
  });
  return { status: r.status, stdout: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

function tempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe("dsh-real-smoke.cjs — three-valued skip contract", () => {
  it("exits 2 (NOT EVALUATED, never 0) when the dsh runtime is absent", () => {
    // An empty dir: no node_modules, no adapter.cjs. Both prerequisites absent.
    const dir = tempDir("dsh-absent-");
    try {
      const { status, stdout } = runSmoke(dir);
      expect(stdout).toContain("[skip]");
      // The whole point: absent must NOT be reported as success.
      expect(status).not.toBe(0);
      expect(status).toBe(2);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("names the missing prerequisite instead of a bare exit code", () => {
    const dir = tempDir("dsh-absent2-");
    try {
      const { stdout } = runSmoke(dir);
      // A skip that does not say WHAT is missing costs the reader a debugging
      // round trip. Both messages name their cause.
      expect(stdout).toMatch(/@deepseek-ai\/dsh not found|bundled adapter not found/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("distinguishes 'runtime absent' from 'adapter not built'", () => {
    // A dir with a fake dsh bin but no adapter.cjs must take the ADAPTER branch,
    // so the operator is told to run esbuild rather than to npm install.
    const dir = tempDir("dsh-noadapter-");
    try {
      const binDir = path.join(dir, "node_modules", "@deepseek-ai", "dsh", "lib");
      fs.mkdirSync(binDir, { recursive: true });
      fs.writeFileSync(path.join(binDir, "bin.js"), "process.exit(0);\n");
      const { status, stdout } = runSmoke(dir);
      expect(stdout).toContain("bundled adapter not found");
      expect(status).toBe(2);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("never exits 0 on a skip (the regression this test was written for)", () => {
    const dir = tempDir("dsh-neverzero-");
    try {
      const { status, stdout } = runSmoke(dir);
      if (stdout.includes("[skip]")) {
        expect(status).toBe(2);
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
