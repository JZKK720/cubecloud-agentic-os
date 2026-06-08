import type {
  AgentChatMessage,
  AgentChatSession,
  AgentSessionHistoryItem,
  PlatformRuntimeProviderId,
  PlatformRuntimeSurfaceMode,
} from "@cubecloud/platform-core";

export type ChatRequestMode = "default" | "plan" | "build";

export interface ChatRequestModeOption {
  value: ChatRequestMode;
  label: string;
  description: string;
}

const CHAT_REQUEST_MODE_OPTIONS: Record<
  PlatformRuntimeProviderId,
  ChatRequestModeOption[]
> = {
  hermes: [
    {
      value: "default",
      label: "Default",
      description: "Balanced operator request with no extra posture prompt.",
    },
    {
      value: "plan",
      label: "Plan",
      description: "Bias the runtime toward analysis, sequencing, and change review first.",
    },
    {
      value: "build",
      label: "Build",
      description: "Bias the runtime toward concrete implementation and verification steps.",
    },
  ],
  ironclaw: [
    {
      value: "default",
      label: "Default",
      description: "Balanced operator request with no extra posture prompt.",
    },
    {
      value: "build",
      label: "Build",
      description: "Push toward direct execution, edits, and runtime validation.",
    },
  ],
  openclaw: [
    {
      value: "default",
      label: "Default",
      description: "Balanced operator request with no extra posture prompt.",
    },
    {
      value: "plan",
      label: "Plan",
      description: "Push toward decomposition, review, and scoped action planning.",
    },
  ],
};

const CHAT_REQUEST_MODE_PROMPTS: Partial<Record<ChatRequestMode, string>> = {
  plan:
    "Operate in planning mode. Prioritize analysis, sequencing, tradeoffs, and safe next steps before proposing implementation.",
  build:
    "Operate in implementation mode. Prioritize direct action, concrete changes, and verification details.",
};

export function getChatRequestModeOptions(
  runtimeProviderId: PlatformRuntimeProviderId | null | undefined,
): ChatRequestModeOption[] {
  return runtimeProviderId
    ? CHAT_REQUEST_MODE_OPTIONS[runtimeProviderId]
    : CHAT_REQUEST_MODE_OPTIONS.hermes;
}

export function buildChatRequestMessages(
  history: AgentChatMessage[],
  userMessage: AgentChatMessage,
  mode: ChatRequestMode,
): Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }> {
  const prompt = CHAT_REQUEST_MODE_PROMPTS[mode];
  const messages = [...history, userMessage].map((message) => ({
    role: message.role,
    content: message.content,
  }));

  if (!prompt) {
    return messages;
  }

  return [{ role: "system", content: prompt }, ...messages];
}

export function filterAgentSessions(
  sessions: AgentChatSession[],
  query: string,
): AgentChatSession[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return sessions;
  }

  return sessions.filter((session) =>
    [session.title, session.model, session.source]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(normalizedQuery)),
  );
}

export function supportsLocalSessionHistory(
  runtimeProviderId: PlatformRuntimeProviderId | null | undefined,
  _surfaceMode: PlatformRuntimeSurfaceMode | null | undefined,
): boolean {
  return Boolean(runtimeProviderId);
}

export function supportsSessionResume(
  _runtimeProviderId: PlatformRuntimeProviderId | null | undefined,
  _surfaceMode: PlatformRuntimeSurfaceMode | null | undefined,
  surfaceUrl: string | null | undefined,
  sessionId: string | null | undefined,
): boolean {
  return Boolean(sessionId) && Boolean(surfaceUrl);
}

export function sessionHistoryToChatMessages(
  history: AgentSessionHistoryItem[],
): AgentChatMessage[] {
  return history.reduce<AgentChatMessage[]>((messages, item) => {
    if (item.kind === "user") {
      messages.push({
        id: `session-user-${item.id}`,
        role: "user",
        content: item.content,
        timestamp: item.timestamp,
      });
    }

    if (item.kind === "assistant") {
      messages.push({
        id: `session-assistant-${item.id}`,
        role: "assistant",
        content: item.content,
        timestamp: item.timestamp,
      });
    }

    return messages;
  }, []);
}

export function chatMessagesToSessionHistory(
  messages: AgentChatMessage[],
): AgentSessionHistoryItem[] {
  return messages.reduce<AgentSessionHistoryItem[]>((history, message, index) => {
    if (message.role === "user") {
      history.push({
        kind: "user",
        id: index + 1,
        content: message.content,
        timestamp: message.timestamp,
      });
    }

    if (message.role === "assistant") {
      history.push({
        kind: "assistant",
        id: index + 1,
        content: message.content,
        timestamp: message.timestamp,
      });
    }

    return history;
  }, []);
}

export function summarizeSessionHistory(history: AgentSessionHistoryItem[]): {
  transcriptCount: number;
  reasoningCount: number;
  toolCallCount: number;
  toolResultCount: number;
} {
  return history.reduce(
    (summary, item) => {
      switch (item.kind) {
        case "user":
        case "assistant":
          summary.transcriptCount += 1;
          break;
        case "reasoning":
          summary.reasoningCount += 1;
          break;
        case "tool_call":
          summary.toolCallCount += 1;
          break;
        case "tool_result":
          summary.toolResultCount += 1;
          break;
      }

      return summary;
    },
    {
      transcriptCount: 0,
      reasoningCount: 0,
      toolCallCount: 0,
      toolResultCount: 0,
    },
  );
}