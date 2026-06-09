// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// scripts/v2.10-section.cjs \u2014 emit the V2.10 section in
// BRANDING_AND_LICENSE.md with the correct UTF-8 em-dash (U+2014)
// and the right path "apps/desktop-shell/" (no PowerShell
// interpolation). This is a one-shot for the V2.10 wave; delete
// after the section is committed.

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'BRANDING_AND_LICENSE.md');
const EM = '\u2014'; // the real em-dash, in UTF-8

const section = `

## V2.10 transitions landed ${EM} outer-repo doc move + scratch-pad .gitignore

The V2.10 wave (June 2026) closed two long-standing structural
issues that made the agentic-OS repo harder to read than it
needed to be:

### V2.10.1 ${EM} Outer-repo doc move (Option A, scripts/sync-docs.ps1)

The Cubecloud Agent Desktop governance docs ${EM} \`README.md\`,
\`LICENSE\`, \`NOTICE\`, \`BRANDING_AND_LICENSE.md\`, \`CONTRIBUTING.md\`,
\`ACKNOWLEDGMENTS.md\`, \`docs/HANDBOOK.md\`, \`docs/handbook/*\`, and
\`docs/legal/*\` ${EM} are now **source-of-truth at the outer
\`cubecloud-agentic-os/\` repo root** (or under outer \`docs/\`).
They are no longer buried one level deep inside the vendored
\`agent-desktop/\` mirror.

The move is implemented by \`scripts/sync-docs.ps1\`:

- **Top-level files** (\`README.md\`, \`LICENSE\`, \`NOTICE\`,
  \`BRANDING_AND_LICENSE.md\`, \`CONTRIBUTING.md\`,
  \`ACKNOWLEDGMENTS.md\`) live at the outer root.
- **\`docs/HANDBOOK.md\`** lives at \`docs/HANDBOOK.md\`.
- **\`docs/handbook/{ARCHITECTURE,DEVELOPMENT,OPERATIONS,README}.md\`**
  live at \`docs/handbook/\`.
- **\`docs/legal/*\`** lives at \`docs/legal/\`.
- At the old inner locations, the script re-creates **Windows
  hardlinks** for files and **directory junctions** for \`docs/legal\`.
  This is the admin-free equivalent of \`ln -s\` on Linux / macOS;
  every read at the old path still resolves, but editing either
  side edits the same data.

The script is **idempotent** ${EM} re-running it re-creates only the
missing links. On non-Windows clones, the script falls back to
real symbolic links via \`fs.symlinkSync\` (the script will be
extended to use \`bash\`/\`sh\` on macOS/Linux in a follow-up; for
now, the Windows-only path is the binding one and the macOS/Linux
behavior is documented in \`.gitattributes\`).

The V2.10.1 transition is the first place where we can say, with
confidence, that a PR reviewer looking at the outer repo *sees*
the agentic-OS identity at the root ${EM} the same identity the
inner mirror presents to the installer.

### V2.10.2 ${EM} Scratch-pad \`.gitignore\` (\`.review-extras/\`, \`.review-codegraph/\`)

\`.review-extras/\` (3,909 files, 155.7 MB) and \`.review-codegraph/\`
(1,078 files, 21.7 MB) are **scratch-pad clones** of upstream
repos used as design reference during the V2.6 + V2.7 skills
import. They are not part of the build, not referenced from any
code, and bloat the working tree by 177 MB.

Both are now in the outer \`cubecloud-agentic-os/.gitignore\`.
\`.gitkeep\` placeholders document the directories' purpose. To
re-create a scratch-pad clone, re-clone the upstream repo at the
commit the team was studying; the per-source URL is in
\`ACKNOWLEDGMENTS.md\` and the per-skill \`metadata.source\` in each
\`SKILL.md\`.

The transition is **non-destructive** ${EM} the local clones are
preserved on developer machines for anyone who wants to re-study
the upstream; only the *git* presence is removed.

### V2.10.3 ${EM} Affirmation: \`apps/desktop-shell/\` is live, not retired

There was a brief moment in the conversation history where the
phrase "we retired apps/desktop-shell" was used. To set the
record straight for future maintainers: **\`apps/desktop-shell/\`
is the live \`@cubecloud/desktop-shell\` workspace**, wired into
the outer \`package.json\` for \`dev\`, \`build\`, and \`typecheck\`. It
is the agentic-OS-original *state layer* (52 files, 981 KB)
that rebuilds the desktop's control surface on top of the
inherited \`agent-desktop/\` framework.

The live surfaces are now documented in
[\`docs/RETIRED_AND_LEGACY.md\`](docs/RETIRED_AND_LEGACY.md). A
surface is **live** if and only if it is not in \`.gitignore\`,
referenced from a build/test/script, and documented in the
README, HANDBOOK, or the retired-and-legacy doc. A surface is
**scratch-pad** if it is in \`.gitignore\` and not referenced. A
surface is **mirror** if it is a hardlink/junction/build-output
of a live surface.

### V2.10.4 ${EM} Per-file SPDX header in \`apps/desktop-shell/.gitignore\`

The \`@cubecloud/desktop-shell\` workspace did not have a
workspace-level \`.gitignore\`. V2.10.4 adds one for the things
that are workspace-specific (vitest coverage, vite cache, local
log files). The cross-cutting patterns (node_modules, dist, out,
*.tsbuildinfo) remain in the outer \`.gitignore\`.

### V2.10.5 ${EM} Summary of the V2.10 diff

- Outer repo gained: \`.gitattributes\`, \`docs/RETIRED_AND_LEGACY.md\`,
  \`scripts/sync-docs.ps1\` (idempotent move + hardlink/junction regen),
  \`apps/desktop-shell/.gitignore\`.
- Outer \`.gitignore\` updated to exclude \`.review-extras/\` and
  \`.review-codegraph/\`.
- Inner \`agent-desktop/\` lost its *primary* copies of 11 doc files
  + 1 legal dir; the inner paths are now Windows-native hardlinks /
  junctions pointing back to the outer root.
- No source code changed. No SPDX headers changed. No test changed.
  No \`package.json\` workspace changed. The 40/40 prelaunchSeed smoke
  test still passes.
`;

let src = fs.readFileSync(FILE, 'utf8');

// Find the existing V2.10 section start
const v210Start = src.indexOf('## V2.10 transitions landed');
if (v210Start < 0) {
  console.error('V2.10 section not found');
  process.exit(1);
}

// Drop everything from v210Start to end of file
const head = src.substring(0, v210Start);
const newContent = head + section;
fs.writeFileSync(FILE, newContent);

// Verify
const verify = fs.readFileSync(FILE, 'utf8');
const emCount = (verify.match(/\u2014/g) || []).length;
const aappsCount = (verify.match(/aapps\/desktop-shell/g) || []).length;
const appsCount = (verify.match(/apps\/desktop-shell\//g) || []).length;
const brokenEmCount = (verify.match(/[\u9500-\u95FF]/g) || []).length;

console.log('OK wrote', newContent.length, 'bytes to', FILE);
console.log('  em-dash (U+2014) count:', emCount);
console.log('  aapps/desktop-shell   :', aappsCount);
console.log('  apps/desktop-shell/   :', appsCount);
console.log('  broken CJK em-dash    :', brokenEmCount);
