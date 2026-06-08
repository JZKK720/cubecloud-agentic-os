$ErrorActionPreference = 'Stop'
$url = 'https://raw.githubusercontent.com/JZKK720/andrej-karpathy-skills/main/CLAUDE.md'
$dst = 'd:\users\joeyzh\github-pr\cubecloud-agentic-os\docs\agent-skills-bundle\andrej-karpathy-skills.CLAUDE.md'
try {
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $dst
  $len = (Get-Item $dst).Length
  Write-Output "WROTE $dst ($len bytes)"
} catch {
  Write-Output ('FETCH FAILED: ' + $_.Exception.Message)
  exit 1
}
