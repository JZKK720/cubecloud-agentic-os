@echo off
REM ============================================================================
REM install-headroom-workflow.cmd
REM
REM Mirrors the repo-local Headroom workflow skill into the user-global
REM Copilot skills directory so non-repo VS Code / Copilot sessions can load it.
REM
REM Run from repo root:   docs\agent-skills-bundle\install-headroom-workflow.cmd
REM ============================================================================
setlocal
set "SCRIPT_DIR=%~dp0"
set "REPO_ROOT=%SCRIPT_DIR%..\.."
for %%I in ("%REPO_ROOT%") do set "REPO_ROOT=%%~fI"
set "SRC=%REPO_ROOT%\.github\skills\headroom-workflow\SKILL.md"
set "DST_DIR=%USERPROFILE%\.agents\skills\headroom-workflow"
set "DST=%DST_DIR%\SKILL.md"

if not exist "%SRC%" (
  echo ! Could not find %SRC%
  exit /b 1
)

if not exist "%DST_DIR%" mkdir "%DST_DIR%" >nul
copy /Y "%SRC%" "%DST%" >nul
if errorlevel 1 (
  echo ! Copy failed.
  exit /b 1
)

echo + Headroom workflow skill mirrored to: %DST%
echo.
echo Next steps:
echo   1. Install Headroom itself if needed:
echo        pip install "headroom-ai[all]"
echo      or
echo        pipx install --python python3.13 "headroom-ai[all]"
echo   2. Choose one mode:
echo        headroom proxy --port 8787
echo        headroom mcp install
echo        headroom wrap copilot --subscription -- --model gpt-4o
echo   3. Reload VS Code: Developer: Reload Window
endlocal
exit /b 0
