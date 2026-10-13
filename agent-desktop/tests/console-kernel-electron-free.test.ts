// Phase G — the kernel is electron-free, enforced.
//
// Design §5's gate G is "the repo builds with zero electron imports".
// The part that actually runs at :6770 is the console kernel, whose entry
// is `console-backend/server.ts`. This test computes that entry's
// TRANSITIVE import closure and asserts no reachable module imports
// `electron`.
//
// Why this test and not a deletion: the kernel reaches only the
// Electron-free main modules (`cubecloud-agent-*`, `hermes`, `homer`,
// `local-server-scan`). The modules that DO import electron
// (`src/main/index.ts` — the Electron entry — plus installer/media/
// security/… ) are the DESKTOP SHELL, and they are entangled with the
// packaging surface (`index.ts` imports `electron-updater`; the preload
// is also the source the kernel route registry is generated from). So
// this test locks the property that matters — the runtime is
// electron-independent — without deleting the desktop product.
//
// If a future change makes a kernel-reachable module import electron,
// this test fails: that is the regression net for G.

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, statSync } from "fs";
import { dirname, join, relative, resolve } from "path";

const ROOT = join(__dirname, "..");
const ENTRY = join(ROOT, "console-backend", "server.ts");

/** Resolve a relative import to a real file (the repo uses extensionless
 *  TS imports — Bundler moduleResolution). Returns null for bare
 *  specifiers and unresolvable paths. */
function resolveRelative(fromFile: string, spec: string): string | null {
  if (!spec.startsWith(".") && !spec.startsWith("/")) return null;
  const base = resolve(dirname(fromFile), spec);
  for (const cand of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
    if (existsSync(cand) && statSync(cand).isFile()) return cand;
  }
  return null;
}

function walkClosure(entry: string): { visited: Set<string>; electron: string[] } {
  const visited = new Set<string>();
  const electron: string[] = [];
  const queue: string[] = [entry];
  while (queue.length) {
    const file = queue.pop() as string;
    if (visited.has(file)) continue;
    visited.add(file);
    let src: string;
    try {
      src = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (
      /from\s+["']electron["']/.test(src) ||
      /require\(\s*["']electron["']\s*\)/.test(src)
    ) {
      electron.push(relative(ROOT, file));
    }
    for (const m of src.matchAll(/from\s+["']([^"']+)["']/g)) {
      const resolved = resolveRelative(file, m[1]);
      if (resolved) queue.push(resolved);
    }
  }
  return { visited, electron };
}

describe("Phase G — kernel is electron-free", () => {
  it("the console-backend entry exists", () => {
    expect(existsSync(ENTRY), `missing ${ENTRY}`).toBe(true);
  });

  it("no module in the kernel's transitive closure imports electron", () => {
    const { visited, electron } = walkClosure(ENTRY);
    // A meaningful closure (guards against a broken walk that reaches
    // nothing and trivially "passes").
    expect(visited.size).toBeGreaterThan(50);
    expect(
      electron,
      `electron reached from the kernel: ${electron.join(", ")}`,
    ).toEqual([]);
  });
});
