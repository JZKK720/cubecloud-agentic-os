import { describe, it, expect, vi } from "vitest";
import {
  createToolPolicyMiddleware,
  createBeforeModelChain,
  type BeforeModelContext,
  type CommandPolicyRule,
} from "../src/main/chat-middleware";

const denyRule: CommandPolicyRule = {
  pattern: /\brm\s+-rf\b/i,
  decision: "deny",
  label: "no-rm-rf",
};

const approvalRule: CommandPolicyRule = {
  pattern: /\bgit\s+push\b/i,
  decision: "require_approval",
  label: "approve:git-push",
};

function ctxFor(content: string): BeforeModelContext {
  return {
    messages: [{ role: "user", content }],
  } as unknown as BeforeModelContext;
}

describe("tool policy middleware — blocking", () => {
  it("blocks a deny rule before dispatch", async () => {
    const mw = createToolPolicyMiddleware([denyRule]);
    const result = await mw(ctxFor("please rm -rf build"));

    expect(result.blocked).toBeDefined();
    expect(result.blocked!.decision).toBe("deny");
    expect(result.blocked!.rule).toBe("no-rm-rf");
  });

  it("does not block a benign message", async () => {
    const mw = createToolPolicyMiddleware([denyRule]);
    const result = await mw(ctxFor("please summarise the readme"));
    expect(result.blocked).toBeUndefined();
  });

  it("require_approval with an approver returning deny blocks", async () => {
    const onRequireApproval = vi.fn().mockResolvedValue("deny");
    const mw = createToolPolicyMiddleware([approvalRule], { onRequireApproval });
    const result = await mw(ctxFor("git push origin main"));

    expect(onRequireApproval).toHaveBeenCalledOnce();
    expect(result.blocked).toBeDefined();
    expect(result.blocked!.decision).toBe("require_approval");
  });

  it("require_approval with an approver returning approve does NOT block", async () => {
    const onRequireApproval = vi.fn().mockResolvedValue("approve");
    const mw = createToolPolicyMiddleware([approvalRule], { onRequireApproval });
    const result = await mw(ctxFor("git push origin main"));
    expect(result.blocked).toBeUndefined();
  });

  it("require_approval with a THROWING approver blocks (fail closed)", async () => {
    const onRequireApproval = vi.fn().mockRejectedValue(new Error("ipc down"));
    const mw = createToolPolicyMiddleware([approvalRule], { onRequireApproval });
    const result = await mw(ctxFor("git push origin main"));
    expect(result.blocked).toBeDefined();
  });

  it("require_approval with NO approver blocks (fail closed, not allow)", async () => {
    const mw = createToolPolicyMiddleware([approvalRule]);
    const result = await mw(ctxFor("git push origin main"));
    expect(result.blocked).toBeDefined();
    expect(result.blocked!.decision).toBe("require_approval");
  });

  it("a policy evaluation error blocks instead of allowing (fail closed)", async () => {
    // An invalid regex makes RegExp construction/evaluation throw.
    const badRule = {
      pattern: { test: () => { throw new Error("boom"); } } as unknown as RegExp,
      decision: "deny" as const,
      label: "broken-rule",
    };
    const mw = createToolPolicyMiddleware([badRule]);
    const result = await mw(ctxFor("anything"));
    expect(result.blocked).toBeDefined();
  });
});

describe("before_model chain — short-circuit", () => {
  it("stops the chain when a middleware blocks", async () => {
    const second = vi.fn().mockResolvedValue({
      messages: [],
      applied: false,
      label: "second",
    });

    const chain = createBeforeModelChain(undefined, { toolPolicyRules: [denyRule] });
    chain.push(second);

    const results: string[] = [];
    for (const mw of chain) {
      const r = await mw(ctxFor("please rm -rf build"));
      results.push(r.label);
      if (r.blocked) break;
    }

    expect(results[0]).toContain("deny");
    expect(second).not.toHaveBeenCalled();
  });
});
