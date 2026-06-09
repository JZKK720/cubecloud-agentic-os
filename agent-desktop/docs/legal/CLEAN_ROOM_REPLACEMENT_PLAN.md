# Clean-Room Replacement Plan

Working draft for internal planning and counsel review. This document is not legal advice.

## Goal

Create a future Cubecloud Desktop release where the desktop code, assets, and branded distribution can move beyond the inherited MIT licensing baseline because the inherited Hermes-derived surfaces have been replaced path by path with provenance-cleared Cubecloud work.

## Non-negotiable rule

Git history does not change the license on inherited files. A path only stops relying on inherited MIT code when that path has been replaced with demonstrably original or otherwise provenance-cleared Cubecloud work.

## Replacement rules

1. Keep the current MIT `LICENSE` in place until counsel approves a full replacement boundary.
2. Do not label inherited files as proprietary just because they were renamed or rebranded.
3. Replace high-visibility surfaces first: branding, docs, screenshots, icons, and packaging.
4. For code surfaces, rewrite from product requirements and behavior specs, not by paraphrasing inherited implementations.
5. Track provenance per path family: inherited, mixed, or Cubecloud-original.
6. Treat hosted services, premium workflows, managed MCP endpoints, and model maintenance as separate commercial layers from the local desktop codebase.

## Phase plan

### Phase 0: Freeze the legal boundary

- Keep upstream `hermes-desktop` as the read-only reference snapshot.
- Treat `agent-desktop/` as mixed until each path family is cleared.
- Use Cubecloud-owned assets only for new icons, marks, splash screens, screenshots, and new docs.

Exit condition: the repo clearly distinguishes inherited code from Cubecloud-owned assets and commercial service layers.

### Phase 1: Replace public-facing identity surfaces

Target paths:

- `README*.md`
- `CONTRIBUTING*.md`
- `build/branding/**`
- `previews/**`
- `build/icon.*`
- release metadata and packaging descriptions

Replacement standard:

- Rewrite docs from current Cubecloud product intent.
- Regenerate every screenshot from Cubecloud-branded UI states.
- Rebuild binary icons and installer imagery from Cubecloud-owned source art.

Exit condition: user-facing docs and assets no longer rely on inherited naming, screenshots, or marketing copy.

### Phase 2: Replace renderer UX shell

Target paths:

- `src/renderer/src/App.tsx`
- `src/renderer/src/screens/**`
- `src/renderer/src/components/**`
- `src/renderer/src/assets/**`
- renderer styles, navigation, and state flows

Replacement standard:

- Re-spec screens from Cubecloud workflows: mission control, workspaces, verification, paid service connectors, and modular app slots.
- Avoid line-for-line or structure-preserving rewrites from inherited components.

Exit condition: the primary desktop UX is traceable to Cubecloud product requirements rather than inherited Hermes Desktop layouts.

### Phase 3: Replace main/preload/runtime boundary

Target paths:

- `src/main/**`
- `src/preload/**`
- installer orchestration and IPC contracts

Replacement standard:

- Redefine IPC around Cubecloud platform concepts: app registry, workspaces, managed connectors, verification, licensing gates, and service entitlements.
- Rewrite install and runtime orchestration from explicit behavior specs.

Exit condition: desktop process boundaries and runtime lifecycle no longer depend on inherited Hermes Desktop orchestration logic.

### Phase 4: Replace scripts, tests, and release automation

Target paths:

- `scripts/**`
- `tests/**`
- `.github/workflows/**`
- `build/winget/**`

Replacement standard:

- Rewrite around Cubecloud packaging, support promises, branding, and service tiers.
- Preserve only externally required formats, not inherited implementation structure.

Exit condition: release automation and verification represent Cubecloud distributions and commercial boundaries only.

### Phase 5: Counsel review and re-licensing cutover

Required evidence:

- Provenance log showing path families that remain inherited, mixed, or fully replaced.
- Counsel review of the replacement record and the future license stack.
- Packaging split between open-source core remnants, Cubecloud-owned assets, and paid services.

Exit condition: counsel approves the point at which a future release can stop distributing inherited MIT-governed code as the governing desktop codebase.

## Initial path-family inventory

| Path family | Current status | Target state | Notes |
| --- | --- | --- | --- |
| `LICENSE` | Inherited | Keep until final cutover | Cannot be removed early |
| `README*.md`, `CONTRIBUTING*.md` | Mixed | Cubecloud-original | Rebrand and rewrite underway |
| `build/branding/**`, `build/icon.*`, `previews/**` | Mixed | Cubecloud-original | Requires fresh screenshot/icon pass |
| `src/renderer/**` | Mixed | Cubecloud-original | Best next code-heavy replacement zone |
| `src/main/**`, `src/preload/**` | Inherited or mixed | Cubecloud-original | Needs contract-first rewrite |
| `scripts/**`, `tests/**`, `.github/**` | Mixed | Cubecloud-original | Align with Cubecloud distribution model |
| Hosted APIs, managed MCP, paid workflows | Cubecloud-owned service layer | Commercial terms | Can be proprietary without changing inherited code license |

## Execution control

- Maintain the live path-family status in `docs/legal/PROVENANCE_TRACKER.md`.
- Any path marked `Cubecloud-original` should have a short note describing the product spec or source-of-truth that drove the rewrite.
- Any path still marked `Mixed` should be treated as not ready for license cutover, even if the UI is fully rebranded.

## Current engineering wave

The next code-heavy replacement wave should align with active product building, not legal paperwork alone.

Priority order:

1. Replace renderer functional buildings: chat empty state, sidebar feature shells, persona/soul surfaces, and operator workflows for models, providers, skills, memory, tools, and schedules.
2. Replace supporting IPC and preload contracts behind those functional buildings so the behavior is defined by Cubecloud platform concepts instead of inherited Hermes wiring.
3. Replace tests and release automation only after the product behavior and process boundaries have been rewritten around the Cubecloud spec.

## Immediate implementation consequence

If the product goal is a future non-MIT Cubecloud desktop release, the next engineering priority should be replacing renderer and process-boundary code under a provenance log, not trying to relabel inherited code in place.