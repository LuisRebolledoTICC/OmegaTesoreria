@echo off
chcp 65001 > nul
title Omega - Modo Desarrollo

echo ===================================================================
echo   GRUPO APOSTÓLICO OMEGA - MODO DESARROLLO (VITE + ASP.NET CORE)
echo ===================================================================
echo.
echo Iniciando Backend API en puerto 5000...
start "Omega API" /D "%~dp0backend" cmd /k "dotnet run --no-restore --urls http://0.0.0.0:5000"

timeout /t 3 > nul

echo Iniciando Frontend Vite en puerto 5173...
start "Omega Frontend" /D "%~dp0frontend" cmd /k "npm run dev"

timeout /t 3 > nul

start "" "http://localhost:5173"
