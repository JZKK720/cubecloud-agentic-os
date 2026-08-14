// feishu-channel.ts — G1.3: Feishu (飞书) channel adapter.
//
// ARCHITECTURAL STATUS (V2.10.79 audit):
// Hermes already handles Feishu/Lark connections. The desktop does NOT
// need to run its own Feishu webhook server. This file is kept for:
//   - parseFeishuEvent() — useful for rendering Feishu messages in the
//     desktop's chat view if Hermes forwards them
//   - FeishuConfig / FeishuEvent types — reference for the message format
//
// createFeishuChannel() is a stub and should NOT be wired — it would
// duplicate Hermes's Feishu bridge.
//
// Connects to Feishu/Lark via the Lark Suite SDK (WSClient long-connection).
// Receives messages, normalizes them, and sends replies via the IM API.
//
// Inspired by AgentConnect's Feishu implementation:
// - WSClient long-connection (outbound WebSocket, NAT-friendly)
// - CardKit streaming cards for agent replies
// - Event normalization from im.message.receive_v1
// - Connection consolidation by appId
//
// This is a stub implementation — the actual SDK integration
// will be wired when the Lark SDK is installed as a dependency.

import type {
  Channel,
  ChannelInfo,
  ChannelMessage,
} from "@cubecloud/platform-core";

// ── Types ─────────────────────────────────────────────────

/** Configuration for the Feishu channel. */
export interface FeishuConfig {
  /** App ID from Feishu Developer Console (cli_...). */
  appId: string;
  /** App Secret from Feishu Developer Console. */
  appSecret: string;
  /** Region: "feishu" (open.feishu.cn) or "lark" (open.larksuite.com). */
  region?: "feishu" | "lark";
  /** Optional: verification token for HTTP callback mode. */
  verificationToken?: string;
  /** Optional: encrypt key for HTTP callback mode. */
  encryptKey?: string;
}

/** A raw Feishu event (simplified shape for parsing). */
interface FeishuEvent {
  event_type: string;
  event: {
    message?: {
      message_id: string;
      chat_id: string;
      message_type: string;
      chat_type?: string;
      content: string;
      sender: {
        sender_id: {
          open_id?: string;
          union_id?: string;
          user_id?: string;
        };
        sender_type: string;
      };
    };
  };
}

// ── parseFeishuEvent ──────────────────────────────────────

/** Parse a raw Feishu event into a ChannelMessage.
 *  Returns null for non-message events. */
export function parseFeishuEvent(event: FeishuEvent): ChannelMessage | null {
  if (event.event_type !== "im.message.receive_v1") {
    return null;
  }

  const msg = event.event?.message;
  if (!msg) return null;

  const senderId =
    msg.sender?.sender_id?.open_id ??
    msg.sender?.sender_id?.union_id ??
    msg.sender?.sender_id?.user_id ??
    "unknown";

  const isBot = msg.sender?.sender_type === "app";
  const isDm = msg.chat_type === "p2p";

  // Extract text and mentioned bots based on message type
  let text = "";
  const mentionedBots: string[] = [];

  try {
    const content = JSON.parse(msg.content);

    if (msg.message_type === "text") {
      text = content.text ?? "";
      // Check for @mentions in text: @<user_id>
      const mentionRe = /@_user_([a-zA-Z0-9_]+)/g;
      let match: RegExpExecArray | null;
      const mentionRe2 = new RegExp(mentionRe);
      while ((match = mentionRe2.exec(text)) !== null) {
        mentionedBots.push(match[1]);
      }
    } else if (msg.message_type === "post") {
      // Rich text: extract text segments and @mentions
      const segments = content.content ?? [];
      for (const line of segments) {
        if (!Array.isArray(line)) continue;
        for (const seg of line) {
          if (seg.tag === "text") {
            text += seg.text ?? "";
          } else if (seg.tag === "at") {
            text += `@${seg.user_name ?? seg.user_id ?? ""} `;
            if (seg.user_id) {
              mentionedBots.push(seg.user_id);
            }
          }
        }
        text += "\n";
      }
      text = text.trim();
    }
  } catch {
    // Content parsing failed — use raw content as text
    text = msg.content;
  }

  return {
    msgId: msg.message_id,
    platform: "feishu",
    channel: msg.chat_id,
    sender: {
      id: senderId,
      isBot,
    },
    text,
    isDm,
    mentionedBots,
  };
}

// ── createFeishuChannel ───────────────────────────────────

/** Create a Feishu channel adapter.
 *  This is a stub — the actual SDK connection will be wired
 *  when @larksuiteoapi/node-sdk is installed. */
export function createFeishuChannel(config: FeishuConfig): Channel {
  let _connected = false;

  return {
    platform: "feishu",

    async start(): Promise<void> {
      // TODO: Wire @larksuiteoapi/node-sdk WSClient
      // The SDK establishes a WebSocket long-connection to Feishu.
      // Events are received via the WSClient event emitter.
      // For now, this is a stub that marks the channel as "started".
      _connected = true;
      void config; // suppress unused warning
    },

    async stop(): Promise<void> {
      _connected = false;
    },

    async sendMessage(_target: string, _text: string): Promise<boolean> {
      // TODO: Wire @larksuiteoapi/node-sdk im.message.reply or
      // CardKit card.create → cardElement.content → card.update
      // For now, returns false because no real connection exists.
      if (!_connected) return false;
      return false; // stub — will return true when SDK is wired
    },

    async getChannelInfo(channel: string): Promise<ChannelInfo> {
      // TODO: Wire @larksuiteoapi/node-sdk im.chat.get
      return {
        name: channel,
        isPrivate: false,
      };
    },
  };
}