// scripts/fix-stale-paths.cjs
// Bulk-rewrite the old `cubecloud-desktop/` directory name to the
// current `agent-desktop/` in active path references across ZH/JA/KO
// docs.  Skips:
//   - the `RETIRED_AND_LEGACY.zh-CN.md` historical retirement table
//     (those entries intentionally document the old name as part of
//     the migration history)
//   - the `CONTRIBUTING.zh-CN.md` L14 reference, which explicitly
//     documents the outer monorepo vs inner binary file naming.
//
// Replacements cover:
//   - `cubecloud-desktop-<version>.{rpm,msi,dmg,...}` (release artifact
//     names) → `agent-desktop-<version>.{...}`
//   - `cubecloud-desktop/` (when used as a path, not a historical
//     table cell) → `agent-desktop/`
//
// Force UTF-8 throughout.  Run from the repo root.

const fs = require('fs');
const path = require('path');

const SKIP_FILES = new Set([
  // historical retirement table — intentionally documents the old name
  path.join('docs', 'RETIRED_AND_LEGACY.zh-CN.md'),
]);

// For CONTRIBUTING.zh-CN.md we only rewrite one specific line range
// (the L105 IPC path); the L14 inner-binary vs outer-monorepo note
// stays.
const CONTRIBUTING_LINE_REWRITES = {
  [path.join('CONTRIBUTING.zh-CN.md')]: (lines) => {
    return lines.map((line, i) => {
      if (i + 1 === 105 && line.includes('cubecloud-desktop/src/main/ipc/')) {
        return line.replace(/cubecloud-desktop\/src\/main\/ipc\//g, 'agent-desktop/src/main/ipc/');
      }
      return line;
    });
  },
};

const DOCS = [
  'agent-desktop/README.zh-CN.md',
  'agent-desktop/README.ja-JP.md',
  'agent-desktop/README.ko-KR.md',
  'README.ja-JP.md',
  'README.ko-KR.md',
  'docs/handbook/DEVELOPMENT.zh-CN.md',
  'docs/handbook/OPERATIONS.zh-CN.md',
];

let totalReplacements = 0;
const changed = [];

for (const rel of DOCS) {
  const abs = path.resolve(rel);
  if (!fs.existsSync(abs)) {
    process.stdout.write(`⚠ ${rel} not found, skipping\n`);
    continue;
  }
  let content = fs.readFileSync(abs, 'utf8');
  const before = content;

  // Release artifact name pattern: cubecloud-desktop-<version-or-digit>.<ext>
  content = content.replace(/cubecloud-desktop-(?:<version>|[0-9][0-9a-zA-Z.\-+]*)\.(rpm|msi|dmg|deb|AppImage|snap|exe|zip|tar\.gz)/g, 'agent-desktop-$1.$2');
  // Without the <version> placeholder (when used as a literal RPM name)
  content = content.replace(/cubecloud-desktop-(x86_64|x64|arm64|setup)/g, 'agent-desktop-$1');

  // Generic download path: cubecloud-desktop-setup.exe (now matches
  // even when separated by a space or before another word boundary)
  content = content.replace(/cubecloud-desktop-setup\./g, 'agent-desktop-setup.');

  // Shell command install path: ./cubecloud-desktop-<version>.rpm
  content = content.replace(/\.\/cubecloud-desktop-(?:<version>|[0-9][0-9a-zA-Z.\-+]*)\./g, './agent-desktop-$1.');

  // Path reference: cubecloud-desktop/ (not in RETIRED table)
  content = content.replace(/cubecloud-desktop\//g, 'agent-desktop/');

  // state.db location paths: %APPDATA%\cubecloud-desktop\ etc.
  content = content.replace(/%APPDATA%\\cubecloud-desktop\\/g, '%APPDATA%\\agent-desktop\\');
  content = content.replace(/%LOCALAPPDATA%\\cubecloud-desktop\\/g, '%LOCALAPPDATA%\\agent-desktop\\');
  content = content.replace(/~\/Library\/Application Support\/cubecloud-desktop\//g, '~/Library/Application Support/agent-desktop/');
  content = content.replace(/~\/Library\/Logs\/cubecloud-desktop\//g, '~/Library/Logs/agent-desktop/');
  content = content.replace(/~\/\.config\/cubecloud-desktop\//g, '~/.config/agent-desktop/');
  content = content.replace(/~\/\.local\/share\/cubecloud-desktop\//g, '~/.local/share/agent-desktop/');

  // dnf remove / migration step text
  content = content.replace(/dnf remove cubecloud-desktop\b/g, 'dnf remove agent-desktop');
  content = content.replace(/安装 `cubecloud-desktop`/g, '安装 `agent-desktop`');
  content = content.replace(/迁移到 `cubecloud-desktop`/g, '迁移到 `agent-desktop`');

  // `cd <repo>/cubecloud-desktop` (developer onboarding path)
  content = content.replace(/cd cubecloud-agentic-os\/cubecloud-desktop\b/g, 'cd cubecloud-agentic-os/agent-desktop');

  // standalone `cubecloud-desktop` token in the middle of a line
  // (e.g. shell variable references, prose)
  // Be careful: do NOT touch the "从 hermes-desktop 迁移到 cubecloud-desktop" prose
  // here — that's been already replaced above via the install regex.
  // Apply only to the remaining `cd …` style.
  content = content.replace(/(^|[^a-zA-Z0-9-])cubecloud-desktop($|[^a-zA-Z0-9-])/g, (m, p1, p2) => {
    // Don't touch: ./cubecloud- desktop- (already replaced)
    // Don't touch: hermes-desktop-...  (the framework)
    // Don't touch: 迁移到 cubecloud-desktop (replaced by regex above already)
    // Don't touch: 内层二进制文件... (excluded by SKIP_FILES)
    if (/[a-zA-Z-]cubecloud-desktop-[a-z]/.test(m)) return m; // already handled
    if (/cubecloud-desktop-(<version>|[0-9])/.test(m)) return m; // already handled
    return `${p1}agent-desktop${p2}`;
  });

  if (content !== before) {
    const count = (before.match(/cubecloud-desktop/g) || []).length - (content.match(/cubecloud-desktop/g) || []).length;
    totalReplacements += count;
    changed.push({ file: rel, count });
  }
  fs.writeFileSync(abs, content, 'utf8');
}

// CONTRIBUTING.zh-CN.md: only L105 IPC path
const contrib = path.resolve('CONTRIBUTING.zh-CN.md');
if (fs.existsSync(contrib)) {
  const before = fs.readFileSync(contrib, 'utf8');
  const lines = before.split(/\r?\n/);
  const after = CONTRIBUTING_LINE_REWRITES[path.join('CONTRIBUTING.zh-CN.md')](lines).join('\n');
  if (after !== before) {
    const count = (before.match(/cubecloud-desktop/g) || []).length - (after.match(/cubecloud-desktop/g) || []).length;
    totalReplacements += count;
    changed.push({ file: 'CONTRIBUTING.zh-CN.md', count });
  }
  fs.writeFileSync(contrib, after, 'utf8');
}

process.stdout.write(`✅ Replaced ${totalReplacements} stale cubecloud-desktop references in ${changed.length} files\n`);
for (const c of changed) process.stdout.write(`  ${c.file}: ${c.count}\n`);
