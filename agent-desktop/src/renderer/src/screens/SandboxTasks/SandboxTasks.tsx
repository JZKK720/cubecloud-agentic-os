/**
 * V2.10.65 — IronClaw Sandbox Tasks screen.
 *
 * A specialized chat interface for the IronClaw gateway that
 * dispatches tasks with WASM-sandboxed tool execution. The screen
 * sends POST /v1/chat/completions to the IronClaw gateway (port 3231)
 * and displays the reply, tool calls, and sandbox execution status.
 *
 * The WASM sandbox runs inside the chat path — IronClaw executes tool
 * calls in isolated WASM containers during chat completions. There
 * is no separate sandbox API; this screen is a chat UI with
 * sandbox-aware result display.
 *
 * Security floor: the bearer token is held in React state and passed
 * to the IPC bridge. It is never persisted to disk and never logged.
 */

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../../components/useI18n";
import {
  Refresh,
  Alert as AlertIcon,
  Send,
  CheckCircle,
  XCircle,
  Clock,
} from "../../assets/icons";

type SandboxConnection = {
  url: string;
  healthy: boolean;
  channel: string;
  status: string;
  latencyMs: number;
  error: string | null;
};

type SandboxModel = {
  id: string;
  ownedBy: string;
  created: number;
};

type SandboxToolCall = {
  name: string;
  args: string;
  result: string;
};

type SandboxTaskResult = {
  ok: boolean;
  reply: string;
  model: string;
  toolCalls: SandboxToolCall[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  error?: string;
};

const DEFAULT_IRONCLAW_URL = "http://127.0.0.1:3231/api/health";

export default function SandboxTasks({
  visible,
}: {
  visible: boolean;
}): React.JSX.Element {
  const { t } = useI18n();
  const [gatewayUrl, setGatewayUrl] = useState(DEFAULT_IRONCLAW_URL);
  const [token, setToken] = useState("");
  const [connection, setConnection] = useState<SandboxConnection | null>(null);
  const [models, setModels] = useState<SandboxModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [taskInput, setTaskInput] = useState("");
  const [contextFolder, setContextFolder] = useState("");
  const [result, setResult] = useState<SandboxTaskResult | null>(null);
  const [probing, setProbing] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const probeGateway = useCallback(async () => {
    setProbing(true);
    setError(null);
    try {
      const conn = await window.hermesAPI.ironclawProbe(
        gatewayUrl,
        token || undefined,
      );
      setConnection(conn);
      if (conn.healthy) {
        const modelList = await window.hermesAPI.ironclawModels(
          gatewayUrl,
          token || undefined,
        );
        setModels(modelList);
        if (modelList.length > 0 && !selectedModel) {
          setSelectedModel(modelList[0].id);
        }
      } else {
        setModels([]);
      }
    } catch (err) {
      setError((err as Error).message);
      setConnection(null);
    } finally {
      setProbing(false);
    }
  }, [gatewayUrl, token, selectedModel]);

  const dispatchTask = useCallback(async () => {
    if (!taskInput.trim() || !selectedModel) return;
    setDispatching(true);
    setError(null);
    setResult(null);
    try {
      const res = await window.hermesAPI.ironclawDispatch(
        gatewayUrl,
        token || undefined,
        {
          model: selectedModel,
          message: taskInput,
          contextFolder: contextFolder || undefined,
        },
      );
      setResult(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDispatching(false);
    }
  }, [gatewayUrl, token, selectedModel, taskInput, contextFolder]);

  useEffect(() => {
    if (visible && !connection) {
      void probeGateway();
    }
  }, [visible, connection, probeGateway]);

  if (!visible) return <></>;

  return (
    <div className="screen sandbox-tasks-screen">
      <div className="sandbox-tasks-header">
        <h2>{t("sandboxTasks.title", { defaultValue: "Sandbox Tasks" })}</h2>
        <p className="sandbox-tasks-subtitle">
          {t(
            "sandboxTasks.subtitle",
            { defaultValue: "Dispatch tasks to the IronClaw WASM-sandbox gateway. Tool calls execute in isolated sandbox containers." },
          )}
        </p>
      </div>

      {/* Connection panel */}
      <div className="sandbox-tasks-card">
        <label className="sandbox-tasks-label">
          {t("sandboxTasks.gatewayUrl", { defaultValue: "IronClaw Gateway URL" })}
        </label>
        <div className="sandbox-tasks-row">
          <input
            type="url"
            className="sandbox-tasks-input"
            value={gatewayUrl}
            onChange={(e) => setGatewayUrl(e.target.value)}
            placeholder={DEFAULT_IRONCLAW_URL}
          />
          <button
            className="btn btn-secondary"
            onClick={probeGateway}
            disabled={probing}
          >
            <Refresh size={14} />
            {probing
              ? t("sandboxTasks.probing", { defaultValue: "Probing..." })
              : t("sandboxTasks.connect", { defaultValue: "Connect" })}
          </button>
        </div>

        <label className="sandbox-tasks-label">
          {t("sandboxTasks.bearerToken", { defaultValue: "Bearer token (optional)" })}
        </label>
        <input
          type="password"
          className="sandbox-tasks-input"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste the IronClaw GATEWAY_AUTH_TOKEN"
        />

        {connection && (
          <div className="sandbox-tasks-status">
            {connection.healthy ? (
              <span className="sandbox-tasks-status-ok">
                <CheckCircle size={14} /> {t("sandboxTasks.connected", { defaultValue: "Connected" })} ({connection.latencyMs}ms)
              </span>
            ) : (
              <span className="sandbox-tasks-status-err">
                <XCircle size={14} /> {connection.error || t("sandboxTasks.notConnected", { defaultValue: "Not connected" })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Model picker */}
      {connection?.healthy && models.length > 0 && (
        <div className="sandbox-tasks-card">
          <label className="sandbox-tasks-label">
            {t("sandboxTasks.model", { defaultValue: "Model" })}
          </label>
          <select
            className="sandbox-tasks-select"
            title={t("sandboxTasks.model", { defaultValue: "Model" })}
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id} ({m.ownedBy})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Task input */}
      {connection?.healthy && (
        <div className="sandbox-tasks-card">
          <label className="sandbox-tasks-label">
            {t("sandboxTasks.contextFolder", { defaultValue: "Context folder (optional)" })}
          </label>
          <input
            type="text"
            className="sandbox-tasks-input"
            value={contextFolder}
            onChange={(e) => setContextFolder(e.target.value)}
            placeholder="/path/to/project"
          />

          <label className="sandbox-tasks-label">
            {t("sandboxTasks.taskDescription", { defaultValue: "Describe the task" })}
          </label>
          <textarea
            className="sandbox-tasks-textarea"
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            placeholder="Execute this Python code in the WASM sandbox and return the output: print(sum(range(100)))"
            rows={4}
          />
          <button
            className="btn btn-primary"
            onClick={dispatchTask}
            disabled={dispatching || !taskInput.trim() || !selectedModel}
          >
            <Send size={14} />
            {dispatching
              ? t("sandboxTasks.dispatching", { defaultValue: "Dispatching..." })
              : t("sandboxTasks.sendToSandbox", { defaultValue: "Send to Sandbox" })}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="sandbox-tasks-error">
          <AlertIcon size={14} /> {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="sandbox-tasks-card sandbox-tasks-result">
          <div className="sandbox-tasks-result-header">
            {result.ok ? (
              <span className="sandbox-tasks-status-ok">
                <CheckCircle size={14} /> {t("sandboxTasks.completed", { defaultValue: "Completed" })} ({result.latencyMs}ms)
              </span>
            ) : (
              <span className="sandbox-tasks-status-err">
                <XCircle size={14} /> {t("sandboxTasks.failed", { defaultValue: "Failed" })}
              </span>
            )}
            <span className="sandbox-tasks-result-model">{result.model}</span>
            <span className="sandbox-tasks-result-usage">
              <Clock size={12} /> {result.usage.promptTokens}p / {result.usage.completionTokens}c
            </span>
          </div>

          {result.reply && (
            <div className="sandbox-tasks-reply">
              <label className="sandbox-tasks-label">
                {t("sandboxTasks.reply", { defaultValue: "Reply" })}
              </label>
              <pre className="sandbox-tasks-pre">{result.reply}</pre>
            </div>
          )}

          {result.toolCalls.length > 0 && (
            <div className="sandbox-tasks-tool-calls">
              <label className="sandbox-tasks-label">
                {t("sandboxTasks.toolCalls", { defaultValue: "Tool calls (WASM sandbox)" })}
              </label>
              {result.toolCalls.map((tc, i) => (
                <div key={i} className="sandbox-tasks-tool-call">
                  <span className="sandbox-tasks-tool-name">{tc.name}</span>
                  {tc.args && (
                    <pre className="sandbox-tasks-tool-args">{tc.args}</pre>
                  )}
                </div>
              ))}
            </div>
          )}

          {result.error && (
            <div className="sandbox-tasks-error">
              <AlertIcon size={14} /> {result.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}