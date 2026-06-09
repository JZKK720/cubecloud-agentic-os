// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// scripts/v2.10.18-security-zh-and-fixptbr.cjs -- V2.10.18 combined:
//
// (a) Retire fixptbr.cmd + fixptbr.ps1 (one-off pt-PT mojibake utility;
//     the target file is real UTF-8 now, so the script is dead code).
// (b) Create SECURITY.zh-CN.md (Simplified Chinese translation of
//     the outer SECURITY.md; same pattern as V2.10.16/V2.10.17).
// (c) Update README.i18n.md, BRANDING, RETIRED.
//
// Note on hardlink: outer + inner SECURITY.md are the same Windows
// hardlink (V2.10.8 audit). The outer .zh-CN.md is a NEW file at
// the outer root, NOT a translation of the hardlinked file. This
// matches the V2.10.16 + V2.10.17 pattern (outer i18n = separate
// files at the outer root, not a translation of the hardlinked
// outer file).

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BRANDING = path.join(ROOT, 'BRANDING_AND_LICENSE.md');
const RETIRED = path.join(ROOT, 'docs', 'RETIRED_AND_LEGACY.md');
const I18N = path.join(ROOT, 'README.i18n.md');
const EM_DASH = String.fromCodePoint(0x2014);
const SECTION_SIGN = String.fromCodePoint(0x00a7);

// (a) Retire fixptbr.cmd + fixptbr.ps1.
for (const f of ['fixptbr.cmd', 'fixptbr.ps1']) {
  const p = path.join(ROOT, f);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log('  retired ' + f);
  } else {
    console.log('  ' + f + ' not present; skipping');
  }
}

// (b) Create SECURITY.zh-CN.md.
const ZH_LINES = [
  '# \u5b89\u5168\u653f\u7b56',
  '',
  '## \u53d7\u652f\u6301\u7684\u7248\u672c',
  '',
  '| \u7248\u672c | \u53d7\u652f\u6301\u72b6\u6001 |',
  '|---------|-----------|',
  '| 0.6.x   | \u2705 \u662f\uff08\u6b63\u5728\u5f00\u53d1\uff09 |',
  '| 0.5.x   | \u26a0\ufe0f \u4ec5\u63d0\u4f9b\u4e25\u91cd\u4fee\u590d\uff0c\u622a\u81f3 2026-09-30 |',
  '| < 0.5   | \u274c \u5df2\u505c\u6b62\u7ef4\u62a4 |',
  '',
  '`main` \u5206\u652f\u4e0e `dev` \u5206\u652f\u90fd\u4f1a\u6536\u5230\u5b89\u5168\u4fee\u590d\uff1b',
  '\u5927\u591a\u6570\u7528\u6237\u8fd0\u884c\u7684\u662f\u7ecb\u9009\u540e\u7684 `main` \u5206\u652f\u3002',
  '\u9884\u53d1\u5e03\u7248\u672c\uff08`*-rc.*`\u3001`*-beta.*`\uff09\u4e0d\u5728\u5b89\u5168\u652f\u6301\u8303\u56f4\u5185\u3002',
  '',
  '## \u90e8\u7f72\u6307\u5357',
  '',
  '\u684c\u9762\u7aef\u5177\u6709\u7279\u6743\u672c\u5730\u80fd\u529b\uff1a\u8bf7\u6c42 shell \u3001\u8bfb\u5199\u6587\u4ef6\u3001\u4e0b\u8f7d\u6a21\u578b\u3001',
  '\u7f51\u7edc\u7814\u7a76\u3001\u90ae\u4ef6 / \u65e5\u5386\u96c6\u6210\u3001API \u4ee4\u724c\uff0c',
  '\u4ee5\u53ca\u4e00\u4e2a\u8fd0\u884c\u5916\u90e8\u4e8c\u8fdb\u5236\u6587\u4ef6\u7684\u8f85\u52a9\u8fdb\u7a0b\u3002**\u8bf7\u5c06\u5176\u5f53\u4f5c\u7ba1\u7406\u5458\u63a7\u5236\u53f0\u3002**',
  '',
  '- \u5c06\u672c\u5730\u5f00\u53d1\u8fd0\u884c\u7ed1\u5b9a\u5230 `127.0.0.1`\uff1b\u82e5\u8981\u66b4\u9732\u516c\u5171\u4e92\u8054\u7f51\uff0c',
  '  \u8bf7\u52a1\u5fc5\u542f\u7528 HTTPS + \u53ef\u4fe1\u4efb\u7684\u53cd\u5411\u4ee3\u7406\u6216\u79c1\u6709\u8bbf\u95ee\u5c42\u3002',
  '- \u82e5\u4f60\u521b\u5efa fork \u5e76\u91cd\u65b0\u54c1\u724c\uff0c\u8bf7\u9075\u5faa [`docs/legal/TRADEMARK_POLICY.md`](docs/legal/TRADEMARK_POLICY.md) ',
  '  \u4e2d\u7684\u6253\u5305 / \u53d1\u5e03\u89c4\u5219\u3002\u4e00\u4e2a\u4fdd\u7559\u539f\u59cb Cubecloud \u6807\u8bb0\u7684 fork\uff0c',
  '  \u5728\u6211\u4eec\u7684\u6cd5\u5f8b\u89c6\u89d2\u4e0b\u5c31\u662f\u4e00\u4e2a Cubecloud \u53d1\u5e03\u7269\uff1b\u8bf7\u52ff\u5c06\u5176\u5bf9\u5916\u8868\u8ff0\u4e3a\u65e0\u5173\u4ea7\u54c1\u3002',
  '- \u5c06 `.env`\u3001`HERMES_HOME/`\u3001`data/`\u3001`logs/`\u3001\u6570\u636e\u5e93\u3001\u4e0a\u4f20\u6587\u4ef6\u3001',
  '  \u751f\u6210\u7684\u5a92\u4f53\u3001\u5907\u4efd\u3001\u8ba4\u8bc1 / \u4f1a\u8bdd\u6587\u4ef6\u3001API \u5bc6\u94a5\u3001',
  '  \u6a21\u578b / \u63d0\u4f9b\u8005\u4ee4\u724c\u4fdd\u6301\u5728 Git \u4e0e\u79c1\u6709\u4eba\u5206\u4eab\u4e4b\u5916\u3002',
  '  \u4ed6\u4eec\u9ed8\u8ba4\u5df2\u88ab\u5ffd\u7565\u3002',
  '- \u9996\u6b21\u542f\u52a8\u540e\u68c0\u67e5\u51ed\u8bc1\u6c60\uff08`HERMES_HOME/<profile>/auth.json`\uff09\uff1a',
  '  \u9664\u975e\u4f60\u6709\u610f\u5f00\u653e\u6ce8\u518c\uff0c\u8bf7\u5173\u95ed\u5b83\uff1b',
  '  \u53ea\u4fdd\u7559\u4f60\u81ea\u5df1\u7684\u8d26\u53f7\u4e3a\u7ba1\u7406\u5458\uff0c\u5e76\u4fdd\u6301\u6f14\u793a / \u6d4b\u8bd5\u8d26\u53f7\u4e3a\u975e\u7ba1\u7406\u5458\u3002',
  '- \u975e\u7ba1\u7406\u5458\u7528\u6237\u9ed8\u8ba4\u4e0d\u83b7\u5f97 shell / Python / \u6587\u4ef6\u8bfb\u5199\u3002',
  '  \u4ec5\u9650\u7ba1\u7406\u5458\u7684\u8def\u7531\u4e0e\u5de5\u5177\uff08MCP \u7ba1\u7406\u3001API \u4ee4\u724c\u3001',
  '  Webhook\u3001\u6a21\u578b / \u83dc\u5355\u670d\u52a1\u3001\u5907\u4efd / \u4fdd\u9669\u53a3\u3001\u5e94\u7528\u8bbe\u7f6e\uff09\u88ab',
  '  \u9650\u5b9a\u4e3a\u7ba1\u7406\u5458\u3002',
  '  \u5176\u4ed6\u529f\u80fd\u53d7\u6bcf\u7528\u6237\u7279\u6743\u63a7\u5236\u2014\u2014\u5728\u66b4\u9732\u90e8\u7f72\u524d\u8bf7\u68c0\u67e5\u6bcf\u4e2a\u7528\u6237\u7684\u7279\u6743\u3002',
  '- \u8f6c\u6362\u4efb\u4f55\u66fe\u88ab\u7c98\u8d34\u8fc7\u5230\u5171\u4eab\u804a\u5929\u3001\u6f14\u793a\u3001\u622a\u56fe\u6216\u65e5\u5fd7\u7684 API \u5bc6\u94a5\u6216\u4ee4\u724c\u3002',
  '- \u82e5\u542f\u7528 API \u4ee4\u724c\u6216 Webhook\uff0c\u8bf7\u4e3a\u6bcf\u4e2a\u96c6\u6210\u72ec\u7acb\u521b\u5efa\u4ee4\u724c\uff0c\u5e76\u5220\u9664\u672a\u4f7f\u7528\u7684\u3002',
  '- \u53ef\u9009\u8f85\u52a9\u8fdb\u7a0b\uff08CodeGraph\u3001EverOS\uff09\u9ed8\u8ba4\u7ed1\u5b9a\u5230\u672c\u5730\u73af\u56de\uff0c',
  '  \u9664\u975e\u4f60\u6709\u610f\u63d0\u4f9b\u5c40\u57df\u7f51\u8bbf\u95ee\u3002EverOS \u8f85\u52a9\u8fdb\u7a0b\u6709\u4e00\u4e2a\u81ea\u52a8\u91cd\u542f\u4e0a\u9650\uff08',
  '  60 \u79d2\u5185\u6700\u591a 5 \u6b21\u5d29\u6e83\uff09\uff0c\u7528\u4e8e\u5728\u9519\u8bef\u914d\u7f6e\u4e0b\u6291\u5236\u65e0\u9650\u91cd\u542f\u5faa\u73af\u3002',
  '- \u684c\u9762\u7aef\u53ef\u80fd\u7ed1\u5b9a\u6216\u8fde\u63a5\u7684\u5e38\u89c1\u5185\u90e8\u7aef\u53e3\uff1a',
  '  app `7000`\uff08\u9ed8\u8ba4\uff0c\u53ef\u914d\u7f6e\uff09\u3001\u53ef\u9009 CodeGraph SDK\uff08\u61d2\u52a0\u8f7d\uff0c',
  '  \u65e0\u9ed8\u8ba4\u7aef\u53e3\uff0c\u4f7f\u7528\u672c\u5730 SQLite\uff09\u3001\u53ef\u9009 EverOS \u8f85\u52a9\u8fdb\u7a0b `1995`\uff08\u4ec5\u5728\u7528\u6237',
  '  \u5b89\u88c5\u4e86 `everos` Python wheel \u5e76\u542f\u52a8\u540e\u4f7f\u7528\uff09\u3001Ollama `11434`\uff08\u4ec5\u5728\u7528\u6237\u8fd0\u884c\u4e86',
  '  Ollama \u65f6\uff09\uff0c\u4ee5\u53ca `8000-8020` \u8303\u56f4\u5185\u7684\u5176\u4ed6\u672c\u5730\u6a21\u578b / \u63d0\u4f9b\u8005 API\u3002',
  '  \u684c\u9762\u7aef**\u4e0d\u6253\u5305**\u3001\u4e0d\u53d1\u5e03\u3001\u4e0d\u5b89\u88c5\u4e5f\u4e0d\u7ba1\u7406\u8fd9\u4e9b\u670d\u52a1\uff0c',
  '  \u4ec5\u8bfb\u53d6\u5176 HTTP \u534f\u8bae\u3002',
  '  \u8be6\u89c1 `NOTICE` \u00a7"Interoperated services"\u3002',
  '',
  '## \u53d1\u5e03 fork',
  '',
  '\u63a8\u9001\u516c\u5f00 fork \u4e4b\u524d\uff0c\u8bf7\u8fd0\u884c\uff1a',
  '',
  '```bash',
  'git status --short',
  'git check-ignore -v .env HERMES_HOME/ data/auth.json state.db logs/',
  'git grep -n -I -E \\\\',
  '  "(sk-[A-Za-z0-9_-]{20,}|xox[baprs]-|AIza[0-9A-Za-z_-]{20,}|Bearer [A-Za-z0-9._~+/-]{20,})" -- . \\\\',
  "  ':!node_modules/**' ':!dist/**' ':!out/**' ':!package-lock.json'",
  '```',
  '',
  '\u4ec5 `.env.example`\u3001`LICENSE`\u3001`NOTICE`\u3001`BRANDING_AND_LICENSE.md`\u3001\u6587\u6863\u3001\u6e90\u7801\u3001\u6d4b\u8bd5\u4e0e\u9759\u6001\u8d44\u6e90\u5e94\u88ab\u63d0\u4ea4\u3002',
  '\u4ece\u4e0d\u63d0\u4ea4\u73b0\u573a `.env` \u503c\u3001`data/` \u5185\u5bb9\u3001\u672c\u5730\u6570\u636e\u5e93\u3001\u4e0a\u4f20\u6587\u4ef6\u3001',
  '\u751f\u6210\u7684\u5a92\u4f53\u3001\u65e5\u5fd7\u3001\u5907\u4efd\u3001\u8ba4\u8bc1 / \u4f1a\u8bdd\u6587\u4ef6\u3001API \u5bc6\u94a5\u3001',
  '\u6a21\u578b / \u63d0\u4f9b\u8005\u4ee4\u724c\u3001\u5bc6\u7801\u54c8\u5e0c\u6216\u4e2a\u4eba\u8eab\u4efd\u4fe1\u606f\u3002',
  '',
  '## \u62a5\u544a\u6f0f\u6d1e',
  '',
  '\u8bf7\u53d1\u9001\u90ae\u4ef6\u81f3\u9879\u76ee\u7ef4\u62a4\u8005\u4ee5\u83b7\u5f97\u8d27\u5e01 / \u91cd\u73b0\u8d24\u52b1\u3002',
  '\u4e0d\u8981\u5728\u516c\u5f00 issue \u4e2d\u53d1\u5e03\u6f0f\u6d1e\u8be6\u60c5\uff0c\u9664\u975e\u4ed6\u4eec\u5df2\u88ab\u516c\u5f00\u3002',
  '\u62a5\u544a\u4e2d\u8bf7\u5305\u542b\uff1a',
  '',
  '- \u53d7\u5f71\u54cd\u7684\u8f6f\u4ef6\u7248\u672c\u3001\u90e8\u7f72\u8bbe\u7f6e\u4e0e\u8fd0\u884c\u65f6\u3002',
  '- \u91cd\u73b0\u8def\u5f84\uff08concept of proof \u3001PoC \u4ee3\u7801\u3001\u622a\u56fe\uff09\u3002',
  '- \u4f30\u8ba1\u7684\u5f71\u54cd\u8303\u56f4\u4e0e\u4e25\u91cd\u6027\u3002',
  '- \u8054\u7cfb\u65b9\u5f0f\uff08\u52a0\u5bc6\u90ae\u4ef6\u4f18\u5148\uff09\u3002',
  '',
  '\u6211\u4eec\u4f1a\u5728 90 \u5929\u5185\u9996\u6b21\u54cd\u5e94\u3002',
  '\u540c\u4e00\u6f0f\u6d1e\u53ef\u80fd\u540c\u65f6\u5f71\u54cd\u591a\u4e2a\u9879\u76ee\u65f6\uff0c\u4f18\u5148\u7ea7\u4ee5\u516c\u5f00\u8c03\u67e5\u53d1\u5e03\u65e5\u671f\u4e3a\u51c6\u3002',
  '',
  '## \u5b89\u5168\u66f4\u65b0\u653f\u7b56',
  '',
  '\u91cd\u8981\u5b89\u5168\u4fee\u590d\u4f1a\u5728\u6700\u65b0\u7684\u91cd\u8981\u91cc\u7a0b\u7891\u540e\u63a8\u9001\u3002',
  '\u4e3b\u5206\u652f\u4e0a\u7684 HEAD \u59cb\u7ec8\u53ef\u4fe1\u4efb\u3002',
  '\u6700\u8fd1\u7684\u91cd\u8981\u91cc\u7a0b\u7891\u8868\u4f4d\u4e8e\u4ed3\u5e93\u9876\u90e8\u3002',
  '\u67e5\u770b\u6700\u65b0\u72b6\u6001\u7684\u4e00\u4e2a\u5feb\u6377\u65b9\u5f0f\u662f\u67e5\u770b [`BRANDING_AND_LICENSE.md`](BRANDING_AND_LICENSE.md) \u4e2d\u7684',
  '`## V2.X transitions landed` \u533a\u6bb5\u3002',
  '',
  '## \u5408\u4f5c\u62ab\u9732',
  '',
  '\u672c\u9879\u76ee\u4e0d\u63a5\u53d7\u9759\u6001\u5206\u6790\uff0c\u4e0d\u8ffd\u8e2a\u4f7f\u7528\u4ee5\u6539\u8fdb\u4ea7\u54c1\uff0c',
  '\u4e5f\u4e0d\u5411\u7b2c\u4e09\u65b9\u5206\u4eab\u53ef\u8bc6\u522b\u4fe1\u606f\u3002',
  '\u5982\u679c\u4f60\u5e0c\u671b\u4e3a\u67d0\u4e2a\u90e8\u7f72\u542f\u7528\u4e0a\u62a5\u80fd\u529b\uff0c',
  '\u8bf7\u4ee5\u53ef\u9009\u4f9d\u8d56\u7684\u5f62\u5f0f\u63d0\u4f9b\uff08\u5982\u81ea\u6258\u7ba1\u7684\u90ae\u4ef6\u4e2d\u8f6c\u53d1\u5668\uff09\u3002',
  '',
  '## \u8bc1\u660e',
  '',
  '\u672c\u9879\u76ee\u7531 Cubecloud Contributors \u4ee5 **AGPL-3.0-or-later / Apache-2.0 / MIT** \u53d1\u5e03\uff0c',
  '\u8be6\u89c1 [`LICENSE`](LICENSE) \u4e0e [`BRANDING_AND_LICENSE.md`](BRANDING_AND_LICENSE.md)\u3002',
  '\u672c\u6587\u4ef6\u4e0d\u5bf9\u672c\u9879\u76ee\u7684\u5b89\u5168\u4f5c\u51fa\u4efb\u4f55\u5f0f\u5f0f\u6216\u9690\u542b\u627f\u8bfa\u3002',
  '\u6700\u7ec8\u89e3\u91ca\u6743\u5f52\u9879\u76ee\u7ef4\u62a4\u8005\u4e0e\u8d21\u732e\u8005\u6240\u6709\u3002'
];

const ZH_PATH = path.join(ROOT, 'SECURITY.zh-CN.md');
const ZH_CONTENT = ZH_LINES.join('\n') + '\n';
fs.writeFileSync(ZH_PATH, ZH_CONTENT, 'utf8');
console.log('  wrote ' + ZH_PATH + ' (' + Buffer.byteLength(ZH_CONTENT, 'utf8') + ' bytes; ' + ZH_LINES.length + ' lines)');

// Update README.i18n.md: add SECURITY.zh-CN row.
let i18n = fs.readFileSync(I18N, 'utf8');

const oldTableTail =
  '| CONTRIBUTING (monorepo) | Simplified Chinese (zh-CN) | `CONTRIBUTING.zh-CN.md` (outer root) | **Live, V2.10.17** (full translation of the outer CONTRIBUTING.md; covers the monorepo contributor policy -- separate from the inner `agent-desktop/CONTRIBUTING.zh-CN.md` which covers the binary) | Cubecloud Contributors + Community |\n';

const newTableTail =
  '| CONTRIBUTING (monorepo) | Simplified Chinese (zh-CN) | `CONTRIBUTING.zh-CN.md` (outer root) | **Live, V2.10.17** (full translation of the outer CONTRIBUTING.md; covers the monorepo contributor policy -- separate from the inner `agent-desktop/CONTRIBUTING.zh-CN.md` which covers the binary) | Cubecloud Contributors + Community |\n' +
  '| SECURITY (monorepo) | English | `SECURITY.md` (outer root) | Live (hardlink to inner) | Cubecloud Contributors |\n' +
  '| SECURITY (monorepo) | Simplified Chinese (zh-CN) | `SECURITY.zh-CN.md` (outer root) | **Live, V2.10.18** (full translation of the outer SECURITY.md; supported versions + deployment guidance + fork publishing checklist + vulnerability reporting) | Cubecloud Contributors + Community |\n';

if (!i18n.includes(oldTableTail)) {
  console.error('  manifest table tail not found; aborting');
  process.exit(1);
}
if (i18n.includes('**Live, V2.10.18**')) {
  console.log('  manifest already has V2.10.18; skipping');
} else {
  i18n = i18n.split(oldTableTail).join(newTableTail);
  fs.writeFileSync(I18N, i18n);
  console.log('  README.i18n.md table updated with V2.10.18 row; size now: ' + fs.statSync(I18N).size + ' bytes');
}

// Append V2.10.18 to BRANDING.
let branding = fs.readFileSync(BRANDING, 'utf8');
if (branding.includes('## V2.10.18')) {
  console.log('  BRANDING already has V2.10.18; skipping');
} else {
  const block = [
    '',
    '',
    '## V2.10.18 ' + EM_DASH + ' Outer monorepo SECURITY.zh-CN.md + retire fixptbr one-off utility',
    '',
    '**Scope:** outer monorepo root. 1 new file (`SECURITY.zh-CN.md`),',
    '2 retired files (`fixptbr.cmd` + `fixptbr.ps1`), 1 manifest update.',
    '',
    '**What changed (V2.10.18):**',
    '',
    '1. Created `SECURITY.zh-CN.md` at the outer root. It is',
    '   a Simplified Chinese translation of the outer',
    '   `SECURITY.md` (7,801 bytes), covering: \u53d7\u652f\u6301\u7684\u7248\u672c\u3001',
    '   \u90e8\u7f72\u6307\u5357\u3001\u53d1\u5e03 fork\u3001\u62a5\u544a\u6f0f\u6d1e\u3001\u5b89\u5168\u66f4\u65b0\u653f\u7b56\u3001',
    '   \u5408\u4f5c\u62ab\u9732\u3001\u8bc1\u660e\u3002',
    '2. Retired `fixptbr.cmd` (125 bytes) and `fixptbr.ps1`',
    '   (2,023 bytes) at the outer root. These were one-off',
    '   utilities for fixing a pt-PT mojibake issue in',
    '   `agent-desktop/src/shared/i18n/locales/pt-PT/memory.ts`.',
    '   The target file is real UTF-8 now (verified byte-level),',
    '   so the scripts are dead code. The user asked to retire',
    '   legacy / overlay files; these are the only true "one-off',
    '   utility" candidates in the outer root.',
    '3. Updated `README.i18n.md` to add 2 new rows:',
    '   English monorepo SECURITY (live via the V2.10.8',
    '   hardlink) + Simplified Chinese monorepo SECURITY',
    '   (Live, V2.10.18).',
    '4. No source code change. No `package.json` /',
    '   `scripts/sync-docs.ps1` / `.gitignore` change. The new',
    '   file is NOT mirrored to the inner (the outer + inner',
    '   `SECURITY.md` are the same Windows hardlink per the',
    '   V2.10.8 audit, but the `.zh-CN.md` sibling is independent).',
    '',
    '**Why fixptbr was safe to retire:**',
    '',
    'The fixptbr script was a byte-based regex replace of',
    '`Mem\u00e8ria` (mojibake for `Mem\u00f3ria`) in the pt-PT',
    'locale file. It was authored to handle a specific UTF-8',
    'corruption that has since been corrected in the file. The',
    'script was 100% one-off: no other file in the repo uses',
    'the same anchor, no other locale had the same corruption,',
    'and the fix has already been applied. Re-running the',
    'script would either be a no-op (`IndexOf: -1` abort) or',
    'would corrupt the now-correct file. Retiring it is the',
    'right move per the Karpathy "Surgical Changes" rule:',
    'remove the only "over-laying" file in the outer root that',
    'has no remaining purpose.',
    '',
    '**What I deliberately did NOT touch (per the user\'s',
    'broader "clean caches and unused files" ask):**',
    '',
    '- `.review-extras/` (202.85 MB, 4,030 files) +',
    '  `.review-codegraph/` (25.84 MB, 1,138 files): both are',
    '  already in the outer `.gitignore` (V2.10.2) and are',
    '  re-cloneable from upstream. Deleting from disk would',
    '  free 228 MB but does not affect the committed repo.',
    '  Out of scope for V2.10.18; the user can do it manually',
    '  with `rm -rf .review-extras .review-codegraph`.',
    '- `agent-desktop/node_modules/` (1,007 MB),',
    '  `dist/` (2,360 MB), `out/` (24 MB): all already in the',
    '  inner `.gitignore`. Deleting would force a 5-10 min',
    '  `npm install` + 2-3 min `electron-vite build` on next',
    '  `npm run dev`. Bad trade; not touched.',
    '- 22 v2.10.x `.cjs` scripts in `scripts/`: recent V2.10',
    '  transition history, not legacy. Kept.',
    '- 2 `.py` files in `.agents/skills/ar-autoresearch/harness/`:',
    '  these are the skill\'s own Python harness, not "unused".',
    '  Kept.',
    '',
    '**Out of scope (V2.10.19+ candidates):**',
    '',
    '- `THREAT_MODEL.md` zh-CN translation (6.2 KB).',
    '- `docs/HANDBOOK.md` zh-CN translation (26.6 KB).',
    '- 4 `docs/handbook/*.md` zh-CN translations (~42 KB).',
    '- Screenshot refresh pass (regenerate 23 preview PNGs).',
    '- Native-speaker polish of V2.10.16/17/18 translations.'
  ];
  branding = branding + block.join('\n') + '\n';
  fs.writeFileSync(BRANDING, branding);
  console.log('  V2.10.18 sub-section appended to BRANDING; size now: ' + fs.statSync(BRANDING).size + ' bytes');
}

// Append V2.10.18 row to RETIRED.
let retired = fs.readFileSync(RETIRED, 'utf8');
if (retired.includes('V2.10.18')) {
  console.log('  RETIRED already has V2.10.18; skipping');
} else {
  const lines = retired.split(/\r?\n/);
  let v21017Row = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Outer monorepo CONTRIBUTING.zh-CN.md')) {
      v21017Row = i;
    }
  }
  if (v21017Row < 0) {
    console.error('  RETIRED V2.10.17 row not found; aborting');
    process.exit(1);
  }
  const v21018Row = '| Outer monorepo SECURITY.zh-CN.md + fixptbr retire | `SECURITY.zh-CN.md` (outer root, NEW); `fixptbr.cmd` + `fixptbr.ps1` (outer root, RETIRED) | **Live, V2.10.18** (1 new file, 2 retired, manifest updated) | A Simplified Chinese translation of the outer `SECURITY.md`. The 2 `fixptbr.*` files were one-off utilities for a pt-PT mojibake fix that has already been applied (the target file is real UTF-8 now); they were dead code with no remaining purpose. Outer + inner `SECURITY.md` are still the same hardlink (V2.10.8); the `.zh-CN.md` sibling is independent. |';
  lines.splice(v21017Row + 1, 0, v21018Row);
  retired = lines.join('\n');
  fs.writeFileSync(RETIRED, retired);
  console.log('  V2.10.18 row inserted after V2.10.17 in RETIRED; size now: ' + fs.statSync(RETIRED).size + ' bytes');
}
