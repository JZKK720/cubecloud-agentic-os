$ErrorActionPreference = 'Stop'
$api = Invoke-RestMethod -UseBasicParsing -Uri 'https://api.github.com/repos/JZKK720/AI-Engineering-Coach/releases/latest'
$asset = $api.assets | Where-Object { $_.name -like '*.vsix' } | Select-Object -First 1
if (-not $asset) {
  Write-Output 'NO_VSIX_ASSET_ON_LATEST_RELEASE'
  Write-Output ('Release tag: ' + $api.tag_name)
  Write-Output ('Asset count: ' + $api.assets.Count)
  exit 2
}
$destDir = 'd:\users\joeyzh\github-pr\cubecloud-agentic-os\docs\agent-skills-bundle\_vsix'
$dest = Join-Path $destDir $asset.name
New-Item -ItemType Directory -Force -Path $destDir | Out-Null
Write-Output ('Downloading ' + $asset.name + ' from ' + $asset.browser_download_url)
Invoke-WebRequest -UseBasicParsing -Uri $asset.browser_download_url -OutFile $dest
$len = (Get-Item $dest).Length
Write-Output ('DOWNLOADED ' + $dest + ' (' + $len + ' bytes)')
