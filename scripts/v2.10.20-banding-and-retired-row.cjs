// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// scripts/v2.10.20-banding-and-retired-row.cjs -- append V2.10.20
// to BRANDING and RETIRED. The PDF itself was already rendered by
// v2.10.20-readme-combined-pdf.cjs in the previous step.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BRANDING = path.join(ROOT, 'BRANDING_AND_LICENSE.md');
const RETIRED = path.join(ROOT, 'docs', 'RETIRED_AND_LEGACY.md');
const EM_DASH = String.fromCodePoint(0x2014);
const SECTION_SIGN = String.fromCodePoint(0x00a7);

let branding = fs.readFileSync(BRANDING, 'utf8');
if (branding.includes('## V2.10.20')) {
  console.log('  BRANDING already has V2.10.20; skipping');
} else {
  const block = [
    '',
    '',
    '## V2.10.20 ' + EM_DASH + ' Combined README PDF (English + Simplified Chinese)',
    '',
    '**Scope:** outer monorepo. 1 new file (`docs/Cubecloud-README-',
    'en-zh.pdf`, 1.3 MB, 18 pages) + 1 new script',
    '(`scripts/v2.10.20-readme-combined-pdf.cjs`).',
    '',
    '**What changed (V2.10.20):**',
    '',
    '1. Created `docs/Cubecloud-README-en-zh.pdf` (1,348,750 bytes,',
    '   18 pages, PDF 1.4) by combining the outer `README.md`',
    '   (English) and `README.zh-CN.md` (Simplified Chinese) into',
    '   a single HTML file and rendering with headless Google',
    '   Chrome via `--headless=new --print-to-pdf`. No npm',
    '   install required; Chrome is at the standard Windows path.',
    '2. The PDF opens with the English section (19,270 bytes of',
    '   source, 7 headings, 1 table, 1 fenced code block for the',
    '   repository-layout tree), then a `English ' + EM_DASH + '> Simplified',
    '   Chinese` divider page (CSS `page-break-before: always`),',
    '   then the Simplified Chinese section (10,903 bytes of',
    '   source, 8 headings, 1 table, 1 fenced code block).',
    '3. New script `scripts/v2.10.20-readme-combined-pdf.cjs`',
    '   handles the conversion. It includes a small built-in',
    '   Markdown ' + EM_DASH + '> HTML converter (no `marked` or `markdown-it`',
    '   dependency), GitHub-flavored styling (max-width 900px,',
    '   monospace code blocks, table borders, blockquote rule),',
    '   and the same divider-page CSS as the inner styling. The',
    '   intermediate HTML is written to',
    '   `.review-extras/pdf-build/combined.html` (under the',
    '   V2.10.2-scratch-pad .gitignore).',
    '4. No source code change. No `package.json` /',
    '   `scripts/sync-docs.ps1` / `.gitignore` change. The PDF',
    '   is **tracked** (committed) because the user asked for it',
    '   as a release artifact; if the team wants to exclude it',
    '   from commits, add `docs/*.pdf` to the outer .gitignore.',
    '',
    '**Verification:**',
    '',
    '- File starts with `%PDF-1.4` (valid PDF magic).',
    '- Title metadata reads `Cubecloud Agentic-OS` (UTF-16 BE).',
    '- 18 `/Type /Page` objects (English section ~9 pages,',
    '  divider 1 page, Chinese section ~8 pages).',
    '- `prelaunchSeed.smoke.mjs` still 40/40 PASS (no source',
    '  code touched).',
    '',
    '**Out of scope (V2.10.21+ candidates, unchanged from',
    'V2.10.19):**',
    '',
    '- 4 `docs/handbook/*.md` zh-CN translations (~42 KB).',
    '- `docs/RETIRED_AND_LEGACY.md` zh-CN (12.9 KB, low priority).',
    '- Scratch-pad disk cleanup (228 MB, manual).',
    '- Clean build-state reset (~3.4 GB, slow rebuild).',
    '- Screenshot refresh pass (23 preview PNGs).',
    '- Native-speaker polish of V2.10.16/17/18/19 translations.',
    '- (Re-render this PDF after native-speaker polish.)'
  ];
  branding = branding + block.join('\n') + '\n';
  fs.writeFileSync(BRANDING, branding);
  console.log('  V2.10.20 sub-section appended to BRANDING; size now: ' + fs.statSync(BRANDING).size + ' bytes');
}

let retired = fs.readFileSync(RETIRED, 'utf8');
if (retired.includes('V2.10.20')) {
  console.log('  RETIRED already has V2.10.20; skipping');
} else {
  const lines = retired.split(/\r?\n/);
  let v21019Row = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Outer monorepo THREAT_MODEL.zh-CN.md')) {
      v21019Row = i;
    }
  }
  if (v21019Row < 0) {
    console.error('  RETIRED V2.10.19 row not found; aborting');
    process.exit(1);
  }
  const v21020Row = '| Combined README PDF (English + Simplified Chinese) | `docs/Cubecloud-README-en-zh.pdf` (NEW, 1.3 MB, 18 pages) | **Live, V2.10.20** (1 new file + 1 new script) | Combines the outer `README.md` (English) and `README.zh-CN.md` (Simplified Chinese) into a single PDF rendered with headless Google Chrome via `--print-to-pdf`. Built-in minimal Markdown ' + EM_DASH + '> HTML converter (no npm dependency). Divider page with `page-break-before: always` between sections. Intermediate HTML written to `.review-extras/pdf-build/combined.html` (scratch-pad). Tracked as a release artifact; the team can `gitignore` it if undesired. |';
  lines.splice(v21019Row + 1, 0, v21020Row);
  retired = lines.join('\n');
  fs.writeFileSync(RETIRED, retired);
  console.log('  V2.10.20 row inserted after V2.10.19 in RETIRED; size now: ' + fs.statSync(RETIRED).size + ' bytes');
}
