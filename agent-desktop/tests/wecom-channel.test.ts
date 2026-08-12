// G1.5: WeCom (企业微信) channel adapter tests.

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createWeComChannel,
  type WeComConfig,
  parseWeComEvent,
} from "../src/main/channels/wecom-channel";

describe("WeComConfig", () => {
  it("accepts corpId, agentId, secret", () => {
    const config: WeComConfig = {
      corpId: "corp_test",
      agentId: 1000001,
      secret: "test_secret",
    };
    expect(config.corpId).toBe("corp_test");
    expect(config.agentId).toBe(1000001);
    expect(config.secret).toBe("test_secret");
  });

  it("accepts optional token and aesKey for callback mode", () => {
    const config: WeComConfig = {
      corpId: "corp",
      agentId: 1,
      secret: "s",
      token: "callback_token",
      aesKey: "aes_key_for_encryption",
    };
    expect(config.token).toBe("callback_token");
    expect(config.aesKey).toBe("aes_key_for_encryption");
  });
});

describe("parseWeComEvent", () => {
  it("parses a text message from callback XML (simplified)", () => {
    // WeCom callback sends XML. We parse the key fields.
    const event = {
      ToUserName: "wx_corp",
      FromUserName: "user_test_1",
      MsgType: "text",
      Content: "Hello agent",
      MsgId: 1234567890,
      AgentID: 1000001,
      ChatId: "group_chat_1",
    };
    const result = parseWeComEvent(event);
    expect(result).not.toBeNull();
    expect(result!.msgId).toBe("1234567890");
    expect(result!.platform).toBe("wecom");
    expect(result!.channel).toBe("group_chat_1");
    expect(result!.text).toBe("Hello agent");
    expect(result!.isDm).toBe(false);
    expect(result!.sender.id).toBe("user_test_1");
    expect(result!.sender.isBot).toBe(false);
  });

  it("detects DM (no ChatId = direct message to agent)", () => {
    const event = {
      ToUserName: "wx_corp",
      FromUserName: "user_dm",
      MsgType: "text",
      Content: "private message",
      MsgId: 1234567891,
      AgentID: 1000001,
      // No ChatId → direct message
    };
    const result = parseWeComEvent(event);
    expect(result).not.toBeNull();
    expect(result!.isDm).toBe(true);
  });

  it("returns null for non-text messages", () => {
    const event = {
      ToUserName: "wx_corp",
      FromUserName: "user",
      MsgType: "image",
      MsgId: 123,
      AgentID: 1,
    };
    const result = parseWeComEvent(event);
    // Non-text messages are not supported in v1
    expect(result).toBeNull();
  });
});

describe("createWeComChannel", () => {
  it("creates a channel with the correct platform name", () => {
    const channel = createWeComChannel({
      corpId: "corp",
      agentId: 1,
      secret: "s",
    });
    expect(channel.platform).toBe("wecom");
  });

  it("satisfies the Channel interface", () => {
    const channel = createWeComChannel({
      corpId: "corp",
      agentId: 1,
      secret: "s",
    });
    expect(typeof channel.start).toBe("function");
    expect(typeof channel.stop).toBe("function");
    expect(typeof channel.sendMessage).toBe("function");
    expect(typeof channel.getChannelInfo).toBe("function");
  });

  it("start/stop resolve without error (stub)", async () => {
    const channel = createWeComChannel({
      corpId: "corp",
      agentId: 1,
      secret: "s",
    });
    await expect(channel.start()).resolves.toBeUndefined();
    await expect(channel.stop()).resolves.toBeUndefined();
  });

  it("sendMessage returns false when not connected (stub)", async () => {
    const channel = createWeComChannel({
      corpId: "corp",
      agentId: 1,
      secret: "s",
    });
    const result = await channel.sendMessage("test", "hello");
    expect(result).toBe(false);
  });
});