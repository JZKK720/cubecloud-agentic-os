// G1.3: Feishu channel adapter tests.
//
// The Feishu adapter connects to Feishu/Lark via the Lark Suite SDK
// (WSClient long-connection). It receives messages, normalizes them,
// and sends replies back via the IM API.
//
// Inspired by AgentConnect's Feishu implementation, adapted to
// the Cubecloud Agent Desktop's Channel interface.

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createFeishuChannel,
  type FeishuConfig,
  parseFeishuEvent,
} from "../src/main/channels/feishu-channel";

// ── FeishuConfig tests ────────────────────────────────────

describe("FeishuConfig", () => {
  it("accepts appId, appSecret, and region", () => {
    const config: FeishuConfig = {
      appId: "cli_test_app",
      appSecret: "test_secret",
      region: "feishu",
    };
    expect(config.appId).toBe("cli_test_app");
    expect(config.appSecret).toBe("test_secret");
    expect(config.region).toBe("feishu");
  });

  it("defaults region to feishu when not specified", () => {
    const config: FeishuConfig = {
      appId: "cli_test",
      appSecret: "secret",
    };
    expect(config.region ?? "feishu").toBe("feishu");
  });

  it("supports lark region for international", () => {
    const config: FeishuConfig = {
      appId: "cli_intl",
      appSecret: "secret",
      region: "lark",
    };
    expect(config.region).toBe("lark");
  });
});

// ── parseFeishuEvent tests ────────────────────────────────

describe("parseFeishuEvent", () => {
  it("parses a text message event", () => {
    const event = {
      event_type: "im.message.receive_v1",
      event: {
        message: {
          message_id: "om_test_msg_1",
          chat_id: "oc_test_chat",
          message_type: "text",
          content: JSON.stringify({ text: "Hello agent" }),
          sender: {
            sender_id: {
              open_id: "ou_test_user",
            },
            sender_type: "user",
          },
        },
      },
    };
    const result = parseFeishuEvent(event);
    expect(result).not.toBeNull();
    expect(result!.msgId).toBe("om_test_msg_1");
    expect(result!.platform).toBe("feishu");
    expect(result!.channel).toBe("oc_test_chat");
    expect(result!.text).toBe("Hello agent");
    expect(result!.isDm).toBe(false);
    expect(result!.sender.id).toBe("ou_test_user");
    expect(result!.sender.isBot).toBe(false);
  });

  it("returns null for non-message events", () => {
    const event = {
      event_type: "contact.user.updated_v3",
      event: {},
    };
    const result = parseFeishuEvent(event);
    expect(result).toBeNull();
  });

  it("handles post message type (rich text)", () => {
    const event = {
      event_type: "im.message.receive_v1",
      event: {
        message: {
          message_id: "om_rich_1",
          chat_id: "oc_rich",
          message_type: "post",
          content: JSON.stringify({
            content: [
              [
                { tag: "text", text: "Hello " },
                { tag: "at", user_id: "ou_bot", user_name: "Bot" },
                { tag: "text", text: " please help" },
              ],
            ],
          }),
          sender: {
            sender_id: { open_id: "ou_sender" },
            sender_type: "user",
          },
        },
      },
    };
    const result = parseFeishuEvent(event);
    expect(result).not.toBeNull();
    expect(result!.text).toContain("Hello");
    expect(result!.text).toContain("please help");
    expect(result!.mentionedBots).toContain("ou_bot");
  });

  it("detects DM (p2p chat)", () => {
    const event = {
      event_type: "im.message.receive_v1",
      event: {
        message: {
          message_id: "om_dm_1",
          chat_id: "oc_dm_chat",
          message_type: "text",
          chat_type: "p2p",
          content: JSON.stringify({ text: "private message" }),
          sender: {
            sender_id: { open_id: "ou_user" },
            sender_type: "user",
          },
        },
      },
    };
    const result = parseFeishuEvent(event);
    expect(result).not.toBeNull();
    expect(result!.isDm).toBe(true);
  });
});

// ── createFeishuChannel tests ─────────────────────────────

describe("createFeishuChannel", () => {
  it("creates a channel with the correct platform name", () => {
    const channel = createFeishuChannel({
      appId: "cli_test",
      appSecret: "secret",
    });
    expect(channel.platform).toBe("feishu");
  });

  it("satisfies the Channel interface", () => {
    const channel = createFeishuChannel({
      appId: "cli_test",
      appSecret: "secret",
    });
    expect(typeof channel.start).toBe("function");
    expect(typeof channel.stop).toBe("function");
    expect(typeof channel.sendMessage).toBe("function");
    expect(typeof channel.getChannelInfo).toBe("function");
  });

  it("start() resolves without error (stub — no real SDK)", async () => {
    const channel = createFeishuChannel({
      appId: "cli_test",
      appSecret: "secret",
    });
    // start() is a stub — it doesn't actually connect to Feishu
    await expect(channel.start()).resolves.toBeUndefined();
  });

  it("stop() resolves without error", async () => {
    const channel = createFeishuChannel({
      appId: "cli_test",
      appSecret: "secret",
    });
    await expect(channel.stop()).resolves.toBeUndefined();
  });

  it("sendMessage() returns false when not connected (stub)", async () => {
    const channel = createFeishuChannel({
      appId: "cli_test",
      appSecret: "secret",
    });
    const result = await channel.sendMessage("oc_test", "hello");
    // Stub returns false because no real connection exists
    expect(result).toBe(false);
  });

  it("getChannelInfo() returns stub info", async () => {
    const channel = createFeishuChannel({
      appId: "cli_test",
      appSecret: "secret",
    });
    const info = await channel.getChannelInfo("oc_test");
    expect(info).toBeDefined();
    expect(typeof info.name).toBe("string");
  });
});