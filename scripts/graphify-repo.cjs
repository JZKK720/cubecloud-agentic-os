#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const [mode, ...rest] = process.argv.slice(2);

function runGraphify(args) {
  const check = spawnSync("graphify", ["--help"], {
    cwd: repoRoot,
    stdio: "ignore",
    shell: process.platform === "win32",
  });

  if (check.status !== 0) {
    console.error("Graphify CLI is not available in PATH.");
    console.error("Install it once: python -m pip install graphifyy");
    process.exit(1);
  }

  const run = spawnSync("graphify", args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  process.exit(run.status ?? 1);
}

if (!mode || mode === "run") {
  runGraphify([".", "--mode", "deep", "--wiki", "--svg", "--graphml", ...rest]);
} else if (mode === "update") {
  runGraphify([".", "--mode", "deep", "--update", "--wiki", "--svg", "--graphml", ...rest]);
} else if (mode === "query") {
  if (rest.length === 0) {
    console.error('Provide a query string, for example: npm run graphify:query -- "how does provider discovery work?"');
    process.exit(1);
  }
  runGraphify(["query", rest.join(" ")]);
} else {
  console.error("Unknown mode. Use: run | update | query");
  process.exit(1);
}
