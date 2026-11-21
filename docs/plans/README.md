# Plans — index and current of record

> **Purpose:** this directory is an append-mostly archive. Plans are written
> before the work, kept after it, and never rewritten to match outcomes — the
> historical record of *what was believed at the time* is itself useful. This
> file exists so a reader can tell, in one screen, **which plan is current**
> and **which are evidence of work already done**.
>
> **Do not delete a plan because it is old.** Commit `777cb88` exists solely to
> preserve the 2026-10-06 → 2026-10-14 strategic corpus that was one `git clean`
> away from being lost. Superseded plans are marked here, not removed.

---

## Current of record

| Question | Plan |
|---|---|
| **What external repos should we integrate, and how?** | [`2026-11-21-external-harness-protocol-adoption-plan.md`](./2026-11-21-external-harness-protocol-adoption-plan.md) |
| **What is the console/managed-app architecture?** | [`2026-10-08-desktop-overhaul-design.md`](./2026-10-08-desktop-overhaul-design.md) (approved design; supersedes the 2026-10-06 attach framing) |
| **What is the relationship model between the console and the Workspace?** | [`2026-10-08-second-brain-doctrine.md`](./2026-10-08-second-brain-doctrine.md) (supersedes the 2026-10-07 doctrine) |

Everything else below is either **shipped evidence** or **a scoped decision
record**. None of them overrides the three above.

---

## Status ledger

### Superseded (kept for history — do not build from these)

| Plan | Superseded by | Why |
|---|---|---|
| [`2026-10-06-cubecloud-agent-integration-plan.md`](./2026-10-06-cubecloud-agent-integration-plan.md) | `2026-10-08-desktop-overhaul-design.md` | The 10-08 design explicitly supersedes its workspace-attach framing |
| [`2026-10-07-second-brain-doctrine.md`](./2026-10-07-second-brain-doctrine.md) | `2026-10-08-second-brain-doctrine.md` | The 10-07 doc inverted the relationship (Workspace as "first brain"); 10-08 corrects it |
| [`2026-10-06-evermind-memory-harness-replan.md`](./2026-10-06-evermind-memory-harness-replan.md) | the 10-08 doctrine | Its P1.5 (EverCore lifecycle) was implemented then **reverted by operator decision** — EverOS stays a third-party tool surface |
| [`2026-10-06-workspace-agentic-os-coordination-matrix.md`](./2026-10-06-workspace-agentic-os-coordination-matrix.md) | the 10-08 doctrine + design | Its rows R1–R7 mostly shipped; the framing is superseded, the detail is still the best reference for what R2/R3/R5/R6 do |

### Executed (shipped — treat as evidence, not as a work queue)

| Plan | Landed | Evidence |
|---|---|---|
| [`2026-08-12-external-repo-adoption-plan.md`](./2026-08-12-external-repo-adoption-plan.md) | `219f664` | P1–P10 modules in `packages/platform-core/src/` + `agent-desktop/src/main/harnesses/` and `chat-middleware.ts` |
| [`2026-08-13-competitive-gap-plan.md`](./2026-08-13-competitive-gap-plan.md) | split across `91925fa`, `04c612a`, `def1206` | IM channels (`src/main/channels/`), Swarm screen, Knowledge vault, MCP one-click install |
| [`2026-06-19-auto-discovery-design.md`](./2026-06-19-auto-discovery-design.md) | `e98bf1a` (V2.10.67) | Auto-discovery + ambient tool suggestions (`ToolSuggestions.tsx`, `auto-discovery.ts`) |
| [`2026-07-17-web-research-integration-plan.md`](./2026-07-17-web-research-integration-plan.md) | `1533d0f` | `last30days` research engine + `agent-reach.ts` |
| [`2026-10-13-workspace-control-panel-plan.md`](./2026-10-13-workspace-control-panel-plan.md) | `ccf2423` (+ `ad6a68e`) | Phase C — `WorkspaceConsole.tsx` five-panel management surface; `ad6a68e` is the ManagedApp framework it builds on |
| [`2026-10-07-decision-core-governance-bench-replan.md`](./2026-10-07-decision-core-governance-bench-replan.md) | `142f3b9` (`455c895` for the Raven adapter) | DM0/DM1/DM2 + I-phase + R5 + R6 — its own status block records them shipped; `455c895` is the I-phase adapter |
| [`2026-10-14-implementation-start-plan.md`](./2026-10-14-implementation-start-plan.md) | 2026-10-14 | Its own status block: tasks 0–2 and 4–5 landed; task 3 became the EverOS v2 plan |

### Open (real remaining work)

| Plan | State |
|---|---|
| [`2026-10-14-everos-v2-dashboard-plan.md`](./2026-10-14-everos-v2-dashboard-plan.md) | **Unstarted.** Phase D of the design. The adapter still speaks v1 — `managed-apps/everos.ts:7` says so verbatim |
| [`2026-07-01-runtime-implementation-plan.md`](./2026-07-01-runtime-implementation-plan.md) | Draft, never approved. Superseded in practice by the shipped `runtime-orchestration.ts` + `harnesses/` registry, but nothing formally retires it |
| [`2026-10-07-scan-first-onboarding-redesign.md`](./2026-10-07-scan-first-onboarding-redesign.md) | Its §3 (workspace-centric first run) was superseded by Phase E of the 10-08 design; the rest is live |

### Decision records (no work implied)

| Plan | What it decided |
|---|---|
| [`2026-10-14-laya-rea-local-model-layer-evaluation.md`](./2026-10-14-laya-rea-local-model-layer-evaluation.md) | Laya stays an optional MCP tool surface; REA not adopted; one copy fix applied |
| [`2026-10-13-phase-c-quality-gate.md`](./2026-10-13-phase-c-quality-gate.md) | Phase C contrast/focus/radius criteria proven |
| [`2026-10-13-phase-f-live-verification.md`](./2026-10-13-phase-f-live-verification.md) | Live attach proof |
| [`2026-10-13-phase-g-readiness-audit.md`](./2026-10-13-phase-g-readiness-audit.md) | Kernel closure proven electron-free; **deletion deliberately not performed** |
| [`2026-07-03-release-workflow-tag-check-plan.md`](./2026-07-03-release-workflow-tag-check-plan.md) | Tag-check workflow design (no CI reference to `tag-check` remains — verify before trusting) |

### Drafts (never promoted)

`ci-yml-fix.draft.md` and `ironclaw-main-chat-routing.draft.md` are working
notes. They were never approved and are not a work queue.

---

## Known out-of-date claims in this corpus

These are recorded rather than edited, because rewriting the historical record
to match the present would destroy its evidential value:

1. **`2026-08-12-external-repo-adoption-plan.md` §P6** describes progressive
   disclosure as "shipped". The module shipped, but nothing called it until
   `008af13` (2026-11-21), and 26 of 48 skills were uncatalogable until
   `ef27f41` because the frontmatter parser dropped quoted descriptions.
2. **`2026-10-14-implementation-start-plan.md`** points at
   `2026-10-07-second-brain-doctrine.md`; the current doctrine is the 10-08 file.
3. **`2026-10-13-workspace-control-panel-plan.md`** says Phase C is the
   "MVP verdict" step; Phase C shipped, so read it as the build record.
4. **`2026-07-01-runtime-implementation-plan.md`** describes a runtime layer
   that has since been rebuilt (`harness.ts`, `runtime-orchestration.ts`).
   Its "Draft — awaiting review" status should be read as "abandoned in favour
   of the shipped design".

---

## Conventions for adding a plan

- Named `YYYY-MM-DD-<topic>-plan.md` or `-design.md` or `-evaluation.md`.
- The header carries **Date**, **Status**, and **Companion docs**.
- When a plan supersedes another, say so in *both* directions: the new plan
  names what it replaces, and the table above gains a row.
- When a plan is executed, append a status block with commit hashes; do not
  rewrite the tasks to look like they predicted the outcome.
