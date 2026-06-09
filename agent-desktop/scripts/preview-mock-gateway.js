// Tiny stand-in gateway used only by `capture-previews.js` so the desktop
// lands in the post-setup main layout. Responds 200 to `/health` and a
// shape that `isOpenClawModelsResponse` recognises on `/v1/models`.

const http = require("http");

const PORT = process.env.MOCK_GATEWAY_PORT
  ? Number(process.env.MOCK_GATEWAY_PORT)
  : 8765;

// isOpenClawModelsResponse() requires an `id` that matches /^openclaw(?:\/|$)/i
const OPENCLAW_MODELS_BODY = JSON.stringify({
  object: "list",
  data: [{ id: "openclaw/default", object: "model" }],
});

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }
  if (req.url === "/v1/models") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(OPENCLAW_MODELS_BODY);
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `[mock-gateway] listening on http://127.0.0.1:${PORT} (try /health or /v1/models)`,
  );
});

const shutdown = () => {
  server.close(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
