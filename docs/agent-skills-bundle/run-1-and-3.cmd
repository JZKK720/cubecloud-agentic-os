@echo off
REM ============================================================================
REM run-1-and-3.cmd
REM Non-interactively runs option [G] gstack then option [T] taste-skill
REM from install-optional-stack.cmd. Network is checked first; if github.com
REM is unreachable, the installer bails out cleanly.
REM
REM Assumes the user's "1 and 3" means the 1st and 3rd items in the menu
REM in their order: [G] gstack and [T] taste-skill.
REM ============================================================================

setlocal
cd /d "d:\users\joeyzh\github-pr\cubecloud-agentic-os"
call "docs\agent-skills-bundle\install-optional-stack.cmd" g,t
endlocal
