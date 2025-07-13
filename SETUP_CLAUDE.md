# 🚀 Configurazione Claude Desktop

## Passaggi per collegare il server MCP a Claude Desktop:

### 1. Trova il file di configurazione di Claude Desktop

**Su macOS:**
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Su Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

### 2. Scegli la configurazione

**🎯 Per utenti Claude Pro (raccomandato):**

Usa `claude_desktop_config.json` (limiti ottimizzati):
- 1000 richieste/minuto
- File fino a 10MB
- Cache da 500 entries

**🔥 Per utenti Pro Extreme:**

Usa `claude_desktop_config_pro_unlimited.json` (limiti massimi):
- 10000 richieste/minuto
- File fino a 50MB
- Cache da 2000 entries

**📋 Per utenti base:**

Limiti conservativi:
- 100 richieste/minuto
- File fino a 1MB
- Cache da 100 entries

### 3. Modifica il file di configurazione

Se il file non esiste, crealo. Aggiungi questa configurazione (Pro):

```json
{
  "mcpServers": {
    "mcp-server": {
      "command": "node",
      "args": ["/Users/sergeguea/Desktop/mcp-server/index.js"],
      "env": {
        "DEBUG": "false",
        "MCP_SERVER_NAME": "mcp-server",
        "MCP_SERVER_VERSION": "1.0.0",
        "MAX_FILE_SIZE": "10485760",
        "CACHE_SIZE": "500",
        "RATE_LIMIT_WINDOW": "60000",
        "RATE_LIMIT_MAX": "1000"
      }
    }
  }
}
```

### 4. Riavvia Claude Desktop

Chiudi completamente Claude Desktop e riaprilo.

### 5. Verifica la connessione

In Claude, dovresti vedere:
- 🔧 Icona tools nella barra
- Server "mcp-server" elencato nei server disponibili
- 19+ tools disponibili

### 6. Test rapido

Prova questi comandi in Claude:

```
Puoi mostrarmi le informazioni del sistema?
```

```
Crea un QR code per il mio sito web: https://example.com
```

```
Inviami una email di test a test@example.com
```

## 🛠️ Troubleshooting

### Server non si connette:
1. Verifica che Node.js sia installato: `node --version`
2. Controlla il percorso nel file di configurazione
3. Verifica i permessi della directory

### Tools non disponibili:
1. Riavvia Claude Desktop
2. Controlla i log di Claude Desktop
3. Verifica che il server sia in ascolto

### Errori di esecuzione:
1. Controlla i log del server in `~/.claude/logs/`
2. Abilita debug mode: `"DEBUG": "true"`
3. Verifica le dipendenze: `npm install`

## 📋 Tools Disponibili

Una volta configurato, avrai accesso a 19+ tools:

- **Sistema:** get_system_info, echo, health_check
- **File:** list_files, read_file, file_operations
- **Rete:** http_request, websocket_server
- **Database:** sqlite_db (reale con SQLite)
- **Email:** email_operations (SMTP reale)
- **Crypto:** crypto_tools, text_processing
- **Git:** git_operations
- **Data:** json_tools, csv_operations
- **Plugin:** plugin_manager
- **AI:** ai_operations
- **Template:** template_engine
- **PDF:** Generazione PDF reale
- **QR Code:** Generazione QR code reali

## 🎯 Prossimi Passi

1. Configura le credenziali SMTP per email reali
2. Installa SQLite per database reali: `brew install sqlite3`
3. Esplora i plugin personalizzati
4. Testa tutte le funzionalità avanzate

**🚀 Il tuo server MCP è pronto per Claude AI!**