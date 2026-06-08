$ErrorActionPreference = 'Stop'
$dst  = 'd:\users\joeyzh\github-pr\cubecloud-agentic-os\docs\agent-skills-bundle\taste-skill-ref'
New-Item -ItemType Directory -Force -Path $dst | Out-Null
$dirs = @(
  'taste-skill',
  'taste-skill-v1',
  'gpt-tasteskill',
  'image-to-code-skill',
  'redesign-skill',
  'soft-skill',
  'output-skill',
  'minimalist-skill',
  'brutalist-skill',
  'stitch-skill',
  'brandkit',
  'imagegen-frontend-web',
  'imagegen-frontend-mobile'
)
$base = 'https://raw.githubusercontent.com/JZKK720/taste-skill/main/skills'
foreach ($d in $dirs) {
  $url = "$base/$d/SKILL.md"
  $local = Join-Path $dst ($d + '.SKILL.md')
  try {
    Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $local
    $len = (Get-Item $local).Length
    Write-Output ("OK   {0}  ({1} bytes)" -f $d, $len)
  } catch {
    $msg = $_.Exception.Message
    if ($msg -match '404|Not Found') {
      Write-Output ("MISS {0}" -f $d)
    } else {
      Write-Output ("ERR  {0}  -> {1}" -f $d, $msg)
    }
  }
}
