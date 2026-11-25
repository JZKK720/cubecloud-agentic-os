// scripts/check-i18n-coverage.cjs
// Verify every locale under agent-desktop/src/shared/i18n/locales/<lang>/
// carries exactly the same key set as the English source.
//
// V3 — EVALUATED, not regexed. The v2 parser counted line-leading
// `key:` tokens, which (a) under-counted real keys (nested objects whose
// keys sit on the same line as a parent, quoted keys inside arrays, etc.)
// and (b) could not see *extra* keys. It reported "no drift" while
// zh-TW carried a stray top-level `body`. Locale modules are plain
// `export default { ... }` literals with no imports, so we transpile each
// file with TypeScript and flatten the resulting object. That is exact:
// missing keys, extra keys, and shape mismatches all surface.
//
// Exit codes: 0 = no drift (and --strict not given, or both clean),
//             1 = drift, or --strict with any drift, or unreadable file.
// `--strict` is now the CI default (see .github/workflows/ci.yml).

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join('agent-desktop', 'src', 'shared', 'i18n', 'locales');
const SOURCE_LOCALE = 'en';
const STRICT = process.argv.includes('--strict');

function loadTypeScript() {
  for (const candidate of [
    path.join('agent-desktop', 'node_modules', 'typescript'),
    path.join('node_modules', 'typescript'),
  ]) {
    try {
      return require(path.resolve(candidate));
    } catch {
      /* try next */
    }
  }
  return null;
}

const ts = loadTypeScript();
if (!ts) {
  console.error('error: typescript is required to evaluate locale modules.');
  console.error('Run `npm install` (root) or `npm install` inside agent-desktop/.');
  process.exit(2);
}

function loadModule(file) {
  const src = fs.readFileSync(file, 'utf8');
  const js = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: path.basename(file),
  }).outputText;
  const mod = { exports: {} };
  // Locale modules only export an object literal; no side effects.
  new Function('module', 'exports', 'require', js)(mod, mod.exports, require);
  const value = mod.exports && mod.exports.default;
  if (!value || typeof value !== 'object') {
    throw new Error(`locale module ${file} did not export a default object`);
  }
  return value;
}

function flatten(obj, prefix, out) {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const pathKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, pathKey, out);
    } else {
      out.set(pathKey, typeof value);
    }
  }
}

function collectKeys(file, namespace) {
  const obj = loadModule(file);
  const out = new Map();
  flatten(obj, namespace, out);
  return out;
}

const srcDir = path.join(LOCALES_DIR, SOURCE_LOCALE);
const srcFiles = fs.readdirSync(srcDir).filter((f) => f.endsWith('.ts')).sort();

const srcKeysByFile = {};
let totalEnKeys = 0;
for (const f of srcFiles) {
  const namespace = f.replace(/\.ts$/, '');
  const keys = collectKeys(path.join(srcDir, f), namespace);
  srcKeysByFile[f] = keys;
  totalEnKeys += keys.size;
}

const lines = [];
lines.push(`English source: ${srcFiles.length} files, ${totalEnKeys} keys`);
lines.push('');

const targetLocales = fs
  .readdirSync(LOCALES_DIR)
  .filter((d) => fs.statSync(path.join(LOCALES_DIR, d)).isDirectory())
  .filter((d) => d !== SOURCE_LOCALE)
  .sort();

let anyDrift = false;
const problems = [];
for (const lang of targetLocales) {
  const dir = path.join(LOCALES_DIR, lang);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ts')).sort();
  const missing = srcFiles.filter((f) => !files.includes(f));
  if (missing.length) anyDrift = true;

  let localKeys = 0;
  const missingKeys = {};
  const extraKeys = {};
  for (const f of srcFiles) {
    const enKeys = srcKeysByFile[f];
    if (!files.includes(f)) {
      missingKeys[f] = [...enKeys.keys()];
      continue;
    }
    const namespace = f.replace(/\.ts$/, '');
    const tKeys = collectKeys(path.join(dir, f), namespace);
    localKeys += tKeys.size;
    const miss = [];
    for (const k of enKeys.keys()) if (!tKeys.has(k)) miss.push(k);
    if (miss.length) missingKeys[f] = miss;
    const extra = [];
    for (const k of tKeys.keys()) if (!enKeys.has(k)) extra.push(k);
    if (extra.length) extraKeys[f] = extra;
  }
  const totalMissing = Object.values(missingKeys).reduce((a, b) => a + b.length, 0);
  const totalExtra = Object.values(extraKeys).reduce((a, b) => a + b.length, 0);
  if (totalMissing || totalExtra) anyDrift = true;
  lines.push(
    `${lang.padEnd(6)} files=${String(files.length).padStart(2)}/${srcFiles.length}  ` +
      `keys=${String(localKeys).padStart(4)}/${totalEnKeys}  ` +
      (missing.length ? `MISSING-FILES=[${missing.join(',')}]  ` : '') +
      `missing-keys=${totalMissing}  extra-keys=${totalExtra}`
  );
  for (const [f, keys] of Object.entries(missingKeys)) {
    problems.push(`${lang}/${f}: missing ${keys.length} -> ${keys.slice(0, 8).join(', ')}${keys.length > 8 ? ' …' : ''}`);
  }
  for (const [f, keys] of Object.entries(extraKeys)) {
    problems.push(`${lang}/${f}: extra   ${keys.length} -> ${keys.slice(0, 8).join(', ')}${keys.length > 8 ? ' …' : ''}`);
  }
}

process.stdout.write(lines.join('\n') + '\n');
if (problems.length) {
  process.stdout.write('\n' + problems.join('\n') + '\n');
}
process.stdout.write('\n');
process.stdout.write(anyDrift ? '✗ drift present — see above\n' : '✅ no drift\n');
if (anyDrift && STRICT) process.exit(1);
process.exit(0);
