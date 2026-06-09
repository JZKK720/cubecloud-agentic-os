// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// scripts/v2.10.7-retired.cjs \u2014 append the V2.10.7 i18n rows to
// docs/RETIRED_AND_LEGACY.md. Mechanical insertion after the V2.10.6
// "Inner Electron binary README" row.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RETIRED = path.join(ROOT, 'docs', 'RETIRED_AND_LEGACY.md');

const newRows = `| Outer i18n manifest | \`README.i18n.md\` (outer root) | **Live** (V2.10.7) | The single source of truth for translations. Lists the 4 i18n files with path, language, status, maintainer, and the translation workflow. As of V2.10.7, the agentic-OS monorepo README is English-only; community translations of the *binary* content (which is what the inner i18n files cover) stay at the inner location. | Keep. Re-translation is community-driven, see \`README.i18n.md\` \u00a7"Out of scope for V2.10.7". |
| Inner i18n files (binary translations) | \`agent-desktop/README.ja-JP.md\`, \`agent-desktop/README.zh-CN.md\`, \`agent-desktop/CONTRIBUTING.ja-JP.md\`, \`agent-desktop/CONTRIBUTING.zh-CN.md\` | **Live** (V2.10.7 disclaimer trim) | The 4 community translations of the binary's install + features doc. V2.10.7 mechanically removed the V2-era "construction in progress" disclaimer block (or its translation) and prepended a per-language cross-link header to the outer monorepo README + master handbook. The CJK content is **not** re-translated in V2.10.7 (would need a native Japanese / Chinese speaker); the original translated content is byte-for-byte preserved except for the disclaimer removal + cross-link header. | Keep. Re-translation is a follow-up. The V2.10.7 cross-link header tells the reader where the monorepo README + master handbook live. |
`;

let src = fs.readFileSync(RETIRED, 'utf8');

// Anchor: the V2.10.6 "Inner Electron binary README" row.
const anchor = '| Inner Electron binary README | `agent-desktop/README.md` | **Live** (V2.10.6) |';
if (!src.includes(anchor)) {
  console.error('anchor not found');
  process.exit(1);
}

// Find the end of that row (the next newline after the row's closing `|`).
const anchorIdx = src.indexOf(anchor);
const rowEnd = src.indexOf('\n', anchorIdx);
if (rowEnd < 0) {
  console.error('row end not found');
  process.exit(1);
}

// Insert the new rows immediately after the V2.10.6 row.
const before = src.substring(0, rowEnd + 1);
const after = src.substring(rowEnd + 1);
const newSrc = before + newRows + after;
fs.writeFileSync(RETIRED, newSrc);
console.log('OK wrote ' + newSrc.length + ' bytes to ' + RETIRED);

// Verify
const verify = fs.readFileSync(RETIRED, 'utf8');
const newRowCount = (verify.match(/V2\.10\.7/g) || []).length;
console.log('  V2.10.7 mentions in RETIRED: ' + newRowCount);
