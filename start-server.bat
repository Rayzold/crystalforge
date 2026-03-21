@echo off
setlocal
cd /d "%~dp0"

set PORT=8000

where py >nul 2>nul
if %ERRORLEVEL%==0 (
  echo Starting Crystal Forge at http://localhost:%PORT%
  py -m http.server %PORT%
  goto :eof
)

where python >nul 2>nul
if %ERRORLEVEL%==0 (
  echo Starting Crystal Forge at http://localhost:%PORT%
  python -m http.server %PORT%
  goto :eof
)

echo Python was not found in PATH.
echo Install Python, then run this file again.
pause
