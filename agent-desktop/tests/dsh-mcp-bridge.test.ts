import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildDshMcpBridge,
  renderDshMcpPatch,
  splitCommandLine,
  toServerName,
  writeDshMcpPatch,
  type DesktopMcpServer,
} from "../src/main/dsh-mcp-bridge";

// The desktop owns an MCP inventory; dsh ships its own MCP client. Without a
// bridge the two are unrelated — a server registered in the MCP screen never
// reaches the dsh runtime. These tests pin the projection, including the two
// places where the vocabularies genuinely differ.

const server = (over: Partial<DesktopMcpServer> = {}): DesktopMcpServer => ({
  name: "github",
  type: "stdio",
  enabled: true,
  detail: "npx -y @modelcontextprotocol/server-github",
  ...over,
});

describe("toServerName", () => {
  it("passes through a legal name unchanged", () => {
    expect(toServerName("github")).toBe("github");
    expect(toServerName("my_server-2")).toBe("my_server-2");
  });

  it("slugs an illegal name into a legal namespace", () => {
    const name = toServerName("my server.with spaces");
    expect(name).toBe("my-server-with-spaces");
    expect(name).toMatch(/^[A-Za-z0-9_-]{1,32}$/);
  });

  it("truncates an over-long name to 32 characters", () => {
    const name = toServerName("a".repeat(50));
    expect(name).toHaveLength(32);
  });

  it("returns null when nothing legal survives", () => {
    expect(toServerName("///")).toBeNull();
  });
});

describe("splitCommandLine", () => {
  it("splits a plain command line", () => {
    expect(splitCommandLine("npx -y @scope/pkg")).toEqual({
      command: "npx",
      args: ["-y", "@scope/pkg"],
      quoted: false,
    });
  });

  it("keeps a quoted argument together and reports the quoting", () => {
    const result = splitCommandLine('npx -y "some pkg with spaces" --flag');
    expect(result.command).toBe("npx");
    expect(result.args).toEqual(["-y", "some pkg with spaces", "--flag"]);
    // The caller warns because the quotes are gone from the rendered YAML.
    expect(result.quoted).toBe(true);
  });

  it("handles a bare command with no args", () => {
    expect(splitCommandLine("my-server")).toEqual({
      command: "my-server",
      args: [],
      quoted: false,
    });
  });
});

describe("buildDshMcpBridge", () => {
  it("maps a stdio server to command + args", () => {
    const result = buildDshMcpBridge([server()]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      serverName: "github",
      transport: "stdio",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
    });
    expect(result.rows[0].id).toBe("mcp-github");
  });

  it("maps the desktop's http transport to streamable-http", () => {
    // The vocabularies differ: the desktop writes `http`, dsh requires
    // `streamable-http`. Getting this wrong yields a server that fails on its
    // first tools/list.
    const result = buildDshMcpBridge([
      server({ name: "exa", type: "http", detail: "https://mcp.exa.ai/mcp" }),
    ]);
    expect(result.rows[0]).toMatchObject({
      transport: "streamable-http",
      url: "https://mcp.exa.ai/mcp",
    });
  });

  it("refuses the legacy SSE transport instead of guessing", () => {
    const result = buildDshMcpBridge([
      server({ name: "dataflow", type: "sse", detail: "http://127.0.0.1:8000/mcp" }),
    ]);
    expect(result.rows).toHaveLength(0);
    expect(result.skipped[0].reason).toMatch(/SSE transport has no dsh-mcp-client/i);
  });

  it("skips a disabled server", () => {
    const result = buildDshMcpBridge([server({ enabled: false })]);
    expect(result.rows).toHaveLength(0);
    expect(result.skipped[0].reason).toMatch(/disabled/i);
  });

  it("skips an http entry with no usable URL", () => {
    const result = buildDshMcpBridge([server({ name: "bad", type: "http", detail: "nope" })]);
    expect(result.rows).toHaveLength(0);
    expect(result.skipped[0].reason).toMatch(/no usable URL/i);
  });

  it("rejects a namespace collision rather than emitting ambiguous tool names", () => {
    const result = buildDshMcpBridge([
      server({ name: "dup" }),
      server({ name: "dup", detail: "npx -y other" }),
    ]);
    expect(result.rows).toHaveLength(1);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toMatch(/already used/i);
  });

  it("warns when a stdio command line carried quoting", () => {
    const result = buildDshMcpBridge([
      server({ detail: 'npx -y "pkg name"' }),
    ]);
    expect(result.rows).toHaveLength(1);
    expect(result.warnings[0].warning).toMatch(/quoting/i);
  });

  it("projects a mixed inventory in order and reports each skip", () => {
    const result = buildDshMcpBridge([
      server({ name: "a" }),
      server({ name: "b", type: "http", detail: "https://x.example/mcp" }),
      server({ name: "c", type: "sse", detail: "http://127.0.0.1:8000/mcp" }),
    ]);
    expect(result.rows.map((r) => r.serverName)).toEqual(["a", "b"]);
    expect(result.skipped.map((s) => s.name)).toEqual(["c"]);
  });
});

describe("renderDshMcpPatch", () => {
  it("nests rows under an insert: list", () => {
    // VERIFIED against the real runtime: a cordis.patch.yml overlay can only
    // modify an existing row by id; a bare top-level entry fails composition
    // with `patch: entry "<id>" not found` and the runtime drops it silently.
    const text = renderDshMcpPatch(
      buildDshMcpBridge([
        server(),
        server({ name: "web", type: "http", detail: "https://x.example/mcp" }),
      ]),
    );
    expect(text).toMatch(/^- insert:/m);
    expect(text.match(/@deepseek-ai\/dsh-mcp-client/g)).toHaveLength(2);
    expect(text).toContain("    - id: mcp-github");
    expect(text).toContain("serverName: github");
    expect(text).toContain('command: "npx"');
    expect(text).toContain("transport: streamable-http");
  });

  it("returns an empty string when nothing maps", () => {
    expect(renderDshMcpPatch(buildDshMcpBridge([]))).toBe("");
  });
});

describe("writeDshMcpPatch", () => {
  let dir: string;
  let patch: string;
  const deps = { existsSync, readFileSync, writeFileSync, mkdirSync };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "dsh-mcp-"));
    patch = join(dir, "cordis.patch.yml");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("writes a managed block", () => {
    expect(
      writeDshMcpPatch(patch, buildDshMcpBridge([server()]), deps, dir),
    ).toBe(true);
    const text = readFileSync(patch, "utf8");
    expect(text).toContain("# >>> cubecloud mcp bridge (managed) >>>");
    expect(text).toContain("dsh-mcp-client");
    expect(text).toContain("# <<< cubecloud mcp bridge (managed) <<<");
  });

  it("replaces the block on re-run instead of stacking servers", () => {
    writeDshMcpPatch(patch, buildDshMcpBridge([server({"name": "one"})]), deps, dir);
    writeDshMcpPatch(patch, buildDshMcpBridge([server({ name: "two" })]), deps, dir);
    const text = readFileSync(patch, "utf8");
    expect(text.match(/cubecloud mcp bridge \(managed\) >>>/g)).toHaveLength(1);
    expect(text).toContain("serverName: two");
    expect(text).not.toContain("serverName: one");
  });

  it("preserves unrelated operator rows", () => {
    writeFileSync(patch, "- id: my-plugin\n  name: 'pkg'\n", "utf8");
    writeDshMcpPatch(patch, buildDshMcpBridge([server()]), deps, dir);
    const text = readFileSync(patch, "utf8");
    expect(text).toContain("my-plugin");
    expect(text).toContain("dsh-mcp-client");
  });

  it("removes a stale block when the inventory becomes empty", () => {
    writeDshMcpPatch(patch, buildDshMcpBridge([server()]), deps, dir);
    writeDshMcpPatch(patch, buildDshMcpBridge([]), deps, dir);
    const text = readFileSync(patch, "utf8");
    expect(text).not.toContain("dsh-mcp-client");
  });
});
