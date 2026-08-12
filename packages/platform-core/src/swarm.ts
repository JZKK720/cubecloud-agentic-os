// swarm.ts — G2: Agent Swarm Manager.
//
// Manages subagent lifecycle: create, monitor, terminate.
// Each subagent gets a fresh context window and read-only tools (from P10).
// Max 5 concurrent subagents to prevent resource exhaustion.
//
// Inspired by OpenOcta's Agent Swarm (蜂群协作) and our P10 subagent
// infrastructure, adapted to the Cubecloud Agent Desktop.

import type { HarnessRouter } from "./harness";
import { READ_ONLY_TOOLS, runSubagent, type SubagentConfig } from "./subagent";

// ── Constants ─────────────────────────────────────────────

/** Maximum concurrent subagents to prevent resource exhaustion. */
export const MAX_CONCURRENT_SUBAGENTS = 5;

// ── Types ─────────────────────────────────────────────────

/** The status of a swarm agent. */
export type SwarmAgentStatus = "pending" | "running" | "done" | "failed" | "terminated";

/** A subagent in the swarm. */
export interface SwarmAgent {
  id: string;
  message: string;
  status: SwarmAgentStatus;
  tools: string[];
  createdAt: number;
  result?: string;
  error?: string;
}

/** A message between agents in the swarm. */
export interface SwarmMessage {
  id: string;
  fromId: string;
  toId: string;
  text: string;
  timestamp: number;
}

/** The swarm manager interface. */
export interface SwarmManager {
  /** Create a new subagent. Returns null if max concurrent reached. */
  createSubagent(message: string, tools?: string[]): SwarmAgent | null;
  /** Get an agent by id. */
  getAgent(id: string): SwarmAgent | undefined;
  /** List all agents. */
  listAgents(): SwarmAgent[];
  /** Get the count of non-terminated agents. */
  getActiveCount(): number;
  /** Terminate an agent by id. */
  terminate(id: string): boolean;
  /** Record a message between agents. */
  recordMessage(msg: Omit<SwarmMessage, "id" | "timestamp">): void;
  /** Get all recorded messages. */
  getMessages(): SwarmMessage[];
  /** Clear all agents and messages. */
  clear(): void;
}

// ── createSwarmManager ────────────────────────────────────

/** Create a swarm manager with the given harness router. */
export function createSwarmManager(router: HarnessRouter): SwarmManager {
  const _agents = new Map<string, SwarmAgent>();
  const _messages: SwarmMessage[] = [];
  let _seq = 0;

  function generateId(): string {
    return `subagent-${Date.now()}-${_seq++}-${Math.random().toString(36).slice(2, 6)}`;
  }

  return {
    createSubagent(message: string, tools?: string[]): SwarmAgent | null {
      // Enforce max concurrent
      const activeCount = Array.from(_agents.values()).filter(
        (a) => a.status !== "terminated" && a.status !== "done" && a.status !== "failed",
      ).length;

      if (activeCount >= MAX_CONCURRENT_SUBAGENTS) {
        return null;
      }

      const agent: SwarmAgent = {
        id: generateId(),
        message,
        status: "pending",
        tools: tools ?? [...READ_ONLY_TOOLS],
        createdAt: Date.now(),
      };

      _agents.set(agent.id, agent);

      // Fire and forget — the actual subagent run is async
      // and updates the agent status when it completes.
      void (async () => {
        const config: SubagentConfig = {
          message,
          tools: agent.tools,
          readOnly: true,
          freshContext: true,
          sessionId: agent.id,
        };

        _agents.set(agent.id, { ...agent, status: "running" });

        try {
          const result = await runSubagent(router, config);
          if (result.success) {
            _agents.set(agent.id, {
              ...agent,
              status: "done",
              result: result.summary,
            });
          } else {
            _agents.set(agent.id, {
              ...agent,
              status: "failed",
              error: result.errors?.join("; ") ?? "unknown error",
            });
          }
        } catch (err) {
          _agents.set(agent.id, {
            ...agent,
            status: "failed",
            error: (err as Error).message,
          });
        }
      })();

      return agent;
    },

    getAgent(id: string): SwarmAgent | undefined {
      return _agents.get(id);
    },

    listAgents(): SwarmAgent[] {
      return Array.from(_agents.values());
    },

    getActiveCount(): number {
      return Array.from(_agents.values()).filter(
        (a) => a.status !== "terminated" && a.status !== "done" && a.status !== "failed",
      ).length;
    },

    terminate(id: string): boolean {
      const agent = _agents.get(id);
      if (!agent) return false;
      _agents.set(id, { ...agent, status: "terminated" });
      return true;
    },

    recordMessage(msg: Omit<SwarmMessage, "id" | "timestamp">): void {
      _messages.push({
        ...msg,
        id: `msg-${Date.now()}-${_seq++}`,
        timestamp: Date.now(),
      });
    },

    getMessages(): SwarmMessage[] {
      return [..._messages];
    },

    clear(): void {
      _agents.clear();
      _messages.length = 0;
    },
  };
}