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

function Update-AssetVersions {
  # Rewrites every local "?v=..." cache-bust param (and adds it where missing)
  # so ALL html/js references share ONE asset version per release. This
  # prevents stale caches AND duplicate module instances from mixed pins.
  param(
    [Parameter(Mandatory = $true)]
    [string]$AssetVersion
  )

  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  $jsDirs = @(".", "admin", "systems", "ui", "engine", "content", "fx", "firebase")

  $reFrom  = '(from\s+")(\.{1,2}/[^"?]+\.js)(\?v=[^"]*)?(")'
  $reDyn   = '(import\(")(\.{1,2}/[^"?]+\.js)(\?v=[^"]*)?("\))'
  $reEntry = '(const APP_ENTRY = ")(\./app\.js)(\?v=[^"]*)?(")'
  $reHtml  = '((?:src|href)=")(\./[^"?]+\.(?:js|css))(\?v=[^"]*)?(")'

  $touched = 0
  foreach ($dir in $jsDirs) {
    $dirPath = Join-Path $scriptRoot $dir
    if (-not (Test-Path $dirPath)) { continue }
    foreach ($file in Get-ChildItem -Path $dirPath -Filter "*.js" -File) {
      $text = [System.IO.File]::ReadAllText($file.FullName)
      $new = $text -replace $reFrom,  "`${1}`${2}?v=$AssetVersion`${4}"
      $new = $new  -replace $reDyn,   "`${1}`${2}?v=$AssetVersion`${4}"
      $new = $new  -replace $reEntry, "`${1}`${2}?v=$AssetVersion`${4}"
      if ($new -ne $text) {
        [System.IO.File]::WriteAllText($file.FullName, $new, $utf8NoBom)
        $touched++
      }
    }
  }
  foreach ($file in Get-ChildItem -Path $scriptRoot -Filter "*.html" -File) {
    $text = [System.IO.File]::ReadAllText($file.FullName)
    $new = $text -replace $reHtml, "`${1}`${2}?v=$AssetVersion`${4}"
    if ($new -ne $text) {
      [System.IO.File]::WriteAllText($file.FullName, $new, $utf8NoBom)
      $touched++
    }
  }
  Write-Host "Asset version set to $AssetVersion in $touched files." -ForegroundColor Cyan
}

$git = Get-GitExecutable
$version = Get-AppVersion
$assetVersion = "$version-$(Get-Date -Format 'yyyyMMddHHmm')"

Push-Location $scriptRoot
try {
  Invoke-GitChecked -Arguments @("rev-parse", "--is-inside-work-tree") | Out-Null

  $status = Invoke-GitChecked -Arguments @("status", "--porcelain")
  if (-not $status) {
    Write-Host "No changes to release. Current build is $version" -ForegroundColor Yellow
    exit 0
  }

  Update-AssetVersions -AssetVersion $assetVersion

  Invoke-GitChecked -Arguments @("add", ".") | Out-Null

  Invoke-GitChecked -Arguments @("commit", "-m", $version) | Out-Null
  Invoke-GitChecked -Arguments @("push", "origin", "main") | Out-Null

  Write-Host "Released $version to origin/main" -ForegroundColor Green
}
finally {
  Pop-Location
}
