// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// scripts/v2.10.12-em-dash-fix.cjs -- repair 12 em-dash corruptions
// in BRANDING_AND_LICENSE.md. All V2.10.x sub-section headers were
// written via earlier .cjs scripts whose template literals used
// '\u2014' (em-dash). The C# create_file path in the host environment
// double-decoded those escapes, producing U+9225 U+003F instead of
// U+2014 U+0020. This script walks every line and replaces the
// known mojibake pattern with the correct em-dash + space.
//
// Note: we use string.prototype.split().join() rather than regex
// because the U+003F char is the regex metacharacter '?', which
// would need careful escaping and is fragile in transit.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BRANDING = path.join(ROOT, 'BRANDING_AND_LICENSE.md');

// Build the mojibake char by code point to avoid create_file escape
// re-interpretation. U+9225 = e9 88 a5 (CJK), U+003F = 3f ('?').
const MOJIBAKE = String.fromCodePoint(0x9225) + String.fromCodePoint(0x003F);
const EM_DASH_SPACE = String.fromCodePoint(0x2014) + ' ';

console.log('  MOJIBAKE bytes:', Buffer.from(MOJIBAKE).toString('hex'));
console.log('  EM_DASH_SPACE bytes:', Buffer.from(EM_DASH_SPACE).toString('hex'));

let content = fs.readFileSync(BRANDING, 'utf8');
const before = content.split(MOJIBAKE).length - 1;
console.log('  mojibake occurrences before fix:', before);

content = content.split(MOJIBAKE).join(EM_DASH_SPACE);

const after = content.split(MOJIBAKE).length - 1;
console.log('  mojibake occurrences after fix:', after);

const emDash = content.split(EM_DASH_SPACE).length - 1;
console.log('  em-dash+space count after fix:', emDash);

fs.writeFileSync(BRANDING, content);
console.log('  BRANDING size now:', fs.statSync(BRANDING).size, 'bytes');
