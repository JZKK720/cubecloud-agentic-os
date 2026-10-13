#!/usr/bin/env node
// One-off probe: count distinct webContents.send channels in src/main/index.ts.
const { readFileSync } = require("fs");
const { join, dirname } = require("path");

const here = __dirname;
const src = readFileSync(join(here, "..", "src", "main", "index.ts"), "utf8");
const sends = [...src.matchAll(/webContents\.send\(\s*"([a-z0-9-:]+)"/g)].map(
  (m) => m[1],
);
console.log("webContents.send occurrences:", sends.length);
console.log("distinct channels:", new Set(sends).size);
console.log([...new Set(sends)].sort().join("\n"));
