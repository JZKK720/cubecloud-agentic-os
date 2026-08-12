// G1.4: DingTalk channel adapter tests.

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createDingTalkChannel,
  type DingTalkConfig,
  parseDingTalkEvent,
} from "../src/main/channels/dingtalk-channel";

describe("DingTalkConfig", () => {
  it("accepts appKey, appSecret", () => {
    const config: DingTalkConfig = {
      appKey: "ding_test_key",
      appSecret: "ding_test_secret",
    };
    expect(config.appKey).toBe("ding_test_key");
    expect(config.appSecret).toBe("ding_test_secret");
  });
});

describe("parseDingTalkEvent", () => {
  it("parses a text message from Stream Mode", () => {
    const event = {
      conversationId: "cid_test_conv",
      senderId: "user_test_1",
      senderNick: "Alice",
      senderCorpId: "corp_test",
      conversationType: "2", // 2 = group
      msgId: "msg_dt_1",
      text: "Hello agent",
      senderStaffId: "staff_1",
      chatbotUserId: "bot_1",
      isAdmin: false,
      senderType: "user",
    };
    const result = parseDingTalkEvent(event);
    expect(result).not.toBeNull();
    expect(result!.msgId).toBe("msg_dt_1");
    expect(result!.platform).toBe("dingtalk");
    expect(result!.channel).toBe("cid_test_conv");
    expect(result!.text).toBe("Hello agent");
    expect(result!.isDm).toBe(false);
    expect(result!.sender.id).toBe("user_test_1");
    expect(result!.sender.name).toBe("Alice");
    expect(result!.sender.isBot).toBe(false);
  });

  it("detects DM (conversationType = 1)", () => {
    const event = {
      conversationId: "cid_dm",
      senderId: "u1",
      senderNick: "Bob",
      conversationType: "1", // 1 = p2p
      msgId: "m1",
      text: "private",
      senderType: "user",
    };
    const result = parseDingTalkEvent(event);
    expect(result).not.toBeNull();
    expect(result!.isDm).toBe(true);
  });

  it("detects group chat (conversationType = 2)", () => {
    const event = {
      conversationId: "cid_group",
      senderId: "u2",
      senderNick: "Carol",
      conversationType: "2",
      msgId: "m2",
      text: "group message",
      senderType: "user",
    };
    const result = parseDingTalkEvent(event);
    expect(result).not.toBeNull();
    expect(result!.isDm).toBe(false);
  });

  it("extracts @mentions from text", () => {
    const event = {
      conversationId: "cid",
      senderId: "u1",
      senderNick: "Test",
      conversationType: "2",
      msgId: "m3",
      text: "@bot please help me",
      senderType: "user",
    };
    const result = parseDingTalkEvent(event);
    expect(result).not.toBeNull();
    // DingTalk Stream Mode doesn't have explicit mentionedBots in the event;
    // we detect @mentions from the text content.
    expect(result!.text).toContain("@bot");
  });
});

describe("createDingTalkChannel", () => {
  it("creates a channel with the correct platform name", () => {
    const channel = createDingTalkChannel({
      appKey: "test",
      appSecret: "secret",
    });
    expect(channel.platform).toBe("dingtalk");
  });

  it("satisfies the Channel interface", () => {
    const channel = createDingTalkChannel({
      appKey: "test",
      appSecret: "secret",
    });
    expect(typeof channel.start).toBe("function");
    expect(typeof channel.stop).toBe("function");
    expect(typeof channel.sendMessage).toBe("function");
    expect(typeof channel.getChannelInfo).toBe("function");
  });

  it("start/stop resolve without error (stub)", async () => {
    const channel = createDingTalkChannel({
      appKey: "test",
      appSecret: "secret",
    });
    await expect(channel.start()).resolves.toBeUndefined();
    await expect(channel.stop()).resolves.toBeUndefined();
  });

  it("sendMessage returns false when not connected (stub)", async () => {
    const channel = createDingTalkChannel({
      appKey: "test",
      appSecret: "secret",
    });
    const result = await channel.sendMessage("cid_test", "hello");
    expect(result).toBe(false);
  });
});