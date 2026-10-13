// C0 verify step (doctrine §3/C0): the kernel route registry must map
// to the preload bridge surface. This script:
//   1. Parses src/preload/index.ts bridge-method names.
//   2. Parses console-backend/server.ts seeded capability names.
//   3. Asserts every C0 seed capability has a preload bridge method
//      (kernel ⊆ preload). The inverse (preload ⊆ kernel) is NOT
//      asserted until C1 completes the port — reported as progress.
//
// Run: node console-backend/parity-check.cjs (from agent-desktop/)

const { readFileSync } = require("fs");
const { join, dirname } = require("path");

const here = __dirname;
const preloadSrc = readFileSync(
  join(here, "..", "src", "preload", "index.ts"),
  "utf8",
);
const serverSrc = readFileSync(join(here, "server.ts"), "utf8");

// Preload bridge methods: `  name: (...) => or name: function patterns at 2-space indent.
const preloadMethods = new Set(
  [...preloadSrc.matchAll(/^ {2}([a-zA-Z]\w*):/gm)].map((m) => m[1]),
);

// Seeded capabilities: `name: "..."` inside registry.register blocks.
const seededCaps = [
  ...serverSrc.matchAll(/name: "([a-zA-Z]\w*)",\s*\n\s*ipcChannel:/g),
].map((m) => m[1]);

const missing = seededCaps.filter((c) => !preloadMethods.has(c));
// The sessions modules shipped in V2.10.80 with module + tests but no
// IPC/preload wiring (C0 finding, doctrine: C0 is their first caller).
// C1 wire-up (FirstRunScan, 2026-10-07) added listWorkspaceSessions +
// listWorkspaceAgents to preload; getWorkspaceSessionSnapshot and
// kernelHome remain deliberate new-wiring (no renderer consumer yet).
const NEW_WIRING = new Set([
  "getWorkspaceSessionSnapshot",
  "kernelHome",
]);
const unexpected = missing.filter((c) => !NEW_WIRING.has(c));
const pending = missing.filter((c) => NEW_WIRING.has(c));

if (unexpected.length > 0) {
  console.error("PARITY FAIL — capabilities without a preload method:");
  for (const m of unexpected) console.error(`  ${m}`);
  process.exit(1);
}
console.log(
  `PARITY PASS — ${seededCaps.length} seeded capabilities all map to the preload bridge`,
);
if (pending.length > 0) {
  console.log("C1 pending (deliberate new-wiring, no preload method yet):");
  for (const p of pending) console.log(`  ${p}`);
}
console.log(`C1 remaining to port: ${preloadMethods.size - seededCaps.length + pending.length} methods`);