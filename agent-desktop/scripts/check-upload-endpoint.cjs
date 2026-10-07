// Verify both possible upload endpoints on the live server.
(async () => {
  const f = new FormData();
  f.append(
    "bundle",
    new Blob([Buffer.from("test")], { type: "application/gzip" }),
    "agent.tar.gz",
  );
  for (const p of ["/api/agents", "/v1/agents"]) {
    try {
      const r = await fetch("http://127.0.0.1:6767" + p, {
        method: "POST",
        body: f,
      });
      const text = await r.text().catch(() => null);
      console.log("POST", p, "HTTP", r.status, text ? text.slice(0, 120) : "");
    } catch (e) {
      console.log("POST", p, "ERR", String(e).slice(0, 80));
    }
  }
  process.exit(0);
})();