#!/usr/bin/env node
// scripts/check-skill-counts.cjs
//
// Walks every .md file under the repo and asserts that no prose
// contains a hard-coded skill count. The only valid forms are the
// placeholder tokens:
//
//   {{SKILLS_TOTAL}}     total skills in .agents/skills/
//   {{SKILLS_UPSTREAM}}  upstream-adapted skills (have metadata.source:)
//   {{SKILLS_REPOS}}     distinct upstream repos
//
// Why this exists: the prose docs in this repo have historically
// conflated the upstream-adapted count (35) with the total count
// (48). Every prose mention drifted on the next skill-add. The
// structural fix is to make the prose carry a placeholder and have
// a CI step verify that no hard-coded number remains.
//
// Excludes:
//   - node_modules, .git
//   - .review-extras (PDF build artifacts, not user-facing prose)
//   - docs/archive (versioned historical snapshots that must
//     remain correct for their era; do not rewrite history)
//
// Exit code: 0 if clean, 1 with a list of violations otherwise.

const fs = require("fs");
const path = require("path");

// Force UTF-8 output so CJK matches in violation reports render
// correctly in non-UTF-8 PowerShell hosts (the default codepage
// is cp936/cp1252, which mangles 技能 / スキル / 스킬).
// Only affects what we write to stdout/stderr; file reads below
// are byte-faithful either way.
try {
  process.stdout.setDefaultEncoding("utf8");
  process.stderr.setDefaultEncoding("utf8");
} catch {
  // Older Node (< 0.11) — no-op. We require Node 22 in CI.
}

const validTokens = [
  "{{SKILLS_TOTAL}}",
  "{{SKILLS_UPSTREAM}}",
  "{{SKILLS_REPOS}}",
];

// Matches a bare integer (34-48 to catch every drift we've seen)
// followed by `skill` or `skills`, with up to 4 intervening words.
// The "up to 4 words" form catches the prose style "34 first-class
// open-source skills" without false-positiving on unrelated prose
// like "V2.10.55 brand pack". CJK equivalents for the JA/KO/ZH
// translations are matched separately below.
//
// 49+ is excluded deliberately: by the time the count reaches 50+
// the drift problem is solved by a rewrite, not a token swap.
const reEn =
  /\b(3[4-9]|4[0-8])\b(?:\s+\S+){0,4}?\s+(?:skill|skills)\b/gi;
const reCjk = /(3[4-9]|4[0-8])\s*个?\s*技能/g;
const reJa = /(3[4-9]|4[0-8])\s*個?\s*スキル/g;
const reKo = /(3[4-9]|4[0-8])\s*개?\s*스킬/g;

const skipDirs = new Set([
  "node_modules",
  ".git",
  ".review-extras",
]);

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    // Skip hidden dirs except .github (workflow files are .yml,
    // not .md, so this only really matters for the .agents/skills
    // .md metadata if it appears, which it doesn't).
    if (entry.name.startsWith(".") && entry.name !== ".github") {
      if (entry.isDirectory()) continue;
    }
    // Skip the versioned archive tree — those files are historical
    // snapshots that must remain accurate to their version.
    if (entry.isDirectory() && entry.name === "archive") {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue;
      walk(full, out);
    } else if (entry.isFile() && full.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

const root = process.cwd();
const files = walk(root);

const violations = [];
for (const f of files) {
  const text = fs.readFileSync(f, "utf-8");
  const matches = [];
  const addAll = (re) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      matches.push({ token: m[0], index: m.index });
    }
  };
  addAll(reEn);
  addAll(reCjk);
  addAll(reJa);
  addAll(reKo);
  if (matches.length === 0) continue;
  violations.push({ file: f, matches, text });
}

if (violations.length === 0) {
  console.log("OK: no hard-coded skill counts in prose.");
  process.exit(0);
}

console.error(
  `FAIL: ${violations.length} file(s) contain hard-coded skill counts.`,
);
console.error(
  "Replace each occurrence with one of: " + validTokens.join(", "),
);
for (const v of violations) {
  console.error(`  ${v.file.replace(root + path.sep, "")}`);
  for (const m of v.matches) {
    const lineNo = v.text.substring(0, m.index).split("\n").length;
    const start = Math.max(0, m.index - 30);
    const end = Math.min(v.text.length, m.index + m.token.length + 30);
    const snippet = v.text
      .substring(start, end)
      .replace(/\n/g, " ")
      .trim();
    console.error(`    line ${lineNo}: ${m.token}  …  ${snippet}`);
  }
}
process.exit(1);
