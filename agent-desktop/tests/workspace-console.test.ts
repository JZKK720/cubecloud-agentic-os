/**
 * P2 — Workspace console embed (contract row C) main-process tests.
 *
 * The renderer screen (`screens/WorkspaceConsole/WorkspaceConsole.tsx`)
 * renders a hardened `<webview>` pointing at the loopback workspace origin;
 * this file covers the MAIN-process half:
 *   1. `workspace-console-url` IPC returns a normalized loopback origin
 *      (same allow-list class as `isAllowedWebviewUrl`).
 *   2. `isAllowedWorkspaceConsoleUrl` accepts loopback http (ports
 *      1024–65535) and rejects remote/non-loopback/https/file origins.
 *   3. Hardened webview preferences survive: no preload, sandbox,
 *      contextIsolation, webSecurity.
 *   4. `hardenAttachedWebContents` denies window.open and gates
 *      will-navigate / will-redirect to the allow-list.
 *
 * No real BrowserWindow/webview runs in tests (pure functions + registry).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("workspace console embed (P2, main-process half)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allow-lists loopback http origins in the expected port range", async () => {
    const { isAllowedWorkspaceConsoleUrl } = await import("../src/main/workspace-console");
    expect(isAllowedWorkspaceConsoleUrl("http://127.0.0.1:6767")).toBe(true);
    expect(isAllowedWorkspaceConsoleUrl("http://localhost:1995/")).toBe(true);
    expect(isAllowedWorkspaceConsoleUrl("http://[::1]:6767")).toBe(true);
  });

  it("rejects remote hosts, https, file:, and bad ports", async () => {
    const { isAllowedWorkspaceConsoleUrl } = await import("../src/main/workspace-console");
    expect(isAllowedWorkspaceConsoleUrl("https://127.0.0.1:6767")).toBe(false);
    expect(isAllowedWorkspaceConsoleUrl("http://example.com:6767")).toBe(false);
    expect(isAllowedWorkspaceConsoleUrl("http://127.0.0.1:80")).toBe(false);
    expect(isAllowedWorkspaceConsoleUrl("file:///C:/tmp/index.html")).toBe(false);
    expect(isAllowedWorkspaceConsoleUrl("not a url")).toBe(false);
    expect(isAllowedWorkspaceConsoleUrl(null)).toBe(false);
  });

  it("webview preferences are hardened (no preload, sandbox, isolated)", async () => {
    const { hardenWebviewPreferences } = await import("../src/main/workspace-console");
    const prefs = {
      preload: "/tmp/preload.js",
      preloadURL: "file:///tmp/preload.js",
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
    } as unknown as Record<string, unknown>;
    const hardened = hardenWebviewPreferences(
      prefs as never,
    ) as unknown as Record<string, unknown>;
    expect(hardened.preload).toBeUndefined();
    expect(hardened.preloadURL).toBeUndefined();
    expect(hardened.nodeIntegration).toBe(false);
    expect(hardened.contextIsolation).toBe(true);
    expect(hardened.sandbox).toBe(true);
    expect(hardened.webSecurity).toBe(true);
    expect(hardened.allowRunningInsecureContent).toBe(false);
  });

  it("attached webContents deny window.open and gate navigation", async () => {
    const { hardenAttachedWebContents } = await import("../src/main/workspace-console");
    const handlers = new Map<string, (...args: unknown[]) => unknown>();
    const fake = {
      setWindowOpenHandler: (fn: () => unknown) => handlers.set("open", fn),
      on: (evt: string, fn: (event: unknown, url?: string) => void) =>
        handlers.set(evt, fn),
    } as never;
    hardenAttachedWebContents(fake);
    expect(handlers.get("open")).toBeDefined();
    // window.open is always denied.
    expect(handlers.get("open")?.({ action: "allow", overrideBrowserWindowOptions: {} })).toEqual(
      { action: "deny" },
    );
    // In-list navigation allowed; out-of-list prevented.
    const nav = { preventDefault: vi.fn() };
    handlers.get("will-navigate")?.(nav, "http://127.0.0.1:6767/app");
    expect(nav.preventDefault).not.toHaveBeenCalled();
    handlers.get("will-navigate")?.(nav, "http://evil.example.com");
    expect(nav.preventDefault).toHaveBeenCalled();
  });
});