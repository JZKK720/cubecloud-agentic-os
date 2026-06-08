@echo off
REM ============================================================================
REM install-andrej-karpathy-skills.cmd
REM
REM Fetches the upstream Karpathy 4-principles CLAUDE.md from your fork and
REM places it as a reference file inside this workspace. The actual Copilot
REM rules live in .github\copilot-instructions.md (already authored). This
REM file is the upstream source-of-truth so you can diff or re-sync later.
REM
REM Source: https://github.com/JZKK720/andrej-karpathy-skills
REM
REM Run from repo root:   docs\agent-skills-bundle\install-andrej-karpathy-skills.cmd
REM ============================================================================

setlocal
set "SRC=https://raw.githubusercontent.com/JZKK720/andrej-karpathy-skills/main/CLAUDE.md"
set "DST=docs\agent-skills-bundle\andrej-karpathy-skills.CLAUDE.md"

echo.
echo === Andrej Karpathy Skills: install reference CLAUDE.md ===
echo Source: %SRC%
echo Target: %DST%
echo.

REM Make sure the target dir exists
if not exist "docs\agent-skills-bundle" mkdir "docs\agent-skills-bundle" >nul

REM Use PowerShell to fetch (curl on Windows behaves oddly with raw.githubusercontent)
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { ^
     Invoke-WebRequest -UseBasicParsing -Uri '%SRC%' -OutFile '%DST%'; ^
     Write-Output ('WROTE ' + (Resolve-Path '%DST%').Path); ^
   } catch { ^
     Write-Output ('FETCH FAILED: ' + $_.Exception.Message); ^
     exit 1; ^
   }"

if errorlevel 1 (
  echo.
  echo ! Fetch failed. Network unreachable? Try again when github.com is reachable.
  exit /b 1
)

echo.
echo === Done ===
echo - %DST% now contains the upstream Karpathy CLAUDE.md.
echo - Your Copilot rules are in .github\copilot-instructions.md (always on).
echo - Diff them with: fc .github\copilot-instructions.md %DST%
endlocal
