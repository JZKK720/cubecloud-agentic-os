// console-backend Phase A — generic capability bridge.
//
// Loads dispatch-table.json (extracted from src/main/index.ts by
// extract-dispatch-table.cjs) and registers EVERY desktop IPC channel
// as a kernel capability, replacing the C0/C1 hand-seeded 17:
//
//   delegate     — dynamic-import the module, call the fn with the
//                  args array. sshDegrade channels take the local path
//                  (container era: the SSH branch is dead code).
//   desktopOnly  — stable degraded shape ({ success: false,
//                  desktopOnly: true, reason }) — never throws.
//   manual       — hand-mapped below: in-closure state machines
//                  re-instantiated kernel-side, multi-fn compositions
//                  inlined, push-emitting streams wired to SSE sinks.
//
// The 17 C0/C1 hand seeds stay registered FIRST (richer arg handling);
// the bridge skips any channel already present in the registry.

import { readFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import type { ConsoleRouteRegistry } from "./registry.ts";
import type { ServerResponse } from "http";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const srcMain = resolve(moduleDir, "..", "src", "main");

/** Live push sinks (channel → SSE response), shared with server.ts. */
export type PushSinks = Map<string, ServerResponse>;

/** Kernel-side emit: the webContents.send analog. */
export function emitKernelEvent(
  pushSinks: PushSinks,
  channel: string,
  payload: unknown,
): void {
  const sink = pushSinks.get(channel);
  if (!sink) return;
  try {
    sink.write(`data: ${JSON.stringify(payload)}\n\n`);
  } catch {
    pushSinks.delete(channel);
  }
}

const DESKTOP_ONLY_SHAPE = {
  success: false,
  desktopOnly: true,
  error: "desktop-only capability (Electron API not available in the kernel)",
};

/** Dynamic import of a main module by its index.ts specifier. The
 *  specifier is extensionless (Bundler-conventional); append .ts (or
 *  /index.ts) here because the loader only rewrites relative
 *  specifiers, not absolute file URLs. */
async function importMain(specifier: string): Promise<Record<string, unknown>> {
  const base = resolve(srcMain, specifier);
  const candidates = [`${base}.ts`, join(base, "index.ts")];
  const { existsSync } = await import("fs");
  const target = candidates.find((c) => existsSync(c)) ?? `${base}.ts`;
  return import(pathToFileURL(target).href) as Promise<Record<string, unknown>>;
}

/** Register one delegate channel. Returns the capability name. */
function registerDelegate(
  registry: ConsoleRouteRegistry,
  channel: string,
  fnName: string,
  moduleSpecifier: string,
  cache: Map<string, Promise<Record<string, unknown>>>,
): string {
  const name = channelToName(channel);
  if (!cache.has(moduleSpecifier)) {
    cache.set(moduleSpecifier, importMain(moduleSpecifier));
  }
  const modPromise = cache.get(moduleSpecifier)!;
  registry.register({
    name,
    ipcChannel: channel,
    handler: async (args: unknown[]) => {
      const mod = await modPromise;
      const fn = mod[fnName];
      if (typeof fn !== "function") {
        return {
          success: false,
          error: `module ${moduleSpecifier} has no export ${fnName}`,
        };
      }
      return (fn as (...a: unknown[]) => unknown)(...args);
    },
  });
  return name;
}

/** kebab channel → camel capability name (the preload method name). */
export function channelToName(channel: string): string {
  return channel.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Seed the registry from the dispatch table. `existing` lists capability
 * names already registered (the C0/C1 hand seeds) — the bridge skips
 * those channels. Returns a summary.
 */
export async function seedGenericBridge(
  registry: ConsoleRouteRegistry,
  pushSinks: PushSinks,
): Promise<{ registered: number; skipped: number; desktopOnly: number; manual: number }> {
  const table = JSON.parse(
    readFileSync(join(moduleDir, "dispatch-table.json"), "utf8"),
  ) as {
    entries: Array<{
      channel: string;
      kind: string;
      fn?: string;
      module?: string;
      sshDegrade?: boolean;
      reason?: string;
      pushEmits?: string[];
    }>;
  };

  const existing = new Set(registry.list().map((r) => r.name));
  const seenChannels = new Set<string>();
  const cache = new Map<string, Promise<Record<string, unknown>>>();
  let registered = 0;
  let skipped = 0;
  let desktopOnlyCount = 0;
  let manualCount = 0;

  for (const entry of table.entries) {
    const name = channelToName(entry.channel);
    // index.ts registers some channels twice (updater dev + packaged
    // branches) — the first registration wins, later ones skip.
    if (existing.has(name) || seenChannels.has(name)) {
      skipped++;
      continue;
    }
    seenChannels.add(name);

    if (entry.kind === "delegate" && entry.fn && entry.module) {
      registerDelegate(registry, entry.channel, entry.fn, entry.module, cache);
      registered++;
      continue;
    }

    if (entry.kind === "desktopOnly") {
      desktopOnlyCount++;
      registry.register({
        name,
        ipcChannel: entry.channel,
        handler: async () => ({ ...DESKTOP_ONLY_SHAPE, reason: entry.reason }),
      });
      registered++;
      continue;
    }

    // manual — hand-mapped handlers.
    const manual = manualHandler(entry.channel, pushSinks);
    if (manual) {
      manualCount++;
      registry.register({ name, ipcChannel: entry.channel, handler: manual });
      registered++;
      continue;
    }

    // Unmapped manual channel: register a stable "not yet bridged"
    // shape so the shim never 404s and the renderer degrades cleanly.
    registry.register({
      name,
      ipcChannel: entry.channel,
      handler: async () => ({
        success: false,
        notBridged: true,
        error: `channel ${entry.channel} has no kernel bridge yet`,
      }),
    });
    registered++;
  }

  return { registered, skipped, desktopOnly: desktopOnlyCount, manual: manualCount };
}

// ── Manual handlers ─────────────────────────────────────────────────────
// In-closure state machines from index.ts setupIPC(), re-instantiated
// kernel-side with the same module functions. Push-emitting streams
// write to the SSE sinks instead of event.sender.

function manualHandler(
  channel: string,
  pushSinks: PushSinks,
): ((args: unknown[]) => Promise<unknown>) | null {
  switch (channel) {
    // ── Chat stream (the core push path) ──
    case "send-message":
      return chatSendHandler(pushSinks);
    case "abort-chat":
      return async () => {
        if (chatAbort) {
          chatAbort();
          chatAbort = null;
        }
        return { success: true };
      };
    // ── Install/progress streams → SSE install-progress ──
    case "start-install":
    case "run-hermes-update":
    case "run-claw-migrate":
    case "run-runtime-provider-action":
      return progressHandler(channel, pushSinks);
    // ── OAuth login stream → SSE oauth-login-progress ──
    case "oauth-login":
      return oauthLoginHandler(pushSinks);
    case "oauth-login-cancel":
      return async () => {
        const { cancelHermesAuthLogin } = await importMain("./hermes-auth");
        return (cancelHermesAuthLogin as () => unknown)();
      };
    // ── Swarm manager (G2) — in-closure lazy singleton ──
    case "list-swarm-agents":
    case "get-swarm-messages":
    case "create-swarm-subagent":
    case "terminate-swarm-agent":
    case "clear-swarm":
      return swarmHandlers(channel);
    // ── Knowledge vault (G3) — fs-backed, kernel-side dir ──
    case "list-vault-files":
    case "read-vault-file":
    case "add-vault-file":
    case "update-vault-file":
    case "delete-vault-file":
    case "search-vault":
      return vaultHandlers(channel);
    // ── Approval inbox (P8) ──
    case "approval-create":
    case "approval-approve":
    case "approval-deny":
    case "approval-list":
    case "approval-has-pending":
      return approvalHandlers(channel);
    default:
      return null;
  }
}

// Lazy singletons (mirrors of the index.ts closures).
let chatAbort: (() => void) | null = null;

/** send-message: the desktop's chat stream. Streams chunks to the
 *  chat-chunk / chat-reasoning-chunk / chat-tool-progress / chat-usage
 *  SSE channels and resolves with the full response (the invoke return
 *  value the renderer awaits). */
function chatSendHandler(pushSinks: PushSinks) {
  return async (args: unknown[]) => {
    const message = String(args[0] ?? "");
    const profile = typeof args[1] === "string" ? args[1] : undefined;
    const resumeSessionId =
      typeof args[2] === "string" ? args[2] : undefined;
    const history = Array.isArray(args[3]) ? args[3] : undefined;
    const attachments = Array.isArray(args[4]) ? args[4] : undefined;
    const contextFolder =
      typeof args[5] === "string" ? args[5] : undefined;
    const hermes = (await importMain("./hermes")) as {
      sendMessage: (...a: unknown[]) => Promise<{
        abort: () => void;
        promise: Promise<{ response: string; sessionId?: string }>;
      }>;
      isRemoteMode: () => boolean;
      isGatewayRunning: () => boolean;
      startGateway: (p?: string) => unknown;
    };
    if (!hermes.isRemoteMode() && !hermes.isGatewayRunning()) {
      hermes.startGateway(profile);
    }
    let fullResponse = "";
    const handle = await hermes.sendMessage(
      message,
      {
        onChunk: (chunk: string) => {
          fullResponse += chunk;
          emitKernelEvent(pushSinks, "chat-chunk", chunk);
        },
        onReasoningChunk: (chunk: string) =>
          emitKernelEvent(pushSinks, "chat-reasoning-chunk", chunk),
        onDone: (sessionId: string) =>
          emitKernelEvent(pushSinks, "chat-done", sessionId || ""),
        onError: (error: string) =>
          emitKernelEvent(pushSinks, "chat-error", error),
        onToolProgress: (tool: unknown) =>
          emitKernelEvent(pushSinks, "chat-tool-progress", tool),
        onUsage: (usage: unknown) =>
          emitKernelEvent(pushSinks, "chat-usage", usage),
      },
      profile,
      resumeSessionId,
      history,
      attachments,
      contextFolder,
    );
    chatAbort = handle.abort;
    return handle.promise;
  };
}

/** Progress-streaming channels: forward InstallProgress to the
 *  install-progress SSE channel, return the invoke result. */
function progressHandler(channel: string, pushSinks: PushSinks) {
  return async (args: unknown[]) => {
    const emit = (progress: unknown): void =>
      emitKernelEvent(pushSinks, "install-progress", progress);
    try {
      switch (channel) {
        case "start-install": {
          const { runInstall } = (await importMain("./installer")) as {
            runInstall: (cb: (p: unknown) => void) => Promise<unknown>;
          };
          await runInstall(emit);
          return { success: true };
        }
        case "run-hermes-update": {
          const { runHermesUpdate } = (await importMain("./installer")) as {
            runHermesUpdate: (cb: (p: unknown) => void) => Promise<unknown>;
          };
          await runHermesUpdate(emit);
          return { success: true };
        }
        case "run-claw-migrate": {
          const { runClawMigrate } = (await importMain("./installer")) as {
            runClawMigrate: (cb: (p: unknown) => void) => Promise<unknown>;
          };
          await runClawMigrate(emit);
          return { success: true };
        }
        case "run-runtime-provider-action": {
          const { runRuntimeProviderAction } = (await importMain(
            "./runtime-provider-actions",
          )) as {
            runRuntimeProviderAction: (
              providerId: string,
              actionId: string,
              cb: (p: unknown) => void,
            ) => Promise<unknown>;
          };
          return await runRuntimeProviderAction(
            String(args[0] ?? ""),
            String(args[1] ?? ""),
            emit,
          );
        }
        default:
          return { success: false, error: `unhandled progress channel ${channel}` };
      }
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  };
}

/** oauth-login: stream CLI output to the oauth-login-progress SSE
 *  channel (device-code detection stays desktop-side in the browser
 *  shell — the shim surfaces the raw stream). */
function oauthLoginHandler(pushSinks: PushSinks) {
  return async (args: unknown[]) => {
    const { runHermesAuthLogin } = (await importMain("./hermes-auth")) as {
      runHermesAuthLogin: (
        provider: string,
        onChunk: (c: string) => void,
        profile?: string,
      ) => Promise<unknown>;
    };
    return runHermesAuthLogin(
      String(args[0] ?? ""),
      (chunk: string) => emitKernelEvent(pushSinks, "oauth-login-progress", chunk),
      typeof args[1] === "string" ? args[1] : undefined,
    );
  };
}

// Lazy singletons (mirrors of the index.ts closures).
let swarmPromise: Promise<{
  listAgents: () => unknown;
  getMessages: () => unknown;
  createSubagent: (m: string) => unknown;
  terminate: (id: string) => unknown;
  clear: () => void;
}> | null = null;

function getSwarm() {
  if (!swarmPromise) {
    swarmPromise = importMain("@cubecloud/platform-core").then((pc) => {
      const stubRouter = {
        async *runTurn(sessionId: string, input: { message: string }) {
          yield { type: "text" as const, content: `subagent result: ${input.message}` };
          yield { type: "done" as const, sessionId };
        },
        getActiveProvider: () => "hermes",
        async close() {},
      };
      const mgr = (
        pc as {
          createSwarmManager: (r: unknown) => {
            listAgents: () => unknown;
            getMessages: () => unknown;
            createSubagent: (m: string) => unknown;
            terminate: (id: string) => unknown;
            clear: () => void;
          };
        }
      ).createSwarmManager(stubRouter);
      return mgr;
    });
  }
  return swarmPromise;
}

function swarmHandlers(channel: string) {
  return async (args: unknown[]) => {
    const mgr = await getSwarm();
    switch (channel) {
      case "list-swarm-agents":
        return mgr.listAgents();
      case "get-swarm-messages":
        return mgr.getMessages();
      case "create-swarm-subagent":
        return mgr.createSubagent(String(args[0] ?? ""));
      case "terminate-swarm-agent":
        return mgr.terminate(String(args[0] ?? ""));
      case "clear-swarm":
        mgr.clear();
        return { success: true };
      default:
        return null;
    }
  };
}

let vaultPromise: Promise<{
  listFiles: () => unknown;
  readFile: (n: string) => unknown;
  addFile: (n: string, c: string) => unknown;
  updateFile: (n: string, c: string) => unknown;
  deleteFile: (n: string) => unknown;
  search: (q: string) => unknown;
}> | null = null;

async function getVault() {
  if (!vaultPromise) {
    const [{ createFsKnowledgeVault }, { profileHome }] = await Promise.all([
      importMain("@cubecloud/platform-core") as Promise<{
        createFsKnowledgeVault: (dir: string) => Record<string, never>;
      }>,
      importMain("./utils") as Promise<{ profileHome: () => string }>,
    ]);
    const { join } = await import("path");
    vaultPromise = Promise.resolve(
      createFsKnowledgeVault(join(profileHome(), "vault")) as never,
    );
  }
  return vaultPromise;
}

function vaultHandlers(channel: string) {
  return async (args: unknown[]) => {
    const vault = await getVault();
    switch (channel) {
      case "list-vault-files":
        return vault.listFiles();
      case "read-vault-file":
        return vault.readFile(String(args[0] ?? ""));
      case "add-vault-file":
        vault.addFile(String(args[0] ?? ""), String(args[1] ?? ""));
        return true;
      case "update-vault-file":
        return vault.updateFile(String(args[0] ?? ""), String(args[1] ?? ""));
      case "delete-vault-file":
        return vault.deleteFile(String(args[0] ?? ""));
      case "search-vault":
        return vault.search(String(args[0] ?? ""));
      default:
        return null;
    }
  };
}

let approvalPromise: Promise<{
  create: (i: unknown) => unknown;
  approve: (id: string) => unknown;
  deny: (id: string) => unknown;
  list: (all?: boolean) => unknown;
  hasPending: () => unknown;
}> | null = null;

function getApprovalInbox() {
  if (!approvalPromise) {
    approvalPromise = importMain("./steering-inbox").then(
      (m) =>
        (
          m as {
            createApprovalInbox: () => Record<string, never>;
          }
        ).createApprovalInbox() as never,
    );
  }
  return approvalPromise;
}

function approvalHandlers(channel: string) {
  return async (args: unknown[]) => {
    const inbox = await getApprovalInbox();
    switch (channel) {
      case "approval-create":
        return inbox.create(args[0]);
      case "approval-approve":
        return inbox.approve(String(args[0] ?? ""));
      case "approval-deny":
        return inbox.deny(String(args[0] ?? ""));
      case "approval-list":
        return inbox.list(Boolean(args[0]));
      case "approval-has-pending":
        return inbox.hasPending();
      default:
        return null;
    }
  };
}
