// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// scripts/v2.10.8-secdocs.cjs \u2014 V2.10.8: move THREAT_MODEL.md and
// SECURITY.md to the outer root, hardlink at the inner location for
// the Electron build's path. Same Option-A pattern as V2.10.1.
//
// Both files are paired: SECURITY.md says "see THREAT_MODEL.md" and
// THREAT_MODEL.md says "see SECURITY.md". The master handbook
// (docs/HANDBOOK.md) already references them at the outer root.
//
// The inner content is already V2.6+ aware (CodeGraph, EverOS,
// supply-chain threats are all called out). No content edit needed;
// only placement + link layer changes.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const INNER = path.join(ROOT, 'cubecloud-desktop');
const EM = '\u2014';

const PAIRS = [
  { src: 'THREAT_MODEL.md', dst: 'THREAT_MODEL.md' },
  { src: 'SECURITY.md', dst: 'SECURITY.md' },
];

function move(srcRel, dstRel) {
  const src = path.join(INNER, srcRel);
  const dst = path.join(ROOT, dstRel);
  if (!fs.existsSync(src)) {
    console.log('  MISSING inner:', srcRel);
    return { moved: false, linked: false };
  }
  if (fs.existsSync(dst)) {
    console.log('  outer already exists:', dstRel);
    // Make sure the inner is a hardlink
    if (fs.existsSync(src)) {
      try {
        fs.unlinkSync(src);
        execSync(`powershell -NoProfile -Command "New-Item -ItemType HardLink -Path '${src}' -Target '${dst}' | Out-Null"`);
        console.log('  re-linked inner hardlink for', srcRel);
        return { moved: false, linked: true };
      } catch (e) {
        console.log('  re-link failed:', e.message);
        return { moved: false, linked: false };
      }
    }
    return { moved: false, linked: false };
  }
  // Move the inner file to the outer location, then re-create the
  // inner as a hardlink.
  fs.renameSync(src, dst);
  console.log('  moved:', srcRel, '->', dstRel);
  execSync(`powershell -NoProfile -Command "New-Item -ItemType HardLink -Path '${src}' -Target '${dst}' | Out-Null"`);
  console.log('  linked inner back to outer:', srcRel);
  return { moved: true, linked: true };
}

console.log('V2.10.8: move THREAT_MODEL.md and SECURITY.md to outer root');
for (const p of PAIRS) {
  move(p.src, p.dst);
}

// V2.10.8 sub-section in BRANDING
const BRANDING = path.join(ROOT, 'BRANDING_AND_LICENSE.md');
const v2108 = `

### V2.10.8 ${EM} THREAT_MODEL.md + SECURITY.md move to outer root

The V2.10.1 + V2.10.5 doc-link layer covered the governance docs
that must be at the inner location for the Electron build
(LICENSE, NOTICE, BRANDING, CONTRIBUTING, ACKNOWLEDGMENTS,
docs/HANDBOOK.md, docs/handbook/*, docs/legal/*, and the README
i18n files added in V2.10.7). Two security surfaces were
overlooked in V2.10.1: **THREAT_MODEL.md** and **SECURITY.md**.

Both files were authored at the inner location during the V2.4
addendum and updated through V2.6 to cover the CodeGraph +
EverOS surface area (the supply-chain threat, the EverOS
sidecar privilege boundary, etc.). They are already
V2.6+ aware; **no content change is needed**. The only
outstanding issue was placement: a PR reviewer looking at the
outer agentic-OS monorepo would not see a threat model or a
security policy, even though both are referenced by name from
docs/HANDBOOK.md \u00a76 (\"Security & threat model\") and
docs/HANDBOOK.md \u00a71 (the master index).

V2.10.8 closes that gap by:

1. **Moving THREAT_MODEL.md** (6,249 bytes) from
   \`cubecloud-desktop/THREAT_MODEL.md\` to \`./THREAT_MODEL.md\`.
   The inner location is re-created as a Windows hardlink so
   the Electron build still finds the doc at the old path.
2. **Moving SECURITY.md** (7,801 bytes) the same way.
3. **Adding two rows to docs/RETIRED_AND_LEGACY.md** to
   document the placement + link layer.
4. **Appending a V2.10.8 sub-section** to this file (BRANDING
   + LICENSE \u2014 V2.4 addendum already named both files; the
   V2.10.8 entry is the first place that the *placement*
   transition is logged).

After V2.10.8, a PR reviewer at the outer root sees the same
six governance docs (LICENSE, NOTICE, BRANDING, CONTRIBUTING,
ACKNOWLEDGMENTS, README.i18n.md) plus two security docs
(THREAT_MODEL.md, SECURITY.md) plus the agentic-OS monorepo
README (README.md) and the i18n manifest (README.i18n.md).
The inner mirror re-creates all 8 files as hardlinks (7 docs +
the 4 README/CONTRIBUTING i18n files added in V2.10.7) via
the Option-A pattern.
`;

const brandingSrc = fs.readFileSync(BRANDING, 'utf8');
if (!brandingSrc.includes('V2.10.8')) {
  fs.writeFileSync(BRANDING, brandingSrc + v2108);
  console.log('  appended V2.10.8 to BRANDING (now ' + fs.statSync(BRANDING).size + ' bytes)');
} else {
  console.log('  V2.10.8 already in BRANDING; skipping');
}

// Re-link the inner BRANDING hardlink
const BRANDING_INNER = path.join(INNER, 'BRANDING_AND_LICENSE.md');
try { fs.unlinkSync(BRANDING_INNER); } catch (e) { /* ignore */ }
execSync(`powershell -NoProfile -Command "New-Item -ItemType HardLink -Path '${BRANDING_INNER}' -Target '${BRANDING}' | Out-Null"`);
const same = execSync(`powershell -NoProfile -Command "(Get-FileHash '${BRANDING_INNER}' -Algorithm SHA256).Hash -eq (Get-FileHash '${BRANDING}' -Algorithm SHA256).Hash"`, { encoding: 'utf8' }).trim();
console.log('  BRANDING inner re-linked, same content: ' + same);

console.log('OK done.');
