@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js wurde nicht gefunden.
  echo Bitte installiere Node.js von https://nodejs.org und starte diese Datei erneut.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installiere Abhaengigkeiten...
  call npm install
  if errorlevel 1 (
    echo Fehler bei npm install.
    pause
    exit /b 1
  )
)

echo Starte Live Map Wall...
call npm start

if errorlevel 1 (
  echo Die App wurde mit einem Fehler beendet.
  pause
)

endlocal
