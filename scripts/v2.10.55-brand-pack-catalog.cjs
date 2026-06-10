// One-off: catalog docs/logos/logo.svg/ brand pack by size/viewBox/FFFD
const fs = require("fs");
const path = require("path");

const dir = "docs/logos/logo.svg";
const files = fs.readdirSync(dir).sort();
for (const f of files) {
  const p = path.join(dir, f);
  const s = fs.statSync(p);
  const c = fs.readFileSync(p, "utf8");
  const m = c.match(/viewBox=["']([^"']+)["']/);
  const wm = c.match(/<svg[^>]*width=["']([^"']+)["']/);
  const hm = c.match(/<svg[^>]*height=["']([^"']+)["']/);
  const fffd = (c.match(/\uFFFD/g) || []).length;
  const hasText = /<text/.test(c);
  const hasPath = /<path/.test(c);
  console.log(
    f.padEnd(28) +
      " | " +
      String(s.size).padStart(5) +
      "B" +
      " | " +
      (wm ? wm[1] : "?") +
      "x" +
      (hm ? hm[1] : "?") +
      " | viewBox=" +
      (m ? m[1] : "?") +
      " | text=" +
      hasText +
      " path=" +
      hasPath +
      " FFFD=" +
      fffd,
  );
}
