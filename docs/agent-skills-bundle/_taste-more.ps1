$ErrorActionPreference = 'Continue'
$bundle = 'd:\users\joeyzh\github-pr\cubecloud-agentic-os\docs\agent-skills-bundle'
$log = Join-Path $bundle '_taste-more.log'
'' | Out-File -FilePath $log

# These are the install-names of the high-value taste-skill variants.
$variants = @(
  'high-end-visual-design',
  'minimalist-ui',
  'industrial-brutalist-ui',
  'redesign-existing-projects',
  'image-to-code',
  'full-output-enforcement'
)

foreach ($s in $variants) {
  $line = "--- $s ---"
  Write-Output $line
  Add-Content -Path $log -Value $line
  & npx -y skills add https://github.com/JZKK720/taste-skill --skill $s --yes 2>&1 | Tee-Object -Variable out | Out-Null
  $out | Select-Object -Last 5 | ForEach-Object { Add-Content -Path $log -Value $_ }
  if ($LASTEXITCODE -ne 0) {
    Add-Content -Path $log -Value "FAILED ($LASTEXITCODE)"
  } else {
    Add-Content -Path $log -Value 'OK'
  }
}

Write-Output ''
Write-Output '--- final listing ---'
Get-ChildItem -Path 'd:\users\joeyzh\github-pr\cubecloud-agentic-os\.agents\skills' -Filter 'SKILL.md' -ErrorAction SilentlyContinue | ForEach-Object {
  Write-Output $_.Directory.Name
}
