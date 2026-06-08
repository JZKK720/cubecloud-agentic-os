// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// v2.10.24-handbook-zh.cjs
//
// (1) Repair mojibake in docs/HANDBOOK.md and restore the misplaced
//     §5.4 block to the right place.
// (2) Update README.md and README.i18n.md to advertise HANDBOOK.zh-CN.md.
// (3) Record the transition in BRANDING and RETIRED.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HANDBOOK = path.join(ROOT, 'docs', 'HANDBOOK.md');
const README = path.join(ROOT, 'README.md');
const I18N = path.join(ROOT, 'README.i18n.md');
const BRANDING = path.join(ROOT, 'BRANDING_AND_LICENSE.md');
const RETIRED = path.join(ROOT, 'docs', 'RETIRED_AND_LEGACY.md');
const EM_DASH = String.fromCodePoint(0x2014);

// Repair HANDBOOK.md mojibake.
let handbook = fs.readFileSync(HANDBOOK, 'utf8');
const beforeMojibake = /鈥\?|搂|鈫\?|虏|鏃ユ湰瑾\?|绠€浣撲腑鏂\?/g;
const beforeCount = (handbook.match(beforeMojibake) || []).length;

handbook = handbook
  .replace(/鈫\?/g, '→')
  .replace(/鈥\?/g, '—')
  .replace(/搂/g, '§')
  .replace(/虏/g, '²')
  .replace(/绠€浣撲腑鏂\?/g, '简体中文')
  .replace(/鏃ユ湰瑾\?/g, '日本語')
  .replace(/If you want to—\| Read \|/g, 'If you want to… | Read |');

// Restore misplaced §5.4 block.
const misplaced = "### 5.4 Adding a new skill\n\nRun `gbrain-skillify` (the 11-axis gate) →run `ecc-skill-scout` (search-before-write) →read `po-write-a-skill` (the authoring contract) →write the SKILL.md (500 line cap) →add a row to `.agents/skills/README.md` →mirror to `~/.agents/skills/`. The full flow is documented in those four skills; the gating principle is \"do not skillify a one-off, and do not skillify a vague idea.\"\n";
const stray = "sp-write-a-skill` (TDD-for-skills, with the Description Trap and the CSO contract) **or** `po-write-a-skill` (lighter contract) —pick the one that fits the task →write the SKILL.md (500 line cap) →write a red-phase failure transcript (`tests/red-baseline.md`) →add a row to `.agents/skills/README.md` →mirror to `~/.agents/skills/`. The full flow is documented in those skills; the gating principle is \"do not skillify a one-off, and do not skillify a vague idea.\"";
if (handbook.includes(stray)) {
  handbook = handbook.replace(stray, '');
}
if (!handbook.includes('### 5.4 Adding a new skill')) {
  handbook = handbook.replace(
    '### 5.5 The process methodology (V2.7 superpowers import)',
    misplaced + '\n### 5.5 The process methodology (V2.7 superpowers import)'
  );
}

fs.writeFileSync(HANDBOOK, handbook, 'utf8');
const afterCount = (handbook.match(beforeMojibake) || []).length;
console.log('  docs/HANDBOOK.md repaired; mojibake count ' + beforeCount + ' -> ' + afterCount);

// Update README.md translations section.
let readme = fs.readFileSync(README, 'utf8');
const oldReadmeTrans = "Simplified Chinese translations currently exist for\n[`README.zh-CN.md`](README.zh-CN.md),\n[`CONTRIBUTING.zh-CN.md`](CONTRIBUTING.zh-CN.md),\n[`SECURITY.zh-CN.md`](SECURITY.zh-CN.md), and\n[`THREAT_MODEL.zh-CN.md`](THREAT_MODEL.zh-CN.md). The single";
const newReadmeTrans = "Simplified Chinese translations currently exist for\n[`README.zh-CN.md`](README.zh-CN.md),\n[`CONTRIBUTING.zh-CN.md`](CONTRIBUTING.zh-CN.md),\n[`SECURITY.zh-CN.md`](SECURITY.zh-CN.md),\n[`THREAT_MODEL.zh-CN.md`](THREAT_MODEL.zh-CN.md), and\n[`docs/HANDBOOK.zh-CN.md`](docs/HANDBOOK.zh-CN.md). The single";
if (readme.includes(oldReadmeTrans)) {
  readme = readme.replace(oldReadmeTrans, newReadmeTrans);
  fs.writeFileSync(README, readme, 'utf8');
  console.log('  README.md translations section updated');
}

// Update README.i18n.md.
let i18n = fs.readFileSync(I18N, 'utf8');
const oldTableTail = '| THREAT_MODEL (monorepo) | Simplified Chinese (zh-CN) | `THREAT_MODEL.zh-CN.md` (outer root) | **Live, V2.10.19** (machine-translated starting point for the outer threat model; native speakers welcome to polish) | Cubecloud Contributors + Community |\n';
const newTableTail = oldTableTail +
  '| HANDBOOK (monorepo) | English | `docs/HANDBOOK.md` | Live (hardlink to inner) | Cubecloud Contributors |\n' +
  '| HANDBOOK (monorepo) | Simplified Chinese (zh-CN) | `docs/HANDBOOK.zh-CN.md` | **Live, V2.10.24** (machine-translated starting point for the master handbook index; native speakers welcome to polish) | Cubecloud Contributors + Community |\n';
if (i18n.includes(oldTableTail) && !i18n.includes('`docs/HANDBOOK.zh-CN.md`')) {
  i18n = i18n.replace(oldTableTail, newTableTail);
}

const oldLivesWhere = '- `README.zh-CN.md`\n- `CONTRIBUTING.zh-CN.md`\n- `SECURITY.zh-CN.md`\n- `THREAT_MODEL.zh-CN.md`';
const newLivesWhere = '- `README.zh-CN.md`\n- `CONTRIBUTING.zh-CN.md`\n- `SECURITY.zh-CN.md`\n- `THREAT_MODEL.zh-CN.md`\n- `docs/HANDBOOK.zh-CN.md`';
if (i18n.includes(oldLivesWhere)) {
  i18n = i18n.replace(oldLivesWhere, newLivesWhere);
}

const oldOutOfScope = '- **`docs/HANDBOOK.md` and `docs/handbook/*.md` zh-CN translations.**\n  Those are the next coverage layer after the core 4 outer docs.';
const newOutOfScope = '- **`docs/handbook/*.md` zh-CN translations.**\n  These are the next coverage layer after the master handbook translation.';
if (i18n.includes(oldOutOfScope)) {
  i18n = i18n.replace(oldOutOfScope, newOutOfScope);
}
fs.writeFileSync(I18N, i18n, 'utf8');
console.log('  README.i18n.md updated for HANDBOOK.zh-CN.md');

// Append V2.10.24 to BRANDING.
let branding = fs.readFileSync(BRANDING, 'utf8');
if (!branding.includes('## V2.10.24')) {
  const block = [
    '',
    '',
    '## V2.10.24 ' + EM_DASH + ' Master handbook repair + HANDBOOK.zh-CN.md',
    '',
    '**Scope:** `docs/HANDBOOK.md`, `docs/HANDBOOK.zh-CN.md`, `README.md`, and `README.i18n.md`.',
    '',
    '**What changed (V2.10.24):**',
    '',
    '1. Repaired actual mojibake in `docs/HANDBOOK.md`. Unlike the earlier',
    '   PowerShell-only display corruption seen in some files, the master',
    '   handbook itself contained real broken tokens: `鈥?`, `搂`, `鈫?`,',
    '   `虏`, `绠€浣撲腑鏂?`, and `鏃ユ湰瑾?`. These were restored to',
    '   `—`, `§`, `→`, `²`, `简体中文`, and `日本語` respectively.',
    '2. Restored the misplaced `### 5.4 Adding a new skill` block to the',
    '   correct position before `### 5.5 The process methodology`.',
    '3. Added `docs/HANDBOOK.zh-CN.md` as the Simplified Chinese',
    '   translation of the master handbook index. This is the first zh-CN',
    '   translation under `docs/` proper (the earlier V2.10.16-19 work',
    '   covered only top-level monorepo docs).',
    '4. Updated `README.md` and `README.i18n.md` so the new handbook',
    '   translation is discoverable and the manifest no longer lists',
    '   `docs/HANDBOOK.md` as future work.',
    '',
    '**Why this is the right V2.10.24 step:**',
    '',
    'The previous recommendation was `docs/HANDBOOK.md` zh-CN, then the 4',
    'leaf docs under `docs/handbook/`. Before translating the leaf docs,',
    'the master index needed to be both readable in English and available',
    'in Chinese. That creates a stable source-of-truth index for the next',
    'translation wave.',
    '',
    '**Out of scope (now the next immediate layer):**',
    '',
    '- `docs/handbook/README.zh-CN.md`',
    '- `docs/handbook/ARCHITECTURE.zh-CN.md`',
    '- `docs/handbook/DEVELOPMENT.zh-CN.md`',
    '- `docs/handbook/OPERATIONS.zh-CN.md`',
    '- Native-speaker polish of all zh-CN translations.'
  ].join('\n');
  branding += block + '\n';
  fs.writeFileSync(BRANDING, branding, 'utf8');
  console.log('  BRANDING_AND_LICENSE.md updated with V2.10.24');
}

// Append V2.10.24 to RETIRED.
let retired = fs.readFileSync(RETIRED, 'utf8');
if (!retired.includes('V2.10.24')) {
  const anchor = '| Translation correction pass + PDF re-render | `README.md`, `README.zh-CN.md`, `README.i18n.md`, `docs/Cubecloud-README-en-zh.pdf` | **Live, V2.10.21** (3 file corrections + 1 artifact refresh) | Corrected the stale English `## Translations` policy in `README.md`, rewrote `README.i18n.md` to reflect outer monorepo translations vs. inner binary translations, fixed obvious machine-translation artifacts in `README.zh-CN.md`, and re-rendered the combined English + zh-CN PDF so the artifact matches the corrected source docs. |';
  const row = '| Master handbook repair + HANDBOOK.zh-CN.md | `docs/HANDBOOK.md` (REPAIRED), `docs/HANDBOOK.zh-CN.md` (NEW) | **Live, V2.10.24** (1 source repair + 1 new translation + manifest updates) | Repaired real mojibake in the master handbook and restored the misplaced §5.4 block, then added the Simplified Chinese translation of the master handbook index. This turns the handbook layer into a valid English source plus a discoverable zh-CN index before translating the 4 deeper docs under `docs/handbook/`. |';
  if (retired.includes(anchor)) {
    retired = retired.replace(anchor, anchor + '\n' + row);
    fs.writeFileSync(RETIRED, retired, 'utf8');
    console.log('  RETIRED_AND_LEGACY.md updated with V2.10.24');
  }
}
