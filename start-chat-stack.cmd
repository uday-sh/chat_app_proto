@echo off
setlocal
set "ROOT=%~dp0"

start "Chat Backend" cmd /k ""%ROOT%start-backend.cmd""
start "Chat Frontend" cmd /k ""%ROOT%start-frontend.cmd""
