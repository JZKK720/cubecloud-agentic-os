// resolve-ts-loader.mjs — Node 24 loader for the console-backend kernel.
//
// Problem: the kernel boots with `node --experimental-strip-types` (no
// build step, C0 finding), but Node's native ESM resolver needs explicit
// `.ts` extensions in relative imports, while the repo's 25+ modules use
// the TypeScript-Bundler-conventional extensionless specifiers
// (`./homer`, `../src/main/cubecloud-agent-probe`, …).
//
// This loader rewrites bare relative/absolute specifiers ending with no
// extension to the `.ts` sibling (or `.ts/index.ts` for directories), so
// the existing sources boot unmodified. It only rewrites specifiers that
// resolve inside agent-desktop/src — never bare package names.

import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const TS_EXT_RE = /\.(ts|tsx|js|mjs|cjs|json)$/i;

// The kernel's electron stub: main modules that import electron at
// runtime (installer.ts, media.ts, runtime-provider-actions.ts) load
// with degraded native APIs instead of crashing the kernel boot.
const ELECTRON_STUB = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "electron-stub.ts",
);

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "electron") {
    return nextResolve(pathToFileURL(ELECTRON_STUB).href, context);
  }
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
    const parentPath = context.parentURL ? fileURLToPath(context.parentURL) : process.cwd();
    const candidates = [];
    if (isRelative || path.isAbsolute(specifier)) {
      const base = path.resolve(path.dirname(parentPath), specifier);
      candidates.push(`${base}.ts`, path.join(base, "index.ts"));
    }
    for (const candidate of candidates) {
      if (TS_EXT_RE.test(candidate) && existsSync(candidate)) {
        return nextResolve(pathToFileURL(candidate).href, context);
      }
    }
    throw err;
  }
}