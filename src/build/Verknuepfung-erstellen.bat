@echo off
REM Legt eine Lunyad-Verknuepfung mit Icon im Projektordner und auf dem Desktop an.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0make-shortcut.ps1"
pause
