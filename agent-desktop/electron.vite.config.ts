import { resolve } from "path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    build: {
      // `@cubecloud/platform-core` MUST be bundled, not externalized.
      //
      // electron-vite externalizes everything in `dependencies` by default.
      // Declaring the workspace package there was required so `tsc` resolves it
      // on a clean CI runner (the release fix), but it also made the main bundle
      // emit a runtime `require("@cubecloud/platform-core")`. Node then loads
      // platform-core's raw TypeScript entry, whose relative imports are
      // extensionless (`./ag-ui`), and that is a hard failure under Node ESM:
      //
      //   ERR_MODULE_NOT_FOUND: Cannot find module '.../src/ag-ui'
      //
      // `npm run build` masked it by producing a bundle that also inlines the
      // package elsewhere; `npm run dev` died on startup. Tests were green
      // because vitest bundles too. Excluding it keeps one copy in every mode.
      externalizeDeps: { exclude: ["@cubecloud/platform-core"] },
      rollupOptions: {
        external: ["better-sqlite3"],
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve("src/preload/index.ts"),
          askpass: resolve("src/preload/askpass.ts"),
        },
      },
    },
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
      },
    },
    plugins: [react()],
  },
});
