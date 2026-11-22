@echo off
setlocal
where node.exe >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found. Install Node.js or add it to PATH and try again.
  pause
  exit /b 1
)

echo Starting Folio English. Close this window to stop the server.
node "%~dp0serve-local.mjs" %*
if errorlevel 1 pause
