// dsh-mcp-bridge.ts — project the desktop's MCP inventory into dsh plugins.
//
// WHY THIS EXISTS: the desktop already owns an MCP inventory (the MCP screen,
// `listMcpServers()` reading `mcp_servers:` from the profile's config.yaml),
// and it already has a probe that proves a server answers. dsh ships its own
// MCP client (`@deepseek-ai/dsh-mcp-client`) which mounts each server's tools
// as native Cordis services. Without this module the two inventories are
// unrelated: the operator registers a server in the MCP screen and the dsh
// runtime never sees it.
//
// This is the "adopt the architecture" seam rather than a duplicate catalog:
// one inventory, projected into whatever runtime is active.
//
// VERIFIED CONTRACT (packages/mcp/mcp-client/README.md upstream):
//
//   - id: mcp-<name>
//     name: '@deepseek-ai/dsh-mcp-client'
//     config:
//       serverName: <name>            # [A-Za-z0-9_-]{1,32}, unique per scope
//       transport: stdio | streamable-http
//       command / args / env / cwd    # stdio
//       url / headers                 # streamable-http
//       toolCallTimeoutMs: 60000      # default
//
// Two mapping problems this module has to solve honestly:
//
//  1. **Transport names differ.** The desktop writes `http` for a URL server
//     (its own vocabulary) while dsh requires `streamable-http`. A legacy `sse`
//     endpoint is *not* the same transport and cannot be expressed here; it is
//     reported as unsupported rather than silently mangled.
//  2. **The desktop stores a single `detail` string.** `addMcpServer()` writes
//     either `url: "<detail>"` or `command: "<detail>"`, and the detail may be
//     a whole command line (`npx -y pkg`). dsh needs `command` + `args`
//     separately, so we split on whitespace — and say so, because a command
//     containing quoted arguments will not survive that split.
//
// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)

/** One server as the desktop's MCP screen knows it. */
export interface DesktopMcpServer {
  name: string;
  /** The desktop's vocabulary: "http" | "stdio" | "sse". */
  type: string;
  enabled: boolean;
  /** URL for http/sse, command line for stdio. */
  detail: string;
}

export interface DshMcpServerRow {
  /** dsh plugin row id, derived from the desktop name. */
  id: string;
  /** Namespace applied to the server's tool names. */
  serverName: string;
  transport: "stdio" | "streamable-http";
  command?: string;
  args?: string[];
  url?: string;
}

export interface DshMcpBridgeResult {
  /** Rows that map cleanly. */
  rows: DshMcpServerRow[];
  /** Servers deliberately not projected, with the reason. */
  skipped: Array<{ name: string; reason: string }>;
  /** Non-fatal mapping caveats the UI should surface. */
  warnings: Array<{ name: string; warning: string }>;
}

/** dsh requires `[A-Za-z0-9_-]{1,32}` for the tool namespace. */
const SERVER_NAME_RE = /^[A-Za-z0-9_-]{1,32}$/;

/**
 * Deterministic, collision-free namespace for a desktop server name.
 *
 * Desktop names already match `[\w-]+`, so most pass through unchanged. A name
 * that is too long or uses an unsupported character is slugged; the result is
 * still checked, and a name that cannot be made legal is rejected by the
 * caller rather than silently rewritten into something the operator did not
 * choose.
 */
export function toServerName(name: string): string | null {
  if (SERVER_NAME_RE.test(name)) return name;
  const slug = name
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return SERVER_NAME_RE.test(slug) ? slug : null;
}

/**
 * Split one command line into `command` + `args`.
 *
 * Deliberately simple: whitespace split with quote awareness for the common
 * `npx -y @scope/pkg` shape. Anything with embedded quoting that survives the
 * split is reported as a warning by the caller, because dsh needs the pieces
 * separately and a wrong split produces a server that fails at startup rather
 * than at registration.
 */
export function splitCommandLine(detail: string): {
  command: string;
  args: string[];
  quoted: boolean;
} {
  const trimmed = detail.trim();
  const tokens: string[] = [];
  let current = "";
  let quote: string | null = null;
  let quoted = false;

  for (const ch of trimmed) {
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      quoted = true;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += ch;
  }
  if (current) tokens.push(current);

  return { command: tokens[0] ?? "", args: tokens.slice(1), quoted };
}

/** Convert one desktop server into a dsh row, or explain why not. */
export function toDshRow(server: DesktopMcpServer): {
  row?: DshMcpServerRow;
  skip?: string;
  warning?: string;
} {
  const serverName = toServerName(server.name);
  if (!serverName) {
    return {
      skip: `name "${server.name}" cannot be expressed as a dsh tool namespace ([A-Za-z0-9_-]{1,32})`,
    };
  }

  const detail = (server.detail ?? "").trim();
  if (!detail) return { skip: "no endpoint or command recorded" };

  if (server.type === "stdio") {
    const { command, args, quoted } = splitCommandLine(detail);
    if (!command) return { skip: "stdio entry has no command" };
    return {
      row: { id: `mcp-${serverName}`, serverName, transport: "stdio", command, args },
      // A quoted argument that lost its quotes will not run as intended.
      ...(quoted
        ? {
            warning:
              "command line contained quoting; verify the argument split in the dsh config",
          }
        : {}),
    };
  }

  if (server.type === "http") {
    if (!/^https?:\/\//i.test(detail)) {
      return { skip: `http entry has no usable URL (${detail.slice(0, 60)})` };
    }
    return {
      row: {
        id: `mcp-${serverName}`,
        serverName,
        transport: "streamable-http",
        url: detail,
      },
    };
  }

  if (server.type === "sse") {
    // dsh-mcp-client offers stdio and streamable-http only. Treating an SSE
    // endpoint as streamable-http would produce a server that fails on its
    // first tools/list, so refuse it explicitly instead of guessing.
    return {
      skip: "the legacy SSE transport has no dsh-mcp-client equivalent; run the server behind a streamable-http bridge",
    };
  }

  return { skip: `unknown transport "${server.type}"` };
}

/** Project the whole inventory. Disabled servers are not mounted. */
export function buildDshMcpBridge(
  servers: readonly DesktopMcpServer[],
): DshMcpBridgeResult {
  const rows: DshMcpServerRow[] = [];
  const skipped: Array<{ name: string; reason: string }> = [];
  const warnings: Array<{ name: string; warning: string }> = [];
  const seen = new Set<string>();

  for (const server of servers) {
    if (!server.enabled) {
      skipped.push({ name: server.name, reason: "disabled in the MCP screen" });
      continue;
    }

    const mapped = toDshRow(server);
    if (mapped.skip) {
      skipped.push({ name: server.name, reason: mapped.skip });
      continue;
    }
    if (!mapped.row) continue;

    // One namespace per registration scope: a collision would make tool names
    // ambiguous, which is worse than refusing the later server.
    if (seen.has(mapped.row.serverName)) {
      skipped.push({
        name: server.name,
        reason: `namespace "${mapped.row.serverName}" already used by an earlier server`,
      });
      continue;
    }
    seen.add(mapped.row.serverName);

    rows.push(mapped.row);
    if (mapped.warning) {
      warnings.push({ name: server.name, warning: mapped.warning });
    }
  }

  return { rows, skipped, warnings };
}

/** Render the rows as a `cordis.patch.yml` `insert` block.
 *
 * VERIFIED AGAINST THE REAL RUNTIME: a `cordis.patch.yml` overlay can only
 * *modify* an existing row by id — a bare top-level entry fails composition
 * with `patch: entry "<id>" not found`. New rows must be nested under an
 * `insert:` list, which is how `@deepseek-ai/dsh-sdk-app`'s own bundle adds
 * `sdk-jsonrpc-server`. The first version of this module emitted top-level
 * entries and the runtime silently dropped them: 30 native tools, zero MCP
 * tools.
 */
export function renderDshMcpPatch(result: DshMcpBridgeResult): string {
  if (result.rows.length === 0) return "";

  const lines: string[] = ["- insert:"];
  for (const row of result.rows) {
    lines.push(`    - id: ${row.id}`);
    lines.push("      name: '@deepseek-ai/dsh-mcp-client'");
    lines.push("      config:");
    lines.push(`        serverName: ${row.serverName}`);
    lines.push(`        transport: ${row.transport}`);
    if (row.transport === "stdio") {
      lines.push(`        command: ${JSON.stringify(row.command ?? "")}`);
      if (row.args && row.args.length > 0) {
        lines.push(
          `        args: [${row.args.map((a) => JSON.stringify(a)).join(", ")}]`,
        );
      }
    } else {
      lines.push(`        url: ${row.url}`);
    }
  }

  return lines.join("\n") + "\n";
}

/**
 * Splice the MCP rows into an existing patch file, replacing any previous
 * bridge block.
 *
 * The block is delimited so re-running after an inventory change does not stack
 * stale servers, and so an operator's unrelated rows survive untouched.
 */
export function writeDshMcpPatch(
  patchPath: string,
  result: DshMcpBridgeResult,
  fs: {
    existsSync: (p: string) => boolean;
    readFileSync: (p: string, enc: "utf-8") => string;
    writeFileSync: (p: string, data: string, enc: "utf-8") => void;
    mkdirSync: (p: string, opts: { recursive: boolean }) => void;
  },
  dirname: string,
): boolean {
  try {
    fs.mkdirSync(dirname, { recursive: true });

    const body = renderDshMcpPatch(result);
    const BEGIN = "# >>> cubecloud mcp bridge (managed) >>>";
    const END = "# <<< cubecloud mcp bridge (managed) <<<";

    const block =
      body === "" ? "" : `${BEGIN}\n${body}${END}\n`;

    let existing = fs.existsSync(patchPath)
      ? fs.readFileSync(patchPath, "utf-8")
      : "";

    const blockRe = /# >>> cubecloud mcp bridge \(managed\) >>>[\s\S]*?# <<< cubecloud mcp bridge \(managed\) <<<\n?/;
    if (blockRe.test(existing)) {
      existing = existing.replace(blockRe, block);
    } else if (block !== "") {
      existing =
        existing === "" || existing.endsWith("\n")
          ? existing + block
          : existing + "\n" + block;
    }

    fs.writeFileSync(patchPath, existing, "utf-8");
    return true;
  } catch {
    return false;
  }
}
