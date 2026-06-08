// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// Cubecloud-original pre-launch defaults — Memory tab.
//
// Six memory entries shipped pre-installed to every Cubecloud
// Agent Desktop install. The user can edit or delete any of
// them. The seed is idempotent: if the user has already saved
// a memory with the same `id`, the seed does not re-add it.
//
// The pre-launch bundle is documented in:
//   cubecloud-desktop/BRANDING_AND_LICENSE.md §"V2.9 transitions landed"
//   cubecloud-desktop/docs/HANDBOOK.md §"5.3 Adding a pre-installed memory"
//   .agents/skills/README.md (the developer-time skill index)

import type { AgentMemoryEntry } from "@cubecloud/platform-core";

/**
 * Pre-installed memory entries. These are *seeds* — not
 * user-private memories. They encode the conventions,
 * runtime topology, and license posture the agent would
 * otherwise have to re-derive on every session.
 *
 * Design rules:
 *   - `id` is a stable kebab-case identifier.
 *   - `label` is short (1-5 words).
 *   - `content` is concise (<800 chars) so it doesn't
 *     dominate the agent's context window.
 *   - The memory is a *summary* of the longer doc; the
 *     longer doc is in `docs/HANDBOOK.md` or `BRANDING_AND_LICENSE.md`.
 */
export const DEFAULT_MEMORIES: AgentMemoryEntry[] = [
  {
    id: "cubecloud-conventions",
    label: "Cubecloud conventions",
    content:
      "DCO 1.1 sign-off required on every commit. SPDX headers in " +
      "Cubecloud-original files: (AGPL-3.0-or-later OR Apache-2.0 OR " +
      "MIT). Inherited hermes-desktop framework code stays MIT; do not " +
      "add Cubecloud copyright to inherited files. See " +
      "CONTRIBUTING.md and BRANDING_AND_LICENSE.md.",
  },
  {
    id: "cubecloud-runtime-topology",
    label: "Runtime orchestration",
    content:
      "Hermes is the day-1 lane. OpenClaw (V2.6+) and IronClaw " +
      "(V2.6+) are additional lanes, not replacements. CodeGraph is " +
      "the MCP-server intelligence surface (intel-hub slot). EverOS " +
      "is the HTTP-sidecar memory+harness surface. See " +
      "docs/RUNTIME_ORCHESTRATION_PLAN.md.",
  },
  {
    id: "cubecloud-skills-two-tier",
    label: "Skills layer is two-tier",
    content:
      "User-visible: skills-lock.json (the Skills screen). " +
      "Hidden: src/main/skills-harness.ts HIDDEN_SKILLS[] (auto-injects " +
      "into the chat prompt; never appears in any UI). " +
      "Developer-time: .agents/skills/<name>/SKILL.md (mirrored to " +
      "~/.agents/skills/). V2.6 / V2.7 / V2.8 add 34 skills to the " +
      "developer-time tier; V2.9 promotes 3 to user-visible.",
  },
  {
    id: "cubecloud-license-brand",
    label: "Brand & license",
    content:
      "Cubecloud marks (logo, wordmark, splash, screenshots) are " +
      "All-rights-reserved; see docs/legal/TRADEMARK_POLICY.md. " +
      "Cubecloud-original code is dual-licensed (AGPL-3.0-or-later " +
      "primary; Apache-2.0 + MIT as compatibility options). " +
      "Hosted tiers, paid features, and managed MCP integrations are " +
      "out-of-scope for the code license.",
  },
  {
    id: "cubecloud-workspace-conventions",
    label: "Workspace conventions",
    content:
      "apps/desktop-shell is Cubecloud-original state layer. " +
      "src/main and src/renderer are the inherited hermes-desktop " +
      "framework (MIT). The two-tier provenance: NEVER add Cubecloud " +
      "copyright to inherited files; ALWAYS add the SPDX header to " +
      "Cubecloud-original files. See docs/legal/PROVENANCE_TRACKER.md.",
  },
  {
    id: "cubecloud-security-posture",
    label: "Security & threat model",
    content:
      "Local user is the trust boundary. Outbound calls are user-" +
      "confirmed or sandboxed to loopback. The agent runtime runs in " +
      "the user's context; the renderer is sandboxed by Electron. " +
      "No telemetry, no analytics call, no remote attestation. " +
      "Sidecars (CodeGraph, EverOS) are optional and lifecycle-" +
      "managed. See SECURITY.md and THREAT_MODEL.md.",
  },
];

/**
 * Idempotent seed. Call after the user's saved memories are
 * loaded; if any seed `id` is not already in the saved set,
 * add it. If the user has deleted a seed, the deletion sticks.
 */
export function seedDefaultMemories(saved: AgentMemoryEntry[]): AgentMemoryEntry[] {
  const existing = new Set(saved.map((m) => m.id));
  const additions: AgentMemoryEntry[] = [];
  for (const def of DEFAULT_MEMORIES) {
    if (!existing.has(def.id)) {
      additions.push(def);
    }
  }
  if (additions.length === 0) {
    return saved;
  }
  return [...saved, ...additions];
}

/** Marker used by the V2.9 audit to confirm the seed ran. */
export const DEFAULT_MEMORIES_SEED_VERSION = 1;
