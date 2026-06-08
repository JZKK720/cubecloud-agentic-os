$ErrorActionPreference = 'Continue'
$bundle = 'd:\users\joeyzh\github-pr\cubecloud-agentic-os\docs\agent-skills-bundle'
$log = Join-Path $bundle '_taste-rest.log'
'' | Out-File -FilePath $log

# Install the rest. These install-names match the SKILL.md frontmatter.
$variants = @(
  'gpt-taste',
  'stitch-design-taste',
  'imagegen-frontend-web',
  'imagegen-frontend-mobile',
  'minimalist-skill',
  'soft-skill',
  'brutalist-skill',
  'redesign-skill',
  'image-to-code-skill',
  'gpt-tasteskill',
  'taste-skill',
  'taste-skill-v1',
  'brandkit'
)

foreach ($s in $variants) {
  Add-Content -Path $log -Value "--- $s ---"
  $out = & npx -y skills add https://github.com/JZKK720/taste-skill --skill $s --yes 2>&1
  $out | Select-Object -Last 3 | ForEach-Object { Add-Content -Path $log -Value $_ }
  if ($LASTEXITCODE -ne 0) {
    Add-Content -Path $log -Value "FAILED ($LASTEXITCODE)"
  }
}

# Also list what's actually installed.
Add-Content -Path $log -Value '--- final listing ---'
Get-ChildItem -Path 'd:\users\joeyzh\github-pr\cubecloud-agentic-os\.agents\skills' -Directory | ForEach-Object {
  Add-Content -Path $log -Value $_.Name
}
