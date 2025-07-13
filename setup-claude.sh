#!/bin/bash

echo "🚀 Configurazione automatica MCP Server per Claude Desktop"
echo "================================================"

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzione per stampare con colori
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Verifica Node.js
echo ""
print_info "Verificando Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "Node.js trovato: $NODE_VERSION"
else
    print_error "Node.js non trovato! Installa Node.js 18+ da https://nodejs.org"
    exit 1
fi

# Verifica dipendenze
echo ""
print_info "Verificando dipendenze MCP..."
if [ -f "package.json" ] && [ -d "node_modules" ]; then
    print_status "Dipendenze MCP SDK trovate"
else
    print_warning "Installando dipendenze..."
    npm install
    if [ $? -eq 0 ]; then
        print_status "Dipendenze installate con successo"
    else
        print_error "Errore installazione dipendenze"
        exit 1
    fi
fi

# Trova directory configurazione Claude Desktop
echo ""
print_info "Cercando directory configurazione Claude Desktop..."

CLAUDE_CONFIG_DIR=""
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    CLAUDE_CONFIG_DIR="$APPDATA/Claude"
else
    # Linux
    CLAUDE_CONFIG_DIR="$HOME/.config/Claude"
fi

print_info "Directory Claude: $CLAUDE_CONFIG_DIR"

# Crea directory se non esiste
if [ ! -d "$CLAUDE_CONFIG_DIR" ]; then
    print_warning "Creando directory configurazione Claude..."
    mkdir -p "$CLAUDE_CONFIG_DIR"
    print_status "Directory creata: $CLAUDE_CONFIG_DIR"
fi

# Path assoluto corrente
CURRENT_DIR=$(pwd)
INDEX_PATH="$CURRENT_DIR/index.js"

print_info "Percorso server: $INDEX_PATH"

# Scegli tipo di configurazione
echo ""
print_info "Che tipo di abbonamento Claude hai?"
echo "1) Claude Pro (raccomandato) - Limiti ottimizzati: 1000 req/min, 10MB file"
echo "2) Claude Pro Extreme - Limiti massimi: 10000 req/min, 50MB file"
echo "3) Claude Base - Limiti conservativi: 100 req/min, 1MB file"
read -p "Scegli configurazione (1-3) [default: 1]: " config_choice

# Imposta variabili basate sulla scelta
case ${config_choice:-1} in
    1)
        MAX_FILE_SIZE="10485760"
        CACHE_SIZE="500"
        RATE_LIMIT_MAX="1000"
        print_status "Configurazione Claude Pro selezionata"
        ;;
    2)
        MAX_FILE_SIZE="52428800"
        CACHE_SIZE="2000"
        RATE_LIMIT_MAX="10000"
        print_status "Configurazione Claude Pro Extreme selezionata"
        ;;
    3)
        MAX_FILE_SIZE="1048576"
        CACHE_SIZE="100"
        RATE_LIMIT_MAX="100"
        print_status "Configurazione Claude Base selezionata"
        ;;
    *)
        print_error "Opzione non valida, usando configurazione Pro"
        MAX_FILE_SIZE="10485760"
        CACHE_SIZE="500"
        RATE_LIMIT_MAX="1000"
        ;;
esac

# Crea configurazione Claude Desktop
CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"

print_info "Creando configurazione in: $CONFIG_FILE"

# Controlla se esiste già una configurazione
if [ -f "$CONFIG_FILE" ]; then
    print_warning "File configurazione esistente trovato"
    echo "Vuoi:"
    echo "1) Sovrascrivere completamente (ATTENZIONE: perderai altre configurazioni MCP)"
    echo "2) Aggiungere solo questo server (raccomandato)"
    echo "3) Creare backup e sovrascrivere"
    echo "4) Annullare"
    read -p "Scegli opzione (1-4): " choice
    
    case $choice in
        1)
            print_warning "Sovrascrivendo configurazione esistente..."
            ;;
        2)
            print_info "Funzionalità merge non implementata in questo script"
            print_warning "Copia manualmente la configurazione da claude_desktop_config.json"
            exit 0
            ;;
        3)
            cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
            print_status "Backup creato"
            ;;
        4)
            print_info "Operazione annullata"
            exit 0
            ;;
        *)
            print_error "Opzione non valida"
            exit 1
            ;;
    esac
fi

# Crea file configurazione
cat > "$CONFIG_FILE" << EOF
{
  "mcpServers": {
    "mcp-server": {
      "command": "node",
      "args": ["$INDEX_PATH"],
      "env": {
        "DEBUG": "false",
        "MCP_SERVER_NAME": "mcp-server",
        "MCP_SERVER_VERSION": "1.0.0",
        "MAX_FILE_SIZE": "$MAX_FILE_SIZE",
        "CACHE_SIZE": "$CACHE_SIZE",
        "RATE_LIMIT_WINDOW": "60000",
        "RATE_LIMIT_MAX": "$RATE_LIMIT_MAX"
      }
    }
  }
}
EOF

if [ $? -eq 0 ]; then
    print_status "File configurazione creato con successo!"
else
    print_error "Errore nella creazione del file configurazione"
    exit 1
fi

# Test rapido del server
echo ""
print_info "Testando avvio server..."
timeout 3s node index.js 2>/dev/null || {
    if [ $? -eq 124 ]; then
        print_status "Server si avvia correttamente (timeout previsto)"
    else
        print_error "Errore nell'avvio del server"
        echo "Controlla manualmente con: node index.js"
    fi
}

# Istruzioni finali
echo ""
echo "================================================"
print_status "CONFIGURAZIONE COMPLETATA!"
echo "================================================"
echo ""
print_info "Prossimi passi:"
echo "1. Riavvia Claude Desktop completamente"
echo "2. Verifica che l'icona tools (🔧) sia visibile"
echo "3. Testa con: 'Mostrami le informazioni del sistema'"
echo ""
print_info "File configurazione: $CONFIG_FILE"
print_info "Server path: $INDEX_PATH"
echo ""
print_warning "Se hai problemi:"
echo "- Controlla i log di Claude Desktop"
echo "- Verifica che il percorso sia corretto"
echo "- Riavvia Claude Desktop"
echo ""
print_status "Il tuo server MCP è pronto per Claude AI! 🚀"