@echo off
chcp 65001 > nul
title Setup MCP Server per Claude Desktop - Windows

echo.
echo 🚀 Configurazione MCP Server per Claude Desktop - Windows
echo =======================================================
echo.

REM Colori per Windows
set "ESC="
set "GREEN=%ESC%[32m"
set "YELLOW=%ESC%[33m"
set "RED=%ESC%[31m"
set "BLUE=%ESC%[34m"
set "RESET=%ESC%[0m"

echo %BLUE%ℹ%RESET% Verificando Node.js...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo %RED%✗%RESET% Node.js non trovato! Scarica da https://nodejs.org
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo %GREEN%✓%RESET% Node.js trovato: %NODE_VERSION%
)

echo.
echo %BLUE%ℹ%RESET% Verificando dipendenze MCP...
if exist "package.json" if exist "node_modules" (
    echo %GREEN%✓%RESET% Dipendenze MCP SDK trovate
) else (
    echo %YELLOW%⚠%RESET% Installando dipendenze...
    npm install
    if %ERRORLEVEL% equ 0 (
        echo %GREEN%✓%RESET% Dipendenze installate con successo
    ) else (
        echo %RED%✗%RESET% Errore installazione dipendenze
        pause
        exit /b 1
    )
)

echo.
echo %BLUE%ℹ%RESET% Configurando per Windows...
set "CLAUDE_CONFIG_DIR=%APPDATA%\Claude"
echo %BLUE%ℹ%RESET% Directory Claude: %CLAUDE_CONFIG_DIR%

REM Crea directory se non esiste
if not exist "%CLAUDE_CONFIG_DIR%" (
    echo %YELLOW%⚠%RESET% Creando directory configurazione Claude...
    mkdir "%CLAUDE_CONFIG_DIR%"
    echo %GREEN%✓%RESET% Directory creata: %CLAUDE_CONFIG_DIR%
)

REM Path corrente
set "CURRENT_DIR=%CD%"
set "INDEX_PATH=%CURRENT_DIR%\index.js"
REM Normalizza path per JSON (sostituisce \ con /)
set "INDEX_PATH=%INDEX_PATH:\=/%"

echo %BLUE%ℹ%RESET% Percorso server: %INDEX_PATH%

echo.
echo %BLUE%ℹ%RESET% Che tipo di abbonamento Claude hai?
echo 1^) Claude Pro ^(raccomandato^) - Limiti ottimizzati: 1000 req/min, 10MB file
echo 2^) Claude Pro Extreme - Limiti massimi: 10000 req/min, 50MB file  
echo 3^) Claude Base - Limiti conservativi: 100 req/min, 1MB file
set /p "CONFIG_CHOICE=Scegli configurazione (1-3) [default: 1]: "

if "%CONFIG_CHOICE%"=="" set CONFIG_CHOICE=1

if "%CONFIG_CHOICE%"=="1" (
    set "MAX_FILE_SIZE=10485760"
    set "CACHE_SIZE=500"
    set "RATE_LIMIT_MAX=1000"
    echo %GREEN%✓%RESET% Configurazione Claude Pro selezionata
) else if "%CONFIG_CHOICE%"=="2" (
    set "MAX_FILE_SIZE=52428800"
    set "CACHE_SIZE=2000"
    set "RATE_LIMIT_MAX=10000"
    echo %GREEN%✓%RESET% Configurazione Claude Pro Extreme selezionata
) else if "%CONFIG_CHOICE%"=="3" (
    set "MAX_FILE_SIZE=1048576"
    set "CACHE_SIZE=100"
    set "RATE_LIMIT_MAX=100"
    echo %GREEN%✓%RESET% Configurazione Claude Base selezionata
) else (
    set "MAX_FILE_SIZE=10485760"
    set "CACHE_SIZE=500"
    set "RATE_LIMIT_MAX=1000"
    echo %YELLOW%⚠%RESET% Opzione non valida, usando configurazione Pro
)

REM File configurazione
set "CONFIG_FILE=%CLAUDE_CONFIG_DIR%\claude_desktop_config.json"
echo.
echo %BLUE%ℹ%RESET% Creando configurazione in: %CONFIG_FILE%

REM Crea file JSON
(
echo {
echo   "mcpServers": {
echo     "mcp-server": {
echo       "command": "node",
echo       "args": ["%INDEX_PATH%"],
echo       "env": {
echo         "DEBUG": "false",
echo         "MCP_SERVER_NAME": "mcp-server", 
echo         "MCP_SERVER_VERSION": "1.0.0",
echo         "MAX_FILE_SIZE": "%MAX_FILE_SIZE%",
echo         "CACHE_SIZE": "%CACHE_SIZE%",
echo         "RATE_LIMIT_WINDOW": "60000",
echo         "RATE_LIMIT_MAX": "%RATE_LIMIT_MAX%"
echo       }
echo     }
echo   }
echo }
) > "%CONFIG_FILE%"

if %ERRORLEVEL% equ 0 (
    echo %GREEN%✓%RESET% File configurazione creato con successo!
) else (
    echo %RED%✗%RESET% Errore nella creazione del file configurazione
    pause
    exit /b 1
)

echo.
echo %BLUE%ℹ%RESET% Testando avvio server...
timeout /t 1 /nobreak >nul
start /b "" node index.js >nul 2>&1
timeout /t 3 /nobreak >nul
tasklist /fi "imagename eq node.exe" | findstr node.exe >nul
if %ERRORLEVEL% equ 0 (
    echo %GREEN%✓%RESET% Server si avvia correttamente
    taskkill /f /im node.exe >nul 2>&1
) else (
    echo %YELLOW%⚠%RESET% Controlla manualmente con: node index.js
)

echo.
echo =======================================================
echo %GREEN%✓%RESET% CONFIGURAZIONE COMPLETATA!
echo =======================================================
echo.
echo %BLUE%ℹ%RESET% Prossimi passi:
echo 1. Riavvia Claude Desktop completamente
echo 2. Verifica che l'icona tools ^(🔧^) sia visibile  
echo 3. Testa con: 'Mostrami le informazioni del sistema'
echo.
echo %BLUE%ℹ%RESET% File configurazione: %CONFIG_FILE%
echo %BLUE%ℹ%RESET% Server path: %INDEX_PATH%
echo.
echo %YELLOW%⚠%RESET% Se hai problemi:
echo - Controlla i log di Claude Desktop
echo - Verifica che il percorso sia corretto
echo - Riavvia Claude Desktop
echo - Esegui come Amministratore se necessario
echo.
echo %GREEN%✓%RESET% Il tuo server MCP è pronto per Claude AI! 🚀
echo.
pause