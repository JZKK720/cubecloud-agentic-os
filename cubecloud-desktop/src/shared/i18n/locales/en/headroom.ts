// Source-of-truth Headroom screen strings.
// Every other locale falls back to these when its own copy is missing,
// so other locales can ship English copy pending native review without
// leaving operators with empty UI.

export default {
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
} as const;
