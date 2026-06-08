// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// scripts/v2.10.12-readme-i18n-pointer.cjs -- add a one-paragraph
// "Translations" pointer to the outer README.md that points at
// README.i18n.md (the manifest). The pointer is the only outer-root
// README change; the manifest itself is the source of truth for which
// languages exist, where they live, and who maintains them.
//
// Implementation note: we build the new section as a list of
// single-quoted string fragments joined with "\n", because the
// section contains backticks that would otherwise close a template
// literal early. \u00a7 is the section sign used by README.i18n.md.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const README = path.join(ROOT, 'README.md');
const BRANDING = path.join(ROOT, 'BRANDING_AND_LICENSE.md');
const RETIRED = path.join(ROOT, 'docs', 'RETIRED_AND_LEGACY.md');

// Section sign character; we use the literal UTF-8 source char rather
// than a \uXXXX escape so the create_file path does not double-decode.
const SECTION_SIGN = '§';

const sectionLines = [
  '',
  '',
  '## Translations',
  '',
  'The agentic-OS monorepo docs (this `README.md`, the',
  '[`docs/HANDBOOK.md`](docs/HANDBOOK.md), and',
  '[`CONTRIBUTING.md`](CONTRIBUTING.md)) are **English-only** as of',
  'V2.10.7. The single source of truth for translations is the',
  'manifest at [`README.i18n.md`](README.i18n.md), which lists every',
  'translated file, its language, its status, and its maintainer.',
  '',
  'Translated content that describes the **binary**',
  '(`cubecloud-desktop/README.md`, `CONTRIBUTING.md`) lives at the',
  'inner location (`cubecloud-desktop/README.<lang>.md` and',
  '`CONTRIBUTING.<lang>.md`); the manifest distinguishes',
  '"monorepo translations" (none yet) from "binary translations" (4',
  'community-maintained CJK files). If you want to add a translation',
  'of the monorepo README, follow the workflow in `README.i18n.md`',
  SECTION_SIGN + ' "Translation workflow".',
  ''
];

let readme = fs.readFileSync(README, 'utf8');
if (readme.includes('## Translations')) {
  console.log('  outer README already has ## Translations; skipping');
} else {
  readme = readme + sectionLines.join('\n');
  fs.writeFileSync(README, readme);
  console.log('  ## Translations section appended to outer README; size now:', fs.statSync(README).size, 'bytes');
}

const v21012BlockLines = [
  '',
  '',
  '## V2.10.12 \u2014 Outer README `## Translations` pointer to README.i18n.md',
  '',
  '**Scope:** outer monorepo `README.md` only.',
  '',
  '**Why this is the right next V2.10.x step:**',
  '',
  'The V2.10.7 transition created `README.i18n.md` (the manifest)',
  'and moved the 4 CJK translations to the inner location. The',
  'manifest is the single source of truth for "which language',
  'exists, where it lives, who maintains it" -- but the outer',
  '`README.md` (the V2.10.6 monorepo README) never linked to it.',
  'A reader landing on the outer README would have to discover',
  'the manifest by reading the directory listing or the file',
  'tree in the `## Repository layout` section.',
  '',
  'V2.10.12 closes that gap with a 1-paragraph `## Translations`',
  'section that points at `README.i18n.md` and explains the',
  '"monorepo translations vs. binary translations" distinction.',
  '',
  '**Changes:**',
  '',
  '1. Added a new `## Translations` section to outer',
  '   `README.md` (after the existing `## Contributing`',
  '   section). The section is 3 short paragraphs, no rule',
  '   change, no file addition.',
  '2. The manifest at `README.i18n.md` is **unchanged** (it is',
  '   the source of truth; the README is just a pointer).',
  '',
  '**What is deliberately out of scope (V2.10.12 is the lowest-risk',
  'option among the 5 remaining candidates):**',
  '',
  '- **Outer README translation stubs** (e.g., `README.ja-JP.md`,',
  '  `README.zh-CN.md`): would need a native-speaker translator',
  '  to author. The manifest\'s "Why not at the outer root?"',
  '  section already documents this constraint.',
  '- **Inner `CONTRIBUTING.md` cross-links** to outer',
  '  `CONTRIBUTING.md` + DCO + i18n policy: V2.10.13.',
  '- **`docs/handbook/` refresh**: V2.10.14 (read-through +',
  '  V2.6+ integration).',
  '- **Screenshot refresh pass**: regenerates the 23 legacy',
  '  `previews/` PNGs under Cubecloud branding.',
  '- **i18n encoding fix for the inherited',
  '  `CONTRIBUTING.ja-JP.md`**: mojibake; needs a fresh',
  '  translation.',
  ''
];

let branding = fs.readFileSync(BRANDING, 'utf8');
if (branding.includes('## V2.10.12')) {
  console.log('  BRANDING already has V2.10.12; skipping');
} else {
  branding = branding + v21012BlockLines.join('\n');
  fs.writeFileSync(BRANDING, branding);
  console.log('  V2.10.12 sub-section appended to BRANDING; size now:', fs.statSync(BRANDING).size, 'bytes');
}

let retired = fs.readFileSync(RETIRED, 'utf8');
if (retired.includes('V2.10.12')) {
  console.log('  RETIRED already has V2.10.12; skipping');
} else {
  const lines = retired.split(/\r?\n/);
  let v21011Row = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('| Legacy legal-doc cross-link |')) {
      v21011Row = i;
    }
  }
  if (v21011Row < 0) {
    console.error('RETIRED V2.10.11 row not found; aborting');
    process.exit(1);
  }
  const v21012Row = '| Outer monorepo README i18n pointer | `README.md` (outer root) | **Live + pointer** (V2.10.12) | A 1-paragraph `## Translations` section was added to the outer monorepo README, pointing at `README.i18n.md` (the V2.10.7 manifest). The manifest is unchanged; the README is the pointer. No rule change, no file addition. |';
  lines.splice(v21011Row + 1, 0, v21012Row);
  retired = lines.join('\n');
  fs.writeFileSync(RETIRED, retired);
  console.log('  V2.10.12 row inserted after V2.10.11 row in RETIRED; size now:', fs.statSync(RETIRED).size, 'bytes');
}
