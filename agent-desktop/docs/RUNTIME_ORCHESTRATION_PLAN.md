# Runtime Orchestration Plan

## Goal

Unify runtime onboarding and future task orchestration under two shared contracts:

- `RuntimeProvider`: install, probe, attach, migrate, and gateway capabilities.
- `TaskOrchestrator`: agent, task, and workflow capabilities.

The contract source of truth lives in `src/shared/runtime-orchestration.ts`.

This plan intentionally does **not** restore the retired Office screen, Claw3D HQ mirror, or any hidden legacy dashboard surface.

## Current Mapping

| Surface | Contract role | Current app boundary | Target direction |
| --- | --- | --- | --- |
| Hermes Agent | `RuntimeProvider` + `TaskOrchestrator` | First-class runtime in Welcome; existing gateway owner in main process | Keep as the default runtime and first native orchestrator |
| IronClaw | `RuntimeProvider` only | Current Docker or endpoint handoff in Welcome; SSH attach via forwarded gateway | Keep as a gateway runtime; pair with Hermes or ECC orchestration instead of embedding its own dashboard |
| OpenClaw | `RuntimeProvider` today, `TaskOrchestrator` later | Optional migration/import banner in Setup | Promote to optional runtime only after probe, attach, and task adapters exist |
| ECC | `TaskOrchestrator` only | No current in-app surface | Add as an optional external harness bridge, not an embedded runtime or dashboard |

## Phase Plan

### Phase 1: Shared contract and registry

- Keep runtime and orchestrator metadata in `src/shared/runtime-orchestration.ts`.
- Use the registry as the naming and capability source for existing runtime-specific code paths.
- Done in this slice for Docker discovery via `src/main/docker-runtimes.ts`.

### Phase 2: Main-process runtime registry

- Add a main-process runtime registry that normalizes the existing runtime probes:
  - Hermes local install and gateway status from `src/main/hermes.ts` and `src/main/index.ts`
  - IronClaw Docker discovery from `src/main/docker-runtimes.ts`
  - OpenClaw import detection from `src/main/installer.ts`
- Expose one read-only IPC contract such as `list-runtime-providers` returning status, connection options, and next actions.
- Keep write actions separate (`start`, `attach`, `migrate`) so each provider remains truthful about what it can do today.

### Phase 3: Onboarding unification without new legacy UI

- Keep `Welcome.tsx` for runtime attach and runtime discovery.
- Keep `Setup.tsx` for provider keys, model lanes, and optional migration/import flows.
- Move both screens to render from the runtime registry instead of provider-specific hardcoded cards.
- Continue treating OpenClaw as optional and post-install until it has a real attach contract.

### Phase 4: Orchestrator adapter layer

- Add a `TaskOrchestrator` adapter layer in the main process, separate from runtime lifecycle.
- Hermes is the first adapter because the repo already has task and dispatch primitives.
- ECC is the second adapter as an optional bridge:
  - CLI or harness detection
  - settings-based enablement
  - bridge commands only
- Do not embed ECC's dashboard or operator shell in Agent Desktop.

### Phase 5: New runtime or operations surface

- If a task UI returns, mount it as a new `Runtimes`, `Operations`, or `Agents` surface in the current layout.
- Drive it from the orchestrator adapter layer instead of any provider-specific hidden screen.
- Keep Chat, Workspace, Welcome, Setup, and Settings as the primary existing surfaces.

### Phase 6: OpenClaw graduation gate

OpenClaw should only move from migration-only to optional runtime after all of the following exist:

- a probeable local or remote runtime endpoint
- a stable attach flow with health checks
- an adapter that translates OpenClaw tasks and workflows into the `TaskOrchestrator` contract
- focused tests proving the adapter works without reviving the retired HQ mirror

### Phase 7: ECC bridge rollout

- Add ECC detection as an optional CLI or harness backend.
- Store ECC bridge config in settings, not onboarding defaults.
- Let ECC operate against compatible runtime providers through bridge commands.
- Keep ECC outside the app core: no copied dashboard, no full embedded operator model.

## File Targets

- `src/shared/runtime-orchestration.ts`: contract source of truth
- `src/main/docker-runtimes.ts`: provider-aware discovery
- `src/main/index.ts`: future runtime and orchestrator registry IPC
- `src/renderer/src/screens/Welcome/Welcome.tsx`: future runtime registry-driven onboarding cards
- `src/renderer/src/screens/Setup/Setup.tsx`: optional import and provider lane setup
- `src/renderer/src/screens/Settings/Settings.tsx`: future advanced runtime and orchestrator settings

## Non-goals

- Reintroducing the legacy Office or Claw3D UI stack
- Recreating the removed Kanban HQ mirror
- Embedding ECC's full dashboard or runtime shell into Agent Desktop
- Pretending OpenClaw is a first-class runtime before it has a real attach contract

## Validation Strategy

- `npm.cmd exec vitest run tests/runtime-orchestration.test.ts tests/docker-runtimes.test.ts`
- `npm.cmd run typecheck`