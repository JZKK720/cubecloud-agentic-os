import { resolve } from "path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";

const coreEntry = resolve("../../packages/platform-core/src/index.ts");

export default defineConfig({
  main: {
    resolve: {
      alias: {
        "@cubecloud/platform-core": coreEntry,
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        output: {
          format: "cjs",
        },
      },
    },
    resolve: {
      alias: {
        "@cubecloud/platform-core": coreEntry,
      },
    },
  },
  renderer: {
    server: {
      port: 5181,
      strictPort: true,
    },
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
        "@cubecloud/platform-core": coreEntry,
      },
    },
    plugins: [react()],
  },
});
