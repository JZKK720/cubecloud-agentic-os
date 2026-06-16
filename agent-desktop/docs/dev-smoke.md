<!--
Dev smoke test guide — how to run the Agent Desktop on a Windows dev box
without triggering the SmartScreen "应用程序控制策略已阻止此文件" block
that hits the unsigned NSIS installer.

Audience: contributors running `npm run build:win` on a developer machine.
This file is **not** for end users; production users get signed installers
via the release pipeline (.github/RELEASING.md).
-->

# Dev-box smoke test for Agent Desktop

## TL;DR

```powershell
# After `npm run build:win` completes, do NOT double-click the NSIS installer.
# Use the unpacked build instead — it is identical code, does not need
# elevation, and SmartScreen does not gate it.

$exe = "$PWD\agent-desktop\dist\win-unpacked\agent-desktop.exe"
& $exe
```

If the unpacked binary path is missing, regenerate it:

```powershell
npm run build:unpack       # produces dist\win-unpacked\ without an installer
```

## Why the NSIS installer is blocked

The NSIS artifact at `dist\agent-desktop-<ver>-setup.exe` is
unsigned. The first time any user runs an unsigned installer,
Windows SmartScreen intercepts it with the localized message
"应用程序控制策略已阻止此文件" (Application control policy has blocked
this file). The block is **not** from AppLocker, WDAC, or SRP — those
policy engines are empty on this dev box (verified via
`Get-AppLockerPolicy -Effective -Xml`, `HKLM:\…\SrpV2\Exe`, and
`HKLM:\…\CI\Policies`).

The block is **default SmartScreen behavior** for unrecognized
publishers. The unpacked `.exe` does not need elevation, so it
passes without prompting.

## Options ranked

| # | Approach | When to use | Notes |
|---|---|---|---|
| 1 | **Unpacked binary smoke test** | Every local dev run | `dist\win-unpacked\agent-desktop.exe`. No elevation, no SmartScreen gate. **Default for this repo.** |
| 2 | **Portable NSIS** | Verifying the no-install path | `dist\…-portable.exe`. First launch shows the "Windows protected your PC" prompt — click "More info → Run anyway". Windows remembers per-user. |
| 3 | **Self-signed test cert** | End-to-end install/uninstall rehearsal | `New-SelfSignedCertificate` + `Set-AuthenticodeSignature` embeds a cert, but SmartScreen still warns (untrusted root). Useful only for `Add/Remove Programs` round-trip tests. |
| 4 | **Disable SmartScreen on the dev box** | Last resort, not recommended | `Set-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System" -Name EnableSmartScreen -Value 0` then restart. Disables SmartScreen for **all** executables on this box. |
| 5 | **Sign with an OV / EV cert** | Production release | Already wired in `.github/RELEASING.md` and `.github/workflows/release.yml`. EV certs get instant SmartScreen reputation. |

## Verify the dev box is not actually AppLocker-locked

If you want to be sure, run:

```powershell
Get-AppLockerPolicy -Effective -Xml
# Expected: <AppLockerPolicy Version="1" />  (empty — no rules)

Get-ChildItem "HKLM:\SOFTWARE\Policies\Microsoft\Windows\SrpV2" -ErrorAction SilentlyContinue
# Expected: empty / not present

Get-ChildItem "HKLM:\SYSTEM\CurrentControlSet\Control\CI\Policies" -ErrorAction SilentlyContinue
# Expected: empty / not present
```

If all three return empty, the SmartScreen block is the only gate and
the unpacked binary is the cleanest dev path.

## Related

- `.github/RELEASING.md` — production signing secrets + release flow
- `agent-desktop/electron-builder.yml` — `nsis.oneClick: true,
  perMachine: false` (no UAC, but SmartScreen still gates)
- `agent-desktop/scripts/smoke-all.js` — `npm run smoke` for
  cross-platform smoke tests
