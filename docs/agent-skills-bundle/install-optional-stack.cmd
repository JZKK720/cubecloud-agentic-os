@echo off
REM ============================================================================
REM install-optional-stack.cmd
REM
REM Optional installers for the rest of the agent skills bundle. These are
REM NOT the Copilot-native pieces. Each option targets a DIFFERENT runtime;
REM pick only what you actually use.
REM
REM   [G] gstack             - Claude Code plugin (Bun, ~/.claude/skills/gstack)
REM   [B] gbrain             - MCP server (Bun + Postgres/pgvector)
REM   [T] taste-skill        - Vercel agent-skills CLI (npx skills add)
REM   [C] AI-Engineering-Coach - VS Code extension (.vsix install)
REM
REM The Copilot-native rules are already installed by the .github\ folder
REM in this workspace. This script is for the OTHER runtimes.
REM
REM Run from repo root:   docs\agent-skills-bundle\install-optional-stack.cmd
REM ============================================================================

setlocal EnableDelayedExpansion

REM --- helpers ----------------------------------------------------------------

set "BUNDLE_DIR=%~dp0"
set "BUNDLE_DIR=%BUNDLE_DIR:~0,-1%"

REM If the first argument is a non-interactive mode like "g,t" or "g t",
REM run those blocks in order and exit without the menu.
REM Syntax: install-optional-stack.cmd g,t   (g=gstack b=gbrain t=taste c=coach)
if not "%~1"=="" (
  set "AUTO=%~1"
  set "AUTO_RETURN=:MENU"
  call :check_net || (echo. & echo ! Network check failed. & exit /b 1)
  REM Direct-goto dispatcher. We change the return label each :DO_* uses,
  REM peel one letter off AUTO, dispatch, set the return label back, repeat.
  setlocal EnableDelayedExpansion
  :AUTO_LOOP
  if "!AUTO!"=="" goto :AUTO_DONE
  set "AUTO_HEAD=!AUTO:~0,1!"
  set "AUTO_REST=!AUTO:~1!"
  set "AUTO=!AUTO_REST!"
  set "AUTO_RETURN=:AUTO_LOOP"
  if /i "!AUTO_HEAD!"=="g" goto :DO_GSTACK
  if /i "!AUTO_HEAD!"=="b" goto :DO_GBRAIN
  if /i "!AUTO_HEAD!"=="t" goto :DO_TASTE
  if /i "!AUTO_HEAD!"=="c" goto :DO_COACH
  REM Unknown letter, skip it.
  goto :AUTO_LOOP
  :AUTO_DONE
  endlocal
  echo.
  echo === Done (non-interactive) ===
  exit /b 0
)

call :check_net
if errorlevel 1 (
  echo.
  echo ! github.com:443 is not reachable from this terminal.
  echo   The optional stacks all need network. Re-run when you have it.
  echo.
  pause
  exit /b 1
)

:MENU
REM If we are in non-interactive auto mode, return to the dispatcher instead
REM of showing the menu. The :DO_* blocks do `goto :MENU` after each action.
if not "%AUTO%"=="" goto :AUTO_LOOP
echo.
echo === Optional stacks: pick one or more ===
echo   [G] gstack             - Claude Code workflow plugin (23 skills)
echo   [B] gbrain             - MCP server for persistent memory
echo   [T] taste-skill        - Vercel agent-skills (anti-slop design)
echo   [C] AI-Engineering-Coach - VS Code extension (usage dashboard)
echo   [A] All of the above
echo   [Q] Quit
echo.
set /p "CHOICE=Choice: "
if /i "%CHOICE%"=="G" goto :DO_GSTACK
if /i "%CHOICE%"=="B" goto :DO_GBRAIN
if /i "%CHOICE%"=="T" goto :DO_TASTE
if /i "%CHOICE%"=="C" goto :DO_COACH
if /i "%CHOICE%"=="A" call :DO_GSTACK & call :DO_GBRAIN & call :DO_TASTE & call :DO_COACH & goto :END
if /i "%CHOICE%"=="Q" goto :END
echo Unknown choice. Try again.
goto :MENU

REM ============================================================================
REM [G] gstack
REM Claude Code workflow plugin. Installs to %USERPROFILE%\.claude\skills\gstack
REM Requires: Bun v1.0+, Git, Claude Code CLI (optional but recommended).
REM Visibility: only Claude Code sessions, not VS Code Copilot.
REM ============================================================================
:DO_GSTACK
echo.
echo --- gstack ---
echo Source: https://github.com/JZKK720/gstack
echo Target: %USERPROFILE%\.claude\skills\gstack
echo.
where bun >nul 2>nul
if errorlevel 1 (
  echo ! Bun not found on PATH. gstack needs Bun v1.0+ to run.
  echo   Install: https://bun.sh
  echo   Skipping. (You can install Bun and re-run.)
  goto :MENU
)
where claude >nul 2>nul
if errorlevel 1 (
  echo . Claude Code CLI not detected. The install will still work;
  echo   the skills simply have no Claude Code to attach to.
)
if exist "%USERPROFILE%\.claude\skills\gstack" (
  echo . gstack already installed at %USERPROFILE%\.claude\skills\gstack
  set /p "RE=Reinstall? (y/N): "
  if /i not "!RE!"=="Y" goto :MENU
)
git clone --single-branch --depth 1 https://github.com/JZKK720/gstack.git "%USERPROFILE%\.claude\skills\gstack"
if errorlevel 1 (
  echo ! git clone failed. Check network and credentials.
  goto :MENU
)
pushd "%USERPROFILE%\.claude\skills\gstack"
call bun install
if errorlevel 1 (
  echo ! bun install failed. Aborting gstack setup.
  popd
  goto :MENU
)
call bun run setup
set "GSETUP_EC=%ERRORLEVEL%"
popd
if not "%GSETUP_EC%"=="0" (
  echo . gstack clone + install succeeded; ./setup exited %GSETUP_EC%.
  echo   See docs/agent-skills-bundle/README.md for the manual CLAUDE.md edit.
) else (
  echo + gstack installed. Add the "gstack" section to your CLAUDE.md
  echo   (the ./setup script may have prompted; if not, see the README).
)
goto :MENU

REM ============================================================================
REM [B] gbrain
REM MCP server for persistent agent memory. Local PGLite or remote Supabase.
REM Visibility: any MCP-aware client (Claude Code, Codex, Copilot via MCP).
REM ============================================================================
:DO_GBRAIN
echo.
echo --- gbrain ---
echo Source: https://github.com/JZKK720/gbrain
echo Target: %USERPROFILE%\.gbrain
echo.
where bun >nul 2>nul
if errorlevel 1 (
  echo ! Bun not found on PATH. gbrain needs Bun v1.0+.
  echo   Install: https://bun.sh
  echo   Skipping.
  goto :MENU
)
echo Choose backend:
echo   [1] PGLite local  (no Docker, no account, ~2s setup)
echo   [2] Supabase      (cloud, requires URL + keys)
echo   [Q] Skip
set /p "GB=Backend: "
if /i "%GB%"=="Q" goto :MENU
if not "%GB%"=="1" if not "%GB%"=="2" (
  echo Unknown choice. Skipping gbrain.
  goto :MENU
)
bun install -g github:garrytan/gbrain
if errorlevel 1 (
  echo ! bun install -g failed. See: https://bun.sh/docs/cli/install
  goto :MENU
)
if "%GB%"=="1" (
  call gbrain init --pglite
  if errorlevel 1 (
    echo ! gbrain init --pglite failed.
    goto :MENU
  )
  echo + gbrain (PGLite) initialised. To wire to Claude Code:
  echo     claude mcp add gbrain -- gbrain serve
  echo   To wire to VS Code Copilot, add the same MCP server to your
  echo   .vscode\mcp.json (stdio transport, command: gbrain, args: [serve]).
) else (
  echo Provide your Supabase Session Pooler URL when prompted.
  call gbrain init
  if errorlevel 1 (
    echo ! gbrain init failed.
    goto :MENU
  )
  echo + gbrain (Supabase) initialised.
)
goto :MENU

REM ============================================================================
REM [T] taste-skill
REM Vercel agent-skills CLI. The SKILL.md files install as agent skills;
REM they show up in Claude Code's slash menu. In VS Code Copilot they are
REM NOT auto-loaded; you would have to copy individual SKILL.md files into
REM .github\prompts\ or .github\instructions\ by hand.
REM ============================================================================
:DO_TASTE
echo.
echo --- taste-skill ---
echo Source: https://github.com/JZKK720/taste-skill
echo Installer: Vercel agent-skills CLI (npx skills add)
echo.
where npm >nul 2>nul
if errorlevel 1 (
  echo ! npm not found on PATH. Need Node.js for npx.
  goto :MENU
)
where npx >nul 2>nul
if errorlevel 1 (
  echo ! npx not found. Update Node.js.
  goto :MENU
)
echo Installing default taste-skill (design-taste-frontend)...
call npx -y skills add https://github.com/JZKK720/taste-skill --skill "design-taste-frontend" --yes
if errorlevel 1 (
  echo ! npx skills add failed. Try: npx -y skills@latest add ...
  goto :MENU
)
echo + taste-skill installed. For Claude Code: open a session and the skill
echo   appears. For VS Code Copilot: copy the SKILL.md you want from
echo   %USERPROFILE%\.claude\skills\ into .github\prompts\ in your project.
echo.
echo Note: the 13 taste-skill SKILL.md files are already committed in this
echo   repo under docs\agent-skills-bundle\taste-skill-ref\, and 5 of them
echo   are wrapped as Copilot slash prompts in .github\prompts\. The Vercel
echo   CLI install lands in %USERPROFILE%\.claude\skills\, which VS Code
echo   Copilot does not read.
goto :MENU

REM ============================================================================
REM [C] AI-Engineering-Coach
REM Microsoft VS Code extension. Reads local AI session logs and shows a
REM dashboard. Pairs WITH Copilot (sits in the sidebar) but is not a "skill."
REM ============================================================================
:DO_COACH
echo.
echo --- AI-Engineering-Coach ---
echo Source: https://github.com/JZKK720/AI-Engineering-Coach
echo Target: VS Code extension
echo.
where code >nul 2>nul
if errorlevel 1 (
  echo ! 'code' CLI not on PATH. Open VS Code, press Ctrl+Shift+P,
  echo   'Shell Command: Install code command in PATH', then re-run.
  goto :MENU
)
echo Choose install path:
echo   [1] Download prebuilt .vsix from upstream Releases
echo   [2] Build from source (needs Node.js + npm)
echo   [Q] Skip
set /p "CC=Path: "
if /i "%CC%"=="Q" goto :MENU
if "%CC%"=="1" (
  set "VSIX_DIR=%BUNDLE_DIR%\_vsix"
  if not exist "!VSIX_DIR!" mkdir "!VSIX_DIR!" >nul
  REM Delegate to the .ps1 shim because inline `powershell -Command` mangles $_ in cmd.
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0_fetch-coach-vsix.ps1"
  if errorlevel 2 (
    echo ! No .vsix on latest release. Falling through to build-from-source hint.
    goto :MENU
  )
  if errorlevel 1 (
    popd
    echo ! Could not download .vsix. Try option [2] or install manually.
    goto :MENU
  )
  pushd "!VSIX_DIR!"
  for %%F in ("*.vsix") do (
    echo Installing %%~nxF ...
    call code --install-extension "%%~fF"
  )
  popd
) else if "%CC%"=="2" (
  set "SRC=%BUNDLE_DIR%\_coach-src"
  if exist "!SRC!" (
    echo . Reusing existing clone at !SRC! (delete it to force a fresh clone)
  ) else (
    echo Cloning JZKK720/AI-Engineering-Coach to !SRC!...
    git clone --depth 1 https://github.com/JZKK720/AI-Engineering-Coach.git "!SRC!"
    if errorlevel 1 (
      echo ! git clone failed.
      goto :MENU
    )
  )
  pushd "!SRC!"
  call npm ci
  if errorlevel 1 (
    echo ! npm ci failed. Check Node.js / npm versions.
    popd
    goto :MENU
  )
  call npm run package
  if errorlevel 1 (
    echo ! npm run package failed.
    popd
    goto :MENU
  )
  for %%F in ("*.vsix") do (
    echo Installing %%~nxF ...
    call code --install-extension "%%~fF"
  )
  popd
) else (
  echo Unknown choice. Skipping.
)
goto :MENU

REM ============================================================================
:END
echo.
echo === Done ===
echo After each install, restart VS Code and (if applicable) Claude Code.
endlocal
exit /b 0

REM ----------------------------------------------------------------------------
:check_net
REM Use the .ps1 shim because inline `powershell -Command` mangles $_ / $tcp / $ar.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0_check-net.ps1"
exit /b %ERRORLEVEL%
