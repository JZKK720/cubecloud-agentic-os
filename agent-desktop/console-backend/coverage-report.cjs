#!/usr/bin/env node
// Phase A — coverage report: which preload methods have a main-process
// IPC handler, and which don't.
//
// Inputs:  generated-route-map.json (method → channel, from preload)
//          ipc-channels.txt (channels handled in main/index.ts)
// Output:  coverage report to stdout + coverage-report.json
//
// Run: node console-backend/coverage-report.cjs (from agent-desktop/)

const { readFileSync, writeFileSync } = require("fs");
const { join, dirname } = require("path");

const here = __dirname;
const map = JSON.parse(readFileSync(join(here, "generated-route-map.json"), "utf8"));
const channels = new Set(
  readFileSync(join(here, "ipc-channels.txt"), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean),
);

const covered = [];
const uncovered = [];
// Methods with no IPC channel by design — excluded from the uncovered set.
// getPathForFile calls webUtils.getPathForFile directly in preload (no
// main-process round-trip exists for it).
const EXPECTED_UNCOVERED = new Set(["getPathForFile"]);
for (const m of map.methods) {
  if (m.kind === "push") continue; // push channels ride SSE, not invoke
  if (EXPECTED_UNCOVERED.has(m.name)) continue;
  if (m.channel && channels.has(m.channel)) covered.push(m);
  else uncovered.push(m);
}

// Channels with no preload caller (main-only or legacy).
const calledChannels = new Set(map.methods.filter((m) => m.channel).map((m) => m.channel));
const orphanChannels = [...channels].filter((c) => !calledChannels.has(c)).sort();

const report = {
  generatedAt: new Date().toISOString(),
  totals: {
    preloadMethods: map.totals.methods,
    invokeMethods: covered.length + uncovered.length,
    coveredByHandler: covered.length,
    uncovered: uncovered.length,
    excludedByDesign: [...EXPECTED_UNCOVERED],
    pushChannels: map.totals.pushChannels,
    mainChannels: channels.size,
    orphanChannels: orphanChannels.length,
  },
  uncoveredMethods: uncovered.map((m) => ({ name: m.name, channel: m.channel })),
  orphanChannels,
};

writeFileSync(join(here, "coverage-report.json"), JSON.stringify(report, null, 2));

console.log(`preload invoke methods: ${report.totals.invokeMethods}`);
console.log(`  covered by main handler: ${covered.length}`);
console.log(`  UNCOVERED: ${uncovered.length}`);
for (const u of uncovered) console.log(`    ${u.name} -> ${u.channel ?? "(none)"}`);
console.log(`push channels: ${report.totals.pushChannels}`);
console.log(`main channels: ${channels.size} (orphans: ${orphanChannels.length})`);
if (orphanChannels.length) console.log(`  orphans: ${orphanChannels.join(", ")}`);