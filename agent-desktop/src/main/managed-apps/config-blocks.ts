// ManagedApp config-block isolation — Phase B rule 2.
//
// Each adapter owns exactly ONE block in `desktop.json`. The B1 bug
// class (workspace attach writing the gateway connection config)
// becomes unrepresentable: an adapter physically cannot reach another
// adapter's block because `readAppBlock`/`writeAppBlock` are the only
// accessors and they take the block name from the adapter's own
// `configSchema().block`.
//
// The existing modules already follow this convention informally
// (`everos.ts` reads/writes `root.everos`, `headroom.ts` reads/writes
// `root.headroom`); this module makes it the enforced contract and
// adds the cross-block-write ban the CI test checks.
//
// Cubecloud original work (2026). Distributed under the repo's dual
// license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import { readDesktopConfig, writeDesktopConfig } from "../config";

/** The canonical block names. A new adapter must add its block here
 *  (and only here) — the CI test asserts every adapter's
 *  `configSchema().block` is in this set. */
export const MANAGED_APP_CONFIG_BLOCKS = [
  "workspace",
  "everos",
  "headroom",
  "openviking",
  "weknora",
] as const;

export type ManagedAppConfigBlock = (typeof MANAGED_APP_CONFIG_BLOCKS)[number];

/** Read one adapter's block. Returns `{}` when absent. Never throws. */
export function readAppBlock<T>(block: ManagedAppConfigBlock): T | null {
  try {
    const root = readDesktopConfig();
    const value = root[block];
    if (value === undefined || value === null) return null;
    return value as T;
  } catch {
    return null;
  }
}

/** Merge-patch one adapter's block. Only the named block is touched —
 *  other keys in `desktop.json` (including the gateway connection
 *  config) are preserved verbatim. Never throws. */
export function writeAppBlock<T extends Record<string, unknown>>(
  block: ManagedAppConfigBlock,
  patch: Partial<T>,
): T | null {
  try {
    const root = readDesktopConfig();
    const current = (root[block] as Partial<T> | undefined) ?? {};
    const merged = { ...current, ...patch } as T;
    writeDesktopConfig({ ...root, [block]: merged });
    return merged;
  } catch {
    return null;
  }
}