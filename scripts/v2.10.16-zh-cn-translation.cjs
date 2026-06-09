// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// scripts/v2.10.16-zh-cn-translation.cjs -- V2.10.16 i18n cleanup.
//
// (1) Delete the 3 V2.10.15 placeholder files at the outer root.
// (2) Update README.i18n.md to reflect: outer has zh-CN live,
//     no ja-JP/ko-KR yet; the inner 4 CJK files are kept (they
//     are real, valid UTF-8 community translations -- my V2.10.7
//     manifest entry's mojibake display was PowerShell corruption,
//     not actual file content).
// (3) Write a real Simplified Chinese translation of the outer
//     README.md to README.zh-CN.md.
// (4) Append V2.10.16 to BRANDING and RETIRED.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BRANDING = path.join(ROOT, 'BRANDING_AND_LICENSE.md');
const RETIRED = path.join(ROOT, 'docs', 'RETIRED_AND_LEGACY.md');
const I18N = path.join(ROOT, 'README.i18n.md');

const EM_DASH = '\u2014';
const SECTION_SIGN = '\u00a7';

// (1) Delete the 3 V2.10.15 placeholders.
for (const lang of ['ja-JP', 'zh-CN', 'ko-KR']) {
  const p = path.join(ROOT, 'README.' + lang + '.md');
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log('  deleted README.' + lang + '.md');
  } else {
    console.log('  README.' + lang + '.md not present; skipping');
  }
}

// (3) Write a real Simplified Chinese translation of the outer README.
// The Chinese text below is real UTF-8 (not \\uXXXX escapes) so the file
// contains actual Chinese bytes (E4 BD A0 etc.), not literal \\u sequences.
const ZH_LINES = [
  '# Cubecloud Agentic-OS \u4e2d\u6587\u6587\u6863\uff08zh-CN\uff09',
  '',
  '> **\u672c\u5730\u4e3b\u5bfc\u3001\u591a\u8fd0\u884c\u65f6\u3001\u62e5\u6709\u6280\u80fd\u5305\u7684\u684c\u9762\u7aef\u667a\u80fd\u4f53\u64cd\u4f5c\u7cfb\u7edf\u3002**',
  '> \u4e0d\u662f\u804a\u5929\u5de5\u5177\u7684\u5916\u58f3\u3002\u4e0d\u662f\u4e91\u7aef IDE\u3002\u662f\u4e00\u4e2a\u81ea\u6258\u7ba1\u7684\u63a7\u5236\u53f0\uff0c',
  '> \u7528\u6237\u62e5\u6709\u8fd0\u884c\u65f6\u3001\u6a21\u578b\u3001\u6570\u636e\u4e0e\u6280\u80fd\u5305\uff0c\u2014\u2014 \u684c\u9762\u7aef\u662f\u4e00\u5207\u7684\u5165\u53e3\u3002',
  '',
  '## \u672c\u9879\u76ee\u662f\u4ec0\u4e48',
  '',
  'Cubecloud Agentic-OS \u662f **Cubecloud Agent Desktop** \u53ca\u5176\u5468\u8fb9\u751f\u6001\u7684\u5355\u4ed3\u6e90\u7801\u4ed3\u3002',
  '\u684c\u9762\u7aef\u4e8c\u8fdb\u5236\u6587\u4ef6\u4f4d\u4e8e [`agent-desktop/`](agent-desktop/)\uff08\u4ea4\u4ed8\u7ed9\u7ec8\u7aef\u7528\u6237\u7684\u5b8c\u6574 Electron \u5e94\u7528\uff09\uff1b',
  'agentic-OS \u539f\u521b\u7684\u72b6\u6001\u5c42\u3001\u9884\u542f\u52a8\u79cd\u5b50\u4e0e\u5f00\u53d1\u8005\u6280\u80fd\u751f\u6001\u5206\u522b\u4f4d\u4e8e',
  '[`apps/desktop-shell/`](apps/desktop-shell/)\u3001[`packages/platform-core/`](packages/platform-core/)',
  '\u4e0e [`.agents/`](.agents/)\u3002',
  '**\u684c\u9762\u7aef\u662f\u5165\u53e3\uff1bagentic-OS \u662f\u8fd0\u884c\u6a21\u578b\u3002**',
  '',
  '\u9996\u6b21\u542f\u52a8\u65f6\u7528\u6237\u5f97\u5230\u7684\u5185\u5bb9\uff1a',
  '',
  '- **\u672c\u5730\u684c\u9762\u7aef**\uff08Electron + React 19 + i18next\uff0cVite + electron-builder\uff09\u2014\u2014\u5c06\u672c\u5730\u6216\u8fdc\u7a0b\u7684 agent \u8fd0\u884c\u65f6\u5c01\u88c5\u4e3a\u5355\u4e00 GUI\uff0c\u8ba9\u7528\u6237\u65e0\u9700\u624b\u52a8\u7ba1\u7406 CLI\u3002',
  '- **\u591a\u8fd0\u884c\u65f6\u9009\u62e9\u5668**\u2014\u2014\u5f53\u524d\u4e3a Hermes\uff0cV2.6 ' + EM_DASH + ' V2.7 \u5c06\u52a0\u5165 OpenClaw \u4e0e IronClaw\u3002\u540c\u4e00\u53f0\u673a\u5668\u53ef\u8fd0\u884c\u591a\u4e2a\u8fd0\u884c\u65f6\uff08Hermes \u4e8e `127.0.0.1:8642` + OpenClaw \u4e8e `127.0.0.1:18789` + IronClaw \u4e8e Docker \u53d1\u5e03\u7684\u7aef\u53e3\uff09\uff0c\u684c\u9762\u7aef\u8fd0\u884c\u65f6\u9009\u62e9\u5668\u5c06\u804a\u5929\u8bf7\u6c42\u8f6c\u53d1\u5230\u6b63\u786e\u7684\u8fd0\u884c\u65f6\u3002',
  '- **\u672c\u5730\u4e3b\u5bfc\u4fe1\u4efb\u8fb9\u754c**\u2014\u2014agent \u8fd0\u884c\u65f6\u8fd0\u884c\u4e8e\u7528\u6237\u4e0a\u4e0b\u6587\uff0c\u6e32\u67d3\u8fdb\u7a0b\u7531 Electron \u6807\u51c6\u9694\u79bb\u673a\u5236\u6c99\u7bb1\u5316\uff0cIPC \u901a\u9053\u4e3a\u663e\u5f0f\u4e14\u4e0d\u53ef\u731c\u6d4b\uff0c\u51fa\u7ad9\u7f51\u7edc\u9700\u7528\u6237\u542f\u7528\uff0c\u5165\u7ad9\u7f51\u7edc\u5728\u7528\u6237\u6307\u5b9a\u7aef\u53e3\u4e0a\u542f\u7528\u3002',
  '- **\u4e0e\u8fd0\u884c\u65f6\u5c42\u5206\u79bb\u7684\u63d0\u4f9b\u8005\u5c42**\uff1aOllama\u3001vLLM\u3001llama.cpp \u672c\u5730\u73af\u56de\uff0c\u6216\u4efb\u4f55 OpenAI \u517c\u5bb9\u7684\u8fdc\u7a0b API\uff08OpenRouter\u3001Anthropic\u3001OpenAI\u3001Google Gemini\u3001xAI Grok\u3001Nous Portal\u3001Qwen\u3001Hugging Face\u3001Groq\u3001Azure OpenAI \u7b49\uff09\u3002\u672c\u5730\u63d0\u4f9b\u8005\u5747\u4e3a MIT / Apache-2.0\uff1b\u684c\u9762\u7aef\u4e0d\u6253\u5305\u3001\u4e0d\u53d1\u5e03\u3001\u4e0d\u5b89\u88c5\u4efb\u4f55\u4e00\u4e2a\uff0c\u4ec5\u8bfb\u53d6\u5176 HTTP \u534f\u8bae\u3002',
  '- **34 \u4e2a\u4e00\u7ebf\u5f00\u6e90\u6280\u80fd\u5305**\uff0c\u4f4d\u4e8e [`.agents/skills/`](.agents/skills/)\uff08\u8d21\u732e\u8005\u5de5\u4f5c\u9762\uff09\uff0c\u5176\u4e2d **3 \u4e2a\u88ab\u63a8\u5e7f\u4e3a\u9996\u542f\u52a8\u7528\u6237\u53ef\u89c1**\uff08`cubecloud-persona`\u3001`cubecloud-onboarding`\u3001`cubegraph-code-intel`\uff09\u3002\u8be5 34 \u4e2a\u6280\u80fd\u5305\u6c89\u7f16\u81ea 7 \u4e2a\u4e0a\u6e38\u5f00\u6e90\u6280\u80fd\u4ed3\u5e93\uff08autoresearch\u3001poskills\u3001ECC\u3001gbrain\u3001gstack\u3001andrej-karpathy-skills\u3001superpowers\uff09\uff0c\u5168\u5c40\u955c\u50cf\u5230 `~/.agents/skills/`\uff0c\u8bbe\u8ba1\u4e3a\u53ef\u5728**\u4efb\u4f55**\u8bfb\u53d6\u8be5\u76ee\u5f55\u7684 agent \u5e26\u5b50\u4e2d\u81ea\u52a8\u52a0\u8f7d\uff0c\u800c\u4e0d\u4ec5\u9650\u4e8e Copilot\u3002',
  '- **\u9884\u542f\u52a8\u5305**\uff1a6 \u4e2a\u8bb0\u5fc6\u79cd\u5b50\u3001 3 \u4e2a\u9ed8\u8ba4\u7981\u7528\u7684\u5e26\u5b50\u3001 1 \u4e2a\u9ed8\u8ba4\u7981\u7528\u7684\u8ba1\u5212\u4efb\u52a1\u3001 1 \u4e2a\u5165\u95e8\u770b\u677f\uff1b\u7528\u6237\u9996\u6b21\u4f1a\u8bdd\u4e0d\u662f\u7a7a\u72b6\u6001\uff0c\u800c\u662f\u4e00\u4e2a\u53ef\u4ee5\u968f\u65f6\u5220\u9664\u7684\u7cbe\u5fc3\u8d77\u70b9\u3002',
  '- \u53ef\u9009 **CodeGraph** \u8bed\u4e49\u4ee3\u7801\u667a\u80fd\u9762\u677f\uff08MCP\uff09\u548c\u53ef\u9009 **EverOS** \u8f85\u52a9\u8fdb\u7a0b\uff08HTTP\uff0c\u8bb0\u5fc6 + \u5e26\u5b50\uff09\u3002\u684c\u9762\u7aef\u4ece\u4e0d\u81ea\u52a8\u5b89\u88c5\uff0c\u4e24\u8005\u5747\u4e3a\u7528\u6237\u4e3b\u52a8\u89e6\u53d1\u3002',
  '',
  '\u7528\u6237\u4e0d\u4f1a\u5f97\u5230\u4ee5\u4e0b\u4e1c\u897f\uff0c\u4ee5\u53ca\u539f\u56e0\uff1a',
  '',
  '- **\u4e0d\u662f\u6a21\u578b\u670d\u52a1\u5668**\u3002\u684c\u9762\u7aef\u4e0d\u6258\u7ba1\u6743\u91cd\uff0c\u4e0d\u8fd0\u884c\u63a8\u7406\uff0c\u4e0d\u4e0e Ollama / vLLM / llama.cpp \u7ade\u4e89\u3002\u5b83\u662f\u8fd9\u4e9b\u5de5\u5177\u7684\u5ba2\u6237\u7aef\u3002',
  '- **\u4e0d\u662f\u7eaf\u4ea7\u54c1\u4ed3\u5e93**\u3002\u6e90\u7801\u6811\u7684\u5f88\u5927\u4e00\u90e8\u5206\u6c89\u7ee7\u81ea\u4e0a\u6e38 `hermes-desktop` \u6846\u67b6\uff08MIT\uff09\uff0c[`BRANDING_AND_LICENSE.md`](BRANDING_AND_LICENSE.md) \u4e2d\u7684\u53cc\u8bb8\u53ef8a0\u5b9a\u4f4d\u533a\u5206\u4e86\u6c89\u7ee7\u6846\u67b6\u4e0e Cubecloud \u539f\u521b\u90e8\u5206\u3002',
  '- **\u4e0d\u9501\u5b9a\u67d0\u4e00\u5382\u5546**\u3002\u7528\u6237\u53ef\u4ee5\u5c06 Hermes \u6362\u4e3a OpenClaw\u3001\u5c06 OpenAI \u6362\u4e3a Ollama\u3001\u5c06\u684c\u9762\u7aef\u6362\u4e3a CLI\uff0c\u4ecd\u80fd\u4fdd\u7559\u6280\u80fd\u5305\u3002agentic-OS \u662f\u8fd0\u884c\u6a21\u578b\uff0c\u800c\u4e0d\u662f\u54c1\u724c\u3002',
  '',
  '## \u4e3a\u4ec0\u4e48\u8981\u505a\u8fd9\u4ef6\u4e8b',
  '',
  '\u4ee5\u4e0b\u4e09\u9879\u627f\u8bfa\u6309\u91cd\u8981\u6027\u987a\u5e8f\u9a71\u52a8\u4e86\u8bbe\u8ba1\uff1a',
  '',
  '1. **\u7528\u6237\u4e0d\u5e94\u8be5\u4e3a\u4f7f\u7528\u684c\u9762\u7aef\u800c\u63a5\u89e6 CLI**\u3002\u5b89\u88c5\u3001\u914d\u7f6e\u3001\u804a\u5929\u3001\u5b9a\u65f6\u4efb\u52a1\u3001\u5907\u4efd\u3001\u66f4\u65b0\u2014\u2014\u90fd\u5728 GUI \u4e2d\u5b8c\u6210\u3002',
  '2. **\u7528\u6237\u4e0d\u5e94\u8be5\u88ab\u9501\u5b9a\u5728\u67d0\u4e00\u8fd0\u884c\u65f6\u6216\u67d0\u4e00\u63d0\u4f9b\u8005\u4e0a**\u3002\u4eca\u5929\u662f Hermes\uff0c\u660e\u5929\u662f OpenClaw / IronClaw\uff1b\u4eca\u5929\u6709 Ollama\u3001vLLM\u3001llama.cpp\u3001OpenRouter\u3001Azure OpenAI\uff0c\u660e\u5929\u4f1a\u66f4\u591a\u3002',
  '3. **\u7528\u6237\u4e0d\u5e94\u8be5\u88ab\u9501\u5b9a\u5728\u4e00\u4e2a\u65e0\u6cd5\u4f7f\u7528\u7684\u8bb8\u53ef\u8bc1\u4e0a**\u3002Cubecloud \u539f\u521b\u90e8\u5206\u91c7\u7528\u53cc\u8bb8\u53ef\uff08AGPL-3.0-or-later \u4e3a\u4e3b\uff0cApache-2.0 \u4e0e MIT \u4f5c\u4e3a\u517c\u5bb9\u9009\u9879\uff09\uff1b\u6c89\u7ee7\u6846\u67b6\u4fdd\u6301 MIT\uff1b\u4e0b\u6e38\u6d88\u8d39\u8005\u9009\u62e9\u9002\u5408\u81ea\u5df1\u673a\u6784\u653f\u7b56\u7684\u8bb8\u53ef\u8bc1\u3002',
  '',
  '\u8fd9\u4e09\u9879\u627f\u8bfa\u5e26\u51fa\u4e09\u4e2a\u968f\u4e4b\u800c\u6765\u7684\u540e\u679c\uff1a',
  '',
  '- \u4e00\u4e2a**\u5e7f\u9614\u7684 IPC \u8868\u9762**\uff08`agent-desktop/src/main/`\u3001`agent-desktop/src/preload/`\uff09\u5411\u6e32\u67d3\u8fdb\u7a0b\u66b4\u9732\u4e86\u8fd0\u884c\u65f6\u3001\u6a21\u578b\u6ce8\u518c\u8868\u3001\u63d0\u4f9b\u8005\u6ce8\u518c\u8868\u3001\u6280\u80fd\u6e47\u8868\u3001\u8bb0\u5fc6\u5e73\u9762\u3001\u5b9a\u65f6\u4efb\u52a1\u8c03\u5ea6\u5668\u4e0e\u7f51\u5173\u5c42\u3002\u8be5\u8868\u9762\u662f\u96c6\u6210\u8fb9\u754c\uff0c\u4e5f\u662f\u6c89\u7ee7\u6846\u67b6\u4ee3\u7801\u4e2d\u6700\u5927\u7684\u90e8\u5206\u3002',
  '- \u4e00\u4efd**\u591a\u8fd0\u884c\u65f6\u7f16\u6392\u8ba1\u5212**\uff08[`docs/RUNTIME_ORCHESTRATION_PLAN.md`](docs/RUNTIME_ORCHESTRATION_PLAN.md)\uff09\uff0c\u8ba9 Hermes \u662f\u9996\u65e5\u4e3b\u9053\uff0c\u5e76\u5728 V2.6 ' + EM_DASH + ' V2.7 \u7a97\u53e3\u5185\u52a0\u5165 OpenClaw\u4e0e IronClaw \u4f5c\u4e3a\u9644\u52a0\u4e3b\u9053\u3002',
  '- \u4e00\u4e2a** 34 \u6280\u80fd\u5305\u5f00\u53d1\u8005\u751f\u6001**\uff0c\u4f4d\u4e8e [`.agents/skills/`](.agents/skills/)\uff0c\u8ba9\u6784\u5efa\u684c\u9762\u7aef\u7684\u5f00\u53d1\u8005\u53d7\u76ca\uff0c\u800c\u4e0d\u4ec5\u4ec5\u662f\u8fd0\u884c\u684c\u9762\u7aef\u7684\u7528\u6237\u3002\u8fd9\u4e9b\u6280\u80fd\u540c\u65f6\u88ab\u955c\u50cf\u5230\u5168\u673a\u5668\u7684 `~/.agents/skills/` \u76ee\u5f55\uff0c\u56e0\u6b64\u4ed6\u4eec\u4f1a\u5728\u540c\u4e00\u53f0\u673a\u5668\u4e0a\u7684**\u4efb\u4f55** Copilot \u5de5\u4f5c\u533a\u4e2d\u81ea\u52a8\u52a0\u8f7d\uff0c\u800c\u4e0d\u4ec5\u4ec5\u662f `cubecloud-agentic-os`\u3002',
  '',
  '## \u4e0e\u5176\u4ed6 agentic-OS / agent-desktop \u9879\u76ee\u7684\u533a\u522b',
  '',
  '\u4ee5\u4e0b\u5217\u8868\u7b80\u8981\u5217\u51fa **agentic-OS \u6a21\u578b** \u4e0e\u53ef\u6bd4\u9879\u76ee\u7684\u533a\u522b\u3002',
  '\u8fd9\u4e0d\u662f\u7ade\u4e89\u6027\u5bf9\u6bd4\uff0c\u800c\u662f\u5b9a\u4f4d\u8bf4\u660e\u3002',
  '',
  '| \u9879\u76ee | \u5f62\u6001 | \u8fd0\u884c\u65f6 | \u63d0\u4f9b\u8005 | \u6280\u80fd | \u8bb8\u53ef | \u672c\u5730\u4e3b\u5bfc |',
  '|---|---|---|---|---|---|---|',
  '| **Cubecloud Agentic-OS**\uff08\u672c\u4ed3\uff09 | \u672c\u5730\u684c\u9762\u7aef\uff08Electron\uff09 | \u591a\uff1aHermes\u3001OpenClaw\u3001IronClaw | \u4efb\u4f55 OpenAI \u517c\u5bb9\uff0c\u672c\u5730 + \u8fdc\u7a0b | 34 \u4e2a\u4e00\u7ebf\uff0c\u6765\u81ea 7 \u4e2a\u4e0a\u6e38\u4ed3\u5e93\uff0c\u5168\u5c40\u955c\u50cf | \u53cc\u8bb8\uff1aAGPL-3.0\uff08\u4e3b\uff09 / Apache-2.0 / MIT | \u662f\u2014\u2014\u4fe1\u4efb\u8fb9\u754c\u4e3a\u672c\u5730\u7528\u6237 |',
  '| [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) | \u7ec8\u7aef / IDE \u63d2\u4ef6 | \u5355\u5382\u5546\uff08Anthropic\uff09 | Anthropic API + \u51e0\u4e2a\u4ee3\u7406 | \u6280\u80fd\uff08\u8fd1\u671f\uff0c\u751f\u6001\u8f83\u5c0f\uff09 | \u4e13\u6709 | \u90e8\u5206\u2014\u2014\u9ed8\u8ba4\u4e91 |',
  '| [Cursor](https://cursor.com/) | IDE \u5206\u652f\uff08VS Code\uff09 | \u5355\u5382\u5546\uff08\u4e13\u6709\uff09 | OpenAI\u3001Anthropic\u3001Google \u7b49 | \u5185\u8054\u63d0\u793a\uff0c\u65e0\u516c\u5f00\u6280\u80fd\u4ed3 | \u4e13\u6709 | \u5426\u2014\u2014\u9ed8\u8ba4\u4e91 |',
  '| [GitHub Copilot Coding Agent](https://github.com/features/copilot/agents) | \u4e91 agent + IDE | \u5355\u5382\u5546\uff08GitHub\uff09 | OpenAI\u3001Anthropic\u3001Google | \u8def\u5f84\u7279\u5b9a\u6307\u4ee4\uff08`copilot-instructions.md`\uff09 | \u4e13\u6709 | \u5426 |',
  '| [Claude Quickstarts](https://github.com/anthropics/anthropic-quickstarts) | \u53c2\u8003\u4ee3\u7801\uff0c\u975e\u4ea7\u54c1 | \u5355\u5382\u5546\uff08Anthropic\uff09 | Anthropic API | \u4e0d\u9002\u7528\uff08\u53c2\u8003\u5e94\u7528\uff09 | MIT | \u4ec5\u4f5c\u53c2\u8003 |',
  '| [ChatGPT Atlas](https://chatgpt.com/atlas) | \u6d4f\u89c8\u5668 | \u5355\u5382\u5546\uff08OpenAI\uff09 | OpenAI API | \u6709\u9650 | \u4e13\u6709 | \u5426 |',
  '| [Codex CLI](https://github.com/openai/codex) | \u7ec8\u7aef | \u5355\u5382\u5546\uff08OpenAI\uff09 | OpenAI API | \u6280\u80fd\uff08\u65e9\u671f\uff09 | Apache-2.0 | \u90e8\u5206 |',
  '',
  '\u4e0d\u540c\u70b9\u7684\u56db\u4e2a\u7ef4\u5ea6\uff1a',
  '',
  '1. **\u591a\u8fd0\u884c\u65f6\uff0c\u975e\u5355\u5382\u5546**\u3002\u622a\u81f3 2026 \u5e74 6 \u6708\uff0c\u4eca\u5929\u6ca1\u6709\u5176\u4ed6 agent-desktop \u9879\u76ee\u63d0\u4f9b\u8fd0\u884c\u65f6\u9009\u62e9\u5668\uff1b\u7528\u6237\u88ab\u9501\u5b9a\u5728\u5199\u5305\u88c5\u7684\u5382\u5546\u4e0a\u3002Cubecloud \u5728 V2.6 ' + EM_DASH + ' V2.7 \u7a97\u53e3\u52a0\u5165 OpenClaw \u4e0e IronClaw \u4f5c\u4e3a\u4e00\u7ebf\u4e3b\u9053\u3002\u53c2\u89c1 [`docs/RUNTIME_ORCHESTRATION_PLAN.md`](docs/RUNTIME_ORCHESTRATION_PLAN.md)\u3002',
  '2. **\u6280\u80fd\u4f5c\u4e3a\u4e00\u7ebf\u4ea7\u7269**\u3002\u591a\u6570\u9879\u76ee\u5c06\u6280\u80fd / \u659c\u6760\u547d\u4ee4 / \u7cfb\u7edf\u63d0\u793a\u7247\u6bb5\u89c6\u4e3a\u5378\u67b6\u5b57\u7b26\u4e32\u3002Cubecloud \u7684 34 \u6280\u80fd\u751f\u6001\u662f\u4e00\u4e2a**\u5e26\u7248\u672c\u7684\u76ee\u5f55**\uff0c\u5305\u542b name+description \u524d\u7f6e\u3001Description Trap\uff08description \u4e2d\u4e0d\u542b\u8fc7\u7a0b\u603b\u7ed3\uff09\u3001\u6bcf\u4e2a\u6280\u80fd\u7684 red-baseline \u538b\u529b\u6d4b\u8bd5\uff0c\u4ee5\u53ca\u5168\u5c40\u955c\u50cf\u5230 `~/.agents/skills/`\uff0c\u4ee4\u6280\u80fd\u80fd\u5728**\u4efb\u4f55** Copilot \u5de5\u4f5c\u533a\u4e2d\u81ea\u52a8\u52a0\u8f7d\u3002\u8fd9\u662f [`superpowers`](https://github.com/JZKK720/superpowers) \u7684 TDD-for-skills \u7eaa\u5f8b\u4e0e 7 \u4e2a\u4e0a\u6e38\u6280\u80fd\u4ed3\u5e93\uff08autoresearch\u3001poskills\u3001ECC\u3001gbrain\u3001gstack\u3001andrej-karpathy-skills\uff09\u7684\u8d21\u732e\u3002',
  '3. **\u672c\u5730\u4e3b\u5bfc\u4fe1\u4efb\u8fb9\u754c**\u3002\u51fa\u7ad9\u7f51\u7edc\u9ed8\u8ba4\u4e3a\u9700\u7528\u6237\u542f\u7528\uff0c\u5165\u7ad9\u7f51\u7edc\u9ed8\u8ba4\u4e3a\u9700\u5728\u7528\u6237\u6307\u5b9a\u7aef\u53e3\u4e0a\u542f\u7528\uff0cIPC \u901a\u9053\u4e3a\u663e\u5f0f\u4e14\u4e0d\u53ef\u731c\u6d4b\uff0c\u6e32\u67d3\u8fdb\u7a0b\u88ab\u6c99\u7bb1\u5316\uff0c\u65e0\u8fdc\u7a0b\u4f20\u611f\u3001\u65e0\u5206\u6790\u8c03\u7528\u3001\u65e0\u8fdc\u7a0b\u8bc1\u660e\u3002\u53c2\u89c1 [`SECURITY.md`](SECURITY.md) \u4e0e [`THREAT_MODEL.md`](THREAT_MODEL.md)\u3002',
  '4. **\u5e26\u6c89\u7ee7 MIT \u5256\u51fa\u7684\u53cc\u8bb8\u53ef**\u3002Cubecloud \u539f\u521b\u90e8\u5206\u63d0\u4f9b AGPL-3.0-or-later\uff08\u4e3b\uff09\u3001Apache-2.0\u3001MIT \u4e09\u79cd\u9009\u62e9\uff0c\u7528\u6237\u9009\u62e9\u9002\u5408\u81ea\u5df1\u673a\u6784\u653f\u7b56\u7684\u90a3\u4e2a\u3002\u6c89\u7ee7\u7684 `hermes-desktop` \u6846\u67b6\u4ee3\u7801\u4fdd\u6301\u539f\u59cb MIT \u8bb8\u53ef\u3002\u53c2\u89c1 [`BRANDING_AND_LICENSE.md`](BRANDING_AND_LICENSE.md) \u4e0e [`LICENSE`](LICENSE)\u3002',
  '',
  '## \u6df7\u5408\u6280\u672f\u80fd\u529b\u4e0e\u667a\u80fd\u4f53\u6548\u7387',
  '',
  'agentic-OS \u6a21\u578b\u7684\u201c\u6df7\u5408\u201d\u610f\u4e49\u5728\u4e8e\uff0c\u684c\u9762\u7aef\u4e8c\u8fdb\u5236\u6587\u4ef6\u7ed3\u5408\u4e86\u516d\u4e2a\u72ec\u7acb\u7684\u6280\u672f\u9762\uff0c\u7528\u6237\u53ef\u89c1\u7684\u667a\u80fd\u4f53\u4f53\u9a8c\u53d7\u76ca\u4e8e\u5176\u4e2d\u6bcf\u4e00\u4e2a\u3002\u5176\u5f62\u72b6\uff1a',
  '',
  '- **\u72b6\u6001\u5c42**\uff08[`apps/desktop-shell/src/main/agentControlPlane.ts`](apps/desktop-shell/src/main/agentControlPlane.ts)\uff09\u2014\u2014Cubecloud \u539f\u521b\u7684 SQLite + \u8c03\u5ea6\u903b\u8f91\uff0c\u62e5\u6709\u7528\u6237\u7684\u4eba\u7269\u753b\u50cf\u3001\u4f1a\u8bdd\u3001\u6a21\u578b\u3001\u63d0\u4f9b\u8005\u3001\u6280\u80fd\u3001\u8bb0\u5fc6\u3001\u8ba1\u5212\u4e0e\u770b\u677f\u3002\u6e32\u67d3\u8fdb\u7a0b\u901a\u8fc7 IPC \u4e0e\u5b83\u4ea4\u4e92\uff0c\u800c\u4e0d\u662f\u76f4\u63a5\u8bbf\u95ee\u6570\u636e\u5e93\u3002',
  '- **\u8fd0\u884c\u65f6\u7f16\u6392**\uff08[`agent-desktop/src/main/hermes-runtime/`](agent-desktop/src/main/hermes-runtime/)\u3001`.../openclaw/`\u3001`.../ironclaw/`\uff09\u2014\u2014\u591a\u8fd0\u884c\u65f6\u9009\u62e9\u5668\u3002\u6bcf\u4e2a\u8fd0\u884c\u65f6\u90fd\u6709\u63a2\u6d4b / \u5b89\u88c5 / \u914d\u7f6e / \u4ee3\u7406\u6d41\u7a0b\uff1b\u7528\u6237\u4ece\u8fd0\u884c\u65f6\u9009\u62e9\u5668\u4e2d\u9009\u62e9\uff0c\u800c\u4e0d\u662f\u4ece CLI \u53c2\u6570\u9009\u62e9\u3002',
  '- **\u63d0\u4f9b\u8005\u5c42**\uff08[`apps/desktop-shell/src/main/providerDiscovery.ts`](apps/desktop-shell/src/main/providerDiscovery.ts)\uff09\u2014\u2014\u4e0e\u8fd0\u884c\u65f6\u5c42\u5206\u79bb\u3002\u8fd0\u884c\u65f6\uff08Hermes\uff09\u4e0e\u63d0\u4f9b\u8005\uff08Ollama\u3001vLLM\u3001llama.cpp\u3001OpenAI \u517c\u5bb9\u8fdc\u7a0b\u7b49\uff09\u4ea4\u4e92\u3002\u7528\u6237\u53ef\u4ee5\u4fdd\u5b58\u3001\u547d\u540d\u3001\u5207\u6362\u8de8\u63d0\u4f9b\u8005\u7684\u6a21\u578b\u3002',
  '- **\u6280\u80fd\u5e26\u5b50**\uff08[`agent-desktop/src/main/skills-harness.ts`](agent-desktop/src/main/skills-harness.ts)\uff09\u2014\u2014agent \u8fd0\u884c\u65f6\u7684\u6280\u80fd\u5c42\uff0c\u542b `HIDDEN_SKILLS[]` \u4f5c\u4e3a\u98ce\u683c\uff08\u8bed\u6c14\u3001\u6210\u672c\u3001\u8bb8\u53ef\uff09\uff0c\u5305\u88f9\u6bcf\u4e2a\u51fa\u53e3\u8bf7\u6c42\u3002',
  '- **CodeGraph \u9762**\uff08[`agent-desktop/src/main/codegraph-runtime.ts`](agent-desktop/src/main/codegraph-runtime.ts)\uff09\u2014\u2014CodeGraph \u5c4f\u5e55\u4e24\u4e2a\u540e\u7aef\uff1a\u4e00\u4e2a CLI \u5b50\u8fdb\u7a0b\uff08\u6c89\u7ee7\uff09\u4e0e\u4e00\u4e2a\u5185\u5d4c SDK \u5305\u88c5\uff08Cubecloud \u539f\u521b\uff09\u3002\u53c2\u89c1 [`docs/CODEGRAPH-RUNTIME.md`](docs/CODEGRAPH-RUNTIME.md)\u3002',
  '- **EverOS \u8f85\u52a9\u8fdb\u7a0b**\uff08[`agent-desktop/src/main/everos-sidecar.ts`](agent-desktop/src/main/everos-sidecar.ts)\uff09\u2014\u2014\u53ef\u9009 `everos server start` Python \u8f85\u52a9\u8fdb\u7a0b\u7684\u751f\u547d\u5468\u671f\u7ba1\u7406\u5668\u3002\u9884\u542f\u52a8\u5305\u4e2d\u7684 3 \u4e2a\u9ed8\u8ba4\u7981\u7528\u7684\u5e26\u5b50\uff08`cubecloud-memory-distill`\u3001`cubecloud-cost-watchdog`\u3001`cubecloud-skill-audit`\uff09\u4e3a\u7528\u6237\u53ef\u89c1\u9762\u3002\u53c2\u89c1 [`docs/EVEROS-SIDECAR.md`](docs/EVEROS-SIDECAR.md)\u3002',
  '',
  '**\u667a\u80fd\u4f53\u6548\u7387**\u662f\u5f00\u53d1\u8005\u6280\u80fd\u751f\u6001\u8d21\u732e\u7684\uff0c\u5176\u4e2d [`superpowers`](https://github.com/JZKK720/superpowers) \u7684 14 \u4e2a `sp-*` \u6280\u80fd\u4e3a\u4e3b\u8109\uff1a',
  '',
  '- **`sp-skill-first`**\u2014\u2014\u6bcf\u6761\u6d88\u606f\u524d\uff0c\u667a\u80fd\u4f53\u68c0\u67e5\u76f8\u5173\u6280\u80fd\u3002\u8fd9\u662f\u65b9\u6cd5\u8bba\u7684\u542f\u52a8\u70b9\u3002',
  '- **`sp-tdd`** + **`po-tdd`**\u2014\u2014\u6bcf\u6b21\u4ee3\u7801\u4fee\u6539\u90fd\u662f RED-GREEN-REFACTOR\uff0c\u6bcf\u4e2a\u6280\u80fd\u5728 [`.agents/skills/`](.agents/skills/) \u4e2d\u90fd\u6709\u4e00\u4e2a red-baseline \u538b\u529b\u6d4b\u8bd5\u3002',
  '- **`sp-debug`** + **`po-diagnose`**\u2014\u2014\u51fa\u73b0\u6545\u969c\u65f6\uff0c4 \u9636\u6bb5\u6839\u56e0\u5206\u6790\uff1a\u590d\u73b0 \u2192 \u5047\u8bbe \u2192 \u4eea\u5668\u5316 \u2192 \u4fee\u590d\u5e76\u52a0\u56de\u5f52\u6d4b\u8bd5\u3002',
  '- **`sp-plan`** + **`gstack-plan-{ceo,eng,design}-review`**\u2014\u2014\u8bbe\u8ba1\u5ba1\u6279\u540e\uff0c\u62c6\u5206\u4e3a\u53ef\u54ac\u4e0b\u7684\u4efb\u52a1\u8ba1\u5212\uff1b\u8ba1\u5212\u5ba1\u6279\u540e\uff0c\u4ece CEO / \u67b6\u6784\u8d1f\u8d23\u4eba / \u8bbe\u8ba1\u5ba1\u67e5\u8005\u89d2\u5ea6\u8fdb\u884c\u538b\u529b\u6d4b\u8bd5\u3002',
  '- **`sp-execute`** / **`sp-subagents`** / **`sp-parallel`**\u2014\u2014\u6267\u884c\u8ba1\u5212\uff08\u987a\u5e8f\uff0c\u6216\u5e76\u884c\u6269\u5c55\u7528\u4e8e\u6267\u884c\uff0c\u6216\u5e76\u884c\u6269\u5c55\u7528\u4e8e\u4e00\u6b21\u6027\u8c03\u7814\uff09\u3002',
  '- **`sp-verify`**\u2014\u2014\u201c\u662f\u5426\u5b8c\u6210\uff1f\u201d\u8981\u6c42\u8bc1\u636e\uff08\u7ea2\u8272\u6d4b\u8bd5\u3001\u7528\u6237\u53ef\u89c1\u884c\u4e3a\u3001\u70df\u96fe\u6d4b\u8bd5\u7eff\u706f\uff09\uff0c\u800c\u4e0d\u662f\u610f\u56fe\u3002',
  '- **`sp-request-review`** / **`sp-receive-review`**\u2014\u2014\u4ea4\u4ed8\u524d\u7684\u9884\u5ba1\u67e5\u6e05\u5355\uff1b\u4ea4\u4ed8\u540e\u7684\u5206\u7c7b\u3001\u4fee\u590d\u3001\u9a73\u3001\u53cd\u51fb\u3002',
  '- **`sp-finish-branch`** / **`sp-worktree`**\u2014\u2014\u5728\u5e72\u51c0\u57fa\u51c6\u4e0a\u5efa\u7acb\u9694\u79bb\u7684 worktree\uff1b\u9a8c\u8bc1\u3001\u63d0\u4ea4 4 \u4e2a\u9009\u9879\uff08\u5408\u5e76 / PR / \u4fdd\u7559 / \u4e22\u5f03\uff09\uff0c\u6e05\u7406\u3002',
  '',
  '\u65b9\u6cd5\u8bba\u662f\u7531 **description \u5951\u7ea6**\u800c\u4e0d\u662f\u7531\u7528\u6237\u624b\u52a8\u8c03\u7528\u6765\u5f3a\u5236\u5b9e\u65bd\u7684\u3002',
  '\u6bcf\u4e2a\u6280\u80fd\u7684 `description`\u90fd\u4e3a*trigger-only*\uff08\u9075\u5faa Description Trap\uff09\uff1a',
  'description \u4e2d\u4e0d\u542b\u8fc7\u7a0b\u603b\u7ed3\uff0c\u667a\u80fd\u4f53\u8bfb\u53d6 body \u4ee5\u5b66\u4e60\u8fc7\u7a0b\u3002',
  'V2.8 \u5ba1\u8ba1\u5c06\u5168\u90e8 34 \u4e2a\u6280\u80fd\u7684 description \u90fd\u7f29\u51cf\u4e3a trigger-only\u3002',
  '\u8fd9\u662f\u4e0a\u6e38 [`superpowers`](https://github.com/JZKK720/superpowers) \u4ed3\u5e93\u7684\u8d21\u732e\uff0c\u4ee5 `sp-*` \u9002\u914d\u5e76\u4fdd\u7559\u5b8c\u6574 MIT \u6e90\u6e90\u3002',
  '',
  '## \u63a5\u4e0b\u6765\u4e86\u89e3\u4ec0\u4e48',
  '',
  '\u4f60\u5df2\u5230\u8fbe\u4ee5\u4e0b\u4e09\u4e2a\u4f4d\u7f6e\u4e4b\u4e00\uff1a',
  '',
  '- **\u4f60\u662f\u65b0\u8d21\u732e\u8005**\u3002\u8bf7\u9605\u8bfb [`docs/HANDBOOK.md`](docs/HANDBOOK.md) ' + SECTION_SIGN + '1 \u2192 ' + SECTION_SIGN + '2 \u2192 ' + SECTION_SIGN + '3\uff0c\u7136\u540e ' + SECTION_SIGN + '5\uff08\u6280\u80fd\u5c42\uff09\u4ee5\u4e86\u89e3\u5de5\u4f5c\u6a21\u5f0f\u3002\u9996\u8bfb\u53ef\u8df3\u8fc7 ' + SECTION_SIGN + '4\u3002',
  '- **\u4f60\u662f\u8bc4\u4f30\u684c\u9762\u7aef\u7684\u4e0b\u6e38\u7528\u6237**\u3002\u8bf7\u9605\u8bfb [`docs/HANDBOOK.md`](docs/HANDBOOK.md) ' + SECTION_SIGN + '1 \u2192 ' + SECTION_SIGN + '3.1\uff0c\u7136\u540e ' + SECTION_SIGN + '10\uff08\u8bb8\u53ef / \u54c1\u724c\uff09\u4ee5\u4e86\u89e3\u5bf9\u4e8c\u8fdb\u5236\u6587\u4ef6\u4f60\u80fd\u505a\u4ec0\u4e48\u3001\u4e0d\u80fd\u505a\u4ec0\u4e48\u3002\u684c\u9762\u7aef\u7684\u5b89\u88c5 + \u529f\u80fd\u8bf4\u660e\u4f4d\u4e8e [`agent-desktop/README.md`](agent-desktop/README.md)\u3002',
  '- **\u4f60\u6b63\u5728\u8fdb\u884c\u4ee3\u7801\u5ba1\u67e5\u3001\u5b89\u5168\u5ba1\u67e5\u6216\u53d1\u5e03\u5ba1\u67e5**\u3002\u8bf7\u6309\u987a\u5e8f\u9605\u8bfb [`docs/HANDBOOK.md`](docs/HANDBOOK.md) ' + SECTION_SIGN + '1\u3001' + SECTION_SIGN + '3\u3001' + SECTION_SIGN + '4\u3001' + SECTION_SIGN + '6\u3001' + SECTION_SIGN + '9\u3001' + SECTION_SIGN + '10\u3001' + SECTION_SIGN + '11\u3002',
  '',
  '## \u4ed3\u5e93\u5e03\u5c40',
  '',
  '```',
  'cubecloud-agentic-os/                       ' + EM_DASH + ' \u5355\u4ed3',
  '\u251c\u2500\u2500 README.md                    \uff08\u672c\u6587\u4ef6\uff09',
  '\u251c\u2500\u2500 LICENSE                       Cubecloud \u539f\u521b\uff1aAGPL-3.0-or-later / Apache-2.0 / MIT',
  '\u251c\u2500\u2500 NOTICE                        REUSE \u5408\u89c4\u7684\u7b2c\u4e09\u65b9\u5f52\u5c5e\u76ee\u5f55',
  '\u251c\u2500\u2500 BRANDING_AND_LICENSE.md      \u9010\u7248\u672c\u6cd5\u5f8b\u8fc7\u6e21\uff08V2.3 \u2192 V2.10\uff09',
  '\u251c\u2500\u2500 CONTRIBUTING.md              DCO 1.1 \u7b7e\u540d\u6a21\u578b',
  '\u251c\u2500\u2500 ACKNOWLEDGMENTS.md           \u4eba\u53ef\u8bfb\u7684\u4e0a\u6e38\u8d21\u732e\u8005',
  '\u251c\u2500\u2500 SECURITY.md                  \u53d7\u652f\u6301\u7684\u7248\u672c\uff0c\u6f0f\u6d1e\u4e0a\u62a5',
  '\u251c\u2500\u2500 THREAT_MODEL.md              \u672c\u5730\u7528\u6237\u4e3b\u5bfc\u7684\u5a01\u80c1\u6a21\u578b',
  '\u251c\u2500\u2500 .gitattributes               LF \u5f52\u4e00\u5316\uff0c\u94fe\u63a5\u7ea6\u5b9a',
  '\u251c\u2500\u2500 .gitignore                   \u6392\u9664 .review-extras/ \u4e0e .review-codegraph/',
  '\u251c\u2500\u2500 .agents/                     34 \u4e2a\u6280\u80fd\uff0c\u955c\u50cf\u5230 ~/.agents/skills/',
  '\u251c\u2500\u2500 .github/                     Copilot \u6307\u4ee4\uff0c\u5de5\u4f5c\u6d41',
  '\u251c\u2500\u2500 apps/',
  '\u2502   \u2514\u2500\u2500 desktop-shell/           \u6d3b\u8dc3\u7684 @cubecloud/desktop-shell \u5de5\u4f5c\u533a\uff0852 \u4e2a\u6587\u4ef6\uff0c981 KB\uff09',
  '\u2502       \u251c\u2500\u2500 src/main/             agentControlPlane, default{Skills,Memories,Harnesses,Schedules,Kanban}',
  '\u2502       \u251c\u2500\u2500 src/{preload,renderer,shared}/',
  '\u2502       \u2514\u2500\u2500 prelaunchSeed.{smoke.mjs,test.ts}  \uff08smoke 40/40 \u901a\u8fc7\uff09',
  '\u251c\u2500\u2500 packages/',
  '\u2502   \u2514\u2500\u2500 platform-core/           \u5355\u4ed3\u5168\u5c40\u5171\u4eab\u7684 TS \u7c7b\u578b',
  '\u251c\u2500\u2500 docs/',
  '\u2502   \u251c\u2500\u2500 HANDBOOK.md              \u603b\u7d22\u5f15\uff08' + SECTION_SIGN + '1 \u2192 ' + SECTION_SIGN + '11\uff09',
  '\u2502   \u251c\u2500\u2500 RETIRED_AND_LEGACY.md   \u6d3b\u8dc3 / \u753b\u677f / \u955c\u50cf\u8868',
  '\u2502   \u251c\u2500\u2500 handbook/               \u6309\u4e3b\u9898\u957f\u6587\uff1aARCHITECTURE / DEVELOPMENT / OPERATIONS / README',
  '\u2502   \u251c\u2500\u2500 legal/                  CUBECLOUD-EULA, TRADEMARK_POLICY, COMMERCIAL_LICENSE, \u7b49',
  '\u2502   \u2514\u2500\u2500 *.md                    RUNTIME_ORCHESTRATION_PLAN, CODEGRAPH-RUNTIME, EVEROS-SIDECAR, \u7b49',
  '\u251c\u2500\u2500 scripts/',
  '\u2502   \u2514\u2500\u2500 sync-docs.ps1           \u5e42\u7b49\u7684\u6587\u6863\u94fe\u63a5\u91cd\u751f\uff08Windows \u786c\u94fe\u63a5 + \u8de8\u76ee\u5f55\u8fde\u63a5\uff09',
  '\u251c\u2500\u2500 agent-desktop/            \u5b8c\u6574\u7684 Electron \u4e8c\u8fdb\u5236\u6587\u4ef6\uff08408 \u4e2a\u6587\u4ef6\uff0c14.8 MB\uff09',
  '\u2502   \u251c\u2500\u2500 README.md              \u5b89\u88c5 + \u529f\u80fd + \u63d0\u4f9b\u8005\uff08\u4e8c\u8fdb\u5236\u6587\u4ef6\u7684\u7528\u6237\u6587\u6863\uff09',
  '\u2502   \u251c\u2500\u2500 src/{main,preload,renderer,shared}/',
  '\u2502   \u2514\u2500\u2500 ...                    \u6c89\u7ee7 hermes-desktop \u6846\u67b6\uff08MIT\uff09 + Cubecloud \u54c1\u724c\u5c42',
  '\u2514\u2500\u2500 .review-{extras,codegraph}/   \u753b\u677f\uff0c\u5df2\u52a0\u5165 .gitignore\uff0c\u5171 177 MB',
  '```',
  '',
  '## \u8bb8\u53ef',
  '',
  'Cubecloud \u539f\u521b\u90e8\u5206\u91c7\u7528\u4e09\u9009\u4e00\u7684\u53cc\u8bb8\u53ef\u3002',
  '**AGPL-3.0-or-later** \u4e3a\u4e3b\uff0c**Apache-2.0 \u4e0e MIT** \u4f5c\u4e3a\u517c\u5bb9\u9009\u9879\u3002',
  '\u4e3b\u9009\u9879\u4e3a\u9700\u4fdd\u8bc1\u4ee3\u7801\u4fee\u6539\u5728\u7f51\u7edc\u4ea4\u4e92\u573a\u666f\u4e0b\u4ecd\u5f00\u6e90\u7684\u4e0b\u6e38\uff1b',
  'Apache-2.0 \u4e0e MIT \u9002\u5408\u673a\u6784\u539f\u672c\u5c31\u662f\u8fd9\u4e24\u79cd\u8bb8\u53ef\u7684\u6d88\u8d39\u8005\u3002',
  '\u6c89\u7ee7 `hermes-desktop` \u6846\u67b6\u4ee3\u7801\u4fdd\u6301\u539f\u59cb MIT \u8bb8\u53ef\u3002',
  '',
  '\u8be6\u89c1 [`LICENSE`](LICENSE)\u3001[`BRANDING_AND_LICENSE.md`](BRANDING_AND_LICENSE.md)\u3001',
  '[`NOTICE`](NOTICE) \u4e0e [`docs/legal/`](docs/legal/)\uff0c\u4ee5\u4e86\u89e3\u8def\u5f84\u7ea7\u522b\u5256\u5206\u3001\u9010\u7248\u672c\u8fc7\u6e21\u53f2\uff08V2.3 \u2192 V2.10\uff09\u4e0e\u54c1\u724c / EULA / \u5546\u4e1a\u91cd\u8bb8\u53ef\u653f\u7b56\u3002',
  '',
  '## \u8d21\u732e',
  '',
  '\u6b22\u8fce\u8d21\u732e\uff01\u5165\u5e93\u8d21\u732e\u9075\u5faa **DCO 1.1** \u7b7e\u540d\u6a21\u578b\uff08\u6bcf\u4e2a\u63d0\u4ea4\u5fc5\u987b\u5305\u542b\u4e00\u884c `Signed-off-by:`\uff1b',
  '\u8be6\u89c1 [`CONTRIBUTING.md`](CONTRIBUTING.md) \u7684\u5951\u7ea6\uff09\u3002',
  '34 \u6280\u80fd\u751f\u6001\u662f\u8d21\u732e\u8005\u7684\u4e3b\u8981\u4eba\u673a\u5de5\u6548\u9762\uff1b',
  '\u4e00\u4e2a\u65b0\u6280\u80fd\u8981\u7ecf\u5386 `gbrain-skillify` \u95e8\u7981\uff0811 \u8f74\u68c0\u67e5\uff09\u3001',
  '`ecc-skill-scout` \u5199\u524d\u68c0\u7d22\u3001`po-write-a-skill` \u5199\u4f5c\u5951\u7ea6\uff0c\u4ee5\u53ca `sp-write-skill`',
  '\u7684 TDD-for-skills \u7eaa\u5f8b\uff0c\u5e76\u643a\u5e26 red-baseline \u538b\u529b\u6d4b\u8bd5\u3002',
  '',
  '\u5982\u679c\u4f60\u53d1\u73b0 bug \u6216\u6709\u529f\u80fd\u8bf7\u6c42\uff0c\u8bf7 [\u63d0\u4ea4 issue](https://github.com/cubecloud-contributors/cubecloud-agentic-os/issues/new)\u3002',
  '\u5b89\u5168\u95ee\u9898\u8bf7\u9075\u5faa [`SECURITY.md`](SECURITY.md)\uff1a\u8bf7\u52ff\u5728\u516c\u5f00\u95ee\u9898\u4e2d\u53d1\u5e03\u51d1\u4e66\u3001API \u5bc6\u94a5\u6216\u79c1\u4eba\u65e5\u5fd7\u3002',
  '',
  '',
  '## \u8bd1\u6587',
  '',
  '\u672c\u5355\u4ed3\u6587\u6863\uff08\u672c `README.md`\u3001[`docs/HANDBOOK.md`](docs/HANDBOOK.md) \u4e0e',
  '[`CONTRIBUTING.md`](CONTRIBUTING.md)\uff09\u73b0\u5728\u63d0\u4f9b\u7b80\u4f53\u4e2d\u6587\u4e2d\u6587\u4e2d\u6587\u7ffb\u8bd1\u3002',
  '\u8bd1\u6587\u7684\u552f\u4e00\u771f\u5b9e\u6e90\u5934\u662f [`README.i18n.md`](README.i18n.md) \u6e47\u8868\uff0c',
  '\u5217\u51fa\u4e86\u6bcf\u4e2a\u8bd1\u6587\u6587\u4ef6\u3001\u5b83\u7684\u8bed\u8a00\u3001\u72b6\u6001\u4e0e\u7ef4\u62a4\u8005\u3002',
  '',
  '\u63cf\u8ff0**\u4e8c\u8fdb\u5236\u6587\u4ef6**\uff08`agent-desktop/README.md`\u3001`CONTRIBUTING.md`\uff09\u7684\u8bd1\u6587\u4f4d\u4e8e',
  '`agent-desktop/README.<lang>.md` \u4e0e `CONTRIBUTING.<lang>.md`\uff1b',
  '\u6e47\u8868\u533a\u5206\u201c\u5355\u4ed3\u8bd1\u6587\u201d\uff08\u5df2\u6709\u7b80\u4f53\u4e2d\u6587\uff09\u4e0e\u201c\u4e8c\u8fdb\u5236\u8bd1\u6587\u201d\uff08 4 \u4e2a\u793e\u533a\u7ef4\u62a4\u7684 CJK \u6587\u4ef6\uff09\u3002',
  '\u5982\u679c\u4f60\u60f3\u8bd1\u4ed6\u8bed\u8a00\u7684\u5355\u4ed3 README\uff0c\u8bf7\u9075\u5faa\u6e47\u8868\u4e2d\u7684\u5de5\u4f5c\u6d41\u3002',
  ''
];

const ZH_PATH = path.join(ROOT, 'README.zh-CN.md');
const ZH_CONTENT = ZH_LINES.join('\n') + '\n';
fs.writeFileSync(ZH_PATH, ZH_CONTENT, 'utf8');
console.log('  wrote ' + ZH_PATH + ' (' + Buffer.byteLength(ZH_CONTENT, 'utf8') + ' bytes; ' + ZH_LINES.length + ' lines)');

// (2) Update README.i18n.md manifest: drop the 3 V2.10.15 placeholder rows,
// keep the English monorepo row, add the new zh-CN row.
let i18n = fs.readFileSync(I18N, 'utf8');

const oldTableBlock =
  '| README (monorepo) | English | `README.md` (outer root) | Live, V2.10.6 + V2.10.12 Translations pointer | Cubecloud Contributors |\n' +
  '| README (monorepo) | Japanese (ja-JP) | `README.ja-JP.md` (outer root) | **Placeholder, V2.10.15** (not a translation) | Community -- fork + translate to claim |\n' +
  '| README (monorepo) | Simplified Chinese (zh-CN) | `README.zh-CN.md` (outer root) | **Placeholder, V2.10.15** (not a translation) | Community -- fork + translate to claim |\n' +
  '| README (monorepo) | Korean (ko-KR) | `README.ko-KR.md` (outer root) | **Placeholder, V2.10.15** (not a translation, no prior inner `ko-KR`) | Community -- fork + translate to claim |\n';

const newTableBlock =
  '| README (monorepo) | English | `README.md` (outer root) | Live, V2.10.6 + V2.10.12 Translations pointer | Cubecloud Contributors |\n' +
  '| README (monorepo) | Simplified Chinese (zh-CN) | `README.zh-CN.md` (outer root) | **Live, V2.10.16** (full translation of the outer README; machine-translated starting point, native speakers welcome to polish) | Cubecloud Contributors + Community |\n' +
  '| README (monorepo) | Japanese (ja-JP) | -- | **Not yet translated, V2.10.16** (the inner has ja-JP at `agent-desktop/README.ja-JP.md`; the outer is English-only) | Community -- fork + translate to claim |\n' +
  '| README (monorepo) | Korean (ko-KR) | -- | **Not yet translated, V2.10.16** (the inner has no ko-KR) | Community -- fork + translate to claim |\n';

if (!i18n.includes(oldTableBlock)) {
  console.error('  manifest table block not found in expected form; aborting');
  process.exit(1);
}
if (i18n.includes('**Live, V2.10.16**')) {
  console.log('  manifest already updated; skipping');
} else {
  i18n = i18n.split(oldTableBlock).join(newTableBlock);
  fs.writeFileSync(I18N, i18n);
  console.log('  README.i18n.md table updated; size now: ' + fs.statSync(I18N).size + ' bytes');
}

// (4) Append V2.10.16 to BRANDING.
let branding = fs.readFileSync(BRANDING, 'utf8');
if (branding.includes('## V2.10.16')) {
  console.log('  BRANDING already has V2.10.16; skipping');
} else {
  const block = [
    '',
    '',
    '## V2.10.16 ' + EM_DASH + ' i18n cleanup: retire the V2.10.15 placeholders + ship real zh-CN',
    '',
    '**Scope:** outer monorepo root. 3 placeholder files deleted; 1 new',
    'real translation file created; manifest updated.',
    '',
    '**What changed (V2.10.16):**',
    '',
    '1. Deleted the 3 V2.10.15 placeholders at the outer root:',
    '   `README.ja-JP.md`, `README.zh-CN.md`, `README.ko-KR.md`.',
    '   Those placeholders were 1-paragraph English notes saying',
    '   "this is a placeholder, please translate me" -- which is',
    '   useless to a non-English reader. The user flagged this as',
    '   confusing and asked for a real fix.',
    '2. Created a real `README.zh-CN.md` (Simplified Chinese',
    '   translation of the outer README.md) at the outer root.',
    '   This is a machine-translated starting point that a native',
    '   Chinese speaker can polish. The 4 inner CJK files',
    '   (`agent-desktop/README.<lang>.md` and',
    '   `CONTRIBUTING.<lang>.md`) were NOT touched; they are real',
    '   community translations and remain in place.',
    '3. Updated `README.i18n.md` to reflect the new state:',
    '   - the 3 V2.10.15 placeholder rows are replaced by 3 new',
    '     rows (zh-CN live, ja-JP + ko-KR "not yet translated");',
    '   - the manifest\'s "Why not at the outer root?" section is',
    '     still correct: the outer monorepo README now has 1',
    '     translation (zh-CN); the inner-binary README has 4',
    '     community-maintained CJK files.',
    '',
    '**Why we did NOT retire the 4 inner CJK files:**',
    '',
    'The V2.10.7 manifest entry showed the inner 4 CJK files as',
    'mojibake (e.g., `\u9326\u30e6\u6e09\u932b?\u3000(ja-JP)`) -- but',
    'that was PowerShell 5.1 console-output display corruption of',
    'the actual file content. A byte-level audit (V2.10.16) shows',
    'all 4 files are real, valid UTF-8:',
    '',
    '- `agent-desktop/README.ja-JP.md` (22,662 bytes, real',
    '  Japanese: `\u30d0\u30a4\u30ca\u30ea\u30c9\u30ad\u30e3\u3001\u30a8\u30fc\u30bb\u30f3\u30c8\u30aa\u30b9\u30bb\u30f3\u30bf\u30fc` etc.)',
    '- `agent-desktop/README.zh-CN.md` (18,785 bytes, real',
    '  Simplified Chinese: `\u4e8c\u8fdb\u5236\u6587\u6863\u3001\u5355\u4ed3` etc.)',
    '- `agent-desktop/CONTRIBUTING.ja-JP.md` (4,944 bytes, real',
    '  Japanese: `\u8ca2\u732e\u8005\u653f\u7b56` etc.)',
    '- `agent-desktop/CONTRIBUTING.zh-CN.md` (3,639 bytes, real',
    '  Simplified Chinese: `\u8d21\u732e\u8005\u653f\u7b56` etc.)',
    '',
    'Retiring them would throw away legitimate community work.',
    'The files stay; the manifest is corrected to describe them',
    'as "Live, V2.10.7 disclaimer trim" (not mojibake).',
    '',
    '**Why we did NOT translate the outer README into ja-JP or ko-KR:**',
    '',
    '- **ja-JP** requires a native Japanese speaker. Japanese',
    '  technical doc has honorifics + sentence-final particles',
    '  that a non-native cannot get right. The inner ja-JP files',
    '  exist; if a Japanese-speaking contributor volunteers, the',
    '  manifest workflow is set up for them to add the outer',
    '  ja-JP translation.',
    '- **ko-KR** has no inner counterpart at all. Inventing a',
    '  20KB Korean translation from scratch would be low-quality',
    '  and undermine the user\'s trust. The manifest marks it as',
    '  "not yet translated" and invites community contribution.',
    '',
    '**Out of scope (deliberately):**',
    '',
    '- **Re-translation of the 4 inner CJK files.** Some of them',
    '  may benefit from refresh (the inherited CJK is V2-era',
    '  content), but that is a separate workstream from V2.10.16.',
    '- **Native-speaker polish of the V2.10.16 zh-CN outer',
    '  README.** The translation is a starting point; the',
    '  manifest\'s "Translation workflow" invites native speakers',
    '  to improve it.',
    '- **Translations of the outer `CONTRIBUTING.md` /**',
    '  `**HANDBOOK.md` / `**handbook**` files.** Same dependency',
    '  on native speakers.'
  ];
  branding = branding + block.join('\n') + '\n';
  fs.writeFileSync(BRANDING, branding);
  console.log('  V2.10.16 sub-section appended to BRANDING; size now: ' + fs.statSync(BRANDING).size + ' bytes');
}

// (5) Append V2.10.16 row to RETIRED.
let retired = fs.readFileSync(RETIRED, 'utf8');
if (retired.includes('V2.10.16')) {
  console.log('  RETIRED already has V2.10.16; skipping');
} else {
  const lines = retired.split(/\r?\n/);
  let v21015Row = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Outer monorepo README i18n stubs')) {
      v21015Row = i;
    }
  }
  if (v21015Row < 0) {
    console.error('  RETIRED V2.10.15 row not found; aborting');
    process.exit(1);
  }
  const v21016Row = '| i18n cleanup (placeholders retire + zh-CN ships) | `README.zh-CN.md` (outer root, NEW); `README.ja-JP.md` + `README.ko-KR.md` (outer root, DELETED) | **Live, V2.10.16** (1 new file, 2 deleted, manifest updated) | The 3 V2.10.15 placeholder files (which were 1-paragraph English meta-notes, confusing to non-English readers) were deleted. A real Simplified Chinese translation of the outer README was shipped as `README.zh-CN.md`. The 4 inner CJK files were audited byte-by-byte and are real UTF-8 community translations (not mojibake -- that was PowerShell display corruption); they were kept. Manifest updated to mark outer zh-CN as Live, outer ja-JP + ko-KR as "Not yet translated". |';
  lines.splice(v21015Row + 1, 0, v21016Row);
  retired = lines.join('\n');
  fs.writeFileSync(RETIRED, retired);
  console.log('  V2.10.16 row inserted after V2.10.15 in RETIRED; size now: ' + fs.statSync(RETIRED).size + ' bytes');
}
