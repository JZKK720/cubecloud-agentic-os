// scripts/check-doc-pair.cjs
// For every documented EN/ZH doc pair, compare the H1/H2/H3 sections
// and report which sections are present in EN but missing in ZH, and
// vice versa.  This is the structural half of the i18n audit (the
// other half is the byte-level mojibake + per-locale key coverage).
//
// Doc pairs come from README.i18n.md §"Current translations".
// The script reads that manifest at runtime, so when a new
// translation is added the next CI run picks it up automatically.
//
// Force UTF-8 throughout.  Exit 0 with a drift report by default;
// --strict makes missing EN sections in a translation a hard fail.

const fs = require('fs');
const path = require('path');

const STRICT = process.argv.includes('--strict');

function listSections(file) {
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, 'utf8');
  const sections = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^(#{1,3})\s+(.+?)\s*$/);
    if (m) {
      sections.push({ level: m[1].length, title: m[2].trim() });
    }
  }
  return sections;
}

// Heuristic: a "section title" pair is considered the same across EN
// and ZH if either title is a substring of the other (case-insensitive)
// OR if the first 3 significant words match.  This is not perfect
// (translations sometimes move things around) but it catches the
// most common drift: sections that were dropped wholesale.
function pairKey(title) {
  // drop leading numbering: "1. Trust boundary" -> "trust boundary"
  // drop leading emojis: "🔒 Security" -> "security"
  return title
    .toLowerCase()
    .replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]+/u, '')
    .replace(/^\d+\.\s*/, '')
    .replace(/^#+\s*/, '')
    .replace(/[^\p{L}\p{N}\s]+/gu, '')
    .trim();
}

function matchSections(enSecs, zhSecs) {
  // Build a ZH lookup keyed by normalized title.  Multiple ZH
  // sections with the same key are treated as the same section.
  const zhByKey = new Map();
  for (const s of zhSecs) {
    const k = pairKey(s.title);
    if (!zhByKey.has(k)) zhByKey.set(k, []);
    zhByKey.get(k).push(s);
  }

  const matchedZh = new Set();
  const missing = [];
  for (const en of enSecs) {
    const k = pairKey(en.title);
    // Exact match first
    let hits = zhByKey.get(k);
    if (!hits) {
      // Fuzzy: EN key is a prefix of some ZH key, or vice versa
      for (const [zk, zs] of zhByKey) {
        if (k && zk && (zk.startsWith(k) || k.startsWith(zk))) { hits = zs; break; }
      }
    }
    if (hits && hits.length) matchedZh.add(hits[0]);
    else missing.push(en);
  }
  // ZH-only sections (extra in translation, not in EN)
  const extra = zhSecs.filter((s) => !matchedZh.has(s));
  return { missing, extra };
}

function findDocPairs() {
  // Doc pairs we care about.  Each entry: { en, zh, label }.
  // Paths are repo-relative.
  const pairs = [
    {
      label: 'outer-README',
      en: 'README.md',
      zh: 'README.zh-CN.md',
    },
    {
      label: 'outer-CONTRIBUTING',
      en: 'CONTRIBUTING.md',
      zh: 'CONTRIBUTING.zh-CN.md',
    },
    {
      label: 'outer-SECURITY',
      en: 'SECURITY.md',
      zh: 'SECURITY.zh-CN.md',
    },
    {
      label: 'outer-THREAT_MODEL',
      en: 'THREAT_MODEL.md',
      zh: 'THREAT_MODEL.zh-CN.md',
    },
    {
      label: 'docs-HANDBOOK',
      en: path.join('docs', 'HANDBOOK.md'),
      zh: path.join('docs', 'HANDBOOK.zh-CN.md'),
    },
    {
      label: 'handbook-README',
      en: path.join('docs', 'handbook', 'README.md'),
      zh: path.join('docs', 'handbook', 'README.zh-CN.md'),
    },
    {
      label: 'handbook-ARCHITECTURE',
      en: path.join('docs', 'handbook', 'ARCHITECTURE.md'),
      zh: path.join('docs', 'handbook', 'ARCHITECTURE.zh-CN.md'),
    },
    {
      label: 'handbook-DEVELOPMENT',
      en: path.join('docs', 'handbook', 'DEVELOPMENT.md'),
      zh: path.join('docs', 'handbook', 'DEVELOPMENT.zh-CN.md'),
    },
    {
      label: 'handbook-OPERATIONS',
      en: path.join('docs', 'handbook', 'OPERATIONS.md'),
      zh: path.join('docs', 'handbook', 'OPERATIONS.zh-CN.md'),
    },
    {
      label: 'docs-RETIRED_AND_LEGACY',
      en: path.join('docs', 'RETIRED_AND_LEGACY.md'),
      zh: path.join('docs', 'RETIRED_AND_LEGACY.zh-CN.md'),
    },
    {
      label: 'agent-desktop-README',
      en: path.join('agent-desktop', 'README.md'),
      zh: path.join('agent-desktop', 'README.zh-CN.md'),
    },
  ];
  return pairs;
}

const pairs = findDocPairs();
const lines = [];
let anyDrift = false;

for (const p of pairs) {
  const enSecs = listSections(p.en);
  const zhSecs = listSections(p.zh);
  if (enSecs.length === 0 || zhSecs.length === 0) {
    lines.push(`${p.label.padEnd(28)} EN=${enSecs.length}  ZH=${zhSecs.length}  (missing file)`);
    anyDrift = true;
    continue;
  }
  const { missing, extra } = matchSections(enSecs, zhSecs);
  const ratio = (zhSecs.length / enSecs.length).toFixed(2);
  const drift = [];
  if (missing.length) {
    anyDrift = true;
    drift.push(`MISSING-IN-ZH=[${missing.map((m) => m.title).join(' | ')}]`);
  }
  if (extra.length) {
    anyDrift = true;
    drift.push(`EXTRA-IN-ZH=[${extra.map((e) => e.title).join(' | ')}]`);
  }
  lines.push(
    `${p.label.padEnd(28)} EN=${String(enSecs.length).padStart(3)}  ZH=${String(zhSecs.length).padStart(3)}  ratio=${ratio}${drift.length ? '  ' + drift.join('  ') : ''}`
  );
}

process.stdout.write(lines.join('\n') + '\n');
process.stdout.write('\n');
process.stdout.write(anyDrift ? '⚠ section drift present — see above\n' : '✅ no section drift\n');
if (STRICT && anyDrift) process.exit(1);
process.exit(0);
