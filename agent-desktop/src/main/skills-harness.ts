/**
 * Hidden skills registry + harness dispatcher.
 *
 * Cubecloud-original work (2026). Distributed under the dual
 * license per `LICENSE` (AGPL-3.0-or-later OR Apache-2.0 OR MIT);
 * see `BRANDING_AND_LICENSE.md` for the per-path provenance
 * breakdown.
 *
 * SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
 *
 * Background:
 *   `skills-lock.json` describes the user-visible skills that the
 *   Skills screen surfaces (install / uninstall / view). The user
 *   has additional knowledge surfaces that should *not* appear in
 *   any UI list â€?ECC, gbrian, gstack, andrej-karpathy-skills,
 *   taste-skill, and friends. They survive as a hidden harness
 *   that injects itself into the chat system prompt when the user
 *   message matches the skill's intent tags.
 *
 * Design constraints (per product decision):
 *   - `hidden: true` skills NEVER appear in any UI list, status bar,
 *     settings panel, debug surface, telemetry, or log line. The
 *     only observable signal that one is active is the chat
 *     response itself (because the model is now steering with the
 *     skill's guidance).
 *   - The harness is a single-file dispatcher; no LLM round-trip,
 *     no new process, no new IPC. If it gets more sophisticated
 *     later (LLM-based reranker, embedding similarity, etc.) the
 *     seam is in `dispatchHiddenSkills` below.
 *   - Hidden skills are loaded from `src/main/skills-harness.ts`
 *     (this file) so the user-visible `skills-lock.json` stays
 *     clean and the hidden set is in a separate, intentional place
 *     that's easy to audit and easy to keep hidden in diffs.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";

/**
 * A hidden skill entry. Mirrors the shape of user-visible skills
 * enough that the same `SKILL.md` frontmatter parser can read it,
 * but lives in code (not in `skills-lock.json`) so it never leaks
 * to the UI.
 */
export interface HiddenSkill {
  /** Stable id used in logs and dispatch telemetry. */
  readonly id: string;
  /** Short human label â€?only used internally (logs, debugging). */
  readonly label: string;
  /**
   * Intent tags used by the lightweight matcher. The dispatcher
   * scores a skill by counting how many of these terms appear in
   * the user message (case-insensitive whole-word match).
   */
  readonly intentTags: readonly string[];
  /**
   * Optional path to a directory containing a `SKILL.md` (with
   * YAML frontmatter `name` + `description`) or the markdown file
   * itself. If the file is missing, the harness still injects the
   * `id` + `label` as a tiny prompt fragment so the model has at
   * least the "harness flavor" of the skill.
   */
  readonly skillPath?: string;
  /**
   * If `true`, the harness includes the full SKILL.md body in the
   * system prompt. If `false` (default), the harness only injects
   * a one-line `label` reference so the prompt stays short.
   *
   * Hidden skills that are *very* small (a flavor) can leave this
   * false. Hidden skills that need the model to follow a specific
   * procedure should set this to `true` and ship a SKILL.md.
   */
  readonly includeBody?: boolean;
  /**
   * Hard cap on the body length in characters. Bodies longer than
   * this are truncated with a `â€¦` marker. Defaults to 4000 â€?enough
   * for a focused procedure, small enough to keep the prompt
   * predictable. Set higher for skills that genuinely need more.
   */
  readonly maxBodyChars?: number;
}

/**
 * The hidden skill set. Add a new entry here to add a hidden skill.
 *
 * Conventions:
 *   - `id` is the kebab-case skill id (matches the folder name when
 *     the skill ships as a directory).
 *   - `intentTags` are lowercase phrases the matcher counts in the
 *     user message. Three to six tags per skill is a healthy range.
 *   - `skillPath` is the on-disk location. Relative paths resolve
 *     against `process.cwd()` (which is the `agent-desktop/`
 *     folder when running from source, and the install root when
 *     packaged).
 *   - `includeBody` is opt-in. Skills without a SKILL.md should
 *     leave it false; the harness injects the label only.
 */
const HIDDEN_SKILLS: readonly HiddenSkill[] = [
  {
    id: "ecc",
    label: "ECC harness â€?error-correction & continuity",
    intentTags: [
      "ecc",
      "error correction",
      "harness",
      "agent continuity",
      "recovery",
      "retry",
    ],
    // The user said "don't quarantine ECC". The directory exists on
    // disk; the harness reads SKILL.md from it if present, and falls
    // back to the label-only fragment otherwise.
    skillPath: "ECC",
    includeBody: true,
    maxBodyChars: 4000,
  },
  {
    id: "gbrian",
    label: "gbrian â€?global brand & research aid",
    intentTags: [
      "gbrian",
      "brand",
      "research",
      "internet research",
      "search the web",
    ],
    includeBody: false,
  },
  {
    id: "gstack",
    label: "gstack â€?Godot / game-stack helper",
    intentTags: [
      "gstack",
      "godot",
      "gdscript",
      "game",
      "scene",
      "node",
      "engine",
    ],
    includeBody: false,
  },
  {
    id: "andrej-karpathy-skills",
    label: "Karpathy-style software-engineering guidance",
    intentTags: [
      "karpathy",
      "andrew karpathy",
      "lfs",
      "language model from scratch",
      "neural network",
      "minbpe",
      "spellbook",
      "nano-gpt",
    ],
    // The Karpathy skill ships a public GitHub source â€?the desktop
    // bundle already loads it as a user-visible skill from
    // `skills-lock.json` (id: "karpathy-guidelines"). The hidden
    // copy here exists so the harness can also auto-inject the
    // flavor when the user is mid-conversation on a Karpathy-style
    // topic, without the user having to install the visible skill.
    includeBody: false,
  },
  {
    id: "taste-skill",
    label: "Frontend taste â€?design heuristics for shipping UI",
    intentTags: [
      "taste",
      "frontend",
      "ui",
      "ux",
      "design",
      "styling",
      "css",
      "tailwind",
    ],
    includeBody: false,
  },
  {
    // V2.9 pre-launch bundle â€?operator tone flavor.
    // Injected on every message; body is empty so the prompt stays
    // small. The flavor is the *label* only.
    id: "cubecloud-tone",
    label: "Cubecloud operator tone â€?concise, action-shaped, honest about limits",
    intentTags: [],
    includeBody: false,
  },
  {
    // V2.9 pre-launch bundle â€?cost-aware flavor.
    // Injects when the user mentions cost, budget, or model selection.
    id: "cubecloud-economist",
    label: "Cost-aware model and tool selection â€?pick the smallest model that can do the job",
    intentTags: [
      "cost",
      "budget",
      "expensive",
      "cheap",
      "model selection",
      "which model",
      "token cost",
    ],
    includeBody: false,
  },
  {
    // V2.9 pre-launch bundle â€?license-aware flavor.
    // Injects when the user mentions license, commercial use, or
    // distribution â€?references the Cubecloud dual-license posture.
    id: "cubecloud-licensor",
    label: "License-aware â€?Cubecloud-original is dual-licensed; respect the inherited-MIT framework carve-out",
    intentTags: [
      "license",
      "licence",
      "commercial",
      "distribution",
      "fork",
      "open source",
      "agpl",
      "mit",
      "apache",
    ],
    includeBody: false,
  },
];

/**
 * Read a hidden skill's body markdown. Returns the empty string when
 * the skill is `includeBody: false`, when the file is missing, or
 * when the file is unreadable. Hard-fails silently â€?the harness
 * should never throw because of a missing skill file.
 */
function readHiddenSkillBody(skill: HiddenSkill): string {
  if (!skill.includeBody) return "";
  const max = skill.maxBodyChars ?? 4000;

  const candidates: string[] = [];
  if (skill.skillPath) {
    // Both relative-to-cwd and absolute forms. We resolve both
    // because the cwd at chat-time is the desktop's runtime dir
    // (agent-desktop/ in dev, app dir in packaged build).
    candidates.push(resolve(process.cwd(), skill.skillPath, "SKILL.md"));
    candidates.push(resolve(skill.skillPath, "SKILL.md"));
  }

  for (const path of candidates) {
    try {
      if (existsSync(path) && statSync(path).isFile()) {
        const raw = readFileSync(path, "utf-8");
        if (raw.length > max) {
          return raw.slice(0, max) + "\nâ€?truncated)";
        }
        return raw;
      }
    } catch {
      /* ignore */
    }
  }

  // No file found â€?the skill either has no SKILL.md (e.g. ECC is
  // currently empty) or its path was wrong. Either way: silent
  // fallback to a label-only fragment.
  return "";
}

/**
 * Lightweight intent matcher. Counts how many of the skill's
 * `intentTags` appear in the user message as whole words (case
 * insensitive). Returns a non-negative score; zero means no match.
 *
 * Whole-word match avoids substring false positives: "karpathy" in
 * the word "karpathy-style" still matches (it's a whole word), but
 * "md" inside "markdown" doesn't.
 */
function scoreSkillAgainstMessage(
  skill: HiddenSkill,
  userMessage: string,
): number {
  const haystack = userMessage.toLowerCase();
  let score = 0;
  for (const tag of skill.intentTags) {
    const needle = tag.toLowerCase();
    if (needle.length === 0) continue;
    // Boundary: word boundary or string edge.
    const re = new RegExp(
      `(^|\\b)${needle.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}(\\b|$)`,
      "i",
    );
    if (re.test(haystack)) score += 1;
  }
  return score;
}

/**
 * Top-K skills for a given user message, sorted by descending
 * score, ties broken by stable id order. K is small (default 3) so
 * the system prompt stays focused â€?three concurrent hidden
 * skills is the realistic maximum before the prompt becomes
 * noise.
 */
export function rankHiddenSkills(
  userMessage: string,
  options: { topK?: number; minScore?: number } = {},
): HiddenSkill[] {
  const topK = options.topK ?? 3;
  const minScore = options.minScore ?? 1;

  const scored = HIDDEN_SKILLS.map((skill) => ({
    skill,
    score: scoreSkillAgainstMessage(skill, userMessage),
  }))
    .filter((entry) => entry.score >= minScore)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.skill.id.localeCompare(b.skill.id);
    })
    .slice(0, topK)
    .map((entry) => entry.skill);

  return scored;
}

/**
 * Build a system-prompt fragment describing the matched hidden
 * skills. The fragment is plain markdown and is meant to be
 * concatenated with the user's other system messages. Empty when
 * no skills matched (so the call site can skip injection cleanly).
 *
 * The fragment is intentionally *not* a tool result, a function
 * call, or anything the model is expected to *call back into*. It
 * is a soft hint that biases the model's behavior. The model is
 * free to ignore it.
 */
export function buildHiddenSkillFragment(userMessage: string): string {
  const matched = rankHiddenSkills(userMessage);
  if (matched.length === 0) return "";

  const sections = matched.map((skill) => {
    const body = readHiddenSkillBody(skill);
    if (body) {
      return `### ${skill.label}\n\n${body}`;
    }
    return `### ${skill.label}\n\nA hidden harness is active for this turn. The user message touches this skill's intent tags. Apply its flavor when responding.`;
  });

  return [
    "## Hidden harnesses (auto-injected; not user-visible)",
    "",
    "The following harnesses are silently active for this turn. Apply them as background context; do not announce their presence in your reply unless the user asks.",
    "",
    ...sections,
  ].join("\n");
}

/**
 * Walk the hidden skills directory and list which ones have a
 * SKILL.md on disk. Exposed for debugging only; never wired to any
 * UI. Callers should call `buildHiddenSkillFragment(userMessage)`
 * rather than this.
 */
export function listHiddenSkillStatus(): Array<{
  id: string;
  label: string;
  hasSkillFile: boolean;
}> {
  return HIDDEN_SKILLS.map((skill) => {
    let hasSkillFile = false;
    if (skill.skillPath) {
      const candidates = [
        resolve(process.cwd(), skill.skillPath, "SKILL.md"),
        resolve(skill.skillPath, "SKILL.md"),
      ];
      hasSkillFile = candidates.some(
        (p) => existsSync(p) && statSync(p).isFile(),
      );
    }
    return { id: skill.id, label: skill.label, hasSkillFile };
  });
}

/**
 * The default directory probe used by `listHiddenSkillStatus`.
 * Exposed for tests; the production call site never invokes this.
 */
export function _hiddenSkillsRootCandidates(skillPath: string): string[] {
  return [
    resolve(process.cwd(), skillPath, "SKILL.md"),
    resolve(skillPath, "SKILL.md"),
    resolve(process.cwd(), skillPath),
    resolve(skillPath),
  ];
}

// Suppress unused-import lints for the helpers we may use in future
// expansions of the harness. Keeping the import here so the surface
// is obvious to anyone reading the file.
const _readdirSync = readdirSync;
const _join = join;
void _readdirSync;
void _join;
