import { useState, useEffect, useCallback, useMemo } from "react";
import { useI18n } from "../../components/useI18n";
import TopologyGraph, {
  type TopologyNode,
  type TopologyEdge,
} from "./TopologyGraph";

// ── Types ─────────────────────────────────────────────────

interface SwarmAgentInfo {
  id: string;
  message: string;
  status: "pending" | "running" | "done" | "failed" | "terminated";
  tools: string[];
  createdAt: number;
  result?: string;
  error?: string;
}

interface SwarmMessageInfo {
  id: string;
  fromId: string;
  toId: string;
  text: string;
  timestamp: number;
}

// ── Component ─────────────────────────────────────────────

function Swarm(): React.JSX.Element {
  const { t } = useI18n();
  const [agents, setAgents] = useState<SwarmAgentInfo[]>([]);
  const [messages, setMessages] = useState<SwarmMessageInfo[]>([]);
  const [newTask, setNewTask] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const agentList = await window.hermesAPI.listSwarmAgents();
      setAgents(agentList);
      const msgList = await window.hermesAPI.getSwarmMessages();
      setMessages(msgList);
    } catch {
      // Transient IPC failure — leave previous state
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleCreate(): Promise<void> {
    const message = newTask.trim();
    if (!message) return;
    setError("");
    try {
      const result = await window.hermesAPI.createSwarmSubagent(message);
      if (!result) {
        setError(t("swarm.maxReached"));
        return;
      }
      setNewTask("");
      await refresh();
    } catch (err) {
      setError(
        (err as Error).message?.slice(0, 200) || t("swarm.createFailed"),
      );
    }
  }

  async function handleTerminate(id: string): Promise<void> {
    await window.hermesAPI.terminateSwarmAgent(id);
    await refresh();
  }

  async function handleClear(): Promise<void> {
    await window.hermesAPI.clearSwarm();
    await refresh();
  }

  // i-have-adhd principle: cap visible agents at 5, collapse the rest
  const visibleAgents = agents.slice(0, 5);
  const hasMore = agents.length > 5;
  const activeCount = agents.filter(
    (a) =>
      a.status !== "terminated" && a.status !== "done" && a.status !== "failed",
  ).length;

  // Topology graph data (G2.3)
  const topologyNodes: TopologyNode[] = useMemo(
    () => [
      { id: "main", label: "Main Agent", status: "running", isMain: true },
      ...agents.map((a) => ({
        id: a.id,
        label: a.message.slice(0, 20),
        status: a.status,
      })),
    ],
    [agents],
  );

  const topologyEdges: TopologyEdge[] = useMemo(
    () =>
      agents.map((a) => ({
        from: "main",
        to: a.id,
        active: a.status === "running",
      })),
    [agents],
  );

  // Status colors matching existing patterns
  const statusColor = (status: string): string => {
    switch (status) {
      case "running":
        return "var(--accent-text)";
      case "done":
        return "var(--success)";
      case "failed":
        return "var(--error)";
      case "terminated":
        return "var(--text-muted)";
      default:
        return "var(--warning)";
    }
  };

  return (
    <div className="swarm-container">
      <div className="swarm-header">
        <div>
          <h2 className="swarm-title">{t("swarm.title")}</h2>
          <p className="swarm-subtitle">{t("swarm.subtitle")}</p>
        </div>
        <div className="swarm-header-actions">
          <span className="swarm-active-count">
            {activeCount}/5 {t("swarm.active")}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={handleClear}>
            {t("swarm.clear")}
          </button>
        </div>
      </div>

      {error && <div className="swarm-error">{error}</div>}

      {/* Task input — action-first (i-have-adhd principle) */}
      <div className="swarm-input-row">
        <input
          className="input swarm-input"
          type="text"
          placeholder={t("swarm.taskPlaceholder")}
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newTask.trim()) handleCreate();
          }}
        />
        <button
          className="btn btn-primary btn-sm"
          onClick={handleCreate}
          disabled={!newTask.trim() || activeCount >= 5}
        >
          {t("swarm.dispatch")}
        </button>
      </div>

      {/* Topology graph — visual swarm state (G2.3) */}
      {agents.length > 0 && (
        <div className="swarm-topology-section">
          <div className="swarm-topology-title">{t("swarm.topology")}</div>
          <TopologyGraph nodes={topologyNodes} edges={topologyEdges} />
        </div>
      )}

      {/* Agent list — visible wins (i-have-adhd principle) */}
      <div className="swarm-agents">
        {visibleAgents.length === 0 ? (
          <div className="swarm-empty">
            <p className="swarm-empty-text">{t("swarm.noAgents")}</p>
            <p className="swarm-empty-hint">{t("swarm.noAgentsHint")}</p>
          </div>
        ) : (
          visibleAgents.map((agent) => (
            <div key={agent.id} className="swarm-agent-card">
              <div className="swarm-agent-header">
                <span
                  className="swarm-agent-status-dot"
                  style={{ background: statusColor(agent.status) }}
                />
                <span className="swarm-agent-message">
                  {agent.message.length > 60
                    ? agent.message.slice(0, 60) + "…"
                    : agent.message}
                </span>
                <span
                  className="swarm-agent-status"
                  style={{ color: statusColor(agent.status) }}
                >
                  {agent.status}
                </span>
                {agent.status !== "terminated" && (
                  <button
                    className="btn-ghost swarm-agent-terminate"
                    onClick={() => handleTerminate(agent.id)}
                  >
                    ✕
                  </button>
                )}
              </div>
              {agent.result && (
                <div className="swarm-agent-result">
                  {agent.result.slice(0, 200)}
                  {agent.result.length > 200 ? "…" : ""}
                </div>
              )}
              {agent.error && (
                <div className="swarm-agent-error">{agent.error}</div>
              )}
            </div>
          ))
        )}
        {hasMore && (
          <div className="swarm-more">
            {t("swarm.moreAgents", { count: agents.length - 5 })}
          </div>
        )}
      </div>

      {/* Message flow — live inter-agent messages */}
      {messages.length > 0 && (
        <div className="swarm-messages">
          <div className="swarm-messages-title">{t("swarm.messageFlow")}</div>
          {messages.slice(-10).map((msg) => (
            <div key={msg.id} className="swarm-message">
              <span className="swarm-message-from">{msg.fromId}</span>
              <span className="swarm-message-arrow">→</span>
              <span className="swarm-message-to">{msg.toId}</span>
              <span className="swarm-message-text">{msg.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Swarm;
