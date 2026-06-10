// One-off script: finalize V2.10.54 wordmark swap in the 3 .tsx files
// where replace_string_in_file couldn't match the multi-line img snippet.
// Reads from stdin arguments; writes back to the same files.

const fs = require("fs");

const files = [
  "agent-desktop/src/renderer/src/screens/Welcome/Welcome.tsx",
  "agent-desktop/src/renderer/src/screens/Layout/Layout.tsx",
  "agent-desktop/src/renderer/src/screens/Setup/Setup.tsx",
];

let totalChanges = 0;
for (const f of files) {
  let c = fs.readFileSync(f, "utf8");
  const before = c;
  c = c.replace(/src=\{cubecloudWordmark\}/g, "src={wordmark}");
  c = c.replace(/alt="Cubecloud Desktop"/g, 'alt="Cubecloud 智方云"');
  fs.writeFileSync(f, c, "utf8");
  const changed = c !== before;
  totalChanges += changed ? 1 : 0;
  console.log(f + ": changes=" + changed);
}
console.log("total files changed=" + totalChanges);
