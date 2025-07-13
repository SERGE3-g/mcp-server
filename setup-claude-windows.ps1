# Setup MCP Server per Windows
# Eseguire come Amministratore per migliori risultati

Write-Host "🚀 Configurazione MCP Server per Claude Desktop - Windows" -ForegroundColor Blue
Write-Host "=================================================" -ForegroundColor Blue

# Funzioni per output colorato
function Write-Success($message) {
    Write-Host "✓ $message" -ForegroundColor Green
}

function Write-Warning($message) {
    Write-Host "⚠ $message" -ForegroundColor Yellow
}

function Write-Error($message) {
    Write-Host "✗ $message" -ForegroundColor Red
}

function Write-Info($message) {
    Write-Host "ℹ $message" -ForegroundColor Cyan
}

# Verifica Node.js
Write-Info "Verificando Node.js..."
try {
    $nodeVersion = node --version
    Write-Success "Node.js trovato: $nodeVersion"
} catch {
    Write-Error "Node.js non trovato! Scarica da https://nodejs.org"
    Write-Host "Premi un tasto per continuare..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Verifica dipendenze
Write-Info "Verificando dipendenze MCP..."
if ((Test-Path "package.json") -and (Test-Path "node_modules")) {
    Write-Success "Dipendenze MCP SDK trovate"
} else {
    Write-Warning "Installando dipendenze..."
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Dipendenze installate con successo"
    } else {
        Write-Error "Errore installazione dipendenze"
        exit 1
    }
}

# Directory configurazione Claude per Windows
Write-Info "Cercando directory configurazione Claude Desktop..."
$claudeConfigDir = "$env:APPDATA\Claude"
Write-Info "Directory Claude: $claudeConfigDir"

# Crea directory se non esiste
if (-not (Test-Path $claudeConfigDir)) {
    Write-Warning "Creando directory configurazione Claude..."
    New-Item -ItemType Directory -Path $claudeConfigDir -Force
    Write-Success "Directory creata: $claudeConfigDir"
}

# Path assoluto corrente (Windows)
$currentDir = Get-Location
$indexPath = Join-Path $currentDir "index.js"
$indexPath = $indexPath -replace "\\", "/"  # Normalizza path per JSON

Write-Info "Percorso server: $indexPath"

# Scelta configurazione
Write-Info "Che tipo di abbonamento Claude hai?"
Write-Host "1) Claude Pro (raccomandato) - Limiti ottimizzati: 1000 req/min, 10MB file"
Write-Host "2) Claude Pro Extreme - Limiti massimi: 10000 req/min, 50MB file"
Write-Host "3) Claude Base - Limiti conservativi: 100 req/min, 1MB file"
$configChoice = Read-Host "Scegli configurazione (1-3) [default: 1]"

# Imposta variabili
switch ($configChoice) {
    "1" { 
        $maxFileSize = "10485760"
        $cacheSize = "500"
        $rateLimitMax = "1000"
        Write-Success "Configurazione Claude Pro selezionata"
    }
    "2" { 
        $maxFileSize = "52428800"
        $cacheSize = "2000"
        $rateLimitMax = "10000"
        Write-Success "Configurazione Claude Pro Extreme selezionata"
    }
    "3" { 
        $maxFileSize = "1048576"
        $cacheSize = "100"
        $rateLimitMax = "100"
        Write-Success "Configurazione Claude Base selezionata"
    }
    default { 
        $maxFileSize = "10485760"
        $cacheSize = "500"
        $rateLimitMax = "1000"
        Write-Warning "Usando configurazione Pro di default"
    }
}

# File configurazione
$configFile = Join-Path $claudeConfigDir "claude_desktop_config.json"
Write-Info "Creando configurazione in: $configFile"

# Controlla se esiste già
if (Test-Path $configFile) {
    Write-Warning "File configurazione esistente trovato"
    Write-Host "Vuoi:"
    Write-Host "1) Sovrascrivere completamente (ATTENZIONE: perderai altre configurazioni MCP)"
    Write-Host "2) Creare backup e sovrascrivere"
    Write-Host "3) Annullare"
    $choice = Read-Host "Scegli opzione (1-3)"
    
    switch ($choice) {
        "1" { Write-Warning "Sovrascrivendo configurazione esistente..." }
        "2" { 
            $backupFile = "$configFile.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
            Copy-Item $configFile $backupFile
            Write-Success "Backup creato: $backupFile"
        }
        "3" { 
            Write-Info "Operazione annullata"
            exit 0
        }
        default { 
            Write-Error "Opzione non valida"
            exit 1
        }
    }
}

# Crea configurazione JSON
$config = @{
    mcpServers = @{
        "mcp-server" = @{
            command = "node"
            args = @($indexPath)
            env = @{
                DEBUG = "false"
                MCP_SERVER_NAME = "mcp-server"
                MCP_SERVER_VERSION = "1.0.0"
                MAX_FILE_SIZE = $maxFileSize
                CACHE_SIZE = $cacheSize
                RATE_LIMIT_WINDOW = "60000"
                RATE_LIMIT_MAX = $rateLimitMax
            }
        }
    }
}

try {
    $config | ConvertTo-Json -Depth 10 | Set-Content $configFile -Encoding UTF8
    Write-Success "File configurazione creato con successo!"
} catch {
    Write-Error "Errore nella creazione del file configurazione: $_"
    exit 1
}

# Test server
Write-Info "Testando avvio server..."
$job = Start-Job -ScriptBlock { 
    Set-Location $using:currentDir
    node index.js 
}
Start-Sleep -Seconds 3
if ($job.State -eq "Running") {
    Write-Success "Server si avvia correttamente"
    Stop-Job $job
    Remove-Job $job
} else {
    Write-Warning "Server potrebbe avere problemi. Controlla manualmente con: node index.js"
    Remove-Job $job
}

# Istruzioni finali
Write-Host ""
Write-Host "=================================================" -ForegroundColor Blue
Write-Success "CONFIGURAZIONE COMPLETATA!"
Write-Host "=================================================" -ForegroundColor Blue
Write-Host ""
Write-Info "Prossimi passi:"
Write-Host "1. Riavvia Claude Desktop completamente"
Write-Host "2. Verifica che l'icona tools (🔧) sia visibile"
Write-Host "3. Testa con: 'Mostrami le informazioni del sistema'"
Write-Host ""
Write-Info "File configurazione: $configFile"
Write-Info "Server path: $indexPath"
Write-Host ""
Write-Warning "Se hai problemi:"
Write-Host "- Controlla i log di Claude Desktop"
Write-Host "- Verifica che il percorso sia corretto"
Write-Host "- Riavvia Claude Desktop"
Write-Host "- Esegui come Amministratore se necessario"
Write-Host ""
Write-Success "Il tuo server MCP è pronto per Claude AI! 🚀"
Write-Host ""
Write-Host "Premi un tasto per continuare..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")