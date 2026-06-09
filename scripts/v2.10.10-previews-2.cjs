// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// scripts/v2.10.10-previews-2.cjs \u2014 fix the .gitignore insertion
// from v2.10.10-previews.cjs. The first run had a CRLF + trailing
// slash mismatch on the anchor.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INNER_GITIGNORE = path.join(ROOT, 'agent-desktop', '.gitignore');

let gi = fs.readFileSync(INNER_GITIGNORE, 'utf8');

// Use line-based search instead of literal string match. The file
// has CRLF line endings; the script's literal anchor didn't match
// because the second occurrence in the file is `.claude/` with a
// trailing slash, not `.claude/worktrees`.
const lines = gi.split(/\r?\n/);
let newLines = [];
let inserted = false;
for (let i = 0; i < lines.length; i++) {
  newLines.push(lines[i]);
  if (!inserted && lines[i].trim() === '.claude/worktrees') {
    // Insert the previews/ entry on the next line
    newLines.push('');
    newLines.push('# V2.10.10: legacy preview captures (23 PNGs / WebPs from the');
    newLines.push('# inherited hermes-desktop framework). The inner English README');
    newLines.push('# (V2.10.6) trimmed the preview gallery, but the inherited CJK');
    newLines.push('# i18n READMEs (README.ja-JP.md, README.zh-CN.md) still reference');
    newLines.push('# 11 of the 23 files in their preview galleries. Keep the existing');
    newLines.push('# 23 files on disk so the i18n galleries don\'t break, but exclude');
    newLines.push('# the directory from future commits. A screenshot refresh pass');
    newLines.push('# (tracked in RETIRED_AND_LEGACY.md as a future candidate) would');
    newLines.push('# regenerate the captures under the Cubecloud brand and the i18n');
    newLines.push('# galleries would need to be re-pointed at the new files.');
    newLines.push('previews/');
    inserted = true;
  }
}

if (!inserted) {
  console.error('anchor not found; aborting');
  process.exit(1);
}

const newContent = newLines.join('\r\n');
fs.writeFileSync(INNER_GITIGNORE, newContent);
console.log('  previews/ entry inserted into inner .gitignore');
console.log('  file size now:', fs.statSync(INNER_GITIGNORE).size, 'bytes');

// Verify
const verify = fs.readFileSync(INNER_GITIGNORE, 'utf8');
const previewsCount = (verify.match(/previews\//g) || []).length;
const v21010Count = (verify.match(/V2\.10\.10/g) || []).length;
console.log('  previews/ count:', previewsCount);
console.log('  V2.10.10 count:', v21010Count);
