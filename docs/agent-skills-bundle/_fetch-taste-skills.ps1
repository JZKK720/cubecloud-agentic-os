$ErrorActionPreference = 'Stop'
$ErrorActionPreference = 'Stop'
$base = 'https://raw.githubusercontent.com/JZKK720/taste-skill/main/skills'
$dst  = 'd:\users\joeyzh\github-pr\cubecloud-agentic-os\docs\agent-skills-bundle\taste-skill-ref'
New-Item -ItemType Directory -Force -Path $dst | Out-Null
$candidates = @(
  'design-taste-frontend/SKILL.md',
  'design-taste-frontend-v1/SKILL.md',
  'gpt-taste/SKILL.md',
  'image-to-code/SKILL.md',
  'redesign-existing-projects/SKILL.md',
  'high-end-visual-design/SKILL.md',
  'full-output-enforcement/SKILL.md',
  'minimalist-ui/SKILL.md',
  'industrial-brutalist-ui/SKILL.md',
  'stitch-design-taste/SKILL.md'
)
foreach ($c in $candidates) {
  $url = "$base/$c"
  $name = ($c -replace '/', '__')
  $target = Join-Path $dst $name
  try {
    Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $target
    $len = (Get-Item $target).Length
    Write-Output ("OK   {0}  ({1} bytes)" -f $c, $len)
  } catch {
    $msg = $_.Exception.Message
    if ($msg -match '404|Not Found') {
      Write-Output ("MISS {0}" -f $c)
    } else {
      Write-Output ("ERR  {0}  -> {1}" -f $c, $msg)
    }
  }
}
