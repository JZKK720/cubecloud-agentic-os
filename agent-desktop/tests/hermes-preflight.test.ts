import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The production gate lives inside sendMessage's preflight step, which is
// not exported and needs a live HTTP server to reach. These assertions pin
// the three things that make the gate real; the behavioural proof that a
// blocked request never reaches the wire is in middleware-block.test.ts and
// chat-gate.test.ts, which exercise the same chain the preflight calls.

const hermesSrc = readFileSync(join(__dirname, "../src/main/hermes.ts"), "utf-8");

describe("hermes preflight gate wiring", () => {
  it("finalizePreparedRequest returns a block instead of void", () => {
    expect(hermesSrc).toMatch(
      /async function finalizePreparedRequest\([^)]*\)\s*:\s*Promise<BeforeModelBlock \| null>/,
    );
  });

  it("returns the block from the chain result", () => {
    expect(hermesSrc).toMatch(/const \{ results, blocked \} = await runBeforeModelChain\(/);
    expect(hermesSrc).toMatch(/if \(blocked\) \{\s*return blocked;/);
  });

  it("both dispatch sites check the block before starting the request", () => {
    const checks = hermesSrc.match(/if \(blocked\) return blockRequest\(blocked\);/g) ?? [];
    expect(checks).toHaveLength(2);
  });

  it("blockRequest surfaces the rule and states nothing was sent", () => {
    expect(hermesSrc).toMatch(/function blockRequest\(blocked: BeforeModelBlock\)/);
    expect(hermesSrc).toContain("Nothing was sent.");
  });

  it("does not silently permit when the chain throws", () => {
    // The old catch was empty. A structural failure must fail closed.
    expect(hermesSrc).toMatch(/catch \{\s*\/\/[^\n]*\n(?:[^\n]*\n){0,3}\s*return \{\s*reason: "policy chain failed",\s*decision: "error",/);
  });
});
