#!/usr/bin/env node
// scripts/skill-counts.cjs
//
// Counts the skills in `.agents/skills/` and reports both totals:
//   - `total`: every skill directory that ships a SKILL.md.
//   - `upstream`: of those, the count whose frontmatter has a
//     `metadata.source: org/repo` line.
//
// The two-number split matters because the prose docs in this repo
// have historically conflated them (e.g. "the 35 skills" was the
// upstream-adapted count while "the 48 skills" was the total). Every
// prose mention of a count was drifting on the next commit.
//
// The fix in this script pair is structural: never let prose carry
// the count. Instead, every prose mention uses a placeholder that
// the docs-check script (scripts/check-skill-counts.cjs) replaces
// with the live number at verify time. If the placeholder is missing
// or the number doesn't match, the check fails.
//
// Output is two lines on stdout:
//   total: <n>
//   upstream: <n>  repos: <n>
//
// Exit code: always 0. Use `node scripts/skill-counts.cjs --json`
// for machine-readable output.

const fs = require("fs");
const path = require("path");

const skillsDir = path.join(process.cwd(), ".agents", "skills");
if (!fs.existsSync(skillsDir)) {
  console.error(`skills dir not found: ${skillsDir}`);
  process.exit(2);
}

const entries = fs
  .readdirSync(skillsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((name) => name !== "node_modules")
  .sort();

let upstream = 0;
let total = 0;
const repos = new Set();
const byRepo = new Map();
const detail = [];

for (const name of entries) {
  total += 1;
  const f = path.join(skillsDir, name, "SKILL.md");
  if (!fs.existsSync(f)) {
    detail.push({ name, source: null });
    continue;
  }
  const text = fs.readFileSync(f, "utf-8");
  // Source is a `source:` line under the `metadata:` block. Match
  // anywhere on its own line; case-insensitive; either bare
  // `owner/repo` or `https://github.com/owner/repo`.
  const m = text.match(
    /^\s*source:\s*(?:https?:\/\/github\.com\/)?([^\/\s]+)\/([^\/\s]+)/im,
  );
  if (m) {
    const key = `${m[1]}/${m[2]}`;
    upstream += 1;
    repos.add(key);
    byRepo.set(key, (byRepo.get(key) || 0) + 1);
    detail.push({ name, source: key });
  } else {
    detail.push({ name, source: null });
  }
}

const json = process.argv.includes("--json");

if (json) {
  const payload = {
    total,
    upstream,
    repos: repos.size,
    byRepo: Object.fromEntries(
      [...byRepo.entries()].sort((a, b) => b[1] - a[1]),
    ),
    detail,
  };
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
} else {
  console.log(`total: ${total}`);
  console.log(`upstream: ${upstream}  repos: ${repos.size}`);
  console.log("---");
  for (const [repo, count] of [...byRepo.entries()].sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`  ${repo.padEnd(50)} ${count}`);
  }
}
