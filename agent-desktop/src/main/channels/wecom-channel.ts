// wecom-channel.ts — G1.5: WeCom (企业微信) channel adapter.
//
// ARCHITECTURAL STATUS (V2.10.79 audit):
// Hermes already handles WeCom connections. The desktop does NOT
// need to run its own WeCom callback server. This file is kept for:
//   - parseWeComEvent() — useful for rendering WeCom messages
//   - WeComConfig / WeComEvent types — reference for the format
//
// createWeComChannel() is a stub and should NOT be wired.
//
// Connects to WeCom via HTTP callback (webhook) or long-connection.
// Receives messages, normalizes them, and sends replies via the IM API.
//
// Inspired by AgentConnect's Feishu pattern:
// - HTTP callback mode: token + AES decrypt verification (like Feishu relay)
// - Rich message types: text/markdown/image/file (like Feishu post messages)
// - Connection consolidation by corpId + agentId
//
// Stub implementation — SDK wiring deferred.

import type {
  Channel,
  ChannelInfo,
  ChannelMessage,
} from "@cubecloud/platform-core";

// ── Types ─────────────────────────────────────────────────

/** Configuration for the WeCom channel. */
export interface WeComConfig {
  /** Corporation ID from WeCom Admin Console. */
  corpId: string;
  /** Agent ID (application ID) from WeCom Admin Console. */
  agentId: number;
  /** Application Secret from WeCom Admin Console. */
  secret: string;
  /** Optional: callback verification token. */
  token?: string;
  /** Optional: AES encryption key for callback mode. */
  aesKey?: string;
}

/** A raw WeCom callback event (simplified, from XML parse). */
interface WeComEvent {
  ToUserName: string;
  FromUserName: string;
  MsgType: string;
  Content?: string;
  MsgId: number;
  AgentID: number;
  ChatId?: string;
}

// ── parseWeComEvent ───────────────────────────────────────

/** Parse a raw WeCom callback event into a ChannelMessage.
 *  Returns null for non-text messages (v1 limitation). */
export function parseWeComEvent(event: WeComEvent): ChannelMessage | null {
  if (event.MsgType !== "text") return null;
  if (!event.Content) return null;

  const isDm = !event.ChatId; // No ChatId = direct message to agent
  const channel = event.ChatId ?? `dm_${event.FromUserName}`;

  return {
    msgId: String(event.MsgId),
    platform: "wecom",
    channel,
    sender: {
      id: event.FromUserName,
      isBot: false,
    },
    text: event.Content,
    isDm,
    mentionedBots: [],
  };
}

// ── createWeComChannel ────────────────────────────────────

/** Create a WeCom channel adapter (stub). */
export function createWeComChannel(config: WeComConfig): Channel {
  let _connected = false;

  return {
    platform: "wecom",

    async start(): Promise<void> {
      // TODO: Wire WeCom API:
      // 1. Get access_token: GET https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=...&corpsecret=...
      // 2. Register callback URL (or use long-connection if available)
      // 3. Verify callback signatures (WXBizMsgCrypt)
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