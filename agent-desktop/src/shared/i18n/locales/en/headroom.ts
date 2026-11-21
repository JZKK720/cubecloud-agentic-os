// Source-of-truth Headroom screen strings.
// Every other locale falls back to these when its own copy is missing,
// so other locales can ship English copy pending native review without
// leaving operators with empty UI.

export default {
  eyebrow: "Context compression",
  title: "Headroom",
  summary:
    "Headroom sits between the desktop and the model to trim long prompts before they leave the machine. It reports what it saved and never rewrites a request unless you switch it to optimize.",
  // V2.10.44 — form-validation and runtime errors raised
  // in the Headroom screen. Prior versions hardcoded these
  // strings in Headroom.tsx, so the Chinese locale saw
  // English toast messages.
  errorChooseProjectFolder: "Choose a project folder first.",
  errorPickOneProposal: "Pick at least one proposal to commit.",
  errorHeadroomLearnFailed: "headroom learn failed.",
  quickStart: {
    title: "Quick start",
    body:
      "Start in audit mode, verify savings with the compression test, then switch to optimize once the proxy is healthy and the results look right.",
    step1: "Point the Base URL at a running Headroom proxy or start the local sidecar below.",
    step2: "Keep the mode on audit first so Headroom measures before it rewrites requests.",
    step3: "Test a real log or code bundle before enabling Headroom in a daily workflow.",
    currentTarget: "Current target: {{url}}",
    notReachable:
      "Headroom is not reachable yet. Start the sidecar or edit the Base URL first.",
    startSidecar: "Start local sidecar",
    editConnection: "Edit connection",
    copyInstall: "Copy install command",
    copyCommand: "Copy command",
    installHint:
      "Run this in a terminal to install the Headroom runtime. The desktop does not install it for you.",
    installCommand: "pip install \"headroom-ai[all]\"",
    firstRunTitle: "First-time setup",
    firstRunBody:
      "Headroom is a local context-compression proxy. Pick a mode to get started.",
    modeAudit: "Audit",
    modeAuditHint: "Measure only — no request rewrites.",
    modeOptimize: "Optimize",
    modeOptimizeHint: "Apply transforms once savings look right.",
    dismiss: "Hide this card",
    reset: "Reset quick start",
    collapsedSummary:
      "Quick start hidden. Open it any time to re-run the audit → test → optimize walkthrough.",
    switchToOptimize:
      "Savings look good. Switch to optimize to actually compress requests.",
    switchingToOptimize: "Switching...",
    switchMode: "Switch to optimize",
    learnWhy: "Why this matters",
    learnWhyBody:
      "In audit mode Headroom measures savings but never rewrites requests. In optimize mode it applies the transforms. Start in audit, validate, then switch.",
  },
  health: {
    title: "Proxy health",
    reachable: "Reachable",
    unreachable: "Unreachable",
    probing: "Probing…",
  },
  stats: {
    title: "Savings",
    requests: "Requests",
    tokensSaved: "Tokens saved",
    avgSavings: "Average savings",
    ccrEntries: "CCR entries",
    uptime: "Uptime",
  },
  config: {
    title: "Connection",
    body:
      "Point Headroom at a running proxy, or start the local sidecar below. Nothing leaves the machine.",
    baseUrl: "Base URL",
    apiKey: "API key",
    mode: "Mode",
    save: "Save",
    edit: "Configure",
    cancel: "Close",
  },
  sidecar: {
    title: "Local sidecar",
    body: "Headroom is not running at {{baseUrl}}. Start the sidecar to compress from this machine.",
    reason: "Reason",
    lastError: "Last error",
    pid: "PID",
    port: "Port",
    mode: "Mode",
    crashCount: "Crashes",
    uptime: "Uptime",
    start: "Start sidecar",
    stop: "Stop sidecar",
    restart: "Restart",
    refreshLogs: "Refresh logs",
    logsSummary: "Logs ({{count}} lines)",
    clearLogs: "Clear logs",
  },
  compress: {
    title: "Compression test",
    body:
      "Paste a real prompt or code bundle and run it through Headroom. You get the before and after token counts without sending anything to a model.",
    input: "Sample input",
    placeholder: "Paste a long prompt, log, or CodeGraph bundle…",
    run: "Compress",
    compressing: "Compressing…",
    compressed: "Compressed",
    tokensBefore: "Tokens before",
    tokensAfter: "Tokens after",
    saved: "Saved {{percent}}%",
  },
  retrieve: {
    title: "Retrieve original",
    body:
      "Compressed content is replaced with a reference. Look the original up by its key when you need the full text.",
    key: "Reference key",
    run: "Retrieve",
    retrieving: "Retrieving…",
    notFound: "No content stored under that key.",
  },
  learn: {
    title: "Learn from sessions",
    body:
      "Scan past sessions in a project and stage durable notes — patterns, pitfalls, preferences — that Headroom can reuse. Nothing is written until you commit the proposals you pick.",
    projectPath: "Project path",
    model: "Model",
    agent: "Agent",
    run: "Run learn",
    running: "Learning from sessions…",
    stop: "Stop",
    reportSummary:
      "Scanned {{sessionCount}} sessions in {{durationSec}}s and staged {{proposalCount}} proposals.",
    targets: "Written targets",
    noProposals: "No durable notes found in these sessions.",
    rawOutput: "Raw output",
    commit: "Commit {{count}} proposals",
    committing: "Committing…",
    apply: "Apply diffs",
    applying: "Applying…",
    revert: "Revert",
    reverting: "Reverting…",
    diffSummary: "Pending diffs ({{count}})",
  },
} as const;
