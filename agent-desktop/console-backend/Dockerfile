# console-backend kernel image — C2 (doctrine §3).
#
# Multi-stage build (mirrors cubecloud-agent's deploy/docker/Dockerfile
# pattern: deps → renderer-builder → runtime):
#
#   deps      — npm ci for the workspace (platform-core + agent-desktop
#               prod deps incl. better-sqlite3, which the kernel's
#               memory/sessions modules import).
#   renderer  — electron-vite build of the browser shell (out/renderer);
#               the kernel serves it at / via shell.ts.
#   runtime   — node:24-alpine + sources + node_modules + built renderer.
#               No Electron, no build tooling in the final image.
#
# Build (from the monorepo root — the context must contain packages/ and
# agent-desktop/):
#
#   docker build -t cubecloud-console-backend:latest \
#                -f agent-desktop/console-backend/Dockerfile .
#
# The kernel boots with node --experimental-strip-types (no TS build
# step, C0 finding); register-loader.mjs rewrites the repo's
# extensionless TS imports to .ts siblings at import time.

# ── deps ────────────────────────────────────────────────────────────
# Manifests first so the install layer caches across pure source edits.
FROM node:24-alpine AS deps
WORKDIR /build
COPY package.json package-lock.json ./
COPY packages/platform-core/package.json packages/platform-core/package.json
COPY agent-desktop/package.json agent-desktop/package.json
# electron + electron-builder postinstall would fail in a plain node
# container (no display, no wine); skip lifecycle scripts, then rebuild
# better-sqlite3 explicitly (its prebuild-install needs its own install
# script to fetch the linux/musl prebuilt binary).
#
# @rollup/rollup-linux-x64-musl + @esbuild/linux-x64 are installed
# explicitly: npm's optional-dependencies bug means a lockfile resolved
# on Windows omits the linux/musl native binaries (rollup's loader and
# esbuild both hard-fail without them — the renderer build stage needs
# both via vite).
RUN npm ci --ignore-scripts --no-audit --no-fund \
 && npm rebuild better-sqlite3 \
 && npm install --no-save --no-audit --no-fund \
      @rollup/rollup-linux-x64-musl @esbuild/linux-x64 \
 && rm -rf node_modules/electron node_modules/electron-builder \
           node_modules/electron-vite node_modules/electron-updater \
           node_modules/@electron-toolkit

# ── renderer-builder ────────────────────────────────────────────────
# Builds the browser shell the kernel serves at /. electron-vite build
# compiles main+preload too; only out/renderer is copied out.
FROM deps AS renderer-builder
WORKDIR /build
COPY packages/platform-core/ packages/platform-core/
COPY agent-desktop/ agent-desktop/
# electron-vite build only needs vite + the react/tailwind plugins, all
# still present after the electron-family prune. electron itself is only
# needed for runtime packaging, which this image never does.
RUN cd agent-desktop && npm exec electron-vite build \
 && test -f out/renderer/index.html \
 || (echo "ERROR: renderer bundle missing after electron-vite build" && exit 1)

# ── runtime ─────────────────────────────────────────────────────────
FROM node:24-alpine AS runtime
WORKDIR /app

# Sources the kernel imports (Electron-free families + shared contracts),
# the kernel itself, and the built browser shell.
COPY agent-desktop/console-backend/ ./console-backend/
COPY agent-desktop/src/main/ ./src/main/
COPY agent-desktop/src/shared/ ./src/shared/
# platform-core's exports map points at ./src/index.ts — the kernel
# imports it as source (same as the desktop dev path). Landing it inside
# node_modules makes the bare specifier resolve without a bundler.
COPY packages/platform-core/src/ /app/node_modules/@cubecloud/platform-core/src/
COPY packages/platform-core/package.json /app/node_modules/@cubecloud/platform-core/package.json
COPY --from=renderer-builder /build/agent-desktop/out/renderer/ ./out/renderer/
COPY --from=deps /build/node_modules/ ./node_modules/
COPY agent-desktop/package.json ./package.json

ENV CONSOLE_KERNEL_PORT=6770 \
    NODE_ENV=production
EXPOSE 6770

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.CONSOLE_KERNEL_PORT||6770)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Node strips types natively at import; no build step needed (C0 finding).
CMD ["node", "--experimental-strip-types", "--import", "file:///app/console-backend/register-loader.mjs", "console-backend/server.ts"]