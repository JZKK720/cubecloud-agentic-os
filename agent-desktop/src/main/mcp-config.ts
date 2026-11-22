// Read-only view over the profile's `mcp_servers:` block.
//
// Kept out of `installer.ts` on purpose: `installer.ts` imports `electron`,
// and the console kernel reaches this reader through the harness registry.
// Anything the kernel needs must stay in an electron-free module — see
// `tests/console-kernel-electron-free.test.ts`.

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { profileHome } from "./utils";

export type McpServerType = "http" | "stdio" | "sse";

export function listMcpServers(
  profile?: string,
): Array<{ name: string; type: string; enabled: boolean; detail: string }> {
  try {
    const configPath = join(profileHome(profile), "config.yaml");
    if (!existsSync(configPath)) return [];
    const content = readFileSync(configPath, "utf-8");
    // Simple YAML parse for mcp_servers section
    const match = content.match(/^mcp_servers:\s*\n((?:[ \t]+.+\n)*)/m);
    if (!match) return [];

    const servers: Array<{
      name: string;
      type: string;
      enabled: boolean;
      detail: string;
    }> = [];
    const block = match[1];
    // Each top-level key under mcp_servers is a server name (2-space indent)
    const nameRe = /^[ ]{2}(\w[\w-]*):\s*$/gm;
    let m: RegExpExecArray | null;
    while ((m = nameRe.exec(block)) !== null) {
      const name = m[1];
      // Extract following indented block for this server.
      // Find the next line at exactly 2-space indent (next server name).
      const start = m.index + m[0].length;
      const nextMatch = /\n {2}\w/g;
      nextMatch.lastIndex = start;
      const next = nextMatch.exec(block);
      const serverBlock = block.slice(start, next ? next.index : undefined);
      const hasUrl = /url:/.test(serverBlock);
      const hasCommand = /command:/.test(serverBlock);
      const enabledMatch = serverBlock.match(/enabled:\s*(true|false)/i);
      const enabled =
        enabledMatch === null || enabledMatch[1].toLowerCase() === "true";

      let detail = "";
      if (hasUrl) {
        const urlMatch = serverBlock.match(/url:\s*["']?([^\s"']+)/);
        detail = urlMatch?.[1] || "HTTP";
      } else if (hasCommand) {
        const cmdMatch = serverBlock.match(/command:\s*["']?([^\s"']+)/);
        detail = cmdMatch?.[1] || "stdio";
      }

      // Prefer an explicit `type:` when present so `sse` survives a
      // read/write round-trip; fall back to inferring from the URL vs
      // command shape for configs written before the type key existed.
      const typeMatch = serverBlock.match(/type:\s*(http|stdio|sse)\b/i);
      const inferred: McpServerType = hasUrl ? "http" : "stdio";

      servers.push({
        name,
        type: typeMatch ? typeMatch[1].toLowerCase() : inferred,
        enabled,
        detail,
      });
    }
    return servers;
  } catch {
    return [];
  }
}
