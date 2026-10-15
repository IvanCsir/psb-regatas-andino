@echo off
title Web Citaciones - Hockey Femenino
echo ======================================================
echo    Iniciando Servidor Local de Citaciones...
echo ======================================================
start http://localhost:3000
node server.js
pause
