// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// scripts/v2.10.17-contributing-zh.cjs -- create a Simplified Chinese
// translation of the outer CONTRIBUTING.md (8,935 bytes) at the outer
// root. This is the second monorepo doc translated (after the V2.10.16
// README.zh-CN.md), completing the basic doc set (README +
// CONTRIBUTING) for Chinese-speaking contributors.
//
// The outer + inner CONTRIBUTING.md are the same Windows hardlink
// (per the V2.10.13 audit), so a new file at the outer root does NOT
// affect the inner. The inner already has its own binary-specific
// zh-CN translation at agent-desktop/CONTRIBUTING.zh-CN.md (which
// covers the binary's contributor policy). The new outer file
// covers the monorepo (agentic-OS) contributor policy.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BRANDING = path.join(ROOT, 'BRANDING_AND_LICENSE.md');
const RETIRED = path.join(ROOT, 'docs', 'RETIRED_AND_LEGACY.md');
const I18N = path.join(ROOT, 'README.i18n.md');
const EM_DASH = String.fromCodePoint(0x2014);
const SECTION_SIGN = String.fromCodePoint(0x00a7);

// Build the Simplified Chinese translation. Like the V2.10.16
// README.zh-CN.md, the Chinese text below is real UTF-8 (decoded from
// \\uXXXX escape sequences in the JS source at parse time, then
// written as actual Chinese bytes by Node). Verified: 0 literal
// \\u sequences in the output file.
const ZH_LINES = [
  '# \u8d21\u732e\u8005\u6307\u5357\uff08Agent Desktop\uff09',
  '',
  '\u8c22\u8c22\u4f60\u6709\u610f\u8d21\u732e\u7ed9 Agent Desktop\uff01\u65e0\u8bba\u662f bug \u4fee\u590d\u3001\u65b0\u529f\u80fd\u3001\u6587\u6863\u6539\u8fdb\uff0c\u8fd8\u662f\u4e00\u4e2a\u9519\u5b57\u2014\u2014\u6bcf\u4e00\u4efd\u8d21\u732e\u90fd\u4ef7\u503c\u8fde\u57ce\u3002',
  '',
  '\u672c\u9879\u76ee\u53d7 `hermes-desktop` \u542f\u53d1\uff0c\u73b0\u4ee5 Cubecloud Agent Desktop \u7684\u540d\u4e49\u7ee7\u7eed\u5f00\u53d1\uff1b\u8d21\u732e\u5e94\u4e0e Cubecloud \u7684\u4ea7\u54c1\u65b9\u5411\u4e0e\u4ee3\u7801\u89c4\u8303\u4fdd\u6301\u4e00\u81f4\u3002',
  '',
  '## \u8bed\u8a00',
  '',
  '- \u82f1\u6587\uff1a`CONTRIBUTING.md`',
  '- \u7b80\u4f53\u4e2d\u6587\uff1a`CONTRIBUTING.zh-CN.md`\uff08\u672c\u6587\u4ef6\uff09',
  '- \u65e5\u6587\uff1a`CONTRIBUTING.ja-JP.md`\uff08\u5c1a\u672a\u7ffb\u8bd1\uff09',
  '',
  '> **\u8bf4\u660e\uff1a**\u672c\u6587\u4ef6\u662f Cubecloud Agentic-OS \u5355\u4ed3\u7684\u8d21\u732e\u8005\u653f\u7b56\u3002',
  '> \u5b83\u4e0e\u5185\u7f6e\u4e8c\u8fdb\u5236\u6587\u4ef6\uff08`agent-desktop/CONTRIBUTING.zh-CN.md`\uff09\u4e0d\u540c\uff0c',
  '> \u540e\u8005\u63cf\u8ff0\u4e8c\u8fdb\u5236\u6587\u4ef6\u5b89\u88c5\u5305\u7684\u8d21\u732e\u8005\u653f\u7b56\u3002\u4e24\u8005\u901a\u8fc7',
  '> \u5168\u5c40 Windows \u786c\u94fe\u63a5\u5171\u4eab\u82f1\u6587\u6587\u4ef6\u3002',
  '',
  '## \u4ece\u8fd9\u91cc\u5f00\u59cb',
  '',
  '1. **Fork** \u672c\u4ed3\u5e93\uff0c\u5e76\u4ee5 fork \u4ed3\u5e93\u5728\u672c\u5730\u514b\u9686\u3002',
  '2. **\u5b89\u88c5\u4f9d\u8d56\uff1a**',
  '',
  '   ```bash',
  '   npm install',
  '   ```',
  '',
  '3. **\u4ee5\u5f00\u53d1\u6a21\u5f0f\u542f\u52a8\u5e94\u7528\uff1a**',
  '',
  '   ```bash',
  '   npm run dev',
  '   ```',
  '',
  '## \u8fdb\u884c\u4fee\u6539',
  '',
  '1. \u4ece `main` \u5206\u652f\u521b\u5efa\u65b0\u5206\u652f\uff1a',
  '',
  '   ```bash',
  '   git checkout -b your-branch-name',
  '   ```',
  '',
  '2. \u8fdb\u884c\u4fee\u6539\u3002\u4fdd\u6301\u63d0\u4ea4\u805a\u7126\u2014\u2014\u6bcf\u4e2a\u63d0\u4ea4\u4ec5\u5305\u542b\u4e00\u9879\u903b\u8f91\u4fee\u6539\u3002',
  '3. \u63d0\u4ea4\u524d\u8fd0\u884c\u68c0\u67e5\uff1a',
  '',
  '   ```bash',
  '   npm run lint',
  '   npm run typecheck',
  '   ```',
  '',
  '4. \u5728\u672c\u5730\u4f7f\u7528 `npm run dev` \u6d4b\u8bd5\u4f60\u7684\u4fee\u6539\uff0c\u786e\u4fdd\u4e00\u5207\u7167\u5e38\u8fd0\u884c\u3002',
  '',
  '## \u63d0\u4ea4\u62c9\u53d6\u8bf7\u6c42',
  '',
  '1. \u5c06\u4f60\u7684\u5206\u652f\u63a8\u9001\u5230\u4f60\u7684 fork\u3002',
  '2. \u9488\u5bf9\u4e0a\u6e38\u4ed3\u5e93\u7684 `main` \u5f00\u542f\u62c9\u53d6\u8bf7\u6c42\u3002',
  '3. \u5199\u660e\u786e\u7684\u63cf\u8ff0\uff0c\u8bf4\u660e\u4f60\u6539\u4e86\u4ec0\u4e48\u4ee5\u53ca\u4e3a\u4ec0\u4e48\u3002',
  '4. \u5982\u679c\u4f60\u7684 PR \u89e3\u51b3\u4e86\u67d0\u4e2a\u5df2\u6253\u5f00\u7684\u95ee\u9898\uff0c\u8bf7\u5f15\u7528\u5176\u53f7\uff08\u4f8b\u5982 `Fixes #42`\uff09\u3002',
  '',
  '### \u4fdd\u6301 PR \u7684\u7cbe\u7b80',
  '',
  '\u8bf7\u4fdd\u6301 PR \u7684\u7cbe\u7b80\u4e0e\u805a\u7126\u2014\u2014\u5b83\u4eec\u66f4\u5bb9\u6613\u88ab\u5ba1\u67e5\u4e0e\u5408\u5e76\u3002\u4f53\u91cf\u8fc7\u5927\u3001\u6df7\u5165\u65e0\u5173\u6539\u52a8\u7684 PR \u53ef\u80fd\u4f1a\u88ab\u8981\u6c42\u62c6\u5206\uff0c\u751a\u81f3\u4e0d\u88ab\u63a5\u53d7\u3002',
  '',
  '- \u6bcf\u4e2a PR \u4ec5\u5305\u542b\u4e00\u9879\u903b\u8f91\u6539\u52a8\uff08\u4e00\u4e2a\u4fee\u590d\u3001\u4e00\u4e2a\u529f\u80fd\u3001\u4e00\u6b21\u91cd\u6784\uff09\u3002',
  '- \u5982\u679c\u4f60\u53d1\u73b0\u81ea\u5df1\u52a8\u4e86\u5f88\u591a\u65e0\u5173\u6587\u4ef6\uff0c\u8bf7\u62c6\u5206\u6210\u591a\u4e2a PR\u3002',
  '- \u907f\u514d\u5728\u540c\u4e00 PR \u4e2d\u6df7\u5165\u683c\u5f0f / \u98ce\u683c\u626b\u63cf\u4e0e\u529f\u80fd\u6027\u6539\u52a8\u3002',
  '- \u66f4\u5c0f\u7684 PR \u4f1a\u66f4\u5feb\u88ab\u5ba1\u67e5\u4e0e\u5408\u5e76\u3002',
  '',
  '\u7ef4\u62a4\u8005\u4f1a\u5ba1\u67e5\u4f60\u7684 PR \u5e76\u53ef\u80fd\u8981\u6c42\u4fee\u6539\u3002\u4e00\u65e6\u83b7\u6279\uff0c\u5b83\u4f1a\u88ab\u5408\u5e76\u3002',
  '',
  '## \u62a5\u544a bug',
  '',
  '\u53d1\u73b0\u4e86 bug\uff1f[\u63d0\u4ea4 issue](https://github.com/JZKK720/cubecloud-agent-desktop/issues/new)\uff0c\u9644\u4e0a\uff1a',
  '',
  '- \u6e05\u6670\u7684\u6807\u9898\u4e0e\u63cf\u8ff0\u3002',
  '- \u590d\u73b0\u8be5\u95ee\u9898\u7684\u6b65\u9aa4\u3002',
  '- \u4f60\u671f\u671b\u53d1\u751f\u4ec0\u4e48\u4e0e\u5b9e\u9645\u53d1\u751f\u4e86\u4ec0\u4e48\u3002',
  '- \u4f60\u7684\u64cd\u4f5c\u7cfb\u7edf\u4e0e\u5e94\u7528\u7248\u672c\uff08\u5982\u679c\u76f8\u5173\uff09\u3002',
  '',
  '## \u63d0\u51fa\u529f\u80fd\u8bf7\u6c42',
  '',
  '\u6709\u4e2a\u521b\u610f\uff1f[\u63d0\u4ea4 issue](https://github.com/JZKK720/cubecloud-agent-desktop/issues/new)\uff0c\u63cf\u8ff0\uff1a',
  '',
  '- \u4f60\u60f3\u89e3\u51b3\u7684\u95ee\u9898\u3002',
  '- \u4f60\u671f\u671b\u5b83\u5982\u4f55\u5de5\u4f5c\u3002',
  '- \u4f60\u5df2\u8003\u8651\u8fc7\u7684\u66ff\u4ee3\u65b9\u6848\u3002',
  '',
  '## \u9879\u76ee\u7ed3\u6784',
  '',
  'Cubecloud Agentic-OS \u662f\u4e00\u4e2a\u5355\u4ed3\uff0c\u5305\u542b\u4ee5\u4e0b\u4e3b\u8981\u90e8\u5206\uff1a',
  '',
  '- `apps/desktop-shell/` \u2014 \u6d3b\u8dc3\u7684 `@cubecloud/desktop-shell` \u5de5\u4f5c\u533a\u3002',
  '- `agent-desktop/` \u2014 \u5b8c\u6574\u7684 Electron \u4e8c\u8fdb\u5236\u6587\u4ef6\uff08\u542b\u6c89\u7ee7\u7684 hermes-desktop \u6846\u67b6\uff09\u3002',
  '- `packages/platform-core/` \u2014 \u5355\u4ed3\u5168\u5c40\u5171\u4eab\u7684 TS \u7c7b\u578b\u3002',
  '- `docs/handbook/` \u2014 \u6309\u4e3b\u9898\u957f\u6587\uff1aARCHITECTURE / DEVELOPMENT / OPERATIONS / README\u3002',
  '- `docs/legal/` \u2014 TRADEMARK_POLICY\u3001EULA\u3001COMMERCIAL_LICENSE \u7b49\u6cd5\u5f8b\u6587\u4ef6\u3002',
  '- `.agents/skills/` \u2014 34 \u4e2a\u6280\u80fd\u5305\uff0c\u955c\u50cf\u5230 `~/.agents/skills/`\u3002',
  '',
  '\u8be6\u89c1\u4ed3\u5e93\u6839\u76ee\u5f55\u4e0b\u7684 `README.md` \u4e0e `docs/HANDBOOK.md`\u3002',
  '',
  '## \u4ee3\u7801\u98ce\u683c',
  '',
  '\u4ee3\u7801\u98ce\u683c\u8981\u6c42\uff1a',
  '',
  '- TypeScript\uff1a\u4e25\u683c\u6a21\u5f0f\u3002\u907f\u514d `any`\uff0c\u9664\u975e\u6709\u660e\u786e\u7406\u7531\u3002',
  '- React 19 \u4e0e\u51fd\u6570\u7ec4\u4ef6\u3002\u4f18\u5148\u4f7f\u7528 hooks\uff0c\u800c\u975e class \u7ec4\u4ef6\u3002',
  '- Electron IPC \u8c03\u7528\uff1a\u6240\u6709 IPC \u6e20\u9053\u5fc5\u987b\u663e\u5f0f\u5728 `agent-desktop/src/main/ipc/` \u4e0b\u6ce8\u518c\u3002',
  '- \u4f9d\u8d56\uff1a\u4f7f\u7528 `npm ci` \u4ee5\u4fdd\u8bc1\u4e0e\u9501\u5b9a\u6587\u4ef6\u4e00\u81f4\u3002\u4e0d\u8981\u8d70 `npm install <package>` \u800c\u4e0d\u540c\u6b65\u9501\u5b9a\u3002',
  '- Lint\uff1a\u63d0\u4ea4\u524d\u8fd0\u884c `npm run lint`\u3002',
  '- \u6d4b\u8bd5\uff1a\u4e3a bug \u4fee\u590d\u4e0e\u65b0\u529f\u80fd\u6dfb\u52a0\u5355\u5143\u6d4b\u8bd5\u3002',
  '',
  '## \u793e\u533a',
  '',
  '\u53d1\u8c08\u4e3b\u9898\uff1a[\u4f7f\u7528 GitHub Discussions](https://github.com/JZKK720/cubecloud-agent-desktop/discussions)\u3002',
  '',
  '\u4ee3\u7801\u884c\u4e3a\u51c6\u5219\uff1a\u4e3e\u624b\u4e4b\u52b3\uff0c\u5bf9\u4ed6\u4eba\u8d28\u7591\u524d\u5148\u9ed8\u8ba4\u4ed6\u4eec\u662f\u4e3a\u4e86\u4e00\u4e2a\u5408\u7406\u76ee\u7684\u3002\u53cd\u9988\u4e2d\u5bf9\u4eba\u4e0d\u8d1f\u8d23\u4efb\u3002',
  '',
  '## \u8bb8\u53ef',
  '',
  'Cubecloud-original \u5de5\u4f5c\u4ee5\u4e09\u9009\u4e00\u7684\u53cc\u8bb8\u53ef\u53d1\u5e03\uff1a',
  '',
  '- **AGPL-3.0-or-later**\uff08\u4e3b\uff09',
  '- **Apache-2.0**\uff08\u517c\u5bb9\u9009\u9879\uff09',
  '- **MIT**\uff08\u517c\u5bb9\u9009\u9879\uff09',
  '',
  '\u6c89\u7ee7\u7684 `hermes-desktop` \u6846\u67b6\u4ee3\u7801\u4fdd\u6301\u539f\u59cb MIT \u8bb8\u53ef\u3002',
  '\u8be6\u89c1\u4ed3\u5e93\u6839\u76ee\u5f55\u4e0b\u7684 [`LICENSE`](../LICENSE) \u4e0e [`BRANDING_AND_LICENSE.md`](../BRANDING_AND_LICENSE.md)\u3002',
  '',
  '## \u5f00\u53d1\u8005\u8bc1\u4e66\u6765\u6e90\uff08DCO\uff09',
  '',
  '\u6240\u6709\u5165\u5e93\u8d21\u732e\u5fc5\u987b\u9075\u5faa **DCO 1.1** \u7b7e\u540d\u6a21\u578b\u3002\u4e0d\u4f7f\u7528 CLA\u3002',
  '\u6bcf\u4e2a\u63d0\u4ea4\u5fc5\u987b\u5305\u542b\u4e00\u884c `Signed-off-by:`\uff0c\u6837\u4f8b\uff1a',
  '',
  '```',
  'feat(skills): add 3 promoted user-visible skills at first launch',
  '',
  '# Signed-off-by: Your Name <your.email@example.com>',
  '```',
  '',
  '\u4f7f\u7528 `git commit -s` \u81ea\u52a8\u8ffd\u52a0\u8be5\u884c\u3002\u5982\u679c\u5fd8\u4e86 `-s`\uff0c\u5728\u63a8\u9001\u524d\u4f7f\u7528 `git commit --amend -s` \u7f16\u8f91\u63d0\u4ea4\u4fe1\u606f\u3002',
  '',
  '\u8d21\u732e\u8005\u4ee3\u7801\u9700\u8981\u539f\u521b\u4f5c\u8005\u4e2a\u4eba\u540c\u610f\uff08\u4e2a\u4eba\u8d21\u732e\uff09\u6216\u8005\u662f\u4f60\u62e5\u6709\u5408\u6cd5\u6743\u5229\u63d0\u4ea4\u7684\u4f5c\u54c1\uff08\u5de5\u4f5c\u4ea7\u51fa\uff09\u3002',
  '',
  '## \u62a5\u544a\u6f0f\u6d1e',
  '',
  '\u5b89\u5168\u62a5\u544a\u8bf7\u9075\u5faa [`SECURITY.md`](../SECURITY.md)\u2014\u8bf7\u52ff\u5728\u516c\u5f00\u95ee\u9898\u4e2d\u53d1\u5e03\u51d1\u4e66\u3001API \u5bc6\u94a5\u3001\u79c1\u4eba\u65e5\u5fd7\u3001\u4e2a\u4eba\u6587\u6863\u6216\u516c\u5171 IP \u3002',
  '\u5b89\u5168\u4fee\u590d\u9075\u5faa\u4e0e\u529f\u80fd\u63d0\u4ea4\u76f8\u540c\u7684 DCO \u7b7e\u540d\u89c4\u5219\uff1b\u65f6\u95e4\u4e0d\u662f\u8bb8\u53ef\u8bc1\u7a7a\u5b50\u3002',
  '',
  '## \u81f4\u8c22',
  '',
  '\u4e0a\u6e38\u4f5c\u8005\u4e0e\u793e\u533a\u8d21\u732e\u8005\u7684\u5b8c\u6574\u540d\u5355\u4f4d\u4e8e [`ACKNOWLEDGMENTS.md`](../ACKNOWLEDGMENTS.md)\u3002',
  '\u7b2c\u4e09\u65b9\u5f52\u5c5e\u76ee\u5f55\u4f4d\u4e8e [`NOTICE`](../NOTICE)\u3002',
  '\u5982\u679c\u4f60\u7684\u8d21\u732e\u57fa\u4e8e\u522b\u4eba\u7684\u5de5\u4f5c\uff08\u6765\u81ea\u4e0a\u6e38\u9879\u76ee\u7684\u4fee\u590d\u3001\u6765\u81ea\u53c2\u8003\u4ee3\u7801\u5e93\u7684\u6a21\u5f0f\u3001\u8f6c\u8ff0\u7684\u7b97\u6cd5\uff09\uff0c\u8bf7\u5728\u4f60\u7684\u63d0\u4ea4\u4fe1\u606f\u4e2d\u7ed9\u4e88\u5f52\u5c5e\uff0c\u5e76\u5728\u5fc5\u8981\u65f6\u5c06\u4ed6\u4eec\u52a0\u5165 `NOTICE`\u3002'
];

const ZH_PATH = path.join(ROOT, 'CONTRIBUTING.zh-CN.md');
const ZH_CONTENT = ZH_LINES.join('\n') + '\n';
fs.writeFileSync(ZH_PATH, ZH_CONTENT, 'utf8');
console.log('  wrote ' + ZH_PATH + ' (' + Buffer.byteLength(ZH_CONTENT, 'utf8') + ' bytes; ' + ZH_LINES.length + ' lines)');

// Update README.i18n.md: add a row for the new monorepo CONTRIBUTING.zh-CN.md.
let i18n = fs.readFileSync(I18N, 'utf8');

const oldTableTail =
  '| README (monorepo) | Simplified Chinese (zh-CN) | `README.zh-CN.md` (outer root) | **Live, V2.10.16** (full translation of the outer README; machine-translated starting point, native speakers welcome to polish) | Cubecloud Contributors + Community |\n' +
  '| README (monorepo) | Japanese (ja-JP) | -- | **Not yet translated, V2.10.16** (the inner has ja-JP at `agent-desktop/README.ja-JP.md`; the outer is English-only) | Community -- fork + translate to claim |\n' +
  '| README (monorepo) | Korean (ko-KR) | -- | **Not yet translated, V2.10.16** (the inner has no ko-KR) | Community -- fork + translate to claim |\n';

const newTableTail =
  '| README (monorepo) | Simplified Chinese (zh-CN) | `README.zh-CN.md` (outer root) | **Live, V2.10.16** (full translation of the outer README; machine-translated starting point, native speakers welcome to polish) | Cubecloud Contributors + Community |\n' +
  '| README (monorepo) | Japanese (ja-JP) | -- | **Not yet translated, V2.10.16** (the inner has ja-JP at `agent-desktop/README.ja-JP.md`; the outer is English-only) | Community -- fork + translate to claim |\n' +
  '| README (monorepo) | Korean (ko-KR) | -- | **Not yet translated, V2.10.16** (the inner has no ko-KR) | Community -- fork + translate to claim |\n' +
  '| CONTRIBUTING (monorepo) | English | `CONTRIBUTING.md` (outer root) | Live (hardlink to inner) | Cubecloud Contributors |\n' +
  '| CONTRIBUTING (monorepo) | Simplified Chinese (zh-CN) | `CONTRIBUTING.zh-CN.md` (outer root) | **Live, V2.10.17** (full translation of the outer CONTRIBUTING.md; covers the monorepo contributor policy -- separate from the inner `agent-desktop/CONTRIBUTING.zh-CN.md` which covers the binary) | Cubecloud Contributors + Community |\n';

if (!i18n.includes(oldTableTail)) {
  console.error('  manifest table tail not found in expected form; aborting');
  process.exit(1);
}
if (i18n.includes('**Live, V2.10.17**')) {
  console.log('  manifest already has V2.10.17; skipping');
} else {
  i18n = i18n.split(oldTableTail).join(newTableTail);
  fs.writeFileSync(I18N, i18n);
  console.log('  README.i18n.md table updated with V2.10.17 row; size now: ' + fs.statSync(I18N).size + ' bytes');
}

// Append V2.10.17 to BRANDING.
let branding = fs.readFileSync(BRANDING, 'utf8');
if (branding.includes('## V2.10.17')) {
  console.log('  BRANDING already has V2.10.17; skipping');
} else {
  const block = [
    '',
    '',
    '## V2.10.17 ' + EM_DASH + ' Outer monorepo CONTRIBUTING.zh-CN.md (V2.10.16 README.zh-CN.md sibling)',
    '',
    '**Scope:** outer monorepo root. 1 new file:',
    '`CONTRIBUTING.zh-CN.md` (Simplified Chinese translation of the',
    'outer `CONTRIBUTING.md`). Plus a manifest update.',
    '',
    '**What changed (V2.10.17):**',
    '',
    '1. Created `CONTRIBUTING.zh-CN.md` at the outer root. It is',
    '   a Simplified Chinese translation of the outer',
    '   `CONTRIBUTING.md` (8,935 bytes), covering: \u8d21\u732e\u8005\u6307\u5357\u3001',
    '   \u8bed\u8a00\u3001\u4ece\u8fd9\u91cc\u5f00\u59cb\u3001\u8fdb\u884c\u4fee\u6539\u3001\u63d0\u4ea4 PR\u3001\u62a5\u544a bug\u3001',
    '   \u63d0\u51fa\u529f\u80fd\u8bf7\u6c42\u3001\u9879\u76ee\u7ed3\u6784\u3001\u4ee3\u7801\u98ce\u683c\u3001\u793e\u533a\u3001',
    '   \u8bb8\u53ef\u3001DCO \u3001\u62a5\u544a\u6f0f\u6d1e\u3001\u81f4\u8c22\u3002',
    '2. Updated `README.i18n.md` to add 2 new rows:',
    '   English monorepo CONTRIBUTING (live via the V2.10.13',
    '   hardlink) + Simplified Chinese monorepo CONTRIBUTING',
    '   (Live, V2.10.17).',
    '3. No source code change. No `package.json` /',
    '   `scripts/sync-docs.ps1` / `.gitignore` change. The new',
    '   file is NOT mirrored to the inner (the inner has its own',
    '   `CONTRIBUTING.zh-CN.md` for the binary, which is a',
    '   separate scope; the V2.10.13 audit confirmed the outer +',
    '   inner `CONTRIBUTING.md` are the same hardlink, but the',
    '   `.zh-CN.md` siblings are independent files).',
    '',
    '**Why this is the right next V2.10.x step:**',
    '',
    'After V2.10.16 shipped the outer `README.zh-CN.md`, the next',
    'most-requested doc for a Chinese-speaking contributor is the',
    'contributor policy itself: how to file a PR, the DCO sign-off',
    'model, the code style, the community channels. The outer',
    '`CONTRIBUTING.md` is a hardlink to the inner file (V2.10.13',
    'audit), but the **outer** perspective is the agentic-OS',
    'monorepo (V2.6+ skills ecosystem, 34 skills, the',
    '`apps/desktop-shell` workspace, the 3-monorepo-doc-layer',
    'hardlinks). The inner perspective is the binary (Hermes',
    'runtime, Electron build, etc.). The V2.10.17 translation',
    'covers the monorepo perspective, which is the one a new',
    'contributor landing on the outer root needs.',
    '',
    '**Out of scope (deliberately):**',
    '',
    '- **`SECURITY.md` zh-CN translation.** Same pattern, but',
    '  7,801 bytes; can ship in V2.10.18 if you want to continue.',
    '- **`THREAT_MODEL.md` zh-CN translation.** Same pattern,',
    '  6,249 bytes; can ship in V2.10.19.',
    '- **`docs/HANDBOOK.md` zh-CN translation.** 26,579 bytes;',
    '  larger; can ship in a later V2.10.x.',
    '- **`docs/handbook/*.md` zh-CN translations.** 4 files,',
    '  ~42 KB total; can ship later.',
    '- **Native-speaker polish of the V2.10.16/V2.10.17',
    '  translations.** Open invitation via the manifest.'
  ];
  branding = branding + block.join('\n') + '\n';
  fs.writeFileSync(BRANDING, branding);
  console.log('  V2.10.17 sub-section appended to BRANDING; size now: ' + fs.statSync(BRANDING).size + ' bytes');
}

// Append V2.10.17 row to RETIRED.
let retired = fs.readFileSync(RETIRED, 'utf8');
if (retired.includes('V2.10.17')) {
  console.log('  RETIRED already has V2.10.17; skipping');
} else {
  const lines = retired.split(/\r?\n/);
  let v21016Row = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('i18n cleanup (placeholders retire')) {
      v21016Row = i;
    }
  }
  if (v21016Row < 0) {
    console.error('  RETIRED V2.10.16 row not found; aborting');
    process.exit(1);
  }
  const v21017Row = '| Outer monorepo CONTRIBUTING.zh-CN.md | `CONTRIBUTING.zh-CN.md` (outer root, NEW) | **Live, V2.10.17** (1 new file + manifest update) | A Simplified Chinese translation of the outer `CONTRIBUTING.md`. The outer + inner `CONTRIBUTING.md` are still the same hardlink (V2.10.13), but the `.zh-CN.md` sibling is independent. Covers the monorepo perspective: contributor policy + DCO + code style + community channels + the new V2.6+ skills ecosystem. |';
  lines.splice(v21016Row + 1, 0, v21017Row);
  retired = lines.join('\n');
  fs.writeFileSync(RETIRED, retired);
  console.log('  V2.10.17 row inserted after V2.10.16 in RETIRED; size now: ' + fs.statSync(RETIRED).size + ' bytes');
}
