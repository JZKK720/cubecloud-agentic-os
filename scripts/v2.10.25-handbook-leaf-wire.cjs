// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// Wire the V2.10.25 handbook leaf zh-CN wave into the top-level
// translation summaries and transition logs.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const README_ZH = path.join(ROOT, 'README.zh-CN.md');
const README_I18N = path.join(ROOT, 'README.i18n.md');
const BRANDING = path.join(ROOT, 'BRANDING_AND_LICENSE.md');
const RETIRED = path.join(ROOT, 'docs', 'RETIRED_AND_LEGACY.md');
const EM_DASH = String.fromCodePoint(0x2014);

let readmeZh = fs.readFileSync(README_ZH, 'utf8');
const oldZh = '清单区分“单仓译文”（当前已有 README、CONTRIBUTING、SECURITY、THREAT_MODEL 的简体中文版本）与“二进制译文”（4 个社区维护的 CJK 文件）。';
const newZh = '清单区分“单仓译文”（当前已有 README、CONTRIBUTING、SECURITY、THREAT_MODEL、HANDBOOK，以及 `docs/handbook/` 下 4 个长文的简体中文版本）与“二进制译文”（4 个社区维护的 CJK 文件）。';
if (readmeZh.includes(oldZh)) {
  readmeZh = readmeZh.replace(oldZh, newZh);
  fs.writeFileSync(README_ZH, readmeZh, 'utf8');
  console.log('  README.zh-CN.md summary updated');
} else {
  console.log('  README.zh-CN.md already updated or anchor missing');
}

let i18n = fs.readFileSync(README_I18N, 'utf8');
if (!i18n.includes('docs/handbook/README.zh-CN.md')) {
  const insertAfter = '| HANDBOOK (monorepo) | Simplified Chinese (zh-CN) | `docs/HANDBOOK.zh-CN.md` | **Live, V2.10.24** (machine-translated starting point for the master handbook index; native speakers welcome to polish) | Cubecloud Contributors + Community |';
  const insertBlock = [
    insertAfter,
    '| HANDBOOK leaf index (monorepo) | English | `docs/handbook/README.md` | Live (hardlink to inner) | Cubecloud Contributors |',
    '| HANDBOOK leaf index (monorepo) | Simplified Chinese (zh-CN) | `docs/handbook/README.zh-CN.md` | **Live, V2.10.25** (machine-translated starting point for the handbook sub-doc index; native speakers welcome to polish) | Cubecloud Contributors + Community |',
    '| HANDBOOK architecture (monorepo) | English | `docs/handbook/ARCHITECTURE.md` | Live (hardlink to inner) | Cubecloud Contributors |',
    '| HANDBOOK architecture (monorepo) | Simplified Chinese (zh-CN) | `docs/handbook/ARCHITECTURE.zh-CN.md` | **Live, V2.10.25** (machine-translated starting point for the architecture deep-dive; native speakers welcome to polish) | Cubecloud Contributors + Community |',
    '| HANDBOOK development (monorepo) | English | `docs/handbook/DEVELOPMENT.md` | Live (hardlink to inner) | Cubecloud Contributors |',
    '| HANDBOOK development (monorepo) | Simplified Chinese (zh-CN) | `docs/handbook/DEVELOPMENT.zh-CN.md` | **Live, V2.10.25** (machine-translated starting point for the development guide; native speakers welcome to polish) | Cubecloud Contributors + Community |',
    '| HANDBOOK operations (monorepo) | English | `docs/handbook/OPERATIONS.md` | Live (hardlink to inner) | Cubecloud Contributors |',
    '| HANDBOOK operations (monorepo) | Simplified Chinese (zh-CN) | `docs/handbook/OPERATIONS.zh-CN.md` | **Live, V2.10.25** (machine-translated starting point for the operations guide; native speakers welcome to polish) | Cubecloud Contributors + Community |'
  ].join('\n');
  i18n = i18n.replace(insertAfter, insertBlock);
}
const oldLives = '- `README.zh-CN.md`\n- `CONTRIBUTING.zh-CN.md`\n- `SECURITY.zh-CN.md`\n- `THREAT_MODEL.zh-CN.md`\n- `docs/HANDBOOK.zh-CN.md`';
const newLives = oldLives + '\n- `docs/handbook/README.zh-CN.md`\n- `docs/handbook/ARCHITECTURE.zh-CN.md`\n- `docs/handbook/DEVELOPMENT.zh-CN.md`\n- `docs/handbook/OPERATIONS.zh-CN.md`';
if (i18n.includes(oldLives)) i18n = i18n.replace(oldLives, newLives);
const oldScope = '- **`docs/handbook/*.md` zh-CN translations.**\n  These are the next coverage layer after the master handbook translation.';
const newScope = '- **Native-speaker polish of the `docs/handbook/*.zh-CN` translations.**\n  The handbook leaf-doc layer now exists in Simplified Chinese, but still needs review by native speakers.';
if (i18n.includes(oldScope)) i18n = i18n.replace(oldScope, newScope);
fs.writeFileSync(README_I18N, i18n, 'utf8');
console.log('  README.i18n.md updated for handbook leaf docs');

let branding = fs.readFileSync(BRANDING, 'utf8');
if (!branding.includes('## V2.10.25')) {
  branding += '\n\n## V2.10.25 ' + EM_DASH + ' `docs/handbook/*.zh-CN.md` wave (leaf-doc layer)\n\n'
    + '**Scope:** `docs/handbook/README.zh-CN.md`,\n'
    + '`docs/handbook/ARCHITECTURE.zh-CN.md`,\n'
    + '`docs/handbook/DEVELOPMENT.zh-CN.md`,\n'
    + '`docs/handbook/OPERATIONS.zh-CN.md`, plus the translation inventory\n'
    + 'surfaces that point at them.\n\n'
    + '**What changed (V2.10.25):**\n\n'
    + '1. Added `docs/handbook/README.zh-CN.md` as the Simplified Chinese\n'
    + '   translation of the handbook sub-doc index.\n'
    + '2. Added `docs/handbook/ARCHITECTURE.zh-CN.md` as the Simplified\n'
    + '   Chinese translation of the architecture deep-dive.\n'
    + '3. Added `docs/handbook/DEVELOPMENT.zh-CN.md` as the Simplified\n'
    + '   Chinese translation of the development guide.\n'
    + '4. Added `docs/handbook/OPERATIONS.zh-CN.md` as the Simplified\n'
    + '   Chinese translation of the operations guide.\n'
    + '5. Updated `README.md`, `README.zh-CN.md`, `docs/HANDBOOK.zh-CN.md`,\n'
    + '   and `README.i18n.md` so the new handbook-leaf translations are\n'
    + '   discoverable and so the translation inventory reflects the full\n'
    + '   zh-CN handbook layer, not just the top-level docs.\n'
    + '6. Aligned `docs/HANDBOOK.md` with the repo-wide wording change from\n'
    + '   `Copilot skills` to `open-source skills` in the top-level\n'
    + '   description of the 34-skill layer.\n\n'
    + '**Why this is the right V2.10.25 step:**\n\n'
    + 'V2.10.24 translated the master handbook index, but the next agreed\n'
    + 'layer was the 4 leaf docs under `docs/handbook/`. Shipping the\n'
    + 'leaf-doc layer in the same zh-CN wave means the handbook is now useful\n'
    + 'as an actual navigation system for Chinese-speaking readers instead of\n'
    + 'being a translated front page that mostly links into English-only\n'
    + 'content.\n\n'
    + '**Out of scope (what remains after V2.10.25):**\n\n'
    + '- `docs/RETIRED_AND_LEGACY.md` zh-CN (12.9 KB, low priority).\n'
    + '- Scratch-pad disk cleanup (228 MB, manual).\n'
    + '- Clean build-state reset (~3.4 GB, slow rebuild).\n'
    + '- Screenshot refresh pass (23 preview PNGs).\n'
    + '- Native-speaker polish of the full zh-CN handbook layer.\n';
  fs.writeFileSync(BRANDING, branding, 'utf8');
  console.log('  BRANDING_AND_LICENSE.md updated with V2.10.25');
}

let retired = fs.readFileSync(RETIRED, 'utf8');
if (!retired.includes('V2.10.25')) {
  const anchor = '| Master handbook repair + HANDBOOK.zh-CN.md | `docs/HANDBOOK.md` (REPAIRED), `docs/HANDBOOK.zh-CN.md` (NEW) | **Live, V2.10.24** (1 source repair + 1 new translation + manifest updates) | Repaired real mojibake in the master handbook and restored the misplaced §5.4 block, then added the Simplified Chinese translation of the master handbook index. This turns the handbook layer into a valid English source plus a discoverable zh-CN index before translating the 4 deeper docs under `docs/handbook/`. |';
  const row = '| Handbook zh-CN leaf-doc wave | `docs/handbook/{README,ARCHITECTURE,DEVELOPMENT,OPERATIONS}.zh-CN.md` (NEW) | **Live, V2.10.25** (4 new files + inventory wiring) | Added Simplified Chinese translations for the 4 long-form handbook leaf docs and wired them into `docs/HANDBOOK.zh-CN.md`, `README.i18n.md`, and the top-level README translation pointers. Together with `docs/HANDBOOK.zh-CN.md` from V2.10.24, this completes the zh-CN handbook layer. |';
  if (retired.includes(anchor)) {
    retired = retired.replace(anchor, anchor + '\n' + row);
    fs.writeFileSync(RETIRED, retired, 'utf8');
    console.log('  RETIRED_AND_LEGACY.md updated with V2.10.25');
  }
}
