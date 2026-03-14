$port = 8000
Set-Location $PSScriptRoot

if (Get-Command py -ErrorAction SilentlyContinue) {
  Write-Host "Starting Crystal Forge at http://localhost:$port"
  py -m http.server $port
  exit $LASTEXITCODE
}

if (Get-Command python -ErrorAction SilentlyContinue) {
  Write-Host "Starting Crystal Forge at http://localhost:$port"
  python -m http.server $port
  exit $LASTEXITCODE
}

Write-Host "Python was not found in PATH."
Write-Host "Install Python, then run this script again."
