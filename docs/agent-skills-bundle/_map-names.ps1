$ErrorActionPreference = 'Continue'
$root = 'd:\users\joeyzh\github-pr\cubecloud-agentic-os\.agents\skills'
Get-ChildItem -Path $root -Directory | ForEach-Object {
  $f = Join-Path $_.FullName 'SKILL.md'
  if (Test-Path $f) {
    $line = (Get-Content $f -TotalCount 5 | Select-String -Pattern '^name:') | Select-Object -First 1
    $name = if ($line) { $line.ToString().Trim() } else { '(no name)' }
    Write-Output ($_.Name + ' -> ' + $name)
  }
}
