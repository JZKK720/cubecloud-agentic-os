# Cubecloud Desktop Provenance Tracker

Working draft for engineering execution. This document tracks which path families are still inherited, still mixed, or ready to be treated as Cubecloud-original.

## Status legend

- `Inherited`: still substantially inherited from the upstream desktop codebase.
- `Mixed`: partially reworked, but not yet provenance-cleared enough for license cutover.
- `Cubecloud-original`: rewritten from Cubecloud product requirements or from Cubecloud-owned assets and documentation.

## Current replacement wave

Active focus: functional buildings first.

This means the next replacement work should target the user-visible product surfaces that are already being redesigned and extended:

1. Chat empty state, welcome prompts, and conversation shell behavior.
2. Sidebar feature surfaces, especially persona/soul, sessions, gateway, and the settings/legal boundary.
3. Real editing and configuration workflows for models, providers, skills, memory, tools, and schedules.
4. The IPC and preload contracts that support those workflows.

## Path-family ledger

| Path family | Status | Current basis | Immediate next action |
| --- | --- | --- | --- |
| `LICENSE` | Inherited | Governing MIT license for inherited code still in force | Keep unchanged until counsel-approved cutover |
| `README*.md`, `CONTRIBUTING*.md` | Mixed | Rebranded, but not fully rewritten from Cubecloud-only product docs | Finish rewriting around Cubecloud product positioning and support model |
| `docs/legal/**` | Cubecloud-original | Cubecloud legal/planning drafts; cross-link to `TRADEMARK_POLICY.md` (operative brand policy, V2.5+) for wordmark / logo / screenshot rules | Keep current and update as engineering evidence lands. V2.10.11: added a "Related policies" cross-link to TRADEMARK_POLICY.md; no rule change. |
| `build/branding/**`, `build/icon.*`, `previews/**` | Mixed | Cubecloud branding exists; the preview subset was refreshed in V2.10.30 and the packaged icon set was regenerated in V2.10.31 from the current Cubecloud mark | Keep the refreshed screenshots and regenerated icon set aligned to the current brand asset when it changes |
| `src/renderer/src/screens/Layout/**` | Mixed | Cubecloud shell framing and legal modal now diverge, but overall navigation structure is still inherited/mixed | Continue replacing sidebar and shell behavior around Cubecloud feature map |
| `src/renderer/src/screens/Chat/**` | Mixed | Reworked Cubecloud branding with inherited conversation architecture still present | Replace welcome, composer, and session behavior from Cubecloud chat spec |
| `src/renderer/src/screens/Models/**` | Mixed | UI rewritten in parts, behavior still close to inherited config flows | Replace with Cubecloud operator workflows and supporting contracts |
| `src/renderer/src/screens/Providers/**` | Mixed | Reworked branding and some flows, still inherits upstream provider-management structure | Replace provider setup and auth flows from Cubecloud runtime spec |
| `src/renderer/src/screens/Skills/**` | Mixed | Reworked shell, inherited data model still visible | Replace skills management around Cubecloud workflow registry |
| `src/renderer/src/screens/Memory/**` | Mixed | Reworked shell, inherited capacity/profile/provider structure remains | Replace memory surfaces around Cubecloud persona and memory product model |
| `src/renderer/src/screens/Tools/**` | Mixed | Operator-style UI exists, behavior lineage still mixed | Replace tool registry flows with Cubecloud tool and entitlement model |
| `src/renderer/src/screens/Schedules/**` | Mixed | Existing scheduling UX remains structurally inherited | Replace with Cubecloud automation and orchestration workflows |
| `src/main/**`, `src/preload/**` | Inherited or mixed | Runtime lifecycle and IPC remain mostly inherited or adapted | Redefine contracts around Cubecloud runtime, entitlement, and workspace primitives |
| `tests/**` | Mixed | Coverage tracks current behavior, but many tests still describe inherited surfaces | Rewrite tests alongside each replacement wave |
| `scripts/**`, `.github/**`, `build/winget/**` | Mixed | Some branding cleanup is done, structure still partly inherited | Rebuild around Cubecloud distribution, release, and support pipeline |

## Replacement acceptance checks

A path family should not move to `Cubecloud-original` until all of the following are true:

1. The product behavior is described by a Cubecloud requirement, spec, or workflow document.
2. The implementation is rewritten from that requirement instead of preserving upstream structure by analogy.
3. Tests and docs for that path family describe Cubecloud behavior and terminology.
4. No upstream attribution or repository references remain in the path family except where legally required.

## Immediate next build sequence

1. Finish the legal/footer boundary and keep it shell-owned.
2. Continue the functional renderer rewrite, starting with chat welcome state, persona/soul, and sidebar feature parity.
3. Move into the supporting preload/main contracts for those screens once the renderer behavior is defined.
4. Revisit the root `LICENSE` only after this tracker shows the governing code paths are no longer inherited or mixed.

## Related policies

This tracker is the engineering execution view of which path
families are still inherited, mixed, or Cubecloud-original. It
is **not** the operative brand or trademark policy. For the
binding rules on use of the **Cubecloud** wordmark, logotype,
SVG marks, splash screens, screenshots, and previews, see
`TRADEMARK_POLICY.md` in this directory (and its referenced
`licenses/` text files). In particular, fork-and-rebrand
workflows described here MUST also comply with
`TRADEMARK_POLICY.md § 1` (must remove or replace Cubecloud
marks) and § 4 (prohibited uses).
