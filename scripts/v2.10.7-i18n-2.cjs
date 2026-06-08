// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// scripts/v2.10.7-i18n-2.cjs \u2014 V2.10.7 i18n cleanup (Node, UTF-8 safe).
//
// The 4 i18n files in cubecloud-desktop/ (README.ja-JP.md, README.zh-CN.md,
// CONTRIBUTING.ja-JP.md, CONTRIBUTING.zh-CN.md) currently:
//   (1) live only at the inner location, with no outer-root counterparts;
//   (2) still carry the V2-era "Rebrand transition in progress" / "construction in progress" disclaimer;
//   (3) describe the *Electron app*, not the agentic-OS monorepo.
//
// The lowest-risk fix is mechanical:
//   (a) Trim the V2-era disclaimer block from the inner CJK files (Node
//       handles UTF-8 correctly; PowerShell mangles CJK).
//   (b) Add a per-language cross-link header at the top so the reader
//       knows the outer monorepo README + master handbook exist.
//   (c) Add an outer-root i18n manifest (README.i18n.md) so the monorepo
//       has a visible i18n policy.
//   (d) Append a V2.10.7 sub-section to BRANDING_AND_LICENSE.md.
//
// Re-translation of the 4 CJK files is out of scope (would need a native
// Japanese / Chinese speaker). The mechanical pass is safe; the CJK
// content is byte-for-byte preserved except for the V2-era disclaimer
// removal and the cross-link header insertion.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const INNER = path.join(ROOT, 'cubecloud-desktop');
const EM = '\u2014';

// Per-language cross-link header (prepended to the inner file after the
// disclaimer is removed).
const HEADERS = {
  'README.ja-JP.md':
    '> **Cubecloud Agent Desktop \u2014 \u30d0\u30a4\u30ca\u30ea\u30c9\u30ad\u30e3\u3002**\n' +
    '> \u30a8\u30fc\u30b8\u30a7\u30f3\u30c8\u30aa\u30b9\u30e2\u30ce\u30ec\u30dd\u306e README \u306f [\`../README.md\`](../README.md)\u3001\n' +
    '> \u30de\u30b9\u30bf\u30fc\u7d22\u5f15\u306f [\`../docs/HANDBOOK.md\`](../docs/HANDBOOK.md) \u306b\u3042\u308a\u307e\u3059\u3002\n' +
    '> \u8a31\u53ef\u8a8d / \u30d6\u30e9\u30f3\u30c9 / \u30b3\u30f3\u30c8\u30ea\u30d3\u30e5\u30fc\u30b7\u30e7\u30f3\u30dd\u30ea\u30b7\u30fc\u306f [\`../BRANDING_AND_LICENSE.md\`](../BRANDING_AND_LICENSE.md) \u3092\u3054\u89a7\u304f\u3060\u3055\u3044\u3002\n\n',
  'README.zh-CN.md':
    '> **Cubecloud Agent Desktop \u2014 \u4e8c\u8fdb\u5236\u6587\u6863\u3002**\n' +
    '> Agentic-OS \u5355\u4ed3\u7684 README \u5728 [\`../README.md\`](../README.md)\u3001\n' +
    '> \u4e3b\u7d22\u5f15\u5728 [\`../docs/HANDBOOK.md\`](../docs/HANDBOOK.md)\u3002\n' +
    '> \u8bb8\u53ef\u8bc1 / \u54c1\u724c / \u8d21\u732e\u8005\u653f\u7b56\u8be6\u89c1 [\`../BRANDING_AND_LICENSE.md\`](../BRANDING_AND_LICENSE.md)\u3002\n\n',
  'CONTRIBUTING.ja-JP.md':
    '> **Cubecloud Agent Desktop \u2014 \u4e8c\u8fdb\u5236\u6587\u6863\u7684\u8d21\u732e\u8005\u653f\u7b56\u3002**\n' +
    '> \u30a8\u30fc\u30b8\u30a7\u30f3\u30c8\u30aa\u30b9\u30ec\u30d9\u30eb\u306e DCO 1.1 \u30dd\u30ea\u30b7\u30fc\u306f [\`../CONTRIBUTING.md\`](../CONTRIBUTING.md) \u3092\u3054\u89a7\u304f\u3060\u3055\u3044\u3002\n' +
    '> \u30e9\u30a4\u30bb\u30f3\u30b9 / \u30d6\u30e9\u30f3\u30c9 / \u30b9\u30ad\u30eb\u30b3\u30b9\u30b9\u30c6\u30e0\u8a18\u8ff0\u306f [\`../BRANDING_AND_LICENSE.md\`](../BRANDING_AND_LICENSE.md)\u3001[\`../.agents/skills/README.md\`](../.agents/skills/README.md) \u3092\u3054\u89a7\u304f\u3060\u3055\u3044\u3002\n\n',
  'CONTRIBUTING.zh-CN.md':
    '> **Cubecloud Agent Desktop \u2014 \u4e8c\u8fdb\u5236\u6587\u6863\u7684\u8d21\u732e\u8005\u653f\u7b56\u3002**\n' +
    '> \u5355\u4ed3\u7ea7\u522b\u7684 DCO 1.1 \u653f\u7b56\u5728 [\`../CONTRIBUTING.md\`](../CONTRIBUTING.md)\u3002\n' +
    '> \u4e3b\u6e90\u7801\u68c0\u7d22 / \u4e3b\u7d22\u5f15 / \u8bb8\u53ef\u8bc1 \u8f6e\u8bf7\u53c2\u9605 [\`../BRANDING_AND_LICENSE.md\`](../BRANDING_AND_LICENSE.md)\uff1b34 \u4e2a\u6280\u80fd\u751f\u6001\u7cfb\u7edf\u8bf4\u660e\u5728 [\`../.agents/skills/README.md\`](../.agents/skills/README.md)\u3002\n\n',
};

// Remove the V2-era disclaimer block. The disclaimer is the first
// `> **` blockquote (long bold text), followed by 0-2 more `> ` lines,
// followed by a blank line, followed by `## ` heading. We find the
// first `> **` line, then walk forward through `> ` or blank lines
// until we hit a non-`> ` non-blank line. Replace the whole range with
// a single blank line.
function removeDisclaimerBlock(text) {
  const lines = text.split('\n');
  // Find first `> **` line with >= 40 chars of bold content (the
  // disclaimer; badges are short).
  let startLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^>\s*\*\*([^*]{40,})\*\*/);
    if (m) {
      startLine = i;
      break;
    }
  }
  if (startLine < 0) return text;

  // Walk forward to find the end of the blockquote: include the start
  // line plus any continuation `> ` or blank lines, stopping at the
  // first non-`> ` non-blank line.
  let endLine = startLine;
  for (let j = startLine + 1; j < lines.length; j++) {
    const next = lines[j];
    if (next.match(/^## /)) break;
    if (next.match(/^>/) || next.match(/^\s*$/)) {
      endLine = j;
    } else {
      break;
    }
  }

  // Build the new content: lines[0..startLine-1] + '' + lines[endLine+1..]
  const before = lines.slice(0, startLine);
  const after = lines.slice(endLine + 1);
  return before.concat(['']).concat(after).join('\n');
}

function processI18nFile(fileName) {
  const filePath = path.join(INNER, fileName);
  if (!fs.existsSync(filePath)) {
    console.log('  MISSING:', fileName);
    return { changed: false };
  }
  const before = fs.readFileSync(filePath, 'utf8');

  // Step 1: remove the disclaimer block
  let out = removeDisclaimerBlock(before);

  // Step 2: if a header is defined for this file, insert it at the top
  // (after the first blank line, before the first content line).
  const header = HEADERS[fileName];
  if (header) {
    // Find the first non-blank line and insert the header before it.
    const lines = out.split('\n');
    let insertAt = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() !== '') {
        insertAt = i;
        break;
      }
    }
    // Insert header lines at insertAt
    const headerLines = header.split('\n');
    // If the line before insertAt is non-blank, add a blank line for separation
    if (insertAt > 0 && lines[insertAt - 1].trim() !== '') {
      headerLines.push('');
    }
    out = lines.slice(0, insertAt).concat(headerLines).concat(lines.slice(insertAt)).join('\n');
  }

  if (out !== before) {
    fs.writeFileSync(filePath, out);
    return { changed: true, before: before.length, after: out.length };
  }
  return { changed: false, before: before.length, after: before.length };
}

const i18nFiles = Object.keys(HEADERS);
console.log('V2.10.7 i18n cleanup:');
let anyChanged = false;
for (const f of i18nFiles) {
  const r = processI18nFile(f);
  if (r.changed) {
    anyChanged = true;
    console.log('  ' + f + ': ' + r.before + ' -> ' + r.after + ' bytes');
  } else {
    console.log('  ' + f + ': unchanged (' + r.before + ' bytes)');
  }
}

if (!anyChanged) {
  console.log('No changes; aborting.');
  process.exit(0);
}

// Outer i18n manifest
const manifest = `# i18n policy (V2.10.7)

> **Single source of truth for translations.** All Cubecloud Agentic-OS
> translations live in the inner mirror at
> \`cubecloud-desktop/<file>\`. The outer root does not duplicate the
> translated content; instead, this manifest points to each one and
> states its status.

## Current translations

| File | Language | Path | Status | Maintainer |
|---|---|---|---|---|
| README (binary) | English | \`cubecloud-desktop/README.md\` | Live, V2.10.6 | Cubecloud Contributors |
| README (binary) | \u65e5\u672c\u8a9e (ja-JP) | \`cubecloud-desktop/README.ja-JP.md\` | Live, V2.10.7 disclaimer trim | Community |
| README (binary) | \u7b80\u4f53\u4e2d\u6587 (zh-CN) | \`cubecloud-desktop/README.zh-CN.md\` | Live, V2.10.7 disclaimer trim | Community |
| CONTRIBUTING (binary) | English | \`cubecloud-desktop/CONTRIBUTING.md\` | Live, source of truth | Cubecloud Contributors |
| CONTRIBUTING (binary) | \u65e5\u672c\u8a9e (ja-JP) | \`cubecloud-desktop/CONTRIBUTING.ja-JP.md\` | Live, V2.10.7 cross-link only | Community |
| CONTRIBUTING (binary) | \u7b80\u4f53\u4e2d\u6587 (zh-CN) | \`cubecloud-desktop/CONTRIBUTING.zh-CN.md\` | Live, V2.10.7 cross-link only | Community |

## Translation workflow

1. The English file (either \`README.md\` or \`CONTRIBUTING.md\` at the
   outer root) is the **source of truth**.
2. A translation PR opens at the inner location
   (\`cubecloud-desktop/<file>.<lang>.md\`) with the matching language
   code (ja-JP, zh-CN, or a new one).
3. A native speaker in the target language reviews the diff; the PR
   cannot merge without their approval.
4. The translated file is committed at the inner location only; the
   outer manifest at \`README.i18n.md\` is updated to reflect any new
   translation.

## Why not at the outer root?

The outer \`README.md\` and \`CONTRIBUTING.md\` are the **agentic-OS
monorepo** docs. Their translations (if any) would describe the
monorepo, not the binary. As of V2.10.7, the agentic-OS monorepo
content is English-only; community translations of the *binary*
content (which is what the inner i18n files cover) stay at the inner
location.

If the agentic-OS monorepo README ever grows a non-English version,
it would land at the outer root (\`README.ja-JP.md\`,
\`README.zh-CN.md\`) and a new row would be added to the table above
to distinguish "monorepo translations" from "binary translations".

## Out of scope for V2.10.7

- **Re-translation of the 4 CJK files** (would need a native Japanese /
  Chinese speaker; the V2.10.7 transition only does mechanical
  cross-link + disclaimer trim, byte-for-byte preserving the original
  translated content).
- **CJK encoding fix for the inherited CONTRIBUTING.ja-JP.md** (the
  original author used the wrong encoding; the file is mojibake. A
  fresh translation is required to fix it; the V2.10.7 transition
  only adds the cross-link header).
`;

const manifestPath = path.join(ROOT, 'README.i18n.md');
fs.writeFileSync(manifestPath, manifest);
console.log('  wrote outer i18n manifest: ' + manifestPath + ' (' + fs.statSync(manifestPath).size + ' bytes)');

// V2.10.7 sub-section in BRANDING
const BRANDING = path.join(ROOT, 'BRANDING_AND_LICENSE.md');
const v2107 = `

### V2.10.7 ${EM} i18n cleanup (README + CONTRIBUTING \u00d7 4 languages)

The V2.10.6 transition left the 4 i18n files in \`cubecloud-desktop/\`
(\`README.ja-JP.md\`, \`README.zh-CN.md\`, \`CONTRIBUTING.ja-JP.md\`,
\`CONTRIBUTING.zh-CN.md\`) without a counterpart at the outer root.
The CJK files also still carried the V2-era "construction in progress"
disclaimer (or its translation), and they described the *Electron
binary* rather than the *agentic-OS monorepo*.

V2.10.7 is the lowest-risk, mechanical pass:

1. **Inner i18n files**: the V2-era disclaimer block (where present)
   is removed and a per-language cross-link header to the outer
   \`README.md\` and the master handbook is added at the top. The
   original CJK content is **not** re-translated (out of scope; would
   need a native speaker).
2. **Outer i18n manifest** \`README.i18n.md\`: a new file that lists
   the 4 i18n files with their path, language, status, and
   translation workflow. The manifest lives at the outer root so
   contributors can see at a glance which translations exist and
   which are stub-only.
3. **V2.10.7 row in \`docs/RETIRED_AND_LEGACY.md\`**: documents the
   i18n status and the explicit policy that re-translation is
   community-driven, not agent-driven.

The V2.10.7 transition preserves the original CJK content
byte-for-byte (the disclaimer removal + cross-link header insertion
are the only changes). Re-translation is documented in
\`README.i18n.md\` \u00a7"Out of scope for V2.10.7" as a follow-up.
`;

const brandingSrc = fs.readFileSync(BRANDING, 'utf8');
if (!brandingSrc.includes('V2.10.7')) {
  fs.writeFileSync(BRANDING, brandingSrc + v2107);
  console.log('  appended V2.10.7 to BRANDING (now ' + fs.statSync(BRANDING).size + ' bytes)');
} else {
  console.log('  V2.10.7 already in BRANDING; skipping');
}

// Re-link inner BRANDING hardlink
const BRANDING_INNER = path.join(INNER, 'BRANDING_AND_LICENSE.md');
try { fs.unlinkSync(BRANDING_INNER); } catch (e) { /* ignore */ }
execSync(`powershell -NoProfile -Command "New-Item -ItemType HardLink -Path '${BRANDING_INNER}' -Target '${BRANDING}' | Out-Null"`);
const same = execSync(`powershell -NoProfile -Command "(Get-FileHash '${BRANDING_INNER}' -Algorithm SHA256).Hash -eq (Get-FileHash '${BRANDING}' -Algorithm SHA256).Hash"`, { encoding: 'utf8' }).trim();
console.log('  BRANDING inner re-linked, same content: ' + same);

console.log('OK done.');
