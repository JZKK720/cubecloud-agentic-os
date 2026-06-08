$ErrorActionPreference = 'Stop'
try {
  $tcp = New-Object System.Net.Sockets.TcpClient
  $ar = $tcp.BeginConnect('github.com', 443, $null, $null)
  $ok = $ar.AsyncWaitHandle.WaitOne(8000, $false)
  if ($ok) {
    $tcp.EndConnect($ar)
    $tcp.Close()
    Write-Output 'github.com:443 -> REACHABLE'
    exit 0
  } else {
    $tcp.Close()
    Write-Output 'github.com:443 -> UNREACHABLE'
    exit 1
  }
} catch {
  Write-Output ('github.com:443 -> ERROR: ' + $_.Exception.Message)
  exit 1
}
