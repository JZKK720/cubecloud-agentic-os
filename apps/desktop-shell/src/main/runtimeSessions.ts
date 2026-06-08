import Database from "better-sqlite3";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type {
  AgentChatSession,
  AgentSessionHistoryItem,
} from "@cubecloud/platform-core";
import { resolveHermesHome } from "./hermesLifecycle";
const CONTENT_JSON_PREFIX = "\x00json:";

interface SessionRow {
  id: string;
  source: string | null;
  started_at: number;
  message_count: number;
  model: string | null;
  title: string | null;
}

interface SessionMessageRow {
  id: number;
  role: string;
  content: string | null;
  timestamp: number;
  tool_call_id: string | null;
  tool_calls: string | null;
  tool_name: string | null;
  reasoning: string | null;
  reasoning_content: string | null;
  reasoning_details: string | null;
}

function hermesHome(): string {
  return resolveHermesHome();
}

function activeProfileName(baseHome: string): string {
  try {
    const activeProfilePath = join(baseHome, "active_profile");
    if (!existsSync(activeProfilePath)) {
      return "default";
    }

    const profileName = readFileSync(activeProfilePath, "utf-8").trim();
    return profileName || "default";
  } catch {
    return "default";
  }
}

function profileHome(baseHome: string, profileName: string): string {
  if (!profileName || profileName === "default") {
    return baseHome;
  }

  return join(baseHome, "profiles", profileName);
}

function activeStateDbPath(): string {
  const baseHome = hermesHome();
  return join(profileHome(baseHome, activeProfileName(baseHome)), "state.db");
}

function getDb(readonly = true): Database.Database | null {
  const dbPath = activeStateDbPath();
  if (!existsSync(dbPath)) {
    return null;
  }

  return new Database(dbPath, readonly ? { readonly: true } : {});
}

function normalizeSessionTitle(title: string): string | null {
  const normalized = title.trim();
  return normalized.length > 0 ? normalized : null;
}

function decodeContent(raw: string | null): string {
  if (!raw || !raw.startsWith(CONTENT_JSON_PREFIX)) {
    return raw || "";
  }

  try {
    const parsed = JSON.parse(raw.slice(CONTENT_JSON_PREFIX.length)) as unknown;
    if (!Array.isArray(parsed)) {
      return typeof parsed === "string" ? parsed : raw;
    }

    const textParts: string[] = [];
    for (const part of parsed) {
      if (typeof part === "string") {
        if (part) {
          textParts.push(part);
        }
        continue;
      }

      if (!part || typeof part !== "object") {
        continue;
      }

      const entry = part as Record<string, unknown>;
      const type = typeof entry.type === "string" ? entry.type.toLowerCase() : "";
      if (type === "text" || type === "input_text" || type === "output_text") {
        const text = entry.text;
        if (typeof text === "string" && text) {
          textParts.push(text);
        }
      }
    }

    return textParts.join("\n\n");
  } catch {
    return raw;
  }
}

function pickReasoning(row: Pick<SessionMessageRow, "reasoning" | "reasoning_content" | "reasoning_details">): string {
  const directReasoning = (row.reasoning || "").trim();
  if (directReasoning) {
    return directReasoning;
  }

  const legacyReasoning = (row.reasoning_content || "").trim();
  if (legacyReasoning) {
    return legacyReasoning;
  }

  const reasoningDetails = (row.reasoning_details || "").trim();
  if (!reasoningDetails) {
    return "";
  }

  try {
    const parsed = JSON.parse(reasoningDetails) as unknown;
    if (typeof parsed === "string") {
      return parsed;
    }

    if (!Array.isArray(parsed)) {
      return "";
    }

    const detailTexts: string[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") {
        continue;
      }

      const record = entry as Record<string, unknown>;
      if (typeof record.text === "string" && record.text) {
        detailTexts.push(record.text);
      } else if (typeof record.thinking === "string" && record.thinking) {
        detailTexts.push(record.thinking);
      }
    }

    return detailTexts.join("\n\n");
  } catch {
    return "";
  }
}

function parseToolCalls(
  raw: string | null,
): Array<{ callId: string; name: string; args: string }> {
  if (!raw || !raw.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const toolCalls: Array<{ callId: string; name: string; args: string }> = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") {
        continue;
      }

      const record = entry as Record<string, unknown>;
      const functionRecord =
        record.function && typeof record.function === "object"
          ? (record.function as Record<string, unknown>)
          : null;

      if (!functionRecord || typeof functionRecord.name !== "string" || !functionRecord.name) {
        continue;
      }

      const rawArgs =
        typeof functionRecord.arguments === "string"
          ? functionRecord.arguments
          : "";
      let args = rawArgs;

      try {
        args = JSON.stringify(JSON.parse(rawArgs), null, 2);
      } catch {
        // Keep the raw argument string when it is not valid JSON.
      }

      toolCalls.push({
        callId:
          (typeof record.call_id === "string" && record.call_id) ||
          (typeof record.id === "string" && record.id) ||
          "",
        name: functionRecord.name,
        args,
      });
    }

    return toolCalls;
  } catch {
    return [];
  }
}

export function expandRowsToSessionHistory(
  rows: SessionMessageRow[],
): AgentSessionHistoryItem[] {
  const items: AgentSessionHistoryItem[] = [];

  for (const row of rows) {
    const content = decodeContent(row.content);

    if (row.role === "user") {
      if (!content) {
        continue;
      }

      items.push({
        kind: "user",
        id: row.id,
        content,
        timestamp: row.timestamp,
      });
      continue;
    }

    if (row.role === "assistant") {
      const reasoning = pickReasoning(row);
      if (reasoning) {
        items.push({
          kind: "reasoning",
          id: row.id,
          assistantId: row.id,
          text: reasoning,
          timestamp: row.timestamp,
        });
      }

      if (content) {
        items.push({
          kind: "assistant",
          id: row.id,
          content,
          timestamp: row.timestamp,
        });
      }

      for (const toolCall of parseToolCalls(row.tool_calls)) {
        items.push({
          kind: "tool_call",
          id: row.id,
          assistantId: row.id,
          callId: toolCall.callId,
          name: toolCall.name,
          args: toolCall.args,
          timestamp: row.timestamp,
        });
      }
      continue;
    }

    if (row.role === "tool") {
      items.push({
        kind: "tool_result",
        id: row.id,
        callId: row.tool_call_id || "",
        name: row.tool_name || "tool",
        content,
        timestamp: row.timestamp,
      });
    }
  }

  return items;
}

export function listLocalHermesSessions(
  limit = 40,
  offset = 0,
): AgentChatSession[] {
  const db = getDb();
  if (!db) {
    return [];
  }

  try {
    const rows = db
      .prepare(
        `SELECT id, source, started_at, message_count, model, title
         FROM sessions
         ORDER BY started_at DESC
         LIMIT ? OFFSET ?`,
      )
      .all(limit, offset) as SessionRow[];

    return rows.map((row) => ({
      id: row.id,
      title: row.title?.trim() || `Session ${row.id.slice(-6)}`,
      startedAt: row.started_at,
      messageCount: row.message_count,
      model: row.model || "default",
      source: row.source || "local",
    }));
  } finally {
    db.close();
  }
}

export function getLocalHermesSessionHistory(
  sessionId: string,
): AgentSessionHistoryItem[] {
  const db = getDb();
  if (!db) {
    return [];
  }

  try {
    const rows = db
      .prepare(
        `SELECT id, role, content, timestamp,
                tool_call_id, tool_calls, tool_name,
                reasoning, reasoning_content, reasoning_details
         FROM messages
         WHERE session_id = ? AND role IN ('user', 'assistant', 'tool')
         ORDER BY timestamp, id`,
      )
      .all(sessionId) as SessionMessageRow[];

    return expandRowsToSessionHistory(rows);
  } finally {
    db.close();
  }
}

export function updateLocalHermesSessionTitle(
  sessionId: string,
  title: string,
): AgentChatSession[] {
  const db = getDb(false);
  if (!db) {
    return [];
  }

  try {
    db
      .prepare("UPDATE sessions SET title = ? WHERE id = ?")
      .run(normalizeSessionTitle(title), sessionId);
  } finally {
    db.close();
  }

  return listLocalHermesSessions();
}

export function deleteLocalHermesSession(
  sessionId: string,
): AgentChatSession[] {
  const db = getDb(false);
  if (!db) {
    return [];
  }

  try {
    const transaction = db.transaction((id: string) => {
      db.prepare("DELETE FROM messages WHERE session_id = ?").run(id);
      db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
    });

    transaction(sessionId);
  } finally {
    db.close();
  }

  return listLocalHermesSessions();
}