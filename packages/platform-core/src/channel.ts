// channel.ts — G1: IM Channel interface + router.
//
// ARCHITECTURAL STATUS (V2.10.79 audit):
// The Hermes gateway already handles all IM platform connections
// (Telegram, Discord, Slack, Feishu, DingTalk, WeCom, WhatsApp,
// Signal, Matrix). The desktop is a control plane that monitors
// gateway status — it does NOT run its own webhook servers.
//
// What's kept here:
//   - ChannelMessage / NormalizedMessage types — useful for rendering
//     IM messages in the desktop's chat view if Hermes forwards them
//   - normalizeMessage() — adds traceId + timestamp to raw messages
//   - parseFeishuEvent / parseDingTalkEvent / parseWeComEvent (in the
//     channels/ directory) — event parsers, useful as rendering utils
//
// What's architecturally unnecessary (kept for now, not wired):
//   - Channel interface, ChannelRouter, createChannelRouter — these
//     would duplicate what Hermes already does. Do NOT build webhook
//     servers in the desktop.
//
// Inspired by AgentConnect's PlatformConnection interface and
// NormalizedPlatformMessage schema, adapted to the Cubecloud Agent Desktop.

// ── Types ─────────────────────────────────────────────────

/** A raw message from an IM platform (before normalization). */
export interface ChannelMessage {
  msgId: string;
  platform: string;
  channel: string;
  thread?: string;
  sender: {
    id: string;
    name?: string;
    isBot: boolean;
  };
  text: string;
  isDm: boolean;
  mentionedBots: string[];
  attachments?: Array<{
    id: string;
    name: string;
    mimeType: string;
    size?: number;
    sourceUrl: string;
  }>;
  trigger?: "mention" | "dm" | "keyword" | "auto";
  traceId?: string;
}

/** A normalized message (after normalization, ready for routing). */
export interface NormalizedMessage extends ChannelMessage {
  traceId: string;
  timestamp: number;
}

/** Channel info returned by getChannelInfo. */
export interface ChannelInfo {
  name: string;
  isPrivate: boolean;
}

/** Configuration for a channel instance. */
export interface ChannelConfig {
  platform: string;
  credentials: Record<string, string>;
  options?: Record<string, unknown>;
}

/** The common interface for all IM channel adapters. */
export interface Channel {
  /** The platform name (e.g. "wecom", "dingtalk", "feishu"). */
  readonly platform: string;
  /** Start the channel connection. */
  start(): Promise<void>;
  /** Stop the channel connection. */
  stop(): Promise<void>;
  /** Send a message to a channel/target. */
  sendMessage(target: string, text: string): Promise<boolean>;
  /** Get info about a channel. */
  getChannelInfo(channel: string): Promise<ChannelInfo>;
}

/** The channel router that manages all registered channels. */
export interface ChannelRouter {
  /** Get a channel by platform name. */
  getChannel(platform: string): Channel | undefined;
  /** List all registered platform names. */
  listChannels(): string[];
  /** Send a message to a specific platform's channel. */
  sendToChannel(platform: string, target: string, text: string): Promise<boolean>;
  /** Handle an inbound message — normalize and return it. */
  handleInbound(raw: ChannelMessage): NormalizedMessage;
  /** Stop all channels. */
  stopAll(): Promise<void>;
}

// ── normalizeMessage ──────────────────────────────────────

/** Normalize a raw channel message into the standard schema. */
export function normalizeMessage(raw: ChannelMessage): NormalizedMessage {
  return {
    ...raw,
    traceId: raw.traceId ?? `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  };
}

// ── createChannelRouter ───────────────────────────────────

/** Create a channel router from a map of channel adapters. */
export function createChannelRouter(
  channels: ReadonlyMap<string, Channel>,
): ChannelRouter {
  return {
    getChannel(platform: string): Channel | undefined {
      return channels.get(platform);
    },

    listChannels(): string[] {
      return Array.from(channels.keys());
    },

    async sendToChannel(
      platform: string,
      target: string,
      text: string,
    ): Promise<boolean> {
      const channel = channels.get(platform);
      if (!channel) return false;
      return channel.sendMessage(target, text);
    },

    handleInbound(raw: ChannelMessage): NormalizedMessage {
      return normalizeMessage(raw);
    },

    async stopAll(): Promise<void> {
      for (const channel of channels.values()) {
        await channel.stop();
      }
    },
  };
}