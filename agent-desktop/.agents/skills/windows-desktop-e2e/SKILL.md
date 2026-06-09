---
name: windows-desktop-e2e
description: How to develop, test, and ship the desktop on Windows. CRLF line endings, PowerShell quirks, and the PATH-quirks that bite at runtime.
source: ecc
metadata:
  source_repo: ECC windows-desktop-e2e
  tags: [windows, powershell, crlf, electron-builder, signed-binaries]
  related_skills: [electron-pro, eval-harness, agent-harness-construction]
---

# Windows Desktop E2E

The primary development and shipping target is **Windows 10/11**. This skill captures the gotchas that are easy to miss when reading code on a Unix dev box.

## When to use

Use this skill when:

- A test passes on macOS/Linux CI but fails on Windows.
- A file edit doesn't show up at runtime —usually CRLF vs LF.
- A subprocess call (e.g. `hermes-agent`, `codegraph`) returns "not found" even though the binary exists.
- The Electron build is slow or the signed binary upload fails.

## CRLF is the default

Every file under `agent-desktop/src/main/` is committed with **CRLF** (`\r\n`) line endings. The renderer (`src/renderer/`) and shared code are LF. Tools that write `\n` will produce a file that **looks** correct but breaks the existing content the moment it's saved.

### How to spot a CRLF mismatch in patches

When a Node script patches a file, **always anchor on `\r\n`**, not `\n`. Use `Format-Hex` (PowerShell) to confirm the bytes:

```powershell
$bytes = [System.IO.File]::ReadAllBytes('path/to/file.ts')
$crlf = ($bytes | Where-Object { $_ -eq 13 }).Count
$lf   = ($bytes | Where-Object { $_ -eq 10 }).Count
Write-Host "CR: $crlf, LF: $lf"
```

If the file should be CRLF and `CR < LF`, your patch introduced an LF-only line.

### Mojibake from prompts

Em-dashes (`—`) typed into a prompt can survive a `create_file` round-trip as two literal `?` characters (`??`). The file is then saved with mojibake. Always `Format-Hex` lines that are supposed to contain em-dashes:

```
00000010   3F 3F 6F 76 65 72 6C 61 79  ??overlay
```

`3F 3F` is `??` —the em-dash got swallowed. Replace with a hyphen `-` or `—` (after re-typing the file).

## PowerShell quirks

### Stash references

`git stash pop 'stash@{0}'` —always quote the stash ref. The `@{}` may be parsed as a hashtable otherwise.

### Assignment in one-liners

`$i = ...` at the start of a one-liner can be misparsed. Wrap multi-step checks in `& { ... }`:

```powershell
& {
  $i = 1
  Write-Host $i
}
```

### The `cd ...; & '...'` pattern

When chaining `cd` to another command, the working directory only persists within the same `run_in_terminal` call. Always use the literal `cd <path>;` prefix.

### Long output

Vitest output past ~60KB gets truncated by the terminal wrapper. Redirect to a file and `Get-Content -Tail 50`:

```powershell
& vitest.cmd run > D:\tmp\out.log 2>&1
Get-Content D:\tmp\out.log -Tail 30
```

### PowerShell 5.1 vs 7+

`[System.Net.Http.HttpClient]` requires `Add-Type -AssemblyName System.Net.Http` in 5.1. Always guard with that line if you touch HTTP from a shared hook script.

## PATH and the "command not found" trap

PowerShell's `$env:PATH` and the child process's `PATH` are not always the same. The desktop uses `getEnhancedPath()` (in `installer.ts`) to add common install locations (`C:\Program Files\Docker\Docker\resources\bin`, npm global, etc.) before invoking a subprocess. If a test invokes a subprocess without going through `runCodeGraph` / `runNpm`, it can fail mysteriously.

```ts
// Always go through the helper, never exec directly.
const envPath = getEnhancedPath();
spawnSync(lookupCommand, [command], { env: { ...process.env, PATH: envPath } });
```

## Subprocess window flicker

On Windows, every `child_process.spawn` opens a console window for a few ms unless `windowsHide: true` is set. The desktop sets it on every invocation, but a new test might forget. Symptoms: focus stolen, screenshots broken, log lines interleaved with terminal scrollback.

## Building signed binaries

`electron-builder` signs the Windows installer with the project's code-signing cert. The cert lives in the secure-store, not in the repo. **Never** commit a `.pfx` or `.p12`. The CI workflow reads the cert from a GitHub Actions secret.

## Reference

- `docs/append-design-dials-css.cjs` —pattern for adding content to a file with a known anchor.
- `docs/refactor-ua-status.cjs` —pattern for refactoring main-process files with `\r\n` anchors.
- `docs/add-skills-source-i18n.cjs` —pattern for batch-adding i18n keys to all 8 locales.
