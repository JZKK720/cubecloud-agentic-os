// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// scripts/v2.10.11-provenance.cjs \u2014 bring PROVENANCE_TRACKER.md into
// alignment with the V2.10.6, V2.10.7, V2.10.8, and V2.10.10 doc
// transitions, and add a cross-link to TRADEMARK_POLICY.md (the
// operative brand policy). Single-section text update.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TRACKER = path.join(ROOT, 'docs', 'legal', 'PROVENANCE_TRACKER.md');
const BRANDING = path.join(ROOT, 'BRANDING_AND_LICENSE.md');
const RETIRED = path.join(ROOT, 'docs', 'RETIRED_AND_LEGACY.md');

let tracker = fs.readFileSync(TRACKER, 'utf8');

const oldRow =
  '| `docs/legal/**` | Cubecloud-original | Cubecloud legal/planning drafts | Keep current and update as engineering evidence lands |';

const newRow =
  '| `docs/legal/**` | Cubecloud-original | Cubecloud legal/planning drafts; cross-link to `TRADEMARK_POLICY.md` (operative brand policy, V2.5+) for wordmark / logo / screenshot rules | Keep current and update as engineering evidence lands. V2.10.11: added a "Related policies" cross-link to TRADEMARK_POLICY.md; no rule change. |';

if (!tracker.includes(oldRow)) {
  console.error('anchor row not found; aborting');
  process.exit(1);
}
if (tracker.includes(newRow)) {
  console.log('  already updated; skipping');
} else {
  tracker = tracker.replace(oldRow, newRow);
  fs.writeFileSync(TRACKER, tracker);
  console.log('  PROVENANCE_TRACKER.md updated; size now:', fs.statSync(TRACKER).size, 'bytes');
}

// Add a "Related policies" cross-link section at the end of PROVENANCE_TRACKER.md.
const crossLinkSection = `

## Related policies

This tracker is the engineering execution view of which path
families are still inherited, mixed, or Cubecloud-original. It
is **not** the operative brand or trademark policy. For the
binding rules on use of the **Cubecloud** wordmark, logotype,
SVG marks, splash screens, screenshots, and previews, see
\`TRADEMARK_POLICY.md\` in this directory (and its referenced
\`licenses/\` text files). In particular, fork-and-rebrand
workflows described here MUST also comply with
\`TRADEMARK_POLICY.md \u00a7 1\` (must remove or replace Cubecloud
marks) and \u00a7 4 (prohibited uses).
`;

if (!tracker.includes('## Related policies')) {
  tracker = tracker + crossLinkSection;
  fs.writeFileSync(TRACKER, tracker);
  console.log('  "Related policies" cross-link section appended; size now:', fs.statSync(TRACKER).size, 'bytes');
}

// Append V2.10.11 sub-section to BRANDING_AND_LICENSE.md.
let branding = fs.readFileSync(BRANDING, 'utf8');
const v21011Marker = '## V2.10.11 \u2014 PROVENANCE_TRACKER aligns with V2.10.6/V2.10.7/V2.10.8/V2.10.10 + cross-link to TRADEMARK_POLICY';
if (branding.includes(v21011Marker)) {
  console.log('  BRANDING already has V2.10.11; skipping');
} else {
  const v21011Block = `

## V2.10.11 \u2014 PROVENANCE_TRACKER aligns with V2.10.6/V2.10.7/V2.10.8/V2.10.10 + cross-link to TRADEMARK_POLICY

**Scope:** legal-doc layer only. \`docs/legal/PROVENANCE_TRACKER.md\`
(the engineering path-family ledger) was authored before the
V2.10 doc-move arc and still described \`docs/legal/**\` in
isolation. V2.10.11 makes it explicitly a sibling of
\`TRADEMARK_POLICY.md\`, which is the operative brand policy
since V2.5.

**Changes:**

1. Updated the \`docs/legal/**\` row in the path-family ledger
   to cross-link to \`TRADEMARK_POLICY.md\` (V2.5+). Status
   remains \`Cubecloud-original\`. No rule change.
2. Added a "Related policies" section at the end of
   \`PROVENANCE_TRACKER.md\` pointing readers at
   \`TRADEMARK_POLICY.md \u00a7 1\` (fork-and-rebrand must remove
   or replace Cubecloud marks) and \u00a7 4 (prohibited uses).
3. The \`previews/**\` row still says "Regenerate screenshots
   and package visuals from Cubecloud-owned assets" \u2014 the
   V2.10.10 \`previews/\` \`.gitignore\` policy (legacy captures
   excluded from future commits, kept on disk for the inherited
   CJK i18n README galleries until a screenshot-refresh pass
   replaces them) is consistent with that guidance. No change
   to the \`previews/**\` row text.

**Out of scope (deliberately):**

- \`CUBECLOUD-EULA.md\`, \`COMMERCIAL_LICENSE.md\`, and
  \`PAID_SERVICES_TERMS.md\` are all marked "Working draft /
  not legal advice" and are owned by counsel, not the V2.10
  cleanup arc. V2.10.11 touches none of them.
- \`CLEAN_ROOM_REPLACEMENT_PLAN.md\` already lists
  \`previews/**\` in its Phase 1 target paths (V2.4), so the
  V2.10.10 \`previews/\` \`.gitignore\` policy is already
  consistent with it. V2.10.11 touches it only by
  reference.
- \`TRADEMARK_POLICY.md\` itself is the operative policy.
  V2.10.11 does not amend it.

**Why this is the right next V2.10.x step:**

The other candidates (outer README translation stubs,
docs/handbook/ refresh, screenshot-refresh pass, i18n encoding
fix) all wait on either a native-speaker translator, a
screenshot/asset owner, or a design refresh. V2.10.11 is a
purely textual cross-link update that the engineering
executor can land safely without a counsel or design review.
`;

  branding = branding + v21011Block;
  fs.writeFileSync(BRANDING, branding);
  console.log('  V2.10.11 sub-section appended to BRANDING; size now:', fs.statSync(BRANDING).size, 'bytes');
}

// Append V2.10.11 row to RETIRED_AND_LEGACY.md. The file has two
// tables: a "live surfaces" table at the top, and a "versioned
// transitions" table at the bottom. The new V2.10.11 row goes in
// the second table, immediately after the V2.10.10 "Legacy
// preview captures (binary)" row.
let retired = fs.readFileSync(RETIRED, 'utf8');
if (retired.includes('V2.10.11')) {
  console.log('  RETIRED already has V2.10.11; skipping');
} else {
  const lines = retired.split(/\r?\n/);
  let v21010Row = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('| Legacy preview captures (binary) |')) {
      v21010Row = i;
    }
  }
  if (v21010Row < 0) {
    console.error('RETIRED V2.10.10 row not found; aborting');
    process.exit(1);
  }
  const v21011Row = '| Legacy legal-doc cross-link | `docs/legal/PROVENANCE_TRACKER.md` \u2192 `docs/legal/TRADEMARK_POLICY.md` | **Live + cross-linked** (V2.10.11) | `PROVENANCE_TRACKER.md` is the engineering path-family ledger (status of `docs/legal/**`, `previews/**`, `src/renderer/**`, etc.); V2.10.11 adds a "Related policies" section pointing readers at `TRADEMARK_POLICY.md` (the operative brand policy since V2.5). No rule change. |';
  lines.splice(v21010Row + 1, 0, v21011Row);
  retired = lines.join('\n');
  fs.writeFileSync(RETIRED, retired);
  console.log('  V2.10.11 row inserted after V2.10.10 row in RETIRED; size now:', fs.statSync(RETIRED).size, 'bytes');
}
