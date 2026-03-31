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

function Invoke-GitChecked {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $output = & $git @Arguments 2>&1
    $exitCode = $LASTEXITCODE
  }
  finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }

  if ($exitCode -ne 0) {
    $joinedOutput = ($output | ForEach-Object { "$_" }) -join [Environment]::NewLine
    throw "git $($Arguments -join ' ') failed with exit code $exitCode.`n$joinedOutput"
  }

  return $output
}

$git = Get-GitExecutable
$version = Get-AppVersion

Push-Location $scriptRoot
try {
  Invoke-GitChecked -Arguments @("rev-parse", "--is-inside-work-tree") | Out-Null
  Invoke-GitChecked -Arguments @("add", ".") | Out-Null

  $status = Invoke-GitChecked -Arguments @("status", "--porcelain")
  if (-not $status) {
    Write-Host "No changes to release. Current build is $version" -ForegroundColor Yellow
    exit 0
  }

  Invoke-GitChecked -Arguments @("commit", "-m", $version) | Out-Null
  Invoke-GitChecked -Arguments @("push", "origin", "main") | Out-Null

  Write-Host "Released $version to origin/main" -ForegroundColor Green
}
finally {
  Pop-Location
}
