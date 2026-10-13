#!/usr/bin/env node
// Phase A — extract the generic-bridge dispatch table from src/main/index.ts.
//
// For every ipcMain.handle("channel", ...) registration inside setupIPC(),
// classify the handler body so the console kernel can register a capability
// for it without hand-writing 292 entries:
//
//   delegate     — body calls exactly ONE imported main-module function;
//                  the kernel calls that function directly with the args
//                  array. `sshDegrade: true` when the body branches on
//                  conn.mode === "ssh" (container era = local path only).
//   desktopOnly  — body touches an Electron-only API (dialog, shell,
//                  clipboard, Menu, Notification, app, BrowserWindow,
//                  webContents, autoUpdater). Registers a stable degraded
//                  shape instead of a live call.
//   manual       — anything else (multi-function bodies, inline logic,
//                  push-emitting streams). Hand-mapped in generic-bridge.ts.
//
// Output: console-backend/dispatch-table.json + summary to stdout.
//
// Run: node console-backend/extract-dispatch-table.cjs (from agent-desktop/)

const { readFileSync, writeFileSync } = require("fs");
const { join, dirname } = require("path");

const here = __dirname;
const src = readFileSync(join(here, "..", "src", "main", "index.ts"), "utf8");
const lines = src.split("\n").map((l) => l.replace(/\r$/, ""));

// ── 1. Import map: imported identifier → module specifier ──────────────
// Handles both `import { a, b as c } from "./mod";` and the multi-line
// form. `type` imports are skipped (no runtime binding). Only RELATIVE
// specifiers (./ ../) are recorded — node builtins (fs/promises, path)
// must not enter the delegate classification, or inline index.ts logic
// that merely calls readdir/readFile would be misclassified as a
// delegate to the builtin.
const importMap = new Map(); // localName -> specifier
{
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const single = line.match(/^import\s*\{([^}]*)\}\s*from\s*"([^"]+)"/);
    if (single && single[2].startsWith(".")) {
      for (const raw of single[1].split(",")) {
        const part = raw.trim();
        if (!part || part.startsWith("type ")) continue;
        const asMatch = part.match(/^(\w+)\s+as\s+(\w+)$/);
        const local = asMatch ? asMatch[2] : part;
        importMap.set(local, single[2]);
      }
      i++;
      continue;
    }
    if (single) { i++; continue; } // bare/builtin specifier — skip
    if (/^import\s*\{/.test(line)) {
      // Multi-line block: collect until the closing `} from "spec";`
      let block = "";
      let j = i;
      for (; j < lines.length; j++) {
        block += lines[j] + "\n";
        if (/}\s*from\s*"([^"]+)"/.test(lines[j])) break;
      }
      const specMatch = block.match(/}\s*from\s*"([^"]+)"/);
      if (specMatch && specMatch[1].startsWith(".")) {
        const inner = block.slice(block.indexOf("{") + 1, block.lastIndexOf("}"));
        for (const raw of inner.split(",")) {
          const part = raw.trim();
          if (!part || part.startsWith("type ")) continue;
          const asMatch = part.match(/^(\w+)\s+as\s+(\w+)$/);
          const local = asMatch ? asMatch[2] : part;
          if (/^\w+$/.test(local)) importMap.set(local, specMatch[1]);
        }
      }
      i = j + 1;
      continue;
    }
    i++;
  }
}

// ── 2. Walk ipcMain.handle( occurrences ────────────────────────────────
const ELECTRON_MARKERS = [
  "dialog.", "shell.", "clipboard.", "Menu.", "new Notification", "app.",
  "BrowserWindow", "webContents", "autoUpdater", "event.sender",
];

const text = lines.join("\n");
const entries = [];
let cursor = 0;
const OPEN_RE = /ipcMain\.handle\(/g;

while (true) {
  const m = OPEN_RE.exec(text);
  if (!m) break;
  const start = m.index + m[0].length;

  // Channel: same-line quote or the next quoted token (multi-line form).
  let channel = null;
  const sameLine = text.slice(start, text.indexOf("\n", start)).match(/"([a-z0-9-]+)"/);
  if (sameLine) {
    channel = sameLine[1];
  } else {
    const after = text.slice(start, start + 200).match(/"([a-z0-9-]+)"/);
    if (after) channel = after[1];
  }
  if (!channel) continue; // not a string-literal channel (none expected)

  // Body: balanced-bracket scan from the opening paren. Fail-safe: if
  // depth does not close within 500 lines, mark manual and resync.
  let depth = 1;
  let i = start;
  let bodyEnd = -1;
  const limit = text.indexOf("ipcMain.handle(", start + 10);
  const hardStop = limit === -1 ? text.length : limit;
  while (i < hardStop && i < start + 30000) {
    const ch = text[i];
    if (ch === "(" || ch === "{" || ch === "[") depth++;
    else if (ch === ")" || ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) { bodyEnd = i; break; }
    }
    i++;
  }
  if (bodyEnd === -1) {
    entries.push({ channel, kind: "manual", reason: "unparseable body" });
    continue;
  }
  const body = text.slice(start, bodyEnd);

  // ── Classification ──
  const isElectron = ELECTRON_MARKERS.some((k) => body.includes(k));
  const pushEmits = [...body.matchAll(/\.send\("([a-z0-9-]+)"/g)].map((x) => x[1]);
  const isSsh = body.includes('conn.mode === "ssh"');

  // Imported functions called in the body (word-boundary + open paren),
  // excluding ssh* helpers and local (non-imported) helpers.
  const called = new Set();
  for (const match of body.matchAll(/(?<![\w.])([a-zA-Z]\w*)\s*\(/g)) {
    const name = match[1];
    if (name === "ipcMain" || name === "if" || name === "for" || name === "while" ||
        name === "switch" || name === "catch" || name === "function" || name === "return") continue;
    if (name.startsWith("ssh")) continue;
    if (importMap.has(name)) called.add(name);
  }

  let kind;
  if (isElectron && pushEmits.length === 0) {
    kind = "desktopOnly";
  } else if (pushEmits.length > 0) {
    kind = "manual"; // push-emitting streams (chat, install progress, oauth)
  } else if (called.size === 1) {
    kind = "delegate";
  } else if (
    isSsh &&
    called.has("getConnectionConfig") &&
    called.size === 2
  ) {
    // Uniform SSH pattern: `const conn = getConnectionConfig();
    // if (conn.mode === "ssh") return sshX(...); return x(...)`.
    // Container era = local-only: the kernel takes the local path,
    // so this is a delegate to the one real function.
    kind = "delegate";
  } else if (isElectron) {
    kind = "desktopOnly";
  } else {
    kind = "manual";
  }

  const entry = { channel, kind };
  if (kind === "delegate") {
    const real = [...called].filter((n) => n !== "getConnectionConfig");
    const fn = real[0] ?? [...called][0];
    entry.fn = fn;
    entry.module = importMap.get(fn);
    entry.sshDegrade = isSsh;
  } else if (kind === "desktopOnly") {
    entry.reason = ELECTRON_MARKERS.filter((k) => body.includes(k)).join(", ");
  } else if (kind === "manual") {
    entry.calledFns = [...called];
    if (pushEmits.length) entry.pushEmits = pushEmits;
    if (isSsh) entry.sshBranch = true;
  }
  entries.push(entry);
}

// ── 3. Report ───────────────────────────────────────────────────────────
const byKind = { delegate: 0, desktopOnly: 0, manual: 0 };
for (const e of entries) byKind[e.kind]++;

const out = {
  generatedAt: new Date().toISOString(),
  totals: { handlers: entries.length, ...byKind },
  entries,
};
writeFileSync(join(here, "dispatch-table.json"), JSON.stringify(out, null, 2));

console.log(`ipcMain.handle handlers parsed: ${entries.length}`);
console.log(`  delegate:    ${byKind.delegate} (kernel calls the module fn directly)`);
console.log(`  desktopOnly: ${byKind.desktopOnly} (Electron API — degraded shape)`);
console.log(`  manual:      ${byKind.manual} (hand-mapped in generic-bridge.ts)`);
console.log(`import map: ${importMap.size} identifiers from main modules`);
if (byKind.manual > 0) {
  console.log("manual channels:");
  for (const e of entries) {
    if (e.kind === "manual") {
      console.log(`  ${e.channel}${e.pushEmits ? " [push: " + e.pushEmits.join(",") + "]" : ""}${e.calledFns?.length ? " fns: " + e.calledFns.join(",") : ""}`);
    }
  }
}
