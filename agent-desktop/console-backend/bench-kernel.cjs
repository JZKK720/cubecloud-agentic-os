// Console-kernel benchmark — the missing E2E performance evidence.
//
// Why this exists: the workspace-scan bug (6767) was invisible to the test
// suite because every test asserted SHAPES, never LATENCY. The probe took
// ~2.1 s against a 3 s client budget, so it passed whenever it ran and failed
// only under load. Nothing in the ladder measured how long a route actually
// takes. This script does.
//
// Usage (requires a running kernel — compose.console.yaml or local node):
//   node console-backend/bench-kernel.cjs
//   KERNEL_URL=http://127.0.0.1:6770 node console-backend/bench-kernel.cjs
//   CONSOLE_KERNEL_TOKEN=<token> node console-backend/bench-kernel.cjs
//
// Reports p50/p95/max per route and flags any route whose p95 approaches its
// declared client budget. Exit 0 = all within budget, 1 = a route is at risk.
const { request } = require("http");
const { performance } = require("perf_hooks");

const BASE = (process.env.KERNEL_URL || "http://127.0.0.1:6770").replace(/\/+$/, "");
const TOKEN = process.env.CONSOLE_KERNEL_TOKEN || null;
const ITERATIONS = Number(process.env.BENCH_ITERATIONS || 20);

/** Routes under test, with the client budget each one must fit inside.
 *  Budgets mirror the real callers (see src/shared/workspace-probe-timing.ts). */
const ROUTES = [
  { name: "health", path: "/health", method: "GET", budgetMs: 1_000 },
  { name: "shim.js", path: "/shim.js", method: "GET", budgetMs: 1_000 },
  {
    name: "kernelHome",
    path: "/api/console/kernelHome",
    method: "POST",
    body: "[]",
    budgetMs: 2_000,
  },
  {
    name: "workspaceProbe (6767 upstream)",
    path: "/api/console/workspaceProbe",
    method: "POST",
    body: "[]",
    budgetMs: 4_000,
  },
  {
    name: "layaHealth (managed app)",
    path: "/api/console/layaHealth",
    method: "POST",
    body: "[]",
    budgetMs: 4_000,
  },
  {
    name: "codegraphHealth (managed app)",
    path: "/api/console/codegraphHealth",
    method: "POST",
    body: "[]",
    budgetMs: 4_000,
  },
];

function once(route) {
  return new Promise((resolve) => {
    const url = new URL(BASE + route.path);
    const t0 = performance.now();
    const req = request(
      {
        method: route.method,
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname + url.search,
        headers: {
          "content-type": "application/json",
          ...(TOKEN && !route.omitToken ? { "x-console-token": TOKEN } : {}),
        },
      },
      (res) => {
        res.resume();
        res.on("end", () =>
          resolve({ ms: performance.now() - t0, status: res.statusCode ?? 0 }),
        );
      },
    );
    req.on("error", () => resolve({ ms: performance.now() - t0, status: 0 }));
    req.setTimeout(route.budgetMs * 3, () => {
      req.destroy();
      resolve({ ms: performance.now() - t0, status: 0 });
    });
    if (route.body !== undefined) req.write(route.body);
    req.end();
  });
}

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

(async () => {
  // Discover the token from /shim.js? No — the token is never in the shim
  // (by design). A tokenless kernel needs none; a token-gated one needs
  // CONSOLE_KERNEL_TOKEN. Probe once to report which mode we are in.
  const probe = await once({ path: "/health", method: "GET", budgetMs: 1_000 });
  if (probe.status === 0) {
    console.error(`kernel unreachable at ${BASE} — start it first`);
    process.exit(1);
  }
  const gated = await (async () => {
    // Detect gating by probing WITHOUT the token: with one supplied, a 200
    // is ambiguous (gated-but-authenticated looks identical to ungated).
    const r = await once({
      path: "/api/console/kernelHome",
      method: "POST",
      body: "[]",
      budgetMs: 2_000,
      omitToken: true,
    });
    return r.status === 401;
  })();
  console.log(`kernel      : ${BASE}`);
  console.log(`token gate  : ${gated ? (TOKEN ? "on (token supplied)" : "ON — pass CONSOLE_KERNEL_TOKEN") : "off"}`);
  console.log(`iterations  : ${ITERATIONS} per route\n`);
  if (gated && !TOKEN) {
    console.error("Refusing to benchmark: the kernel is token-gated and no");
    console.error("CONSOLE_KERNEL_TOKEN was supplied, so every route would 401.");
    process.exit(1);
  }

  const rows = [];
  let atRisk = 0;
  for (const route of ROUTES) {
    const samples = [];
    let lastStatus = 0;
    for (let i = 0; i < ITERATIONS; i++) {
      const r = await once(route);
      samples.push(r.ms);
      lastStatus = r.status;
    }
    samples.sort((a, b) => a - b);
    const p50 = pct(samples, 50);
    const p95 = pct(samples, 95);
    const max = samples[samples.length - 1];
    const risk = p95 > route.budgetMs * 0.8;
    if (risk) atRisk++;
    rows.push({
      name: route.name,
      status: lastStatus,
      p50: p50.toFixed(0),
      p95: p95.toFixed(0),
      max: max.toFixed(0),
      budget: route.budgetMs,
      risk,
    });
  }

  console.log(
    "route".padEnd(34) +
      "st".padStart(5) +
      "p50".padStart(8) +
      "p95".padStart(8) +
      "max".padStart(8) +
      "budget".padStart(9) +
      "  verdict",
  );
  console.log("-".repeat(84));
  for (const r of rows) {
    console.log(
      r.name.padEnd(34) +
        String(r.status).padStart(5) +
        (r.p50 + "ms").padStart(8) +
        (r.p95 + "ms").padStart(8) +
        (r.max + "ms").padStart(8) +
        (r.budget + "ms").padStart(9) +
        "  " +
        (r.risk ? "AT RISK (p95 > 80% of budget)" : "ok"),
    );
  }
  console.log();
  if (atRisk > 0) {
    console.log(`${atRisk} route(s) AT RISK — p95 is within 20% of the caller's budget.`);
    process.exit(1);
  }
  console.log("All routes within budget.");
})();
