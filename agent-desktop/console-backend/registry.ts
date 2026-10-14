// console-backend C0 — route registry + HTTP server.
//
// The Agentic OS kernel as a headless Node service (doctrine:
// docs/plans/2026-10-07-second-brain-doctrine.md §3). C0 seeds the
// registry with the five already-Electron-free workspace-console
// modules and serves every registered capability as
// POST /api/console/<capability>. Streaming (chat SSE) is C1;
// this server is intentionally dependency-free (node:http).
//
// Never throws on request errors: handler results are always
// JSON-serializable result shapes (the "never throws / reason field"
// convention shared by the module family).

import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { serveRenderer, renderShimJs } from "./shell.ts";

/** A kernel capability: one preload bridge analog, one HTTP route. */
export interface ConsoleCapability {
  /** Preload bridge method name (the parity key against preload/index.ts). */
  readonly name: string;
  /** The desktop IPC channel this route replaces (traceability). */
  readonly ipcChannel: string;
  /** Handler: argv[0] is a JSON-encodable args array from the caller. */
  readonly handler: (args: unknown[]) => Promise<unknown>;
}

type Registry = Map<string, ConsoleCapability>;

export class ConsoleRouteRegistry {
  private readonly routes: Registry = new Map();

  register(cap: ConsoleCapability): void {
    if (this.routes.has(cap.name)) {
      throw new Error(`duplicate capability: ${cap.name}`);
    }
    this.routes.set(cap.name, cap);
  }

  /** Resolved route info for the parity checker + router. */
  list(): Array<{ name: string; ipcChannel: string }> {
    return [...this.routes.values()].map((c) => ({
      name: c.name,
      ipcChannel: c.ipcChannel,
    }));
  }

  get(name: string): ConsoleCapability | undefined {
    return this.routes.get(name);
  }

  get size(): number {
    return this.routes.size;
  }
}

export interface ConsoleServerOptions {
  /** Browser shell extension (C1): serve the built renderer at /, the
   *  generated shim at /shim.js, and SSE push sinks at /api/events/. */
  readonly rendererRoot?: string | null;
  /** Live push sinks: channel → SSE response. Managed by the caller. */
  readonly pushSinks?: Map<string, ServerResponse>;
  /** Shared-secret required on every non-health request. When set, a
   *  request without a matching `x-console-token` header is refused 401. */
  readonly authToken?: string | null;
}

/** Loopback origins/names the browser shell legitimately serves from. */
const SAME_ORIGIN_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

/** The shell's session cookie. The token is delivered here rather than
 *  embedded in /shim.js: a cross-origin page CAN load and execute a
 *  script (no CORS needed) and could read an embedded global, but it can
 *  neither read nor send a SameSite=Strict cookie. */
const CONSOLE_COOKIE = "console_token";

function readCookie(req: IncomingMessage, name: string): string | null {
  const header = req.headers.cookie;
  if (typeof header !== "string") return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

function originAllowed(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (typeof origin !== "string" || origin === "" || origin === "null") {
    // No Origin header: not a browser cross-site request (curl, the
    // container HEALTHCHECK, server-side clients). Allowed — the token
    // is the gate for those callers.
    return true;
  }
  try {
    return SAME_ORIGIN_HOSTS.has(new URL(origin).hostname);
  } catch {
    // Unparseable Origin is not a trustworthy same-origin claim.
    return false;
  }
}

export function createConsoleServer(
  registry: ConsoleRouteRegistry,
  options: ConsoleServerOptions = {},
) {
  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader("content-type", "application/json");
    // Bootstrap the shell's credential: the SameSite=Strict cookie is
    // delivered here, on the same-origin HTML load, and never in
    // /shim.js. A cross-origin page cannot read or send it.
    if (options.authToken && (req.method === "GET" || req.method === "HEAD")) {
      res.setHeader(
        "set-cookie",
        `${CONSOLE_COOKIE}=${encodeURIComponent(options.authToken)}; ` +
          "HttpOnly; SameSite=Strict; Path=/",
      );
    }
    try {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      // ── Transport security gate ──────────────────────────────────
      // Applies to the DATA routes only, i.e. /api/*. The static shell
      // (/, /shim.js, assets) must stay open: the SPA load is what
      // establishes the SameSite bootstrap cookie, so gating it is a
      // chicken-and-egg deadlock where the browser receives 401 instead of
      // the app and no user can ever authenticate. /health is likewise open
      // for the container HEALTHCHECK, which holds no credential.
      const gated = url.pathname.startsWith("/api/");
      if (gated) {
        if (!originAllowed(req)) {
          res.statusCode = 403;
          res.end(
            JSON.stringify({ success: false, error: "cross-origin request refused" }),
          );
          return;
        }
        const expected = options.authToken;
        if (expected) {
          const header = req.headers["x-console-token"];
          const supplied =
            typeof header === "string" ? header : readCookie(req, CONSOLE_COOKIE);
          if (supplied !== expected) {
            res.statusCode = 401;
            res.end(
              JSON.stringify({ success: false, error: "invalid console token" }),
            );
            return;
          }
        }
      }
      // Browser shell (C1-finish)
      if (options.rendererRoot && serveRenderer(req, res, options.rendererRoot)) {
        return;
      }
      if (options.rendererRoot && req.method === "GET" && url.pathname === "/shim.js") {
        res.setHeader("content-type", "application/javascript; charset=utf-8");
        // Deliberately NO token: the shim runs before the shell has any
        // credential, and a cross-origin <script src> could read an
        // embedded one. Auth rides the SameSite cookie instead.
        res.end(renderShimJs(registry));
        return;
      }
      if (options.pushSinks && req.method === "GET" && url.pathname.startsWith("/api/events/")) {
        const channel = decodeURIComponent(url.pathname.slice("/api/events/".length));
        res.setHeader("content-type", "text/event-stream");
        res.setHeader("cache-control", "no-cache");
        res.setHeader("connection", "keep-alive");
        res.write(": connected\n\n");
        options.pushSinks.set(channel, res);
        req.on("close", () => options.pushSinks!.delete(channel));
        return;
      }
      if (req.method === "GET" && url.pathname === "/health") {
        res.end(
          JSON.stringify({
            status: "ok",
            kernel: "console-backend",
            capabilities: registry.size,
            routes: registry.list(),
          }),
        );
        return;
      }
      if (req.method !== "POST") {
        res.statusCode = 405;
        res.end(JSON.stringify({ success: false, error: "method not allowed" }));
        return;
      }
      const name = url.pathname.replace(/^\/api\/console\//, "");
      const cap = registry.get(name);
      if (!cap) {
        res.statusCode = 404;
        res.end(JSON.stringify({ success: false, error: `no capability: ${name}` }));
        return;
      }
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      const raw = Buffer.concat(chunks).toString("utf8");
      const args: unknown[] = raw ? (JSON.parse(raw) as unknown[]) : [];
      const result = await cap.handler(args);
      res.end(JSON.stringify(result ?? { success: true }));
    } catch (err) {
      res.statusCode = 500;
      res.end(
        JSON.stringify({
          success: false,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  });
}