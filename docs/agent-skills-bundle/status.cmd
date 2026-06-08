@echo off
REM ============================================================================
REM status.cmd
REM Report on which pieces of the agent-skills bundle are installed and
REM which require manual steps (Bun, Claude Code, etc.).
REM ============================================================================
setlocal

set "REPO=d:\users\joeyzh\github-pr\cubecloud-agentic-os"
set "BUNDLE=%REPO%\docs\agent-skills-bundle"
set "UP=%APPDATA%\Code\User\prompts"

echo.
echo === agent-skills-bundle status ===
echo.

echo --- Workspace Copilot instructions (always on in this repo) ---
if exist "%REPO%\.github\copilot-instructions.md" (
  powershell -NoProfile -Command "Write-Output ('  OK   .github\copilot-instructions.md  (' + (Get-Item '%REPO%\.github\copilot-instructions.md').Length + ' bytes)')"
) else (
  echo   MISS .github\copilot-instructions.md
)

echo.
echo --- Slash prompts in this workspace ---
set "P=0"
for %%F in ("%REPO%\.github\prompts\*.prompt.md") do set /a "P+=1"
if "%P%"=="0" (
  echo   MISS .github\prompts\  is empty
) else (
  echo   OK   %P% prompt files in .github\prompts\
  for %%F in ("%REPO%\.github\prompts\*.prompt.md") do echo         - %%~nxF
)

echo.
echo --- Vercel agent-skills in .agents\skills\ (Copilot picks up automatically) ---
if exist "%REPO%\.agents\skills" (
  set "C=0"
  for /d %%D in ("%REPO%\.agents\skills\*") do set /a "C+=1"
  setlocal EnableDelayedExpansion
  echo   OK   !C! skill directories in .agents\skills\
  for /d %%D in ("%REPO%\.agents\skills\*") do echo         - %%~nxD
  endlocal
) else (
  echo   MISS .agents\skills\  is empty
)

echo.
echo --- User-level Copilot instructions (always on, all workspaces) ---
if exist "%UP%\taste-skill-design-rules.instructions.md" (
  powershell -NoProfile -Command "Write-Output ('  OK   taste-skill-design-rules.instructions.md  (' + (Get-Item '%UP%\taste-skill-design-rules.instructions.md').Length + ' bytes)')"
) else (
  echo   MISS %UP%\taste-skill-design-rules.instructions.md
)

echo.
echo --- Upstream reference (Karpathy CLAUDE.md) ---
if exist "%BUNDLE%\andrej-karpathy-skills.CLAUDE.md" (
  powershell -NoProfile -Command "Write-Output ('  OK   andrej-karpathy-skills.CLAUDE.md  (' + (Get-Item '%BUNDLE%\andrej-karpathy-skills.CLAUDE.md').Length + ' bytes)')"
) else (
  echo   MISS run install-andrej-karpathy-skills.cmd to fetch
)

echo.
echo --- Upstream reference (taste-skill SKILL.md files) ---
if exist "%BUNDLE%\taste-skill-ref" (
  set "C=0"
  for %%F in ("%BUNDLE%\taste-skill-ref\*.SKILL.md") do set /a "C+=1"
  setlocal EnableDelayedExpansion
  echo   OK   !C! SKILL.md files in taste-skill-ref\
  endlocal
) else (
  echo   MISS run _fetch-taste2.ps1
)

echo.
echo --- AI-Engineering-Coach VS Code extension ---
where code >nul 2>nul
if errorlevel 1 (
  echo   SKIP 'code' CLI not on PATH
) else (
  powershell -NoProfile -Command "& { $out = & 'C:\Users\joeyz\AppData\Local\Programs\Microsoft VS Code\bin\code.cmd' --list-extensions 2>$null | Where-Object { $_ -match 'ai-engineer-coach' }; if ($out) { Write-Output ('  OK   installed: ' + $out) } else { Write-Output '  MISS not installed' } }"
  for %%F in ("%BUNDLE%\_vsix\*.vsix") do echo         BUILD %%~nxF
)

echo.
echo --- Toolchains ---
where bun    >nul 2>nul && (echo   OK   bun on PATH) || (echo   MISS bun    - needed for gstack / gbrain)
where claude >nul 2>nul && (echo   OK   claude on PATH) || (echo   MISS claude - needed for gstack / Claude Code skills)
where code   >nul 2>nul && (echo   OK   code on PATH) || (echo   MISS code   - needed for AI-Engineering-Coach)
where npx    >nul 2>nul && (echo   OK   npx on PATH) || (echo   MISS npx    - needed for taste-skill CLI install)

echo.
echo --- Optional stacks (deferred) ---
if exist "%USERPROFILE%\.claude\skills\gstack" (
  echo   OK   gstack installed
) else (
  echo   SKIP gstack not installed. Run install-optional-stack.cmd then G
)
if exist "%USERPROFILE%\.gbrain" (
  echo   OK   gbrain installed
) else (
  echo   SKIP gbrain not installed. Run install-optional-stack.cmd then B
)

echo.
echo === Done ===
endlocal
