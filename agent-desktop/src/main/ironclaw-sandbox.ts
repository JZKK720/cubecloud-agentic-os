/**
 * V2.10.65 — IronClaw Sandbox Tasks main process module.
 *
 * Provides three HTTP client functions for the IronClaw gateway:
 *   1. probeIronClawGateway  — GET /api/health (reachability + detection)
 *   2. listIronClawModels     — GET /v1/models (model picker)
 *   3. dispatchSandboxTask   — POST /v1/chat/completions (task dispatch)
 *
 * The WASM sandbox runs inside the chat path — IronClaw executes tool
 * calls in a WASM sandbox container during chat completions. There
 * is no separate sandbox API; this module sends standard
 * OpenAI-compatible chat completions and the sandbox is transparent
 * to the desktop.
 *
 * Security floor: the bearer token is passed as a function parameter
 * from the renderer's connection form. It is never read from disk,
 * never logged, and never persisted. It lives in process memory for
 * the duration of one IPC call.
 */

import http from "node:http";
import https from "node:https";
import { URL } from "node:url";
import type {
  SandboxConnection,
  SandboxModel,
  SandboxTaskRequest,
  SandboxTaskResult,
  SandboxToolCall,
} from "../shared/ironclaw-sandbox";

const PROBE_TIMEOUT_MS = 5000;
const CHAT_TIMEOUT_MS = 120000;

function buildHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function httpRequest(
  target: string,
  options: { method: string; headers: Record<string, string>; body?: string },
  timeout: number,
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch (err) {
      reject(new Error(`invalid URL: ${(err as Error).message}`));
      return;
    }
    const mod = parsed.protocol === "https:" ? https : http;
    const req = mod.request(
      {
        method: options.method,
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || undefined,
        path: parsed.pathname + parsed.search,
        headers: options.headers,
        timeout,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk: Buffer) => {
          body += chunk.toString("utf8");
        });
        res.on("end", () => {
          resolve({ statusCode: res.statusCode ?? 0, body });
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("request timed out"));
    });
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

/**
 * Probe the IronClaw gateway's /api/health endpoint.
 * Returns the connection status and the "channel" field that
 * distinguishes IronClaw from Hermes.
 */
export async function probeIronClawGateway(
  url: string,
  token?: string,
): Promise<SandboxConnection> {
  const startedAt = Date.now();
  const baseUrl = url.replace(/\/+$/, "").replace(/\/api\/health$/i, "");
  try {
    const { statusCode, body } = await httpRequest(
      `${baseUrl}/api/health`,
      { method: "GET", headers: buildHeaders(token) },
      PROBE_TIMEOUT_MS,
    );
    const latencyMs = Date.now() - startedAt;

    if (statusCode === 200) {
      let parsed: { status?: string; channel?: string } = {};
      try {
        parsed = JSON.parse(body);
      } catch {
        // non-JSON body — still reachable
      }
      return {
        url: baseUrl,
        healthy: true,
        channel: parsed.channel ?? "unknown",
        status: parsed.status ?? "ok",
        latencyMs,
        error: null,
      };
    }

    if (statusCode === 401 || statusCode === 403) {
      return {
        url: baseUrl,
        healthy: false,
        channel: "gateway",
        status: "auth-required",
        latencyMs,
        error: `auth rejected (${statusCode})`,
      };
    }

    return {
      url: baseUrl,
      healthy: false,
      channel: "unknown",
      status: "error",
      latencyMs,
      error: `unexpected status ${statusCode}`,
    };
  } catch (err) {
    return {
      url: baseUrl,
      healthy: false,
      channel: "unknown",
      status: "unreachable",
      latencyMs: Date.now() - startedAt,
      error: (err as Error).message,
    };
  }
}

/**
 * List models from the IronClaw gateway's /v1/models endpoint.
 */
export async function listIronClawModels(
  url: string,
  token?: string,
): Promise<SandboxModel[]> {
  const baseUrl = url.replace(/\/+$/, "").replace(/\/api\/health$/i, "");
  const { statusCode, body } = await httpRequest(
    `${baseUrl}/v1/models`,
    { method: "GET", headers: buildHeaders(token) },
    PROBE_TIMEOUT_MS,
  );

  if (statusCode !== 200) {
    throw new Error(`failed to list models: status ${statusCode}`);
  }

  const parsed = JSON.parse(body) as {
    data?: Array<{ id: string; owned_by?: string; created?: number }>;
  };
  return (parsed.data ?? []).map((m) => ({
    id: m.id,
    ownedBy: m.owned_by ?? "ironclaw",
    created: m.created ?? 0,
  }));
}

/**
 * Dispatch a sandbox task to the IronClaw gateway via
 * POST /v1/chat/completions. The WASM sandbox runs inside
 * the chat path — tool calls execute in isolated WASM containers
 * transparently.
 */
export async function dispatchSandboxTask(
  url: string,
  token: string | undefined,
  task: SandboxTaskRequest,
): Promise<SandboxTaskResult> {
  const startedAt = Date.now();
  const baseUrl = url.replace(/\/+$/, "").replace(/\/api\/health$/i, "");

  const messages: Array<{ role: string; content: string }> = [];

  if (task.contextFolder) {
    messages.push({
      role: "system",
      content: `The working folder for this task is ${task.contextFolder}. When the user asks you to read, create, modify, or run project files, use the file, terminal, and code-execution tools with absolute paths under this folder.`,
    });
  }

  messages.push({ role: "user", content: task.message });

  const requestBody = JSON.stringify({
    model: task.model,
    messages,
    stream: false,
  });

  try {
    const { statusCode, body } = await httpRequest(
      `${baseUrl}/v1/chat/completions`,
      {
        method: "POST",
        headers: buildHeaders(token),
        body: requestBody,
      },
      CHAT_TIMEOUT_MS,
    );

    const latencyMs = Date.now() - startedAt;

    if (statusCode !== 200) {
      let errorMsg = `HTTP ${statusCode}`;
      try {
        const errParsed = JSON.parse(body) as {
          error?: { message?: string };
        };
        if (errParsed.error?.message) {
          errorMsg = errParsed.error.message;
        }
      } catch {
        // non-JSON error body
      }
      return {
        ok: false,
        reply: "",
        model: task.model,
        toolCalls: [],
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        latencyMs,
        error: errorMsg,
      };
    }

    const parsed = JSON.parse(body) as {
      model?: string;
      choices?: Array<{
        message?: {
          content?: string;
          tool_calls?: Array<{
            function?: { name?: string; arguments?: string };
          }>;
        };
        finish_reason?: string;
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    const choice = parsed.choices?.[0];
    const reply = choice?.message?.content ?? "";
    const finishReason = choice?.finish_reason ?? "unknown";

    const toolCalls: SandboxToolCall[] = [];
    if (choice?.message?.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        toolCalls.push({
          name: tc.function?.name ?? "unknown",
          args: tc.function?.arguments ?? "",
          result: "",
        });
      }
    }

    return {
      ok: finishReason !== "error",
      reply,
      model: parsed.model ?? task.model,
      toolCalls,
      usage: {
        promptTokens: parsed.usage?.prompt_tokens ?? 0,
        completionTokens: parsed.usage?.completion_tokens ?? 0,
        totalTokens: parsed.usage?.total_tokens ?? 0,
      },
      latencyMs,
      error: finishReason === "error" ? "task completed with error" : undefined,
    };
  } catch (err) {
    return {
      ok: false,
      reply: "",
      model: task.model,
      toolCalls: [],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      latencyMs: Date.now() - startedAt,
      error: (err as Error).message,
    };
  }
}