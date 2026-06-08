$ErrorActionPreference = 'Stop'
$tree = Invoke-RestMethod -UseBasicParsing -Uri 'https://api.github.com/repos/JZKK720/taste-skill/contents/skills'
foreach ($entry in $tree) {
  $name = $entry.name
  $type = $entry.type
  $url  = $entry.download_url
  Write-Output ("{0,-8} {1}" -f $type, $name)
}
