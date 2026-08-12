// G2: SwarmManager tests.
//
// SwarmManager manages subagent lifecycle: create, monitor, terminate.
// Each subagent gets a fresh context window and read-only tools (from P10).
// Max 5 concurrent subagents.

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  type SwarmManager,
  type SwarmAgent,
  type SwarmMessage,
  createSwarmManager,
  MAX_CONCURRENT_SUBAGENTS,
} from "../src/swarm";

// ── Mock HarnessRouter for subagent dispatch ───────────────

function makeMockRouter() {
  return {
    async *runTurn(_sessionId: string, input: { message: string }) {
      yield { type: "text" as const, content: `result: ${input.message}` };
      yield { type: "done" as const, sessionId: _sessionId };
    },
    getActiveProvider: () => "hermes",
    async close() {},
  };
}

// ── SwarmManager tests ────────────────────────────────────

describe("SwarmManager", () => {
  let swarm: SwarmManager;

  beforeEach(() => {
    swarm = createSwarmManager(makeMockRouter());
  });

  it("starts with no agents", () => {
    expect(swarm.listAgents()).toEqual([]);
    expect(swarm.getActiveCount()).toBe(0);
  });

  it("creates a subagent with a unique id", () => {
    const agent = swarm.createSubagent("Research the architecture");
    expect(agent.id).toBeDefined();
    expect(agent.message).toBe("Research the architecture");
    expect(agent.status).toBe("pending");
    expect(agent.tools).toContain("read");
    expect(agent.tools).toContain("search");
    expect(agent.tools).not.toContain("write");
  });

  it("lists created agents", () => {
    swarm.createSubagent("task 1");
    swarm.createSubagent("task 2");
    expect(swarm.listAgents()).toHaveLength(2);
  });

  it("getActiveCount returns only non-terminated agents", () => {
    const a1 = swarm.createSubagent("task 1");
    swarm.createSubagent("task 2");
    expect(swarm.getActiveCount()).toBe(2);
    swarm.terminate(a1.id);
    expect(swarm.getActiveCount()).toBe(1);
  });

  it("terminates an agent by id", () => {
    const agent = swarm.createSubagent("test");
    const result = swarm.terminate(agent.id);
    expect(result).toBe(true);
    expect(swarm.getActiveCount()).toBe(0);
  });

  it("terminate returns false for unknown id", () => {
    expect(swarm.terminate("nonexistent")).toBe(false);
  });

  it("enforces max concurrent subagents", () => {
    for (let i = 0; i < MAX_CONCURRENT_SUBAGENTS; i++) {
      swarm.createSubagent(`task ${i}`);
    }
    expect(swarm.getActiveCount()).toBe(MAX_CONCURRENT_SUBAGENTS);
    // Creating one more should fail
    const overLimit = swarm.createSubagent("over limit");
    expect(overLimit).toBeNull();
    expect(swarm.getActiveCount()).toBe(MAX_CONCURRENT_SUBAGENTS);
  });

  it("records messages between agents", () => {
    const a1 = swarm.createSubagent("research");
    swarm.recordMessage({
      fromId: "main",
      toId: a1.id,
      text: "start research",
    });
    const messages = swarm.getMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].text).toBe("start research");
    expect(messages[0].fromId).toBe("main");
    expect(messages[0].toId).toBe(a1.id);
  });

  it("getMessages returns all recorded messages", () => {
    const a1 = swarm.createSubagent("t1");
    swarm.recordMessage({ fromId: "main", toId: a1.id, text: "msg 1" });
    swarm.recordMessage({ fromId: a1.id, toId: "main", text: "reply 1" });
    swarm.recordMessage({ fromId: "main", toId: a1.id, text: "msg 2" });
    expect(swarm.getMessages()).toHaveLength(3);
  });

  it("clear removes all agents and messages", () => {
    swarm.createSubagent("t1");
    swarm.recordMessage({ fromId: "main", toId: "t1", text: "msg" });
    swarm.clear();
    expect(swarm.listAgents()).toEqual([]);
    expect(swarm.getMessages()).toEqual([]);
  });

  it("getAgent returns an agent by id", () => {
    const agent = swarm.createSubagent("test");
    const found = swarm.getAgent(agent.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(agent.id);
  });

  it("getAgent returns undefined for unknown id", () => {
    expect(swarm.getAgent("nonexistent")).toBeUndefined();
  });
});

describe("MAX_CONCURRENT_SUBAGENTS", () => {
  it("is 5", () => {
    expect(MAX_CONCURRENT_SUBAGENTS).toBe(5);
  });
});