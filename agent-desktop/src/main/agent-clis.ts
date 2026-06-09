import { spawnSync } from "child_process";
import { AGENT_CLI_CATALOG, type AgentCliId } from "../shared/agent-clis";
import { getEnhancedPath } from "./installer";

export interface AgentCliDiscoveryItem {
  id: AgentCliId;
  installed: boolean;
  detectedCommand: string | null;
  resolvedPath: string | null;
}

export interface AgentCliDiscovery {
  scannedAt: string;
  installedCount: number;
  items: AgentCliDiscoveryItem[];
}

function isWindowsCommandScript(command: string): boolean {
  return /\.(cmd|bat)$/i.test(command);
}

function pickWindowsCommandCandidate(candidates: string[]): string | null {
  const normalized = candidates
    .map((candidate) => candidate.trim())
    .filter(Boolean);
  const executable = normalized.find((candidate) => /\.exe$/i.test(candidate));
  if (executable) return executable;

  const script = normalized.find(isWindowsCommandScript);
  if (script) return script;

  return normalized[0] ?? null;
}

export function resolveCommandOnPath(
  command: string,
  envPath: string,
): string | null {
  const lookupCommand = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(lookupCommand, [command], {
    encoding: "utf8",
    env: { ...process.env, PATH: envPath },
    timeout: 3000,
    windowsHide: true,
  });

  if (result.error || result.status !== 0 || !result.stdout) {
    return null;
  }

  const candidates = result.stdout.split(/\r?\n/);
  if (process.platform === "win32") {
    return pickWindowsCommandCandidate(candidates);
  }

  return candidates.map((candidate) => candidate.trim()).find(Boolean) ?? null;
}

export function discoverAgentClis(): AgentCliDiscovery {
  const envPath = getEnhancedPath();
  const items = AGENT_CLI_CATALOG.map((entry) => {
    for (const command of entry.commands) {
      const resolvedPath = resolveCommandOnPath(command, envPath);
      if (resolvedPath) {
        return {
          id: entry.id,
          installed: true,
          detectedCommand: command,
          resolvedPath,
        } satisfies AgentCliDiscoveryItem;
      }
    }

    return {
      id: entry.id,
      installed: false,
      detectedCommand: null,
      resolvedPath: null,
    } satisfies AgentCliDiscoveryItem;
  });

  return {
    scannedAt: new Date().toISOString(),
    installedCount: items.filter((item) => item.installed).length,
    items,
  };
}