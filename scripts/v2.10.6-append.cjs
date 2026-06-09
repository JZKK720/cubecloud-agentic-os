// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// scripts/v2.10.6-append.cjs \u2014 append the V2.10.6 README-split
// sub-section to BRANDING_AND_LICENSE.md. The text mentions that
// the README is the one exception to the hardlink layer, so the
// sync-docs.ps1 regen does not need to link it.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BRANDING = path.join(ROOT, 'BRANDING_AND_LICENSE.md');
const BRANDING_INNER = path.join(ROOT, 'agent-desktop', 'BRANDING_AND_LICENSE.md');
const EM = '\u2014';

const v2106 = `

### V2.10.6 ${EM} README split (agentic-OS monorepo vs Electron binary)

The V2.10.1 doc-link layer (11 file hardlinks + 1 directory
junction) covers the governance docs that must be at the inner
location for the Electron build (LICENSE, NOTICE, this BRANDING
file, CONTRIBUTING, ACKNOWLEDGMENTS, docs/HANDBOOK.md,
docs/handbook/*). The README is the **one exception**: the outer
\`README.md\` is the *agentic-OS monorepo README* (scope,
principles, why-this-exists, what makes us different, repo layout)
and the inner \`agent-desktop/README.md\` is the *trimmed
install + features + providers doc* for the binary. They are
deliberately **different files** with **different audiences**;
\`scripts/sync-docs.ps1\` does NOT link them.

The V2.10.6 transition breaks the previously-hardlinked README,
writes a new outer README (18,473 bytes, agentic-OS monorepo
README), and writes a new inner README (8,187 bytes, trimmed
binary doc). The inner cross-links to the outer README and to
the master handbook (\`docs/HANDBOOK.md\`) so neither reader is
stranded.

The V2.10.6 transition also adds two rows to
\`docs/RETIRED_AND_LEGACY.md\`:
- "Outer agentic-OS monorepo README" (live, V2.10.6)
- "Inner Electron binary README" (live, V2.10.6)

So the live / scratch-pad / mirror table now covers the README
split explicitly.

The V2.10.6 transition is the first place where the README
surface matches the V2.10 doc-surface model: the outer repo
owns the *agentic-OS identity* (governance + monorepo README +
HANDBOOK + RETIRED_AND_LEGACY), and the inner mirror owns the
*binary identity* (install + features + providers + i18n). Both
are at the right place, for the right reader.
`;

let src = fs.readFileSync(BRANDING, 'utf8');
if (src.includes('V2.10.6')) {
  console.log('V2.10.6 already in BRANDING; skipping');
} else {
  fs.writeFileSync(BRANDING, src + v2106);
  console.log('BRANDING size now:', fs.statSync(BRANDING).size, 'bytes');
}

// Re-link the inner BRANDING hardlink
console.log('Re-linking inner BRANDING hardlink...');
const stat = fs.statSync(BRANDING_INNER, { throwIfNoEntry: false });
if (stat) {
  fs.unlinkSync(BRANDING_INNER);
}
fs.linkSync ? execSync(`powershell -NoProfile -Command "New-Item -ItemType HardLink -Path '${BRANDING_INNER}' -Target '${BRANDING}' | Out-Null"`) : null;

const oh = execSync(`powershell -NoProfile -Command "(Get-FileHash '${BRANDING}' -Algorithm SHA256).Hash"`, { encoding: 'utf8' }).trim();
const ih = execSync(`powershell -NoProfile -Command "(Get-FileHash '${BRANDING_INNER}' -Algorithm SHA256).Hash"`, { encoding: 'utf8' }).trim();
const ilink = execSync(`powershell -NoProfile -Command "(Get-Item '${BRANDING_INNER}').LinkType"`, { encoding: 'utf8' }).trim();
console.log('  outer hash:', oh.substring(0, 12));
console.log('  inner hash:', ih.substring(0, 12));
console.log('  inner LinkType:', ilink || '(empty = regular file)');
console.log('  same:', oh === ih);

console.log('OK done.');
