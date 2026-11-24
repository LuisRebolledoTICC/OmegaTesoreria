@echo off
title Omega - Sistema de Control de Tesoreria
chcp 65001 > nul

taskkill /f /im backend.exe 2>nul

echo ===================================================================
echo       GRUPO APOSTOLICO OMEGA - SISTEMA DE CONTROL DE TESORERIA
echo ===================================================================
echo.
echo   Iniciando el servidor y la base de datos...
echo   Direccion local: http://localhost:5000
echo.
echo   Cuentas de acceso:
echo   - Administrador: admin / Admin123!
echo   - Tesorero:      tesorero / Tesorero123!
echo   - Consulta:      consulta / Consulta123!
echo.
echo   Abriendo navegador web en 3 segundos...
echo   (Deja esta ventana abierta mientras utilices el sistema)
echo ===================================================================
echo.

start /b "" powershell -NoProfile -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:5000'"

dotnet run --project "%~dp0backend\backend.csproj" --no-restore --urls "http://0.0.0.0:5000"

echo.
echo El servidor se ha detenido.
pause