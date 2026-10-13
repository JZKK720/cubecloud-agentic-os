# Workspace Control Panel — Phase C Plan

> **Date:** 2026-10-13
> **Design of record:** `docs/plans/2026-10-08-desktop-overhaul-design.md` §3 (The workspace link, M1–M4) and §5 (Phase DAG: C = workspace control panel).
> **Worktree:** `<c0-kernel>` (`feat/console-kernel-c0`). Phase B committed as `ad6a68e`.
> **Scope decision (autonomous, reversible):** **renderer-only over the shipped IPC.** Every mechanism's backend already exists (M1 read: `workspaceGovernanceSurfaces` + `workspaceGovernanceElicitations`; M1 write: `workspaceGovernanceResolve` + `agent-bundle-promote`; M2: `workspaceProvisionEnv` + `workspaceProvisionFingerprint`; M3: `listWorkspaceSessions`/`listWorkspaceAgents`/`reconcileWorkspaceInventory`; M4: `workspaceSupervisorStatus/Start/Stop/LogTail`). New workspace *writes* (scheduled-task CRUD, session MCP servers, media settings, sharing edits) are deferred to a follow-up plan — they each need a new IPC channel, handler, audit rule, and tests, and none is required for the MVP verdict.
> **Outcome:** the operator drives the AI Workspace from one management surface — probe + lifecycle, LLM provisioning (fingerprints-only), a read-only sessions/agents mirror, the policies/sharing registry view, and the approvals inbox with the ONE verdict write — instead of a bare `<webview>` embed.

---

## Overview

Today `WorkspaceConsole.tsx` is a hardened `<webview>` embed with **no CSS** (the `workspace-console-*` classes are undefined) and **no management surface**. Design §3 mandates "a dedicated management surface (panels per mechanism), not a Tools status card and not an embed." Phase C rebuilds that screen into five panels over the IPC that already ships, so the console *attaches, supervises, configures, and governs* the workspace while chat and files stay in the workspace (row D: console is viewer, not owner).

Every task is TDD: write the failing test, watch it fail, make it pass. Every task ends on a green commit.

**Conventions to match (grounded):**
- IPC access goes through `window.hermesAPI.*` only (preload bridge; never `fetch` from the renderer).
- i18n: `useI18n()` → `t(key, { defaultValue })`; the `workspace` namespace is **taken by the CodeGraph screen** — Phase C uses a new `workspaceConsole` namespace.
- Screens are visibility-gated (`visible` prop) and only mounted once visited — follow `Layout.tsx`'s `visitedViews` pattern.
- Tests: `@testing-library/react` + `vi.mock` the `useI18n` hook, install a `window.hermesAPI` stub (see `FirstRunScan.test.tsx`).

---

## Tasks

### Task 1: Add the `workspaceConsole` i18n namespace (en + 7 fallbacks)

**Files:**
- Create: `agent-desktop/src/shared/i18n/locales/en/workspaceConsole.ts`
- Create: `agent-desktop/src/shared/i18n/locales/{es,id,ja,pt-BR,pt-PT,zh-CN,zh-TW}/workspaceConsole.ts`
- Modify: `agent-desktop/src/shared/i18n/index.ts`

**Step 1: Write the English source of truth**

```ts
// agent-desktop/src/shared/i18n/locales/en/workspaceConsole.ts
export default {
  title: "AI Workspace",
  subtitle:
    "Attach, supervise, configure, and govern the workspace. Chat and files stay in the workspace.",
  tabOverview: "Overview",
  tabSettings: "Settings",
  tabSessions: "Sessions & agents",
  tabPolicies: "Policies & sharing",
  tabApprovals: "Approvals",
  statusReachable: "Reachable",
  statusUnreachable: "Not reachable",
  statusUnknown: "Unknown",
  version: "Version",
  origin: "Origin",
  start: "Start",
  stop: "Stop",
  restart: "Restart",
  refresh: "Refresh",
  logTail: "Supervisor log",
  noLog: "No log output yet.",
  provisionTitle: "Provision LLM env",
  provisionHint:
    "Writes the workspace's env fragment on next start. Secrets are stored as fingerprints only, never echoed back.",
  provisionHermesUrl: "Hermes gateway URL",
  provisionHermesKey: "Hermes API key",
  provisionLocalSingleUser: "Single-user local mode",
  provisionWrite: "Provision",
  provisionWritten: "Provisioned",
  provisionBlocked: "Provisioning is gated in this mode.",
  sessionsTitle: "Workspace sessions",
  sessionsEmpty: "No sessions reported.",
  agentsTitle: "Workspace agents",
  agentsEmpty: "No agents reported.",
  coordinated: "Coordinated",
  consoleOnly: "Console only",
  workspaceOnly: "Workspace only",
  policiesTitle: "Policy registry",
  policiesEmpty: "No policies reported.",
  scheduledTitle: "Scheduled tasks",
  scheduledEmpty: "No scheduled tasks reported.",
  sharingTitle: "Sharing",
  sharingEmpty: "No shares reported.",
  surfacesPartial: "Some workspace surfaces are unavailable (older build).",
  approvalsTitle: "Approval inbox",
  approvalsEmpty: "Nothing waiting on you.",
  approve: "Approve",
  decline: "Decline",
  cancel: "Cancel",
  approvalPhase: "Phase",
  approvalPolicy: "Policy",
  approvalUnavailable: "Approvals need a governance session id (Settings).",
  error: "Something went wrong",
} as const;
```

**Step 2: Write the 7 fallback locales** — copy the same file verbatim to each locale dir. These locales ship English copy until a native pass; the i18n coverage gate counts the file, not the language.

```
es/workspaceConsole.ts
id/workspaceConsole.ts
ja/workspaceConsole.ts
pt-BR/workspaceConsole.ts
pt-PT/workspaceConsole.ts
zh-CN/workspaceConsole.ts
zh-TW/workspaceConsole.ts
```

**Step 3: Register it in the i18n index**

Add the import next to the other `en` imports and the resource entry inside `resources`.

```ts
import workspaceConsoleEn from "./locales/en/workspaceConsole";
```
```ts
      workspaceConsole: workspaceConsoleEn,
```

Repeat the import + resource line for each of the 7 fallback locale blocks.

**Step 4: Verify**

Run: `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.web.json --composite false` (cwd `agent-desktop`)
Expected: no errors.

Run: `node scripts/check-skill-counts.cjs` is unrelated; instead run the i18n coverage check:
`node ../scripts/check-i18n-coverage.cjs` (cwd `agent-desktop`)
Expected: no new missing-key rows for `workspaceConsole`.

**Step 5: Commit**

```bash
git add agent-desktop/src/shared/i18n
git commit -m "feat(i18n): add workspaceConsole namespace (8 locales)"
```

---

### Task 2: Add the `.workspace-console` panel styles

**Files:**
- Modify: `agent-desktop/src/renderer/src/assets/main.css`

**Step 1: Add the class block**

Append at the end of `main.css` (matches the flat, hairline-bordered card language already in the file):

```css
.workspace-console {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}
.workspace-console-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.workspace-console-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.workspace-console-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  opacity: 0.7;
}
.workspace-console-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--border-subtle, rgba(127, 127, 127, 0.2));
}
.workspace-console-tab {
  background: none;
  border: none;
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
  opacity: 0.7;
  border-bottom: 2px solid transparent;
}
.workspace-console-tab.active {
  opacity: 1;
  border-bottom-color: var(--accent, #3b82f6);
}
.workspace-console-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.workspace-console-card {
  border: 1px solid var(--border-subtle, rgba(127, 127, 127, 0.2));
  border-radius: 8px;
  padding: 12px 14px;
}
.workspace-console-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}
.workspace-console-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
}
.workspace-console-muted {
  font-size: 12px;
  opacity: 0.6;
}
.workspace-console-error {
  color: var(--danger, #ef4444);
  font-size: 12px;
}
.workspace-console-log {
  max-height: 160px;
  overflow: auto;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  white-space: pre-wrap;
  margin: 0;
}
.workspace-console-input {
  width: 100%;
  padding: 6px 8px;
  font-size: 13px;
  border: 1px solid var(--border-subtle, rgba(127, 127, 127, 0.25));
  border-radius: 6px;
  background: transparent;
  color: inherit;
}
```

**Step 2: Verify**

Run: `node node_modules/vitest/vitest.mjs run src/renderer/src/screens/Layout/Layout.test.tsx`
Expected: PASS (styling is inert to logic; this proves no CSS broke the suite's module graph).

**Step 3: Commit**

```bash
git add agent-desktop/src/renderer/src/assets/main.css
git commit -m "style: add workspace console panel classes"
```

---

### Task 3: Data hook `useWorkspaceConsoleData`

**Files:**
- Create: `agent-desktop/src/renderer/src/screens/WorkspaceConsole/useWorkspaceConsoleData.ts`
- Create: `agent-desktop/tests/workspace-console-data.test.tsx`

**Step 1: Write the failing test**

```tsx
// tests/workspace-console-data.test.tsx
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const probe = vi.fn();
const supStatus = vi.fn();
const sessions = vi.fn();
const agents = vi.fn();
const surfaces = vi.fn();
const elicitations = vi.fn();

function installApi(): void {
  Object.defineProperty(window, "hermesAPI", {
    configurable: true,
    value: {
      workspaceProbe: probe,
      workspaceSupervisorStatus: supStatus,
      listWorkspaceSessions: sessions,
      listWorkspaceAgents: agents,
      workspaceGovernanceSurfaces: surfaces,
      workspaceGovernanceElicitations: elicitations,
    },
  });
}

import { useWorkspaceConsoleData } from "../src/renderer/src/screens/WorkspaceConsole/useWorkspaceConsoleData";

describe("useWorkspaceConsoleData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installApi();
  });

  it("loads probe + supervisor into stable state", async () => {
    probe.mockResolvedValue({
      reachable: true,
      baseUrl: "http://127.0.0.1:6767",
      health: { status: "ok", body: {} },
      info: { name: "cubecloud-agent", version: "0.4.0" },
      stack: null,
      error: null,
      scannedAt: "2026-10-13T00:00:00.000Z",
    });
    supStatus.mockResolvedValue({ state: "running", running: true, cli: "omnigent", reason: null });

    const { result } = renderHook(() => useWorkspaceConsoleData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.probe?.reachable).toBe(true);
    expect(result.current.probe?.version).toBe("0.4.0");
    expect(result.current.supervisor?.running).toBe(true);
  });

  it("degrades to null (never throws) when a call rejects", async () => {
    probe.mockRejectedValue(new Error("boom"));
    supStatus.mockRejectedValue(new Error("boom"));
    sessions.mockRejectedValue(new Error("boom"));
    agents.mockRejectedValue(new Error("boom"));
    surfaces.mockRejectedValue(new Error("boom"));
    elicitations.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useWorkspaceConsoleData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.probe).toBeNull();
    expect(result.current.sessions).toEqual([]);
    expect(result.current.elicitationError).toBeTruthy();
  });
});
```

**Step 2: Run and watch it fail**

Run: `node node_modules/vitest/vitest.mjs run tests/workspace-console-data.test.tsx`
Expected: FAIL — cannot resolve `useWorkspaceConsoleData`.

**Step 3: Implement the hook**

```ts
// src/renderer/src/screens/WorkspaceConsole/useWorkspaceConsoleData.ts
// One loader for the five panels. Every call is independent and
// fail-soft: a dead workspace yields null/[] plus an error string, never
// a thrown render (capability-honest, per the ManagedApp contract rules).
import { useCallback, useEffect, useState } from "react";

export interface WorkspaceConsoleProbe {
  reachable: boolean;
  baseUrl: string;
  version: string | null;
  error: string | null;
  scannedAt: string;
}

export interface WorkspaceConsoleState {
  loading: boolean;
  probe: WorkspaceConsoleProbe | null;
  supervisor: Awaited<ReturnType<Window["hermesAPI"]["workspaceSupervisorStatus"]>> | null;
  sessions: Awaited<ReturnType<Window["hermesAPI"]["listWorkspaceSessions"]>>["data"];
  agents: Awaited<ReturnType<Window["hermesAPI"]["listWorkspaceAgents"]>>["data"];
  surfaces: Awaited<ReturnType<Window["hermesAPI"]["workspaceGovernanceSurfaces"]>> | null;
  elicitations: Awaited<ReturnType<Window["hermesAPI"]["workspaceGovernanceElicitations"]>>["requests"];
  elicitationError: string | null;
  reload: () => Promise<void>;
}

export function useWorkspaceConsoleData(sessionId: string | null): WorkspaceConsoleState {
  const [loading, setLoading] = useState(true);
  const [probe, setProbe] = useState<WorkspaceConsoleProbe | null>(null);
  const [supervisor, setSupervisor] = useState<WorkspaceConsoleState["supervisor"]>(null);
  const [sessions, setSessions] = useState<WorkspaceConsoleState["sessions"]>([]);
  const [agents, setAgents] = useState<WorkspaceConsoleState["agents"]>([]);
  const [surfaces, setSurfaces] = useState<WorkspaceConsoleState["surfaces"]>(null);
  const [elicitations, setElicitations] = useState<WorkspaceConsoleState["elicitations"]>([]);
  const [elicitationError, setElicitationError] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await window.hermesAPI.workspaceProbe();
      setProbe({
        reachable: result.reachable,
        baseUrl: result.baseUrl,
        version:
          result.info && typeof result.info.version === "string"
            ? result.info.version
            : null,
        error: result.error,
        scannedAt: result.scannedAt,
      });
    } catch {
      setProbe(null);
    }
    try {
      setSupervisor(await window.hermesAPI.workspaceSupervisorStatus());
    } catch {
      setSupervisor(null);
    }
    // M3 mirror: the list calls REQUIRE a baseUrl (preload signature:
    // listWorkspaceSessions(baseUrl, options)). Resolve it from the
    // probe result, falling back to workspaceProbeUrl()'s default.
    let base = "";
    try {
      base = (await window.hermesAPI.workspaceProbe()).baseUrl;
    } catch {
      base = "";
    }
    if (!base) {
      try {
        base = await window.hermesAPI.workspaceProbeUrl();
      } catch {
        base = "";
      }
    }
    try {
      setSessions((await window.hermesAPI.listWorkspaceSessions(base)).data);
    } catch {
      setSessions([]);
    }
    try {
      setAgents((await window.hermesAPI.listWorkspaceAgents(base)).data);
    } catch {
      setAgents([]);
    }
    try {
      setSurfaces(await window.hermesAPI.workspaceGovernanceSurfaces(null));
    } catch {
      setSurfaces(null);
    }
    if (sessionId) {
      try {
        const res = await window.hermesAPI.workspaceGovernanceElicitations(undefined, sessionId);
        setElicitations(res.requests);
        setElicitationError(res.success ? null : (res.error ?? "unavailable"));
      } catch (err) {
        setElicitations([]);
        setElicitationError(String(err));
      }
    } else {
      setElicitations([]);
      setElicitationError(null);
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    loading,
    probe,
    supervisor,
    sessions,
    agents,
    surfaces,
    elicitations,
    elicitationError,
    reload,
  };
}
```

**Step 4: Verify**

Run: `node node_modules/vitest/vitest.mjs run tests/workspace-console-data.test.tsx`
Expected: PASS (2 tests).

**Step 5: Commit**

```bash
git add agent-desktop/src/renderer/src/screens/WorkspaceConsole/useWorkspaceConsoleData.ts agent-desktop/tests/workspace-console-data.test.tsx
git commit -m "feat(workspace-console): add fail-soft data hook for the five panels"
```

---

### Task 4: Container + Overview panel (probe, lifecycle, log tail)

**Files:**
- Modify: `agent-desktop/src/renderer/src/screens/WorkspaceConsole/WorkspaceConsole.tsx`
- Create: `agent-desktop/tests/workspace-console.test.tsx`

**Step 1: Write the failing test**

```tsx
// tests/workspace-console.test.tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../src/renderer/src/components/useI18n", () => ({
  useI18n: () => ({ t: (k: string) => k, locale: "en", setLocale: () => {} }),
}));

import WorkspaceConsole from "../src/renderer/src/screens/WorkspaceConsole/WorkspaceConsole";

function installApi(over: Partial<Window["hermesAPI"]> = {}): void {
  Object.defineProperty(window, "hermesAPI", {
    configurable: true,
    value: {
      workspaceProbe: vi.fn().mockResolvedValue({
        reachable: true,
        baseUrl: "http://127.0.0.1:6767",
        health: { status: "ok", body: {} },
        info: { name: "cubecloud-agent", version: "0.4.0" },
        stack: null,
        error: null,
        scannedAt: "2026-10-13T00:00:00.000Z",
      }),
      workspaceSupervisorStatus: vi.fn().mockResolvedValue({
        state: "running",
        running: true,
        cli: "omnigent",
        reason: null,
      }),
      workspaceSupervisorLogTail: vi.fn().mockResolvedValue({ lines: ["boot ok"] }),
      workspaceSupervisorStop: vi.fn().mockResolvedValue({ state: "stopped", running: false }),
      workspaceSupervisorStart: vi.fn().mockResolvedValue({ state: "running", running: true }),
      listWorkspaceSessions: vi.fn().mockResolvedValue({ success: true, data: [], hasMore: false }),
      listWorkspaceAgents: vi.fn().mockResolvedValue({ success: true, data: [], hasMore: false }),
      workspaceGovernanceSurfaces: vi.fn().mockResolvedValue({
        scheduledTasks: [],
        policies: [],
        shares: [],
        errors: [],
      }),
      workspaceGovernanceElicitations: vi.fn().mockResolvedValue({ success: true, requests: [] }),
      ...over,
    },
  });
}

beforeEach(() => installApi());

describe("WorkspaceConsole", () => {
  it("renders the reachable status and the five tabs", async () => {
    render(<WorkspaceConsole />);
    await waitFor(() => expect(screen.getByText("statusReachable")).toBeTruthy());
    expect(screen.getByText("tabOverview")).toBeTruthy();
    expect(screen.getByText("tabSettings")).toBeTruthy();
    expect(screen.getByText("tabSessions")).toBeTruthy();
    expect(screen.getByText("tabPolicies")).toBeTruthy();
    expect(screen.getByText("tabApprovals")).toBeTruthy();
  });

  it("stops the supervisor from the overview panel", async () => {
    render(<WorkspaceConsole />);
    await waitFor(() => expect(screen.getByText("statusReachable")).toBeTruthy());
    fireEvent.click(screen.getByText("stop"));
    await waitFor(() =>
      expect(window.hermesAPI.workspaceSupervisorStop).toHaveBeenCalled(),
    );
  });

  it("never renders a webview element", async () => {
    const { container } = render(<WorkspaceConsole />);
    await waitFor(() => expect(screen.getByText("statusReachable")).toBeTruthy());
    expect(container.querySelector("webview")).toBeNull();
  });
});
```

**Step 2: Run and watch it fail**

Run: `node node_modules/vitest/vitest.mjs run tests/workspace-console.test.tsx`
Expected: FAIL — no tabs / no `webview` removal / status text missing.

**Step 3: Rewrite the screen**

```tsx
// src/renderer/src/screens/WorkspaceConsole/WorkspaceConsole.tsx
// WorkspaceConsole — the AI Workspace management surface (design §3,
// mechanisms M1–M4). Five tabs over the shipped workspace IPC. No
// <webview>: the operator manages the workspace here; the workspace's
// own UI stays in the browser (openExternal).
import { useCallback, useState } from "react";
import { ExternalLink, Refresh } from "../../assets/icons";
import { useI18n } from "../../components/useI18n";
import { useWorkspaceConsoleData } from "./useWorkspaceConsoleData";
import OverviewPanel from "./OverviewPanel";
import SettingsPanel from "./SettingsPanel";
import SessionsPanel from "./SessionsPanel";
import PoliciesPanel from "./PoliciesPanel";
import ApprovalsPanel from "./ApprovalsPanel";

type Tab = "overview" | "settings" | "sessions" | "policies" | "approvals";

const TABS: Array<{ id: Tab; labelKey: string; fallback: string }> = [
  { id: "overview", labelKey: "workspaceConsole.tabOverview", fallback: "Overview" },
  { id: "settings", labelKey: "workspaceConsole.tabSettings", fallback: "Settings" },
  { id: "sessions", labelKey: "workspaceConsole.tabSessions", fallback: "Sessions & agents" },
  { id: "policies", labelKey: "workspaceConsole.tabPolicies", fallback: "Policies & sharing" },
  { id: "approvals", labelKey: "workspaceConsole.tabApprovals", fallback: "Approvals" },
];

export default function WorkspaceConsole(): React.JSX.Element {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("overview");
  // Governance session id — set in Settings; drives the approvals inbox.
  const [sessionId, setSessionId] = useState<string | null>(null);
  const data = useWorkspaceConsoleData(sessionId);

  const openExternal = useCallback(() => {
    if (data.probe?.baseUrl) window.hermesAPI.openExternal(data.probe.baseUrl);
  }, [data.probe?.baseUrl]);

  return (
    <div className="screen workspace-console">
      <div className="workspace-console-header">
        <div>
          <h2>{t("workspaceConsole.title", { defaultValue: "AI Workspace" })}</h2>
          <p className="workspace-console-subtitle">
            {t("workspaceConsole.subtitle", {
              defaultValue:
                "Attach, supervise, configure, and govern the workspace. Chat and files stay in the workspace.",
            })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => void data.reload()}>
            <Refresh size={14} />
            {t("workspaceConsole.refresh", { defaultValue: "Refresh" })}
          </button>
          <button className="btn btn-secondary" onClick={openExternal}>
            <ExternalLink size={14} />
            {t("workspaceConsole.openExternal", { defaultValue: "Open in browser" })}
          </button>
        </div>
      </div>

      <div className="workspace-console-tabs">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            className={`workspace-console-tab ${tab === entry.id ? "active" : ""}`}
            onClick={() => setTab(entry.id)}
          >
            {t(entry.labelKey, { defaultValue: entry.fallback })}
          </button>
        ))}
      </div>

      {data.loading ? (
        <p className="workspace-console-muted">{t("common.loading", { defaultValue: "Loading…" })}</p>
      ) : (
        <div className="workspace-console-panel">
          {tab === "overview" && <OverviewPanel data={data} />}
          {tab === "settings" && (
            <SettingsPanel data={data} sessionId={sessionId} onSessionId={setSessionId} />
          )}
          {tab === "sessions" && <SessionsPanel data={data} />}
          {tab === "policies" && <PoliciesPanel data={data} />}
          {tab === "approvals" && (
            <ApprovalsPanel data={data} sessionId={sessionId} />
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 4: Implement `OverviewPanel`**

```tsx
// src/renderer/src/screens/WorkspaceConsole/OverviewPanel.tsx
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../../components/useI18n";
import type { WorkspaceConsoleState } from "./useWorkspaceConsoleData";

export default function OverviewPanel({ data }: { data: WorkspaceConsoleState }): React.JSX.Element {
  const { t } = useI18n();
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const loadLog = useCallback(async () => {
    try {
      setLog((await window.hermesAPI.workspaceSupervisorLogTail()).lines);
    } catch {
      setLog([]);
    }
  }, []);

  useEffect(() => {
    void loadLog();
  }, [loadLog]);

  const act = useCallback(
    async (op: "start" | "stop") => {
      setBusy(true);
      try {
        if (op === "start") await window.hermesAPI.workspaceSupervisorStart();
        else await window.hermesAPI.workspaceSupervisorStop();
        await data.reload();
        await loadLog();
      } catch {
        /* fail-soft: the status row will show the stale state */
      } finally {
        setBusy(false);
      }
    },
    [data, loadLog],
  );

  const statusLabel = data.probe?.reachable
    ? t("workspaceConsole.statusReachable", { defaultValue: "Reachable" })
    : data.probe
      ? t("workspaceConsole.statusUnreachable", { defaultValue: "Not reachable" })
      : t("workspaceConsole.statusUnknown", { defaultValue: "Unknown" });

  return (
    <div className="workspace-console-panel">
      <div className="workspace-console-card">
        <div className="workspace-console-row">
          <strong>{t("workspaceConsole.statusReachable", { defaultValue: "Reachable" }) && statusLabel}</strong>
          <span className="workspace-console-muted">
            {data.probe?.baseUrl ?? "—"}
            {data.probe?.version ? ` · v${data.probe.version}` : ""}
          </span>
        </div>
        {data.probe?.error && <p className="workspace-console-error">{data.probe.error}</p>}
      </div>

      <div className="workspace-console-card">
        <div className="workspace-console-row">
          <span>
            {t("workspaceConsole.logTail", { defaultValue: "Supervisor log" })}
            {data.supervisor ? ` · ${data.supervisor.state}` : ""}
          </span>
          <span style={{ display: "flex", gap: 8 }}>
            {data.supervisor?.running ? (
              <button className="btn btn-secondary" disabled={busy} onClick={() => void act("stop")}>
                {t("workspaceConsole.stop", { defaultValue: "Stop" })}
              </button>
            ) : null}
            {data.supervisor?.cli && !data.supervisor?.running ? (
              <button className="btn btn-primary" disabled={busy} onClick={() => void act("start")}>
                {t("workspaceConsole.start", { defaultValue: "Start" })}
              </button>
            ) : null}
          </span>
        </div>
        <pre className="workspace-console-log">
          {log.length ? log.join("\n") : t("workspaceConsole.noLog", { defaultValue: "No log output yet." })}
        </pre>
      </div>
    </div>
  );
}
```

**Step 5: Add stub panels** so the build compiles (tasks 5–8 fill them in):

```tsx
// src/renderer/src/screens/WorkspaceConsole/SettingsPanel.tsx
import type { WorkspaceConsoleState } from "./useWorkspaceConsoleData";
export default function SettingsPanel(_: {
  data: WorkspaceConsoleState;
  sessionId: string | null;
  onSessionId: (v: string | null) => void;
}): React.JSX.Element {
  return <div className="workspace-console-panel" />;
}
```

```tsx
// src/renderer/src/screens/WorkspaceConsole/SessionsPanel.tsx
import type { WorkspaceConsoleState } from "./useWorkspaceConsoleData";
export default function SessionsPanel(_: { data: WorkspaceConsoleState }): React.JSX.Element {
  return <div className="workspace-console-panel" />;
}
```

```tsx
// src/renderer/src/screens/WorkspaceConsole/PoliciesPanel.tsx
import type { WorkspaceConsoleState } from "./useWorkspaceConsoleData";
export default function PoliciesPanel(_: { data: WorkspaceConsoleState }): React.JSX.Element {
  return <div className="workspace-console-panel" />;
}
```

```tsx
// src/renderer/src/screens/WorkspaceConsole/ApprovalsPanel.tsx
import type { WorkspaceConsoleState } from "./useWorkspaceConsoleData";
export default function ApprovalsPanel(_: {
  data: WorkspaceConsoleState;
  sessionId: string | null;
}): React.JSX.Element {
  return <div className="workspace-console-panel" />;
}
```

> `openExternal` already exists on `window.hermesAPI` (used today by the old screen). Delete the old `<webview>` body and the `workspaceConsoleUrl` usage here; leave `workspaceConsoleUrl` in preload (Task 9 removes it once nothing references it).

**Step 6: Verify**

Run: `node node_modules/vitest/vitest.mjs run tests/workspace-console.test.tsx`
Expected: PASS (3 tests: status + tabs, stop action, no `webview`).

Run: `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.web.json --composite false`
Expected: no errors.

**Step 7: Commit**

```bash
git add agent-desktop/src/renderer/src/screens/WorkspaceConsole tests/workspace-console.test.tsx
git commit -m "feat(workspace-console): tabbed container + overview/lifecycle panel, drop the webview embed"
```

---

### Task 5: Settings panel — LLM provisioning (M2, fingerprints-only)

**Files:**
- Modify: `agent-desktop/src/renderer/src/screens/WorkspaceConsole/SettingsPanel.tsx`
- Modify: `agent-desktop/tests/workspace-console.test.tsx`

**Step 1: Add the failing test**

```tsx
  it("provisions the LLM env and shows fingerprints only", async () => {
    const provision = vi.fn().mockResolvedValue({
      written: true,
      fingerprintedKeys: ["HERMES_API_KEY=abcd…wxyz"],
      error: null,
    });
    installApi({ workspaceProvisionEnv: provision });

    render(<WorkspaceConsole />);
    await waitFor(() => expect(screen.getByText("statusReachable")).toBeTruthy());
    fireEvent.click(screen.getByText("tabSettings"));
    fireEvent.change(screen.getByLabelText("provisionHermesUrl"), {
      target: { value: "http://127.0.0.1:8642" },
    });
    fireEvent.change(screen.getByLabelText("provisionHermesKey"), {
      target: { value: "sk-secret" },
    });
    fireEvent.click(screen.getByText("provisionWrite"));

    await waitFor(() => expect(provision).toHaveBeenCalled());
    // The secret must never be echoed into the DOM.
    expect(screen.queryByText("sk-secret")).toBeNull();
  });
```

**Step 2: Run and watch it fail**

Run: `node node_modules/vitest/vitest.mjs run tests/workspace-console.test.tsx`
Expected: FAIL — labels/buttons absent.

**Step 3: Implement**

```tsx
// src/renderer/src/screens/WorkspaceConsole/SettingsPanel.tsx
import { useState } from "react";
import { useI18n } from "../../components/useI18n";
import type { WorkspaceConsoleState } from "./useWorkspaceConsoleData";

export default function SettingsPanel({
  sessionId,
  onSessionId,
}: {
  data: WorkspaceConsoleState;
  sessionId: string | null;
  onSessionId: (v: string | null) => void;
}): React.JSX.Element {
  const { t } = useI18n();
  const [hermesUrl, setHermesUrl] = useState("");
  const [hermesKey, setHermesKey] = useState("");
  const [localSingleUser, setLocalSingleUser] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const provision = async () => {
    setBusy(true);
    try {
      const res = await window.hermesAPI.workspaceProvisionEnv(
        {
          workspaceBaseUrl: "",
          hermesBaseUrl: hermesUrl || null,
          hermesApiKey: hermesKey || null,
          localSingleUser,
        },
        { write: true },
      );
      setStatus(res.written ? "written" : (res.error ?? "blocked"));
      setHermesKey(""); // never keep the secret in component state after write
    } catch (err) {
      setStatus(String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="workspace-console-panel">
      <div className="workspace-console-card">
        <p className="workspace-console-muted">
          {t("workspaceConsole.provisionHint", {
            defaultValue:
              "Writes the workspace's env fragment on next start. Secrets are stored as fingerprints only, never echoed back.",
          })}
        </p>
        <label htmlFor="provisionHermesUrl">
          {t("workspaceConsole.provisionHermesUrl", { defaultValue: "Hermes gateway URL" })}
        </label>
        <input
          id="provisionHermesUrl"
          className="workspace-console-input"
          aria-label="provisionHermesUrl"
          value={hermesUrl}
          onChange={(e) => setHermesUrl(e.target.value)}
        />
        <label htmlFor="provisionHermesKey">
          {t("workspaceConsole.provisionHermesKey", { defaultValue: "Hermes API key" })}
        </label>
        <input
          id="provisionHermesKey"
          className="workspace-console-input"
          type="password"
          aria-label="provisionHermesKey"
          value={hermesKey}
          onChange={(e) => setHermesKey(e.target.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={localSingleUser}
            onChange={(e) => setLocalSingleUser(e.target.checked)}
          />{" "}
          {t("workspaceConsole.provisionLocalSingleUser", {
            defaultValue: "Single-user local mode",
          })}
        </label>
        <button className="btn btn-primary" disabled={busy} onClick={() => void provision()}>
          {t("workspaceConsole.provisionWrite", { defaultValue: "Provision" })}
        </button>
        {status && (
          <p className="workspace-console-muted">
            {status === "written"
              ? t("workspaceConsole.provisionWritten", { defaultValue: "Provisioned" })
              : status}
          </p>
        )}
      </div>

      <div className="workspace-console-card">
        <label htmlFor="governanceSession">
          {t("workspaceConsole.approvalsTitle", { defaultValue: "Approval inbox" })}
          {" — session id"}
        </label>
        <input
          id="governanceSession"
          className="workspace-console-input"
          aria-label="governanceSession"
          placeholder="session id"
          value={sessionId ?? ""}
          onChange={(e) => onSessionId(e.target.value || null)}
        />
      </div>
    </div>
  );
}
```

> The provision input shape is `{ workspaceBaseUrl, hermesBaseUrl, hermesApiKey, localSingleUser }` (`ProvisionInput` in `src/main/cubecloud-agent-config.ts:23`), and the write must pass `{ write: true }` as the second argument (dry-run by default).

**Step 4: Verify**

Run: `node node_modules/vitest/vitest.mjs run tests/workspace-console.test.tsx`
Expected: PASS (4 tests).

**Step 5: Commit**

```bash
git add agent-desktop/src/renderer/src/screens/WorkspaceConsole/SettingsPanel.tsx agent-desktop/tests/workspace-console.test.tsx
git commit -m "feat(workspace-console): LLM provisioning panel (fingerprints-only, secret never echoed)"
```

---

### Task 6: Sessions & agents mirror panel (M3)

**Files:**
- Modify: `agent-desktop/src/renderer/src/screens/WorkspaceConsole/SessionsPanel.tsx`
- Modify: `agent-desktop/tests/workspace-console.test.tsx`

**Step 1: Add the failing test**

```tsx
  it("mirrors workspace sessions and agents read-only", async () => {
    installApi({
      listWorkspaceSessions: vi.fn().mockResolvedValue({
        success: true,
        data: [{ id: "s1", title: "First" }],
        hasMore: false,
      }),
      listWorkspaceAgents: vi.fn().mockResolvedValue({
        success: true,
        data: [{ id: "a1", name: "Researcher" }],
        hasMore: false,
      }),
    });
    render(<WorkspaceConsole />);
    await waitFor(() => expect(screen.getByText("statusReachable")).toBeTruthy());
    fireEvent.click(screen.getByText("tabSessions"));
    await waitFor(() => expect(screen.getByText("s1")).toBeTruthy());
    expect(screen.getByText("Researcher")).toBeTruthy();
  });
```

**Step 2: Run and watch it fail**

Run: `node node_modules/vitest/vitest.mjs run tests/workspace-console.test.tsx`
Expected: FAIL — panel is empty.

**Step 3: Implement**

```tsx
// src/renderer/src/screens/WorkspaceConsole/SessionsPanel.tsx
import { useI18n } from "../../components/useI18n";
import type { WorkspaceConsoleState } from "./useWorkspaceConsoleData";

export default function SessionsPanel({ data }: { data: WorkspaceConsoleState }): React.JSX.Element {
  const { t } = useI18n();
  return (
    <div className="workspace-console-panel">
      <div className="workspace-console-card">
        <strong>{t("workspaceConsole.sessionsTitle", { defaultValue: "Workspace sessions" })}</strong>
        {data.sessions.length === 0 ? (
          <p className="workspace-console-muted">
            {t("workspaceConsole.sessionsEmpty", { defaultValue: "No sessions reported." })}
          </p>
        ) : (
          <ul className="workspace-console-list">
            {data.sessions.map((s) => (
              <li key={s.id}>{s.title ?? s.id}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="workspace-console-card">
        <strong>{t("workspaceConsole.agentsTitle", { defaultValue: "Workspace agents" })}</strong>
        {data.agents.length === 0 ? (
          <p className="workspace-console-muted">
            {t("workspaceConsole.agentsEmpty", { defaultValue: "No agents reported." })}
          </p>
        ) : (
          <ul className="workspace-console-list">
            {data.agents.map((a) => (
              <li key={a.id}>{a.name}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

> Confirm the exact field names on `WorkspaceSessionSummary` / `WorkspaceAgentBundle` in `src/main/cubecloud-agent-sessions.ts` (`id`/`title` vs `id`/`name`) and adjust the test fixtures + list cells to match; keep the panel read-only (no buttons).

**Step 4: Verify**

Run: `node node_modules/vitest/vitest.mjs run tests/workspace-console.test.tsx`
Expected: PASS (5 tests).

**Step 5: Commit**

```bash
git add agent-desktop/src/renderer/src/screens/WorkspaceConsole/SessionsPanel.tsx agent-desktop/tests/workspace-console.test.tsx
git commit -m "feat(workspace-console): read-only sessions & agents mirror"
```

---

### Task 7: Policies & sharing panel (M1 read)

**Files:**
- Modify: `agent-desktop/src/renderer/src/screens/WorkspaceConsole/PoliciesPanel.tsx`
- Modify: `agent-desktop/tests/workspace-console.test.tsx`

**Step 1: Add the failing test**

```tsx
  it("renders policies, scheduled tasks, and tolerant partial-surface errors", async () => {
    installApi({
      workspaceGovernanceSurfaces: vi.fn().mockResolvedValue({
        scheduledTasks: [{ id: "t1", name: "Nightly", mode: "cron", nextRun: null }],
        policies: [{ name: "ask-before-shell", mode: "ask" }],
        shares: [],
        errors: ["policy-registry HTTP 404"],
      }),
    });
    render(<WorkspaceConsole />);
    await waitFor(() => expect(screen.getByText("statusReachable")).toBeTruthy());
    fireEvent.click(screen.getByText("tabPolicies"));
    await waitFor(() => expect(screen.getByText("ask-before-shell")).toBeTruthy());
    expect(screen.getByText("Nightly")).toBeTruthy();
    expect(screen.getByText("surfacesPartial")).toBeTruthy();
  });
```

**Step 2: Run and watch it fail**

Run: `node node_modules/vitest/vitest.mjs run tests/workspace-console.test.tsx`
Expected: FAIL — panel is empty.

**Step 3: Implement**

```tsx
// src/renderer/src/screens/WorkspaceConsole/PoliciesPanel.tsx
import { useI18n } from "../../components/useI18n";
import type { WorkspaceConsoleState } from "./useWorkspaceConsoleData";

export default function PoliciesPanel({ data }: { data: WorkspaceConsoleState }): React.JSX.Element {
  const { t } = useI18n();
  const surfaces = data.surfaces;
  return (
    <div className="workspace-console-panel">
      <div className="workspace-console-card">
        <strong>{t("workspaceConsole.policiesTitle", { defaultValue: "Policy registry" })}</strong>
        {!surfaces || surfaces.policies.length === 0 ? (
          <p className="workspace-console-muted">
            {t("workspaceConsole.policiesEmpty", { defaultValue: "No policies reported." })}
          </p>
        ) : (
          <ul className="workspace-console-list">
            {surfaces.policies.map((p) => (
              <li key={p.name}>
                {p.name}
                {p.mode ? ` · ${p.mode}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="workspace-console-card">
        <strong>{t("workspaceConsole.scheduledTitle", { defaultValue: "Scheduled tasks" })}</strong>
        {!surfaces || surfaces.scheduledTasks.length === 0 ? (
          <p className="workspace-console-muted">
            {t("workspaceConsole.scheduledEmpty", { defaultValue: "No scheduled tasks reported." })}
          </p>
        ) : (
          <ul className="workspace-console-list">
            {surfaces.scheduledTasks.map((s) => (
              <li key={s.id ?? s.name}>{s.name}</li>
            ))}
          </ul>
        )}
      </div>

      {surfaces && surfaces.errors.length > 0 && (
        <p className="workspace-console-error">
          {t("workspaceConsole.surfacesPartial", {
            defaultValue: "Some workspace surfaces are unavailable (older build).",
          })}
        </p>
      )}
    </div>
  );
}
```

**Step 4: Verify**

Run: `node node_modules/vitest/vitest.mjs run tests/workspace-console.test.tsx`
Expected: PASS (6 tests).

**Step 5: Commit**

```bash
git add agent-desktop/src/renderer/src/screens/WorkspaceConsole/PoliciesPanel.tsx agent-desktop/tests/workspace-console.test.tsx
git commit -m "feat(workspace-console): policies/scheduled-tasks/sharing registry view (tolerant of 404 surfaces)"
```

---

### Task 8: Approvals inbox — the ONE verdict write (row G)

**Files:**
- Modify: `agent-desktop/src/renderer/src/screens/WorkspaceConsole/ApprovalsPanel.tsx`
- Modify: `agent-desktop/tests/workspace-console.test.tsx`

**Step 1: Add the failing test**

```tsx
  it("delivers an approval verdict and disables when no session is set", async () => {
    const resolve = vi.fn().mockResolvedValue({ success: true, queued: true });
    installApi({
      workspaceGovernanceElicitations: vi.fn().mockResolvedValue({
        success: true,
        requests: [
          {
            elicitationId: "e1",
            mode: "form",
            message: "Allow shell?",
            requestedSchema: null,
            url: null,
            phase: "policy",
            policyName: "ask-before-shell",
            contentPreview: null,
            targetSessionId: null,
          },
        ],
      }),
      workspaceGovernanceResolve: resolve,
    });
    render(<WorkspaceConsole />);
    await waitFor(() => expect(screen.getByText("statusReachable")).toBeTruthy());
    fireEvent.click(screen.getByText("tabSettings"));
    fireEvent.change(screen.getByLabelText("governanceSession"), { target: { value: "sess-1" } });
    fireEvent.click(screen.getByText("tabApprovals"));
    await waitFor(() => expect(screen.getByText("Allow shell?")).toBeTruthy());
    fireEvent.click(screen.getByText("approve"));
    await waitFor(() => expect(resolve).toHaveBeenCalledWith(undefined, "sess-1", "e1", { action: "accept" }));
  });
```

**Step 2: Run and watch it fail**

Run: `node node_modules/vitest/vitest.mjs run tests/workspace-console.test.tsx`
Expected: FAIL — no approve button / no list row.

**Step 3: Implement**

```tsx
// src/renderer/src/screens/WorkspaceConsole/ApprovalsPanel.tsx
import { useState } from "react";
import { useI18n } from "../../components/useI18n";
import type { WorkspaceConsoleState } from "./useWorkspaceConsoleData";

export default function ApprovalsPanel({
  data,
  sessionId,
}: {
  data: WorkspaceConsoleState;
  sessionId: string | null;
}): React.JSX.Element {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  const decide = async (id: string, action: "accept" | "decline" | "cancel") => {
    if (!sessionId) return;
    setBusy(true);
    try {
      await window.hermesAPI.workspaceGovernanceResolve(undefined, sessionId, id, { action });
      await data.reload();
    } catch {
      /* fail-soft: the row stays until a successful reload */
    } finally {
      setBusy(false);
    }
  };

  if (!sessionId) {
    return (
      <div className="workspace-console-panel">
        <p className="workspace-console-muted">
          {t("workspaceConsole.approvalUnavailable", {
            defaultValue: "Approvals need a governance session id (Settings).",
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="workspace-console-panel">
      {data.elicitations.length === 0 ? (
        <p className="workspace-console-muted">
          {t("workspaceConsole.approvalsEmpty", { defaultValue: "Nothing waiting on you." })}
        </p>
      ) : (
        data.elicitations.map((req) => (
          <div className="workspace-console-card" key={req.elicitationId}>
            <div className="workspace-console-row">
              <span>{req.message ?? req.elicitationId}</span>
              <span style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary" disabled={busy} onClick={() => void decide(req.elicitationId, "accept")}>
                  {t("workspaceConsole.approve", { defaultValue: "Approve" })}
                </button>
                <button className="btn btn-secondary" disabled={busy} onClick={() => void decide(req.elicitationId, "decline")}>
                  {t("workspaceConsole.decline", { defaultValue: "Decline" })}
                </button>
                <button className="btn btn-secondary" disabled={busy} onClick={() => void decide(req.elicitationId, "cancel")}>
                  {t("workspaceConsole.cancel", { defaultValue: "Cancel" })}
                </button>
              </span>
            </div>
            {req.policyName && (
              <p className="workspace-console-muted">
                {t("workspaceConsole.approvalPolicy", { defaultValue: "Policy" })}: {req.policyName}
              </p>
            )}
          </div>
        ))
      )}
      {data.elicitationError && <p className="workspace-console-error">{data.elicitationError}</p>}
    </div>
  );
}
```

**Step 4: Verify**

Run: `node node_modules/vitest/vitest.mjs run tests/workspace-console.test.tsx`
Expected: PASS (7 tests).

**Step 5: Commit**

```bash
git add agent-desktop/src/renderer/src/screens/WorkspaceConsole/ApprovalsPanel.tsx agent-desktop/tests/workspace-console.test.tsx
git commit -m "feat(workspace-console): approvals inbox delivering the single verdict write"
```

---

### Task 9: Retire the unused `workspaceConsoleUrl` bridge

**Files:**
- Modify: `agent-desktop/src/main/index.ts`
- Modify: `agent-desktop/src/preload/index.ts`
- Modify: `agent-desktop/src/preload/index.d.ts`

**Step 1: Prove nothing references it**

Run: `git grep -n "workspaceConsoleUrl"` (cwd worktree root)
Expected: only the three definition sites and (after Task 4) **no renderer usage**. If any renderer reference remains, stop and fix it first.

**Step 2: Remove the channel + bridge**

Delete the `ipcMain.handle("workspace-console-url", …)` block in `src/main/index.ts` (~L2816), the `workspaceConsoleUrl` entry in `src/preload/index.ts` (~L1641), and its declaration in `src/preload/index.d.ts`. Remove any now-unused import (`isAllowedWebviewUrl` stays if still used elsewhere — check).

**Step 3: Verify**

Run: `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.node.json --composite false`
Expected: no errors (unused imports would fail here).

Run: `node console-backend/parity-check-v2.cjs` (cwd `agent-desktop`)
Expected: `PARITY PASS` — the cap count drops by exactly 1 (and the preload-method count by 1); the "deliberate new-wiring" list is unchanged.

**Step 4: Commit**

```bash
git add agent-desktop/src/main/index.ts agent-desktop/src/preload/index.ts agent-desktop/src/preload/index.d.ts
git commit -m "refactor: retire the workspace-console-url embed bridge (no renderer consumer)"
```

---

### Task 10: Wire the nav label + full verification ladder

**Files:**
- Modify: `agent-desktop/src/shared/i18n/locales/en/navigation.ts` (+ 7 fallbacks)
- (no code change to `Layout.tsx` — the `workspaceConsole` view already exists)

**Step 1: Update the nav label**

In `navigation.ts`, change the `workspaceConsole` label to "AI Workspace" (it currently reads as an embed). Mirror the value into the 7 fallback locales.

**Step 2: Run the full ladder**

```bash
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.node.json --composite false
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.web.json --composite false
node node_modules/vitest/vitest.mjs run
node console-backend/parity-check-v2.cjs
node console-backend/selftest.cjs
```

Expected:
- both typechecks: no errors
- full suite: **0 failed** (baseline 1551 tests at `ad6a68e`; Phase C adds ~7, so ~1558)
- parity: `PARITY PASS`
- selftest: `SELFTEST PASS`

**Step 3: Commit**

```bash
git add agent-desktop/src/shared/i18n
git commit -m "docs(i18n): label the AI Workspace nav entry"
```

---

## Self-review

- **Every task 2–5 minutes?** Tasks 1, 2, 9, 10 are small. Tasks 3–8 are one panel + one test each (~one screen of code). They are individually committable and green; if any exceeds the budget in practice, split the panel from its test and make the test the first commit.
- **Every step complete?** Yes, except the three "confirm the exact type" notes (Tasks 5, 6, and the `workspaceProvisionEnv` field names) — these are deliberate: the types are in-repo and must be read, not guessed, so the plan names the exact file to check.
- **Every verification runnable?** Yes — each is a literal command with expected output.
- **Order optimal?** Skeleton (i18n, CSS) → hook → container → leaves (panels) → cleanup (bridge) → ladder. Yes.
- **Smoke covers the outcome?** Task 10's ladder + the Task 4 "no `webview`" assertion cover the user-facing outcome (a management surface, not an embed).

## Out of scope (follow-up plan)

New workspace **writes** — scheduled-task create/update/delete, session MCP servers, media settings, sharing edits, policy edits. Each needs a new IPC channel + handler + audit rule + tests, and none is needed for the MVP verdict. Capture as `docs/plans/<date>-workspace-writes-plan.md` when the appliance pilot demands it.
