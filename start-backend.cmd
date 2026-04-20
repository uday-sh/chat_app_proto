@echo off
setlocal
set "ROOT=%~dp0"

cd /d "%ROOT%chat-backend"

if exist "%ROOT%.tools\apache-maven-3.9.14\bin\mvn.cmd" (
  call "%ROOT%.tools\apache-maven-3.9.14\bin\mvn.cmd" -f pom.xml spring-boot:run
  exit /b %errorlevel%
)

call mvnw.cmd -f pom.xml spring-boot:run
