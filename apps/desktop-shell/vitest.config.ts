import { resolve } from "path";
import { defineConfig } from "vitest/config";

const coreEntry = resolve("../../packages/platform-core/src/index.ts");

export default defineConfig({
  resolve: {
    alias: {
      "@cubecloud/platform-core": coreEntry,
      "@renderer": resolve("src/renderer/src"),
    },
  },
  test: {
    environment: "node",
    passWithNoTests: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
