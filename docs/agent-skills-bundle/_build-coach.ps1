$ErrorActionPreference = 'Stop'
$src = 'd:\users\joeyzh\github-pr\cubecloud-agentic-os\docs\agent-skills-bundle\_coach-src'
$dst = 'd:\users\joeyzh\github-pr\cubecloud-agentic-os\docs\agent-skills-bundle\_vsix'

if (Test-Path $src) {
  Write-Output ('Reusing existing clone at ' + $src)
  Push-Location $src
  try { git pull --depth 1 2>&1 | Select-Object -First 5 } catch { Write-Output ('pull failed: ' + $_.Exception.Message) }
} else {
  Write-Output ('Cloning JZKK720/AI-Engineering-Coach to ' + $src)
  New-Item -ItemType Directory -Force -Path (Split-Path $src) | Out-Null
  git clone --depth 1 https://github.com/JZKK720/AI-Engineering-Coach.git $src 2>&1 | Select-Object -First 5
  Push-Location $src
}

Write-Output '--- node --version ---'
node --version
Write-Output '--- npm --version ---'
npm --version
Write-Output '--- npm ci ---'
try { npm ci 2>&1 | Select-Object -Last 20 } catch { Write-Output ('npm ci failed: ' + $_.Exception.Message) }
Write-Output '--- npm run package ---'
try { npm run package 2>&1 | Select-Object -Last 30 } catch { Write-Output ('npm run package failed: ' + $_.Exception.Message) }

Pop-Location
$built = Get-ChildItem -Path $src -Filter '*.vsix' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($built) {
  New-Item -ItemType Directory -Force -Path $dst | Out-Null
  $target = Join-Path $dst $built.Name
  Copy-Item -Force $built.FullName $target
  $len = (Get-Item $target).Length
  Write-Output ('COPIED ' + $target + ' (' + $len + ' bytes)')
} else {
  Write-Output 'NO_VSIX_BUILT'
}
