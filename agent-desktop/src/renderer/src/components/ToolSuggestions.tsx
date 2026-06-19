/**
 * V2.10.67 — Ambient tool suggestions panel.
 *
 * A small, non-blocking panel at the bottom of the sidebar that
 * shows optional support tools (CodeGraph, EverOS,
 * Headroom, Agent-Reach) with one-click install buttons.
 *
 * The panel is dismissible — the user can close it and come back
 * later via the existing screens (CodeGraph, Tools, etc.).
 * It never blocks the user from chatting.
 */

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "./useI18n";
import { Sparkles, X, Download } from "../assets/icons";

interface ToolSuggestion {
  id: string;
  name: string;
  description: string;
  installCommand: string;
  installType: "npm" | "pip" | "script";
  screen: string;
  needsApiKey: boolean;
}

const TOOL_SUGGESTIONS: ToolSuggestion[] = [
  {
    id: "codegraph",
    name: "CodeGraph",
    description: "Semantic code intelligence — fewer tokens, fewer tool calls",
    installCommand: "npm install -g @colbymchenry/codegraph",
    installType: "npm",
    screen: "codegraph",
    needsApiKey: false,
  },
  {
    id: "everos",
    name: "EverOS",
    description: "Memory harness — persistent agent memory across sessions (verify local sidecar support on your platform)",
    installCommand: "python -m pip install --user everos",
    installType: "pip",
    screen: "everos",
    needsApiKey: false,
  },
  {
    id: "headroom",
    name: "Headroom",
    description: "Context compression — save tokens on long conversations",
    installCommand: 'python -m pip install --user "headroom-ai[all]"',
    installType: "pip",
    screen: "headroom",
    needsApiKey: false,
  },
  {
    id: "agent-reach",
    name: "Agent-Reach",
    description: "Internet capabilities — Twitter, Reddit, YouTube, RSS, search",
    installCommand: "python -m pip install --user git+https://github.com/Panniantong/Agent-Reach.git",
    installType: "pip",
    screen: "tools",
    needsApiKey: true,
  },
];

const DISMISS_KEY = "tool-suggestions-dismissed";

export default function ToolSuggestions(): React.JSX.Element | null {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DISMISS_KEY);
      if (stored === "true") setDismissed(true);
    } catch {
      // localStorage not available — show by default
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "true");
    } catch {
      // best effort
    }
  }, []);

  if (dismissed) return null;

  return (
    <div className="tool-suggestions-panel">
      <div className="tool-suggestions-header">
        <Sparkles size={14} />
        <span className="tool-suggestions-title">
          {t("toolSuggestions.title", { defaultValue: "Enhance your agent" })}
        </span>
        <button
          className="tool-suggestions-dismiss"
          onClick={handleDismiss}
          title={t("toolSuggestions.dismiss", { defaultValue: "Dismiss" })}
        >
          <X size={12} />
        </button>
      </div>

      {!expanded ? (
        <button
          className="tool-suggestions-expand"
          onClick={() => setExpanded(true)}
        >
          {t(
            "toolSuggestions.expand",
            { defaultValue: "CodeGraph · EverOS · Headroom · Agent-Reach →" },
          )}
        </button>
      ) : (
        <div className="tool-suggestions-list">
          {TOOL_SUGGESTIONS.map((tool) => (
            <div key={tool.id} className="tool-suggestion-item">
              <div className="tool-suggestion-info">
                <span className="tool-suggestion-name">{tool.name}</span>
                <span className="tool-suggestion-desc">{tool.description}</span>
                {tool.needsApiKey && (
                  <span className="tool-suggestion-api-key-hint">
                    {t("toolSuggestions.needsKey", { defaultValue: "Needs API key" })}
                  </span>
                )}
              </div>
              <button
                className="tool-suggestion-install"
                title={tool.installCommand}
                onClick={() => {
                  // Copy the install command to clipboard
                  try {
                    navigator.clipboard.writeText(tool.installCommand);
                  } catch {
                    // best effort
                  }
                }}
              >
                <Download size={12} />
                {t("toolSuggestions.copy", { defaultValue: "Copy" })}
              </button>
            </div>
          ))}
          <p className="tool-suggestions-hint">
            {t(
              "toolSuggestions.hint",
              { defaultValue: "Paste the command in a terminal on the gateway machine. Tools are optional and can be installed anytime." },
            )}
          </p>
        </div>
      )}
    </div>
  );
}