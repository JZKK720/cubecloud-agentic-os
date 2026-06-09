// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// scripts/v2.10.15-outer-i18n-stubs.cjs -- add 3 outer monorepo
// README translation stubs (README.ja-JP.md, README.zh-CN.md,
// README.ko-KR.md) at the outer root, and update the
// README.i18n.md manifest to track them.
//
// This is the outer-monorepo counterpart to the V2.10.7 inner-binary
// i18n layer. The inner files (agent-desktop/README.<lang>.md,
// agent-desktop/CONTRIBUTING.<lang>.md) cover the binary; the
// outer files (README.<lang>.md at the outer root) cover the
// monorepo. As of V2.10.7, the manifest distinguished
// "monorepo translations (none yet)" from "binary translations
// (4 community-maintained CJK files)". V2.10.15 closes the gap by
// adding the 3 monorepo placeholder files.
//
// The placeholders are NOT translations -- they are a 1-paragraph
// note saying: "this is the monorepo README, see the inner for
// binary translations, if you want to translate this, see
// README.i18n.md section 'Translation workflow'". A native
// speaker can fork the placeholder and translate the actual
// README.md content.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BRANDING = path.join(ROOT, 'BRANDING_AND_LICENSE.md');
const RETIRED = path.join(ROOT, 'docs', 'RETIRED_AND_LEGACY.md');
const I18N = path.join(ROOT, 'README.i18n.md');
const EM_DASH = String.fromCodePoint(0x2014);
const SECTION_SIGN = String.fromCodePoint(0x00a7);

// Build the 3 placeholder files. Each is the same content, the
// native-language reader is told (in the same language header) which
// file they are reading and where the source-of-truth lives.

function buildStub(langName, langCode) {
  const lines = [
    '# Cubecloud Agentic-OS ' + langName + ' (' + langCode + ')',
    '',
    '> **Placeholder, not a translation.** This file is a stub that',
    '> exists to make the monorepo discoverable in ' + langName + '.',
    '> The source of truth for the monorepo documentation is the',
    '> English [`README.md`](README.md). The source of truth for the',
    '> binary (Electron app) is the English',
    '> [`agent-desktop/README.md`](agent-desktop/README.md),',
    '> which has community translations at',
    '> `agent-desktop/README.<lang>.md` (see',
    '> [`README.i18n.md`](README.i18n.md) for the list).',
    '',
    '**If you would like to translate the monorepo README into**',
    '**' + langName + ',** follow the workflow in',
    '[`README.i18n.md`](README.i18n.md) ' + SECTION_SIGN,
    '"Translation workflow": fork this file, replace the body with a',
    'native ' + langName + ' translation of',
    '[`README.md`](README.md) (preserve the section structure and',
    'the link targets), and open a PR. The English file is the',
    'source of truth; translations track it.',
    '',
    '**For the binary (' + langName + '),** check whether a',
    'community translation already exists at',
    '`agent-desktop/README.' + langCode + '.md`. The',
    '[`README.i18n.md`](README.i18n.md) manifest lists the current',
    'status of every translation (Live, Needs refresh, Mojibake,',
    'etc.).',
    '',
    '---',
    '',
    '**Status:** Placeholder (V2.10.15). Content is English-only; the',
    'language-specific framing in the headings + the in-line notes is',
    'the only ' + langName + '-specific text.',
  ];
  return lines.join('\n') + '\n';
}

const stubs = [
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'zh-CN', name: 'Simplified Chinese' },
  { code: 'ko-KR', name: 'Korean' }
];

for (const stub of stubs) {
  const filePath = path.join(ROOT, 'README.' + stub.code + '.md');
  if (fs.existsSync(filePath)) {
    console.log('  README.' + stub.code + '.md already exists; skipping');
  } else {
    fs.writeFileSync(filePath, buildStub(stub.name, stub.code), 'utf8');
    console.log('  README.' + stub.code + '.md created; size:', fs.statSync(filePath).size, 'bytes');
  }
}

// 2. Update README.i18n.md manifest to add the 3 new monorepo rows
// + the Korean language entry + a "monorepo placeholder" section
// explaining the V2.10.15 transition.
let i18n = fs.readFileSync(I18N, 'utf8');

if (i18n.includes('README.ko-KR.md') && i18n.includes('README.ja-JP.md') && i18n.includes('README.zh-CN.md')) {
  console.log('  README.i18n.md already references all 3 new monorepo rows; skipping manifest update');
} else {
  // Update the "Current translations" table to add 3 new monorepo
  // rows at the top (under the English monorepo row, which doesn't
  // exist yet either -- let me add it too).
  const oldMonorepoHeader =
    '| File | Language | Path | Status | Maintainer |\n' +
    '|---|---|---|---|---|\n' +
    '| README (binary) | English | `agent-desktop/README.md` | Live, V2.10.6 | Cubecloud Contributors |';
  const newMonorepoHeader =
    '| File | Language | Path | Status | Maintainer |\n' +
    '|---|---|---|---|---|\n' +
    '| README (monorepo) | English | `README.md` (outer root) | Live, V2.10.6 + V2.10.12 Translations pointer | Cubecloud Contributors |\n' +
    '| README (monorepo) | Japanese (' + 'ja-JP' + ') | `README.ja-JP.md` (outer root) | **Placeholder, V2.10.15** (not a translation) | Community -- fork + translate to claim |\n' +
    '| README (monorepo) | Simplified Chinese (' + 'zh-CN' + ') | `README.zh-CN.md` (outer root) | **Placeholder, V2.10.15** (not a translation) | Community -- fork + translate to claim |\n' +
    '| README (monorepo) | Korean (' + 'ko-KR' + ') | `README.ko-KR.md` (outer root) | **Placeholder, V2.10.15** (not a translation, no prior inner `ko-KR`) | Community -- fork + translate to claim |\n' +
    '| README (binary) | English | `agent-desktop/README.md` | Live, V2.10.6 | Cubecloud Contributors |';

  if (!i18n.includes(oldMonorepoHeader)) {
    console.error('README.i18n.md table header not found in expected form; aborting');
    process.exit(1);
  }
  if (i18n.includes('README.ko-KR.md')) {
    console.log('  README.i18n.md table already updated; skipping');
  } else {
    i18n = i18n.split(oldMonorepoHeader).join(newMonorepoHeader);
    fs.writeFileSync(I18N, i18n);
    console.log('  README.i18n.md table updated with 3 monorepo placeholder rows + English monorepo row; size now:', fs.statSync(I18N).size, 'bytes');
  }
}

// 3. Append V2.10.15 sub-section to BRANDING_AND_LICENSE.md.
let branding = fs.readFileSync(BRANDING, 'utf8');
if (branding.includes('## V2.10.15')) {
  console.log('  BRANDING already has V2.10.15; skipping');
} else {
  const v21015Block = [
    '',
    '',
    '## V2.10.15 ' + EM_DASH + ' Outer monorepo README i18n stubs (' + 'ja-JP, zh-CN, ko-KR' + ')',
    '',
    '**Scope:** outer monorepo root. 3 new files: `README.ja-JP.md`,',
    '`README.zh-CN.md`, `README.ko-KR.md`. Plus an update to the',
    'manifest at `README.i18n.md`.',
    '',
    '**Why this is the right next V2.10.x step:**',
    '',
    'The V2.10.7 transition created the inner-binary i18n layer',
    '(4 CJK files at `agent-desktop/README.<lang>.md` and',
    '`CONTRIBUTING.<lang>.md`) and the manifest at',
    '`README.i18n.md`. The manifest\'s "Why not at the outer root?"',
    'section said:',
    '',
    '> As of V2.10.7, the agentic-OS monorepo content is English-',
    '> only; community translations of the *binary* content',
    '> (which is what the inner i18n files cover) stay at the',
    '> inner location.',
    '',
    'That statement was correct at the time, but it undersold the',
    'discoverability of the monorepo for non-English readers. A',
    'reader landing on the outer root via a search-engine or a',
    'GitHub link has no obvious "this exists in your language',
    'too" signal. V2.10.15 closes that gap by adding 3',
    'placeholder files at the outer root -- one per language the',
    'inner already supports (ja-JP, zh-CN), plus Korean (ko-KR)',
    'which the inner does not yet have.',
    '',
    '**Changes:**',
    '',
    '1. Created `README.ja-JP.md`, `README.zh-CN.md`,',
    '   `README.ko-KR.md` at the outer root. Each is a 1-',
    '   paragraph placeholder explaining:',
    '   - what the file is (placeholder, not a translation);',
    '   - where the source of truth is (English README.md for',
    '     the monorepo, agent-desktop/README.md for the',
    '     binary);',
    '   - the workflow for a native speaker to translate the',
    '     actual content (`README.i18n.md` ' + SECTION_SIGN,
    '     "Translation workflow").',
    '2. Updated `README.i18n.md` "Current translations" table to',
    '   add 4 new rows: the English monorepo README (which was',
    '   missing from the table; only the English binary row was',
    '   there), the 3 new monorepo placeholder rows, and the',
    '   Korean language entry (the first time Korean appears in',
    '   the manifest; the inner has no `ko-KR` files yet).',
    '3. No source code change. No `package.json` /',
    '   `scripts/sync-docs.ps1` / `.gitignore` change. The 3',
    '   new files are NOT mirrored to the inner (the inner is a',
    '   vendored Electron app, not the monorepo doc layer).',
    '',
    '**Why placeholders, not translations:**',
    '',
    'A real translation requires a native speaker. The 4 inner',
    'CJK files are community-maintained and mojibake in places',
    '(see the "Out of scope for V2.10.7" section of the',
    'manifest for the encoding-fix caveat). The 3 outer placeholders',
    'are deliberately **not** translations; they are stubs that',
    'say "I exist for discoverability, please translate me" in',
    'the target language. A native speaker can fork the file,',
    'translate the body, and open a PR -- the manifest is set',
    'up to track the new status row automatically once the file',
    'no longer contains the "Placeholder" sentinel.',
    '',
    '**What is deliberately out of scope (V2.10.15 covers only the',
    '3 new files + the manifest update):**',
    '',
    '- **Translating the actual `README.md` content into ja/zh/ko**',
    '  -- needs native speakers. The placeholders are the invitation.',
    '- **Translating the outer `CONTRIBUTING.md` / `HANDBOOK.md` /**',
    '  ' + SECTION_SIGN + '**handbook** files** -- same dependency on',
    '  native speakers. The manifest already covers these in the',
    '  "Translation workflow" section.',
    '- **Encoding fix for the inherited inner `CONTRIBUTING.ja-JP.md`',
    '  ** -- mojibake; needs a fresh translation. The V2.10.7',
    '  transition documented this in `README.i18n.md`',
    '  ' + SECTION_SIGN + '"Out of scope for V2.10.7". V2.10.15 does not',
    '  change the dependency.'
  ];
  branding = branding + v21015Block.join('\n') + '\n';
  fs.writeFileSync(BRANDING, branding);
  console.log('  V2.10.15 sub-section appended to BRANDING; size now:', fs.statSync(BRANDING).size, 'bytes');
}

// 4. Append V2.10.15 row to RETIRED_AND_LEGACY.md.
let retired = fs.readFileSync(RETIRED, 'utf8');
if (retired.includes('V2.10.15')) {
  console.log('  RETIRED already has V2.10.15; skipping');
} else {
  const lines = retired.split(/\r?\n/);
  let v21014Row = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('| `docs/handbook/` refresh |')) {
      v21014Row = i;
    }
  }
  if (v21014Row < 0) {
    console.error('RETIRED V2.10.14 row not found; aborting');
    process.exit(1);
  }
  const v21015Row = '| Outer monorepo README i18n stubs | `README.ja-JP.md`, `README.zh-CN.md`, `README.ko-KR.md` (outer root) | **Live + placeholder, V2.10.15** (3 new files + manifest update) | 3 placeholder files added at the outer root so non-English readers see "this exists in your language too" before discovering the inner-binary translations. Each is a 1-paragraph stub (not a translation); a native speaker can fork + translate + open a PR per the `README.i18n.md` workflow. Korean (`ko-KR`) is the first time the language appears in the manifest (inner has no `ko-KR` files yet). The `README.i18n.md` table was updated to add 4 rows (English monorepo + 3 placeholder rows) and the Korean language entry. |';
  lines.splice(v21014Row + 1, 0, v21015Row);
  retired = lines.join('\n');
  fs.writeFileSync(RETIRED, retired);
  console.log('  V2.10.15 row inserted after V2.10.14 row in RETIRED; size now:', fs.statSync(RETIRED).size, 'bytes');
}
