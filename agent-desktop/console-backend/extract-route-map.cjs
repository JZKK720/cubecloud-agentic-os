#!/usr/bin/env node
// Phase A (overhaul design §5) — extract the authoritative
// method→IPC-channel map from src/preload/index.ts.
//
// The preload bridge is the contract inventory: every renderer-visible
// method maps to exactly one ipcRenderer.invoke/send channel (or, for
// push listeners, an ipcRenderer.on channel). This parser is
// multi-line aware: a method's invoke call may sit on a later line
// than its name, so we scan method-block boundaries (2-space-indent
// `name:` at the top level of the hermesAPI object) and take the
// FIRST invoke/send channel inside each block.
//
// Output: JSON { methods: [{name, channel, kind}], push: [channels] }
// written next to this script as generated-route-map.json.
//
// Run: node console-backend/extract-route-map.cjs (from agent-desktop/)

const { readFileSync, writeFileSync } = require("fs");
const { join, dirname } = require("path");

const here = __dirname;
const src = readFileSync(join(here, "..", "src", "preload", "index.ts"), "utf8");
// CRLF-safe: strip \r so $ anchors and endsWith() checks work.
const lines = src.split("\n").map((l) => l.replace(/\r$/, ""));

// 1. Find method-block starts: `  name: (` / `  name: async (` / `  name: function`
//    at exactly 2-space indent (top level of the contextBridge object).
const methodStarts = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^ {2}([a-zA-Z]\w*):\s*(\(|async|function)/);
  if (m) methodStarts.push({ name: m[1], line: i });
}

// 2. For each method block (start line → next start), find the first
//    invoke/send channel and any on() listeners. Brace-aware: track
//    the method's own brace depth so a nested callback's ipcRenderer.on
//    is attributed correctly, and scan the WHOLE block (multi-line
//    signatures put the invoke several lines below the name).
const methods = [];
for (let k = 0; k < methodStarts.length; k++) {
  const { name, line } = methodStarts[k];
  const end = k + 1 < methodStarts.length ? methodStarts[k + 1].line : lines.length;
  let channel = null;
  let kind = null;
  let depth = 0;
  let seenOpen = false;
  for (let i = line; i < end; i++) {
    for (const ch of lines[i]) {
      if (ch === "{" || ch === "(") { depth++; seenOpen = true; }
      else if (ch === "}" || ch === ")") depth--;
    }
    if (channel === null) {
      const inv = lines[i].match(/ipcRenderer\.(invoke|send)\("([a-z0-9-]+)"/);
      if (inv) {
        kind = inv[1];
        channel = inv[2];
      } else if (/ipcRenderer\.(invoke|send)\($/.test(lines[i].trim())) {
        // Multi-line invoke: `ipcRenderer.invoke(` ends the line and the
        // channel name sits on a following line as the first quoted
        // string. Scan forward within this method block only.
        const kindM = lines[i].includes(".invoke(") ? "invoke" : "send";
        for (let j = i + 1; j < end && channel === null; j++) {
          const q = lines[j].match(/"([a-z0-9-]+)"/);
          if (q) {
            kind = kindM;
            channel = q[1];
          }
        }
      } else if (lines[i].includes("ipcRenderer.on(")) {
        kind = "push";
        channel = (lines[i].match(/ipcRenderer\.on\("([a-z0-9-:]+)"/) ?? [])[1] ?? "unknown";
      }
    }
    // The method body ends at the member's trailing comma when depth
    // is back at 0 AND the line is a true member terminator: ends with
    // `),` or `},` (closing the call/object then the member), or is a
    // bare `",`/`},` string/object close. Multi-line signatures dip to
    // depth 0 at the `):` line WITHOUT a trailing comma, so requiring
    // the comma + closer shape avoids ending the block early.
    const trimmed = lines[i].trim();
    const memberEnd = depth <= 0 && /,$/.test(trimmed) && (trimmed.endsWith("),") || trimmed.endsWith("},") || trimmed.endsWith("],") || trimmed.endsWith("\","));
    if (seenOpen && memberEnd) break;
  }
  methods.push({ name, channel, kind: kind ?? "none" });
}

// 3. Push channels: ipcRenderer.on("...") across the whole file.
const push = new Set();
for (const line of lines) {
  const m = line.match(/ipcRenderer\.on\("([a-z0-9-:]+)"/);
  if (m) push.add(m[1]);
}

const withChannel = methods.filter((m) => m.channel !== null);
const without = methods.filter((m) => m.channel === null);

const out = {
  generatedAt: new Date().toISOString(),
  totals: {
    methods: methods.length,
    withChannel: withChannel.length,
    withoutChannel: without.length,
    pushChannels: push.size,
  },
  methods,
  pushChannels: [...push],
};

writeFileSync(join(here, "generated-route-map.json"), JSON.stringify(out, null, 2));

console.log(`methods=${methods.length} withChannel=${withChannel.length} without=${without.length} push=${push.size}`);
if (without.length > 0) {
  console.log("methods without a direct channel (inspect):");
  for (const m of without) console.log(`  ${m.name}`);
}
