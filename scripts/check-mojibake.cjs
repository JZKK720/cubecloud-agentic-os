// scripts/check-mojibake.cjs
// Scan source files (md, ts, tsx, js, cjs) for U+FFFD (replacement char)
// and the most common Latin-1-substituted-UTF-8 mojibake markers.
//
// Walks the repo from CWD, skipping node_modules, .git, dist, out,
// previews, docs/archive. Force-UTF-8 to avoid the Windows mojibake
// inverse problem (a mojibake file scanned as CP1252 reads as garbled
// but is actually valid UTF-8).
//
// Usage: node scripts/check-mojibake.cjs
// Exit: 0 if clean, 1 if mojibake is found.

const fs = require('fs');
const path = require('path');

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'out',
  'previews',
  'docs-archive',
  '.next',
  'coverage',
  'release',
  'release-files',
  'node_modules-cache',
  '.agents-cache',
]);
const SKIP_FILES = new Set([
  // the checker itself contains the CP1252 marker strings intentionally
  path.join('scripts', 'check-mojibake.cjs'),
  // the drift report quotes CP1252 markers as illustrative examples
  path.join('docs', 'i18n', 'EN-ZH-DRIFT-REPORT.md'),
]);
const EXTS = new Set(['.md', '.ts', '.tsx', '.js', '.cjs', '.mjs', '.json']);

const CP1252_MARKERS = [
  'â€', 'â€™', 'â€œ', 'â€',
  'Ã©', 'Ã¨', 'Ã¢', 'Ã±',
  'Â·', 'Â ',
  'â€¢', '锘縜',
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(p, out);
    } else if (EXTS.has(path.extname(entry.name))) {
      out.push(p);
    }
  }
  return out;
}

const FFFD = '\uFFFD';
let scanned = 0;
let badCount = 0;
const bad = [];

for (const file of walk(process.cwd())) {
  scanned++;
  const rel = file.replace(process.cwd() + path.sep, '');
  if (SKIP_FILES.has(rel)) continue;
  const raw = fs.readFileSync(file, 'utf8');
  const fffd = (raw.match(new RegExp(FFFD, 'g')) || []).length;
  let cp1252 = 0;
  for (const m of CP1252_MARKERS) {
    if (raw.includes(m)) { cp1252 = 1; break; }
  }
  if (fffd > 0 || cp1252 > 0) {
    bad.push({ file: file.replace(process.cwd() + path.sep, ''), fffd, cp1252 });
    badCount++;
  }
}

process.stdout.write(`scanned ${scanned} files\n`);
if (badCount === 0) {
  process.stdout.write(`✅ NO mojibake found in any source file\n`);
  process.exit(0);
}

process.stdout.write(`❌ ${badCount} files have mojibake:\n`);
for (const b of bad.sort((a, b) => b.fffd - a.fffd)) {
  process.stdout.write(`  ${b.file}  FFFD=${b.fffd}  CP1252=${b.cp1252}\n`);
}
process.exit(1);
