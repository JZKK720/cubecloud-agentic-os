import { useState, useEffect, useRef, useCallback } from "react";
import { useI18n } from "../../components/useI18n";
import { AgentMarkdown } from "../../components/AgentMarkdown";
import {
  Edit3,
  Save,
  X,
  AlertTriangle,
  History,
  FilePlus,
} from "lucide-react";

/**
 * Wiki / raw-sources page editor (V2.2 — page editing UI).
 *
 * Modal-style overlay that wraps the existing `wikiWritePage`
 * IPC. Sits on top of the Wiki tab's read-only `openPage`
 * viewer; opening the editor means "this is the page the user
 * clicked into, give them a way to write it back".
 *
 * Behaviour:
 *   1. Loads the page via `wikiReadPage` (we do not trust
 *      the parent's cached copy — disk is the source of
 *      truth for the editor).
 *   2. Renders a side-by-side editor + live preview.
 *   3. On save, calls `wikiWritePage` and appends a `edit`
 *      log entry so the agent and the user both know the
 *      page was changed manually.
 *   4. On conflict (file changed on disk since we opened
 *      it), refuses to save and shows a "reload / discard"
 *      dialog instead of clobbering. The mtime check is a
 *      cheap last-writer-wins guard; it's not a real diff
 *      merge, but it stops the common "I edited yesterday
 *      and forgot" foot-gun.
 */

export interface PageEditorProps {
  relPath: string;
  /** "wiki" pages live under wiki/, "raw" under raw/sources/.
   *  We pass this through to the log entry so future audits
   *  can tell human edits apart from agent ingests. */
  layer: "wiki" | "raw";
  profile?: string;
  /** Called when the user wants to go back to the read-only
   *  viewer. Receives true if a save happened. */
  onClose: (saved: boolean) => void;
}

type Mode = "edit" | "preview" | "split";

export function PageEditor({
  relPath,
  layer,
  profile,
  onClose,
}: PageEditorProps): React.JSX.Element {
  const { t } = useI18n();

  // Loading + lifecycle
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Editor state
  const [original, setOriginal] = useState("");
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<Mode>("split");
  const [exists, setExists] = useState(false);
  const [originalMtime, setOriginalMtime] = useState<number | null>(null);

  // Conflict detection
  const [conflict, setConflict] = useState<{
    diskMtime: number;
    diskContent: string;
  } | null>(null);

  // Undo history (just session-local, capped at 50 steps)
  const historyRef = useRef<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Initial load — always re-read from disk to capture the
  // freshest mtime/content. The parent's `openPage` is just
  // a hint; the editor treats the wiki directory as the
  // source of truth.
  const loadPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    setInfo(null);
    setConflict(null);
    try {
      const page = await window.hermesAPI.wikiReadPage(relPath, profile);
      setOriginal(page.content);
      setDraft(page.content);
      setExists(page.exists);
      setOriginalMtime(page.lastModified);
      historyRef.current = [page.content];
      setCanUndo(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [relPath, profile]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const dirty = draft !== original;

  // Track undo state cheaply — we already push to history on
  // every keystroke below, so a non-zero history means we
  // can roll back at least one step.
  useEffect(() => {
    setCanUndo(historyRef.current.length > 1);
  }, [draft]);

  const pushHistory = useCallback((next: string) => {
    const hist = historyRef.current;
    hist.push(next);
    if (hist.length > 50) hist.shift();
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.target.value;
      if (next !== draft) pushHistory(draft);
      setDraft(next);
      setError(null);
      setInfo(null);
    },
    [draft, pushHistory],
  );

  const handleUndo = useCallback(() => {
    const hist = historyRef.current;
    if (hist.length <= 1) return;
    hist.pop(); // drop current
    const prev = hist[hist.length - 1];
    setDraft(prev);
  }, []);

  // Cmd/Ctrl-S: save. Esc: close. Tab: insert 2 spaces
  // instead of cycling focus.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void handleSave();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
        return;
      }
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const next = draft.substring(0, start) + "  " + draft.substring(end);
        if (next !== draft) pushHistory(draft);
        setDraft(next);
        // Restore caret after the inserted spaces on next tick
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 2;
        });
      }
    },
    // handleSave / handleCancel are stable useCallbacks below
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft, pushHistory],
  );

  // Save with conflict detection.
  const handleSave = useCallback(async () => {
    if (saving) return;
    if (!dirty) {
      setInfo(t("memory.wikiEditor.noChanges"));
      return;
    }
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      // Re-read the disk copy right before writing so we
      // catch a concurrent agent write.
      const live = await window.hermesAPI.wikiReadPage(relPath, profile);
      if (
        live.exists &&
        originalMtime !== null &&
        live.lastModified !== null &&
        live.lastModified > originalMtime
      ) {
        // Someone else wrote this file since we opened it.
        // Show the conflict dialog instead of clobbering.
        setConflict({ diskMtime: live.lastModified, diskContent: live.content });
        setSaving(false);
        return;
      }
      const result = await window.hermesAPI.wikiWritePage(
        relPath,
        draft,
        profile,
      );
      if (!result.success) {
        setError(
          (result as { error?: string }).error ?? t("memory.wikiEditor.saveFailed"),
        );
        setSaving(false);
        return;
      }
      // Append a log entry. We tag with the layer so future
      // audits can tell "user edited a wiki page" apart from
      // "user edited a raw source".
      const title = relPath.split("/").pop() ?? relPath;
      await window.hermesAPI.wikiAppendLog(
        "edit",
        `User edited ${layer} page: ${title}`,
        `Path: ${relPath}, ${draft.length} chars`,
        profile,
      );
      setOriginal(draft);
      setOriginalMtime(Date.now() / 1000);
      setExists(true);
      setInfo(t("memory.wikiEditor.saved"));
      setSaving(false);
      onClose(true);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }, [saving, dirty, draft, relPath, profile, originalMtime, layer, onClose, t]);

  const handleCancel = useCallback(() => {
    if (dirty) {
      const ok = window.confirm(t("memory.wikiEditor.discardConfirm"));
      if (!ok) return;
    }
    onClose(false);
  }, [dirty, onClose, t]);

  // Conflict: take theirs, keep mine, or cancel.
  const resolveConflict = useCallback(
    (choice: "theirs" | "mine") => {
      if (!conflict) return;
      if (choice === "theirs") {
        setOriginal(conflict.diskContent);
        setDraft(conflict.diskContent);
        setOriginalMtime(conflict.diskMtime);
        historyRef.current = [conflict.diskContent];
        setInfo(t("memory.wikiEditor.conflictReloaded"));
      } else {
        // Keep mine — set the baseline to disk so the save
        // path doesn't re-trigger the same conflict.
        setOriginalMtime(conflict.diskMtime);
        setInfo(t("memory.wikiEditor.conflictOverwrite"));
      }
      setConflict(null);
    },
    [conflict, t],
  );

  // "New page" support: if the file doesn't exist yet, the
  // editor is the way the user creates it. We label the save
  // button accordingly.
  const isNew = !exists;

  if (loading) {
    return (
      <div className="wiki-editor-overlay">
        <div className="wiki-editor-modal wiki-editor-modal--loading">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="wiki-editor-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCancel();
      }}
    >
      <div className="wiki-editor-modal" role="dialog" aria-label={relPath}>
        <div className="wiki-editor-header">
          <div className="wiki-editor-header-path">
            <Edit3 size={14} />
            <code className="wiki-editor-path">{relPath}</code>
            <span
              className={`wiki-editor-layer-tag wiki-editor-layer-tag--${layer}`}
            >
              {layer === "wiki" ? "wiki/" : "raw/sources/"}
            </span>
            {isNew && (
              <span className="wiki-editor-new-tag">
                <FilePlus size={11} /> {t("memory.wikiEditor.newFile")}
              </span>
            )}
            {dirty && (
              <span className="wiki-editor-dirty-tag">
                ● {t("memory.wikiEditor.unsaved")}
              </span>
            )}
          </div>
          <div className="wiki-editor-header-actions">
            <div className="wiki-editor-mode-toggle" role="tablist">
              <button
                role="tab"
                aria-selected={mode === "edit"}
                className={`wiki-editor-mode-btn ${mode === "edit" ? "active" : ""}`}
                onClick={() => setMode("edit")}
              >
                {t("memory.wikiEditor.modeEdit")}
              </button>
              <button
                role="tab"
                aria-selected={mode === "split"}
                className={`wiki-editor-mode-btn ${mode === "split" ? "active" : ""}`}
                onClick={() => setMode("split")}
              >
                {t("memory.wikiEditor.modeSplit")}
              </button>
              <button
                role="tab"
                aria-selected={mode === "preview"}
                className={`wiki-editor-mode-btn ${mode === "preview" ? "active" : ""}`}
                onClick={() => setMode("preview")}
              >
                {t("memory.wikiEditor.modePreview")}
              </button>
            </div>
            <button
              className="wiki-editor-undo-btn"
              onClick={handleUndo}
              disabled={!canUndo}
              title={t("memory.wikiEditor.undoHint")}
            >
              <History size={13} />
            </button>
            <button
              className="btn-ghost"
              onClick={handleCancel}
              title={t("memory.wikiEditor.closeHint")}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {error && (
          <div className="wiki-editor-banner wiki-editor-banner--error">
            {error}
          </div>
        )}
        {info && !error && (
          <div className="wiki-editor-banner wiki-editor-banner--info">
            {info}
          </div>
        )}

        {conflict && (
          <div className="wiki-editor-conflict">
            <div className="wiki-editor-conflict-header">
              <AlertTriangle size={14} />
              <strong>{t("memory.wikiEditor.conflictTitle")}</strong>
            </div>
            <p className="wiki-editor-conflict-body">
              {t("memory.wikiEditor.conflictBody")}
            </p>
            <details className="wiki-editor-conflict-diff">
              <summary>{t("memory.wikiEditor.conflictShowDisk")}</summary>
              <pre>{conflict.diskContent}</pre>
            </details>
            <div className="wiki-editor-conflict-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => resolveConflict("theirs")}
              >
                {t("memory.wikiEditor.conflictTakeTheirs")}
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => resolveConflict("mine")}
              >
                {t("memory.wikiEditor.conflictKeepMine")}
              </button>
            </div>
          </div>
        )}

        <div
          className={`wiki-editor-body wiki-editor-body--${mode}`}
        >
          {(mode === "edit" || mode === "split") && (
            <textarea
              ref={textareaRef}
              className="wiki-editor-textarea"
              value={draft}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              placeholder={t("memory.wikiEditor.placeholder")}
            />
          )}
          {(mode === "preview" || mode === "split") && (
            <div className="wiki-editor-preview">
              {draft.trim() === "" ? (
                <p className="wiki-editor-empty-preview">
                  {t("memory.wikiEditor.previewEmpty")}
                </p>
              ) : (
                <AgentMarkdown>{draft}</AgentMarkdown>
              )}
            </div>
          )}
        </div>

        <div className="wiki-editor-footer">
          <div className="wiki-editor-footer-stats">
            <span>
              {draft.length} {t("memory.wikiEditor.chars")}
            </span>
            <span>
              {draft.split(/\r?\n/).length - (draft.endsWith("\n") ? 1 : 0)}{" "}
              {t("memory.wikiEditor.lines")}
            </span>
          </div>
          <div className="wiki-editor-footer-actions">
            <button
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={saving}
            >
              {t("memory.wikiEditor.cancel")}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || !dirty}
            >
              <Save size={13} />
              {saving
                ? t("memory.wikiEditor.saving")
                : isNew
                  ? t("memory.wikiEditor.create")
                  : t("memory.wikiEditor.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
