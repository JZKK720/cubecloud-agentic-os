/**
 * V2.10.65 — IronClaw Sandbox Tasks shared types.
 *
 * The IronClaw gateway (container port 3000, host port 3231) exposes
 * an OpenAI-compatible /v1/chat/completions surface. The WASM sandbox
 * runs inside the chat path — when the model calls a tool, IronClaw
 * spins up a WASM sandbox container and executes the tool in
 * isolation. There is no separate sandbox API; the sandbox is the
 * execution environment for tool calls within chat completions.
 *
 * This module defines the types shared between the main process
 * (src/main/ironclaw-sandbox.ts), the preload bridge, and the
 * renderer screen (SandboxTasks.tsx).
 *
 * Security floor: the bearer token is never stored in these types.
 * It is passed at runtime from the renderer's connection form and
 * held in process memory for the duration of one IPC call.
 */

export interface SandboxConnection {
  url: string;
  healthy: boolean;
  channel: string;
  status: string;
  latencyMs: number;
  error: string | null;
}

export interface SandboxModel {
  id: string;
  ownedBy: string;
  created: number;
}

export interface SandboxToolCall {
  name: string;
  args: string;
  result: string;
}

export interface SandboxTaskRequest {
  model: string;
  message: string;
  contextFolder?: string;
}

export interface SandboxTaskResult {
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
}