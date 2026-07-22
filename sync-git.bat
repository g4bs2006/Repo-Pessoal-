@echo off
echo Executando sincronizacao com o GitHub...
powershell -ExecutionPolicy Bypass -File "%~dp0sync-git.ps1"
pause
