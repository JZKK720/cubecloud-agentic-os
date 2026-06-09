# Handbook — sub-doc index

> **Companion to the master handbook (`docs/HANDBOOK.md`).** This is the long-form landing page. The handbook gives you the one-screen tour; this gives you the 30-screen per-topic deep dives.

The master handbook is **§1 → §11** of `docs/HANDBOOK.md`. Each of the long-form docs below is a leaf off one of those sections. Read the master handbook first, then dive into the topic you need.

## Map

| Master handbook section | Long-form doc |
|---|---|
| §3 Architecture | [`docs/handbook/ARCHITECTURE.md`](ARCHITECTURE.md) |
| §3.3 Two-tier provenance | [`docs/legal/PROVENANCE_TRACKER.md`](../legal/PROVENANCE_TRACKER.md) |
| §4 Runtime orchestration | [`docs/RUNTIME_ORCHESTRATION_PLAN.md`](../RUNTIME_ORCHESTRATION_PLAN.md) |
| §5 Skills layer | [`.agents/skills/README.md`](../../../.agents/skills/README.md) |
| §6 Security & threat model | [`SECURITY.md`](../../SECURITY.md), [`THREAT_MODEL.md`](../../THREAT_MODEL.md) |
| §8 Contributing | [`CONTRIBUTING.md`](../../CONTRIBUTING.md), [`docs/handbook/DEVELOPMENT.md`](DEVELOPMENT.md) |
| §9 Release process (V2.6, archived) | [`docs/superpowers/archive/2026-04-30-windows-winget-fedora-rpm-release-design.md`](../superpowers/archive/2026-04-30-windows-winget-fedora-rpm-release-design.md) |
| §10 License / brand | [`LICENSE`](../../LICENSE), [`BRANDING_AND_LICENSE.md`](../../BRANDING_AND_LICENSE.md), [`NOTICE`](../../NOTICE), [`ACKNOWLEDGMENTS.md`](../../ACKNOWLEDGMENTS.md), [`docs/legal/`](../legal/) |
| §11 Where to look next | [`docs/handbook/OPERATIONS.md`](OPERATIONS.md), [`docs/handbook/DEVELOPMENT.md`](DEVELOPMENT.md) |

## Per-topic deep dives

### Architecture
- [`docs/CODEGRAPH-RUNTIME.md`](../CODEGRAPH-RUNTIME.md) — CodeGraph surface, two backends, embedded SDK vs CLI subprocess.
- [`docs/EVEROS-SIDECAR.md`](../EVEROS-SIDECAR.md) — EverOS sidecar lifecycle, port mapping, smoke harness.
- [`docs/RUNTIME_ORCHESTRATION_PLAN.md`](../RUNTIME_ORCHESTRATION_PLAN.md) — multi-runtime plan (Hermes day-1, OpenClaw + IronClaw V2.6+).
- (retired in V2.10.36) Workspace migration from `hermes-desktop` to `cubecloud-agentic-os` is now documented inline in `BRANDING_AND_LICENSE.md` §"V2.3 - V2.4 - V2.5 transitions".
- [`docs/SSH-TUNNEL-VPS.md`](../SSH-TUNNEL-VPS.md) — SSH-tunnel deployment to a remote VPS.

### V2 history
- (retired in V2.10.36) The pre-V2.4 / V2.5 / V2.6 commit plan and the V2 commits 1–2 and 3–9 narratives are now archived in `BRANDING_AND_LICENSE.md` §"V2.3 - V2.4 - V2.5 transitions".

### Legal
- [`docs/legal/TRADEMARK_POLICY.md`](../legal/TRADEMARK_POLICY.md) — Cubecloud marks, allowed uses, fork rules.
- [`docs/legal/CUBECLOUD-EULA.md`](../legal/CUBECLOUD-EULA.md) — hosted-service EULA.
- [`docs/legal/PAID_SERVICES_TERMS.md`](../legal/PAID_SERVICES_TERMS.md) — paid-feature terms.
- [`docs/legal/COMMERCIAL_LICENSE.md`](../legal/COMMERCIAL_LICENSE.md) — commercial-relicensing path.
- [`docs/legal/CLEAN_ROOM_REPLACEMENT_PLAN.md`](../legal/CLEAN_ROOM_REPLACEMENT_PLAN.md) — clean-room replacement roadmap.
- [`docs/legal/PROVENANCE_TRACKER.md`](../legal/PROVENANCE_TRACKER.md) — per-path provenance tracker.

### Skills layer
- [`.agents/skills/README.md`](../../../.agents/skills/README.md) — top-level skills index + decision tree.
- [`.agents/skills/SKILLS.md`](../../../.agents/skills/SKILLS.md) — (when the per-skill SKILLS.md files are written, link from here).

### Global install
- [`docs/GLOBAL-INSTALL-PLAN.md`](../../../docs/GLOBAL-INSTALL-PLAN.md) — the global install plan for the skills layer.
- [`docs/agent-skills-bundle/`](../../../docs/agent-skills-bundle/) — the bundle installer scripts.

### Design specs
- [`docs/superpowers/archive/2026-04-30-windows-winget-fedora-rpm-release-design.md`](../superpowers/archive/2026-04-30-windows-winget-fedora-rpm-release-design.md) — the V2.6 release design (archived in V2.10.36).

### Memory
- `/memories/cubecloud-skills-ecosystem.md` (agent memory, not in repo) — the 20-skill ecosystem memory note, with the autoresearch / codegraph conflict-check findings.

## How this index is updated

When a new long-form doc is added to `docs/` or `docs/handbook/`, add a row to the Map table above. The master handbook (`docs/HANDBOOK.md`) is the only doc that can add itself to the "Where to look next" section of a leaf doc.

When a leaf doc is deprecated or removed, remove the row from the Map table. Do not leave a dangling link.

---

**Attribution note.** This index was authored by the Cubecloud Contributors in 2026. It is a Cubecloud-original document; the structure is modelled on the V2.4 → V2.5 → V2.6 brand-license history. The `docs/superpowers/specs/` design-spec convention is preserved in `docs/superpowers/archive/` for prior V2.6 work.

**Recent updates (V2.6 — V2.10).** This file was last
substantively edited during the V2.4 — V2.6 brand-license
wave. The V2.7 (superpowers skills), V2.8 (description-trim audit),
V2.9 (pre-launch bundle, 40/40 smoke), and V2.10 (doc-move, README
split, i18n cleanup, previews cleanup, provenance cross-link,
README Translations pointer) transitions are documented in
[`BRANDING_AND_LICENSE.md`](../../BRANDING_AND_LICENSE.md) under
the corresponding `## V2.7 / V2.8 / V2.9 / V2.10` sub-sections, and
each per-version change is recorded in
[`docs/RETIRED_AND_LEGACY.md`](../RETIRED_AND_LEGACY.md) §
"How to confirm a surface is live". No content rewrite of this
handbook file was needed for V2.10.14; the tail pointer is the
additive update.
