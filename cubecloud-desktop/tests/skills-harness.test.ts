/**
 * Unit tests for the hidden-skills harness dispatcher
 * (`src/main/skills-harness.ts`).
 *
 * The harness has three observable behaviours:
 *   1. `rankHiddenSkills` returns no skills when the message has no
 *      intent tags.
 *   2. `rankHiddenSkills` returns the matching skills in score
 *      order, capped at `topK`.
 *   3. `buildHiddenSkillFragment` returns an empty string when no
 *      skills match (so callers can skip injection cleanly).
 *   4. `buildHiddenSkillFragment` returns a non-empty string
 *      containing the matched skill's label when at least one
 *      skill matches.
 *
 * We also verify the listing helper surfaces which skills have a
 * SKILL.md on disk (since ECC is intentionally empty today, the
 * harness must still function with no body content).
 */

import { describe, expect, it } from "vitest";

import {
  buildHiddenSkillFragment,
  listHiddenSkillStatus,
  rankHiddenSkills,
} from "../src/main/skills-harness";

describe("skills-harness dispatcher", () => {
  it("returns no skills for a generic message", () => {
    const matched = rankHiddenSkills("hello, can you help me with a thing?");
    expect(matched).toEqual([]);
  });

  it("returns the karpathy skill for a neural-net question", () => {
    const matched = rankHiddenSkills(
      "I'd like to build a language model from scratch. can you help me set up the training loop?",
    );
    const ids = matched.map((s) => s.id);
    expect(ids).toContain("andrej-karpathy-skills");
  });

  it("returns the godot skill for a gdscript scene question", () => {
    const matched = rankHiddenSkills(
      "how do I add a node to my Godot scene programmatically with gdscript?",
    );
    const ids = matched.map((s) => s.id);
    expect(ids).toContain("gstack");
  });

  it("caps results at topK", () => {
    // A message that intentionally hits multiple tags: ECC + Karpathy.
    const matched = rankHiddenSkills(
      "we hit an error correction bug while training the neural network — can you help with the harness and the Karpathy-style recovery steps?",
      { topK: 1 },
    );
    expect(matched).toHaveLength(1);
  });

  it("returns an empty fragment for a generic message", () => {
    const fragment = buildHiddenSkillFragment("hi there!");
    expect(fragment).toBe("");
  });

  it("returns a non-empty fragment for a matching message and includes the label", () => {
    const fragment = buildHiddenSkillFragment(
      "I want to build a nano-gpt style language model from scratch. give me the Karpathy checklist.",
    );
    expect(fragment.length).toBeGreaterThan(0);
    expect(fragment).toMatch(/Karpathy/i);
    // The "do not announce" instruction is also part of the fragment,
    // so the model knows the harness is silent.
    expect(fragment).toMatch(/do not announce/i);
  });

  it("lists hidden skills with hasSkillFile flag reflecting disk state", () => {
    // The `ecc` skill points at the ECC/ directory at the repo root
    // which is currently empty, so hasSkillFile should be false.
    // The other skills have no `skillPath` (label-only), so their
    // hasSkillFile is also false. This assertion documents the
    // current state and will flip to true once a SKILL.md is added
    // to ECC/.
    const status = listHiddenSkillStatus();
    const ecc = status.find((s) => s.id === "ecc");
    expect(ecc).toBeDefined();
    expect(ecc?.hasSkillFile).toBe(false);
  });

  it("does not match on partial-word substring false positives", () => {
    // `md` (in `karpathy` tags) is intentionally not a tag, so
    // `markdown` should not trigger. The `gbrian` `search` tag is
    // also intentionally absent. We test the negative path: a
    // message that LOOKS like it has tags but actually has none.
    const matched = rankHiddenSkills(
      "please write me some markdown notes about the design taste of css frameworks",
    );
    const ids = matched.map((s) => s.id);
    // `taste-skill` SHOULD match (it has `design` and `css` tags).
    expect(ids).toContain("taste-skill");
    // But there's no `markdown`-specific tag, so no spurious matches.
    expect(ids).not.toContain("gbrian");
  });
});
