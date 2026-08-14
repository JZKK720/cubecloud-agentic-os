import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  runBeforeModelChain,
  runAfterModelChain,
  createBeforeModelChain,
  createAfterModelChain,
  headroomCompressMiddleware,
  runtimeRouteMiddleware,
  createReflectionMiddleware,
  type ChatMessage,
  type BeforeModelContext,
  type AfterModelContext,
} from "../src/main/chat-middleware";

// Mock headroom + headroom-sidecar so the Headroom middleware can be tested
// without a running sidecar.
vi.mock("../src/main/headroom", () => ({
  loadHeadroomConfig: vi.fn(),
  compressMessages: vi.fn(),
}));

vi.mock("../src/main/headroom-sidecar", () => ({
  getHeadroomSidecarStatus: vi.fn(() => ({ state: "stopped" })),
}));

import { loadHeadroomConfig, compressMessages } from "../src/main/headroom";
import { getHeadroomSidecarStatus } from "../src/main/headroom-sidecar";

const mockLoadHeadroomConfig = vi.mocked(loadHeadroomConfig);
const mockCompressMessages = vi.mocked(compressMessages);
const mockGetSidecarStatus = vi.mocked(getHeadroomSidecarStatus);

function makeMessages(n: number): ChatMessage[] {
  return Array.from({ length: n }, (_, i) => ({
    role: i % 2 === 0 ? "user" : "assistant",
    content: `Message ${i}`,
  }));
}

function makeCtx(messages: ChatMessage[]): BeforeModelContext {
  return {
    messages,
    model: "test-model",
    providerHint: "openai",
    hermesHome: "/tmp/test-hermes",
  };
}

describe("chat-middleware — chain runner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs before_model middlewares in sequence, passing messages through", async () => {
    const mw1 = vi.fn().mockResolvedValue({
      messages: [{ role: "user", content: "from-mw1" }],
      applied: true,
      label: "mw1",
    });
    const mw2 = vi.fn().mockResolvedValue({
      messages: [{ role: "user", content: "from-mw2" }],
      applied: true,
      label: "mw2",
    });

    const result = await runBeforeModelChain(
      makeCtx(makeMessages(2)),
      [mw1, mw2],
    );

    expect(result.messages).toEqual([
      { role: "user", content: "from-mw2" },
    ]);
    expect(result.results).toHaveLength(2);
    expect(mw1).toHaveBeenCalledOnce();
    expect(mw2).toHaveBeenCalledOnce();
  });

  it("degrades gracefully when a middleware throws", async () => {
    const mw1 = vi
      .fn()
      .mockRejectedValue(new Error("middleware crashed"));
    const mw2 = vi.fn().mockResolvedValue({
      messages: [{ role: "user", content: "ok" }],
      applied: true,
      label: "mw2",
    });

    const result = await runBeforeModelChain(
      makeCtx(makeMessages(2)),
      [mw1, mw2],
    );

    // mw1 failed → its result is applied:false, messages unchanged
    expect(result.results[0].applied).toBe(false);
    expect(result.results[0].label).toContain("error");
    // mw2 still ran
    expect(result.results[1].applied).toBe(true);
    expect(result.messages).toEqual([{ role: "user", content: "ok" }]);
  });

  it("runs after_model middlewares and collects results", async () => {
    const mw1 = vi.fn().mockResolvedValue({
      applied: true,
      label: "after1",
      output: "critique",
    });
    const mw2 = vi.fn().mockResolvedValue({
      applied: false,
      label: "after2:skip",
    });

    const ctx: AfterModelContext = {
      userContent: "hello",
      responseText: "hi there",
      model: "test",
      providerHint: "openai",
      hermesHome: "/tmp",
    };

    const results = await runAfterModelChain(ctx, [mw1, mw2]);

    expect(results).toHaveLength(2);
    expect(results[0].applied).toBe(true);
    expect(results[0].output).toBe("critique");
    expect(results[1].applied).toBe(false);
  });
});

describe("chat-middleware — headroomCompressMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips when too few messages", async () => {
    const result = await headroomCompressMiddleware(
      makeCtx(makeMessages(2)),
    );
    expect(result.applied).toBe(false);
    expect(result.label).toContain("too-few");
  });

  it("skips when Headroom is disabled", async () => {
    mockLoadHeadroomConfig.mockResolvedValue({ enabled: false } as never);
    const result = await headroomCompressMiddleware(
      makeCtx(makeMessages(5)),
    );
    expect(result.applied).toBe(false);
    expect(result.label).toContain("disabled");
  });

  it("skips when sidecar is not running", async () => {
    mockLoadHeadroomConfig.mockResolvedValue({ enabled: true } as never);
    mockGetSidecarStatus.mockReturnValue({ state: "stopped" } as never);
    const result = await headroomCompressMiddleware(
      makeCtx(makeMessages(5)),
    );
    expect(result.applied).toBe(false);
    expect(result.label).toContain("no-sidecar");
  });

  it("compresses when all gates pass", async () => {
    mockLoadHeadroomConfig.mockResolvedValue({ enabled: true } as never);
    mockGetSidecarStatus.mockReturnValue({ state: "running" } as never);
    mockCompressMessages.mockResolvedValue({
      compressed: true,
      messages: [{ role: "user", content: "compressed" }],
      tokensBefore: 1000,
      tokensAfter: 200,
      savingsPercent: 80,
      success: true,
    } as never);

    const result = await headroomCompressMiddleware(
      makeCtx(makeMessages(5)),
    );

    expect(result.applied).toBe(true);
    expect(result.label).toBe("headroom:compressed");
    expect(result.messages).toEqual([
      { role: "user", content: "compressed" },
    ]);
    expect(result.stats).toEqual({
      tokensBefore: 1000,
      tokensAfter: 200,
      savingsPercent: 80,
    });
  });

  it("degrades gracefully on compress error", async () => {
    mockLoadHeadroomConfig.mockResolvedValue({ enabled: true } as never);
    mockGetSidecarStatus.mockReturnValue({ state: "running" } as never);
    mockCompressMessages.mockRejectedValue(new Error("network error") as never);

    const msgs = makeMessages(5);
    const result = await headroomCompressMiddleware(makeCtx(msgs));

    expect(result.applied).toBe(false);
    expect(result.label).toBe("headroom:error");
    expect(result.messages).toBe(msgs);
  });
});

describe("chat-middleware — runtimeRouteMiddleware", () => {
  it("is a pass-through (no transformation)", async () => {
    const msgs = makeMessages(3);
    const result = await runtimeRouteMiddleware(makeCtx(msgs));
    expect(result.applied).toBe(false);
    expect(result.messages).toBe(msgs);
    expect(result.label).toBe("route:pass");
  });
});

describe("chat-middleware — reflection middleware", () => {
  it("skips when disabled", async () => {
    const mw = createReflectionMiddleware({ enabled: false });
    const ctx: AfterModelContext = {
      userContent: "hello",
      responseText: "hi",
      model: "test",
      providerHint: "openai",
      hermesHome: "/tmp",
    };
    const result = await mw(ctx);
    expect(result.applied).toBe(false);
    expect(result.label).toContain("disabled");
  });

  it("skips when enabled but no critiqueFn provided", async () => {
    const mw = createReflectionMiddleware({ enabled: true });
    const ctx: AfterModelContext = {
      userContent: "hello",
      responseText: "hi there",
      model: "test",
      providerHint: "openai",
      hermesHome: "/tmp",
    };
    const result = await mw(ctx);
    expect(result.applied).toBe(false);
    expect(result.label).toBe("reflection:skip(no-critique-fn)");
  });

  it("runs critique when enabled + critiqueFn provided", async () => {
    const critiqueFn = vi.fn().mockResolvedValue("PASS: looks good");
    const mw = createReflectionMiddleware({ enabled: true }, critiqueFn);
    const ctx: AfterModelContext = {
      userContent: "what is 2+2?",
      responseText: "4",
      model: "test-model",
      providerHint: "openai",
      hermesHome: "/tmp",
    };
    const result = await mw(ctx);
    expect(result.applied).toBe(true);
    expect(result.label).toBe("reflection:done");
    expect(result.output).toBe("PASS: looks good");
    expect(result.stats).toEqual({
      responseLength: 1,
      critiqueLength: 16,
    });
    expect(critiqueFn).toHaveBeenCalledWith("what is 2+2?", "4", "test-model");
  });

  it("degrades gracefully when critiqueFn throws", async () => {
    const critiqueFn = vi.fn().mockRejectedValue(new Error("LLM timeout"));
    const mw = createReflectionMiddleware({ enabled: true }, critiqueFn);
    const ctx: AfterModelContext = {
      userContent: "hello",
      responseText: "hi",
      model: "test",
      providerHint: "openai",
      hermesHome: "/tmp",
    };
    const result = await mw(ctx);
    expect(result.applied).toBe(false);
    expect(result.label).toBe("reflection:error");
    expect(result.stats).toHaveProperty("error", "LLM timeout");
  });
});

describe("chat-middleware — chain factories", () => {
  it("createBeforeModelChain returns tool-policy + memory + headroom + compaction + route", async () => {
    const chain = createBeforeModelChain();
    // G2/Item 3: the chain now wires 5 middleware in order:
    //   0 tool-policy, 1 memory-inject, 2 headroom, 3 compaction, 4 route
    expect(chain).toHaveLength(5);
    expect(chain[2]).toBe(headroomCompressMiddleware);
    // chain[4] is created by createRuntimeRouteMiddleware() —
    // verify it behaves like the no-op pass-through when no registry.
    const result = await chain[4]({
      messages: [{ role: "user", content: "test" }],
      model: "test",
      providerHint: "openai",
      hermesHome: "/tmp",
    });
    expect(result.label).toBe("route:pass");
    expect(result.applied).toBe(false);
  });

  it("createAfterModelChain returns reflection when enabled", () => {
    const chain = createAfterModelChain({ enabled: true });
    expect(chain).toHaveLength(1);
  });

  it("createAfterModelChain accepts critiqueFn", () => {
    const critiqueFn = vi.fn();
    const chain = createAfterModelChain({ enabled: true }, critiqueFn);
    expect(chain).toHaveLength(1);
  });

  it("createAfterModelChain returns reflection even when disabled", () => {
    // The middleware is always in the chain; it self-skips when disabled.
    const chain = createAfterModelChain({ enabled: false });
    expect(chain).toHaveLength(1);
  });
});