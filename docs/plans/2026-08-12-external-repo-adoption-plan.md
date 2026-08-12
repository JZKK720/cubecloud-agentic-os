# External Repo Adoption Plan — agent-desktop

> **Date:** 2026-08-12
> **Repos analyzed:** `andrewyng/openworker`, `yc-software/qm`, `JZKK720/cubecloud-skills-bundle-kit`
> **Competitive analysis:** `openocta/openocta` (not for adoption — competitive intelligence only)
> **Target:** `agent-desktop/` in the `cubecloud-agentic-os` monorepo
> **Graphified:** 4 codebases → 17,612 nodes, 50,158 edges, 478 communities (merged cross-repo graph at `graphify-out/merged-graph.json`)

---

## Executive Summary

Three external repos were deep-dived and graphified alongside the agent-desktop. Each contributes a distinct architectural concept set:

| Repo                                      | What it is                         | Key adoptable concepts                                                                                                                                                         |
| ----------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **openworker** (Andrew Ng)                | Python+Tauri desktop AI coworker   | Provider prefix routing, progressive-disclosure skills, auto-compaction, durable resume, steering, unattended inbox, subagent exploration                                      |
| **qm** (yc-software)                      | Headless multi-tenant agent server | Harness interface + router, ToolContext with policy enforcement, scoped memory, security posture composition, tool ledger, tape folding, run queue + leasing, deployment layer |
| **cubecloud-skills-bundle-kit** (JZKK720) | Windows skills installer kit       | 152-skill manifest, SkillSpector security gate, fork mirror management, MCP config template, category-based skill discovery                                                    |

The agent-desktop graph (2,051 nodes, 4,845 edges, 87 communities) reveals a codebase organized around `setupIPC()` (285 edges — the IPC hub), `useI18n()` (111 edges — i18n bridge), and `profileHome()` (52 edges — profile management). The current architecture has runtime providers as HTTP gateways (Hermes, IronClaw, OpenClaw) but lacks a formal harness abstraction, tool policy enforcement, and scoped memory.

---

## Current agent-desktop architecture (from graph analysis)

### God nodes (most connected)

1. `setupIPC()` — 285 edges (IPC hub, all renderer↔main communication)
2. `useI18n()` — 111 edges (i18n bridge, touches every screen)
3. `profileHome()` — 52 edges (profile/soul management)
4. `getEnhancedPath()` — 49 edges (PATH resolution for runtime discovery)
5. `Attachment` — 31 edges (cross-community bridge, file handling)

### Community structure (87 communities, key ones)

- **Community 16** (`setupIPC`): IPC surface — 30 nodes, cohesion 0.22 (highest)
- **Community 3** (`hermes.ts`): Hermes runtime — 62 nodes, cohesion 0.07
- **Community 14** (`codegraph.ts`): CodeGraph integration — 30 nodes
- **Community 31** (`runtime-orchestration.ts`): Runtime catalog — 20 nodes
- **Community 2** (`main/sessions.ts`): Session management — 69 nodes
- **Community 0** (`i18n/index.ts`): i18n locale files — 100+ nodes (largest, weakest cohesion)

### Gaps identified by graph

- **521 isolated nodes** — possible missing edges or undocumented components
- **No formal harness abstraction** — runtime providers are HTTP gateways, not swappable interfaces
- **No tool policy enforcement** — tools are registered ad-hoc, no command screening
- **No scoped memory** — memory is flat (`main/memory.ts`), no per-scope isolation
- **No auto-compaction** — context management is manual
- **No run queue** — turns are synchronous, no leasing or retry

---

## Adoption priorities (ordered by leverage = impact ÷ effort)

### P1 — Harness interface + router (from qm)

**Source:** `qm/src/harness/harness.ts` + `qm/src/harness/harness-router.ts`
**Impact:** HIGH — formalizes the swappable-surfaces contract
**Effort:** M — ~200 lines interface + ~100 lines router
**Risk:** LOW — additive, doesn't break existing HTTP gateway pattern

**What to adopt:**
Define a `Harness` interface in `packages/platform-core/` that abstracts the runtime provider contract:

```typescript
export interface Harness {
  profile: HarnessAdapterProfile; // transport type, capabilities
  turns: HarnessTurnController; // runTurn, resetSession, close
  models: HarnessModelUtilities; // shouldRespond, compactHistory, oneShot
  tools: HarnessToolPresentation; // tool name mapping
}
```

Each runtime (Hermes, IronClaw, OpenClaw) implements this interface. A `HarnessRouter` allows per-session runtime switching with automatic `resetSession()` on switch.

**Where it lands:**

- `packages/platform-core/src/harness.ts` — the interface
- `packages/platform-core/src/harness-router.ts` — the router
- `agent-desktop/src/main/runtime-orchestration.ts` — updated to use `HarnessRouter` instead of direct HTTP gateway attachment

**Graph impact:** Creates a new community bridging communities 3 (Hermes), 14 (CodeGraph), 31 (runtime-orchestration), and 62 (IronClaw-sandbox).

---

### P2 — Provider prefix routing (from openworker)

**Source:** `openworker/coworker/providers/__init__.py` — `ProviderRouter`
**Impact:** HIGH — clean model dispatch by `provider:` prefix
**Effort:** S — ~50 lines
**Risk:** LOW — pure additive

**What to adopt:**
Model strings carry a provider prefix: `ollama:llama3.3` → Ollama, `anthropic:claude-5` → Anthropic, bare `gpt-5.5` → OpenAI. A `ProviderRouter` dispatches by prefix, lazy-builds provider clients, caches them, and supports invalidation.

**Where it lands:**

- `packages/platform-core/src/provider-router.ts` — the router
- `agent-desktop/src/main/models.ts` — updated to resolve models via `ProviderRouter`

**Graph impact:** Strengthens Community 43 (`main/models.ts`) and creates a bridge to Community 19 (`model-discovery.ts`).

---

### P3 — Tool policy enforcement (from qm)

**Source:** `qm/src/policy/command-policy.ts` + `qm/src/security/security-posture.ts`
**Impact:** HIGH — security floor for agent tool calls
**Effort:** M — ~150 lines policy + ~100 lines posture
**Risk:** LOW — additive, wraps existing tool calls

**What to adopt:**

1. **Command policy:** Regex-based command screening with decisions: `allow`, `deny`, `require_approval`. Org-floor rules always apply (`rm -rf` → require_approval, `mkfs` → deny). `scannableCommand()` recursively extracts shell payloads to prevent obfuscation.

2. **Security posture:** Three-tier model (`dangerous`/`auto`/`strict`) with composition. `auto` mode runs a content screening classifier on external data before it reaches the model.

3. **Tool ledger:** Idempotent tool call caching — if a turn retries, prior tool results are replayed instead of re-executed.

**Where it lands:**

- `packages/platform-core/src/command-policy.ts` — regex rules + `scannableCommand()`
- `packages/platform-core/src/security-posture.ts` — three-tier posture + composition
- `packages/platform-core/src/tool-ledger.ts` — idempotent retry cache
- `agent-desktop/src/main/safety.ts` — updated to use `CommandPolicy` + `SecurityPosture`

**Graph impact:** Strengthens Community 68 (`safety.ts`, cohesion 0.29) and creates bridges to Communities 16 (IPC), 62 (IronClaw-sandbox).

---

### P4 — Scoped memory system (from qm)

**Source:** `qm/src/memory/memory-service.ts` + `qm/src/memory/strategy.ts`
**Impact:** MEDIUM-HIGH — structured memory per workspace/project
**Effort:** M — ~200 lines interface + strategies
**Risk:** LOW — additive, doesn't replace existing flat memory

**What to adopt:**

1. **MemoryService interface:** `recall`, `capture`, `query`, `read`, `replace`, `history`, `restore`
2. **`foldCapture()`:** Appends new facts as dated bullets, deduplicates by normalized text, caps at 300 facts (FIFO eviction)
3. **Memory strategies:** `per-turn` (auto-capture after each turn), `agent-only` (agent decides), `consolidation` (periodic merge)
4. **Memory policy:** `recall: off|writable|visible`, `capture: off|writable`
5. **"Memory is an index" philosophy:** Pointers to data, never the data itself. Working state goes in a file, not memory.

**Where it lands:**

- `packages/platform-core/src/memory-service.ts` — interface + `foldCapture()`
- `packages/platform-core/src/memory-strategy.ts` — pluggable strategies
- `agent-desktop/src/main/memory.ts` — updated to implement `MemoryService`

**Graph impact:** Strengthens Community 56 (`main/memory.ts`, cohesion 0.34 — already the tightest community).

---

### P5 — Auto-compaction + durable resume (from openworker)

**Source:** `openworker/coworker/compaction.py` + `openworker/coworker/engine.py`
**Impact:** HIGH — prevents context overflow, enables restart recovery
**Effort:** M — ~150 lines compaction + ~100 lines resume
**Risk:** MEDIUM — touches session management, needs careful testing

**What to adopt:**

1. **Auto-compaction:** When context reaches ~80% of model's window, older entries are summarized into a `context_summary` entry. The LLM generates the summary + mechanical state extraction (pending todos, active files). Never modifies the persisted transcript — only the working context.

2. **Durable resume:** After restart, re-processes unanswered tool-calls from the last turn. The session can pick up where it left off without losing tool call state.

3. **Context budget formula:** `(contextWindow - maxTokens) * 0.5` — use 50% of available context as the working budget.

**Where it lands:**

- `packages/platform-core/src/compaction.ts` — auto-compaction logic
- `packages/platform-core/src/session-resume.ts` — durable resume
- `agent-desktop/src/main/sessions.ts` — updated to use compaction + resume

**Graph impact:** Strengthens Community 2 (`main/sessions.ts`, 69 nodes) and creates a bridge to Community 37 (`session-cache.ts`).

---

### P6 — Progressive-disclosure skills (from openworker)

**Source:** `openworker/coworker/skills/__init__.py`
**Impact:** MEDIUM — better skill discovery and context efficiency
**Effort:** S — ~80 lines
**Risk:** LOW — additive, enhances existing skill system

**What to adopt:**

1. **Catalog at session start:** All skill names + one-line descriptions are injected into the system prompt. The model knows what skills exist without loading their full bodies.
2. **Full body on demand:** When the model decides to use a skill, the full SKILL.md is loaded into context.
3. **Live menu:** Skills can be added/removed mid-session. The catalog is re-injected on the next turn.

**Where it lands:**

- `agent-desktop/src/main/skills.ts` — updated to implement progressive disclosure
- `agent-desktop/src/main/skills-harness.ts` — updated to inject catalog, not full bodies

**Graph impact:** Creates a new bridge between the skills community and Community 3 (Hermes runtime).

---

### P7 — Skills-bundle-kit integration

**Source:** `JZKK720/cubecloud-skills-bundle-kit`
**Impact:** MEDIUM — 152 skills available to desktop users
**Effort:** M — structural alignment + IPC bridge
**Risk:** LOW — additive, doesn't change desktop core

**What to adopt:**

1. **Category-based skill organization:** The kit installs skills flat (`~/.agents/skills/<name>/`). The desktop's `listInstalledSkills()` expects `~/.agents/skills/<category>/<skill>/`. Either:
   - **Option A (preferred):** Update `listInstalledSkills()` to handle both flat and categorized layouts.
   - **Option B:** Update the kit to install with category subfolders.

2. **SkillSpector integration in desktop:** The desktop's `install-skill` IPC handler should run SkillSpector before installing any skill, matching the kit's security gate.

3. **`skills-lock.json` bridge:** The kit should write to `skills-lock.json` so the desktop's Skills UI can manage kit-installed skills.

4. **MCP config sync:** The kit configures 11 MCP servers in VS Code `mcp.json`. The desktop should discover and surface these in its MCP UI.

5. **Fix kit issues before integration:**
   - Fix 10 hardcoded username paths (`C:\Users\KkJz-Th\...` → `$env:USERPROFILE`)
   - Fix `Update-Skills.ps1` to handle `local/*` entries
   - Fix Phase 3 quoting bug (`$"archifyTarget`" → `"$archifyTarget"`)
   - Update stale README counters (144 → 152 skills, 39 → 32 forks)
   - Add `loop-engineering` to Phase 3 fork clone list
   - Complete `SCAN_LOG.md` for all 152 entries

**Where it lands:**

- `agent-desktop/src/main/skills.ts` — updated `listInstalledSkills()` for flat+categorized
- `agent-desktop/src/main/index.ts` — `install-skill` IPC handler runs SkillSpector
- `cubecloud-skills-bundle-kit/setup/install-skill.ps1` — writes to `skills-lock.json`
- `cubecloud-skills-bundle-kit/setup/skills-list.csv` — add category column

---

### P8 — Steering + unattended inbox (from openworker)

**Source:** `openworker/coworker/engine.py` — `TurnEngine`
**Impact:** MEDIUM — UX improvement for long-running turns
**Effort:** M — ~100 lines steering + ~80 lines inbox
**Risk:** MEDIUM — touches the turn loop

**What to adopt:**

1. **Steering:** User injects input mid-turn without stopping the agent. The input is queued and processed at the next iteration boundary. The agent can adjust course without a full restart.

2. **Unattended inbox:** When an approval request is made and the user is away, the approval parks instead of blocking. The turn continues with a "no response" default. When the user returns, they can review and override parked approvals.

**Where it lands:**

- `packages/platform-core/src/steering.ts` — steering queue + injection
- `packages/platform-core/src/inbox.ts` — unattended approval parking
- `agent-desktop/src/main/sessions.ts` — updated to support steering + inbox

---

### P9 — Run queue with leasing (from qm)

**Source:** `qm/src/runs/run-store.ts` + `qm/src/runs/worker.ts`
**Impact:** MEDIUM — enables background agent work + crash recovery
**Effort:** M — ~200 lines
**Risk:** MEDIUM — changes turn execution model

**What to adopt:**

1. **Run store:** Turns are enqueued as `Run`s with status (pending/running/done/failed), attempts, lease token, lease expiry.
2. **Worker:** Claims runs with a lease, sends heartbeats every `leaseTtlMs / 3`, aborts on 3 consecutive failed heartbeats.
3. **Retry:** Failed runs can retry up to `maxAttempts`, with `NonRetryableTurnError` preventing retry.
4. **Use SQLite** instead of Postgres (desktop is single-user).

**Where it lands:**

- `packages/platform-core/src/run-store.ts` — run queue with SQLite backing
- `packages/platform-core/src/run-worker.ts` — worker with leasing
- `agent-desktop/src/main/sessions.ts` — turns enqueued instead of synchronous

---

### P10 — Subagent exploration (from openworker)

**Source:** `openworker/coworker/tools/subagent.py`
**Impact:** LOW-MEDIUM — research capability for complex tasks
**Effort:** S — ~80 lines
**Risk:** LOW — additive, optional

**What to adopt:**
A read-only child engine with fresh context for broad research. The subagent:

- Gets a fresh context window (no parent history)
- Has read-only tools (no file writes, no command execution)
- Returns a summary to the parent
- Can be dispatched in parallel

**Where it lands:**

- `packages/platform-core/src/subagent.ts` — child engine definition
- `agent-desktop/src/main/sessions.ts` — subagent dispatch

---

## Dependency ordering

```
P1 (Harness interface) ──────────────────────────────────────┐
                                                               │
P2 (Provider routing) ────────────────────────────┐            │
                                                   │            │
P3 (Tool policy) ──────────────────────┐            │            │
                                       │            │            │
P4 (Scoped memory) ────────────────────┤            │            │
                                       │            │            │
P5 (Auto-compaction) ───────────────────┤            │            │
                                       │            │            │
P6 (Progressive skills) ────────────────┤            │            │
                                       │            │            │
P7 (Skills-bundle-kit) ─────────────────┤            │            │
                                       │            │            │
P8 (Steering + inbox) ──────────────────┤            │            │
                                       │            │            │
P9 (Run queue) ──────────────────────────┤            │            │
                                       │            │            │
P10 (Subagent) ─────────────────────────┘            │            │
                                                   ──┘            │
                                                                ──┘
```

**P1 must land first** — the harness interface is the foundation for P2, P3, P5, P8, P9, P10.
**P2 and P3 can land in parallel** after P1.
**P4 can land independently** — memory doesn't depend on the harness interface.
**P5 depends on P1** — compaction needs the harness's `compactHistory` method.
**P6 can land independently** — skills are orthogonal to the harness.
**P7 can land independently** — kit integration is structural, not architectural.
**P8 depends on P1** — steering needs the turn loop from the harness.
**P9 depends on P1** — run queue wraps the harness's `runTurn`.
**P10 depends on P1** — subagent uses the harness interface.

---

## Cross-repo graph insights

The merged graph (17,612 nodes, 50,158 edges, 478 communities) reveals:

### God nodes across all repos

1. `ScopeId` (qm) — 565 edges — scope-based multi-tenancy is the most connected concept
2. `SessionManager` (qm) — 381 edges — session management is central
3. `buildApp()` (qm) — 348 edges — the composition root
4. `setupIPC()` (agent-desktop) — 285 edges — the IPC hub
5. `SecretStore` (qm) — 268 edges — credential management

### Cross-repo bridges (surprising connections)

- `PermissionEngine` (openworker) connects to `SecurityPosture` (qm) via the tool policy community
- `ProviderRouter` (openworker) connects to `ModelCapabilities` (qm) via the model abstraction community
- `SessionManager` (qm) connects to `main/sessions.ts` (agent-desktop) via session management
- `ToolContext` (qm) connects to `setupIPC` (agent-desktop) via the tool execution surface

### Import cycles (qm only)

14 import cycles detected, all in `plugins/web-ui/` — the web UI plugin has circular dependencies between contexts, sessions, shell, and split modules. The agent-desktop has **zero import cycles** — its module boundaries are clean.

### Knowledge gaps

2,616 isolated nodes across the merged graph — mostly from qm's large test suite (300+ test files) and openworker's connector adapters. The agent-desktop's 521 isolated nodes are mostly i18n locale entries and type definitions.

---

## What NOT to adopt

| Concept                   | Source     | Why not                                                      |
| ------------------------- | ---------- | ------------------------------------------------------------ |
| Scope-based multi-tenancy | qm         | Desktop is single-user. Multi-workspace scoping is overkill. |
| Tape folding              | qm         | No multi-user audience filtering needed.                     |
| Postgres backing          | qm         | Desktop uses SQLite. No need for a database server.          |
| pg-boss job queue         | qm         | Desktop doesn't need a distributed job queue.                |
| AWS/Fly sandbox backends  | qm         | Desktop runs locally. No cloud sandbox needed.               |
| Slack plugin              | qm         | Desktop has its own UI, not Slack-based.                     |
| Tauri shell               | openworker | Desktop is Electron. No shell change.                        |
| Python agent engine       | openworker | Desktop is TypeScript. No language change.                   |
| Rust STT sidecar          | openworker | Out of scope for this adoption.                              |

---

## Verification gates

Every adoption must pass:

1. `npm run typecheck --workspace cubecloud-agent-desktop` — no type errors
2. `npm run test --workspace cubecloud-agent-desktop` — all tests pass, `Test Files > 0`, `Tests > 0`
3. `npm run build:win --workspace cubecloud-agent-desktop` — builds successfully
4. `npm run verify:bundle --workspace cubecloud-agent-desktop` — asar integrity
5. No new import cycles (graphify `diagnose multigraph` after each adoption)
6. Graphify update: `graphify update agent-desktop/src` after code changes (no API cost)

---

## Graphify outputs

| Output                      | Path                                                                            | Size                           |
| --------------------------- | ------------------------------------------------------------------------------- | ------------------------------ |
| agent-desktop graph         | `agent-desktop/src/graphify-out/graph.json`                                     | 2,051 nodes, 4,845 edges       |
| openworker graph            | `docs/plans/external-repos/openworker/graphify-out/graph.json`                  | 5,562 nodes, 14,835 edges      |
| qm graph                    | `docs/plans/external-repos/qm/graphify-out/graph.json`                          | 9,944 nodes, 30,448 edges      |
| skills-bundle-kit graph     | `docs/plans/external-repos/cubecloud-skills-bundle-kit/graphify-out/graph.json` | 55 nodes, 30 edges             |
| **Merged cross-repo graph** | `graphify-out/merged-graph.json`                                                | **17,612 nodes, 50,158 edges** |
| Merged graph report         | `graphify-out/GRAPH_REPORT.md`                                                  | 478 communities                |
| agent-desktop report        | `agent-desktop/src/graphify-out/GRAPH_REPORT.md`                                | 87 communities                 |
| openworker analysis         | `docs/plans/external-repos/openworker/ARCHITECTURE-ANALYSIS.md`                 | Full deep-dive                 |

To query the merged graph:

```
graphify query "How does the harness interface connect to the IPC surface?" --graph graphify-out/merged-graph.json
graphify path "setupIPC" "Harness" --graph graphify-out/merged-graph.json
```

To update after code changes:

```
graphify update agent-desktop/src
```

---

## Systematic adaptation deep-dive — how the pieces compose

This section traces the actual architectural connections revealed by the graph queries and shows how the 10 adoptions compose into a coherent system rather than 10 isolated patches.

### The current architecture: data registry without behavioral contract

The graph trace of `runtime-orchestration.ts` reveals the core gap. The agent-desktop already has:

```
RuntimeProviderDefinition (data) → RuntimeProviderCatalog (static array) → RuntimeProviderSnapshot (status)
```

But it's a **data-only registry**. The `RUNTIME_PROVIDER_CATALOG` in `runtime-orchestration.ts` is a static array of objects with `id`, `displayName`, `capabilities`, `connectionModes` — but no methods. The actual runtime behavior lives in separate, non-polymorphic files:

- `hermes.ts` (62 nodes, community 3) — Hermes-specific: `startGateway()`, `sendMessage()`, `isGatewayRunning()`, `ensureInitialized()`
- `ironclaw-sandbox.ts` (10 nodes, community 62) — IronClaw-specific: `dispatchSandboxTask()`, `probeIronClawGateway()`
- `codegraph.ts` (30 nodes, community 14) — CodeGraph-specific: `buildCodeGraphContext()`, `buildExecEnv()`

These files don't share an interface. The graph shows **no edges between `runtime-orchestration.ts` and `ironclaw-sandbox.ts`** — the runtime catalog doesn't know about the IronClaw behavioral code. The IPC surface (`setupIPC()`, 285 edges) calls Hermes functions directly, not through an abstraction.

### What qm does differently: the harness as behavioral contract

In qm's graph, the `Harness` interface (community 7, 167 nodes at `src/harness/harness.ts:L167`) is the **behavioral contract** that the orchestrator depends on. The trace shows:

```
buildApp() → Orchestrator.handleTurn() → Harness.turns.runTurn() → [Pi|OpenCode|Codex|Claude] adapter
                                    ↓
                         Harness.models.compactHistory()
                                    ↓
                         Harness.tools (tool name mapping)
```

The orchestrator (community 23, `src/core/orchestrator.ts`) has edges to:

- `harness-router.ts` (community 11) — which dispatches to the right adapter
- `pi-harness.ts` (community 21), `codex-harness.ts` (community 54), `opencode-harness.ts` (community 87), `claude-harness.ts` (community 85) — all implement the same interface
- `context-compaction.ts` (community 7) — called via `Harness.models.compactHistory()`

The key insight: **qm's orchestrator never imports a specific harness**. It imports the `Harness` interface and receives a `HarnessRouter` via dependency injection. The agent-desktop's `setupIPC()` imports `hermes.ts` directly — that's the coupling to break.

### The adaptation: from data registry to behavioral contract

**Step 1 (P1):** Define `Harness` interface in `packages/platform-core/`

```typescript
// packages/platform-core/src/harness.ts
export interface Harness {
  readonly profile: HarnessAdapterProfile;
  readonly turns: HarnessTurnController;
  readonly models: HarnessModelUtilities;
  readonly tools: HarnessToolPresentation;
}

export interface HarnessAdapterProfile {
  transport: "http" | "stdio" | "subprocess" | "in-process";
  supportsStreaming: boolean;
  supportsToolCalls: boolean;
  supportsCompaction: boolean;
  supportsSessionReset: boolean;
}

export interface HarnessTurnController {
  runTurn(input: HarnessTurnInput): AsyncIterable<HarnessTurnDelta>;
  resetSession(sessionId: string): Promise<void>;
  close(): Promise<void>;
}

export interface HarnessModelUtilities {
  shouldRespond(history: TurnEntry[]): boolean;
  compactHistory(
    history: TurnEntry[],
    budget: number,
  ): Promise<CompactionResult>;
  oneShot(prompt: string, model?: string): Promise<string>;
}

export interface HarnessToolPresentation {
  mapToolName(internalName: string): string;
  unmapToolName(externalName: string): string;
}
```

**Step 2 (P1):** Implement `HermesHarness` as a thin adapter over existing `hermes.ts` functions

The graph shows `hermes.ts` already has: `sendMessage()` (streams via SSE), `startGateway()`, `isGatewayRunning()`, `ensureInitialized()`. The adapter wraps these behind `Harness.turns.runTurn()`:

```typescript
// agent-desktop/src/main/harnesses/hermes-harness.ts
export class HermesHarness implements Harness {
  readonly profile: HarnessAdapterProfile = {
    transport: "http",
    supportsStreaming: true,
    supportsToolCalls: true,
    supportsCompaction: false, // P5 will enable this
    supportsSessionReset: true,
  };

  turns: HarnessTurnController = {
    async *runTurn(input) {
      // Wraps existing sendMessage() SSE stream
      for await (const delta of sendMessage(input.sessionId, input.message)) {
        yield { type: "text", content: delta.text };
      }
    },
    async resetSession(sessionId) {
      /* existing session reset */
    },
    async close() {
      /* stop gateway if owned */
    },
  };
  // ...
}
```

**Step 3 (P1):** Implement `HarnessRouter` that dispatches by `RuntimeProviderId`

```typescript
// packages/platform-core/src/harness-router.ts
export class HarnessRouter {
  constructor(
    private adapters: ReadonlyMap<RuntimeProviderId, Harness>,
    private resolve: (sessionId: string) => Promise<RuntimeProviderId>,
  ) {}

  async *runTurn(sessionId: string, input: HarnessTurnInput) {
    const providerId = await this.resolve(sessionId);
    const harness = this.adapters.get(providerId);
    if (!harness) throw new Error(`No harness for ${providerId}`);
    yield* harness.turns.runTurn(input);
  }
}
```

**Step 4 (P1):** Wire `setupIPC()` to use `HarnessRouter` instead of direct `hermes.ts` calls

This is the surgical change: `setupIPC()` currently calls `sendMessage()` directly. After P1, it calls `harnessRouter.runTurn()` which dispatches to the right adapter. The existing Hermes behavior is unchanged — it's just wrapped.

### How P2 (provider routing) composes with P1

The openworker graph trace shows `ProviderRouter` (community 109, `coworker/providers/router.py:L23`) with edges to:

- `ProviderClient` (community 10) — the ABC all providers implement
- `._client_for()` — lazy-builds and caches provider clients
- `._provider_name()` — extracts the prefix from a model string
- `.complete()` and `.stream()` — the two entry points

In the agent-desktop, model resolution currently lives in `main/models.ts` (community 43, 15 nodes) and `main/config.ts` (`getModelConfig()`, community 53). These are config readers, not dispatchers.

**The composition:** P2 adds a `ProviderRouter` that sits **inside** the `HermesHarness.models` utility. When the harness needs to call a model, it goes through the router:

```
HarnessRouter → HermesHarness.turns.runTurn() → ProviderRouter.stream("anthropic:claude-5") → AnthropicProvider
                                                              → ProviderRouter.stream("ollama:llama3.3") → OllamaProvider
```

This means the harness interface (P1) is the outer contract, and the provider router (P2) is the inner dispatch. They compose cleanly because P2 is invisible to the harness — it's an implementation detail of how `HermesHarness` calls models.

### How P3 (tool policy) composes with P1

The qm graph shows `ToolContext` (community 22, `src/tools/primitives.ts`) with edges to:

- `command-policy.ts` — `evaluateCommandWithLayer()` screens every `execute` call
- `security-posture.ts` — three-tier posture composition
- `sandbox/sandbox.ts` — the sandbox interface

In the agent-desktop, the graph shows `safety.ts` (community 68, 9 nodes, cohesion 0.29) with `checkCareful()`, `isDestructive()`, `DESTRUCTIVE_PATTERNS`. This is a **screening layer** but it's not integrated into the tool execution path — it's called ad-hoc from `setupIPC()`.

**The composition:** P3 wraps the tool execution path inside the harness. When a tool call comes back from the model (via `HarnessTurnDelta`), it goes through:

```
Model → HarnessTurnDelta { type: "tool_call" } → CommandPolicy.evaluate(command) → SecurityPosture.check(content) → execute or deny
```

The `CommandPolicy` and `SecurityPosture` live in `packages/platform-core/` and are injected into each harness. The harness doesn't know about policy — it just reports tool calls and the router layer enforces policy before execution.

### How P4 (scoped memory) composes with the system

The qm graph shows `MemoryService` (community 159, `src/memory/memory-service.ts`) with edges to:

- `foldCapture()` — dedup + FIFO eviction
- `strategy.ts` — pluggable strategies
- `policy.ts` — recall/capture visibility

In the agent-desktop, `main/memory.ts` (community 56, 13 nodes, cohesion 0.34 — the tightest community) has `readMemory()`, `addMemoryEntry()`, `updateMemoryEntry()`, `removeMemoryEntry()`. It's a flat key-value store with no scoping, no dedup, no eviction.

**The composition:** P4 is **independent of P1** — memory doesn't go through the harness. It's injected into the system prompt assembly (which happens before the harness is called). The memory service sits alongside the harness:

```
setupIPC() → readMemory(scopeId) → inject into system prompt → HarnessRouter.runTurn(input with memory context)
                                              ↑
                                    MemoryService.capture(result) ← after turn completes
```

The scoping is per-profile (the desktop is single-user but multi-profile). `ScopeId` becomes `ProfileId` — each profile gets its own memory namespace.

### How P5 (auto-compaction) composes with P1

The openworker graph trace shows `compaction.py` (community 13) with a rich set of functions:

- `should_compact()` — checks if context is near limit
- `estimate_tokens()` — token counting
- `extract_working_state()` — mechanical state extraction (pending todos, active files)
- `summarize_span()` — LLM summary of old entries
- `apply_to_outbound()` — inject compaction summary into working context
- `is_context_overflow()` — detect overflow errors

The key: compaction **never modifies the persisted transcript** — it only modifies the working context sent to the model. The persisted transcript is immutable history.

**The composition:** P5 depends on P1 because compaction is a `HarnessModelUtilities` method:

```typescript
// Inside HermesHarness.models:
async compactHistory(history: TurnEntry[], budget: number): Promise<CompactionResult> {
  if (!shouldCompact(history, budget)) return { compacted: false, history };
  const state = extractWorkingState(history);  // mechanical extraction
  const summary = await this.models.oneShot(summarizeSpan(history));  // LLM summary
  return { compacted: true, history: [...summary, ...state.recentEntries] };
}
```

The `HarnessRouter` calls `compactHistory()` before each turn if `shouldCompact()` returns true. The harness interface makes this provider-agnostic — each harness can implement compaction differently (or delegate to a shared implementation in `packages/platform-core/`).

### How P6 (progressive skills) composes with the system

The openworker graph shows the skills system (community 46, `coworker/agent.py`) with edges to:

- `build_engine()` — assembles agent with tools + permissions + memory + skills
- Skills are loaded as a catalog (name + one-liner) at session start
- Full SKILL.md body loaded on demand when the model invokes a skill

In the agent-desktop, `skills-harness.ts` (community 3, in the Hermes community) and `skills.ts` have the skill discovery logic. The graph shows `skills-harness.ts` is in the **same community as Hermes** — it's tightly coupled to the Hermes runtime.

**The composition:** P6 is independent of P1 — skills are injected into the system prompt, not into the harness. The change is:

```
Before: skills-harness.ts loads full SKILL.md bodies → injects into system prompt
After:  skills-harness.ts loads catalog (name + description) → injects catalog into system prompt
        When model requests a skill → load full body on demand → inject into next turn's context
```

This reduces context usage by ~80% when there are many skills (the catalog is ~50 tokens per skill vs ~500-2000 tokens for a full body).

### How P7 (skills-bundle-kit) composes with P6

The skills-bundle-kit graph (55 nodes, 30 edges) is small — it's a PowerShell installer, not a codebase. But the integration point is clear:

```
skills-bundle-kit → installs 152 skills to ~/.agents/skills/<name>/SKILL.md
agent-desktop skills.ts → listInstalledSkills() → reads ~/.agents/skills/<category>/<name>/SKILL.md
```

**The mismatch:** The kit installs flat (`~/.agents/skills/<name>/`); the desktop expects categorized (`~/.agents/skills/<category>/<name>/`). P7 fixes this by updating `listInstalledSkills()` to handle both layouts.

**The composition with P6:** Once the desktop discovers kit-installed skills, P6's progressive disclosure applies to them automatically — the catalog includes all discovered skills (bundled + kit-installed), and full bodies load on demand.

### How P8 (steering + inbox) composes with P1

The openworker graph shows `TurnEngine` (community 40, `coworker/engine.py`) with:

- Interruptible from any state (mid-stream, mid-tool, mid-approval)
- Steering queue — user input injected at iteration boundary
- Unattended inbox — approvals park instead of blocking

**The composition:** P8 depends on P1 because steering is a `HarnessTurnController` feature:

```typescript
export interface HarnessTurnController {
  runTurn(input: HarnessTurnInput): AsyncIterable<HarnessTurnDelta>;
  steer(sessionId: string, input: string): void; // NEW: inject mid-turn
  resetSession(sessionId: string): Promise<void>;
  close(): Promise<void>;
}
```

The `HarnessRouter` forwards `steer()` to the active harness. The harness implementation queues the input and processes it at the next iteration boundary. The IPC surface exposes a new `steer` channel that calls `harnessRouter.steer()`.

### How P9 (run queue) composes with P1

The qm graph shows `run-store.ts` (community 44) and `worker.ts` (community 23) with:

- `Run` with status (pending/running/done/failed), attempts, lease token
- Worker claims runs, sends heartbeats, aborts on lease loss
- Failed runs retry up to `maxAttempts`

**The composition:** P9 wraps the harness's `runTurn()`:

```
Before: setupIPC() → sendMessage() → synchronous response
After:  setupIPC() → runStore.enqueue(request) → worker claims → harnessRouter.runTurn() → result
```

The run queue is invisible to the harness — it's an outer layer. The harness doesn't know if it's running synchronously or from a queue. This means P9 can be added without changing any harness implementation.

### How P10 (subagent) composes with P1

The openworker graph shows `subagent.py` in the tools community with edges to the engine — a read-only child engine with fresh context.

**The composition:** P10 uses the `Harness` interface to create a child harness:

```typescript
const childHarness = harnessRouter.createChild({
  readOnly: true,
  freshContext: true,
  tools: ["read", "search"], // restricted tool set
});
const result = await childHarness.turns.runTurn({ message: "Research X" });
```

The child harness is the same interface, configured differently. The `HarnessRouter` can create child harnesses that share the same provider connections but have isolated session state.

---

## The composed system (target architecture)

After all 10 adoptions, the agent-desktop architecture becomes:

```
┌─────────────────────────────────────────────────────────────────┐
│ Renderer (React)                                                │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│  │Chat  │ │Sessns│ │Setngs│ │Kanban│ │Wiki  │ │Headrm│ │Tools │ │
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ │
│     └────────┴────────┴────────┴────────┴────────┴────────┘     │
│                        │ useChatIPC()                           │
└────────────────────────┼────────────────────────────────────────┘
                         │ IPC (preload bridge)
┌────────────────────────┼────────────────────────────────────────┐
│ Main Process           │                                         │
│  ┌─────────────────────┴──────────────────────┐                  │
│  │              setupIPC()                    │                  │
│  │  (285 edges → still the hub, but now        │                  │
│  │   delegates to HarnessRouter, not hermes)  │                  │
│  └─────────────────────┬──────────────────────┘                  │
│                        │                                         │
│  ┌─────────────────────┴──────────────────────┐                  │
│  │           HarnessRouter                    │                  │
│  │  resolve(sessionId) → RuntimeProviderId    │                  │
│  │  runTurn() → active harness                 │                  │
│  │  steer() → active harness                   │                  │
│  └──────┬──────────────┬──────────────┬──────┘                  │
│         │              │              │                          │
│  ┌──────┴──────┐ ┌────┴──────┐ ┌────┴──────┐                   │
│  │HermesHarness│ │IronClawH. │ │OpenClawH. │                   │
│  │ (HTTP)      │ │(WASM-HTTP)│ │(HTTP)     │                   │
│  └──────┬──────┘ └────┬──────┘ └────┬──────┘                   │
│         │              │              │                          │
│  ┌──────┴──────────────┴──────────────┴──────┐                  │
│  │         ProviderRouter                     │                  │
│  │  "anthropic:X" → AnthropicProvider         │                  │
│  │  "ollama:X" → OllamaProvider               │                  │
│  │  bare "gpt-X" → OpenAIProvider             │                  │
│  └───────────────────────────────────────────┘                  │
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │CommandPolicy │ │SecurityPostur│ │  ToolLedger  │             │
│  │(regex rules) │ │(3-tier)     │ │(idempotent)  │             │
│  └──────┬───────┘ └──────┬──────┘ └──────┬───────┘             │
│         └────────────────┴───────────────┘                     │
│                        │ tool call screening                     │
│  ┌─────────────────────┴──────────────────┐                     │
│  │         Tool Execution                 │                     │
│  │  (existing IPC handlers, now wrapped)  │                     │
│  └────────────────────────────────────────┘                     │
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │MemoryService│ │  Compaction  │ │  RunStore    │             │
│  │(scoped,    │ │(auto, 80%)   │ │(SQLite, lease)│             │
│  │ foldCapture)│ │              │ │              │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐                              │
│  │SkillsHarness │ │  Subagent    │                              │
│  │(progressive  │ │(read-only    │                              │
│  │ disclosure)  │ │ child)       │                              │
│  └──────────────┘ └──────────────┘                              │
└──────────────────────────────────────────────────────────────────┘
```

### The key architectural shifts

| Before                                       | After                                                                       |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| `setupIPC()` calls `hermes.ts` directly      | `setupIPC()` calls `HarnessRouter` which dispatches to the active harness   |
| Runtime providers are data definitions       | Runtime providers are behavioral implementations of `Harness`               |
| Model resolution is config reading           | Model resolution is `ProviderRouter` dispatch by prefix                     |
| Tool safety is ad-hoc `checkCareful()` calls | Tool safety is `CommandPolicy` + `SecurityPosture` wrapping every tool call |
| Memory is flat key-value                     | Memory is scoped `MemoryService` with `foldCapture()` and strategies        |
| Context management is manual                 | Context management is auto-compaction at 80% budget                         |
| Skills are loaded fully into system prompt   | Skills are progressive-disclosure: catalog at start, body on demand         |
| Turns are synchronous                        | Turns are enqueued as `Run`s with leasing and retry                         |
| No mid-turn user input                       | Steering queue + unattended inbox                                           |
| No child agents                              | Subagent with fresh context for research                                    |

### The graph evolution

After all adoptions, the agent-desktop graph should show:

1. **New community:** `HarnessRouter` community bridging Hermes (3), IronClaw (62), and runtime-orchestration (31)
2. **Strengthened community 68** (`safety.ts`): now connected to IPC (16) and IronClaw (62) via `CommandPolicy`
3. **Strengthened community 56** (`memory.ts`): now connected to sessions (2) via `MemoryService`
4. **New community:** `ProviderRouter` bridging models (43) and model-discovery (19)
5. **New community:** `RunStore` connecting sessions (2) and IPC (16)
6. **Reduced isolated nodes:** The 521 isolated nodes should decrease as the harness interface creates new edges between previously disconnected communities

### Verification: graphify after each adoption

After each adoption lands, run:

```bash
# Update the agent-desktop graph (AST only, no API cost)
graphify update agent-desktop/src

# Check for new import cycles
graphify diagnose multigraph --graph agent-desktop/src/graphify-out/graph.json

# Query the updated graph to verify new connections
graphify query "How does the harness router connect to all runtime providers?" --graph agent-desktop/src/graphify-out/graph.json
```

The graph should show:

- **Before P1:** No edges between `runtime-orchestration.ts` and `ironclaw-sandbox.ts`
- **After P1:** New `HermesHarness`, `IronClawHarness`, `HarnessRouter` nodes with edges to both
- **After P3:** `CommandPolicy` node with edges to `setupIPC` and `safety.ts`
- **After P5:** `compactHistory` node with edges to `sessions.ts` and `session-cache.ts`

This is how you verify the adoption is structurally sound — the graph proves the connections exist, not just the code.

---

## Graph-verified architectural evidence

The following graph traces confirm the architectural gaps and the proposed solutions:

### Gap 1: setupIPC directly calls Hermes (verified)

```
graphify path "setupIPC" "sendMessage" --graph agent-desktop/src/graphify-out/graph.json --undirected
→ Shortest path (1 hops):
  setupIPC() --calls [EXTRACTED]--> sendMessage()
```

**Before P1:** `setupIPC()` has a direct `calls` edge to `sendMessage()` in `hermes.ts`.
**After P1:** This edge should be replaced by `setupIPC() → HarnessRouter.runTurn() → HermesHarness.turns.runTurn() → sendMessage()` (3 hops through the router).

### Gap 2: runtime-orchestration has no direct edge to ironclaw-sandbox (verified)

```
graphify path "runtime-orchestration.ts" "ironclaw-sandbox.ts" --graph agent-desktop/src/graphify-out/graph.json --undirected
→ Shortest path (3 hops):
  runtime-orchestration.ts ←-- docker-runtimes.ts ←-- main/index.ts --→ main/ironclaw-sandbox.ts
```

**Before P1:** The runtime catalog connects to IronClaw only through `docker-runtimes.ts` → `main/index.ts` — a 3-hop indirect path.
**After P1:** `HarnessRouter` creates a direct edge: `runtime-orchestration.ts → HarnessRouter → IronClawHarness → ironclaw-sandbox.ts` (3 hops but through the behavioral contract, not through the main index file).

### Gap 3: qm's orchestrator never imports a specific harness (verified)

```
graphify query "How does the harness interface connect to the orchestrator and model providers?" --graph docs/plans/external-repos/qm/graphify-out/graph.json
→ 267 nodes found, including:
  Orchestrator [src=src/core/orchestrator/types.ts:L192 community=23]
  Harness [src=src/harness/harness.ts:L167 community=7]
  harness-router.ts [src=src/harness/harness-router.ts:L1 community=11]
  pi-harness.ts, codex-harness.ts, opencode-harness.ts, claude-harness.ts
```

The qm orchestrator (community 23) has edges to `harness-router.ts` (community 11) but **no direct edges to any specific harness file**. The harness router is the only bridge. This is the pattern to adopt.

### Gap 4: openworker's ProviderRouter is a clean dispatch layer (verified)

```
graphify query "How does ProviderRouter dispatch to different model providers?" --graph docs/plans/external-repos/openworker/graphify-out/graph.json
→ 486 nodes found, including:
  ProviderRouter [src=coworker/providers/router.py:L23 community=109]
  ProviderClient [src=coworker/providers/base.py:L102 community=10]
  ._client_for() [src=coworker/providers/router.py:L58 community=109]
  ._provider_name() [src=coworker/providers/router.py:L48 community=109]
  .complete() [src=coworker/providers/router.py:L91 community=109]
  .stream() [src=coworker/providers/router.py:L104 community=109]
```

The `ProviderRouter` (community 109) is a separate community from the providers themselves (community 10). It has only 4 methods: `_client_for()`, `_provider_name()`, `complete()`, `stream()`. This is a ~50-line adapter that can be ported to TypeScript directly.

---

## DeerFlow adaptation conflict analysis (post-fast-forward to v2.10.77)

After fast-forwarding from `ae3c51f` to `0059d09` (v2.10.77), the repo gained 51 commits including 4 DeerFlow adaptation commits and several major features. This section analyzes whether the existing DeerFlow adaptations conflict with or complement the 10-item adoption plan.

### What DeerFlow added (4 commits, already in the codebase)

| #   | Commit    | File(s)                                                         | What it does                                                                                                                                                                                                                                | Wired into chat path?                                          |
| --- | --------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | `cb7c831` | `chat-middleware.ts` (303 lines) + 14 tests                     | Orchestration-level middleware chain: `BeforeModelContext`/`AfterModelContext`, `runBeforeModelChain`/`runAfterModelChain`, `headroomCompressMiddleware`, `runtimeRouteMiddleware` (no-op stub), `createReflectionMiddleware` (opt-in stub) | **NO** — defined but not imported by `hermes.ts`               |
| 2   | `7cd7a10` | `plan-execution-loop.ts` (308 lines) + 8 tests                  | Plan-mode execution loop: `executePlan()` dispatches steps to runtime, collects results, respects `dependsOn`, re-plans on failure via `recordDispatchFailure`                                                                              | **NO** — defined but not imported by `plans.ts` or `hermes.ts` |
| 3   | `972092e` | `output-aggregation.ts` (208 lines) + 10 tests + 4 IPC handlers | Output aggregation: `<profile>/outputs/<thread-id>/` directory, `listThreadOutputs`, `summarizeOutputs`, MIME guessing                                                                                                                      | **YES** — 4 IPC handlers wired in `main/index.ts`              |
| 4   | `0069eff` | `chat-middleware.ts` (+81 lines) + 3 tests                      | Replaces reflection stub with injectable `CritiqueFn` pattern, `REFLECTION_SYSTEM_PROMPT`                                                                                                                                                   | **NO** — same file, still not wired into `hermes.ts`           |

### What else v2.10.74–v2.10.77 added

| Feature                                 | Key files                                                                          | Relevant to adoption plan?                                   |
| --------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Raven runtime** (4th provider)        | `runtime-orchestration.ts` — `RuntimeProviderId` now includes `"raven"`, port 8855 | **YES** — P1 harness interface must cover 4 runtimes, not 3  |
| **Voice STT/TTS**                       | Chat composer mic button, agent message speaker button                             | No conflict                                                  |
| **Eval framework**                      | 5 starter cases in Settings                                                        | No conflict                                                  |
| **Skill sharing via git URL**           | `install-skill` IPC handler clones, scans, installs                                | **YES** — P7 skills-bundle-kit integration overlaps          |
| **moo-tasks kanban** (14 MCP tools)     | Plans screen panel                                                                 | No conflict                                                  |
| **Codebase-memory-mcp** (CMM)           | CodeGraph screen panel                                                             | **YES** — P4 scoped memory overlaps with CMM's memory        |
| **Browser harness**                     | Tools screen status panel                                                          | No conflict                                                  |
| **Full i18n parity** (7 non-en locales) | `shared/i18n/locales/`                                                             | No conflict, but P1–P10 must add i18n keys for all 8 locales |

### Conflict analysis: DeerFlow vs adoption plan

#### P1 (Harness interface + router) — COMPLEMENTS DeerFlow

**No conflict. Strong synergy.**

The DeerFlow `chat-middleware.ts` already created the `runtimeRouteMiddleware` as a **no-op stub with an explicit "insertion point for future capability-based routing" comment** (line 192–198). The harness interface (P1) is exactly what this stub was designed for:

```typescript
// Current (DeerFlow stub):
export const runtimeRouteMiddleware: BeforeModelMiddleware = async (ctx) => {
  // No transformation — just pass through. The routing hint is
  // computed but not yet consumed. This is the insertion point
  // for future capability-based routing.
  return { messages: ctx.messages, applied: false, label: "route:pass" };
};

// After P1: the middleware calls HarnessRouter to pick the harness
export const runtimeRouteMiddleware: BeforeModelMiddleware = async (ctx) => {
  const providerId = await harnessRouter.resolve(ctx.sessionId);
  return {
    messages: ctx.messages,
    applied: true,
    label: `route:${providerId}`,
    stats: { routedTo: providerId },
  };
};
```

**The middleware chain is the perfect integration point for the harness router.** Instead of wiring `HarnessRouter` directly into `setupIPC()` (as the original plan proposed), P1 can wire it through the `runtimeRouteMiddleware` — which is already designed for this purpose. The middleware chain runs before the model call, so the routing decision happens at the right time.

**However:** The middleware chain is **not yet wired into `hermes.ts`**. The `runBeforeModelChain` and `runAfterModelChain` functions exist but are never called from the actual chat path. P1 implementation should **wire the middleware chain into `hermes.ts` first**, then implement the harness router as the `runtimeRouteMiddleware` body.

#### P2 (Provider prefix routing) — NO CONFLICT

The DeerFlow middleware doesn't touch model resolution. `ProviderRouter` (P2) sits inside the harness's model dispatch, which is downstream of the middleware chain. No overlap.

#### P3 (Tool policy enforcement) — COMPLEMENTS DeerFlow

**No conflict. Strong synergy.**

The DeerFlow `AfterModelContext` already has the structure for post-response processing. The `reflection` middleware (DeerFlow #4) is an `after_model` middleware that critiques the response — this is a **quality gate**, not a **security gate**. P3's `CommandPolicy` and `SecurityPosture` are **before_model** and **during_tool_call** gates. They operate at different stages:

```
before_model:  [headroomCompress] → [runtimeRoute (P1)] → [securityScreen (P3)]
                                                                              ↓
model call:    ProviderRouter (P2) → model API
                                                              ↓
tool call:     CommandPolicy.evaluate (P3) → execute or deny
                                                              ↓
after_model:   [reflection (DeerFlow #4)] → [memoryExtract (future)]
```

P3 adds a new `before_model` middleware (`securityScreenMiddleware`) that screens external content before it reaches the model — this slots into the existing chain alongside `headroomCompress` and `runtimeRoute`.

#### P4 (Scoped memory) — OVERLAP with Codebase-memory-mcp (CMM)

**Minor conflict. Needs reconciliation.**

v2.10.76 added Codebase-memory-mcp (CMM) as a Tier 2 support surface — it's a Cypher-query-based codebase memory with 14 MCP tools and a 3D graph. CMM is about **codebase knowledge** (AST, dependencies, call graphs). P4's `MemoryService` is about **conversation memory** (facts, preferences, working state).

**Resolution:** These are different memory systems serving different purposes:

- CMM = codebase structural memory (AST, imports, call paths) — read-only, code-focused
- P4 MemoryService = conversational memory (facts, preferences, decisions) — read-write, context-focused

No code conflict. But the user-facing memory UI should distinguish them clearly. P4 should be named "Conversation Memory" or "Session Memory" to avoid confusion with CMM's "Codebase Memory."

#### P5 (Auto-compaction) — OVERLAP with Headroom

**Synergy, not conflict.**

The DeerFlow `headroomCompressMiddleware` already does context compression via Headroom before the model call. P5's auto-compaction is a different layer:

- **Headroom (existing):** Compresses the **message text** before sending to the model (lossy summarization of the current message batch). Runs as a `before_model` middleware.
- **P5 auto-compaction (from openworker):** Summarizes **old history entries** when the total context approaches the model's window limit. Runs as a `HarnessModelUtilities.compactHistory()` method. Preserves the persisted transcript; only modifies the working context.

**Resolution:** They compose in sequence:

1. P5 `compactHistory()` runs first — if history is near the token budget, summarize old entries into a `context_summary`
2. Headroom middleware runs second — compress the resulting message batch for transmission

P5 should be wired as a `HarnessModelUtilities` method (as planned), not as a middleware. The middleware chain handles pre-send compression; the harness handles pre-call history compaction.

#### P6 (Progressive-disclosure skills) — NO CONFLICT

DeerFlow doesn't touch the skills system. No overlap.

#### P7 (Skills-bundle-kit integration) — OVERLAP with skill sharing via git URL

**Minor conflict. Needs reconciliation.**

v2.10.76 added "skill sharing via git URL" — the `install-skill` IPC handler now clones a git repo, scans with SkillSpector, and installs. This overlaps with P7's goal of integrating the skills-bundle-kit's `install-skill.ps1` pipeline.

**Resolution:** The desktop's built-in `install-skill` IPC handler (v2.10.76) is the **runtime** path — it runs inside the Electron process. The kit's `install-skill.ps1` is the **installer** path — it runs as a standalone PowerShell script for bulk installation. They serve different use cases:

- Desktop `install-skill`: single skill, user-driven, from the Skills UI
- Kit `install-skill.ps1`: 152 skills, batch-driven, from the command line

P7 should focus on:

1. Making the desktop's `listInstalledSkills()` handle both flat (kit) and categorized (desktop) layouts
2. Making the desktop's `install-skill` IPC handler write to `skills-lock.json` (so kit-installed skills are visible in the UI)
3. NOT duplicating the kit's batch install pipeline — the desktop should call the kit's `setup-global-skills.ps1` for bulk installs, not reimplement it

#### P8 (Steering + inbox) — NO CONFLICT

DeerFlow doesn't implement steering. The middleware chain is before/after model — steering is mid-turn. No overlap.

#### P9 (Run queue with leasing) — OVERLAP with plan-execution-loop

**Synergy, not conflict.**

The DeerFlow `plan-execution-loop.ts` already implements a step-by-step execution loop with `ExecuteStepFn` as the injected runtime callback. P9's `RunStore` is a more general version of this — it queues any turn (not just plan steps) with leasing and retry.

**Resolution:** The plan-execution-loop is a **specific consumer** of the run queue. P9 should:

1. Implement `RunStore` as the general turn queue
2. Refactor `executePlan()` to enqueue plan steps as `Run`s instead of calling `ExecuteStepFn` directly
3. The `RunStore` handles leasing, heartbeat, retry — `executePlan` just enqueues and waits for results

This makes the plan-execution-loop more robust (crash recovery via lease) without changing its interface.

#### P10 (Subagent) — NO CONFLICT

DeerFlow doesn't implement subagents. No overlap.

### Summary: conflicts and synergies

| Adoption                | DeerFlow interaction                                                             | Verdict                                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| P1 (Harness interface)  | `runtimeRouteMiddleware` is the designed insertion point                         | **Strong synergy** — wire middleware into hermes.ts first, then implement harness router as the middleware body |
| P2 (Provider routing)   | No overlap                                                                       | **No conflict**                                                                                                 |
| P3 (Tool policy)        | Different stage in the pipeline (before_model + tool_call vs after_model)        | **Strong synergy** — add `securityScreenMiddleware` to the existing chain                                       |
| P4 (Scoped memory)      | CMM is codebase memory, P4 is conversation memory                                | **Minor overlap** — name P4 clearly to distinguish from CMM                                                     |
| P5 (Auto-compaction)    | Headroom compresses messages, P5 compacts history                                | **Synergy** — they compose in sequence (P5 first, Headroom second)                                              |
| P6 (Progressive skills) | No overlap                                                                       | **No conflict**                                                                                                 |
| P7 (Skills-bundle-kit)  | Desktop's `install-skill` IPC (v2.10.76) overlaps with kit's `install-skill.ps1` | **Minor overlap** — desktop handles single-skill UI installs, kit handles batch CLI installs                    |
| P8 (Steering + inbox)   | No overlap                                                                       | **No conflict**                                                                                                 |
| P9 (Run queue)          | `plan-execution-loop.ts` is a specific consumer of the run queue                 | **Synergy** — refactor `executePlan()` to use `RunStore`                                                        |
| P10 (Subagent)          | No overlap                                                                       | **No conflict**                                                                                                 |

### Updated implementation order (post-DeerFlow)

The DeerFlow adaptations change the implementation order:

```
Phase 0: Wire chat-middleware into hermes.ts (prerequisite for P1)
    ↓
Phase 1: P1 (Harness interface + router) — implement as runtimeRouteMiddleware body
    ↓
Phase 2: P2 (Provider routing) + P3 (Tool policy) — in parallel
    ↓
Phase 3: P4 (Scoped memory) + P6 (Progressive skills) + P7 (Skills-bundle-kit) — in parallel
    ↓
Phase 4: P5 (Auto-compaction) — as HarnessModelUtilities method
    ↓
Phase 5: P9 (Run queue) — refactor plan-execution-loop to use RunStore
    ↓
Phase 6: P8 (Steering + inbox) + P10 (Subagent)
```

**Phase 0 is new** — the DeerFlow middleware chain must be wired into `hermes.ts` before P1 can use it as the routing insertion point. This is a ~20-line change: import `runBeforeModelChain`/`runAfterModelChain` and call them in the existing `finalizePreparedRequest` path.

### Raven runtime impact on P1

The `RuntimeProviderId` type now includes `"raven"` (4 runtimes, not 3). P1's `HarnessRouter` must handle 4 adapters:

- `HermesHarness` — HTTP gateway (port 8642)
- `IronClawHarness` — WASM-sandbox HTTP gateway (port 3231)
- `OpenClawHarness` — HTTP gateway (port 18789)
- `RavenHarness` — HTTP gateway (port 8855), self-evolving memory + SkillForge + Sentinel

All 4 use the same OpenAI-compatible `/v1/chat/completions` contract, so the `Harness` interface is the same — only the `HarnessAdapterProfile` differs (Raven adds `supportsSelfEvolution: true` to the profile).

---

## Competitive Analysis: OpenOcta (八爪鱼) — not for adoption

> **Repo:** `openocta/openocta` @ `b9cb2e2` (post-v1.2.0)
> **Purpose:** Competitive intelligence only. Not for adoption or integration.
> **Full report:** `docs/plans/external-repos/openocta/COMPETITIVE-ANALYSIS.md`

### What OpenOcta is

OpenOcta is China's first open-source personal desktop AI agent — a Go-native, ~30MB single-binary desktop app built with Wails v2 and CloudWeGo Eino's DeepAgent framework. Apache-2.0 licensed, 351 commits, 13 contributors, 26 releases (v0.1.0 → v1.2.0).

### Where they beat us

| Advantage                                                | Impact | Why it matters                                                             |
| -------------------------------------------------------- | ------ | -------------------------------------------------------------------------- |
| **Single Go binary (~30MB)**                             | HIGH   | 30MB vs our 150MB+ Electron — deployment simplicity perception             |
| **IM channels** (WeChat, WeCom, DingTalk, Feishu, QQ)    | HIGH   | Critical for Chinese market — we have zero IM integration                  |
| **Agent Swarm** (multi-agent collaboration)              | MEDIUM | WeChat-like UI + topology graph — compelling for complex tasks             |
| **Digital Employees** (role-based agents)                | MEDIUM | Curated skills/MCP per role reduces token waste                            |
| **Knowledge Vault** (Obsidian-compatible)                | MEDIUM | User-visible, editable knowledge base — our EverOS is infrastructure-level |
| **L4 Evolution** (self-improvement + injection scanning) | MEDIUM | Agent self-improvement with security scanning                              |
| **Embedded local models** (GGUF via yzma/llama.cpp)      | MEDIUM | No external Ollama needed — strengthens "works offline"                    |
| **Model Plaza** (CanIRun.ai-style, 77 models)            | LOW    | Model browsing with hardware recommendations                               |
| **Scenario templates**                                   | LOW    | Pre-packaged vertical deployment scenarios                                 |
| **Webhook alert system** (Prometheus/Sentry/Grafana)     | LOW    | Automated incident response                                                |
| **25+ model providers** (strong CN domestic)             | LOW    | Granular provider support, especially Chinese                              |
| **Approval queue**                                       | LOW    | We just built this in P8 — now need to surface it in UI                    |

### Where we beat them

| Advantage                                     | Impact | Why it matters                                              |
| --------------------------------------------- | ------ | ----------------------------------------------------------- |
| **4 swappable runtime providers**             | HIGH   | Architecturally unique — no other desktop agent offers this |
| **SSH tunnel support**                        | HIGH   | Remote gateway capability for distributed teams             |
| **Headroom context compression**              | HIGH   | Sophisticated context management for long sessions          |
| **CodeGraph** (semantic code intelligence)    | HIGH   | Unique in the desktop agent space                           |
| **Agent Reach** (15-platform internet router) | MEDIUM | Broader than OpenOcta's webfetch/websearch                  |
| **Voice STT/TTS**                             | MEDIUM | Hands-free interaction UX differentiator                    |
| **Agent eval framework**                      | MEDIUM | Structured evaluation is unique                             |
| **Full i18n** (7 locales)                     | MEDIUM | International market vs their Chinese-first                 |
| **OEM-ready** (multi-license, brand pack)     | MEDIUM | Commercial use cases they can't address                     |
| **Progressive disclosure skills** (P6)        | LOW    | More refined than their flat skill loading                  |
| **moo-tasks kanban** (14 MCP tools)           | LOW    | Agent-native project management                             |
| **Harness interface + router** (P1)           | LOW    | Formal behavioral contract for runtimes                     |

### Strategic positioning

|                    | OpenOcta                                                 | Cubecloud                                                |
| ------------------ | -------------------------------------------------------- | -------------------------------------------------------- |
| **Target**         | Chinese personal desktop user, IT ops, office automation | Developer teams, sovereign intelligence, OEM-ready       |
| **Strength**       | Lightweight, IM integration, multi-agent, local models   | Developer tools, runtime flexibility, OEM, international |
| **Weakness**       | Single-user, no dev tools, Chinese-first                 | Heavy (Electron), no IM, no multi-agent UI               |
| **Differentiator** | Go single binary + IM + swarm                            | Swappable providers + CodeGraph + Headroom               |

### Top 5 competitive threats to address

1. **IM channel support** — Add WeCom, DingTalk, Feishu integrations. This is OpenOcta's biggest advantage in the Chinese market. Our `channels` architecture could follow their `ChannelPlugin → OutboundAdapter → RuntimeChannel → InboundSink` pattern.

2. **Agent swarm UI** — Elevate our P10 subagent infrastructure to a user-facing feature with visual topology. Multi-agent collaboration is compelling for complex tasks.

3. **User-visible Knowledge Vault** — Complement EverOS with an Obsidian-compatible, user-editable knowledge base with hybrid search (Bleve full-text + vector). Users want to see and manage what the agent knows.

4. **Embedded local model support** — Built-in GGUF inference (without requiring Ollama) would strengthen the "works offline" promise. The yzma/llama.cpp approach is worth studying.

5. **Deployment simplicity** — The 30MB vs 150MB+ gap is a perception barrier. Consider a lightweight mode or Tauri-based alternative build for users who don't need the full Electron feature set.

### What NOT to do

- **Don't switch from Electron to Wails/Go** — our entire codebase is TypeScript/React; a rewrite would be catastrophic
- **Don't copy their Eino DeepAgent framework** — our harness interface (P1) is more flexible
- **Don't abandon the developer tools focus** — CodeGraph, Agent Reach, eval framework are our defensible differentiators
- **Don't chase their 766+ skill marketplace** — our progressive disclosure system (P6) is more refined; quality over quantity
