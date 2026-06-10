// One-off: mirror the user's brand pack from docs/logos/logo.svg/ into
// the build-time and renderer asset trees, then delete the V2.10.51-V2.10.54
// fabricated cubecloud-zhifangyun.svg (and its 3 mirrors).
//
// Why this script (not copy/paste in the shell):
//   - The filenames in docs/logos/logo.svg/ contain CJK characters
//     (反白/反黑/常规) which the PowerShell cp936 console corrupts
//     when piped through PowerShell remoting. Copying via Node preserves
//     the byte-for-byte UTF-8 filenames and contents.
//   - The script is idempotent: re-runs only touch files that need
//     touching, and the deletes are guarded by existence checks.

const fs = require("fs");
const path = require("path");

const SOURCE = "docs/logos/logo.svg";
const TARGETS = [
  "agent-desktop/build/branding/logo-pack",
  "agent-desktop/src/renderer/src/assets/logo-pack",
];

// --- Step 1: mirror the brand pack to both target trees
for (const tgt of TARGETS) {
  fs.mkdirSync(tgt, { recursive: true });
  const files = fs.readdirSync(SOURCE);
  for (const f of files) {
    const src = path.join(SOURCE, f);
    const dst = path.join(tgt, f);
    fs.copyFileSync(src, dst);
  }
  console.log("mirrored " + files.length + " files -> " + tgt);
}

// --- Step 2: delete the fabricated cubecloud-zhifangyun.svg and its mirrors
const FABRICATED = [
  "agent-desktop/build/branding/cubecloud-zhifangyun.svg",
  "agent-desktop/src/renderer/src/assets/cubecloud-zhifangyun.svg",
  "apps/desktop-shell/resources/cubecloud-zhifangyun.svg",
  "packages/platform-core/src/cubecloud-zhifangyun.svg",
];
for (const f of FABRICATED) {
  if (fs.existsSync(f)) {
    fs.unlinkSync(f);
    console.log("deleted fabricated: " + f);
  }
}

// --- Step 3: report final state
console.log("\n=== Final state ===");
for (const tgt of TARGETS) {
  const files = fs.readdirSync(tgt);
  console.log(tgt + ": " + files.length + " files");
  for (const f of files) console.log("  " + f);
}
