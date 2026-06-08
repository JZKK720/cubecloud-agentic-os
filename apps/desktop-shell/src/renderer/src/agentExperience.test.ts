import { describe, expect, it } from "vitest";
import type {
  AgentChatMessage,
  AgentChatSession,
  AgentSessionHistoryItem,
} from "@cubecloud/platform-core";
import {
  buildChatRequestMessages,
  chatMessagesToSessionHistory,
  filterAgentSessions,
  getChatRequestModeOptions,
  sessionHistoryToChatMessages,
  summarizeSessionHistory,
  supportsSessionResume,
} from "./agentExperience";

describe("agentExperience", () => {
  it("filters sessions by title, model, and source", () => {
    const sessions: AgentChatSession[] = [
      {
        id: "sess-1",
        title: "Fix sidebar",
        startedAt: 1,
        messageCount: 8,
        model: "claude-sonnet",
        source: "local",
      },
      {
        id: "sess-2",
        title: "Research preview",
        startedAt: 2,
        messageCount: 3,
        model: "gpt-4.1",
        source: "remote",
      },
    ];

    expect(filterAgentSessions(sessions, "sidebar")).toHaveLength(1);
    expect(filterAgentSessions(sessions, "gpt")).toHaveLength(1);
    expect(filterAgentSessions(sessions, "remote")).toHaveLength(1);
  });

  it("prepends a planning posture prompt when plan mode is selected", () => {
    const history: AgentChatMessage[] = [
      {
        id: "assistant-1",
        role: "assistant",
        content: "How can I help?",
        timestamp: 10,
      },
    ];
    const userMessage: AgentChatMessage = {
      id: "user-1",
      role: "user",
      content: "Map the session gaps",
      timestamp: 20,
    };

    const messages = buildChatRequestMessages(history, userMessage, "plan");

    expect(messages[0]).toEqual(
      expect.objectContaining({ role: "system" }),
    );
    expect(messages.at(-1)).toEqual({
      role: "user",
      content: "Map the session gaps",
    });
  });

  it("maps only user and assistant history items back into chat bubbles", () => {
    const history: AgentSessionHistoryItem[] = [
      { kind: "reasoning", id: 1, assistantId: 1, text: "thinking", timestamp: 1 },
      { kind: "user", id: 2, content: "hello", timestamp: 2 },
      { kind: "assistant", id: 3, content: "hi", timestamp: 3 },
      { kind: "tool_result", id: 4, callId: "c1", name: "web", content: "ok", timestamp: 4 },
    ];

    expect(sessionHistoryToChatMessages(history)).toEqual([
      {
        id: "session-user-2",
        role: "user",
        content: "hello",
        timestamp: 2,
      },
      {
        id: "session-assistant-3",
        role: "assistant",
        content: "hi",
        timestamp: 3,
      },
    ]);
  });

  it("reports summary counts for transcript and event rows", () => {
    const summary = summarizeSessionHistory([
      { kind: "user", id: 1, content: "a", timestamp: 1 },
      { kind: "assistant", id: 2, content: "b", timestamp: 2 },
      { kind: "reasoning", id: 3, assistantId: 2, text: "r", timestamp: 2 },
      { kind: "tool_call", id: 4, assistantId: 2, callId: "c1", name: "web", args: "{}", timestamp: 2 },
      { kind: "tool_result", id: 5, callId: "c1", name: "web", content: "ok", timestamp: 3 },
    ]);

    expect(summary).toEqual({
      transcriptCount: 2,
      reasoningCount: 1,
      toolCallCount: 1,
      toolResultCount: 1,
    });
  });

  it("maps chat bubbles back into shell-owned session history rows", () => {
    expect(
      chatMessagesToSessionHistory([
        { id: "u1", role: "user", content: "hello", timestamp: 1 },
        { id: "a1", role: "assistant", content: "hi", timestamp: 2 },
        { id: "t1", role: "tool", content: "ignored", timestamp: 3 },
      ]),
    ).toEqual([
      { kind: "user", id: 1, content: "hello", timestamp: 1 },
      { kind: "assistant", id: 2, content: "hi", timestamp: 2 },
    ]);
  });

  it("allows shell session resume on any provider when a surface URL and session exist", () => {
    expect(supportsSessionResume("hermes", "desktop", "http://127.0.0.1:8642", "sess-1")).toBe(true);
    expect(supportsSessionResume("hermes", "docker", "http://127.0.0.1:8642", "sess-1")).toBe(true);
    expect(supportsSessionResume("ironclaw", "desktop", "http://127.0.0.1:8642", "sess-1")).toBe(true);
    expect(supportsSessionResume("hermes", "desktop", null, "sess-1")).toBe(false);
  });

  it("exposes backend-aware request mode options", () => {
    const hermesModes = getChatRequestModeOptions("hermes").map((option) => option.value);
    const ironclawModes = getChatRequestModeOptions("ironclaw").map((option) => option.value);

    expect(hermesModes).toEqual(["default", "plan", "build"]);
    expect(ironclawModes).toEqual(["default", "build"]);
  });
});