/**
 * P0.5 — Raven runtime-registry consistency tests.
 *
 * Part of the workspace↔desktop control-console replan
 * (`docs/plans/2026-10-06-evermind-memory-harness-replan.md`, P0.5):
 * the runtime-registry snapshot for Raven must agree with the catalog
 * (`integrationStatus: "optional"`) — it previously hardcoded
 * `status: "planned"` / `available: false` and exposed no actions,
 * contradicting the catalog and leaving the Welcome lane able to attach
 * while the registry UI could never show it as usable.
 *
 * These tests are source-text based (same pattern as
 * `preload-api-surface.test.ts`): they read the registry module and
 * assert the Raven case returns an available snapshot with a
 * rescan-detection action, and that the catalog note no longer claims
 * the stale "v0.1.x" version pin without the WebUI distinction.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  RUNTIME_PROVIDER_CATALOG,
  getRuntimeProviderDefinition,
} from "../src/shared/runtime-orchestration";

const ROOT = join(__dirname, "..");
const registrySrc = readFileSync(
  join(ROOT, "src/main/runtime-registry.ts"),
  "utf-8",
);

/** Extract the `case "raven": { ... }` body from the registry switch. */
function extractRavenCase(src: string): string | null {
  const marker = src.indexOf('case "raven"');
  if (marker === -1) return null;
  return src.slice(marker, marker + 3_000);
}

describe("P0.5 — Raven registry consistency", () => {
  it("catalog keeps Raven as a supported optional runtime", () => {
    expect(
      RUNTIME_PROVIDER_CATALOG.some(
        (p) => p.id === "raven" && p.integrationStatus === "optional",
      ),
    ).toBe(true);
  });

  it("registry Raven case is not a 'planned'-only stub", () => {
    const raven = extractRavenCase(registrySrc);
    expect(raven).not.toBeNull();
    // The old stub hardcoded status:"planned" + available:false.
    // A detected-state ternary returning "ready" plus an unconditional
    // `available: true` documents the optional state.
    expect(raven).toMatch(/status:[^?"']*\?\s*"ready"\s*:\s*"available"/);
    expect(raven).toContain("available: true");
    // Contradiction guard: the case body must not statically return
    // a "planned" status literal anymore.
    expect(raven).not.toMatch(/status:\s*"planned"/);
  });

  it("registry Raven case exposes a scan/detect action", () => {
    const raven = extractRavenCase(registrySrc);
    expect(raven).not.toBeNull();
    expect(raven).toMatch(/id:\s*"scan-raven-gateway"/);
    expect(raven).toMatch(/kind:\s*"scan"/);
  });

  it("catalog note reflects the current Raven version reality", () => {
    const raven = getRuntimeProviderDefinition("raven");
    const notes = raven.notes.join(" ");
    // The stale "pre-alpha (v0.1.x)" pin is gone; upstream now
    // ships 0.2.x with a distinct WebUI port (18793) vs gateway (8855).
    expect(notes).not.toMatch(/v0\.1\.x/i);
    expect(notes).toMatch(/8855/);
    expect(notes).toMatch(/18793|WebUI/i);
  });
});