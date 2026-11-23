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
const EXTS = new Set(['.md', '.ts', '.tsx', '.js', '.cjs', '.mjs', '.json', '.css']);

const CP1252_MARKERS = [
  'â€', 'â€™', 'â€œ', 'â€',
  'Ã©', 'Ã¨', 'Ã¢', 'Ã±',
  'Â·', 'Â ',
  'â€¢', '锘縜',
];

// UTF-8 text decoded as GBK/cp936 and re-saved as UTF-8.
//
// This is a SECOND, distinct corruption from the CP1252 case above, and it
// is the one that actually shipped: 131 lines across 19 locale files,
// including pt-BR/pt-PT accent pairs (ó -> 贸) and whole zh-CN/zh-TW/ja
// memory strings. Every affected file was valid UTF-8 with zero U+FFFD,
// so the replacement-character scan above reported clean for months.
//
// Detection is by artefact. These codepoints are what you get when the
// UTF-8 bytes of common CJK text are read as cp936, so they do not occur
// in genuine Chinese/Japanese copy:
//   鍩 闀 鏈 鐨 鏄 浣 鍜 璁 锛 銆 锟 鏂 鎴 銉 銈 銇 銙 銝 鑳 鍚 鈥
// A hit inside a Latin-language file (贸 莽 铆) is the same bug seen through
// an accented letter, which is why the Latin locales are checked for any
// CJK at all.
//
// Only unambiguous artefacts belong here. Many CJK codepoints that appear
// when UTF-8 is misread as cp936 (门, 鐘, 分, 日) are also ordinary
// Chinese/Japanese and must NOT be listed, or correct copy fails the gate.
// The ones below are chosen because they essentially never occur in this
// repo's genuine copy.
const GBK_ARTEFACTS = [
  '\u9369', '\u95c0', '\u93c8', '\u93c4', '\u6d63',
  '\u935a', '\u8a01', '\u951b', '\u9409', '\u93a9', '\u93c9',
  '\u9365', '\u93c3',
];
const LATIN_LOCALES = new Set(['es', 'id', 'pt-BR', 'pt-PT']);
const ANY_CJK = /[\u3040-\u30ff\u4e00-\u9fff]/;

// Files that legitimately QUOTE the artefact characters, because their job
// is to document or repair this exact corruption. Detecting artefacts in
// them is correct behaviour that would block the repair tooling itself.
const GBK_EXEMPT = new Set([
  'BRANDING_AND_LICENSE.md',
  'agent-desktop\\BRANDING_AND_LICENSE.md',
  'agent-desktop/BRANDING_AND_LICENSE.md',
  'scripts\\v2.10.24-handbook-zh.cjs',
  'scripts/v2.10.24-handbook-zh.cjs',
]);

function gbkArtefactsIn(rel, raw) {
  if (GBK_EXEMPT.has(rel)) return 0;
  let hits = 0;
  for (const m of GBK_ARTEFACTS) {
    if (raw.includes(m)) hits++;
  }
  // Locale-aware pass: a Latin-language UI file should contain no CJK at
  // all, so any CJK there is corruption rather than copy.
  const inLocales = rel.replace(/\\/g, '/').match(
    /agent-desktop\/src\/shared\/i18n\/locales\/([^/]+)\//,
  );
  if (inLocales && LATIN_LOCALES.has(inLocales[1])) {
    const cjk = raw.match(new RegExp(ANY_CJK.source, 'g'));
    if (cjk) hits += cjk.length;
  }
  return hits;
}

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
  let gbk = gbkArtefactsIn(rel, raw);
  // Language-picker labels are genuine Japanese/Chinese copy inside the
  // *Latin* locale files ("日本語", "中文"). They must be exempted per
  // file, not globally: a global subtraction cancelled real corruption in
  // zh-CN, because "热门键" there is three CJK characters and silently
  // absorbed three artefact hits.
  if (gbk > 0) {
    const localeMatch = rel.replace(/\\/g, "/").match(
      /agent-desktop\/src\/shared\/i18n\/locales\/([^/]+)\//,
    );
    const langDir = localeMatch ? localeMatch[1] : "";
    if (LATIN_LOCALES.has(langDir)) {
      const LABELS = ["日本語", "中文"];
      for (const label of LABELS) {
        const c = raw.split(label).length - 1;
        if (c > 0) {
          const n = (label.match(new RegExp(ANY_CJK.source, "g")) || []).length;
          gbk -= c * n;
        }
      }
      if (gbk < 0) gbk = 0;
    }
  }
  if (fffd > 0 || cp1252 > 0 || gbk > 0) {
    bad.push({ file: file.replace(process.cwd() + path.sep, ''), fffd, cp1252, gbk });
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
