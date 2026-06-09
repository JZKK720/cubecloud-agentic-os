// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// scripts/v2.10.10-previews.cjs \u2014 V2.10.10: add agent-desktop/previews/
// to the inner .gitignore. The 23 legacy preview PNGs / WebPs
// (agents.png, chat.png, ..., welcome-remote.png) are still
// referenced by the inherited CJK i18n READMEs (11 references in
// each) but not by the inner English README (V2.10.6 trimmed the
// preview gallery).
//
// The transition is non-destructive: the 23 files stay on disk
// for the i18n galleries; only the .gitignore entry is added so
// future contributors don't accidentally commit new PNGs that
// would then become orphans.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const INNER = path.join(ROOT, 'agent-desktop');
const EM = '\u2014';

const INNER_GITIGNORE = path.join(INNER, '.gitignore');
let innerGi = fs.readFileSync(INNER_GITIGNORE, 'utf8');

const oldBlock = `# Electron packaging artifacts
release/
.claude/worktrees`;
const newBlock = `# Electron packaging artifacts
release/
.claude/worktrees

# V2.10.10: legacy preview captures (23 PNGs / WebPs from the
# inherited hermes-desktop framework). The inner English README
# (V2.10.6) trimmed the preview gallery, but the inherited CJK
# i18n READMEs (README.ja-JP.md, README.zh-CN.md) still reference
# 11 of the 23 files in their preview galleries. Keep the existing
# 23 files on disk so the i18n galleries don't break, but exclude
# the directory from future commits. A screenshot refresh pass
# (tracked in RETIRED_AND_LEGACY.md as a future candidate) would
# regenerate the captures under the Cubecloud brand and the i18n
# galleries would need to be re-pointed at the new files.
previews/`;

if (innerGi.includes('previews/')) {
  console.log('previews/ already in inner .gitignore; skipping');
} else if (!innerGi.includes('# Electron packaging artifacts')) {
  console.error('anchor not found; aborting');
  process.exit(1);
} else {
  innerGi = innerGi.replace(oldBlock, newBlock);
  fs.writeFileSync(INNER_GITIGNORE, innerGi);
  console.log('  appended previews/ to inner .gitignore');
}

// BRANDING V2.10.10 sub-section
const BRANDING = path.join(ROOT, 'BRANDING_AND_LICENSE.md');
const v21010 = `

### V2.10.10 ${EM} inner \`previews/\` \`.gitignore\` (legacy capture policy)

The inner \`agent-desktop/previews/\` directory has 23
PNG / WebP files (\`agents.png\`, \`chat.png\`, \`codegraph.png\`,
\`everos.png\`, \`gateway.png\`, \`headroom.png\`, \`mcp.png\`,
\`memory.png\`, \`models.png\`, \`persona.png\`, \`plans.png\`,
\`providers.png\`, \`schedules.png\`, \`sessions.png\`,
\`settings.png\`, \`skills.png\`, \`tools.png\`, \`welcome-remote.png\`,
plus \`header.webp\` and \`download.webp\`, 2.14 MB total).
These are the **legacy captures** from the inherited
\`hermes-desktop\` framework.

The V2.10.6 transition trimmed the preview gallery from the
inner English \`README.md\` (0 references), so the PNGs are
**orphaned from the inner README**. The inherited CJK
translations (\`README.ja-JP.md\` and \`README.zh-CN.md\`)
**still reference 11 of the 23 files** in their preview
galleries (V2.10.7 preserved the CJK content byte-for-byte);
removing the PNGs would break the i18n galleries.

V2.10.10 closes the loop by adding \`previews/\` to
\`agent-desktop/.gitignore\`. The 23 existing files stay
on disk for the i18n galleries; new PNGs added in the future
will not be committed by default. A future screenshot refresh
pass (tracked in \`docs/RETIRED_AND_LEGACY.md\` as a candidate)
would regenerate the captures under the Cubecloud brand, and
the i18n galleries would need to be re-pointed at the new
files.

The V2.10.10 transition is **non-destructive** (the 23 PNGs
are not deleted) and **cosmetic** (the build is unaffected).
No source code, no \`package.json\`, no
\`scripts/sync-docs.ps1\` changes.
`;

const brandingSrc = fs.readFileSync(BRANDING, 'utf8');
if (!brandingSrc.includes('V2.10.10')) {
  fs.writeFileSync(BRANDING, brandingSrc + v21010);
  console.log('  appended V2.10.10 to BRANDING (now ' + fs.statSync(BRANDING).size + ' bytes)');
} else {
  console.log('  V2.10.10 already in BRANDING; skipping');
}

// Re-link the inner BRANDING hardlink
const BRANDING_INNER = path.join(INNER, 'BRANDING_AND_LICENSE.md');
try { fs.unlinkSync(BRANDING_INNER); } catch (e) { /* ignore */ }
execSync(`powershell -NoProfile -Command "New-Item -ItemType HardLink -Path '${BRANDING_INNER}' -Target '${BRANDING}' | Out-Null"`);
const same = execSync(`powershell -NoProfile -Command "(Get-FileHash '${BRANDING_INNER}' -Algorithm SHA256).Hash -eq (Get-FileHash '${BRANDING}' -Algorithm SHA256).Hash"`, { encoding: 'utf8' }).trim();
console.log('  BRANDING inner re-linked, same content: ' + same);

// RETIRED row
const RETIRED = path.join(ROOT, 'docs', 'RETIRED_AND_LEGACY.md');
const retiredSrc = fs.readFileSync(RETIRED, 'utf8');
const anchor = '| Outer security policy | `SECURITY.md` (outer root) | **Live** (V2.10.8) |';
if (!retiredSrc.includes(anchor)) {
  console.error('anchor not found in RETIRED; aborting');
  process.exit(1);
}
const newRow = `| Legacy preview captures (binary) | \`agent-desktop/previews/*.png\`, \`*.webp\` (23 files, 2.14 MB) | **Scratch-pad, .gitignore'd** (V2.10.10) | The 23 legacy PNG / WebP captures from the inherited hermes-desktop framework. Orphaned from the inner English README (V2.10.6 trimmed the gallery) but still referenced 11x in the inherited CJK i18n READMEs (V2.10.7 preserved the CJK content byte-for-byte). V2.10.10 adds \`previews/\` to \`agent-desktop/.gitignore\`; the 23 files stay on disk for the i18n galleries. A future screenshot refresh pass (regenerate the captures under Cubecloud branding) is the next step. | \`.gitignore\`'d at the inner. Refresh pass is a future candidate. |
`;
const anchorIdx = retiredSrc.indexOf(anchor);
const rowEnd = retiredSrc.indexOf('\n', anchorIdx);
if (rowEnd < 0) {
  console.error('row end not found');
  process.exit(1);
}
const before = retiredSrc.substring(0, rowEnd + 1);
const after = retiredSrc.substring(rowEnd + 1);
const newSrc = before + newRow + after;
fs.writeFileSync(RETIRED, newSrc);
console.log('  appended V2.10.10 row to RETIRED (now ' + newSrc.length + ' bytes)');

console.log('OK done.');
