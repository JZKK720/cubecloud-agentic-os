// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// scripts/v2.10.15-retired-row.cjs -- add the V2.10.15 row to
// RETIRED_AND_LEGACY.md. The previous V2.10.15 script aborted at
// this step because the V2.10.14 row hadn't been written yet
// (V2.10.14 was the next transition in the cadence but the user
// pivoted to the i18n work first). Now that V2.10.14 is in, this
// script can finish the V2.10.15 RETIRED step.

const fs = require('fs');
const path = require('path');

const RETIRED = path.join(__dirname, '..', 'docs', 'RETIRED_AND_LGACY.md'.replace('_LGACY', '_LEGACY'));

let c = fs.readFileSync(RETIRED, 'utf8');
if (c.includes('V2.10.15')) {
  console.log('V2.10.15 already in RETIRED; skipping');
  process.exit(0);
}

const lines = c.split(/\r?\n/);
let v21014Row = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('docs/handbook/') && lines[i].includes('refresh')) {
    v21014Row = i;
  }
}
if (v21014Row < 0) {
  console.error('V2.10.14 row not found; aborting');
  process.exit(1);
}

const v21015Row = [
  '| Outer monorepo README i18n stubs',
  '| `README.ja-JP.md`, `README.zh-CN.md`, `README.ko-KR.md` (outer root)',
  '| **Live + placeholder, V2.10.15** (3 new files + manifest update)',
  '| 3 placeholder files added at the outer root so non-English readers see "this exists in your language too" before discovering the inner-binary translations. Each is a 1-paragraph stub (not a translation); a native speaker can fork + translate + open a PR per the `README.i18n.md` workflow. Korean (`ko-KR`) is the first time the language appears in the manifest (inner has no `ko-KR` files yet). The `README.i18n.md` table was updated to add 4 rows (English monorepo + 3 placeholder rows) and the Korean language entry. |'
].join(' | ');

lines.splice(v21014Row + 1, 0, v21015Row);
c = lines.join('\n');
fs.writeFileSync(RETIRED, c);
console.log('V2.10.15 row inserted after V2.10.14; size now:', fs.statSync(RETIRED).size, 'bytes');
