// wiring-approval.test.ts — pin the two production call sites.
//
// This exists because of a real bug: `onToolApprovalRequired` was declared,
// documented, and fired by hermes.ts — but NEITHER production ChatCallbacks
// literal supplied it. The harness path and the chat path both omitted it, so
// the event never reached a dialog. Removing the wiring again should fail
// here.
//
// Source matching is used deliberately: the property under test is the
// presence of a field in a literal inside files that cannot be imported
// without Electron. The BEHAVIOURAL proof that the gate blocks lives in
// middleware-block.test.ts and chat-gate.test.ts.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const read = (p: string): string => readFileSync(join(ROOT, p), "utf-8");

describe("production ChatCallbacks literals supply the approval observer", () => {
  it("the chat path (main/index.ts) supplies onToolApprovalObserved", () => {
    const src = read("src/main/index.ts");
    expect(src).toMatch(/onToolApprovalObserved\s*:/);
  });

  it("the harness path (harnesses/hermes-harness.ts) supplies it", () => {
    const src = read("src/main/harnesses/hermes-harness.ts");
    expect(src).toMatch(/onToolApprovalObserved\s*:/);
  });

  it("hermes.ts declares it on ChatCallbacks", () => {
    const src = read("src/main/hermes.ts");
    expect(src).toMatch(/onToolApprovalObserved\?:\s*\(/);
  });

  it("the old misleading name is gone everywhere", () => {
    for (const p of [
      "src/main/hermes.ts",
      "src/main/index.ts",
      "src/main/harnesses/hermes-harness.ts",
    ]) {
      expect(read(p)).not.toContain("onToolApprovalRequired");
    }
  });
});

describe("the gate is on the request path, not the event stream", () => {
  it("finalizePreparedRequest returns a block", () => {
    expect(read("src/main/hermes.ts")).toMatch(
      /Promise<BeforeModelBlock \| null>/,
    );
  });

  it("the policy middleware has a blocked channel", () => {
    expect(read("src/main/chat-middleware.ts")).toMatch(
      /blocked\?: BeforeModelBlock/,
    );
  });
});
