$ErrorActionPreference = 'Continue'
$root = 'd:\users\joeyzh\github-pr\cubecloud-agentic-os\docs\agent-skills-bundle\taste-skill-ref'
Get-ChildItem -Path $root -Filter '*.SKILL.md' | ForEach-Object {
  $line = (Get-Content $_.FullName -TotalCount 5 | Select-String -Pattern '^name:') | Select-Object -First 1
  $name = if ($line) { $line.ToString().Trim() } else { '(no name)' }
  Write-Output ($_.BaseName + ' -> ' + $name)
}
