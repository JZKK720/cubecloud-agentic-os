import Database from "better-sqlite3";
import { mkdirSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteLocalHermesSession,
  expandRowsToSessionHistory,
  getLocalHermesSessionHistory,
  listLocalHermesSessions,
  updateLocalHermesSessionTitle,
} from "./runtimeSessions";
import { setHermesHomeOverride } from "./hermesLifecycle";

let hermesHomeRoot = "";
let previousLocalAppData: string | undefined;

vi.mock("electron", () => ({
  app: {
    getPath: () => hermesHomeRoot,
  },
}));

function createStateDb(baseHome = join(hermesHomeRoot, ".hermes")): Database.Database {
  const hermesDir = baseHome;
  mkdirSync(hermesDir, { recursive: true });

  const db = new Database(join(hermesDir, "state.db"));
  db.exec(`
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      source TEXT,
      started_at INTEGER,
      message_count INTEGER,
      model TEXT,
      title TEXT
    );

    CREATE TABLE messages (
      id INTEGER PRIMARY KEY,
      session_id TEXT,
      role TEXT,
      content TEXT,
      timestamp INTEGER,
      tool_call_id TEXT,
      tool_calls TEXT,
      tool_name TEXT,
      reasoning TEXT,
      reasoning_content TEXT,
      reasoning_details TEXT
    );
  `);

  return db;
}

describe("runtimeSessions", () => {
  beforeEach(() => {
    hermesHomeRoot = mkdtempSync(join(tmpdir(), "cubecloud-hermes-home-"));
    previousLocalAppData = process.env.LOCALAPPDATA;
    delete process.env.LOCALAPPDATA;
  });

  afterEach(() => {
    setHermesHomeOverride("");
    if (typeof previousLocalAppData === "string") {
      process.env.LOCALAPPDATA = previousLocalAppData;
    } else {
      delete process.env.LOCALAPPDATA;
    }
    rmSync(hermesHomeRoot, { recursive: true, force: true });
  });

  it("expands reasoning, assistant content, tool calls, and tool results in order", () => {
    const history = expandRowsToSessionHistory([
      {
        id: 10,
        role: "assistant",
        content: "Built the plan",
        timestamp: 100,
        tool_call_id: null,
        tool_calls:
          '[{"id":"call-1","function":{"name":"web.search","arguments":"{\\"q\\":\\"agent desktop\\"}"}}]',
        tool_name: null,
        reasoning: "Inspecting available surfaces",
        reasoning_content: null,
        reasoning_details: null,
      },
      {
        id: 11,
        role: "tool",
        content: "Search complete",
        timestamp: 101,
        tool_call_id: "call-1",
        tool_calls: null,
        tool_name: "web.search",
        reasoning: null,
        reasoning_content: null,
        reasoning_details: null,
      },
    ]);

    expect(history).toEqual([
      {
        kind: "reasoning",
        id: 10,
        assistantId: 10,
        text: "Inspecting available surfaces",
        timestamp: 100,
      },
      {
        kind: "assistant",
        id: 10,
        content: "Built the plan",
        timestamp: 100,
      },
      {
        kind: "tool_call",
        id: 10,
        assistantId: 10,
        callId: "call-1",
        name: "web.search",
        args: '{\n  "q": "agent desktop"\n}',
        timestamp: 100,
      },
      {
        kind: "tool_result",
        id: 11,
        callId: "call-1",
        name: "web.search",
        content: "Search complete",
        timestamp: 101,
      },
    ]);
  });

  it("decodes Hermes JSON-prefixed content into plain text", () => {
    const history = expandRowsToSessionHistory([
      {
        id: 20,
        role: "user",
        content:
          '\u0000json:[{"type":"text","text":"Open the workspace"},{"type":"text","text":"and inspect sessions"}]',
        timestamp: 200,
        tool_call_id: null,
        tool_calls: null,
        tool_name: null,
        reasoning: null,
        reasoning_content: null,
        reasoning_details: null,
      },
    ]);

    expect(history).toEqual([
      {
        kind: "user",
        id: 20,
        content: "Open the workspace\n\nand inspect sessions",
        timestamp: 200,
      },
    ]);
  });

  it("updates the local Hermes session title in the state database", () => {
    const db = createStateDb();
    db.prepare(
      `INSERT INTO sessions (id, source, started_at, message_count, model, title)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run("sess-1", "local", 100, 2, "claude-sonnet", "Original");
    db.close();

    const nextSessions = updateLocalHermesSessionTitle(
      "sess-1",
      "  Renamed session  ",
    );

    expect(nextSessions).toEqual([
      expect.objectContaining({
        id: "sess-1",
        title: "Renamed session",
      }),
    ]);
  });

  it("deletes the local Hermes session row and its transcript rows", () => {
    const db = createStateDb();
    db.prepare(
      `INSERT INTO sessions (id, source, started_at, message_count, model, title)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run("sess-1", "local", 100, 1, "claude-sonnet", "Disposable session");
    db.prepare(
      `INSERT INTO messages (
        id, session_id, role, content, timestamp, tool_call_id, tool_calls,
        tool_name, reasoning, reasoning_content, reasoning_details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(1, "sess-1", "user", "hello", 100, null, null, null, null, null, null);
    db.close();

    expect(listLocalHermesSessions()).toHaveLength(1);
    expect(getLocalHermesSessionHistory("sess-1")).toHaveLength(1);

    expect(deleteLocalHermesSession("sess-1")).toEqual([]);
    expect(getLocalHermesSessionHistory("sess-1")).toEqual([]);
  });

  it("reads local Hermes sessions from an adopted override home", () => {
    const adoptedHome = join(hermesHomeRoot, "portable-hermes");
    const db = createStateDb(adoptedHome);
    db.prepare(
      `INSERT INTO sessions (id, source, started_at, message_count, model, title)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run("sess-override", "local", 100, 1, "claude-sonnet", "Portable session");
    db.close();

    setHermesHomeOverride(adoptedHome);

    expect(listLocalHermesSessions()).toEqual([
      expect.objectContaining({
        id: "sess-override",
        title: "Portable session",
      }),
    ]);
  });
});