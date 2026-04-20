@echo off
setlocal
set "ROOT=%~dp0"

cd /d "%ROOT%"
call npm run dev
