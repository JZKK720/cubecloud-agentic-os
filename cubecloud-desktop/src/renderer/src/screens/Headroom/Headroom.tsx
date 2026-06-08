/**
 * Headroom surface — context compression proxy for LLM calls
 * (https://github.com/JZKK720/headroom).
 *
 * Wire shape (matches src/main/headroom.ts and the renderer preload
 * bridge in src/preload/index.d.ts):
 *   - headroomGetConfig / headroomSaveConfig → persisted to desktop.json
 *   - headroomPing → GET {baseUrl}/health
 *   - headroomCompress → POST {baseUrl}/v1/compress
 *   - headroomRetrieve → POST {baseUrl}/v1/retrieve
 *   - headroomStats → GET {baseUrl}/v1/stats
 *
 * The screen is fully functional even when the Headroom proxy is not
 * installed — the operator just needs a reachable base URL or can
 * start the sidecar from the lifecycle card.
 */

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../../components/useI18n";
import {
  Refresh,
  Alert as AlertIcon,
} from "../../assets/icons";

type HeadroomConfig = {
  baseUrl: string;
  mode: "audit" | "optimize";
  enabled: boolean;
  apiKey: string | null;
  /**
   * Mirrors the persisted desktop.json field. When true, the
   * quick-start card collapses into a one-line summary.
   */
  firstRunDismissed?: boolean;
};

// Threshold for the "Switch to optimize" CTA. We only suggest
// mode flip once the proxy has reported at least this many
// requests AND an average savings >= this percentage. The
// numbers match the typical headroom value prop (≈70%) and
// give the operator enough signal that flipping mode is
// worthwhile.
const OPTIMIZE_CTA_MIN_REQUESTS = 5;
const OPTIMIZE_CTA_MIN_SAVINGS = 20;

type HeadroomHealthStatus = {
  reachable: boolean;
  status: string | null;
  detail: string | null;
  version: string | null;
  scannedAt: string;
};

type HeadroomMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
};

type HeadroomCompressResult = {
  success: boolean;
  messages: HeadroomMessage[];
  tokensBefore: number;
  tokensAfter: number;
  savingsPercent: number;
  compressed: boolean;
  error?: string;
};

type HeadroomRetrieveResult = {
  success: boolean;
  content: string | null;
  error?: string;
};

type HeadroomLearnProposal = {
  type:
    | "pattern"
    | "pitfall"
    | "preference"
    | "architecture"
    | "tool"
    | "operational";
  key: string;
  insight: string;
  confidence: number;
  source: "inferred" | "cross-model" | "user-stated" | "observed";
  evidence: string;
  section?: string;
};

type HeadroomLearnReport = {
  generatedAt: string;
  projectPath: string;
  sessionCount: number;
  totalRecommendations: number;
  outputFiles: string[];
  proposals: HeadroomLearnProposal[];
  rawOutput: string;
  durationMs: number;
};

type HeadroomLearnResult = {
  success: boolean;
  report?: HeadroomLearnReport;
  error?: string;
  skipReason?: string;
};

type HeadroomStats = {
  success: boolean;
  totalRequests: number;
  totalTokensSaved: number;
  totalTokensBefore: number;
  totalTokensAfter: number;
  avgSavingsPercent: number;
  ccrEntries: number;
  uptimeSeconds: number;
  error?: string;
};

interface HeadroomSidecarStatus {
  state: "stopped" | "starting" | "running" | "crashed" | "exited";
  running: boolean;
  pid: number | null;
  port: number | null;
  baseUrl: string;
  lastError: string | null;
  crashCount: number;
  startedAt: number | null;
  uptimeMs: number | null;
  reason: string | null;
  mode: "audit" | "optimize";
}

interface HeadroomSidecarLogTail {
  lines: string[];
  totalBytes: number;
}

interface HeadroomProps {
  visible?: boolean;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function Headroom({ visible: _visible }: HeadroomProps = {}): React.JSX.Element {
  const { t } = useI18n();
  const [health, setHealth] = useState<HeadroomHealthStatus | null>(null);
  const [stats, setStats] = useState<HeadroomStats | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<HeadroomConfig | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [pulsing, setPulsing] = useState(false);

  // Compression test
  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState<HeadroomCompressResult | null>(null);
  const [compressing, setCompressing] = useState(false);

  // CCR retrieve
  const [retrieveKey, setRetrieveKey] = useState("");
  const [retrieveResult, setRetrieveResult] = useState<HeadroomRetrieveResult | null>(null);
  const [retrieving, setRetrieving] = useState(false);

  // Sidecar state
  const [sidecar, setSidecar] = useState<HeadroomSidecarStatus | null>(null);
  const [logTail, setLogTail] = useState<HeadroomSidecarLogTail | null>(null);
  const [sidecarBusy, setSidecarBusy] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  // UI-only: shows the "Copied!" hint after the user copies
  // the Headroom install command. The flag auto-resets so
  // the button label flips back to the default.
  const [installCopied, setInstallCopied] = useState(false);
  // UI-only: shows a busy state on the "Switch to optimize"
  // CTA so the operator gets feedback during the round-trip.
  const [switchingMode, setSwitchingMode] = useState(false);

  // Learn state. The user runs `headroom learn` against a
  // project path; the proposals come back and are shown in a
  // review list with checkboxes. The user picks which to
  // keep and clicks "commit" — those land in learnings.jsonl
  // with skill: "headroom-learn" (the same place the
  // heuristic retro writes).
  const [learnProjectPath, setLearnProjectPath] = useState("");
  const [learnModel, setLearnModel] = useState("");
  const [learnAgent, setLearnAgent] = useState<"auto" | "claude" | "codex" | "gemini">("auto");
  const [learnRunning, setLearnRunning] = useState(false);
  const [learnReport, setLearnReport] = useState<HeadroomLearnReport | null>(null);
  const [learnError, setLearnError] = useState<string | null>(null);
  const [learnSkipReason, setLearnSkipReason] = useState<string | null>(null);
  const [learnSelected, setLearnSelected] = useState<Set<number>>(new Set());
  const [learnCommitting, setLearnCommitting] = useState(false);
  const [learnCommitMessage, setLearnCommitMessage] = useState<string | null>(null);

  // Apply-to-target-files state. After a successful learn
  // run the user can hit "Apply to AGENTS.md" — that runs
  // `headroom learn --apply` and returns per-file
  // before/after snapshots. The render shows a diff
  // preview and exposes a "Revert" button that restores
  // the prior content.
  const [learnApplyDiffs, setLearnApplyDiffs] = useState<
    Array<{ path: string; created: boolean; before: string; after: string }>
  >([]);
  const [learnApplying, setLearnApplying] = useState(false);
  const [learnApplyMessage, setLearnApplyMessage] = useState<string | null>(null);
  const [learnReverting, setLearnReverting] = useState(false);

  const loadAll = useCallback(async () => {
    setPulsing(true);
    try {
      const cfg = await window.hermesAPI.headroomGetConfig();
      setDraft(cfg);
      const h = await window.hermesAPI.headroomPing();
      setHealth(h);
      if (h.reachable) {
        const s = await window.hermesAPI.headroomStats();
        setStats(s);
      } else {
        setStats(null);
      }
      try {
        const sc = await window.hermesAPI.headroomSidecarStatus();
        setSidecar(sc);
        if (sc.state === "crashed" || sc.state === "exited") {
          const tail = await window.hermesAPI.headroomSidecarLogTail();
          setLogTail(tail);
        }
      } catch {
        setSidecar(null);
      }
    } finally {
      setPulsing(false);
    }
  }, []);

  useEffect(() => {
    if (_visible) void loadAll();
  }, [_visible, loadAll]);

  const handleSaveConfig = useCallback(async () => {
    if (!draft) return;
    setSavingConfig(true);
    try {
      const saved = await window.hermesAPI.headroomSaveConfig({
        baseUrl: draft.baseUrl,
        mode: draft.mode,
        enabled: draft.enabled,
        apiKey: draft.apiKey,
        // Preserve the firstRunDismissed flag. The form
        // editor for baseUrl/mode/apiKey doesn't touch it,
        // but a partial save would otherwise reset it.
        firstRunDismissed: draft.firstRunDismissed ?? false,
      });
      setDraft(saved);
      setEditing(false);
      const h = await window.hermesAPI.headroomPing();
      setHealth(h);
    } finally {
      setSavingConfig(false);
    }
  }, [draft]);

  // First-run / quick-start helpers. These persist via the
  // existing `headroomSaveConfig` channel — adding
  // `firstRunDismissed` to the payload is forward-compatible
  // because the main process merges it into desktop.json.
  const handleDismissQuickStart = useCallback(async () => {
    try {
      const saved = await window.hermesAPI.headroomSaveConfig({
        firstRunDismissed: true,
      });
      setDraft(saved);
    } catch {
      // Best-effort UI state; the card simply stays open.
    }
  }, []);

  const handleResetQuickStart = useCallback(async () => {
    try {
      const saved = await window.hermesAPI.headroomSaveConfig({
        firstRunDismissed: false,
      });
      setDraft(saved);
    } catch {
      // Best-effort UI state; the card stays collapsed.
    }
  }, []);

  // "Switch to optimize" CTA. We only show the CTA when the
  // proxy is reachable, the operator is in audit mode, and
  // the stats report enough requests and savings to justify
  // the flip. The actual write goes through the same
  // `headroomSaveConfig` channel used by the config editor.
  const showOptimizeCta =
    !!draft &&
    draft.mode === "audit" &&
    !!stats?.success &&
    stats.totalRequests >= OPTIMIZE_CTA_MIN_REQUESTS &&
    stats.avgSavingsPercent >= OPTIMIZE_CTA_MIN_SAVINGS;

  const handleSwitchToOptimize = useCallback(async () => {
    if (!draft) return;
    setSwitchingMode(true);
    try {
      const saved = await window.hermesAPI.headroomSaveConfig({
        mode: "optimize",
      });
      setDraft(saved);
    } catch {
      // Best-effort; the operator can re-edit in the config
      // card if the write fails.
    } finally {
      setSwitchingMode(false);
    }
  }, [draft]);

  const handleCompressTest = useCallback(async () => {
    if (!testInput.trim()) return;
    setCompressing(true);
    setTestResult(null);
    try {
      const messages: HeadroomMessage[] = [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: testInput.trim() },
      ];
      const result = await window.hermesAPI.headroomCompress(messages);
      setTestResult(result);
    } finally {
      setCompressing(false);
    }
  }, [testInput]);

  const handleRetrieve = useCallback(async () => {
    if (!retrieveKey.trim()) return;
    setRetrieving(true);
    setRetrieveResult(null);
    try {
      const result = await window.hermesAPI.headroomRetrieve(retrieveKey.trim());
      setRetrieveResult(result);
    } finally {
      setRetrieving(false);
    }
  }, [retrieveKey]);

  // Sidecar lifecycle handlers
  const sidecarStart = useCallback(async () => {
    setSidecarBusy(true);
    try {
      const next = await window.hermesAPI.headroomSidecarStart();
      setSidecar(next);
      const tail = await window.hermesAPI.headroomSidecarLogTail();
      setLogTail(tail);
    } finally {
      setSidecarBusy(false);
    }
  }, []);

  const sidecarStop = useCallback(async () => {
    setSidecarBusy(true);
    try {
      const next = await window.hermesAPI.headroomSidecarStop();
      setSidecar(next);
    } finally {
      setSidecarBusy(false);
    }
  }, []);

  const sidecarRestart = useCallback(async () => {
    setSidecarBusy(true);
    try {
      const next = await window.hermesAPI.headroomSidecarRestart();
      setSidecar(next);
      const tail = await window.hermesAPI.headroomSidecarLogTail();
      setLogTail(tail);
    } finally {
      setSidecarBusy(false);
    }
  }, []);

  const refreshLogTail = useCallback(async () => {
    const tail = await window.hermesAPI.headroomSidecarLogTail();
    setLogTail(tail);
  }, []);

  const clearLogTail = useCallback(async () => {
    await window.hermesAPI.headroomSidecarClearLogs();
    setLogTail({ lines: [], totalBytes: 0 });
  }, []);

  // Learn handlers. The run is async and bounded to 5
  // minutes server-side, so we surface a loading state and
  // let the user cancel via the same handler.
  const handleRunLearn = useCallback(async () => {
    if (!learnProjectPath.trim()) {
      setLearnError("Choose a project folder first.");
      return;
    }
    setLearnRunning(true);
    setLearnError(null);
    setLearnSkipReason(null);
    setLearnReport(null);
    setLearnCommitMessage(null);
    try {
      const result: HeadroomLearnResult =
        await window.hermesAPI.headroomLearnRun({
          projectPath: learnProjectPath.trim(),
          model: learnModel.trim() || undefined,
          agent: learnAgent,
          apply: false,
        });
      if (result.success && result.report) {
        setLearnReport(result.report);
        // Default selection: all proposals checked. The
        // user can uncheck anything they don't want.
        setLearnSelected(
          new Set(result.report.proposals.map((_, idx) => idx)),
        );
      } else {
        setLearnError(result.error ?? "headroom learn failed.");
        setLearnSkipReason(result.skipReason ?? null);
      }
    } catch (err) {
      setLearnError((err as Error).message);
    } finally {
      setLearnRunning(false);
    }
  }, [learnProjectPath, learnModel, learnAgent]);

  const handleStopLearn = useCallback(async () => {
    await window.hermesAPI.headroomLearnStop();
    setLearnRunning(false);
  }, []);

  const handleCommitLearn = useCallback(async () => {
    if (!learnReport) return;
    const selectedProposals = learnReport.proposals.filter((_, idx) =>
      learnSelected.has(idx),
    );
    if (selectedProposals.length === 0) {
      setLearnCommitMessage("Pick at least one proposal to commit.");
      return;
    }
    setLearnCommitting(true);
    setLearnCommitMessage(null);
    try {
      const committed = await window.hermesAPI.headroomLearnCommit(
        selectedProposals,
      );
      setLearnCommitMessage(
        `Committed ${committed.length} learning${committed.length === 1 ? "" : "s"} to learnings.jsonl.`,
      );
      // Clear the selection so the user can review the
      // remaining (uncommitted) proposals.
      setLearnSelected(new Set());
    } catch (err) {
      setLearnCommitMessage(
        `Commit failed: ${(err as Error).message}`,
      );
    } finally {
      setLearnCommitting(false);
    }
  }, [learnReport, learnSelected]);

  // Apply — run `headroom learn --apply` against the
  // project and capture per-file before/after diffs. The
  // corrections are written to AGENTS.md / CLAUDE.md /
  // GEMINI.md inside the project. The render shows a
  // preview so the user can hit "Revert" if Headroom
  // overcorrected.
  const handleApplyLearn = useCallback(async () => {
    if (!learnProjectPath.trim()) {
      setLearnApplyMessage("Choose a project folder first.");
      return;
    }
    setLearnApplying(true);
    setLearnApplyMessage(null);
    setLearnApplyDiffs([]);
    try {
      const result = await window.hermesAPI.headroomLearnApply({
        projectPath: learnProjectPath.trim(),
        model: learnModel.trim() || undefined,
        agent: learnAgent,
      });
      if (!result.success) {
        setLearnApplyMessage(
          result.error ??
            result.skipReason ??
            "Apply failed.",
        );
        return;
      }
      setLearnApplyDiffs(result.diffs);
      if (result.diffs.length === 0) {
        setLearnApplyMessage(
          "Headroom found no files to update — your project may already match its recommendations.",
        );
      } else {
        setLearnApplyMessage(
          `Applied ${result.diffs.length} change${result.diffs.length === 1 ? "" : "s"} to ${result.diffs
            .map((d) => d.path.split(/[\\/]/).pop())
            .join(", ")}.`,
        );
      }
    } catch (err) {
      setLearnApplyMessage(`Apply failed: ${(err as Error).message}`);
    } finally {
      setLearnApplying(false);
    }
  }, [learnProjectPath, learnModel, learnAgent]);

  // Revert — restore every file the apply pass touched to
  // the before snapshot. We keep the diffs in state so the
  // user can revert multiple times (e.g. one file at a
  // time) without re-running headroom.
  const handleRevertLearn = useCallback(async () => {
    if (learnApplyDiffs.length === 0) return;
    setLearnReverting(true);
    setLearnApplyMessage(null);
    try {
      const result = await window.hermesAPI.headroomLearnRevert(learnApplyDiffs);
      if (result.success) {
        setLearnApplyMessage(
          `Reverted ${result.reverted.length} file${result.reverted.length === 1 ? "" : "s"}.`,
        );
        setLearnApplyDiffs([]);
      } else {
        setLearnApplyMessage(
          `Revert failed: ${result.error ?? "unknown error"}`,
        );
      }
    } catch (err) {
      setLearnApplyMessage(`Revert failed: ${(err as Error).message}`);
    } finally {
      setLearnReverting(false);
    }
  }, [learnApplyDiffs]);

  const preferredBaseUrl = draft?.baseUrl ?? sidecar?.baseUrl ?? "http://127.0.0.1:8787";

  return (
    <section className="screen headroom-screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">{t("headroom.eyebrow")}</p>
          <h1>{t("headroom.title")}</h1>
          <p className="screen-summary">{t("headroom.summary")}</p>
        </div>
        <div className="header-actions">
          <button
            className="ghost-button"
            onClick={() => void loadAll()}
            disabled={pulsing}
          >
            <Refresh size={14} />
            {pulsing ? t("common.refreshing") : t("common.refresh")}
          </button>
          <button
            className="ghost-button"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? t("headroom.config.cancel") : t("headroom.config.edit")}
          </button>
        </div>
      </header>

      {draft?.firstRunDismissed ? (
        <article className="panel-card">
          <h2>{t("headroom.quickStart.title")}</h2>
          <p className="workspace-copy">
            {t("headroom.quickStart.collapsedSummary")}
          </p>
          <div className="registry-footer">
            <button
              className="ghost-button"
              onClick={() => void handleResetQuickStart()}
            >
              {t("headroom.quickStart.reset")}
            </button>
          </div>
        </article>
      ) : (
        <article className="panel-card">
          <h2>{t("headroom.quickStart.title")}</h2>
          <p className="workspace-copy">{t("headroom.quickStart.body")}</p>
          <ol
            className="workspace-copy"
            style={{ paddingLeft: 18, margin: "0.5rem 0" }}
          >
            <li>{t("headroom.quickStart.step1")}</li>
            <li>{t("headroom.quickStart.step2")}</li>
            <li>{t("headroom.quickStart.step3")}</li>
          </ol>
          <p className="workspace-copy">
            <strong>
              {t("headroom.quickStart.currentTarget", { url: preferredBaseUrl })}
            </strong>
          </p>
          {!health?.reachable && (
            <p className="workspace-copy error">
              <AlertIcon size={14} /> {t("headroom.quickStart.notReachable")}
            </p>
          )}
          <p
            className="workspace-copy mono"
            style={{ margin: "0.5rem 0 0.25rem" }}
          >
            <code>{t("headroom.quickStart.installCommand")}</code>
          </p>
          <p
            className="workspace-copy"
            style={{ marginTop: 0, fontSize: "0.85em" }}
          >
            {t("headroom.quickStart.installHint")}
          </p>
          {showOptimizeCta && (
            <div
              className="workspace-copy"
              style={{
                background: "var(--surface-secondary, transparent)",
                border: "1px solid var(--border-subtle, currentColor)",
                borderRadius: 4,
                padding: "0.5rem 0.75rem",
                margin: "0.5rem 0",
              }}
            >
              <p style={{ margin: 0 }}>
                <strong>{t("headroom.quickStart.switchToOptimize")}</strong>
              </p>
              <p
                style={{ margin: "0.25rem 0 0.5rem", fontSize: "0.85em" }}
              >
                {t("headroom.quickStart.learnWhy")} —{" "}
                {t("headroom.quickStart.learnWhyBody")}
              </p>
              <div className="registry-footer">
                <button
                  className="toggle-button enabled"
                  onClick={() => void handleSwitchToOptimize()}
                  disabled={switchingMode}
                >
                  {switchingMode
                    ? t("headroom.quickStart.switchingToOptimize")
                    : t("headroom.quickStart.switchMode")}
                </button>
              </div>
            </div>
          )}
          <div className="registry-footer">
            <button
              className="ghost-button"
              onClick={async () => {
                const value = t("headroom.quickStart.installCommand");
                try {
                  if (navigator?.clipboard?.writeText) {
                    await navigator.clipboard.writeText(value);
                    setInstallCopied(true);
                    window.setTimeout(() => setInstallCopied(false), 1500);
                  }
                } catch {
                  // Clipboard is best-effort; fall back to the
                  // user reading the command and copying it
                  // manually.
                }
              }}
            >
              {installCopied
                ? t("common.copied")
                : t("headroom.quickStart.copyCommand")}
            </button>
            {(!sidecar ||
              sidecar.state === "stopped" ||
              sidecar.state === "exited" ||
              sidecar.state === "crashed") && (
              <button
                className="toggle-button enabled"
                onClick={() => void sidecarStart()}
                disabled={sidecarBusy}
              >
                {t("headroom.quickStart.startSidecar")}
              </button>
            )}
            <button className="ghost-button" onClick={() => setEditing(true)}>
              {t("headroom.quickStart.editConnection")}
            </button>
            <button
              className="ghost-button"
              onClick={() => void handleDismissQuickStart()}
            >
              {t("headroom.quickStart.dismiss")}
            </button>
          </div>
        </article>
      )}

      {/* Sidecar lifecycle card */}
      {sidecar && (
        <article className="panel-card">
          <h2>
            <span
              className={`headroom-sidecar-pill state-${sidecar.state}`}
              aria-label={sidecar.state}
            >
              {sidecar.state}
            </span>{" "}
            {t("headroom.sidecar.title")}
          </h2>
          <p className="workspace-copy">
            {t("headroom.sidecar.body", {
              baseUrl: sidecar.baseUrl,
            })}
          </p>
          {sidecar.reason && (
            <p className="workspace-copy">
              <strong>{t("headroom.sidecar.reason")}:</strong>{" "}
              {sidecar.reason}
            </p>
          )}
          {sidecar.lastError && (
            <p className="workspace-copy error">
              <strong>{t("headroom.sidecar.lastError")}:</strong>{" "}
              {sidecar.lastError}
            </p>
          )}
          <dl className="operator-field-grid">
            <div className="operator-field">
              <span>{t("headroom.sidecar.pid")}</span>
              <strong>{sidecar.pid ?? "--"}</strong>
            </div>
            <div className="operator-field">
              <span>{t("headroom.sidecar.port")}</span>
              <strong>{sidecar.port ?? "--"}</strong>
            </div>
            <div className="operator-field">
              <span>{t("headroom.sidecar.mode")}</span>
              <strong>{sidecar.mode}</strong>
            </div>
            <div className="operator-field">
              <span>{t("headroom.sidecar.crashCount")}</span>
              <strong>{sidecar.crashCount}</strong>
            </div>
            <div className="operator-field">
              <span>{t("headroom.sidecar.uptime")}</span>
              <strong>
                {sidecar.uptimeMs !== null
                  ? `${Math.max(0, Math.floor(sidecar.uptimeMs / 1000))}s`
                  : "--"}
              </strong>
            </div>
          </dl>
          <div className="registry-footer">
            {sidecar.state === "stopped" ||
            sidecar.state === "exited" ||
            sidecar.state === "crashed" ? (
              <button
                className="toggle-button enabled"
                onClick={() => void sidecarStart()}
                disabled={sidecarBusy}
              >
                {t("headroom.sidecar.start")}
              </button>
            ) : (
              <button
                className="toggle-button"
                onClick={() => void sidecarStop()}
                disabled={sidecarBusy}
              >
                {t("headroom.sidecar.stop")}
              </button>
            )}
            <button
              className="ghost-button"
              onClick={() => void sidecarRestart()}
              disabled={sidecarBusy}
            >
              {t("headroom.sidecar.restart")}
            </button>
            <button
              className="ghost-button"
              onClick={() => void refreshLogTail()}
              disabled={sidecarBusy}
            >
              {t("headroom.sidecar.refreshLogs")}
            </button>
          </div>
          {logTail && logTail.lines.length > 0 && (
            <details
              className="headroom-sidecar-logs"
              open={showLogs}
              onToggle={(e) =>
                setShowLogs((e.target as HTMLDetailsElement).open)
              }
            >
              <summary>
                {t("headroom.sidecar.logsSummary", {
                  count: logTail.lines.length,
                })}
              </summary>
              <pre className="mono">
                {logTail.lines.map((line, idx) => (
                  <span key={idx}>{line + "\n"}</span>
                ))}
              </pre>
              <button
                className="ghost-button"
                onClick={() => void clearLogTail()}
              >
                {t("headroom.sidecar.clearLogs")}
              </button>
            </details>
          )}
        </article>
      )}

      {/* Config editor */}
      {editing && draft && (
        <article className="panel-card">
          <h2>{t("headroom.config.title")}</h2>
          <p className="workspace-copy">{t("headroom.config.body")}</p>
          <div className="operator-input-grid">
            <label className="operator-input-group">
              <span>{t("headroom.config.baseUrl")}</span>
              <input
                type="text"
                className="operator-input"
                value={draft.baseUrl}
                onChange={(e) =>
                  setDraft({ ...draft, baseUrl: e.target.value })
                }
                placeholder="http://127.0.0.1:8787"
              />
            </label>
            <label className="operator-input-group">
              <span>{t("headroom.config.apiKey")}</span>
              <input
                type="password"
                className="operator-input"
                value={draft.apiKey ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, apiKey: e.target.value })
                }
                placeholder="optional"
              />
            </label>
            <label className="operator-input-group">
              <span>{t("headroom.config.mode")}</span>
              <select
                className="operator-input"
                value={draft.mode}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    mode: e.target.value as "audit" | "optimize",
                  })
                }
              >
                <option value="audit">audit (measure only)</option>
                <option value="optimize">optimize (apply transforms)</option>
              </select>
            </label>
          </div>
          <div className="registry-footer">
            <button
              className="toggle-button enabled"
              onClick={() => void handleSaveConfig()}
              disabled={savingConfig}
            >
              {savingConfig ? t("common.saving") : t("headroom.config.save")}
            </button>
          </div>
        </article>
      )}

      {/* Health + Stats */}
      <div className="headroom-grid">
        <article className="panel-card">
          <h2>{t("headroom.health.title")}</h2>
          <div className="headroom-health">
            <span
              className={`status-chip ${
                health?.reachable
                  ? "on"
                  : health === null
                    ? "assembling"
                    : "off"
              }`}
            >
              {health?.reachable
                ? t("headroom.health.reachable")
                : health === null
                  ? t("headroom.health.probing")
                  : t("headroom.health.unreachable")}
            </span>
            {health?.version && (
              <span className="pill">v{health.version}</span>
            )}
            {health?.status && (
              <span className="pill">{health.status}</span>
            )}
          </div>
          {health && !health.reachable && health.detail && (
            <p className="workspace-copy error">
              <AlertIcon size={14} /> {health.detail}
            </p>
          )}
        </article>

        {stats && stats.success && (
          <article className="panel-card">
            <h2>{t("headroom.stats.title")}</h2>
            <dl className="operator-field-grid">
              <div className="operator-field">
                <span>{t("headroom.stats.requests")}</span>
                <strong>{stats.totalRequests}</strong>
              </div>
              <div className="operator-field">
                <span>{t("headroom.stats.tokensSaved")}</span>
                <strong>{formatTokens(stats.totalTokensSaved)}</strong>
              </div>
              <div className="operator-field">
                <span>{t("headroom.stats.avgSavings")}</span>
                <strong>{stats.avgSavingsPercent}%</strong>
              </div>
              <div className="operator-field">
                <span>{t("headroom.stats.ccrEntries")}</span>
                <strong>{stats.ccrEntries}</strong>
              </div>
              <div className="operator-field">
                <span>{t("headroom.stats.uptime")}</span>
                <strong>{formatUptime(stats.uptimeSeconds)}</strong>
              </div>
            </dl>
          </article>
        )}
      </div>

      {/* Compression test */}
      <article className="panel-card">
        <h2>{t("headroom.compress.title")}</h2>
        <p className="workspace-copy">{t("headroom.compress.body")}</p>
        <div className="operator-input-grid">
          <label className="operator-input-group" style={{ gridColumn: "1 / -1" }}>
            <span>{t("headroom.compress.input")}</span>
            <textarea
              className="operator-input"
              rows={4}
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder={t("headroom.compress.placeholder")}
            />
          </label>
        </div>
        <div className="registry-footer">
          <button
            className="toggle-button enabled"
            onClick={() => void handleCompressTest()}
            disabled={compressing || !testInput.trim()}
          >
            {compressing ? t("headroom.compress.compressing") : t("headroom.compress.run")}
          </button>
        </div>
        {testResult && (
          <div className="headroom-compress-result">
            {testResult.success ? (
              <>
                <p className="workspace-copy">
                  <strong>{t("headroom.compress.tokensBefore")}:</strong>{" "}
                  {testResult.tokensBefore}{" "}
                  → <strong>{t("headroom.compress.tokensAfter")}:</strong>{" "}
                  {testResult.tokensAfter}{" "}
                  ({testResult.savingsPercent}% {t("headroom.compress.saved")})
                </p>
                {testResult.compressed && (
                  <p className="workspace-copy success">
                    {t("headroom.compress.compressed")}
                  </p>
                )}
              </>
            ) : (
              <p className="workspace-copy error">
                <AlertIcon size={14} /> {testResult.error}
              </p>
            )}
          </div>
        )}
      </article>

      {/* CCR Retrieve */}
      <article className="panel-card">
        <h2>{t("headroom.retrieve.title")}</h2>
        <p className="workspace-copy">{t("headroom.retrieve.body")}</p>
        <div className="operator-input-grid">
          <label className="operator-input-group" style={{ gridColumn: "1 / -1" }}>
            <span>{t("headroom.retrieve.key")}</span>
            <input
              type="text"
              className="operator-input"
              value={retrieveKey}
              onChange={(e) => setRetrieveKey(e.target.value)}
              placeholder="cache-key-from-compression"
            />
          </label>
        </div>
        <div className="registry-footer">
          <button
            className="toggle-button enabled"
            onClick={() => void handleRetrieve()}
            disabled={retrieving || !retrieveKey.trim()}
          >
            {retrieving ? t("headroom.retrieve.retrieving") : t("headroom.retrieve.run")}
          </button>
        </div>
        {retrieveResult && (
          <div className="headroom-retrieve-result">
            {retrieveResult.success && retrieveResult.content ? (
              <pre className="mono" style={{ maxHeight: 300, overflow: "auto" }}>
                {retrieveResult.content}
              </pre>
            ) : (
              <p className="workspace-copy error">
                <AlertIcon size={14} />{" "}
                {retrieveResult.error ?? t("headroom.retrieve.notFound")}
              </p>
            )}
          </div>
        )}
      </article>

      {/* Headroom learn — failure-mining + correction
          writer. Shells out to the upstream `headroom
          learn` CLI; the desktop is a thin wrapper that
          surfaces the proposals in a review list so the
          user picks which to commit to learnings.jsonl.
          The flow is intentionally human-in-the-loop:
          the CLI's `--apply` flag is NOT passed, so even
          after commit the desktop never writes to
          AGENTS.md / CLAUDE.md without an explicit user
          action. */}
      <article className="panel-card">
        <h2>{t("headroom.learn.title")}</h2>
        <p className="workspace-copy">{t("headroom.learn.body")}</p>
        <div className="operator-input-grid">
          <label className="operator-input-group" style={{ gridColumn: "1 / -1" }}>
            <span>{t("headroom.learn.projectPath")}</span>
            <input
              type="text"
              className="operator-input"
              value={learnProjectPath}
              onChange={(e) => setLearnProjectPath(e.target.value)}
              placeholder="C:\Users\you\projects\my-app"
            />
          </label>
          <label className="operator-input-group">
            <span>{t("headroom.learn.model")}</span>
            <input
              type="text"
              className="operator-input"
              value={learnModel}
              onChange={(e) => setLearnModel(e.target.value)}
              placeholder="auto-detect (claude / gpt-4o / gemini)"
            />
          </label>
          <label className="operator-input-group">
            <span>{t("headroom.learn.agent")}</span>
            <select
              className="operator-input"
              value={learnAgent}
              onChange={(e) =>
                setLearnAgent(
                  e.target.value as "auto" | "claude" | "codex" | "gemini",
                )
              }
            >
              <option value="auto">auto-detect</option>
              <option value="claude">Claude Code</option>
              <option value="codex">OpenAI Codex</option>
              <option value="gemini">Gemini CLI</option>
            </select>
          </label>
        </div>
        <div className="registry-footer">
          {learnRunning ? (
            <button
              className="ghost-button"
              onClick={() => void handleStopLearn()}
            >
              {t("headroom.learn.stop")}
            </button>
          ) : (
            <button
              className="toggle-button enabled"
              onClick={() => void handleRunLearn()}
              disabled={!learnProjectPath.trim()}
            >
              {t("headroom.learn.run")}
            </button>
          )}
        </div>
        {learnRunning && (
          <p className="workspace-copy">
            {t("headroom.learn.running")}
          </p>
        )}
        {learnError && (
          <p className="workspace-copy error">
            <AlertIcon size={14} /> {learnError}
            {learnSkipReason && (
              <span className="pill" style={{ marginLeft: 8 }}>
                {learnSkipReason}
              </span>
            )}
          </p>
        )}
        {learnReport && (
          <div className="headroom-learn-result">
            <p className="workspace-copy success">
              {t("headroom.learn.reportSummary", {
                sessionCount: learnReport.sessionCount,
                proposalCount: learnReport.proposals.length,
                durationSec: Math.round(learnReport.durationMs / 1000),
              })}
            </p>
            {learnReport.outputFiles.length > 0 && (
              <p className="workspace-copy">
                <strong>{t("headroom.learn.targets")}:</strong>{" "}
                {learnReport.outputFiles.join(", ")}
              </p>
            )}
            {learnReport.proposals.length === 0 ? (
              <p className="workspace-copy">
                {t("headroom.learn.noProposals")}
              </p>
            ) : (
              <ul className="headroom-learn-proposals">
                {learnReport.proposals.map((p, idx) => (
                  <li key={idx} className="headroom-learn-proposal">
                    <label className="operator-input-group">
                      <input
                        type="checkbox"
                        checked={learnSelected.has(idx)}
                        onChange={(e) => {
                          setLearnSelected((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(idx);
                            else next.delete(idx);
                            return next;
                          });
                        }}
                      />
                      <span>
                        <strong>{p.type}</strong> ·{" "}
                        <code>{p.key}</code> · confidence{" "}
                        {p.confidence}/10
                        {p.section && <> · {p.section}</>}
                        <br />
                        {p.insight}
                        <br />
                        <em className="headroom-learn-evidence">
                          {p.evidence}
                        </em>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <div className="registry-footer">
              <button
                className="toggle-button enabled"
                onClick={() => void handleCommitLearn()}
                disabled={
                  learnCommitting ||
                  learnReport.proposals.length === 0 ||
                  learnSelected.size === 0
                }
              >
                {learnCommitting
                  ? t("headroom.learn.committing")
                  : t("headroom.learn.commit", {
                      count: learnSelected.size,
                    })}
              </button>
            </div>
            {learnCommitMessage && (
              <p className="workspace-copy">{learnCommitMessage}</p>
            )}
            {/* Apply to AGENTS.md / CLAUDE.md / GEMINI.md.
                Headroom writes the corrections directly to
                the project — the desktop captures
                before/after diffs and exposes a Revert
                button so the user can roll back if
                Headroom overcorrected. The diff preview
                only renders after the user clicks Apply;
                the commit + apply flows are independent. */}
            <div className="registry-footer">
              <button
                className="toggle-button enabled"
                onClick={() => void handleApplyLearn()}
                disabled={learnApplying || !learnProjectPath.trim()}
              >
                {learnApplying
                  ? t("headroom.learn.applying")
                  : t("headroom.learn.apply")}
              </button>
              {learnApplyDiffs.length > 0 && (
                <button
                  className="ghost-button"
                  onClick={() => void handleRevertLearn()}
                  disabled={learnReverting}
                >
                  {learnReverting
                    ? t("headroom.learn.reverting")
                    : t("headroom.learn.revert")}
                </button>
              )}
            </div>
            {learnApplyMessage && (
              <p
                className={
                  learnApplyDiffs.length === 0 &&
                  !learnApplying &&
                  learnApplyMessage.startsWith("Applied")
                    ? "workspace-copy success"
                    : "workspace-copy"
                }
              >
                {learnApplyMessage}
              </p>
            )}
            {learnApplyDiffs.length > 0 && (
              <details className="headroom-learn-diffs" open>
                <summary>
                  {t("headroom.learn.diffSummary", {
                    count: learnApplyDiffs.length,
                  })}
                </summary>
                <ul className="headroom-learn-diff-list">
                  {learnApplyDiffs.map((diff) => {
                    const name = diff.path.split(/[\\/]/).pop() ?? diff.path;
                    return (
                      <li
                        key={diff.path}
                        className="headroom-learn-diff-item"
                      >
                        <header>
                          <strong>{name}</strong>
                          {diff.created ? (
                            <span className="pill">created</span>
                          ) : (
                            <span className="pill">modified</span>
                          )}
                          <code className="headroom-learn-diff-path">
                            {diff.path}
                          </code>
                        </header>
                        <div className="headroom-learn-diff-cols">
                          <div>
                            <h4>Before</h4>
                            <pre className="mono">
                              {diff.before || "(empty)"}
                            </pre>
                          </div>
                          <div>
                            <h4>After</h4>
                            <pre className="mono">
                              {diff.after || "(empty)"}
                            </pre>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </details>
            )}
            <details className="headroom-learn-raw">
              <summary>{t("headroom.learn.rawOutput")}</summary>
              <pre
                className="mono"
                style={{ maxHeight: 240, overflow: "auto" }}
              >
                {learnReport.rawOutput || "(empty)"}
              </pre>
            </details>
          </div>
        )}
      </article>
    </section>
  );
}

export default Headroom;
