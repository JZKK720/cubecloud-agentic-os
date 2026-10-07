// One-shot: swap remaining /api/agents references to /v1/agents in the
// sessions module (live-smoke verified this build serves the list
// under /v1). Verifies the result and prints counts.
const fs = require("fs");
const p = "src/main/cubecloud-agent-sessions.ts";
let t = fs.readFileSync(p, "utf8");
const before = (t.match(/api\/agents/g) || []).length;
t = t.split("/api/agents").join("/v1/agents");
fs.writeFileSync(p, t);
const after = (fs.readFileSync(p, "utf8").match(/api\/agents/g) || []).length;
console.log(`api/agents hits before=${before} after=${after}`);
const p2 = "src/main/agent-bundle-compiler.ts";
const t2 = fs.readFileSync(p2, "utf8");
console.log(
  "compiler /v1/agents:",
  (t2.match(/v1\/agents/g) || []).length,
  "compiler /api/agents:",
  (t2.match(/api\/agents/g) || []).length,
);