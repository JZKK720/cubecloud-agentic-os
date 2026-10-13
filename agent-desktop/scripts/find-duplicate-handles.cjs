#!/usr/bin/env node
// One-off probe: find duplicate ipcMain.handle channel registrations.
const { readFileSync } = require("fs");
const { join } = require("path");

const src = readFileSync(join(__dirname, "..", "src", "main", "index.ts"), "utf8");
const lines = src.split("\n");
const seen = new Map();
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/ipcMain\.handle\(\s*"([a-z0-9-]+)"/);
  if (m) {
    const ch = m[1];
    if (!seen.has(ch)) seen.set(ch, []);
    seen.get(ch).push(i + 1);
  }
}
for (const [ch, lns] of seen) {
  if (lns.length > 1) console.log(`DUPLICATE ${ch}: lines ${lns.join(", ")}`);
}
console.log("total distinct:", seen.size);
