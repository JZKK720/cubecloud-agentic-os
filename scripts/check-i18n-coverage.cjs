// scripts/check-i18n-coverage.cjs
// Compare every locale under agent-desktop/src/shared/i18n/locales/<lang>/
// to the English source. For each non-English locale, list the locale
// files that are missing, and the missing keys inside present files
// (so we can see which screens are not translated).
//
// Locale files are TypeScript that re-import other files; we do not
// load the module graph (would need a TS transpiler).  Instead we
// parse the source text and collect all string-literal keys that look
// like i18n keys.  This is a conservative scan: it may over-report
// drift when a non-key string looks like a key, but it will never
// under-report a missing locale file (that's a directory walk).
//
// Force UTF-8 throughout.  Exit 0 even if drift is found — drift is
// informational.  Use --strict to make it a hard fail (CI).

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join('agent-desktop', 'src', 'shared', 'i18n', 'locales');
const SOURCE_LOCALE = 'en';
const STRICT = process.argv.includes('--strict');

// Match 'key' or "key" lines that look like i18n keys (followed by
// a colon, but NOT a colon-then-//, which is a comment).  Dot or no
// dot both pass — the key tree is the union.
const KEY_LINE = /^[ \t]+(['"`])([A-Za-z0-9_.\-]+)\1\s*:\s*(?!\/\/)/gm;

function collectKeys(file) {
  const text = fs.readFileSync(file, 'utf8');
  const out = new Set();
  let m;
  KEY_LINE.lastIndex = 0;
  while ((m = KEY_LINE.exec(text))) {
    out.add(m[2]);
  }
  return out;
}

const srcDir = path.join(LOCALES_DIR, SOURCE_LOCALE);
const srcFiles = fs.readdirSync(srcDir).filter((f) => f.endsWith('.ts')).sort();

const srcKeysByFile = {};
let totalEnKeys = 0;
for (const f of srcFiles) {
  const k = collectKeys(path.join(srcDir, f));
  srcKeysByFile[f] = k;
  totalEnKeys += k.size;
}

const lines = [];
lines.push(`English source: ${srcFiles.length} files, ${totalEnKeys} parse-keys`);
lines.push('');

const targetLocales = fs
  .readdirSync(LOCALES_DIR)
  .filter((d) => fs.statSync(path.join(LOCALES_DIR, d)).isDirectory())
  .filter((d) => d !== SOURCE_LOCALE)
  .sort();

let anyDrift = false;
for (const lang of targetLocales) {
  const dir = path.join(LOCALES_DIR, lang);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ts')).sort();
  const missing = srcFiles.filter((f) => !files.includes(f));
  if (missing.length) anyDrift = true;
  let localKeys = 0;
  const missingKeys = {};
  for (const f of srcFiles) {
    const enKeys = srcKeysByFile[f];
    if (!files.includes(f)) {
      missingKeys[f] = Array.from(enKeys);
      continue;
    }
    const tKeys = collectKeys(path.join(dir, f));
    localKeys += tKeys.size;
    const m = [];
    for (const k of enKeys) if (!tKeys.has(k)) m.push(k);
    if (m.length) missingKeys[f] = m;
  }
  const totalMissing = Object.values(missingKeys).reduce((a, b) => a + b.length, 0);
  if (totalMissing) anyDrift = true;
  lines.push(
    `${lang.padEnd(6)} files=${String(files.length).padStart(2)}/${srcFiles.length}  ` +
      `keys=${String(localKeys).padStart(4)}/${totalEnKeys}  ` +
      (missing.length ? `MISSING-FILES=[${missing.join(',')}]  ` : '') +
      `missing-keys=${totalMissing}`
  );
}

process.stdout.write(lines.join('\n') + '\n');
process.stdout.write('\n');
process.stdout.write(anyDrift ? '⚠ drift present — see above\n' : '✅ no drift\n');
if (STRICT && anyDrift) process.exit(1);
process.exit(0);
