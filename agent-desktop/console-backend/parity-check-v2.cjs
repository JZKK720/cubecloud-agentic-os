// Phase A verify step: full bidirectional parity between the preload
// bridge surface and the kernel route registry.
//
//   kernel ⊆ preload — every registered capability name must exist as
//     a preload bridge method (catches typos in channelToName).
//   preload ⊆ kernel — every preload invoke method must have a kernel
//     capability (the C1 goal, now enforced). getPathForFile is the
//     documented exclusion (webUtils direct call, no IPC channel).
//
// Inputs: generated-route-map.json (method → channel, from preload)
//         dispatch-table.json (channel → kind, from main/index.ts)
//         server.ts + generic-bridge.ts (registered capability names)
//
// Run: node console-backend/parity-check.cjs (from agent-desktop/)

const { readFileSync } = require("fs");
const { join, dirname } = require("path");

const here = __dirname;
const map = JSON.parse(
  readFileSync(join(here, "generated-route-map.json"), "utf8"),
);
const table = JSON.parse(
  readFileSync(join(here, "dispatch-table.json"), "utf8"),
);
const serverSrc = readFileSync(join(here, "server.ts"), "utf8");
const bridgeSrc = readFileSync(join(here, "generic-bridge.ts"), "utf8");
const governanceSrc = readFileSync(join(here, "governance-seed.ts"), "utf8");

// Preload invoke methods (kind !== push), keyed by capability name.
const EXPECTED_UNCOVERED = new Set(["getPathForFile"]);
// Deliberate new-wiring: kernel capabilities with no preload method
// (the sessions modules shipped in V2.10.80 with module + tests but
// no IPC/preload wiring; kernelHome is kernel-self-describing).
const NEW_WIRING = new Set([
  "listWorkspaceSessions",
  "getWorkspaceSessionSnapshot",
  "listWorkspaceAgents",
  "kernelHome",
]);
// Send-channel methods: ipcMain.on registrations (no invoke return).
// The kernel registers them as capabilities with a stable ack shape.
const SEND_ONLY = new Set(["showMediaMenu"]);
const preloadInvoke = new Map(); // capabilityName -> { name, channel }
for (const m of map.methods) {
  if (m.kind === "push") continue;
  if (EXPECTED_UNCOVERED.has(m.name)) continue;
  if (SEND_ONLY.has(m.name)) continue;
  const capName = m.channel
    ? m.channel.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
    : m.name;
  preloadInvoke.set(capName, m);
}

// Kernel-registered capability names: hand seeds (server.ts +
// governance-seed.ts `name: "..."` literals) + every channel the
// bridge registers (dispatch-table channels → camel names).
const kernelCaps = new Set();
for (const src of [serverSrc, governanceSrc]) {
  for (const m of src.matchAll(/name: "([a-zA-Z]\w*)",/g)) {
    kernelCaps.add(m[1]);
  }
}
for (const e of table.entries) {
  kernelCaps.add(
    e.channel.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()),
  );
}

// 1. kernel ⊆ preload
const orphans = [...kernelCaps]
  .filter((c) => !preloadInvoke.has(c))
  .filter((c) => !NEW_WIRING.has(c));
const pendingNewWiring = [...kernelCaps].filter((c) => NEW_WIRING.has(c));

// 2. preload ⊆ kernel
const missing = [...preloadInvoke.keys()].filter((c) => !kernelCaps.has(c));

let failed = false;
if (orphans.length > 0) {
  failed = true;
  console.error("PARITY FAIL — kernel capabilities without a preload method:");
  for (const o of orphans) console.error(`  ${o}`);
}
if (missing.length > 0) {
  failed = true;
  console.error("PARITY FAIL — preload methods without a kernel capability:");
  for (const m of missing) console.error(`  ${m}`);
}
if (failed) process.exit(1);

console.log(
  `PARITY PASS — ${kernelCaps.size} kernel capabilities ↔ ` +
    `${preloadInvoke.size} preload invoke methods (bidirectional)`,
);
if (pendingNewWiring.length > 0) {
  console.log(
    `deliberate new-wiring (kernel-only, no preload method yet): ${pendingNewWiring.join(", ")}`,
  );
}
console.log(
  `excluded by design: getPathForFile (webUtils direct call, no IPC channel)`,
);
console.log(`send-only (ipcMain.on, ack shape): showMediaMenu`);
console.log(`push channels ride SSE: ${map.totals.pushChannels}`);
