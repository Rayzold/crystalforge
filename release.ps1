Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $scriptRoot "content\Config.js"

function Get-GitExecutable {
  $command = Get-Command git -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $candidates = @(
    "C:\Program Files\Git\cmd\git.exe",
    "C:\Program Files\Git\bin\git.exe",
    "C:\Users\mstefanou\AppData\Local\Programs\Git\cmd\git.exe",
    "C:\Users\mstefanou\AppData\Local\Programs\Git\bin\git.exe",
    "C:\Users\mstefanou\AppData\Local\GitHubDesktop\bin\git.exe"
  )

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  throw "Git is not installed or not available in PATH. Install Git first, then run this button again."
}

function Get-AppVersion {
  if (-not (Test-Path $configPath)) {
    throw "Could not find Config.js at $configPath"
  }

  $match = Select-String -Path $configPath -Pattern 'APP_VERSION = "([^"]+)"' | Select-Object -First 1
  if (-not $match) {
    throw "Could not read APP_VERSION from $configPath"
  }

  return $match.Matches[0].Groups[1].Value
}

$git = Get-GitExecutable
$version = Get-AppVersion

Push-Location $scriptRoot
try {
  & $git rev-parse --is-inside-work-tree | Out-Null
  & $git add .

  $status = & $git status --porcelain
  if (-not $status) {
    Write-Host "No changes to release. Current build is $version" -ForegroundColor Yellow
    exit 0
  }

  & $git commit -m $version
  & $git push origin main

  Write-Host "Released $version to origin/main" -ForegroundColor Green
}
finally {
  Pop-Location
}
