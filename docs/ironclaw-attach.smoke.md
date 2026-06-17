# IronClaw attach smoke — operator runbook (V2.10.62)

This document is the operator's hands-on recipe for verifying the
V2.10.61 IronClaw third lane against a real IronClaw deployment,
without ever writing the bearer token to the repo.

## Scope

- Verify that a fresh IronClaw deployment accepts the V2.10.61
  third-lane attach from Agent Desktop's remote panel.
- Verify that the IronClaw bearer token, when supplied to the
  Agent Desktop remote-panel form, results in a green health
  dot on the saved Model card.
- Verify the negative path: a wrong token yields a red dot, not
  a crash.

## Out of scope

- Replacing the existing IronClaw auth scheme. The V2.10.61
  preset's `remoteSecretLabel` is `"Bearer token (optional)"`
  because `PLATFORM_RUNTIME_SURFACES` does not pin a secret
  scheme for IronClaw. If your IronClaw deployment uses a
  different auth shape (header, query param, mTLS), refine
  the preset in a future V2.10.x.
- Saving the bearer token in any file, including `.env`.
- The Docker Desktop attach panel (clean V2.10.63+ candidate;
  see V2.10.61 BRANDING entry).

## Security floor (read first)

The repo's security floor (`AGENTS.md:183` and
`.github/copilot-instructions.md:65`) forbids writing secrets,
tokens, or PEM blocks to source files. The bearer token is
held only in your shell's `process.env.IRONCLAW_TEST_TOKEN`
for the duration of the verification, and is never written to
disk by any script in this repo.

If the token has been posted to a chat transcript, a log file,
a screenshot, or any other persisted location: **rotate the
token on the IronClaw side first**, then continue.

## Step 0 — rotate the token (recommended)

If the token has been exposed anywhere outside the IronClaw
operator panel, rotate it before continuing. The V2.10.61
lane is bearer-token-only; rotating invalidates the old value
and the new value is what you will use in step 1.

## Step 1 — read the token from the IronClaw operator panel

In a fresh pwsh or bash terminal, capture the token from the
IronClaw operator panel's "copy" button (or the panel's
"reveal" affordance) and assign it to a shell variable. The
exact terminal command is intentionally not shown in this
document; the runbook is a printed artifact and the agent
that wrote it is bound by the same security floor as the
repo. The pattern is:

```pwsh
# pwsh (Windows)
$env:IRONCLAW_TEST_TOKEN = "<paste from IronClaw operator panel>"
```

```bash
# bash (macOS / Linux / WSL)
export IRONCLAW_TEST_TOKEN="<paste from IronClaw operator panel>"
```

Verify the env var is set without echoing the value:

```pwsh
# pwsh
'IRONCLAW_TEST_TOKEN length: ' + $env:IRONCLAW_TEST_TOKEN.Length
```

```bash
# bash
echo "IRONCLAW_TEST_TOKEN length: ${#IRONCLAW_TEST_TOKEN}"
```

If the length is 64, the shape matches a SHA-256 / 32-byte hex
token, which is what the V2.10.61 preset expects. If the length
is something else, your IronClaw deployment uses a different
auth shape — see "Out of scope" above.

## Step 2 — point the probe at the live IronClaw

The default URL is `http://127.0.0.1:8281/health` (the
documented IronClaw operator surface). If your IronClaw
publishes on a different port or path, override via
`IRONCLAW_TEST_URL`:

```pwsh
# pwsh
$env:IRONCLAW_TEST_URL = "http://gpu-host.lan:9000/health"
```

```bash
# bash
export IRONCLAW_TEST_URL="http://gpu-host.lan:9000/health"
```

For an OpenAI-compatible IronClaw, the path is usually
`/v1/models`; for a raw IronClaw operator surface, `/health`;
for the V2.10.60 probe module's contract, `/models`. The
script will report the path it probed and the status code it
got back, so iterate on the path until you see `200`.

## Step 3 — run the smoke

```pwsh
# pwsh
node scripts/ironclaw-attach.smoke.cjs
```

```bash
# bash
node scripts/ironclaw-attach.smoke.cjs
```

Expected output (PASS):

```
[ironclaw-attach.smoke] URL   : http://127.0.0.1:8281/health
[ironclaw-attach.smoke] TOKEN : <set, length=64>
[ironclaw-attach.smoke] token preview (masked): e4c3…ff94
[ironclaw-attach.smoke] probing...
[ironclaw-attach.smoke] PASS  status=200 latency=12ms
```

The token preview is **always** a 4-char prefix + ellipsis +
4-char suffix. The full token is never logged.

Expected output (FAIL with hint):

```
[ironclaw-attach.smoke] URL   : http://127.0.0.1:8281/health
[ironclaw-attach.smoke] TOKEN : <set, length=64>
[ironclaw-attach.smoke] token preview (masked): e4c3…ff94
[ironclaw-attach.smoke] probing...
[ironclaw-attach.smoke] FAIL  status=401 latency=8ms error=<none>
[ironclaw-attach.smoke] hint  : IronClaw rejected the bearer. Verify the token in the IronClaw operator panel matches IRONCLAW_TEST_TOKEN.
```

The hint is operator-actionable. The token is never referenced
in the hint.

## Step 4 — attach from the Agent Desktop remote panel

1. Launch Agent Desktop.
2. Settings → Connection → Remote → Runtime lane: **IronClaw**.
3. URL: `http://<host>:<port>/health` (or the path that
   returned 200 in step 3).
4. Bearer token: paste the same value you used in
   `IRONCLAW_TEST_TOKEN`.
5. Click **Test connection**. The diagnostic should report
   `reachable: true` and the `runtime` should resolve to
   `ironclaw` (the V2.10.61 `inferGatewayRuntimePreset` rule).
6. Click **Save**. The saved Model card should show a green
   health dot within ~30 s (the V2.10.60 periodic probe
   interval).

If the dot is red, the negative path is pinned. The most
common causes are:

- **Wrong port**: the `ironclaw` lane snaps to 8281. If your
  IronClaw is on a different port, edit the URL field before
  clicking Save.
- **Wrong token**: the V2.10.61 preset uses `Authorization:
  Bearer <token>`. If your IronClaw expects a different
  header, the dot will be red until the preset is refined.
- **Container not running**: the 1.5 s probe timeout will
  surface as `error: ECONNREFUSED` in the diagnostic. Start
  the container and re-test.

## Step 5 — clean up the shell env

```pwsh
# pwsh
Remove-Item Env:IRONCLAW_TEST_TOKEN
Remove-Item Env:IRONCLAW_TEST_URL
```

```bash
# bash
unset IRONCLAW_TEST_TOKEN
unset IRONCLAW_TEST_URL
```

The token is now gone from the shell. The next time you
attach from the Agent Desktop remote panel, paste it again
from the IronClaw operator panel.

## What the in-repo unit smoke covers (vs. the operator runbook)

The in-repo smoke at
`agent-desktop/tests/ironclaw-attach.smoke.test.ts` proves:

- The V2.10.60 `probeLocalModelHealth` module is importable
  and returns `reachable: true` against a healthy fake
  IronClaw.
- The probe module **does not** read `IRONCLAW_TEST_TOKEN`
  from the env and does not forward it as a header or query
  string. The credential is owned by the apply layer
  (`Settings.tsx`) at the form-input boundary, not by the
  probe layer.
- The `IRONCLAW_TEST_TOKEN` env-var name is pinned so a
  future refactor cannot silently rename it.

What the in-repo smoke does **not** cover: a live attach
against the real IronClaw. That is what this runbook is for.
Run both — unit smoke on every PR, operator smoke on every
IronClaw deployment.
