$ErrorActionPreference = 'Continue'
$bundle = 'd:\users\joeyzh\github-pr\cubecloud-agentic-os\docs\agent-skills-bundle'
$log = Join-Path $bundle '_taste-rest2.log'
'' | Out-File -FilePath $log

$variants = @(
  'brandkit',
  'gpt-taste',
  'imagegen-frontend-mobile',
  'imagegen-frontend-web',
  'stitch-design-taste',
  'design-taste-frontend-v1'
)

foreach ($s in $variants) {
  Add-Content -Path $log -Value "--- $s ---"
  $out = & npx -y skills add https://github.com/JZKK720/taste-skill --skill $s --yes 2>&1
  $exit = $LASTEXITCODE
  $out | Select-Object -Last 3 | ForEach-Object { Add-Content -Path $log -Value $_ }
  Add-Content -Path $log -Value "exit=$exit"
}

Add-Content -Path $log -Value '--- final listing ---'
Get-ChildItem -Path 'd:\users\joeyzh\github-pr\cubecloud-agentic-os\.agents\skills' -Directory | ForEach-Object {
  Add-Content -Path $log -Value $_.Name
}
Add-Content -Path $log -Value '--- DONE ---'
