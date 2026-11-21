import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { join } from "path";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";

vi.mock("electron", () => ({
  BrowserWindow: class {
    static getAllWindows(): unknown[] {
      return [];
    }
  },
  ipcMain: {
    on: (): void => {},
    handle: (): void => {},
    removeHandler: (): void => {},
    removeAllListeners: (): void => {},
  },
  app: {
    getPath: (): string => tmpdir(),
  },
}));

// profileHome() reads HERMES_HOME (or LOCALAPPDATA/hermes) at module
// load time. For these unit tests we don't want the real home
// resolution to fire; we point it at TEST_DIR so profileHome(undefined)
// resolves there. The mock has to be declared before any import that
// pulls in installer.ts.
vi.mock("../src/main/utils", () => ({
  profileHome: (profile?: string): string =>
    process.env.HERMES_TEST_HOME ?? process.cwd(),
}));

const TEST_DIR = join(tmpdir(), `hermes-mcp-mut-${Date.now()}`);

const SAMPLE_YAML = `provider: openai

mcp_servers:
  github:
    command: npx
    args:
      - "-y"
      - "@modelcontextprotocol/server-github@2025.4.8"
    enabled: true
  exa:
    type: http
    url: https://mcp.exa.ai/mcp
    enabled: true
  playwright:
    command: npx
    args:
      - "-y"
      - "@playwright/mcp@0.0.69"
    enabled: false

hermes:
  name: default
`;

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
  // profileHome() reads HERMES_TEST_HOME (via our mock) as the home
  // root and writes config.yaml there.
  process.env.HERMES_TEST_HOME = TEST_DIR;
  writeFileSync(join(TEST_DIR, "config.yaml"), SAMPLE_YAML);
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("setMcpServerEnabled", () => {
  it("flips an existing enabled: true to false", async () => {
    const { setMcpServerEnabled } = await import("../src/main/installer");
    const res = setMcpServerEnabled("github", false);
    expect(res.ok).toBe(true);
  });

  it("flips an existing enabled: false to true", async () => {
    const { setMcpServerEnabled } = await import("../src/main/installer");
    const res = setMcpServerEnabled("playwright", true);
    expect(res.ok).toBe(true);
  });

  it("returns ok: false when the server does not exist", async () => {
    const { setMcpServerEnabled } = await import("../src/main/installer");
    const res = setMcpServerEnabled("ghost", true);
    expect(res.ok).toBe(false);
  });

  it("rejects names that contain invalid characters", async () => {
    const { setMcpServerEnabled } = await import("../src/main/installer");
    const res = setMcpServerEnabled("bad name!", true);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/invalid/i);
  });

  it("preserves surrounding YAML when toggling", async () => {
    const { setMcpServerEnabled } = await import("../src/main/installer");
    setMcpServerEnabled("github", false);
    const updated = await import("fs").then((m) =>
      m.readFileSync(join(TEST_DIR, "config.yaml"), "utf-8"),
    );
    // Untouched sections are preserved.
    expect(updated).toContain("provider: openai");
    expect(updated).toContain("hermes:");
    expect(updated).toContain("name: default");
    // The github server's enabled: was true and is now false.
    const githubBlock = updated.match(
      /github:\n((?:[ \t]+.+\n)*)/m,
    )?.[0];
    expect(githubBlock).toBeTruthy();
    expect(githubBlock).toMatch(/enabled:\s*false/);
    // exa is untouched (enabled: true).
    const exaBlock = updated.match(/exa:\n((?:[ \t]+.+\n)*)/m)?.[0] ?? "";
    expect(exaBlock).toMatch(/enabled:\s*true/);
  });
});

describe("addMcpServer", () => {
  it("appends a new http server to the block", async () => {
    const { addMcpServer } = await import("../src/main/installer");
    const res = addMcpServer({
      name: "context7",
      type: "http",
      enabled: true,
      detail: "https://mcp.context7.com/mcp",
    });
    expect(res.ok).toBe(true);
  });

  it("rejects duplicate names", async () => {
    const { addMcpServer } = await import("../src/main/installer");
    const res = addMcpServer({
      name: "github",
      type: "http",
      enabled: true,
      detail: "https://x.example/mcp",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/already exists/i);
  });

  // `sse` is the legacy HTTP+SSE transport that fastapi-mcp and most
  // Python MCP servers expose (DataFlow mounts /mcp at :8000). Without
  // it the only way to register such a server was hand-editing
  // config.yaml, which is exactly what the MCP screen exists to avoid.
  it("appends an sse server and writes an explicit type", async () => {
    const { addMcpServer } = await import("../src/main/installer");
    const res = addMcpServer({
      name: "dataflow",
      type: "sse",
      enabled: true,
      detail: "http://127.0.0.1:8000/mcp",
    });
    expect(res.ok).toBe(true);

    const { readFileSync } = await import("fs");
    const yaml = readFileSync(join(TEST_DIR, "config.yaml"), "utf-8");
    expect(yaml).toContain("dataflow:");
    expect(yaml).toContain("type: sse");
    expect(yaml).toContain('url: "http://127.0.0.1:8000/mcp"');
  });

  it("round-trips an sse server through listMcpServers", async () => {
    const { addMcpServer, listMcpServers } = await import(
      "../src/main/installer"
    );
    addMcpServer({
      name: "dataflow",
      type: "sse",
      enabled: true,
      detail: "http://127.0.0.1:8000/mcp",
    });

    const row = listMcpServers().find((s) => s.name === "dataflow");
    expect(row?.type).toBe("sse");
    expect(row?.enabled).toBe(true);
    expect(row?.detail).toBe("http://127.0.0.1:8000/mcp");
  });

  it("infers type from shape for configs without an explicit type", async () => {
    const { listMcpServers } = await import("../src/main/installer");
    const byName = Object.fromEntries(
      listMcpServers().map((s) => [s.name, s.type]),
    );
    // `exa` has `type: http` + url; `github` has only a command.
    expect(byName.exa).toBe("http");
    expect(byName.github).toBe("stdio");
  });

  it("rejects a remote transport whose detail is not a URL", async () => {
    const { addMcpServer } = await import("../src/main/installer");
    const res = addMcpServer({
      name: "bogus",
      type: "sse",
      enabled: true,
      detail: "npx -y something",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/http/i);
  });

  it("rejects names that contain invalid characters", async () => {
    const { addMcpServer } = await import("../src/main/installer");
    const res = addMcpServer({
      name: "has space",
      type: "http",
      enabled: true,
      detail: "https://x.example/mcp",
    });
    expect(res.ok).toBe(false);
  });

  it("rejects empty or overlong detail fields", async () => {
    const { addMcpServer } = await import("../src/main/installer");
    const empty = addMcpServer({
      name: "newone",
      type: "http",
      enabled: true,
      detail: "",
    });
    expect(empty.ok).toBe(false);
    const long = addMcpServer({
      name: "newone2",
      type: "http",
      enabled: true,
      detail: "x".repeat(3000),
    });
    expect(long.ok).toBe(false);
  });
});

describe("removeMcpServer", () => {
  it("removes an existing server", async () => {
    const { removeMcpServer } = await import("../src/main/installer");
    const res = removeMcpServer("playwright");
    expect(res.ok).toBe(true);
  });

  it("returns ok: false when the server does not exist", async () => {
    const { removeMcpServer } = await import("../src/main/installer");
    const res = removeMcpServer("ghost");
    expect(res.ok).toBe(false);
  });

  it("rejects names that contain invalid characters", async () => {
    const { removeMcpServer } = await import("../src/main/installer");
    const res = removeMcpServer("bad name!");
    expect(res.ok).toBe(false);
  });
});
