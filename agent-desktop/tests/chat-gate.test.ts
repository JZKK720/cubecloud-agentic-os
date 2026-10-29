import { describe, it, expect, vi } from "vitest";
import {
  runBeforeModelChain,
  createBeforeModelChain,
  type BeforeModelContext,
} from "../src/main/chat-middleware";

function ctx(content: string): BeforeModelContext {
  return {
    messages: [{ role: "user", content }],
  } as unknown as BeforeModelContext;
}

const denyRule = {
  pattern: /\brm\s+-rf\b/i,
  decision: "deny" as const,
  label: "no-rm-rf",
};

describe("chat preflight — blocked requests never dispatch", () => {
  it("returns a blocked verdict instead of messages", async () => {
    const chain = createBeforeModelChain(undefined, {
      toolPolicyRules: [denyRule],
    });
    const out = await runBeforeModelChain(ctx("rm -rf /tmp/x"), chain);

    expect(out.blocked).toBeDefined();
    expect(out.blocked!.decision).toBe("deny");
  });

  it("a dispatcher that honours 'blocked' is never invoked", async () => {
    const dispatch = vi.fn().mockResolvedValue("should-not-run");
    const chain = createBeforeModelChain(undefined, {
      toolPolicyRules: [denyRule],
    });

    // This mirrors the production call site: run the chain, and only
    // dispatch when no block was returned.
    const out = await runBeforeModelChain(ctx("please rm -rf build"), chain);
    if (!out.blocked) {
      await dispatch(out.messages);
    }

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("an allowed request still dispatches", async () => {
    const dispatch = vi.fn().mockResolvedValue("ok");
    const chain = createBeforeModelChain(undefined, {
      toolPolicyRules: [denyRule],
    });

    const out = await runBeforeModelChain(ctx("summarise the readme"), chain);
    if (!out.blocked) {
      await dispatch(out.messages);
    }

    expect(dispatch).toHaveBeenCalledOnce();
  });

  it("surfaces the rule that blocked, so the UI can explain it", async () => {
    const chain = createBeforeModelChain(undefined, {
      toolPolicyRules: [denyRule],
    });
    const out = await runBeforeModelChain(ctx("rm -rf node_modules"), chain);
    expect(out.blocked!.rule).toBe("no-rm-rf");
    expect(out.blocked!.reason).toBe("no-rm-rf");
  });
});
