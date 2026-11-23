#!/usr/bin/env node
// scripts/check-skill-counts.cjs
//
// Walks every prose .md file under the repo and asserts that any skill
// count it states is *currently true*.
//
// Ground truth, computed from the tree:
//   TOTAL     every directory under .agents/skills/ with a SKILL.md  (48)
//   UPSTREAM  those whose frontmatter carries `source:`              (35)
//   REPOS     distinct upstream repositories those name               (8)
//
// History, because this contract has already been changed once and the
// reason matters. The prose here has always conflated the
// upstream-adapted count with the total. The first fix banned every
// hard-coded number and mandated three placeholder tokens instead,
// assuming something would substitute them before a human read the file.
// Nothing ever did. GitHub renders repository markdown directly and shows
// no templating, so the published README literally read
// "{{SKILLS_TOTAL}} skills" — a banned number that is correct everywhere
// beats a token that is wrong where it is read.
//
// So the contract is now the honest one: numbers may appear, but each must
// equal the truth above. Drift on the next skill-add is still caught, and
// the file still renders.
//
// Excludes:
//   - node_modules, .git
//   - .review-extras (PDF build artifacts, not user-facing prose)
//   - docs/archive (versioned historical snapshots that must
//     remain correct for their era; do not rewrite history)
//   - changelogs/ (each entry records what a release said at the time;
//     rewriting it would falsify history, and one entry quotes a
//     placeholder by name)
//   - docs/plans/ (dated planning documents, same reasoning)
//   - .agents/ (skill metadata, not prose)
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

// ---- ground truth, computed from the tree itself ----------------------
const root = process.cwd();
const skillsDir = path.join(root, ".agents", "skills");

function computeTruth() {
  let total = 0;
  let upstream = 0;
  const repos = new Set();
  let entries;
  try {
    entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillMd = path.join(skillsDir, entry.name, "SKILL.md");
    if (!fs.existsSync(skillMd)) continue;
    total += 1;
    const text = fs.readFileSync(skillMd, "utf-8");
    // `source:` sits under `metadata:`, so anchor the line and use
    // [ \t] rather than \s — \s would let the match cross a newline.
    const m = text.match(/^[ \t]*source:[ \t]*(\S+)/m);
    if (m) {
      upstream += 1;
      repos.add(
        m[1].replace(/^https?:\/\/github\.com\//i, "").replace(/\/+$/, ""),
      );
    }
  }
  return { total, upstream, repos: repos.size };
}

const truth = computeTruth();
if (truth === null) {
  console.error(
    `FAIL: cannot compute ground truth — ${skillsDir} is missing or unreadable.`,
  );
  process.exit(1);
}

const allowed = new Set([truth.total, truth.upstream, truth.repos]);
const truthText =
  `TOTAL=${truth.total} UPSTREAM=${truth.upstream} REPOS=${truth.repos}`;

// Matches a bare integer followed by `skill`/`skills`, with up to 4
// intervening words, so "48 first-class open-source skills" is caught
// without false-positiving on unrelated prose like "V2.10.55 brand pack".
// CJK equivalents are matched separately, accepting both the `个` and
// `项` measure words in Chinese — `项` is the ordinary classifier for a
// count of skills, and accepting only `个` let a wrong count sit in the
// handbook while this gate stayed green.
//
// The range is 34-59. Below 34 the number is almost always a named
// historical baseline ("23 existing skills, kept from the runtime
// integration", "the 20 V2.6 skills") — a subset with its own meaning,
// not a claim about the current ecosystem — and those must keep
// rendering as the numbers they are.
//
// The one exception is an explicit *bundled/desktop* claim, which is
// always about the asar and must equal TOTAL:
//   "28 desktop-bundled skills" was wrong for exactly this reason — the
//   shipped asar carries 48 — and the 34-59 range missed it because 28
//   falls below the floor. `reBundled` covers that shape across all
//   four languages so the floor cannot hide it again.
//
// Above 59 the ecosystem has outgrown this file's assumptions and the
// counts should be re-derived rather than patched.
const NUM = "(3[4-9]|[45]\\d)";
const NUM_ANY = "(\\d{1,3})";

const reEn = new RegExp(
  `\\b${NUM}\\b(?:\\s+\\S+){0,4}?\\s+(?:skill|skills)\\b`,
  "gi",
);
const reCjk = new RegExp(`${NUM}\\s*[个项]\\s*\\S{0,8}?\\s*技能`, "g");
const reJa = new RegExp(`${NUM}\\s*個?\\s*\\S{0,8}?\\s*スキル`, "g");
const reKo = new RegExp(`${NUM}\\s*개?\\s*\\S{0,8}?\\s*스킬`, "g");

// Bundled/desktop counts are TOTAL claims at any magnitude.
const reBundled = new RegExp(
  `\\b${NUM_ANY}\\b(?:\\s+\\S+){0,2}?\\s*(?:desktop-bundled|desktop-targeted|desktop|built-in|bundled)` +
    `\\s*(?:skills|スキル|스킬)` +
    `|${NUM_ANY}\\s*[个項项]\\s*(?:桌面内置|桌面內建|内置)技能` +
    `|${NUM_ANY}\\s*個のデスクトップ組み込みスキル` +
    `|${NUM_ANY}\\s*개의\\s*데스크톱\\s*내장\\s*스킬`,
  "gi",
);

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
    // Skip prompt reference files — they contain presentation deck
    // sizes (e.g. "20-40 attendees") that trip the skill-count regex.
    if (entry.isDirectory() && entry.name === "references") {
      continue;
    }
    // Changelogs and dated plans record what was true (or believed) when
    // they were written. Rewriting them would falsify history; one
    // changelog even quotes a placeholder by name. Only live docs are
    // checked.
    if (entry.isDirectory() && entry.name === "changelogs") {
      continue;
    }
    if (
      entry.isDirectory() &&
      entry.name === "plans" &&
      path.basename(dir) === "docs"
    ) {
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

const files = walk(root);

// Each distinct "measure word + noun" shape carries its own meaning, so
// the number a line may state depends on which it is:
//   "48 skills" / "48 个技能" / "48 スキル" / "48개 스킬"  → TOTAL
//   "35 upstream skills" (adjective between number and noun) → UPSTREAM
//   "8 repos"                                                  → REPOS
// Getting this wrong in either direction is what produced the two
// historical bugs (conflated 35-vs-48, and "49 skills from 8 repos").
const violations = [];
for (const f of files) {
  const text = fs.readFileSync(f, "utf-8");
  const matches = [];
  const addAll = (re) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      // reBundled can match with either capture group populated; take
      // whichever carries a number.
      const num = Number(m[2] ?? m[1]);
      if (!Number.isFinite(num)) continue;
      matches.push({ token: m[0], index: m.index, num, kind: "prose" });
    }
  };
  addAll(reEn);
  addAll(reCjk);
  addAll(reJa);
  addAll(reKo);
  // A bundled/desktop count is always a TOTAL claim, whatever its size.
  reBundled.lastIndex = 0;
  let bm;
  while ((bm = reBundled.exec(text)) !== null) {
    const num = Number(bm[2] ?? bm[1]);
    if (!Number.isFinite(num)) continue;
    matches.push({
      token: bm[0],
      index: bm.index,
      num,
      kind: "bundled",
    });
  }
  if (matches.length === 0) continue;

  const wrong = matches.filter((m) => {
    if (m.kind === "bundled") return m.num !== truth.total;
    // An adjective between the number and the noun ("35 first-class
    // open-source skills") marks the upstream-adapted subset; a bare
    // "N skills" is the total. Accept any true value so lines that
    // legitimately state the upstream count still pass.
    const gap = m.token
      .replace(/^\d+/, "")
      .replace(/(?:skill|skills|技能|スキル|스킬)$/gi, "");
    const hasAdjective = /\S/.test(gap) && !/^[\s个项個개]*$/.test(gap);
    const expected = hasAdjective ? truth.upstream : truth.total;
    return !(allowed.has(m.num) || m.num === expected);
  });

  if (wrong.length > 0) violations.push({ file: f, matches: wrong, text });
}

if (violations.length === 0) {
  console.log(`OK: every stated skill count is true (${truthText}).`);
  process.exit(0);
}

console.error(
  `FAIL: ${violations.length} file(s) state a skill count that is not true (${truthText}).`,
);
console.error(
  "Update the number, or derive it from the tree instead of writing it by hand.",
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
