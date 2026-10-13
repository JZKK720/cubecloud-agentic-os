/**
 * Console-kernel transport security tests.
 *
 * The vulnerability this pins: the kernel's HTTP surface had NO
 * authentication and NO origin check. Every preload bridge method became a
 * credentialed POST route — including mutating ones (`set-config`,
 * `write-soul`, `set-env`, `delete-session`, `start-gateway`, `quit-app`).
 *
 * Because the kernel accepted `content-type: text/plain`, an attacker page
 * could issue a CORS *simple request* — which the browser does NOT preflight
 * — from any origin the operator visits, and drive-by invoke those routes
 * against 127.0.0.1. Verified pre-fix: a foreign-Origin text/plain POST to
 * /api/console/kernelHome returned HTTP 200 with real data.
 *
 * Contract asserted here:
 *   1. A cross-origin request is refused (403), token or not.
 *   2. When a token is configured, a request without it is refused (401).
 *   3. A same-origin request with the correct token succeeds.
 *   4. /health stays reachable without a token (container HEALTHCHECK).
 *   5. No configuration leaks through a refused request.
 */

import { describe, expect, it } from "vitest";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConsoleRouteRegistry, createConsoleServer } from "../console-backend/registry";

const TOKEN = "test-token-abc123";

function request(
  url: string,
  init: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  } = {},
): Promise<{ status: number; body: string; headers: Record<string, string | string[] | undefined> }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      url,
      {
        method: init.method ?? "GET",
        headers: { "content-type": "application/json", ...(init.headers ?? {}) },
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (c) => {
          body += c;
        });
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, body, headers: res.headers }),
        );
      },
    );
    req.on("error", reject);
    if (init.body !== undefined) req.write(init.body);
    req.end();
  });
}

/** Boot a kernel with one harmless capability and run `fn` against it.
 *  `rendererRoot` defaults to a non-existent path so the shell HTML route
 *  answers 404 (no renderer in the test tree) while still exercising the
 *  cookie bootstrap and the /shim.js route. */
async function withKernel(
  options: { authToken?: string | null; rendererRoot?: string | null },
  fn: (base: string) => Promise<void>,
): Promise<void> {
  const registry = new ConsoleRouteRegistry();
  registry.register({
    name: "kernelHome",
    ipcChannel: "kernel-home",
    handler: async () => ({ success: true, hermesHome: "/tmp/hermes" }),
  });
  const server = createConsoleServer(registry, {
    rendererRoot:
      options.rendererRoot ?? join(tmpdir(), "console-kernel-test-no-renderer"),
    authToken: options.authToken ?? null,
  });
  await new Promise<void>((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      // `fn`'s assertion failures MUST reject this promise, otherwise the
      // test reports "passed" while the failure escapes as an unhandled
      // rejection (a false-positive test).
      fn(`http://127.0.0.1:${port}`).then(
        () => server.close(() => resolve()),
        (err) => server.close(() => reject(err)),
      );
    });
    server.on("error", reject);
  });
}

describe("console kernel transport security", () => {
  it("refuses a cross-origin POST (the CSRF path), token or not", async () => {
    await withKernel({ authToken: TOKEN }, async (base) => {
      const res = await request(`${base}/api/console/kernelHome`, {
        method: "POST",
        body: "[]",
        headers: { origin: "http://evil.example" },
      });
      expect(res.status).toBe(403);
      // The refusal must not leak the capability result.
      expect(res.body).not.toContain("/tmp/hermes");
    });
  });

  it("refuses a cross-origin POST even with a valid token", async () => {
    await withKernel({ authToken: TOKEN }, async (base) => {
      const res = await request(`${base}/api/console/kernelHome`, {
        method: "POST",
        body: "[]",
        headers: { origin: "http://evil.example", "x-console-token": TOKEN },
      });
      expect(res.status).toBe(403);
    });
  });

  it("refuses a text/plain cross-site POST (no preflight)", async () => {
    // The exact shape a browser sends for a simple request from another
    // site: no preflight, so this must be blocked server-side.
    await withKernel({ authToken: TOKEN }, async (base) => {
      const res = await request(`${base}/api/console/kernelHome`, {
        method: "POST",
        body: "[]",
        headers: {
          "content-type": "text/plain",
          origin: "http://evil.example",
          "sec-fetch-site": "cross-site",
        },
      });
      expect(res.status).toBe(403);
    });
  });

  it("refuses a POST with no token when a token is configured (401)", async () => {
    await withKernel({ authToken: TOKEN }, async (base) => {
      const res = await request(`${base}/api/console/kernelHome`, {
        method: "POST",
        body: "[]",
      });
      expect(res.status).toBe(401);
      expect(res.body).not.toContain("/tmp/hermes");
    });
  });

  it("refuses a POST with the WRONG token (401)", async () => {
    await withKernel({ authToken: TOKEN }, async (base) => {
      const res = await request(`${base}/api/console/kernelHome`, {
        method: "POST",
        body: "[]",
        headers: { "x-console-token": "not-the-token" },
      });
      expect(res.status).toBe(401);
    });
  });

  it("accepts a same-origin POST with the correct token", async () => {
    await withKernel({ authToken: TOKEN }, async (base) => {
      const res = await request(`${base}/api/console/kernelHome`, {
        method: "POST",
        body: "[]",
        headers: { "x-console-token": TOKEN, origin: base },
      });
      expect(res.status).toBe(200);
      expect(JSON.parse(res.body)).toMatchObject({ success: true });
    });
  });

  it("keeps /health reachable without a token (container HEALTHCHECK)", async () => {
    await withKernel({ authToken: TOKEN }, async (base) => {
      const res = await request(`${base}/health`);
      expect(res.status).toBe(200);
      expect(JSON.parse(res.body)).toMatchObject({ status: "ok" });
    });
  });

  it("still blocks cross-origin when no token is configured", async () => {
    // Backward-compatible mode: tokenless kernels keep working for local
    // tooling, but the CSRF hole must stay closed.
    await withKernel({}, async (base) => {
      const bad = await request(`${base}/api/console/kernelHome`, {
        method: "POST",
        body: "[]",
        headers: { origin: "http://evil.example" },
      });
      expect(bad.status).toBe(403);

      const ok = await request(`${base}/api/console/kernelHome`, {
        method: "POST",
        body: "[]",
      });
      expect(ok.status).toBe(200);
    });
  });
});

describe("console kernel browser-shell bootstrap", () => {
  it("serves /shim.js without a token and never embeds the token in it", async () => {
    // The shim is loaded as a <script src="/shim.js"> BEFORE the bundle,
    // at which point the page holds no token. Gating it would break the
    // shell; embedding the token in it would leak the token to any
    // cross-origin page that includes it as a script (no CORS needed to
    // execute, and an attacker's script could read the global).
    await withKernel({ authToken: TOKEN }, async (base) => {
      const res = await request(`${base}/shim.js`);
      expect(res.status).toBe(200);
      expect(res.body).not.toContain(TOKEN);
    });
  });

  it("sets a SameSite=Strict console cookie when serving the shell HTML", async () => {
    await withKernel({ authToken: TOKEN }, async (base) => {
      const res = await request(`${base}/`);
      // Renderer not built in the test tree → 404 body, but the cookie is
      // set on the response regardless of the body outcome.
      const setCookie = res.headers["set-cookie"];
      const cookie = Array.isArray(setCookie) ? setCookie.join(";") : setCookie;
      expect(cookie).toBeDefined();
      expect(cookie).toContain("console_token=");
      expect(cookie).toMatch(/samesite=strict/i);
    });
  });

  it("accepts the console cookie in place of the header", async () => {
    // The browser shell authenticates with the SameSite cookie; no token
    // ever reaches page JavaScript.
    await withKernel({ authToken: TOKEN }, async (base) => {
      const res = await request(`${base}/api/console/kernelHome`, {
        method: "POST",
        body: "[]",
        headers: { cookie: `console_token=${TOKEN}` },
      });
      expect(res.status).toBe(200);
    });
  });

  it("refuses a cross-origin request that presents the cookie anyway", async () => {
    // SameSite=Strict means a browser would not send it cross-site; if a
    // non-browser client does, the Origin check must still refuse.
    await withKernel({ authToken: TOKEN }, async (base) => {
      const res = await request(`${base}/api/console/kernelHome`, {
        method: "POST",
        body: "[]",
        headers: {
          cookie: `console_token=${TOKEN}`,
          origin: "http://evil.example",
        },
      });
      expect(res.status).toBe(403);
    });
  });
});
