// Workspace console embed — main-process half of contract row C (P2)
// (`docs/plans/2026-10-06-cubecloud-agent-integration-plan.md` §5.2 row C;
// `docs/plans/2026-10-06-workspace-agentic-os-coordination-matrix.md`).
//
// The renderer screen (`screens/WorkspaceConsole/WorkspaceConsole.tsx`)
// renders a hardened `<webview>` pointed at the workspace origin; this
// module owns the allow-list + preference hardening utilities so the main
// process can gate the embed (the existing `isAllowedWebviewUrl` /
// `hardenWebviewPreferences` in `security.ts` are the primitives this
// module adapts with the console's own loopback-origin rules).
//
// Design rules (from the plan):
//   - Loopback http only, ports 1024–65535 (same class as
//     `isAllowedWebviewUrl`) — never arbitrary remote URLs.
//   - Hardened guest: no preload, sandbox + contextIsolation + webSecurity.
//   - Attached webContents deny window.open and gate navigation/redirects.
//
// Cubecloud original work (2026). Distributed under the repo's dual license
// per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import type { WebPreferences, WebContents } from "electron";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function parseUrl(rawUrl: unknown): URL | null {
  if (typeof rawUrl !== "string" || rawUrl.trim() === "") return null;
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
}

/** Loopback-http gate for the console embed (the row-C allow-list class;
 *  mirrors `isAllowedWebviewUrl` semantics so the two stay consistent). */
export function isAllowedWorkspaceConsoleUrl(rawUrl: unknown): rawUrl is string {
  const url = parseUrl(rawUrl);
  if (!url || url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  if (!LOCAL_HOSTS.has(host)) return false;
  const port = Number(url.port);
  return Number.isInteger(port) && port >= 1024 && port <= 65535;
}

/** Strip preload and force the hardened guest preferences for the embed. */
export function hardenWebviewPreferences(
  webPreferences: WebPreferences,
): WebPreferences {
  delete webPreferences.preload;
  // Electron's WebPreferences type only declares `preload`; older
  // runtimes also honored `preloadURL` — delete it defensively if a
  // caller set it, without assuming the property exists.
  if ("preloadURL" in webPreferences) {
    delete (webPreferences as { preloadURL?: string }).preloadURL;
  }
  webPreferences.nodeIntegration = false;
  webPreferences.contextIsolation = true;
  webPreferences.sandbox = true;
  webPreferences.webSecurity = true;
  webPreferences.allowRunningInsecureContent = false;
  return webPreferences;
}

/** Harden a webview's guest webContents: deny window.open, gate
 *  will-navigate / will-redirect to the row-C allow-list. */
export function hardenAttachedWebContents(webContents: WebContents): void {
  webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  webContents.on("will-navigate", (event, url) => {
    if (!isAllowedWorkspaceConsoleUrl(url)) {
      event.preventDefault();
    }
  });
  webContents.on("will-redirect", (event, url) => {
    if (!isAllowedWorkspaceConsoleUrl(url)) {
      event.preventDefault();
    }
  });
}

export type { WebPreferences, WebContents };