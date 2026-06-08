import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  existsSync,
  readFileSync,
  mkdirSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";

import {
  DEFAULT_DESIGN_DIALS,
  getDesignDials,
  setDesignDials,
  designDialsToStyleHint,
} from "../src/main/design-dials";

const HOME = mkdtempSync(join(tmpdir(), "design-dials-test-"));

vi.mock("../src/main/utils", () => ({
  HERMES_HOME: "/tmp",
  profileHome: () => HOME,
  safeWriteFile: (filePath: string, content: string) => {
    mkdirSync(join(filePath, ".."), { recursive: true });
    writeFileSync(filePath, content, "utf-8");
  },
}));

describe("design-dials (Step 5: Welcome tone knobs)", () => {
  beforeEach(() => {
    if (existsSync(HOME)) {
      rmSync(HOME, { recursive: true, force: true });
    }
    mkdirSync(HOME, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(HOME)) {
      rmSync(HOME, { recursive: true, force: true });
    }
  });

  it("returns the documented defaults when the file is missing", () => {
    const d = getDesignDials();
    expect(d).toEqual(DEFAULT_DESIGN_DIALS);
    expect(d.variance).toBe(35);
    expect(d.motion).toBe(50);
    expect(d.density).toBe(55);
  });

  it("persists and reads back every dial", () => {
    setDesignDials({ variance: 12, motion: 88, density: 47 });
    const d = getDesignDials();
    expect(d).toEqual({ variance: 12, motion: 88, density: 47 });
  });

  it("clamps values into [0, 100] when persisting", () => {
    const written = setDesignDials({
      variance: -50,
      motion: 250,
      density: 33.7,
    });
    expect(written).toEqual({ variance: 0, motion: 100, density: 34 });
    // The on-disk file should reflect the clamped values, not the input.
    const raw = JSON.parse(
      readFileSync(join(HOME, "design-dials.json"), "utf-8"),
    );
    expect(raw).toEqual({ variance: 0, motion: 100, density: 34 });
  });

  it("preserves missing fields when partially updating", () => {
    setDesignDials({ variance: 20, motion: 30, density: 40 });
    const updated = setDesignDials({ motion: 99 });
    expect(updated).toEqual({ variance: 20, motion: 99, density: 40 });
  });

  it("falls back to defaults when the file is unreadable JSON", () => {
    writeFileSync(join(HOME, "design-dials.json"), "not-json", "utf-8");
    expect(getDesignDials()).toEqual(DEFAULT_DESIGN_DIALS);
  });

  it("falls back per-field when individual entries are not finite numbers", () => {
    writeFileSync(
      join(HOME, "design-dials.json"),
      JSON.stringify({ variance: "high", motion: NaN, density: -3 }),
      "utf-8",
    );
    const d = getDesignDials();
    // variance uses the default, motion uses the default,
    // density is clamped to 0.
    expect(d.variance).toBe(DEFAULT_DESIGN_DIALS.variance);
    expect(d.motion).toBe(DEFAULT_DESIGN_DIALS.motion);
    expect(d.density).toBe(0);
  });

  it("designDialsToStyleHint mentions each dial and a phrasing hint", () => {
    const hint = designDialsToStyleHint({
      variance: 10,
      motion: 50,
      density: 90,
    });
    expect(hint).toMatch(/variance=10/);
    expect(hint).toMatch(/motion=50/);
    expect(hint).toMatch(/density=90/);
    // low variance -> "literal"
    expect(hint).toMatch(/literal/i);
    // high density -> "compress" or similar
    expect(hint).toMatch(/compress/i);
  });

  it("designDialsToStyleHint varies the prose per dial bucket", () => {
    const lowVar = designDialsToStyleHint({
      variance: 5,
      motion: 50,
      density: 50,
    });
    const highVar = designDialsToStyleHint({
      variance: 90,
      motion: 50,
      density: 50,
    });
    // The two extremes should mention different keywords, proving
    // we are not just stamping a single line.
    expect(lowVar).not.toBe(highVar);
    expect(lowVar).toMatch(/literal/i);
    expect(highVar).toMatch(/expressive|metaphor/i);
  });
});
