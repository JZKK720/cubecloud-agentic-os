# Run "1 and 3" - i.e. gstack (1st deferred) and taste-skill via Vercel CLI (3rd).
# Both need network; gstack also needs Bun. Both have graceful skip paths.

$ErrorActionPreference = 'Stop'
$bundle = 'd:\users\joeyzh\github-pr\cubecloud-agentic-os\docs\agent-skills-bundle'

# --- Network check ---
& "$bundle\_check-net.ps1"
if ($LASTEXITCODE -ne 0) {
  Write-Output 'Network unreachable. Aborting.'
  exit 1
}

# --- [1] gstack ---
Write-Output ''
Write-Output '=== [1] gstack ==='
Write-Output 'Source: https://github.com/JZKK720/gstack'
Write-Output "Target: $env:USERPROFILE\.claude\skills\gstack"
Write-Output ''

$bun = Get-Command bun -ErrorAction SilentlyContinue
if (-not $bun) {
  Write-Output '! Bun not found on PATH. gstack needs Bun v1.0+ to run.'
  Write-Output '  Install: https://bun.sh'
  Write-Output '  Skipping gstack. The 11 Copilot slash prompts and the user-level taste-skill design rules are still in effect.'
} else {
  $target = Join-Path $env:USERPROFILE '.claude\skills\gstack'
  if (Test-Path $target) {
    Write-Output ". gstack already installed at $target"
  } else {
    Write-Output "Cloning gstack to $target ..."
    git clone --single-branch --depth 1 https://github.com/JZKK720/gstack.git $target 2>&1 | Select-Object -First 5
    if ($LASTEXITCODE -ne 0) {
      Write-Output '! git clone failed.'
    } else {
      Push-Location $target
      try {
        Write-Output '--- bun install ---'
        & bun install 2>&1 | Select-Object -Last 10
        Write-Output '--- bun run setup ---'
        & bun run setup 2>&1 | Select-Object -Last 20
        Write-Output "+ gstack installed at $target"
        Write-Output '  Add the gstack section to your CLAUDE.md (the ./setup may have prompted).'
      } finally {
        Pop-Location
      }
    }
  }
}

# --- [3] taste-skill via Vercel CLI ---
Write-Output ''
Write-Output '=== [3] taste-skill (Vercel agent-skills CLI) ==='
Write-Output 'Source: https://github.com/JZKK720/taste-skill'
Write-Output ''

$npx = Get-Command npx -ErrorAction SilentlyContinue
if (-not $npx) {
  Write-Output '! npx not found. Need Node.js.'
} else {
  Write-Output 'Installing default taste-skill (design-taste-frontend) ...'
  & npx -y skills add https://github.com/JZKK720/taste-skill --skill 'design-taste-frontend' --yes 2>&1 | Select-Object -Last 30
  if ($LASTEXITCODE -ne 0) {
    Write-Output '! npx skills add failed. Note: 13 SKILL.md files are already in'
    Write-Output '  docs/agent-skills-bundle/taste-skill-ref/, and 5 of them are wrapped as'
    Write-Output '  Copilot slash prompts in .github/prompts/. The Vercel CLI install lands in'
    Write-Output '  ~/.claude/skills/, which VS Code Copilot does not read.'
  } else {
    Write-Output '+ taste-skill installed. For Claude Code: open a session and the skill appears.'
  }
}

Write-Output ''
Write-Output '=== Done (1 and 3) ==='
