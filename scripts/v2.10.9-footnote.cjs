// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// scripts/v2.10.9-footnote.cjs \u2014 V2.10.9: fix the V2.10.5
// "11 doc files" footnote in BRANDING_AND_LICENSE.md. After
// V2.10.6 + V2.10.7 + V2.10.8, the count is no longer 11. This
// is a 30-second text fix: update the count and add a pointer
// to the V2.10.6 sub-section that documents the README exception
// and the V2.10.8 sub-section that documents the security-docs
// move.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BRANDING = path.join(ROOT, 'BRANDING_AND_LICENSE.md');
const EM = '\u2014';

let src = fs.readFileSync(BRANDING, 'utf8');

const oldBullet = "- Inner \`agent-desktop/\` lost its *primary* copies of 11 doc files\n  + 1 legal dir; the inner paths are now Windows-native hardlinks /\n  junctions pointing back to the outer root.";
const newBullet = "- Inner \`agent-desktop/\` lost its *primary* copies of **14 doc\n  files** (LICENSE, NOTICE, BRANDING_AND_LICENSE, CONTRIBUTING,\n  ACKNOWLEDGMENTS, THREAT_MODEL, SECURITY, README.i18n, plus\n  docs/HANDBOOK + 4 docs/handbook/*) + 1 legal dir; the inner paths\n  are now Windows-native hardlinks / junctions pointing back to the\n  outer root. README.md is the **intentional exception** (see\n  V2.10.6 below) and 4 i18n files (README.ja-JP/zh-CN +\n  CONTRIBUTING.ja-JP/zh-CN) live only at the inner location (see\n  V2.10.7 below). \`scripts/sync-docs.ps1\` is the idempotent regen\n  script; it has 14 hardlink entries + 1 outer-only + 4 inner-only\n  and runs through 8 phases.";

if (!src.includes(oldBullet)) {
  console.error('old bullet not found verbatim; aborting');
  process.exit(1);
}

const v2109Note = `

### V2.10.9 ${EM} V2.10.5 footnote fix (count + README/i18n exception)

The V2.10.5 "Summary of the V2.10 diff" sub-section claimed
\`agent-desktop/\` lost its *primary* copies of "11 doc files + 1
legal dir". That was true at V2.10.5; the count grew in V2.10.6
(README became an intentional different-file, not a hardlink) +
V2.10.7 (4 inner-only i18n files) + V2.10.8 (THREAT_MODEL + SECURITY
joined the hardlink layer). V2.10.9 fixes the count to **14 doc
files** + 1 legal dir, and adds a pointer to V2.10.6 + V2.10.7
so a reader of the V2.10.5 summary knows where the
README-exception + i18n-only rules live.

The V2.10.9 fix is a **30-second text edit**; no source code, no
SPDX headers, no \`package.json\`, no \`scripts/sync-docs.ps1\`
changes. The \`scripts/sync-docs.ps1\` regen is unaffected.
`;

src = src.replace(oldBullet, newBullet);
if (!src.includes('V2.10.9')) {
  src = src + v2109Note;
}
fs.writeFileSync(BRANDING, src);

console.log('BRANDING now ' + fs.statSync(BRANDING).size + ' bytes');

// Re-link inner BRANDING hardlink
const BRANDING_INNER = path.join(ROOT, 'agent-desktop', 'BRANDING_AND_LICENSE.md');
try { fs.unlinkSync(BRANDING_INNER); } catch (e) { /* ignore */ }
execSync(`powershell -NoProfile -Command "New-Item -ItemType HardLink -Path '${BRANDING_INNER}' -Target '${BRANDING}' | Out-Null"`);
const same = execSync(`powershell -NoProfile -Command "(Get-FileHash '${BRANDING_INNER}' -Algorithm SHA256).Hash -eq (Get-FileHash '${BRANDING}' -Algorithm SHA256).Hash"`, { encoding: 'utf8' }).trim();
console.log('BRANDING inner re-linked, same content: ' + same);

console.log('OK done.');
