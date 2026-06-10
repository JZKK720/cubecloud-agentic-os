// One-off: revert the 3 .tsx files (Welcome, Layout, Setup) where
// replace_string_in_file's multi-line snippets didn't match because
// of CRLF line endings. Same pattern as the prior V2.10.54 swap.
//
// What needs to change in each file:
//   - Remove the `const wordmark = useBrandWordmark();` line (and the
//     useBrandWordmark call result is no longer needed).
//   - Replace `<img ... src={wordmark} ... alt="Cubecloud 智方云" ...>`
//     with the direct `cubecloudWordmark` import + alt="Cubecloud".

const fs = require("fs");

const files = [
  "agent-desktop/src/renderer/src/screens/Welcome/Welcome.tsx",
  "agent-desktop/src/renderer/src/screens/Layout/Layout.tsx",
  "agent-desktop/src/renderer/src/screens/Setup/Setup.tsx",
];

for (const f of files) {
  let c = fs.readFileSync(f, "utf8");
  const before = c;

  // 1) remove `const wordmark = useBrandWordmark();` declarations
  c = c.replace(/^[ \t]*const wordmark = useBrandWordmark\(\);\s*$/gm, "");

  // 2) Welcome-specific: src={wordmark} on a className="welcome-brand-wordmark" line
  c = c.replace(
    /src=\{wordmark\}([\s\S]{0,80}alt="Cubecloud 智方云")/g,
    'src={cubecloudWordmark}$1'.replace("Cubecloud 智方云", "Cubecloud"),
  );

  // Catch any leftover: src={wordmark} -> src={cubecloudWordmark}
  c = c.replace(/src=\{wordmark\}/g, "src={cubecloudWordmark}");

  // alt restoration
  c = c.replace(/alt="Cubecloud 智方云"/g, 'alt="Cubecloud"');

  fs.writeFileSync(f, c, "utf8");
  console.log(f + ": changes=" + (c !== before));
}
