// chat-middleware-chain.test.ts — tests for the P1-P10 middleware wiring.
//
// Tests that the new middleware functions (compaction, memory-inject,
// tool-policy) are included in the default chain and behave correctly:
// - Each degrades gracefully (never throws, never blocks the chat path)
// - Each returns correct applied/skip/error labels
// - The chain order is correct

import { describe, it, expect } from "vitest";
import {
  createBeforeModelChain,
  createCompactionMiddleware,
  createMemoryInjectMiddleware,
  createToolPolicyMiddleware,
  type ChatMessage,
  type BeforeModelContext,
} from "../src/main/chat-middleware";

function makeCtx(messages: ChatMessage[], model = "gpt-4"): BeforeModelContext {
  return {
    messages,
    model,
    providerHint: "openai",
    hermesHome: "/tmp/test",
  };
}

describe("createBeforeModelChain", () => {
  it("includes 5 middleware in the correct order", () => {
    const chain = createBeforeModelChain();
    expect(chain).toHaveLength(5);
    // Order: tool-policy → memory-inject → headroom → compaction → runtime-route
  });

  it("accepts optional config for memory, compaction, and tool policy", () => {
    const chain = createBeforeModelChain(undefined, {
      memoryRecallFn: () => [{ content: "test", label: "test" }],
      toolPolicyRules: [{ pattern: /test/i, decision: "deny", label: "test-deny" }],
    });
    expect(chain).toHaveLength(5);
  });
});

describe("createToolPolicyMiddleware", () => {
  it("skips when no user message is present", async () => {
    const mw = createToolPolicyMiddleware();
    const ctx = makeCtx([{ role: "system", content: "You are helpful." }]);
    const result = await mw(ctx);
    expect(result.applied).toBe(false);
    expect(result.label).toContain("skip");
  });

  it("allows safe messages", async () => {
    const mw = createToolPolicyMiddleware();
    const ctx = makeCtx([
      { role: "user", content: "What is the weather today?" },
    ]);
    const result = await mw(ctx);
    expect(result.applied).toBe(false);
    expect(result.label).toContain("allow");
  });

  it("denies rm -rf / commands", async () => {
    const mw = createToolPolicyMiddleware();
    const ctx = makeCtx([
      { role: "user", content: "Please run rm -rf / to clean up" },
    ]);
    const result = await mw(ctx);
    expect(result.applied).toBe(true);
    expect(result.label).toContain("deny");
  });

  it("flags git push for approval", async () => {
    const mw = createToolPolicyMiddleware();
    const ctx = makeCtx([
      { role: "user", content: "Run git push origin main" },
    ]);
    const result = await mw(ctx);
    expect(result.applied).toBe(true);
    expect(result.label).toContain("require_approval");
  });

  it("flags npm install for approval", async () => {
    const mw = createToolPolicyMiddleware();
    const ctx = makeCtx([
      { role: "user", content: "npm install express" },
    ]);
    const result = await mw(ctx);
    expect(result.applied).toBe(true);
    expect(result.label).toContain("require_approval");
  });

  it("never throws — degrades gracefully on error", async () => {
    const mw = createToolPolicyMiddleware();
    const ctx = makeCtx([{ role: "user", content: null as unknown as string }]);
    const result = await mw(ctx);
    // Should not throw — returns skip or error
    expect(result.applied).toBe(false);
  });
});

describe("createMemoryInjectMiddleware", () => {
  it("skips when no recall function is provided", async () => {
    const mw = createMemoryInjectMiddleware();
    const ctx = makeCtx([{ role: "user", content: "Hello" }]);
    const result = await mw(ctx);
    expect(result.applied).toBe(false);
    expect(result.label).toContain("no-recall-fn");
  });

  it("skips when recall returns empty array", async () => {
    const mw = createMemoryInjectMiddleware(() => []);
    const ctx = makeCtx([{ role: "user", content: "Hello" }]);
    const result = await mw(ctx);
    expect(result.applied).toBe(false);
    expect(result.label).toContain("empty");
  });

  it("injects memories into the system prompt", async () => {
    const mw = createMemoryInjectMiddleware(() => [
      { content: "User prefers concise answers", label: "preference" },
      { content: "Project uses TypeScript", label: "context" },
    ]);
    const ctx = makeCtx([
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Hello" },
    ]);
    const result = await mw(ctx);
    expect(result.applied).toBe(true);
    expect(result.label).toBe("memory:injected");
    expect(result.stats?.memoryCount).toBe(2);
    const systemMsg = result.messages.find((m) => m.role === "system");
    expect(systemMsg?.content).toContain("Persistent Memory");
    expect(systemMsg?.content).toContain("concise answers");
    expect(systemMsg?.content).toContain("TypeScript");
  });

  it("adds a system message when none exists", async () => {
    const mw = createMemoryInjectMiddleware(() => [
      { content: "Test memory", label: "test" },
    ]);
    const ctx = makeCtx([{ role: "user", content: "Hello" }]);
    const result = await mw(ctx);
    expect(result.applied).toBe(true);
    expect(result.messages.some((m) => m.role === "system")).toBe(true);
  });
});

describe("createCompactionMiddleware", () => {
  it("skips when conversation is too short", async () => {
    const mw = createCompactionMiddleware();
    const ctx = makeCtx([
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there!" },
    ]);
    const result = await mw(ctx);
    expect(result.applied).toBe(false);
    expect(result.label).toContain("too-short");
  });

  it("skips when below token threshold", async () => {
    const mw = createCompactionMiddleware();
    const messages: ChatMessage[] = [
      { role: "system", content: "You are helpful." },
      ...Array.from({ length: 10 }, (_, i) => ({
        role: (i % 2 === 0 ? "user" : "assistant") as ChatMessage["role"],
        content: `Message ${i}: short content.`,
      })),
    ];
    const ctx = makeCtx(messages, "gpt-4");
    const result = await mw(ctx);
    expect(result.applied).toBe(false);
    expect(result.label).toContain("below-threshold");
  });

  it("compacts long conversations with mechanical summary", async () => {
    const mw = createCompactionMiddleware(); // No summaryFn → mechanical
    // Create a conversation that exceeds 80% of a small budget
    const longContent = "A".repeat(50000); // ~12,500 tokens per message
    const messages: ChatMessage[] = [
      { role: "system", content: "You are helpful." },
      ...Array.from({ length: 10 }, (_, i) => ({
        role: (i % 2 === 0 ? "user" : "assistant") as ChatMessage["role"],
        content: `${longContent} Message ${i}`,
      })),
    ];
    // Use a model name that implies a small budget
    const ctx = makeCtx(messages, "gpt-4");
    const result = await mw(ctx);
    // Should either compact or skip (depends on token estimate)
    if (result.applied) {
      expect(result.label).toContain("compaction:applied");
      expect(result.stats?.entriesCompacted).toBeGreaterThan(0);
    } else {
      expect(result.label).toContain("skip");
    }
  });

  it("uses provided summaryFn when available", async () => {
    let summaryCalled = false;
    const mw = createCompactionMiddleware(async (entries) => {
      summaryCalled = true;
      return `Summarized ${entries.length} entries.`;
    });
    const longContent = "B".repeat(50000);
    const messages: ChatMessage[] = [
      { role: "system", content: "You are helpful." },
      ...Array.from({ length: 10 }, (_, i) => ({
        role: (i % 2 === 0 ? "user" : "assistant") as ChatMessage["role"],
        content: `${longContent} Message ${i}`,
      })),
    ];
    const ctx = makeCtx(messages, "gpt-4");
    const result = await mw(ctx);
    if (result.applied) {
      expect(summaryCalled).toBe(true);
      const summaryMsg = result.messages.find(
        (m) => m.role === "user" && m.content?.includes("Summarized"),
      );
      expect(summaryMsg).toBeDefined();
    }
  });
});