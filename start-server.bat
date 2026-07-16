@echo off
title Monitor830 - Servidor
cd /d "%~dp0"

echo ============================================
echo   Monitor830
echo ============================================
echo.

set "NODEDIR=C:\Program Files\nodejs"
if exist "%NODEDIR%\node.exe" (
    set "PATH=%NODEDIR%;%PATH%"
)

node -v
echo.

REM Verifica dependencias Y que prisma este realmente instalado
if not exist "node_modules\.bin\prisma.cmd" (
    echo [Monitor830] Dependencias incompletas. Instalando...
    call pnpm install --no-frozen-lockfile
    if errorlevel 1 goto :error
)

REM Verifica cliente de Prisma; si falta o esta corrupto, lo regenera
if not exist "node_modules\.prisma\client" (
    echo [Monitor830] Cliente de Prisma no encontrado. Generando...
    call pnpm exec prisma generate
    if errorlevel 1 goto :error
)

REM Verifica que exista la carpeta de evidencias (EVIDENCIAS_DIR=../evidencias en el .env)
if not exist "..\evidencias" (
    echo [Monitor830] Carpeta de evidencias no encontrada. Creando...
    mkdir "..\evidencias"
)

echo.
echo [Monitor830] Iniciando servidor...
echo.
if exist "panel-viewer\dist\win-unpacked\Monitor830 Panel.exe" (
    start "" "panel-viewer\dist\win-unpacked\Monitor830 Panel.exe"
) else (
    echo [Monitor830] AVISO: no se encontro el panel en panel-viewer\dist\win-unpacked\
)
call pnpm run dev
if errorlevel 1 goto :error

goto :end

:error
echo.
echo ============================================
echo   ERROR: Monitor830 no pudo iniciar.
echo   Revisa el mensaje de arriba.
echo ============================================
pause
exit /b 1

:end
pause