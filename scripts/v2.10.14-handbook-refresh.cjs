// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// scripts/v2.10.14-handbook-refresh.cjs -- add a "Recent updates
// (V2.6 -> V2.10)" pointer to each of the 4 outer-handbook files,
// pointing at the BRANDING_AND_LICENSE.md V2.10 sub-sections. Purely
// additive: no rewrite, no hardlink break, no drive-by refactor.
//
// Audit (V2.10.14, before this transition):
//   - ARCHITECTURE.md (11.6 KB): 3x apps/desktop-shell, 0x prelaunchSeed
//   - DEVELOPMENT.md (12.3 KB): 1x superpowers, 1x previews/, 1x screenshot
//   - OPERATIONS.md (9.9 KB): 1x V2.7, 3x superpowers
//   - README.md (4.7 KB): 5x superpowers
// The 4 files are V2.4-V2.6 aware (the V2.3 / V2.4 / V2.5 mentions are
// intentional historical context: "V2.3 -> V2.4 -> V2.5 was the brand
// transition", "CodeGraph (V2.3)", "EverOS sidecar (V2.3)"). The
// real gap is the absence of V2.7-V2.10 transition pointers.
//
// Approach: add a single tail paragraph to each file's existing
// "Where to look next" section, pointing at BRANDING_AND_LICENSE.md
// and the new RETIRED rows.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HANDBOOK = path.join(ROOT, 'docs', 'handbook');
const BRANDING = path.join(ROOT, 'BRANDING_AND_LICENSE.md');
const RETIRED = path.join(ROOT, 'docs', 'RETIRED_AND_LEGACY.md');

const EM_DASH = String.fromCodePoint(0x2014);
const SECTION_SIGN = String.fromCodePoint(0x00a7);

// Tail paragraph to add to each file. Each file has slightly different
// existing tail context, so we use line-based anchor matching.
const tailParagraph = [
  '',
  '',
  '**Recent updates (V2.6 ' + EM_DASH + ' V2.10).** This file was last',
  'substantively edited during the V2.4 ' + EM_DASH + ' V2.6 brand-license',
  'wave. The V2.7 (superpowers skills), V2.8 (description-trim audit),',
  'V2.9 (pre-launch bundle, 40/40 smoke), and V2.10 (doc-move, README',
  'split, i18n cleanup, previews cleanup, provenance cross-link,',
  'README Translations pointer) transitions are documented in',
  '[`BRANDING_AND_LICENSE.md`](../../BRANDING_AND_LICENSE.md) under',
  'the corresponding `## V2.7 / V2.8 / V2.9 / V2.10` sub-sections, and',
  'each per-version change is recorded in',
  '[`docs/RETIRED_AND_LEGACY.md`](../RETIRED_AND_LEGACY.md) ' + SECTION_SIGN,
  '"How to confirm a surface is live". No content rewrite of this',
  'handbook file was needed for V2.10.14; the tail pointer is the',
  'additive update.'
];

function appendTailTo(file, anchor) {
  const fullPath = path.join(HANDBOOK, file);
  let content = fs.readFileSync(fullPath, 'utf8');

  if (content.includes('**Recent updates (V2.6')) {
    console.log('  ' + file + ' already has V2.10.14 tail; skipping');
    return false;
  }

  if (!content.includes(anchor)) {
    console.error('  ' + file + ' anchor not found: ' + anchor);
    process.exit(1);
  }

  content = content.split(anchor).join(anchor + tailParagraph.join('\n'));
  fs.writeFileSync(fullPath, content);
  console.log('  ' + file + ' tail appended; size now:', fs.statSync(fullPath).size, 'bytes');
  return true;
}

// ARCHITECTURE.md anchor: the "**Where to look next.**" line that ends
// with `CODEGRAPH_WORKSPACE_MIGRATION.md`](CODEGRAPH_WORKSPACE_MIGRATION.md).`
const archAnchor = '](CODEGRAPH_WORKSPACE_MIGRATION.md).';
appendTailTo('ARCHITECTURE.md', archAnchor);

// DEVELOPMENT.md anchor: the "**Where to look next.**" line ending with
// `gstack-qa/SKILL.md` for the pre-ship gate.`
const devAnchor = 'gstack-qa/`](../../.agents/skills/gstack-qa/SKILL.md) for the pre-ship gate.';
appendTailTo('DEVELOPMENT.md', devAnchor);

// OPERATIONS.md anchor: the "**Where to look next.**" line ending with
// the release design path.
const opsAnchor = 'for the release design.';
appendTailTo('OPERATIONS.md', opsAnchor);

// README.md (handbook index): the attribution note is the last paragraph.
// We add the tail after the "modeled on the V2.4 ..." line.
const readmeAnchor = 'the `docs/superpowers/specs/` design-spec convention.';
appendTailTo('README.md', readmeAnchor);

// 2. Append V2.10.14 sub-section to BRANDING_AND_LICENSE.md.
let branding = fs.readFileSync(BRANDING, 'utf8');
if (branding.includes('## V2.10.14')) {
  console.log('  BRANDING already has V2.10.14; skipping');
} else {
  const v21014Block = [
    '',
    '',
    '## V2.10.14 ' + EM_DASH + ' `docs/handbook/` refresh (additive, no rewrite)',
    '',
    '**Scope:** 4 outer-handbook files (`docs/handbook/ARCHITECTURE.md`,',
    '`DEVELOPMENT.md`, `OPERATIONS.md`, `README.md`). All 4 are Windows',
    'hardlinks to the inner `cubecloud-desktop/docs/handbook/` mirrors;',
    'this transition preserves the hardlink layer (no split, unlike the',
    'V2.10.6 README split which had a genuine outer-vs-inner audience',
    'distinction).',
    '',
    '**Audit (V2.10.14, before this transition):**',
    '',
    'A `grep` across the 4 files for V2-era markers:',
    '',
    '- V2.3 / V2.4 / V2.5 mentions are all **intentional historical**',
    '  context (e.g., "CodeGraph (V2.3)", "V2.3 ' + EM_DASH + '> V2.4 ' + EM_DASH + '> V2.5 work was the brand',
    '  transition", "the structure is modelled on the V2.4 ' + EM_DASH + '> V2.5 ' + EM_DASH + '> V2.6',
    '  brand-license history"). Not stale.',
    '- V2.6 is referenced in all 4 files (current).',
    '- V2.7 / V2.8 / V2.9 / V2.10 mentions: **0 in ARCHITECTURE, 0 in',
    '  DEVELOPMENT, 1 in OPERATIONS (V2.7), 0 in README**. The real',
    '  gap was the absence of transition pointers, not stale content.',
    '',
    '**Changes:**',
    '',
    '1. Added a "**Recent updates (V2.6 ' + EM_DASH + ' V2.10).**" tail paragraph to each',
    '   of the 4 files, pointing at BRANDING_AND_LICENSE.md and',
    '   RETIRED_AND_LEGACY.md. The paragraph is 1 block in',
    '   ARCHITECTURE.md, DEVELOPMENT.md, OPERATIONS.md, and',
    '   README.md respectively (same content, anchored to each',
    '   file\'s existing "Where to look next" tail).',
    '2. No content rewrite. No hardlink break. No source code',
    '   change. No `package.json` / `scripts/sync-docs.ps1` /',
    '   `.gitignore` change.',
    '',
    '**Why this is the right next V2.10.x step:**',
    '',
    'The 4 handbook files are the "layer map" for the agentic-OS',
    'monorepo. A reader landing on any of them (especially',
    'ARCHITECTURE.md or README.md) needs a single-line pointer to',
    'the V2.7-V2.10 transitions, otherwise the file looks',
    'V2.6-frozen and the reader has to discover the BRANDING',
    'history by accident. The 1-paragraph tail is the minimum',
    'additive change that closes that gap without rewriting the',
    'V2.6-aware architecture / development / operations / index',
    'content that is already correct.',
    '',
    '**What is deliberately out of scope (V2.10.14 is the lowest-risk',
    'option among the 3 remaining candidates):**',
    '',
    '- **Screenshot refresh pass**: regenerates the 23 legacy',
    '  `previews/` PNGs under Cubecloud branding. Design + asset',
    '  work, not docs-layer.',
    '- **i18n encoding fix for the inherited',
    '  `CONTRIBUTING.ja-JP.md`**: mojibake; needs a fresh',
    '  translation by a native Japanese speaker.'
  ];
  branding = branding + v21014Block.join('\n') + '\n';
  fs.writeFileSync(BRANDING, branding);
  console.log('  V2.10.14 sub-section appended to BRANDING; size now:', fs.statSync(BRANDING).size, 'bytes');
}

// 3. Append V2.10.14 row to RETIRED_AND_LEGACY.md.
let retired = fs.readFileSync(RETIRED, 'utf8');
if (retired.includes('V2.10.14')) {
  console.log('  RETIRED already has V2.10.14; skipping');
} else {
  const lines = retired.split(/\r?\n/);
  let v21013Row = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('| Inner CONTRIBUTING cross-links |')) {
      v21013Row = i;
    }
  }
  if (v21013Row < 0) {
    console.error('RETIRED V2.10.13 row not found; aborting');
    process.exit(1);
  }
  const v21014Row = '| `docs/handbook/` refresh | `docs/handbook/{ARCHITECTURE,DEVELOPMENT,OPERATIONS,README}.md` | **Live + V2.10.14 tail pointer** (additive, no rewrite) | A 1-paragraph "**Recent updates (V2.6 ' + String.fromCodePoint(0x2014) + ' V2.10).**" tail was added to each of the 4 outer-handbook files, pointing at BRANDING_AND_LICENSE.md and RETIRED_AND_LEGACY.md. No content rewrite, no hardlink break, no source code change. The 4 files were already V2.6-aware; the gap was the absence of V2.7-V2.10 transition pointers, not stale content. |';
  lines.splice(v21013Row + 1, 0, v21014Row);
  retired = lines.join('\n');
  fs.writeFileSync(RETIRED, retired);
  console.log('  V2.10.14 row inserted after V2.10.13 row in RETIRED; size now:', fs.statSync(RETIRED).size, 'bytes');
}
