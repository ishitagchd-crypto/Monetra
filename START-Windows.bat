@echo off
REM Monetra - double-click this file on Windows to open the app.
setlocal
cd /d "%~dp0"

set "URL=http://localhost:8080"
set "JAR=lib\sqlite-jdbc-3.53.4.0\sqlite-jdbc-3.53.4.0.jar"

where java >nul 2>nul
if errorlevel 1 goto nojava
if not exist "%JAR%" goto nojar

where javac >nul 2>nul
if errorlevel 1 goto maybecompiled

echo Building Monetra...
javac --add-modules jdk.httpserver -d out src\MonetraServer.java
if errorlevel 1 goto buildfail
goto built

:maybecompiled
if not exist "out\MonetraServer.class" goto nojdk

:built
curl -fsS --max-time 1 "%URL%/api/health" >nul 2>nul
if not errorlevel 1 (
  echo Monetra is already running.
  start "" "%URL%"
  exit /b 0
)

set "NATIVE="
java --enable-native-access=ALL-UNNAMED -version >nul 2>nul
if not errorlevel 1 set "NATIVE=--enable-native-access=ALL-UNNAMED"

echo.
echo   Monetra is starting at %URL%
echo   Keep this window open while you use the app.
echo   Close it to stop the server.
echo.

timeout /t 2 /nobreak >nul
start "" "%URL%"

java %NATIVE% --add-modules jdk.httpserver -cp "out;%JAR%" MonetraServer
exit /b %errorlevel%

:nojava
echo Java 21 or newer is required.
echo Download it from https://adoptium.net and run this file again.
pause
exit /b 1

:nojar
echo Missing database driver: %JAR%
pause
exit /b 1

:nojdk
echo Monetra is not compiled and no JDK was found.
echo Install JDK 21 from https://adoptium.net and run this file again.
pause
exit /b 1

:buildfail
echo Build failed. See the errors above.
pause
exit /b 1
