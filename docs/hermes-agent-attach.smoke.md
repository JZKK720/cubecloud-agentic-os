# Hermes Agent attach smoke — operator runbook (V2.10.63)

This document is the operator's hands-on recipe for verifying the
V2.10.61 Hermes Agent lane (the leftmost button in the
Connect-to-remote-gateway form) against a real Hermes install,
without ever writing the bearer token to the repo.

## Scope

- Verify that a fresh Hermes install responds to the
  V2.10.61 `diagnoseRemoteConnection` probe correctly:
  200 on `/health` → `runtime: "hermes"`.
- Verify that the saved Model card health dot is green within
  ~30 s of saving the Hermes connection.
- Verify the negative path: a wrong API server key yields a
  red dot + an `auth` diagnostic, not a crash.
- Verify the OpenClaw-fallback path: a host that exposes
  Hermes at `/health` AND OpenClaw at `/v1/models` resolves
  the correct runtime per lane.

## Out of scope

- **Replacing the existing local Hermes install.** The
  V2.10.61 lane is meant to be reachable from a fresh
  install (`pip install hermes-agent`); the smoke just
  verifies reachability, it does not install Hermes.
- **The Docker Desktop attach panel** (clean V2.10.63+
  candidate; see V2.10.61 BRANDING entry).
- **Saving the bearer token in any file, including `.env`.**
  The runbook is explicit that the token lives only in the
  shell's `process.env.HERMES_TEST_TOKEN` for the duration
  of one CLI invocation. The actual production key
  (`API_SERVER_KEY`) is owned by the Hermes runtime, not
  by the agent.
- **Native-speaker review** of this runbook is not
  required (English-only operator documentation).

## Security floor (read first)

The repo's security floor (`AGENTS.md:183` and
`.github/copilot-instructions.md:65`) forbids writing
secrets, tokens, or PEM blocks to source files. The
`HERMES_TEST_TOKEN` is the local `API_SERVER_KEY` value
that the gateway uses for auth — it is a credential, and
the runbook holds it in your shell's
`process.env.HERMES_TEST_TOKEN` for the duration of one
verification, never on disk.

If the key has been posted to a chat transcript, a log
file, a screenshot, or any other persisted location:
**rotate the key on the Hermes side first**, then continue.

The rotation path on a local install:

1. Edit `~/.hermes/profiles/<profile>/.env` and replace
   the `API_SERVER_KEY=...` line with a fresh random value
   (e.g. `desk-$(uuidgen | tr -d -)`).
2. Restart the gateway (`pkill -f hermes && hermes &` or
   the equivalent on your platform).
3. The new key is now what you read in step 1 below.

## Step 0 — verify Hermes is running

The default URL is `http://127.0.0.1:8642/health` (the
documented Hermes local-loopback surface). The Hermes
gateway must be running on this host (or the host you point
the smoke at) before the probe can succeed.

```bash
# bash
curl -sS -m 3 http://127.0.0.1:8642/health
# expected: {"status":"ok"} (or a similar JSON body)
```

```pwsh
# pwsh
Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:8642/health" -TimeoutSec 3
```

If the curl returns 200, the gateway is up. If it returns
refused, start the gateway first (see the Hermes README
`hermes` CLI). If it returns 404, the gateway is up but
`/health` is not exposed — check the gateway version
(V2.10.61 expects `/health`; older versions may not
expose it).

## Step 1 — read the API server key from the Hermes env

In a fresh pwsh or bash terminal, capture the value of
`API_SERVER_KEY` from the active profile's `.env` and
assign it to a shell variable. The exact terminal command
is intentionally not shown in this document; the runbook
is a printed artifact and the agent that wrote it is
bound by the same security floor as the repo. The pattern
is:

```pwsh
# pwsh
$env:HERMES_TEST_TOKEN = (Get-Content "$env:USERPROFILE\.hermes\profiles\default\.env" | Select-String "^API_SERVER_KEY=" | ForEach-Object { $_ -replace "^API_SERVER_KEY=", "" })
```

```bash
# bash
export HERMES_TEST_TOKEN=$(grep '^API_SERVER_KEY=' ~/.hermes/profiles/default/.env | cut -d= -f2-)
```

Verify the env var is set without echoing the value:

```pwsh
# pwsh
'HERMES_TEST_TOKEN length: ' + $env:HERMES_TEST_TOKEN.Length
```

```bash
# bash
echo "HERMES_TEST_TOKEN length: ${#HERMES_TEST_TOKEN}"
```

The default Hermes key format is `desk-<uuid>` (e.g.
`desk-3a4f5b6c-7d8e-9f0a-1b2c-3d4e5f6a7b8c`, length 41).
If the length is wildly different, the Hermes install
uses a different key shape — pin the format in your
runbook for that deployment.

## Step 2 — point the probe at the live Hermes

The default URL is `http://127.0.0.1:8642/health`. If
Hermes is on a different port, override via
`HERMES_TEST_URL`:

```pwsh
# pwsh
$env:HERMES_TEST_URL = "http://gpu-host.lan:9000/health"
```

```bash
# bash
export HERMES_TEST_URL="http://gpu-host.lan:9000/health"
```

For an OpenClaw-fallback verification, point the URL at
a host that exposes Hermes at `/health` AND OpenClaw at
`/v1/models`. The probe handles the fallback automatically
and reports `runtime: "openclaw"` if the Hermes path fails
and the OpenClaw path returns the openclaw model shape.

## Step 3 — run the smoke

```pwsh
# pwsh
node scripts/hermes-agent-attach.smoke.cjs
```

```bash
# bash
node scripts/hermes-agent-attach.smoke.cjs
```

Expected output (PASS):

```
[hermes-agent-attach.smoke] URL   : http://127.0.0.1:8642/health
[hermes-agent-attach.smoke] TOKEN : <set, length=41>
[hermes-agent-attach.smoke] token preview (masked): desk…8c
[hermes-agent-attach.smoke] probing...
[hermes-agent-attach.smoke] PASS  status=200 latency=12ms
```

The key preview is **always** a 4-char prefix + ellipsis +
4-char suffix. The full key is never logged.

Expected output (FAIL with hint):

```
[hermes-agent-attach.smoke] URL   : http://127.0.0.1:8642/health
[hermes-agent-attach.smoke] TOKEN : <set, length=41>
[hermes-agent-attach.smoke] token preview (masked): desk…8c
[hermes-agent-attach.smoke] probing...
[hermes-agent-attach.smoke] FAIL  status=401 latency=8ms error=<none>
[hermes-agent-attach.smoke] hint  : Hermes rejected the bearer. Verify HERMES_TEST_TOKEN matches API_SERVER_KEY in ~/.hermes/profiles/<profile>/.env.
```

The hint is operator-actionable. The key is never
referenced in the hint.

## Step 4 — attach from the Agent Desktop remote panel

1. Launch Agent Desktop.
2. Settings → Connection → Remote → Runtime lane:
   **Hermes Agent** (the leftmost button).
3. URL: `http://<host>:<port>/` (or the path that returned
   200 in step 3).
4. API Key: paste the same value you used in
   `HERMES_TEST_TOKEN`.
5. Click **Test connection**. The diagnostic should report
   `reachable: true` and the `runtime` should resolve to
   `hermes` (the V2.10.61 `inferGatewayRuntimePreset` rule
   for the `/health` surface).
6. Click **Save**. The saved Model card should show a
   green health dot within ~30 s (the V2.10.60 periodic
   probe interval).

If the dot is red, the negative path is pinned. The most
common causes are:

- **Wrong port**: the `hermes` lane snaps to 8642. If
  your Hermes is on a different port, edit the URL field
  before clicking Save.
- **Wrong key**: the V2.10.61 preset uses
  `Authorization: Bearer <key>`. The key in
  `~/.hermes/profiles/<profile>/.env` must match.
- **Gateway not running**: the 1.5 s probe timeout will
  surface as `error: ECONNREFUSED` in the diagnostic.

## Step 5 — clean up the shell env

```pwsh
# pwsh
Remove-Item Env:HERMES_TEST_TOKEN
Remove-Item Env:HERMES_TEST_URL
```

```bash
# bash
unset HERMES_TEST_TOKEN
unset HERMES_TEST_URL
```

The key is now gone from the shell. The next time you
attach from the Agent Desktop remote panel, paste it
again from the Hermes env file.

## What the in-repo unit smoke covers (vs. the operator runbook)

The in-repo smoke at
`agent-desktop/tests/hermes-agent-attach.smoke.test.ts`
proves:

- The V2.10.61 `diagnoseRemoteConnection` module is
  importable and resolves `runtime: "hermes"` for a 200
  on `/health`.
- The probe module **does not** read `HERMES_TEST_TOKEN`
  from the env and does not forward it as a header when
  the caller passes `apiKey: undefined`. The credential
  is owned by the apply layer (`Settings.tsx`) at the
  form-input boundary, not by the probe layer.
- The probe correctly distinguishes all 6 diagnostic
  codes: `ok` / `auth` / `wrong-port` /
  `openclaw-compat-disabled` / `unreachable`, and the
  OpenClaw-fallback path resolves `runtime: "openclaw"`
  when the Hermes path returns 404 + the OpenClaw path
  returns the openclaw model shape.
- The `HERMES_TEST_TOKEN` env-var name is pinned so a
  future refactor cannot silently rename it.

What the in-repo smoke does **not** cover: a live
attach against the real Hermes. That is what this
runbook is for. Run both — unit smoke on every PR,
operator smoke on every Hermes deployment.

## How this differs from the IronClaw runbook

| Aspect | Hermes (V2.10.63) | IronClaw (V2.10.62) |
|---|---|---|
| Credential | `API_SERVER_KEY` (Hermes runtime) | `GATEWAY_AUTH_TOKEN` (IronClaw container) |
| Default port | 8642 (`DEFAULT_LOCAL_GATEWAY_PORT`) | 3231 (`IRONCLAW_DEFAULT_PORT`) |
| Default path | `/health` | `/api/health` |
| Env var | `HERMES_TEST_TOKEN` | `IRONCLAW_TEST_TOKEN` |
| Probe module | `diagnoseRemoteConnection` | `probeLocalModelHealth` |
| Surface | Local Hermes (the default) | Local IronClaw (the V2.10.61 third lane) |
| OpenClaw fallback | Yes (the same module handles it) | No (IronClaw is its own lane) |

The two runbooks are deliberately parallel so an
operator can read one and immediately know how to run
the other.
