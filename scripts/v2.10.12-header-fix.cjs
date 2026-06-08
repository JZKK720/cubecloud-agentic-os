// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// scripts/v2.10.12-header-fix.cjs -- fix the V2.10.12 BRANDING
// header to use a real em-dash instead of the ASCII '--' fallback.

const fs = require('fs');
const path = require('path');

const BRANDING = path.join(__dirname, '..', 'BRANDING_AND_LICENSE.md');
let content = fs.readFileSync(BRANDING, 'utf8');

const EM_DASH = String.fromCodePoint(0x2014);
const oldHeader = '## V2.10.12 -- Outer README ';
const newHeader = '## V2.10.12 ' + EM_DASH + ' Outer README ';

if (content.includes(oldHeader)) {
  content = content.split(oldHeader).join(newHeader);
  fs.writeFileSync(BRANDING, content);
  console.log('  V2.10.12 header fixed; em-dash substituted');
} else if (content.includes(newHeader)) {
  console.log('  V2.10.12 header already has em-dash; no change');
} else {
  console.error('V2.10.12 header not found in expected form; aborting');
  process.exit(1);
}
