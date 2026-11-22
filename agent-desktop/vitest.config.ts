import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@renderer": resolve(__dirname, "src/renderer/src"),
      "@shared": resolve(__dirname, "src/shared"),
    },
  },
  test: {
    environment: "jsdom",
    // jsdom refuses to expose `localStorage` for an opaque origin, and the
    // default `about:blank` is exactly that. Without an explicit http URL
    // every test that touches localStorage dies in `beforeEach` with
    // "Cannot read properties of undefined (reading 'clear')". This showed up
    // as 14 unexplained failures on Windows and masked as "baseline noise";
    // it is a configuration gap, not a product bug.
    environmentOptions: {
      jsdom: {
        url: "http://localhost/",
      },
    },
    globals: true,
    passWithNoTests: true,
    setupFiles: ["./src/renderer/src/test/setup.ts"],
    // 20s gives slow / integration-style tests headroom on
    // underpowered CI runners. The default 5s is tight enough
    // that locale-persistence and docker-runtimes have been
    // hitting it on a full-suite run; both pass in well under
    // 2s when run in isolation.
    testTimeout: 20_000,
    // Cap workers. Each worker spins up a full jsdom, and several suites spawn
    // child processes and timers. On a 32-core machine the default worker count
    // over-subscribes and unrelated tests start timing out — observed twice in a
    // row: `ssh-remote.test.ts` then `headroom-learn.test.ts`, each passing
    // 17/17 and 14/14 in isolation at the same commit. A bounded pool keeps the
    // suite's runtime honest instead of making a green run a matter of luck.
    maxWorkers: 4,
    minWorkers: 1,
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "tests/**/*.test.ts",
      "tests/**/*.test.tsx",
    ],
  },
});
