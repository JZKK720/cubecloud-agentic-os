// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// scripts/v2.10.19-threat-model-zh.cjs -- Simplified Chinese
// translation of the outer THREAT_MODEL.md (6,249 bytes) at the
// outer root. Same pattern as V2.10.16 / V2.10.17 / V2.10.18.
// Completes the "core 4" outer monorepo docs for Chinese readers:
// README + CONTRIBUTING + SECURITY + THREAT_MODEL.
//
// Note on hardlink: outer + inner THREAT_MODEL.md are the same
// Windows hardlink (V2.10.8 audit). The outer .zh-CN.md is a NEW
// file at the outer root, NOT a translation of the hardlinked file.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BRANDING = path.join(ROOT, 'BRANDING_AND_LICENSE.md');
const RETIRED = path.join(ROOT, 'docs', 'RETIRED_AND_LEGACY.md');
const I18N = path.join(ROOT, 'README.i18n.md');
const EM_DASH = String.fromCodePoint(0x2014);
const SECTION_SIGN = String.fromCodePoint(0x00a7);

const ZH_LINES = [
  '# \u5a01\u80c1\u6a21\u578b',
  '',
  '\u672c\u6587\u4ef6\u662f\u684c\u9762\u7aef\u5a01\u80c1\u6a21\u578b\u7684\u6cbb\u7406\u8349\u7a3f\u3002',
  '\u5b83\u4e0e `SECURITY.md` \u4ee5\u53ca\u90e8\u7f72\u6307\u5357\u4e92\u8865\u3002',
  '\u76ee\u6807\u662f\u660e\u786e\u8868\u8ff0**\u6211\u4eec\u9632\u5fa1\u4ec0\u4e48**\u4ee5\u53ca**\u6211\u4eec\u6545\u610f\u4e0d\u9632\u5fa1\u4ec0\u4e48**\uff0c',
  '\u4ee5\u4fbf\u5b89\u5168\u5ba1\u67e5\u8005\u4e0e\u4e0b\u6e38\u8fd0\u884c\u8005\u80fd\u591f\u63a8\u7406\u6b8b\u7559\u98ce\u9669\u3002',
  '',
  '\u8fd9\u4e0d\u662f\u4e25\u683c\u7684 STRIDE / PASTA / LINDDUN \u5206\u6790\u3002\u5b83\u662f\u4e00\u4e2a\u5b9e\u7528\u57fa\u51c6\u3002',
  '',
  '## 1. \u4fe1\u4efb\u8fb9\u754c',
  '',
  '\u684c\u9762\u7aef\u7684\u7279\u6743\u8fb9\u754c\u662f**\u542f\u52a8\u5b83\u7684\u7528\u6237\u8d26\u53f7**\u3002',
  '\u4efb\u4f55\u4ee5\u540c\u6837\u7528\u6237\u6743\u9650\u8fd0\u884c\u7684\u4ee3\u7801\u90fd\u88ab\u9690\u5f0f\u4fe1\u4efb\u3002',
  '\u684c\u9762\u7aef\u4e0d\u5c1d\u8bd5\u9632\u5fa1\u5b8c\u5168\u53d7\u635f\u7684\u5e95\u5c42\u64cd\u4f5c\u7cfb\u7edf\u3001',
  '\u6076\u610f\u7684\u672c\u5730\u7528\u6237\uff0c\u6216\u8005\u4ee5\u540c\u6837\u6743\u9650\u8fd0\u884c\u7684\u6076\u610f\u6269\u5c55 / \u7528\u6237\u6001\u8fdb\u7a0b\u3002',
  '',
  '\u5728\u8be5\u8fb9\u754c\u5185\uff0c\u684c\u9762\u7aef\u5f3a\u5236**\u6df1\u9632\u4e00\u4f53**\uff1a\u4e0a\u4e0b\u6587\u9694\u79bb\u3001',
  '\u4e25\u683c\u7684 preload \u767d\u540d\u5355\u3001\u7981\u7528 `nodeIntegration`\u3001\u5c3d\u53ef\u80fd\u4f7f\u7528\u6c99\u7bb1\u3001',
  '\u4ee5\u53ca\u6bcf\u4e2a IPC \u901a\u9053\u4e0a\u7684\u5f3a\u7c7b\u578b\u679a\u4e3e\u7ea6\u675f\u3002',
  '',
  '## 2. \u6211\u4eec\u4fdd\u62a4\u7684\u8d44\u4ea7',
  '',
  '| \u8d44\u4ea7 | \u654f\u611f\u5ea6 | \u5b58\u50a8\u4f4d\u7f6e |',
  '|-------|-------------|----------------|',
  '| \u804a\u5929\u8f93\u5165\u6846\u4e2d\u7684\u7528\u6237\u6309\u952e | \u9ad8 | \u4ec5\u5b58\u4e8e\u6e32\u67d3\u8fdb\u7a0b\u5185\u5b58\uff0c\u4ece\u4e0d\u4ee5\u660e\u6587\u6301\u4e45\u5316 |',
  '| \u804a\u5929\u63d0\u4f9b\u8005\u7684 API \u5bc6\u94a5 | \u6781\u9ad8 | `HERMES_HOME/<profile>/auth.json`\uff0cmacOS \u4e0a\u4f7f\u7528\u7cfb\u7edf\u5bc6\u94a5\u94fe |',
  '| OAuth \u5237\u65b0\u4ee4\u724c | \u6781\u9ad8 | \u540c\u4e0a\uff0c\u4f7f\u7528\u65f6\u8f6c\u6362 |',
  '| \u672c\u5730\u4f1a\u8bdd\u5386\u53f2 | \u4e2d | `HERMES_HOME/state.db`\uff08better-sqlite3\uff0c\u6587\u4ef6\u6743\u9650 0600\uff09 |',
  '| \u77e5\u8bc6\u5e93 / \u7b14\u8bb0\u5185\u5bb9 | \u4e2d | `HERMES_HOME/<profile>/wiki/` |',
  '| \u4e0a\u4f20\u6587\u4ef6 | \u4e2d | `HERMES_HOME/<profile>/uploads/` |',
  '| \u6280\u80fd\u5185\u5bb9\uff08\u6e47\u8868\u3001\u6e90\u7801\uff09 | \u4f4e | \u6253\u5305\u5728\u8d44\u6e90\u4e2d\u6216 `HERMES_HOME/<profile>/skills/` |',
  '| \u684c\u9762\u7aef\u4e8c\u8fdb\u5236\u6587\u4ef6\u672c\u8eab | \u9ad8 | `out/main/index.js`\u3001`out/preload/index.js`\u3001`out/renderer/` |',
  '',
  '> **\u6ce8\uff1a**\u672c\u4e3b\u4ed3\u5305\u542b\u7684\u8d44\u4ea7\u4e2d\u4e0d\u5305\u542b\u9884\u6253\u5305\u7684\u670d\u52a1\uff08SearXNG\u3001ChromaDB\u3001ntfy\uff09\u3002',
  '> \u672c\u7248\u672c\u7684\u684c\u9762\u7aef\u4e0d\u542b `docker-compose.yml`\uff0c\u4e5f\u4e0d\u6253\u5305\u4efb\u4f55\u5bb9\u5668\u5316\u670d\u52a1\u3002',
  '',
  '## 3. \u6211\u4eec\u9632\u5fa1\u7684\u5bf9\u624b',
  '',
  '- **A3\uff1a\u7f51\u7edc\u90bb\u63a5\u7684\u653b\u51fb\u8005**\u80fd\u591f\u8bbf\u95ee\u975e\u73af\u56de\u7ed1\u5b9a\uff08`0.0.0.0`\uff09\u4f46\u4e0d\u62e5\u6709',
  '  \u51ed\u8bc1\u3002\u7f13\u89e3\u63aa\u65bd\uff1a\u9ed8\u8ba4\u4ec5\u7ed1\u5b9a\u73af\u56de\u3001`AUTH_ENABLED=true`\uff08\u4f5c\u4e3a',
  '  \u670d\u52a1\u8fd0\u884c\u65f6\uff09\u3001HTTPS \u540e\u7f6e\u65f6 `SECURE_COOKIES=true`\u3002',
  '',
  '- **A4\uff1a\u6076\u610f MCP \u670d\u52a1\u5668**\u3002MCP \u670d\u52a1\u5668\u7531\u7528\u6237\u901a\u8fc7 npm \u5b89\u88c5\u3002',
  '  \u684c\u9762\u7aef\u6c99\u7bb1\u9650\u5236\u4e86 MCP \u670d\u52a1\u5668\u80fd\u591f\u8bbf\u95ee\u7684\u8303\u56f4\u3002',
  '  \u7f13\u89e3\u63aa\u65bd\uff1a\u6bcf\u670d\u52a1\u5668\u4f18\u5148\u7ea7\u6807\u8bb0\u3001"\u8c03\u7528 shell / Python \u524d\u8be2\u95ee"\u3001',
  '  \u4ec5\u7ba1\u7406\u5458\u53ef\u8bbf\u95ee\u7684 MCP \u7ba1\u7406\u8def\u7531\u3002',
  '',
  '- **A5\uff1a\u901a\u8fc7\u6a21\u578b\u8f93\u51fa\u6216\u7f51\u7edc\u641c\u7d22\u7ed3\u679c\u8fdb\u884c\u63d0\u793a\u6ce8\u5165**\u3002',
  '  \u88ab\u5f53\u4f5c\u6570\u636e\u800c\u975e\u4ee3\u7801\u5904\u7406\u3002',
  '  shell \u5de5\u5177\u3001\u6587\u4ef6\u5199\u5165\u5de5\u5177\u4e0e EverOS \u8f85\u52a9\u8fdb\u7a0b\u90fd\u9700\u8981\u663e\u5f0f\u7528\u6237\u786e\u8ba4\u624d\u80fd\u6267\u884c\u3002',
  '',
  '- **A6\uff1a\u62d6\u5165\u804a\u5929\u7684\u4e0d\u53ef\u4fe1\u6587\u4ef6**\u3002',
  '  \u9644\u4ef6\u4f1a\u5206\u9636\u6bb5\u5230 `HERMES_HOME/<profile>/uploads/`\uff0c\u5e76\u4ee5\u6587\u4ef6\u540d + \u5927\u5c0f\u7684\u5f62\u5f0f\u5448\u73b0\u3002',
  '  \u8f6c\u6362\u4e3a markdown \u662f\u6700\u4f73\u5c1d\u8bd5\uff1b\u5931\u8d25\u4f1a\u4ee5\u5f3a\u7c7b\u578b\u9519\u8bef\u5f62\u5f0f\u6f6e\u73b0\u3002',
  '',
  '## 4. \u6211\u4eec\u6545\u610f\u4e0d\u9632\u5fa1\u7684\u5bf9\u624b',
  '',
  '- **A1\uff1a\u5177\u6709\u76f8\u540c UID \u7684\u6076\u610f\u672c\u5730\u7528\u6237**\u3002\u8d85\u51fa\u8303\u56f4\u2014\u2014\u684c\u9762\u7aef\u6309\u8bbe\u8ba1',
  '  \u4ee5\u7528\u6237\u6743\u9650\u8fd0\u884c\u3002',
  '',
  '- **A2\uff1a\u5b8c\u5168\u53d7\u635f\u7684\u64cd\u4f5c\u7cfb\u7edf**\u3002\u8d85\u51fa\u8303\u56f4\u3002\u6211\u4eec\u4e0d\u5c1d\u8bd5\u68c0\u6d4b\u6839\u5e95\u6728\u9a6c\u3001',
  '  \u5185\u6838\u53d7\u635f\u6216\u6076\u610f\u7528\u6237\u6001\u8fdb\u7a0b\u3002\u9632\u5fa1\u8fd9\u4e9b\u662f\u4e00\u4e2a\u9700\u8981\u4e3b\u673a\u52a0\u56fa',
  '  \uff08Secure Boot\u3001T2 \u82af\u7247\u3001FileVault \u7b49\uff09\u7684\u6df1\u9632\u4e00\u4f53\u95ee\u9898\uff0c\u8fd9\u662f\u8fd0\u884c\u8005\u7684\u8d23\u4efb\u3002',
  '',
  '- **A7\uff1a\u53d7\u635f\u7684\u6a21\u578b\u63d0\u4f9b\u8005**\u3002\u684c\u9762\u7aef\u5c06\u6a21\u578b\u54cd\u5e94\u89c6\u4e3a\u4e0d\u53ef\u4fe1\u8f93\u5165\u3002',
  '  \u4ee3\u7801\u6267\u884c\u8def\u5f84\u90fd\u9700\u8981\u663e\u5f0f\u7528\u6237\u786e\u8ba4\u3002',
  '',
  '- **A8\uff1a\u53d7\u635f\u7684\u7b2c\u4e09\u65b9 npm / Python \u4f9d\u8d56**\u3002\u6211\u4eec\u9501\u5b9a\u7248\u672c\u3001\u5728 CI \u4e2d\u8fd0\u884c',
  '  ' + '`npm audit`\uff0c\u5e76\u5728 `package.json` \u7684 `dependencies` \u4e2d\u8bb0\u5f55\u3002',
  '  \u4e00\u4e2a\u53d7\u635f\u7684\u4f9d\u8d56\u53ef\u4ee5\u88ab\u8ffd\u6eaf\u3002\u6211\u4eec\u4e0d\u4fdd\u8bc1\u8d85\u51fa\u8fd9\u4e2a\u8303\u56f4\u7684\u4f9b\u5e94\u94fe\u5b8c\u6574\u6027\u3002',
  '',
  '## 5. \u8f85\u52a9\u8fdb\u7a0b\u8fb9\u754c\uff08CodeGraph + EverOS\uff09',
  '',
  '\u4e24\u4e2a\u53ef\u9009\u8f85\u52a9\u8fdb\u7a0b\u4f5c\u4e3a\u72ec\u7acb\u8fdb\u7a0b\u8fd0\u884c\uff1a',
  '',
  '- **CodeGraph \u8fd0\u884c\u65f6**\uff08`@colbymchenry/codegraph`\uff09\u2014\u2014\u9996\u6b21\u4f7f\u7528\u65f6\u61d2\u52a0\u8f7d\u3002',
  '  \u61d2\u52a0\u8f7d\u7684 `require()` \u62a4\u680f\u53ef\u4ee5\u9632\u6b62\u5728\u7528\u6237\u4ece\u672a\u8bbf\u95ee CodeGraph \u5c4f\u5e55\u65f6\u52a0\u8f7d SDK\u3002',
  '  SDK \u81ea\u8eab\u7684\u5b89\u5168\u6a21\u578b\uff08\u9ed8\u8ba4\u53ea\u8bfb\u3001\u65e0\u9690\u85cf\u7f51\u7edc\u8bbf\u95ee\u3001\u8fdb\u7a0b\u9694\u79bb\uff09',
  '  \u662f\u4e0a\u7ebf\u6700\u540e\u4e00\u9053\u9632\u7ebf\u3002\u8be6\u89c1 CodeGraph \u6587\u6863\u3002',
  '',
  '- **EverOS \u8f85\u52a9\u8fdb\u7a0b**\uff08\u53ef\u9009\uff09\u2014\u2014\u4e00\u4e2a\u672c\u5730 Python \u8fdb\u7a0b\uff0c\u4ec5\u5728\u7528\u6237\u542f\u52a8\u65f6\u8fd0\u884c\u3002',
  '  \u751f\u547d\u5468\u671f\u7ba1\u7406\u5668\u5904\u4e8e\u684c\u9762\u7aef\u4e2d\uff1b\u684c\u9762\u7aef\u9ed8\u8ba4\u7ed1\u5b9a\u73af\u56de\u3002',
  '  EverOS \u8f85\u52a9\u8fdb\u7a0b\u6709\u4e00\u4e2a\u81ea\u52a8\u91cd\u542f\u4e0a\u9650\uff0860 \u79d2\u5185\u6700\u591a 5 \u6b21\u5d29\u6e83\uff09\uff0c',
  '  \u7528\u4e8e\u5728\u9519\u8bef\u914d\u7f6e\u4e0b\u6291\u5236\u65e0\u9650\u91cd\u542f\u5faa\u73af\u3002',
  '',
  '## 6. \u5269\u4f59\u98ce\u9669',
  '',
  '\u5728\u4fe1\u4efb\u8fb9\u754c\u4e4b\u5185\uff0c\u5269\u4f59\u98ce\u9669\u5305\u62ec\uff1a',
  '',
  '- **\u8bf7\u6c42\u4e2d\u7684 prompt injection**\uff0c\u5373\u4f7f\u670d\u4ece\u201c\u5c06\u6a21\u578b\u8f93\u51fa\u5f53\u4f5c\u6570\u636e\u201d\u7684\u539f\u5219\uff0c',
  '  \u4e5f\u53ef\u80fd\u88ab\u96be\u4ee5\u53d1\u73b0\u7684\u8bef\u5bfc\u3002\u5982\u679c\u7528\u6237\u4e0d\u9605\u8bfb\u5373\u70b9\u51fb\u201c\u540c\u610f\u201d\uff0c',
  '  shell \u5de5\u5177\u4ecd\u53ef\u88ab\u8c03\u7528\u3002',
  '- **\u8d44\u4ea7\u96be\u4ee5\u5b8c\u5168\u9690\u85cf**\u3002\u5982\u679c\u7528\u6237\u5728\u4e0d\u540c\u5e94\u7528\u7a0b\u5e8f\u4e4b\u95f4\u590d\u5236\u7c98\u8d34 API \u5bc6\u94a5\uff0c',
  '  \u684c\u9762\u7aef\u65e0\u6cd5\u63a8\u65ad\u201c\u4e00\u4e2a\u5bc6\u94a5\u662f\u542c\u5230\u4e86\u3001\u8fd8\u662f\u4e3b\u52a8\u590d\u5236\u7684\u201d\u3002',
  '- **\u591a\u8d26\u53f7\u9694\u79bb\u53d6\u51b3\u4e8e\u7528\u6237\u4e60\u60ef**\u3002\u9ed8\u8ba4\u4e0d\u9694\u79bb\u5e26\u6765\u591a\u8d26\u53f7\u80fd\u529b\uff1b',
  '  \u5982\u679c\u4f60\u8fd0\u884c\u591a\u8d26\u53f7\uff0c\u8bf7\u4f7f\u7528\u4e0d\u540c\u7684\u8d26\u53f7 / \u5de5\u4f5c\u533a\u3002',
  '',
  '## 7. \u672a\u5904\u7406\u7684\u5177\u4f53\u5a01\u80c1',
  '',
  '\u4ee5\u4e0b\u5a01\u80c1\u5df2\u77e5\u4f46\u672a\u88ab\u672c\u4ed3\u7684\u4fdd\u62a4\u5c42\u6240\u8986\u76d6\uff0c\u4ee5\u4f5c\u4e3a\u672a\u6765\u7684\u5de5\u4f5c\u9879\uff1a',
  '',
  '- \u8de8\u8bbe\u5907\u540c\u6b65\u3002\u672c\u5730\u6570\u636e\u5e93\u662f\u4ee5\u6587\u4ef6\u4e3a\u57fa\u7840\u7684\uff1b\u8de8\u8bbe\u5907\u4e0e\u8de8\u5b89\u5168\u4f26\u57df',
  '  \uff08\u5982\u4e0d\u540c\u5e73\u53f0\u3001\u4e0d\u540c\u7f51\u7edc\uff09\u540c\u6b65\u672a\u5168\u9762\u5b9e\u73b0\u3002\u8de8\u8bbe\u5907\u52a0\u5bc6\u540c\u6b65\u662f\u672a\u6765\u7684\u5de5\u4f5c\u9879\u3002',
  '- **\u4f9b\u5e94\u94fe\u53ef\u89c1\u6027**\u3002\u684c\u9762\u7aef\u4f7f\u7528\u4e0d\u8d70 npm \u4ee3\u7406\u7684 npm install\uff1b\u5982\u679c\u4f60\u4f7f\u7528\u4e86\u4ee3\u7406\uff0c',
  '  \u8bf7\u68c0\u67e5\u8be5\u4ee3\u7406\u4f1a\u4e0d\u4f1a\u4ee3\u7406\u6210\u672c\u5e93\u3002',
  '- **\u6a21\u578b\u8f93\u51fa\u4e2d\u7684\u53ef\u6267\u884c\u5185\u5bb9**\u3002\u5f53\u524d\u539f\u5219\u662f\u201c\u5c06\u6a21\u578b\u8f93\u51fa\u5f53\u4f5c\u6570\u636e\u201d\uff0c',
  '  \u4f46\u4ec5\u9760\u201c\u4ee3\u7801\u6267\u884c\u9700\u8981\u663e\u5f0f\u7528\u6237\u786e\u8ba4\u201d\u4e0d\u8db3\u4ee5\u9632\u5fa1\u4e00\u4e2a\u5f88\u719f\u6089\u7684\u7528\u6237\u5728',
  '  \u70b9\u51fb\u591a\u4e2a\u201c\u540c\u610f\u201d\u540e\u88ab\u5e26\u8d70\u3002',
  '- **\u672a\u63d0\u4f9b\u53ef\u89c1\u6027\u7684\u8f85\u52a9\u8fdb\u7a0b\u65e5\u5fd7**\uff08CodeGraph\u3001EverOS\uff09\u3002',
  '  \u4e0b\u4e00\u4e2a\u7248\u672c\u53ef\u4ee5\u63d0\u4f9b\u53ef\u67e5\u770b\u3001\u53ef\u7b7e\u540d\u3001\u53ef\u4f9b\u6cd5\u52a1\u8bc1\u636e\u7684\u8f85\u52a9\u8fdb\u7a0b\u65e5\u5fd7\u3002',
  '',
  '## 8. \u66f4\u65b0\u672c\u6587\u4ef6',
  '',
  '\u8be5\u5a01\u80c1\u6a21\u578b\u4ee5 V2.5 \u4e3a\u7ebf\u8bbe\u5b9a\u3002\u6bcf\u6b21\u53d1\u5e03\u91cd\u8981\u91cc\u7a0b\u7891\u540e\u8bf7\u68c0\u67e5\u672c\u6587\u4ef6\uff1a',
  '',
  '- \u662f\u5426\u9700\u8981\u6dfb\u52a0\u65b0\u7684\u5a01\u80c1\u578b\uff1f',
  '- \u662f\u5426\u9700\u8981\u4fee\u6539\u73b0\u6709\u5a01\u80c1\u7684\u4f18\u5148\u7ea7\uff1f',
  '- \u662f\u5426\u6709\u65b0\u51fa\u73b0\u7684\u201c\u8fb9\u754c\u4e4b\u5916\u201d\u573a\u666f\u9700\u8981\u5728\u672c\u6587\u4ef6\u4e2d\u8868\u8ff0\uff1f',
  '',
  '\u4fee\u6539\u672c\u6587\u4ef6\u540e\u8bf7\u540c\u6b65\u66f4\u65b0 `BRANDING_AND_LICENSE.md` \u4e2d\u7684\u5bf9\u5e94\u8f6c\u6362\u3002',
  '',
  '## 9. \u4e0e\u5176\u4ed6\u6587\u4ef6\u7684\u5173\u7cfb',
  '',
  '- `SECURITY.md` \u2014 \u4f9b\u5e94\u4efb\u52a1\u3001\u4e0a\u62a5\u6d41\u7a0b\u3001\u5408\u4f5c\u62ab\u9732\u3002',
  '- `BRANDING_AND_LICENSE.md` \u2014 \u4f9b\u5e94\u94fe\u3001\u4f9b\u5e94\u8005\u3001\u54c1\u724c / \u54c1\u724c\u6cd5\u3002',
  '- `docs/HANDBOOK.md` \u2014 \u603b\u4f53\u67b6\u6784\u3001\u90e8\u7f72\u6a21\u5f0f\u3001\u4f5c\u8005\u3001\u7ef4\u62a4\u8005\u3002',
  '- `docs/handbook/ARCHITECTURE.md` \u2014 \u5b89\u5168\u6027\u67b6\u6784\u7ec6\u8282\u3002'
];

const ZH_PATH = path.join(ROOT, 'THREAT_MODEL.zh-CN.md');
const ZH_CONTENT = ZH_LINES.join('\n') + '\n';
fs.writeFileSync(ZH_PATH, ZH_CONTENT, 'utf8');
console.log('  wrote ' + ZH_PATH + ' (' + Buffer.byteLength(ZH_CONTENT, 'utf8') + ' bytes; ' + ZH_LINES.length + ' lines)');

// Update README.i18n.md: add THREAT_MODEL.zh-CN row.
let i18n = fs.readFileSync(I18N, 'utf8');

const oldTableTail =
  '| SECURITY (monorepo) | Simplified Chinese (zh-CN) | `SECURITY.zh-CN.md` (outer root) | **Live, V2.10.18** (full translation of the outer SECURITY.md; supported versions + deployment guidance + fork publishing checklist + vulnerability reporting) | Cubecloud Contributors + Community |\n';

const newTableTail =
  '| SECURITY (monorepo) | Simplified Chinese (zh-CN) | `SECURITY.zh-CN.md` (outer root) | **Live, V2.10.18** (full translation of the outer SECURITY.md; supported versions + deployment guidance + fork publishing checklist + vulnerability reporting) | Cubecloud Contributors + Community |\n' +
  '| THREAT_MODEL (monorepo) | English | `THREAT_MODEL.md` (outer root) | Live (hardlink to inner) | Cubecloud Contributors |\n' +
  '| THREAT_MODEL (monorepo) | Simplified Chinese (zh-CN) | `THREAT_MODEL.zh-CN.md` (outer root) | **Live, V2.10.19** (full translation of the outer THREAT_MODEL.md; trust boundary + assets + adversaries + sidecar boundary + residual risk + unhandled threats) | Cubecloud Contributors + Community |\n';

if (!i18n.includes(oldTableTail)) {
  console.error('  manifest table tail not found; aborting');
  process.exit(1);
}
if (i18n.includes('**Live, V2.10.19**')) {
  console.log('  manifest already has V2.10.19; skipping');
} else {
  i18n = i18n.split(oldTableTail).join(newTableTail);
  fs.writeFileSync(I18N, i18n);
  console.log('  README.i18n.md table updated with V2.10.19 row; size now: ' + fs.statSync(I18N).size + ' bytes');
}

// Append V2.10.19 to BRANDING.
let branding = fs.readFileSync(BRANDING, 'utf8');
if (branding.includes('## V2.10.19')) {
  console.log('  BRANDING already has V2.10.19; skipping');
} else {
  const block = [
    '',
    '',
    '## V2.10.19 ' + EM_DASH + ' Outer monorepo THREAT_MODEL.zh-CN.md (core 4 complete)',
    '',
    '**Scope:** outer monorepo root. 1 new file:',
    '`THREAT_MODEL.zh-CN.md`. Plus a manifest update.',
    '',
    '**What changed (V2.10.19):**',
    '',
    '1. Created `THREAT_MODEL.zh-CN.md` at the outer root. It',
    '   is a Simplified Chinese translation of the outer',
    '   `THREAT_MODEL.md` (6,249 bytes), covering: \u4fe1\u4efb\u8fb9\u754c\u3001',
    '   \u4fdd\u62a4\u7684\u8d44\u4ea7\u3001\u9632\u5fa1\u7684\u5bf9\u624b\u3001\u4e0d\u9632\u5fa1\u7684\u5bf9\u624b\u3001',
    '   \u8f85\u52a9\u8fdb\u7a0b\u8fb9\u754c\u3001\u5269\u4f59\u98ce\u9669\u3001\u672a\u5904\u7406\u7684\u5177\u4f53\u5a01\u80c1\u3001',
    '   \u66f4\u65b0\u672c\u6587\u4ef6\u3001\u4e0e\u5176\u4ed6\u6587\u4ef6\u7684\u5173\u7cfb\u3002',
    '2. Updated `README.i18n.md` to add 2 new rows:',
    '   English monorepo THREAT_MODEL (live via the V2.10.8',
    '   hardlink) + Simplified Chinese monorepo THREAT_MODEL',
    '   (Live, V2.10.19).',
    '3. No source code change. No `package.json` /',
    '   `scripts/sync-docs.ps1` / `.gitignore` change. The new',
    '   file is NOT mirrored to the inner (the outer + inner',
    '   `THREAT_MODEL.md` are the same Windows hardlink per the',
    '   V2.10.8 audit, but the `.zh-CN.md` sibling is independent).',
    '',
    '**Why this was the right next V2.10.x step:**',
    '',
    'After V2.10.16 (README), V2.10.17 (CONTRIBUTING), and',
    'V2.10.18 (SECURITY), the **core 4 outer monorepo docs**',
    'for Chinese-speaking users are now complete. A Chinese-',
    'speaking user landing on the outer root can read all 4',
    'primary docs in their own language: what the project is,',
    'how to contribute, how to deploy safely, and what threats',
    'are in scope. The next tier (HANDBOOK + 4 handbook',
    'files) is larger (26.6 KB + 42 KB) and can ship in',
    'follow-up V2.10.x turns.',
    '',
    '**Out of scope (V2.10.20+ candidates):**',
    '',
    '- `docs/HANDBOOK.md` zh-CN translation (26.6 KB).',
    '- 4 `docs/handbook/*.md` zh-CN translations (~42 KB).',
    '- `docs/RETIRED_AND_LEGACY.md` zh-CN (12.9 KB, low priority).',
    '- Screenshot refresh pass (regenerate 23 preview PNGs).',
    '- Native-speaker polish of V2.10.16/17/18/19 translations.'
  ];
  branding = branding + block.join('\n') + '\n';
  fs.writeFileSync(BRANDING, branding);
  console.log('  V2.10.19 sub-section appended to BRANDING; size now: ' + fs.statSync(BRANDING).size + ' bytes');
}

// Append V2.10.19 row to RETIRED.
let retired = fs.readFileSync(RETIRED, 'utf8');
if (retired.includes('V2.10.19')) {
  console.log('  RETIRED already has V2.10.19; skipping');
} else {
  const lines = retired.split(/\r?\n/);
  let v21018Row = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Outer monorepo SECURITY.zh-CN.md + fixptbr retire')) {
      v21018Row = i;
    }
  }
  if (v21018Row < 0) {
    console.error('  RETIRED V2.10.18 row not found; aborting');
    process.exit(1);
  }
  const v21019Row = '| Outer monorepo THREAT_MODEL.zh-CN.md | `THREAT_MODEL.zh-CN.md` (outer root, NEW) | **Live, V2.10.19** (1 new file + manifest update) | A Simplified Chinese translation of the outer `THREAT_MODEL.md`. Completes the **core 4 outer monorepo docs** for Chinese readers: README + CONTRIBUTING + SECURITY + THREAT_MODEL. Outer + inner `THREAT_MODEL.md` are still the same hardlink (V2.10.8); the `.zh-CN.md` sibling is independent. |';
  lines.splice(v21018Row + 1, 0, v21019Row);
  retired = lines.join('\n');
  fs.writeFileSync(RETIRED, retired);
  console.log('  V2.10.19 row inserted after V2.10.18 in RETIRED; size now: ' + fs.statSync(RETIRED).size + ' bytes');
}
