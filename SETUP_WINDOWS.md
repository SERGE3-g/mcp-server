# 🪟 Configurazione MCP Server per Windows

## 🚀 Setup Automatico (Raccomandato)

### Opzione 1: PowerShell (Windows 10/11)
```powershell
# Apri PowerShell come Amministratore
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\setup-claude-windows.ps1
```

### Opzione 2: Batch Script (Tutte le versioni Windows)
```cmd
# Doppio click su setup-claude-windows.bat
# Oppure da Command Prompt:
setup-claude-windows.bat
```

## 📋 Setup Manuale

### 1. Prerequisiti Windows

**Node.js 18+:**
- Scarica da: https://nodejs.org/en/download/
- Scegli "Windows Installer (.msi)"
- Installa con opzioni default

**Verifica installazione:**
```cmd
node --version
npm --version
```

### 2. Directory Configurazione Claude Desktop

**Windows 10/11:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Path completo:**
```
C:\Users\[TuoNome]\AppData\Roaming\Claude\claude_desktop_config.json
```

### 3. Configurazione JSON per Windows

Crea il file `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mcp-server": {
      "command": "node",
      "args": ["C:/path/to/mcp-server/index.js"],
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

### 4. Path Windows - IMPORTANTE

**⚠️ Usa sempre slash normale (/) nei path JSON, non backslash (\\):**

```json
✅ Corretto: "C:/Users/Nome/Desktop/mcp-server/index.js"
❌ Sbagliato: "C:\\Users\\Nome\\Desktop\\mcp-server\\index.js"
```

### 5. Avvio Server Windows

**Command Prompt:**
```cmd
cd C:\path\to\mcp-server
node index.js
```

**PowerShell:**
```powershell
Set-Location "C:\path\to\mcp-server"
node index.js
```

## 🛠️ Troubleshooting Windows

### Errore "node non riconosciuto"
```cmd
# Riavvia Command Prompt dopo installazione Node.js
# Oppure aggiungi Node.js al PATH manualmente
```

### Errore path non trovato
```json
# Verifica path assoluto corretto:
"args": ["C:/Users/TuoNome/Desktop/mcp-server/index.js"]
```

### Errore permessi PowerShell
```powershell
# Esegui come Amministratore:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Errore porta occupata
```cmd
# Chiudi tutti i processi Node.js:
taskkill /f /im node.exe
```

### SQLite su Windows
```cmd
# Installa SQLite per Windows:
# Scarica da https://sqlite.org/download.html
# Oppure usa Chocolatey:
choco install sqlite

# Oppure usa il server senza SQLite esterno
```

## 🔧 Configurazioni Specifiche Windows

### Variabili Ambiente Windows
```cmd
# Crea file .env nella directory del server:
set MCP_SERVER_NAME=mcp-server
set DEBUG=false
set MAX_FILE_SIZE=10485760
```

### Firewall Windows
Se Claude Desktop non si connette:
1. Windows Security → Firewall
2. Consenti Node.js attraverso firewall
3. Riavvia Claude Desktop

### Antivirus
Alcuni antivirus possono bloccare Node.js:
1. Aggiungi eccezione per la cartella mcp-server
2. Aggiungi eccezione per node.exe

## 🎯 Test Windows

Dopo configurazione, in Claude Desktop:

```
Mostrami le informazioni del sistema Windows
```

```
Elenca i file in C:\Users\[TuoNome]\Desktop
```

```
Crea un QR code per https://microsoft.com
```

## 📁 Struttura Directory Windows

```
C:\Users\[TuoNome]\Desktop\mcp-server\
├── index.js
├── package.json
├── README.md
├── setup-claude-windows.ps1
├── setup-claude-windows.bat
├── .env
└── node_modules\
```

## 🔗 Links Utili Windows

- **Node.js Download**: https://nodejs.org/en/download/
- **Claude Desktop**: https://claude.ai/download
- **SQLite Windows**: https://sqlite.org/download.html
- **Visual Studio Code**: https://code.visualstudio.com/

## 🚀 Quick Start Windows

1. **Scarica Node.js** da nodejs.org
2. **Estrai mcp-server** in una cartella
3. **Esegui** `setup-claude-windows.bat`
4. **Riavvia Claude Desktop**
5. **Testa** con "Mostrami le informazioni del sistema"

**🎉 Il tuo server MCP è pronto per Windows!**