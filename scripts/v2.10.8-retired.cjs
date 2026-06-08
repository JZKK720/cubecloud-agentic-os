// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// scripts/v2.10.8-retired.cjs \u2014 append the V2.10.8 rows to
// docs/RETIRED_AND_LEGACY.md. Inserts after the V2.10.7
// "Inner i18n files" row.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RETIRED = path.join(ROOT, 'docs', 'RETIRED_AND_LEGACY.md');

const newRows = `| Outer threat model | \`THREAT_MODEL.md\` (outer root) | **Live** (V2.10.8) | The threat model for the agentic-OS monorepo + the Electron binary. Authored at the inner location during the V2.4 addendum, updated through V2.6 to cover the CodeGraph + EverOS surface area. V2.10.8 moved it to the outer root; the inner location is re-created as a hardlink via \`scripts/sync-docs.ps1\` (for THREAT_MODEL.md, which is in the 8-file hardlink set: LICENSE, NOTICE, BRANDING, CONTRIBUTING, ACKNOWLEDGMENTS, THREAT_MODEL, SECURITY, README.i18n). | Keep. Already V2.6+ aware; no content edit needed at the move. |
| Outer security policy | \`SECURITY.md\` (outer root) | **Live** (V2.10.8) | The security policy: supported versions, deployment guidance, vulnerability reporting. Paired with THREAT_MODEL.md (each cross-references the other). V2.10.8 moved it to the outer root; the inner location is a hardlink. The supported-versions table is updated as part of the release flow. | Keep. |
`;

let src = fs.readFileSync(RETIRED, 'utf8');

const anchor = '| Inner i18n files (binary translations) |';
if (!src.includes(anchor)) {
  console.error('anchor not found');
  process.exit(1);
}

const anchorIdx = src.indexOf(anchor);
// Find end of the row that contains the anchor
const rowEnd = src.indexOf('\n', anchorIdx);
if (rowEnd < 0) {
  console.error('row end not found');
  process.exit(1);
}

const before = src.substring(0, rowEnd + 1);
const after = src.substring(rowEnd + 1);
const newSrc = before + newRows + after;
fs.writeFileSync(RETIRED, newSrc);
console.log('OK wrote ' + newSrc.length + ' bytes to ' + RETIRED);

const verify = fs.readFileSync(RETIRED, 'utf8');
const secCount = (verify.match(/V2\.10\.8/g) || []).length;
console.log('  V2.10.8 mentions in RETIRED: ' + secCount);
