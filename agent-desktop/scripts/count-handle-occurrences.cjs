#!/usr/bin/env node
// One-off probe: break down ipcMain.handle occurrences in src/main/index.ts.
const { readFileSync } = require("fs");
const { join } = require("path");

const src = readFileSync(join(__dirname, "..", "src", "main", "index.ts"), "utf8");
const total = [...src.matchAll(/ipcMain\.handle\(/g)].length;
const sameLine = [...src.matchAll(/ipcMain\.handle\(\s*"([a-z0-9-]+)"/g)].map(
  (m) => m[1],
);
console.log("total ipcMain.handle occurrences:", total);
console.log("same-line with channel:", sameLine.length);
console.log("distinct same-line channels:", new Set(sameLine).size);
