// dingtalk-channel.ts — G1.4: DingTalk (钉钉) channel adapter.
//
// ARCHITECTURAL STATUS (V2.10.79 audit):
// Hermes already handles DingTalk connections. The desktop does NOT
// need to run its own DingTalk webhook server. This file is kept for:
//   - parseDingTalkEvent() — useful for rendering DingTalk messages
//   - DingTalkConfig / DingTalkEvent types — reference for the format
//
// createDingTalkChannel() is a stub and should NOT be wired.
//
// Connects to DingTalk via Stream Mode (WebSocket long-connection).
// Receives messages, normalizes them, and sends replies via the IM API.
//
// Inspired by AgentConnect's Feishu implementation pattern:
// - Stream Mode = outbound WebSocket (NAT-friendly, like Feishu WSClient)
// - Card messages (actionCard) similar to Feishu's CardKit
// - Event normalization from Stream Mode callbacks
//
// Stub implementation — SDK wiring deferred.

import type {
  Channel,
  ChannelInfo,
  ChannelMessage,
} from "@cubecloud/platform-core";

// ── Types ─────────────────────────────────────────────────

/** Configuration for the DingTalk channel. */
export interface DingTalkConfig {
  /** App Key from DingTalk Developer Console. */
  appKey: string;
  /** App Secret from DingTalk Developer Console. */
  appSecret: string;
  /** Optional: robot code for group mentions. */
  robotCode?: string;
}

/** A raw DingTalk Stream Mode event (simplified). */
interface DingTalkEvent {
  conversationId: string;
  senderId: string;
  senderNick?: string;
  senderCorpId?: string;
  conversationType: string; // "1" = p2p, "2" = group
  msgId: string;
  text: string;
  senderStaffId?: string;
  chatbotUserId?: string;
  isAdmin?: boolean;
  senderType: string;
}

// ── parseDingTalkEvent ────────────────────────────────────

/** Parse a raw DingTalk Stream Mode event into a ChannelMessage. */
export function parseDingTalkEvent(event: DingTalkEvent): ChannelMessage | null {
  if (!event.msgId || !event.conversationId) return null;

  const isDm = event.conversationType === "1";
  const isBot = event.senderType === "app" || event.senderType === "bot";

  return {
    msgId: event.msgId,
    platform: "dingtalk",
    channel: event.conversationId,
    sender: {
      id: event.senderId,
      name: event.senderNick,
      isBot,
    },
    text: event.text ?? "",
    isDm,
    mentionedBots: event.chatbotUserId ? [event.chatbotUserId] : [],
  };
}

// ── createDingTalkChannel ─────────────────────────────────

/** Create a DingTalk channel adapter (stub). */
export function createDingTalkChannel(config: DingTalkConfig): Channel {
  let _connected = false;

  return {
    platform: "dingtalk",

    async start(): Promise<void> {
      // TODO: Wire DingTalk Stream SDK (open-dingtalk/dingtalk-stream-sdk-go
      // is the Go version; for Node, use the WebSocket endpoint directly)
      _connected = true;
      void config;
    },

    async stop(): Promise<void> {
      _connected = false;
    },

    async sendMessage(_target: string, _text: string): Promise<boolean> {
      if (!_connected) return false;
      return false; // stub
    },

    async getChannelInfo(channel: string): Promise<ChannelInfo> {
      return { name: channel, isPrivate: false };
    },
  };
}