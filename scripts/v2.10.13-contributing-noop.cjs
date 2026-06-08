// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// scripts/v2.10.13-contributing-noop.cjs -- document the V2.10.13
// decision. After auditing the outer and inner CONTRIBUTING.md, both
// are the same Windows hardlink (8,935 bytes, 17 headings) -- so the
// "missing cross-link" gap identified in the V2.10.12 closeout is a
// false positive. The shared file already covers DCO, i18n policy,
// License, Community, Reporting Vulnerabilities, and Acknowledgments.
//
// Per the Karpathy "simplicity first" rule, V2.10.13 is a deliberate
// no-op. We document the decision in BRANDING_AND_LICENSE.md and
// docs/RETIRED_AND_LEGACY.md so a future maintainer does not
// re-flag this candidate.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BRANDING = path.join(ROOT, 'BRANDING_AND_LICENSE.md');
const RETIRED = path.join(ROOT, 'docs', 'RETIRED_AND_LEGACY.md');

const v21013BlockLines = [
  '',
  '',
  '## V2.10.13 -- Inner CONTRIBUTING cross-links: deliberate no-op',
  '',
  '**Outcome:** no source change. Decision documented here and in',
  '`docs/RETIRED_AND_LEGACY.md` so a future maintainer does not',
  're-flag this candidate.',
  '',
  '**Audit (V2.10.13, before this transition):**',
  '',
  'The V2.10.12 closeout listed "Inner CONTRIBUTING cross-links',
  '(V2.10.13)" as a candidate, on the assumption that the inner',
  '`CONTRIBUTING.md` was a separate file that needed cross-links to',
  'the outer `CONTRIBUTING.md` + DCO + i18n policy.',
  '',
  'A fresh audit (`fsutil hardlink list`) shows the inner and outer',
  '`CONTRIBUTING.md` are the **same Windows hardlink** (8,935 bytes,',
  '17 headings, same inode). The V2.10.1 hardlink layer (8-file set:',
  'LICENSE, NOTICE, BRANDING, CONTRIBUTING, ACKNOWLEDGMENTS,',
  'THREAT_MODEL, SECURITY, README.i18n) was preserved by V2.10.6;',
  'the README split in V2.10.6 was an intentional exception, not a',
  'precedent for splitting CONTRIBUTING.',
  '',
  'The shared `CONTRIBUTING.md` already covers:',
  '',
  '- `## Languages` (the i18n policy).',
  '- `## Developer Certificate of Origin (DCO)` (the DCO contract).',
  '- `## License` (the dual-license + DCO rationale).',
  '- `## Community` (channels, code of conduct).',
  '- `## Reporting Vulnerabilities` (links to SECURITY.md).',
  '- `## Acknowledgments` (links to ACKNOWLEDGMENTS.md + NOTICE).',
  '',
  'So the "missing cross-link" gap is a false positive. There is no',
  'outer-vs-inner drift to repair because there is no outer-vs-inner',
  'distinction for this file.',
  '',
  '**Why not split the hardlink (the V2.10.6-README precedent)?**',
  '',
  'V2.10.6 broke the README hardlink because the outer monorepo',
  'README and the inner binary README have **different audiences**',
  '(agentic-OS maintainers vs. Electron binary end-users) and',
  'genuinely different content. CONTRIBUTING has the **same',
  'audience** (contributors) and the **same content** needs',
  '(DCO sign-off, i18n policy, code style, reporting channels).',
  'Splitting would just create two files that say the same thing,',
  'and a future maintainer would have to remember to keep them in',
  'sync. That is the anti-pattern the V2.10.1 hardlink layer was',
  'designed to avoid.',
  '',
  '**What this transition does:**',
  '',
  '1. Adds this `## V2.10.13` sub-section to BRANDING (so the',
  '   no-op is recorded in the per-version transition history).',
  '2. Adds a V2.10.13 row to RETIRED_AND_LEGACY (so the next',
  '   maintainer does not re-flag this candidate).',
  '3. Touches no source file. No CONTRIBUTING, no',
  '   sync-docs.ps1, no .gitignore, no scripts/.',
  '',
  '**Next candidate:** `docs/handbook/` refresh (V2.10.14) --',
  'read-through + V2.6+ integration pass. Touches 4 files.',
  'The 4 outer-handbook files (ARCHITECTURE, DEVELOPMENT,',
  'OPERATIONS, README) were moved via hardlink in V2.10.1, but',
  'their content might be V2.4-era and not V2.6+ aware. A',
  'read-through to surface any stale references to V2.4-era',
  'infrastructure (pre-CodeGraph, pre-EverOS, pre-ACP) is the',
  'natural next step.'
];

let branding = fs.readFileSync(BRANDING, 'utf8');
if (branding.includes('## V2.10.13')) {
  console.log('  BRANDING already has V2.10.13; skipping');
} else {
  branding = branding + v21013BlockLines.join('\n') + '\n';
  fs.writeFileSync(BRANDING, branding);
  console.log('  V2.10.13 no-op sub-section appended to BRANDING; size now:', fs.statSync(BRANDING).size, 'bytes');
}

let retired = fs.readFileSync(RETIRED, 'utf8');
if (retired.includes('V2.10.13')) {
  console.log('  RETIRED already has V2.10.13; skipping');
} else {
  const lines = retired.split(/\r?\n/);
  let v21012Row = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('| Outer monorepo README i18n pointer |')) {
      v21012Row = i;
    }
  }
  if (v21012Row < 0) {
    console.error('RETIRED V2.10.12 row not found; aborting');
    process.exit(1);
  }
  const v21013Row = '| Inner CONTRIBUTING cross-links | `CONTRIBUTING.md` (outer + inner) | **Hardlink, no change** (V2.10.13 no-op) | The V2.10.12 closeout listed this as a candidate, but `fsutil hardlink list` shows outer + inner `CONTRIBUTING.md` are the same Windows hardlink (8,935 bytes, 17 headings). The shared file already covers DCO, i18n policy, License, Community, Reporting Vulnerabilities, and Acknowledgments -- so the "missing cross-link" gap is a false positive. V2.10.13 is a deliberate no-op; this row records the decision so a future maintainer does not re-flag it. |';
  lines.splice(v21012Row + 1, 0, v21013Row);
  retired = lines.join('\n');
  fs.writeFileSync(RETIRED, retired);
  console.log('  V2.10.13 row inserted after V2.10.12 row in RETIRED; size now:', fs.statSync(RETIRED).size, 'bytes');
}
