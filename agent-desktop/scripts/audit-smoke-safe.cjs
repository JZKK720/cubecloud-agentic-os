const fs = require("fs");
const content = fs.readFileSync("src/preload/index.ts", "utf8");
const matches = [...content.matchAll(/ipcRenderer\.invoke\("([a-z][a-z0-9-]+)"/g)].map((m) => m[1]);
const unique = [...new Set(matches)].sort();

const readOnly = [
  "check-install", "check-openclaw", "verify-install",
  "get-app-version", "get-locale", "get-connection-config",
  "is-remote-mode", "is-remote-only-mode", "get-hermes-version",
  "refresh-hermes-version",
  "get-hermes-home", "get-env", "get-config", "get-model-config",
  "get-platform-enabled", "get-design-dials", "get-toolsets",
  "get-credential-pool", "get-api-server-key-status",
  "list-bundled-skills", "list-installed-skills",
  "list-profiles", "list-sessions", "list-cached-sessions",
  "list-cron-jobs", "list-models", "list-mcp-servers",
  "list-runtime-providers", "list-task-orchestrators",
  "list-bundled-schemas", "schemas-get-active-id", "schemas-list-bundled", "schemas-get-active",
  "get-skill-content", "get-desktop-bundled-skill-path",
  "get-session-messages", "read-memory", "read-soul",
  "read-media-file", "media-file-exists",
  "wiki-get-status", "wiki-read-index", "wiki-read-log",
  "wiki-list-sources", "wiki-read-schema", "wiki-read-page",
  "search-sessions",
  "everos-ping", "everos-list-recent", "everos-get-config", "everos-search",
  "codegraph-runtime-status", "codegraph-cli-status",
  "codegraph-runtime-stats", "codegraph-runtime-impact",
  "codegraph-runtime-search",
  "everos-sidecar-status", "everos-sidecar-log-tail",
  "headroom-get-config", "headroom-ping", "headroom-stats",
  "headroom-sidecar-status", "headroom-sidecar-log-tail",
  "kanban-list-boards", "kanban-current-board", "kanban-list-tasks", "kanban-get-task",
  "plans-list", "plans-get", "plans-parse",
  "knowledge-list", "knowledge-get", "knowledge-search", "knowledge-sources", "knowledge-tool-manifest",
  "schemas-infer-type", "synthesis-build",
  "learnings-search", "learnings-stats", "learnings-file-info", "learnings-find-stale", "learnings-read",
  "retro-build-context", "triage-items", "triage-recent-sessions", "handoff-build",
  "careful-check", "careful-is-destructive", "careful-find-in-body",
  "autoplan-build-briefs",
  "convert-file-to-markdown", "is-markitdown-available",
  "discover-memory-providers", "discover-agent-clis", "discover-docker-runtimes",
  "read-file", "read-directory", "read-image-file", "read-logs",
  "gateway-status",
];

const roundTrip = [
  { channel: "get-locale", setChannel: "set-locale", setArgs: ["en"], restoreArgs: ["en"] },
];

const inStaging = [
  "everos-sidecar-start", "everos-sidecar-stop", "everos-sidecar-restart", "everos-sidecar-clear-logs",
  "headroom-sidecar-start", "headroom-sidecar-stop", "headroom-sidecar-restart", "headroom-sidecar-clear-logs",
  "headroom-save-config", "headroom-compress", "headroom-retrieve",
  "codegraph-runtime-open", "codegraph-runtime-close",
];

const seen = new Set(readOnly);
const excluded = [
  "oauth-login", "oauth-login-cancel", "discover-provider-models",
  "test-remote-connection", "diagnose-remote-connection",
  "test-ssh-connection", "diagnose-ssh-connection",
  "is-ssh-tunnel-active", "start-ssh-tunnel", "stop-ssh-tunnel",
  "start-install", "run-hermes-update", "run-hermes-doctor",
  "run-hermes-backup", "run-hermes-dump", "run-hermes-import",
  "run-claw-migrate", "codegraph-install-cli", "codegraph-setup-hermes",
  "install-skill", "uninstall-skill", "codegraph-init-project",
  "codegraph-build-context", "codegraph-export-ua-graph", "codegraph-project-status",
  "start-gateway", "stop-gateway", "send-message", "abort-chat",
  "check-for-updates", "download-update", "install-update",
  "delete-session", "update-session-title", "remove-model", "update-model",
  "remove-memory-entry", "update-memory-entry", "set-credential-pool",
  "add-credential-pool-entry", "write-user-profile", "write-soul", "reset-soul",
  "add-memory-entry", "set-env", "set-config", "set-active-profile",
  "create-profile", "delete-profile", "create-cron-job", "remove-cron-job",
  "pause-cron-job", "resume-cron-job", "trigger-cron-job",
  "kanban-create-task", "kanban-switch-board", "kanban-create-board",
  "kanban-remove-board", "kanban-archive-task", "kanban-assign-task",
  "kanban-block-task", "kanban-comment-task", "kanban-complete-task",
  "kanban-dispatch-once", "kanban-reclaim-task", "kanban-specify-task", "kanban-unblock-task",
  "set-platform-enabled", "set-design-dials", "set-toolset-enabled",
  "set-model-config", "set-connection-config", "set-ssh-config",
  "set-mcp-server-enabled", "wiki-write-page", "wiki-write-index",
  "wiki-bootstrap", "wiki-append-log", "wiki-ingest-file-as-markdown",
  "stage-attachment", "clear-staged-attachments", "save-media-file",
  "show-media-menu", "everos-add-memory", "everos-save-config",
  "add-mcp-server", "remove-mcp-server", "add-model",
  "retro-summarize", "retro-commit", "retro-export",
  "handoff-save", "handoff-build-and-save",
  "learnings-append", "learnings-clear", "learnings-export",
  "plans-delete", "plans-dispatch", "plans-save",
  "select-folder", "open-data-folder", "open-external",
  "open-file-in-editor", "copy-to-clipboard",
  "adopt-hermes-home", "validate-hermes-home", "inspect-install-target",
  "quit-app", "generate-api-server-key",
  "set-locale",
  ...roundTrip.map((r) => r.setChannel),
  ...inStaging,
];
const unknown = unique.filter((c) => !seen.has(c) && !excluded.includes(c));

console.log("Read-only channels:", readOnly.length);
console.log("Round-trip channels:", roundTrip.length);
console.log("In-staging channels:", inStaging.length);
console.log("Total safe:", readOnly.length + roundTrip.length + inStaging.length);
console.log("Unknown / not categorized:", unknown.length);
if (unknown.length) {
  console.log("---");
  for (const ch of unknown) console.log(" ??", ch);
}
