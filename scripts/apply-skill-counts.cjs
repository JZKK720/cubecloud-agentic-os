#!/usr/bin/env node
// scripts/apply-skill-counts.cjs
//
// Replaces the {{SKILLS_*}} placeholders in prose docs with the real,
// currently-correct numbers.
//
// Why this exists: `check-skill-counts.cjs` banned hard-coded counts and
// mandated these placeholders, on the assumption that something would
// substitute them before a human read the file. Nothing ever did. The
// placeholders were committed verbatim, so GitHub — and the release
// PDF — rendered the literal string "{{SKILLS_TOTAL}} skills" to
// readers. A banned number that is correct everywhere beats a token
// that is wrong where it is read.
//
// The durable guarantee moves to the gate: instead of "no number may
// appear", it becomes "any number that appears must be currently true".
// That still catches drift on the next skill-add, and it renders.
//
// Scope: user-facing and reference prose. Historically-scoped trees are
// excluded on purpose —
//   - agent-desktop/changelogs/  records what a release said at the
//     time; rewriting it would falsify history, and one entry quotes
//     the placeholder by name, which substitution would corrupt.
//   - docs/plans/  dated planning documents, same reasoning.
//   - docs/archive/  versioned snapshots.
//   - .agents/skills/  skill metadata, not prose.
//
// Usage:
//   node scripts/apply-skill-counts.cjs --check   # report, no writes
//   node scripts/apply-skill-counts.cjs           # rewrite

const fs = require("fs");
const path = require("path");

try {
  process.stdout.setDefaultEncoding("utf8");
} catch {
  // Node < 0.11 — no-op.
}

const root = process.cwd();

// ---- ground truth -------------------------------------------------------
// Total = every skill directory with a SKILL.md.
// Upstream = those whose frontmatter carries `source:` (adapted from an
// upstream repo). Repos = the distinct upstream repositories those name.
const skillsDir = path.join(root, ".agents", "skills");
let total = 0;
let upstream = 0;
const repos = new Set();
for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const skillMd = path.join(skillsDir, entry.name, "SKILL.md");
  if (!fs.existsSync(skillMd)) continue;
  total += 1;
  const text = fs.readFileSync(skillMd, "utf-8");
  // `source:` sits under `metadata:`, so anchor on the line, not the
  // string, and keep the pattern newline-safe ([ \t], never \s).
  const m = text.match(/^[ \t]*source:[ \t]*(\S+)/m);
  if (m) {
    upstream += 1;
    repos.add(m[1].replace(/^https?:\/\/github\.com\//i, "").replace(/\/+$/, ""));
  }
}

const counts = {
  "{{SKILLS_TOTAL}}": total,
  "{{SKILLS_UPSTREAM}}": upstream,
  "{{SKILLS_REPOS}}": repos.size,
};

// ---- which files ------------------------------------------------------
const skipDirs = new Set([
  "node_modules",
  ".git",
  ".review-extras",
  ".agents",
]);

function isExcluded(rel) {
  const norm = rel.split(path.sep).join("/");
  if (norm.startsWith("agent-desktop/changelogs/")) return true;
  if (norm.startsWith("agent-desktop/changelogs")) return true;
  if (norm.startsWith("changelogs/")) return true;
  if (norm.startsWith("docs/plans/")) return true;
  if (norm.startsWith("docs/archive/")) return true;
  return false;
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
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

const checkOnly = process.argv.includes("--check");
const files = walk(root);

let changedFiles = 0;
let changedOccurrences = 0;

// Byte-faithful: read and write UTF-8 strings, never through a shell
// codepage, so CJK content survives untouched.
for (const file of files) {
  const rel = path.relative(root, file);
  if (isExcluded(rel)) continue;
  const before = fs.readFileSync(file, "utf-8");
  if (!/\{\{SKILLS_(TOTAL|UPSTREAM|REPOS)\}\}/.test(before)) continue;

  let after = before;
  let occurrences = 0;
  for (const [token, value] of Object.entries(counts)) {
    const parts = after.split(token);
    if (parts.length > 1) {
      occurrences += parts.length - 1;
      after = parts.join(String(value));
    }
  }
  if (after === before) continue;

  changedFiles += 1;
  changedOccurrences += occurrences;
  if (checkOnly) {
    console.log(`  would rewrite ${rel}  (${occurrences} token(s))`);
  } else {
    fs.writeFileSync(file, after, "utf-8");
    console.log(`  rewrote ${rel}  (${occurrences} token(s))`);
  }
}

console.log(
  `${checkOnly ? "Would rewrite" : "Rewrote"} ${changedOccurrences} token(s) in ${changedFiles} file(s).`,
);
console.log(
  `Truth: ${counts["{{SKILLS_TOTAL}}"]} total, ${counts["{{SKILLS_UPSTREAM}}"]} upstream-adapted, ${counts["{{SKILLS_REPOS}}"]} repos.`,
);

if (checkOnly && changedFiles > 0) process.exit(1);
