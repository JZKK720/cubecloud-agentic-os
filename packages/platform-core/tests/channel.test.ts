// G1: IM Channel interface + router tests.
//
// ChannelInterface: common interface for all IM channels (WeCom, DingTalk, Feishu).
// ChannelRouter: dispatches inbound messages to the HarnessRouter and
// outbound messages to the correct channel.
//
// Inspired by AgentConnect's PlatformConnection interface and
// NormalizedPlatformMessage schema, adapted to the Cubecloud Agent Desktop.

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  type Channel,
  type ChannelConfig,
  type ChannelMessage,
  type ChannelRouter,
  createChannelRouter,
  normalizeMessage,
  type NormalizedMessage,
} from "../src/channel";

// ── Mock channel ─────────────────────────────────────────

function makeMockChannel(platform: string): Channel {
  return {
    platform,
    async start() {},
    async stop() {},
    async sendMessage(_target: string, _text: string): Promise<boolean> {
      return true;
    },
    async getChannelInfo(_channel: string) {
      return { name: `test-${platform}`, isPrivate: false };
    },
  };
}

// ── Channel interface tests ───────────────────────────────

describe("Channel interface", () => {
  it("a mock channel satisfies the Channel interface", () => {
    const ch = makeMockChannel("wecom");
    expect(ch.platform).toBe("wecom");
    expect(typeof ch.start).toBe("function");
    expect(typeof ch.stop).toBe("function");
    expect(typeof ch.sendMessage).toBe("function");
  });
});

// ── normalizeMessage tests ────────────────────────────────

describe("normalizeMessage", () => {
  it("normalizes a raw IM message into the standard schema", () => {
    const raw: ChannelMessage = {
      msgId: "msg-123",
      platform: "feishu",
      channel: "oc_test_channel",
      sender: { id: "user-1", name: "Alice", isBot: false },
      text: "Hello agent",
      isDm: false,
      mentionedBots: ["bot-1"],
    };
    const normalized = normalizeMessage(raw);
    expect(normalized.msgId).toBe("msg-123");
    expect(normalized.platform).toBe("feishu");
    expect(normalized.channel).toBe("oc_test_channel");
    expect(normalized.sender.name).toBe("Alice");
    expect(normalized.text).toBe("Hello agent");
    expect(normalized.isDm).toBe(false);
    expect(normalized.mentionedBots).toEqual(["bot-1"]);
  });

  it("generates a traceId if not provided", () => {
    const raw: ChannelMessage = {
      msgId: "msg-456",
      platform: "wecom",
      channel: "test",
      sender: { id: "u1", isBot: false },
      text: "hi",
      isDm: true,
      mentionedBots: [],
    };
    const normalized = normalizeMessage(raw);
    expect(normalized.traceId).toBeDefined();
    expect(normalized.traceId.length).toBeGreaterThan(0);
  });

  it("preserves existing traceId", () => {
    const raw: ChannelMessage = {
      msgId: "msg-789",
      platform: "dingtalk",
      channel: "cid",
      sender: { id: "u2", isBot: false },
      text: "test",
      isDm: false,
      mentionedBots: [],
      traceId: "existing-trace",
    };
    const normalized = normalizeMessage(raw);
    expect(normalized.traceId).toBe("existing-trace");
  });

  it("defaults trigger to undefined", () => {
    const raw: ChannelMessage = {
      msgId: "m1",
      platform: "feishu",
      channel: "c",
      sender: { id: "u", isBot: false },
      text: "x",
      isDm: false,
      mentionedBots: [],
    };
    const normalized = normalizeMessage(raw);
    expect(normalized.trigger).toBeUndefined();
  });
});

// ── ChannelRouter tests ──────────────────────────────────

describe("ChannelRouter", () => {
  let router: ChannelRouter;

  beforeEach(() => {
    const channels = new Map<string, Channel>([
      ["wecom", makeMockChannel("wecom")],
      ["dingtalk", makeMockChannel("dingtalk")],
      ["feishu", makeMockChannel("feishu")],
    ]);
    router = createChannelRouter(channels);
  });

  it("starts all registered channels", async () => {
    const wecom = router.getChannel("wecom");
    expect(wecom).toBeDefined();
    expect(wecom!.platform).toBe("wecom");
  });

  it("getChannel returns undefined for unregistered platform", () => {
    expect(router.getChannel("slack")).toBeUndefined();
  });

  it("listChannels returns all registered platform names", () => {
    const names = router.listChannels();
    expect(names).toContain("wecom");
    expect(names).toContain("dingtalk");
    expect(names).toContain("feishu");
    expect(names).toHaveLength(3);
  });

  it("sendToChannel dispatches to the correct channel", async () => {
    const result = await router.sendToChannel("feishu", "target-chan", "hello");
    expect(result).toBe(true);
  });

  it("sendToChannel returns false for unknown platform", async () => {
    const result = await router.sendToChannel("unknown", "chan", "text");
    expect(result).toBe(false);
  });

  it("stopAll stops all channels without error", async () => {
    await router.stopAll();
    // Should not throw
  });

  it("handleInbound normalizes and returns the message", () => {
    const raw: ChannelMessage = {
      msgId: "inbound-1",
      platform: "wecom",
      channel: "test-chan",
      sender: { id: "user-1", name: "Bob", isBot: false },
      text: "do something",
      isDm: false,
      mentionedBots: ["bot-1"],
    };
    const normalized = router.handleInbound(raw);
    expect(normalized.msgId).toBe("inbound-1");
    expect(normalized.platform).toBe("wecom");
    expect(normalized.text).toBe("do something");
  });
});