import http from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { diagnoseSshForwardedGateway } from "../src/main/ssh-tunnel";

let server: http.Server | null = null;

async function startFakeIronClawGateway(
  port: number,
  statusCode = 200,
): Promise<http.Server> {
  const next = http.createServer((req, res) => {
    if (req.url === "/api/health") {
      res.statusCode = statusCode;
      res.setHeader("Content-Type", "application/json");
      if (statusCode === 200) {
        res.end('{"status":"healthy","channel":"gateway"}');
      } else {
        res.end('{"error":"auth"}');
      }
      return;
    }

    if (req.url === "/health") {
      res.statusCode = 404;
      res.end("not found");
      return;
    }

    if (req.url === "/v1/models") {
      res.statusCode = 404;
      res.end("not found");
      return;
    }

    res.statusCode = 404;
    res.end("not found");
  });

  await new Promise<void>((resolve) => next.listen(port, "127.0.0.1", resolve));
  return next;
}

afterEach(async () => {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server?.close((err) => (err ? reject(err) : resolve()));
  });
  server = null;
});

describe("diagnoseSshForwardedGateway — IronClaw", () => {
  it("resolves runtime:ironclaw from the forwarded /api/health surface", async () => {
    server = await startFakeIronClawGateway(33231, 200);

    const result = await diagnoseSshForwardedGateway(33231, "ironclaw");

    expect(result).toEqual({
      ok: true,
      code: "ok",
      transport: "ssh",
      runtime: "ironclaw",
      statusCode: 200,
    });
  });

  it("returns auth for ironclaw when the forwarded gateway rejects the token", async () => {
    server = await startFakeIronClawGateway(33232, 401);

    const result = await diagnoseSshForwardedGateway(33232, "ironclaw");

    expect(result).toEqual({
      ok: false,
      code: "auth",
      transport: "ssh",
      runtime: "ironclaw",
      statusCode: 401,
    });
  });
});