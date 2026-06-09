// V2.10.43a regression test for the V2.10.42 asar-bundling bug.
//
// The V2.10.42 release shipped with a broken asar: when electron-builder
// was invoked from the monorepo root, it walked up the directory tree
// looking for package.json, found the monorepo root's package.json
// instead of agent-desktop's, and bundled the wrong tree. The
// resulting asar had 24,794 entries (mostly node_modules and monorepo
// docs), the renderer's index.html was actually a stray highlight.js
// LICENSE file, and the main process entry was a license boilerplate
// at the wrong path. Users who installed v0.6.0 saw a blank window.
//
// This test is the regression net. It assumes a fresh build has been
// run with `npm run build:unpack` (which now passes --project . to
// electron-builder). It inspects the resulting asar and asserts the
// critical files have real content.
//
// The test is skipped if no asar is present, so it's safe to leave
// enabled in CI â€?the slow part is the build, not the verification.
//
// To run after a build:
//   npm run build:unpack && npm run verify:bundle

import { describe, expect, it, beforeAll } from "vitest";
import { existsSync, statSync } from "fs";
import { join } from "path";
import * as asar from "asar";

// Resolve the asar path. The test runs from agent-desktop/,
// so dist/win-unpacked/resources/app.asar is the right path.
const ASAR_PATH = join(process.cwd(), "dist", "win-unpacked", "resources", "app.asar");

// Skip the test if no asar is present. The size guard that used to
// require > 1 MB has been removed: the integrity assertions cover
// the case where the asar is too small or wrong, which is itself a
// regression signal.
const hasAsar = existsSync(ASAR_PATH);
const skipReason = hasAsar
  ? null
  : `No asar found at ${ASAR_PATH}. Run 'npm run build:unpack' first.`;

describe.skipIf(skipReason !== null)("release bundle integrity (V2.10.43a regression)", () => {
  let list: string[];
  let topLevel: string[];

  beforeAll(() => {
    list = asar.listPackage(ASAR_PATH);
    // asar.listPackage returns backslash-separated paths on Windows;
    // normalise to forward slashes and strip any leading slash.
    const norm = list.map((p) => p.replace(/\\/g, "/").replace(/^\/+/, ""));
    topLevel = [...new Set(norm.map((p) => p.split("/")[0]))].sort();
  });

  it("asar has the inner app's package.json (not the monorepo root's)", () => {
    const raw = asar.extractFile(ASAR_PATH, "package.json").toString("utf-8");
    expect(() => JSON.parse(raw)).not.toThrow();
    const pkg = JSON.parse(raw);
    // Inner package.json has main: ./out/main/index.js. The monorepo
    // root's package.json does NOT have this field â€?it has a workspaces
    // declaration instead. This is the load-bearing difference.
    expect(pkg.main).toBe("./out/main/index.js");
    expect(pkg.name).toBeTruthy();
    expect(pkg.version).toBeTruthy();
  });

  it("asar has the build output (out/main, out/preload, out/renderer)", () => {
    expect(list).toContain("\\out\\main\\index.js");
    expect(list).toContain("\\out\\preload\\index.js");
    expect(list).toContain("\\out\\renderer\\index.html");
  });

  it("out/main/index.js is real bundled main code (not a license file)", () => {
    // The V2.10.42 broken asar had highlight.js LICENSE content at this
    // path because the wrong package.json was used as the app package.
    // Real main code is 100s of KB and references Electron APIs.
    const main = asar.extractFile(ASAR_PATH, "out\\main\\index.js").toString("utf-8");
    expect(main.length).toBeGreaterThan(100_000);
    expect(main).toContain("BrowserWindow");
    expect(main).toContain("createWindow");
    expect(main).toContain("whenReady");
    // The broken asar had this as the FIRST line of a license file:
    //   "re, and to permit persons to whom the Software is"
    // Real main code does NOT start with a license tail.
    expect(main.startsWith("re, and to permit persons")).toBe(false);
  });

  it("out/preload/index.js is real preload code with contextBridge", () => {
    const pre = asar.extractFile(ASAR_PATH, "out\\preload\\index.js").toString("utf-8");
    expect(pre.length).toBeGreaterThan(5_000);
    expect(pre).toContain("contextBridge");
  });

  it("out/renderer/index.html is real HTML (not a stray node_modules file)", () => {
    // The V2.10.42 broken asar had a highlight.js source file at this
    // path. Real index.html starts with <!doctype html>.
    const html = asar.extractFile(ASAR_PATH, "out\\renderer\\index.html").toString("utf-8");
    expect(/^<!doctype/i.test(html)).toBe(true);
    expect(html).toContain('id="root"');
    expect(html).toContain("<script");
    // Spot-check that there's a CSP â€?the real index.html has one.
    expect(html.toLowerCase()).toContain("content-security-policy");
  });

  it("asar is reasonably sized (under 2 GB â€?sanity bound)", () => {
    const size = statSync(ASAR_PATH).size;
    expect(size).toBeGreaterThan(100_000_000); // at least 100 MB
    expect(size).toBeLessThan(2_000_000_000); // less than 2 GB
  });

  it("asar top-level is bounded (under 50 entries â€?sanity bound)", () => {
    // The V2.10.42 broken asar had 28 top-level entries including
    // .agents/, .claude/, docs/, etc. that are real inner copies, so
    // 28 is a reasonable upper bound for the clean asar too. But the
    // CRITICAL difference is what the package.json and the build
    // output look like (the other tests), not the top-level count.
    expect(topLevel.length).toBeLessThan(50);
  });
});
