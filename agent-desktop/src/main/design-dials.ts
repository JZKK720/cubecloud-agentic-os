// Design Dials (Step 5 of the 7-step harvest rollout). The
// "Design Dials" idea was harvested from the Taste / Cohesion
// research trend in agent-UI design (https://taste.skill.sh/ and
// similar): give the user three low-stakes knobs that nudge the
// agent's tone / verbosity / structure without forcing them to
// author a full soul.md from scratch.
//
// We persist the values to a per-profile JSON file so each
// profile can have its own taste, and the renderer can surface
// the same numbers in the Settings → Design Dials surface later.
//
// The dials themselves are intentionally numeric (0–100):
//
//   - variance: how adventurous the agent is with phrasing, word
//     choice, and metaphor. 0 = dry / literal, 100 = flamboyant.
//   - motion: how much the agent's responses are structured as a
//     sequence of steps, bullets, and progress markers. 0 = essay,
//     100 = heavily decomposed.
//   - density: how much information is packed per paragraph.
//     0 = lots of whitespace, short sentences, 100 = dense
//     technical prose.
//
// The numbers are passed to the agent's system prompt as a soft
// style hint (see SOUL injection in main/chat), so the values
// always stay within a sensible 0..100 range and we never write
// garbage to disk.

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { profileHome } from "./utils";

/** The three dials, each in [0, 100]. */
export interface DesignDials {
  variance: number;
  motion: number;
  density: number;
}

/** Default values, picked to be close to "balanced prose". */
export const DEFAULT_DESIGN_DIALS: DesignDials = {
  variance: 35,
  motion: 50,
  density: 55,
};

const ALL_KEYS: (keyof DesignDials)[] = ["variance", "motion", "density"];

/**
 * Coerce any value to a clamped integer in [0, 100]. Treats
 * non-finite and non-number values as "use the default" so a
 * hand-edited JSON file can never crash the renderer.
 */
function clampDial(value: unknown, fallback: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : NaN;
  if (Number.isNaN(n)) return fallback;
  const rounded = Math.round(n);
  if (rounded < 0) return 0;
  if (rounded > 100) return 100;
  return rounded;
}

function dialPath(profile?: string): string {
  return join(profileHome(profile), "design-dials.json");
}

/**
 * Read the persisted Design Dials for the given profile, falling
 * back to `DEFAULT_DESIGN_DIALS` for missing fields or an
 * unreadable / missing file.
 */
export function getDesignDials(profile?: string): DesignDials {
  const filePath = dialPath(profile);
  if (!existsSync(filePath)) {
    return { ...DEFAULT_DESIGN_DIALS };
  }
  try {
    const raw = JSON.parse(readFileSync(filePath, "utf-8")) as Partial<
      Record<keyof DesignDials, unknown>
    >;
    return {
      variance: clampDial(raw.variance, DEFAULT_DESIGN_DIALS.variance),
      motion: clampDial(raw.motion, DEFAULT_DESIGN_DIALS.motion),
      density: clampDial(raw.density, DEFAULT_DESIGN_DIALS.density),
    };
  } catch {
    return { ...DEFAULT_DESIGN_DIALS };
  }
}

/**
 * Persist the Design Dials to disk, clamping every value to
 * [0, 100]. Returns the sanitized values that were actually
 * written, so the caller can update its UI to match the on-disk
 * truth.
 */
export function setDesignDials(
  dials: Partial<DesignDials>,
  profile?: string,
): DesignDials {
  const current = getDesignDials(profile);
  const merged: DesignDials = {
    variance: clampDial(dials.variance, current.variance),
    motion: clampDial(dials.motion, current.motion),
    density: clampDial(dials.density, current.density),
  };
  const filePath = dialPath(profile);
  writeFileSync(filePath, JSON.stringify(merged, null, 2) + "\n", "utf-8");
  return merged;
}

/**
 * Render the Design Dials as a short style hint suitable for
 * appending to a system prompt. The renderer / chat layer is free
 * to use this; the actual injection is owned by `hermes.ts` so
 * this helper stays a pure function of the input.
 *
 * Example output:
 *   Style hint: write with variance=35, structure=50, density=55.
 *   - variance=35: phrasing is mostly literal; keep metaphors sparing.
 *   - structure=50: mix prose with a few headings and lists.
 *   - density=55: roughly one idea per short paragraph.
 */
export function designDialsToStyleHint(dials: DesignDials): string {
  const varianceNote =
    dials.variance < 25
      ? "phrasing is dry and literal; avoid metaphor"
      : dials.variance < 60
        ? "phrasing is balanced; sparing metaphors are fine"
        : "phrasing is expressive; metaphor and color are welcome";

  const motionNote =
    dials.motion < 30
      ? "respond as flowing prose, not a checklist"
      : dials.motion < 60
        ? "mix prose with a few headings and short lists"
        : "respond as a sequence of clear steps with headings and bullets";

  const densityNote =
    dials.density < 30
      ? "leave whitespace; one short sentence per paragraph"
      : dials.density < 60
        ? "one idea per short paragraph; trim filler"
        : "compress tightly; technical prose with back-to-back facts";

  return [
    `Style hint: variance=${dials.variance}, motion=${dials.motion}, density=${dials.density}.`,
    `- variance=${dials.variance}: ${varianceNote}.`,
    `- motion=${dials.motion}: ${motionNote}.`,
    `- density=${dials.density}: ${densityNote}.`,
  ].join("\n");
}

/** Test-only helper: re-export the dial key list. */
export const DESIGN_DIAL_KEYS: readonly (keyof DesignDials)[] = ALL_KEYS;
