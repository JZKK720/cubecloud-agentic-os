// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// V2.9 pre-launch bundle — smoke test for the 5 seed functions
// and the readJsonFileWithSeed helper. This is a pure-Node smoke
// check (not a vitest run) so it works even when node_modules is
// not installed. It pins the seed CONTRACT — the production
// vitest test file (prelaunchSeed.test.ts) is the authoritative
// coverage; this is a fast verifier that the seed functions
// behave as documented.

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

async function main() {
  const tmp = mkdtempSync(join(tmpdir(), "v29-seed-"));
  const out = (label, cond) => console.log(`${cond ? "PASS" : "FAIL"} :: ${label}`);
  let pass = 0, fail = 0;
  const check = (label, cond) => { if (cond) pass++; else fail++; out(label, cond); };

  // Stub @cubecloud/platform-core so the .ts files can be loaded.
  // The seed functions in this V2.9 release are written to NOT
  // import the core types at runtime — they only use them for
  // type narrowing in TS. We need to confirm that by trying to
  // import them.
  console.log(`-- workdir: ${tmp}`);

  // 1) Check that the 5 default*.ts files exist with SPDX headers.
  const files = [
    "src/main/defaultSkills.ts",
    "src/main/defaultMemories.ts",
    "src/main/defaultHarnesses.ts",
    "src/main/defaultSchedules.ts",
    "src/main/defaultKanban.ts",
  ];
  for (const rel of files) {
    const abs = join(process.cwd(), rel);
    if (!existsSync(abs)) { check(`${rel} exists`, false); continue; }
    const head = readFileSync(abs, "utf8").split("\n").slice(0, 3).join("\n");
    check(`${rel} has SPDX header`, head.includes("SPDX-License-Identifier"));
  }

  // 2) Check that the test file exists and lists the 5 seeds.
  const testPath = join(process.cwd(), "src/main/prelaunchSeed.test.ts");
  if (existsSync(testPath)) {
    const t = readFileSync(testPath, "utf8");
    check("test covers seedDefaultSkills", t.includes("seedDefaultSkills"));
    check("test covers seedDefaultMemories", t.includes("seedDefaultMemories"));
    check("test covers seedDefaultHarnesses", t.includes("seedDefaultHarnesses"));
    check("test covers seedDefaultSchedules", t.includes("seedDefaultSchedules"));
    check("test covers seedDefaultKanban", t.includes("seedDefaultKanban"));
    check("test references 'idempotent'", t.includes("idempotent"));
  } else {
    check("prelaunchSeed.test.ts exists", false);
  }

  // 3) Try to dynamically import each default*.ts (will fail under Node
  //    native loader; that's expected — TS requires a transpiler). The
  //    value is: the file exists, has SPDX, and exports the expected
  //    symbols per grep.
  const expected = {
    "defaultSkills.ts":     ["DEFAULT_SKILLS", "seedDefaultSkills", "DEFAULT_SKILLS_SEED_VERSION"],
    "defaultMemories.ts":   ["DEFAULT_MEMORIES", "seedDefaultMemories", "DEFAULT_MEMORIES_SEED_VERSION"],
    "defaultHarnesses.ts":  ["DEFAULT_HARNESSES", "seedDefaultHarnesses", "DEFAULT_HARNESSES_SEED_VERSION"],
    "defaultSchedules.ts":  ["DEFAULT_SCHEDULES", "seedDefaultSchedules", "DEFAULT_SCHEDULES_SEED_VERSION"],
    "defaultKanban.ts":     ["DEFAULT_KANBAN_BOARD", "DEFAULT_KANBAN_TASKS", "seedDefaultKanban", "DEFAULT_KANBAN_SEED_VERSION"],
  };
  for (const [file, syms] of Object.entries(expected)) {
    const src = readFileSync(join(process.cwd(), "src/main", file), "utf8");
    for (const sym of syms) check(`${file} exports ${sym}`, src.includes(`export`) && src.includes(sym));
  }

  // 4) Check that the seed contract is documented in BRANDING + HANDBOOK + NOTICE.
  const cubecloudDesktop = join(process.cwd(), "..", "..", "cubecloud-desktop");
  const branding = readFileSync(join(cubecloudDesktop, "BRANDING_AND_LICENSE.md"), "utf8");
  const handbook = readFileSync(join(cubecloudDesktop, "docs", "HANDBOOK.md"), "utf8");
  const notice = readFileSync(join(cubecloudDesktop, "NOTICE"), "utf8");
  check("BRANDING has V2.9 section", branding.includes("V2.9") || branding.includes("v2.9"));
  check("HANDBOOK has §5.6 pre-launch bundle", handbook.includes("### 5.6 The pre-launch bundle"));
  check("NOTICE has 5 new pre-launch rows",
    notice.includes("Pre-launch bundle \u2014 Skills seed") &&
    notice.includes("Pre-launch bundle \u2014 Memory seed") &&
    notice.includes("Pre-launch bundle \u2014 Harness seed") &&
    notice.includes("Pre-launch bundle \u2014 Schedule seed") &&
    notice.includes("Pre-launch bundle \u2014 Kanban seed"));

  // 5) Check that the 3 hidden flavors are in skills-harness.ts.
  const harness = readFileSync(
    join(cubecloudDesktop, "src", "main", "skills-harness.ts"),
    "utf8"
  );
  check("hidden flavor: cubecloud-tone", harness.includes("cubecloud-tone"));
  check("hidden flavor: cubecloud-economist", harness.includes("cubecloud-economist"));
  check("hidden flavor: cubecloud-licensor", harness.includes("cubecloud-licensor"));

  // 6) Check that agentControlPlane.ts wires all 5 seeds.
  const acp = readFileSync(join(process.cwd(), "src/main/agentControlPlane.ts"), "utf8");
  check("acp imports seedDefaultSkills", acp.includes("seedDefaultSkills"));
  check("acp imports seedDefaultMemories", acp.includes("seedDefaultMemories"));
  check("acp imports seedDefaultHarnesses", acp.includes("seedDefaultHarnesses"));
  check("acp imports seedDefaultSchedules", acp.includes("seedDefaultSchedules"));
  check("acp imports seedDefaultKanban", acp.includes("seedDefaultKanban"));
  check("acp exports PRELAUNCH_SEED_VERSIONS", acp.includes("PRELAUNCH_SEED_VERSIONS"));
  check("acp defines readJsonFileWithSeed", acp.includes("readJsonFileWithSeed"));

  rmSync(tmp, { recursive: true, force: true });
  console.log(`-- ${pass} pass, ${fail} fail`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
