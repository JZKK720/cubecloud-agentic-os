// One-off: revert all README references from the fabricated
// cubecloud-zhifangyun.svg back to the canonical cubecloud-logo.svg,
// which is byte-identical to the user's docs/logos/logo.svg/1290X480 常规.svg.
//
// Why the path stays "cubecloud-logo.svg" instead of switching to
// "logo-pack/1290X480 常规.svg":
//   - cubecloud-logo.svg already exists at agent-desktop/build/branding/
//     and is byte-identical to the user's canonical 1290X480 常规.svg.
//   - The README.md links are relative from the README's own location
//     to agent-desktop/build/branding/. Keeping the existing filename
//     avoids renaming the build-time asset and re-baking the PDF.
//   - The new logo-pack/ tree (mirrored in V2.10.55) is for renderer
//     + future build scripts; the legacy build/branding/cubecloud-logo.svg
//     path stays as the single source of truth for the existing build
//     pipeline and all README references.
//
// This script also restores the original "Cubecloud Desktop" /
// "Cubecloud Agentic-OS" alt text (the bilingual alt text introduced
// in V2.10.51 was tied to the fabricated bilingual mark, which is
// now deleted).

const fs = require("fs");

const files = [
  // Outer root READMEs
  "README.md",
  "README.zh-CN.md",
  "README.ja-JP.md",
  "README.ko-KR.md",
  // Inner binary READMEs
  "agent-desktop/README.md",
  "agent-desktop/README.zh-CN.md",
  "agent-desktop/README.ja-JP.md",
  "agent-desktop/README.ko-KR.md",
];

for (const f of files) {
  let c = fs.readFileSync(f, "utf8");
  const before = c;
  c = c.replace(/src="build\/branding\/cubecloud-zhifangyun\.svg"/g, 'src="build/branding/cubecloud-logo.svg"');
  c = c.replace(/src="agent-desktop\/build\/branding\/cubecloud-zhifangyun\.svg"/g, 'src="agent-desktop/build/branding/cubecloud-logo.svg"');
  c = c.replace(/alt="Cubecloud 智方云"/g, 'alt="Cubecloud"');
  fs.writeFileSync(f, c, "utf8");
  console.log(f + ": changes=" + (c !== before));
}
