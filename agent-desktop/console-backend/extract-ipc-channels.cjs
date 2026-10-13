#!/usr/bin/env node
// Phase A — extract the IPC channel inventory from src/main/index.ts.
// Complements extract-route-map.cjs: that maps preload method → channel;
// this lists every channel the main process actually handles, so the
// generic bridge can report which channels have NO handler (the
// desktop-only families that retire with Electron).
//
// Output: console-backend/ipc-channels.txt (one channel per line)
//         + a summary to stdout.
//
// Run: node console-backend/extract-ipc-channels.cjs (from agent-desktop/)

const { readFileSync, writeFileSync } = require("fs");
const { join, dirname } = require("path");

const here = __dirname;
const src = readFileSync(join(here, "..", "src", "main", "index.ts"), "utf8");
// CRLF-safe split.
const lines = src.split("\n").map((l) => l.replace(/\r$/, ""));

const channels = new Set();
for (let i = 0; i < lines.length; i++) {
  // Same-line form: ipcMain.handle("channel", ...) / ipcMain.on("channel", ...)
  let m = lines[i].match(/ipcMain\.(handle|on)\("([a-z0-9-]+)"/);
  if (m) {
    channels.add(m[2]);
    continue;
  }
  // Multi-line form: ipcMain.handle(\n  "channel",   (same for ipcMain.on)
  if (/ipcMain\.(handle|on)\(\s*$/.test(lines[i].trim())) {
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const q = lines[j].match(/"([a-z0-9-]+)"/);
      if (q) {
        channels.add(q[1]);
        break;
      }
    }
  }
}

const sorted = [...channels].sort();
writeFileSync(join(here, "ipc-channels.txt"), sorted.join("\n") + "\n");

console.log(`ipcMain.handle channels: ${sorted.length}`);